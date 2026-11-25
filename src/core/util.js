'use strict';
// Date/time helpers. All dates are ISO 'YYYY-MM-DD' strings, times 'HH:MM'. UTC math avoids DST/timezone drift.
const toMin = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0); };
const fromMin = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const dow = (iso) => new Date(iso + 'T00:00:00Z').getUTCDay(); // 0=Sunday
const diffDays = (a, b) => Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000);
const todayISO = (now = Date.now()) => {
  const d = new Date(now); // local calendar date of the machine
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};
const monthRange = (ym) => { // 'YYYY-MM' -> [first,last]
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return [`${ym}-01`, `${ym}-${String(last).padStart(2, '0')}`];
};
const overlap = (a1, a2, b1, b2) => a1 < b2 && b1 < a2;
const json = (v, d) => { try { return v == null ? d : JSON.parse(v); } catch { return d; } };
module.exports = { toMin, fromMin, addDays, dow, diffDays, todayISO, monthRange, overlap, json };
