'use strict';
const { chromium } = require('playwright'); const { start } = require('./harness');
(async () => {
  const H = await start(); const errs = []; const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1360, height: 860 }, colorScheme: 'dark' });
  pg.on('pageerror', (e) => errs.push('PAGEERR ' + e.message)); pg.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  await pg.addInitScript(() => { localStorage.setItem('cd.welcomed', '1'); localStorage.setItem('cd.tour', '1'); }); await pg.goto(H.url); await pg.waitForSelector('#rail');
  const a = { id: 1, name: 'Admin' }; const svc = H.svc;
  const type = svc.saveCatalog({ kind: 'type', item: { name: 'Physio', duration_min: 30, price: 25000, per_day: 1 } }, a);
  const dev = svc.saveCatalog({ kind: 'device', item: { name: 'Laser', typeIds: [type] } }, a);
  svc.saveSettings({ patch: { hours: { 0: { on: true, open: '09:00', close: '17:00' }, 1: { on: true, open: '09:00', close: '17:00' }, 2: { on: true, open: '09:00', close: '17:00' }, 3: { on: true, open: '09:00', close: '17:00' }, 4: { on: true, open: '09:00', close: '17:00' }, 5: { on: true, open: '09:00', close: '13:00' }, 6: { on: true, open: '09:00', close: '17:00' } } } }, a);
  const today = new Date().toISOString().slice(0, 10);
  const plan = svc.previewPlan({ plans: [{ typeId: type, count: 8, startDate: today, deviceId: dev }] });
  svc.savePatient({ patient: { name: 'أحمد علي حسن', phone: '07701234567', gender: 'M' }, bookings: plan.bookings }, a);
  svc.savePatient({ patient: { name: 'سارة محمد كريم', phone: '07801234567', gender: 'F' }, bookings: svc.previewPlan({ plans: [{ typeId: type, count: 4, startDate: today, deviceId: dev }] }).bookings }, a);
  const shot = (n) => pg.screenshot({ path: `/tmp/f-${n}.png` });
  await pg.reload(); await pg.waitForSelector('#rail'); await pg.click('#nav-today'); await pg.waitForTimeout(500); await shot('today');
  await pg.click('.att'); await pg.waitForTimeout(300); await pg.keyboard.press('Escape'); await pg.waitForTimeout(200);                       // mark attended
  await pg.click('.att.on'); await pg.waitForTimeout(300); await shot('confirm'); await pg.click('dialog .btn.pri'); await pg.waitForTimeout(300); // undo confirm
  await pg.click('tbody tr:first-child td:last-child button:nth-child(1)'); await pg.waitForTimeout(500); await shot('profile'); await pg.keyboard.press('Escape'); await pg.waitForTimeout(200);
  await pg.click('tbody tr:first-child td:last-child button:nth-child(2)'); await pg.waitForTimeout(500);
  await pg.click('dialog .acc-item:nth-child(3) .acc-h'); await pg.waitForTimeout(400); await pg.click('dialog .btn.pri.sm'); await pg.waitForTimeout(600); await shot('planner-empty');
  await pg.click('.pl-pal .pl-chip'); const days = pg.locator('.pl-day:not(.off):not(.void)'); await days.nth(0).click(); await days.nth(2).click(); await pg.waitForTimeout(700); await shot('planner');
  if (!(await pg.locator('.pl-chip.ghost').count())) { await pg.locator('dialog .row > .btn.ico').nth(0).click(); await pg.waitForTimeout(300); } // projection may fall in the next month (end-of-month dates)
  if (!(await pg.locator('.pl-chip.ghost').count())) throw new Error('planner produced no projection');
  await pg.click('dialog[open]:has(.pl-grid) .btn.pri'); await pg.waitForTimeout(600); await shot('editor'); await pg.setViewportSize({ width: 1360, height: 1700 }); await pg.waitForTimeout(300); await shot('editor-tall'); await pg.setViewportSize({ width: 1360, height: 860 });
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(200);
  await pg.click('#nav-calendar'); await pg.waitForTimeout(500); await shot('calendar');
  await pg.click('#nav-tools'); await pg.waitForTimeout(400); await pg.click('.acc-item:nth-child(5) .acc-h'); await pg.waitForTimeout(500); await shot('tools');
  await pg.click('#nav-settings'); await pg.waitForTimeout(300); for (const i of [4, 8]) { await pg.click(`#main .acc > .acc-item:nth-child(${i}) > .acc-h`); await pg.waitForTimeout(500); await shot('set' + i); }
  await pg.locator('#main .acc > .acc-item > .acc-h', { hasText: 'الطباعة والوصل' }).click(); await pg.waitForTimeout(500); await pg.click('#main .acc-item.open .acc-item .acc-h'); await pg.waitForTimeout(600); await shot('designer');
  await pg.click('.rcpt-grid ~ * >> nth=0').catch(() => {}); await pg.locator('button.btn.sm', { hasText: 'نص حر' }).click(); await pg.waitForTimeout(200);
  const tb = pg.locator('.blk.sel'); await tb.dblclick(); await pg.keyboard.type('Hello typed'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(200);
  if (!(await pg.locator('.blk', { hasText: 'Hello typed' }).count())) throw new Error('text block not typable');
  await pg.locator('select.in').filter({ has: pg.locator('option[value=A6]') }).selectOption('A6'); await pg.waitForTimeout(800);
  if (!(await pg.locator('.blk', { hasText: 'Hello typed' }).count())) throw new Error('designer lost block after paper change');
  await shot('designer2');
  console.log('ERRORS', errs.length); errs.forEach((e) => console.log(e)); await b.close(); H.srv.close();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
