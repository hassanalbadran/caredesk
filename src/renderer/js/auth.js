'use strict';
(() => {
const { h, t, ic, $ } = CD;
CD.addDict({
  'welcome.sub': 'نظام إدارة الحجوزات والتذكيرات للعيادات', skip: 'تخطي — تجربة مجانية ١٤ يوماً', haveCode: 'لدي رمز تفعيل', haveAcc: 'لدي حساب بالفعل', create: 'إنشاء حساب', login: 'تسجيل الدخول', forgot: 'نسيت كلمة المرور؟',
  'plan.year': 'سنوي', 'plan.month': 'شهري', 'plan.life': 'مدى الحياة', 'per.year': '/ سنة', 'per.month': '/ شهر', 'per.once': 'دفعة واحدة', best: 'الأوفر',
  email: 'البريد الإلكتروني', phone: 'رقم الهاتف', username: 'اسم المستخدم', password: 'كلمة المرور', password2: 'تأكيد كلمة المرور', idOrEmail: 'اسم المستخدم أو البريد أو name@hasn.mr',
  promo: 'أوافق على استلام العروض والتحديثات الإعلانية', terms: 'أوافق على الشروط والأحكام وسياسة الخصوصية', 'google': 'المتابعة عبر Google', 'microsoft': 'المتابعة عبر Microsoft', or: 'أو',
  verify: 'تأكيد البريد', verify_sub: 'أدخل الرمز المكوّن من ٦ أرقام المرسل إلى بريدك (صالح ٥ دقائق، ويظهر في عنوان الرسالة).', code: 'الرمز', resend: 'إعادة الإرسال', later: 'لاحقاً', confirm_email: 'يرجى تأكيد بريدك الإلكتروني.',
  next: 'متابعة', back: 'رجوع', ok: 'موافق', cancel: 'إلغاء', confirm: 'تأكيد', save: 'حفظ', close: 'إغلاق', loading: 'جارٍ التحميل…', delete: 'حذف', edit: 'تعديل', add: 'إضافة', yes: 'نعم', no: 'لا', all: 'الكل',
  'oauth.soon': 'هذا الخيار يتطلب إعداد مفتاح OAuth من المطوّر.', 'lock.title': 'انتهت صلاحية الترخيص', 'lock.sub': 'اختر خطة للمتابعة أو أدخل رمز التفعيل.', 'lock.locked': 'تم قفل التطبيق على هذا الجهاز.',
  buy: 'شراء / تجديد', activate: 'تفعيل', actcode: 'رمز التفعيل', 'act.needLogin': 'سجّل الدخول أولاً لتفعيل الرمز.',
  'pick.title': 'من يستخدم التطبيق؟', pin: 'الرمز السري', enter: 'دخول', newpass: 'كلمة المرور الجديدة', oldpass: 'كلمة المرور الحالية', 'force.title': 'يجب تغيير كلمة المرور المؤقتة', recover: 'استعادة كلمة المرور', 'recover.sub': 'سنرسل رمزاً إلى بريدك.', send: 'إرسال',
  'err.BAD_LOGIN': 'بيانات الدخول غير صحيحة', 'err.LOCKED': 'محاولات كثيرة، حاول لاحقاً', 'err.BANNED': 'الحساب موقوف', 'err.DEVICE_LIMIT': 'تجاوزت عدد الأجهزة المسموح لهذا الحساب', 'err.BAD_USERNAME': 'اسم المستخدم: ٣–٢٤ حرفاً إنجليزياً/أرقام', 'err.BAD_EMAIL': 'بريد غير صالح', 'err.WEAK_PASSWORD': 'كلمة المرور ٨ أحرف على الأقل',
  'err.NO_SERVER': 'خدمة الحسابات غير مضبوطة بعد — ضع رابط الخادم من الإعدادات ← الحساب', 'err.OFFLINE': 'لا يوجد اتصال بالإنترنت أو الخادم لا يستجيب', 'err.BAD_URL': 'الرابط غير صحيح', 'err.USERNAME_TAKEN': 'اسم المستخدم مستخدم', 'err.EMAIL_TAKEN': 'البريد مستخدم', 'err.BAD_CODE': 'الرمز غير صحيح أو منتهٍ', 'err.CODE_USED': 'الرمز مستخدم سابقاً', 'err.TRIAL_USED': 'استُهلكت التجربة المجانية على هذا الجهاز', 'err.OFFLINE': 'لا يوجد اتصال بالخادم', 'err.NO_SERVER': 'رابط الخادم غير مُعدّ', 'err.WAIT': 'انتظر قليلاً', 'err.AUTH': 'سجّل الدخول أولاً', 'err.FORBIDDEN': 'لا تملك الصلاحية', 'err.LICENSE_LOCKED': 'التطبيق مقفل — الترخيص غير صالح', 'err.EXPIRED': 'انتهى الاشتراك', 'err.REVOKED': 'تم إلغاء الترخيص',
  pwmismatch: 'كلمتا المرور غير متطابقتين', need_terms: 'يجب الموافقة على الشروط', fill: 'أكمل الحقول المطلوبة'
}, {
  'welcome.sub': 'Clinic bookings & reminders', skip: 'Skip — free 14-day trial', haveCode: 'I have an activation code', haveAcc: 'I already have an account', create: 'Create account', login: 'Sign in', forgot: 'Forgot password?',
  'plan.year': 'Yearly', 'plan.month': 'Monthly', 'plan.life': 'Lifetime', 'per.year': '/ year', 'per.month': '/ month', 'per.once': 'one-time', best: 'Best value',
  email: 'Email', phone: 'Phone', username: 'Username', password: 'Password', password2: 'Confirm password', idOrEmail: 'Username, email or name@hasn.mr',
  promo: 'I agree to receive offers and promotional updates', terms: 'I agree to the Terms and Privacy Policy', google: 'Continue with Google', microsoft: 'Continue with Microsoft', or: 'or',
  verify: 'Confirm email', verify_sub: 'Enter the 6-digit code sent to your email (valid 5 minutes, shown in the subject line).', code: 'Code', resend: 'Resend', later: 'Later', confirm_email: 'Please confirm your email.',
  next: 'Continue', back: 'Back', ok: 'OK', cancel: 'Cancel', confirm: 'Confirm', save: 'Save', close: 'Close', loading: 'Loading…', delete: 'Delete', edit: 'Edit', add: 'Add', yes: 'Yes', no: 'No', all: 'All',
  'oauth.soon': 'This option needs an OAuth client ID configured by the developer.', 'lock.title': 'Licence expired', 'lock.sub': 'Choose a plan to continue, or enter an activation code.', 'lock.locked': 'The app is locked on this device.',
  buy: 'Buy / renew', activate: 'Activate', actcode: 'Activation code', 'act.needLogin': 'Sign in first to redeem a code.',
  'pick.title': 'Who is using the app?', pin: 'PIN', enter: 'Enter', newpass: 'New password', oldpass: 'Current password', 'force.title': 'You must change the temporary password', recover: 'Reset password', 'recover.sub': 'We will email you a code.', send: 'Send',
  'err.BAD_LOGIN': 'Wrong credentials', 'err.LOCKED': 'Too many attempts, try later', 'err.BANNED': 'Account suspended', 'err.DEVICE_LIMIT': 'Device limit reached for this account', 'err.BAD_USERNAME': 'Username: 3–24 letters/digits', 'err.BAD_EMAIL': 'Invalid email', 'err.WEAK_PASSWORD': 'Password needs 8+ characters',
  'err.NO_SERVER': 'The account service is not configured yet — set the server address in Settings → Account', 'err.OFFLINE': 'No internet connection or the server is not responding', 'err.BAD_URL': 'Invalid address', 'err.USERNAME_TAKEN': 'Username taken', 'err.EMAIL_TAKEN': 'Email already used', 'err.BAD_CODE': 'Wrong or expired code', 'err.CODE_USED': 'Code already used', 'err.TRIAL_USED': 'Free trial already used on this device', 'err.OFFLINE': 'Cannot reach the server', 'err.NO_SERVER': 'Server URL not configured', 'err.WAIT': 'Please wait a moment', 'err.AUTH': 'Sign in first', 'err.FORBIDDEN': 'Not allowed', 'err.LICENSE_LOCKED': 'App locked — licence invalid', 'err.EXPIRED': 'Subscription ended', 'err.REVOKED': 'Licence revoked',
  pwmismatch: 'Passwords do not match', need_terms: 'You must accept the terms', fill: 'Fill the required fields'
});
CD.addDict({
  'plan.monthly': 'شهري', 'plan.yearly': 'سنوي', 'plan.lifetime': 'مدى الحياة', 'per.monthly': 'شهرياً', 'per.yearly': 'سنوياً', 'per.lifetime': 'دفعة واحدة',
  eqYear: 'يعادل {v} في السنة', saveVs: 'وفّر {v}٪ مقارنة بالشهري', lifeVs: 'بدل {v} لخمس سنوات', best: 'الأقوى', buyPlan: 'اشترِ {p}', trialNote: 'التجربة المجانية ١٤ يوماً مع علامة مائية على الوصولات',
  'f.core': 'كل أدوات الحجوزات والتذكيرات', 'f.pc': '{n} جهاز حاسوب', 'f.android': 'ربط الأندرويد', 'f.sec': '{n} سكرتير/ة', 'f.unl': 'غير محدود', 'f.nowm': 'وصولات بدون علامة مائية', 'f.rate': 'روابط تقييم الجلسات (API)', 'f.early': 'تحديثات مبكرة', 'f.sup.weekly': 'دعم يوم بالأسبوع', 'f.sup.24/7': 'دعم ٢٤/٧', 'f.sup.priority': 'دعم ٢٤/٧ بأولوية',
  'err.PLAN_LIMIT': 'وصلت للحد الأعلى لباقتك — رقِّ الاشتراك لإضافة المزيد'
}, {
  'plan.monthly': 'Monthly', 'plan.yearly': 'Yearly', 'plan.lifetime': 'Lifetime', 'per.monthly': 'per month', 'per.yearly': 'per year', 'per.lifetime': 'one-time',
  eqYear: '= {v} per year', saveVs: 'Save {v}% vs monthly', lifeVs: 'instead of {v} for 5 years', best: 'Most powerful', buyPlan: 'Get {p}', trialNote: '14-day free trial, receipts carry a watermark',
  'f.core': 'All booking & reminder tools', 'f.pc': '{n} PC', 'f.android': 'Android link', 'f.sec': '{n} secretaries', 'f.unl': 'Unlimited', 'f.nowm': 'Receipts without watermark', 'f.rate': 'Session rating links (API)', 'f.early': 'Early updates', 'f.sup.weekly': 'Support 1 day/week', 'f.sup.24/7': '24/7 support', 'f.sup.priority': 'Priority 24/7 support',
  'err.PLAN_LIMIT': 'Plan limit reached — upgrade to add more'
});
const Auth = CD.Auth = {};
const root = () => $('#screen');
const fld = (label, input) => h('label.fld', h('span', label), input);
const inp = (type = 'text', ph = '', extra = {}) => h('input.in', { type, placeholder: ph, autocomplete: 'off', ...extra });
const logo = () => h('div', { style: { textAlign: 'center' } }, h('div', { style: { fontSize: '30px', fontWeight: 700, color: 'var(--acc)' } }, 'CareDesk'), h('div.dim', t('welcome.sub')), h('div.dim', { style: { fontSize: '11px' } }, 'v0.1.0-beta.2'));
const { PRICES: TP, TIERS: TT } = window.CD_PLANS;
const FEATS = (tier) => { const e = TT[tier]; return [
  [true, t('f.core')], [true, t('f.pc').replace('{n}', e.pc)], [e.android > 0, t('f.android')], [true, t('f.sec').replace('{n}', e.secretaries >= 99 ? t('f.unl') : e.secretaries)],
  [!e.watermark, t('f.nowm')], [e.ratingApi, t('f.rate')], [e.earlyUpdates, t('f.early')], [true, t('f.sup.' + e.support)]]; };
const plansRow = () => {
  let period = 'yearly', tier = 'pro'; const box = h('div', { style: { display: 'grid', gap: '10px' } });
  const per = (k) => h('button', { class: period === k ? 'on' : '', onclick: () => { period = k; draw(); } }, t('plan.' + k));
  const card = (k) => { const pr = TP[k][period], yr = TP[k].monthly * 12;
    const sub = period === 'monthly' ? t('eqYear').replace('{v}', '$' + yr.toFixed(2)) : period === 'yearly' ? t('saveVs').replace('{v}', Math.round((1 - pr / yr) * 100)) : t('lifeVs').replace('{v}', '$' + (TP[k].yearly * 5).toFixed(2));
    return h('button.plan', { class: (tier === k ? 'sel ' : '') + (k === 'max' ? 'best' : ''), onclick: () => { tier = k; draw(); } },
      h('b.t', k === 'pro' ? 'Pro' : 'Max'), k === 'max' ? h('span.pill.ok', t('best')) : null, h('b.pr', '$' + pr), h('small.dim', t('per.' + period)), h('small.sub', sub),
      h('ul.feat', FEATS(k).map(([ok, tx]) => h('li', { class: ok ? '' : 'no' }, h('i', ok ? '✓' : '—'), tx)))); };
  const draw = () => CD.mount(box, h('.seg', ['monthly', 'yearly', 'lifetime'].map(per)), h('.plans', card('pro'), card('max')),
    h('button.btn.pri', { onclick: async () => CD.sys('open', (await site()) + '?plan=' + tier + '&period=' + period) }, ic('link', 's'), t('buyPlan').replace('{p}', tier === 'pro' ? 'Pro' : 'Max')),
    h('small.dim', { style: { textAlign: 'center' } }, t('trialNote'))); draw(); return box; };
const site = async () => { const i = await CD.sys('info'); return i.site; };
const buyBtn = () => h('button.btn', { onclick: async () => CD.sys('open', await site()) }, ic('link', 's'), t('buy'));
const footer = () => !CD.PAID ? h('div.dim', { style: { textAlign: 'center', fontSize: '12px' } }, t('cm.free')) : h('div.dim', { style: { textAlign: 'center', fontSize: '12px' } }, h('a.clk', { onclick: async () => CD.sys('open', await site()), style: { color: 'var(--acc)' } }, 'Elaph Adnan'));
const oauthBtns = () => ['google', 'microsoft'].map((p) => h('button.btn', { onclick: () => CD.toast(t('oauth.soon')) }, t(p)));
const shell = (...kids) => CD.mount(root(), h('.auth', h('.card', ...kids)));

Auth.welcome = () => {
  if (!CD.PAID) return Auth.welcomeFree();
  shell(logo(), plansRow(),
    h('button.btn.pri', { onclick: () => { localStorage.setItem('cd.welcomed', '1'); CD.afterAuth(); } }, t('skip')),
    h('button.btn', { onclick: Auth.login }, t('haveAcc')), h('button.btn', { onclick: Auth.register }, t('create')),
    h('button.btn.flat', { onclick: () => { localStorage.setItem('cd.welcomed', '1'); CD.afterAuth('settings.license'); } }, t('haveCode')), footer());
};
Auth.login = () => {
  const id = inp('text', t('idOrEmail')), pw = inp('password', t('password'));
  const go = () => CD.try(async () => {
    const r = await CD.cloud('login', { id: id.value.trim(), password: pw.value });
    if (!r.ok) throw Object.assign(new Error(r.code), { code: r.code });
    if ((r.sub && r.sub.tempPass) || (r.account && r.account.tempPass && !r.sub)) return Auth.forceChange(pw.value);
    if (r.account && !r.account.emailVerified) CD.toast(t('confirm_email'));
    localStorage.setItem('cd.welcomed', '1'); CD.afterAuth();
  });
  pw.addEventListener('keydown', (e) => e.key === 'Enter' && go());
  shell(logo(), h('h3', { style: { margin: 0 } }, t('login')), fld(t('idOrEmail'), id), fld(t('password'), pw), h('button.btn.pri', { onclick: go }, t('login')),
    h('.row', h('hr', { style: { flex: 1, border: 0, borderTop: '1px solid var(--line)' } }), h('span.dim', t('or')), h('hr', { style: { flex: 1, border: 0, borderTop: '1px solid var(--line)' } })), ...oauthBtns(),
    h('.row', h('button.btn.flat.sm', { onclick: Auth.forgot }, t('forgot')), h('.sp'), h('button.btn.flat.sm', { onclick: Auth.register }, t('create'))), h('button.btn.flat.sm', { onclick: Auth.welcome }, t('back')), footer());
};
Auth.register = () => {
  const f = { email: inp('email'), phone: inp('tel'), username: inp('text'), pw: inp('password'), pw2: inp('password') };
  const promo = h('input', { type: 'checkbox' }), terms = h('input', { type: 'checkbox' });
  const go = () => CD.try(async () => {
    if (!f.email.value || !f.username.value || !f.pw.value) throw new Error(t('fill'));
    if (f.pw.value !== f.pw2.value) throw new Error(t('pwmismatch'));
    if (!terms.checked) throw new Error(t('need_terms'));
    const r = await CD.cloud('register', { email: f.email.value.trim(), phone: CD.nd(f.phone.value.trim()), username: f.username.value.trim(), password: f.pw.value, promo: promo.checked });
    if (!r.ok) throw Object.assign(new Error(r.code), { code: r.code });
    try { localStorage.setItem('cd.justRegistered', '1'); } catch { /* ok */ }
    Auth.verify(r.id, f.email.value.trim(), { id: f.username.value.trim(), pw: f.pw.value });
  });
  shell(logo(), h('h3', { style: { margin: 0 } }, t('create')), fld(t('email'), f.email), fld(t('phone'), f.phone), fld(t('username'), f.username), fld(t('password'), f.pw), fld(t('password2'), f.pw2),
    h('label.chk.row', promo, t('promo')), h('label.chk.row', terms, h('span', t('terms'), ' ', h('a.clk', { style: { color: 'var(--acc)' }, onclick: (e) => { e.preventDefault(); CD.termsDialog(); } }, '(' + t('cm.read') + ')'))), h('button.btn.pri', { onclick: go }, t('create')), h('button.btn.flat.sm', { onclick: Auth.welcome }, t('back')), footer());
};
Auth.verify = (id, email, creds) => {
  const code = inp('text', '______', { inputmode: 'numeric', maxlength: 6, style: 'text-align:center;font-size:24px;letter-spacing:8px' });
  const go = () => CD.try(async () => {
    const r = await CD.cloud('verifyEmail', { id, code: CD.nd(code.value) }); if (!r.ok) throw Object.assign(new Error(r.code), { code: r.code });
    const l = await CD.cloud('login', { id: creds.id, password: creds.pw }); if (l.ok) { localStorage.setItem('cd.welcomed', '1'); CD.afterAuth(); } else Auth.login();
  });
  shell(logo(), h('h3', { style: { margin: 0 } }, t('verify')), h('p.dim', { style: { margin: 0 } }, t('verify_sub'), ' ', email), code, h('button.btn.pri', { onclick: go }, t('confirm')),
    h('.row', h('button.btn.sm', { onclick: () => CD.try(async () => { const r = await CD.cloud('resendCode', { id }); if (!r.ok) throw Object.assign(new Error(r.code), { code: r.code }); CD.toast('✓'); }) }, t('resend')), h('.sp'),
      h('button.btn.flat.sm', { onclick: async () => { const l = await CD.cloud('login', { id: creds.id, password: creds.pw }); if (l.ok) { localStorage.setItem('cd.welcomed', '1'); CD.afterAuth(); } else Auth.login(); } }, t('later'))));
};
Auth.forgot = () => {
  const em = inp('email'), code = inp('text', '', { maxlength: 6 }), np = inp('password'); let sent = false;
  const body = h('div', { style: { display: 'grid', gap: '12px' } });
  const draw = () => CD.mount(body, fld(t('email'), em), sent ? [fld(t('code'), code), fld(t('newpass'), np)] : null,
    h('button.btn.pri', { onclick: () => CD.try(async () => {
      if (!sent) { await CD.cloud('forgot', { email: em.value.trim() }); sent = true; draw(); return; }
      const r = await CD.cloud('resetPassword', { email: em.value.trim(), code: CD.nd(code.value), newPassword: np.value }); if (!r.ok) throw Object.assign(new Error(r.code), { code: r.code }); CD.toast('✓'); Auth.login();
    }) }, sent ? t('save') : t('send')));
  draw(); shell(logo(), h('h3', { style: { margin: 0 } }, t('recover')), h('p.dim', { style: { margin: 0 } }, t('recover.sub')), body, h('button.btn.flat.sm', { onclick: Auth.login }, t('back')));
};
Auth.forceChange = (old) => {
  const np = inp('password'), np2 = inp('password');
  shell(logo(), h('h3', { style: { margin: 0 } }, t('force.title')), fld(t('newpass'), np), fld(t('password2'), np2), h('button.btn.pri', { onclick: () => CD.try(async () => {
    if (np.value !== np2.value) throw new Error(t('pwmismatch'));
    const r = await CD.cloud('changePassword', { oldPassword: old, newPassword: np.value }); if (!r.ok) throw Object.assign(new Error(r.code), { code: r.code }); CD.afterAuth();
  }) }, t('save')));
};
// Shown whenever the licence is unusable (expired / locked / tamper). Works offline: self-locks, only redeem/buy remain.
Auth.lock = (st) => {
  const code = inp('text', 'XXXX-XXXX-XXXX');
  shell(logo(), h('.lock', ic('lock'), h('h3', { style: { margin: 0 } }, t('lock.title')), h('p.dim', { style: { margin: 0 } }, st && st.reason ? t('lock.locked') + ' (' + st.reason + ')' : t('lock.sub'))), plansRow(), buyBtn(),
    fld(t('actcode'), code), h('button.btn.pri', { onclick: () => CD.try(async () => {
      const acc = await CD.sys('account'); if (!acc) { CD.toast(t('act.needLogin'), 'bad'); return Auth.login(); }
      const r = await CD.cloud('redeem', { code: code.value }); if (!r.ok) throw Object.assign(new Error(r.code), { code: r.code }); CD.boot();
    }) }, t('activate')), h('.row', h('button.btn.sm', { onclick: Auth.login }, t('login')), h('.sp'), h('button.btn.flat.sm', { onclick: () => CD.sys('heartbeat').then(CD.boot) }, ic('refresh', 's'), t('loading').replace('…', ''))), footer());
};
Auth.picker = (list, out) => {
  const sel = h('select.in', list.map((s) => h('option', { value: s.id }, s.name))), pin = inp('password', t('pin'));
  const go = () => CD.try(async () => { const r = await CD.call('loginSecretary', { id: Number(sel.value), code: pin.value }); if (!r.ok) throw Object.assign(new Error('BAD_LOGIN'), { code: 'BAD_LOGIN' }); CD.enterApp(); });
  pin.addEventListener('keydown', (e) => e.key === 'Enter' && go());
  shell(logo(), h('h3', { style: { margin: 0 } }, out ? t('so.title') : t('pick.title')), sel, pin, h('button.btn.pri', { onclick: go }, t('enter')),
    out ? h('.row', h('button.btn.flat.sm', { onclick: Auth.login }, t('so.acct')), h('.sp'), h('button.btn.flat.sm', { onclick: Auth.register }, t('create'))) : null);
};

})();
