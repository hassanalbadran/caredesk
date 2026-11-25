'use strict';
// Serves the renderer + an /rpc bridge backed by the REAL Service on an in-memory DB, so the UI can be exercised in headless Chrome without Electron.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { DB } = require('../../src/core/db'); const { Service } = require('../../src/core/service'); const barcode = require('../../src/core/barcode');
const root = path.join(__dirname, '../../src/renderer');
function start(port = 0) {
  const db = new DB(':memory:'); const svc = new Service(db); let actor = null;
  const ensure = () => { if (!actor) { const id = svc.saveSecretary({ name: 'Admin', role: 'manager', perms: [] }, null); actor = { id, name: 'Admin' }; } };
  const cd = (m, a) => {
    if (m === 'whoami') return actor ? { actor, perms: svc._perms(actor), role: 'manager' } : null;
    if (m === 'autoLogin') { ensure(); return { ok: true }; } if (m === 'logout') { actor = null; return true; }
    if (!actor) throw Object.assign(new Error('NOT_SIGNED_IN'), { code: 'AUTH' });
    return svc.call(m, a, actor);
  };
  const diag = require('../../src/core/diagnose'); const phoneMod = require('../../src/main/phonelink'); let ph = null; const phone = () => ph || (ph = phoneMod.create({ svc, redact: (x) => x })); const sys = { phoneStatus: () => phone().status(), phoneSet: async ({ enabled }) => { if (enabled) await phone().start(18765); else await phone().stop(); return phone().status(); }, phonePin: () => phone().newPin(), serverInfo: () => ({ url: '', fixed: false }), setServer: ({ url }) => ({ url }), diagnose: ({ fix }) => { const r = diag.run(db, svc, { fix: !!fix }); return { ...r, catalog: r.findings.map((f) => diag.byCode(f.code)) }; }, errorCatalog: () => diag.CATALOG, reportError: () => true, devUnlock: () => ({ ok: true }), license: () => ({ status: 'active', plan: 'community', tier: 'max', daysLeft: null, warn: false, canUse: true, expiresAt: null }), autostart: () => ({ on: false }), edition: () => ({ paid: false, version: '0.1.0-beta.2', site: '', repo: '' }), checkUpdates: () => ({ ok: false, code: 'NO_REPO' }), notices: () => ({ ok: true, items: [] }), account: () => null, info: () => ({ version: '0.1.0-beta.2', site: 'https://hasn2mr.pages.dev/' }), barcodeSvg: ({ code }) => barcode.svg(code), printers: () => [{ name: 'PDF', isDefault: true }], latest: () => ({ ok: true, version: '0.1.0-beta.2', current: '0.1.0-beta.2' }), open: () => true, whatsapp: () => true, win: () => false, heartbeat: () => sys.license(), eclinicQuery: () => [] };
  const bridge = `window.cd={call:(m,a)=>r('call',m,a),cloud:(m,a)=>r('cloud',m,a),sys:(m,a)=>r('sys',m,a),on:()=>()=>{}};function r(k,m,a){return fetch('/rpc',{method:'POST',body:JSON.stringify({k,m,a})}).then(x=>x.json())}`;
  const srv = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/rpc') { let b = ''; req.on('data', (c) => (b += c)); req.on('end', async () => { const { k, m, a } = JSON.parse(b); let out; try { out = { ok: true, data: await ( k === 'call' ? cd(m, a) : k === 'sys' ? sys[m](a || {}) : { ok: false, code: 'OFFLINE' }) }; } catch (e) { out = { ok: false, code: e.code || 'ERR', error: String(e.message) }; } res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(out)); }); return; }
    let f = req.url.split('?')[0]; if (f === '/bridge.js') { res.setHeader('content-type', 'text/javascript'); return res.end(bridge); }
    if (f === '/' || f === '/index.html') { let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace('<script src="js/core.js">', '<script src="/bridge.js"></script><script src="js/core.js">'); res.setHeader('content-type', 'text/html'); return res.end(html); }
    const p = path.join(root, f); if (!p.startsWith(root) || !fs.existsSync(p)) { res.statusCode = 404; return res.end(); }
    res.setHeader('content-type', f.endsWith('.css') ? 'text/css' : f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream'); res.end(fs.readFileSync(p));
  });
  return new Promise((ok) => srv.listen(port, () => ok({ srv, db, svc, url: 'http://127.0.0.1:' + srv.address().port })));
}
module.exports = { start };
