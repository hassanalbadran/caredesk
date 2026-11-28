'use strict';
(() => {
const { h, t, ic, $ } = CD;
CD.addDict({
  'today.title': 'مواعيد اليوم', 'today.total': 'الحجوزات', 'today.att': 'حضروا', 'today.abs': 'غابوا / لم يحضروا', 'today.income': 'الدخل التقريبي', 'today.loss': 'الخسارة التقريبية', 'today.expected': 'المتوقع',
  seq: '#', name: 'الاسم', phoneL: 'الهاتف', time: 'الوقت', type: 'نوع الجلسة', device: 'الجهاز', therapist: 'المعالج', attended: 'الحضور', actions: 'إجراءات', showAll: 'عرض الكل', search: 'بحث…', filters: 'التصفية والترتيب', none: 'لا توجد مواعيد.',
  'st.all': 'الكل', 'st.attended': 'حضر', 'st.notAttended': 'لم يحضر', 'st.missed': 'غاب', 'st.upcoming': 'قادمة', sortBy: 'ترتيب حسب', asc: 'تصاعدي', desc: 'تنازلي', clear: 'مسح', undoAtt: 'إلغاء تسجيل الحضور لهذه الجلسة؟', profile: 'الملف', editAll: 'تعديل', wa: 'واتساب', print: 'طباعة وصل',
  conflicts: 'تعارضات', conflictHint: 'اقتراح', today: 'اليوم', gapTitle: 'ساعات شاغرة اليوم', gapSub: 'حضر مريض مبكراً أو انقطع مريض. هل تريد إعادة تنظيم الجلسات القادمة (مع احترام الفواصل)؟', gapNone: 'لا توجد جلسات يمكن تقديمها.', apply: 'تطبيق', preview: 'معاينة', free: 'شاغر', pickPhone: 'اختر الرقم', conflict_device_overlap: 'تعارض على الجهاز', conflict_therapist_overlap: 'تعارض على المعالج', conflict_patient_overlap: 'تعارض لدى المريض', conflict_outside_hours: 'خارج ساعات العمل', conflict_off_day: 'يوم عطلة', conflict_device_inactive: 'جهاز غير فعّال'
}, {
  'today.title': "Today's appointments", 'today.total': 'Bookings', 'today.att': 'Attended', 'today.abs': 'Absent / not yet', 'today.income': 'Approx. income', 'today.loss': 'Approx. loss', 'today.expected': 'Expected',
  seq: '#', name: 'Name', phoneL: 'Phone', time: 'Time', type: 'Session type', device: 'Device', therapist: 'Therapist', attended: 'Attended', actions: 'Actions', showAll: 'Show all', search: 'Search…', filters: 'Filter & sort', none: 'No appointments.',
  'st.all': 'All', 'st.attended': 'Attended', 'st.notAttended': 'Not attended', 'st.missed': 'Missed', 'st.upcoming': 'Upcoming', sortBy: 'Sort by', asc: 'Ascending', desc: 'Descending', clear: 'Clear', undoAtt: 'Undo attendance for this session?', profile: 'Profile', editAll: 'Edit', wa: 'WhatsApp', print: 'Print receipt',
  conflicts: 'Conflicts', conflictHint: 'Suggestion', today: 'Today', gapTitle: 'Free time today', gapSub: 'A patient came early or dropped out. Re-organise upcoming sessions (respecting gaps)?', gapNone: 'No sessions can be moved earlier.', apply: 'Apply', preview: 'Preview', free: 'Free', pickPhone: 'Choose number', conflict_device_overlap: 'Device clash', conflict_therapist_overlap: 'Therapist clash', conflict_patient_overlap: 'Patient clash', conflict_outside_hours: 'Outside working hours', conflict_off_day: 'Closed day', conflict_device_inactive: 'Inactive device'
});
const PAGE = 60;
CD.waPatient = async (patientId) => CD.try(async () => {
  const r = await CD.call('reminderUpcoming', { patientId }); if (!r.phones.length) return;
  const send = (phone) => CD.sys('whatsapp', { phone, text: r.text });
  if (r.phones.length === 1) return send(r.phones[0]);
  const d = CD.dialog({ title: t('pickPhone'), cls: 'sm', body: h('.grid', r.phones.map((p) => h('button.btn', { onclick: () => { d.close_(); send(p); } }, ic('chat', 's'), p))) });
});
CD.tagChips = (tags) => (tags || []).map((g) => h('span.tag', { style: { background: g.color || (g.tone === 'pos' ? '#2f9e6b' : '#c0504d') } }, CD.lang === 'en' && g.name_en ? g.name_en : g.name));
CD.showGap = async (notice) => {
  if (!notice) return; const moves = await CD.call('compactionPreview', { fromDate: CD.iso() });
  const gaps = (notice.gaps || []).map((g) => h('span.pill.ok', `${CD.fmtT(g.start || g.from)}–${CD.fmtT(g.end || g.to)}`));
  const list = moves.length ? h('.sched', moves.map((m) => h('.slot', h('b', m.patientName), h('span.dim', `${CD.fmtD(m.from.date)} ${CD.fmtT(m.from.time)}`), ic(CD.lang === 'ar' ? 'left' : 'right', 's'), h('span', `${CD.fmtD(m.to.date)} ${CD.fmtT(m.to.time)}`)))) : h('p.dim', t('gapNone'));
  const d = CD.dialog({ title: t('gapTitle'), cls: 'wide', body: h('div', { style: { display: 'grid', gap: '12px' } }, h('p.dim', { style: { margin: 0 } }, t('gapSub')), h('.row.wrap', gaps), list),
    foot: (close) => [h('button.btn', { onclick: () => close() }, t('close')), moves.length ? h('button.btn.pri', { onclick: () => CD.try(async () => { await CD.call('compactionApply', { moves }); close(); CD.refresh(); CD.badge(); }) }, t('apply')) : null] });
};

CD.views.today = (root, arg) => {
  const st = { date: (arg && arg.date) || CD.iso(), showAll: false, status: 'all', typeId: '', therapistId: '', deviceId: '', sort: 'time', dir: 'asc', q: '', offset: 0, total: 0, loading: false, done: false };
  const stats = h('.grid.g4'), tbody = h('tbody'), sentinel = h('div', { style: { height: '1px' } }), cat = { types: [], devices: [], therapists: [] };
  const head = h('.hd');
  const q = h('input.in', { placeholder: t('search'), style: { width: '0', padding: '0', opacity: 0, border: 0, transition: 'all 220ms var(--ease)' } });
  let qt; q.addEventListener('input', () => { clearTimeout(qt); qt = setTimeout(() => { st.q = q.value; reload(); }, 180); });
  const sbtn = h('button.btn.ico', { 'data-tip': t('search'), onclick: () => { const open = q.style.width === '0px'; q.style.cssText = open ? 'width:200px;padding:8px 10px;opacity:1;border:1px solid var(--line)' : 'width:0;padding:0;opacity:0;border:0'; if (open) q.focus(); }, html: ic('search') });
  const fbtn = h('button.btn.ico', { 'data-tip': t('filters'), html: ic('filter') });
  fbtn.onclick = () => CD.popover(fbtn, filterPanel());
  const allBtn = h('button.btn', { onclick: () => { st.showAll = !st.showAll; allBtn.classList.toggle('pri', st.showAll); reload(); } }, t('showAll'));
  const dateLbl = h('b', { style: { minWidth: '150px', textAlign: 'center' } });
  const nav = h('.row', h('button.btn.ico', { onclick: () => { st.date = CD.addDays(st.date, -1); reload(); }, html: ic(CD.lang === 'ar' ? 'right' : 'left') }), dateLbl, h('button.btn.ico', { onclick: () => { st.date = CD.addDays(st.date, 1); reload(); }, html: ic(CD.lang === 'ar' ? 'left' : 'right') }), h('button.btn.sm', { onclick: () => { st.date = CD.iso(); reload(); } }, t('today')));
  const confl = h('button.btn.ico', { hidden: true, style: { color: 'var(--warn)' }, html: ic('warn') });
  head.append(h('h1.h1', t('today.title')), nav, confl, h('.sp'), q, sbtn, fbtn, allBtn);
  const th = (k, sortKey) => h('th', sortKey ? { class: 'clk', onclick: () => { st.dir = st.sort === sortKey && st.dir === 'asc' ? 'desc' : 'asc'; st.sort = sortKey; reload(); } } : {}, t(k), sortKey && st.sort === sortKey ? h('span', { html: ' ' + ic(st.dir === 'asc' ? 'up' : 'down', 's') }) : null);
  const tableWrap = h('.card', { style: { padding: 0, overflow: 'auto', maxHeight: 'calc(100vh - 330px)' } });
  const drawTable = () => CD.mount(tableWrap, h('table.tbl', h('thead', h('tr', th('seq'), th('name', 'name'), th('phoneL'), th('time', 'time'), th('type', 'type'), th('device', 'device'), th('therapist', 'therapist'), th('attended', 'status'), th('actions'))), tbody, ), sentinel);

  function filterPanel() {
    const sel = (key, opts) => h('select.in', { onchange: (e) => { st[key] = e.target.value; reload(); } }, opts.map(([v, l]) => h('option', { value: v, selected: String(st[key]) === String(v) }, l)));
    const row = (label, key, opts, sortKey) => h('.row', h('span', { style: { width: '80px' } }, label), sel(key, opts), h('button.btn.ico.sm', { 'data-tip': t('sortBy') + ' ' + label, onclick: (e) => { st.dir = st.sort === sortKey && st.dir === 'asc' ? 'desc' : 'asc'; st.sort = sortKey; e.currentTarget.innerHTML = ic(st.dir === 'asc' ? 'up' : 'down', 's'); reload(); }, html: ic(st.sort === sortKey && st.dir === 'desc' ? 'down' : 'up', 's') }));
    return h('div', { style: { display: 'grid', gap: '8px', minWidth: '320px' } },
      row(t('attended'), 'status', [['all', t('st.all')], ['attended', t('st.attended')], ['notAttended', t('st.notAttended')], ['missed', t('st.missed')], ['upcoming', t('st.upcoming')]], 'status'),
      row(t('type'), 'typeId', [['', t('all')], ...cat.types.map((x) => [x.id, x.name])], 'type'), row(t('therapist'), 'therapistId', [['', t('all')], ...cat.therapists.map((x) => [x.id, x.name])], 'therapist'),
      row(t('device'), 'deviceId', [['', t('all')], ...cat.devices.map((x) => [x.id, x.name])], 'device'), row(t('time'), 'time_', [['', '—']], 'time'),
      h('button.btn.sm', { onclick: () => { Object.assign(st, { status: 'all', typeId: '', therapistId: '', deviceId: '', sort: 'time', dir: 'asc' }); reload(); } }, t('clear')));
  }
  const rowEl = (b) => {
    const on = b.eff === 'attended'; const att = h('button.att', { class: on ? 'on' : '', html: ic('check', 's'), onclick: () => CD.try(async () => {
      if (on && !(await CD.confirm(t('undoAtt')))) return; const r = await CD.call('setAttendance', { id: b.id, attended: !on }); reload(); CD.badge(); if (r.notice) CD.showGap(r.notice);
    }) });
    const dim = b.patient_status !== 'active';
    return h('tr', { class: on ? 'done' : '' },
      h('td', `${b.seq || ''}/${b.total || ''}`), h('td', h('b', b.patient_name), ' ', CD.tagChips(b.tags), dim ? h('span.pill', b.patient_status) : null), h('td.dim', { style: { direction: 'ltr', textAlign: 'start' } }, b.phone),
      h('td', st.showAll ? h('div', h('small.dim', CD.fmtD(b.date)), h('div', CD.fmtT(b.time))) : CD.fmtT(b.time)), h('td', b.type_name || '—'), h('td', b.device_name || '—'), h('td', b.therapist_name || '—'), h('td', att),
      h('td', h('.row', ...[['eye', 'profile', () => CD.openProfile(b.patient_id)], ['pencil', 'editAll', () => CD.editPatient(b.patient_id)], ['chat', 'wa', () => CD.waPatient(b.patient_id)], ...(b.phone || b.phone2 ? [['phone', 'call', () => CD.callPatient(b.patient_id)]] : []), ['printer', 'print', () => CD.printMenu(b.patient_id)]].map(([i, tip, fn]) => h('button.btn.ico.sm', { 'data-tip': t(tip), onclick: fn, html: ic(i, 's') })))));
  };
  async function load() {
    if (st.loading || st.done) return; st.loading = true;
    await CD.try(async () => {
      const r = await CD.call('listBookings', { date: st.date, showAll: st.showAll, status: st.status, typeId: st.typeId || undefined, deviceId: st.deviceId || undefined, therapistId: st.therapistId || undefined, q: st.q, sort: st.sort, dir: st.dir, limit: PAGE, offset: st.offset });
      st.total = r.total; r.rows.forEach((b) => tbody.append(rowEl(b))); st.offset += r.rows.length; st.done = st.offset >= r.total;
      if (!r.total) tbody.append(h('tr', h('td', { colspan: 9, class: 'dim', style: { textAlign: 'center', padding: '28px' } }, t('none'))));
    }); st.loading = false;
  }
  const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) load(); }, { root: tableWrap, rootMargin: '400px' });
  async function reload() {
    tbody.replaceChildren(); st.offset = 0; st.done = false; dateLbl.textContent = st.showAll ? t('showAll') : CD.fmtD(st.date) + (st.date === CD.iso() ? ' · ' + t('today') : '');
    drawTable(); await load(); loadStats();
  }
  async function loadStats() {
    const s = await CD.call('dayStats', { date: st.showAll ? CD.iso() : st.date }).catch(() => null); if (!s) return;
    const c = (k, v, cls = '') => h('.card.stat', { class: cls }, h('small', t(k)), h('b', v));
    CD.mount(stats, c('today.total', s.total), c('today.att', s.attended, 'ok'), c('today.abs', s.total - s.attended, 'bad'), c('today.income', CD.money(s.income) + (s.expected ? '' : ''), 'ok'));
    confl.hidden = !s.conflicts.length;
    confl.onclick = () => CD.popover(confl, h('div', { style: { display: 'grid', gap: '8px', minWidth: '300px' } }, h('b', t('conflicts')), s.conflicts.map((c2) => h('div.slot', { style: { display: 'grid' } }, h('b', t('conflict_' + c2.kind) !== 'conflict_' + c2.kind ? t('conflict_' + c2.kind) : c2.kind), c2.suggestion ? h('small.dim', `${t('conflictHint')}: ${CD.fmtD(c2.suggestion.date)} ${CD.fmtT(c2.suggestion.time)}${(cat.devices.find((d) => d.id === c2.suggestion.deviceId) || {}).name ? ' · ' + cat.devices.find((d) => d.id === c2.suggestion.deviceId).name : ''}`) : null))));
  }
  CD.mount(root, head, stats, h('div', { style: { height: '12px' } }), tableWrap);
  (async () => { const c = await CD.call('getCatalog'); Object.assign(cat, { types: c.types.filter((x) => x.active), devices: c.devices.filter((x) => x.active), therapists: c.therapists.filter((x) => x.active) }); reload(); io.observe(sentinel); })();
};

})();
