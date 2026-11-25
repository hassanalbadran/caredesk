'use strict';
// "Floor" view logic: month home, type page, device timeline (hour slots), arrival, per-device session timers, auto tags.
// Mixed into Service.prototype (uses this.db, this.now, this.getSettings, ...).
const { toMin, fromMin, todayISO } = require('./util');
const { dayWindow } = require('./scheduler');
const ACTIVE = "('booked','arrived','in_session')";
const monthRange = (ym) => { const [y, m] = ym.split('-').map(Number); const pad = (n) => String(n).padStart(2, '0'); return [`${y}-${pad(m)}-01`, `${y}-${pad(m)}-${pad(new Date(y, m, 0).getDate())}`]; };
const RANK = { vip: 0, late_slots: 2, dropout: 3 }; // normal = 1; lower number = served first inside an hour

module.exports = {
  _rank(tags, pstatus) { if (pstatus === 'dropped') return 3; let r = 1; for (const t of tags) if (t.effect in RANK) r = t.effect === 'vip' ? 0 : Math.max(r, RANK[t.effect]); return r; },
  _nowMin() { return this._minutesOfDay(this.now()); },

  // ---- month home: per day, one button per session type with its patient count
  homeMonth({ ym }) {
    const [from, to] = monthRange(ym); const today = this.today();
    const rows = this.db.all(`SELECT date,type_id,status,COUNT(*) n FROM bookings WHERE date>=? AND date<=? AND status!='cancelled' GROUP BY date,type_id,status`, from, to);
    const days = {};
    for (const r of rows) { const d = (days[r.date] = days[r.date] || { total: 0, done: 0, types: {} }); const t = (d.types[r.type_id] = d.types[r.type_id] || { n: 0, done: 0 }); t.n += r.n; d.total += r.n; if (r.status === 'attended') { t.done += r.n; d.done += r.n; } }
    const conf = this.monthCalendar({ ym }).days; for (const [date, c] of Object.entries(conf)) if (c.conflicts && c.conflicts.length) (days[date] = days[date] || { total: 0, done: 0, types: {} }).conflicts = c.conflicts.length;
    return { ym, today, days, types: this.getCatalog().types.filter((t) => t.active !== 0) };
  },

  // ---- type page: its devices (count per device for the day) + the people lists
  typePage({ date, typeId }) {
    const cat = this.getCatalog(); const type = cat.types.find((t) => t.id === typeId);
    const devices = cat.devices.filter((d) => d.active !== 0 && (d.typeIds || []).includes(typeId));
    const cnt = new Map(this.db.all(`SELECT device_id id,COUNT(*) n FROM bookings WHERE date=? AND type_id=? AND status!='cancelled' GROUP BY device_id`, date, typeId).map((r) => [r.id, r.n]));
    const lists = this.patientListCounts();
    return { type, date, devices: devices.map((d) => ({ id: d.id, name: d.name, count: cnt.get(d.id) || 0 })), unassigned: cnt.get(null) || 0, lists, total: [...cnt.values()].reduce((a, b) => a + b, 0) };
  },
  patientListCounts() {
    const n = (sql, ...a) => this.db.get(sql, ...a).c;
    return {
      laggards: n("SELECT COUNT(DISTINCT p.id) c FROM patients p JOIN patient_tags pt ON pt.patient_id=p.id JOIN tags g ON g.id=pt.tag_id WHERE p.status='active' AND g.effect='late_slots'"),
      dropped: n("SELECT COUNT(*) c FROM patients WHERE status='dropped'"),
      maintenance: n("SELECT COUNT(*) c FROM patients WHERE status='maintenance'")
    };
  },
  patientList({ kind }) {
    const where = { laggards: "p.status='active' AND p.id IN (SELECT pt.patient_id FROM patient_tags pt JOIN tags g ON g.id=pt.tag_id WHERE g.effect='late_slots')", dropped: "p.status='dropped'", maintenance: "p.status='maintenance'" }[kind]; if (!where) return [];
    const today = this.today(); const rows = this.db.all(`SELECT p.id,p.name,p.phone,p.status,(SELECT MAX(date) FROM bookings WHERE patient_id=p.id AND status='attended') last_visit,(SELECT MIN(date) FROM bookings WHERE patient_id=p.id AND status IN ${ACTIVE} AND date>=?) next_visit FROM patients p WHERE ${where} ORDER BY p.name LIMIT 300`, today);
    const tags = this._tagsOf(rows.map((r) => r.id)); rows.forEach((r) => { r.tags = tags.get(r.id) || []; r.streak = this._streak(r.id, today); }); return rows;
  },

  // ---- device timeline for one day
  deviceDay({ date, deviceId }) {
    const s = this.getSettings(); const win = dayWindow(s, date); const today = this.today(); const nowM = this._nowMin();
    const dev = deviceId == null ? { id: null, name: '', avg_min: null } : this.db.get('SELECT * FROM devices WHERE id=?', deviceId);
    const rows = this.db.all(`SELECT b.*,p.name patient_name,p.phone,p.status patient_status,t.name type_name,t.duration_min FROM bookings b JOIN patients p ON p.id=b.patient_id LEFT JOIN session_types t ON t.id=b.type_id WHERE b.date=? AND b.device_id IS ? AND b.status!='cancelled' ORDER BY b.time,b.id`, date, deviceId ?? null);
    const tags = this._tagsOf([...new Set(rows.map((r) => r.patient_id))]);
    const byHour = new Map();
    for (const r of rows) { r.tags = tags.get(r.patient_id) || []; r.rank = this._rank(r.tags, r.patient_status); r.hour = Math.floor(toMin(r.time) / 60); (byHour.get(r.hour) || byHour.set(r.hour, []).get(r.hour)).push(r); }
    const dayOver = !!win && date === today && nowM >= win.close; const hours = [];
    const first = Math.min(win ? Math.floor(win.open / 60) : 24, ...rows.map((r) => r.hour)); const last = Math.max(win ? Math.ceil(win.close / 60) - 1 : -1, ...rows.map((r) => r.hour));
    for (let h = first; h <= last && h < 24; h++) {
      const list = (byHour.get(h) || []).sort((a, b) => a.rank - b.rank || (a.time < b.time ? -1 : 1)); list.forEach((r, i) => { r.turn = i + 1; });
      const inWork = !!win && h * 60 >= win.open && h * 60 < win.close;
      const due = date < today || (date === today && nowM >= h * 60);
      const red = due && list.some((r) => r.status === 'arrived');
      hours.push({ h, label: hourLabel(h), inWork, count: list.length, red, current: date === today && nowM >= h * 60 && nowM < (h + 1) * 60 });
    }
    for (const r of rows) {
      const due = date < today || (date === today && nowM >= r.hour * 60);
      r.ui = r.status === 'attended' ? 'done' : r.status === 'in_session' ? 'in' : r.status === 'arrived' ? 'arrived' : (date < today || dayOver) ? 'absent' : due ? 'late' : 'upcoming';
    }
    return { date, device: dev && { id: dev.id, name: dev.name, avg_min: dev.avg_min }, window: win, hours, bookings: rows, total: rows.length, now: this.now() };
  },

  // flat, money-free day list for the phone link
  phoneDay({ date }) {
    const d = date || this.today(); const cat = this.getCatalog(); const dn = new Map(cat.devices.map((x) => [x.id, x.name])); const tn = new Map(cat.types.map((x) => [x.id, x.name]));
    const rows = this.db.all("SELECT b.id,b.time,b.status,b.device_id,b.type_id,b.timer_start,b.timer_min,p.name patient_name,p.phone FROM bookings b JOIN patients p ON p.id=b.patient_id WHERE b.date=? AND b.status!='cancelled' ORDER BY b.time,b.id", d);
    return { date: d, now: this.now(), today: this.today(), items: rows.map((r) => ({ id: r.id, time: r.time, status: r.status, name: r.patient_name, phone: r.phone || '', device: dn.get(r.device_id) || '', type: tn.get(r.type_id) || '', timer_start: r.timer_start, timer_min: r.timer_min })) };
  },
  // ---- load levels: red = the day is full, yellow = nearly full (most hours nearly full), green = normal, closed = clinic closed
  _loadOf(count, cap, hoursFull, hoursOpen) {
    if (!cap) return 'closed'; const ratio = count / cap; const hf = hoursOpen ? hoursFull / hoursOpen : 0;
    return ratio >= 1 ? 'red' : (ratio >= 0.75 || hf >= 0.7) ? 'yellow' : 'green';
  },
  dayLoad({ date }) {
    const s = this.getSettings(); const win = dayWindow(s, date); const cat = this.getCatalog();
    const rows = this.db.all("SELECT b.device_id,b.type_id,b.time FROM bookings b WHERE b.date=? AND b.status!='cancelled'", date);
    const span = win ? win.close - win.open : 0; const hoursOpen = win ? Math.max(1, Math.ceil(span / 60)) : 0;
    const slotOf = (dev, type) => Math.max(5, (dev && dev.avg_min) || (type && type.duration_min) || 30);
    const calc = (list, devs) => { // list = bookings, devs = devices that serve them
      const cap = win ? devs.reduce((a, d) => a + Math.max(1, Math.floor(span / slotOf(d, null))), 0) : 0;
      const perH = new Map(); list.forEach((r) => { const h = Math.floor(toMin(r.time) / 60); perH.set(h, (perH.get(h) || 0) + 1); });
      const hourCap = devs.reduce((a, d) => a + Math.max(1, Math.floor(60 / slotOf(d, null))), 0);
      const hoursFull = [...perH.values()].filter((n) => n >= Math.max(1, Math.ceil(hourCap * 0.75))).length;
      return { count: list.length, cap, ratio: cap ? +(list.length / cap).toFixed(2) : 0, level: this._loadOf(list.length, cap, hoursFull, hoursOpen) };
    };
    const act = cat.devices.filter((d) => d.active);
    const devices = act.map((d) => ({ id: d.id, name: d.name, ...calc(rows.filter((r) => r.device_id === d.id), [d]) }));
    const types = cat.types.map((t) => { const ds = act.filter((d) => d.typeIds.includes(t.id)); const list = rows.filter((r) => r.type_id === t.id); return { id: t.id, ...calc(list, ds.length ? ds : [{ avg_min: t.duration_min }]) }; });
    return { date, open: !!win, all: calc(rows, act.length ? act : [{ avg_min: 30 }]), devices, types };
  },
  dayLoads({ dates }) { const out = {}; for (const d of [...new Set(dates || [])].slice(0, 400)) { const r = this.dayLoad({ date: d }); out[d] = { level: r.all.level, ratio: r.all.ratio, count: r.all.count, cap: r.all.cap }; } return out; },

  // ---- drag & drop: move a booking to (date, hour, device). Placed after the last session already in that hour.
  moveBooking({ id, date, hour, deviceId }, actor) {
    const b = this.db.get('SELECT * FROM bookings WHERE id=?', id); if (!b) throw new Error('not found');
    if (b.status === 'attended' || b.status === 'in_session') { const e = new Error('LOCKED_BOOKING'); e.code = 'LOCKED_BOOKING'; throw e; }
    const dev = deviceId === undefined ? b.device_id : deviceId; const dur = toMin(b.end_time) - toMin(b.time); const t = this._placeInHour(date, hour, dev, id);
    this.db.run('UPDATE bookings SET date=?,time=?,end_time=?,device_id=? WHERE id=?', date, fromMin(t), fromMin(t + dur), dev, id);
    this._log(actor, 'booking.move', 'booking', id, { date, hour, dev }); return { time: fromMin(t) };
  },
  // Class (e.g. "individual" Sun/Tue/Thu, "paired" Sat/Mon/Wed): build the weekly cycle from the class days, then distribute from the first class day on/after startDate
  planFromClass({ patientId = null, groupId, packages, startDate, tags = [] }) {
    const g = this.db.get('SELECT * FROM patient_groups WHERE id=?', groupId); if (!g) throw new Error('group not found');
    const { dow, addDays } = require('./util'); const days = JSON.parse(g.days || '[]').map(Number); const cat = this.getCatalog();
    const types = packages.flatMap((p) => { const t = cat.types.find((x) => x.id === p.typeId); return Array(Math.max(1, (t && t.per_day) || 1)).fill(p.typeId); });
    let pattern, start = startDate;
    if (days.length) {
      let d = startDate; for (let i = 0; i < 7 && !days.includes(dow(d)); i++) d = addDays(d, 1); start = d;
      const offs = [...new Set(days.map((x) => (x - dow(start) + 7) % 7))].sort((a, b) => a - b);
      pattern = { days: offs.map((off) => ({ off, types })), period: 7 * Math.max(1, g.repeat_weeks || 1) };
    } else pattern = { days: [{ off: 0, types }], period: Math.max(1, (g.gap_days || 1) + 1) };
    return this._planPattern(pattern, { patientId, packages, startDate: start, tags });
  },
  _placeInHour(date, hour, dev, ignoreId = 0) { let t = hour * 60; if (dev) for (const o of this.db.all("SELECT time,end_time FROM bookings WHERE date=? AND device_id=? AND id!=? AND status!='cancelled'", date, dev, ignoreId)) { const s0 = toMin(o.time), e0 = toMin(o.end_time); if (s0 >= hour * 60 && s0 < (hour + 1) * 60) t = Math.max(t, e0); } return t; },
  // add a visit for an existing patient at (date, hour, device) — also used by "paste (copy)"
  addBooking({ patientId, typeId, date, hour, deviceId = null, copyOf = null }, actor) {
    const src = copyOf ? this._bk(copyOf) : null; const type = this.db.get('SELECT * FROM session_types WHERE id=?', typeId ?? (src && src.type_id)); if (!type) throw new Error('type required');
    const t = this._placeInHour(date, hour, deviceId); const pid = patientId ?? src.patient_id;
    const id = Number(this.db.run("INSERT INTO bookings(patient_id,series_id,type_id,device_id,therapist_id,date,time,end_time,seq,total,status,price,wa_status,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,'booked',?,'none',?,?)", pid, src ? src.series_id : null, type.id, deviceId, src ? src.therapist_id : null, date, fromMin(t), fromMin(t + type.duration_min), null, null, type.price, actor ? actor.id : null, this.now()).lastInsertRowid);
    this.db.run("UPDATE patients SET status='active' WHERE id=? AND status='completed'", pid); this._log(actor, 'booking.add', 'booking', id, { date, hour }); return { id, time: fromMin(t) };
  },
  setMaintenance({ id, on }, actor) { this.db.run('UPDATE patients SET status=?,status_at=? WHERE id=?', on ? 'maintenance' : 'active', this.now(), id); const t = this._sysTag('maintenance'); if (t) on ? this.db.run('INSERT OR IGNORE INTO patient_tags(patient_id,tag_id) VALUES(?,?)', id, t) : this.db.run('DELETE FROM patient_tags WHERE patient_id=? AND tag_id=?', id, t); this._log(actor, 'patient.maintenance', 'patient', id, { on }); return true; },

  // ---- arrival + timers (persisted in the DB so navigating away / restarting never loses them)
  markArrived({ id, arrived = true }, actor) { const b = this._bk(id); if (b.status === 'attended' || b.status === 'in_session') return true; this.db.run('UPDATE bookings SET status=?,arrived_at=? WHERE id=?', arrived ? 'arrived' : 'booked', arrived ? this.now() : null, id); this._log(actor, arrived ? 'arrive' : 'unarrive', 'booking', id); return true; },
  _bk(id) { const b = this.db.get('SELECT * FROM bookings WHERE id=?', id); if (!b) throw new Error('not found'); return b; },
  startTimer({ id, minutes }, actor) {
    const b = this._bk(id); const type = this.db.get('SELECT duration_min FROM session_types WHERE id=?', b.type_id); const dev = b.device_id && this.db.get('SELECT avg_min FROM devices WHERE id=?', b.device_id);
    const min = Math.max(1, Math.round(Number(minutes) || (dev && dev.avg_min) || (type && type.duration_min) || 30)); const finished = [];
    if (b.device_id) for (const o of this.db.all("SELECT id FROM bookings WHERE device_id=? AND status='in_session' AND id!=?", b.device_id, id)) { this.finishSession({ id: o.id }, actor); finished.push(o.id); } // one patient per device: starting another auto-confirms the previous
    this.db.run("UPDATE bookings SET status='in_session',timer_start=?,timer_min=?,arrived_at=COALESCE(arrived_at,?) WHERE id=?", this.now(), min, this.now(), id);
    this._log(actor, 'timer.start', 'booking', id, { min }); return { minutes: min, finished };
  },
  restartTimer({ id }, actor) { this._bk(id); this.db.run('UPDATE bookings SET timer_start=? WHERE id=?', this.now(), id); this._log(actor, 'timer.restart', 'booking', id); return true; },
  setTimerMinutes({ id, minutes }, actor) { this._bk(id); this.db.run('UPDATE bookings SET timer_min=? WHERE id=?', Math.max(1, Math.round(Number(minutes))), id); this._log(actor, 'timer.set', 'booking', id, { minutes }); return true; },
  finishSession({ id }, actor) { const b = this._bk(id); const n = this.now(); this.db.run("UPDATE bookings SET status='attended',attended_at=?,timer_start=NULL WHERE id=?", n, id); this._completeIfDone(b.patient_id); this._log(actor, 'timer.finish', 'booking', id); return true; },

  // org notifications: running timers (+ next patient) and today's due people who have no timer yet
  listTimers() {
    const today = this.today(); const nowM = this._nowMin(); const cat = this.getCatalog(); const dn = new Map(cat.devices.map((d) => [d.id, d.name]));
    const rows = this.db.all(`SELECT b.id,b.patient_id,b.device_id,b.type_id,b.time,b.status,b.timer_start,b.timer_min,p.name patient_name FROM bookings b JOIN patients p ON p.id=b.patient_id WHERE b.date=? AND b.status IN ${ACTIVE} ORDER BY b.time`, today);
    const out = { running: [], waiting: [], now: this.now() };
    for (const r of rows) {
      const next = rows.find((o) => o.device_id === r.device_id && o.id !== r.id && o.status !== 'in_session' && o.time >= r.time);
      const item = { ...r, device_name: dn.get(r.device_id) || '', next_name: next ? next.patient_name : '' };
      if (r.status === 'in_session') out.running.push(item); else if (toMin(r.time) <= nowM + 59 && Math.floor(toMin(r.time) / 60) * 60 <= nowM) out.waiting.push(item);
    }
    return out;
  },

  // ---- automatic tags: laggard / committed. Manual tags are never touched.
  _autoTags() {
    const s = this.getSettings(); if (!s.autoTags) return; const today = this.today();
    const lag = this._sysTag('late_slots'), com = this._sysTag('committed'); if (!lag && !com) return;
    const set = (pid, tag, on) => { if (!tag) return; if (on) this.db.run('INSERT OR IGNORE INTO patient_tags(patient_id,tag_id,auto) VALUES(?,?,1)', pid, tag); else this.db.run('DELETE FROM patient_tags WHERE patient_id=? AND tag_id=? AND auto=1', pid, tag); };
    for (const { id } of this.db.all("SELECT id FROM patients WHERE status!='archived'")) {
      const past = this.db.all(`SELECT status FROM bookings WHERE patient_id=? AND status!='cancelled' AND date<? ORDER BY date DESC,time DESC LIMIT 8`, id, today);
      const misses = past.filter((b) => b.status !== 'attended').length; let streak = 0; for (const b of past) { if (b.status !== 'attended') break; streak++; }
      const isCom = streak >= s.committedStreak, isLag = !isCom && misses >= s.laggardMisses;
      set(id, lag, isLag); set(id, com, isCom);
    }
  },
  // reminders for maintenance ("إدامة") patients: the day before each session
  _maintenanceReminders() { const t = require('./util').addDays(this.today(), 1); for (const r of this.db.all(`SELECT b.id,b.patient_id FROM bookings b JOIN patients p ON p.id=b.patient_id WHERE p.status='maintenance' AND b.date=? AND b.status IN ${ACTIVE}`, t)) if (!this.db.get("SELECT 1 x FROM notifications WHERE kind='maintenance_remind' AND payload LIKE ?", `%"bookingId":${r.id}}%`)) this._notify('maintenance_remind', { patientId: r.patient_id, bookingId: r.id, date: t }); },
  // daily alerts: confirm laggards' attendance (day before / same day) and nag about dropped-out patients (one per patient per day)
  _dailyAlerts() {
    const today = this.today(), tom = require('./util').addDays(today, 1); const lag = this._sysTag('late_slots');
    if (lag) for (const r of this.db.all(`SELECT b.id,b.patient_id,b.date FROM bookings b JOIN patient_tags pt ON pt.patient_id=b.patient_id AND pt.tag_id=? WHERE b.date IN (?,?) AND b.status IN ${ACTIVE}`, lag, today, tom)) this._notify('laggard_confirm', { patientId: r.patient_id, bookingId: r.id, date: r.date });
    for (const r of this.db.all("SELECT id FROM patients WHERE status='dropped'")) this._notify('dropped_call', { patientId: r.id, date: today });
  },
  // manager statistics: last N days series + breakdowns + patient funnel
  managerStats({ days = 30 } = {}) {
    const U = require('./util'); const today = this.today(); const from = U.addDays(today, -(Math.min(180, Math.max(7, days)) - 1));
    const rows = this.db.all("SELECT b.*, t.name type_name, d.name device_name FROM bookings b LEFT JOIN session_types t ON t.id=b.type_id LEFT JOIN devices d ON d.id=b.device_id WHERE b.date>=? AND b.date<=? AND b.status!='cancelled'", from, today);
    const series = []; for (let d = from; d <= today; d = U.addDays(d, 1)) series.push({ date: d, total: 0, attended: 0, missed: 0, income: 0 });
    const idx = new Map(series.map((x, i) => [x.date, i])); const byType = {}, byDevice = {}, byHour = Array(24).fill(0); let att = 0, past = 0, income = 0, loss = 0;
    for (const b of rows) { const e = this._eff(b, today); const s = series[idx.get(b.date)]; s.total++; const p = b.price || 0;
      const bt = (byType[b.type_name || '—'] = byType[b.type_name || '—'] || { name: b.type_name || '—', total: 0, attended: 0, income: 0 }); bt.total++;
      const bd = (byDevice[b.device_name || '—'] = byDevice[b.device_name || '—'] || { name: b.device_name || '—', total: 0, attended: 0 }); bd.total++;
      byHour[+String(b.time).slice(0, 2)]++;
      if (e === 'attended') { s.attended++; s.income += p; att++; past++; income += p; bt.attended++; bt.income += p; bd.attended++; } else if (e === 'missed') { s.missed++; past++; loss += p; } }
    const pc = {}; for (const r of this.db.all('SELECT status, COUNT(*) n FROM patients GROUP BY status')) pc[r.status] = r.n;
    const lag = this._sysTag('late_slots'), lagN = lag ? this.db.get('SELECT COUNT(DISTINCT patient_id) n FROM patient_tags WHERE tag_id=?', lag).n : 0;
    const todayRows = rows.filter((b) => b.date === today);
    return { from, to: today, series, byType: Object.values(byType).sort((a, b) => b.total - a.total), byDevice: Object.values(byDevice).sort((a, b) => b.total - a.total), byHour, totals: { sessions: rows.length, attended: att, missed: past - att, rate: past ? att / past : 0, income, loss },
      patients: { active: pc.active || 0, dropped: pc.dropped || 0, maintenance: pc.maintenance || 0, completed: (pc.completed || 0) + (pc.archived || 0), laggards: lagN }, today: { total: todayRows.length, inSession: todayRows.filter((b) => b.status === 'in_session').length, done: todayRows.filter((b) => b.status === 'attended').length }, now: this.now() };
  },
};
function hourLabel(h) { const x = h % 12 === 0 ? 12 : h % 12; return x + (h < 12 ? ' ص' : ' م'); }
