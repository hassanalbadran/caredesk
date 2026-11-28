'use strict';
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const os = require('os'); const path = require('path'); const cp = require('child_process');
const root = path.join(__dirname, '..'); const D = (f) => path.join(root, 'doctor', f);

test('Doctor catalog is in sync with the app error catalog (run: node scripts/make-doctor-catalog.js)', () => {
  const { CATALOG } = require('../src/core/diagnose'); const got = JSON.parse(fs.readFileSync(D('catalog.json'), 'utf8'));
  assert.deepEqual(got.map((c) => c.code), CATALOG.map((c) => c.code)); for (const c of got) assert.ok(c.ar && c.en && Array.isArray(c.steps_ar) && Array.isArray(c.steps_en), c.code);
});

test('crash patterns: valid regexes, first match per sample event is the right cause', () => {
  const P = JSON.parse(fs.readFileSync(D('crash-patterns.json'), 'utf8')); for (const p of P) { new RegExp(p.test, 'i'); assert.ok(['safe', 'reinstall', 'kill'].includes(p.action) && p.ar && p.en && p.steps_ar.length && p.steps_en.length, p.id); }
  const first = (s) => (P.find((p) => new RegExp(p.test, 'i').test(s)) || {}).id;
  assert.equal(first('kind=crash; module=nvoglv64.dll; code=0xc0000005; path=C:\\Windows\\System32\\nvoglv64.dll'), 'gpu_driver');
  assert.equal(first('kind=crash; module=CareDesk.exe; code=0xc0000005; path=x'), 'access_violation');
  assert.equal(first('kind=crash; module=KERNELBASE.dll; code=0xc000007b; path=x'), 'missing_dll');
  assert.equal(first('kind=crash; module=ffmpeg.dll; code=0xc0000409; path=x'), 'corrupt_runtime');
  assert.equal(first('kind=hang; module=; code=; path='), 'hang'); assert.equal(first('kind=crash; module=foo.dll; code=0x1; path='), undefined);
});

test('deep-check: healthy install passes; damaged config/database are reported and nothing is written', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'cdoc-')); fs.cpSync(path.join(root, 'config'), path.join(d, 'resources/app/config'), { recursive: true }); fs.copyFileSync(path.join(root, 'package.json'), path.join(d, 'resources/app/package.json'));
  const { DB } = require('../src/core/db'); const f = path.join(d, 'ok.sqlite'); const db = new DB(f); db.h.exec('VACUUM'); try { db.close(); } catch { /* ignore */ }
  const run = (dbf) => JSON.parse(cp.spawnSync(process.execPath, [D('deep-check.js'), '--install', d, '--db', dbf], { encoding: 'utf8' }).stdout).results;
  const st = (r, n) => r.find((x) => x.check === n).status;
  let r = run(f); assert.equal(st(r, 'database integrity'), 'ok'); assert.equal(st(r, 'config/app.json'), 'ok');
  const before = fs.statSync(f).mtimeMs; const bad = path.join(d, 'bad.sqlite'); fs.writeFileSync(bad, Buffer.concat([Buffer.from('SQLite format 3\0'), Buffer.alloc(300, 7)]));
  fs.writeFileSync(path.join(d, 'resources/app/config/app.json'), '{oops'); r = run(bad); assert.equal(st(r, 'database integrity'), 'fail'); assert.equal(st(r, 'config/app.json'), 'fail'); assert.equal(fs.statSync(f).mtimeMs, before);
});

test('Doctor script + installer wiring', () => {
  const ps = fs.readFileSync(D('CareDeskDoctor.ps1')); assert.deepEqual([...ps.slice(0, 3)], [0xef, 0xbb, 0xbf], 'PowerShell 5.1 needs a UTF-8 BOM to read Arabic text');
  const t = ps.toString('utf8'); assert.ok(!/\$home\b/i.test(t), '$home is a read-only PowerShell variable'); assert.ok(t.indexOf('Step-Backup)') < t.indexOf('Step-Processes;'), 'backup must come before any repair');
  const pkg = require('../package.json'); assert.equal(pkg.build.nsis.include, 'build/installer.nsh'); assert.ok(pkg.build.extraFiles.some((x) => x.to === 'Doctor')); assert.ok(pkg.build.files.includes('build/icon.png'));
  const nsh = fs.readFileSync(path.join(root, 'build/installer.nsh'), 'utf8'); assert.ok(/customInstall/.test(nsh) && /customUnInstall/.test(nsh) && /CareDeskDoctor\.ps1/.test(nsh));
  for (const f of ['CareDeskDoctor.ps1', 'deep-check.js', 'catalog.json', 'crash-patterns.json', 'doctor.ico']) assert.ok(fs.existsSync(D(f)), f);
});
