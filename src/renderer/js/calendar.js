'use strict';
(() => {
const { h, t, ic, $ } = CD;
CD.addDict({
  'cal.title': 'التقويم', 'cal.month': 'إحصاءات الشهر', 'cal.rate': 'نسبة الحضور', 'cal.pending': 'قادمة', 'cal.byType': 'حسب النوع', 'cal.byDev': 'حسب الجهاز', 'cal.byTh': 'حسب المعالج', 'cal.byHour': 'التوزيع بالساعات', 'cal.top': 'أكثر الغائبين', 'cal.open': 'فتح اليوم', 'cal.pick': 'اختر يوماً لعرض تفاصيله', 'cal.sel': 'تفاصيل اليوم', missedN: 'غياب',
  days0: 'الأحد', days1: 'الاثنين', days2: 'الثلاثاء', days3: 'الأربعاء', days4: 'الخميس', days5: 'الجمعة', days6: 'السبت', 'cal.conf': 'تعارض'
}, {
  'cal.title': 'Calendar', 'cal.month': 'Month statistics', 'cal.rate': 'Attendance rate', 'cal.pending': 'Upcoming', 'cal.byType': 'By type', 'cal.byDev': 'By device', 'cal.byTh': 'By therapist', 'cal.byHour': 'By hour', 'cal.top': 'Top absentees', 'cal.open': 'Open day', 'cal.pick': 'Pick a day to see details', 'cal.sel': 'Day details', missedN: 'missed',
  days0: 'Sun', days1: 'Mon', days2: 'Tue', days3: 'Wed', days4: 'Thu', days5: 'Fri', days6: 'Sat', 'cal.conf': 'conflict'
});
CD.views.calendar = (root) => {
  let ym = CD.iso().slice(0, 7), sel = null; const grid = h('.cal'), side = h('div', { style: { display: 'grid', gap: '12px', alignContent: 'start' } }), lbl = h('b', { style: { minWidth: '160px', textAlign: 'center' } });
  const shiftM = (n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); ym = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); load(); };
  const stat = (label, v, cls = '') => h('.stat', { class: cls }, h('small', label), h('b', { style: { fontSize: '20px' } }, v));
  const bars = (title, obj, keyLabel) => { const max = Math.max(1, ...obj.map((o) => o.total)); return h('div', h('small.dim', title), obj.slice(0, 6).map((o) => h('.row', { style: { margin: '4px 0' } }, h('span', { style: { width: '90px', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, o.name), h('div', { style: { flex: 1, height: '8px', borderRadius: '4px', background: 'var(--surf2)' } }, h('div', { style: { width: (o.total / max * 100) + '%', height: '100%', borderRadius: '4px', background: 'var(--acc)' } })), h('small', `${o.attended}/${o.total}`)))); };
  async function drawSide(data) {
    const m = data.month, rate = m.attended + m.missed ? Math.round(m.attended / (m.attended + m.missed) * 100) : 0;
    const parts = [h('.card', h('b', t('cal.month')), h('.grid.g2', { style: { marginTop: '8px' } }, stat(t('today.total'), m.total), stat(t('cal.rate'), rate + '%', rate >= 70 ? 'ok' : 'bad'), stat(t('today.att'), m.attended, 'ok'), stat(t('missedN'), m.missed, 'bad'), stat(t('cal.pending'), m.pending), stat(t('today.income'), CD.money(m.income), 'ok'), stat(t('today.loss'), CD.money(m.loss), 'bad'), stat(t('today.expected'), CD.money(m.expected))))];
    if (data.absentees.length) parts.push(h('.card', h('b', t('cal.top')), data.absentees.map((a) => h('.row', { style: { margin: '6px 0' } }, h('a.clk', { onclick: () => CD.openProfile(a.patientId) }, a.name), h('.sp'), h('span.pill.bad', `${a.missed} ${t('missedN')}`)))));
    if (sel) { const d = await CD.call('dayStats', { date: sel }); parts.push(h('.card', h('.row', h('b', t('cal.sel') + ' · ' + CD.fmtD(sel)), h('.sp'), h('button.btn.sm', { onclick: () => CD.go('today', { date: sel }) }, t('cal.open'))), h('.grid.g2', { style: { margin: '8px 0' } }, stat(t('today.total'), d.total), stat(t('today.att'), d.attended, 'ok'), stat(t('today.income'), CD.money(d.income), 'ok'), stat(t('today.loss'), CD.money(d.loss), 'bad')), bars(t('cal.byType'), d.byType), bars(t('cal.byDev'), d.byDevice), bars(t('cal.byTh'), d.byTherapist))); }
    else parts.push(h('p.dim', t('cal.pick')));
    CD.mount(side, parts);
  }
  async function load() {
    await CD.try(async () => {
      const data = await CD.call('monthCalendar', { ym }); const [y, m] = ym.split('-').map(Number); const first = new Date(y, m - 1, 1), n = new Date(y, m, 0).getDate(); const today = CD.iso();
      lbl.textContent = first.toLocaleDateString(CD.lang === 'ar' ? 'ar-IQ-u-nu-latn' : 'en-GB', { month: 'long', year: 'numeric' });
      const cells = [0, 1, 2, 3, 4, 5, 6].map((d) => h('.dn', t('days' + d)));
      for (let i = 0; i < first.getDay(); i++) cells.push(h('div'));
      for (let d = 1; d <= n; d++) {
        const iso = `${ym}-${String(d).padStart(2, '0')}`, x = data.days[iso]; const past = iso < today;
        const conf = x && x.conflicts.length ? h('span.warn', { 'data-tip': x.conflicts.map((c) => t('conflict_' + c.kind) + (c.suggestion ? ` → ${CD.fmtD(c.suggestion.date)} ${CD.fmtT(c.suggestion.time)}` : '')).join('\n'), html: ic('warn', 's') }) : null;
        cells.push(h('.cd.clk', { class: iso === today ? 'today' : '', onclick: () => { sel = iso; drawSide(data); }, ondblclick: () => CD.go('today', { date: iso }) }, h('span.n', d), conf,
          x && x.total ? h('.chips', x.attended ? h('span.chip.ok', x.attended) : null, x.missed ? h('span.chip.bad', x.missed) : null, x.pending ? h('span.chip.up', x.pending) : null) : null,
          x && x.total ? h('small.dim', CD.money(past ? x.income : x.expected).replace(' ' + (CD.S.currency || 'IQD'), '')) : null));
      }
      CD.mount(grid, cells); drawSide(data);
    });
  }
  CD.mount(root, h('.hd', h('h1.h1', t('cal.title')), h('.sp'), h('button.btn.ico', { onclick: () => shiftM(-1), html: ic(CD.lang === 'ar' ? 'right' : 'left') }), lbl, h('button.btn.ico', { onclick: () => shiftM(1), html: ic(CD.lang === 'ar' ? 'left' : 'right') }), h('button.btn.sm', { onclick: () => { ym = CD.iso().slice(0, 7); load(); } }, t('today'))),
    h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: '16px' } }, h('.card', grid), side));
  load();
};

})();
