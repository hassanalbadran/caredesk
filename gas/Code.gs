/**
 * CareDesk licensing & accounts dashboard — Google Apps Script (V8).
 * One-time setup (run from the editor, in this order):
 *   1) setup()                      creates the spreadsheet + sheets (re-run after every update: adds ErrorReports + Notices)
 *   2) setSecret('LICENSE_PRIVATE_KEY', '<paste secrets/license-private.pem>')
 *   3) setAdminPassword('<your strong password>')
 *   4) Deploy > New deployment > Web app (execute as: me, access: anyone). Put the /exec URL in the app's config.
 * Admin page:  <exec-url>?page=admin   (password + e-mail code to the owner's Gmail)
 */
const TRIAL_DAYS = 14, DAY = 86400000, APP_VERSION_KEY = 'LATEST';
const SITE = 'https://github.com/hassanalbadran/caredesk';
const SCHEMA = {
  Accounts: ['id', 'username', 'email', 'phone', 'passHash', 'salt', 'promo', 'status', 'emailVerified', 'seatsPc', 'seatsAndroid', 'createdAt', 'lastLoginAt', 'lang', 'notes', 'tempPass', 'avatar'],
  SubAccounts: ['subId', 'accountId', 'passHash', 'salt', 'role', 'perms', 'active', 'tempPass', 'createdAt'],
  Devices: ['id', 'accountId', 'fp', 'parts', 'platform', 'name', 'firstSeen', 'lastSeen', 'role', 'active'],
  Licenses: ['id', 'accountId', 'plan', 'startAt', 'expAt', 'source', 'codeId', 'createdAt', 'active', 'warned', 'tier'],
  Codes: ['code', 'plan', 'days', 'seatsPc', 'seatsAndroid', 'note', 'createdAt', 'usedBy', 'usedAt', 'tier'],
  TrialRegistry: ['id', 'fp', 'parts', 'accountId', 'startedAt'],
  Newsletters: ['id', 'subject', 'body', 'kind', 'createdAt', 'sentAt', 'sentCount'],
  BackupRequests: ['id', 'accountId', 'requestedAt', 'status', 'approvedAt'],
  ErrorReports: ['id', 'code', 'name', 'desc', 'solved', 'account', 'version', 'count', 'firstAt', 'lastAt', 'handled'],
  Notices: ['id', 'title', 'body', 'kind', 'createdAt', 'active'],
  Log: ['ts', 'actor', 'action', 'detail']
};
// Error-code catalog (mirrors src/core/diagnose.js CATALOG; keep ids stable). E1xx = data, E8xx = tamper, E9xx = runtime.
const ERROR_CATALOG = [{"code":"E101","name":"DB_INTEGRITY_FAILED","sev":"critical","auto":false,"ar":"قاعدة البيانات تالفة جزئياً","en":"Database file is damaged","steps_ar":["أغلق التطبيق وانسخ ملف قاعدة البيانات احتياطياً.","من الإعدادات ← الحساب والنسخ الاحتياطي استعد آخر نسخة سليمة.","إن تكرر الخطأ اطلب من المطوّر فحص الملف."],"steps_en":["Close the app and copy the database file.","Restore the last good backup from Settings > Account & backup.","If it repeats, send the file to the developer."]},{"code":"E102","name":"ORPHAN_BOOKING","sev":"medium","auto":true,"ar":"جلسات بلا مريض","en":"Sessions without a patient","steps_ar":["يُلغى الحجز اليتيم تلقائياً دون حذف بياناته."],"steps_en":["Orphan sessions are cancelled automatically, nothing is deleted."]},{"code":"E103","name":"STALE_IN_SESSION","sev":"low","auto":true,"ar":"جلسة عالقة «داخل الجلسة» من يوم سابق","en":"Session stuck in progress from a past day","steps_ar":["تُعتبر منتهية وتُسجَّل حضوراً."],"steps_en":["Marked as finished/attended."]},{"code":"E104","name":"DEVICE_DOUBLE_RUNNING","sev":"medium","auto":true,"ar":"مريضان داخل الجلسة على نفس الجهاز","en":"Two patients in session on one device","steps_ar":["تُنهى الجلسة الأقدم تلقائياً."],"steps_en":["The older session is finished automatically."]},{"code":"E105","name":"BAD_TIME_RANGE","sev":"low","auto":true,"ar":"وقت نهاية الجلسة غير صالح","en":"Invalid session end time","steps_ar":["يُعاد حساب النهاية من مدة نوع الجلسة."],"steps_en":["End time is recalculated from the session type duration."]},{"code":"E106","name":"DEVICE_OVERLAP","sev":"medium","auto":false,"ar":"تعارض: جلستان تتداخلان على نفس الجهاز","en":"Two sessions overlap on one device","steps_ar":["افتح الكالندر وحرّك إحدى الجلستين بالسحب إلى ساعة أخرى.","أو استعمل زر «أصلح الباقي تلقائياً»."],"steps_en":["Open Home and drag one of the sessions to another hour.","Or use \"Fix the rest automatically\"."]},{"code":"E107","name":"MISSING_BARCODE","sev":"low","auto":true,"ar":"مريض بلا رقم/باركود","en":"Patient without code","steps_ar":["يُولَّد رقم جديد تلقائياً."],"steps_en":["A new code is generated."]},{"code":"E108","name":"BAD_SETTINGS","sev":"medium","auto":true,"ar":"إعداد غير صالح","en":"Invalid setting value","steps_ar":["يُرجَع الإعداد التالف فقط إلى قيمته الافتراضية."],"steps_en":["Only the broken setting is reset to default."]},{"code":"E109","name":"DANGLING_TAG","sev":"low","auto":true,"ar":"وسم محذوف ما زال مرتبطاً بمريض","en":"Deleted tag still linked","steps_ar":["يُحذف الارتباط فقط."],"steps_en":["Only the link is removed."]},{"code":"E110","name":"DANGLING_DEVICE","sev":"low","auto":true,"ar":"جلسة مرتبطة بجهاز محذوف","en":"Session linked to a deleted device","steps_ar":["يُفصل الجهاز عن الجلسة وتبقى الجلسة."],"steps_en":["The device is unlinked; the session stays."]},{"code":"E113","name":"BAD_TIMER","sev":"low","auto":true,"ar":"مؤقت بقيمة غير صالحة","en":"Timer has an invalid value","steps_ar":["يُصفَّر المؤقت."],"steps_en":["The timer is reset."]},{"code":"E114","name":"BAD_PRICE","sev":"low","auto":true,"ar":"سعر غير صالح","en":"Invalid price","steps_ar":["يُفرَّغ السعر ويُملأ من سعر النوع."],"steps_en":["Price is cleared and refilled from the session type."]},{"code":"E115","name":"NOTIFICATION_BLOAT","sev":"low","auto":true,"ar":"إشعارات قديمة كثيرة","en":"Too many old notifications","steps_ar":["تُحذف الإشعارات المنتهية الأقدم من 30 يوماً فقط."],"steps_en":["Only resolved notifications older than 30 days are pruned."]},{"code":"E801","name":"TAMPER_FILES","sev":"critical","auto":false,"ar":"ملفات التطبيق عُدِّلت","en":"Application files were modified","steps_ar":["أعد تثبيت التطبيق من المصدر الرسمي.","بياناتك لا تتأثر بإعادة التثبيت."],"steps_en":["Reinstall the app from the official source.","Your data is not affected by reinstalling."]},{"code":"E802","name":"DEVTOOLS_BYPASS","sev":"high","auto":false,"ar":"محاولة فتح أدوات المطوّر دون إذن","en":"Unauthorised developer-tools attempt","steps_ar":["أُغلقت الأدوات تلقائياً وسُجّلت المحاولة."],"steps_en":["Tools were closed and the attempt logged."]},{"code":"E803","name":"PERMISSION_BYPASS","sev":"high","auto":false,"ar":"محاولة تنفيذ إجراء بلا صلاحية","en":"Action attempted without permission","steps_ar":["رُفض الإجراء وسُجّلت المحاولة في سجل النشاط.","راجع سجل النشاط لمعرفة الحساب."],"steps_en":["The action was refused and logged in the activity log.","Check the activity log for the account."]},{"code":"E901","name":"UI_EXCEPTION","sev":"medium","auto":false,"ar":"خطأ غير متوقع في الواجهة","en":"Unexpected interface error","steps_ar":["اضغط «فحص وإصلاح» أو Ctrl+Shift+D.","إن تكرر أعد تشغيل التطبيق."],"steps_en":["Press \"Scan & repair\" or Ctrl+Shift+D.","If it repeats, restart the app."]},{"code":"E902","name":"UNHANDLED_PROMISE","sev":"medium","auto":false,"ar":"عملية فشلت دون معالجة","en":"Unhandled failed operation","steps_ar":["اضغط «فحص وإصلاح»."],"steps_en":["Press \"Scan & repair\"."]},{"code":"E903","name":"CALL_FAILED","sev":"medium","auto":false,"ar":"فشل استدعاء داخلي","en":"Internal call failed","steps_ar":["اضغط «فحص وإصلاح» ثم أعد المحاولة."],"steps_en":["Press \"Scan & repair\" and retry."]},{"code":"E904","name":"UPDATE_FAILED","sev":"low","auto":false,"ar":"فشل تنزيل التحديث","en":"Update download failed","steps_ar":["تحقق من الإنترنت وأعد المحاولة من الإعدادات ← حول."],"steps_en":["Check the internet and retry from Settings > About."]}];
const TEXT_COLS = ['id', 'username', 'email', 'phone', 'code', 'subId', 'accountId', 'fp'];

/* ---------- storage helpers ---------- */
const P = (k) => PropertiesService.getScriptProperties().getProperty(k);
function setSecret(k, v) { PropertiesService.getScriptProperties().setProperty(k, v); }
function ss() { return SpreadsheetApp.openById(P('SS_ID')); }
function setup() {
  let id = P('SS_ID'); const book = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.create('CareDesk Dashboard Data');
  if (!id) setSecret('SS_ID', book.getId());
  if (!P('SESSION_SECRET')) setSecret('SESSION_SECRET', Utilities.getUuid() + Utilities.getUuid());
  Object.keys(SCHEMA).forEach((n) => {
    let s = book.getSheetByName(n) || book.insertSheet(n); const h = SCHEMA[n];
    s.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold'); s.setFrozenRows(1);
    h.forEach((c, i) => { if (TEXT_COLS.indexOf(c) >= 0) s.getRange(2, i + 1, 5000, 1).setNumberFormat('@'); });
  });
  const dflt = book.getSheetByName('Sheet1'); if (dflt && book.getSheets().length > 1) book.deleteSheet(dflt);
  Logger.log('Spreadsheet: ' + book.getUrl());
}
function setAdminPassword(pw) { const salt = Utilities.getUuid(); setSecret('ADMIN_SALT', salt); setSecret('ADMIN_HASH', hashPw(pw, salt)); }
function all(n) { const v = ss().getSheetByName(n).getDataRange().getValues(); const h = v[0]; return v.slice(1).map((r, i) => { const o = { _row: i + 2 }; h.forEach((k, j) => { o[k] = r[j]; }); return o; }).filter((o) => String(o[h[0]]) !== ''); }
function add(n, o) { ss().getSheetByName(n).appendRow(SCHEMA[n].map((k) => (o[k] === undefined ? '' : o[k]))); return o; }
function upd(n, row, patch) { const s = ss().getSheetByName(n), h = SCHEMA[n]; Object.keys(patch).forEach((k) => { const c = h.indexOf(k); if (c >= 0) s.getRange(row, c + 1).setValue(patch[k]); }); }
function delRow(n, row) { ss().getSheetByName(n).deleteRow(row); }
function log(actor, action, detail) { try { add('Log', { ts: Date.now(), actor: actor, action: action, detail: typeof detail === 'string' ? detail : JSON.stringify(detail || '') }); } catch (e) { /* never block */ } }
const uid = () => Utilities.getUuid().replace(/-/g, '').slice(0, 10);
const J = (s, d) => { try { return s === '' || s == null ? d : JSON.parse(s); } catch (e) { return d; } };

/* ---------- crypto ---------- */
const hex = (b) => b.map((x) => ((x < 0 ? x + 256 : x)).toString(16).padStart(2, '0')).join('');
function hashPw(pw, salt) { let h = salt + '|' + pw; for (let i = 0; i < 400; i++) h = hex(Utilities.computeHmacSha256Signature(h, salt)); return h; }
const b64u = (s) => Utilities.base64EncodeWebSafe(s, Utilities.Charset.UTF_8).replace(/=+$/, '');
function signLic(payload) {
  const p = b64u(JSON.stringify(payload));
  const sig = Utilities.base64Encode(Utilities.computeRsaSha256Signature(p, P('LICENSE_PRIVATE_KEY')));
  return p + '.' + sig;
}
function hmacTok(obj, ttlMs) { const body = b64u(JSON.stringify(Object.assign({ exp: Date.now() + ttlMs }, obj))); return body + '.' + hex(Utilities.computeHmacSha256Signature(body, P('SESSION_SECRET'))); }
function readTok(t) {
  try { const parts = String(t).split('.'); if (parts[1] !== hex(Utilities.computeHmacSha256Signature(parts[0], P('SESSION_SECRET')))) return null;
    const o = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0] + '==')).getDataAsString()); return o.exp > Date.now() ? o : null; } catch (e) { return null; }
}
function rand6() { return String(Math.floor(100000 + Math.random() * 900000)); }
function tempPw() { const c = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'; let s = ''; for (let i = 0; i < 10; i++) s += c[Math.floor(Math.random() * c.length)]; return s; }

/* ---------- mail ---------- */
function mailHtml(o) {
  const rtl = (o.lang || 'ar') === 'ar'; const dir = rtl ? 'rtl' : 'ltr';
  const foot = o.kind === 'promo'
    ? (rtl ? 'تصلك هذه الرسالة لأنك وافقت على تلقي الرسائل الإعلانية. ' : 'You receive this because you opted in to promotional messages. ') + '<a href="' + o.unsub + '" style="color:#235347">' + (rtl ? 'إلغاء الاشتراك' : 'Unsubscribe') + '</a>'
    : (rtl ? 'هذه رسالة خدمة ضرورية لحسابك ولا يمكن إلغاء استقبالها إلا بحذف الحساب بالكامل.' : 'This is a service message required for your account and cannot be unsubscribed from except by deleting the account.');
  return '<div dir="' + dir + '" style="background:#eef6f0;padding:24px;font-family:Segoe UI,Tahoma,Arial,sans-serif"><div style="max-width:560px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 18px rgba(5,31,32,.12)">' +
    '<div style="background:#0b2b26;color:#daf1de;padding:18px 24px;font-size:20px;font-weight:700">CareDesk</div>' +
    '<div style="padding:24px;color:#0b2b26;line-height:1.8;font-size:15px"><h2 style="margin:0 0 12px;color:#163832">' + o.title + '</h2>' + o.body + '</div>' +
    '<div style="padding:16px 24px;background:#f4faf6;color:#51685f;font-size:12px;line-height:1.7">' + foot + '<br><a href="' + SITE + '" style="color:#235347">' + SITE + '</a></div></div></div>';
}
function sendMail(to, subject, o) { MailApp.sendEmail({ to: to, subject: subject, htmlBody: mailHtml(o), name: 'CareDesk' }); }
function unsubUrl(acc) { return ScriptApp.getService().getUrl() + '?a=unsub&t=' + encodeURIComponent(hmacTok({ u: acc.id }, 3650 * DAY)); }

/* ---------- core model ---------- */
const strong = (parts) => ['uuid', 'board', 'bios'].map((k) => (parts || {})[k]).filter(Boolean);
function registryFind(fp, parts) { const s = strong(parts); return all('TrialRegistry').filter((r) => r.fp === fp || strong(J(r.parts, {})).some((x) => s.indexOf(x) >= 0))[0] || null; }
function deviceFind(fp, parts) { const s = strong(parts); return all('Devices').filter((d) => String(d.active) !== '0' && (d.fp === fp || strong(J(d.parts, {})).some((x) => s.indexOf(x) >= 0)))[0] || null; }
function bestLicense(accountId) { return all('Licenses').filter((l) => l.accountId === accountId && String(l.active) !== '0' && (l.expAt === '' || Number(l.expAt) > Date.now())).sort((a, b) => (a.expAt === '' ? 1e18 : Number(a.expAt)) - (b.expAt === '' ? 1e18 : Number(b.expAt))).pop() || null; }
function issueToken(acc, lic, fp) {
  const exp = lic.expAt === '' ? null : Number(lic.expAt);
  return signLic({ v: 1, acct: acc ? acc.id : null, fp: fp, plan: lic.plan, tier: lic.plan === 'trial' ? 'trial' : (lic.tier === 'max' ? 'max' : 'pro'), iat: Date.now(), exp: exp, seats: { pc: acc ? Number(acc.seatsPc) : 1, android: acc ? Number(acc.seatsAndroid) : 0 } });
}
function planDays(plan, days) { return plan === 'monthly' ? 30 : plan === 'yearly' ? 365 : plan === 'lifetime' ? null : plan === 'trial' ? TRIAL_DAYS : Number(days || 30); }
function grant(accountId, plan, days, source, codeId, tier) {
  const d = planDays(plan, days); const now = Date.now();
  const cur = bestLicense(accountId); const base = cur && cur.expAt !== '' && plan !== 'trial' ? Math.max(now, Number(cur.expAt)) : now; // renewals stack
  const lic = { id: uid(), accountId: accountId, plan: plan, startAt: now, expAt: d === null ? '' : base + d * DAY, source: source, codeId: codeId || '', createdAt: now, active: 1, warned: '', tier: plan === 'trial' ? 'trial' : (tier === 'max' ? 'max' : 'pro') };
  add('Licenses', lic);
  const acc = accountBy(accountId); if (acc && lic.tier === 'max') { if (Number(acc.seatsPc) < 2) upd('Accounts', acc._row, { seatsPc: 2 }); if (Number(acc.seatsAndroid) < 1) upd('Accounts', acc._row, { seatsAndroid: 1 }); }
  return lic;
}
function accountBy(id) { const k = String(id || '').trim().toLowerCase(); return all('Accounts').filter((a) => String(a.id) === id || String(a.username).toLowerCase() === k || String(a.email).toLowerCase() === k)[0] || null; }
function seatCheck(acc, fp, parts) {
  const mine = all('Devices').filter((d) => d.accountId === acc.id && String(d.active) !== '0' && d.platform === 'pc');
  const s = strong(parts); if (mine.some((d) => d.fp === fp || strong(J(d.parts, {})).some((x) => s.indexOf(x) >= 0))) return true;
  return mine.length < Number(acc.seatsPc);
}
function touchDevice(acc, fp, parts, name, platform, role) {
  const ex = deviceFind(fp, parts); const now = Date.now();
  if (ex) { upd('Devices', ex._row, { lastSeen: now, accountId: acc ? acc.id : ex.accountId, name: name || ex.name }); return ex; }
  return add('Devices', { id: uid(), accountId: acc ? acc.id : '', fp: fp, parts: JSON.stringify(parts || {}), platform: platform || 'pc', name: name || '', firstSeen: now, lastSeen: now, role: role || 'owner', active: 1 });
}
const publicAcc = (a) => ({ id: a.id, username: a.username, email: a.email, phone: String(a.phone), emailVerified: String(a.emailVerified) === 'true' || a.emailVerified === true, promo: String(a.promo) === 'true' || a.promo === true, tempPass: String(a.tempPass) === 'true' || a.tempPass === true, avatar: a.avatar || '' });

/* ---------- public API (called by the desktop app) ---------- */
const API = {
  ping() { return { ok: true, serverTime: Date.now() }; },
  latest() { return Object.assign({ ok: true }, J(P(APP_VERSION_KEY), { version: '0.1.0-beta.1', url: '', notes: '' })); },

  // ---- error reports from the app (code + plain description only; never patient data). Deduplicated per code+account+version+day.
  report(r) {
    const code = String(r.code || '').slice(0, 8); if (!/^E\d{3}$/.test(code)) return { ok: false, code: 'BAD_REPORT' };
    const cache = CacheService.getScriptCache(); const day = new Date().toISOString().slice(0, 10); const n = Number(cache.get('rq:' + day) || 0); if (n > 400) return { ok: true }; cache.put('rq:' + day, String(n + 1), 86400);
    const cat = ERROR_CATALOG.filter((c) => c.code === code)[0]; const acct = String(r.account || '').slice(0, 60); const ver = String(r.version || '').slice(0, 30);
    const key = code + '|' + acct + '|' + ver + '|' + day; const ex = all('ErrorReports').filter((e) => e.key === key || (e.code === code && String(e.account) === acct && String(e.version) === ver && new Date(Number(e.lastAt)).toISOString().slice(0, 10) === day))[0];
    if (ex) { upd('ErrorReports', ex._row, { count: Number(ex.count || 1) + Number(r.count || 1), lastAt: Date.now(), solved: !!r.solved || ex.solved === true || ex.solved === 'true' }); return { ok: true }; }
    add('ErrorReports', { id: uid(), code: code, name: cat ? cat.name : String(r.name || ''), desc: String(r.desc || '').slice(0, 300), solved: !!r.solved, account: acct, version: ver, count: Number(r.count || 1), firstAt: Date.now(), lastAt: Date.now(), handled: '' });
    if (/^E8/.test(code)) { try { MailApp.sendEmail({ to: Session.getEffectiveUser().getEmail(), subject: '⚠ CareDesk tamper alert ' + code + ' — ' + acct, htmlBody: '<p dir="rtl">رُصدت محاولة عبث: <b>' + code + '</b> ' + (cat ? cat.ar : '') + '<br>الحساب: ' + acct + '<br>الإصدار: ' + ver + '<br>' + String(r.desc || '').slice(0, 200).replace(/</g, '&lt;') + '</p>', name: 'CareDesk' }); } catch (x) { /* mail quota */ } }
    return { ok: true };
  },
  // ---- developer notices shown inside the app (bell) — no browser involved
  notices() { return { ok: true, items: all('Notices').filter((n) => String(n.active) !== 'false' && String(n.active) !== '0').slice(-20).reverse().map((n) => ({ id: String(n.id), title: n.title, body: n.body, kind: n.kind || 'info', ts: Number(n.createdAt) })) }; },
  register(r) {
    const u = String(r.username || '').trim(), em = String(r.email || '').trim().toLowerCase();
    if (!/^[A-Za-z0-9_.]{3,24}$/.test(u)) return { ok: false, code: 'BAD_USERNAME' };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em) || /@hasn\.mr$/.test(em)) return { ok: false, code: 'BAD_EMAIL' };
    if (String(r.password || '').length < 8) return { ok: false, code: 'WEAK_PASSWORD' };
    const dup = all('Accounts');
    if (dup.some((a) => String(a.username).toLowerCase() === u.toLowerCase())) return { ok: false, code: 'USERNAME_TAKEN' };
    if (dup.some((a) => String(a.email).toLowerCase() === em)) return { ok: false, code: 'EMAIL_TAKEN' };
    const salt = Utilities.getUuid(); const id = uid(); const code = rand6();
    add('Accounts', { id: id, username: u, email: em, phone: String(r.phone || ''), passHash: hashPw(r.password, salt), salt: salt, promo: !!r.promo, status: 'pending_email', emailVerified: false, seatsPc: 1, seatsAndroid: 1, createdAt: Date.now(), lang: r.lang || 'ar', tempPass: false });
    CacheService.getScriptCache().put('v:' + id, code, 300);
    sendMail(em, code + ' — رمز التحقق CareDesk / verification code', { lang: r.lang, kind: 'service', title: r.lang === 'en' ? 'Confirm your e-mail' : 'تأكيد البريد الإلكتروني', body: '<p>' + (r.lang === 'en' ? 'Your code (valid for 5 minutes):' : 'رمز التحقق الخاص بك (صالح لمدة 5 دقائق):') + '</p><p style="font-size:34px;letter-spacing:8px;font-weight:700;color:#235347;user-select:all">' + code + '</p>' });
    log('app', 'register', u); return { ok: true, id: id };
  },
  verifyEmail(r) {
    const a = accountBy(r.id); if (!a) return { ok: false, code: 'NOT_FOUND' };
    const code = CacheService.getScriptCache().get('v:' + a.id);
    if (!code || String(r.code).trim() !== code) return { ok: false, code: 'BAD_CODE' };
    const first = String(a.emailVerified) !== 'true' && a.emailVerified !== true;
    upd('Accounts', a._row, { emailVerified: true, status: 'active' }); CacheService.getScriptCache().remove('v:' + a.id);
    if (first) { try { const ar = (a.lang || 'ar') !== 'en'; sendMail(a.email, ar ? 'أهلاً بك في CareDesk 💚 الشروط وكلمة شكر' : 'Welcome to CareDesk 💚 Terms & a thank-you', { lang: a.lang, kind: 'service', title: ar ? 'شكراً لانضمامك' : 'Thank you for joining', body: ar
      ? '<p>أهلاً <b>' + a.username + '</b>، يسعدنا أن CareDesk صار عندك. البرنامج <b>مجاني ومفتوح المصدر</b>، وعملنا عليه ليخفف عنك ازدحام الحجوزات والتذكيرات.</p><p><b>باختصار شروط الاستخدام:</b></p><ul><li>البرنامج مقدّم «كما هو» دون ضمان، وأنت مسؤول عن مراجعة بيانات عيادتك.</li><li>بيانات المرضى تبقى على جهازك ولا تُرسل لأحد؛ يُرسل فقط رمز الخطأ ووصفه دون أسماء.</li><li>خذ نسخة احتياطية دورياً من الإعدادات.</li><li>لا تعدّل ملفات البرنامج أو تتحايل على صلاحياته؛ تُسجَّل هذه المحاولات.</li></ul><p>إن واجهتك مشكلة اضغط Ctrl+Shift+D للفحص والإصلاح التلقائي، أو راسلنا من داخل التطبيق.</p><p>شكراً لثقتك 🌿</p>'
      : '<p>Hi <b>' + a.username + '</b>, we are glad CareDesk is now with you. The app is <b>free and open source</b>, built to ease booking and reminder overload.</p><p><b>Terms in short:</b></p><ul><li>Provided "as is" without warranty; you are responsible for reviewing your clinic data.</li><li>Patient data stays on your device; only an error code and description (no names) may be sent.</li><li>Take regular backups from Settings.</li><li>Do not modify the app files or bypass its permissions; such attempts are logged.</li></ul><p>If something goes wrong press Ctrl+Shift+D for the automatic check and repair, or message us from inside the app.</p><p>Thank you for your trust 🌿</p>' }); } catch (x) { log('server', 'mail-fail', String(x && x.message)); } }
    return { ok: true };
  },
  resendCode(r) {
    const a = accountBy(r.id); if (!a) return { ok: false, code: 'NOT_FOUND' }; const c = CacheService.getScriptCache();
    if (c.get('rs:' + a.id)) return { ok: false, code: 'WAIT' }; c.put('rs:' + a.id, '1', 45);
    const code = rand6(); c.put('v:' + a.id, code, 300);
    sendMail(a.email, code + ' — رمز التحقق CareDesk / verification code', { lang: a.lang, kind: 'service', title: a.lang === 'en' ? 'Confirm your e-mail' : 'تأكيد البريد الإلكتروني', body: '<p style="font-size:34px;letter-spacing:8px;font-weight:700;color:#235347;user-select:all">' + code + '</p>' });
    return { ok: true };
  },
  login(r) {
    const key = String(r.id || '').toLowerCase(); const cache = CacheService.getScriptCache(); const fails = Number(cache.get('f:' + key) || 0);
    if (fails >= 8) return { ok: false, code: 'LOCKED' };
    let acc = null, sub = null;
    if (/@hasn\.mr$/.test(key)) { sub = all('SubAccounts').filter((s) => String(s.subId).toLowerCase() === key && String(s.active) !== '0')[0]; if (sub) acc = accountBy(sub.accountId); }
    else acc = accountBy(key);
    const rec = sub || acc; const okPw = rec && hashPw(r.password || '', rec.salt) === rec.passHash;
    if (!okPw) { cache.put('f:' + key, String(fails + 1), 900); return { ok: false, code: 'BAD_LOGIN' }; }
    cache.remove('f:' + key);
    if (acc.status === 'banned') return { ok: false, code: 'BANNED' };
    if (!seatCheck(acc, r.fp, r.parts)) return { ok: false, code: 'DEVICE_LIMIT' };
    touchDevice(acc, r.fp, r.parts, r.deviceName, 'pc', sub ? 'sub' : 'owner'); upd('Accounts', acc._row, { lastLoginAt: Date.now() });
    const lic = bestLicense(acc.id);
    return { ok: true, serverTime: Date.now(), account: publicAcc(acc), sub: sub ? { id: sub.subId, role: sub.role, perms: J(sub.perms, []), tempPass: String(sub.tempPass) === 'true' } : null,
      session: hmacTok({ a: acc.id, s: sub ? sub.subId : '' }, 90 * DAY), token: lic ? issueToken(acc, lic, r.fp) : null, hasLicense: !!lic };
  },
  trialStart(r) {
    const s = readTok(r.session); const acc = s && accountBy(s.a); if (!acc) return { ok: false, code: 'AUTH' };
    const reg = registryFind(r.fp, r.parts);
    if (reg) {
      const lic = bestLicense(acc.id);
      if (reg.accountId === acc.id && lic) return { ok: true, serverTime: Date.now(), token: issueToken(acc, lic, r.fp) };
      if (!reg.accountId) { // trial started offline before sign-up: attach it to this account, keeping the ORIGINAL start date
        const exp = Number(reg.startedAt) + TRIAL_DAYS * DAY; upd('TrialRegistry', reg._row, { accountId: acc.id });
        if (exp <= Date.now()) return { ok: false, code: 'TRIAL_USED' };
        const lic = { id: uid(), accountId: acc.id, plan: 'trial', startAt: Number(reg.startedAt), expAt: exp, source: 'trial', codeId: '', createdAt: Date.now(), active: 1, warned: '' };
        add('Licenses', lic); touchDevice(acc, r.fp, r.parts, r.deviceName, 'pc', 'owner');
        return { ok: true, serverTime: Date.now(), token: issueToken(acc, lic, r.fp) };
      }
      return { ok: false, code: 'TRIAL_USED' };
    }
    if (!seatCheck(acc, r.fp, r.parts)) return { ok: false, code: 'DEVICE_LIMIT' };
    add('TrialRegistry', { id: uid(), fp: r.fp, parts: JSON.stringify(r.parts || {}), accountId: acc.id, startedAt: Date.now() });
    touchDevice(acc, r.fp, r.parts, r.deviceName, 'pc', 'owner');
    const lic = grant(acc.id, 'trial', 0, 'trial'); log('app', 'trial', acc.username);
    return { ok: true, serverTime: Date.now(), token: issueToken(acc, lic, r.fp) };
  },
  // Heartbeat: works with or without an account (offline provisional trial started locally).
  check(r) {
    const dev = deviceFind(r.fp, r.parts); const reg = registryFind(r.fp, r.parts);
    if (dev && dev.accountId) {
      const acc = accountBy(dev.accountId); if (!acc || acc.status === 'banned') return { ok: false, code: 'BANNED' };
      upd('Devices', dev._row, { lastSeen: Date.now() }); const lic = bestLicense(acc.id);
      if (lic) return { ok: true, serverTime: Date.now(), token: issueToken(acc, lic, r.fp), account: publicAcc(acc) };
      return { ok: false, code: 'EXPIRED' };
    }
    if (reg && reg.accountId) return { ok: false, code: 'TRIAL_USED' };
    if (reg) { const exp = Number(reg.startedAt) + TRIAL_DAYS * DAY; if (exp <= Date.now()) return { ok: false, code: 'TRIAL_USED' }; return { ok: true, serverTime: Date.now(), token: signLic({ v: 1, acct: null, fp: r.fp, plan: 'trial', tier: 'trial', iat: Date.now(), exp: exp, seats: { pc: 1, android: 0 } }) }; }
    const start = Math.min(Number(r.provisionalStart) || Date.now(), Date.now());
    add('TrialRegistry', { id: uid(), fp: r.fp, parts: JSON.stringify(r.parts || {}), accountId: '', startedAt: start });
    const exp = start + TRIAL_DAYS * DAY;
    if (exp <= Date.now()) return { ok: false, code: 'TRIAL_USED' };
    return { ok: true, serverTime: Date.now(), token: signLic({ v: 1, acct: null, fp: r.fp, plan: 'trial', tier: 'trial', iat: Date.now(), exp: exp, seats: { pc: 1, android: 0 } }) };
  },
  forgot(r) {
    const a = accountBy(r.email); if (!a) return { ok: true }; // do not reveal whether the account exists
    const c = CacheService.getScriptCache(); if (c.get('fg:' + a.id)) return { ok: true }; c.put('fg:' + a.id, '1', 60);
    const code = rand6(); c.put('rp:' + a.id, code, 600);
    sendMail(a.email, code + ' — استعادة كلمة المرور / password reset', { lang: a.lang, kind: 'service', title: a.lang === 'en' ? 'Reset your password' : 'استعادة كلمة المرور', body: '<p style="font-size:34px;letter-spacing:8px;font-weight:700;color:#235347;user-select:all">' + code + '</p><p>' + (a.lang === 'en' ? 'Valid for 10 minutes. Ignore this e-mail if you did not ask for it.' : 'صالح لمدة 10 دقائق. تجاهل الرسالة إن لم تطلبها.') + '</p>' });
    return { ok: true };
  },
  resetPassword(r) {
    const a = accountBy(r.email); const c = CacheService.getScriptCache(); if (!a || c.get('rp:' + a.id) !== String(r.code).trim()) return { ok: false, code: 'BAD_CODE' };
    if (String(r.newPassword || '').length < 8) return { ok: false, code: 'WEAK_PASSWORD' };
    const salt = Utilities.getUuid(); upd('Accounts', a._row, { passHash: hashPw(r.newPassword, salt), salt: salt, tempPass: false }); c.remove('rp:' + a.id); return { ok: true };
  },
  changePassword(r) {
    const s = readTok(r.session); const a = s && accountBy(s.a); if (!a) return { ok: false, code: 'AUTH' };
    const sub = s.s ? all('SubAccounts').filter((x) => x.subId === s.s)[0] : null; const rec = sub || a;
    if (hashPw(r.oldPassword || '', rec.salt) !== rec.passHash) return { ok: false, code: 'BAD_LOGIN' };
    if (String(r.newPassword || '').length < 8) return { ok: false, code: 'WEAK_PASSWORD' };
    const salt = Utilities.getUuid(); const patch = { passHash: hashPw(r.newPassword, salt), salt: salt, tempPass: false };
    upd(sub ? 'SubAccounts' : 'Accounts', rec._row, patch); return { ok: true };
  },
  requestBackup(r) { const s = readTok(r.session); const a = s && accountBy(s.a); if (!a) return { ok: false, code: 'AUTH' }; add('BackupRequests', { id: uid(), accountId: a.id, requestedAt: Date.now(), status: 'pending', approvedAt: '' }); return { ok: true }; },
  requestDelete(r) {
    const s = readTok(r.session); const a = s && accountBy(s.a); if (!a) return { ok: false, code: 'AUTH' };
    const url = ScriptApp.getService().getUrl() + '?a=del&t=' + encodeURIComponent(hmacTok({ u: a.id }, 2 * 3600000));
    sendMail(a.email, 'تأكيد حذف الحساب / Confirm account deletion', { lang: a.lang, kind: 'service', title: a.lang === 'en' ? 'Confirm account deletion' : 'تأكيد حذف الحساب', body: '<p>' + (a.lang === 'en' ? 'Click to permanently delete your account and data (link valid for 2 hours):' : 'اضغط لحذف حسابك وبياناتك نهائياً (الرابط صالح لساعتين):') + '</p><p><a href="' + url + '" style="background:#c0504d;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none">' + (a.lang === 'en' ? 'Delete my data' : 'حذف بياناتي') + '</a></p>' });
    return { ok: true };
  }
};

/* ---------- HTTP entry points ---------- */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const r = JSON.parse(e.postData.contents || '{}');
    if (r.action === 'adm') { const f = String(r.fn || ''); if (!/^adm_[A-Za-z]+$/.test(f) || typeof this[f] !== 'function') return out({ ok: false, code: 'UNKNOWN_ACTION' }); try { return out({ ok: true, data: this[f].apply(null, r.args || []) }); } catch (er) { return out({ ok: false, error: String(er && er.message) }); } }
    const fn = API[r.action];
    if (!fn) return out({ ok: false, code: 'UNKNOWN_ACTION' });
    return out(fn(r));
  } catch (err) { log('server', 'error', String(err && err.message)); return out({ ok: false, code: 'SERVER_ERROR' }); }
  finally { try { lock.releaseLock(); } catch (x) { /* not held */ } }
}
const out = (o) => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
function page(title, body) { return HtmlService.createHtmlOutput('<meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:Segoe UI,Tahoma,sans-serif;background:#eef6f0;color:#0b2b26;display:grid;place-items:center;min-height:90vh;margin:0"><div style="background:#fff;padding:32px;border-radius:18px;max-width:440px;text-align:center;box-shadow:0 4px 18px rgba(5,31,32,.12)"><h2>' + title + '</h2><p>' + body + '</p><p><a href="' + SITE + '">' + SITE + '</a></p></div></body>').setTitle('CareDesk'); }
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.a === 'unsub') { const t = readTok(p.t); if (!t) return page('الرابط غير صالح / Invalid link', ''); const a = accountBy(t.u); if (a) upd('Accounts', a._row, { promo: false }); return page('تم إلغاء الاشتراك / Unsubscribed', 'لن تصلك الرسائل الإعلانية بعد الآن. رسائل الخدمة الضرورية تبقى مفعّلة.<br>You will no longer receive promotional messages. Essential service messages remain.'); }
  if (p.a === 'del') {
    const t = readTok(p.t); const a = t && accountBy(t.u); if (!a) return page('الرابط غير صالح أو منتهٍ / Invalid or expired link', '');
    all('SubAccounts').filter((s) => s.accountId === a.id).reverse().forEach((s) => delRow('SubAccounts', s._row));
    all('Devices').filter((d) => d.accountId === a.id).reverse().forEach((d) => delRow('Devices', d._row));
    all('Licenses').filter((l) => l.accountId === a.id).reverse().forEach((l) => delRow('Licenses', l._row));
    all('BackupRequests').filter((b) => b.accountId === a.id).reverse().forEach((b) => delRow('BackupRequests', b._row));
    delRow('Accounts', accountBy(a.id)._row); log('user', 'delete-account', a.username); // TrialRegistry intentionally kept: deleting never resets a trial
    return page('تم حذف حسابك / Account deleted', 'حُذفت بياناتك من نظامنا.<br>Your data was removed from our system.');
  }
  if (p.page === 'admin') return HtmlService.createHtmlOutputFromFile('Index').setTitle('CareDesk Admin').addMetaTag('viewport', 'width=device-width,initial-scale=1');
  return page('CareDesk', 'Clinic bookings &amp; reminders');
}

/* ---------- admin API (every function demands a valid admin token) ---------- */
function adminGuard(tok) { const t = readTok(tok); if (!t || t.admin !== true) throw new Error('AUTH'); }
function adm_login(pw) {
  const c = CacheService.getScriptCache(); const f = Number(c.get('adm:f') || 0); if (f >= 5) return { ok: false, code: 'LOCKED' };
  if (!P('ADMIN_HASH') || hashPw(pw || '', P('ADMIN_SALT')) !== P('ADMIN_HASH')) { c.put('adm:f', String(f + 1), 900); return { ok: false, code: 'BAD_LOGIN' }; }
  const otp = rand6(); c.put('adm:otp', otp, 300); c.remove('adm:f');
  MailApp.sendEmail({ to: Session.getEffectiveUser().getEmail(), subject: otp + ' — CareDesk admin code', htmlBody: mailHtml({ lang: 'en', kind: 'service', title: 'Admin sign-in', body: '<p style="font-size:34px;letter-spacing:8px;font-weight:700;color:#235347">' + otp + '</p>' }), name: 'CareDesk' });
  return { ok: true };
}
function adm_verify(otp) { const c = CacheService.getScriptCache(); if (!otp || c.get('adm:otp') !== String(otp).trim()) return { ok: false, code: 'BAD_CODE' }; c.remove('adm:otp'); log('admin', 'login', ''); return { ok: true, token: hmacTok({ admin: true }, 2 * 3600000) }; }
function planOf(accId) { const l = bestLicense(accId); return l ? { plan: l.plan, tier: l.tier || 'pro', expAt: l.expAt === '' ? null : Number(l.expAt) } : { plan: null, expAt: 0 }; }
function adm_accounts(tok, q) {
  adminGuard(tok); const k = String(q || '').toLowerCase(); const devs = all('Devices');
  return all('Accounts').filter((a) => !k || [a.username, a.email, a.phone].join(' ').toLowerCase().indexOf(k) >= 0).map((a) => Object.assign({}, publicAcc(a), planOf(a.id), { status: a.status, seatsPc: a.seatsPc, seatsAndroid: a.seatsAndroid, createdAt: a.createdAt, lastLoginAt: a.lastLoginAt, devices: devs.filter((d) => d.accountId === a.id && String(d.active) !== '0').length, notes: a.notes }));
}
function adm_account(tok, id) {
  adminGuard(tok); const a = accountBy(id); if (!a) return null;
  return { account: Object.assign(publicAcc(a), { status: a.status, seatsPc: a.seatsPc, seatsAndroid: a.seatsAndroid, notes: a.notes, createdAt: a.createdAt }), devices: all('Devices').filter((d) => d.accountId === a.id), licenses: all('Licenses').filter((l) => l.accountId === a.id), subs: all('SubAccounts').filter((s) => s.accountId === a.id).map((s) => ({ subId: s.subId, role: s.role, perms: J(s.perms, []), active: s.active })) };
}
function adm_saveAccount(tok, id, patch) { adminGuard(tok); const a = accountBy(id); const ok = {}; ['username', 'email', 'phone', 'seatsPc', 'seatsAndroid', 'status', 'notes', 'avatar'].forEach((k) => { if (patch[k] !== undefined) ok[k] = patch[k]; }); upd('Accounts', a._row, ok); log('admin', 'save-account', a.username); return true; }
function adm_grant(tok, id, plan, days, tier) { adminGuard(tok); const a = accountBy(id); const l = grant(a.id, plan, days, 'admin', '', tier); log('admin', 'grant', a.username + ' ' + plan + ' ' + (tier || 'pro')); return l; }
function adm_endLicense(tok, licId) { adminGuard(tok); const l = all('Licenses').filter((x) => x.id === licId)[0]; if (l) upd('Licenses', l._row, { active: 0 }); return true; }
function adm_removeDevice(tok, devId) { adminGuard(tok); const d = all('Devices').filter((x) => x.id === devId)[0]; if (d) upd('Devices', d._row, { active: 0 }); return true; }
function adm_tempPassword(tok, id, subId) {
  adminGuard(tok); const a = accountBy(id); const pw = tempPw(); const salt = Utilities.getUuid();
  if (subId) { const s = all('SubAccounts').filter((x) => x.subId === subId)[0]; upd('SubAccounts', s._row, { passHash: hashPw(pw, salt), salt: salt, tempPass: true }); }
  else { upd('Accounts', a._row, { passHash: hashPw(pw, salt), salt: salt, tempPass: true }); sendMail(a.email, 'كلمة مرور مؤقتة / Temporary password', { lang: a.lang, kind: 'service', title: a.lang === 'en' ? 'Temporary password' : 'كلمة مرور مؤقتة', body: '<p style="font-size:24px;font-weight:700;color:#235347;user-select:all">' + pw + '</p><p>' + (a.lang === 'en' ? 'You will be asked to change it after signing in.' : 'سيُطلب منك تغييرها بعد تسجيل الدخول.') + '</p>' }); }
  log('admin', 'temp-password', subId || a.username); return pw;
}
function adm_createSub(tok, id, short, role, perms) {
  adminGuard(tok); const a = accountBy(id); const clean = String(short).toLowerCase().replace(/[^a-z0-9_.]/g, ''); if (clean.length < 2) throw new Error('BAD_NAME');
  const subId = clean + '@hasn.mr'; if (all('SubAccounts').some((s) => s.subId === subId)) throw new Error('EXISTS');
  const pw = tempPw(), salt = Utilities.getUuid(); add('SubAccounts', { subId: subId, accountId: a.id, passHash: hashPw(pw, salt), salt: salt, role: role === 'admin' ? 'admin' : 'secretary', perms: JSON.stringify(perms || []), active: 1, tempPass: true, createdAt: Date.now() });
  log('admin', 'create-sub', subId); return { subId: subId, password: pw };
}
function adm_codes(tok) { adminGuard(tok); return all('Codes').reverse().slice(0, 300); }
function adm_genCode(tok, plan, days, count, note, seatsPc, tier) {
  adminGuard(tok); const out2 = []; const alpha = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  for (let i = 0; i < Math.min(Number(count) || 1, 50); i++) { let c = ''; for (let k = 0; k < 16; k++) { c += alpha[Math.floor(Math.random() * alpha.length)]; if (k % 4 === 3 && k < 15) c += '-'; } add('Codes', { code: c, plan: plan, days: days || '', seatsPc: seatsPc || 1, seatsAndroid: 1, note: note || '', createdAt: Date.now(), usedBy: '', usedAt: '', tier: tier === 'max' ? 'max' : 'pro' }); out2.push(c); }
  log('admin', 'gen-codes', plan + ' x' + out2.length); return out2;
}
function adm_alerts(tok) {
  adminGuard(tok); const soon = Date.now() + 7 * DAY; const accs = all('Accounts'); const res = [];
  all('Licenses').filter((l) => String(l.active) !== '0' && l.expAt !== '' && Number(l.expAt) <= soon).forEach((l) => { const a = accs.filter((x) => x.id === l.accountId)[0]; if (a && !bestLicenseAfter(l)) res.push({ licId: l.id, tier: l.tier || 'pro', accountId: a.id, username: a.username, email: a.email, plan: l.plan, expAt: Number(l.expAt), expired: Number(l.expAt) < Date.now() }); });
  return res.sort((x, y) => x.expAt - y.expAt);
}
function bestLicenseAfter(l) { return all('Licenses').some((x) => x.accountId === l.accountId && x.id !== l.id && String(x.active) !== '0' && (x.expAt === '' || Number(x.expAt) > Number(l.expAt))); }
function adm_offer(tok, accountId, subject, text) { adminGuard(tok); const a = accountBy(accountId); sendMail(a.email, subject, { lang: a.lang, kind: 'promo', unsub: unsubUrl(a), title: subject, body: '<p>' + String(text).replace(/\n/g, '<br>') + '</p>' }); return true; }
function adm_news(tok) { adminGuard(tok); return all('Newsletters').reverse(); }
function adm_saveNews(tok, n) { adminGuard(tok); if (n.id) { const r = all('Newsletters').filter((x) => x.id === n.id)[0]; upd('Newsletters', r._row, { subject: n.subject, body: n.body, kind: n.kind }); return n.id; } const id = uid(); add('Newsletters', { id: id, subject: n.subject, body: n.body, kind: n.kind, createdAt: Date.now(), sentAt: '', sentCount: 0 }); return id; }
function adm_sendNews(tok, id, testOnly) {
  adminGuard(tok); const n = all('Newsletters').filter((x) => x.id === id)[0]; const owner = Session.getEffectiveUser().getEmail();
  const dummy = { id: 'test' }; const body = String(n.body).replace(/\n/g, '<br>');
  if (testOnly) { MailApp.sendEmail({ to: owner, subject: '[TEST] ' + n.subject, htmlBody: mailHtml({ lang: 'ar', kind: n.kind, unsub: unsubUrl(dummy), title: n.subject, body: body }), name: 'CareDesk' }); return 1; }
  let sent = 0; const quota = MailApp.getRemainingDailyQuota();
  all('Accounts').filter((a) => a.status === 'active' && (n.kind === 'service' || a.promo === true || String(a.promo) === 'true')).slice(0, quota).forEach((a) => { try { sendMail(a.email, n.subject, { lang: a.lang, kind: n.kind, unsub: unsubUrl(a), title: n.subject, body: body }); sent++; } catch (e) { log('server', 'mail-fail', a.email); } });
  upd('Newsletters', n._row, { sentAt: Date.now(), sentCount: sent }); log('admin', 'send-news', n.subject + ' → ' + sent); return sent;
}
function adm_backups(tok) { adminGuard(tok); const accs = all('Accounts'); return all('BackupRequests').reverse().map((b) => { const a = accs.filter((x) => x.id === b.accountId)[0] || {}; return Object.assign({}, b, { username: a.username, email: a.email }); }); }
function adm_approveBackup(tok, id) {
  adminGuard(tok); const b = all('BackupRequests').filter((x) => x.id === id)[0]; const a = accountBy(b.accountId);
  const data = { account: publicAcc(a), devices: all('Devices').filter((d) => d.accountId === a.id).map((d) => ({ name: d.name, platform: d.platform, firstSeen: d.firstSeen, lastSeen: d.lastSeen })), licenses: all('Licenses').filter((l) => l.accountId === a.id), exportedAt: new Date().toISOString() };
  MailApp.sendEmail({ to: a.email, subject: 'نسخة من بياناتك / Your data copy', htmlBody: mailHtml({ lang: a.lang, kind: 'service', title: a.lang === 'en' ? 'Your data copy' : 'نسخة من بياناتك', body: '<p>' + (a.lang === 'en' ? 'Your requested data copy is attached.' : 'مرفق نسخة بياناتك التي طلبتها.') + '</p>' }), name: 'CareDesk', attachments: [Utilities.newBlob(JSON.stringify(data, null, 2), 'application/json', 'caredesk-account-data.json')] });
  upd('BackupRequests', b._row, { status: 'approved', approvedAt: Date.now() }); log('admin', 'approve-backup', a.username); return true;
}
function adm_setLatest(tok, v) { adminGuard(tok); setSecret(APP_VERSION_KEY, JSON.stringify({ version: v.version, url: v.url, notes: v.notes || '' })); return true; }
function adm_getLatest(tok) { adminGuard(tok); return J(P(APP_VERSION_KEY), { version: '', url: '', notes: '' }); }
function adm_log(tok) { adminGuard(tok); return all('Log').reverse().slice(0, 200); }
function adm_stats(tok) { adminGuard(tok); const lic = all('Licenses'); return { accounts: all('Accounts').length, devices: all('Devices').filter((d) => String(d.active) !== '0').length, trials: all('TrialRegistry').length, activeLicenses: lic.filter((l) => String(l.active) !== '0' && (l.expAt === '' || Number(l.expAt) > Date.now())).length, pendingBackups: all('BackupRequests').filter((b) => b.status === 'pending').length, mailQuota: MailApp.getRemainingDailyQuota() }; }
function adm_errors(tok, onlyOpen) { adminGuard(tok); let r = all('ErrorReports'); if (onlyOpen) r = r.filter((e) => !e.handled); return r.sort((a, b) => Number(b.lastAt) - Number(a.lastAt)).slice(0, 300); }
function adm_handleError(tok, id, v) { adminGuard(tok); const e = all('ErrorReports').filter((x) => x.id === id)[0]; if (e) upd('ErrorReports', e._row, { handled: v ? Date.now() : '' }); return true; }
function adm_errorCatalog(tok) { adminGuard(tok); return ERROR_CATALOG; }
function adm_notices(tok) { adminGuard(tok); return all('Notices').reverse(); }
function adm_saveNotice(tok, n) { adminGuard(tok); if (n.id) { const r = all('Notices').filter((x) => x.id === n.id)[0]; if (r) upd('Notices', r._row, { title: n.title, body: n.body, kind: n.kind, active: n.active ? 1 : 0 }); } else add('Notices', { id: uid(), title: n.title, body: n.body, kind: n.kind || 'info', createdAt: Date.now(), active: 1 }); return true; }
function adm_delNotice(tok, id) { adminGuard(tok); const r = all('Notices').filter((x) => x.id === id)[0]; if (r) delRow('Notices', r._row); return true; }
