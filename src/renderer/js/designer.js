'use strict';
/* Visual receipt designer: blocks snap to a 12-column grid. Drag to move, corner to resize, double-click a text block to type in it,
   shift-click to select several (font settings apply ONLY to the selection), page follows the chosen printer paper. */
CD.addDict({ 'dz.paper': 'الورقة', 'dz.over': 'تجاوز حدود الورقة', 'dz.type': 'انقر مرتين للكتابة', 'dz.multi': 'Shift+نقر لتحديد أكثر من كتلة — الإعدادات تُطبَّق على المحدد فقط', 'dz.kind': 'كل الكتل من نوع', 'dz.sel': 'المحدّد', 'dz.text': 'النص', 'dz.pickImg': 'اختر صورة', 'dz.bold': 'عريض', 'dz.border': 'إطار', 'dz.label': 'العنوان',
  'bk.date': 'تاريخ الطباعة', 'bk.code': 'رقم المريض', 'bk.phoneC': 'هاتف المركز', 'bk.next': 'الجلسة القادمة', 'bk.total': 'عدد الجلسات والمجموع', 'bk.sign': 'توقيع', 'bk.image': 'صورة', 'bk.box': 'إطار', 'bk.doctors': 'الأطباء', 'bk.address': 'عنوان المركز' },
  { 'dz.paper': 'Paper', 'dz.over': 'Outside the paper', 'dz.type': 'Double-click to type', 'dz.multi': 'Shift+click selects several — settings apply to the selection only', 'dz.kind': 'All blocks of kind', 'dz.sel': 'Selected', 'dz.text': 'Text', 'dz.pickImg': 'Choose image', 'dz.bold': 'Bold', 'dz.border': 'Border', 'dz.label': 'Label',
  'bk.date': 'Print date', 'bk.code': 'Patient code', 'bk.phoneC': 'Centre phone', 'bk.next': 'Next session', 'bk.total': 'Sessions & total', 'bk.sign': 'Signature', 'bk.image': 'Image', 'bk.box': 'Frame', 'bk.doctors': 'Doctors', 'bk.address': 'Centre address' });
CD.receiptDesigner = () => {
  const { h, t, ic } = CD; const PX = 3; // 1mm = 3px on screen
  const wrap = h('div', { style: { display: 'grid', gap: '12px' } });
  let L = JSON.parse(JSON.stringify(CD.S.receipt || CD.defaultReceipt())); let sel = new Set(); let seq = 100; const RTL = CD.lang === 'ar';
  const mm = () => CD.paperMM(CD.S.printer); let colW, rowH, rowsN;
  const calc = () => { const m = mm(); colW = ((m.w - 6) * PX) / L.cols; rowH = L.rowMM * PX; rowsN = Math.max(8, Math.floor((m.h - 6) / L.rowMM)); };
  const X = (b) => (RTL ? L.cols - b.col - b.w : b.col) * colW;
  const cv = h('.rcpt-grid', { style: { position: 'relative', background: '#fff', color: '#000', margin: '0 auto', boxShadow: 'var(--out)' } });
  const props = h('div', { style: { display: 'grid', gap: '8px' } });
  const txt = (b) => (t(b.text) !== b.text ? t(b.text) : b.text || '');
  const label = (b) => (b.kind === 'field' ? t('bk.field') + ': ' + b.field : b.kind === 'text' ? txt(b) || t('dz.type') : b.kind === 'sign' ? (b.text || t('bk.sign')) : t('bk.' + b.kind));
  const first = () => L.blocks.find((x) => sel.has(x.id));
  const grid = () => { cv.style.width = colW * L.cols + 'px'; cv.style.height = rowsN * rowH + 'px'; cv.style.backgroundImage = `linear-gradient(to right,#0001 1px,transparent 1px),linear-gradient(to bottom,#0001 1px,transparent 1px)`; cv.style.backgroundSize = `${colW}px ${rowH}px`; };
  function paint() {
    calc(); grid();
    cv.replaceChildren(...L.blocks.map((b) => {
      const over = b.row + b.h > rowsN, on = sel.has(b.id);
      const el = h('div.blk', { class: on ? 'sel' : '', style: { position: 'absolute', left: X(b) + 'px', top: b.row * rowH + 'px', width: b.w * colW + 'px', height: b.h * rowH + 'px', border: '1px ' + (over ? 'solid var(--bad)' : on ? 'solid var(--acc)' : 'dashed #888'), background: on ? 'rgba(142,182,155,.28)' : 'rgba(142,182,155,.1)', fontSize: Math.min(b.size || 12, 16) + 'px', fontWeight: b.bold ? 700 : 400, display: 'flex', alignItems: 'center', justifyContent: b.align === 'center' ? 'center' : b.align === 'end' ? 'flex-end' : 'flex-start', textAlign: b.align || 'start', padding: '1px 14px', overflow: 'hidden', touchAction: 'none', userSelect: 'none', cursor: 'move' }, 'data-tip': over ? t('dz.over') : null }, h('span', { style: { pointerEvents: 'none', whiteSpace: 'pre-wrap' } }, label(b)));
      const del = h('button.blk-x', { type: 'button', title: t('delBlock'), style: { display: on ? 'grid' : '' } }, '×'); del.addEventListener('pointerdown', (e) => e.stopPropagation()); del.onclick = () => { L.blocks = L.blocks.filter((x) => x.id !== b.id); sel.delete(b.id); paint(); drawProps(); }; el.append(del);
      const grip = h('div', { style: { position: 'absolute', right: 0, bottom: 0, width: '12px', height: '12px', background: 'var(--acc)', cursor: 'nwse-resize' } }); el.append(grip);
      const drag = (mode) => (ev) => {
        if (el.isContentEditable) return; ev.preventDefault(); ev.stopPropagation();
        if (ev.shiftKey || ev.ctrlKey) { sel.has(b.id) ? sel.delete(b.id) : sel.add(b.id); paint(); drawProps(); return; } let changed = false; if (!sel.has(b.id)) { sel = new Set([b.id]); changed = true; }
        const group = L.blocks.filter((x) => sel.has(x.id)).map((x) => ({ x, c: x.col, r: x.row, w: x.w, h: x.h })); const x0 = ev.clientX, y0 = ev.clientY; el.setPointerCapture(ev.pointerId); let moved = false;
        const mv = (e) => { moved = true; const dc = Math.round(((e.clientX - x0) / colW) * (RTL ? -1 : 1)), dr = Math.round((e.clientY - y0) / rowH);
          for (const g of group) { if (mode === 'move') { g.x.col = Math.min(Math.max(0, g.c + dc), L.cols - g.x.w); g.x.row = Math.max(0, g.r + dr); } else { g.x.w = Math.min(Math.max(1, g.w + dc * (RTL ? -1 : 1)), L.cols - g.x.col); g.x.h = Math.max(1, g.h + dr); } } paint(); };
        const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); if (moved || changed) { paint(); drawProps(); } }; el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up);
      };
      el.addEventListener('pointerdown', drag('move')); grip.addEventListener('pointerdown', drag('size'));
      if (b.kind === 'text' || b.kind === 'sign') el.addEventListener('dblclick', () => { const sp = el.firstChild; sp.style.pointerEvents = 'auto'; sp.contentEditable = 'plaintext-only'; el.style.userSelect = 'text'; el.style.cursor = 'text'; sp.focus(); const r = document.createRange(); r.selectNodeContents(sp); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
        const fin = () => { b.text = sp.textContent; paint(); drawProps(); }; sp.addEventListener('blur', fin, { once: true }); sp.addEventListener('keydown', (k) => { k.stopPropagation(); if (k.key === 'Escape' || (k.key === 'Enter' && !k.shiftKey)) { k.preventDefault(); sp.blur(); } }); });
      return el;
    }));
    const m = mm(); info.textContent = `${m.w}×${m.h} mm`;
  }
  const info = h('small.dim', '');
  function drawProps() {
    const bs = L.blocks.filter((x) => sel.has(x.id)); const b = bs[0]; if (!b) return CD.mount(props, CD.help(t('dz.multi')));
    const each = (fn) => { bs.forEach(fn); paint(); };
    const size = h('input.in', { type: 'number', min: 6, max: 60, value: b.size || 12, oninput: (e) => each((x) => { x.size = Number(e.target.value) || 12; }) });
    const al = h('select.in', ['start', 'center', 'end'].map((a) => h('option', { value: a, selected: (b.align || 'start') === a }, a)), { onchange: (e) => each((x) => { x.align = e.target.value; }) });
    const font = h('select.in', ['Cairo,Tahoma,sans-serif', 'Tahoma,sans-serif', 'Georgia,serif', 'monospace'].map((f) => h('option', { value: f, selected: (b.font || 'Cairo,Tahoma,sans-serif') === f }, f.split(',')[0])), { onchange: (e) => each((x) => { x.font = e.target.value; }) });
    const bold = h('input', { type: 'checkbox', checked: !!b.bold, onchange: (e) => each((x) => { x.bold = e.target.checked; }) });
    const kind = bs.length === 1 ? h('button.btn.sm', { onclick: () => { L.blocks.filter((x) => x.kind === b.kind).forEach((x) => sel.add(x.id)); paint(); drawProps(); } }, `${t('dz.kind')}: ${t('bk.' + b.kind)}`) : null;
    CD.mount(props, h('b', bs.length > 1 ? `${t('dz.sel')}: ${bs.length}` : label(b)), h('.grid.g2', h('label.fld', h('span', t('fSize')), size), h('label.fld', h('span', t('fAlign')), al), h('label.fld', h('span', t('fFont')), font), h('label.chk.row', bold, t('dz.bold'))), kind,
      bs.length === 1 && b.kind === 'field' ? h('label.fld', h('span', t('field')), h('select.in', ['name', 'phone', 'age', 'address', 'id'].map((f) => h('option', { value: f, selected: b.field === f }, f)), { onchange: (e) => { b.field = e.target.value; paint(); } })) : null,
      bs.length === 1 && (b.kind === 'text' || b.kind === 'sign') ? h('label.fld', h('span', t('dz.text')), h('textarea.in', { rows: 3, value: txt(b), oninput: (e) => { b.text = e.target.value; paint(); } })) : null,
      bs.length === 1 && b.kind === 'image' ? h('button.btn.sm', { onclick: () => CD.try(async () => { const d = await CD.sys('pickImage'); if (d) { b.src = d; paint(); } }) }, ic('plus', 's'), t('dz.pickImg')) : null,
      h('button.btn.bad.sm', { onclick: () => { L.blocks = L.blocks.filter((x) => !sel.has(x.id)); sel = new Set(); paint(); drawProps(); } }, ic('trash', 's'), t('delBlock')));
  }
  const DEF = { logo: [3, 3], clinic: [9, 2], field: [6, 1], sessions: [12, 5], barcode: [6, 3], social: [12, 1], text: [12, 1], divider: [12, 1], date: [4, 1], code: [4, 1], phoneC: [6, 1], next: [6, 1], total: [6, 1], sign: [5, 2], image: [3, 3], box: [12, 3], doctors: [12, 1], address: [12, 1] };
  const add = (kind) => { const d = DEF[kind]; const used = L.blocks.reduce((m, x) => Math.max(m, x.row + x.h), 0); const b = { id: 'n' + ++seq, kind, col: 0, row: used, w: d[0], h: d[1], size: 12 }; if (kind === 'field') b.field = 'name'; if (kind === 'text') b.text = t('dz.type'); if (kind === 'sign') b.text = t('bk.sign'); L.blocks.push(b); sel = new Set([b.id]); paint(); drawProps(); };
  const onKey = (e) => { if (!cv.isConnected) { document.removeEventListener('keydown', onKey); return; } if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement && document.activeElement.tagName) || (document.activeElement && document.activeElement.isContentEditable)) return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && sel.size) { L.blocks = L.blocks.filter((x) => !sel.has(x.id)); sel = new Set(); paint(); drawProps(); e.preventDefault(); }
    const mvK = { ArrowLeft: [RTL ? 1 : -1, 0], ArrowRight: [RTL ? -1 : 1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (mvK && sel.size) { L.blocks.filter((x) => sel.has(x.id)).forEach((x) => { x.col = Math.min(Math.max(0, x.col + mvK[0]), L.cols - x.w); x.row = Math.max(0, x.row + mvK[1]); }); paint(); e.preventDefault(); } };
  document.addEventListener('keydown', onKey);
  cv.addEventListener('pointerdown', (e) => { if (e.target === cv) { sel = new Set(); paint(); drawProps(); } });
  const KINDS = ['logo', 'clinic', 'field', 'sessions', 'barcode', 'social', 'text', 'divider', 'date', 'code', 'phoneC', 'address', 'doctors', 'next', 'total', 'sign', 'image', 'box'];
  const bar = h('.row.wrap', KINDS.map((k) => h('button.btn.sm', { onclick: () => add(k) }, ic('plus', 's'), t('bk.' + k))));
  const paper = h('select.in', { style: { width: 'auto' }, 'data-tip': t('dz.paper'), onchange: () => CD.try(async () => { CD.S = await CD.call('saveSettings', { patch: { printer: { ...CD.S.printer, paper: paper.value }, receipt: L } }); document.removeEventListener('keydown', onKey); wrap.replaceWith(CD.receiptDesigner()); }) },
    ['A4', 'A5', 'A6', 'thermal', 'sticker', 'custom'].map((p) => h('option', { value: p, selected: (CD.S.printer.paper || 'A5') === p }, p)));
  paint(); drawProps();
  CD.mount(wrap, h('.row.wrap', h('small.dim', CD.help(t('dz.help')), ' '), h('label.row', h('span.dim', t('dz.paper')), paper), info), h('small.dim', t('dz.multi')), bar,
    h('div', { style: { overflow: 'auto', maxHeight: '60vh', padding: '8px', background: 'var(--surf2)', borderRadius: '12px' } }, cv), props,
    h('.row', h('button.btn.pri', { onclick: () => CD.try(async () => { CD.S = await CD.call('saveSettings', { patch: { receipt: L } }); CD.toast(t('saved')); }) }, ic('save', 's'), t('save')), h('button.btn', { onclick: () => { L = CD.defaultReceipt(); sel = new Set(); paint(); drawProps(); } }, t('resetRc'))));
  return wrap;
};
