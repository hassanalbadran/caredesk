'use strict';
// Patient names import/export in many formats: CSV/TSV/TXT, JSON, vCard, SQL dump (INSERT), XLSX, SQLite (.db). Pure functions, no UI.
const { readZip, createZip } = require('./zip');
const FIELDS = ['name', 'phone', 'phone2', 'age', 'gender', 'address', 'notes'];
const SYN = {
  name: ['name', 'fullname', 'full_name', 'patient', 'patient_name', 'patientname', 'pname', 'اسم', 'الاسم', 'اسم المريض', 'المريض', 'fn'],
  phone: ['phone', 'mobile', 'tel', 'telephone', 'phone1', 'cell', 'gsm', 'هاتف', 'الهاتف', 'رقم الهاتف', 'موبايل', 'الموبايل', 'رقم', 'جوال'],
  phone2: ['phone2', 'mobile2', 'tel2', 'alt_phone', 'هاتف2', 'هاتف ثان', 'هاتف ثانٍ'],
  age: ['age', 'العمر', 'عمر'], gender: ['gender', 'sex', 'الجنس', 'جنس'], address: ['address', 'addr', 'العنوان', 'عنوان', 'city'], notes: ['notes', 'note', 'remarks', 'ملاحظات', 'ملاحظة']
};
const norm = (s) => String(s == null ? '' : s).trim().toLowerCase().replace(/[\s_\-]+/g, '');
const SYNN = Object.fromEntries(Object.entries(SYN).map(([k, v]) => [k, v.map(norm)]));
function autoMap(columns) { const map = {}; const used = new Set(); for (const f of FIELDS) { const i = columns.findIndex((c, ix) => !used.has(ix) && SYNN[f].includes(norm(c))); if (i >= 0) { map[f] = i; used.add(i); } } return map; }
const dig = (s) => String(s).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
function cleanPhone(p) { let s = dig(p == null ? '' : p).replace(/[^\d+]/g, ''); if (/^\+?964/.test(s)) s = '0' + s.replace(/^\+?964/, ''); else if (/^7\d{9}$/.test(s)) s = '0' + s; return s; }
function cleanGender(g) { const s = norm(g); if (['f', 'female', 'أنثى', 'انثى', 'انثي', 'أنثي', 'ذكر'.slice(0, 0) + 'امرأة', 'woman'].includes(s)) return 'F'; return 'M'; }

function parseDelimited(text) {
  const first = text.split(/\r?\n/, 1)[0] || ''; const delim = [['\t', first.split('\t').length], [';', first.split(';').length], ['|', first.split('|').length], [',', first.split(',').length]].sort((a, b) => b[1] - a[1])[0][0];
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) { const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true; else if (c === delim) { row.push(cur); cur = ''; } else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else if (c !== '\r') cur += c; }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); } return rows.filter((r) => r.some((x) => String(x).trim() !== ''));
}
function fromTable(rows) { // rows[0] may be a header
  if (!rows.length) return { columns: [], data: [] }; const head = rows[0].map((x) => String(x == null ? '' : x).trim()); const m = autoMap(head);
  if (m.name !== undefined) return { columns: head, data: rows.slice(1) };
  return { columns: head.map((_, i) => 'col' + (i + 1)), data: rows, noHeader: true };
}
function parseSql(text) { // INSERT INTO `t` (a,b) VALUES (..),(..);
  const out = []; const re = /INSERT\s+(?:IGNORE\s+)?INTO\s+[`"\[]?([\w.]+)[`"\]]?\s*(?:\(([^)]*)\))?\s*VALUES\s*/gi; let m;
  while ((m = re.exec(text))) { const cols = m[2] ? m[2].split(',').map((c) => c.trim().replace(/^[`"\[]|[`"\]]$/g, '')) : null; let i = re.lastIndex; const rows = [];
    for (;;) { while (/\s|,/.test(text[i] || '')) i++; if (text[i] !== '(') break; i++; const vals = []; let cur = '', q = null, isStr = false;
      for (; i < text.length; i++) { const c = text[i];
        if (q) { if (c === '\\') { cur += text[++i] || ''; } else if (c === q) { if (text[i + 1] === q) { cur += q; i++; } else q = null; } else cur += c; }
        else if (c === "'" || c === '"') { q = c; isStr = true; } else if (c === ',') { vals.push(isStr || cur.trim() !== 'NULL' ? cur.trim() === '' && !isStr ? '' : (isStr ? cur : cur.trim()) : ''); cur = ''; isStr = false; } else if (c === ')') { vals.push(isStr || cur.trim() !== 'NULL' ? (isStr ? cur : cur.trim()) : ''); i++; break; } else cur += c; }
      rows.push(vals); }
    out.push({ table: m[1], cols, rows }); }
  if (!out.length) return { columns: [], data: [] };
  const best = out.map((o) => ({ o, s: o.cols ? Object.keys(autoMap(o.cols)).length : 0, n: o.rows.length })).sort((a, b) => b.s - a.s || b.n - a.n)[0].o;
  return { columns: best.cols || best.rows[0].map((_, i) => 'col' + (i + 1)), data: best.rows, table: best.table };
}
function parseVcf(text) { const data = []; for (const card of text.split(/BEGIN:VCARD/i).slice(1)) { const get = (k) => { const m = new RegExp('^' + k + '[^:\\n]*:(.*)$', 'im').exec(card); return m ? m[1].trim() : ''; }; const tels = [...card.matchAll(/^TEL[^:\n]*:(.*)$/gim)].map((x) => x[1].trim()); data.push([get('FN') || get('N').replace(/;/g, ' ').trim(), tels[0] || '', tels[1] || '', get('ADR').replace(/;/g, ' ').trim(), get('NOTE')]); } return { columns: ['name', 'phone', 'phone2', 'address', 'notes'], data }; }
function parseJson(text) { let j = JSON.parse(text); if (!Array.isArray(j)) j = j.patients || j.data || j.rows || Object.values(j).find(Array.isArray) || []; if (j.length && typeof j[0] !== 'object') return { columns: ['name'], data: j.map((x) => [x]) }; const cols = [...new Set(j.flatMap((o) => Object.keys(o)))]; return { columns: cols, data: j.map((o) => cols.map((c) => o[c])) }; }
const xmlText = (s) => s.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const colIx = (ref) => { let n = 0; for (const ch of ref.replace(/\d+/g, '')) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
function parseXlsx(buf) {
  const files = new Map(readZip(buf).map((e) => [e.name, e.data])); const ss = files.get('xl/sharedStrings.xml'); const strings = ss ? [...ss.toString('utf8').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => xmlText([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join(''))) : [];
  const sheet = [...files.keys()].filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort()[0]; if (!sheet) throw new Error('no sheet'); const rows = [];
  for (const rm of files.get(sheet).toString('utf8').matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) { const row = [];
    for (const cm of rm[1].matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) { const ref = /r="([A-Z]+\d+)"/.exec(cm[1]); const type = /t="(\w+)"/.exec(cm[1]); const v = /<v>([\s\S]*?)<\/v>/.exec(cm[2] || ''); const is = /<is>([\s\S]*?)<\/is>/.exec(cm[2] || ''); let val = v ? v[1] : is ? xmlText(is[1]) : ''; if (type && type[1] === 's') val = strings[Number(val)] || ''; else val = xmlText(val); row[ref ? colIx(ref[1]) : row.length] = val; }
    rows.push(Array.from(row, (x) => (x === undefined ? '' : x))); }
  return fromTable(rows.filter((r) => r.some((x) => String(x).trim() !== '')));
}
function parseSqlite(buf) {
  const os = require('os'), fs = require('fs'), path = require('path'); const { DatabaseSync } = require('node:sqlite'); const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cdimp-')); const f = path.join(dir, 'x.db'); fs.writeFileSync(f, buf);
  try { const db = new DatabaseSync(f, { readOnly: true }); const tabs = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map((x) => x.name); let best = null;
    for (const t of tabs) { const cols = db.prepare(`PRAGMA table_info("${t.replace(/"/g, '')}")`).all().map((c) => c.name); const s = Object.keys(autoMap(cols)).length; if (!best || s > best.s) best = { t, cols, s }; }
    if (!best) return { columns: [], data: [] }; const rows = db.prepare(`SELECT * FROM "${best.t.replace(/"/g, '')}" LIMIT 50000`).all(); db.close();
    return { columns: best.cols, data: rows.map((r) => best.cols.map((c) => r[c])), table: best.t };
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
function parse(buf, filename = '') {
  const ext = (filename.split('.').pop() || '').toLowerCase(); let r, format;
  if (buf.subarray(0, 16).toString('latin1') === 'SQLite format 3\0') { format = 'sqlite'; r = parseSqlite(buf); }
  else if (buf[0] === 0x50 && buf[1] === 0x4b) { format = 'xlsx'; r = parseXlsx(buf); }
  else { let text = buf.toString('utf8'); if (text.includes('�') && buf[0] !== 0xff) text = new TextDecoder('windows-1256').decode(buf); text = text.replace(/^﻿/, '');
    if (ext === 'vcf' || /^BEGIN:VCARD/im.test(text)) { format = 'vcf'; r = parseVcf(text); }
    else if (ext === 'json' || /^\s*[[{]/.test(text)) { try { r = parseJson(text); format = 'json'; } catch { r = null; } }
    if (!r && (ext === 'sql' || /INSERT\s+INTO/i.test(text))) { format = 'sql'; r = parseSql(text); }
    if (!r) { format = ext === 'tsv' ? 'tsv' : ext === 'txt' ? 'txt' : 'csv'; r = fromTable(parseDelimited(text)); } }
  return { format, columns: r.columns, rows: r.data.slice(0, 50000), map: autoMap(r.columns), table: r.table || null, noHeader: !!r.noHeader };
}
// rows (arrays) + map {field: colIndex} -> patients [{name,phone,...}] skipping empty names
function toPatients(rows, map) {
  const out = []; for (const r of rows) { const g = (f) => (map[f] === undefined || map[f] === null || map[f] === '' ? '' : r[Number(map[f])]); const name = String(g('name') == null ? '' : g('name')).trim().replace(/\s+/g, ' '); if (!name) continue;
    const age = parseInt(dig(g('age')), 10);
    out.push({ name, phone: cleanPhone(g('phone')), phone2: cleanPhone(g('phone2')), age: Number.isFinite(age) && age > 0 && age < 120 ? age : null, gender: cleanGender(g('gender')), address: String(g('address') || '').trim(), notes: String(g('notes') || '').trim() }); }
  return out;
}
// ---- export ----
const csvCell = (v) => { const s = v == null ? '' : String(v); return /[",\n\r;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
function toCsv(rows) { return '﻿' + [FIELDS.concat(['code', 'status']).join(','), ...rows.map((r) => FIELDS.concat(['code', 'status']).map((f) => csvCell(r[f])).join(','))].join('\r\n') + '\r\n'; }
function toVcf(rows) { return rows.map((r) => `BEGIN:VCARD\r\nVERSION:3.0\r\nFN:${r.name}\r\nN:${r.name};;;;\r\n${r.phone ? 'TEL;TYPE=CELL:' + r.phone + '\r\n' : ''}${r.phone2 ? 'TEL;TYPE=CELL:' + r.phone2 + '\r\n' : ''}${r.address ? 'ADR:;;' + r.address + ';;;;\r\n' : ''}${r.notes ? 'NOTE:' + String(r.notes).replace(/\r?\n/g, ' ') + '\r\n' : ''}END:VCARD\r\n`).join(''); }
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const colL = (i) => String.fromCharCode(65 + i);
function toXlsx(rows) {
  const cols = FIELDS.concat(['code', 'status']); const all = [cols, ...rows.map((r) => cols.map((f) => r[f]))];
  const sheet = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView rightToLeft="1" workbookViewId="0"/></sheetViews><sheetData>' + all.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => (typeof v === 'number' ? `<c r="${colL(ci)}${ri + 1}"><v>${v}</v></c>` : `<c r="${colL(ci)}${ri + 1}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`)).join('')}</row>`).join('') + '</sheetData></worksheet>';
  return createZip([
    { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>' },
    { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { name: 'xl/workbook.xml', data: '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Patients" sheetId="1" r:id="rId1"/></sheets></workbook>' },
    { name: 'xl/_rels/workbook.xml.rels', data: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>' },
    { name: 'xl/worksheets/sheet1.xml', data: sheet }]);
}
function exportAs(format, rows) { if (format === 'csv') return { buffer: Buffer.from(toCsv(rows), 'utf8'), ext: 'csv' }; if (format === 'json') return { buffer: Buffer.from(JSON.stringify(rows, null, 2), 'utf8'), ext: 'json' }; if (format === 'vcf') return { buffer: Buffer.from(toVcf(rows), 'utf8'), ext: 'vcf' }; if (format === 'xlsx') return { buffer: toXlsx(rows), ext: 'xlsx' }; throw new Error('format'); }
module.exports = { parse, toPatients, exportAs, autoMap, FIELDS, cleanPhone };
