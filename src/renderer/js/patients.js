'use strict';
(() => {
const { h, t, ic, $ } = CD;
CD.addDict({
  'pat.title': 'المرضى', 'pat.add': 'إضافة مريض', 'pat.active': 'النشطون', 'pat.dropped': 'المنقطعون', 'pat.archive': 'الأرشيف', 'pat.subActive': 'مرضى بجلسات جارية', 'pat.subDropped': 'أُزيلوا من الجدول لانقطاعهم', 'pat.subArchive': 'أكملوا جلساتهم أو أُرشفوا',
  age: 'العمر', gender: 'الجنس', male: 'ذكر', female: 'أنثى', phone2: 'هاتف ثانٍ', address: 'العنوان', notes: 'ملاحظات', group: 'المجموعة', tags: 'الوسوم', 'pat.basic': 'البيانات الأساسية', 'pat.sessions': 'الجلسات', 'pat.import': 'استيراد من e-clinic', 'pat.importHint': 'آخر ٥ مرضى + بحث بالاسم أو الهاتف', 'pat.imported': 'تم استيراد البيانات', 'pat.noEclinic': 'ربط e-clinic غير مفعّل (الإعدادات ← الربط).',
  count: 'عدد الجلسات', startTime: 'ساعة البدء (اختياري)', prefTime: 'ساعة ثابتة لجلسات المريض', prefHelp: 'اتركها فارغة للتوزيع التلقائي. عند تحديدها تبدأ كل جلسة في هذه الساعة، وإن كانت مشغولة تُوضع أقرب ساعة فارغة.', retimeAll: 'تطبيق على كل جلساته القادمة', retimeConfirm: 'نقل كل الجلسات القادمة لهذا المريض إلى الساعة {t}؟', retimeDone: 'نُقلت {n} جلسة', retimeFailed: ' · تعذّر نقل {f} (لا مكان فارغ)', replaceHint: 'بدل الإضافة: ألغِ جلساته القادمة واستبدلها بالجدول الجديد', startDate: 'تبدأ من', addPkg: 'إضافة حزمة جلسات', pkg: 'حزمة', previewPlan: 'توزيع تلقائي', unplaced: 'تعذّر وضع {n} جلسة (لا فراغ كافٍ)', replaceFuture: 'استبدال الجلسات القادمة الحالية', saved: 'تم الحفظ', 'pat.hintLate': 'هذا المريض متلكئ — أُعطي مواعيد متأخرة تلقائياً.', 'pat.hintDrop': 'تنبيه: مريض معرّض للانقطاع.', 'pat.hintWas': 'سبق أن انقطع هذا المريض.',
  drop: 'انقطاع', archiveB: 'أرشفة', restore: 'استعادة', delPatient: 'حذف المريض نهائياً', dropQ: 'تسجيل انقطاع وإزالة المريض من الجدول؟', archQ: 'أرشفة المريض وإلغاء جميع مواعيده؟', delQ: 'حذف المريض وكل سجلاته نهائياً؟', 'prof.stats': 'الإحصاءات', 'prof.sessions': 'جميع الجلسات', 'prof.attended': 'حضر', 'prof.missed': 'غاب', 'prof.upcoming': 'قادمة', 'prof.streak': 'غياب متتالٍ', 'prof.barcode': 'الباركود', 'prof.call': 'نص المكالمة', bookedSt: 'محجوز', rcpt: 'وصل', slotBad: 'الموعد متعارض', req: 'الاسم والهاتف مطلوبان', none2: 'لا نتائج'
}, {
  'pat.title': 'Patients', 'pat.add': 'Add patient', 'pat.active': 'Active', 'pat.dropped': 'Dropped out', 'pat.archive': 'Archive', 'pat.subActive': 'Patients with ongoing sessions', 'pat.subDropped': 'Removed from schedule for absence', 'pat.subArchive': 'Completed or archived',
  age: 'Age', gender: 'Gender', male: 'Male', female: 'Female', phone2: 'Second phone', address: 'Address', notes: 'Notes', group: 'Group', tags: 'Tags', 'pat.basic': 'Basic info', 'pat.sessions': 'Sessions', 'pat.import': 'Import from e-clinic', 'pat.importHint': 'Last 5 patients + search by name or phone', 'pat.imported': 'Data imported', 'pat.noEclinic': 'e-clinic link is off (Settings → Integration).',
  count: 'Sessions', startTime: 'Start time (optional)', prefTime: 'Fixed hour for this patient', prefHelp: 'Leave empty for automatic distribution. When set, every session starts at this hour; if it is taken the nearest free hour is used.', retimeAll: 'Apply to all upcoming sessions', retimeConfirm: 'Move all upcoming sessions of this patient to {t}?', retimeDone: '{n} sessions moved', retimeFailed: ' · {f} could not be moved (no free place)', replaceHint: 'Instead of adding: cancel his upcoming sessions and replace them with the new schedule', startDate: 'Start from', addPkg: 'Add session package', pkg: 'Package', previewPlan: 'Auto-distribute', unplaced: '{n} sessions could not be placed (no free time)', replaceFuture: 'Replace existing upcoming sessions', saved: 'Saved', 'pat.hintLate': 'Often-late patient — given late slots automatically.', 'pat.hintDrop': 'Warning: patient at risk of dropping out.', 'pat.hintWas': 'This patient dropped out before.',
  drop: 'Drop out', archiveB: 'Archive', restore: 'Restore', delPatient: 'Delete patient permanently', dropQ: 'Mark as dropped out and remove from schedule?', archQ: 'Archive patient and cancel all appointments?', delQ: 'Permanently delete the patient and all records?', 'prof.stats': 'Statistics', 'prof.sessions': 'All sessions', 'prof.attended': 'Attended', 'prof.missed': 'Missed', 'prof.upcoming': 'Upcoming', 'prof.streak': 'Missed in a row', 'prof.barcode': 'Barcode', 'prof.call': 'Call script', bookedSt: 'Booked', rcpt: 'Receipt', slotBad: 'Slot conflicts', req: 'Name and phone are required', none2: 'No results'
});
const fld = (label, input) => h('label.fld', h('span', label), input);
const rowBtn = (i, tip, fn, cls = '') => h('button.btn.ico.sm', { class: cls, 'data-tip': t(tip), onclick: fn, html: ic(i, 's') });

CD.views.patients = (root) => {
  let q = ''; const box = h('div'); let acc;
  const section = (status, id, icon, title, sub) => ({ id, icon, title: t(title), sub: t(sub), open: status === 'active', body: () => { const wrap = h('div'); sec[status] = () => load(wrap, status); load(wrap, status); return wrap; } });
  const sec = {};
  async function load(wrap, status) {
    const rows = await CD.call('searchPatients', { q, status, limit: 200 }).catch(() => []);
    CD.mount(wrap, rows.length ? h('table.tbl', h('tbody', rows.map((p) => h('tr', h('td', h('b', p.name), ' ', CD.tagChips(p.tags)), h('td.dim', { style: { direction: 'ltr', textAlign: 'start' } }, p.phone), h('td.dim', p.barcode),
      h('td', h('.row', rowBtn('eye', 'profile', () => CD.openProfile(p.id)), rowBtn('pencil', 'editAll', () => CD.editPatient(p.id)), rowBtn('chat', 'wa', () => CD.waPatient(p.id)), p.phone ? rowBtn('phone', 'call', () => CD.callPatient(p.id)) : null,
        status === 'active' ? [rowBtn('userx', 'drop', () => act('dropPatient', p.id, 'dropQ')), rowBtn('archive', 'archiveB', () => act('archivePatient', p.id, 'archQ'))] : rowBtn('refresh', 'restore', () => act('restorePatient', p.id)), CD.perms.includes('delete_patient') ? rowBtn('trash', 'delPatient', () => act('deletePatient', p.id, 'delQ'), 'bad') : null)))))) : h('p.dim', t('none2')));
  }
  const act = (m, id, q2) => CD.try(async () => { if (q2 && !(await CD.confirm(t(q2), { danger: true }))) return; const r = await CD.call(m, { id }); Object.values(sec).forEach((f) => f()); CD.badge(); if (r && r.cancelled != null) { const mv = await CD.call('compactionPreview', { fromDate: CD.iso() }); if (mv.length) CD.showGap({ gaps: [] }); } });
  const draw = () => { acc = CD.accordion([section('active', 'a', 'users', 'pat.active', 'pat.subActive'), section('dropped', 'd', 'userx', 'pat.dropped', 'pat.subDropped'), section('archive', 'r', 'archive', 'pat.archive', 'pat.subArchive')], { key: 'patients' }); CD.mount(box, acc); };
  let qt; const qi = h('input.in', { placeholder: t('search'), style: { maxWidth: '280px' }, oninput: (e) => { clearTimeout(qt); qt = setTimeout(() => { q = e.target.value; draw(); }, 200); } });
  CD.mount(root, h('.hd', h('h1.h1', t('pat.title')), h('.sp'), qi, CD.perms.includes('add_patient') ? h('button.btn.pri', { onclick: () => CD.editPatient(null, () => draw()) }, ic('plus', 's'), t('pat.add')) : null), box); draw();
};

// ---- profile ------------------------------------------------------------------------------
CD.addDict({ 'pf.next': 'القادمة', 'pf.of': 'من', 'pf.done': 'مكتملة', 'pf.noSess': 'لا جلسات' }, { 'pf.next': 'Next', 'pf.of': 'of', 'pf.done': 'done', 'pf.noSess': 'No sessions' });
// sessions grouped by type: progress bar + colored date chips (green attended, red missed, grey upcoming)
const sessGroups = (list) => {
  if (!list.length) return h('p.dim', t('pf.noSess')); const by = new Map(); list.forEach((b) => { const k = b.type_name || '—'; (by.get(k) || by.set(k, []).get(k)).push(b); });
  return h('div', { style: { display: 'grid', gap: '10px' } }, [...by.entries()].map(([name, rows]) => { const done = rows.filter((b) => b.eff === 'attended').length, nxt = rows.find((b) => b.eff === 'booked');
    return h('.card.inset', { style: { padding: '10px 12px', display: 'grid', gap: '8px' } }, h('.row', h('b', name), h('.sp'), nxt ? h('small.dim', `${t('pf.next')}: ${CD.fmtD(nxt.date)} ${CD.fmtT(nxt.time)}`) : null, h('span.pill', `${done} ${t('pf.of')} ${rows.length}`)),
      h('div', { style: { height: '6px', borderRadius: '6px', background: 'var(--surf2)', overflow: 'hidden' } }, h('div', { style: { width: (rows.length ? done / rows.length * 100 : 0) + '%', height: '100%', background: 'var(--acc)' } })),
      h('.row.wrap', { style: { gap: '6px' } }, rows.map((b) => h('span.sdot', { class: b.eff === 'attended' ? 'ok' : b.eff === 'missed' ? 'bad' : '', 'data-tip': `${b.seq}/${b.total} · ${CD.fmtD(b.date)} ${CD.fmtT(b.time)}${b.device_name ? ' · ' + b.device_name : ''}` }, h('b', b.seq), h('small', b.date.slice(5)))))); }));
};
CD.sessGroups = sessGroups;
CD.openProfile = (id) => CD.try(async () => {
  const p = await CD.call('getPatient', { id }); if (!p) return;
  const hints = p.hints.map((x) => h('span.pill.warn', ic('warn', 's'), t({ late: 'pat.hintLate', dropout: 'pat.hintDrop', was_dropped: 'pat.hintWas' }[x])));
  const stat = (k, v, c = '') => h('.stat', { class: c }, h('small', t(k)), h('b', { style: { fontSize: '20px' } }, v));
  const svg = await CD.sys('barcodeSvg', { code: p.barcode }).catch(() => '');
  const call = await CD.call('callScript', { patientId: id }).catch(() => null);
  const eff = { attended: ['ok', 'prof.attended'], missed: ['bad', 'prof.missed'], booked: ['', 'bookedSt'] };
  const items = [
    { id: 'info', icon: 'info', title: t('pat.basic'), open: true, body: () => h('div', { style: { display: 'grid', gap: '12px' } },
      h('.pf-head', h('.pf-av', { style: { '--c': `hsl(${(p.id * 67 + 150) % 360} 45% 38%)` } }, (p.name || '?').trim().slice(0, 1)), h('div', { style: { display: 'grid', gap: '4px', minWidth: 0 } }, h('b', { style: { fontSize: '18px' } }, p.name), h('.dim', `${p.age ? p.age + ' · ' : ''}${p.gender === 'F' ? t('female') : t('male')}`), h('.row.wrap', { style: { gap: '6px' } }, CD.tagChips(p.tags), hints))),
      h('.pf-facts', h('span', ic('phone', 's'), ' ', p.phone || '—', p.phone ? h('button.btn.ico.sm', { 'data-tip': t('call'), onclick: () => CD.callPhone(p.phone), html: ic('phone', 's') }) : null), p.phone2 ? h('span', ic('phone', 's'), ' ', p.phone2, h('button.btn.ico.sm', { 'data-tip': t('call'), onclick: () => CD.callPhone(p.phone2), html: ic('phone', 's') })) : null, p.address ? h('span', p.address) : null), p.notes ? h('p.pf-note', p.notes) : null,
      h('.grid.g4', stat('prof.attended', p.stats.attended, 'ok'), stat('prof.missed', p.stats.missed, 'bad'), stat('prof.upcoming', p.stats.upcoming), stat('prof.streak', p.stats.streak, p.stats.streak ? 'bad' : ''))) },
    { id: 'sess', icon: 'calendar', title: t('prof.sessions'), open: true, badge: p.bookings.length, body: () => sessGroups(p.bookings) },
    { id: 'bc', icon: 'barcode', title: t('prof.barcode'), sub: p.barcode, body: () => h('div', { style: { background: '#fff', padding: '10px', borderRadius: '10px', display: 'inline-block' }, html: svg }) },
    call ? { id: 'call', icon: 'phone', title: t('prof.call'), body: () => h('p', { style: { margin: 0, whiteSpace: 'pre-wrap' } }, call.text) } : null
  ].filter(Boolean);
  CD.dialog({ title: p.name, cls: 'wide', body: CD.accordion(items), foot: (close) => [h('button.btn', { onclick: () => CD.printMenu(id) }, ic('printer', 's'), t('print')), h('button.btn', { onclick: () => CD.waPatient(id) }, ic('chat', 's'), t('wa')), h('button.btn', { onclick: () => { close(); CD.editPatient(id); } }, ic('pencil', 's'), t('editAll')), h('button.btn.pri', { onclick: () => close() }, t('close'))] });
});

// ---- editor (add / edit everything) ---------------------------------------------------------
CD.editPatient = (id, done) => CD.try(async () => {
  const cat = await CD.call('getCatalog'); const P = id ? await CD.call('getPatient', { id }) : { name: '', gender: 'M', phone: '', tagIds: [] };
  const act = (a) => a.filter((x) => x.active); const f = {};
  for (const k of ['name', 'age', 'phone', 'phone2', 'address']) f[k] = h('input.in', { value: P[k] ?? '', type: k === 'age' ? 'number' : 'text' });
  f.pref = h('input.in', { type: 'time', value: P.pref_time || '' }); f.notes = h('textarea.in', { rows: 2 }, P.notes || ''); f.gender = h('select.in', h('option', { value: 'M', selected: P.gender !== 'F' }, t('male')), h('option', { value: 'F', selected: P.gender === 'F' }, t('female')));
  f.group = h('select.in', h('option', { value: '' }, '—'), act(cat.groups).map((g) => h('option', { value: g.id, selected: P.group_id === g.id }, g.name)));
  const tagBox = cat.tags.map((g) => { const c = h('input', { type: 'checkbox', checked: (P.tagIds || []).includes(g.id) }); c.dataset.id = g.id; return h('label.chk.row', c, CD.tagChips([g])); });
  let rows = []; const pkgs = []; const warn = h('div');
  const replace = h('input', { type: 'checkbox', checked: false }); // adding sessions is the default; replacing is opt-in
  const fixRest = async (i) => {
    const keep = rows.slice(0, i + 1), rest = rows.slice(i + 1); if (!rest.length) return; const g = new Map();
    for (const r of rest) { const k = [r.type_id, r.device_id || '', r.therapist_id || ''].join('|'); g.set(k, { typeId: r.type_id, deviceId: r.device_id || null, therapistId: r.therapist_id || null, startTime: f.pref.value || undefined, count: (g.has(k) ? g.get(k).count : 0) + 1 }); }
    const from = CD.addDays(keep[keep.length - 1].date, 1); const res = await CD.call('previewPlan', { patientId: id || null, groupId: f.group.value ? Number(f.group.value) : null, tags: effectsNow(), plans: [...g.values()].map((x) => ({ ...x, startDate: from })) });
    rows.splice(0, rows.length, ...keep, ...res.bookings); rows.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)); rows.forEach((r, n) => { r.seq = n + 1; r.total = rows.length; }); CD.mount(warn, res.unplaced ? h('span.pill.warn', ic('warn', 's'), t('unplaced', { n: res.unplaced })) : null);
  };
  const preview = CD.schedCal({ get: () => rows, types: cat.types, patientId: id || null, fixRest }); const drawPreview = () => preview.redraw();
  const newPkg = () => {
    const s = { type: h('select.in', act(cat.types).map((x) => h('option', { value: x.id }, x.name))), count: h('input.in', { type: 'number', min: 1, value: 12 }), start: h('input.in', { type: 'date', value: CD.iso() }),
      dev: h('select.in', h('option', { value: '' }, '—'), act(cat.devices).map((x) => h('option', { value: x.id }, x.name))), th: h('select.in', h('option', { value: '' }, '—'), act(cat.therapists).map((x) => h('option', { value: x.id }, x.name))), time: h('input.in', { type: 'time', value: f.pref.value || '' }) };
    const paint = () => { if (s.start.value && CD.lvPaint) CD.lvPaint(s.start.value, { type: s.type, dev: s.dev }); }; s.start.addEventListener('change', paint); paint();
    pkgs.push(s); return s;
  };
  const pkgItem = (s, n) => ({ id: 'p' + n, icon: 'list', title: t('pkg') + ' ' + n, open: true, body: () => h('.grid.g3', fld(t('type'), s.type), fld(t('count'), s.count), fld(t('startDate'), s.start), fld(t('device'), s.dev), fld(t('therapist'), s.th), fld(t('startTime'), s.time)) });
  const pkgHost = h('div'); const drawPkgs = () => CD.mount(pkgHost, CD.accordion(pkgs.map((s, i) => pkgItem(s, i + 1))));
  if (!id && act(cat.types).length) { newPkg(); }
  const plan = () => CD.try(async () => {
    if (!pkgs.length) { newPkg(); drawPkgs(); }
    const tagIds = tagBox.map((l) => l.querySelector('input')).filter((c) => c.checked).map((c) => Number(c.dataset.id)); const effects = cat.tags.filter((g) => tagIds.includes(g.id)).map((g) => g.effect);
    const r = await CD.call('previewPlan', { patientId: id || null, groupId: f.group.value ? Number(f.group.value) : null, tags: effects, plans: pkgs.map((s) => ({ typeId: Number(s.type.value), count: Number(s.count.value) || 1, startDate: s.start.value, deviceId: s.dev.value ? Number(s.dev.value) : null, therapistId: s.th.value ? Number(s.th.value) : null, startTime: s.time.value || undefined })) });
    rows = r.bookings; drawPreview(); CD.mount(warn, r.unplaced ? h('span.pill.warn', ic('warn', 's'), t('unplaced', { n: r.unplaced })) : null);
  });
  f.pref.addEventListener('change', () => pkgs.forEach((s) => { s.time.value = f.pref.value; }));
  const effectsNow = () => { const ids = tagBox.map((l) => l.querySelector('input')).filter((c) => c.checked).map((c) => Number(c.dataset.id)); return cat.tags.filter((g) => ids.includes(g.id)).map((g) => g.effect); };
  const startNow = () => { const d = pkgs[0] && pkgs[0].start.value; return d && d >= CD.iso() ? d : CD.iso(); };
  const applyPlanned = (r) => { rows = r.bookings; drawPreview(); CD.mount(warn, r.unplaced ? h('span.pill.warn', ic('warn', 's'), t('unplaced', { n: r.unplaced })) : null); };
  const openPlanner = () => { if (!pkgs.length) { newPkg(); drawPkgs(); } CD.sessionPlanner({ packages: CD.packagesOf(pkgs), startDate: startNow(), tags: effectsNow(), patientId: id || null, onApply: (r) => { applyPlanned(r); loadPatterns(); } }); };
  const patSel = h('select.in', { style: { maxWidth: '340px' }, 'data-tip': t('pl.usePattern') }); let saved = [];
  const loadPatterns = async () => { saved = await CD.call('patternList').catch(() => []); CD.mount(patSel, [h('option', { value: '' }, t('pl.prevPatterns')), ...saved.map((x, i) => h('option', { value: i }, x.name))]); };
  patSel.onchange = () => { const x = saved[Number(patSel.value)]; if (!x) return; patSel.value = ''; CD.try(async () => { if (!pkgs.length) { newPkg(); drawPkgs(); } const r = await CD.call('planFromPattern', { patientId: id || null, pattern: x.pattern, packages: CD.packagesOf(pkgs), startDate: startNow(), tags: effectsNow() }); await CD.call('rememberPattern', { pattern: x.pattern }); applyPlanned(r); loadPatterns(); }); };
  loadPatterns();
  const imp = () => {
    const q = h('input.in', { placeholder: t('search') }), out = h('div', { style: { display: 'grid', gap: '6px' } });
    const run = async () => CD.try(async () => { const list = await CD.sys('eclinicQuery', { q: q.value, limit: 5 }); CD.mount(out, list.length ? list.map((x) => h('button.btn', { onclick: () => { f.name.value = x.name || ''; f.phone.value = x.phone || ''; f.age.value = x.age || ''; f.gender.value = x.gender === 'F' ? 'F' : 'M'; f.address.value = x.address || ''; P.ext_ref = x.ext_ref; CD.toast(t('pat.imported')); d2.close_(); } }, `${x.name} · ${x.phone || ''}`)) : h('p.dim', t('none2'))); });
    const d2 = CD.dialog({ title: t('pat.import'), cls: 'sm', body: h('div', { style: { display: 'grid', gap: '10px' } }, CD.help(t('pat.importHint')), h('.row', q, h('button.btn', { onclick: run }, ic('search', 's'))), out) }); run();
  };
  const save = (close) => CD.try(async () => {
    if (!f.name.value.trim() || !f.phone.value.trim()) throw new Error(t('req'));
    const tagIds = tagBox.map((l) => l.querySelector('input')).filter((c) => c.checked).map((c) => Number(c.dataset.id));
    const r = await CD.call('savePatient', { patient: { id: id || undefined, name: f.name.value.trim(), age: f.age.value ? Number(f.age.value) : null, gender: f.gender.value, phone: CD.nd(f.phone.value.trim()), phone2: CD.nd(f.phone2.value.trim()), address: f.address.value, notes: f.notes.value, ext_ref: P.ext_ref, group_id: f.group.value ? Number(f.group.value) : null, pref_time: f.pref.value || null, tagIds }, bookings: rows.length ? rows : null, replaceFuture: replace.checked && rows.length > 0 });
    CD.toast(t('saved')); close(); done && done(); CD.refresh(); return r;
  });
  const retimeRow = h('.row', h('button.btn.sm', { onclick: () => CD.try(async () => { if (!f.pref.value) return CD.toast(t('prefTime'), 'bad'); if (!(await CD.confirm(t('retimeConfirm', { t: CD.fmtT(f.pref.value) })))) return; const r = await CD.call('retimePatient', { id, time: f.pref.value }); CD.toast(t('retimeDone', { n: r.moved }) + (r.failed ? t('retimeFailed', { f: r.failed }) : ''), r.failed ? 'bad' : ''); CD.refresh(); }) }, ic('clock', 's'), t('retimeAll')));
  const items = [
    { id: 'basic', icon: 'users', title: t('pat.basic'), open: true, body: () => h('div', { style: { display: 'grid', gap: '10px' } }, h('.row', h('button.btn.sm', { onclick: imp }, ic('download', 's'), t('pat.import'))),
      h('.grid.g2', fld(t('name'), f.name), fld(t('phoneL'), f.phone), fld(t('age'), f.age), fld(t('gender'), f.gender), fld(t('phone2'), f.phone2), fld(t('address'), f.address), fld(t('group'), f.group), fld(t('prefTime'), f.pref)), h('small.dim', t('prefHelp')), id ? retimeRow : null, fld(t('notes'), f.notes)) },
    { id: 'tags', icon: 'star', title: t('tags'), body: () => h('.perm', tagBox) },
    { id: 'sess', icon: 'calendar', title: t('pat.sessions'), open: !id, body: () => h('div', { style: { display: 'grid', gap: '10px' } }, pkgHost, h('.row', h('button.btn.sm', { onclick: () => { newPkg(); drawPkgs(); } }, ic('plus', 's'), t('addPkg')), h('button.btn.pri.sm', { onclick: openPlanner }, ic('calendar', 's'), t('pl.title')), patSel, id ? h('label.chk.row', replace, t('replaceHint')) : null), warn, preview) }
  ];
  drawPkgs();
  CD.dialog({ title: id ? P.name : t('pat.add'), cls: 'wide', body: CD.accordion(items), foot: (close) => [h('button.btn', { onclick: () => close() }, t('cancel')), id ? h('button.btn', { onclick: () => CD.printMenu(id) }, ic('printer', 's'), t('print')) : null, h('button.btn.pri', { onclick: () => save(close) }, ic('save', 's'), t('save'))] });
});

})();
