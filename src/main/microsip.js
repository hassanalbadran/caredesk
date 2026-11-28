'use strict';
// MicroSIP link.
//  * Outgoing: `microsip.exe <number>` (documented MicroSIP command line; a running MicroSIP takes the number over and dials).
//  * Incoming: MicroSIP runs the command in MicroSIP.ini `cmdIncomingCall` with the Caller ID as parameter. We generate a tiny hook (.bat) that sends
//    the number to a loopback-only HTTP endpoint inside CareDesk (127.0.0.1, random secret in the URL). Loopback HTTP was chosen over a WebSocket
//    (one-way, fire-and-forget, no extra dependency, nothing stays connected) and over a watched file (races, stale files, needs a watcher).
const http = require('http'); const fs = require('fs'); const path = require('path'); const crypto = require('crypto'); const { spawn } = require('child_process');
const { parseCaller, dialNumber } = require('../core/callerid');

const DEFAULT_PORT = 3848;
const isMicroSip = (p) => /(^|[\\/])microsip[^\\/]*\.exe$/i.test(String(p || ''));
function candidates(env = process.env) {
  const out = []; for (const k of ['ProgramFiles', 'ProgramFiles(x86)', 'LOCALAPPDATA', 'ProgramW6432']) if (env[k]) out.push(path.join(env[k], 'MicroSIP', 'microsip.exe'), path.join(env[k], 'Programs', 'MicroSIP', 'microsip.exe'));
  return out;
}
function findExe(configured, exists = fs.existsSync, env = process.env) {
  if (configured && isMicroSip(configured) && exists(configured)) return configured;
  return candidates(env).find((c) => exists(c)) || '';
}
// Outgoing call. Resolves { ok:true } once the process has really started; rejects with code NO_MICROSIP / BAD_NUMBER / LAUNCH_FAILED.
function dial({ exe, number, prefix = '', spawnFn = spawn }) {
  const n = dialNumber(number, prefix);
  return new Promise((resolve, reject) => {
    const fail = (code, msg) => reject(Object.assign(new Error(msg || code), { code }));
    if (!n) return fail('BAD_NUMBER');
    if (!exe) return fail('NO_MICROSIP');
    let child; try { child = spawnFn(exe, [n], { detached: true, stdio: 'ignore', windowsHide: false, shell: false }); } catch (e) { return fail(e && e.code === 'ENOENT' ? 'NO_MICROSIP' : 'LAUNCH_FAILED', e && e.message); }
    let done = false; child.once('error', (e) => { if (!done) { done = true; fail(e && e.code === 'ENOENT' ? 'NO_MICROSIP' : 'LAUNCH_FAILED', e && e.message); } });
    child.once('spawn', () => { if (!done) { done = true; try { child.unref(); } catch { /* ignore */ } resolve({ ok: true, number: n }); } });
  });
}

// ---- MicroSIP.ini editing (the file is ANSI or UTF-16LE with BOM depending on version; keep whatever it was) ----
function decodeIni(buf) { return buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe ? { text: buf.slice(2).toString('utf16le'), enc: 'utf16' } : { text: buf.toString('utf8').replace(/^﻿/, ''), enc: buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf ? 'utf8bom' : 'utf8' }; }
function encodeIni(text, enc) { return enc === 'utf16' ? Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')]) : enc === 'utf8bom' ? Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(text, 'utf8')]) : Buffer.from(text, 'utf8'); }
function setIniKey(buf, key, value, section = 'Settings') {
  const { text, enc } = decodeIni(buf || Buffer.alloc(0)); const eol = /\r\n/.test(text) || !text ? '\r\n' : '\n';
  const lines = text.length ? text.split(/\r?\n/) : []; const line = `${key}=${value}`; const re = new RegExp('^\\s*' + key + '\\s*=', 'i');
  let sec = -1, end = lines.length; for (let i = 0; i < lines.length; i++) { const m = lines[i].match(/^\s*\[(.+?)\]\s*$/); if (m) { if (sec >= 0) { end = i; break; } if (m[1].toLowerCase() === section.toLowerCase()) sec = i; } }
  if (sec < 0) { if (lines.length && lines[lines.length - 1] === '') lines.pop(); lines.push(`[${section}]`, line, ''); }
  else { let hit = -1; for (let i = sec + 1; i < end; i++) if (re.test(lines[i])) { hit = i; break; } if (hit >= 0) lines[hit] = line; else { let at = end; while (at > sec + 1 && lines[at - 1] === '') at--; lines.splice(at, 0, line); } }
  return encodeIni(lines.join(eol), enc);
}
function getIniKey(buf, key) { const { text } = decodeIni(buf || Buffer.alloc(0)); const m = text.match(new RegExp('^\\s*' + key + '\\s*=(.*)$', 'im')); return m ? m[1].trim() : ''; }
const iniPathFor = (exe, env = process.env, exists = fs.existsSync) => { const portable = exe ? path.join(path.dirname(exe), path.basename(exe).replace(/\.exe$/i, '.ini')) : ''; if (portable && exists(portable)) return portable; const a = env.APPDATA ? path.join(env.APPDATA, 'MicroSIP', 'microsip.ini') : ''; return a && exists(a) ? a : (a || portable); };

// the hook MicroSIP runs. Only quotes-stripped %~1 is used; the server re-parses and only accepts a phone number / SIP user part.
const hookText = (port, token) => ['@echo off', 'rem CareDesk <-> MicroSIP incoming-call hook (generated; do not edit)', 'set "N=%~1"', 'if not defined N exit /b 0',
  `"%SystemRoot%\\System32\\curl.exe" -s -m 2 -G --data-urlencode "n=%N%" "http://127.0.0.1:${port}/incoming?k=${token}" >nul 2>&1`, 'exit /b 0', ''].join('\r\n');

function create({ dir, onIncoming = () => {}, log = () => {} }) {
  let server = null, port = DEFAULT_PORT, last = new Map(), minute = { t: 0, n: 0 };
  const tokFile = path.join(dir, 'bridge-token'); const hookFile = path.join(dir, 'caredesk-hook.bat');
  const token = () => { try { const t = fs.readFileSync(tokFile, 'utf8').trim(); if (/^[0-9a-f]{32}$/.test(t)) return t; } catch { /* make one */ } const t = crypto.randomBytes(16).toString('hex'); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(tokFile, t); return t; };
  const writeHook = (p = port) => { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(hookFile, hookText(p, token())); return hookFile; };
  const handler = (req, res) => {
    const end = (c) => { res.writeHead(c, { 'Cache-Control': 'no-store', 'Content-Length': 0 }); res.end(); };
    try {
      if (req.method !== 'GET' || req.headers.origin) return end(403); // browsers always add Origin on cross-site requests; the hook (curl) never does
      if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/i.test(String(req.headers.host || ''))) return end(403); // DNS-rebinding guard
      const u = new URL(req.url, 'http://127.0.0.1'); if (u.pathname === '/health') return end(204);
      if (u.pathname !== '/incoming') return end(404);
      const k = Buffer.from(String(u.searchParams.get('k') || '')), t = Buffer.from(token()); if (k.length !== t.length || !crypto.timingSafeEqual(k, t)) return end(401);
      const now = Date.now(); if (now - minute.t > 60000) minute = { t: now, n: 0 }; if (++minute.n > 30) return end(429);
      const raw = String(u.searchParams.get('n') || ''); const number = parseCaller(raw); log('incoming', raw.slice(0, 80), number);
      if (!number) return end(400);
      if (now - (last.get(number) || 0) < 1500) return end(204); last.set(number, now); if (last.size > 50) last = new Map([...last].slice(-20));
      end(204); Promise.resolve().then(() => onIncoming(number)).catch(() => {});
    } catch { try { end(400); } catch { /* ignore */ } }
  };
  const start = (p) => new Promise((resolve, reject) => {
    port = Number(p) || DEFAULT_PORT; if (port < 1024 || port > 65535) return reject(Object.assign(new Error('BAD_PORT'), { code: 'BAD_PORT' }));
    stop().then(() => { const s = http.createServer(handler); s.once('error', (e) => { server = null; reject(Object.assign(new Error(e.code === 'EADDRINUSE' ? 'PORT_BUSY' : String(e.message)), { code: e.code === 'EADDRINUSE' ? 'PORT_BUSY' : 'LISTEN_FAILED' })); }); s.listen(port, '127.0.0.1', () => { server = s; try { writeHook(port); } catch { /* ignore */ } resolve(status()); }); });
  });
  const stop = () => new Promise((resolve) => { if (!server) return resolve(); const s = server; server = null; s.close(() => resolve()); try { s.closeAllConnections && s.closeAllConnections(); } catch { /* ignore */ } });
  const status = () => ({ running: !!server, port, hook: hookFile });
  // write the hook and point MicroSIP.ini at it. MicroSIP rewrites its ini when it exits, so it must be closed (or restarted) afterwards.
  function installHook(exe, env = process.env) {
    const bat = writeHook(port); const ini = iniPathFor(exe, env); if (!ini) throw Object.assign(new Error('NO_INI'), { code: 'NO_INI' });
    let buf; try { buf = fs.readFileSync(ini); } catch { buf = Buffer.alloc(0); }
    const had = getIniKey(buf, 'cmdIncomingCall'); if (had && path.resolve(had.replace(/^"|"$/g, '')) !== path.resolve(bat)) { try { fs.writeFileSync(path.join(dir, 'MicroSIP.ini.before-caredesk'), buf); } catch { /* ignore */ } }
    fs.mkdirSync(path.dirname(ini), { recursive: true }); fs.writeFileSync(ini, setIniKey(buf, 'cmdIncomingCall', bat)); return { ini, bat, replaced: had && had !== bat ? had : '' };
  }
  return { start, stop, status, writeHook, installHook, token, hookFile };
}
module.exports = { create, dial, findExe, isMicroSip, setIniKey, getIniKey, iniPathFor, hookText, DEFAULT_PORT };
