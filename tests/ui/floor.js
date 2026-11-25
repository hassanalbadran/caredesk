'use strict';
const { chromium } = require('playwright'); const { start } = require('./harness');
(async () => {
  const H = await start(); const errs = []; const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1360, height: 860 }, colorScheme: 'dark' });
  pg.on('pageerror', (e) => errs.push('PAGEERR ' + e.message)); pg.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  await pg.addInitScript(() => { localStorage.setItem('cd.welcomed', '1'); localStorage.setItem('cd.tour', '1'); }); await pg.goto(H.url); await pg.waitForSelector('#rail');
  const a = { id: 1, name: 'Admin' }; const svc = H.svc; const today = new Date().toISOString().slice(0, 10);
  const type = svc.saveCatalog({ kind: 'type', item: { name: 'Physio', duration_min: 30, price: 25000, per_day: 1 } }, a);
  const type2 = svc.saveCatalog({ kind: 'type', item: { name: 'Laser', duration_min: 20, price: 15000, per_day: 1 } }, a);
  const dev = svc.saveCatalog({ kind: 'device', item: { name: 'Device A', typeIds: [type] } }, a);
  svc.saveCatalog({ kind: 'device', item: { name: 'Device B', typeIds: [type] } }, a);
  const open = { on: true, open: '00:00', close: '23:59' }; svc.saveSettings({ patch: { hours: { 0: open, 1: open, 2: open, 3: open, 4: open, 5: open, 6: open } } }, a);
  for (const n of ['أحمد', 'سارة', 'علي']) svc.savePatient({ patient: { name: n, phone: '0770' + n.length }, bookings: svc.previewPlan({ plans: [{ typeId: type, count: 3, startDate: today, deviceId: dev }] }).bookings }, a);
  const shot = (n) => pg.screenshot({ path: `/tmp/fl-${n}.png` });
  await pg.reload(); await pg.waitForSelector('.fcal'); await pg.waitForTimeout(500); await shot('home');
  const btn = pg.locator('.fday.today .tbtn:not(.zero)').first(); const cnt = await btn.locator('b').innerText(); if (!(+cnt > 0)) throw new Error('no count on type button');
  await btn.click(); await pg.waitForSelector('.dcard'); await shot('type');
  await pg.locator('.dcard', { hasText: 'Device A' }).click(); await pg.waitForSelector('.tl .hr'); await pg.waitForTimeout(400); await shot('device');
  const n = await pg.locator('.pc').count(); if (n < 3) throw new Error('expected circles, got ' + n);
  // timer: start on first circle
  await pg.locator('.pc').first().click(); await pg.waitForSelector('.pop'); await shot('timerpop'); await pg.click('.pop .btn.pri'); await pg.waitForTimeout(700);
  if (!(await pg.locator('.pc.in').count())) throw new Error('timer did not start'); await shot('running'); console.log(JSON.stringify(await pg.evaluate(() => [...document.querySelectorAll('.pc')].map((e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return [e.className, Math.round(r.width), Math.round(r.height), c.display, c.minHeight, c.padding, e.innerHTML.slice(0, 80)]; })))); await pg.locator('.hr').first().screenshot({ path: '/tmp/fl-row.png' }); console.log(await pg.evaluate(() => { const r = document.querySelector('.hr').getBoundingClientRect(); const out = []; for (let x = 0; x < 1244; x += 6) { const e = document.elementFromPoint(r.left + x, r.top + 5); out.push(e && e.className); } return [...new Set(out)].join('|'); }));
  // right click menu on second circle
  await pg.locator('.pc').nth(1).click({ button: 'right' }); await pg.waitForSelector('.cmenu'); await pg.waitForTimeout(500); await shot('ctx'); await pg.keyboard.press('Escape');
  // drag second circle to another hour row
  const rows = pg.locator('.hr.work'); const target = rows.nth(Math.min(2, (await rows.count()) - 1));
  await pg.locator('.pc').nth(1).dragTo(target); await pg.waitForTimeout(700); await shot('dragged');
  // right-click an hour → add-session window
  { const row = pg.locator('.hr.work').nth(3); await row.click({ button: 'right', position: { x: 80, y: 8 } }); await pg.waitForSelector('.cmenu'); await pg.locator('.cmenu >> text=إضافة جلسة').first().click(); await pg.waitForSelector('dialog.dlg .db button.flat'); await shot('addsess-search');
    const before = await pg.locator('.pc').count(); await pg.locator('dialog.dlg .db button.flat').first().click(); await pg.waitForSelector('dialog.dlg .pf-head'); await pg.waitForTimeout(300); await shot('addsess-picked');
    const opts = await pg.evaluate(() => [...document.querySelectorAll('dialog.dlg select option')].map((o) => o.textContent)); console.log('OPTS', JSON.stringify(opts));
    await pg.locator('dialog.dlg .btn.pri').click(); await pg.waitForTimeout(800); const after = await pg.locator('.pc').count(); if (after !== before + 1) throw new Error(`add session: ${before} -> ${after}`); await shot('addsess-done'); }
  await pg.click('#nav-tools'); await pg.waitForSelector('.acc-item.open svg'); await pg.waitForTimeout(2500); await shot('stats');
  await pg.click('#nav-calendar'); await pg.waitForSelector('.fcal'); await pg.locator('.fday.today .tbtn:not(.zero)').first().click(); await pg.locator('.dcard', { hasText: 'Device A' }).click(); await pg.waitForSelector('.pc');
  // bell
  await pg.click('#bell'); await pg.waitForSelector('.pop'); await pg.waitForTimeout(600); await shot('bell'); await pg.keyboard.press('Escape');
  console.log('ERRORS', errs.length); errs.forEach((e) => console.log(e)); await b.close(); H.srv.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
