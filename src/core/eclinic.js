'use strict';
// Read-only adapter for the e-clinic local database. Currently SQLite files; the column mapping is configurable
// because every clinic's schema differs. Identifiers are whitelisted against the real schema before use.
const { DatabaseSync } = require('node:sqlite');
const ident = (s) => '"' + String(s).replace(/"/g, '""') + '"';
function open(file) { return new DatabaseSync(file, { readOnly: true }); }
function probe(file) {
  const db = open(file);
  try { return { tables: db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map((t) => ({ name: t.name, columns: db.prepare(`PRAGMA table_info(${ident(t.name)})`).all().map((c) => c.name) })) }; }
  finally { db.close(); }
}
const GUESS = { id: /^(id|patient_?id|pat_?id|code|file_?no)$/i, name: /(full_?name|patient_?name|^name$|اسم)/i, age: /^age$/i, birth: /(birth|dob)/i, gender: /(gender|sex|جنس)/i, phone: /(phone|mobile|tel|هاتف|موبايل)/i, address: /(address|city|سكن|عنوان)/i, order: /(created|date_?added|reg(istered)?_?(at|date)|id)$/i };
function autoMap(columns) { const m = {}; for (const [k, re] of Object.entries(GUESS)) { const c = columns.find((x) => re.test(x)); if (c) m[k] = c; } return m; }
const normGender = (g) => { const s = String(g ?? '').trim().toLowerCase(); if (['f', 'female', 'أنثى', 'انثى', 'انثي', 'امرأة', '2'].includes(s)) return 'F'; return 'M'; };
function ageFrom(birth) { const t = Date.parse(birth); if (!t) return null; return Math.max(0, Math.floor((Date.now() - t) / (365.25 * 86400000))); }
function toPatient(row, m) {
  return { ext_ref: row[m.id] != null ? String(row[m.id]) : null, name: String(row[m.name] ?? '').trim(), age: m.age ? Number(row[m.age]) || null : (m.birth ? ageFrom(row[m.birth]) : null), gender: m.gender ? normGender(row[m.gender]) : 'M', phone: m.phone ? String(row[m.phone] ?? '') : '', address: m.address ? String(row[m.address] ?? '') : '' };
}
function query(cfg, { q = '', limit = 5 }) {
  const db = open(cfg.path);
  try {
    const info = db.prepare(`PRAGMA table_info(${ident(cfg.table)})`).all().map((c) => c.name); if (!info.length) throw new Error('TABLE_NOT_FOUND');
    const m = cfg.map && cfg.map.name ? cfg.map : autoMap(info);
    for (const c of Object.values(m)) if (!info.includes(c)) throw new Error('BAD_COLUMN ' + c);
    const order = m.order || m.id || info[0]; const like = `%${q}%`;
    const where = q ? `WHERE ${[m.name, m.phone].filter(Boolean).map((c) => ident(c) + ' LIKE ?').join(' OR ')}` : '';
    const params = q ? [like, like].slice(0, [m.name, m.phone].filter(Boolean).length) : [];
    return db.prepare(`SELECT * FROM ${ident(cfg.table)} ${where} ORDER BY ${ident(order)} DESC LIMIT ?`).all(...params, Math.min(limit, 200)).map((r) => toPatient(r, m));
  } finally { db.close(); }
}
module.exports = { probe, autoMap, query, toPatient };
