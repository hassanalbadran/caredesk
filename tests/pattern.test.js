'use strict';
const test = require('node:test'); const assert = require('node:assert');
const mk = () => { const svc = new Service(new DB(':memory:')); const g = svc.saveSecretary({ name: 'A', role: 'god' }); const A = { id: g, name: 'A' }; const a = { id: svc.saveCatalog({ kind: 'type', item: { name: 'Neuro', duration_min: 20, price: 1, per_day: 1, min_gap_min: 0 } }, A) }; const b = { id: svc.saveCatalog({ kind: 'type', item: { name: 'Pull', duration_min: 20, price: 1, per_day: 1, min_gap_min: 0 } }, A) }; return { svc, a, b }; };
const { inferPattern, nameOf } = require('../src/core/pattern');
const { DB } = require('../src/core/db'); const { Service } = require('../src/core/service');

test('one example day assumes a single rest day', () => {
  const p = inferPattern([{ date: '2026-12-01', types: [1, 2, 2] }]); assert.deepStrictEqual({ days: p.days, period: p.period }, { days: [{ off: 0, types: [1, 2, 2] }], period: 2 });
});
test('two identical days 2 apart => every 2 days', () => {
  const p = inferPattern([{ date: '2026-12-01', types: [1, 2, 2] }, { date: '2026-12-03', types: [1, 2, 2] }]);
  assert.strictEqual(p.period, 2); assert.strictEqual(p.days.length, 1);
});
test('three days then a rest day is detected as one 3-day cycle', () => {
  const t = [1, 2];
  const p = inferPattern([{ date: '2026-12-01', types: t }, { date: '2026-12-02', types: t }, { date: '2026-12-03', types: t }, { date: '2026-12-05', types: t }]);
  assert.strictEqual(p.period, 4); assert.strictEqual(p.days.length, 3);
});
test('consecutive days => no rest', () => {
  const p = inferPattern([{ date: '2026-12-01', types: [1] }, { date: '2026-12-02', types: [1] }]); assert.strictEqual(p.period, 1);
});
test('name shows rest days', () => { assert.strictEqual(nameOf({ days: [{ off: 0, types: [1, 2, 2] }], period: 2 }, (i) => 'n' + i), 'n1 n2 n2 · فراغ'); });

test('distribution starts on the first example day and stays compact', () => {
  const { svc, a, b } = mk(); const start = '2027-03-01'; // Monday
  const r = svc.planFromExamples({ examples: [{ date: start, types: [a.id, b.id, b.id] }, { date: '2027-03-03', types: [a.id, b.id, b.id] }], packages: [{ typeId: a.id, count: 6 }, { typeId: b.id, count: 12 }] });
  assert.strictEqual(r.unplaced, 0); assert.strictEqual(r.bookings.length, 18); assert.strictEqual(r.bookings[0].date, start);
  const days = [...new Set(r.bookings.map((x) => x.date))]; assert.strictEqual(days.length, 6);
  const span = (new Date(days[days.length - 1]) - new Date(days[0])) / 864e5; assert.ok(span <= 14, 'span ' + span); // 6 visits every other day (Fri closed shifts a little)
  assert.deepStrictEqual(r.bookings.map((x) => x.seq), r.bookings.map((_, i) => i + 1));
  r.bookings.forEach((x) => assert.strictEqual(x.total, 18));
});
test('remembered patterns are deduplicated', () => {
  const { svc, a } = mk(); const p = { days: [{ off: 0, types: [a.id] }], period: 2 };
  svc.rememberPattern({ pattern: p }); const l = svc.rememberPattern({ pattern: JSON.parse(JSON.stringify(p)) }); assert.strictEqual(l.length, 1);
});

const { describe, targets } = require('../src/core/pattern'); const nm = (i) => 'T' + i;
test('descriptions are plain language for many shapes', () => {
  const D = (ex, o) => describe(inferPattern(ex), nm, o).text; const e = (d, t = [1]) => ({ date: d, types: t });
  assert.strictEqual(D([e('2026-12-01'), e('2026-12-02')]), 'يومياً');
  assert.strictEqual(D([e('2026-12-01'), e('2026-12-03')]), 'يوم بعد يوم');
  assert.strictEqual(D([e('2026-12-01'), e('2026-12-04')]), 'كل 3 أيام');
  assert.strictEqual(D([e('2026-12-06'), e('2026-12-08'), e('2026-12-10'), e('2026-12-13')]), '٣ أيام بالأسبوع · أحد · ثلاثاء · خميس');
  assert.strictEqual(D([e('2026-12-05'), e('2026-12-07'), e('2026-12-12')]), 'يومين بالأسبوع · اثنين · سبت');
  assert.strictEqual(D([e('2026-12-01'), e('2026-12-08')]), 'مرة بالأسبوع · ثلاثاء');
  assert.strictEqual(D([e('2026-11-19'), e('2026-12-19')]), 'مرة بالشهر (يوم 19)');
  assert.strictEqual(D([e('2026-11-19'), e('2027-01-19')]), 'كل شهرين (يوم 19)');
  assert.strictEqual(D([e('2026-12-01'), e('2026-12-15')]), 'كل أسبوعين · ثلاثاء');
  assert.strictEqual(D([e('2026-12-01', [1]), e('2026-12-02', [2]), e('2026-12-03', [1]), e('2026-12-04', [2])]), 'تناوب · T1 ← T2');
  assert.strictEqual(D([e('2026-12-01'), e('2026-12-02'), e('2026-12-04')]), 'جلستان متتاليتان ثم راحة يوم');
});
test('weekly class names win and weekly patterns keep their weekdays when reused', () => {
  const p = inferPattern([{ date: '2026-12-06', types: [1] }, { date: '2026-12-08', types: [1] }, { date: '2026-12-10', types: [1] }, { date: '2026-12-13', types: [1] }]); // Sun Tue Thu Sun
  assert.strictEqual(describe(p, nm, { classes: [{ name: 'فردي', days: [0, 2, 4] }] }).title, 'فردي');
  const out = []; for (const tg of targets(p, '2026-12-09', () => true)) { out.push(tg.date); if (out.length === 3) break; } // start on a Wednesday
  assert.deepStrictEqual(out, ['2026-12-10', '2026-12-13', '2026-12-15']);
  const m = inferPattern([{ date: '2026-11-19', types: [1] }, { date: '2026-12-19', types: [1] }]); const o2 = []; for (const tg of targets(m, '2027-01-02', () => true)) { o2.push(tg.date); if (o2.length === 3) break; } assert.deepStrictEqual(o2, ['2027-01-19', '2027-02-19', '2027-03-19']);
});
