<div align="center">

# 🏥 CareDesk

**A modern, offline-first clinic booking & reminder desktop app.**

[![Version](https://img.shields.io/badge/version-0.1.0--beta.1-blue.svg?style=for-the-badge)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/Platform-Windows-0078D6.svg?style=for-the-badge&logo=windows)](#)
[![Electron](https://img.shields.io/badge/Electron-191970?style=for-the-badge&logo=Electron&logoColor=white)](#)

*Built for speed, fully customizable, and designed with a neo-tactile soft UI.*

[Report Bug](https://github.com/hassanalbadran/caredesk/issues) · [Request Feature](https://github.com/hassanalbadran/caredesk/issues)

</div>

---

## 📖 About The Project

**CareDesk** is a Windows desktop application designed to streamline patient bookings, session distributions, and clinic management. It works entirely **offline**, ensuring patient data remains secure on your local machine while attempting background heartbeats for updates and licensing.

### ✨ Key Features

- **📅 Smart Scheduling:** Auto-distribute patient sessions based on customizable working hours, gaps, and patient groups.
- **📱 WhatsApp Reminders:** Integration with WhatsApp Desktop for instant pre-filled reminders.
- **🖨️ Receipt Designer:** Built-in visual designer for thermal, A4, and A5 printers with barcode/QR support.
- **📊 Absentee & Dropout Tracking:** Automatic flagging for non-compliant patients and session reorganization.
- **🔄 eClinic.info Sync:** Background, read-only sync from local eClinic databases to import patient history seamlessly.
- **🌙 Soft UI:** Neo-tactile design system with dark/light modes and custom cursor support.
- **🌐 Bilingual:** Full English and Arabic (RTL) support.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- Windows 10/11

### Installation & Run (Development)

1. Clone the repo:
   ```bash
   git clone https://github.com/hassanalbadran/caredesk.git
   cd caredesk

    Install dependencies:
    bash

    npm install

    Start the app in dev mode:
    bash

    npm start

    Build the Windows Installer:
    bash

    npm run dist

    The .exe installer will be generated in the dist/ folder.

⚙️ Configuration

Edit config/app.json to set up your environment:
json

{
  "gasUrl": "YOUR_APPS_SCRIPT_URL",
  "site": "https://hasn2mr.pages.dev/",
  "heartbeatHours": 6,
  "paid": false,
  "githubRepo": "hassanalbadran/caredesk",
  "integrity": "warn"
}

🛠️ Admin Dashboard (Optional)

CareDesk includes a Google Apps Script backend for license management, newsletters, and error reports.

    Go to gas/Code.gs and gas/index.html.

    Paste them into a new Google Apps Script project.

    Run setup() to initialize the Sheets database.

    Run setAdminPassword('YOUR_SECURE_PASSWORD') to protect the dashboard.

    Deploy as a Web App (Execute as: Me, Access: Anyone).

🗺️ Roadmap (v0.2.0+)

    □

    Authentication: Google, Microsoft, and Email login.
    □

    Device Linking: Android app connection via local Wi-Fi and QR pairing.
    □

    Activation System: 14-day trial lock + activation code validation.
    □

    AI Sandbox: Local testing environment for custom receipt scripts.

💻 Tech Stack & Credits

    Core: Electron, Vanilla JS, node:sqlite.

    Fonts: Cairo (OFL 1.1) · Inter · IBM Plex Sans Arabic.

    Icons: Lucide Icons (ISC).

    All open-source assets are credited in-app under Settings → About.

👨‍💻 Author

Hasn Al-Badran

    Website: https://hasn2mr.pages.dev/

    GitHub: @hassanalbadran

<div align="center"> <i>Built with ❤️ for Clinics in Iraq and beyond.</i> </div> ```
