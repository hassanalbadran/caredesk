'use strict';
/* Right-click menus everywhere, special drag cursors, small synthesized sounds. */
(() => {
const { h, t, ic } = CD;
CD.addDict({ 'ctx.cut': 'قص', 'ctx.copy': 'نسخ', 'ctx.paste': 'لصق', 'ctx.selAll': 'تحديد الكل', 'ctx.refresh': 'تحديث الصفحة', 'ctx.delete': 'حذف', 'ctx.pasteHere': 'لصق هنا', 'ctx.clipCut': 'مقصوص', 'ctx.clipCopy': 'منسوخ', 'ctx.sound': 'الصوت' },
  { 'ctx.cut': 'Cut', 'ctx.copy': 'Copy', 'ctx.paste': 'Paste', 'ctx.selAll': 'Select all', 'ctx.refresh': 'Refresh', 'ctx.delete': 'Delete', 'ctx.pasteHere': 'Paste here', 'ctx.clipCut': 'cut', 'ctx.clipCopy': 'copied', 'ctx.sound': 'Sound' });

// ---- special cursors: open grab (hover), closed grab (dragging), drop target
const baseCur = CD.applyCursor;
CD.applyCursor = (on) => {
  baseCur(on); const r = document.documentElement.style;
  const open = "<svg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 30 30'><circle cx='15' cy='15' r='11' fill='%23235347' stroke='%23DAF1DE' stroke-width='2'/><path d='M9 15h12M15 9v12' stroke='%23DAF1DE' stroke-width='2' stroke-linecap='round' opacity='.9'/><circle cx='15' cy='15' r='2.4' fill='%238EB69B'/></svg>";
  const closed = "<svg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 30 30'><circle cx='15' cy='15' r='8' fill='%238EB69B' stroke='%23051F20' stroke-width='2'/><circle cx='15' cy='15' r='3' fill='%23051F20'/><circle cx='15' cy='15' r='13' fill='none' stroke='%238EB69B' stroke-width='1.5' stroke-dasharray='3 4'/></svg>";
  if (on) { r.setProperty('--cgrab', `url("data:image/svg+xml;utf8,${open}") 15 15, grab`); r.setProperty('--cgrabbing', `url("data:image/svg+xml;utf8,${closed}") 15 15, grabbing`); } else { r.removeProperty('--cgrab'); r.removeProperty('--cgrabbing'); }
};
document.addEventListener('dragstart', () => document.body.classList.add('dragging')); document.addEventListener('dragend', () => document.body.classList.remove('dragging'));

// ---- sounds (WebAudio, no files)
let ac = null;
CD.beep = (kind = 'info') => {
  try {
    if (CD.S && CD.S.sounds === false) return; ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const seq = { info: [[660, 0.09]], ok: [[660, 0.08], [880, 0.12]], bad: [[220, 0.2]], timer: [[880, 0.14], [0, 0.06], [880, 0.14], [0, 0.06], [1175, 0.25]] }[kind] || [[660, 0.09]]; let at = ac.currentTime;
    for (const [f, d] of seq) { if (f) { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.18, at + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, at + d); o.connect(g); g.connect(ac.destination); o.start(at); o.stop(at + d + 0.02); } at += d; }
  } catch { /* audio unavailable */ }
};

// ---- context menu
const reg = new WeakMap(); let menu = null;
CD.onCtx = (el, fn) => { reg.set(el, fn); return el; };
CD.closeCtx = () => { if (menu) { try { menu.hidePopover(); } catch { /* ok */ } menu.remove(); menu = null; } };
CD.ctx = (e, items) => {
  CD.closeCtx(); items = items.filter(Boolean); if (!items.length) return;
  const mk = (list, sub) => h('div.cmenu' + (sub ? '.sub' : ''), { role: 'menu' }, list.filter(Boolean).map((it) => {
    if (it.sep) return h('hr');
    const row = h('button.ci', { type: 'button', role: 'menuitem', disabled: !!it.disabled, class: it.danger ? 'bad' : '' }, it.icon ? ic(it.icon, 's') : h('i'), h('span', it.label), it.hint ? h('small.dim', it.hint) : null, it.sub ? h('span.arr', '›') : null);
    if (it.sub) { let sm = null; const open = () => { if (sm) return; sm = mk(it.sub, true); row.append(sm); const r = row.getBoundingClientRect(); const w = sm.offsetWidth || 180; sm.style.top = '-6px'; if (r.right + w > innerWidth) { sm.style.insetInlineStart = 'auto'; sm.style.right = '100%'; } };
      row.addEventListener('mouseenter', open); row.addEventListener('click', (ev) => { ev.stopPropagation(); open(); }); row.addEventListener('mouseleave', () => { if (sm) { sm.remove(); sm = null; } }); }
    else row.addEventListener('click', () => { CD.closeCtx(); it.onclick && it.onclick(); });
    return row; }));
  menu = h('div.pop.ctxpop', { popover: 'manual' }, mk(items)); document.body.append(menu); menu.showPopover();
  const r = menu.getBoundingClientRect(); menu.style.left = Math.max(6, Math.min(e.clientX, innerWidth - r.width - 6)) + 'px'; menu.style.top = Math.max(6, Math.min(e.clientY, innerHeight - r.height - 6)) + 'px';
  const first = menu.querySelector('.ci:not([disabled])'); if (first) first.focus();
  menu.addEventListener('keydown', (k) => { const all = [...menu.querySelectorAll('.cmenu:not(.sub) > .ci:not([disabled])')]; const i = all.indexOf(document.activeElement); if (k.key === 'ArrowDown') { all[(i + 1) % all.length].focus(); k.preventDefault(); } else if (k.key === 'ArrowUp') { all[(i - 1 + all.length) % all.length].focus(); k.preventDefault(); } else if (k.key === 'Escape') CD.closeCtx(); });
};
const away = (e) => { if (menu && !menu.contains(e.target)) CD.closeCtx(); };
document.addEventListener('pointerdown', away, true); window.addEventListener('blur', () => CD.closeCtx()); window.addEventListener('resize', () => CD.closeCtx());

// text fields: cut / copy / paste / select-all
const fieldMenu = (el) => { const ro = el.readOnly || el.disabled; const sel = el.selectionStart !== el.selectionEnd; return [
  !ro && { icon: 'x', label: t('ctx.cut'), disabled: !sel, onclick: () => { document.execCommand('cut'); } }, { icon: 'save', label: t('ctx.copy'), disabled: !sel, onclick: () => { document.execCommand('copy'); } },
  !ro && { icon: 'download', label: t('ctx.paste'), onclick: async () => { el.focus(); try { const tx = await navigator.clipboard.readText(); document.execCommand('insertText', false, tx); } catch { /* clipboard blocked */ } } },
  { sep: 1 }, { icon: 'check', label: t('ctx.selAll'), onclick: () => { el.focus(); el.select(); } }]; };
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  for (let n = e.target; n && n !== document; n = n.parentNode) {
    const fn = reg.get(n); if (fn) { const items = fn(e); if (items && items.length) return CD.ctx(e, items); }
    if (n.matches && n.matches('input:not([type=checkbox]):not([type=radio]):not([type=range]),textarea')) return CD.ctx(e, fieldMenu(n));
  }
  const sel = String(window.getSelection()); CD.ctx(e, [sel && { icon: 'save', label: t('ctx.copy'), onclick: () => document.execCommand('copy') }, { icon: 'refresh', label: t('ctx.refresh'), onclick: () => CD.refresh() }]);
});
})();
