'use strict';
/* v0.1.1 extras: quick account menu, developer panel (F12), guided tour, sign-out screen, trial watermark, permission notes. */
(() => {
const { h, t, ic } = CD;
CD.addDict({
  'qm.title': 'إعدادات سريعة', 'qm.theme': 'الثيم', 'qm.lang': 'اللغة', 'qm.font': 'حجم الخط', 'qm.tour': 'جولة تعريفية', 'qm.settings': 'كل الإعدادات', 'qm.license': 'الاشتراك والحساب', 'qm.switch': 'تبديل المستخدم', 'qm.plan': 'الباقة',
  'tour.next': 'التالي', 'tour.prev': 'السابق', 'tour.skip': 'تخطي', 'tour.done': 'ابدأ العمل', 'tour.of': '{a} من {b}', 'tour.replay': 'إعادة الجولة التعريفية', 'tour.replaySub': 'شرح خطوة بخطوة لكل أقسام البرنامج',
  'tr.0': 'أهلاً بك في CareDesk 👋 جولة قصيرة تعرّفك على كل شيء. تقدر تتخطاها وتعيدها من الإعدادات.',
  'tr.1': 'هذي الشاشة الرئيسية: تقويم الشهر. كل يوم فيه زر لكل نوع جلسة وعليه عدد المراجعين. الأيام المغلقة تظهر باهتة.',
  'tr.2': 'اضغط زر نوع الجلسة ليفتح صفحة النوع وفيها بطاقة لكل جهاز (وقوائم المتأخرين والمنقطعين والإدامة)، واضغط الجهاز لتدخل جدول الساعات.',
  'tr.3': 'جدول الساعات: كل ساعة مربع، والمراجعون دوائر مرقمة بالدور. اضغط الدائرة لمؤقت الجلسة، واسحبها لساعة أو يوم آخر، وكليك يمين على أي ساعة لإضافة جلسة أو لصق جلسة منسوخة.',
  'tr.4': 'قسم المراجعين: أضف مراجعاً من زر «+»، وتجد قوائم المنتظمين والمنقطعين والإدامة والأرشيف.',
  'tr.5': 'عند إضافة مراجع: اختر الجلسات، ثم «توزيع تلقائي» أو اسحب أول جلستين على أيام الشهر. الأيام الممتلئة تظهر بحدّ أحمر، وشبه الممتلئة بأصفر، ويمكنك اختيارها مع ذلك. والترتيب السريع يحفظ النمط باسم مفهوم مثل «أحد ثلاثاء خميس».',
  'tr.6': 'الأدوات: إحصائيات حيّة للمدير، تذكيرات واتساب، دليل الاتصال، روابط التقييم، الباركود، واستيراد/تصدير الأسماء.',
  'tr.7': 'الجرس: تنبيهات الإدارة، وتنبيهات التنظيم (المؤقتات والمراجع التالي). يصلك أيضاً كل جديد وتحديثات البرنامج هنا.',
  'tr.8': 'الإعدادات: أوقات الدوام، أنواع الجلسات والأجهزة، فئات المراجعين، مصمم الوصل، الصلاحيات الدقيقة، والمظهر.',
  'tr.9': 'اضغط اسمك في الأعلى للإعدادات السريعة. وأي علامة ؟ تشرح لك العنصر بجانبها.',
  'tr.10': 'زر الصيانة: «فحص وإصلاح» (أو Ctrl+Shift+D) يفحص النظام ويصلح الأعطال تلقائياً بعد حفظ نسخة أمان ولا يحذف أي مراجع أو جلسة. ويظهر لك وحده عند رصد مشكلة. بالتوفيق!',
  'so.title': 'تم تسجيل الخروج', 'so.acct': 'الدخول بحساب CareDesk',
  'dev.title': 'أدوات المطوّر', 'dev.code': 'رمز الدخول', 'dev.bad': 'الرمز غير صحيح', 'dev.net': 'الشبكة', 'dev.offline': 'فصل الشبكة (وضع بلا إنترنت)', 'dev.hb': 'اتصال بالخادم الآن', 'dev.errors': 'سجل الأخطاء', 'dev.clear': 'مسح السجل', 'dev.copy': 'نسخ التشخيص', 'dev.tools': 'فتح أدوات Chromium', 'dev.state': 'حالة النظام', 'dev.noerr': 'لا أخطاء', 'dev.open': 'فتح',
  'wm.text': 'نسخة تجريبية · CareDesk',
  'pd.view_today': 'رؤية جلسات اليوم والمرضى.', 'pd.mark_attendance': 'تسجيل حضور المريض والتراجع عنه.', 'pd.add_patient': 'إضافة مرضى جدد وتوزيع جلساتهم.', 'pd.edit_patient': 'تعديل بيانات المريض وجدول جلساته.', 'pd.delete_patient': 'حذف مريض أو نقله للأرشيف نهائياً.', 'pd.view_calendar': 'فتح التقويم وإحصائياته.', 'pd.view_stats': 'رؤية الإحصائيات ولوحة المدير.', 'pd.view_income': 'رؤية المبالغ المالية (الأسعار والدخل والخسارة).', 'pd.reschedule': 'سحب الجلسات بين الساعات والأيام.', 'pd.cancel_session': 'حذف جلسة من الجدول.', 'pd.settings_look': 'تغيير المظهر واللغة والتحديث فقط، دون باقي الإعدادات.', 'pd.import_export': 'استيراد وتصدير أسماء المرضى.', 'pd.diagnostics': 'زر التشخيص والإصلاح التلقائي.', 'pd.use_tools': 'استخدام الأدوات: واتساب، الباركود، روابط التقييم.', 'pd.print': 'طباعة الوصولات.', 'pd.manage_settings': 'تغيير إعدادات البرنامج والعيادة والجلسات.', 'pd.manage_staff': 'إضافة السكرتارية وتعديل صلاحياتهم.', 'pd.backup': 'تصدير واستيراد النسخ الاحتياطية.', 'pd.view_audit': 'رؤية سجل النشاطات (من فعل ماذا ومتى).',
  'ra.title': 'ربط منصة التقييم (API)', 'ra.base': 'رابط المنصة (https)', 'ra.token': 'رمز الربط', 'ra.on': 'تفعيل الربط', 'ra.help': 'يتطلب باقة Pro أو أعلى. أدخل رابط المنصة والرمز الذي تعطيك إياه، وعند إنشاء روابط التقييم يُرسل الطلب للمنصة وتعود الروابط جاهزة.', 'ra.pro': 'هذه الميزة لباقة Pro وأعلى'
}, {
  'qm.title': 'Quick settings', 'qm.theme': 'Theme', 'qm.lang': 'Language', 'qm.font': 'Font size', 'qm.tour': 'Guided tour', 'qm.settings': 'All settings', 'qm.license': 'Subscription & account', 'qm.switch': 'Switch user', 'qm.plan': 'Plan',
  'tour.next': 'Next', 'tour.prev': 'Back', 'tour.skip': 'Skip', 'tour.done': 'Start working', 'tour.of': '{a} of {b}', 'tour.replay': 'Replay guided tour', 'tour.replaySub': 'Step-by-step walkthrough of every section',
  'tr.0': 'Welcome to CareDesk 👋 A short tour. You can skip it and replay it from Settings.',
  'tr.1': 'Main screen: the month calendar. Each day has a button per session type with the number of patients. Closed days look faded.',
  'tr.2': 'Click a session type to open its page with a card per device (plus laggard, dropped-out and maintenance lists); click a device to open the hour grid.',
  'tr.3': 'Hour grid: every hour is a square and patients are numbered circles in turn order. Click a circle for the session timer, drag it to another hour or day, and right-click any hour to add a session or paste a copied one.',
  'tr.4': 'Patients: add one with "+", and find active, dropped-out, maintenance and archived lists.',
  'tr.5': 'When adding a patient: pick sessions, then Auto distribute or drag the first two onto the month. Full days get a red border and nearly-full days yellow, and you can still pick them. Quick patterns are saved with a plain name like "Sun Tue Thu".',
  'tr.6': 'Tools: live manager statistics, WhatsApp reminders, call guide, rating links, barcode, and import/export of names.',
  'tr.7': 'Bell: admin alerts and organisational alerts (timers, next patient). News and app updates arrive here too.',
  'tr.8': 'Settings: working hours, session types and devices, patient classes, receipt designer, granular permissions, and look.',
  'tr.9': 'Click your name at the top for quick settings. Any ? icon explains the item beside it.',
  'tr.10': 'Maintenance: "Check & repair" (or Ctrl+Shift+D) scans the system and repairs faults automatically after saving a safety copy, never deleting any patient or session. It also appears by itself when a problem is detected. Good luck!',
  'so.title': 'Signed out', 'so.acct': 'Sign in with CareDesk account',
  'dev.title': 'Developer tools', 'dev.code': 'Access code', 'dev.bad': 'Wrong code', 'dev.net': 'Network', 'dev.offline': 'Cut network (offline mode)', 'dev.hb': 'Contact server now', 'dev.errors': 'Error log', 'dev.clear': 'Clear log', 'dev.copy': 'Copy diagnostics', 'dev.tools': 'Open Chromium DevTools', 'dev.state': 'System state', 'dev.noerr': 'No errors', 'dev.open': 'Open',
  'wm.text': 'Trial version · CareDesk',
  'pd.view_today': 'See today’s sessions and patients.', 'pd.mark_attendance': 'Mark a patient attended and undo it.', 'pd.add_patient': 'Add new patients and distribute their sessions.', 'pd.edit_patient': 'Edit patient data and session schedule.', 'pd.delete_patient': 'Delete a patient or archive permanently.', 'pd.view_calendar': 'Open the calendar and its statistics.', 'pd.view_stats': 'See statistics and the manager dashboard.', 'pd.view_income': 'See money amounts (prices, income, loss).', 'pd.reschedule': 'Drag sessions between hours and days.', 'pd.cancel_session': 'Delete a session from the schedule.', 'pd.settings_look': 'Change appearance, language and updates only — nothing else in Settings.', 'pd.import_export': 'Import and export patient names.', 'pd.diagnostics': 'Diagnostics and auto-repair button.', 'pd.use_tools': 'Use tools: WhatsApp, barcode, rating links.', 'pd.print': 'Print receipts.', 'pd.manage_settings': 'Change app, clinic and session settings.', 'pd.manage_staff': 'Add staff and edit their permissions.', 'pd.backup': 'Export and import backups.', 'pd.view_audit': 'See the activity log (who did what, when).',
  'ra.title': 'Rating platform link (API)', 'ra.base': 'Platform URL (https)', 'ra.token': 'Link token', 'ra.on': 'Enable link', 'ra.help': 'Requires Pro or higher. Enter the platform URL and the token it gives you; when you create rating links the request goes to the platform and ready links come back.', 'ra.pro': 'This feature needs Pro or higher'
});

// ---- error capture (shown in the developer panel) ----
CD.errLog = CD.errLog || [];
const logErr = (m) => { CD.errLog.push({ at: new Date().toLocaleTimeString(), m: String(m).slice(0, 400) }); if (CD.errLog.length > 200) CD.errLog.shift(); };
window.addEventListener('error', (e) => logErr(e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
window.addEventListener('unhandledrejection', (e) => logErr('Promise: ' + (e.reason && e.reason.message || e.reason)));

// ---- permission notes + role presets (used by Settings > staff) ----
CD.permNote = (p) => CD.help(t('pd.' + p));
CD.rolePreset = (role) => ((window.CD_PLANS.ROLE_PERMS || {})[role] || []).slice();

// ---- rating platform API (Pro+) ----
CD.ratingApiForm = (save) => {
  const c = (CD.S && CD.S.ratingApi) || {}; const pro = CD.lic && CD.lic.tier !== 'trial';
  const on = h('input.switch', { type: 'checkbox', checked: !!c.enabled, disabled: !pro }), base = h('input.in', { value: c.base || '', placeholder: 'https://…', style: { direction: 'ltr' }, disabled: !pro }), tok = h('input.in', { type: 'password', value: c.token || '', style: { direction: 'ltr' }, disabled: !pro });
  return h('div', { style: { display: 'grid', gap: '10px' } }, h('.row', h('b', t('ra.title')), CD.help(t('ra.help')), pro ? null : h('span.pill.warn', t('ra.pro'))), h('label.chk.row', on, t('ra.on')),
    h('label.fld', h('span', t('ra.base')), base), h('label.fld', h('span', t('ra.token')), tok),
    h('button.btn.pri', { disabled: !pro, onclick: () => save({ ratingApi: { enabled: on.checked, base: base.value.trim(), token: tok.value.trim() } }) }, ic('save', 's'), t('save')));
};
CD.ratingPush = async (links) => {
  const c = (CD.S && CD.S.ratingApi) || {}; if (!c.enabled || !CD.lic || CD.lic.tier === 'trial') return links;
  const r = await CD.sys('ratingApi', { base: c.base, token: c.token, items: links.map((l) => ({ token: l.token, name: l.name, date: l.date })) });
  if (!r.ok) { CD.toast('API: ' + r.code, 'bad'); return links; }
  return links.map((l) => (r.links[l.token] ? { ...l, url: r.links[l.token] } : l));
};

// ---- sign-out screen ----
CD.logout = async () => {
  await CD.call('logout'); CD.user = null; CD.showScreen();
  const list = await CD.call('listSecretaries').catch(() => []);
  if (!list.length) { const a = await CD.call('autoLogin'); return a.ok ? CD.enterApp() : CD.Auth.picker(a.pick || []); }
  CD.Auth.picker(list, true);
};

// ---- quick account menu ----
CD.quickMenu = (anchor) => {
  const st = CD.lic || {}; const S = CD.S || {};
  const save = (patch) => CD.try(async () => { CD.S = await CD.call('saveSettings', { patch }); CD.applyLook(); });
  const themes = h('.seg', ['dark', 'light', 'sand', 'ocean'].map((k) => h('button', { class: S.theme === k ? 'on' : '', onclick: async (ev) => { await save({ theme: k }); themes.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === ev.target)); } }, t('th.' + k))));
  const langs = h('.seg', ['ar', 'en'].map((l) => h('button', { class: CD.lang === l ? 'on' : '', onclick: async () => { await save({ lang: l }); CD.setLang(l); CD.layout(); CD.go(CD.route.name, CD.route.arg); } }, l === 'ar' ? 'العربية' : 'English')));
  const fs = h('input', { type: 'range', min: 0.85, max: 1.3, step: 0.05, value: S.fontScale || 1, onchange: (e) => save({ fontScale: Number(e.target.value) }) });
  const row = (lbl, el) => h('div', { style: { display: 'grid', gap: '4px' } }, h('small.dim', lbl), el);
  const item = (icon, lbl, fn) => h('button.btn.flat.sm', { style: { justifyContent: 'flex-start', width: '100%' }, onclick: () => { document.querySelectorAll('.pop').forEach((p) => { try { p.hidePopover(); } catch { /* ok */ } }); fn(); } }, ic(icon, 's'), lbl);
  CD.popover(anchor, h('div', { style: { display: 'grid', gap: '10px', minWidth: '230px' } },
    h('b', (CD.user && CD.user.name) || ''), CD.PAID ? h('small.dim', t('qm.plan') + ': ' + (st.tier || 'trial').toUpperCase() + (st.daysLeft != null ? ' · ' + st.daysLeft + 'd' : '')) : null,
    row(t('qm.theme'), themes), row(t('qm.lang'), langs), row(t('qm.font'), fs),
    item('settings', t('qm.settings'), () => CD.go('settings')), CD.PAID ? item('lock', t('qm.license'), () => CD.go('settings', 'license')) : item('lock', t('set.account'), () => CD.go('settings', 'license')),
    item('tools', t('dg.open'), () => CD.diagPanel()), item('info', t('qm.tour'), () => CD.tour(true)), item('users', t('qm.switch'), CD.logout)));
};
const baseRender = CD.renderMeta;
CD.renderMeta = () => { baseRender(); const m = document.getElementById('ttl-meta'); if (m && !m.dataset.q) { m.dataset.q = 1; m.classList.add('clk'); m.addEventListener('click', () => CD.quickMenu(m)); } };

// ---- trial watermark on printed receipts ----
const baseReceipt = CD.renderReceiptHTML;
CD.renderReceiptHTML = (...a) => {
  const html = baseReceipt(...a);
  if (!CD.lic || CD.lic.tier !== 'trial') return html;
  const wm = `<div style="position:fixed;inset:0;display:grid;place-items:center;pointer-events:none;z-index:9"><div style="transform:rotate(-30deg);font:700 7mm Arial,sans-serif;color:rgba(0,0,0,.13);white-space:nowrap;letter-spacing:1mm">${t('wm.text')}</div></div>`;
  return html.includes('</body>') ? html.replace('</body>', wm + '</body>') : html + wm;
};

// ---- guided tour ----
CD.tour = (force) => {
  if (!force && localStorage.getItem('cd.tour')) return;
  const steps = [
    { go: 'calendar', sel: null }, { go: 'calendar', sel: '#main .fcal' }, { go: 'calendar', sel: '#main .fday .tbtn, #main .fcal' }, { go: 'calendar', sel: '#nav-calendar' }, { go: 'patients', sel: '#nav-patients' },
    { go: 'patients', sel: '#main .view .btn.pri, #main .view button' }, { go: 'tools', sel: '#nav-tools' }, { go: 'calendar', sel: '#bell' }, { go: 'settings', sel: '#nav-settings' }, { go: 'calendar', sel: '#ttl-meta' }, { go: 'calendar', sel: '#ttl-meta' }];
  let i = 0; const ring = h('div', { style: { position: 'fixed', border: '2px solid var(--acc)', borderRadius: '12px', boxShadow: '0 0 0 9999px rgba(0,0,0,.55)', pointerEvents: 'none', transition: 'all .35s var(--ease)', zIndex: 1 } });
  const card = h('div.pop', { popover: 'manual', style: { maxWidth: '340px', position: 'fixed', zIndex: 2 } }); document.body.append(ring, card);
  const end = () => { localStorage.setItem('cd.tour', '1'); ring.remove(); try { card.hidePopover(); } catch { /* ok */ } card.remove(); CD.go('calendar'); };
  const show = () => {
    const s = steps[i]; if (CD.route.name !== s.go && CD.perms.includes('view_today')) CD.go(s.go);
    setTimeout(() => {
      const el = s.sel ? document.querySelector(s.sel) : null; const r = el ? el.getBoundingClientRect() : { left: innerWidth / 2 - 1, top: innerHeight / 2 - 1, width: 2, height: 2 };
      Object.assign(ring.style, { left: r.left - 6 + 'px', top: r.top - 6 + 'px', width: r.width + 12 + 'px', height: r.height + 12 + 'px', display: el ? '' : 'none' });
      card.replaceChildren(h('div', { style: { display: 'grid', gap: '10px' } }, h('div', { style: { lineHeight: 1.8 } }, t('tr.' + i)), h('small.dim', t('tour.of', { a: i + 1, b: steps.length })),
        h('.row', h('button.btn.flat.sm', { onclick: end }, t('tour.skip')), h('.sp'), i ? h('button.btn.sm', { onclick: () => { i--; show(); } }, t('tour.prev')) : null, h('button.btn.pri.sm', { onclick: () => { if (i === steps.length - 1) end(); else { i++; show(); } } }, i === steps.length - 1 ? t('tour.done') : t('tour.next')))));
      try { card.hidePopover(); } catch { /* ok */ } card.showPopover();
      const cr = card.getBoundingClientRect(); let top = r.top + r.height + 14; if (top + cr.height > innerHeight - 10) top = Math.max(10, r.top - cr.height - 14); if (!el) top = innerHeight / 2 - cr.height / 2;
      card.style.top = top + 'px'; card.style.left = Math.min(Math.max(10, r.left + r.width / 2 - cr.width / 2), innerWidth - cr.width - 10) + 'px';
    }, 120);
  };
  show();
};
const baseEnter = CD.enterApp; CD.enterApp = async (...a) => { await baseEnter(...a); setTimeout(() => CD.tour(), 600); };

// ---- developer panel (F12 + code) ----
CD.devPanel = async () => {
  const code = h('input.in', { type: 'password', autocomplete: 'off', placeholder: t('dev.code'), style: { direction: 'ltr' } });
  const go = async (close) => { const r = await CD.sys('devUnlock', { code: code.value }).catch(() => ({})); if (!r.ok) return CD.toast(t('dev.bad'), 'bad'); close(); open(); };
  CD.dialog({ title: t('dev.title'), cls: 'sm', body: h('div', { style: { display: 'grid', gap: '10px' } }, code), foot: (close) => [h('button.btn.pri', { onclick: () => go(close) }, t('dev.open'))] });
  code.addEventListener('keydown', (e) => { if (e.key === 'Enter') document.querySelector('dialog[open] .df .btn.pri').click(); }); setTimeout(() => code.focus(), 50);
  async function open() {
    const net = await CD.sys('devState').catch(() => ({})); const off = h('input.switch', { type: 'checkbox', checked: !!net.offline, onchange: (e) => CD.sys('devNet', { offline: e.target.checked }).then((r) => CD.toast(r.offline ? 'OFFLINE' : 'ONLINE')) });
    const info = h('pre', { style: { margin: 0, fontSize: '11px', direction: 'ltr', whiteSpace: 'pre-wrap', maxHeight: '160px', overflow: 'auto' } });
    const errs = h('pre', { style: { margin: 0, fontSize: '11px', direction: 'ltr', whiteSpace: 'pre-wrap', maxHeight: '180px', overflow: 'auto', color: 'var(--bad)' } });
    const refresh = async () => { const [l, i] = await Promise.all([CD.sys('license'), CD.sys('info')]); info.textContent = JSON.stringify({ license: l, app: i, lang: CD.lang, route: CD.route, user: CD.user && CD.user.name }, null, 1); errs.textContent = CD.errLog.length ? CD.errLog.map((x) => x.at + '  ' + x.m).join('\n') : t('dev.noerr'); };
    CD.dialog({ title: t('dev.title'), body: h('div', { style: { display: 'grid', gap: '14px' } },
      h('.row', h('b', t('dev.net')), h('.sp'), h('label.chk.row', off, t('dev.offline'))),
      h('.row', h('button.btn.sm', { onclick: () => CD.try(async () => { await CD.sys('heartbeat'); await refresh(); CD.toast('OK'); }) }, ic('refresh', 's'), t('dev.hb')), h('button.btn.sm', { onclick: () => CD.sys('devtools') }, ic('tools', 's'), t('dev.tools'))),
      h('b', t('dev.state')), info, h('.row', h('b', t('dev.errors')), h('.sp'), h('button.btn.sm', { onclick: () => { CD.errLog.length = 0; refresh(); } }, t('dev.clear')), h('button.btn.sm', { onclick: () => navigator.clipboard.writeText(info.textContent + '\n\n' + errs.textContent).then(() => CD.toast('OK')) }, t('dev.copy'))), errs) });
    refresh();
  }
};
window.addEventListener('keydown', (e) => { if (e.key === 'F12') { e.preventDefault(); if (!document.querySelector('dialog[open]')) CD.devPanel(); } });
})();
