'use strict';
// Thin client for the Apps Script dashboard. Never throws: offline/any failure => { ok:false, offline:true }.
let forcedOffline = false; const setOffline = (v) => { forcedOffline = !!v; };
async function post(url, body, timeoutMs = 15000) {
  if (forcedOffline) return { ok: false, offline: true, code: 'OFFLINE' };
  if (!url) return { ok: false, offline: true, code: 'NO_SERVER' };
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow', signal: ctl.signal });
    const j = await res.json(); return j && typeof j === 'object' ? j : { ok: false, code: 'BAD_RESPONSE' };
  } catch { return { ok: false, offline: true, code: 'OFFLINE' }; } finally { clearTimeout(t); }
}
module.exports = { post, setOffline, isOffline: () => forcedOffline };
