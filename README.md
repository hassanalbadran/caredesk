# CareDesk

Free and open-source clinic booking, session timers and patient reminders for Windows. Works offline. No activation code and no subscription.

- Releases (official): https://github.com/hassanalbadran/caredesk/releases
- Download the latest release: https://github.com/hassanalbadran/caredesk/releases/latest

Download the Windows installer from the releases page. Once a newer release is published, the app updates itself from inside.

## Highlights
- Month calendar home screen with a button per session type, per-device hour grids, timers, drag and drop, right-click menus
- Smart scheduling with patient classes; full days flagged red, nearly full yellow
- Patient profiles, priorities, maintenance reminders, WhatsApp reminders, receipt designer, barcodes
- Live manager statistics and granular permissions (secretary / admin)
- Import and export (CSV, Excel, JSON, vCard, SQL, SQLite)
- System check and safe auto-repair: `Ctrl+Shift+D`
- Optional phone link on the same Wi-Fi
- Arabic and English interface

## Build from source
```
npm install
npm start          # run
npm test           # logic tests
npm run test:ui    # headless UI checks
npm run dist       # Windows installer (also writes config/integrity.json)
```
`config/app.json`: `githubRepo` (in-app updates) and `gasUrl` (optional support dashboard, can also be set from Settings → Account).

## Support dashboard (optional)
`gas/Code.gs` and `gas/Index.html` run on Google Apps Script. Paste them into a project, run `setup()` (again after every update) and `setAdminPassword('...')`, deploy as a web app and open `<exec-url>?page=admin`. Never commit the private licence key or the admin password.

## Open-source credits
Cairo font (OFL 1.1), Lucide icons (ISC), Electron (MIT), SQLite. Listed in-app under Settings → About.

MIT licensed.

Made by Elaph
