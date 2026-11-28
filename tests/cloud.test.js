'use strict';
const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const cloud = require('../src/main/cloud');

const serve = (handler) => new Promise((res) => { const s = http.createServer(handler); s.listen(0, '127.0.0.1', () => res({ s, url: `http://127.0.0.1:${s.address().port}/exec` })); });

test('cloud.post follows the Apps Script 302 and returns the JSON', async () => {
  const { s, url } = await serve((req, res) => {
    if (req.method === 'POST') { res.writeHead(302, { Location: '/echo' }); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true, hello: 'x' }));
  });
  const r = await cloud.post(url, { action: 'ping' }); s.close(); assert.deepStrictEqual(r, { ok: true, hello: 'x' });
});
test('an HTML error page is reported as BAD_RESPONSE with a readable hint (not "offline")', async () => {
  const { s, url } = await serve((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<html><style>x{}</style><body><h1>Script function not found: doPost</h1></body></html>'); });
  const r = await cloud.post(url, { action: 'login' }); s.close();
  assert.strictEqual(r.ok, false); assert.strictEqual(r.code, 'BAD_RESPONSE'); assert.ok(!r.offline); assert.match(r.hint, /doPost/); assert.strictEqual(r.http, 200);
});
test('a slow server is TIMEOUT, a closed port is OFFLINE', async () => {
  const { s, url } = await serve(() => { /* never answers */ });
  const t = await cloud.post(url, { action: 'register' }, 300); s.close?.(); s.closeAllConnections?.();
  assert.strictEqual(t.code, 'TIMEOUT'); assert.strictEqual(t.offline, true);
  const o = await cloud.post('http://127.0.0.1:9/exec', { action: 'register' }, 2000); assert.strictEqual(o.code, 'OFFLINE');
});
test('safe actions are retried once after a flaky first request', async () => {
  let n = 0; const { s, url } = await serve((req, res) => { n++; if (n === 1) return req.socket.destroy(); res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":true}'); });
  const r = await cloud.post(url, { action: 'login' }, 2000); s.close(); assert.strictEqual(r.ok, true); assert.strictEqual(n, 2);
});
test('no server configured', async () => { assert.strictEqual((await cloud.post('', { action: 'x' })).code, 'NO_SERVER'); });
