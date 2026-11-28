'use strict';
/* CareDesk renderer core: i18n, icons (Lucide, ISC licence), DOM helpers, top-layer dialogs/tooltips, IPC wrapper. */
const CD = window.CD = { S: {}, lang: 'ar', user: null, lic: null };
const IC = {
  today: '<path d="M3 12 12 3l9 9"/><path d="M5 10v10h5v-6h4v6h5V10"/>', users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>', tools: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>', settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>', filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>', eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  pencil: '<path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>', chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/>', printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  check: '<path d="M20 6 9 17l-5-5"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>', plus: '<path d="M5 12h14M12 5v14"/>', minus: '<path d="M5 12h14"/>', up: '<path d="m18 15-6-6-6 6"/>', down: '<path d="m6 9 6 6 6-6"/>', left: '<path d="m15 18-6-6 6-6"/>', right: '<path d="m9 18 6-6-6-6"/>',
  warn: '<path d="m21.7 18-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3z"/><path d="M12 9v4M12 17h.01"/>', phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  barcode: '<path d="M3 5v14M8 5v14M12 5v14M17 5v14M21 5v14"/>', star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>', archive: '<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4"/>',
  userx: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m17 8 5 5M22 8l-5 5"/>', trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>', upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>', logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>', lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>', clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>', max: '<rect x="4" y="4" width="16" height="16" rx="2"/>',
  stats: '<path d="M3 3v18h18M7 14l4-4 4 4 5-6"/>', link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>', list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>', info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>', swap: '<path d="m16 3 4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16"/>', save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>'
};
const ic = CD.ic = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${IC[n] || ''}</svg>`;

const DICT = { ar: {}, en: {} };
CD.addDict = (ar, en) => { Object.assign(DICT.ar, ar); Object.assign(DICT.en, en); };
const t = CD.t = (k, v) => { let s = (DICT[CD.lang] && DICT[CD.lang][k]) ?? DICT.en[k] ?? k; if (v) for (const [a, b] of Object.entries(v)) s = s.split('{' + a + '}').join(b); return s; };
CD.setLang = (l) => { CD.lang = l === 'en' ? 'en' : 'ar'; document.documentElement.lang = CD.lang; document.documentElement.dir = CD.lang === 'ar' ? 'rtl' : 'ltr'; };

// h('div.cls#id',{onclick,html,dataset},...children)
const h = CD.h = (sel, attrs, ...kids) => {
  const m = String(sel).match(/^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i) || [];
  const el = document.createElement(m[1] || 'div');
  (m[2] || '').replace(/([.#])([\w-]+)/g, (_, k, v) => { if (k === '.') el.classList.add(v); else el.id = v; });
  if (attrs !== undefined && attrs !== null && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'html') el.innerHTML = v; else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else if (k === 'class') v.split(' ').forEach((c) => c && el.classList.add(c));
    else if (k === 'value') el.value = v; else if (k === 'checked') el.checked = !!v; else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v); else el.setAttribute(k, v === true ? '' : v);
  }
  const add = (c) => { if (c == null || c === false) return; if (Array.isArray(c)) c.forEach(add); else if (typeof c === 'string' && c.startsWith('<svg class="i')) el.insertAdjacentHTML('beforeend', c); else el.append(c instanceof Node ? c : document.createTextNode(String(c))); };
  kids.forEach(add); return el;
};
const $ = CD.$ = (s, r = document) => r.querySelector(s);
const esc = CD.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
CD.mount = (el, ...kids) => { el.replaceChildren(...kids.flat(Infinity).filter(Boolean)); return el; };
CD.nd = (v) => String(v ?? '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)); // Arabic-Indic digits -> Latin (phones, numbers)
CD.money = (n) => (Number(n) || 0).toLocaleString('en-US') + ' ' + (CD.S.currency || 'IQD');
CD.iso = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
CD.addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return CD.iso(d); };
CD.fmtD = (iso) => { if (!iso) return ''; const d = new Date(iso + 'T12:00:00'); return d.toLocaleDateString(CD.lang === 'ar' ? 'ar-IQ-u-nu-latn' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); };
CD.fmtT = (t24) => { if (!t24) return ''; const [hh, mm] = t24.split(':').map(Number); const pm = hh >= 12; return `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${pm ? (CD.lang === 'ar' ? 'م' : 'PM') : (CD.lang === 'ar' ? 'ص' : 'AM')}`; };

// ---- IPC ----------------------------------------------------------------------------
const unwrap = async (p) => { const r = await p; if (r && r.ok) return r.data; const e = new Error(r ? r.error : 'IPC'); e.code = r && r.code; if (e.code === 'LICENSE_LOCKED') CD.onLocked && CD.onLocked(); throw e; };
CD.call = (m, a) => unwrap(window.cd.call(m, a)); CD.sys = (n, a) => unwrap(window.cd.sys(n, a));
CD.cloud = (a, b) => unwrap(window.cd.cloud(a, b)); // resolves to the dashboard reply { ok, code, ... }
CD.try = async (fn) => { try { return await fn(); } catch (e) { CD.toast(t('err.' + e.code) !== 'err.' + e.code ? t('err.' + e.code) : (e.message || String(e)), 'bad'); return undefined; } };

// ---- top layer: dialogs, tooltips, popovers, toasts -----------------------------------------
CD.dialog = ({ title, body, foot, cls = '', onClose }) => {
  const d = h('dialog.dlg', { class: cls });
  const close = (v) => { d.close(); d.remove(); onClose && onClose(v); };
  d.append(h('.dh', h('h3', title), h('button.btn.ico.flat', { onclick: () => close(), 'aria-label': 'close', html: ic('x') })), h('.db', body), ...(foot ? [h('.df', typeof foot === 'function' ? foot(close) : foot)] : []));
  d.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  document.body.append(d); d.showModal(); d.close_ = close; return d;
};
CD.confirm = (msg, { ok = t('ok'), danger = false, title = t('confirm') } = {}) => new Promise((res) => {
  const d = CD.dialog({ title, cls: 'sm', body: h('p', { style: { margin: 0, whiteSpace: 'pre-line' } }, msg), foot: (close) => [h('button.btn', { onclick: () => { res(false); close(); } }, t('cancel')), h('button.btn' + (danger ? '.bad' : '.pri'), { onclick: () => { res(true); close(); } }, ok)], onClose: () => res(false) });
  return d;
});
CD.toast = (msg, kind = '') => {
  let box = $('#toasts'); if (!box) { box = h('div#toasts', { popover: 'manual' }); document.body.append(box); }
  if (!box.matches(':popover-open')) box.showPopover(); else { box.hidePopover(); box.showPopover(); } // re-promote above freshly opened dialogs
  const el = h('.toast', { class: kind }, msg); box.append(el); setTimeout(() => { el.remove(); if (!box.children.length) try { box.hidePopover(); } catch { /* ok */ } }, 3600);
};
// Tooltips & "?" help render in the top layer so nothing can ever cover them.
let tipEl, tipFor; const tipShow = (el) => {
  const txt = el.dataset.tip; if (!txt) return; tipFor = el;
  if (!tipEl) { tipEl = h('div.tip', { popover: 'manual' }); document.body.append(tipEl); }
  tipEl.textContent = txt; try { tipEl.hidePopover(); } catch { /* ok */ } tipEl.showPopover();
  const r = el.getBoundingClientRect(), tr = tipEl.getBoundingClientRect();
  let top = r.top - tr.height - 8; if (top < 6) top = r.bottom + 8;
  let left = Math.min(Math.max(6, r.left + r.width / 2 - tr.width / 2), innerWidth - tr.width - 6);
  tipEl.style.top = top + 'px'; tipEl.style.left = left + 'px';
};
const tipHide = () => { tipFor = null; if (tipEl) try { tipEl.hidePopover(); } catch { /* ok */ } };
document.addEventListener('mouseover', (e) => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el && el !== tipFor) tipShow(el); else if (!el && tipFor) tipHide(); });
document.addEventListener('mousedown', tipHide); document.addEventListener('scroll', tipHide, true);
CD.help = (txt) => { const e = h('span.help', { 'data-tip': txt, tabindex: 0, role: 'button' }, '?'); e.onclick = (ev) => { ev.stopPropagation(); CD.popover(e, h('div.pop-txt', txt)); }; return e; };
// Anchored rich popover (click). Closes on outside click / Escape.
CD.popover = (anchor, content) => {
  const p = h('div.pop', { popover: 'auto' }, content); document.body.append(p); p.showPopover();
  const r = anchor.getBoundingClientRect(), pr = p.getBoundingClientRect();
  let top = r.bottom + 8; if (top + pr.height > innerHeight - 8) top = Math.max(8, r.top - pr.height - 8);
  p.style.top = top + 'px'; p.style.left = Math.min(Math.max(8, r.left + r.width / 2 - pr.width / 2), innerWidth - pr.width - 8) + 'px';
  p.addEventListener('toggle', (e) => { if (e.newState === 'closed') p.remove(); }); return p;
};
// Custom cursor (soft arrow + hand) as data-URI so it also works above dialogs/popovers.
CD.applyCursor = (on) => {
  const arrow = "<svg xmlns='http://www.w3.org/2000/svg' width='26' height='26' viewBox='0 0 26 26'><path d='M5 3l15 8.5-6.5 1.8-3.2 6.2z' fill='%23DAF1DE' stroke='%23051F20' stroke-width='1.6' stroke-linejoin='round'/></svg>";
  const hand = "<svg xmlns='http://www.w3.org/2000/svg' width='26' height='26' viewBox='0 0 26 26'><circle cx='13' cy='13' r='8' fill='%238EB69B' fill-opacity='.35' stroke='%23DAF1DE' stroke-width='2'/><circle cx='13' cy='13' r='2.6' fill='%23DAF1DE'/></svg>";
  const r = document.documentElement.style;
  if (on) { r.setProperty('--cur', `url("data:image/svg+xml;utf8,${arrow}") 5 3, default`); r.setProperty('--curp', `url("data:image/svg+xml;utf8,${hand}") 13 13, pointer`); } else { r.removeProperty('--cur'); r.removeProperty('--curp'); }
};
// Whole-interface scale: the user's size setting times an automatic fit (small / high-DPI screens shrink so the layout keeps the same room as on 1280x720).
// Uses the real browser zoom (Electron webContents zoom) so mouse coordinates, drag & drop, popovers and menus stay exact.
CD._zoom = 1;
CD.applyZoom = () => {
  const s = CD.S || {}; const user = Math.max(0.7, Math.min(1.6, Number(s.fontScale) || 1));
  const w = innerWidth * CD._zoom, hgt = innerHeight * CD._zoom;               // the window in unzoomed CSS pixels
  const fit = s.autoFit === false ? 1 : Math.max(0.65, Math.min(1, w / 1180, hgt / 700));
  const z = Math.round(user * fit * 100) / 100;
  if (Math.abs(z - CD._zoom) < 0.01) return;
  CD._zoom = z; Promise.resolve(CD.sys('zoom', { f: z })).catch(() => { CD._zoom = 1; });
};
let zt = 0; addEventListener('resize', () => { clearTimeout(zt); zt = setTimeout(() => CD.applyZoom(), 150); });
addEventListener('keydown', (e) => { // Ctrl + / Ctrl - / Ctrl 0: quick interface size
  if (!(e.ctrlKey || e.metaKey) || e.altKey || !CD.S || !CD.user) return; const k = e.key; if (!['+', '=', '-', '_', '0'].includes(k)) return; e.preventDefault();
  const cur = Number(CD.S.fontScale) || 1; const nx = k === '0' ? 1 : Math.max(0.7, Math.min(1.6, Math.round((cur + (k === '-' || k === '_' ? -0.05 : 0.05)) * 100) / 100));
  CD.S.fontScale = nx; CD.applyZoom(); CD.call('saveLook', { patch: { fontScale: nx } }).catch(() => {});
});
// Look packs = font + theme bundles. "custom" uses fonts the user dropped into <data>/fonts.
CD.PACKS = { classic: { ui: 'Cairo', head: 'Cairo', theme: null }, zain: { ui: 'Zain', head: 'Zain', theme: null }, editorial: { ui: 'Inter', head: '"Playfair Display"', theme: 'sand' } };
CD.customFonts = [];
CD.loadCustomFonts = async () => {
  try { const list = await CD.sys('customFonts'); CD.customFonts = [];
    for (const f of list || []) { try { const ff = new FontFace(f.family, `url(${f.url})`); await ff.load(); document.fonts.add(ff); CD.customFonts.push(f.family); } catch { /* bad font file: skip */ } }
  } catch { /* older shell / harness */ }
  CD.applyFonts(); return CD.customFonts;
};
CD.applyFonts = () => {
  const s = CD.S || {}, r = document.documentElement; let ui = 'Cairo', head = '';
  if (s.fontPack === 'custom') { ui = s.fontUi ? `"${s.fontUi}"` : 'Cairo'; head = s.fontHead ? `"${s.fontHead}"` : ui; } else { const p = CD.PACKS[s.fontPack] || CD.PACKS.classic; ui = p.ui; head = p.head; }
  r.style.setProperty('--ff-ui', ui); r.style.setProperty('--ff-head', head || ui);
};
CD.applyLook = () => {
  const s = CD.S, r = document.documentElement; CD.setLang(s.lang);
  const th = s.theme === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : s.theme; r.dataset.theme = th;
  r.dataset.motion = s.reduceMotion ? 'off' : 'on'; r.style.setProperty('--fs', 1); CD.applyFonts(); CD.applyZoom(); CD.applyCursor(!!s.customCursor);
};
// Keyboard-wedge barcode scanner: fast key bursts ending with Enter (works anywhere outside text fields).
(() => { let buf = '', last = 0; document.addEventListener('keydown', (e) => {
  const now = performance.now(); if (now - last > 80) buf = ''; last = now;
  if (e.key === 'Enter') { if (buf.length >= 5 && /^[A-Z]{2}\d+$/i.test(buf)) { e.preventDefault(); CD.onScan && CD.onScan(buf.toUpperCase()); } buf = ''; } else if (e.key.length === 1) buf += e.key;
}, true); })();
