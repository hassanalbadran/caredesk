'use strict';
/* Manager statistics (Tools): KPI tiles + live SVG charts, refreshed every 10 s while visible. */
(() => {
const { h, t } = CD;
CD.addDict({ 'st.title': 'إحصائيات المدير', 'st.sub': 'مباشرة — تتحدّث تلقائياً', 'st.d7': '7 أيام', 'st.d30': '30 يوماً', 'st.d90': '90 يوماً', 'st.sessions': 'الجلسات', 'st.attended': 'حضور', 'st.missed': 'غياب', 'st.rate': 'نسبة الالتزام', 'st.income': 'الدخل التقريبي', 'st.loss': 'الخسارة التقريبية', 'st.daily': 'الجلسات اليومية', 'st.byType': 'حسب النوع', 'st.byHour': 'ذروة الساعات', 'st.byDev': 'استخدام الأجهزة', 'st.funnel': 'المرضى', 'st.active': 'فعّال', 'st.dropped': 'منقطع', 'st.maint': 'إدامة', 'st.done': 'أنهى العلاج', 'st.lag': 'متلكئ', 'st.today': 'اليوم', 'st.inS': 'داخل الجلسة الآن', 'st.finished': 'منتهية اليوم', 'st.empty': 'لا بيانات بعد', 'st.incomeDaily': 'الدخل اليومي' },
  { 'st.title': 'Manager statistics', 'st.sub': 'Live — refreshes automatically', 'st.d7': '7 days', 'st.d30': '30 days', 'st.d90': '90 days', 'st.sessions': 'Sessions', 'st.attended': 'Attended', 'st.missed': 'Missed', 'st.rate': 'Attendance rate', 'st.income': 'Approx. income', 'st.loss': 'Approx. loss', 'st.daily': 'Daily sessions', 'st.byType': 'By type', 'st.byHour': 'Peak hours', 'st.byDev': 'Device usage', 'st.funnel': 'Patients', 'st.active': 'Active', 'st.dropped': 'Dropped-out', 'st.maint': 'Maintenance', 'st.done': 'Completed', 'st.lag': 'Laggards', 'st.today': 'Today', 'st.inS': 'In session now', 'st.finished': 'Finished today', 'st.empty': 'No data yet', 'st.incomeDaily': 'Daily income' });
const NS = 'http://www.w3.org/2000/svg';
const sv = (tag, a = {}, ...k) => { const e = document.createElementNS(NS, tag); for (const [x, y] of Object.entries(a)) e.setAttribute(x, y); e.append(...k.flat().filter((n) => n != null)); return e; };
const PAL = ['#8EB69B', '#e8c44d', '#6fa8dc', '#d98880', '#b39ddb', '#7fd1c6', '#f0a868'];
const tile = (label, val, sub, tone) => h('.card.inset', { style: { padding: '10px 14px', display: 'grid', gap: '2px', minWidth: '130px' } }, h('small.dim', label), h('b', { style: { fontSize: '22px', color: tone ? `var(--${tone})` : '' } }, val), sub ? h('small.dim', sub) : null);
function lineChart(series, keys, colors, W = 620, H = 180) {
  const max = Math.max(1, ...series.flatMap((s) => keys.map((k) => s[k]))), n = series.length, px = 34, py = 14, x = (i) => px + (n < 2 ? 0 : (i * (W - px - 30)) / (n - 1)), y = (v) => H - 22 - (v / max) * (H - 22 - py);
  const grid = [0, 0.5, 1].map((f) => sv('g', {}, sv('line', { x1: px, x2: W - 24, y1: y(max * f), y2: y(max * f), stroke: 'currentColor', 'stroke-opacity': '.12' }), sv('text', { x: px - 6, y: y(max * f) + 4, 'text-anchor': 'end', 'font-size': 10, fill: 'currentColor', 'fill-opacity': '.6' }, String(Math.round(max * f)))));
  const lines = keys.map((k, ki) => { const d = series.map((s, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(s[k]).toFixed(1)}`).join(' '); return sv('g', {}, ki === 0 ? sv('path', { d: d + ` L${x(n - 1)} ${H - 22} L${x(0)} ${H - 22} Z`, fill: colors[ki], 'fill-opacity': '.14' }) : null, sv('path', { d, fill: 'none', stroke: colors[ki], 'stroke-width': 2.2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' })); });
  const ticks = [0, Math.floor((n - 1) / 2), n - 1].map((i) => sv('text', { x: x(i), y: H - 6, 'text-anchor': i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle', 'font-size': 10, fill: 'currentColor', 'fill-opacity': '.6' }, (series[i].date || '').slice(5)));
  return sv('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', role: 'img', style: 'max-width:760px;height:auto' }, grid, lines, ticks);
}
function bars(vals, labels, color, W = 620, H = 150) {
  const max = Math.max(1, ...vals), n = vals.length, bw = (W - 30) / n;
  return sv('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', role: 'img', style: 'max-width:760px;height:auto' }, vals.map((v, i) => sv('g', {}, sv('rect', { x: 24 + i * bw + 2, y: H - 20 - (v / max) * (H - 34), width: Math.max(2, bw - 4), height: (v / max) * (H - 34), rx: 4, fill: color, 'fill-opacity': v ? 0.9 : 0.15 }, sv('title', {}, `${labels[i]}: ${v}`)), i % Math.ceil(n / 12) === 0 ? sv('text', { x: 24 + i * bw + bw / 2, y: H - 6, 'text-anchor': 'middle', 'font-size': 10, fill: 'currentColor', 'fill-opacity': '.6' }, labels[i]) : null)));
}
function donut(items) {
  const tot = items.reduce((a, b) => a + b.total, 0) || 1; let a0 = -Math.PI / 2; const R = 54, r = 34, C = 64;
  const arcs = items.slice(0, 7).map((it, i) => { const a1 = a0 + (it.total / tot) * Math.PI * 2 - 0.0001, big = a1 - a0 > Math.PI ? 1 : 0; const p = (a, rad) => `${C + rad * Math.cos(a)} ${C + rad * Math.sin(a)}`; const d = `M${p(a0, R)} A${R} ${R} 0 ${big} 1 ${p(a1, R)} L${p(a1, r)} A${r} ${r} 0 ${big} 0 ${p(a0, r)} Z`; a0 = a1; return sv('path', { d, fill: PAL[i % PAL.length] }, sv('title', {}, `${it.name}: ${it.total}`)); });
  return h('.row', { style: { gap: '16px', alignItems: 'center' } }, sv('svg', { viewBox: '0 0 128 128', width: 128, height: 128, role: 'img' }, arcs, sv('text', { x: C, y: C + 5, 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 700, fill: 'currentColor' }, String(tot))),
    h('div', { style: { display: 'grid', gap: '4px' } }, items.slice(0, 7).map((it, i) => h('.row', { style: { gap: '8px', fontSize: '12px' } }, h('span', { style: { width: '10px', height: '10px', borderRadius: '3px', background: PAL[i % PAL.length] } }), h('span', it.name), h('b', it.total)))));
}
const hbar = (rows) => h('div', { style: { display: 'grid', gap: '6px' } }, rows.map((r, i) => { const m = Math.max(1, ...rows.map((x) => x.total)); return h('div', { style: { display: 'grid', gap: '2px' } }, h('.row', { style: { fontSize: '12px' } }, h('span', r.name), h('.sp'), h('b', `${r.attended}/${r.total}`)), h('div', { style: { height: '8px', borderRadius: '6px', background: 'var(--surf2)', overflow: 'hidden' } }, h('div', { style: { width: (r.total / m) * 100 + '%', height: '100%', background: PAL[i % PAL.length], borderRadius: '6px', transition: 'width .5s' } }))); }));
CD.statsPanel = () => {
  let days = 30, started = false; const host = h('div', { style: { display: 'grid', gap: '14px' } }); let timer = 0; const seg = h('.seg');
  const sec = (title, node) => h('.card.inset', { style: { padding: '12px 14px', display: 'grid', gap: '8px' } }, h('b', { style: { fontSize: '13px' } }, title), node);
  const load = async () => {
    if (started && !host.isConnected) { clearInterval(timer); return; }
    let d; try { d = await CD.call('managerStats', { days }); } catch (e) { CD.mount(host, h('p.dim', e.message)); return; }
    CD.mount(seg, [7, 30, 90].map((n) => h('button', { class: n === days ? 'on' : '', onclick: () => { days = n; load(); } }, t('st.d' + n))));
    const T = d.totals, P = d.patients;
    CD.mount(host, h('.row.wrap', { style: { gap: '10px' } }, tile(t('st.sessions'), T.sessions), tile(t('st.attended'), T.attended, null, 'ok'), tile(t('st.missed'), T.missed, null, 'bad'), tile(t('st.rate'), Math.round(T.rate * 100) + '%'), ...(T.income == null ? [] : [tile(t('st.income'), CD.money(T.income), null, 'ok'), tile(t('st.loss'), CD.money(T.loss), null, 'bad')]), tile(t('st.today'), d.today.total, `${t('st.inS')}: ${d.today.inSession} · ${t('st.finished')}: ${d.today.done}`)),
      sec(t('st.daily'), d.totals.sessions ? lineChart(d.series, ['total', 'attended', 'missed'], ['#8EB69B', '#6fa8dc', '#d98880']) : h('p.dim', t('st.empty'))),
      h('.row.wrap', { style: { gap: '14px', alignItems: 'stretch' } }, h('div', { style: { flex: '1 1 300px' } }, sec(t('st.byType'), d.byType.length ? donut(d.byType) : h('p.dim', t('st.empty')))), h('div', { style: { flex: '1 1 300px' } }, sec(t('st.byDev'), d.byDevice.length ? hbar(d.byDevice) : h('p.dim', t('st.empty'))))),
      sec(t('st.byHour'), bars(d.byHour.slice(6, 23), Array.from({ length: 17 }, (_, i) => { const hh = i + 6; return (hh % 12 || 12) + (hh < 12 ? 'ص' : 'م'); }), '#e8c44d')),
      T.income == null ? null : sec(t('st.incomeDaily'), bars(d.series.map((s) => s.income), d.series.map((s) => s.date.slice(5)), '#8EB69B')),
      sec(t('st.funnel'), h('.row.wrap', { style: { gap: '10px' } }, tile(t('st.active'), P.active), tile(t('st.dropped'), P.dropped, null, 'bad'), tile(t('st.maint'), P.maintenance), tile(t('st.done'), P.completed, null, 'ok'), tile(t('st.lag'), P.laggards, null, 'warn'))));
  };
  const top = h('div', { style: { display: 'grid', gap: '12px' } }, h('.row', h('small.dim', t('st.sub')), h('.sp'), seg), host); load().then(() => { started = true; }); timer = setInterval(load, 10000); return top;
};
})();
