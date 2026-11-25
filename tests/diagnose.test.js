'use strict';
const test = require('node:test'); const assert = require('node:assert'); const os = require('os'), fs = require('fs'), path = require('path');
const { DB } = require('../src/core/db'); const { Service } = require('../src/core/service'); const D = require('../src/core/diagnose');
function setup() { const db = new DB(':memory:'); const now = new Date(2026, 10, 22, 8).getTime(); const svc = new Service(db, { now: () => now });
  const A = { id: svc.saveSecretary({ name: 'Admin', role: 'god' }), name: 'Admin' }; const type = svc.saveCatalog({ kind: 'type', item: { name: 'Pull', duration_min: 20, price: 5, per_day: 1, min_gap_min: 0 } }, A);
  const dev = svc.saveCatalog({ kind: 'device', item: { name: 'P1', typeIds: [type], avg_min: 20 } }, A);
  const mk = (n, time, date = '2026-11-22') => svc.savePatient({ patient: { name: n }, bookings: [{ type_id: type, device_id: dev, date, time }] }, A).id; return { db, svc, A, type, dev, mk, now }; }
const counts = (db) => ({ p: db.get('SELECT COUNT(*) n FROM patients').n, b: db.get('SELECT COUNT(*) n FROM bookings').n });
test('clean database reports nothing', () => { const o = setup(); o.mk('a', '09:00'); const r = D.run(o.db, o.svc, {}); assert.deepStrictEqual(r.findings, []); assert.ok(r.ok); });
test('scan only reports; fix repairs without deleting any patient or session, and snapshots first', () => {
  const o = setup(); const a = o.mk('a', '09:00'); const b = o.mk('b', '09:30'); o.mk('c', '10:00'); const before = counts(o.db);
  o.db.run("UPDATE bookings SET status='in_session',timer_start=?,timer_min=20,date='2026-11-20' WHERE patient_id=?", o.now - 1e6, a);          // E103
  o.db.run("UPDATE bookings SET end_time='00:10' WHERE patient_id=?", b);                                                                      // E105
  o.db.run("UPDATE patients SET barcode=NULL WHERE id=?", a);                                                                                  // E107
  o.db.run('INSERT INTO patient_tags(patient_id,tag_id) VALUES(?,9999)', a);                                                                   // E109
  o.db.run('UPDATE bookings SET device_id=777 WHERE patient_id=?', b);                                                                         // E110
  o.db.run('UPDATE bookings SET price=-5 WHERE patient_id=?', b);                                                                              // E114
  o.db.setSetting('s.theme', 'neon');                                                                                                          // E108
  const scan = D.run(o.db, o.svc, {}); const codes = scan.findings.map((f) => f.code).sort(); for (const c of ['E103', 'E105', 'E107', 'E108', 'E109', 'E110', 'E114']) assert.ok(codes.includes(c), c); assert.ok(scan.findings.every((f) => !f.fixed));
  assert.strictEqual(o.db.get('SELECT status FROM bookings WHERE patient_id=?', a).status, 'in_session', 'scan must not change data');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'snap-')); const fx = D.run(o.db, o.svc, { fix: true, snapshotDir: dir, now: o.now }); assert.ok(fx.snapshot && fs.existsSync(fx.snapshot), 'snapshot before repair');
  assert.deepStrictEqual(counts(o.db), before, 'nothing deleted'); assert.deepStrictEqual(D.run(o.db, o.svc, {}).findings, [], 'clean after repair'); assert.strictEqual(o.db.settings().theme !== 'neon', true);
  assert.strictEqual(o.db.get('SELECT status FROM bookings WHERE patient_id=?', a).status, 'attended'); assert.strictEqual(o.db.get('SELECT end_time FROM bookings WHERE patient_id=?', b).end_time, '09:50');
});
test('overlap is reported but never auto-moved; catalog covers every code', () => {
  const o = setup(); o.mk('a', '09:00'); o.mk('b', '09:10'); const r = D.run(o.db, o.svc, { fix: true }); assert.ok(r.findings.some((f) => f.code === 'E106' && !f.fixed)); assert.strictEqual(r.ok, false);
  for (const f of r.findings) assert.notStrictEqual(D.byCode(f.code).name, 'UNKNOWN'); assert.ok(D.CATALOG.every((c) => c.ar && c.en && c.steps_ar.length && c.steps_en.length));
});
