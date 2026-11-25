'use strict';
const { chromium } = require('playwright'); const { start } = require('./harness');
(async () => {
  const H = await start(); const errs = [];
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1360, height: 860 } });
  pg.on('pageerror', (e) => errs.push('PAGEERR ' + e.message)); pg.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  const svc = H.svc; await pg.goto(H.url); await pg.waitForSelector('.auth'); await pg.screenshot({ path: '/tmp/ui-welcome.png' }); await pg.click('.auth .btn.pri'); await pg.waitForSelector('#rail', { timeout: 8000 });
  // seed through the real service
  const actor = { id: 1, name: 'Admin' };
  const type = svc.saveCatalog({ kind: 'type', item: { name: 'Physio', duration_min: 30, price: 25000, per_day: 1 } }, actor);
  const dev = svc.saveCatalog({ kind: 'device', item: { name: 'Laser', typeIds: [type] } }, actor);
  const plan = svc.previewPlan({ plans: [{ typeId: type, count: 6, startDate: new Date().toISOString().slice(0, 10), deviceId: dev }] });
  svc.savePatient({ patient: { name: 'أحمد علي حسن', phone: '07701234567', gender: 'M' }, bookings: plan.bookings }, actor);
  const shots = {};
  for (const v of ['today', 'patients', 'calendar', 'tools', 'settings']) {
    await pg.click('#nav-' + v); await pg.waitForTimeout(450); shots[v] = await pg.evaluate(() => document.querySelector('#main').innerText.length);
    await pg.screenshot({ path: `/tmp/ui-${v}.png` });
  }
  // open settings sections + accordion expand
  await pg.click('#nav-settings'); await pg.waitForTimeout(300);
  const heads = await pg.$$('#main .acc-h'); for (const hd of heads.slice(0, 12)) { await hd.click(); await pg.waitForTimeout(120); }
  await pg.screenshot({ path: '/tmp/ui-settings-open.png' });
  // today: toggle attendance, open profile, editor
  await pg.click('#nav-today'); await pg.waitForTimeout(400);
  const att = await pg.$('.att'); if (att) { await att.click(); await pg.waitForTimeout(300); }
  const eye = await pg.$('button[data-tip] svg'); await pg.evaluate(() => document.querySelector('.tbl tbody tr td:last-child button')?.click()); await pg.waitForTimeout(400);
  await pg.screenshot({ path: '/tmp/ui-profile.png' });
  console.log('textLens', JSON.stringify(shots)); console.log('ERRORS', errs.length); errs.forEach((e) => console.log(e));
  await b.close(); H.srv.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
