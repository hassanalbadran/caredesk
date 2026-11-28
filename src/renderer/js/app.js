'use strict';
(() => {
const { h, t, ic, $ } = CD;
CD.addDict({
  'nav.today': 'اليوم', 'nav.patients': 'المرضى', 'nav.calendar': 'الرئيسية', 'nav.tools': 'الأدوات', 'nav.alerts': 'التنبيهات', 'nav.settings': 'الإعدادات',
  welcomeUser: 'أهلاً {name}', logout: 'تسجيل الخروج', daysLeft: 'متبقٍ {n} يوم', lifetime: 'شكراً لك — ترخيص مدى الحياة', trial: 'تجربة مجانية', trialLeft: 'تجربة: متبقٍ {n} يوم', expSoon: 'ينتهي اشتراكك قريباً ({n} يوم) — جدّد لتجنب التوقف.', update: 'تحديث متوفر', noUpdate: 'أنت على أحدث إصدار', checkUpdate: 'التحقق من التحديثات', confirmEmailHint: 'بريدك غير مؤكَّد — أكّده لحماية حسابك.', scanNone: 'لم يُعثر على مريض بهذا الباركود',
  minimize: 'تصغير', maximize: 'تكبير', closeApp: 'إغلاق'
}, {
  'nav.today': 'Today', 'nav.patients': 'Patients', 'nav.calendar': 'Home', 'nav.tools': 'Tools', 'nav.alerts': 'Alerts', 'nav.settings': 'Settings',
  welcomeUser: 'Welcome {name}', logout: 'Sign out', daysLeft: '{n} days left', lifetime: 'Thank you — lifetime licence', trial: 'Free trial', trialLeft: 'Trial: {n} days left', expSoon: 'Your subscription ends soon ({n} days) — renew to avoid interruption.', update: 'Update available', noUpdate: 'You are up to date', checkUpdate: 'Check for updates', confirmEmailHint: 'Your email is not confirmed — confirm it to secure your account.', scanNone: 'No patient found for this barcode',
  minimize: 'Minimize', maximize: 'Maximize', closeApp: 'Close'
});
CD.views = {}; CD.perms = []; CD.route = { name: 'today', arg: null };
const NAV = [['calendar', 'today', 'view_calendar'], ['today', 'calendar', 'view_today'], ['patients', 'users', 'view_today'], ['tools', 'tools', 'use_tools'], ['settings', 'settings', null]];
const clinicName = () => (CD.S.clinic && CD.S.clinic.name) || '';

CD.layout = () => {
  const app = $('#app'); app.classList.remove('locked');
  app.replaceChildren(
    h('.title', h('b', 'CareDesk'), h('span.dim#ttl-clinic', clinicName() ? '· ' + clinicName() : ''), h('.sp'), h('.meta#ttl-meta'),
      CD.bell(), h('button.wb#upd', { 'data-tip': t('checkUpdate'), onclick: () => CD.checkUpdate(), html: ic('refresh', 's') }),
      h('button.wb', { 'data-tip': t('minimize'), onclick: () => CD.sys('win', { op: 'min' }), html: ic('minus', 's') }),
      h('button.wb', { 'data-tip': t('maximize'), onclick: () => CD.sys('win', { op: 'max' }), html: ic('max', 's') }),
      h('button.wb.x', { 'data-tip': t('closeApp'), onclick: () => CD.sys('win', { op: 'close' }), html: ic('x', 's') })),
    h('.body', h('nav.rail#rail', NAV.filter(([, , p]) => !p || CD.perms.includes(p)).map(([k, i]) => h('button', { id: 'nav-' + k, 'data-tip': t('nav.' + k), onclick: () => CD.go(k), html: ic(i) })), h('.sp'),
      h('button', { 'data-tip': t('logout'), onclick: CD.logout, html: ic('logout') })), h('main#main')),
    h('.foot', h('span#foot-user'), h('.sp'), h('span#foot-note'), h('span#foot-ver', 'CareDesk')));
  CD.renderMeta();
};
CD.renderMeta = () => {
  const st = CD.lic || {}, m = $('#ttl-meta'); if (!m) return; let lab = '';
  if (!CD.PAID) lab = ''; else if (st.status === 'active' && st.expiresAt == null) lab = t('lifetime');
  else if (st.status === 'trial') lab = t('trialLeft', { n: st.daysLeft }); else if (st.daysLeft != null) lab = t('daysLeft', { n: st.daysLeft });
  m.replaceChildren(...[h('span', (CD.user ? CD.user.name : '')), lab ? h('span.pill', { class: st.warn ? 'warn' : 'ok' }, lab) : null].filter(Boolean));
  const f = $('#foot-user'); if (f && CD.user) f.textContent = t('welcomeUser', { name: CD.user.name });
  const n = $('#foot-note'); if (n) n.textContent = (CD.PAID && st.warn) ? t('expSoon', { n: st.daysLeft }) : '';
  if (n && CD.account && !CD.account.emailVerified) n.textContent = (n.textContent ? n.textContent + ' · ' : '') + t('confirmEmailHint');
  const c = $('#ttl-clinic'); if (c) c.textContent = clinicName() ? '· ' + clinicName() : '';
};
CD.go = (name, arg) => {
  CD.route = { name, arg }; document.querySelectorAll('.rail button').forEach((b) => b.classList.toggle('on', b.id === 'nav-' + name));
  const main = $('#main'); main.replaceChildren(); const v = h('.view'); main.append(v); (CD.views[name] || (() => {}))(v, arg);
};
CD.refresh = () => CD.go(CD.route.name, CD.route.arg);
CD.logout = async () => { await CD.call('logout'); CD.user = null; CD.afterAuth(); };

CD.enterApp = async (target) => {
  const me = await CD.call('whoami'); CD.user = me.actor; CD.perms = me.perms; CD.role = me.role;
  CD.S = await CD.call('getSettings'); CD.applyLook(); CD.loadCustomFonts(); CD.account = await CD.sys('account');
  CD.layout(); CD.go(target && !target.startsWith('settings.') ? target : target ? 'settings' : (CD.perms.includes('view_calendar') ? 'calendar' : CD.perms.includes('view_today') ? 'today' : 'settings'), target && target.startsWith('settings.') ? target.split('.')[1] : null);
  if (localStorage.getItem('cd.justRegistered')) { localStorage.removeItem('cd.justRegistered'); CD.thanksDialog(); }
  CD.badge(); CD.timerWatch(); CD.startUpdateWatch(); CD.sys('info').then((i) => { const f = document.getElementById('foot-ver'); if (f) f.textContent = 'CareDesk v' + i.version; }).catch(() => {}); CD.call('sweep').then(CD.badge).catch(() => {});
};
CD.afterAuth = async (target) => {
  const r = await CD.call('whoami').catch(() => null);
  if (r) return CD.enterApp(target);
  const a = await CD.call('autoLogin'); if (a.ok) return CD.enterApp(target);
  CD.mount($('#app'), h('div#screen')); $('#app').classList.add('locked'); CD.Auth.picker(a.pick);
};
CD.showScreen = () => { const app = $('#app'); app.classList.add('locked'); app.replaceChildren(h('.title', h('b', 'CareDesk'), h('.sp'), h('button.wb.x', { onclick: () => CD.sys('win', { op: 'close' }), html: ic('x', 's') })), h('div#screen', { style: { overflow: 'auto' } })); };
CD.onLocked = () => { CD.showScreen(); CD.sys('license').then((st) => CD.Auth.lock(st)); };
CD.boot = async () => {
  CD.showScreen(); const st = await CD.sys('license'); CD.lic = st; CD.edition = await CD.sys('edition').catch(() => ({ paid: false })); CD.PAID = !!CD.edition.paid;
  if (!st.canUse) { CD.applyLook(); return CD.Auth.lock(st); }
  CD.S = await CD.call('getSettings').catch(() => ({ lang: 'ar', theme: 'system', customCursor: true })); CD.applyLook();
  const acc = await CD.sys('account');
  if (!acc && !localStorage.getItem('cd.welcomed')) return CD.Auth.welcome();
  CD.afterAuth();
};
CD.onScan = async (code) => { if (!CD.user) return; const p = await CD.call('barcodeLookup', { code }); if (p) CD.openProfile && CD.openProfile(p.id); else CD.toast(t('scanNone'), 'bad'); };
window.addEventListener('DOMContentLoaded', () => {
  CD.applyLook = CD.applyLook || (() => {}); CD.setLang('ar'); CD.applyCursor(true);
  window.cd.on('call:incoming', (r) => { if (CD.incomingCall) CD.incomingCall(r); });
  window.cd.on('license:changed', (st) => { CD.lic = st; if (!st.canUse) CD.onLocked(); else CD.renderMeta(); });
  window.cd.on('notify', () => CD.badge());
  setInterval(() => { if (CD.user && CD.lic) CD.badge(); }, 60000);
  CD.boot();
});

})();
