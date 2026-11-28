'use strict';
const fs = require('fs'); const os = require('os'); const path = require('path');
const { createZip, readZip } = require('./zip');
const SUFFIX = '-CDBK.zip'; // fixed identifier every CareDesk backup file must end with
const TABLES = ['secretaries', 'session_types', 'devices', 'device_types', 'therapists', 'therapist_devices', 'patient_groups', 'tags', 'patients', 'patient_tags', 'bookings', 'notifications', 'audit_log', 'rating_links'];
const KEEP_SETTINGS = new Set(['lic', 'schema_version', 'account']); // never exported/overwritten: licence & cloud identity stay with the machine
const csv = (rows) => { if (!rows.length) return '﻿'; const cols = Object.keys(rows[0]); const q = (v) => { const s = v == null ? '' : String(v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }; return '﻿' + [cols.join(','), ...rows.map((r) => cols.map((c) => q(r[c])).join(','))].join('\r\n'); };
const stamp = (d = new Date()) => d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0');

function exportBackup(db, { accountId = 'local', appVersion = '1.1.0', when = new Date() } = {}) {
  const entries = []; const counts = {};
  for (const t of TABLES) { const rows = db.all(`SELECT * FROM ${t}`); counts[t] = rows.length; entries.push({ name: `data/${t}.json`, data: JSON.stringify(rows) }); }
  const settings = db.all('SELECT key,value FROM settings').filter((r) => !KEEP_SETTINGS.has(r.key));
  entries.push({ name: 'data/settings.json', data: JSON.stringify(settings) });
  const p = db.all(`SELECT p.id,p.barcode,p.name,p.age,p.gender,p.phone,p.phone2,p.address,p.status FROM patients p ORDER BY p.id`);
  const b = db.all(`SELECT b.id,p.name patient,b.date,b.time,b.end_time,t.name type,d.name device,th.name therapist,b.status,b.price FROM bookings b JOIN patients p ON p.id=b.patient_id LEFT JOIN session_types t ON t.id=b.type_id LEFT JOIN devices d ON d.id=b.device_id LEFT JOIN therapists th ON th.id=b.therapist_id WHERE b.status!='cancelled' ORDER BY b.date,b.time`);
  entries.push({ name: 'excel/patients.csv', data: csv(p) }, { name: 'excel/bookings.csv', data: csv(b) });
  const tmp = path.join(os.tmpdir(), `cd-snap-${process.pid}-${Date.now()}.sqlite`);
  try { db.snapshot(tmp); entries.push({ name: 'system/caredesk.sqlite', data: fs.readFileSync(tmp) }); } finally { for (const x of [tmp, tmp + '-wal', tmp + '-shm']) { try { fs.unlinkSync(x); } catch { /* ignore */ } } }
  const manifest = { format: 'caredesk-backup', formatVersion: 1, appVersion, accountId, createdAt: when.toISOString(), counts };
  entries.unshift({ name: 'manifest.json', data: JSON.stringify(manifest, null, 2) });
  return { fileName: `CareDesk-${accountId}-${stamp(when)}${SUFFIX}`, buffer: createZip(entries, when), manifest };
}
function importBackup(db, buffer, fileName) {
  if (!String(fileName || '').toUpperCase().endsWith(SUFFIX.toUpperCase())) throw new Error('BAD_NAME');
  const files = new Map(readZip(buffer).map((e) => [e.name, e.data]));
  const mf = files.get('manifest.json'); if (!mf) throw new Error('NO_MANIFEST');
  const manifest = JSON.parse(mf.toString('utf8')); if (manifest.format !== 'caredesk-backup') throw new Error('BAD_FORMAT');
  const parse = (n) => JSON.parse((files.get(`data/${n}.json`) || Buffer.from('[]')).toString('utf8'));
  const cols = (t) => new Set(db.all(`PRAGMA table_info(${t})`).map((c) => c.name));
  const restored = {};
  db.tx(() => {
    for (const t of [...TABLES].reverse()) db.run(`DELETE FROM ${t}`);
    for (const t of TABLES) {
      const have = cols(t); const rows = parse(t); restored[t] = rows.length;
      for (const r of rows) { const ks = Object.keys(r).filter((k) => have.has(k)); db.run(`INSERT INTO ${t}(${ks.join(',')}) VALUES(${ks.map(() => '?').join(',')})`, ...ks.map((k) => r[k])); }
    }
    for (const s of parse('settings')) if (!KEEP_SETTINGS.has(s.key)) db.run('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', s.key, s.value);
  });
  return { manifest, restored };
}
module.exports = { exportBackup, importBackup, SUFFIX };
