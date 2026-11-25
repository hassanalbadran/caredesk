'use strict';
(() => {
const { h, t, ic } = CD;
CD.addDict({ 'rc.scope': 'محتوى الوصل', 'rc.today': 'جلسة اليوم', 'rc.upcoming': 'الجلسات القادمة', 'rc.allS': 'جميع الجلسات', 'rc.go': 'طباعة', 'rc.preview': 'معاينة', 'rc.done': 'أُرسل للطابعة', 'rc.session': 'الجلسات', 'rc.patient': 'المريض', 'rc.phone': 'الهاتف', 'rc.age': 'العمر', 'rc.thanks': 'نتمنى لكم الشفاء العاجل' },
  { 'rc.scope': 'Receipt content', 'rc.today': "Today's session", 'rc.upcoming': 'Upcoming sessions', 'rc.allS': 'All sessions', 'rc.go': 'Print', 'rc.preview': 'Preview', 'rc.done': 'Sent to printer', 'rc.session': 'Sessions', 'rc.patient': 'Patient', 'rc.phone': 'Phone', 'rc.age': 'Age', 'rc.thanks': 'Wishing you a speedy recovery' });
const PAPER = { A4: { w: 210, h: 297 }, A5: { w: 148, h: 210 }, A6: { w: 105, h: 148 }, thermal: { w: 80, h: 200 }, sticker: { w: 50, h: 30 } };
CD.paperMM = (p) => (p.paper === 'custom' ? { w: Number(p.customW) || 80, h: Number(p.customH) || 200 } : PAPER[p.paper] || PAPER.A5);
// Default layout on a 12-column grid (blocks snap to cells; row height = 8mm). Edited visually in Settings -> Receipt designer.
CD.defaultReceipt = () => ({ cols: 12, rowMM: 8, blocks: [
  { id: 'b1', kind: 'logo', col: 0, row: 0, w: 3, h: 3 }, { id: 'b2', kind: 'clinic', col: 3, row: 0, w: 9, h: 2, size: 20, align: 'center' },
  { id: 'b3', kind: 'divider', col: 0, row: 3, w: 12, h: 1 }, { id: 'b4', kind: 'field', field: 'name', col: 0, row: 4, w: 8, h: 1 }, { id: 'b5', kind: 'field', field: 'phone', col: 8, row: 4, w: 4, h: 1 },
  { id: 'b6', kind: 'sessions', col: 0, row: 5, w: 12, h: 6 }, { id: 'b7', kind: 'barcode', col: 3, row: 11, w: 6, h: 3 }, { id: 'b8', kind: 'text', text: 'rc.thanks', col: 0, row: 14, w: 12, h: 1, align: 'center' }] });
const e = CD.esc;
CD.renderReceiptHTML = (data, layout, settings) => {
  const L = layout || CD.defaultReceipt(), p = data.patient, mm = CD.paperMM(settings.printer), cl = settings.clinic || {};
  const dir = CD.lang === 'ar' ? 'rtl' : 'ltr';
  const cell = (b) => {
    const st = `grid-column:${b.col + 1}/span ${b.w};grid-row:${b.row + 1}/span ${b.h};font-size:${b.size || 12}px;font-weight:${b.bold ? 700 : 400};text-align:${b.align || 'start'};font-family:${b.font || 'Cairo,Tahoma,sans-serif'};overflow:hidden`;
    let inner = '';
    if (b.kind === 'logo') inner = cl.logo ? `<img src="${e(cl.logo)}" style="max-width:100%;max-height:100%">` : '';
    else if (b.kind === 'clinic') inner = `<b>${e(cl.name || '')}</b>${cl.doctors && cl.doctors.length ? `<div style="font-size:.6em">${e(cl.doctors.join(' · '))}</div>` : ''}`;
    else if (b.kind === 'field') { const v = { name: p.name, phone: p.phone, age: p.age, address: p.address, id: p.barcode }[b.field]; inner = `<span style="opacity:.7">${e(t('rc.' + (b.field === 'name' ? 'patient' : b.field)) !== 'rc.' + b.field ? t('rc.' + (b.field === 'name' ? 'patient' : b.field)) : '')}</span> ${e(v ?? '')}`; }
    else if (b.kind === 'sessions') inner = data.bookings.map((x) => `<div>${e(x.seq + '/' + x.total)} · ${e(CD.fmtD(x.date))} · ${e(CD.fmtT(x.time))} · ${e(x.type_name || '')}</div>`).join('');
    else if (b.kind === 'barcode') inner = `<div style="height:100%;display:flex;flex-direction:column;align-items:center">${data.barcodeSvg || ''}</div>`;
    else if (b.kind === 'social') inner = e((cl.socials || []).map((s) => (s.name || s) + (s.handle ? ': ' + s.handle : '')).join('  ')); // TODO QR (needs qrcode lib)
    else if (b.kind === 'date') inner = e(CD.fmtD(CD.iso()) + ' ' + new Date().toLocaleTimeString(CD.lang === 'ar' ? 'ar-IQ-u-nu-latn' : 'en-GB', { hour: '2-digit', minute: '2-digit' }));
    else if (b.kind === 'code') inner = e(p.barcode || '');
    else if (b.kind === 'phoneC') inner = e((cl.phones || []).join(' · '));
    else if (b.kind === 'address') inner = e(cl.address || '');
    else if (b.kind === 'doctors') inner = e((cl.doctors || []).join(' · '));
    else if (b.kind === 'next') { const n = data.bookings.find((x) => x.eff === 'booked'); inner = n ? e(`${CD.fmtD(n.date)} · ${CD.fmtT(n.time)}`) : ''; }
    else if (b.kind === 'total') { const s = data.bookings.reduce((a, x) => a + (Number(x.price) || 0), 0); inner = e(`${data.bookings.length} · ${CD.money(s)}`); }
    else if (b.kind === 'sign') inner = `<div style="height:100%;display:flex;flex-direction:column;justify-content:flex-end"><div style="border-top:1px solid #000;padding-top:2px;font-size:.8em">${e(b.text || '')}</div></div>`;
    else if (b.kind === 'image') inner = b.src ? `<img src="${e(b.src)}" style="max-width:100%;max-height:100%">` : '';
    else if (b.kind === 'box') inner = '<div style="height:100%;border:1px solid #000;border-radius:3mm"></div>';
    else if (b.kind === 'text') inner = e(t(b.text) !== b.text ? t(b.text) : b.text).replace(/\n/g, '<br>');
    else if (b.kind === 'divider') inner = '<hr style="border:0;border-top:1px dashed #000;margin:50% 0 0">';
    return `<div style="${st}">${inner}</div>`;
  };
  const rows = Math.max(...L.blocks.map((b) => b.row + b.h), 1);
  return `<!doctype html><html dir="${dir}"><meta charset="utf-8"><style>@page{size:${mm.w}mm ${mm.h}mm;margin:3mm}body{margin:0;color:#000;background:#fff}svg{max-width:100%;height:auto}</style><body><div style="display:grid;grid-template-columns:repeat(${L.cols},1fr);grid-auto-rows:${L.rowMM}mm;gap:0 1mm;width:${mm.w - 6}mm">${L.blocks.map(cell).join('')}</div></body></html>`;
};
CD.printMenu = (patientId) => {
  let scope = 'upcoming';
  const seg = h('.seg', [['today', 'rc.today'], ['upcoming', 'rc.upcoming'], ['all', 'rc.allS']].map(([k, l]) => h('button', { class: k === scope ? 'on' : '', onclick: (ev) => { scope = k; seg.querySelectorAll('button').forEach((b) => b.classList.remove('on')); ev.currentTarget.classList.add('on'); } }, t(l))));
  const build = async () => { const [data, s] = await Promise.all([CD.call('receiptData', { patientId, scope }), CD.call('getSettings')]); data.barcodeSvg = await CD.sys('barcodeSvg', { code: data.patient.barcode }); return CD.renderReceiptHTML(data, s.receipt, s); };
  CD.dialog({ title: t('rc.scope'), cls: 'sm', body: h('div', { style: { display: 'grid', gap: '12px' } }, seg), foot: (close) => [
    h('button.btn', { onclick: () => CD.try(async () => { const html = await build(); const d = h('iframe', { style: { width: '100%', height: '60vh', border: '1px solid var(--line)', background: '#fff' }, srcdoc: html, sandbox: '' }); CD.dialog({ title: t('rc.preview'), cls: 'wide', body: d }); }) }, t('rc.preview')),
    h('button.btn.pri', { onclick: () => CD.try(async () => { const s = await CD.call('getSettings'); await CD.sys('print', { html: await build(), printer: s.printer.name, paper: s.printer.paper === 'A4' || s.printer.paper === 'A5' ? { name: s.printer.paper } : CD.paperMM(s.printer) }); CD.toast(t('rc.done')); close(); }) }, ic('printer', 's'), t('rc.go'))] });
};

})();
