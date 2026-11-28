'use strict';
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const os = require('os'); const path = require('path'); const http = require('http');
const { EventEmitter } = require('events');
const ms = require('../src/main/microsip'); const cid = require('../src/core/callerid');
const { DB } = require('../src/core/db'); const { Service } = require('../src/core/service');

test('caller id: numbers, SIP URIs, junk and injection attempts', () => {
  assert.equal(cid.parseCaller('07701234567'), '07701234567');
  assert.equal(cid.parseCaller('"Ali" <sip:+9647701234567@pbx.local>'), '+9647701234567');
  assert.equal(cid.parseCaller('sip:105@10.0.0.1'), '105');
  assert.equal(cid.parseCaller('x" & calc & "'), ''); assert.equal(cid.parseCaller(''), ''); assert.equal(cid.parseCaller(undefined), '');
  assert.ok(cid.sameNumber('07701234567', '+9647701234567') && cid.sameNumber('07701234567', '009647701234567'));
  assert.ok(!cid.sameNumber('07701234567', '07701234568') && !cid.sameNumber('105', '0105'));
  assert.equal(cid.dialNumber('0770 123 4567', '9'), '907701234567'); assert.equal(cid.dialNumber('+9647701234567', '9'), '+9647701234567'); assert.equal(cid.dialNumber('1; calc'), ''); assert.equal(cid.dialNumber('12'), '');
});

test('callerLookup finds the patient by either number and returns today + next session', () => {
  const db = new DB(':memory:'); const now = new Date(2026, 10, 27, 9).getTime(); const svc = new Service(db, { now: () => now });
  const A = { id: svc.saveSecretary({ name: 'Admin', role: 'admin' }), name: 'Admin' };
  const type = svc.saveCatalog({ kind: 'type', item: { name: 'Traction', duration_min: 30, price: 0, per_day: 1, min_gap_min: 0 } }, A);
  const dev = svc.saveCatalog({ kind: 'device', item: { name: 'Dev A', typeIds: [type] } }, A);
  const pid = svc.savePatient({ patient: { name: 'Ali Hassan', phone: '07701234567', phone2: '07801112222' } }, A).id || svc.searchPatients({ q: 'Ali' }).find(Boolean).id;
  const r0 = svc.callerLookup({ number: '+964 780 111 2222' }); assert.equal(r0.matches.length, 1); assert.equal(r0.matches[0].name, 'Ali Hassan'); assert.equal(r0.matches[0].today.length, 0);
  svc.addBooking({ patientId: pid, typeId: type, deviceId: dev, date: '2026-11-27', hour: 10 }, A); svc.addBooking({ patientId: pid, typeId: type, deviceId: dev, date: '2026-11-29', hour: 11 }, A);
  const r = svc.callerLookup({ number: '"x" <sip:07701234567@h>' }); assert.equal(r.matches[0].today[0].time, '10:00'); assert.equal(r.matches[0].next[0].date, '2026-11-29');
  assert.deepEqual(svc.callerLookup({ number: '07999999999' }).matches, []); assert.deepEqual(svc.callerLookup({ number: 'junk' }), { number: '', matches: [] });
});

test('dial: validates, reports missing MicroSIP, spawns with the number as the only argument', async () => {
  const calls = []; const ok = (exe, args, o) => { calls.push({ exe, args, o }); const c = new EventEmitter(); c.unref = () => {}; setImmediate(() => c.emit('spawn')); return c; };
  const bad = () => { const c = new EventEmitter(); c.unref = () => {}; setImmediate(() => c.emit('error', Object.assign(new Error('x'), { code: 'ENOENT' }))); return c; };
  const r = await ms.dial({ exe: 'C:\\m\\microsip.exe', number: '0770 123 4567', prefix: '', spawnFn: ok }); assert.equal(r.number, '07701234567');
  assert.deepEqual(calls[0].args, ['07701234567']); assert.equal(calls[0].o.shell, false);
  await assert.rejects(ms.dial({ exe: 'C:\\m\\microsip.exe', number: 'abc; calc', spawnFn: ok }), { code: 'BAD_NUMBER' });
  await assert.rejects(ms.dial({ exe: '', number: '07701234567', spawnFn: ok }), { code: 'NO_MICROSIP' });
  await assert.rejects(ms.dial({ exe: 'C:\\gone\\microsip.exe', number: '07701234567', spawnFn: bad }), { code: 'NO_MICROSIP' });
  assert.equal(ms.findExe('C:\\p\\microsip.exe', (p) => p === 'C:\\p\\microsip.exe'), 'C:\\p\\microsip.exe'); assert.equal(ms.findExe('C:\\p\\evil.exe', () => true, {}), '');
});

test('MicroSIP.ini editing keeps encoding, other keys and sections', () => {
  const hook = 'C:\\cd\\caredesk-hook.bat';
  let out = ms.setIniKey(Buffer.from('[Settings]\r\naccountId=1\r\ncmdIncomingCall=C:\\old.bat\r\nring=x\r\n[Other]\r\nk=v\r\n'), 'cmdIncomingCall', hook); let t = out.toString('utf8');
  assert.ok(t.includes('cmdIncomingCall=' + hook) && !t.includes('old.bat') && t.includes('ring=x') && t.includes('[Other]\r\nk=v'));
  out = ms.setIniKey(Buffer.from('[Settings]\r\naccountId=1\r\n\r\n[Other]\r\nk=v\r\n'), 'cmdIncomingCall', hook); t = out.toString('utf8'); assert.ok(t.indexOf('cmdIncomingCall') < t.indexOf('[Other]') && t.indexOf('cmdIncomingCall') > t.indexOf('[Settings]'));
  const u16 = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('[Settings]\r\naccountId=1\r\n', 'utf16le')]); out = ms.setIniKey(u16, 'cmdIncomingCall', hook);
  assert.equal(out[0], 0xff); assert.equal(out[1], 0xfe); assert.equal(ms.getIniKey(out, 'cmdIncomingCall'), hook); assert.equal(ms.getIniKey(out, 'accountId'), '1');
  assert.equal(ms.getIniKey(ms.setIniKey(Buffer.alloc(0), 'cmdIncomingCall', hook), 'cmdIncomingCall'), hook);
});

const get = (port, p, headers = {}) => new Promise((res) => { const r = http.get({ host: '127.0.0.1', port, path: p, headers }, (x) => { x.resume(); x.on('end', () => res(x.statusCode)); }); r.on('error', () => res(0)); });
test('bridge: loopback only, secret required, no browser origins, rate limited; hook + ini installer', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cdms-')); const got = []; const port = 40000 + Math.floor(Math.random() * 20000);
  const b = ms.create({ dir, onIncoming: (n) => got.push(n) }); const st = await b.start(port); assert.ok(st.running);
  const k = b.token(); assert.match(k, /^[0-9a-f]{32}$/);
  assert.equal(await get(port, '/health'), 204);
  assert.equal(await get(port, '/incoming?n=07701234567&k=' + 'a'.repeat(32)), 401);
  assert.equal(await get(port, '/incoming?n=07701234567'), 401);
  assert.equal(await get(port, '/incoming?n=07701234567&k=' + k, { Origin: 'https://evil.example' }), 403);
  assert.equal(await get(port, '/incoming?n=07701234567&k=' + k, { Host: 'evil.example' }), 403);
  assert.equal(await get(port, '/incoming?n=' + encodeURIComponent('x" & calc') + '&k=' + k), 400);
  assert.equal(await get(port, '/incoming?n=' + encodeURIComponent('"Ali" <sip:07701234567@h>') + '&k=' + k), 204);
  assert.equal(await get(port, '/incoming?n=07701234567&k=' + k), 204); // duplicate within 1.5 s is swallowed
  await new Promise((r) => setTimeout(r, 30)); assert.deepEqual(got, ['07701234567']);
  const hook = fs.readFileSync(b.hookFile, 'utf8'); assert.ok(hook.includes(`127.0.0.1:${port}/incoming?k=${k}`) && hook.includes('curl.exe'));
  const exe = path.join(dir, 'MicroSIP', 'microsip.exe'); fs.mkdirSync(path.dirname(exe), { recursive: true }); fs.writeFileSync(exe, ''); fs.writeFileSync(path.join(path.dirname(exe), 'microsip.ini'), '[Settings]\r\ncmdIncomingCall=C:\\theirs.bat\r\n');
  const r = b.installHook(exe, {}); assert.equal(r.replaced, 'C:\\theirs.bat'); assert.equal(ms.getIniKey(fs.readFileSync(r.ini), 'cmdIncomingCall'), b.hookFile); assert.ok(fs.existsSync(path.join(dir, 'MicroSIP.ini.before-caredesk')));
  const dup = ms.create({ dir, onIncoming() {} }); await assert.rejects(dup.start(port), { code: 'PORT_BUSY' }); await assert.rejects(dup.start(80), { code: 'BAD_PORT' });
  await b.stop(); assert.equal(await get(port, '/health'), 0);
});
