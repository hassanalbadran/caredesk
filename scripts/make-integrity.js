'use strict';
// Run at build time (npm run build does it): writes config/integrity.json with sha256 of every source file the app loads.
const fs = require('fs'), path = require('path'), crypto = require('crypto'); const root = path.join(__dirname, '..'); const files = {};
const walk = (d) => { for (const e of fs.readdirSync(path.join(root, d), { withFileTypes: true })) { const rel = path.posix.join(d, e.name); if (e.isDirectory()) walk(rel); else if (/\.(js|html|css|json|png|svg|woff2?)$/.test(e.name)) files[rel] = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, rel))).digest('hex'); } };
walk('src'); fs.writeFileSync(path.join(root, 'config/integrity.json'), JSON.stringify({ made: new Date().toISOString(), files }, null, 1)); console.log('integrity.json:', Object.keys(files).length, 'files');
