'use strict';
// colours: a full day must show red in the add-session dialog, the package selects and the distribution preview
const { chromium } = require('playwright'); const { start } = require('./harness');
(async () => {
  const H = await start(); const errs = []; const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1360, height: 860 }, colorScheme: 'dark' });
  pg.on('pageerror', (e) => errs.push('PAGEERR ' + e.message)); pg.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  await pg.addInitScript(() => { localStorage.setItem('cd.welcomed', '1'); localStorage.setItem('cd.tour', '1'); }); await pg.goto(H.url); await pg.waitForSelector('#rail');
  const a = { id: 1, name: 'Admin' }; const svc = H.svc; const today = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  const type = svc.saveCatalog({ kind: 'type', item: { name: 'Physio', duration_min: 30, price: 1, per_day: 1 } }, a);
  const dev = svc.saveCatalog({ kind: 'device', item: { name: 'Device A', typeIds: [type], avg_min: 30 } }, a); svc.saveCatalog({ kind: 'device', item: { name: 'Device B', typeIds: [type], avg_min: 30 } }, a);
  const open = { on: true, open: '09:00', close: '10:00' }; svc.saveSettings({ patch: { hours: { 0: open, 1: open, 2: open, 3: open, 4: open, 5: open, 6: open } } }, a);
  for (const [n, tm] of [['أحمد', '09:00'], ['سارة', '09:30']]) svc.savePatient({ patient: { name: n, phone: '0770' }, bookings: [{ type_id: type, device_id: dev, date: today, time: tm }] }, a);
  const lv = svc.dayLoad({ date: today }); console.log('LOAD', JSON.stringify(lv.devices.map((d) => [d.name, d.level])), lv.all.level);
  await pg.click('#nav-calendar'); await pg.waitForSelector('.fcal'); await pg.locator('.fday.today .tbtn:not(.zero)').first().click(); await pg.locator('.dcard', { hasText: 'Device A' }).click(); await pg.waitForSelector('.tl');
  await pg.locator('.hr.work').first().click({ button: 'right', position: { x: 80, y: 8 } }); await pg.waitForSelector('.cmenu'); await pg.locator('.cmenu >> text=إضافة جلسة').first().click(); await pg.waitForSelector('dialog.dlg select');
  const opts = await pg.evaluate(() => [...document.querySelectorAll('dialog.dlg select option')].map((o) => o.textContent)); console.log('OPTS', JSON.stringify(opts)); await pg.screenshot({ path: '/tmp/fl-load.png' });
  if (!opts.some((o) => o.includes('🔴') && o.includes('Device A'))) throw new Error('Device A should be red'); if (!opts.some((o) => o.includes('🟢') && o.includes('Device B'))) throw new Error('Device B should be green');
  console.log('ERRORS', errs.length); errs.forEach((e) => console.log(e)); await b.close(); H.srv.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
