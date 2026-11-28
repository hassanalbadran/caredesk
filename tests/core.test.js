'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { DB } = require('../src/core/db');
const { Service } = require('../src/core/service');

const at = (y, m, d, h = 8, mi = 0) => new Date(y, m - 1, d, h, mi).getTime();
function setup(now = at(2026, 11, 22)) {
  const db = new DB(':memory:'); let clock = now;
  const svc = new Service(db, { now: () => clock });
  svc.setClock = (t) => { clock = t; };
  const admin = svc.saveSecretary({ name: 'Admin', role: 'god' });
  const A = { id: admin, name: 'Admin' };
  const type = svc.saveCatalog({ kind: 'type', item: { name: 'Traction', duration_min: 30, price: 25000, per_day: 1, min_gap_min: 0 } }, A);
  const devA = svc.saveCatalog({ kind: 'device', item: { name: 'Dev A', typeIds: [type] } }, A);
  const devB = svc.saveCatalog({ kind: 'device', item: { name: 'Dev B', typeIds: [type] } }, A);
  const odd = svc.saveCatalog({ kind: 'group', item: { name: 'Odd', days: [0, 2, 4], gap_days: 1, per_day: 1, repeat_weeks: 1 } }, A);
  const even = svc.saveCatalog({ kind: 'group', item: { name: 'Even', days: [1, 3, 6], gap_days: 1, per_day: 1, repeat_weeks: 1 } }, A);
  const every3 = svc.saveCatalog({ kind: 'group', item: { name: 'Every3', days: [], gap_days: 3, per_day: 1, repeat_weeks: 1 } }, A);
  return { db, svc, A, type, devA, devB, odd, even, every3 };
}
const plan = (o) => ({ typeId: o.type, deviceId: o.devA, count: 6, startDate: '2026-11-22' });

test('odd-weekday group lands only on Sun/Tue/Thu inside working hours', () => {
  const o = setup();
  const r = o.svc.previewPlan({ groupId: o.odd, plans: [plan(o)] });
  assert.deepStrictEqual(r.bookings.map((b) => b.date), ['2026-11-22', '2026-11-24', '2026-11-26', '2026-11-29', '2026-12-01', '2026-12-03']);
  assert.ok(r.bookings.every((b) => b.time >= '09:00' && b.end_time <= '17:00'));
  assert.strictEqual(r.unplaced, 0);
});
test('gap_days=3 skips closed Friday and keeps gap', () => {
  const o = setup();
  const r = o.svc.previewPlan({ groupId: o.every3, plans: [{ ...plan(o), count: 4 }] });
  const d = r.bookings.map((b) => b.date);
  assert.strictEqual(d[0], '2026-11-22'); assert.strictEqual(d[1], '2026-11-25');
  for (let i = 1; i < d.length; i++) assert.ok((new Date(d[i]) - new Date(d[i - 1])) / 864e5 >= 3);
  assert.ok(!d.some((x) => new Date(x + 'T00:00:00Z').getUTCDay() === 5)); // never Friday
});
test('two patients on the same device never overlap', () => {
  const o = setup();
  const mk = (n) => o.svc.savePatient({ patient: { name: n, gender: 'M', phone: '07701234567', group_id: o.odd }, bookings: o.svc.previewPlan({ groupId: o.odd, plans: [plan(o)] }).bookings }, o.A);
  mk('A One'); mk('B Two');
  assert.deepStrictEqual(o.svc.dayConflicts({ date: '2026-11-22' }), []);
  const { rows } = o.svc.listBookings({ date: '2026-11-22' });
  assert.deepStrictEqual(rows.map((r) => r.time), ['09:00', '09:30']);
});
test('working hours per weekday are respected (Friday open 09-13 when enabled)', () => {
  const o = setup();
  o.svc.saveSettings({ patch: { hours: { 5: { on: true, open: '09:00', close: '10:00' } } } }, o.A);
  const r = o.svc.previewPlan({ plans: [{ typeId: o.type, deviceId: o.devA, count: 3, startDate: '2026-11-27' }] });
  assert.ok(r.bookings.every((b) => b.date !== '2026-11-27' || b.end_time <= '10:00'));
});
test('manual conflict is detected with a suggestion', () => {
  const o = setup();
  const b = (n) => o.svc.savePatient({ patient: { name: n }, bookings: [{ type_id: o.type, device_id: o.devA, date: '2026-11-23', time: '10:00' }] }, o.A);
  b('P1'); b('P2');
  const c = o.svc.dayConflicts({ date: '2026-11-23' });
  assert.ok(c.some((x) => x.kind === 'device_overlap' && x.suggestion));
});
test('attendance toggles, completes patient and early arrival creates a free-gap notice', () => {
  const o = setup(at(2026, 11, 23, 8, 0));
  const { id } = o.svc.savePatient({ patient: { name: 'Early Bird' }, bookings: [{ type_id: o.type, device_id: o.devA, date: '2026-11-23', time: '11:00' }] }, o.A);
  const b = o.svc.listBookings({ date: '2026-11-23' }).rows[0];
  const r = o.svc.setAttendance({ id: b.id, attended: true }, o.A);
  assert.ok(r.notice);
  assert.strictEqual(o.svc.getPatient({ id }).status, 'completed');
  o.svc.setAttendance({ id: b.id, attended: false }, o.A);
  assert.strictEqual(o.svc.getPatient({ id }).status, 'active');
});
test('absence rules: warn flags tag, remove cancels future and drops', () => {
  const o = setup(at(2026, 11, 22));
  const mk = (name, dates) => o.svc.savePatient({ patient: { name }, bookings: dates.map((d) => ({ type_id: o.type, device_id: o.devA, date: d, time: '09:00' })) }, o.A).id;
  const warn = mk('Warn', ['2026-11-15', '2026-11-16', '2026-11-17', '2026-11-29']);
  o.db.run("UPDATE bookings SET device_id=? WHERE patient_id=?", o.devB, warn);
  const drop = mk('Drop', ['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-29']);
  o.svc.setClock(at(2026, 11, 22, 9));
  const res = o.svc.sweep();
  assert.ok(res.warned.includes(warn)); assert.ok(res.removed.includes(drop));
  assert.ok(o.svc.getPatient({ id: warn }).tags.some((t) => t.effect === 'dropout'));
  const dp = o.svc.getPatient({ id: drop });
  assert.strictEqual(dp.status, 'dropped'); assert.strictEqual(dp.stats.upcoming, 1); // dropped patients stay booked (lowest priority)
  assert.ok(o.svc.listNotifications().length >= 2);
});
test('drop vs archive: archive adds no label', () => {
  const o = setup();
  const mk = (n) => o.svc.savePatient({ patient: { name: n }, bookings: [{ type_id: o.type, device_id: o.devA, date: '2026-11-25', time: '09:00' }] }, o.A).id;
  const a = mk('Arch'), d = mk('Drop');
  o.svc.archivePatient({ id: a }, o.A); o.svc.dropPatient({ id: d }, o.A);
  assert.strictEqual(o.svc.getPatient({ id: a }).tags.length, 0);
  assert.ok(o.svc.getPatient({ id: d }).tags.some((t) => t.effect === 'dropout'));
  assert.strictEqual(o.svc.getPatient({ id: a }).stats.upcoming, 0);
  assert.strictEqual(o.svc.searchPatients({ status: 'archive' }).length, 1);
  assert.strictEqual(o.svc.searchPatients({ status: 'dropped' }).length, 1);
});
test('late-tagged patient gets late slots; compaction pulls sessions earlier after a gap', () => {
  const o = setup();
  const late = o.db.get("SELECT id FROM tags WHERE effect='late_slots'").id;
  const r = o.svc.previewPlan({ tags: ['late_slots'], plans: [{ typeId: o.type, deviceId: o.devA, count: 1, startDate: '2026-11-22' }] });
  assert.strictEqual(r.bookings[0].end_time, '17:00'); void late;
  const p = o.svc.savePatient({ patient: { name: 'Mover' }, bookings: [{ type_id: o.type, device_id: o.devA, date: '2026-11-24', time: '09:00' }] }, o.A).id;
  const moves = o.svc.compactionPreview({ fromDate: '2026-11-22' });
  assert.ok(moves.some((m) => m.patientId === p && m.to.date === '2026-11-22'));
  o.svc.compactionApply({ moves }, o.A);
  assert.strictEqual(o.svc.getPatient({ id: p }).bookings[0].date, '2026-11-22');
});
test('stats, calendar and reminders', () => {
  const o = setup(at(2026, 11, 23));
  const p = o.svc.savePatient({ patient: { name: 'Ali Hassan Kareem', gender: 'M', phone: '0770 123 4567' }, bookings: [{ type_id: o.type, device_id: o.devA, date: '2026-11-23', time: '09:00' }, { type_id: o.type, device_id: o.devA, date: '2026-11-25', time: '09:00' }] }, o.A).id;
  const b = o.svc.listBookings({ date: '2026-11-23' }).rows[0]; o.svc.setAttendance({ id: b.id, attended: true }, o.A);
  const st = o.svc.dayStats({ date: '2026-11-23' });
  assert.strictEqual(st.attended, 1); assert.strictEqual(st.income, 25000);
  const cal = o.svc.monthCalendar({ ym: '2026-11' });
  assert.strictEqual(cal.days['2026-11-25'].pending, 1);
  const rem = o.svc.reminderList({ date: '2026-11-23' })[0];
  assert.match(rem.text, /Ali Hassan،/); assert.ok(!rem.text.includes('Kareem')); assert.ok(rem.urls[0].startsWith('whatsapp://send?phone=9647701234567'));
  assert.ok(o.svc.reminderUpcoming({ patientId: p }).text.includes('Traction'));
  assert.strictEqual(o.svc.barcodeLookup({ code: 'cd' + String(p).padStart(6, '0') }).id, p);
  assert.ok(o.svc.callScript({ patientId: p }).text.includes('شلونك'));
});
test('permissions: secretary cannot change settings', () => {
  const o = setup();
  const sid = o.svc.saveSecretary({ name: 'Sec', code: '1234', role: 'secretary' }, o.A);
  assert.throws(() => o.svc.call('saveSettings', { patch: { lang: 'en' } }, { id: sid }), /forbidden/);
  assert.ok(o.svc.loginSecretary({ id: sid, code: '1234' }).ok);
  assert.ok(!o.svc.loginSecretary({ id: sid, code: '0000' }).ok);
});

test('rating links: one stable token per attended booking', () => {
  const { DB } = require('../src/core/db'); const { Service } = require('../src/core/service');
  const db = new DB(':memory:'); const svc = new Service(db, { now: () => Date.parse('2026-03-02T10:00:00') });
  const pid = Number(db.run("INSERT INTO patients(name,phone,gender,created_at,updated_at) VALUES('A B','0770',?,1,1)", 'M').lastInsertRowid);
  db.run("INSERT INTO bookings(patient_id,date,time,end_time,status) VALUES(?,?,?,?,'attended')", pid, '2026-03-02', '09:00', '09:30');
  db.run("INSERT INTO bookings(patient_id,date,time,end_time,status) VALUES(?,?,?,?,'booked')", pid, '2026-03-02', '10:00', '10:30');
  const a = svc.createRatingLinks({ date: '2026-03-02' }, null), b = svc.createRatingLinks({ date: '2026-03-02' }, null);
  assert.equal(a.links.length, 1); assert.equal(a.links[0].token, b.links[0].token);
});

test('renderer plans copy is in sync with core/plans', () => {
  const p = require('../src/core/plans'); const src = require('fs').readFileSync(__dirname + '/../src/renderer/js/plans.js', 'utf8');
  const w = {}; new Function('window', src)(w); assert.deepStrictEqual(w.CD_PLANS, JSON.parse(JSON.stringify({ TIERS: p.TIERS, PRICES: p.PRICES, ROLE_PERMS: require('../src/core/defaults').ROLE_PERMS, PERMS: require('../src/core/defaults').PERMS })));
});
test('plan limit blocks extra secretaries on trial tier', () => {
  const { DB } = require('../src/core/db'); const { Service } = require('../src/core/service'); const db = new DB(':memory:'); const svc = new Service(db); svc.getTier = () => 'trial';
  const a = { name: 'sys' }; const before = db.get('SELECT COUNT(*) c FROM secretaries').c;
  for (let i = before; i < 2; i++) svc.saveSecretary({ name: 'x' + i }, a);
  assert.throws(() => svc.saveSecretary({ name: 'over' }, a), /PLAN_LIMIT/);
});

// ---- 1.0: fixed start time per patient + two different sessions on one day ----
test('fixed start time: every session starts at 16:00 even though 09:00 is free; retime moves existing ones', () => {
  const o = setup();
  const r = o.svc.previewPlan({ plans: [{ typeId: o.type, deviceId: o.devA, count: 4, startDate: '2026-11-22', startTime: '16:00' }] });
  assert.strictEqual(r.unplaced, 0);
  assert.ok(r.bookings.every((b) => b.time === '16:00'), JSON.stringify(r.bookings.map((b) => b.time)));
  // a second patient wanting the same hour on the same device gets the nearest free slot, never an overlap
  const pid = o.svc.savePatient({ patient: { name: 'A', gender: 'M', phone: '07700000001' }, bookings: r.bookings }, o.A).id;
  const r2 = o.svc.previewPlan({ plans: [{ typeId: o.type, deviceId: o.devA, count: 2, startDate: '2026-11-22', startTime: '16:00' }] });
  assert.ok(r2.bookings.every((b) => b.time !== '16:00' && b.time >= '16:30' || b.time === '15:30'), JSON.stringify(r2.bookings.map((b) => b.time)));
  // retime an existing patient created with the default (early) distribution
  const early = o.svc.previewPlan({ plans: [{ typeId: o.type, deviceId: o.devB, count: 3, startDate: '2026-11-22' }] });
  const p2 = o.svc.savePatient({ patient: { name: 'B', gender: 'M', phone: '07700000002' }, bookings: early.bookings }, o.A).id;
  const res = o.svc.retimePatient({ id: p2, time: '15:00', fromDate: '2026-11-22' }, o.A);
  assert.strictEqual(res.failed, 0); assert.strictEqual(res.moved, 3);
  assert.ok(o.svc.getPatient({ id: p2 }).bookings.every((b) => b.time === '15:00'));
  assert.strictEqual(o.svc.getPatient({ id: p2 }).pref_time, '15:00');
});
test('two different sessions of one patient share a day (also with a fixed time and a shared therapist)', () => {
  const o = setup();
  const t2 = o.svc.saveCatalog({ kind: 'type', item: { name: 'Pull', duration_min: 30, per_day: 1 } }, o.A);
  const d2 = o.svc.saveCatalog({ kind: 'device', item: { name: 'Dev P', typeIds: [t2] } }, o.A);
  const pattern = { days: [{ off: 0, types: [o.type, t2] }], period: 2 };
  for (const startTime of [undefined, '16:00']) {
    const r = o.svc.planFromPattern({ pattern, startDate: '2026-11-22', packages: [{ typeId: o.type, count: 3, deviceId: o.devA, startTime }, { typeId: t2, count: 3, deviceId: d2, startTime }] });
    assert.strictEqual(r.unplaced, 0);
    const days = new Map(); r.bookings.forEach((b) => (days.get(b.date) || days.set(b.date, []).get(b.date)).push(b));
    assert.ok([...days.values()].every((l) => l.length === 2), JSON.stringify([...days]));
    for (const l of days.values()) assert.ok(l[0].end_time <= l[1].time || l[1].end_time <= l[0].time); // never overlapping for the patient
  }
});
test('slotCheck knows the unsaved preview sessions of the same patient', () => {
  const o = setup();
  const c = o.svc.slotCheck({ date: '2026-11-23', time: '09:00', typeId: o.type, deviceId: o.devB, patientId: -1, others: [{ date: '2026-11-23', time: '09:00', end_time: '09:30', type_id: o.type, device_id: o.devA }] });
  assert.strictEqual(c.ok, false); assert.ok(c.issues.some((i) => i.kind === 'patient_overlap'));
  assert.strictEqual(c.suggestion.date, '2026-11-23');
});
