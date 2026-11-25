'use strict';
const test = require('node:test'); const assert = require('node:assert'); const crypto = require('crypto');
const { DB } = require('../src/core/db');
const L = require('../src/core/license');
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
const mem = () => { let m = null; return { read: () => m, write: (fp, o) => { m = o; } }; };
const parts = { guid: 'AAA-111', uuid: 'U-1234', board: 'BB22' };
function mk(over = {}) {
  const t = { now: Date.UTC(2026, 10, 19) };
  const { fp } = L.getFingerprint({ parts });
  const markers = over.markers || mem();
  const make = (db = new DB(':memory:')) => new L.License({ db, fp, publicKey, now: () => t.now, markers });
  return { t, fp, markers, make };
}
test('fingerprint is stable and ignores placeholder values', () => {
  const a = L.getFingerprint({ parts }).fp, b = L.getFingerprint({ parts: { ...parts, bios: 'To be filled by O.E.M.' } }).fp;
  assert.strictEqual(a, b); assert.notStrictEqual(a, L.getFingerprint({ parts: { ...parts, uuid: 'U-9999' } }).fp);
});
test('first run starts a provisional 14-day trial offline, warns in last 7 days, then locks', () => {
  const { t, make } = mk(); const lic = make(); const s = lic.ensureStarted();
  assert.strictEqual(s.status, 'trial'); assert.strictEqual(s.daysLeft, 14); assert.ok(!s.warn);
  t.now += 8 * L.DAY; assert.ok(lic.status().warn); assert.strictEqual(lic.status().daysLeft, 6);
  t.now += 7 * L.DAY; assert.strictEqual(lic.status().status, 'expired'); assert.ok(!lic.status().canUse);
});
test('reinstall (fresh DB) cannot reset the trial because of the external marker', () => {
  const { t, make } = mk(); make().ensureStarted(); t.now += 13 * L.DAY;
  const again = make(new DB(':memory:')).ensureStarted(); assert.strictEqual(again.daysLeft, 1);
});
test('server token activates; wrong device / forged token rejected; lifetime has no expiry', () => {
  const { t, fp, make } = mk(); const lic = make(); lic.ensureStarted();
  const good = L.signToken({ acct: 'u1', fp, plan: 'monthly', iat: t.now, exp: t.now + 30 * L.DAY }, privateKey);
  assert.strictEqual(lic.applyServer({ ok: true, token: good }).ok, true); assert.strictEqual(lic.status().plan, 'monthly');
  assert.strictEqual(lic.applyServer({ ok: true, token: L.signToken({ fp: 'other', plan: 'yearly', iat: t.now }, privateKey) }).code, 'BAD_TOKEN');
  const forged = L.signToken({ acct: 'x', fp, plan: 'lifetime', iat: t.now }, crypto.generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } }).privateKey);
  assert.strictEqual(lic.applyServer({ ok: true, token: forged }).code, 'BAD_TOKEN');
  t.now += 24 * L.DAY; assert.ok(lic.status().warn && lic.status().daysLeft === 6);
  t.now += 7 * L.DAY; assert.strictEqual(lic.status().status, 'expired');
  assert.strictEqual(lic.applyServer({ ok: true, token: L.signToken({ acct: 'u1', fp, plan: 'lifetime', iat: t.now, exp: null }, privateKey) }).ok, true);
  assert.strictEqual(lic.status().expiresAt, null); assert.ok(lic.status().canUse);
});
test('server says trial already used => locked immediately; a newer valid token unlocks', () => {
  const { t, fp, make } = mk(); const lic = make(); lic.ensureStarted();
  assert.strictEqual(lic.applyServer({ ok: false, code: 'TRIAL_USED' }).status.status, 'locked');
  t.now += 1000; lic.applyServer({ ok: true, token: L.signToken({ acct: 'u', fp, plan: 'yearly', iat: t.now, exp: t.now + 365 * L.DAY }, privateKey) });
  assert.ok(lic.status().canUse);
});
test('clock rollback and copied database are detected', () => {
  const { t, make, fp } = mk(); const db = new DB(':memory:'); const lic = make(db); lic.ensureStarted();
  t.now += 3 * L.DAY; lic.status(); t.now -= 2 * L.DAY;
  assert.strictEqual(lic.status().reason, 'clock');
  t.now += 2 * L.DAY;
  const other = new L.License({ db, fp: 'different-machine', publicKey, now: () => t.now, markers: mem() });
  assert.strictEqual(other.status().reason, 'tamper'); void fp;
});
