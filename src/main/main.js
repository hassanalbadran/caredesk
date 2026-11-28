'use strict';
const { app, BrowserWindow, ipcMain, shell, dialog, session, Menu, Tray, nativeImage, Notification } = require('electron');
const path = require('path'); const fs = require('fs');
const { DB } = require('../core/db'); const { Service } = require('../core/service');
const { License, getFingerprint, getFingerprintAsync } = require('../core/license');
const { exportBackup, importBackup } = require('../core/backup');
const eclinic = require('../core/eclinic'); const M = require('../core/messages'); const barcode = require('../core/barcode');
const cloud = require('./cloud'); const reporter = require('./reporter'); const diag = require('../core/diagnose'); const crypto = require('crypto');
const pkg = require('../../package.json');
const cfg = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, '../../config/app.json'), 'utf8')); } catch { return {}; } })();
// Open-source community edition: everything unlocked, no trial, no activation. Paid tiers stay in the code (licence.js, plans.js, GAS) and come back by setting "paid": true in config/app.json.
const PAID = cfg.paid === true;
const pubKey = (() => { try { return fs.readFileSync(path.join(__dirname, '../../config/license-public.pem'), 'utf8'); } catch { return ''; } })();
const ALLOWED_EXTERNAL = /^(https:|whatsapp:|tel:|mailto:)/i;

if (process.argv.includes('--safe')) { app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu'); } // CareDesk Doctor "Safe mode": no graphics driver involved
if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }

// Local DB lives in the install folder (spec); falls back to userData when that folder is read-only.
function dataDir() {
  const pref = app.isPackaged ? path.join(path.dirname(process.execPath), 'data') : path.join(__dirname, '../../data');
  try { fs.mkdirSync(pref, { recursive: true }); fs.accessSync(pref, fs.constants.W_OK); return pref; } catch { const d = path.join(app.getPath('userData'), 'data'); fs.mkdirSync(d, { recursive: true }); return d; }
}
let win, db, svc, lic, fpInfo, actor = null, importCache = null, rep = null, devUntil = 0, devFails = 0, devLockUntil = 0;
let phoneInst = null; const phone = () => phoneInst || (phoneInst = require('./phonelink').create({ svc, redact: require('../core/service').redactMoney, onEvent: (k, ip) => { try { svc._log({ name: 'Phone' }, 'phone.' + k, 'ip', null, { ip }); } catch { /* ignore */ } } }));
const GAS = () => cfg.gasUrl || String((db && db.settings && db.settings().gasUrl) || ''); // config wins; else the address saved from Settings
const DEV_HASH = 'e48d2866776284d1a08812a4bca3af39c9cf2deea37bb6e00cad136f214524e1'; // sha256('cd-dev-v1:' + code); the code itself is never stored
const report = (code, desc, solved = false) => { try { const c = diag.byCode(code); rep && rep.add({ code, name: c.name, desc: desc || c.en, solved, account: (cache.account && cache.account.username) || (actor && actor.name) || '' }); flushReports(); } catch { /* ignore */ } };
const flushReports = () => { if (!rep || !GAS()) return; rep.flush(async (e) => { const r = await cloud.post(GAS(), { action: 'report', code: e.code, name: e.name, desc: e.desc, solved: e.solved, account: e.account, version: e.version, count: e.count, ts: e.ts, fp: fpInfo && fpInfo.fp }); return !!(r && r.ok); }); };

// ---- updates: check -> download in background -> install silently when the app is closed (or on "restart now") ----
const UPD_FILE = () => path.join(require('os').tmpdir(), 'CareDesk-Setup-update.exe');
let pending = null, applying = false, sessionEnding = false;
async function queryLatest() {
  if (!/^[\w.-]+\/[\w.-]+$/.test(cfg.githubRepo || '')) return { ok: false, code: 'NO_REPO' };
  const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 12000);
  try { const r = await fetch(`https://api.github.com/repos/${cfg.githubRepo}/releases/latest`, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'CareDesk' }, signal: ctl.signal }); if (!r.ok) return { ok: false, code: 'HTTP_' + r.status };
    const j = await r.json(); const ver = String(j.tag_name || '').replace(/^v/, ''); const asset = (j.assets || []).find((a) => /\.exe$/i.test(a.name));
    return { ok: true, version: ver, current: app.getVersion(), newer: cmpVer(ver, app.getVersion()) > 0, notes: String(j.body || '').slice(0, 2000), url: asset ? asset.browser_download_url : '', size: asset ? asset.size : 0, digest: asset && /^sha256:[0-9a-f]{64}$/i.test(asset.digest || '') ? asset.digest.slice(7).toLowerCase() : '', page: j.html_url }; }
  catch { return { ok: false, code: 'OFFLINE' }; } finally { clearTimeout(tm); }
}
async function fetchInstaller(url, want = {}) {
  if (!/^https:\/\/(github\.com|objects\.githubusercontent\.com|release-assets\.githubusercontent\.com)\//.test(url || '') || !/\.exe(\?|$)/i.test(url)) throw new Error('BAD_UPDATE_URL');
  const r = await fetch(url, { redirect: 'follow' }); if (!r.ok) throw new Error('HTTP_' + r.status);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 5e6 || buf[0] !== 0x4d || buf[1] !== 0x5a) throw new Error('BAD_INSTALLER'); // a real installer is tens of MB and starts with "MZ"
  if (want.size && buf.length !== want.size) throw new Error('BAD_INSTALLER');
  if (want.digest && crypto.createHash('sha256').update(buf).digest('hex') !== want.digest) throw new Error('BAD_INSTALLER');
  const f = UPD_FILE(); fs.writeFileSync(f + '.part', buf); fs.renameSync(f + '.part', f); return f;
}
// restart=true: install now and reopen the app. restart=false: silent install after the app has closed (never while Windows is shutting down).
function applyUpdate(restart) {
  if (applying || !fs.existsSync(UPD_FILE())) return false; applying = true;
  try { backupForUpdate(); const args = restart ? ['/S', '--force-run'] : ['/S']; require('child_process').spawn(UPD_FILE(), args, { detached: true, stdio: 'ignore' }).unref(); } catch (e) { applying = false; report('E901', 'update launch: ' + String(e && e.message).slice(0, 150)); return false; }
  if (restart) { quitting = true; setTimeout(() => app.quit(), 400); } return true;
}
let autoBusy = false;
async function autoUpdateTick() {
  if (autoBusy || !app.isPackaged) return; autoBusy = true;
  try {
    if (db.settings().autoUpdate === false) return;
    const r = await queryLatest(); if (!r.ok || !r.newer || !r.url) return;
    if (!pending || pending.version !== r.version) { await fetchInstaller(r.url, { size: r.size, digest: r.digest }); pending = { version: r.version, notes: r.notes }; }
    emit('update:ready', { version: r.version, notes: r.notes });
  } catch { /* try again next round */ } finally { autoBusy = false; }
}

// ---- MicroSIP softphone link (click-to-call + incoming-call popup) ----
const msCfg = () => ({ enabled: false, path: '', port: 3848, prefix: '', ...((db && db.settings().microsip) || {}) });
let msInst = null; const microsip = () => msInst || (msInst = require('./microsip').create({ dir: path.join(app.getPath('userData'), 'microsip'), onIncoming: (n) => onIncomingCall(n), log: () => {} }));
function onIncomingCall(number) {
  if (!db || !svc) return; let r; try { r = svc.callerLookup({ number }); } catch { return; } if (!r.number) return;
  const who = r.matches.length ? r.matches.map((m) => m.name).join(' / ') : 'رقم غير مسجّل · Unknown number';
  try { if (Notification.isSupported()) new Notification({ title: 'CareDesk · ' + r.number, body: who, icon: path.join(__dirname, '../../build/icon.png') }).show(); } catch { /* ignore */ }
  try { if (win && !win.isDestroyed()) { if (win.isMinimized()) win.restore(); if (!win.isVisible()) win.showInactive(); win.flashFrame(true); } } catch { /* ignore */ }
  emit('call:incoming', r);
}
const msStart = async () => { const c = msCfg(); if (!c.enabled) { await microsip().stop(); return microsip().status(); } return microsip().start(c.port); };
const msExe = () => require('./microsip').findExe(msCfg().path);
const cache = { account: null };
const emit = (ch, ...a) => { if (win && !win.isDestroyed()) win.webContents.send(ch, ...a); };

// Device fingerprint. It used to run `reg` + three PowerShell/WMI calls SYNCHRONOUSLY before the window existed: right after a reboot WMI/PowerShell
// need 10-30 s to wake up, so the app looked frozen or "did not open". Now: cached on disk, otherwise computed in the background after the window is up.
const fpCacheFile = () => path.join(dataDir(), 'fp-cache.json');
let fpPromise = null;
function ensureFp() {
  if (fpInfo) return Promise.resolve(fpInfo);
  return fpPromise || (fpPromise = getFingerprintAsync().then((r) => { fpInfo = r; try { fs.writeFileSync(fpCacheFile(), JSON.stringify({ ...r, host: require('os').hostname() })); } catch { /* ignore */ } return r; }));
}
// The data folder sits next to the program, and an installer update replaces that folder. So before every update we keep a safe copy in the user profile
// (VACUUM INTO = consistent copy of the live DB), and on start we put it back if the database file is gone.
const backupDir = () => path.join(app.getPath('userData'), 'update-backup');
function backupForUpdate() {
  try {
    const d = backupDir(); fs.rmSync(d, { recursive: true, force: true }); fs.mkdirSync(d, { recursive: true });
    db.h.exec(`VACUUM INTO '${path.join(d, 'caredesk.sqlite').replace(/'/g, "''")}'`);
    const fd = path.join(dataDir(), 'fonts'); if (fs.existsSync(fd)) fs.cpSync(fd, path.join(d, 'fonts'), { recursive: true });
    fs.writeFileSync(path.join(d, 'ok.json'), JSON.stringify({ ts: Date.now(), version: app.getVersion() })); return true;
  } catch (e) { report('E901', 'update backup: ' + String(e && e.message).slice(0, 150)); return false; }
}
function restoreIfMissing() {
  try {
    const d = backupDir(); const dst = path.join(dataDir(), 'caredesk.sqlite');
    if (fs.existsSync(dst) || !fs.existsSync(path.join(d, 'ok.json')) || !fs.existsSync(path.join(d, 'caredesk.sqlite'))) return false;
    fs.copyFileSync(path.join(d, 'caredesk.sqlite'), dst); if (fs.existsSync(path.join(d, 'fonts'))) fs.cpSync(path.join(d, 'fonts'), path.join(dataDir(), 'fonts'), { recursive: true }); return true;
  } catch { return false; }
}
function boot() {
  restoreIfMissing();
  db = new DB(path.join(dataDir(), 'caredesk.sqlite')); svc = new Service(db);
  if (PAID) fpInfo = getFingerprint(); // paid mode seals the licence to the machine and needs it at once
  else { try { const c = JSON.parse(fs.readFileSync(fpCacheFile(), 'utf8')); if (c && c.fp && c.host === require('os').hostname()) fpInfo = { fp: c.fp, parts: c.parts }; } catch { /* first run: computed later */ } }
  lic = new License({ db, fp: fpInfo ? fpInfo.fp : 'pending', publicKey: pubKey }); if (PAID) lic.ensureStarted();
  svc.getTier = () => (PAID ? lic.status().tier || 'trial' : 'max');
  cache.account = db.getSetting('account', null);
  rep = reporter.create(path.join(dataDir(), 'error-queue.json'), { version: pkg.version });
}
function cmpVer(a, b) { const sp = (v) => { const [core, pre] = String(v).replace(/^v/, '').split('-'); return { c: core.split('.').map(Number), p: pre ? pre.split('.').map((x) => (/^\d+$/.test(x) ? Number(x) : x)) : null }; }; const A = sp(a), B = sp(b); for (let i = 0; i < 3; i++) { const d = (A.c[i] || 0) - (B.c[i] || 0); if (d) return d > 0 ? 1 : -1; } if (!A.p && !B.p) return 0; if (!A.p) return 1; if (!B.p) return -1; for (let i = 0; i < Math.max(A.p.length, B.p.length); i++) { const x = A.p[i], y = B.p[i]; if (x === y) continue; if (x === undefined) return -1; if (y === undefined) return 1; if (typeof x === 'number' && typeof y === 'number') return x > y ? 1 : -1; return String(x) > String(y) ? 1 : -1; } return 0; }
const licStatus = () => ({ ...(PAID ? lic.status() : { status: 'active', canUse: true, plan: 'community', tier: 'max', daysLeft: null, expiresAt: null, warn: false }), account: cache.account && { username: cache.account.username, email: cache.account.email, emailVerified: cache.account.emailVerified } });
const devInfo = async () => { const f = await ensureFp(); return { fp: f.fp, parts: f.parts, deviceName: require('os').hostname() }; };

async function heartbeat(force) {
  if (!PAID) return;
  if (!force && !lic.needsCheck(cfg.heartbeatHours * 3600000 || 21600000)) return;
  const prov = lic.blob && lic.blob.provisional ? lic.blob.provisional.startedAt : undefined;
  const res = await cloud.post(GAS(), { action: 'check', ...(await devInfo()), provisionalStart: prov });
  if (res.offline) return;
  lic.applyServer(res); emit('license:changed', licStatus());
}
// Gate: every data call requires a usable licence (self-locks offline when expired).
const gate = () => { if (PAID && !lic.status().canUse) { const e = new Error('LICENSE_LOCKED'); e.code = 'LICENSE_LOCKED'; throw e; } };
const wrap = (fn) => async (_e, ...a) => { try { return { ok: true, data: await fn(...a) }; } catch (e) { return { ok: false, code: e.code || 'ERR', error: String(e.message || e) }; } };

function localActor(name, role, perms) {
  let s = db.get('SELECT * FROM secretaries WHERE name=?', name);
  if (!s) { const id = svc.saveSecretary({ name, role, perms: perms || [] }, null); s = db.get('SELECT * FROM secretaries WHERE id=?', id); }
  return { id: s.id, name: s.name };
}

ipcMain.handle('cd:call', wrap((method, args) => {
  gate();
  if (method === 'loginSecretary') { const r = svc.loginSecretary(args || {}); if (r.ok) actor = { id: r.secretary.id, name: r.secretary.name }; return r; }
  if (method === 'logout') { actor = null; return true; }
  if (method === 'autoLogin') { // first run / single staff without PIN => straight in; otherwise renderer shows the picker
    const list = db.all('SELECT id,name,code_hash FROM secretaries WHERE active=1 ORDER BY id');
    if (!list.length) { actor = localActor('Admin', 'admin'); return { ok: true }; }
    if (list.length === 1 && !list[0].code_hash) { actor = { id: list[0].id, name: list[0].name }; return { ok: true }; }
    return { ok: false, pick: list.map((s) => ({ id: s.id, name: s.name })) };
  }
  if (method === 'whoami') return actor ? { actor, perms: svc._perms(actor), role: db.get('SELECT role FROM secretaries WHERE id=?', actor.id).role } : null;
  if (!actor && !['getSettings', 'getCatalog'].includes(method) && !(method === 'listSecretaries')) { const e = new Error('NOT_SIGNED_IN'); e.code = 'AUTH'; throw e; }
  if (method === 'listSecretaries') return db.all('SELECT id,name,role,active,(code_hash IS NOT NULL) has_code FROM secretaries WHERE active=1 ORDER BY id');
  try { return svc.call(method, args, actor); } catch (e) { if (e && e.code === 'FORBIDDEN') { try { svc._log(actor, 'security.forbidden', 'call', method, {}); } catch { /* ignore */ } report('E803', 'Permission bypass attempt: ' + method); } throw e; }
}));

// ---- cloud (accounts, licence) -----------------------------------------------------------
const CLOUD_SLOW = new Set(['register', 'verifyEmail', 'resendCode', 'forgot', 'resetPassword', 'login']);
const CLOUD_PLAIN = new Set(['register', 'verifyEmail', 'resendCode', 'forgot', 'resetPassword', 'latest', 'ping']);
ipcMain.handle('cd:cloud', wrap(async (action, args = {}) => {
  const body = { action, ...args, lang: db.settings().lang };
  if (!CLOUD_PLAIN.has(action)) { Object.assign(body, await devInfo()); if (cache.account && cache.account.session && !body.session) body.session = cache.account.session; }
  const res = await cloud.post(GAS(), body, CLOUD_SLOW.has(action) ? 60000 : 20000); // Apps Script cold starts / sending the e-mail can take 10-30 s
  if (res.ok && action === 'login') {
    cache.account = { ...res.account, session: res.session, sub: res.sub }; db.setSetting('account', cache.account);
    if (res.token && PAID) lic.applyServer(res);
    const name = res.sub ? res.sub.id.split('@')[0] : res.account.username; const role = res.sub && res.sub.role === 'secretary' ? 'secretary' : 'admin'; actor = localActor(name, role, res.sub ? res.sub.perms : []);
    db.run('UPDATE secretaries SET role=? WHERE id=?', role, actor.id);
  } else if (PAID && res.ok && ['trialStart', 'redeem'].includes(action) && res.token) lic.applyServer(res);
  else if (res.ok && action === 'verifyEmail' && cache.account) { cache.account.emailVerified = true; db.setSetting('account', cache.account); }
  else if (PAID && !res.ok && res.code && !res.offline) { if (['TRIAL_USED', 'EXPIRED', 'REVOKED', 'DEVICE_LIMIT', 'BANNED'].includes(res.code)) lic.applyServer(res); }
  emit('license:changed', licStatus());
  if (res.session) delete res.session; // session token stays in the main process
  return res;
}));

// ---- system helpers ----------------------------------------------------------------------
const FONT_EXT = /\.(ttf|otf|woff2?)$/i;
const fontsDir = () => { const d = path.join(dataDir(), 'fonts'); try { fs.mkdirSync(d, { recursive: true }); } catch { /* ignore */ } return d; };
const SYS = {
  // user fonts (e.g. Zanjabeel.ttf, WastedVindey.otf): drop them in <data>/fonts, the file name is the font name
  customFonts: () => { const out = []; try { for (const f of fs.readdirSync(fontsDir()).filter((x) => FONT_EXT.test(x)).slice(0, 12)) { const fp = path.join(fontsDir(), f); if (fs.statSync(fp).size > 6 * 1024 * 1024) continue; const ext = f.split('.').pop().toLowerCase(); const mime = ext === 'woff2' ? 'font/woff2' : ext === 'woff' ? 'font/woff' : ext === 'otf' ? 'font/otf' : 'font/ttf'; out.push({ family: f.replace(FONT_EXT, '').replace(/[_-]+/g, ' ').trim(), url: `data:${mime};base64,` + fs.readFileSync(fp).toString('base64') }); } } catch { /* ignore */ } return out; },
  openFontsDir: () => { shell.openPath(fontsDir()); return true; },
  zoom: ({ f }) => { const z = Math.max(0.5, Math.min(2, Number(f) || 1)); if (win && !win.isDestroyed()) win.webContents.setZoomFactor(z); return z; },
  msStatus: () => { const c = msCfg(); const exe = msExe(); return { ...microsip().status(), enabled: c.enabled, path: c.path, found: exe, port: c.port, prefix: c.prefix, ini: exe ? require('./microsip').iniPathFor(exe) : '' }; },
  msSet: async ({ enabled, path: p, port, prefix }) => { const old = msCfg(); const next = { enabled: !!enabled, path: String(p || '').slice(0, 400), port: Number(port) || 3848, prefix: String(prefix || '').replace(/\D/g, '').slice(0, 4) };
    if (next.path && !require('./microsip').isMicroSip(next.path)) throw Object.assign(new Error('BAD_PATH'), { code: 'BAD_PATH' }); db.setSetting('s.microsip', next);
    try { await msStart(); } catch (e) { db.setSetting('s.microsip', { ...next, enabled: false }); throw e; } return SYS.msStatus(); },
  msPick: async () => { const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'MicroSIP', extensions: ['exe'] }] }); return r.canceled ? null : r.filePaths[0]; },
  msInstallHook: () => { const exe = msExe(); if (!exe) throw Object.assign(new Error('NO_MICROSIP'), { code: 'NO_MICROSIP' }); return microsip().installHook(exe); },
  msTest: ({ number }) => { onIncomingCall(String(number || '07700000000')); return true; },
  msOpen: () => { const exe = msExe(); if (!exe) throw Object.assign(new Error('NO_MICROSIP'), { code: 'NO_MICROSIP' }); require('child_process').spawn(exe, [], { detached: true, stdio: 'ignore' }).unref(); return true; },
  dial: async ({ phone }) => { const c = msCfg(); return require('./microsip').dial({ exe: msExe(), number: phone, prefix: c.prefix }); },
  phoneStatus: () => phone().status(),
  phoneSet: async ({ enabled, port }) => { const pl = phone(); db.setSetting('s.phoneLink', { enabled: !!enabled, port: Number(port) || 8765 }); if (enabled) await pl.start(Number(port) || 8765); else await pl.stop(); return pl.status(); },
  phonePin: () => phone().newPin(),
  serverInfo: () => ({ url: GAS(), fixed: !!cfg.gasUrl }),
  setServer: ({ url }) => { if (cfg.gasUrl) throw Object.assign(new Error('FIXED'), { code: 'FIXED' }); const u = String(url || '').trim(); if (u && !/^https:\/\/script\.google(usercontent)?\.com\/[\w\/.-]+$/.test(u)) throw Object.assign(new Error('BAD_URL'), { code: 'BAD_URL' }); db.setSetting('s.gasUrl', u); return { url: u }; },
  devUnlock: ({ code }) => {
    if (Date.now() < devLockUntil) return { ok: false, locked: true };
    const ok = crypto.createHash('sha256').update('cd-dev-v1:' + String(code || '')).digest('hex') === DEV_HASH;
    if (ok) { devUntil = Date.now() + 30 * 60000; devFails = 0; return { ok: true }; }
    if (++devFails >= 5) { devFails = 0; devLockUntil = Date.now() + 10 * 60000; report('E802', 'Repeated wrong developer code'); } return { ok: false };
  },
  diagnose: ({ fix }) => { const res = diag.run(db, svc, { fix: !!fix, snapshotDir: path.join(dataDir(), 'safety') }); for (const f of res.findings) report(f.code, `${diag.byCode(f.code).en} (x${f.count})`, f.fixed); return { ...res, catalog: res.findings.map((f) => diag.byCode(f.code)) }; },
  errorCatalog: () => diag.CATALOG,
  reportError: ({ code, desc, solved }) => { report(String(code || 'E901').slice(0, 6), String(desc || '').slice(0, 300), !!solved); return true; },
  license: () => licStatus(),
  autostart: ({ on }) => { if (on !== undefined) app.setLoginItemSettings({ openAtLogin: !!on, args: ['--hidden'] }); return { on: app.getLoginItemSettings().openAtLogin }; },
  checkUpdates: async () => { const r = await queryLatest(); if (r.ok && r.newer && pending && pending.version === r.version) r.ready = true; return r; },
  downloadUpdate: async ({ url }) => { const f = await fetchInstaller(url); return { file: path.basename(f) }; },
  installUpdate: () => applyUpdate(true),
  updateState: () => ({ pending: pending ? { version: pending.version } : null }),
  notices: async () => { if (!GAS()) return { ok: false, code: 'NO_SERVER' }; return cloud.post(GAS(), { action: 'notices' }, 10000); },
  edition: () => ({ paid: PAID, version: app.getVersion(), site: cfg.site, repo: cfg.githubRepo || '' }),
  heartbeat: async () => { await heartbeat(true); return licStatus(); },
  account: () => cache.account && { username: cache.account.username, email: cache.account.email, emailVerified: cache.account.emailVerified, sub: cache.account.sub },
  signOut: () => { cache.account = null; actor = null; db.run("DELETE FROM settings WHERE key='account'"); return true; },
  devNet: ({ offline }) => { if (Date.now() > devUntil) { report('E802', 'devNet without unlock'); throw new Error('FORBIDDEN'); } cloud.setOffline(offline); return { offline: cloud.isOffline() }; },
  devState: () => ({ offline: cloud.isOffline() }),
  devtools: () => { if (Date.now() > devUntil) { report('E802', 'devtools requested without unlock'); throw new Error('FORBIDDEN'); } if (win && !win.isDestroyed()) win.webContents.openDevTools({ mode: 'detach' }); return true; },
  ratingApi: async ({ base, token, items }) => {
    const u = String(base || '').trim(); if (!/^https:\/\//.test(u)) return { ok: false, code: 'BAD_URL' };
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 15000);
    try { const r = await fetch(u.replace(/\/$/, '') + '/ratings/create', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ items }), signal: ctl.signal }); const j = await r.json().catch(() => ({})); return r.ok ? { ok: true, links: j.links || {} } : { ok: false, code: 'HTTP_' + r.status }; }
    catch { return { ok: false, code: 'OFFLINE' }; } finally { clearTimeout(tm); }
  },
  info: () => ({ version: pkg.version, site: cfg.site, fp: ((fpInfo && fpInfo.fp) || '').slice(0, 12), dataDir: dataDir(), oauth: cfg.oauth }),
  open: (url) => { if (!ALLOWED_EXTERNAL.test(String(url))) throw new Error('BLOCKED_URL'); return shell.openExternal(url); },
  whatsapp: ({ phone, text }) => { const s = db.settings(); return shell.openExternal(M.waUrl(phone, text, s.countryCode)); },
  barcodeSvg: ({ code }) => barcode.svg(String(code)),
  printers: async () => (await win.webContents.getPrintersAsync()).map((p) => ({ name: p.name, isDefault: p.isDefault })),
  print: ({ html, printer, paper, silent = false }) => new Promise((resolve, reject) => {
    const w = new BrowserWindow({ show: false, webPreferences: { sandbox: true, javascript: false } });
    w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html)).then(() => {
      const size = ['A4', 'A5'].includes(paper && paper.name) ? paper.name : { width: Math.round((paper?.w || 80) * 1000), height: Math.round((paper?.h || 200) * 1000) };
      w.webContents.print({ silent, deviceName: printer || undefined, printBackground: true, pageSize: size }, (ok, err) => { w.destroy(); ok ? resolve(true) : reject(new Error(err || 'PRINT_FAILED')); });
    }, reject);
  }),
  importPick: async () => {
    const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Patients', extensions: ['csv', 'tsv', 'txt', 'json', 'vcf', 'sql', 'xlsx', 'db', 'sqlite', 'sqlite3'] }, { name: 'All', extensions: ['*'] }] }); if (r.canceled) return null;
    const st = fs.statSync(r.filePaths[0]); if (st.size > 60 * 1024 * 1024) throw new Error('FILE_TOO_BIG'); const p = require('../core/importer').parse(fs.readFileSync(r.filePaths[0]), path.basename(r.filePaths[0]));
    importCache = { rows: p.rows }; return { format: p.format, columns: p.columns, map: p.map, count: p.rows.length, preview: p.rows.slice(0, 6).map((x) => x.map((c) => (c == null ? '' : String(c).slice(0, 60)))), noHeader: p.noHeader, file: path.basename(r.filePaths[0]) };
  },
  importRun: ({ map, skipDuplicates }) => { if (!importCache) throw new Error('NO_IMPORT'); const I = require('../core/importer'); const patients = I.toPatients(importCache.rows, map || {}); importCache = null; return svc.call('importPatients', { patients, skipDuplicates: skipDuplicates !== false }, actor); },
  exportPatients: async ({ format }) => { const I = require('../core/importer'); const rows = svc.call('exportPatients', {}, actor); const out = I.exportAs(format, rows); const r = await dialog.showSaveDialog(win, { defaultPath: 'patients.' + out.ext, filters: [{ name: out.ext, extensions: [out.ext] }] }); if (r.canceled) return null; fs.writeFileSync(r.filePath, out.buffer); return { path: r.filePath, count: rows.length }; },
  exportBackup: async () => {
    const out = exportBackup(db, { accountId: cache.account ? cache.account.username : 'local', appVersion: pkg.version });
    const r = await dialog.showSaveDialog(win, { defaultPath: out.fileName, filters: [{ name: 'CareDesk backup', extensions: ['zip'] }] });
    if (r.canceled) return null; fs.writeFileSync(r.filePath, out.buffer); return r.filePath;
  },
  importBackup: async () => {
    const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'CareDesk backup', extensions: ['zip'] }] });
    if (r.canceled) return null; const f = r.filePaths[0]; return importBackup(db, fs.readFileSync(f), path.basename(f));
  },
  pickFile: async ({ ext = ['sqlite', 'db'] } = {}) => { const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'File', extensions: ext }] }); return r.canceled ? null : r.filePaths[0]; },
  pickImage: async () => { const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Image', extensions: ['png', 'jpg', 'jpeg', 'svg', 'webp'] }] }); if (r.canceled) return null; const f = r.filePaths[0]; const buf = fs.readFileSync(f); if (buf.length > 2e6) throw new Error('IMAGE_TOO_LARGE'); const ext = path.extname(f).slice(1).toLowerCase().replace('jpg', 'jpeg').replace('svg', 'svg+xml'); return `data:image/${ext};base64,${buf.toString('base64')}`; },
  eclinicProbe: ({ path: p }) => eclinic.probe(p), eclinicAutoMap: ({ columns }) => eclinic.autoMap(columns),
  eclinicQuery: ({ q, limit }) => { const s = db.settings().eclinic; if (!s.enabled || !s.path) return []; return eclinic.query(s, { q, limit }); },
  latest: async () => { const r = await cloud.post(GAS(), { action: 'latest' }); return { ...r, current: pkg.version }; },
  win: ({ op }) => { if (op === 'min') win.minimize(); else if (op === 'max') win.isMaximized() ? win.unmaximize() : win.maximize(); else if (op === 'close') win.close(); return win.isMaximized(); }
};
const NEED_LICENSE = new Set(['whatsapp', 'print', 'exportBackup', 'importBackup', 'eclinicQuery', 'eclinicProbe', 'pickImage']);
ipcMain.handle('cd:sys', wrap((name, args) => { if (!SYS[name]) throw new Error('unknown sys ' + name); if (NEED_LICENSE.has(name)) gate(); return SYS[name](args || {}); }));

let tray = null; let quitting = false;
function makeTray() {
  if (tray) return; try {
    tray = new Tray(nativeImage.createFromPath(path.join(__dirname, '../../build/icon.png')).resize({ width: 16, height: 16 })); tray.setToolTip('CareDesk');
    tray.setContextMenu(Menu.buildFromTemplate([{ label: 'CareDesk', click: () => { win.show(); win.focus(); } }, { type: 'separator' }, { label: 'Exit / خروج', click: () => { quitting = true; app.quit(); } }]));
    tray.on('click', () => { win.show(); win.focus(); });
  } catch { tray = null; }
}
function createWindow() {
  win = new BrowserWindow({
    width: 1360, height: 860, minWidth: 1080, minHeight: 680, frame: false, show: false, backgroundColor: '#051F20', title: 'CareDesk',
    icon: path.join(__dirname, '../../build/icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true, spellcheck: false }
  });
  const hiddenStart = process.argv.includes('--hidden'); win.once('ready-to-show', () => { if (!hiddenStart) win.show(); });
  setTimeout(() => { if (!hiddenStart && win && !win.isDestroyed() && !win.isVisible()) win.show(); }, 3000); // never stay invisible, even if the first paint is late
  win.on('session-end', () => { sessionEnding = true; }); // Windows is shutting down: never start an installer now
  win.on('minimize', () => { try { if (svc.getSettings().backgroundOnMinimize) { win.hide(); makeTray(); } } catch { /* ignore */ } });
  win.on('close', (e) => { try { if (!quitting && svc.getSettings().backgroundOnClose) { e.preventDefault(); win.hide(); makeTray(); } } catch { /* ignore */ } });
  win.webContents.setWindowOpenHandler(({ url }) => { if (ALLOWED_EXTERNAL.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  // developer tools only through the code-protected panel: native shortcuts are blocked, any other opening is closed and reported
  win.webContents.on('before-input-event', (e, i) => { const k = String(i.key || '').toLowerCase(); if (i.type === 'keyDown' && i.control && i.shift && !i.alt && i.code === 'KeyD') { e.preventDefault(); emit('diag:open'); return; } if (i.type === 'keyDown' && (k === 'f12' || (i.control && i.shift && ['i', 'j', 'c'].includes(k)))) { e.preventDefault(); if (win.webContents.isDevToolsOpened() && Date.now() > devUntil) win.webContents.closeDevTools(); } });
  win.webContents.on('devtools-opened', () => { if (Date.now() > devUntil) { try { win.webContents.closeDevTools(); } catch { /* ignore */ } report('E802', 'devtools opened outside the unlock flow'); } });
  win.webContents.on('render-process-gone', (_e, d) => report('E901', 'renderer process gone: ' + (d && d.reason)));
  win.loadFile(path.join(__dirname, '../renderer/index.html'));
}

process.on('uncaughtException', (e) => { try { report('E901', 'main: ' + String(e && e.message).slice(0, 200)); } catch { /* ignore */ } });
// Release builds ship config/integrity.json (sha256 of every app source file, made by scripts/make-integrity.js). A mismatch means the code was edited after build.
function verifyIntegrity() {
  try {
    if (!app.isPackaged || cfg.integrity === 'off') return true; const f = path.join(__dirname, '../../config/integrity.json'); if (!fs.existsSync(f)) return true;
    const want = JSON.parse(fs.readFileSync(f, 'utf8')); const root = path.join(__dirname, '../..'); const bad = [];
    for (const [rel, h] of Object.entries(want.files || {})) { let got = ''; try { got = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, rel))).digest('hex'); } catch { got = 'missing'; } if (got !== h) bad.push(rel); }
    if (!bad.length) return true;
    report('E801', 'Modified files: ' + bad.slice(0, 5).join(', ') + (bad.length > 5 ? ' +' + (bad.length - 5) : ''));
    if (cfg.integrity === 'warn') return true;
    dialog.showErrorBox('CareDesk', 'تم اكتشاف تعديل في ملفات التطبيق. أعد تثبيته من المصدر الرسمي. بياناتك لم تتأثر.\nApplication files were modified. Please reinstall from the official source. Your data is safe.'); app.quit(); return false;
  } catch { return true; }
}
app.on('second-instance', () => { if (win && !win.isDestroyed()) { if (win.isMinimized()) win.restore(); if (!win.isVisible()) win.show(); win.focus(); } }); // a copy hidden in the tray must come back when the user starts the app again
app.whenReady().then(() => {
  setTimeout(() => { msStart().catch(() => {}); }, 3500); // softphone bridge (only listens when enabled in Settings)
  setTimeout(() => { try { const pl = db.settings().phoneLink; if (pl && pl.enabled) phone().start(pl.port).catch(() => {}); } catch { /* ignore */ } }, 3000);
  Menu.setApplicationMenu(null);
  session.defaultSession.webRequest.onHeadersReceived((d, cb) => cb({ responseHeaders: { ...d.responseHeaders, 'Content-Security-Policy': ["default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; script-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"] } }));
  session.defaultSession.setPermissionRequestHandler((_w, _p, cb) => cb(false));
  boot(); createWindow();
  setTimeout(() => { if (!verifyIntegrity()) return; }, 2500); // file-integrity scan after the window is up (it reads every source file: slow on a cold disk with antivirus)
  setTimeout(() => { ensureFp().catch(() => {}); }, 1500); // device fingerprint in the background (cached after the first run)
  setTimeout(() => { try { if (!pending) fs.rmSync(UPD_FILE(), { force: true }); } catch { /* ignore */ } }, 15000); // leftover installer from a finished update
  setTimeout(autoUpdateTick, 25000); setInterval(autoUpdateTick, 4 * 3600 * 1000);
  setTimeout(flushReports, 6000); setInterval(flushReports, 30 * 60000);
  setTimeout(() => heartbeat(false), 3000); setInterval(() => heartbeat(false), 30 * 60000);
  setInterval(() => { try { if (!PAID || lic.status().canUse) { const r = svc.sweep({}, { name: 'system' }); if (r && (r.warned || r.dropped)) emit('notify', r); } } catch { /* ignore */ } }, 15 * 60000);
});
app.on('quit', () => { try { msInst && msInst.stop(); } catch { /* ignore */ }
   if (pending && !applying && !sessionEnding) applyUpdate(false); }); // closed by the user -> install the downloaded update silently
app.on('window-all-closed', () => { try { db && db.close(); } catch { /* ignore */ } app.quit(); });
