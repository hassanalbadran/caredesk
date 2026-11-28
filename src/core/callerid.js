'use strict';
// Caller-ID helpers for the softphone link (MicroSIP). Pure functions, no I/O.
// MicroSIP hands the hook "Caller ID" without a documented format, so accept a bare number, "+964…", "00964…", or a SIP URI such as
// "Name" <sip:07701234567@host>. Anything else is rejected, so text typed by a stranger on the phone line can never travel further.
function parseCaller(raw) {
  const s = String(raw == null ? '' : raw).slice(0, 300);
  let m = s.match(/sips?:\s*(\+?\d{3,18})(?:[@;>:]|$)/i); if (m) return m[1];
  m = s.match(/(\+?\d[\d\s\-().]{2,24}\d)/); if (!m) return '';
  const d = m[1].replace(/[^\d+]/g, ''); return d.replace(/\D/g, '').length >= 3 && d.length <= 19 ? d : '';
}
// Two numbers are "the same" when their last 10 digits match (07701234567 == +9647701234567 == 009647701234567); short internal extensions must match exactly.
function numKey(p) { const d = String(p || '').replace(/\D/g, ''); return d.length > 10 ? d.slice(-10) : d; }
function sameNumber(a, b) { const x = numKey(a), y = numKey(b); return !!x && !!y && x === y && (x.length >= 7 || String(a).replace(/\D/g, '') === String(b).replace(/\D/g, '')); }
// A number that may be dialled: digits with an optional leading +; optional prefix (e.g. "9" for an outside line) is added unless the number already starts with it
function dialNumber(raw, prefix = '') {
  const s = String(raw || '').trim(); if (!/^\+?[\d\s\-().]{3,25}$/.test(s)) return '';
  const d = s.replace(/[^\d+]/g, ''); if (d.replace(/\D/g, '').length < 3 || d.length > 19) return '';
  const pf = String(prefix || '').replace(/\D/g, '').slice(0, 4); return pf && !d.startsWith('+') && !d.startsWith(pf) ? pf + d : d;
}
module.exports = { parseCaller, numKey, sameNumber, dialNumber };
