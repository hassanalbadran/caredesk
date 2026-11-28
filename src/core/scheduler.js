'use strict';
const { toMin, fromMin, addDays, dow, diffDays, overlap } = require('./util');

// ---- occupancy index -------------------------------------------------------
class Occupancy {
  constructor(bookings = []) { this.byDate = new Map(); this.byId = new Map(); bookings.forEach((b) => this.add(b)); }
  add(b) {
    const x = { ...b, s: toMin(b.time), e: toMin(b.end_time) };
    this.byId.set(x.id, x);
    if (!this.byDate.has(x.date)) this.byDate.set(x.date, []);
    this.byDate.get(x.date).push(x);
    return x;
  }
  remove(id) {
    const x = this.byId.get(id); if (!x) return;
    this.byId.delete(id);
    const arr = this.byDate.get(x.date); arr.splice(arr.indexOf(x), 1);
  }
  on(date) { return this.byDate.get(date) || []; }
  move(id, date, time, endTime) { const x = this.byId.get(id); const n = { ...x, date, time, end_time: endTime }; this.remove(id); return this.add(n); }
}

// ---- context ---------------------------------------------------------------
// ctx = { settings, types:Map, devices:[{id,active,typeIds:[]}], therapists:[{id,days,start,end,deviceIds}], groups:Map, occ:Occupancy }
function dayWindow(settings, date) {
  const h = settings.hours[dow(date)];
  if (!h || !h.on) return null;
  return { open: toMin(h.open), close: toMin(h.close) };
}
function therapistOk(th, date, s, e, win) {
  if (!th) return true;
  if (!th.active && th.active !== undefined && !th.active) return false;
  if (th.days && th.days.length && !th.days.includes(dow(date))) return false;
  const a = th.start ? toMin(th.start) : win.open, b = th.end ? toMin(th.end) : win.close;
  return s >= a && e <= b;
}
function conflictsFor(ctx, { date, s, e, deviceId, therapistId, patientId, patientPad = 0 }, ignore = []) {
  const out = [];
  for (const b of ctx.occ.on(date)) {
    if (ignore.includes(b.id) || b.status === 'cancelled') continue;
    const hit = overlap(s, e, b.s, b.e);
    if (hit && deviceId && b.device_id === deviceId) out.push({ kind: 'device', booking: b });
    if (hit && therapistId && b.therapist_id === therapistId) out.push({ kind: 'therapist', booking: b });
    if (patientId && b.patient_id === patientId && (hit || (patientPad && overlap(s - patientPad, e + patientPad, b.s, b.e)))) out.push({ kind: 'patient', booking: b });
  }
  return out;
}
function eligibleDay(ctx, date, group, anchor) {
  const win = dayWindow(ctx.settings, date); if (!win) return null;
  if (group && group.days && group.days.length && !group.days.includes(dow(date))) return null;
  if (group && group.repeat_weeks > 1) {
    const w = Math.floor((diffDays(anchor, date) + dow(anchor)) / 7);
    if (w % group.repeat_weeks !== 0) return null;
  }
  return win;
}
// Find a free slot on one day. prefer: 'early' | 'late'. fromMin: lower bound for start. exact: try this start first.
function findSlot(ctx, { date, duration, deviceId, therapistId, patientId, from = 0, prefer = 'early', exact = null, target = null, patientPad = 0, ignore = [] }, win = dayWindow(ctx.settings, date)) {
  if (!win) return null;
  const step = ctx.settings.slotStep || 15;
  const th = therapistId ? ctx.therapists.find((t) => t.id === therapistId) : null;
  const dev = deviceId ? ctx.devices.find((d) => d.id === deviceId) : null;
  if (deviceId && dev && dev.active === 0) return null;
  const ok = (s) => {
    const e = s + duration;
    if (s < win.open || e > win.close || s < from) return false;
    if (!therapistOk(th, date, s, e, win)) return false;
    return conflictsFor(ctx, { date, s, e, deviceId, therapistId, patientId, patientPad }, ignore).length === 0;
  };
  if (exact != null && ok(exact)) return { time: fromMin(exact), end: fromMin(exact + duration) };
  const starts = [];
  for (let s = win.open; s + duration <= win.close; s += step) starts.push(s);
  if (target != null) { // fixed preferred hour: exactly that time, else the closest later slot, else the closest earlier one
    const t = Number(target); const later = starts.filter((x) => x >= t), before = starts.filter((x) => x < t).reverse();
    if (ok(t)) return { time: fromMin(t), end: fromMin(t + duration) };
    starts.splice(0, starts.length, ...later, ...before);
  } else if (prefer === 'late') starts.reverse();
  for (const s of starts) if (ok(s)) return { time: fromMin(s), end: fromMin(s + duration) };
  return null;
}

// ---- auto distribution of a package of N sessions --------------------------
function distribute(ctx, o) {
  const type = ctx.types.get(o.typeId);
  const group = o.groupId ? ctx.groups.get(o.groupId) : null;
  const duration = o.duration || type.duration_min;
  const perDay = (group && group.per_day) || type.per_day || 1;
  const gapDays = Math.max(1, (group && group.gap_days) || 1);
  const minGapMin = type.min_gap_min || 0;
  const placed = []; let lastDay = null; let cursor = o.startDate; let preferred = null; let guard = 0;
  while (placed.length < o.count && guard++ < 800) {
    if (lastDay && diffDays(lastDay, cursor) < gapDays) cursor = addDays(lastDay, gapDays);
    const win = eligibleDay(ctx, cursor, group, o.startDate);
    if (!win) { cursor = addDays(cursor, 1); continue; }
    let todays = 0, prevEnd = 0;
    for (let k = 0; k < perDay && placed.length < o.count; k++) {
      const fixed = o.startTime ? toMin(o.startTime) : null;
      const slot = findSlot(ctx, { date: cursor, duration, deviceId: o.deviceId, therapistId: o.therapistId, patientId: o.patientId,
        from: k ? prevEnd + minGapMin : 0, prefer: o.prefer || 'early', exact: k === 0 ? preferred : null,
        target: fixed != null ? (k ? Math.max(fixed, prevEnd + minGapMin) : fixed) : null, patientPad: minGapMin }, win);
      if (!slot) break;
      const row = { id: -(placed.length + 1), patient_id: o.patientId, device_id: o.deviceId || null, therapist_id: o.therapistId || null,
        type_id: o.typeId, date: cursor, time: slot.time, end_time: slot.end, status: 'booked' };
      ctx.occ.add(row); placed.push({ ...row, seq: (o.startSeq || 1) + placed.length });
      if (k === 0 && preferred == null && !o.startTime) preferred = toMin(slot.time);
      prevEnd = toMin(slot.end); todays++;
    }
    if (todays) { lastDay = cursor; cursor = addDays(cursor, gapDays); } else cursor = addDays(cursor, 1);
  }
  placed.forEach((p) => ctx.occ.remove(p.id)); // caller persists real rows
  return { placed: placed.map(({ id, ...r }) => r), unplaced: o.count - placed.length };
}

// ---- pattern-based distribution: follow the cycle the secretary demonstrated, starting exactly at startDate ----
// o: { pattern, startDate, packages:[{typeId,count,deviceId,therapistId}], patientId, prefer }
function distributePattern(ctx, o) {
  const { targets } = require('./pattern');
  const remain = new Map(); o.packages.forEach((p) => remain.set(p.typeId, { ...p, left: p.count }));
  let left = [...remain.values()].reduce((n, p) => n + p.left, 0); const total = left; const placed = []; let unplaced = 0;
  const isOpen = (d) => !!dayWindow(ctx.settings, d);
  const useful = new Set(o.pattern.days.flatMap((d) => d.types)); // types the pattern can never place are reported, not looped on
  for (const r of remain.values()) if (!useful.has(r.typeId)) { unplaced += r.left; left -= r.left; r.left = 0; }
  for (const tg of targets(o.pattern, o.startDate, isOpen)) {
    if (left <= 0) break;
    let date = tg.date, prevEnd = 0, tries = 0;
    for (const typeId of tg.types) {
      const r = remain.get(typeId); if (!r || r.left <= 0) continue;
      const type = ctx.types.get(typeId); const dur = type.duration_min;
      let slot = null; const fixed = r.startTime || o.startTime; const gap = type.min_gap_min || 0;
      while (!slot && tries++ < 60) {
        const win = dayWindow(ctx.settings, date);
        // 1st try: after the patient's previous session of the day; 2nd: anywhere that day not touching it (so two different sessions share a day whenever any room exists)
        for (const from of (prevEnd ? [prevEnd, 0] : [0])) {
          slot = win && findSlot(ctx, { date, duration: dur, deviceId: r.deviceId, therapistId: r.therapistId, patientId: o.patientId, from,
            prefer: o.prefer || 'early', target: fixed ? Math.max(toMin(fixed), from) : null, patientPad: gap }, win);
          if (slot) break;
        }
        if (!slot) { date = addDays(date, 1); prevEnd = 0; }
      }
      if (!slot) { unplaced += r.left; left -= r.left; r.left = 0; continue; }
      const row = { id: -(placed.length + 1), patient_id: o.patientId, device_id: r.deviceId || null, therapist_id: r.therapistId || null, type_id: typeId, date, time: slot.time, end_time: slot.end, status: 'booked' };
      ctx.occ.add(row); placed.push(row); r.left--; left--; prevEnd = Math.max(prevEnd, toMin(slot.end) + (type.min_gap_min || 0));
    }
  }
  placed.forEach((p) => ctx.occ.remove(p.id));
  placed.sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1));
  return { placed: placed.map(({ id, ...r }, i) => ({ ...r, seq: i + 1, total })), unplaced };
}

// ---- conflicts + suggestions ------------------------------------------------
function suggest(ctx, b, ignoreIds = []) {
  const type = ctx.types.get(b.type_id); const duration = type ? type.duration_min : (toMin(b.end_time) - toMin(b.time));
  const devs = ctx.devices.filter((d) => d.active !== 0 && (!type || !d.typeIds.length || d.typeIds.includes(b.type_id)));
  const order = [b.device_id, ...devs.map((d) => d.id).filter((id) => id !== b.device_id)].filter((x, i, a) => x != null && a.indexOf(x) === i);
  for (let off = 0; off < 15; off++) {
    const date = addDays(b.date, off);
    for (const deviceId of (order.length ? order : [null])) {
      const slot = findSlot(ctx, { date, duration, deviceId, therapistId: b.therapist_id, patientId: b.patient_id, from: off ? 0 : 0, ignore: [b.id, ...ignoreIds] });
      if (slot && !(date === b.date && slot.time === b.time && deviceId === b.device_id)) return { date, time: slot.time, deviceId };
    }
  }
  return null;
}
function detectConflicts(ctx, from, to) {
  const issues = [];
  const dates = [...ctx.occ.byDate.keys()].filter((d) => d >= from && d <= to).sort();
  for (const date of dates) {
    const win = dayWindow(ctx.settings, date);
    const list = ctx.occ.on(date).filter((b) => b.status !== 'cancelled');
    const seen = new Set();
    for (const b of list) {
      if (!win) issues.push({ date, kind: 'off_day', bookingIds: [b.id] });
      else if (b.s < win.open || b.e > win.close) issues.push({ date, kind: 'outside_hours', bookingIds: [b.id] });
      const dev = ctx.devices.find((d) => d.id === b.device_id);
      if (dev && dev.active === 0) issues.push({ date, kind: 'device_inactive', bookingIds: [b.id] });
      for (const c of conflictsFor(ctx, { date, s: b.s, e: b.e, deviceId: b.device_id, therapistId: b.therapist_id, patientId: b.patient_id }, [b.id])) {
        const key = [c.kind, Math.min(b.id, c.booking.id), Math.max(b.id, c.booking.id)].join(':');
        if (seen.has(key)) continue; seen.add(key);
        issues.push({ date, kind: c.kind + '_overlap', bookingIds: [b.id, c.booking.id].sort((x, y) => x - y) });
      }
    }
  }
  for (const it of issues) {
    const target = ctx.occ.byId.get(it.bookingIds[it.bookingIds.length - 1]); // the later-created booking moves
    it.suggestion = target ? suggest(ctx, target) : null;
  }
  return issues;
}

// ---- free gaps & compaction ---------------------------------------------------
function freeGaps(ctx, date, minLen = 15) {
  const win = dayWindow(ctx.settings, date); if (!win) return [];
  const out = [];
  for (const d of ctx.devices.filter((x) => x.active !== 0)) {
    const busy = ctx.occ.on(date).filter((b) => b.device_id === d.id && b.status !== 'cancelled').sort((a, b) => a.s - b.s);
    let cur = win.open;
    for (const b of busy) { if (b.s - cur >= minLen) out.push({ deviceId: d.id, start: fromMin(cur), end: fromMin(b.s) }); cur = Math.max(cur, b.e); }
    if (win.close - cur >= minLen) out.push({ deviceId: d.id, start: fromMin(cur), end: fromMin(win.close) });
  }
  return out;
}
// Propose moving future bookings earlier into free slots (never breaking a patient's gap rules).
function suggestCompaction(ctx, { fromDate, tagsByPatient = new Map() }) {
  const future = [...ctx.occ.byId.values()].filter((b) => b.status === 'booked' && b.date >= fromDate)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const moves = [];
  const bySeries = new Map();
  for (const b of ctx.occ.byId.values()) if (b.series_id && b.status !== 'cancelled') (bySeries.get(b.series_id) || bySeries.set(b.series_id, []).get(b.series_id)).push(b);
  for (const b of future) {
    const type = ctx.types.get(b.type_id); const group = b.group_id ? ctx.groups.get(b.group_id) : null;
    const gapDays = Math.max(1, (group && group.gap_days) || 1);
    const perDay = (group && group.per_day) || (type && type.per_day) || 1;
    const sib = (bySeries.get(b.series_id) || []).filter((x) => x.id !== b.id).sort((x, y) => x.seq - y.seq);
    const prev = sib.filter((x) => x.seq < b.seq).pop();
    const earliest = prev ? addDays(prev.date, prev.date === b.date ? 0 : gapDays) : fromDate;
    const lo = earliest > fromDate ? earliest : fromDate;
    const prefer = (tagsByPatient.get(b.patient_id) || []).includes('late_slots') ? 'late' : 'early';
    for (let date = lo; date <= b.date; date = addDays(date, 1)) {
      if (!eligibleDay(ctx, date, group, fromDate)) continue;
      const sameDay = sib.filter((x) => x.date === date && x.status !== 'cancelled').length;
      if (sameDay >= perDay && date !== b.date) continue;
      const slot = findSlot(ctx, { date, duration: toMin(b.end_time) - toMin(b.time), deviceId: b.device_id, therapistId: b.therapist_id, patientId: b.patient_id, prefer, ignore: [b.id] });
      if (!slot) continue;
      if (date === b.date && slot.time >= b.time) continue; // not an improvement
      moves.push({ bookingId: b.id, patientId: b.patient_id, from: { date: b.date, time: b.time }, to: { date, time: slot.time, end: slot.end } });
      ctx.occ.move(b.id, date, slot.time, slot.end); b.date = date;
      break;
    }
  }
  return moves;
}
module.exports = { Occupancy, dayWindow, findSlot, distribute, distributePattern, detectConflicts, suggest, freeGaps, suggestCompaction, conflictsFor, eligibleDay };
