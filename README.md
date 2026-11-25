# CareDesk (v0.1.0-beta.1) — free & open source (MIT)
Clinic bookings and reminders for Windows. Electron + vanilla JS + built-in `node:sqlite`. No activation, no code, no account needed to use it.
Optional support dashboard (error reports, in-app notices): Google Apps Script in `gas/`.

## Run / build
1. `npm install`
2. `npm start` — run · `npm test` — logic tests · `npm run test:ui` — headless UI checks
3. `npm run dist` — builds the Windows installer into `dist/` (also writes `config/integrity.json`)
4. Set `config/app.json`: `gasUrl` (your deployed Apps Script /exec URL, optional) and `githubRepo` (`owner/repo`, for in-app updates).

## Support dashboard (optional)
Paste `gas/Code.gs` and `gas/Index.html` in an Apps Script project, run `setup()` (again after every update) and `setAdminPassword('...')`, deploy as Web app, open `<exec-url>?page=admin`.
**Never commit** the private licence key (`secrets/`) or your admin password.

## Shortcuts
Ctrl+Shift+D — system check & safe auto-repair (a safety copy is saved first; no patient or session is ever deleted).

## Credits (open source)
Cairo font (OFL 1.1) · Lucide icons (ISC) · Electron (MIT) · SQLite. Listed in-app under Settings → About.
