'use strict';
/* Schedule month-calendar preview: sessions as chips per day, detailed / compact view, drag a chip to another day, click to change time. */
(() => {
const { h, t, ic } = CD;
CD.addDict({ 'sc.detail': 'مفصّل', 'sc.compact': 'مختصر', 'sc.fix': 'أصلح الباقي تلقائياً', 'sc.fixHint': 'أعد توزيع الجلسات التي بعد التعديل', 'sc.none': 'لا جلسات بعد — اضغط «توزيع تلقائي» أو استعمل المخطط', 'sc.bad': 'تعارض أو خارج الدوام', 'sc.fixed': 'أُعيد توزيع الباقي', 'sc.drag': 'اسحب الجلسة إلى يوم آخر، أو اضغطها لتغيير اليوم والساعة', 'sc.moved': 'نُقلت الجلسة' },
  { 'sc.detail': 'Detailed', 'sc.compact': 'Compact', 'sc.fix': 'Fix the rest automatically', 'sc.fixHint': 'Re-distribute the sessions after the edit', 'sc.none': 'No sessions yet — press Auto distribute or use the planner', 'sc.bad': 'Conflict or outside working hours', 'sc.fixed': 'The rest was re-distributed', 'sc.drag': 'Drag a session to another day, or click it to change day and time', 'sc.moved': 'Session moved' });
const hue = (i) => `hsl(${(Number(i) * 67 + 150) % 360} 48% 36%)`;
const ymOf = (d) => d.slice(0, 7);
CD.schedCal = (o) => {
  const box = h('div', { style: { display: 'grid', gap: '10px' } }); let mode = 'detail'; try { mode = localStorage.getItem('cd.schedMode') || 'detail'; } catch { /* ok */ } let dirty = null; const bad = new Set(); const loads = new Map(); let fetching = false;
  const typeName = (id) => (o.types.find((x) => x.id === id) || {}).name || '';
  const sort = () => { const rows = o.get(); rows.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)); rows.forEach((r, i) => { r.seq = i + 1; }); };
  const check = async (r) => { const others = o.get().filter((x) => x !== r && x.date === r.date).map((x) => ({ date: x.date, time: x.time, end_time: x.end_time, type_id: x.type_id, device_id: x.device_id, therapist_id: x.therapist_id })); const c = await CD.call('slotCheck', { date: r.date, time: r.time, typeId: r.type_id, deviceId: r.device_id, therapistId: r.therapist_id, patientId: o.patientId || undefined, others }).catch(() => ({ ok: true })); if (c.ok) bad.delete(r); else bad.add(r); r._sug = c.suggestion || null; return c.ok; };
  const touch = async (r, patch, auto) => { Object.assign(r, patch); sort(); const ok = await check(r); if (!ok && auto && r._sug && r._sug.date === r.date) { const dur = (Number(r.end_time.slice(0, 2)) * 60 + Number(r.end_time.slice(3))) - (Number(r.time.slice(0, 2)) * 60 + Number(r.time.slice(3))); const [hh, mm] = r._sug.time.split(':').map(Number); const e = hh * 60 + mm + dur; r.time = r._sug.time; r.end_time = String(Math.floor(e / 60)).padStart(2, '0') + ':' + String(e % 60).padStart(2, '0'); r._sug.time = null; sort(); await check(r); } dirty = Math.min(dirty == null ? 1e9 : dirty, o.get().indexOf(r)); draw(); o.onChange && o.onChange(); };
  const edit = (r, anchor) => {
    const d = h('input.in', { type: 'date', value: r.date }), tm = h('input.in', { type: 'time', value: r.time });
    const p = CD.popover(anchor, h('div', { style: { display: 'grid', gap: '8px', minWidth: '210px' } }, h('b', `${r.seq} · ${typeName(r.type_id)}`), d, tm,
      h('.row', h('button.btn.pri.sm', { onclick: () => { p.hidePopover(); touch(r, { date: d.value || r.date, time: tm.value || r.time }); } }, t('ok')), h('.sp'), h('button.btn.bad.sm', { onclick: () => { p.hidePopover(); const rows = o.get(); rows.splice(rows.indexOf(r), 1); sort(); dirty = 0; draw(); o.onChange && o.onChange(); }, html: ic('trash', 's') }))));
  };
  const draw = () => {
    const rows = o.get(); const today = CD.iso(); const by = new Map();
    { const need = [...new Set(rows.map((r) => r.date))].filter((d) => !loads.has(d)); if (need.length && !fetching) { fetching = true; CD.call('dayLoads', { dates: need }).then((m) => { need.forEach((d) => loads.set(d, (m[d] || {}).level || 'green')); }).catch(() => need.forEach((d) => loads.set(d, 'green'))).finally(() => { fetching = false; draw(); }); } } rows.forEach((r) => (by.get(r.date) || by.set(r.date, []).get(r.date)).push(r));
    const months = [...new Set(rows.map((r) => ymOf(r.date)))].sort(); const hrs = (CD.S && CD.S.hours) || {};
    const seg = h('.seg', [['detail', 'sc.detail'], ['compact', 'sc.compact']].map(([k, l]) => h('button', { class: mode === k ? 'on' : '', onclick: () => { mode = k; try { localStorage.setItem('cd.schedMode', k); } catch { /* ok */ } draw(); } }, t(l))));
    const fix = dirty != null && o.fixRest ? h('button.btn.pri.sm', { 'data-tip': t('sc.fixHint'), onclick: async () => { const i = dirty; dirty = null; await o.fixRest(i); draw(); CD.toast(t('sc.fixed')); } }, ic('refresh', 's'), t('sc.fix')) : null;
    const cal = (ym) => {
      const [y, m] = ym.split('-').map(Number), first = new Date(y, m - 1, 1), n = new Date(y, m, 0).getDate(); const cells = [0, 1, 2, 3, 4, 5, 6].map((d) => h('.dn', t('days' + d)));
      for (let i = 0; i < first.getDay(); i++) cells.push(h('.fday.void'));
      for (let d = 1; d <= n; d++) {
        const iso = `${ym}-${String(d).padStart(2, '0')}`, list = by.get(iso) || [], closed = !(hrs[new Date(y, m - 1, d).getDay()] || {}).on;
        const cell = h('.fday.sc', { class: (iso === today ? 'today ' : '') + (iso < today ? 'past ' : '') + (closed ? 'closed ' : '') + (list.length && loads.get(iso) && loads.get(iso) !== 'green' ? 'lv-' + loads.get(iso) : '') }, h('.fh', h('span.n', d), h('.sp'), list.length && ['red', 'yellow'].includes(loads.get(iso)) ? h('span', { 'data-tip': CD.lvText(loads.get(iso)) }, CD.LV[loads.get(iso)].dot) : null, list.length ? h('span.pill', list.length) : null),
          h('.ftb', mode === 'compact' ? h('.row.wrap', { style: { gap: '3px' } }, list.map((r) => chip(r, true))) : list.map((r) => chip(r, false))));
        cell.addEventListener('dragover', (e) => { e.preventDefault(); cell.classList.add('drop-ok'); }); cell.addEventListener('dragleave', () => cell.classList.remove('drop-ok'));
        cell.addEventListener('drop', (e) => { e.preventDefault(); cell.classList.remove('drop-ok'); const r = rows[Number(e.dataTransfer.getData('text/plain'))]; if (r && r.date !== iso) { touch(r, { date: iso }, true).then(() => CD.toast(bad.has(r) ? t('sc.bad') : t('sc.moved'), bad.has(r) ? 'bad' : '')); } });
        cells.push(cell);
      }
      return h('div', h('b', { style: { display: 'block', margin: '6px 0' } }, new Date(y, m - 1, 1).toLocaleDateString(CD.lang === 'ar' ? 'ar-IQ-u-nu-latn' : 'en-GB', { month: 'long', year: 'numeric' })), h('.fcal.sc', cells));
    };
    const chip = (r, compact) => { const i = rows.indexOf(r); const el = h('button.tbtn.sch', { type: 'button', draggable: 'true', class: bad.has(r) ? 'bad' : '', style: { '--c': hue(r.type_id) }, 'data-tip': `${r.seq}/${rows.length} · ${typeName(r.type_id)} · ${CD.fmtT(r.time)}${bad.has(r) ? '\n' + t('sc.bad') : ''}` }, compact ? h('b', r.seq) : [h('span', `${r.seq}/${rows.length} · ${CD.fmtT(r.time)}`), h('b', typeName(r.type_id).slice(0, 8))]);
      el.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', String(i)); e.dataTransfer.effectAllowed = 'move'; }); el.addEventListener('click', () => edit(r, el)); return el; };
    CD.mount(box, h('.row', h('small.dim', t('sc.drag')), h('.sp'), fix, seg), rows.length ? months.map(cal) : h('p.dim', t('sc.none')));
  };
  box.redraw = () => { dirty = null; bad.clear(); loads.clear(); draw(); }; draw(); return box;
};
})();
