'use strict';
// CareDesk Doctor — deep check. Run by the Doctor with the app's own runtime:   CareDesk.exe doctor\deep-check.js --install <dir> --db <copy of caredesk.sqlite>
// (the Doctor sets ELECTRON_RUN_AS_NODE=1, so no second Node install is needed). READ-ONLY: it never writes anything; the database is opened read-only
// on the COPY the Doctor made first. Prints one JSON object: { results:[{ check, status:'ok'|'warn'|'fail', detail }] }.
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const arg = (k) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : ''; };
const results = []; const add = (check, status, detail = '') => results.push({ check, status, detail: String(detail).slice(0, 300) });
const install = arg('install'); const dbFile = arg('db');
// asar archives are readable through fs in Electron's node mode; a plain folder works the same (used by tests)
const appRoot = install ? (fs.existsSync(path.join(install, 'resources', 'app.asar')) ? path.join(install, 'resources', 'app.asar') : path.join(install, 'resources', 'app')) : arg('app');

try {
  if (!appRoot) throw new Error('no app path');
  const pkg = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8')); add('app package', 'ok', `${pkg.name} ${pkg.version}`);
} catch (e) { add('app package', 'fail', 'cannot read package.json inside app.asar: ' + (e && e.message)); }

try { JSON.parse(fs.readFileSync(path.join(appRoot, 'config', 'app.json'), 'utf8')); add('config/app.json', 'ok'); } catch (e) { add('config/app.json', 'fail', e && e.message); }

try { // same rule as the app's own tamper check: every source file must match config/integrity.json
  const f = path.join(appRoot, 'config', 'integrity.json');
  if (!fs.existsSync(f)) add('file integrity', 'ok', 'no integrity manifest in this build');
  else { const want = JSON.parse(fs.readFileSync(f, 'utf8')); const bad = [];
    for (const [rel, h] of Object.entries(want.files || {})) { let got = ''; try { got = crypto.createHash('sha256').update(fs.readFileSync(path.join(appRoot, rel))).digest('hex'); } catch { got = 'missing'; } if (got !== h) bad.push(rel); }
    add('file integrity', bad.length ? 'fail' : 'ok', bad.length ? bad.slice(0, 5).join(', ') + (bad.length > 5 ? ' +' + (bad.length - 5) : '') : Object.keys(want.files || {}).length + ' files verified'); }
} catch (e) { add('file integrity', 'fail', e && e.message); }

if (dbFile) {
  try {
    const { DatabaseSync } = require('node:sqlite'); const db = new DatabaseSync(dbFile, { readOnly: true });
    try {
      const ic = db.prepare('PRAGMA integrity_check').all().map((r) => Object.values(r)[0]);
      if (ic.length === 1 && ic[0] === 'ok') {
        let n = ''; try { const c = (t) => db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c; n = `${c('patients')} patients, ${c('bookings')} sessions`; } catch { /* schema may be older */ }
        add('database integrity', 'ok', n);
      } else add('database integrity', 'fail', ic.slice(0, 3).join(' | '));
    } finally { db.close(); }
  } catch (e) { add('database integrity', 'fail', e && e.message); }
}
process.stdout.write(JSON.stringify({ results, electron: process.versions.electron || '', node: process.versions.node }));
