# CareDesk — progress (v1.0.0) — resume from here
Stack: Electron 45.3.4 (Node 24, built-in `node:sqlite`) · vanilla JS renderer (classic scripts, one IIFE per file, shared `CD` namespace) · Google Apps Script dashboard (RSA-signed licences).
Sandbox has no npm network: Electron can't run here. Logic: `npm test` (31 green). UI: `npm run test:ui` (headless Chrome + real Service over a bridge, tests/ui/harness.js) — 0 JS errors.
NOTE: DeepSeek fragments (TS/React/better-sqlite3) were NOT adopted (conflict with the tested architecture); ideas reused: top-layer tooltips, barcode wedge, eClinic probe, printers.

## DONE
- src/core (all logic + tests), gas/ (Code.gs + Index.html admin UI + mock tests), scripts/gen-keys.js
- src/main: main.js (sandbox, CSP, gate on licence, cloud+sys IPC, print, backup, heartbeat), preload.js, cloud.js; config/app.json (gasUrl empty)
- src/renderer: auth (welcome/plans/login/register/verify/forgot/lock/picker), app shell, today (filters, lazy scroll, attendance confirm, gap notice), calendar (+detailed stats), patients (accordion lists, profile, editor, auto-distribute preview), tools (WhatsApp, PBX guide, rating links, barcode, absentees), alerts, settings (nested accordion: general/clinic/hours/catalog/groups/tags/absence/messages/print+receipt designer/staff/integration/licence+backup/audit/about), accordion component, receipt render, themes (dark/light/sand/ocean/system), custom cursor, top-layer dialogs/tooltips
- build/icon.png, .github/workflows/release.yml, README.md
## TODO
1. Run on a real PC: `npm install`, gen-keys, deploy GAS, set gasUrl, `npm start`; fix Electron-only issues (print, fonts path, sandbox preload)
2. QR codes on receipt (social block prints text only; add `qrcode-generator` MIT)
3. e-clinic: column-mapping UI (auto-map exists), need owner's DB sample
4. OAuth (Google/Microsoft) — needs client IDs; Android link disabled
5. Legal terms/privacy text; in-app update download (currently opens release URL)
6. Security review pass with npm audit once installed; EN translations proof-read
- Admin UI = static admin/index.html on Cloudflare Pages (owner's keyboard-safe version is canonical; GAS doPost action 'adm' is the API). Do NOT reintroduce prompt(), <base>, all:unset, inputmode=numeric.

## v0.1.1 (2026-11-21) — done
- UI: real switches/checkboxes (CSS specificity bug), cursors, help = "?" click popover (CD.help), designer per-block delete (× + Delete key) + centered labels
- Sign-out now shows picker + account login (was auto re-login); quick menu on name click (extras.js); F12 dev panel (code hash in extras.js, network toggle, errors, devtools); first-run tour + replay in Settings>About
- Tiers: trial/pro/max (src/core/plans.js -> js/plans.js via `node scripts/sync-plans.js`), GAS Licenses/Codes have `tier` column (re-run setup() once), seat/secretary limits, trial watermark on receipts, plan cards UI
- Roles auto-fill permissions + per-permission notes; Rating API (Pro+) settings + sys.ratingApi (expects POST {base}/ratings/create -> {links:{token:url}}; platform spec unknown)
- Session planner (planner.js + core/pattern.js + scheduler.distributePattern): drag chips on month calendar, infers cycle, fills from first day; saved patterns dropdown (settings.sessionPatterns, max 12, dedup)
- Admin page: parallel server calls; keyboard bug was onkeydown returning false
- Tests: 40 node + UI flows/smoke 0 errors
## Still TODO
- Not run on real Electron; F12 hash is client-side only (weak by nature); admin speed limited by GAS latency (~1-3s/call)
- Main screen "sections" complaint unclear (today is default) — ask Hasn for screenshot; QR on receipt; e-clinic mapping; OAuth; legal text

## 2026-11-24
- DONE: pattern.describe (smart plain-language names), core dayLoad/dayLoads (red/yellow/green), CD.addSessionDialog (hour right-click: search→profile→add/paste, type/device pre-filled, coloured), CD.lvPaint on patient-editor package selects, red/yellow borders in schedcal + planner, CD.dialog "null" fix. 62 tests; UI smoke/flows/floor/load all 0 errors.
- NEXT: diagnostics UI (CD.diagPanel, Ctrl+Shift+D, auto-prompt, reportError), tutorial update, GAS (notices/report/ErrorReports/catalog/terms email), Android in-app link, icon, README/LICENSE, release workflow, final zip.
- DONE (11-24 pm): diag.js (CD.diagPanel Ctrl+Shift+D + quick menu, auto prompt throttled 6h, UI error → reportError), devPanel now uses CD.sys('devUnlock') (no hash in renderer), tour rewritten for new home (11 steps incl. maintenance), FIXED CD.confirm always returning false (onClose raced res(true)). tests/ui/diag.js added.
- NEXT: GAS (notices/report/ErrorReports/catalog tab/terms+thanks email/account creation fix/remove code activation), Android link, icon, README/LICENSE, release workflow, final zip.
- DONE: GAS Code.gs (report/notices actions, ErrorReports+Notices sheets, tamper mail alert, redeem removed, terms+thanks mail on verifyEmail, adm_errors/handleError/errorCatalog/notices) + Index.html (Errors tab with catalog+handling steps, Notices tab; codes tab removed). User must re-run setup() after pasting.
- 2026-11-25 RELEASE CUT: community edition, integrity=warn, MIT LICENSE+README, phonelink.js (LAN phone page, tested, NOT wired in UI yet), 63 tests + 5 UI scripts green. Hasn to publish 0.1.0-beta.1; later updates via in-app update.
- 2026-11-25 BETA 2: login msgs+server address field (Settings→Account), roles secretary/admin only (manager/god migrated), ctx submenu own popover, Ctrl+Shift+D via e.code + main forward, dev code hash updated, phone link wired in Settings, About = Elaph Adnan only, docs/index.html + README for GitHub (repo hassanalbadran/caredesk), version 0.1.0-beta.2. 63 tests + 7 UI scripts green. Left for beta 3: icon polish, Hasn tests.

- 2026-11-27 v1.0.0 (first official release): fixed/pinned session start time per patient (pref_time + retime), 2 sessions same day, whole-interface zoom + fit-to-window calendar, 'add new patient' in every context menu, cold-start fix (no sync reg/PowerShell before window; fingerprint cached; splash), GAS URL box removed (config/app.json), cloud client error classification, new icon, look packs (Zain / Playfair+Inter / custom fonts in <data>/fonts), AUTOMATIC UPDATES (main process checks every 4 h, downloads+verifies installer, installs silently when the app is closed or on 'restart now'; data is copied to %APPDATA%/CareDesk/update-backup before install and restored if the data folder is missing). Release: tag v1.0.0 (no prerelease flag, --latest).

- 2026-11-28 v1.1.0: new SVG icon (build/icon.svg -> png/ico), MicroSIP link (src/main/microsip.js, core/callerid.js, renderer/js/call.js; click-to-call + incoming-call card via loopback HTTP hook), CareDesk Doctor (doctor/*: PowerShell UI, deep-check.js, catalog.json, crash-patterns.json; installed to <install>\Doctor with a desktop shortcut via build/installer.nsh), --safe launch flag, hidden tray instance now shown on second launch, build/icon.png packed for tray icon. Doctor PS script and NSIS shortcuts are UNTESTED on Windows (no PowerShell here).
