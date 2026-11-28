'use strict';
const { DatabaseSync } = require('node:sqlite');
const { DEFAULTS, DEFAULT_TAGS } = require('./defaults');
const { json } = require('./util');

const SCHEMA_VERSION = 1;
const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS secretaries(id INTEGER PRIMARY KEY, name TEXT NOT NULL, code_hash TEXT, salt TEXT, role TEXT NOT NULL DEFAULT 'secretary', perms TEXT NOT NULL DEFAULT '[]', active INTEGER NOT NULL DEFAULT 1, created_at INTEGER);
CREATE TABLE IF NOT EXISTS session_types(id INTEGER PRIMARY KEY, name TEXT NOT NULL, duration_min INTEGER NOT NULL DEFAULT 30, price REAL, per_day INTEGER NOT NULL DEFAULT 1, min_gap_min INTEGER NOT NULL DEFAULT 0, color TEXT, active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS devices(id INTEGER PRIMARY KEY, name TEXT NOT NULL, avg_min INTEGER, active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS device_types(device_id INTEGER NOT NULL, type_id INTEGER NOT NULL, PRIMARY KEY(device_id,type_id));
CREATE TABLE IF NOT EXISTS therapists(id INTEGER PRIMARY KEY, name TEXT NOT NULL, days TEXT NOT NULL DEFAULT '[0,1,2,3,4,6]', start TEXT, end TEXT, active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS therapist_devices(therapist_id INTEGER NOT NULL, device_id INTEGER NOT NULL, PRIMARY KEY(therapist_id,device_id));
CREATE TABLE IF NOT EXISTS patient_groups(id INTEGER PRIMARY KEY, name TEXT NOT NULL, days TEXT NOT NULL DEFAULT '[]', gap_days INTEGER NOT NULL DEFAULT 1, per_day INTEGER, repeat_weeks INTEGER NOT NULL DEFAULT 1, color TEXT, active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS tags(id INTEGER PRIMARY KEY, name TEXT NOT NULL, name_en TEXT, tone TEXT NOT NULL DEFAULT 'neg', effect TEXT NOT NULL DEFAULT '', system INTEGER NOT NULL DEFAULT 0, color TEXT);
CREATE TABLE IF NOT EXISTS patients(id INTEGER PRIMARY KEY, name TEXT NOT NULL, age INTEGER, gender TEXT, phone TEXT, phone2 TEXT, address TEXT, notes TEXT, barcode TEXT UNIQUE, ext_ref TEXT, group_id INTEGER, status TEXT NOT NULL DEFAULT 'active', status_at INTEGER, status_reason TEXT, created_at INTEGER, updated_at INTEGER);
CREATE TABLE IF NOT EXISTS patient_tags(patient_id INTEGER NOT NULL, tag_id INTEGER NOT NULL, PRIMARY KEY(patient_id,tag_id));
CREATE TABLE IF NOT EXISTS bookings(id INTEGER PRIMARY KEY, patient_id INTEGER NOT NULL, series_id INTEGER, type_id INTEGER, device_id INTEGER, therapist_id INTEGER, date TEXT NOT NULL, time TEXT NOT NULL, end_time TEXT NOT NULL, seq INTEGER, total INTEGER, status TEXT NOT NULL DEFAULT 'booked', price REAL, wa_status TEXT NOT NULL DEFAULT 'none', note TEXT, attended_at INTEGER, created_by INTEGER, created_at INTEGER);
CREATE INDEX IF NOT EXISTS idx_b_date ON bookings(date);
CREATE INDEX IF NOT EXISTS idx_b_patient ON bookings(patient_id);
CREATE TABLE IF NOT EXISTS notifications(id INTEGER PRIMARY KEY, ts INTEGER NOT NULL, kind TEXT NOT NULL, payload TEXT NOT NULL DEFAULT '{}', read INTEGER NOT NULL DEFAULT 0, resolved INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS audit_log(id INTEGER PRIMARY KEY, ts INTEGER NOT NULL, actor TEXT, action TEXT NOT NULL, entity TEXT, entity_id TEXT, detail TEXT);
CREATE TABLE IF NOT EXISTS rating_links(id INTEGER PRIMARY KEY, patient_id INTEGER, booking_id INTEGER, token TEXT UNIQUE, created_at INTEGER, score INTEGER, comment TEXT);
`;

class DB {
  constructor(file) {
    this.file = file;
    this.h = new DatabaseSync(file);
    this.h.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=OFF; PRAGMA synchronous=NORMAL;');
    this.h.exec(SCHEMA);
    this._migrate();
    this._seed();
  }
  _migrate() {
    const row = this.h.prepare("SELECT value FROM settings WHERE key='schema_version'").get();
    if (!row) this.h.prepare("INSERT INTO settings(key,value) VALUES('schema_version',?)").run(String(SCHEMA_VERSION));
    const cols = (t) => new Set(this.all(`PRAGMA table_info(${t})`).map((c) => c.name));
    const add = (t, c, def) => { if (!cols(t).has(c)) this.h.exec(`ALTER TABLE ${t} ADD COLUMN ${c} ${def}`); };
    // v2 (floor view): arrival + session timers survive restarts; auto tags are distinguishable from manual ones
    add('patients', 'pref_time', 'TEXT'); add('bookings', 'arrived_at', 'INTEGER'); add('bookings', 'timer_start', 'INTEGER'); add('bookings', 'timer_min', 'INTEGER'); add('patient_tags', 'auto', 'INTEGER NOT NULL DEFAULT 0');
    this.h.exec("UPDATE tags SET effect='vip' WHERE name='VIP' AND system=0 AND effect=''; UPDATE tags SET effect='committed',system=1 WHERE name='ملتزم' AND effect=''");
    for (const t of DEFAULT_TAGS) if (!this.get('SELECT 1 x FROM tags WHERE effect=? AND effect!=\'\'', t.effect) && t.effect) this.run('INSERT INTO tags(name,name_en,tone,effect,system,color) VALUES(?,?,?,?,?,?)', t.name, t.name_en, t.tone, t.effect, t.system, t.color);
    this.h.prepare("UPDATE settings SET value='2' WHERE key='schema_version'").run();
    this.h.exec("UPDATE secretaries SET role='admin' WHERE role IN ('manager','god')"); // only secretary + admin exist now
  }
  _seed() {
    if (this.h.prepare('SELECT COUNT(*) c FROM tags').get().c === 0) {
      const ins = this.h.prepare('INSERT INTO tags(name,name_en,tone,effect,system,color) VALUES(?,?,?,?,?,?)');
      for (const t of DEFAULT_TAGS) ins.run(t.name, t.name_en, t.tone, t.effect, t.system, t.color);
    }
  }
  all(sql, ...p) { return this.h.prepare(sql).all(...p); }
  get(sql, ...p) { return this.h.prepare(sql).get(...p); }
  run(sql, ...p) { return this.h.prepare(sql).run(...p); }
  tx(fn) {
    this.h.exec('BEGIN IMMEDIATE');
    try { const r = fn(); this.h.exec('COMMIT'); return r; } catch (e) { this.h.exec('ROLLBACK'); throw e; }
  }
  // settings: deep-merged with defaults on read
  getSetting(key, fallback) {
    const r = this.get('SELECT value FROM settings WHERE key=?', key);
    return r ? json(r.value, fallback) : fallback;
  }
  setSetting(key, value) {
    this.run('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', key, JSON.stringify(value));
  }
  settings() {
    const out = JSON.parse(JSON.stringify(DEFAULTS));
    for (const r of this.all("SELECT key,value FROM settings WHERE key LIKE 's.%'")) {
      const k = r.key.slice(2); const v = json(r.value);
      out[k] = (v && typeof v === 'object' && !Array.isArray(v) && typeof out[k] === 'object' && out[k]) ? deepMerge(out[k], v) : v;
    }
    return out;
  }
  saveSettings(patch) { for (const [k, v] of Object.entries(patch)) this.setSetting('s.' + k, v); return this.settings(); }
  snapshot(destFile) { this.h.exec(`VACUUM INTO '${destFile.replace(/'/g, "''")}'`); }
  close() { try { this.h.close(); } catch { /* already closed */ } }
}
function deepMerge(a, b) {
  const o = { ...a };
  for (const k of Object.keys(b)) o[k] = (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) ? deepMerge(a[k], b[k]) : b[k];
  return o;
}
module.exports = { DB, SCHEMA_VERSION };
