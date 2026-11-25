'use strict';
(() => {
const { h, t, ic } = CD;
CD.addDict({ 'alg.dropout_warn': 'معرّضون للانقطاع', 'alg.dropout_removed': 'أُزيلوا من الجدول', 'alg.free_gap': 'ساعات شاغرة', 'al.title': 'التنبيهات', 'al.none': 'لا توجد تنبيهات.', 'al.dropout_warn': 'مريض معرّض للانقطاع ({n} غيابات متتالية)', 'al.dropout_removed': 'أُزيل من الجدول بعد {n} غيابات', 'al.free_gap': 'ساعات شاغرة يوم {date}', resolve: 'تم', reorg: 'إعادة التنظيم' },
  { 'alg.dropout_warn': 'At risk of dropping out', 'alg.dropout_removed': 'Removed from schedule', 'alg.free_gap': 'Free hours', 'al.title': 'Alerts', 'al.none': 'No alerts.', 'al.dropout_warn': 'At risk of dropping out ({n} missed in a row)', 'al.dropout_removed': 'Removed from schedule after {n} misses', 'al.free_gap': 'Free hours on {date}', resolve: 'Done', reorg: 'Re-organise' });
CD.views.alerts = async (root) => {
  const list = await CD.call('listNotifications', {}).catch(() => []);
  const text = (n) => t('al.' + n.kind, { n: n.payload.streak, date: n.payload.date ? CD.fmtD(n.payload.date) : '' });
  const groups = ['dropout_warn', 'dropout_removed', 'free_gap'].map((k) => ({ k, rows: list.filter((n) => n.kind === k) })).filter((g) => g.rows.length);
  const icons = { dropout_warn: 'warn', dropout_removed: 'userx', free_gap: 'clock' };
  CD.mount(root, h('.hd', h('h1.h1', t('al.title'))), groups.length ? CD.accordion(groups.map((g) => ({ id: g.k, icon: icons[g.k], title: t('alg.' + g.k), badge: g.rows.length, open: true,
    body: () => h('div', { style: { display: 'grid', gap: '6px' } }, g.rows.map((n) => h('.slot', h('b', n.patientName || ''), h('span.dim', text(n)), h('.sp'), n.patientId ? h('button.btn.ico.sm', { onclick: () => CD.openProfile(n.patientId), html: ic('eye', 's') }) : null, n.kind === 'free_gap' ? h('button.btn.sm', { onclick: () => CD.showGap({ gaps: [] }) }, t('reorg')) : null, h('button.btn.sm', { onclick: () => CD.try(async () => { await CD.call('resolveNotification', { id: n.id }); CD.refresh(); CD.badge(); }) }, ic('check', 's'), t('resolve'))))) }))) : h('p.dim', t('al.none')));
};

})();
