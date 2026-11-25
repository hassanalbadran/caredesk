'use strict';
// Runs gas/Code.gs against an in-memory mock of Apps Script to verify the licensing/anti-abuse rules.
const test = require('node:test'); const assert = require('node:assert'); const vm = require('vm'); const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const { verifyToken } = require('../src/core/license');
const DAY = 86400000;
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });

function boot() {
  const clock = { t: Date.UTC(2026, 10, 20, 8) }; const outbox = []; const props = {}; const cache = new Map(); const sheets = new Map();
  const toBuf = (x) => (typeof x === 'string' ? Buffer.from(x, 'utf8') : Buffer.from(x.map((b) => b & 255)));
  const signed = (b) => Array.from(b, (v) => (v > 127 ? v - 256 : v));
  class Range { constructor(s, r, c, nr, nc) { Object.assign(this, { s, r, c, nr, nc }); } setValues(v) { v.forEach((row, i) => row.forEach((x, j) => this.s.set(this.r + i, this.c + j, x))); return this; } setFontWeight() { return this; } setNumberFormat() { return this; } setValue(v) { this.s.set(this.r, this.c, v); return this; } }
  class Sheet { constructor(n) { this.n = n; this.rows = []; } set(r, c, v) { while (this.rows.length < r) this.rows.push([]); this.rows[r - 1][c - 1] = v; } getRange(r, c, nr = 1, nc = 1) { return new Range(this, r, c, nr, nc); } setFrozenRows() {} appendRow(a) { this.rows.push(a.slice()); } getDataRange() { const w = Math.max(...this.rows.map((r) => r.length)); return { getValues: () => this.rows.map((r) => Array.from({ length: w }, (_, i) => (r[i] === undefined ? '' : r[i]))) }; } deleteRow(r) { this.rows.splice(r - 1, 1); } }
  const book = { getSheetByName: (n) => sheets.get(n) || null, insertSheet: (n) => { const s = new Sheet(n); sheets.set(n, s); return s; }, getSheets: () => [...sheets.values()], deleteSheet() {}, getId: () => 'SS1', getUrl: () => 'http://sheet' };
  const sb = {
    console, Date: class extends Date { constructor(...a) { super(...(a.length ? a : [clock.t])); } static now() { return clock.t; } },
    Logger: { log() {} }, LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = v; } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => { const e = cache.get(k); return e && e.x > clock.t ? e.v : null; }, put: (k, v, ttl) => cache.set(k, { v, x: clock.t + ttl * 1000 }), remove: (k) => cache.delete(k) }) },
    SpreadsheetApp: { create: () => book, openById: () => book },
    ScriptApp: { getService: () => ({ getUrl: () => 'https://script.example/exec' }) }, Session: { getEffectiveUser: () => ({ getEmail: () => 'owner@gmail.com' }) },
    MailApp: { sendEmail: (o) => outbox.push(o), getRemainingDailyQuota: () => 100 },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (s) => ({ s, setMimeType() { return this; } }) },
    HtmlService: { XFrameOptionsMode: { DENY: 1 }, createHtmlOutput: (h) => ({ h, setTitle() { return this; } }), createHtmlOutputFromFile: () => ({ setTitle() { return this; }, addMetaTag() { return this; }, setXFrameOptionsMode() { return this; } }) },
    Utilities: { Charset: { UTF_8: 'utf8' }, getUuid: () => crypto.randomUUID(),
      computeHmacSha256Signature: (v, k) => signed(crypto.createHmac('sha256', toBuf(k)).update(toBuf(v)).digest()),
      computeRsaSha256Signature: (v, k) => signed(crypto.createSign('RSA-SHA256').update(toBuf(v)).sign(k)),
      base64Encode: (x) => toBuf(x).toString('base64'), base64EncodeWebSafe: (x) => toBuf(x).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
      base64DecodeWebSafe: (s) => signed(Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64')), newBlob: (b) => ({ getDataAsString: () => toBuf(b).toString('utf8') }) },
    setTimeout, JSON, Math, Object, String, Number, Array
  };
  const ctx = vm.createContext(sb); vm.runInContext(fs.readFileSync(path.join(__dirname, '../gas/Code.gs'), 'utf8'), ctx);
  const run = (code) => vm.runInContext(code, ctx);
  run('setup()'); props.LICENSE_PRIVATE_KEY = privateKey; run("setAdminPassword('Admin#Pass1')");
  const api = (action, body) => JSON.parse(run('doPost').call(null, { postData: { contents: JSON.stringify({ action, ...body }) } }).s);
  const adm = (fn, ...a) => run(fn)(...a);
  const mailCode = (to) => { const m = [...outbox].reverse().find((x) => x.to === to); return m.subject.match(/^(\d{6})/)[1]; };
  const signup = (u, dev) => { const r = api('register', { username: u, email: u + '@mail.com', phone: '0770', password: 'Passw0rd!', promo: true, lang: 'en' }); assert.ok(r.ok, JSON.stringify(r)); assert.ok(api('verifyEmail', { id: r.id, code: mailCode(u + '@mail.com') }).ok); const l = api('login', { id: u, password: 'Passw0rd!', ...dev }); assert.ok(l.ok, JSON.stringify(l)); return l; };
  return { clock, outbox, api, adm, run, mailCode, signup, props, sheets };
}
const D1 = { fp: 'fp-1', parts: { uuid: 'U1', board: 'B1' }, deviceName: 'PC-1' };
const claims = (tok) => verifyToken(tok, publicKey);

test('registration sends a 6-digit code in the subject; wrong code rejected; username/email unique', () => {
  const g = boot(); const r = g.api('register', { username: 'dr_ali', email: 'ali@mail.com', phone: '0770', password: 'Passw0rd!', promo: true, lang: 'ar' });
  assert.ok(r.ok); assert.match(g.outbox.at(-1).subject, /^\d{6} /);
  assert.strictEqual(g.api('verifyEmail', { id: r.id, code: '000000' }).code, 'BAD_CODE');
  g.clock.t += 6 * 60000; assert.strictEqual(g.api('verifyEmail', { id: r.id, code: g.mailCode('ali@mail.com') }).code, 'BAD_CODE'); // expired after 5 minutes
  assert.strictEqual(g.api('register', { username: 'DR_ALI', email: 'x@mail.com', password: 'Passw0rd!' }).code, 'USERNAME_TAKEN');
  assert.strictEqual(g.api('register', { username: 'other', email: 'ali@mail.com', password: 'Passw0rd!' }).code, 'EMAIL_TAKEN');
  assert.strictEqual(g.api('register', { username: 'weak', email: 'w@mail.com', password: '123' }).code, 'WEAK_PASSWORD');
});
test('trial: signed 14-day token bound to the device; second account on same device is refused', () => {
  const g = boot(); const a = g.signup('alice', D1);
  const t = g.api('trialStart', { session: a.session, ...D1 }); assert.ok(t.ok);
  const c = claims(t.token); assert.strictEqual(c.fp, 'fp-1'); assert.strictEqual(c.plan, 'trial'); assert.strictEqual(Math.round((c.exp - c.iat) / DAY), 14);
  const b = g.signup('bob', { ...D1 }); assert.strictEqual(g.api('trialStart', { session: b.session, ...D1 }).code, 'TRIAL_USED');
});
test('reinstalling Windows (new MachineGuid/fp, same SMBIOS uuid) does not give a new trial', () => {
  const g = boot(); const a = g.signup('alice', D1); g.api('trialStart', { session: a.session, ...D1 });
  const reinstalled = { fp: 'fp-NEW', parts: { guid: 'NEWGUID', uuid: 'U1', board: 'B1' }, deviceName: 'PC-1' };
  const c = g.signup('carol', reinstalled); assert.strictEqual(g.api('trialStart', { session: c.session, ...reinstalled }).code, 'TRIAL_USED');
});
test('deleting the account never resets the trial (registry survives)', () => {
  const g = boot(); const a = g.signup('dave', D1); g.api('trialStart', { session: a.session, ...D1 });
  const url = (g.run('doGet')({ parameter: {} }), null); void url;
  assert.ok(g.api('requestDelete', { session: a.session }).ok);
  const link = g.outbox.at(-1).htmlBody.match(/a=del&t=([^"]+)"/)[1];
  g.run('doGet')({ parameter: { a: 'del', t: decodeURIComponent(link) } });
  assert.strictEqual(g.api('login', { id: 'dave', password: 'Passw0rd!', ...D1 }).code, 'BAD_LOGIN');
  const e = g.signup('eve', D1); assert.strictEqual(g.api('trialStart', { session: e.session, ...D1 }).code, 'TRIAL_USED');
});
test('offline-provisional trial: heartbeat registers it, keeps original start, locks after 14 days and on account reuse', () => {
  const g = boot(); const start = g.clock.t - 5 * DAY; const r = g.api('check', { fp: 'fp-9', parts: { uuid: 'U9' }, provisionalStart: start });
  assert.ok(r.ok); assert.strictEqual(claims(r.token).exp, start + 14 * DAY);
  const a = g.signup('frank', { fp: 'fp-9', parts: { uuid: 'U9' } }); const t = g.api('trialStart', { session: a.session, fp: 'fp-9', parts: { uuid: 'U9' } });
  assert.ok(t.ok); assert.strictEqual(claims(t.token).exp, start + 14 * DAY); // linked, NOT restarted
  g.clock.t += 10 * DAY; assert.strictEqual(g.api('check', { fp: 'fp-9', parts: { uuid: 'U9' } }).code, 'EXPIRED');
  const again = g.api('check', { fp: 'fp-X', parts: { uuid: 'U9' }, provisionalStart: g.clock.t }); assert.strictEqual(again.ok, false); // same hardware, new install: still locked
  // anonymous (never signed up) trial that expired, then a reinstall on the same hardware
  g.api('check', { fp: 'fp-A', parts: { uuid: 'UA' }, provisionalStart: g.clock.t }); g.clock.t += 15 * DAY;
  assert.strictEqual(g.api('check', { fp: 'fp-B', parts: { uuid: 'UA' }, provisionalStart: g.clock.t }).code, 'TRIAL_USED');
});
test('activation by code is gone (open edition); device seat limit still enforced', () => {
  const g = boot(); const a = g.signup('gina', D1); const tok = g.run('hmacTok')({ admin: true }, 3600000);
  assert.strictEqual(g.api('redeem', { session: a.session, code: 'ANY', ...D1 }).code, 'UNKNOWN_ACTION');
  assert.ok(g.api('login', { id: 'gina', password: 'Passw0rd!', ...D1 }).ok);
  const D2 = { fp: 'fp-2', parts: { uuid: 'U2' }, deviceName: 'PC-2' };
  assert.strictEqual(g.api('login', { id: 'gina', password: 'Passw0rd!', ...D2 }).code, 'DEVICE_LIMIT');
  g.adm('adm_saveAccount', tok, 'gina', { seatsPc: 2 }); assert.ok(g.api('login', { id: 'gina', password: 'Passw0rd!', ...D2 }).ok);
});
test('sub-accounts (name@hasn.mr) log in on a second seat with their own password; temp password flag', () => {
  const g = boot(); const a = g.signup('hana', D1); const tok = g.run('hmacTok')({ admin: true }, 3600000);
  g.adm('adm_saveAccount', tok, 'hana', { seatsPc: 2 });
  const s = g.adm('adm_createSub', tok, 'hana', 'desk2', 'secretary', ['view_today']); assert.strictEqual(s.subId, 'desk2@hasn.mr');
  const l = g.api('login', { id: 'desk2@hasn.mr', password: s.password, fp: 'fp-2', parts: { uuid: 'U2' } });
  assert.ok(l.ok); assert.strictEqual(l.sub.tempPass, true); assert.strictEqual(l.account.username, 'hana'); void a;
  assert.ok(g.api('changePassword', { session: l.session, oldPassword: s.password, newPassword: 'NewPassw0rd!' }).ok);
  assert.strictEqual(g.api('login', { id: 'desk2@hasn.mr', password: s.password, fp: 'fp-2', parts: { uuid: 'U2' } }).code, 'BAD_LOGIN');
});
test('login brute force locks; admin needs password + e-mailed code; admin functions reject missing/forged tokens', () => {
  const g = boot(); g.signup('ivan', D1);
  for (let i = 0; i < 8; i++) assert.strictEqual(g.api('login', { id: 'ivan', password: 'wrong', ...D1 }).code, 'BAD_LOGIN');
  assert.strictEqual(g.api('login', { id: 'ivan', password: 'Passw0rd!', ...D1 }).code, 'LOCKED');
  assert.throws(() => g.adm('adm_accounts', 'forged.token', ''), /AUTH/); assert.throws(() => g.adm('adm_codes', '', ), /AUTH/);
  assert.strictEqual(g.adm('adm_login', 'bad').code, 'BAD_LOGIN'); assert.ok(g.adm('adm_login', 'Admin#Pass1').ok);
  assert.strictEqual(g.outbox.at(-1).to, 'owner@gmail.com'); assert.strictEqual(g.adm('adm_verify', '111111').code, 'BAD_CODE');
  const v = g.adm('adm_verify', g.mailCode('owner@gmail.com')); assert.ok(v.ok); assert.strictEqual(g.adm('adm_accounts', v.token, '').length, 1);
});
test('alerts list licences expiring within 7 days; unsubscribe only affects promo mail', () => {
  const g = boot(); const a = g.signup('jane', D1); const tok = g.run('hmacTok')({ admin: true }, 3600000);
  g.adm('adm_grant', tok, 'jane', 'custom', 5); assert.strictEqual(g.adm('adm_alerts', tok).length, 1);
  g.api('trialStart', { session: a.session, ...D1 });
  const link = g.run('unsubUrl')({ id: g.adm('adm_accounts', tok, 'jane')[0].id }).split('t=')[1];
  g.run('doGet')({ parameter: { a: 'unsub', t: decodeURIComponent(link) } });
  assert.strictEqual(g.adm('adm_accounts', tok, 'jane')[0].promo, false);
});

test('error reports are deduplicated, bad codes rejected, notices published to the app', () => {
  const g = boot(); const tok = g.run('hmacTok')({ admin: true }, 3600000);
  assert.strictEqual(g.api('report', { code: 'nope' }).code, 'BAD_REPORT');
  g.api('report', { code: 'E102', desc: 'x', account: 'gina', version: '0.1.0-beta.1', count: 1 }); g.api('report', { code: 'E102', desc: 'x', account: 'gina', version: '0.1.0-beta.1', count: 2 });
  const rows = g.adm('adm_errors', tok, false); assert.strictEqual(rows.length, 1); assert.strictEqual(Number(rows[0].count), 3);
  g.adm('adm_handleError', tok, rows[0].id, true); assert.strictEqual(g.adm('adm_errors', tok, true).length, 0);
  assert.ok(g.adm('adm_errorCatalog', tok).some((c) => c.code === 'E901'));
  g.adm('adm_saveNotice', tok, { title: 'مرحبا', body: 'b', kind: 'info', active: true }); assert.strictEqual(g.api('notices', {}).items[0].title, 'مرحبا');
});
