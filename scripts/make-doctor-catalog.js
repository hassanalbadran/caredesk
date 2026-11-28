'use strict';
// Writes doctor/catalog.json (error codes + plain-language steps) from the app's own catalog, so CareDesk Doctor never disagrees with the app.
const fs = require('fs'); const path = require('path'); const { CATALOG } = require('../src/core/diagnose');
const out = path.join(__dirname, '../doctor/catalog.json');
const data = CATALOG.map(({ code, name, sev, auto, ar, en, steps_ar, steps_en }) => ({ code, name, sev, auto: !!auto, ar, en, steps_ar: steps_ar || [], steps_en: steps_en || [] }));
fs.writeFileSync(out, JSON.stringify(data, null, 1) + '\n'); console.log('doctor/catalog.json:', data.length, 'codes');
