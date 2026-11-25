'use strict';
(() => {
const { h, t, ic } = CD;
CD.addDict({
  'tl.title': 'الأدوات', 'tl.wa': 'تذكيرات واتساب', 'tl.waSub': 'مرسلة / لم يرد / رد', 'tl.pbx': 'مكالمات PBX', 'tl.pbxSub': 'نص المكالمة ودليل الربط', 'tl.rate': 'روابط تقييم الجلسات', 'tl.rateSub': 'تقييم المراجعين بعد الجلسة وشكاوى', 'tl.bc': 'الباركود', 'tl.bcSub': 'افتح ملف المريض بالمسح', 'tl.abs': 'المنقطعون وغير الملتزمين', 'tl.absSub': 'قائمة الغياب',
  tomorrow: 'غداً', date: 'تاريخ', sendWa: 'إرسال', next: 'الشخص التالي', replied: 'رد', notReplied: 'لم يرد', waNone: 'لم يُرسل', waSent: 'أُرسل', waReplied: 'رد', upcomingFor: 'كل الجلسات القادمة لمريض', pickPatient: 'ابحث عن مريض…', lastSent: 'كل المواعيد', noReminders: 'لا توجد مواعيد لهذا اليوم.',
  callFor: 'مريض للاتصال', callCopy: 'نسخ النص', callDial: 'اتصال', 'pbx.guide': 'دليل الإعداد (أول مرة)', 'pbx.g1': 'الأقل جهداً: برنامج هاتف SIP مجاني (MicroSIP أو Linphone) على الحاسوب + حساب SIP من مزوّد VoIP أو من سنترالكم؛ التطبيق يفتح الاتصال عبر tel: مباشرة.', 'pbx.g2': 'إذا كان لديكم خط أرضي: مهايئ FXO/ATA (مثل Grandstream HT801) يوصَّل بالخط وبالشبكة (Ethernet أو Wi-Fi) ويحوّله إلى حساب SIP.', 'pbx.g3': 'خيار مفتوح المصدر كامل: Asterisk/FreePBX على حاسوب صغير مع بطاقة FXO أو مهايئ؛ يعطي أرقاماً داخلية وتسجيلاً للمكالمات.', 'pbx.g4': 'بعد التثبيت: اجعل البرنامج هو معالج tel: الافتراضي في ويندوز (الإعدادات ← التطبيقات الافتراضية ← الارتباطات)، ثم اضغط «اتصال» هنا.', 'pbx.note': 'ملاحظة: خطوات الأجهزة والمزوّدين تُراجَع حسب بلدكم وتوفر الخدمة.',
  makeLinks: 'إنشاء روابط تقييم لجلسات اليوم', rateBase: 'رابط نموذج التقييم غير مُعدّ بعد (الإعدادات ← الرسائل). تُنشأ الرموز فقط.', sendLink: 'إرسال الرابط', 'bc.hint': 'امسح باركود وصل المريض بالقارئ (يعمل في أي شاشة) أو اكتب الرمز هنا.', find: 'بحث', 'abs.streak': 'غياب متتالٍ', 'abs.rate': 'نسبة الغياب', 'abs.noone': 'لا يوجد غائبون.', status: 'الحالة', ratingMsg: 'شكراً لزيارتكم {clinic}. نرجو تقييم جلستكم: {url}'
}, {
  'tl.title': 'Tools', 'tl.wa': 'WhatsApp reminders', 'tl.waSub': 'sent / awaiting / replied', 'tl.pbx': 'PBX calls', 'tl.pbxSub': 'Call script & setup guide', 'tl.rate': 'Session rating links', 'tl.rateSub': 'Patient feedback after sessions', 'tl.bc': 'Barcode', 'tl.bcSub': 'Open a file by scanning', 'tl.abs': 'Absentees & non-compliant', 'tl.absSub': 'Absence list',
  tomorrow: 'Tomorrow', date: 'Date', sendWa: 'Send', next: 'Next person', replied: 'Replied', notReplied: 'No reply', waNone: 'Not sent', waSent: 'Sent', waReplied: 'Replied', upcomingFor: 'All upcoming sessions of a patient', pickPatient: 'Find patient…', lastSent: 'Appointments', noReminders: 'No appointments for this day.',
  callFor: 'Patient to call', callCopy: 'Copy script', callDial: 'Call', 'pbx.guide': 'First-time setup guide', 'pbx.g1': 'Least effort: a free SIP softphone (MicroSIP or Linphone) on the PC + a SIP account from a VoIP provider or your PBX; the app dials through tel: directly.', 'pbx.g2': 'With a landline: an FXO ATA adapter (e.g. Grandstream HT801) connects the line to your network (Ethernet or Wi-Fi) and exposes it as a SIP account.', 'pbx.g3': 'Fully open-source: Asterisk/FreePBX on a small PC with an FXO card/adapter; gives extensions and call recording.', 'pbx.g4': 'After installing: make the softphone the default tel: handler in Windows (Settings → Default apps), then press “Call” here.', 'pbx.note': 'Note: verify hardware and provider details for your country and availability.',
  makeLinks: "Create rating links for today's sessions", rateBase: 'Rating form URL is not set yet (Settings → Messages). Tokens only.', sendLink: 'Send link', 'bc.hint': 'Scan the receipt barcode with the reader (works on any screen) or type the code here.', find: 'Find', 'abs.streak': 'Missed in a row', 'abs.rate': 'Absence rate', 'abs.noone': 'No absentees.', status: 'Status', ratingMsg: 'Thank you for visiting {clinic}. Please rate your session: {url}'
});
const waLbl = { none: ['waNone', ''], sent: ['waSent', 'warn'], replied: ['waReplied', 'ok'] };
CD.views.tools = (root, arg) => {
  const items = [
    ...(CD.perms.includes('view_stats') ? [{ id: 'stats', icon: 'stats', title: t('st.title'), sub: t('st.sub'), open: true, body: CD.statsPanel }] : []),
    { id: 'wa', icon: 'chat', title: t('tl.wa'), sub: t('tl.waSub'), open: !CD.perms.includes('view_stats'), body: waPanel },
    { id: 'pbx', icon: 'phone', title: t('tl.pbx'), sub: t('tl.pbxSub'), body: pbxPanel },
    { id: 'rate', icon: 'star', title: t('tl.rate'), sub: t('tl.rateSub'), body: ratePanel },
    { id: 'bc', icon: 'barcode', title: t('tl.bc'), sub: t('tl.bcSub'), body: bcPanel },
    { id: 'abs', icon: 'userx', title: t('tl.abs'), sub: t('tl.absSub'), body: absPanel }];
  CD.mount(root, h('.hd', h('h1.h1', t('tl.title'))), CD.accordion(items, { key: 'tools' }));
};
function waPanel() {
  let mode = 'today', custom = CD.iso(); const list = h('div'), segHost = h('div');
  const dateOf = () => (mode === 'today' ? CD.iso() : mode === 'tomorrow' ? CD.addDays(CD.iso(), 1) : custom);
  let rows = [];
  const send = (r, idx = 0) => CD.try(async () => { await CD.sys('whatsapp', { phone: r.phones[idx], text: r.text }); if (r.wa === 'none' || !r.wa) await CD.call('setWaStatus', { ids: r.bookingIds, status: 'sent' }); load(); });
  const setSt = (r, st) => CD.try(async () => { await CD.call('setWaStatus', { ids: r.bookingIds, status: st }); load(); });
  async function load() {
    rows = await CD.call('reminderList', { date: dateOf() }).catch(() => []);
    CD.mount(list, rows.length ? h('table.tbl', h('tbody', rows.map((r) => { const [k, c] = waLbl[r.wa] || waLbl.none; return h('tr', h('td', h('b', r.name)), h('td.dim', { style: { direction: 'ltr', textAlign: 'start' } }, r.phones.join(' / ')), h('td', h('span.pill', { class: c }, t(k))),
      h('td', h('.row', h('button.btn.sm.pri', { onclick: () => send(r) }, ic('chat', 's'), t('sendWa')), r.phones[1] ? h('button.btn.sm', { onclick: () => send(r, 1) }, '2') : null, r.wa === 'replied' ? h('button.btn.sm', { onclick: () => setSt(r, 'sent') }, t('notReplied')) : h('button.btn.sm', { onclick: () => setSt(r, 'replied') }, ic('check', 's'), t('replied'))))); }))) : h('p.dim', t('noReminders')));
  }
  const draw = () => { CD.mount(segHost, h('.row.wrap', h('.seg', [['today', t('today')], ['tomorrow', t('tomorrow')], ['date', t('date')]].map(([k, l]) => h('button', { class: mode === k ? 'on' : '', onclick: () => { mode = k; draw(); load(); } }, l))), mode === 'date' ? h('input.in', { type: 'date', value: custom, style: { width: '170px' }, onchange: (e) => { custom = e.target.value; load(); } }) : null, h('.sp'),
    h('button.btn.pri', { onclick: () => { const n = rows.find((r) => !r.wa || r.wa === 'none'); if (n) send(n); } }, t('next'), ic(CD.lang === 'ar' ? 'left' : 'right', 's')))); };
  const one = h('div'); const qi = h('input.in', { placeholder: t('pickPatient') }), res = h('div', { style: { display: 'grid', gap: '6px' } });
  qi.oninput = async () => { const r = await CD.call('searchPatients', { q: qi.value, limit: 6 }).catch(() => []); CD.mount(res, r.map((p) => h('.row', h('span', p.name), h('.sp'), h('button.btn.sm', { onclick: () => CD.waPatient(p.id) }, ic('chat', 's'), t('sendWa'))))); };
  draw(); load();
  return h('div', { style: { display: 'grid', gap: '12px' } }, segHost, list, h('hr', { style: { border: 0, borderTop: '1px solid var(--line)', width: '100%' } }), h('b', t('upcomingFor')), qi, res);
}
function pbxPanel() {
  const qi = h('input.in', { placeholder: t('pickPatient') }), res = h('div', { style: { display: 'grid', gap: '6px' } }), out = h('div');
  qi.oninput = async () => { const r = await CD.call('searchPatients', { q: qi.value, limit: 6 }).catch(() => []); CD.mount(res, r.map((p) => h('button.btn.sm', { onclick: async () => { const c = await CD.call('callScript', { patientId: p.id }); CD.mount(out, h('.card.inset', { style: { display: 'grid', gap: '8px' } }, h('b', p.name + ' · ' + c.phone), h('p', { style: { margin: 0, whiteSpace: 'pre-wrap' } }, c.text), h('.row', h('button.btn.sm', { onclick: () => navigator.clipboard.writeText(c.text).then(() => CD.toast('✓')) }, t('callCopy')), h('button.btn.sm.pri', { onclick: () => CD.sys('open', 'tel:' + c.phone.replace(/[^\d+]/g, '')) }, ic('phone', 's'), t('callDial'))))); } }, p.name))); };
  const guide = CD.accordion([{ id: 'g', icon: 'info', title: t('pbx.guide'), body: () => h('div', { style: { display: 'grid', gap: '8px' } }, ['pbx.g1', 'pbx.g2', 'pbx.g3', 'pbx.g4'].map((k) => h('p', { style: { margin: 0 } }, '• ' + t(k))), CD.help(t('pbx.note'))) }]);
  return h('div', { style: { display: 'grid', gap: '12px' } }, h('b', t('callFor')), qi, res, out, guide);
}
function ratePanel() {
  const out = h('div');
  return h('div', { style: { display: 'grid', gap: '12px' } }, h('button.btn.pri', { onclick: () => CD.try(async () => {
    const r = await CD.call('createRatingLinks', { date: CD.iso() }); const s = CD.S; r.links = await CD.ratingPush(r.links.map((l) => ({ ...l, date: CD.iso() }))); r.base = r.base || (s.ratingApi && s.ratingApi.enabled);
    CD.mount(out, h('div', { style: { display: 'grid', gap: '8px' } }, r.base ? null : h('span.pill.warn', ic('warn', 's'), t('rateBase')), r.links.map((l) => h('.row', h('b', l.name), h('.sp'), h('code.dim', l.url || l.token), r.base ? h('button.btn.sm', { onclick: () => CD.sys('whatsapp', { phone: l.phone, text: t('ratingMsg', { clinic: (s.clinic && s.clinic.name) || '', url: l.url }) }) }, ic('chat', 's'), t('sendLink')) : null))));
  }) }, ic('star', 's'), t('makeLinks')), out);
}
function bcPanel() {
  const qi = h('input.in', { placeholder: 'CD000001', style: { maxWidth: '220px', direction: 'ltr' } });
  const go = () => CD.onScan(qi.value.trim().toUpperCase());
  qi.addEventListener('keydown', (e) => e.key === 'Enter' && (e.stopPropagation(), go()));
  return h('div', { style: { display: 'grid', gap: '10px' } }, CD.help(t('bc.hint')), h('.row', qi, h('button.btn', { onclick: go }, ic('search', 's'), t('find'))));
}
function absPanel() {
  const box = h('div'); CD.call('absentees', {}).then((rows) => CD.mount(box, rows.length ? h('table.tbl', h('thead', h('tr', h('th', t('name')), h('th', t('abs.streak')), h('th', t('abs.rate')), h('th', t('status')), h('th', t('actions')))), h('tbody', rows.map((a) => h('tr', h('td', h('b', a.name), ' ', CD.tagChips(a.tags)), h('td', h('span.pill', { class: a.streak >= (CD.S.absenceWarnAfter || 3) ? 'bad' : 'warn' }, a.streak)), h('td', Math.round(a.rate * 100) + '%'), h('td.dim', a.status),
    h('td', h('.row', h('button.btn.ico.sm', { 'data-tip': t('profile'), onclick: () => CD.openProfile(a.patientId), html: ic('eye', 's') }), h('button.btn.ico.sm', { 'data-tip': t('wa'), onclick: () => CD.waPatient(a.patientId), html: ic('chat', 's') }), h('button.btn.ico.sm', { 'data-tip': t('drop'), onclick: () => CD.try(async () => { if (await CD.confirm(t('dropQ'), { danger: true })) { await CD.call('dropPatient', { id: a.patientId }); CD.refresh(); } }), html: ic('userx', 's') }))))))) : h('p.dim', t('abs.noone'))));
  return box;
}

})();
