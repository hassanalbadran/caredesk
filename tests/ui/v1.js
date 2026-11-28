'use strict';
// 1.0 features: new patient from the right-click menu, month always fits the window, fixed hour + "apply to all upcoming sessions" in the patient editor
const { chromium } = require('playwright'); const { start } = require('./harness');
(async () => {
  const H = await start(); const errs = []; const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1360, height: 860 }, colorScheme: 'dark' });
  pg.on('pageerror', (e) => errs.push('PAGEERR ' + e.message)); pg.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  await pg.addInitScript(() => { localStorage.setItem('cd.welcomed', '1'); localStorage.setItem('cd.tour', '1'); }); await pg.goto(H.url); await pg.waitForSelector('#rail');
  const a = { id: 1, name: 'Admin' }; const svc = H.svc; const today = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  const types = ['Physio', 'Laser', 'Neuro', 'Pull', 'Massage'].map((n) => svc.saveCatalog({ kind: 'type', item: { name: n, duration_min: 30, price: 1, per_day: 1 } }, a));
  const dev = svc.saveCatalog({ kind: 'device', item: { name: 'Device A', typeIds: [types[0]], avg_min: 30 } }, a);
  const open = { on: true, open: '09:00', close: '17:00' }; svc.saveSettings({ patch: { hours: { 0: open, 1: open, 2: open, 3: open, 4: open, 5: open, 6: open } } }, a);
  const pid = svc.savePatient({ patient: { name: 'Retime Me', phone: '07700000009' }, bookings: svc.previewPlan({ plans: [{ typeId: types[0], deviceId: dev, count: 3, startDate: today }] }).bookings }, a).id;

  // 1) month fits the window on small and big screens, even with 5 session types per day
  await pg.click('#nav-calendar'); await pg.waitForSelector('.fcal.fit');
  for (const [w, h] of [[1360, 768], [1920, 1080], [1100, 700]]) {
    await pg.setViewportSize({ width: w, height: h }); await pg.waitForTimeout(250);
    const r = await pg.evaluate(() => { const g = document.querySelector('.fcal.fit').getBoundingClientRect(); return { bottom: g.bottom, vh: innerHeight, rows: getComputedStyle(document.querySelector('.fcal.fit')).getPropertyValue('--rows') }; });
    console.log('FIT', w, h, JSON.stringify(r)); if (r.bottom > r.vh + 1) throw new Error(`calendar overflows the window at ${w}x${h}`);
  }
  await pg.setViewportSize({ width: 1360, height: 860 });

  // 2) right-click an hour on the device page -> New patient -> patient + session created
  await pg.locator('.fday.today .tbtn:not(.zero)').first().click(); await pg.locator('.dcard', { hasText: 'Device A' }).click(); await pg.waitForSelector('.tl');
  await pg.locator('.tl .hr.work').nth(4).click({ button: 'right' }); await pg.waitForSelector('.cmenu');
  const item = pg.locator('.cmenu .ci', { hasText: /مراجع جديد|New patient/ }); if (!(await item.count())) throw new Error('no "new patient" item in the hour menu'); await item.click();
  await pg.waitForSelector('dialog input'); const ins = pg.locator('dialog input.in'); await ins.nth(0).fill('Quick Patient'); await ins.nth(1).fill('07711112222');
  await pg.locator('dialog .btn.pri').click(); await pg.waitForTimeout(700);
  const np = svc.db.get("SELECT id FROM patients WHERE name='Quick Patient'"); if (!np) throw new Error('patient not created');
  const nb = svc.db.all('SELECT * FROM bookings WHERE patient_id=?', np.id); console.log('QUICK', JSON.stringify(nb.map((x) => [x.date, x.time, x.type_id, x.device_id])));
  if (nb.length !== 1 || nb[0].date !== today || nb[0].time.slice(0, 2) !== '13') throw new Error('session not placed on the clicked hour');
  // the day cell menu has it too
  await pg.click('#nav-calendar'); await pg.waitForSelector('.fcal.fit'); await pg.locator('.fday.today').click({ button: 'right', position: { x: 8, y: 8 } }); await pg.waitForSelector('.cmenu');
  if (!(await pg.locator('.cmenu .ci', { hasText: /مراجع جديد|New patient/ }).count())) throw new Error('no "new patient" in the day menu'); await pg.keyboard.press('Escape');

  // 3) fixed hour + apply to all upcoming sessions from the patient editor
  await pg.evaluate((id) => CD.editPatient(id), pid); await pg.waitForSelector('dialog');
  await pg.locator('dialog input[type=time]').first().fill('16:00');
  await pg.locator('dialog button', { hasText: /تطبيق على كل جلساته القادمة|Apply to all upcoming/ }).click(); await pg.waitForSelector('dialog.confirm, dialog >> text=/16:00|04:00/', { timeout: 3000 }).catch(() => {});
  await pg.locator('dialog .btn.pri').last().click(); await pg.waitForTimeout(700);
  const times = svc.db.all("SELECT time FROM bookings WHERE patient_id=? AND status='booked'", pid).map((x) => x.time); console.log('RETIME', JSON.stringify(times));
  if (!times.length || !times.every((x) => x === '16:00')) throw new Error('sessions not moved to 16:00');
  console.log('ERRORS', errs.length); errs.forEach((e) => console.log(e)); await b.close(); H.srv.close(); if (errs.length) process.exit(1);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
