'use strict';
const { chromium } = require('playwright'); const { start } = require('./harness');
(async () => {
  const H = await start(); const errs = []; const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1360, height: 860 }, colorScheme: 'dark' });
  pg.on('pageerror', (e) => errs.push('PAGEERR ' + e.message)); pg.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  await pg.addInitScript(() => { localStorage.setItem('cd.welcomed', '1'); localStorage.setItem('cd.tour', '1'); }); await pg.goto(H.url); await pg.waitForSelector('#rail');
  const a = { id: 1, name: 'Admin' }; const svc = H.svc; const y = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4 - 2 * 864e5).toISOString().slice(0, 10);
  const type = svc.saveCatalog({ kind: 'type', item: { name: 'Physio', duration_min: 30, price: 1, per_day: 1 } }, a);
  svc.savePatient({ patient: { name: 'أحمد', phone: '0770' }, bookings: [{ type_id: type, date: y, time: '10:00' }] }, a);
  H.db.run("UPDATE bookings SET status='in_session'");
  await pg.keyboard.press('Control+Shift+D'); await pg.waitForSelector('[data-code="E103"]'); await pg.screenshot({ path: '/tmp/fl-diag1.png' });
  await pg.locator('dialog.dlg .df .btn.pri').first().click(); await pg.waitForTimeout(300); await pg.screenshot({ path: '/tmp/fl-diag-c.png' }); pg.on('response', async (r) => { if (r.url().includes('rpc')) console.log('RPC', (await r.text()).slice(0, 200)); }); console.log('BTNS', JSON.stringify(await pg.getByRole('button', { name: 'موافق' }).count())); await pg.getByRole('button', { name: 'موافق' }).click(); await pg.waitForTimeout(150); console.log('AFTER', JSON.stringify(await pg.evaluate(() => [document.querySelectorAll('dialog[open]').length, document.querySelector('#toasts') && document.querySelector('#toasts').innerHTML]))); await pg.waitForTimeout(900);
  console.log('ERRLOG', JSON.stringify(await pg.evaluate(() => [CD.errLog, document.querySelectorAll('dialog[open]').length, document.getElementById('toasts') && document.getElementById('toasts').textContent]))); const st = H.db.get('SELECT status FROM bookings'); console.log('STATUS', st.status); if (st.status === 'in_session') throw new Error('not fixed'); await pg.screenshot({ path: '/tmp/fl-diag2.png' });
  console.log('ERRORS', errs.length); errs.forEach((e) => console.log(e)); await b.close(); H.srv.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
