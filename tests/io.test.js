'use strict';
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const os = require('os'); const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { DB } = require('../src/core/db'); const { Service } = require('../src/core/service');
const { createZip, readZip } = require('../src/core/zip'); const B = require('../src/core/backup');
const bc = require('../src/core/barcode'); const E = require('../src/core/eclinic');

test('zip round trip, unicode names, traversal rejected', () => {
  const z = createZip([{ name: 'a/ملف.txt', data: 'مرحبا'.repeat(500) }, { name: 'b.bin', data: Buffer.from([1, 2, 3]) }]);
  const r = readZip(z); assert.strictEqual(r.length, 2); assert.strictEqual(r[0].data.toString(), 'مرحبا'.repeat(500)); assert.deepStrictEqual([...r[1].data], [1, 2, 3]);
  assert.throws(() => readZip(createZip([{ name: '../evil.txt', data: 'x' }])), /unsafe/);
  assert.throws(() => readZip(Buffer.from('not a zip at all, definitely not')), /not a zip/);
});
test('backup export -> import into a fresh DB restores data and keeps licence/identity', () => {
  const a = new DB(':memory:'); const s = new Service(a); const adm = s.saveSecretary({ name: 'Boss', role: 'god' });
  const t = s.saveCatalog({ kind: 'type', item: { name: 'T', duration_min: 30, price: 10 } }); const d = s.saveCatalog({ kind: 'device', item: { name: 'D' } });
  s.savePatient({ patient: { name: 'Zed Ali' }, bookings: [{ type_id: t, device_id: d, date: '2026-12-01', time: '10:00' }] }, { id: adm });
  s.saveSettings({ patch: { lang: 'en' } });
  const { fileName, buffer, manifest } = B.exportBackup(a, { accountId: 'u77' });
  assert.ok(fileName.endsWith('-CDBK.zip')); assert.strictEqual(manifest.counts.patients, 1);
  assert.ok(readZip(buffer).some((e) => e.name === 'excel/patients.csv') && readZip(buffer).some((e) => e.name === 'system/caredesk.sqlite'));
  const b = new DB(':memory:'); b.run("INSERT INTO settings(key,value) VALUES('lic','\"SEALED\"')");
  assert.throws(() => B.importBackup(b, buffer, 'whatever.zip'), /BAD_NAME/);
  B.importBackup(b, buffer, fileName);
  const s2 = new Service(b);
  assert.strictEqual(s2.listBookings({ showAll: true }).rows.length, 1); assert.strictEqual(s2.getSettings().lang, 'en');
  assert.strictEqual(b.get("SELECT value FROM settings WHERE key='lic'").value, '"SEALED"');
});
test('code128: every symbol sums to 11 modules and checksum/structure are valid', () => {
  bc.PATTERNS.slice(0, 106).forEach((p, i) => assert.strictEqual([...p].reduce((x, y) => x + Number(y), 0), 11, 'pattern ' + i));
  assert.strictEqual([...bc.PATTERNS[106]].reduce((x, y) => x + Number(y), 0), 13);
  const c = bc.codes('CD000123'); assert.strictEqual(c[0], 104); assert.strictEqual(c.at(-1), 106);
  let sum = 104; 'CD000123'.split('').forEach((ch, i) => { sum += (ch.charCodeAt(0) - 32) * (i + 1); }); assert.strictEqual(c.at(-2), sum % 103);
  assert.strictEqual(bc.modules('CD000123').length, (c.length - 1) * 11 + 13);
  assert.ok(bc.svg('CD000123').startsWith('<svg'));
});
test('e-clinic adapter: probe, auto-map and search/last-5 on a sqlite file', () => {
  const f = path.join(os.tmpdir(), 'eclinic-test-' + process.pid + '.db'); try { fs.unlinkSync(f); } catch { /* none */ }
  const x = new DatabaseSync(f); x.exec('CREATE TABLE patients(patient_id INTEGER, full_name TEXT, sex TEXT, birth_date TEXT, mobile TEXT, address TEXT)');
  for (let i = 1; i <= 8; i++) x.prepare('INSERT INTO patients VALUES(?,?,?,?,?,?)').run(i, 'Patient ' + i, i % 2 ? 'male' : 'أنثى', '1990-01-01', '0770000000' + i, 'Hilla'); x.close();
  const pr = E.probe(f); assert.strictEqual(pr.tables[0].name, 'patients');
  const m = E.autoMap(pr.tables[0].columns); assert.strictEqual(m.name, 'full_name'); assert.strictEqual(m.phone, 'mobile');
  const last = E.query({ path: f, table: 'patients', map: {} }, { limit: 5 }); assert.strictEqual(last.length, 5); assert.strictEqual(last[0].name, 'Patient 8'); assert.strictEqual(last[0].gender, 'F');
  assert.strictEqual(E.query({ path: f, table: 'patients', map: {} }, { q: 'Patient 3' })[0].ext_ref, '3');
  assert.throws(() => E.query({ path: f, table: 'patients; DROP TABLE x', map: {} }, {}), /TABLE_NOT_FOUND/);
  fs.unlinkSync(f);
});
