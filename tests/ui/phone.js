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
  await pg.click('#nav-settings'); await pg.waitForTimeout(300);
  await pg.locator('#main .acc-h').filter({ hasText: /^\s*الربط/ }).first().click(); await pg.waitForTimeout(300); const found = (await pg.locator('text=الربط مع الهاتف').count()) > 0;
  await pg.screenshot({ path: '/tmp/fl-phone-dbg.png' }); if (!found) throw new Error('phone section not found'); await pg.waitForTimeout(600); await pg.locator('label:has-text("تفعيل الربط مع الهاتف") input').check(); await pg.waitForTimeout(1500); console.log('COUNT', await pg.locator('label:has-text("تفعيل الربط مع الهاتف")').count()); console.log('TOAST', await pg.evaluate(() => [...document.querySelectorAll('.toast, [class*=toast]')].map((x) => x.textContent).join('|'))); console.log('DBG', await pg.evaluate(() => CD.sys('phoneStatus').then((s) => JSON.stringify(s), (e) => 'ERR ' + e.message)), await pg.evaluate(() => [...document.querySelectorAll('.card.inset')].pop().innerHTML.slice(-380).replace(/<svg.*?<\/svg>/g, ''))); await pg.screenshot({ path: '/tmp/fl-phone-settings.png' });
  const pin = (await pg.locator('b[style*="letter-spacing"]').first().textContent()).trim(); console.log('PIN', pin);
  const ph = await b.newPage({ viewport: { width: 390, height: 780 } }); await ph.goto('http://127.0.0.1:18765/'); await ph.fill('input', pin); await ph.waitForSelector('.card >> text=أحمد'); await ph.screenshot({ path: '/tmp/fl-phone-page.png' });
  await ph.locator('button:has-text("وصل")').first().click(); await ph.waitForSelector('.pill.arr'); console.log('PHONE OK');
  console.log('ERRORS', errs.length); errs.forEach((e) => console.log(e)); await b.close(); H.srv.close(); process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
