'use strict';
/* Title-bar bell: administrative vs organizational notifications + global timer watcher. */
(() => {
const { h, t, ic } = CD;
CD.addDict({
  'nf.title': 'الإشعارات', 'nf.admin': 'إدارية', 'nf.org': 'تنظيمية', 'nf.none': 'لا توجد إشعارات', 'nf.running': 'جلسات جارية', 'nf.waiting': 'مرضى الساعة الحالية بلا مؤقت', 'nf.next': 'التالي', 'nf.set': 'ضبط المؤقت', 'nf.over': 'انتهى وقت', 'nf.done': 'تم', 'nf.noOrg': 'لا جلسات جارية الآن',
  'al.laggard_confirm': 'متلكئ — اتصل لتأكيد حضوره ({date})', 'al.dropped_call': 'منقطع — يحتاج اتصالاً أو رسالة اليوم', 'al.maintenance_remind': 'جلسة إدامة غداً — ذكّر المريض ({date})', 'alg.laggard_confirm': 'تأكيد حضور المتلكئين', 'alg.dropped_call': 'المنقطعون — اتصال يومي', 'alg.maintenance_remind': 'تذكير الإدامة'
}, {
  'nf.title': 'Notifications', 'nf.admin': 'Administrative', 'nf.org': 'Organizational', 'nf.none': 'No notifications', 'nf.running': 'Running sessions', 'nf.waiting': 'Current-hour patients without a timer', 'nf.next': 'Next', 'nf.set': 'Set timer', 'nf.over': 'Time is up for', 'nf.done': 'Done', 'nf.noOrg': 'No running sessions right now',
  'al.laggard_confirm': 'Laggard — call to confirm attendance ({date})', 'al.dropped_call': 'Dropped-out — needs a call or message today', 'al.maintenance_remind': 'Maintenance session tomorrow — remind the patient ({date})', 'alg.laggard_confirm': 'Confirm laggards', 'alg.dropped_call': 'Dropped-out — daily call', 'alg.maintenance_remind': 'Maintenance reminders'
});
let skew = 0, last = null; const warned = new Set();
const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
const remain = (b) => b.timer_start + b.timer_min * 60000 - (Date.now() + skew);
CD.bell = () => h('button.wb.bell#bell', { 'data-tip': t('nf.title'), onclick: (e) => CD.notifPanel(e.currentTarget), html: ic('bell', 's') + '<span class="badge" hidden></span>' });
CD.badge = async () => { try { const n = (await CD.call('listNotifications', {})).length + (await CD.notices()).filter((x) => !x.seen).length; const b = document.querySelector('#bell .badge'); if (b) { b.hidden = !n; b.textContent = n; } } catch { /* ignore */ } };
CD.notifPanel = async (anchor) => {
  let tab = (CD.perms.includes('view_today') ? 'org' : 'admin'); const body = h('div', { style: { display: 'grid', gap: '8px', maxHeight: '60vh', overflow: 'auto' } }); let pop, live = [];
  const seg = h('.seg'); const draw = async () => {
    CD.mount(seg, ['org', 'admin'].map((k) => h('button', { class: k === tab ? 'on' : '', onclick: () => { tab = k; draw(); } }, t('nf.' + k)))); live = [];
    if (tab === 'admin') {
      const nts = await CD.notices(); const list = await CD.call('listNotifications', {}).catch(() => []); const text = (n) => t('al.' + n.kind, { n: n.payload.streak, date: n.payload.date ? CD.fmtD(n.payload.date) : '' });
      CD.mount(body, nts.length ? [h('small.dim', t('up.noticesT')), nts.map((n) => h('.slot', { style: { display: 'grid', gap: '2px' } }, h('b', n.title || ''), h('div.dim', { style: { fontSize: '12px', whiteSpace: 'pre-wrap' } }, n.body || ''))), CD.markNotices(nts) || null] : null, list.length ? list.map((n) => h('.slot', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, h('div', h('b', n.patientName || ''), h('div.dim', { style: { fontSize: '12px' } }, text(n))), h('.sp'), n.patientId ? h('button.btn.ico.sm', { onclick: () => { pop.hidePopover(); CD.openProfile(n.patientId); }, html: ic('users', 's') }) : null, h('button.btn.ico.sm', { 'data-tip': t('nf.done'), onclick: async () => { await CD.call('resolveNotification', { id: n.id }); CD.badge(); draw(); }, html: ic('check', 's') }))  ) : (nts.length ? null : h('p.dim', t('nf.none'))));
    } else {
      const d = await CD.call('listTimers').catch(() => ({ running: [], waiting: [], now: Date.now() })); skew = d.now - Date.now(); last = d;
      const run = d.running.map((b) => { const lv = h('b', ''); live.push([b, lv]); return h('.slot', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, h('div', h('b', b.patient_name), h('div.dim', { style: { fontSize: '12px' } }, `${b.device_name || '—'} · ${t('nf.next')}: ${b.next_name || '—'}`)), h('.sp'), lv); });
      const wait = d.waiting.map((b) => h('.slot', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, h('div', h('b', b.patient_name), h('div.dim', { style: { fontSize: '12px' } }, `${b.device_name || '—'} · ${CD.fmtT(b.time)}`)), h('.sp'), h('button.btn.sm.pri', { onclick: async () => { try { await CD.call('startTimer', { id: b.id }); CD.beep('ok'); draw(); } catch (e) { CD.toast(e.message, 'bad'); } } }, t('nf.set'))));
      CD.mount(body, run.length ? [h('small.dim', t('nf.running')), run] : h('p.dim', t('nf.noOrg')), wait.length ? [h('small.dim', t('nf.waiting')), wait] : null);
      paint();
    }
  };
  const paint = () => live.forEach(([b, el]) => { const r = remain(b); el.textContent = r > 0 ? mmss(r) : '+' + mmss(-r); el.style.color = r > 0 ? '' : 'var(--bad)'; });
  pop = CD.popover(anchor, h('div', { style: { minWidth: '340px', display: 'grid', gap: '10px' } }, h('b', t('nf.title')), seg, body)); await draw();
  const iv = setInterval(() => { if (!pop.isConnected) return clearInterval(iv); paint(); }, 1000);
};
// global watcher: sound + toast once per overdue timer, from anywhere in the app
CD.timerWatch = async () => {
  if (!CD.user || !CD.perms.includes('view_today')) return;
  try { const d = await CD.call('listTimers'); skew = d.now - Date.now(); last = d; } catch { return; }
};
setInterval(() => {
  if (!CD.user || !last) return;
  for (const b of last.running) { if (b.timer_start && remain(b) <= 0 && !warned.has(b.id + ':' + b.timer_start)) { warned.add(b.id + ':' + b.timer_start); if (CD.route.name !== 'device') { CD.beep('timer'); CD.toast(`${t('nf.over')} ${b.patient_name} · ${b.device_name || ''}`, 'bad'); } } }
}, 1000);
setInterval(() => CD.timerWatch(), 15000);
})();
