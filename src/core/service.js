'use strict';
const crypto = require('crypto');
const { toMin, fromMin, addDays, todayISO, monthRange, json, diffDays } = require('./util');
const { Occupancy, distribute, detectConflicts, suggest, freeGaps, suggestCompaction, findSlot, dayWindow } = require('./scheduler');
const M = require('./messages');
const { ROLE_PERMS } = require('./defaults');

const { parseCaller, sameNumber } = require('./callerid');
const hash = (code, salt) => crypto.scryptSync(String(code), salt, 32).toString('hex');
const PERM_OF = { // method -> permission needed (others need no permission)
  savePatient: 'add_patient', dropPatient: 'edit_patient', archivePatient: 'edit_patient', restorePatient: 'edit_patient', setPatientTags: 'edit_patient',
  deletePatient: 'delete_patient', setAttendance: 'mark_attendance', updateBooking: 'edit_patient', cancelBooking: 'cancel_session',
  saveSettings: 'manage_settings', saveLook: 'settings_look', importPatients: 'import_export', exportPatients: 'import_export', saveCatalog: 'manage_settings', deleteCatalog: 'manage_settings', saveSecretary: 'manage_staff',
  monthCalendar: 'view_calendar', dayStats: 'view_stats', absentees: 'view_stats', listAudit: 'view_audit',
  compactionApply: 'edit_patient', homeMonth: 'view_calendar', managerStats: 'view_stats', typePage: 'view_calendar', deviceDay: 'view_calendar', dayLoad: 'view_calendar', dayLoads: 'view_calendar', moveBooking: 'reschedule', addBooking: 'edit_patient', retimePatient: 'edit_patient', markArrived: 'mark_attendance', startTimer: 'mark_attendance', restartTimer: 'mark_attendance', setTimerMinutes: 'mark_attendance', finishSession: 'mark_attendance', listTimers: 'view_today', setMaintenance: 'edit_patient', patientList: 'view_today', planFromExamples: 'add_patient', planFromClass: 'add_patient', planFromPattern: 'add_patient', rememberPattern: 'add_patient', patternList: 'add_patient', reminderList: 'use_tools', reminderUpcoming: 'use_tools', callScript: 'use_tools', createRatingLinks: 'use_tools', setWaStatus: 'use_tools'
};
const MONEY = new Set(['price', 'income', 'loss', 'revenue', 'paid', 'fee']);
function redactMoney(v) { // users without view_income never receive amounts
  if (Array.isArray(v)) return v.map(redactMoney);
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k] = MONEY.has(k) && typeof v[k] === 'number' ? null : redactMoney(v[k]); return o; }
  return v;
}
const CAT_DEFAULTS = {
  type: { duration_min: 30, per_day: 1, min_gap_min: 0 },
  group: { days: '[]', gap_days: 1, repeat_weeks: 1 },
  therapist: { days: '[0,1,2,3,4,6]' },
  tag: { tone: 'neg', effect: '' }
};
const CATALOG = {
  type: { table: 'session_types', cols: ['name', 'duration_min', 'price', 'per_day', 'min_gap_min', 'color', 'active'] },
  device: { table: 'devices', cols: ['name', 'avg_min', 'active'] },
  therapist: { table: 'therapists', cols: ['name', 'days', 'start', 'end', 'active'] },
  group: { table: 'patient_groups', cols: ['name', 'days', 'gap_days', 'per_day', 'repeat_weeks', 'color', 'active'] },
  tag: { table: 'tags', cols: ['name', 'name_en', 'tone', 'effect', 'color'] }
};

class Service {
  constructor(db, { now = () => Date.now() } = {}) { this.db = db; this.now = now; }
  today() { return todayISO(this.now()); }

  // -- dispatcher with permission check --------------------------------------
  call(method, args, actor) {
    if (typeof this[method] !== 'function' || method.startsWith('_') || ['call', 'constructor'].includes(method)) throw new Error('unknown method ' + method);
    const need = PERM_OF[method];
    if (need && actor && !this._perms(actor).includes(need)) { const e = new Error('forbidden'); e.code = 'FORBIDDEN'; throw e; }
    const out = this[method](args || {}, actor);
    return actor && !this._perms(actor).includes('view_income') ? redactMoney(out) : out;
  }
  _perms(actor) {
    const s = this.db.get('SELECT role,perms,active FROM secretaries WHERE id=?', actor.id);
    if (!s || !s.active) return [];
    if (s.role === 'god' || s.role === 'manager') return ROLE_PERMS[s.role];
    const extra = json(s.perms, []);
    return extra.length ? extra : ROLE_PERMS[s.role] || [];
  }
  _log(actor, action, entity, id, detail) {
    this.db.run('INSERT INTO audit_log(ts,actor,action,entity,entity_id,detail) VALUES(?,?,?,?,?,?)', this.now(), actor ? actor.name || String(actor.id) : 'system', action, entity || null, id == null ? null : String(id), detail ? JSON.stringify(detail) : null);
  }
  _notify(kind, payload) {
    const key = JSON.stringify(payload);
    const dup = this.db.get("SELECT id FROM notifications WHERE kind=? AND payload=? AND resolved=0", kind, key);
    if (!dup) this.db.run('INSERT INTO notifications(ts,kind,payload) VALUES(?,?,?)', this.now(), kind, key);
  }

  // -- settings & catalogs -----------------------------------------------------
  getSettings() { return this.db.settings(); }
  // bulk import of patient names (already parsed by importer.js). Duplicates (same phone, or same name when no phone) are skipped.
  importPatients({ patients, skipDuplicates = true }, actor) {
    const d = this.db; let added = 0, skipped = 0; const seenP = new Set(), seenN = new Set();
    for (const r of d.all('SELECT name,phone FROM patients')) { if (r.phone) seenP.add(r.phone); else seenN.add(r.name.trim().toLowerCase()); }
    { for (const p of patients) { const nk = p.name.trim().toLowerCase(); const dup = p.phone ? seenP.has(p.phone) : seenN.has(nk); if (skipDuplicates && dup) { skipped++; continue; } this.savePatient({ patient: { name: p.name, phone: p.phone || '', phone2: p.phone2 || '', age: p.age, gender: p.gender || 'M', address: p.address || '', notes: p.notes || '' } }, actor); added++; if (p.phone) seenP.add(p.phone); else seenN.add(nk); } }
    this._log(actor, 'patients.import', 'patient', null, { added, skipped }); return { added, skipped, total: patients.length };
  }
  exportPatients(_a, _actor) { return this.db.all('SELECT name,phone,phone2,age,gender,address,notes,barcode code,status FROM patients ORDER BY name'); }
  saveLook({ patch }, actor) { const ok = ['lang', 'theme', 'fontScale', 'autoFit', 'fontPack', 'fontUi', 'fontHead', 'customCursor', 'reduceMotion', 'sounds']; const p = {}; for (const k of ok) if (k in patch) p[k] = patch[k]; const s = this.db.saveSettings(p); this._log(actor, 'settings.look', 'settings', null, Object.keys(p)); return s; }
  saveSettings({ patch }, actor) { const s = this.db.saveSettings(patch); this._log(actor, 'settings.save', 'settings', null, Object.keys(patch)); return s; }
  getCatalog() {
    const d = this.db;
    const types = d.all('SELECT * FROM session_types ORDER BY id');
    const devices = d.all('SELECT * FROM devices ORDER BY id').map((x) => ({ ...x, typeIds: d.all('SELECT type_id FROM device_types WHERE device_id=?', x.id).map((r) => r.type_id) }));
    const therapists = d.all('SELECT * FROM therapists ORDER BY id').map((x) => ({ ...x, days: json(x.days, []), deviceIds: d.all('SELECT device_id FROM therapist_devices WHERE therapist_id=?', x.id).map((r) => r.device_id) }));
    const groups = d.all('SELECT * FROM patient_groups ORDER BY id').map((x) => ({ ...x, days: json(x.days, []).map(Number) }));
    const tags = d.all('SELECT * FROM tags ORDER BY id');
    const secretaries = d.all('SELECT id,name,role,perms,active FROM secretaries ORDER BY id').map((x) => ({ ...x, perms: json(x.perms, []) }));
    return { types, devices, therapists, groups, tags, secretaries };
  }
  saveCatalog({ kind, item }, actor) {
    const c = CATALOG[kind]; if (!c) throw new Error('bad kind');
    const it = { ...CAT_DEFAULTS[kind], ...Object.fromEntries(Object.entries(item).filter(([, v]) => v !== undefined && v !== null && v !== '')) };
    if (Array.isArray(it.days)) it.days = JSON.stringify(it.days);
    for (const k of ['price', 'avg_min', 'per_day', 'start', 'end', 'color', 'name_en', 'name']) if (item[k] === '' || item[k] === null) it[k] = null;
    if (kind === 'group' && !item.per_day) it.per_day = null;
    if (it.active === undefined) it.active = 1; it.active = it.active ? 1 : 0;
    const cols = c.cols.filter((k) => k !== 'active' || kind !== 'tag');
    let id = it.id;
    this.db.tx(() => {
      if (id) this.db.run(`UPDATE ${c.table} SET ${cols.map((k) => k + '=?').join(',')} WHERE id=?`, ...cols.map((k) => it[k] ?? null), id);
      else id = Number(this.db.run(`INSERT INTO ${c.table}(${cols.join(',')}) VALUES(${cols.map(() => '?').join(',')})`, ...cols.map((k) => it[k] ?? null)).lastInsertRowid);
      if (kind === 'device') { this.db.run('DELETE FROM device_types WHERE device_id=?', id); for (const t of item.typeIds || []) this.db.run('INSERT INTO device_types VALUES(?,?)', id, t); }
      if (kind === 'therapist') { this.db.run('DELETE FROM therapist_devices WHERE therapist_id=?', id); for (const t of item.deviceIds || []) this.db.run('INSERT INTO therapist_devices VALUES(?,?)', id, t); }
    });
    this._log(actor, 'catalog.save', kind, id, { name: item.name });
    return id;
  }
  deleteCatalog({ kind, id }, actor) {
    const c = CATALOG[kind]; if (!c) throw new Error('bad kind');
    if (kind === 'tag' && this.db.get('SELECT system FROM tags WHERE id=?', id)?.system) throw new Error('system tag');
    if (kind === 'tag') { this.db.run('DELETE FROM patient_tags WHERE tag_id=?', id); this.db.run('DELETE FROM tags WHERE id=?', id); }
    else this.db.run(`UPDATE ${c.table} SET active=0 WHERE id=?`, id); // soft delete keeps history intact
    this._log(actor, 'catalog.delete', kind, id);
    return true;
  }

  // -- staff -------------------------------------------------------------------
  saveSecretary({ id, name, code, role = 'secretary', perms = [], active = 1 }, actor) {
    const salt = crypto.randomBytes(8).toString('hex');
    if (id) {
      this.db.run('UPDATE secretaries SET name=?,role=?,perms=?,active=? WHERE id=?', name, role, JSON.stringify(perms), active ? 1 : 0, id);
      if (code) this.db.run('UPDATE secretaries SET code_hash=?,salt=? WHERE id=?', hash(code, salt), salt, id);
    } else {
      const lim = this.getTier ? require('./plans').ent(this.getTier()).secretaries : 999; const n = this.db.get('SELECT COUNT(*) c FROM secretaries WHERE active=1').c;
      if (n >= lim) { const e = new Error('PLAN_LIMIT'); e.code = 'PLAN_LIMIT'; throw e; }
      id = Number(this.db.run('INSERT INTO secretaries(name,code_hash,salt,role,perms,active,created_at) VALUES(?,?,?,?,?,?,?)', name, code ? hash(code, salt) : null, salt, role, JSON.stringify(perms), active ? 1 : 0, this.now()).lastInsertRowid);
    }
    this._log(actor, 'staff.save', 'secretary', id, { name, role });
    return id;
  }
  loginSecretary({ id, code }) {
    const s = this.db.get('SELECT * FROM secretaries WHERE id=? AND active=1', id);
    if (!s) return { ok: false };
    if (s.code_hash) { const a = Buffer.from(hash(code || '', s.salt)), b = Buffer.from(s.code_hash); if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false }; }
    this._log({ id: s.id, name: s.name }, 'login', 'secretary', s.id);
    return { ok: true, secretary: { id: s.id, name: s.name, role: s.role, perms: this._perms({ id: s.id }) } };
  }

  // -- patients ---------------------------------------------------------------
  _tagsOf(ids) {
    const m = new Map(); if (!ids.length) return m;
    for (const r of this.db.all(`SELECT pt.patient_id pid,g.id,g.name,g.name_en,g.tone,g.effect,g.color FROM patient_tags pt JOIN tags g ON g.id=pt.tag_id WHERE pt.patient_id IN (${ids.map(() => '?').join(',')})`, ...ids)) {
      (m.get(r.pid) || m.set(r.pid, []).get(r.pid)).push(r);
    }
    return m;
  }
  _ctx(minDate) {
    const s = this.getSettings(), c = this.getCatalog();
    const rows = this.db.all("SELECT b.*, p.group_id FROM bookings b JOIN patients p ON p.id=b.patient_id WHERE b.status!='cancelled' AND b.date>=?", minDate);
    return { settings: s, types: new Map(c.types.map((t) => [t.id, t])), devices: c.devices, therapists: c.therapists, groups: new Map(c.groups.map((g) => [g.id, g])), occ: new Occupancy(rows) };
  }
  // Preview auto-distribution of one or more session packages (nothing is saved)
  previewPlan({ patientId = null, groupId = null, plans, tags = [] }) {
    const ctx = this._ctx(plans.reduce((m, p) => (p.startDate < m ? p.startDate : m), plans[0].startDate));
    const prefer = tags.includes('late_slots') ? 'late' : 'early';
    const out = []; let unplaced = 0;
    for (const p of plans) {
      const r = distribute(ctx, { ...p, patientId: patientId || -1, groupId: p.groupId ?? groupId, prefer, startSeq: 1 });
      r.placed.forEach((row) => { ctx.occ.add({ ...row, id: -1000 - out.length - 1 }); out.push({ ...row, total: p.count }); });
      unplaced += r.unplaced;
    }
    return { bookings: out, unplaced };
  }
  // Pattern planner (drag & drop calendar): infer a repeating cycle from the examples, then fill every session from startDate on
  _planPattern(pattern, { patientId, packages, startDate, tags = [] }) {
    const { distributePattern } = require('./scheduler'); const { nameOf, sigOf } = require('./pattern');
    const ctx = this._ctx(startDate); const tn = (id) => (ctx.types.get(id) || {}).name || '?';
    const r = distributePattern(ctx, { pattern, startDate, packages, patientId: patientId || -1, prefer: tags.includes('late_slots') ? 'late' : 'early' });
    const info = this._describe(pattern); return { pattern, name: info.text, info, sig: sigOf(pattern), bookings: r.bookings || r.placed, unplaced: r.unplaced };
  }
  planFromExamples({ patientId = null, examples, packages, tags = [] }) {
    const { inferPattern } = require('./pattern'); const ex = (examples || []).filter((e) => e.types && e.types.length).sort((a, b) => (a.date < b.date ? -1 : 1));
    const pattern = inferPattern(ex); if (!pattern) return { pattern: null, bookings: [], unplaced: 0, name: '' };
    return this._planPattern(pattern, { patientId, packages, startDate: ex[0].date, tags });
  }
  planFromPattern({ patientId = null, pattern, packages, startDate, tags = [] }) { return this._planPattern(pattern, { patientId, packages, startDate, tags }); }
  rememberPattern({ pattern }) {
    const { sigOf } = require('./pattern'); const s = this.getSettings(); const sig = sigOf(pattern);
    const list = [{ sig, pattern, at: this.now() }, ...(s.sessionPatterns || []).filter((x) => x.sig !== sig)].slice(0, 12);
    this.db.saveSettings({ sessionPatterns: list }); return this.patternList();
  }
  _describe(pattern) { const { describe } = require('./pattern'); const c = this.getCatalog(); const names = new Map(c.types.map((t) => [t.id, t.name])); return describe(pattern, (id) => names.get(id) || '?', { lang: this.getSettings().lang, classes: c.groups }); }
  patternList() {
    const { nameOf } = require('./pattern'); const c = this.getCatalog(); const names = new Map(c.types.map((t) => [t.id, t.name]));
    return (this.getSettings().sessionPatterns || []).filter((x) => x.pattern.days.every((d) => d.types.every((id) => names.has(id)))).map((x) => ({ sig: x.sig, pattern: x.pattern, name: this._describe(x.pattern).text, info: this._describe(x.pattern) }));
  }
  _nextBarcode(id) { return 'CD' + String(id).padStart(6, '0'); }
  savePatient({ patient: p, bookings = null, replaceFuture = false }, actor) {
    const d = this.db, now = this.now();
    return d.tx(() => {
      let id = p.id;
      const f = [p.name, p.age ?? null, p.gender || 'M', p.phone || '', p.phone2 || '', p.address || '', p.notes || '', p.ext_ref || null, p.group_id || null, /^\d{2}:\d{2}$/.test(p.pref_time || '') ? p.pref_time : null];
      if (id) d.run('UPDATE patients SET name=?,age=?,gender=?,phone=?,phone2=?,address=?,notes=?,ext_ref=?,group_id=?,pref_time=?,updated_at=? WHERE id=?', ...f, now, id);
      else {
        id = Number(d.run('INSERT INTO patients(name,age,gender,phone,phone2,address,notes,ext_ref,group_id,pref_time,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)', ...f, now, now).lastInsertRowid);
        d.run('UPDATE patients SET barcode=? WHERE id=?', this._nextBarcode(id), id);
      }
      if (Array.isArray(p.tagIds)) { d.run('DELETE FROM patient_tags WHERE patient_id=?', id); for (const t of p.tagIds) d.run('INSERT INTO patient_tags(patient_id,tag_id) VALUES(?,?)', id, t); }
      if (bookings) {
        if (replaceFuture) d.run("UPDATE bookings SET status='cancelled' WHERE patient_id=? AND status IN ('booked','arrived','in_session') AND date>=?", id, this.today());
        const series = Date.now() + id;
        let seq = (d.get('SELECT COALESCE(MAX(seq),0) m FROM bookings WHERE patient_id=? AND status!=\'cancelled\'', id).m) || 0;
        const total = bookings.length;
        for (const b of bookings) {
          const type = d.get('SELECT * FROM session_types WHERE id=?', b.type_id);
          const end = b.end_time || fromMin(toMin(b.time) + (type ? type.duration_min : 30));
          d.run('INSERT INTO bookings(patient_id,series_id,type_id,device_id,therapist_id,date,time,end_time,seq,total,status,price,note,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            id, b.series_id || series, b.type_id || null, b.device_id || null, b.therapist_id || null, b.date, b.time, end, b.seq || ++seq, b.total || total, 'booked', b.price ?? (type ? type.price : null), b.note || null, actor ? actor.id : null, now);
        }
        if (p.status === undefined) d.run("UPDATE patients SET status='active',status_at=NULL WHERE id=? AND status IN ('completed')", id);
      }
      this._log(actor, p.id ? 'patient.update' : 'patient.create', 'patient', id, { name: p.name, bookings: bookings ? bookings.length : 0 });
      return { id, hints: this.patientHints({ id }) };
    });
  }
  patientHints({ id }) {
    const tags = this._tagsOf([id]).get(id) || [], out = [];
    if (tags.some((t) => t.effect === 'dropout')) out.push('dropout');
    if (tags.some((t) => t.effect === 'late_slots')) out.push('late');
    const st = this.db.get('SELECT status FROM patients WHERE id=?', id);
    if (st && st.status === 'dropped') out.push('was_dropped');
    return out;
  }
  getPatient({ id }) {
    const p = this.db.get('SELECT * FROM patients WHERE id=?', id); if (!p) return null;
    p.tags = this._tagsOf([id]).get(id) || []; p.tagIds = p.tags.map((t) => t.id);
    const bookings = this.db.all(`SELECT b.*, t.name type_name, d.name device_name, th.name therapist_name FROM bookings b LEFT JOIN session_types t ON t.id=b.type_id LEFT JOIN devices d ON d.id=b.device_id LEFT JOIN therapists th ON th.id=b.therapist_id WHERE b.patient_id=? AND b.status!='cancelled' ORDER BY b.date,b.time`, id);
    const today = this.today();
    bookings.forEach((b) => { b.eff = this._eff(b, today); });
    const attended = bookings.filter((b) => b.eff === 'attended').length, missed = bookings.filter((b) => b.eff === 'missed').length;
    return { ...p, bookings, stats: { attended, missed, streak: this._streak(id, today), upcoming: bookings.filter((b) => b.eff === 'booked' && b.date >= today).length }, hints: this.patientHints({ id }) };
  }
  _eff(b, today) { if (b.status === 'attended' || b.status === 'cancelled') return b.status; if (b.date < today || (b.date === today && this._dayOver(b.date))) return 'missed'; return b.status === 'arrived' || b.status === 'in_session' ? b.status : 'booked'; }
  _dayOver(date) { const { dayWindow } = require('./scheduler'); const w = dayWindow(this.getSettings(), date); return !!w && date === this.today() && this._minutesOfDay(this.now()) >= w.close; }
  _streak(pid, today) {
    const rows = this.db.all("SELECT status,date FROM bookings WHERE patient_id=? AND status!='cancelled' AND date<? ORDER BY date DESC,time DESC", pid, today);
    let n = 0; for (const r of rows) { if (r.status === 'attended') break; n++; } return n;
  }
  // Who is calling? Matches either phone number of any patient (any status) and returns today's sessions plus the next one, so the secretary can answer by name.
  callerLookup({ number }) {
    const n = parseCaller(number); if (!n) return { number: '', matches: [] }; const today = this.today();
    const rows = this.db.all("SELECT id,name,phone,phone2,status FROM patients WHERE phone<>'' OR phone2<>''").filter((r) => sameNumber(r.phone, n) || sameNumber(r.phone2, n)).slice(0, 5);
    const q = (extra, id, d) => this.db.all(`SELECT b.id,b.date,b.time,b.status,t.name type_name,d.name device_name FROM bookings b LEFT JOIN session_types t ON t.id=b.type_id LEFT JOIN devices d ON d.id=b.device_id WHERE b.patient_id=? AND b.status!='cancelled' AND ${extra} LIMIT 6`, id, d);
    return { number: n, matches: rows.map((r) => ({ id: r.id, name: r.name, status: r.status, today: q('b.date=? ORDER BY b.time', r.id, today), next: q("b.date>? AND b.status='booked' ORDER BY b.date,b.time", r.id, today).slice(0, 1) })) };
  }
  searchPatients({ q = '', status = 'active', limit = 50 }) {
    const like = `%${String(q).trim()}%`;
    const st = status === 'archive' ? "('completed','archived')" : status === 'dropped' ? "('dropped')" : status === 'all' ? "('active','completed','archived','dropped','maintenance')" : "('active')";
    const rows = this.db.all(`SELECT * FROM patients WHERE status IN ${st} AND (name LIKE ? OR phone LIKE ? OR phone2 LIKE ? OR barcode LIKE ?) ORDER BY name LIMIT ?`, like, like, like, like, limit);
    const tags = this._tagsOf(rows.map((r) => r.id));
    return rows.map((r) => ({ ...r, tags: tags.get(r.id) || [] }));
  }
  setPatientTags({ id, tagIds }, actor) {
    this.db.tx(() => { this.db.run('DELETE FROM patient_tags WHERE patient_id=?', id); for (const t of tagIds) this.db.run('INSERT INTO patient_tags(patient_id,tag_id) VALUES(?,?)', id, t); });
    this._log(actor, 'patient.tags', 'patient', id, { tagIds }); return true;
  }
  _cancelFuture(id) { return this.db.run("UPDATE bookings SET status='cancelled' WHERE patient_id=? AND status IN ('booked','arrived','in_session') AND date>=?", id, this.today()).changes; }
  _sysTag(effect) { return this.db.get("SELECT id FROM tags WHERE effect=? AND system=1", effect)?.id; }
  dropPatient({ id, reason = '' }, actor) { // انقطاع: label + remove from schedule
    const n = 0; const t = this._sysTag('dropout'); // dropped patients keep their bookings (lowest priority in each hour, daily follow-up alerts)
    if (t) this.db.run('INSERT OR IGNORE INTO patient_tags(patient_id,tag_id) VALUES(?,?)', id, t);
    this.db.run("UPDATE patients SET status='dropped',status_at=?,status_reason=? WHERE id=?", this.now(), reason, id);
    this._log(actor, 'patient.drop', 'patient', id, { cancelled: n }); this._gapNotice(); return { cancelled: n };
  }
  archivePatient({ id }, actor) { // ارشفة: cancel all future, no label
    const n = this._cancelFuture(id);
    this.db.run("UPDATE patients SET status='archived',status_at=? WHERE id=?", this.now(), id);
    this._log(actor, 'patient.archive', 'patient', id, { cancelled: n }); this._gapNotice(); return { cancelled: n };
  }
  restorePatient({ id }, actor) {
    this.db.run("UPDATE patients SET status='active',status_at=NULL,status_reason=NULL WHERE id=?", id);
    this._log(actor, 'patient.restore', 'patient', id); return { hints: this.patientHints({ id }) };
  }
  deletePatient({ id }, actor) {
    this.db.tx(() => { for (const t of ['bookings', 'patient_tags', 'rating_links']) this.db.run(`DELETE FROM ${t} WHERE patient_id=?`, id); this.db.run('DELETE FROM patients WHERE id=?', id); });
    this._log(actor, 'patient.delete', 'patient', id); return true;
  }

  // -- bookings -----------------------------------------------------------------
  listBookings({ date, from, to, showAll = false, status = 'all', typeId, deviceId, therapistId, groupId, q = '', sort = 'time', dir = 'asc', limit = 60, offset = 0 }) {
    const today = this.today(); const w = ["b.status!='cancelled'"], a = [];
    if (!showAll) { if (date) { w.push('b.date=?'); a.push(date); } else { if (from) { w.push('b.date>=?'); a.push(from); } if (to) { w.push('b.date<=?'); a.push(to); } } }
    if (status === 'attended') w.push("b.status='attended'");
    else if (status === 'notAttended') { w.push("b.status IN ('booked','arrived','in_session') AND b.date<=?"); a.push(today); }
    else if (status === 'missed') { w.push("b.status IN ('booked','arrived','in_session') AND b.date<?"); a.push(today); }
    else if (status === 'upcoming') { w.push("b.status IN ('booked','arrived','in_session') AND b.date>?"); a.push(today); }
    for (const [col, v] of [['b.type_id', typeId], ['b.device_id', deviceId], ['b.therapist_id', therapistId], ['p.group_id', groupId]]) if (v) { w.push(col + '=?'); a.push(v); }
    if (q) { w.push('(p.name LIKE ? OR p.phone LIKE ? OR p.barcode LIKE ?)'); a.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    const order = { time: 'b.date,b.time', status: 'b.status,b.date,b.time', type: 't.name,b.date,b.time', therapist: 'th.name,b.date,b.time', device: 'd.name,b.date,b.time', name: 'p.name,b.date,b.time' }[sort] || 'b.date,b.time';
    const dirSql = dir === 'desc' ? ' DESC' : '';
    const orderSql = order.split(',').map((c) => c + dirSql).join(',');
    const base = `FROM bookings b JOIN patients p ON p.id=b.patient_id LEFT JOIN session_types t ON t.id=b.type_id LEFT JOIN devices d ON d.id=b.device_id LEFT JOIN therapists th ON th.id=b.therapist_id WHERE ${w.join(' AND ')}`;
    const total = this.db.get(`SELECT COUNT(*) c ${base}`, ...a).c;
    const rows = this.db.all(`SELECT b.*, p.name patient_name, p.phone, p.phone2, p.gender, p.group_id, p.status patient_status, t.name type_name, d.name device_name, th.name therapist_name ${base} ORDER BY ${orderSql} LIMIT ? OFFSET ?`, ...a, limit, offset);
    const tags = this._tagsOf([...new Set(rows.map((r) => r.patient_id))]);
    rows.forEach((r) => { r.eff = this._eff(r, today); r.tags = tags.get(r.patient_id) || []; });
    return { rows, total };
  }
  setAttendance({ id, attended }, actor) {
    const b = this.db.get('SELECT * FROM bookings WHERE id=?', id); if (!b) throw new Error('not found');
    const nowMs = this.now();
    this.db.run('UPDATE bookings SET status=?,attended_at=? WHERE id=?', attended ? 'attended' : 'booked', attended ? nowMs : null, id);
    this._log(actor, attended ? 'attend' : 'unattend', 'booking', id, { patient: b.patient_id });
    let notice = null;
    if (attended) {
      const s = this.getSettings();
      const lead = toMin(b.time) - this._minutesOfDay(nowMs);
      if (b.date === todayISO(nowMs) && lead >= (s.earlyArrivalMin ?? 10)) notice = this._gapNotice(b.date);
      this._completeIfDone(b.patient_id);
    } else this.db.run("UPDATE patients SET status='active' WHERE id=? AND status='completed'", b.patient_id);
    return { ok: true, notice };
  }
  _minutesOfDay(ms) { const d = new Date(ms); return d.getHours() * 60 + d.getMinutes(); }
  _completeIfDone(pid) {
    const left = this.db.get("SELECT COUNT(*) c FROM bookings WHERE patient_id=? AND status IN ('booked','arrived','in_session')", pid).c;
    const done = this.db.get("SELECT COUNT(*) c FROM bookings WHERE patient_id=? AND status='attended'", pid).c;
    if (!left && done) this.db.run("UPDATE patients SET status='completed',status_at=? WHERE id=? AND status='active'", this.now(), pid);
  }
  updateBooking({ id, date, time, deviceId, therapistId, typeId, note }, actor) {
    const b = this.db.get('SELECT * FROM bookings WHERE id=?', id); if (!b) throw new Error('not found');
    const type = this.db.get('SELECT * FROM session_types WHERE id=?', typeId ?? b.type_id);
    const t = time || b.time; const end = fromMin(toMin(t) + (type ? type.duration_min : toMin(b.end_time) - toMin(b.time)));
    this.db.run('UPDATE bookings SET date=?,time=?,end_time=?,device_id=?,therapist_id=?,type_id=?,note=? WHERE id=?', date || b.date, t, end, deviceId === undefined ? b.device_id : deviceId, therapistId === undefined ? b.therapist_id : therapistId, typeId ?? b.type_id, note ?? b.note, id);
    this._log(actor, 'booking.update', 'booking', id, { date, time });
    return { conflicts: this.dayConflicts({ date: date || b.date }).filter((c) => c.bookingIds.includes(id)) };
  }
  cancelBooking({ id }, actor) { this.db.run("UPDATE bookings SET status='cancelled' WHERE id=?", id); this._log(actor, 'booking.cancel', 'booking', id); return true; }
  // Move all of a patient's upcoming sessions to one preferred start time (nearest free slot when that time is taken)
  retimePatient({ id, time, fromDate = null }, actor) {
    if (!/^\d{2}:\d{2}$/.test(time || '')) throw new Error('bad time');
    const from = fromDate || this.today(); const ctx = this._ctx(from); const target = toMin(time);
    const rows = this.db.all("SELECT * FROM bookings WHERE patient_id=? AND status='booked' AND date>=? ORDER BY date,time", id, from);
    let moved = 0, failed = 0;
    for (const b of rows) {
      const dur = toMin(b.end_time) - toMin(b.time); const type = ctx.types.get(b.type_id); const pad = type ? type.min_gap_min || 0 : 0;
      const win = dayWindow(ctx.settings, b.date); const slot = win && findSlot(ctx, { date: b.date, duration: dur, deviceId: b.device_id, therapistId: b.therapist_id, patientId: id, target, patientPad: pad, ignore: [b.id] }, win);
      if (!slot) { failed++; continue; }
      if (slot.time !== b.time) { this.db.run('UPDATE bookings SET time=?,end_time=? WHERE id=?', slot.time, slot.end, b.id); ctx.occ.move(b.id, b.date, slot.time, slot.end); moved++; }
    }
    this.db.run('UPDATE patients SET pref_time=? WHERE id=?', time, id); this._log(actor, 'patient.retime', 'patient', id, { time, moved, failed });
    return { moved, failed, total: rows.length };
  }
  slotCheck({ date, time, typeId, deviceId, therapistId, patientId, ignoreId, others = [] }) { // used by the booking popup to colour options red; `others` = unsaved preview sessions of the same patient
    const ctx = this._ctx(date); others.forEach((o, i) => { if (o && o.date === date && o.time && o.end_time) ctx.occ.add({ id: -9000 - i, patient_id: patientId || -1, device_id: o.device_id || null, therapist_id: o.therapist_id || null, type_id: o.type_id, date: o.date, time: o.time, end_time: o.end_time, status: 'booked' }); }); const type = ctx.types.get(typeId); const dur = type ? type.duration_min : 30;
    const win = dayWindow(ctx.settings, date); const issues = [];
    const { conflictsFor } = require('./scheduler');
    const s = toMin(time), e = s + dur;
    if (!win) issues.push({ kind: 'off_day' }); else if (s < win.open || e > win.close) issues.push({ kind: 'outside_hours' });
    for (const c of conflictsFor(ctx, { date, s, e, deviceId, therapistId, patientId }, ignoreId ? [ignoreId] : [])) issues.push({ kind: c.kind + '_overlap', bookingId: c.booking.id });
    const sug = issues.length ? suggest(ctx, { id: -1, date, time, end_time: fromMin(e), type_id: typeId, device_id: deviceId, therapist_id: therapistId, patient_id: patientId }, ignoreId ? [ignoreId] : []) : null;
    return { ok: !issues.length, issues, suggestion: sug };
  }
  busyness({ date, typeId }) { // which times/devices/therapists are unavailable on a date (for red options)
    const ctx = this._ctx(date); const dur = ctx.types.get(typeId)?.duration_min || 30; const out = { devices: {}, therapists: {} };
    for (const d of ctx.devices) out.devices[d.id] = !findSlot(ctx, { date, duration: dur, deviceId: d.id });
    for (const t of ctx.therapists) out.therapists[t.id] = !findSlot(ctx, { date, duration: dur, therapistId: t.id });
    return out;
  }

  // -- conflicts, gaps, compaction ------------------------------------------------
  dayConflicts({ date }) { return detectConflicts(this._ctx(date), date, date); }
  _gapNotice(date) {
    const today = date || this.today(); const ctx = this._ctx(today);
    const minLen = Math.min(...[...ctx.types.values()].map((t) => t.duration_min), 30);
    const gaps = freeGaps(ctx, today, minLen);
    if (gaps.length) { this._notify('free_gap', { date: today }); return { date: today, gaps }; }
    return null;
  }
  compactionPreview({ fromDate }) {
    const ctx = this._ctx(fromDate || this.today());
    const tags = new Map(); const ids = [...new Set([...ctx.occ.byId.values()].map((b) => b.patient_id))];
    for (const [pid, list] of this._tagsOf(ids)) tags.set(pid, list.map((t) => t.effect));
    const moves = suggestCompaction(ctx, { fromDate: fromDate || this.today(), tagsByPatient: tags });
    const names = new Map(this.db.all('SELECT id,name FROM patients').map((r) => [r.id, r.name]));
    return moves.map((m) => ({ ...m, patientName: names.get(m.patientId) }));
  }
  compactionApply({ moves }, actor) {
    this.db.tx(() => { for (const m of moves) this.db.run('UPDATE bookings SET date=?,time=?,end_time=? WHERE id=?', m.to.date, m.to.time, m.to.end, m.bookingId); });
    this.db.run("UPDATE notifications SET resolved=1 WHERE kind='free_gap'");
    this._log(actor, 'compaction.apply', 'booking', null, { moves: moves.length }); return moves.length;
  }

  // -- absence rules ---------------------------------------------------------------
  sweep() { // run on startup and when the day changes
    const s = this.getSettings(), today = this.today(); const res = { warned: [], removed: [] };
    const pats = this.db.all("SELECT DISTINCT b.patient_id id FROM bookings b JOIN patients p ON p.id=b.patient_id WHERE p.status='active' AND b.status IN ('booked','arrived','in_session') AND b.date<?", today);
    for (const { id } of pats) {
      const n = this._streak(id, today);
      if (n >= s.absenceRemoveAfter) { this.dropPatient({ id, reason: 'auto' }, null); this._notify('dropout_removed', { patientId: id, streak: n }); res.removed.push(id); }
      else if (n >= s.absenceWarnAfter) { const t = this._sysTag('dropout'); if (t) this.db.run('INSERT OR IGNORE INTO patient_tags(patient_id,tag_id) VALUES(?,?)', id, t); this._notify('dropout_warn', { patientId: id, streak: n }); res.warned.push(id); }
    }
    this.db.all("SELECT id FROM patients WHERE status='active'").forEach(({ id }) => {
      const upcoming = this.db.get("SELECT COUNT(*) c FROM bookings WHERE patient_id=? AND status IN ('booked','arrived','in_session') AND date>=?", id, today).c;
      const total = this.db.get("SELECT COUNT(*) c FROM bookings WHERE patient_id=? AND status!='cancelled'", id).c;
      const attended = this.db.get("SELECT COUNT(*) c FROM bookings WHERE patient_id=? AND status='attended'", id).c;
      if (total && !upcoming && attended) this.db.run("UPDATE patients SET status='completed',status_at=? WHERE id=?", this.now(), id);
    });
    try { this._autoTags(); this._maintenanceReminders(); this._dailyAlerts(); } catch (e) { res.error = String(e.message); }
    return res;
  }
  listNotifications({ onlyOpen = true } = {}) {
    const names = new Map(this.db.all('SELECT id,name FROM patients').map((r) => [r.id, r.name]));
    return this.db.all(`SELECT * FROM notifications ${onlyOpen ? 'WHERE resolved=0' : ''} ORDER BY id DESC LIMIT 100`).map((n) => { const p = json(n.payload, {}); return { ...n, payload: p, patientName: p.patientId ? names.get(p.patientId) : undefined }; });
  }
  resolveNotification({ id }) { this.db.run('UPDATE notifications SET resolved=1,read=1 WHERE id=?', id); return true; }

  // -- statistics ----------------------------------------------------------------------
  _agg(rows, today) {
    const r = { total: rows.length, attended: 0, missed: 0, pending: 0, income: 0, loss: 0, expected: 0 };
    for (const b of rows) { const e = this._eff(b, today); const price = b.price || 0;
      if (e === 'attended') { r.attended++; r.income += price; } else if (e === 'missed') { r.missed++; r.loss += price; } else { r.pending++; r.expected += price; } }
    return r;
  }
  dayStats({ date }) {
    const today = this.today();
    const rows = this.db.all(`SELECT b.*, t.name type_name, d.name device_name, th.name therapist_name FROM bookings b LEFT JOIN session_types t ON t.id=b.type_id LEFT JOIN devices d ON d.id=b.device_id LEFT JOIN therapists th ON th.id=b.therapist_id WHERE b.date=? AND b.status!='cancelled'`, date);
    const by = (key) => { const m = {}; for (const b of rows) { const k = b[key] || '—'; (m[k] = m[k] || []).push(b); } return Object.entries(m).map(([name, list]) => ({ name, ...this._agg(list, today) })).sort((a, b) => b.total - a.total); };
    const hours = {}; for (const b of rows) { const h = b.time.slice(0, 2); hours[h] = (hours[h] || 0) + 1; }
    return { date, ...this._agg(rows, today), byType: by('type_name'), byDevice: by('device_name'), byTherapist: by('therapist_name'), byHour: hours, conflicts: this.dayConflicts({ date }) };
  }
  monthCalendar({ ym }) {
    const [from, to] = monthRange(ym); const today = this.today();
    const rows = this.db.all("SELECT * FROM bookings WHERE date>=? AND date<=? AND status!='cancelled'", from, to);
    const days = {}; for (const b of rows) (days[b.date] = days[b.date] || []).push(b);
    const conflicts = detectConflicts(this._ctx(from), from, to); const confBy = {};
    conflicts.forEach((c) => (confBy[c.date] = confBy[c.date] || []).push(c));
    const out = {}; for (const [date, list] of Object.entries(days)) out[date] = { ...this._agg(list, today), conflicts: confBy[date] || [] };
    for (const date of Object.keys(confBy)) if (!out[date]) out[date] = { total: 0, attended: 0, missed: 0, pending: 0, income: 0, loss: 0, expected: 0, conflicts: confBy[date] };
    return { ym, days: out, month: this._agg(rows, today), absentees: this.absentees({ from, to, limit: 5 }) };
  }
  absentees({ from, to, limit = 100 }) {
    const today = this.today(); const where = from ? 'AND b.date>=? AND b.date<=?' : '';
    const rows = this.db.all(`SELECT b.patient_id pid, p.name, p.phone, p.status, COUNT(*) total, SUM(CASE WHEN b.status='attended' THEN 1 ELSE 0 END) att FROM bookings b JOIN patients p ON p.id=b.patient_id WHERE b.status!='cancelled' AND b.date<? ${where} GROUP BY b.patient_id`, today, ...(from ? [from, to] : []));
    const tags = this._tagsOf(rows.map((r) => r.pid));
    return rows.map((r) => ({ patientId: r.pid, name: r.name, phone: r.phone, status: r.status, total: r.total, attended: r.att, missed: r.total - r.att, rate: r.total ? (r.total - r.att) / r.total : 0, streak: this._streak(r.pid, today), tags: tags.get(r.pid) || [] }))
      .filter((r) => r.missed > 0).sort((a, b) => b.streak - a.streak || b.missed - a.missed).slice(0, limit);
  }
  overview({ date }) {
    const d = date || this.today(); const st = this.dayStats({ date: d });
    return { date: d, total: st.total, attended: st.attended, absent: st.total - st.attended, income: st.income, loss: st.loss, expected: st.expected, conflicts: st.conflicts.length };
  }

  // -- tools -------------------------------------------------------------------------------
  _vars(p, s, lang) { return { title: M.titleFor(p.gender, s, lang), name: M.shortName(p.name), clinic: s.clinic.name || '' }; }
  reminderList({ date }) {
    const s = this.getSettings(), lang = s.lang, tpl = s.msg[lang].reminder;
    const { rows } = this.listBookings({ date, limit: 1000, sort: 'time' });
    const by = new Map(); for (const r of rows) (by.get(r.patient_id) || by.set(r.patient_id, []).get(r.patient_id)).push(r);
    const out = [];
    for (const [pid, list] of by) {
      const p = list[0];
      const lines = list.map((b) => M.render(s.sessionLine, { type: b.type_name || '', date: M.fmtDate(b.date, lang), time: M.fmtTime(b.time, lang) })).join('\n');
      const text = M.render(tpl, { ...this._vars({ gender: p.gender, name: p.patient_name }, s, lang), sessions: lines });
      const phones = [p.phone, p.phone2].filter(Boolean);
      out.push({ patientId: pid, name: p.patient_name, phones, bookingIds: list.map((b) => b.id), wa: list.map((b) => b.wa_status)[0], text, urls: phones.map((ph) => M.waUrl(ph, text, s.countryCode)) });
    }
    return out;
  }
  reminderUpcoming({ patientId, days = 60 }) { // all upcoming sessions: type + date + time only (no therapist)
    const s = this.getSettings(), lang = s.lang; const today = this.today();
    const p = this.db.get('SELECT * FROM patients WHERE id=?', patientId);
    const rows = this.db.all("SELECT b.*, t.name type_name FROM bookings b LEFT JOIN session_types t ON t.id=b.type_id WHERE b.patient_id=? AND b.status IN ('booked','arrived','in_session') AND b.date>=? AND b.date<=? ORDER BY b.date,b.time", patientId, today, addDays(today, days));
    const lines = rows.map((b) => M.render(s.sessionLine, { type: b.type_name || '', date: M.fmtDate(b.date, lang), time: M.fmtTime(b.time, lang) })).join('\n');
    const text = M.render(s.msg[lang].reminder, { ...this._vars(p, s, lang), sessions: lines });
    return { text, phones: [p.phone, p.phone2].filter(Boolean), urls: [p.phone, p.phone2].filter(Boolean).map((ph) => M.waUrl(ph, text, s.countryCode)) };
  }
  setWaStatus({ ids, status }) { for (const id of ids) this.db.run('UPDATE bookings SET wa_status=? WHERE id=?', status, id); return true; }
  callScript({ bookingId, patientId }) {
    const s = this.getSettings(), lang = s.lang;
    const b = bookingId ? this.db.get('SELECT * FROM bookings WHERE id=?', bookingId) : this.db.get("SELECT * FROM bookings WHERE patient_id=? AND status IN ('booked','arrived','in_session') AND date>=? ORDER BY date,time LIMIT 1", patientId, this.today());
    const p = this.db.get('SELECT * FROM patients WHERE id=?', b ? b.patient_id : patientId);
    return { phone: p.phone, text: M.render(s.msg[lang].call, { ...this._vars(p, s, lang), date: b ? M.fmtDate(b.date, lang) : '', time: b ? M.fmtTime(b.time, lang) : '' }) };
  }
  barcodeLookup({ code }) {
    const p = this.db.get('SELECT id FROM patients WHERE barcode=?', String(code).trim().toUpperCase());
    return p ? this.getPatient({ id: p.id }) : null;
  }
  receiptData({ patientId, scope = 'upcoming' }) {
    const p = this.getPatient({ id: patientId }); const today = this.today();
    let list = p.bookings; if (scope === 'today') list = list.filter((b) => b.date === today); else if (scope === 'upcoming') list = list.filter((b) => b.date >= today);
    return { patient: p, bookings: list, settings: this.getSettings(), today };
  }
  // Session rating links: one unguessable token per attended session; the public form lives at settings.ratingBase (link supplied later).
  createRatingLinks({ date }, actor) {
    const base = String(this.getSettings().ratingBase || '').replace(/\/+$/, ''); const out = [];
    const rows = this.db.all("SELECT b.id,b.patient_id,p.name,p.phone,p.phone2 FROM bookings b JOIN patients p ON p.id=b.patient_id WHERE b.date=? AND b.status='attended'", date || this.today());
    for (const b of rows) {
      let r = this.db.get('SELECT token FROM rating_links WHERE booking_id=?', b.id);
      if (!r) { const token = crypto.randomBytes(12).toString('base64url'); this.db.run('INSERT INTO rating_links(patient_id,booking_id,token,created_at) VALUES(?,?,?,?)', b.patient_id, b.id, token, this.now()); r = { token }; }
      out.push({ bookingId: b.id, patientId: b.patient_id, name: b.name, phone: b.phone, token: r.token, url: base ? `${base}/${r.token}` : '' });
    }
    this._log(actor, 'ratings.create', 'booking', null, { n: out.length }); return { base, links: out };
  }
  listAudit({ limit = 100, offset = 0 }) { return this.db.all('SELECT * FROM audit_log ORDER BY id DESC LIMIT ? OFFSET ?', limit, offset); }
}
module.exports = { Service, hash, redactMoney };

Object.assign(Service.prototype, require('./floor'));
