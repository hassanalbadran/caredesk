'use strict';
/* Main floor: month home (type buttons per day) -> type page (devices + people lists) -> device hour timeline with numbered patient circles and persistent timers. */
(() => {
const { h, t, ic, $ } = CD;
CD.addDict({
  'fl.home': 'الرئيسية', 'fl.total': 'مجموع', 'fl.back': 'رجوع', 'fl.devices': 'الأجهزة', 'fl.lists': 'القوائم', 'fl.laggards': 'المتلكئون', 'fl.dropped': 'المنقطعون', 'fl.maint': 'الإدامة', 'fl.unassigned': 'بدون جهاز', 'fl.noDev': 'لا توجد أجهزة لهذا النوع — أضفها من الإعدادات ← الكتالوج',
  'fl.upcoming': 'قادم', 'fl.late': 'لم يصل بعد', 'fl.arrived': 'حاضر (بانتظار الدخول)', 'fl.in': 'داخل الجلسة', 'fl.done': 'أنهى الجلسة', 'fl.absent': 'غائب',
  'fl.turn': 'الدور', 'fl.start': 'ابدأ المؤقت', 'fl.minutes': 'دقائق', 'fl.remain': 'المتبقي', 'fl.restart': 'إعادة المؤقت', 'fl.setMin': 'تغيير الوقت', 'fl.finish': 'إنهاء الجلسة', 'fl.pressAgain': 'اضغط مرة أخرى لتأكيد إنهاء الجلسة', 'fl.overdue': 'انتهى الوقت',
  'fl.markArr': 'تسجيل الحضور', 'fl.unArr': 'إلغاء الحضور', 'fl.viewPat': 'عرض ملف المريض', 'fl.viewSess': 'معلومات الجلسة', 'fl.changeDev': 'تغيير الجهاز', 'fl.addVisit': 'إضافة زيارة', 'fl.cut': 'قص', 'fl.copy': 'نسخ', 'fl.del': 'حذف الجلسة', 'fl.delAsk': 'حذف هذه الجلسة؟', 'fl.pickPat': 'اختر المريض', 'fl.search': 'ابحث بالاسم أو الهاتف…',
  'fl.moved': 'تم النقل', 'fl.locked': 'لا يمكن نقل جلسة بدأت أو انتهت', 'fl.pasted': 'تم اللصق', 'fl.drag': 'اسحب الدائرة إلى ساعة أخرى أو إلى زر اليوم السابق/التالي', 'fl.closed': 'خارج الدوام', 'fl.noList': 'لا أحد في هذه القائمة', 'fl.last': 'آخر حضور', 'fl.next': 'القادمة', 'fl.restore': 'إعادة للجدول', 'fl.toMaint': 'نقل للإدامة', 'fl.endMaint': 'إنهاء الإدامة', 'fl.nextP': 'التالي', 'fl.dayEmpty': 'لا جلسات', 'fl.sessInfo': 'تفاصيل الجلسة', 'fl.status': 'الحالة', 'fl.therapist': 'المعالج', 'fl.price': 'السعر'
}, {
  'fl.home': 'Home', 'fl.total': 'Total', 'fl.back': 'Back', 'fl.devices': 'Devices', 'fl.lists': 'Lists', 'fl.laggards': 'Laggards', 'fl.dropped': 'Dropped-out', 'fl.maint': 'Maintenance', 'fl.unassigned': 'No device', 'fl.noDev': 'No devices for this type — add them in Settings > Catalog',
  'fl.upcoming': 'Upcoming', 'fl.late': 'Not here yet', 'fl.arrived': 'Here (waiting to enter)', 'fl.in': 'In session', 'fl.done': 'Finished', 'fl.absent': 'Absent',
  'fl.turn': 'Turn', 'fl.start': 'Start timer', 'fl.minutes': 'minutes', 'fl.remain': 'Remaining', 'fl.restart': 'Restart timer', 'fl.setMin': 'Change time', 'fl.finish': 'End session', 'fl.pressAgain': 'Press again to confirm ending the session', 'fl.overdue': 'Time is up',
  'fl.markArr': 'Mark arrived', 'fl.unArr': 'Undo arrival', 'fl.viewPat': 'View patient', 'fl.viewSess': 'Session info', 'fl.changeDev': 'Change device', 'fl.addVisit': 'Add visit', 'fl.cut': 'Cut', 'fl.copy': 'Copy', 'fl.del': 'Delete session', 'fl.delAsk': 'Delete this session?', 'fl.pickPat': 'Choose patient', 'fl.search': 'Search name or phone…',
  'fl.moved': 'Moved', 'fl.locked': 'A started or finished session cannot be moved', 'fl.pasted': 'Pasted', 'fl.drag': 'Drag a circle to another hour or onto the previous/next day button', 'fl.closed': 'Closed', 'fl.noList': 'Nobody in this list', 'fl.last': 'Last visit', 'fl.next': 'Next', 'fl.restore': 'Back to schedule', 'fl.toMaint': 'Move to maintenance', 'fl.endMaint': 'End maintenance', 'fl.nextP': 'Next', 'fl.dayEmpty': 'No sessions', 'fl.sessInfo': 'Session details', 'fl.status': 'Status', 'fl.therapist': 'Therapist', 'fl.price': 'Price'
});
const hue = (i) => `hsl(${(i * 67 + 150) % 360} 48% 36%)`;
const monthLabel = (ym) => { const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString(CD.lang === 'ar' ? 'ar-IQ-u-nu-latn' : 'en-GB', { month: 'long', year: 'numeric' }); };
const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
const backBtn = (fn) => h('button.btn.ico', { 'data-tip': t('fl.back'), onclick: fn, html: ic(CD.lang === 'ar' ? 'right' : 'left') });
CD.clip = null; // { mode:'cut'|'copy', id, name }

// ================= HOME: month calendar, one button per session type inside each day =================
CD.views.calendar = async (root, arg) => {
  root.classList.add('fitcal');
  let ym = (arg && arg.ym) || CD.iso().slice(0, 7); const grid = h('.fcal.fit'), lbl = h('b', { style: { minWidth: '170px', textAlign: 'center', fontSize: '16px' } });
  const shiftM = (n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); ym = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); load(); };
  async function load() {
    await CD.try(async () => {
      const data = await CD.call('homeMonth', { ym }); const [y, m] = ym.split('-').map(Number); const first = new Date(y, m - 1, 1), n = new Date(y, m, 0).getDate(), today = CD.iso();
      lbl.textContent = monthLabel(ym); grid.style.setProperty('--rows', Math.ceil((first.getDay() + n) / 7)); const cells = [0, 1, 2, 3, 4, 5, 6].map((d) => h('.dn', t('days' + d)));
      for (let i = 0; i < first.getDay(); i++) cells.push(h('.fday.void'));
      for (let d = 1; d <= n; d++) {
        const iso = `${ym}-${String(d).padStart(2, '0')}`, x = data.days[iso] || { total: 0, types: {} }; const closed = !(CD.S.hours && CD.S.hours[new Date(y, m - 1, d).getDay()] || {}).on;
        const cell = h('.fday', { class: (iso === today ? 'today ' : '') + (iso < today ? 'past ' : '') + (closed ? 'closed' : '') },
          h('.fh', h('span.n', d), x.conflicts ? h('span.warn', { 'data-tip': t('cal.conf'), html: ic('warn', 's') }) : null, h('.sp'), x.total ? h('span.pill', x.total) : null),
          h('.ftb', data.types.map((ty, i) => { const c = (x.types[ty.id] || { n: 0 }).n; return h('button.tbtn', { class: c ? '' : 'zero', style: { '--c': hue(i) }, onclick: () => CD.go('type', { date: iso, typeId: ty.id }) }, h('span', ty.name), h('b', c)); })));
        CD.onCtx(cell, () => [CD.newPatientItem({ date: iso, onDone: load }), { sep: 1 }, { icon: 'today', label: t('nav.today'), onclick: () => CD.go('today', { date: iso }) }, ...data.types.map((ty) => ({ icon: 'calendar', label: ty.name, onclick: () => CD.go('type', { date: iso, typeId: ty.id }) }))]);
        cells.push(cell);
      }
      CD.mount(grid, cells);
    });
  }
  CD.mount(root, h('.hd', h('h1.h1', t('fl.home')), h('.sp'), h('button.btn.ico', { onclick: () => shiftM(-1), html: ic(CD.lang === 'ar' ? 'right' : 'left') }), lbl, h('button.btn.ico', { onclick: () => shiftM(1), html: ic(CD.lang === 'ar' ? 'left' : 'right') }), h('button.btn.sm', { onclick: () => { ym = CD.iso().slice(0, 7); load(); } }, t('today'))), grid);
  load();
};

// ================= TYPE PAGE: devices of the type + people lists =================
CD.views.type = async (root, arg) => {
  const { date, typeId } = arg; await CD.try(async () => {
    const p = await CD.call('typePage', { date, typeId }); const dayBtn = (n, ic_) => h('button.btn.ico', { onclick: () => CD.go('type', { date: CD.addDays(date, n), typeId }), html: ic(ic_) });
    const card = (title, count, fn, extra, devId) => { const el = h('button.dcard', { onclick: fn }, h('b', title), h('span.pill' + (count ? '.ok' : ''), count), extra || null); if (devId !== undefined) CD.onCtx(el, () => [CD.newPatientItem({ date, typeId, deviceId: devId, onDone: () => CD.go('type', { date, typeId }) })]); return el; };
    CD.onCtx(root, () => [CD.newPatientItem({ date, typeId, onDone: () => CD.go('type', { date, typeId }) })]);
    CD.mount(root, h('.hd', backBtn(() => CD.go('calendar', { ym: date.slice(0, 7) })), h('h1.h1', p.type ? p.type.name : ''), h('span.dim', CD.fmtD(date)), h('.sp'), dayBtn(CD.lang === 'ar' ? 1 : -1, CD.lang === 'ar' ? 'right' : 'left'), dayBtn(CD.lang === 'ar' ? -1 : 1, CD.lang === 'ar' ? 'left' : 'right'), h('span.pill', `${t('fl.total')}: ${p.total}`)),
      h('h3.sech', t('fl.devices')), p.devices.length || p.unassigned ? h('.dgrid', p.devices.map((d) => card(d.name, d.count, () => CD.go('device', { date, deviceId: d.id, typeId }), null, d.id)), p.unassigned ? card(t('fl.unassigned'), p.unassigned, () => CD.go('device', { date, deviceId: null, typeId })) : null) : h('p.dim', t('fl.noDev')),
      h('h3.sech', t('fl.lists')), h('.dgrid', card(t('fl.laggards'), p.lists.laggards, () => CD.peopleList('laggards')), card(t('fl.dropped'), p.lists.dropped, () => CD.peopleList('dropped')), card(t('fl.maint'), p.lists.maintenance, () => CD.peopleList('maintenance'))));
  });
};
CD.peopleList = async (kind) => {
  const rows = await CD.call('patientList', { kind }); const title = t({ laggards: 'fl.laggards', dropped: 'fl.dropped', maintenance: 'fl.maint' }[kind]);
  const act = (r) => h('.row', h('button.btn.sm', { onclick: () => CD.openProfile(r.id) }, t('viewProfile')), r.phone ? h('button.btn.sm', { onclick: () => CD.waPatient(r) }, 'WhatsApp') : null,
    kind === 'dropped' ? h('button.btn.sm', { onclick: () => CD.try(async () => { await CD.call('restorePatient', { id: r.id }); CD.toast(t('ok')); dlg.close_(); CD.peopleList(kind); }) }, t('fl.restore')) : null,
    kind === 'maintenance' ? h('button.btn.sm', { onclick: () => CD.try(async () => { await CD.call('setMaintenance', { id: r.id, on: false }); dlg.close_(); CD.peopleList(kind); }) }, t('fl.endMaint')) : h('button.btn.sm', { onclick: () => CD.try(async () => { await CD.call('setMaintenance', { id: r.id, on: true }); dlg.close_(); CD.peopleList(kind); }) }, t('fl.toMaint')));
  const dlg = CD.dialog({ title, cls: 'wide', body: rows.length ? h('div', { style: { display: 'grid', gap: '8px' } }, rows.map((r) => h('.card.inset', { style: { display: 'grid', gap: '6px', padding: '10px 12px' } }, h('.row', h('b', r.name), CD.tagChips ? CD.tagChips(r.tags) : null, h('.sp'), h('small.dim', `${t('fl.last')}: ${r.last_visit ? CD.fmtD(r.last_visit) : '—'} · ${t('fl.next')}: ${r.next_visit ? CD.fmtD(r.next_visit) : '—'}`)), act(r)))) : h('p.dim', t('fl.noList')) });
};

// ================= DEVICE PAGE: hour timeline =================
CD.pickPatient = (onPick) => {
  const q = h('input.in', { placeholder: t('fl.search') }), list = h('div', { style: { display: 'grid', gap: '6px', maxHeight: '50vh', overflow: 'auto' } }); let d;
  const go = async () => { const rows = await CD.call('searchPatients', { q: q.value, status: 'active', limit: 30 }); CD.mount(list, rows.map((r) => h('button.btn.flat', { style: { justifyContent: 'space-between' }, onclick: () => { d.close_(); onPick(r); } }, h('b', r.name), h('small.dim', r.phone || '')))); };
  let tm = 0; q.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(go, 160); });
  d = CD.dialog({ title: t('fl.pickPat'), cls: 'sm', body: h('div', { style: { display: 'grid', gap: '10px' } }, q, list) }); go(); setTimeout(() => q.focus(), 60);
};
CD.bookingInfo = (b, devName) => CD.dialog({ title: t('fl.sessInfo'), cls: 'sm', body: h('div', { style: { display: 'grid', gap: '6px' } }, h('b', b.patient_name), ...[[t('type'), b.type_name], [t('date'), CD.fmtD(b.date)], [t('time'), CD.fmtT(b.time) + ' – ' + CD.fmtT(b.end_time)], [t('device'), devName || '—'], [t('fl.status'), t('fl.' + b.ui)], [t('fl.price'), b.price != null ? CD.money(b.price) : '—']].map(([k, v]) => h('.row', h('span.dim', k), h('.sp'), h('span', v)))) });


// ---- load levels (red = full day, yellow = nearly full, green = normal) — shared by the add-session dialog, patient editor and distribution
CD.addDict({ 'fl.lv.red': 'ممتلئ', 'fl.lv.yellow': 'شبه ممتلئ', 'fl.lv.green': 'متاح', 'fl.lv.closed': 'مغلق', 'fl.addSess': 'إضافة جلسة', 'fl.addHere': 'إضافة جلسة لهذه الساعة', 'fl.pasteBox': 'لصق جلسة منسوخة/مقصوصة', 'fl.pasteBtn': 'لصق', 'fl.pasteEmpty': 'لا توجد جلسة منسوخة', 'fl.fullWarn': 'هذا اليوم ممتلئ — يمكنك الإضافة مع ذلك', 'fl.nearWarn': 'هذا اليوم شبه ممتلئ', 'fl.pickFirst': 'اختر مراجعاً أولاً', 'fl.noMatch': 'لا نتائج', 'fl.forHour': 'الساعة', 'fl.legend': 'الألوان: أحمر ممتلئ · أصفر شبه ممتلئ · أخضر متاح' },
  { 'fl.lv.red': 'Full', 'fl.lv.yellow': 'Nearly full', 'fl.lv.green': 'Available', 'fl.lv.closed': 'Closed', 'fl.addSess': 'Add session', 'fl.addHere': 'Add session for this hour', 'fl.pasteBox': 'Paste a copied/cut session', 'fl.pasteBtn': 'Paste', 'fl.pasteEmpty': 'Nothing copied', 'fl.fullWarn': 'This day is full — you can still add', 'fl.nearWarn': 'This day is nearly full', 'fl.pickFirst': 'Pick a patient first', 'fl.noMatch': 'No results', 'fl.forHour': 'Hour', 'fl.legend': 'Colors: red full · yellow nearly full · green available' });
CD.LV = { red: { dot: '🔴', color: '#c0392b' }, yellow: { dot: '🟡', color: '#b9860b' }, green: { dot: '🟢', color: '#2e7d4f' }, closed: { dot: '⚪', color: '#888' } };
CD.lvText = (lv) => `${(CD.LV[lv] || CD.LV.green).dot} ${t('fl.lv.' + (CD.LV[lv] ? lv : 'green'))}`;
CD.lvOption = (opt, lv) => { const o = CD.LV[lv]; if (o) { if (!opt.dataset.base) opt.dataset.base = opt.textContent; opt.textContent = `${o.dot} ${opt.dataset.base}${lv === 'red' || lv === 'yellow' ? ' · ' + t('fl.lv.' + lv) : ''}`; opt.style.color = o.color; opt.dataset.lv = lv; } return opt; };
// colour the options of a type select / device select by the load of a given day; the select itself takes the colour of the chosen option
CD.lvPaint = async (date, { type, dev }) => { const l = await CD.call('dayLoad', { date }).catch(() => null); if (!l) return; const paint = (sel, list) => { if (!sel) return; for (const o of sel.options) if (o.value) CD.lvOption(o, lvOf(list, Number(o.value))); const sync = () => { const o = sel.selectedOptions[0]; sel.style.color = o && o.dataset.lv ? CD.LV[o.dataset.lv].color : ''; }; if (!sel._lv) { sel._lv = 1; sel.addEventListener('change', sync); } sync(); }; paint(type, l.types); paint(dev, l.devices); return l; };
CD.lvChip = (lv) => h('span.pill', { style: { color: (CD.LV[lv] || CD.LV.green).color, borderColor: 'currentColor' } }, CD.lvText(lv));
const lvOf = (list, id) => { const x = (list || []).find((r) => r.id === id); return x ? x.level : 'green'; };

// ---- right-click → "new patient": quick form (name + phone) that also books a session right there; "full form" opens the whole editor
CD.addDict({ 'fl.newPat': 'مراجع جديد', 'fl.newPatTitle': 'مراجع جديد', 'fl.saveAdd': 'حفظ وإضافة الجلسة هنا', 'fl.saveOnly': 'حفظ المراجع فقط', 'fl.fullForm': 'النموذج الكامل…', 'fl.newPatDone': 'أُضيف المراجع والجلسة', 'fl.newPatSaved': 'أُضيف المراجع', 'fl.when': 'الموعد' },
  { 'fl.newPat': 'New patient', 'fl.newPatTitle': 'New patient', 'fl.saveAdd': 'Save and add the session here', 'fl.saveOnly': 'Save patient only', 'fl.fullForm': 'Full form…', 'fl.newPatDone': 'Patient and session added', 'fl.newPatSaved': 'Patient added', 'fl.when': 'When' });
CD.quickPatient = async (o = {}) => {
  const cat = CD.catalogCache || (CD.catalogCache = await CD.call('getCatalog').catch(() => null)); const types = ((cat && cat.types) || []).filter((x) => x.active !== 0); const devs = ((cat && cat.devices) || []).filter((d) => d.active !== 0);
  const name = h('input.in', { placeholder: t('name') }), phone = h('input.in', { placeholder: t('phoneL'), inputmode: 'tel', value: o.phone || '' }), age = h('input.in', { type: 'number', placeholder: t('age') }), gender = h('select.in', h('option', { value: 'M' }, t('male')), h('option', { value: 'F' }, t('female')));
  const hour0 = o.hour != null ? o.hour : (() => { const hr = CD.S.hours && CD.S.hours[new Date((o.date || CD.iso()) + 'T12:00:00').getDay()]; return hr && hr.on ? parseInt(hr.open, 10) : 9; })();
  const when = h('input.in', { type: 'time', value: String(hour0).padStart(2, '0') + ':00' });
  const typeSel = h('select.in', types.map((x) => h('option', { value: x.id, selected: x.id === o.typeId }, x.name))), devSel = h('select.in');
  const fillDevs = () => { const tid = Number(typeSel.value); CD.mount(devSel, [h('option', { value: '' }, '—'), ...devs.filter((d) => (d.typeIds || []).includes(tid)).map((d) => h('option', { value: d.id, selected: d.id === o.deviceId }, d.name))]); };
  typeSel.addEventListener('change', fillDevs); fillDevs();
  const wantSession = !!o.date && types.length > 0;
  const save = (book) => CD.try(async () => {
    if (!name.value.trim() || !phone.value.trim()) throw new Error(t('req'));
    const r = await CD.call('savePatient', { patient: { name: name.value.trim(), age: age.value ? Number(age.value) : null, gender: gender.value, phone: CD.nd(phone.value.trim()) } });
    if (book) await CD.call('addBooking', { patientId: r.id, typeId: Number(typeSel.value), date: o.date, hour: Number((when.value || '09:00').slice(0, 2)), deviceId: devSel.value ? Number(devSel.value) : null });
    CD.toast(book ? t('fl.newPatDone') : t('fl.newPatSaved')); d.close_(); o.onDone && o.onDone(r.id); CD.refresh();
  });
  const sess = wantSession ? h('div', { style: { display: 'grid', gap: '8px' } }, h('small.dim', `${t('fl.when')}: ${CD.fmtD(o.date)}`), h('.grid.g3', h('label', { style: { display: 'grid', gap: '4px' } }, h('small.dim', t('type')), typeSel), h('label', { style: { display: 'grid', gap: '4px' } }, h('small.dim', t('device')), devSel), h('label', { style: { display: 'grid', gap: '4px' } }, h('small.dim', t('time')), when))) : null;
  const d = CD.dialog({ title: t('fl.newPatTitle'), cls: 'sm', body: h('div', { style: { display: 'grid', gap: '10px' } }, name, phone, h('.grid.g2', age, gender), sess),
    foot: (close) => [h('button.btn', { onclick: () => { close(); CD.editPatient(null, o.onDone); } }, t('fl.fullForm')), wantSession ? h('button.btn', { onclick: () => save(false) }, t('fl.saveOnly')) : null, h('button.btn.pri', { onclick: () => save(wantSession) }, ic('plus', 's'), wantSession ? t('fl.saveAdd') : t('save'))] });
  setTimeout(() => name.focus(), 60); return d;
};
CD.newPatientItem = (o) => (CD.perms.includes('add_patient') ? { icon: 'users', label: t('fl.newPat'), onclick: () => CD.quickPatient(o) } : null);

// ---- right-click on an hour → add-session window: search patient → profile preview → add / paste
CD.addSessionDialog = ({ date, hour, typeId, deviceId, onDone }) => CD.try(async () => {
  const cat = CD.catalogCache || await CD.call('getCatalog'); const load = await CD.call('dayLoad', { date }).catch(() => ({ devices: [], types: [], all: { level: 'green' } }));
  let pat = null; let tm = 0;
  const q = h('input.in', { placeholder: t('fl.search'), style: { width: '100%' } }), list = h('div', { style: { display: 'grid', gap: '6px', maxHeight: '30vh', overflow: 'auto' } }), prof = h('div', { style: { display: 'grid', gap: '12px' } });
  const typeSel = h('select.in'), devSel = h('select.in'), warn = h('small'), hourLbl = `${t('fl.forHour')} ${CD.fmtT(String(hour).padStart(2, '0') + ':00')} · ${CD.fmtD(date)}`;
  const fillTypes = () => { CD.mount(typeSel, cat.types.filter((x) => x.active !== 0).map((x) => CD.lvOption(h('option', { value: x.id, selected: x.id === typeId }, x.name), lvOf(load.types, x.id)))); };
  const fillDevs = () => { const tid = Number(typeSel.value); const ds = cat.devices.filter((d) => d.active !== 0 && (d.typeIds || []).includes(tid)); const keep = devSel.value === '' ? String(deviceId ?? '') : devSel.value;
    CD.mount(devSel, [h('option', { value: '' }, '—'), ...ds.map((d) => CD.lvOption(h('option', { value: d.id, selected: String(d.id) === keep }, d.name), lvOf(load.devices, d.id)))]); showWarn(); };
  const curLevel = () => { const dv = devSel.value ? lvOf(load.devices, Number(devSel.value)) : lvOf(load.types, Number(typeSel.value)); return dv; };
  const showWarn = () => { const lv = curLevel(); warn.textContent = lv === 'red' ? `${CD.LV.red.dot} ${t('fl.fullWarn')}` : lv === 'yellow' ? `${CD.LV.yellow.dot} ${t('fl.nearWarn')}` : ''; warn.style.color = (CD.LV[lv] || {}).color || ''; typeSel.style.color = devSel.style.color = ''; const o = devSel.selectedOptions[0]; if (o && o.dataset.lv) devSel.style.color = CD.LV[o.dataset.lv].color; const to = typeSel.selectedOptions[0]; if (to && to.dataset.lv) typeSel.style.color = CD.LV[to.dataset.lv].color; };
  typeSel.addEventListener('change', () => { devSel.value = ''; fillDevs(); }); devSel.addEventListener('change', showWarn);
  const search = async () => { const rows = await CD.call('searchPatients', { q: q.value, status: 'all', limit: 30 }); CD.mount(list, rows.length ? rows.map((r) => h('button.btn.flat', { style: { justifyContent: 'space-between' }, onclick: () => choose(r.id) }, h('b', r.name), h('small.dim', r.phone || ''))) : h('p.dim', t('fl.noMatch'))); };
  const choose = async (id) => { const p = await CD.call('getPatient', { id }); pat = p; list.style.display = 'none'; q.value = p.name;
    CD.mount(prof, [h('.pf-head', h('.pf-av', { style: { '--c': `hsl(${(p.id * 67 + 150) % 360} 45% 38%)` } }, (p.name || '?').trim().slice(0, 1)), h('div', { style: { display: 'grid', gap: '4px', minWidth: 0 } }, h('b', { style: { fontSize: '18px' } }, p.name), CD.tagChips ? CD.tagChips(p.tags || []) : null)),
      h('.pf-facts', h('span', ic('phone', 's'), ' ', p.phone || '—'), p.address ? h('span', p.address) : null), p.notes ? h('p.pf-note', p.notes) : null,
      h('.grid.g4', [['prof.attended', p.stats.attended, 'ok'], ['prof.missed', p.stats.missed, 'bad'], ['prof.upcoming', p.stats.upcoming, ''], ['prof.streak', p.stats.streak, p.stats.streak ? 'bad' : '']].map(([k, v, c]) => h('.stat', { class: c }, h('small', t(k)), h('b', { style: { fontSize: '20px' } }, v)))),
      CD.sessGroups(p.bookings)]); addBtn.disabled = false; };
  q.addEventListener('input', () => { pat = null; addBtn.disabled = true; list.style.display = 'grid'; prof.replaceChildren(); clearTimeout(tm); tm = setTimeout(search, 160); });
  const done = () => { dlg.close_(); onDone && onDone(); };
  const addBtn = h('button.btn.pri', { disabled: true, onclick: () => CD.try(async () => { if (!pat) return CD.toast(t('fl.pickFirst'), 'bad'); await CD.call('addBooking', { patientId: pat.id, typeId: Number(typeSel.value), date, hour, deviceId: devSel.value ? Number(devSel.value) : null }); CD.toast(t('ok')); done(); }) }, ic('plus', 's'), t('fl.addHere'));
  const clip = CD.clip; const pasteBtn = h('button.btn', { disabled: !clip, onclick: () => CD.try(async () => { const c = CD.clip; if (!c) return; const dv = devSel.value ? Number(devSel.value) : null;
    if (c.mode === 'cut') { await CD.call('moveBooking', { id: c.id, date, hour, deviceId: dv }); CD.clip = null; } else await CD.call('addBooking', { copyOf: c.id, date, hour, deviceId: dv, typeId: Number(typeSel.value) }); CD.toast(t('fl.pasted')); done(); }) }, ic('download', 's'), t('fl.pasteBtn'));
  const pasteBox = h('.card.inset', { style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', flex: '1 1 220px' }, 'data-role': 'pastebox' }, h('div', { style: { display: 'grid', minWidth: 0, flex: 1 } }, h('small.dim', t('fl.pasteBox')), h('b', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, clip ? clip.name : t('fl.pasteEmpty'))), pasteBtn);
  fillTypes(); fillDevs();
  const dlg = CD.dialog({ title: `${t('fl.addSess')} — ${hourLbl}`, cls: 'wide', body: h('div', { style: { display: 'grid', gap: '12px' } }, q, list, prof,
    h('.row.wrap', { style: { gap: '10px', alignItems: 'end' } }, h('label', { style: { display: 'grid', gap: '4px', flex: '1 1 160px' } }, h('small.dim', t('type')), typeSel), h('label', { style: { display: 'grid', gap: '4px', flex: '1 1 160px' } }, h('small.dim', t('device')), devSel)), h('.row.wrap', warn, h('.sp'), h('small.dim', t('fl.legend'))),
    h('.row.wrap', { style: { gap: '10px', alignItems: 'stretch' } }, addBtn, pasteBox)) });
  search(); setTimeout(() => q.focus(), 60); return dlg;
});

CD.views.device = async (root, arg) => {
  let { date, deviceId, typeId } = arg; let data = null; let tick = 0, lastLoad = 0; const over = new Set(); const armed = new Map(); let skew = 0; let popEl = null;
  const tl = h('.tl'), head = h('.hd');
  const reload = async (quiet) => { try { data = await CD.call('deviceDay', { date, deviceId }); skew = data.now - Date.now(); lastLoad = Date.now(); draw(); } catch (e) { if (!quiet) CD.toast(e.message, 'bad'); } };
  const act = (fn, msg) => async () => { closePop(); try { await fn(); if (msg) CD.toast(msg); await reload(); } catch (e) { CD.toast(e.code === 'LOCKED_BOOKING' ? t('fl.locked') : e.message, 'bad'); } };
  const remain = (b) => b.timer_start + b.timer_min * 60000 - (Date.now() + skew);
  const closePop = () => { if (popEl) { try { popEl.hidePopover(); } catch { /* ok */ } popEl = null; } };
  const timerPop = (b, anchor) => {
    closePop(); const mins = h('input.in', { type: 'number', min: 1, max: 240, value: b.timer_min || (data.device && data.device.avg_min) || b.duration_min || 30, style: { width: '84px' } }); const live = h('div.big', { style: { fontSize: '30px', textAlign: 'center', fontWeight: 700 } }, '');
    const body = b.ui === 'in' ? [live, h('.row', h('button.btn.sm', { onclick: act(() => CD.call('restartTimer', { id: b.id })) }, ic('refresh', 's'), t('fl.restart')), h('label.row', h('span.dim', t('fl.minutes')), mins, h('button.btn.sm', { onclick: act(() => CD.call('setTimerMinutes', { id: b.id, minutes: mins.value })) }, t('fl.setMin')))), h('button.btn.pri', { onclick: act(() => CD.call('finishSession', { id: b.id }), t('ok')) }, ic('check', 's'), t('fl.finish'))]
      : [h('label.row', h('span.dim', t('fl.minutes')), mins), h('button.btn.pri', { onclick: act(async () => { await CD.call('startTimer', { id: b.id, minutes: mins.value }); CD.beep('ok'); }) }, ic('check', 's'), t('fl.start')), b.status === 'booked' ? h('button.btn.sm', { onclick: act(() => CD.call('markArrived', { id: b.id, arrived: true })) }, t('fl.markArr')) : b.status === 'arrived' ? h('button.btn.sm', { onclick: act(() => CD.call('markArrived', { id: b.id, arrived: false })) }, t('fl.unArr')) : null];
    popEl = CD.popover(anchor, h('div', { style: { display: 'grid', gap: '10px', minWidth: '230px' } }, h('.row', h('b', b.patient_name), h('.sp'), h('span.pill', `${t('fl.turn')} ${b.turn}`)), h('small.dim', `${b.type_name} · ${CD.fmtT(b.time)} · ${t('fl.' + b.ui)}`), ...body));
    popEl.dataset.bid = b.id; popEl._live = live; popEl._b = b; popEl.addEventListener('toggle', (e) => { if (e.newState === 'closed') popEl = null; });
  };
  const click = (b, el) => {
    if (b.ui === 'done') return CD.bookingInfo(b, data.device && data.device.name);
    if (b.ui === 'in' && remain(b) <= 0) { const k = armed.get(b.id); if (k && Date.now() - k < 3500) { armed.delete(b.id); return act(() => CD.call('finishSession', { id: b.id }), t('ok'))(); } armed.set(b.id, Date.now()); return CD.toast(t('fl.pressAgain')); }
    timerPop(b, el);
  };
  const ctxItems = (b) => { const open = b.ui === 'in'; const devs = (CD.catalogCache || { devices: [] }).devices.filter((d) => d.active !== 0 && (d.typeIds || []).includes(b.type_id) && d.id !== b.device_id); return [
    { icon: 'users', label: t('fl.viewPat'), onclick: () => CD.openProfile(b.patient_id) }, { icon: 'today', label: t('fl.viewSess'), onclick: () => CD.bookingInfo(b, data.device && data.device.name) }, { sep: 1 },
    !open && b.ui !== 'done' && { icon: 'check', label: t('fl.start'), onclick: () => timerPop(b, document.querySelector(`.pc[data-id="${b.id}"]`)) },
    open && { icon: 'refresh', label: t('fl.restart'), onclick: act(() => CD.call('restartTimer', { id: b.id })) }, open && { icon: 'check', label: t('fl.finish'), onclick: act(() => CD.call('finishSession', { id: b.id }), t('ok')) },
    (b.ui === 'late' || b.ui === 'upcoming') && { icon: 'check', label: t('fl.markArr'), onclick: act(() => CD.call('markArrived', { id: b.id, arrived: true })) }, b.ui === 'arrived' && { icon: 'x', label: t('fl.unArr'), onclick: act(() => CD.call('markArrived', { id: b.id, arrived: false })) },
    { sep: 1 }, { icon: 'pencil', label: t('fl.addVisit'), onclick: () => addVisit(b.hour, b.patient_id) }, CD.newPatientItem({ date, hour: b.hour, typeId, deviceId, onDone: () => reload() }), devs.length && b.ui !== 'done' && { icon: 'swap', label: t('fl.changeDev'), sub: devs.map((d) => ({ label: d.name, onclick: act(() => CD.call('updateBooking', { id: b.id, deviceId: d.id }), t('fl.moved')) })) },
    { sep: 1 }, { icon: 'x', label: t('fl.cut'), onclick: () => { CD.clip = { mode: 'cut', id: b.id, name: b.patient_name }; CD.toast(`${b.patient_name} — ${t('ctx.clipCut')}`); } }, { icon: 'save', label: t('fl.copy'), onclick: () => { CD.clip = { mode: 'copy', id: b.id, name: b.patient_name }; CD.toast(`${b.patient_name} — ${t('ctx.clipCopy')}`); } },
    b.ui !== 'done' && { icon: 'trash', label: t('fl.del'), danger: true, onclick: async () => { if (await CD.confirm(t('fl.delAsk'), { danger: true })) act(() => CD.call('cancelBooking', { id: b.id }))(); } }]; };
  const addVisit = (hour, patientId) => { const go = (pid) => act(() => CD.call('addBooking', { patientId: pid, typeId, date, hour, deviceId }), t('ok'))(); if (patientId) go(patientId); else CD.pickPatient((r) => go(r.id)); };
  const paste = (hour) => { const c = CD.clip; if (!c) return; if (c.mode === 'cut') act(() => CD.call('moveBooking', { id: c.id, date, hour, deviceId }), t('fl.pasted'))().then(() => { CD.clip = null; }); else act(() => CD.call('addBooking', { copyOf: c.id, date, hour, deviceId }), t('fl.pasted'))(); };
  const circle = (b) => {
    const el = h('button.pc', { class: `${b.ui} ${b.rank === 0 ? 'vip' : ''} ${b.rank >= 2 ? 'low' : ''}`, 'data-id': b.id, draggable: b.ui !== 'done' && b.ui !== 'in' ? 'true' : 'false', 'data-tip': `${b.patient_name}\n${b.type_name} · ${CD.fmtT(b.time)}\n${t('fl.' + b.ui)}` }, h('span.num', b.turn), h('span.pcd', ''));
    el.onclick = () => click(b, el); CD.onCtx(el, () => ctxItems(b));
    el.addEventListener('dragstart', (e) => { closePop(); e.dataTransfer.setData('text/plain', JSON.stringify({ id: b.id })); e.dataTransfer.effectAllowed = 'move'; });
    el.dataset.b = ''; el._b = b; return el;
  };
  const dropOn = (target, getArgs) => { target.addEventListener('dragover', (e) => { e.preventDefault(); target.classList.add('drop-ok'); }); target.addEventListener('dragleave', () => target.classList.remove('drop-ok')); target.addEventListener('drop', (e) => { e.preventDefault(); target.classList.remove('drop-ok'); let d; try { d = JSON.parse(e.dataTransfer.getData('text/plain')); } catch { return; } act(() => CD.call('moveBooking', { id: d.id, ...getArgs() }), t('fl.moved'))(); }); };
  const draw = () => {
    if (!data) return; const byHour = new Map(); data.bookings.forEach((b) => (byHour.get(b.hour) || byHour.set(b.hour, []).get(b.hour)).push(b));
    const prev = h('button.btn.ico', { 'data-tip': CD.fmtD(CD.addDays(date, -1)), onclick: () => { date = CD.addDays(date, -1); reload(); }, html: ic(CD.lang === 'ar' ? 'left' : 'right') }), next = h('button.btn.ico', { 'data-tip': CD.fmtD(CD.addDays(date, 1)), onclick: () => { date = CD.addDays(date, 1); reload(); }, html: ic(CD.lang === 'ar' ? 'right' : 'left') });
    const mv = (n) => () => ({ date: CD.addDays(date, n), hour: Math.max(0, ...[0]) }); // hour kept by the source booking (see below)
    CD.mount(head, backBtn(() => CD.go('type', { date, typeId })), h('h1.h1', (data.device && data.device.name) || t('fl.unassigned')), h('span.dim', CD.fmtD(date)), h('.sp'), h('span.pill.ok', `${t('fl.total')}: ${data.total}`), CD.lang === 'ar' ? [next, prev] : [prev, next]);
    [[prev, -1], [next, 1]].forEach(([btn, n]) => { btn.addEventListener('dragover', (e) => { e.preventDefault(); btn.classList.add('drop-ok'); }); btn.addEventListener('dragleave', () => btn.classList.remove('drop-ok')); btn.addEventListener('drop', (e) => { e.preventDefault(); btn.classList.remove('drop-ok'); let d; try { d = JSON.parse(e.dataTransfer.getData('text/plain')); } catch { return; } const b = data.bookings.find((x) => x.id === d.id); if (b) act(() => CD.call('moveBooking', { id: b.id, date: CD.addDays(date, n), hour: b.hour, deviceId }), t('fl.moved'))(); }); });
    const rows = []; const first = data.hours.length ? data.hours[0].h : 0, last = data.hours.length ? data.hours[data.hours.length - 1].h : 23;
    const hmap = new Map(data.hours.map((x) => [x.h, x])); const from = 0, to = 23;
    for (let hr = from; hr <= to; hr++) {
      const x = hmap.get(hr) || { h: hr, label: (hr % 12 || 12) + (hr < 12 ? ' ص' : ' م'), inWork: false, count: 0, red: false, current: false }; const list = (byHour.get(hr) || []).sort((a, b) => a.turn - b.turn);
      const row = h('.hr', { class: (x.inWork ? 'work ' : 'off ') + (x.red ? 'red ' : '') + (x.current ? 'now' : ''), 'data-h': hr }, h('.hl', h('b', x.label), x.count ? h('span.pill', x.count) : null), h('.hc', list.map(circle)), !x.inWork ? h('small.dim.cl', t('fl.closed')) : null);
      if (x.inWork) { dropOn(row, () => ({ date, hour: hr, deviceId })); CD.onCtx(row, () => [CD.clip && { icon: 'download', label: `${t('ctx.pasteHere')} (${CD.clip.name})`, onclick: () => paste(hr) }, { icon: 'plus', label: t('fl.addSess'), onclick: () => CD.addSessionDialog({ date, hour: hr, typeId, deviceId, onDone: () => reload() }) }, CD.newPatientItem({ date, hour: hr, typeId, deviceId, onDone: () => reload() })]); }
      rows.push(row);
    }
    const mainEl = document.querySelector('#main'), keep = mainEl ? mainEl.scrollTop : 0; CD.mount(tl, rows); if (tl._scrolled && mainEl) mainEl.scrollTop = keep; const cur = tl.querySelector('.hr.now') || tl.querySelector('.hr.work'); if (cur && !tl._scrolled) { tl._scrolled = true; cur.scrollIntoView({ block: 'center' }); }
    paint();
  };
  const paint = () => { // live countdown labels, blinking, sound once at expiry
    if (!data) return; tl.querySelectorAll('.pc').forEach((el) => { const b = el._b; if (!b || b.ui !== 'in') { el.querySelector('.pcd').textContent = ''; return; } const r = remain(b); const cd = el.querySelector('.pcd'); cd.textContent = r > 0 ? mmss(r) : t('fl.overdue'); el.classList.toggle('over', r <= 0); el.style.setProperty('--p', Math.max(0, Math.min(1, r / (b.timer_min * 60000))) * 360 + 'deg');
      if (r <= 0 && !over.has(b.id)) { over.add(b.id); CD.beep('timer'); } });
    if (popEl && popEl._live && popEl._b) { const r = remain(popEl._b); popEl._live.textContent = r > 0 ? mmss(r) : '+' + mmss(-r); popEl._live.style.color = r > 0 ? '' : 'var(--bad)'; }
  };
  CD.mount(root, head, h('small.dim', t('fl.drag')), tl); await reload();
  tick = setInterval(() => { if (!root.isConnected) return clearInterval(tick); paint(); if (Date.now() - lastLoad > 20000 && !popEl) reload(true); }, 1000);
  CD.catalogCache = await CD.call('getCatalog').catch(() => CD.catalogCache);
};
})();
