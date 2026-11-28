'use strict';
/* MicroSIP softphone link: click-to-call buttons, incoming-call popup, Settings form. */
(() => {
const { h, t, ic, $ } = CD;
CD.addDict({ call: 'اتصال', 'cl.title': 'مكالمة واردة', 'cl.unknown': 'رقم غير مسجّل', 'cl.today': 'جلسات اليوم', 'cl.next': 'الجلسة القادمة', 'cl.none': 'لا جلسات اليوم', 'cl.open': 'فتح الملف', 'cl.add': 'إضافة مراجع جديد', 'cl.close': 'إغلاق',
    'cl.noms': 'MicroSIP غير مضبوط. حدّد مكان microsip.exe من الإعدادات ← الربط والتكامل.', 'cl.badnum': 'رقم الهاتف غير صالح', 'cl.fail': 'تعذّر تشغيل MicroSIP', 'cl.dialing': 'جارٍ الاتصال…',
    'ms.title': 'سنترال / MicroSIP', 'ms.help': 'اتصال بنقرة واحدة من ملف المراجع وقائمة اليوم، وظهور بطاقة المراجع تلقائياً عند ورود مكالمة. يعمل داخل الجهاز فقط (127.0.0.1) ولا يرسل أي شيء للإنترنت.', 'ms.enable': 'تفعيل الربط مع MicroSIP', 'ms.path': 'مسار microsip.exe', 'ms.pick': 'استعراض…', 'ms.found': 'تم العثور عليه', 'ms.missing': 'لم يُعثر على MicroSIP — حدّد المسار يدوياً',
    'ms.port': 'منفذ الاستقبال المحلي', 'ms.prefix': 'بادئة الخط الخارجي (اختياري)', 'ms.save': 'حفظ وتطبيق', 'ms.hook': 'تثبيت أمر المكالمات الواردة في MicroSIP', 'ms.hookDone': 'تمت الكتابة في MicroSIP.ini. أغلق MicroSIP تماماً (من أيقونة الساعة) ثم افتحه من جديد ليقرأ الإعداد.', 'ms.hookWarn': 'أغلق MicroSIP أولاً لأنه يعيد كتابة ملف الإعدادات عند الإغلاق.',
    'ms.test': 'تجربة مكالمة واردة', 'ms.running': 'الاستقبال يعمل على المنفذ', 'ms.stopped': 'الاستقبال متوقف', 'ms.busy': 'المنفذ مستخدم من برنامج آخر، اختر منفذاً غير ذلك', 'ms.badport': 'المنفذ يجب أن يكون بين 1024 و65535', 'ms.badpath': 'الملف المختار ليس microsip.exe', 'ms.ini': 'ملف الإعدادات', 'ms.hookLine': 'السطر المطلوب يدوياً' },
  { call: 'Call', 'cl.title': 'Incoming call', 'cl.unknown': 'Unknown number', 'cl.today': 'Today\'s sessions', 'cl.next': 'Next session', 'cl.none': 'No sessions today', 'cl.open': 'Open profile', 'cl.add': 'Add new patient', 'cl.close': 'Close',
    'cl.noms': 'MicroSIP is not set up. Choose microsip.exe in Settings → Integrations.', 'cl.badnum': 'Invalid phone number', 'cl.fail': 'Could not start MicroSIP', 'cl.dialing': 'Dialling…',
    'ms.title': 'PBX / MicroSIP', 'ms.help': 'One-click calling from the patient profile and today\'s list, and the patient card pops up automatically when a call comes in. Works on this PC only (127.0.0.1); nothing is sent to the internet.', 'ms.enable': 'Enable MicroSIP link', 'ms.path': 'microsip.exe path', 'ms.pick': 'Browse…', 'ms.found': 'Found', 'ms.missing': 'MicroSIP not found — choose the path manually',
    'ms.port': 'Local listening port', 'ms.prefix': 'Outside-line prefix (optional)', 'ms.save': 'Save & apply', 'ms.hook': 'Install incoming-call hook in MicroSIP', 'ms.hookDone': 'Written to MicroSIP.ini. Fully exit MicroSIP (tray icon → Exit) and start it again so it reads the setting.', 'ms.hookWarn': 'Close MicroSIP first: it rewrites its settings file when it exits.',
    'ms.test': 'Test an incoming call', 'ms.running': 'Listening on port', 'ms.stopped': 'Listener stopped', 'ms.busy': 'That port is used by another program, pick a different one', 'ms.badport': 'Port must be between 1024 and 65535', 'ms.badpath': 'The chosen file is not microsip.exe', 'ms.ini': 'Settings file', 'ms.hookLine': 'Line needed (manual)' });

const errText = (e) => { const c = (e && e.code) || (e && e.message) || ''; return t({ NO_MICROSIP: 'cl.noms', BAD_NUMBER: 'cl.badnum', LAUNCH_FAILED: 'cl.fail', PORT_BUSY: 'ms.busy', BAD_PORT: 'ms.badport', BAD_PATH: 'ms.badpath' }[c] || 'cl.fail'); };
CD.callPhone = async (phone) => { try { CD.toast(t('cl.dialing')); await CD.sys('dial', { phone }); } catch (e) { CD.toast(errText(e), 'bad'); } };
// button list for a patient with one or two numbers
CD.callPatient = async (patientId) => CD.try(async () => {
  const p = await CD.call('getPatient', { id: patientId }); const nums = [p.phone, p.phone2].filter(Boolean); if (!nums.length) return;
  if (nums.length === 1) return CD.callPhone(nums[0]);
  const d = CD.dialog({ title: t('pickPhone'), cls: 'sm', body: h('.grid', nums.map((n) => h('button.btn', { onclick: () => { d.close_(); CD.callPhone(n); } }, ic('phone', 's'), n))) });
});

// ---- incoming call card (top layer, never behind a dialog) ----
let popTimer = null;
CD.incomingCall = (r) => {
  let box = $('#callpop'); if (!box) { box = h('div#callpop', { popover: 'manual' }); document.body.append(box); }
  const close = () => { clearTimeout(popTimer); try { box.hidePopover(); } catch { /* ok */ } };
  const when = (b) => `${b.time || ''} · ${b.type_name || ''}${b.device_name ? ' · ' + b.device_name : ''}`;
  const body = !r.matches.length
    ? [h('b.cp-name', t('cl.unknown')), h('.row', h('button.btn.pri.sm', { onclick: () => { close(); CD.quickPatient({ phone: r.number }); } }, ic('plus', 's'), t('cl.add')))]
    : r.matches.map((m) => h('div.cp-pt', h('b.cp-name', m.name), m.today.length ? h('div.cp-list', h('small.dim', t('cl.today')), ...m.today.map((b) => h('div', when(b)))) : h('small.dim', t('cl.none')),
        m.next.length ? h('small.dim', `${t('cl.next')}: ${m.next[0].date} ${when(m.next[0])}`) : null,
        h('.row', h('button.btn.pri.sm', { onclick: () => { close(); CD.openProfile(m.id); } }, ic('eye', 's'), t('cl.open')))));
  CD.mount(box, [h('.cp-head', ic('phone', 's'), h('b', t('cl.title')), h('span.cp-num', { style: { direction: 'ltr' } }, r.number), h('.sp'), h('button.btn.ico.sm', { 'data-tip': t('cl.close'), onclick: close, html: ic('x', 's') })), ...body]);
  try { if (box.matches(':popover-open')) box.hidePopover(); box.showPopover(); } catch { /* ok */ }
  clearTimeout(popTimer); popTimer = setTimeout(close, 60000); try { CD.beep && CD.beep('ok'); } catch { /* ok */ }
};

// ---- Settings form ----
CD.microsipForm = () => {
  const box = h('.card.inset', { style: { padding: '12px', display: 'grid', gap: '10px' } });
  const en = h('input.switch', { type: 'checkbox' }), path = h('input.in', { dir: 'ltr', placeholder: 'C:\\Program Files\\MicroSIP\\microsip.exe' }), port = h('input.in', { type: 'number', min: 1024, max: 65535, value: 3848, dir: 'ltr' }), prefix = h('input.in', { inputmode: 'numeric', maxlength: 4, dir: 'ltr' });
  const info = h('small.dim'), ini = h('small.dim', { style: { direction: 'ltr', userSelect: 'text', wordBreak: 'break-all' } });
  const draw = (s) => { en.checked = !!s.enabled; path.value = s.path || s.found || ''; port.value = s.port || 3848; prefix.value = s.prefix || ''; info.textContent = (s.found ? '✓ ' + t('ms.found') + ' · ' : '⚠ ' + t('ms.missing') + ' · ') + (s.running ? t('ms.running') + ' ' + s.port : t('ms.stopped')); ini.textContent = s.ini ? t('ms.ini') + ': ' + s.ini : ''; };
  const load = () => CD.sys('msStatus').then(draw).catch(() => {});
  const apply = () => CD.try(async () => { try { draw(await CD.sys('msSet', { enabled: en.checked, path: path.value.trim(), port: port.value, prefix: prefix.value })); CD.toast(t('saved')); } catch (e) { CD.toast(errText(e), 'bad'); load(); } });
  const fld = (l, el) => h('label', { style: { display: 'grid', gap: '4px' } }, h('small.dim', l), el);
  CD.mount(box, [h('.row', ic('phone', 's'), h('b', t('ms.title'))), h('small.dim', t('ms.help')), h('label.chk.row', en, t('ms.enable')), fld(t('ms.path'), h('.row', path, h('button.btn.sm', { onclick: () => CD.try(async () => { const f = await CD.sys('msPick'); if (f) path.value = f; }) }, t('ms.pick')))),
    h('.grid.g2', fld(t('ms.port'), port), fld(t('ms.prefix'), prefix)), info, ini,
    h('.row.wrap', h('button.btn.pri', { onclick: apply }, ic('save', 's'), t('ms.save')),
      h('button.btn', { onclick: () => CD.try(async () => { if (!(await CD.confirm(t('ms.hookWarn')))) return; try { await apply_(); const r = await CD.sys('msInstallHook'); CD.toast(t('ms.hookDone')); ini.textContent = t('ms.ini') + ': ' + r.ini; } catch (e) { CD.toast(errText(e), 'bad'); } }) }, ic('download', 's'), t('ms.hook')),
      h('button.btn', { onclick: () => CD.sys('msTest', { number: '07700000000' }).catch(() => {}) }, ic('bell', 's'), t('ms.test')))]);
  const apply_ = async () => { draw(await CD.sys('msSet', { enabled: true, path: path.value.trim(), port: port.value, prefix: prefix.value })); };
  load(); return box;
};
})();
