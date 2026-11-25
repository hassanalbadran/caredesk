'use strict';
const { toMin } = require('./util');
function normPhone(p, cc = '964') {
  let d = String(p || '').trim().replace(/[^\d+]/g, '');
  if (!d) return '';
  if (d.startsWith('+')) d = d.slice(1);
  else if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = cc + d.slice(1);
  else if (d.length <= 10 && !d.startsWith(cc)) d = cc + d;
  return d.replace(/\D/g, '');
}
const render = (tpl, vars) => String(tpl || '').replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));
const waUrl = (phone, text, cc) => `whatsapp://send?phone=${normPhone(phone, cc)}&text=${encodeURIComponent(text)}`;
const waWebUrl = (phone, text, cc) => `https://wa.me/${normPhone(phone, cc)}?text=${encodeURIComponent(text)}`;
const locOf = (lang) => (lang === 'en' ? 'en-GB-u-nu-latn' : 'ar-IQ-u-nu-latn');
function fmtDate(iso, lang) { return new Intl.DateTimeFormat(locOf(lang), { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(iso + 'T00:00:00Z')); }
function fmtTime(hhmm, lang) {
  const m = toMin(hhmm); const h = Math.floor(m / 60), mm = m % 60;
  const ap = lang === 'en' ? (h >= 12 ? 'PM' : 'AM') : (h >= 12 ? 'م' : 'ص');
  return `${h % 12 || 12}:${String(mm).padStart(2, '0')} ${ap}`;
}
const titleFor = (gender, settings, lang) => { const m = settings.msg[lang] || settings.msg.ar; return gender === 'F' ? m.titleF : m.titleM; };
// Two-word name (first + second) used in greetings
const shortName = (n) => String(n || '').trim().split(/\s+/).slice(0, 2).join(' ');
module.exports = { normPhone, render, waUrl, waWebUrl, fmtDate, fmtTime, titleFor, shortName };
