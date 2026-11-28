'use strict';
// Thin client for the Apps Script dashboard. Never throws. Failure shapes (all { ok:false }):
//   OFFLINE      - no network at all (DNS / connection refused)            -> offline:true
//   TIMEOUT      - the server did not answer in time (cold start / mail)    -> offline:true
//   BAD_RESPONSE - the server answered, but not with our JSON (wrong deployment, script error page, login wall) -> http + hint
let forcedOffline = false; const setOffline = (v) => { forcedOffline = !!v; };
const strip = (s) => String(s || '').replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
async function once(url, body, timeoutMs) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    // Apps Script answers a POST with a 302 to a one-time GET url that holds the JSON: fetch follows it
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow', signal: ctl.signal });
    const text = await res.text(); let j = null; try { j = JSON.parse(text); } catch { /* not json */ }
    if (j && typeof j === 'object' && !Array.isArray(j)) return j;
    return { ok: false, code: 'BAD_RESPONSE', http: res.status, hint: strip(text) };
  } catch (e) {
    if (e && e.name === 'AbortError') return { ok: false, offline: true, code: 'TIMEOUT' };
    return { ok: false, offline: true, code: 'OFFLINE', detail: String((e && e.cause && e.cause.code) || (e && e.message) || '') };
  } finally { clearTimeout(t); }
}
const SAFE_TO_RETRY = new Set(['login', 'check', 'notices', 'latest', 'ping', 'report']);
async function post(url, body, timeoutMs = 15000) {
  if (forcedOffline) return { ok: false, offline: true, code: 'OFFLINE' };
  if (!url) return { ok: false, offline: true, code: 'NO_SERVER' };
  let r = await once(url, body, timeoutMs);
  if (r.offline && r.code === 'OFFLINE' && SAFE_TO_RETRY.has(body && body.action)) { await new Promise((res) => setTimeout(res, 800)); r = await once(url, body, timeoutMs); } // a flaky first request right after boot / wifi wake-up
  return r;
}
module.exports = { post, setOffline, isOffline: () => forcedOffline };
