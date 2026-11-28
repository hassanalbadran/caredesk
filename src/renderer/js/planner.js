'use strict';
/* Drag & drop session planner: drop the first few sessions on calendar days, the system infers the cycle and fills the rest. */
(() => {
const { h, t, ic } = CD;
CD.addDict({
  'pl.title': 'تحديد أيام الجلسات', 'pl.hint': 'اسحب الجلسة من الأعلى وضعها على أول يوم أو يومين في التقويم (مثلاً: نيرو + سحب + سحب، ثم يوم فارغ، ثم نفس الشيء). النظام يفهم النمط ويكمل باقي الجلسات تلقائياً. اضغط ✕ أو اسحب الجلسة لسلة الحذف لإزالتها.',
  'pl.clear': 'مسح الكل', 'pl.apply': 'اعتماد الجدول', 'pl.trash': 'اسحب هنا للحذف', 'pl.pattern': 'النمط', 'pl.total': 'عدد الجلسات', 'pl.ends': 'آخر جلسة', 'pl.unplaced': 'تعذّر وضع {n} جلسة (ازدحام أو أيام مغلقة)', 'pl.none': 'ابدأ بسحب جلسة إلى يوم',
  'pl.past': 'يوم ماضٍ', 'pl.closed': 'يوم مغلق (خارج أوقات الدوام)', 'pl.prevPatterns': 'أنماط سابقة…', 'pl.noPkg': 'أضف نوع جلسة وعدداً أولاً', 'pl.today': 'اليوم', 'pl.usePattern': 'تطبيق نمط سابق', 'pl.applied': 'تم توزيع الجلسات'
}, {
  'pl.title': 'Set session days', 'pl.hint': 'Drag a session from the top onto the first one or two days (e.g. Neuro + Pull + Pull, then an empty day, then the same again). The system learns the pattern and fills the remaining sessions. Press ✕ or drag a session to the bin to remove it.',
  'pl.clear': 'Clear all', 'pl.apply': 'Use this schedule', 'pl.trash': 'Drop here to delete', 'pl.pattern': 'Pattern', 'pl.total': 'Sessions', 'pl.ends': 'Last session', 'pl.unplaced': '{n} sessions could not be placed (busy or closed days)', 'pl.none': 'Start by dragging a session onto a day',
  'pl.past': 'Past day', 'pl.closed': 'Closed day (outside working hours)', 'pl.prevPatterns': 'Previous patterns…', 'pl.noPkg': 'Add a session type and count first', 'pl.today': 'Today', 'pl.usePattern': 'Apply a previous pattern', 'pl.applied': 'Sessions distributed'
});
const hue = (i) => `hsl(${(i * 67 + 150) % 360} 48% 36%)`;

CD.packagesOf = (pkgs) => { const m = new Map(); pkgs.forEach((s) => { const k = Number(s.type.value); const c = Number(s.count.value) || 1; const dev = s.dev.value ? Number(s.dev.value) : null, th = s.th.value ? Number(s.th.value) : null; const st = s.time && s.time.value ? s.time.value : undefined; if (m.has(k)) m.get(k).count += c; else m.set(k, { typeId: k, count: c, deviceId: dev, therapistId: th, startTime: st }); }); return [...m.values()]; };

CD.sessionPlanner = async ({ packages, startDate, tags = [], patientId = null, onApply }) => {
  if (!packages.length) return CD.toast(t('pl.noPkg'), 'bad');
  const cat = await CD.call('getCatalog'); const S = CD.S; const today = CD.iso();
  const typeIdx = new Map(packages.map((p, i) => [p.typeId, i])); const tname = (id) => (cat.types.find((x) => x.id === id) || {}).name || '?';
  const ex = new Map(); let ghost = []; let result = null; let pick = null; let timer = 0;
  const first = startDate && startDate >= today ? startDate : today; let cur = new Date(first + 'T12:00:00'); cur.setDate(1);
  const isOpen = (iso) => { const hr = S.hours && S.hours[new Date(iso + 'T12:00:00').getDay()]; return !!(hr && hr.on); };
  const chip = (typeId, o = {}) => { const el = h('div.pl-chip', { style: { '--c': hue(typeIdx.get(typeId) ?? 0) }, draggable: o.ghost ? 'false' : 'true', class: o.ghost ? 'ghost' : '' }, h('span', tname(typeId)), o.time ? h('small', o.time) : null);
    if (!o.ghost) { el.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', JSON.stringify(o.from ? { kind: 'move', ...o.from } : { kind: 'new', typeId })); e.dataTransfer.effectAllowed = 'copyMove'; }); }
    if (o.from) el.append(h('button.pl-x', { type: 'button', title: t('delItem'), onclick: (e) => { e.stopPropagation(); remove(o.from.date, o.from.idx); } }, '×')); return el; };
  const remove = (date, idx) => { const l = ex.get(date) || []; l.splice(idx, 1); if (!l.length) ex.delete(date); changed(); };
  const add = (date, typeId) => { if (date < today || !isOpen(date)) return; const l = ex.get(date) || []; l.push(typeId); ex.set(date, l); changed(); };
  const drop = (date) => (e) => { e.preventDefault(); e.currentTarget.classList.remove('over'); let d; try { d = JSON.parse(e.dataTransfer.getData('text/plain')); } catch { return; }
    if (d.kind === 'new') add(date, d.typeId); else if (d.kind === 'move') { const l = ex.get(d.date) || []; const [tid] = l.splice(d.idx, 1); if (!l.length) ex.delete(d.date); if (tid != null) add(date, tid); changed(); } };
  const palette = h('.pl-pal'), grid = h('.pl-grid'), title = h('b'), info = h('div.pl-info');
  const trash = h('.pl-trash', ic('trash', 's'), t('pl.trash')); trash.addEventListener('dragover', (e) => { e.preventDefault(); trash.classList.add('over'); }); trash.addEventListener('dragleave', () => trash.classList.remove('over'));
  trash.addEventListener('drop', (e) => { e.preventDefault(); trash.classList.remove('over'); try { const d = JSON.parse(e.dataTransfer.getData('text/plain')); if (d.kind === 'move') remove(d.date, d.idx); } catch { /* ignore */ } });
  const loads = new Map(); const loadMonth = () => { const y = cur.getFullYear(), m = cur.getMonth(), n = new Date(y, m + 1, 0).getDate(); const ds = []; for (let d = 1; d <= n; d++) { const iso = CD.iso(new Date(y, m, d, 12)); if (iso >= today && !loads.has(iso)) ds.push(iso); } if (ds.length) { ds.forEach((d) => loads.set(d, 'green')); CD.call('dayLoads', { dates: ds }).then((r) => { ds.forEach((d) => loads.set(d, (r[d] || {}).level || 'green')); draw(); }).catch(() => {}); } };
  const draw = () => {
    loadMonth(); title.textContent = cur.toLocaleDateString(CD.lang === 'ar' ? 'ar-IQ-u-nu-latn' : 'en-GB', { month: 'long', year: 'numeric' });
    CD.mount(palette, packages.map((p) => { const el = chip(p.typeId); el.append(h('small', '×' + p.count)); el.addEventListener('click', () => { pick = pick === p.typeId ? null : p.typeId; draw(); }); if (pick === p.typeId) el.classList.add('pick'); return el; }));
    const y = cur.getFullYear(), m = cur.getMonth(), lead = new Date(y, m, 1).getDay(), n = new Date(y, m + 1, 0).getDate(); const cells = [];
    for (let i = 0; i < 7; i++) cells.push(h('.pl-dn', new Date(2023, 0, 1 + i).toLocaleDateString(CD.lang === 'ar' ? 'ar-IQ' : 'en-GB', { weekday: 'short' })));
    for (let i = 0; i < lead; i++) cells.push(h('.pl-day.void'));
    const gh = new Map(); ghost.forEach((b) => { if (!gh.has(b.date)) gh.set(b.date, []); gh.get(b.date).push(b); });
    for (let d = 1; d <= n; d++) {
      const date = CD.iso(new Date(y, m, d, 12)); const past = date < today, closed = !isOpen(date), off = past || closed;
      const cell = h('.pl-day', { class: (off ? 'off ' : '') + (date === today ? 'today ' : '') + (!off && ['red', 'yellow'].includes(loads.get(date)) ? 'lv-' + loads.get(date) : ''), title: past ? t('pl.past') : closed ? t('pl.closed') : (['red', 'yellow'].includes(loads.get(date)) ? CD.lvText(loads.get(date)) : '') }, h('small.pl-n', String(d), ['red', 'yellow'].includes(loads.get(date)) && !off ? ' ' + CD.LV[loads.get(date)].dot : ''));
      (ex.get(date) || []).forEach((tid, idx) => cell.append(chip(tid, { from: { date, idx } })));
      if (!ex.has(date)) (gh.get(date) || []).forEach((b) => cell.append(chip(b.type_id, { ghost: true, time: CD.fmtT(b.time) })));
      if (!off) { cell.addEventListener('dragover', (e) => { e.preventDefault(); cell.classList.add('over'); }); cell.addEventListener('dragleave', () => cell.classList.remove('over')); cell.addEventListener('drop', drop(date)); cell.addEventListener('click', () => { if (pick != null) add(date, pick); }); }
      cells.push(cell);
    }
    CD.mount(grid, cells);
    const r = result;
    CD.mount(info, r && r.pattern ? [h('div', h('b', t('pl.pattern') + ': '), r.info ? [h('b', { style: { color: 'var(--acc)' } }, r.info.title), r.info.detail ? h('span.dim', ' · ' + r.info.detail) : null] : r.name), h('div.dim', `${t('pl.total')}: ${r.bookings.length}` + (r.bookings.length ? ` · ${t('pl.ends')}: ${CD.fmtD(r.bookings[r.bookings.length - 1].date)}` : '')), r.unplaced ? h('span.pill.warn', ic('warn', 's'), t('pl.unplaced', { n: r.unplaced })) : null] : h('div.dim', t('pl.none')));
    apply.disabled = !(r && r.bookings && r.bookings.length);
  };
  const changed = () => { draw(); clearTimeout(timer); timer = setTimeout(async () => {
    const examples = [...ex.entries()].map(([date, types]) => ({ date, types }));
    if (!examples.length) { result = null; ghost = []; return draw(); }
    try { result = await CD.call('planFromExamples', { patientId, examples, packages, tags }); ghost = result.bookings; } catch (e) { CD.toast(e.message, 'bad'); }
    draw(); }, 120); };
  const nav = (n) => { cur = new Date(cur.getFullYear(), cur.getMonth() + n, 1, 12); draw(); };
  const apply = h('button.btn.pri', { disabled: true, onclick: () => CD.try(async () => { await CD.call('rememberPattern', { pattern: result.pattern }); onApply(result); win.close_ ? win.close_() : document.querySelector('dialog[open]').close(); CD.toast(t('pl.applied')); }) }, ic('check', 's'), t('pl.apply'));
  const win = CD.dialog({ title: t('pl.title'), cls: 'wide', body: h('div', { style: { display: 'grid', gap: '12px' } }, CD.help(t('pl.hint')), palette,
    h('.row', h('button.btn.ico', { onclick: () => nav(CD.lang === 'ar' ? 1 : -1), html: ic(CD.lang === 'ar' ? 'right' : 'left') }), title, h('button.btn.ico', { onclick: () => nav(CD.lang === 'ar' ? -1 : 1), html: ic(CD.lang === 'ar' ? 'left' : 'right') }), h('.sp'), trash), grid, info),
    foot: (close) => [h('button.btn', { onclick: () => { ex.clear(); result = null; ghost = []; draw(); } }, t('pl.clear')), h('button.btn', { onclick: () => close() }, t('cancel')), apply] });
  draw();
};
})();
