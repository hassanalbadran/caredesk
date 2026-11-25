'use strict';
// Session patterns: the secretary drops the first few sessions on calendar days; we infer a repeating cycle from them.
const { addDays, diffDays, dow } = require('./util');

const clean = (ex) => ex.filter((e) => e && e.date && Array.isArray(e.types) && e.types.length).map((e) => ({ date: e.date, types: e.types.map(Number) })).sort((a, b) => (a.date < b.date ? -1 : 1));
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

// examples: [{date, types:[typeId...]}]  ->  { days:[{off, types}], period }  or null
function inferPattern(examples) {
  const ex = clean(examples); if (!ex.length) return null; const p = infer0(ex); if (p) { const d = new Date(ex[0].date + 'T00:00:00Z'); p.anchor = { dow: dow(ex[0].date), dom: d.getUTCDate() }; const m = monthlyOf(ex); if (m) { p.days = [{ off: 0, types: ex[0].types }]; p.period = 30 * m; p.monthly = m; } } return p;
}
function infer0(ex) {
  const d0 = ex[0].date; const E = ex.map((e) => ({ off: diffDays(d0, e.date), types: e.types }));
  if (E.length === 1) return { days: [{ off: 0, types: E[0].types }], period: 2 }; // one example: assume a rest day in between
  // smallest cycle length k whose repetition explains every later example (same contents, constant spacing)
  for (let k = 1; k < E.length; k++) {
    const per = E[k].off - E[0].off; if (per <= E[k - 1].off - E[0].off) continue;
    let ok = true; for (let i = 0; i + k < E.length; i++) if (E[i + k].off - E[i].off !== per || !same(E[i + k].types, E[i].types)) { ok = false; break; }
    if (ok) return { days: E.slice(0, k), period: per };
  }
  const last = E[E.length - 1].off, gap = last - E[E.length - 2].off; // no repetition seen: the whole example is one cycle
  return { days: E, period: last + Math.max(1, gap) };
}

// Same day-of-month every k months (e.g. a maintenance patient on the 19th) => calendar-month cycle instead of a fixed number of days.
function monthlyOf(ex) {
  if (ex.length < 2) return 0; const P = (d) => ({ y: +d.slice(0, 4), m: +d.slice(5, 7), d: +d.slice(8, 10) }); const a = ex.map((e) => P(e.date)); const k = (a[1].y - a[0].y) * 12 + a[1].m - a[0].m; if (k < 1) return 0;
  for (let i = 1; i < a.length; i++) { if ((a[i].y - a[i - 1].y) * 12 + a[i].m - a[i - 1].m !== k) return 0; const dim = new Date(Date.UTC(a[i].y, a[i].m, 0)).getUTCDate(); if (a[i].d !== Math.min(a[0].d, dim)) return 0; if (!same(ex[i].types, ex[0].types)) return 0; }
  return k;
}
const addMonths = (date, k, dom) => { let y = +date.slice(0, 4), m = +date.slice(5, 7) - 1 + k; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12; const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); return `${y}-${String(m + 1).padStart(2, '0')}-${String(Math.min(dom, dim)).padStart(2, '0')}`; };
const sigOf = (p) => JSON.stringify([p.period, p.days.map((d) => [d.off, d.types]), p.monthly || 0, p.period % 7 === 0 && p.anchor ? p.anchor.dow : -1]);
function nameOf(p, typeName) {
  const parts = []; let cur = 0;
  for (const d of p.days) { for (let r = cur; r < d.off; r++) parts.push('فراغ'); parts.push(d.types.map(typeName).join(' ')); cur = d.off + 1; }
  for (let r = cur; r < p.period; r++) parts.push('فراغ');
  return parts.join(' · ');
}
// Expand a pattern into concrete target dates. Weekly patterns are anchored to their weekdays (a Sun/Tue/Thu pattern stays Sun/Tue/Thu wherever it starts),
// monthly ones to their day-of-month. `isOpen(date)` skips closed weekdays.
function* targets(p, startDate, isOpen) {
  let last = null;
  if (p.monthly && p.anchor) { const dom = p.anchor.dom; let first = addMonths(startDate, 0, dom); if (first < startDate) first = addMonths(startDate, 1, dom);
    for (let c = 0; c < 240; c++) { let date = addMonths(first, c * p.monthly, dom); if (last && date <= last) date = addDays(last, 1); let g = 0; while (!isOpen(date) && g++ < 14) date = addDays(date, 1); last = date; yield { date, types: p.days[0].types }; } return; }
  let start = startDate; const weekly = !!(p.anchor && p.period % 7 === 0 && p.days.length); if (weekly) start = addDays(startDate, -((dow(startDate) - p.anchor.dow + 7) % 7)); // cycle week that contains startDate
  for (let c = 0; c < 500; c++) for (const d of p.days) {
    let date = addDays(start, c * p.period + d.off); if (weekly && date < startDate) continue; if (last && date <= last) date = addDays(last, 1);
    let g = 0; while (!isOpen(date) && g++ < 14) date = addDays(date, 1);
    last = date; yield { date, types: d.types };
  }
}
// ---- plain-language description of a pattern (shown on the quick-arrangement buttons) ----
const L = {
  ar: { days: ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'], daily: 'يومياً', every2: 'يوم بعد يوم', everyN: (n) => `كل ${n} أيام`, perWeekN: (n) => ({ 1: 'مرة بالأسبوع', 2: 'يومين بالأسبوع', 3: '٣ أيام بالأسبوع', 4: '٤ أيام بالأسبوع', 5: '٥ أيام بالأسبوع', 6: '٦ أيام بالأسبوع' }[n]), workdays: 'كل أيام الدوام', allBut: (d) => `كل الأيام عدا ${d === 'جمعة' ? 'الجمعة' : d}`, everyWeeks: (n) => (n === 2 ? 'كل أسبوعين' : `كل ${n} أسابيع`), monthly: (k, dom) => (k === 1 ? `مرة بالشهر (يوم ${dom})` : k === 2 ? `كل شهرين (يوم ${dom})` : `كل ${k} أشهر (يوم ${dom})`), run: (n, r) => `${n === 1 ? 'جلسة' : n === 2 ? 'جلستان متتاليتان' : n + ' جلسات متتالية'} ثم ${r === 1 ? 'راحة يوم' : r === 2 ? 'راحة يومين' : 'راحة ' + r + ' أيام'}`, alt: 'تناوب', cycle: (n, k) => `دورة ${n} أيام · ${k} جلسات`, onDay: 'يوم', and: ' + ', sep: ' · ' },
  en: { days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], daily: 'Every day', every2: 'Every other day', everyN: (n) => `Every ${n} days`, perWeekN: (n) => `${n === 1 ? 'Once' : n + ' days'} a week`, workdays: 'All working days', allBut: (d) => `Every day except ${d}`, everyWeeks: (n) => (n === 2 ? 'Every 2 weeks' : `Every ${n} weeks`), monthly: (k, dom) => (k === 1 ? `Once a month (day ${dom})` : `Every ${k} months (day ${dom})`), run: (n, r) => `${n} in a row, then ${r} day${r > 1 ? 's' : ''} rest`, alt: 'Alternating', cycle: (n, k) => `${n}-day cycle · ${k} sessions`, onDay: 'day', and: ' + ', sep: ' · ' }
};
// describe(pattern, typeName, { lang, classes:[{name,days}] }) -> { title, detail, types, text }
function describe(p, typeName, o = {}) {
  const T = L[o.lang === 'en' ? 'en' : 'ar']; const days = p.days; const k = days.length; const typeSets = new Set(days.map((d) => d.types.slice().sort().join(',')));
  const allTypes = [...new Set(days.flatMap((d) => d.types))]; const types = allTypes.length > 1 || o.alwaysTypes ? days.map((d) => d.types.map(typeName).join(T.and)).filter((x, i, a) => a.indexOf(x) === i).join(' ← ') : '';
  let title = '', detail = '';
  const wk = p.anchor && p.period % 7 === 0 ? days.map((d) => (p.anchor.dow + d.off) % 7).filter((x, i, a) => a.indexOf(x) === i).sort((a, b) => a - b) : null;
  if (p.monthly) { title = T.monthly(p.monthly, p.anchor ? p.anchor.dom : '?'); }
  else if (p.period === 1) title = T.daily;
  else if (k === 1 && p.period === 2) title = T.every2;
  else if (k === 1 && p.period % 7 === 0 && p.period > 7) { title = T.everyWeeks(p.period / 7); if (wk) detail = T.days[wk[0]]; }
  else if (wk && p.period === 7) {
    const cls = (o.classes || []).find((c) => c.days && c.days.length === wk.length && c.days.map(Number).sort((a, b) => a - b).every((x, i) => x === wk[i]));
    const names = wk.map((d) => T.days[d]).join(T.sep); const missing = [0, 1, 2, 3, 4, 5, 6].filter((d) => !wk.includes(d));
    if (cls) { title = cls.name; detail = names; }
    else if (wk.length === 5 && !wk.includes(5) && !wk.includes(6)) { title = T.workdays; detail = ''; }
    else if (wk.length >= 5 && missing.length === 1) { title = T.allBut(T.days[missing[0]]); }
    else { title = T.perWeekN(wk.length); detail = names; }
  }
  else if (k === 1) title = T.everyN(p.period);
  else if (days.every((d, i) => d.off === i) && p.period > k) title = T.run(k, p.period - k);
  else if (days.every((d, i) => d.off === i) && p.period === k && typeSets.size > 1) title = T.alt;
  else title = T.cycle(p.period, k);
  return { title, detail, types, text: [title, detail, types].filter(Boolean).join(T.sep) };
}
module.exports = { inferPattern, sigOf, nameOf, targets, describe };
