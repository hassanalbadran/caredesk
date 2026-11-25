'use strict';
// Phone link: a tiny LAN-only web page so a phone on the same Wi-Fi can see the day's sessions and mark arrival / start / finish.
// No cloud, no data leaves the clinic network. Pairing = 6-digit PIN → random session token kept in memory. Only an allow-list of service methods is reachable
// and money fields are always redacted.
const http = require('http'); const os = require('os'); const crypto = require('crypto');
const ALLOW = new Set(['phoneDay', 'markArrived', 'startTimer', 'finishSession', 'getCatalog']);
const PAGE = require('fs').readFileSync(require('path').join(__dirname, 'phone.html'), 'utf8');
const newPin = () => String(crypto.randomInt(100000, 999999));
function ips() { const out = []; for (const l of Object.values(os.networkInterfaces())) for (const a of l || []) if (a.family === 'IPv4' && !a.internal) out.push(a.address); return out; }

function create({ svc, redact, onEvent = () => {} }) {
  let server = null; let port = 8765; let pin = newPin(); const tokens = new Map(); const fails = new Map();
  const send = (res, code, body, type = 'application/json; charset=utf-8') => { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(typeof body === 'string' ? body : JSON.stringify(body)); };
  const body = (req) => new Promise((ok) => { let d = ''; req.on('data', (c) => { d += c; if (d.length > 20000) req.destroy(); }); req.on('end', () => { try { ok(JSON.parse(d || '{}')); } catch { ok({}); } }); });
  const handler = async (req, res) => {
    const ip = req.socket.remoteAddress || '?'; const url = (req.url || '/').split('?')[0];
    if (req.method === 'GET' && (url === '/' || url === '/index.html')) return send(res, 200, PAGE, 'text/html; charset=utf-8');
    if (req.method !== 'POST') return send(res, 404, { ok: false });
    const b = await body(req);
    if (url === '/api/login') {
      const f = fails.get(ip) || { n: 0, until: 0 }; if (Date.now() < f.until) return send(res, 429, { ok: false, code: 'LOCKED' });
      const a = Buffer.from(String(b.pin || '')); const p = Buffer.from(pin);
      if (a.length !== p.length || !crypto.timingSafeEqual(a, p)) { f.n++; if (f.n >= 5) { f.n = 0; f.until = Date.now() + 5 * 60000; onEvent('lock', ip); } fails.set(ip, f); return send(res, 401, { ok: false, code: 'BAD_PIN' }); }
      fails.delete(ip); const t = crypto.randomBytes(24).toString('hex'); tokens.set(t, Date.now() + 12 * 3600e3); onEvent('login', ip); return send(res, 200, { ok: true, token: t });
    }
    if (url === '/api/call') {
      const exp = tokens.get(String(b.token || '')); if (!exp || exp < Date.now()) return send(res, 401, { ok: false, code: 'AUTH' });
      if (!ALLOW.has(b.method)) return send(res, 403, { ok: false, code: 'FORBIDDEN' });
      try { const out = svc[b.method](b.args || {}, { id: 0, name: 'Phone' }); return send(res, 200, { ok: true, data: redact(out) }); } catch (e) { return send(res, 400, { ok: false, code: 'ERR', message: String(e.message).slice(0, 120) }); }
    }
    return send(res, 404, { ok: false });
  };
  const status = () => ({ running: !!server, port, pin, urls: ips().map((a) => `http://${a}:${port}`) });
  return {
    status, newPin() { pin = newPin(); tokens.clear(); return status(); },
    start(p) { if (server) return Promise.resolve(status()); port = Number(p) || port; return new Promise((ok, bad) => { const s = http.createServer((q, r) => { handler(q, r).catch(() => send(r, 500, { ok: false })); }); s.once('error', (e) => bad(e)); s.listen(port, '0.0.0.0', () => { server = s; ok(status()); }); }); },
    stop() { if (!server) return Promise.resolve(status()); return new Promise((ok) => { const s = server; server = null; tokens.clear(); s.close(() => ok(status())); s.closeAllConnections && s.closeAllConnections(); }); }
  };
}
module.exports = { create, ips };
