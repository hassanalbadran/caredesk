'use strict';
const test = require('node:test'); const assert = require('node:assert');
const { DB } = require('../src/core/db'); const { Service } = require('../src/core/service');
const at = (y, m, d, h = 12, mi = 0) => new Date(y, m - 1, d, h, mi).getTime();
function setup(now = at(2026, 11, 22, 8)) {
  const db = new DB(':memory:'); let clock = now; const svc = new Service(db, { now: () => clock }); svc.setClock = (t) => { clock = t; };
  const A = { id: svc.saveSecretary({ name: 'Admin', role: 'god' }), name: 'Admin' };
  const type = svc.saveCatalog({ kind: 'type', item: { name: 'Pull', duration_min: 20, price: 1, per_day: 1, min_gap_min: 0 } }, A);
  const dev = svc.saveCatalog({ kind: 'device', item: { name: 'Pull 1', typeIds: [type], avg_min: 20 } }, A);
  const dev2 = svc.saveCatalog({ kind: 'device', item: { name: 'Pull 2', typeIds: [type], avg_min: 20 } }, A);
  const mk = (name, time, d = dev, date = '2026-11-22') => svc.savePatient({ patient: { name }, bookings: [{ type_id: type, device_id: d, date, time }] }, A).id;
  return { svc, db, A, type, dev, dev2, mk };
}
const bk = (o, pid) => o.db.get('SELECT * FROM bookings WHERE patient_id=?', pid);

test('homeMonth counts patients per type per day', () => {
  const o = setup(); o.mk('a', '09:00'); o.mk('b', '09:30');
  const m = o.svc.homeMonth({ ym: '2026-11' }); assert.strictEqual(m.days['2026-11-22'].types[o.type].n, 2); assert.strictEqual(m.types.length, 1);
});
test('typePage lists the devices of that type with counts', () => {
  const o = setup(); o.mk('a', '09:00'); o.mk('b', '09:00', o.dev2); o.mk('c', '10:00', o.dev2);
  const p = o.svc.typePage({ date: '2026-11-22', typeId: o.type }); assert.deepStrictEqual(p.devices.map((d) => d.count), [1, 2]); assert.strictEqual(p.total, 3);
});
test('device day: turns follow priority (VIP first, dropped last) and states by clock', () => {
  const o = setup(at(2026, 11, 22, 9, 30)); const n = o.mk('normal', '09:00'); const v = o.mk('vip', '09:20'); const d = o.mk('dropped', '09:00'); o.mk('later', '11:00');
  o.svc.setPatientTags({ id: v, tagIds: [o.db.get("SELECT id FROM tags WHERE effect='vip'").id] }, o.A); o.svc.dropPatient({ id: d }, o.A);
  const r = o.svc.deviceDay({ date: '2026-11-22', deviceId: o.dev }); const h9 = r.bookings.filter((b) => b.hour === 9).sort((a, b) => a.turn - b.turn).map((b) => b.patient_name);
  assert.deepStrictEqual(h9, ['vip', 'normal', 'dropped']);
  const st = Object.fromEntries(r.bookings.map((b) => [b.patient_name, b.ui])); assert.strictEqual(st.normal, 'late'); assert.strictEqual(st.later, 'upcoming');
  o.svc.markArrived({ id: bk(o, n).id }, o.A); assert.strictEqual(o.svc.deviceDay({ date: '2026-11-22', deviceId: o.dev }).hours.find((x) => x.h === 9).red, true);
  o.svc.setClock(at(2026, 11, 22, 18)); assert.strictEqual(o.svc.deviceDay({ date: '2026-11-22', deviceId: o.dev }).bookings.find((b) => b.patient_name === 'later').ui, 'absent');
});
test('timer: start, persists, new start on same device auto-finishes previous', () => {
  const o = setup(); const a = bk(o, o.mk('a', '09:00')).id, b = bk(o, o.mk('b', '09:20')).id, c = bk(o, o.mk('c', '09:00', o.dev2)).id;
  o.svc.startTimer({ id: a }, o.A); o.svc.startTimer({ id: c }, o.A); assert.strictEqual(o.svc.listTimers().running.length, 2);
  const r = o.svc.startTimer({ id: b, minutes: 15 }, o.A); assert.deepStrictEqual(r.finished, [a]); assert.strictEqual(o.db.get('SELECT status FROM bookings WHERE id=?', a).status, 'attended');
  assert.strictEqual(o.db.get('SELECT timer_min FROM bookings WHERE id=?', b).timer_min, 15);
  o.svc.finishSession({ id: b }, o.A); assert.strictEqual(o.svc.listTimers().running.length, 1);
});
test('moveBooking puts the patient after the others in the target hour and locks finished ones', () => {
  const o = setup(); o.mk('x', '10:00'); const id = bk(o, o.mk('y', '09:00')).id;
  assert.strictEqual(o.svc.moveBooking({ id, date: '2026-11-22', hour: 10, deviceId: o.dev }, o.A).time, '10:20');
  o.svc.finishSession({ id }, o.A); assert.throws(() => o.svc.moveBooking({ id, date: '2026-11-23', hour: 9 }, o.A), /LOCKED/);
});
test('auto tags: laggard after misses, committed after streak; manual tags untouched', () => {
  const o = setup(at(2026, 11, 30, 8)); const p = o.svc.savePatient({ patient: { name: 'L' }, bookings: ['2026-11-10', '2026-11-11', '2026-11-12'].map((d) => ({ type_id: o.type, device_id: o.dev, date: d, time: '09:00' })) }, o.A).id;
  o.svc.sweep(); assert.ok(o.svc.getPatient({ id: p }).tags.some((t) => t.effect === 'late_slots'));
  o.db.run("UPDATE bookings SET status='attended' WHERE patient_id=?", p); o.svc.sweep(); assert.ok(!o.svc.getPatient({ id: p }).tags.some((t) => t.effect === 'late_slots'));
});
test('class days: individual Sun/Tue/Thu distributes only on those days, starting at the first class day', () => {
  const o = setup(); const g = o.svc.saveCatalog({ kind: 'group', item: { name: 'Individual', days: [0, 2, 4], gap_days: 1, per_day: 1, repeat_weeks: 1 } }, o.A);
  const r = o.svc.planFromClass({ groupId: g, packages: [{ typeId: o.type, count: 6 }], startDate: '2026-11-22' });
  assert.deepStrictEqual(r.bookings.map((b) => b.date), ['2026-11-22', '2026-11-24', '2026-11-26', '2026-11-29', '2026-12-01', '2026-12-03']);
  const r2 = o.svc.planFromClass({ groupId: g, packages: [{ typeId: o.type, count: 2 }], startDate: '2026-11-23' }); assert.strictEqual(r2.bookings[0].date, '2026-11-24');
});
test('addBooking appends after existing sessions in the hour; copyOf duplicates', () => {
  const o = setup(); const a = bk(o, o.mk('a', '09:00')); const r = o.svc.addBooking({ patientId: a.patient_id, typeId: o.type, date: '2026-11-22', hour: 9, deviceId: o.dev }, o.A); assert.strictEqual(r.time, '09:20');
  const c = o.svc.addBooking({ copyOf: a.id, date: '2026-11-23', hour: 10, deviceId: o.dev }, o.A); assert.strictEqual(o.db.get('SELECT patient_id p FROM bookings WHERE id=?', c.id).p, a.patient_id);
  assert.strictEqual(o.svc.deviceDay({ date: '2026-11-22', deviceId: null }).total, 0);
});

test('managerStats returns series, totals and patient funnel', () => {
  const o = setup(); const a = o.mk('a', '09:00'); o.mk('b', '09:30'); o.db.run("UPDATE bookings SET status='attended' WHERE patient_id=?", a);
  const m = o.svc.managerStats({ days: 7 }); assert.strictEqual(m.series.length, 7); assert.strictEqual(m.totals.sessions, 2); assert.strictEqual(m.totals.attended, 1);
  assert.strictEqual(m.patients.active, 2); assert.strictEqual(m.byType[0].total, 2); assert.strictEqual(m.byHour[9], 2);
});

test('class days (even when stored as strings) decide the weekdays of auto distribution', () => {
  const o = setup(at(2026, 11, 22, 8)); const g = o.svc.saveCatalog({ kind: 'group', item: { name: 'Paired', days: ['6', '1', '3'], gap_days: 1, per_day: 1 } }, o.A);
  const r = o.svc.previewPlan({ groupId: g, plans: [{ typeId: o.type, count: 6, startDate: '2026-11-22', deviceId: o.dev }] });
  const { dow } = require('../src/core/util'); const set = new Set(r.bookings.map((b) => dow(b.date))); assert.strictEqual(r.bookings.length, 6);
  for (const d of set) assert.ok([6, 1, 3].includes(d), 'unexpected weekday ' + d);
});

test('granular permissions: look-only settings, income redaction, reschedule', () => {
  const o = setup(); const sid = o.svc.saveSecretary({ name: 'Sec', role: 'secretary', perms: ['view_today', 'settings_look', 'view_stats'] }, o.A); const S = { id: sid };
  assert.throws(() => o.svc.call('saveSettings', { patch: { currency: 'X' } }, S), /forbidden/);
  const r = o.svc.call('saveLook', { patch: { theme: 'light', currency: 'X' } }, S); assert.strictEqual(r.theme, 'light'); assert.notStrictEqual(r.currency, 'X');
  assert.throws(() => o.svc.call('moveBooking', { id: 1, date: '2026-11-22', hour: 9 }, S), /forbidden/);
  const m = o.svc.call('managerStats', { days: 7 }, S); assert.strictEqual(m.totals.income, null);
});

test('importPatients skips duplicates and exportPatients lists everyone', () => {
  const o = setup(); const before = o.svc.exportPatients().length; const r = o.svc.importPatients({ patients: [{ name: 'N1', phone: '07701110000' }, { name: 'N2', phone: '07701110000' }, { name: 'N3', phone: '' }, { name: 'N3', phone: '' }] }, o.A);
  assert.strictEqual(r.added, 2); assert.strictEqual(r.skipped, 2); assert.strictEqual(o.svc.exportPatients().length, before + 2);
});

test('dayLoad: green when light, yellow when nearly full, red when full — per device and per type', () => {
  const o = setup(); const date = '2026-11-22';
  assert.strictEqual(o.svc.dayLoad({ date }).devices.find((d) => d.id === o.dev).level, 'green');
  const w = o.svc.getSettings().hours[0]; const toM = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  const cap = Math.floor((toM(w.close) - toM(w.open)) / 20); let n = 0;
  const fill = (k) => { for (; n < k; n++) o.mk('p' + n, String(Math.floor((toM(w.open) + n * 20) / 60)).padStart(2, '0') + ':' + String((toM(w.open) + n * 20) % 60).padStart(2, '0')); };
  fill(Math.ceil(cap * 0.8)); assert.strictEqual(o.svc.dayLoad({ date }).devices.find((d) => d.id === o.dev).level, 'yellow');
  fill(cap); const r = o.svc.dayLoad({ date }); assert.strictEqual(r.devices.find((d) => d.id === o.dev).level, 'red');
  assert.strictEqual(r.devices.find((d) => d.id === o.dev2).level, 'green'); assert.strictEqual(r.types[0].level, 'green');
  assert.strictEqual(o.svc.dayLoads({ dates: [date, '2026-11-23'] })[date].level, r.all.level);
});
