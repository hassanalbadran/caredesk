'use strict';
/* In-app updates (GitHub releases) + developer notices. No browser is ever opened. */
(() => {
const { h, t, ic, $ } = CD;
CD.addDict({ 'up.title': 'تحديث التطبيق', 'up.new': 'يتوفر إصدار جديد', 'up.cur': 'الإصدار الحالي', 'up.notes': 'ما الجديد', 'up.go': 'تنزيل وتثبيت الآن', 'up.dl': 'جارٍ التنزيل…', 'up.later': 'لاحقاً', 'up.none': 'أنت على أحدث إصدار', 'up.offline': 'تعذّر الاتصال — جرّب لاحقاً', 'up.norepo': 'مستودع التحديثات غير مضبوط بعد', 'up.noasset': 'لا يوجد ملف تثبيت في هذا الإصدار', 'up.fail': 'فشل التنزيل', 'up.noticesT': 'رسائل من المطوّر', 'up.installing': 'سيُغلق التطبيق ويبدأ التثبيت', 'up.ready': 'التحديث جاهز ومنزَّل. سيُثبَّت تلقائياً عند إغلاق التطبيق، أو الآن إن أردت.', 'up.restart': 'إعادة التشغيل والتحديث الآن' },
  { 'up.title': 'App update', 'up.new': 'A new version is available', 'up.cur': 'Current version', 'up.notes': "What's new", 'up.go': 'Download & install now', 'up.dl': 'Downloading…', 'up.later': 'Later', 'up.none': 'You are on the latest version', 'up.offline': 'Could not connect — try later', 'up.norepo': 'Update repository is not configured yet', 'up.noasset': 'This release has no installer file', 'up.fail': 'Download failed', 'up.noticesT': 'Messages from the developer', 'up.installing': 'The app will close and the installer will start', 'up.ready': 'The update is downloaded. It installs automatically when you close the app, or now if you prefer.', 'up.restart': 'Restart and update now' });
CD.updateDialog = (r) => {
  const st = h('small.dim', ''); const btn = h('button.btn.pri', '');
  const d = CD.dialog({ title: t('up.title'), cls: 'sm', body: h('div', { style: { display: 'grid', gap: '10px' } }, h('b', { style: { fontSize: '16px' } }, `${t('up.new')}: v${r.version}`), h('small.dim', `${t('up.cur')}: v${r.current}`), r.ready ? h('small', { style: { color: 'var(--ok, #8EB69B)' } }, t('up.ready')) : null, r.notes ? h('div', h('small.dim', t('up.notes')), h('pre', { style: { whiteSpace: 'pre-wrap', margin: '4px 0 0', maxHeight: '180px', overflow: 'auto', fontFamily: 'inherit', fontSize: '13px' } }, r.notes)) : null, st),
    foot: (close) => [h('button.btn', { onclick: () => close() }, t('up.later')), Object.assign(btn, { textContent: r.ready ? t('up.restart') : t('up.go'), onclick: async () => { if (!r.url && !r.ready) return CD.toast(t('up.noasset'), 'bad'); btn.disabled = true; st.textContent = r.ready ? t('up.installing') : t('up.dl'); try { const f = r.ready ? { file: '' } : await CD.sys('downloadUpdate', { url: r.url }); st.textContent = t('up.installing'); await CD.sys('installUpdate', { file: f.file }); } catch (e) { btn.disabled = false; st.textContent = ''; CD.toast(t('up.fail') + ': ' + (e.message || ''), 'bad'); } } })] });
  return d;
};
CD.checkUpdate = async (silent) => {
  let r; try { r = await CD.sys('checkUpdates'); } catch (e) { r = { ok: false, code: 'OFFLINE' }; }
  const u = $('#upd'); if (u) u.classList.toggle('on', !!(r && r.ok && r.newer));
  if (!r.ok) { if (!silent) CD.toast(r.code === 'NO_REPO' ? t('up.norepo') : t('up.offline'), r.code === 'NO_REPO' ? '' : 'bad'); return r; }
  if (r.newer) { CD.latestUpdate = r; if (!silent || !sessionStorage.getItem('cd.upShown')) { sessionStorage.setItem('cd.upShown', '1'); CD.updateDialog(r); } } else if (!silent) CD.toast(t('up.none'));
  return r;
};
// notices pushed from the developer's server (GAS "notices" action): shown once, listed in the bell
CD.notices = async () => { try { const r = await CD.sys('notices'); if (!r || !r.ok) return []; const seen = JSON.parse(localStorage.getItem('cd.notices') || '[]'); return (r.items || []).map((n) => ({ ...n, seen: seen.includes(n.id) })); } catch { return []; } };
CD.markNotices = (list) => { try { localStorage.setItem('cd.notices', JSON.stringify(list.map((n) => n.id))); } catch { /* ok */ } };
CD.startUpdateWatch = () => {
  // the main process downloads new versions by itself (Settings > App > automatic updates); here we only announce that one is ready
  window.cd.on('update:ready', (u) => { const u0 = $('#upd'); if (u0) u0.classList.add('on'); CD.latestUpdate = { ok: true, newer: true, ready: true, version: u.version, notes: u.notes, current: (CD.lic && CD.lic.version) || '' }; if (!sessionStorage.getItem('cd.upReady' + u.version)) { sessionStorage.setItem('cd.upReady' + u.version, '1'); CD.sys('info').then((i) => { CD.latestUpdate.current = i.version; CD.updateDialog(CD.latestUpdate); }).catch(() => {}); } });
  setTimeout(() => CD.checkUpdate(true), 8000); setInterval(() => CD.checkUpdate(true), 6 * 3600 * 1000); };
})();
