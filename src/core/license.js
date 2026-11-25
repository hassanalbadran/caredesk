'use strict';
const tierOf = (p) => (p.plan === 'trial' ? 'trial' : p.tier === 'max' ? 'max' : 'pro');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const SALT = 'caredesk.v1.fp';
const DAY = 86400000;
const TRIAL_DAYS = 14, WARN_DAYS = 7;
const sha = (s) => crypto.createHash('sha256').update(SALT + '|' + s).digest('hex');
const BAD = /^(0+|f+|to be filled.*|default string|none|n\/a|system serial number|not specified|unknown)$/i;

// ---- device fingerprint: composite + individual parts so a Windows reinstall can't reset the trial ----
function rawParts(exec = execFileSync, platform = process.platform) {
  const p = {};
  const run = (cmd, args) => { try { return String(exec(cmd, args, { timeout: 8000, windowsHide: true })).trim(); } catch { return ''; } };
  if (platform === 'win32') {
    const reg = run('reg', ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid']); p.guid = (reg.match(/MachineGuid\s+REG_SZ\s+(\S+)/i) || [])[1] || '';
    const ps = (q) => run('powershell', ['-NoProfile', '-NonInteractive', '-Command', q]);
    p.uuid = ps('(Get-CimInstance Win32_ComputerSystemProduct).UUID');
    p.board = ps('(Get-CimInstance Win32_BaseBoard).SerialNumber');
    p.bios = ps('(Get-CimInstance Win32_BIOS).SerialNumber');
  } else if (platform === 'darwin') {
    p.uuid = (run('ioreg', ['-rd1', '-c', 'IOPlatformExpertDevice']).match(/IOPlatformUUID" = "([^"]+)"/) || [])[1] || '';
  } else {
    try { p.guid = fs.readFileSync('/etc/machine-id', 'utf8').trim(); } catch { p.guid = ''; }
    try { p.uuid = fs.readFileSync('/sys/class/dmi/id/product_uuid', 'utf8').trim(); } catch { p.uuid = ''; }
  }
  return p;
}
function getFingerprint(opts = {}) {
  const raw = opts.parts || rawParts(opts.exec, opts.platform);
  const parts = {};
  for (const [k, v] of Object.entries(raw)) if (v && !BAD.test(v)) parts[k] = sha(k + ':' + v.toLowerCase());
  if (!Object.keys(parts).length) parts.host = sha('host:' + os.hostname() + os.cpus()[0]?.model);
  const fp = sha(Object.keys(parts).sort().map((k) => parts[k]).join('|'));
  return { fp, parts };
}

// ---- signed token (issued by the dashboard, RSA-SHA256) ----
const b64u = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64u = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
function verifyToken(token, publicKeyPem) {
  try {
    const [p, sig] = String(token).split('.'); if (!p || !sig) return null;
    const ok = crypto.createVerify('RSA-SHA256').update(p).verify(publicKeyPem, Buffer.from(sig.replace(/-/g, '+').replace(/_/g, '/'), 'base64'));
    return ok ? JSON.parse(fromB64u(p).toString('utf8')) : null;
  } catch { return null; }
}
function signToken(payload, privateKeyPem) { // used by tests/tools; production signing happens in the dashboard
  const p = b64u(JSON.stringify(payload));
  return p + '.' + crypto.createSign('RSA-SHA256').update(p).sign(privateKeyPem).toString('base64');
}

// ---- encrypted local license state bound to this machine ----
function seal(obj, fp) {
  const key = crypto.createHash('sha256').update('k|' + fp + SALT).digest(); const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv); const ct = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), ct]).toString('base64');
}
function unseal(b64, fp) {
  try {
    const buf = Buffer.from(b64, 'base64'); const key = crypto.createHash('sha256').update('k|' + fp + SALT).digest();
    const d = crypto.createDecipheriv('aes-256-gcm', key, buf.subarray(0, 12)); d.setAuthTag(buf.subarray(12, 28));
    return JSON.parse(Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString('utf8'));
  } catch { return null; }
}

// Survives uninstall/reinstall: a second copy of the trial start lives outside the app folder.
function fileMarkers(dirs) {
  return {
    read(fp) { for (const d of dirs) { try { const o = unseal(fs.readFileSync(path.join(d, 'cd.dat'), 'utf8'), fp); if (o) return o; } catch { /* next */ } } return null; },
    write(fp, obj) { const s = seal(obj, fp); for (const d of dirs) { try { fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, 'cd.dat'), s); } catch { /* best effort */ } } }
  };
}
const defaultMarkerDirs = () => process.platform === 'win32'
  ? [path.join(process.env.ProgramData || 'C:\\ProgramData', 'CareDesk'), path.join(process.env.LOCALAPPDATA || os.homedir(), 'Microsoft', 'CareDeskCache')]
  : [path.join(os.homedir(), '.cache', 'caredesk-lic')];

class License {
  constructor({ db, fp, publicKey, now = () => Date.now(), markers = fileMarkers(defaultMarkerDirs()) }) {
    this.db = db; this.fp = fp; this.pub = publicKey; this.now = now; this.markers = markers;
    this.blob = this._load();
  }
  _load() {
    const r = this.db.get("SELECT value FROM settings WHERE key='lic'");
    if (!r) return null;
    const o = unseal(JSON.parse(r.value), this.fp);
    return o || { tamper: true };
  }
  _save() { this.db.run("INSERT INTO settings(key,value) VALUES('lic',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", JSON.stringify(seal(this.blob, this.fp))); }
  // First launch: record a provisional local trial (honoured offline), restoring the original start if a marker exists.
  ensureStarted() {
    if (this.blob && !this.blob.tamper) return this.status();
    const mk = this.markers.read(this.fp);
    const startedAt = mk && mk.startedAt ? mk.startedAt : this.now();
    this.blob = { provisional: { startedAt }, maxSeen: this.now(), verifiedAt: 0 };
    this._save(); this.markers.write(this.fp, { startedAt });
    return this.status();
  }
  status() {
    const now = this.now(); const b = this.blob;
    if (!b) return { status: 'none', canUse: false };
    if (b.tamper) return { status: 'locked', reason: 'tamper', canUse: false };
    if (now < (b.maxSeen || 0) - 10 * 60000) return { status: 'locked', reason: 'clock', canUse: false };
    if (now > (b.maxSeen || 0) + 60000) { b.maxSeen = now; this._save(); }
    const payload = b.token ? verifyToken(b.token, this.pub) : null;
    if (b.lock && !(payload && payload.iat > (b.lock.at || 0))) return { status: 'locked', reason: b.lock.reason, canUse: false };
    if (payload && payload.fp === this.fp) {
      if (payload.exp == null) return { status: 'active', plan: payload.plan, tier: tierOf(payload), expiresAt: null, daysLeft: null, warn: false, canUse: true, account: payload.acct, seats: payload.seats };
      const left = payload.exp - now;
      if (left <= 0) return { status: 'expired', plan: payload.plan, tier: tierOf(payload), expiresAt: payload.exp, daysLeft: 0, canUse: false, account: payload.acct };
      return { status: payload.plan === 'trial' ? 'trial' : 'active', plan: payload.plan, tier: tierOf(payload), expiresAt: payload.exp, daysLeft: Math.ceil(left / DAY), warn: left <= WARN_DAYS * DAY, canUse: true, account: payload.acct, seats: payload.seats };
    }
    if (b.provisional) {
      const exp = b.provisional.startedAt + TRIAL_DAYS * DAY; const left = exp - now;
      if (left <= 0) return { status: 'expired', plan: 'trial', tier: 'trial', expiresAt: exp, daysLeft: 0, canUse: false, provisional: true };
      return { status: 'trial', plan: 'trial', tier: 'trial', provisional: true, expiresAt: exp, daysLeft: Math.ceil(left / DAY), warn: left <= WARN_DAYS * DAY, canUse: true };
    }
    return { status: 'none', canUse: false };
  }
  // Apply a reply from the dashboard: { ok:true, token, serverTime } or { ok:false, code }
  applyServer(res) {
    if (!this.blob || this.blob.tamper) this.blob = { maxSeen: this.now() };
    if (res && res.ok && res.token) {
      const p = verifyToken(res.token, this.pub);
      if (!p || p.fp !== this.fp) return { ok: false, code: 'BAD_TOKEN' };
      this.blob.token = res.token; delete this.blob.lock; this.blob.verifiedAt = this.now();
      if (res.serverTime) this.blob.maxSeen = Math.max(this.blob.maxSeen || 0, Number(res.serverTime));
      this._save(); return { ok: true, status: this.status() };
    }
    if (res && res.ok === false && ['TRIAL_USED', 'REVOKED', 'DEVICE_LIMIT', 'EXPIRED', 'BANNED'].includes(res.code)) {
      this.blob.lock = { reason: res.code, at: this.now() }; delete this.blob.token; this._save(); return { ok: false, code: res.code, status: this.status() };
    }
    return { ok: false, code: (res && res.code) || 'UNKNOWN' };
  }
  needsCheck(maxAgeMs = 6 * 3600 * 1000) { return !this.blob || !this.blob.verifiedAt || this.now() - this.blob.verifiedAt > maxAgeMs; }
}
module.exports = { License, getFingerprint, rawParts, verifyToken, signToken, seal, unseal, fileMarkers, TRIAL_DAYS, WARN_DAYS, DAY };
