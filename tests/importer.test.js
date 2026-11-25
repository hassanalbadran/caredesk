'use strict';
const test = require('node:test'); const assert = require('node:assert'); const I = require('../src/core/importer');
const P = (r) => I.toPatients(r.rows, r.map);
test('csv with arabic headers, quotes and arabic digits', () => {
  const r = I.parse(Buffer.from('﻿الاسم,الهاتف,العمر,الجنس\r\n"علي, حسن",٠٧٧٠١٢٣٤٥٦٧,٣٠,ذكر\r\nسارة,7712345678,25,أنثى\r\n'), 'a.csv'); const p = P(r);
  assert.strictEqual(r.format, 'csv'); assert.strictEqual(p.length, 2); assert.strictEqual(p[0].name, 'علي, حسن'); assert.strictEqual(p[0].phone, '07701234567'); assert.strictEqual(p[0].age, 30); assert.strictEqual(p[1].phone, '07712345678'); assert.strictEqual(p[1].gender, 'F');
});
test('plain names list without header (txt)', () => { const r = I.parse(Buffer.from('احمد\nمحمد\n'), 'n.txt'); assert.strictEqual(r.noHeader, true); const p = I.toPatients(r.rows, { name: 0 }); assert.deepStrictEqual(p.map((x) => x.name), ['احمد', 'محمد']); });
test('json, vcf and sql dump', () => {
  assert.strictEqual(P(I.parse(Buffer.from(JSON.stringify({ patients: [{ name: 'A', mobile: '0771' }] })), 'x.json'))[0].phone, '0771');
  const v = P(I.parse(Buffer.from('BEGIN:VCARD\nFN:Ali\nTEL:+9647701112222\nEND:VCARD\n'), 'c.vcf')); assert.strictEqual(v[0].name, 'Ali'); assert.strictEqual(v[0].phone, '07701112222');
  const s = P(I.parse(Buffer.from("INSERT INTO `pat` (`id`,`name`,`phone`) VALUES (1,'O''Neil, Jo','0770'),(2,'Sara',NULL);"), 'd.sql')); assert.strictEqual(s.length, 2); assert.strictEqual(s[0].name, "O'Neil, Jo"); assert.strictEqual(s[1].phone, '');
});
test('xlsx round trip and sqlite file', () => {
  const rows = [{ name: 'Ali', phone: '0770', age: 5, gender: 'M', address: 'x & y', notes: '', code: 'CD1', status: 'active' }, { name: 'سارة', phone: '0771', age: null, gender: 'F', address: '', notes: '', code: 'CD2', status: 'active' }];
  const x = I.exportAs('xlsx', rows); const p = P(I.parse(x.buffer, 'o.xlsx')); assert.deepStrictEqual(p.map((q) => q.name), ['Ali', 'سارة']); assert.strictEqual(p[0].address, 'x & y');
  const { DatabaseSync } = require('node:sqlite'); const os = require('os'), fs = require('fs'), path = require('path'); const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 't-')), 'e.db'); const d = new DatabaseSync(f); d.exec("CREATE TABLE other(a); CREATE TABLE patients(PatientName TEXT, Mobile TEXT); INSERT INTO patients VALUES('Ali','0770')"); d.close();
  const q = I.parse(fs.readFileSync(f), 'e.db'); assert.strictEqual(q.format, 'sqlite'); assert.strictEqual(P(q)[0].name, 'Ali');
  assert.ok(I.exportAs('csv', rows).buffer.toString().includes('Ali')); assert.ok(I.exportAs('vcf', rows).buffer.toString().includes('FN:Ali'));
});
