'use strict';
// MicroSIP link UI: call buttons (profile, today list, patient list), "not set up" message, settings form, incoming-call card (known / unknown number)
const { chromium } = require('playwright'); const { start } = require('./harness');
(async () => {
  const H = await start(); const errs = []; const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1360, height: 860 }, colorScheme: 'dark' });
  pg.on('pageerror', (e) => errs.push('PAGEERR ' + e.message)); pg.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  await pg.addInitScript(() => { localStorage.setItem('cd.welcomed', '1'); localStorage.setItem('cd.tour', '1'); }); await pg.goto(H.url); await pg.waitForSelector('#rail');
  const a = { id: 1, name: 'Admin' }; const svc = H.svc; const today = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  const type = svc.saveCatalog({ kind: 'type', item: { name: 'Physio', duration_min: 30, price: 1, per_day: 1 } }, a);
  const dev = svc.saveCatalog({ kind: 'device', item: { name: 'Device A', typeIds: [type], avg_min: 30 } }, a);
  const open = { on: true, open: '09:00', close: '17:00' }; svc.saveSettings({ patch: { hours: { 0: open, 1: open, 2: open, 3: open, 4: open, 5: open, 6: open } } }, a);
  const pid = svc.savePatient({ patient: { name: 'Caller One', phone: '07701234567', phone2: '07809998888' }, bookings: svc.previewPlan({ plans: [{ typeId: type, deviceId: dev, count: 2, startDate: today }] }).bookings }, a).id;
  const toastText = () => pg.evaluate(() => [...document.querySelectorAll('.toast')].map((x) => x.textContent).join('|'));

  // 1) profile: call button with MicroSIP not configured -> clear message, nothing dialled
  await pg.evaluate((id) => CD.openProfile(id), pid); await pg.waitForSelector('dialog .pf-facts');
  await pg.locator('dialog .pf-facts button').first().click(); await pg.waitForTimeout(300); const t1 = await toastText(); console.log('NOMS', t1); if (!/MicroSIP/.test(t1)) throw new Error('no "not set up" message'); if (H.sys.dials.length) throw new Error('dialled without MicroSIP');
  // 2) configure through the settings form, then call both numbers
  await pg.evaluate(() => document.querySelector('dialog').close_ && document.querySelector('dialog').close_()); await pg.keyboard.press('Escape');
  await pg.evaluate(() => { const d = document.createElement('div'); d.id = 'mount'; document.body.append(d); d.append(CD.microsipForm()); }); await pg.waitForSelector('#mount .switch');
  await pg.fill('#mount input[placeholder*="microsip"]', 'C:\\evil\\calc.exe'); await pg.locator('#mount .btn.pri').click(); await pg.waitForTimeout(300); const t2 = await toastText(); console.log('BADPATH', t2); if (!/microsip\.exe/i.test(t2)) throw new Error('bad path accepted');
  await pg.fill('#mount input[placeholder*="microsip"]', 'C:\\Program Files\\MicroSIP\\microsip.exe'); await pg.check('#mount .switch'); await pg.locator('#mount .btn.pri').click(); await pg.waitForTimeout(300);
  if (!H.sys.msStatus().enabled) throw new Error('settings not applied');
  await pg.evaluate(() => CD.callPhone('07701234567')); await pg.waitForTimeout(200); await pg.evaluate(() => CD.callPatient(1)); await pg.waitForSelector('dialog .grid button'); await pg.locator('dialog .grid button').nth(1).click(); await pg.waitForTimeout(300);
  console.log('DIALS', JSON.stringify(H.sys.dials)); if (H.sys.dials.join() !== '07701234567,07809998888') throw new Error('wrong dials');
  // 3) call buttons exist in today's list and the patient list
  await pg.evaluate(() => { document.getElementById('mount').remove(); }); await pg.click('#nav-patients'); await pg.waitForSelector('.tbl'); if (!(await pg.locator('.tbl [data-tip="اتصال"], .tbl [data-tip="Call"]').count())) throw new Error('no call button in patients list');
  // 4) incoming call card: known and unknown
  await pg.evaluate((r) => CD.incomingCall(r), svc.callerLookup({ number: '+964 780 999 8888' })); await pg.waitForSelector('#callpop:popover-open .cp-name'); const nm = await pg.textContent('#callpop .cp-name'); console.log('CARD', nm); if (!/Caller One/.test(nm)) throw new Error('card missing the patient');
  if (!(await pg.locator('#callpop .cp-list').count())) throw new Error('card missing today sessions'); if (process.env.SHOT2) await pg.waitForTimeout(600), await pg.screenshot({ path: process.env.SHOT2 });
  await pg.locator('#callpop .btn.pri').click(); await pg.waitForSelector('dialog .pf-facts'); await pg.keyboard.press('Escape');
  await pg.evaluate((r) => CD.incomingCall(r), svc.callerLookup({ number: '07500000000' })); await pg.waitForSelector('#callpop .cp-name'); const un = await pg.textContent('#callpop .cp-name'); console.log('UNKNOWN', un);
  await pg.locator('#callpop .btn.pri').click(); await pg.waitForSelector('dialog input.in'); const pv = await pg.locator('dialog input.in').nth(1).inputValue(); console.log('PREFILL', pv); if (pv !== '07500000000') throw new Error('new patient not prefilled with the caller number');
  await pg.screenshot({ path: process.env.SHOT || '/tmp/v2.png' });
  console.log('ERRORS', errs.length, errs.slice(0, 5).join(' || ')); await b.close(); H.srv.close(); process.exit(errs.length ? 1 : 0);
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
