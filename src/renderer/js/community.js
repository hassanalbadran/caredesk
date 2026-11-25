'use strict';
/* Open-source community edition UI: free welcome, terms, thank-you. Paid-tier screens stay in auth.js/plans and return when config "paid": true. */
(() => {
const { h, t, ic } = CD;
CD.addDict({
  'cm.free': 'برنامج مجاني ومفتوح المصدر', 'cm.intro': 'نظام لإدارة حجوزات العيادات وتذكيراتها — مجاني بالكامل ومفتوح المصدر.', 'cm.start': 'ابدأ الاستخدام', 'cm.optional': 'الحساب اختياري: يُستخدم لربط الأندرويد واستلام الرسائل والتحديثات.', 'cm.read': 'اقرأ الشروط', 'cm.terms': 'الشروط والخصوصية', 'cm.agree': 'فهمت', 'cm.thanksT': 'شكراً لانضمامك إلى CareDesk', 'cm.thanks': 'سُعدنا بانضمامك. التطبيق مجاني ومفتوح المصدر، وأرسلنا نسخة من الشروط إلى بريدك. إن واجهتك مشكلة فاضغط F12 أو زر التشخيص وسيحاول التطبيق إصلاحها دون فقدان أي بيانات.', 'cm.repo': 'المصدر على GitHub',
  'cm.t1': 'CareDesk برنامج مجاني ومفتوح المصدر يُقدَّم «كما هو» دون أي ضمان.', 'cm.t2': 'بيانات المرضى تُخزَّن محلياً على جهازك فقط، ولا تُرسل إلى أي جهة إلا ما تفعّله أنت بنفسه (النسخ الاحتياطي، ربط الأندرويد، تقارير الأخطاء).', 'cm.t3': 'تقارير الأخطاء تحتوي رمز الخطأ ووصفه واسم حسابك فقط، ولا تحتوي أسماء المرضى أو أرقامهم.', 'cm.t4': 'أنت المسؤول عن النسخ الاحتياطي لبياناتك وعن الالتزام بقوانين الخصوصية الطبية في بلدك.', 'cm.t5': 'يُمنع العبث بالتطبيق أو محاولة تجاوز صلاحياته؛ تُسجَّل هذه المحاولات وتُبلَّغ للمطوّر.', 'cm.t6': 'هذه نسخة تجريبية (0.1.0 بيتا 1): قد تتغيّر الشروط، وسنُعلمك داخل التطبيق.'
}, {
  'cm.free': 'Free & open-source software', 'cm.intro': 'Clinic booking and reminder system — completely free and open source.', 'cm.start': 'Get started', 'cm.optional': 'An account is optional: it is used for the Android link, messages and updates.', 'cm.read': 'read terms', 'cm.terms': 'Terms & privacy', 'cm.agree': 'Got it', 'cm.thanksT': 'Thank you for joining CareDesk', 'cm.thanks': 'We are glad you are here. The app is free and open source, and we emailed you a copy of the terms. If something goes wrong press F12 or the diagnostics button and the app will try to fix it without losing any data.', 'cm.repo': 'Source on GitHub',
  'cm.t1': 'CareDesk is free, open-source software provided "as is" without any warranty.', 'cm.t2': 'Patient data is stored locally on your computer only, and is sent nowhere except what you enable yourself (backup, Android link, error reports).', 'cm.t3': 'Error reports contain the error code, description and your account name only — never patient names or numbers.', 'cm.t4': 'You are responsible for backing up your data and for following medical-privacy laws in your country.', 'cm.t5': 'Tampering with the app or bypassing its permissions is prohibited; attempts are logged and reported to the developer.', 'cm.t6': 'This is a beta release (0.1.0 beta 1): terms may change and you will be told inside the app.'
});
CD.termsDialog = () => CD.dialog({ title: t('cm.terms'), cls: 'sm', body: h('ol', { style: { margin: 0, paddingInlineStart: '20px', display: 'grid', gap: '8px' } }, [1, 2, 3, 4, 5, 6].map((i) => h('li', t('cm.t' + i)))), foot: (close) => h('button.btn.pri', { onclick: () => close() }, t('cm.agree')) });
CD.thanksDialog = () => CD.dialog({ title: t('cm.thanksT'), cls: 'sm', body: h('p', { style: { margin: 0, lineHeight: 1.8 } }, t('cm.thanks')), foot: (close) => h('button.btn.pri', { onclick: () => close() }, t('cm.agree')) });
CD.Auth.welcomeFree = () => {
  const root = document.querySelector('#app'); const go = () => { localStorage.setItem('cd.welcomed', '1'); CD.afterAuth(); };
  const logo = h('div', { style: { textAlign: 'center' } }, h('div', { style: { fontSize: '34px', fontWeight: 700, color: 'var(--acc)' } }, 'CareDesk'), h('div.dim', 'v0.1.0-beta.2'));
  CD.mount(root, h('.auth', h('.card', logo, h('p', { style: { margin: 0, textAlign: 'center' } }, t('cm.intro')),
    h('button.btn.pri', { onclick: go }, t('cm.start')), h('small.dim', { style: { textAlign: 'center' } }, t('cm.optional')),
    h('.row', h('button.btn', { style: { flex: 1 }, onclick: CD.Auth.login }, t('haveAcc')), h('button.btn', { style: { flex: 1 }, onclick: CD.Auth.register }, t('create'))),
    h('button.btn.flat.sm', { onclick: CD.termsDialog }, t('cm.terms')), h('div.dim', { style: { textAlign: 'center', fontSize: '12px' } }, t('cm.free')))));
};
})();
