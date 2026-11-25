'use strict';
/* Diagnostics: scan / safe auto-fix panel (Ctrl+Shift+D or quick menu), automatic prompt when the system detects a problem, error reporting to the maker. */
(() => {
const { h, t, ic } = CD;
CD.addDict({
  'dg.title': 'فحص النظام وإصلاحه', 'dg.scan': 'افحص الآن', 'dg.fix': 'إصلاح تلقائي', 'dg.ok': 'كل شيء سليم ✔', 'dg.found': 'تم رصد {n} مشكلة', 'dg.fixed': 'تم الإصلاح', 'dg.manual': 'يحتاج تدخلاً يدوياً', 'dg.auto': 'يُصلح تلقائياً',
  'dg.safe': 'قبل أي إصلاح تُحفظ نسخة أمان من بياناتك، ولا يُحذف أي مريض أو جلسة أبداً.', 'dg.confirm': 'سيجري الإصلاح التلقائي بعد حفظ نسخة أمان. لن يُحذف أي مريض أو جلسة. متابعة؟', 'dg.steps': 'خطوات المعالجة', 'dg.copy': 'نسخ التقرير',
  'dg.sent': 'تُرسل تفاصيل المشكلة (الرمز والوصف فقط، بدون أسماء مرضى) لمطوّر البرنامج ليساعدك.', 'dg.snap': 'نسخة الأمان', 'dg.sev.critical': 'حرج', 'dg.sev.medium': 'متوسط', 'dg.sev.low': 'بسيط', 'dg.scanning': 'جارٍ الفحص…',
  'dg.auto.title': 'رصد النظام مشكلة', 'dg.auto.body': 'اكتشف الفحص التلقائي {n} مشكلة ({codes}). هل تريد إصلاحها الآن؟ لن تُفقد أي بيانات.', 'dg.auto.fix': 'إصلاح الآن', 'dg.auto.later': 'لاحقاً', 'dg.auto.details': 'التفاصيل', 'dg.errs': 'تكررت أخطاء في الواجهة. يمكن فحص النظام وإصلاحه.', 'dg.open': 'فحص وإصلاح'
}, {
  'dg.title': 'System check & repair', 'dg.scan': 'Scan now', 'dg.fix': 'Auto-fix', 'dg.ok': 'Everything is healthy ✔', 'dg.found': '{n} problem(s) found', 'dg.fixed': 'Fixed', 'dg.manual': 'Needs manual action', 'dg.auto': 'Fixed automatically',
  'dg.safe': 'A safety copy of your data is saved before any repair, and no patient or session is ever deleted.', 'dg.confirm': 'Auto-fix runs after saving a safety copy. No patient or session will be deleted. Continue?', 'dg.steps': 'How to handle it', 'dg.copy': 'Copy report',
  'dg.sent': 'Problem details (code and description only, no patient names) are sent to the maker so he can help you.', 'dg.snap': 'Safety copy', 'dg.sev.critical': 'Critical', 'dg.sev.medium': 'Medium', 'dg.sev.low': 'Minor', 'dg.scanning': 'Scanning…',
  'dg.auto.title': 'A problem was detected', 'dg.auto.body': 'The automatic check found {n} problem(s) ({codes}). Fix now? No data will be lost.', 'dg.auto.fix': 'Fix now', 'dg.auto.later': 'Later', 'dg.auto.details': 'Details', 'dg.errs': 'The interface hit repeated errors. You can scan and repair the system.', 'dg.open': 'Check & repair'
});
const L = (o, k) => o[k + (CD.lang === 'ar' ? '_ar' : '_en')] || o[k] || '';
const nm = (c) => (CD.lang === 'ar' ? c.ar : c.en) || c.code;
let busy = false;

CD.diagPanel = () => CD.try(async () => {
  if (CD.perms && !CD.perms.includes('diagnostics')) return CD.toast(t('err.perm') || 'No permission', 'bad');
  const out = h('div', { style: { display: 'grid', gap: '10px' } }); let last = null;
  const draw = (r, fixedNow) => {
    last = r; const rows = r.findings || [];
    const cat = new Map((r.catalog || []).map((c) => [c.code, c]));
    CD.mount(out, [
      h('.row', h('b', rows.length ? t('dg.found', { n: rows.length }) : t('dg.ok')), h('.sp'), r.snapshot ? h('small.dim', `${t('dg.snap')} ✔`) : null),
      ...rows.map((f) => { const c = cat.get(f.code) || { code: f.code, sev: 'medium' }; const steps = (CD.lang === 'ar' ? c.steps_ar : c.steps_en) || [];
        return h('.card.inset', { style: { padding: '10px 12px', display: 'grid', gap: '6px' }, 'data-code': f.code }, h('.row', h('span.pill', { style: { direction: 'ltr' } }, f.code), h('b', nm(c)), h('.sp'), h('span.pill', { class: c.sev === 'critical' ? 'bad' : c.sev === 'low' ? '' : 'warn' }, t('dg.sev.' + (c.sev || 'medium'))), h('small', { style: { color: f.fixed ? 'var(--ok)' : 'var(--bad)' } }, f.fixed ? t('dg.fixed') : (c.auto ? t('dg.auto') : t('dg.manual'))), h('span.pill', '×' + f.count)),
          steps.length ? h('ul', { style: { margin: '0', paddingInlineStart: '18px', fontSize: '13px', opacity: .85 } }, steps.map((s) => h('li', s))) : null); }),
      h('small.dim', t('dg.safe')), h('small.dim', t('dg.sent'))]);
    fixBtn.disabled = !rows.some((f) => !f.fixed && (cat.get(f.code) || {}).auto);
  };
  const scan = async () => { CD.mount(out, h('p.dim', t('dg.scanning'))); draw(await CD.sys('diagnose', { fix: false })); };
  const fix = async () => { if (!(await CD.confirm(t('dg.confirm')))) return; const r = await CD.sys('diagnose', { fix: true }); draw(r); CD.toast(t('dg.fixed')); CD.reloadView && CD.reloadView(); };
  const fixBtn = h('button.btn.pri', { onclick: () => CD.try(fix) }, ic('tools', 's'), t('dg.fix'));
  const copy = () => navigator.clipboard.writeText(JSON.stringify(last, null, 1)).then(() => CD.toast('OK'));
  CD.dialog({ title: t('dg.title'), cls: 'wide', body: out, foot: (close) => [h('button.btn', { onclick: () => CD.try(scan) }, ic('refresh', 's'), t('dg.scan')), fixBtn, h('button.btn', { onclick: copy }, t('dg.copy')), h('.sp'), h('button.btn', { onclick: () => close() }, t('close') || 'x')] });
  await scan();
});

// ---- automatic detection: periodic silent scan + repeated UI errors → polite prompt (throttled to once per 6 h per signature)
const KEY = 'cd.diagPrompt'; const getSeen = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const setSeen = (o) => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* ok */ } };
const prompt = (title, body, onFix) => { const d = CD.dialog({ title, cls: 'sm', body: h('p', { style: { margin: 0 } }, body), foot: (close) => [h('button.btn', { onclick: () => close() }, t('dg.auto.later')), h('button.btn', { onclick: () => { close(); CD.diagPanel(); } }, t('dg.auto.details')), h('button.btn.pri', { onclick: () => { close(); onFix(); } }, t('dg.auto.fix'))] }); return d; };
CD.autoDiagnose = async () => {
  if (busy || !CD.user || document.querySelector('dialog[open]')) return; busy = true;
  try {
    const r = await CD.sys('diagnose', { fix: false }); const open = (r.findings || []).filter((f) => !f.fixed); if (!open.length) return;
    const sig = open.map((f) => f.code).sort().join(','); const seen = getSeen(); if (seen[sig] && Date.now() - seen[sig] < 6 * 3600e3) return; seen[sig] = Date.now(); setSeen(seen);
    prompt(t('dg.auto.title'), t('dg.auto.body', { n: open.length, codes: open.map((f) => f.code).join(' · ') }), async () => { await CD.try(async () => { await CD.sys('diagnose', { fix: true }); CD.toast(t('dg.fixed')); }); });
  } catch { /* the check must never disturb the user */ } finally { busy = false; }
};
// UI errors: report to the maker (deduplicated in main) and offer repair when they repeat
let errTimes = []; const sent = new Map();
const onErr = (msg) => {
  const k = String(msg).slice(0, 80); const now = Date.now();
  if (!sent.has(k) || now - sent.get(k) > 5 * 60000) { sent.set(k, now); CD.sys('reportError', { code: 'E901', desc: 'UI: ' + String(msg).slice(0, 240), solved: false }).catch(() => {}); }
  errTimes = errTimes.filter((x) => now - x < 60000); errTimes.push(now);
  if (errTimes.length >= 4 && !document.querySelector('dialog[open]')) { errTimes = []; const seen = getSeen(); if (!seen.ui || now - seen.ui > 6 * 3600e3) { seen.ui = now; setSeen(seen); prompt(t('dg.auto.title'), t('dg.errs'), async () => { await CD.try(async () => { await CD.sys('diagnose', { fix: true }); CD.toast(t('dg.fixed')); }); }); } }
};
window.addEventListener('error', (e) => onErr(e.message)); window.addEventListener('unhandledrejection', (e) => onErr('Promise: ' + (e.reason && e.reason.message || e.reason)));
let lastOpen = 0; const openDiag = () => { if (Date.now() - lastOpen < 600 || document.querySelector('dialog[open]')) return; lastOpen = Date.now(); CD.diagPanel(); };
// e.code (physical key) so it also works with the Arabic keyboard layout; main also forwards the shortcut as 'diag:open'
window.addEventListener('keydown', (e) => { if (e.ctrlKey && e.shiftKey && !e.altKey && (e.code === 'KeyD' || /^d$/i.test(e.key))) { e.preventDefault(); openDiag(); } });
if (window.cd && window.cd.on) window.cd.on('diag:open', openDiag);
const baseEnter = CD.enterApp; CD.enterApp = async (...a) => { await baseEnter(...a); setTimeout(CD.autoDiagnose, 4000); setInterval(CD.autoDiagnose, 20 * 60000); };
})();
