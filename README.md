<div align="center">

# 🏥 CareDesk

**A modern, offline-first clinic management and booking desktop application.**

[![Version](https://img.shields.io/badge/version-0.1.0--beta.1-blue.svg?style=for-the-badge)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/Platform-Windows-0078D6.svg?style=for-the-badge&logo=windows)](#)
[![Electron](https://img.shields.io/badge/Electron-191970?style=for-the-badge&logo=Electron&logoColor=white)](#)

*Built for speed, fully customizable, and designed with a neo-tactile soft UI.*

[Report Bug](https://github.com/hassanalbadran/caredesk/issues) · [Request Feature](https://github.com/hassanalbadran/caredesk/issues)

</div>

---

## 📖 About The Project

**CareDesk** is a Windows desktop application designed to streamline patient bookings, session distributions, and daily clinic operations. It works entirely **offline**, ensuring patient data remains secure on your local machine while offering optional background synchronization.

CareDesk is currently **100% free and open-source (MIT)**. There are no activation codes, no hidden fees, and no mandatory accounts required to use the core application.

### ✨ Key Features

- **📅 Dynamic Calendar & Drag-and-Drop:** A robust month-view calendar that acts as your main dashboard. Drag and drop patient sessions to reschedule effortlessly. Auto-distribute sessions based on patient classes, working hours, and smart gap rules.
- **⏱️ Real-time Timers & Notifications:** Interactive device timelines with countdown timers. Track exactly who is in the chair, get alert notifications for session ends, and manage patient queues (laggards, dropped-out, VIPs).
- **🖨️ Visual Receipt Designer:** Built-in, fully typable receipt designer supporting thermal printers, A4, A5, and A6. Magnetic blocks allow you to build custom layouts with barcodes, QR codes, and patient data.
- **📱 WhatsApp Integration:** Send pre-filled appointment reminders directly to patients via WhatsApp Desktop.
- **🔄 eClinic Database Import:** Background, read-only sync to pull patient history and appointments from local eClinic databases seamlessly.
- **🛠️ Built-in Diagnostics:** Automatic self-check and repair system (Ctrl+Shift+D) that monitors for errors, creates safety backups before applying fixes, and ensures no patient data is ever lost.
- **🌙 Soft UI & Accessibility:** Grid-aligned, rich neo-tactile design with dark/light modes, custom cursors, reduced-motion support, and full Arabic/English (RTL) localization.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- Windows 10/11

### Installation & Run (Development)

1. Clone the repository:
    git clone https://github.com/hassanalbadran/caredesk.git
    cd caredesk

2. Install dependencies:
    npm install

3. Start the app in dev mode:
    npm start

4. Build the Windows Installer:
    npm run dist
   *The `.exe` installer will be generated in the `dist/` folder.*

---

## ⚙️ Configuration & Admin Dashboard

Edit `config/app.json` to set up your environment (auto-updates, etc.):

    {
      "gasUrl": "YOUR_APPS_SCRIPT_URL_IF_USED",
      "site": "https://hasn2mr.pages.dev/",
      "heartbeatHours": 6,
      "paid": false,
      "githubRepo": "hassanalbadran/caredesk"
    }

**Optional Backend:** CareDesk includes a Google Apps Script (`gas/`) for an optional admin dashboard. This can be used for error reporting, license management (if re-enabled in the future), and sending in-app notifications.

---

## 💻 Tech Stack

- **Core:** Electron, Vanilla JavaScript (highly optimized for performance)
- **Database:** `node:sqlite` (local storage in the install folder)
- **UI/UX:** Neo-tactile custom CSS (No heavy frontend frameworks)
- **Backend (Optional):** Google Apps Script + Google Sheets
- **Assets:** Cairo font (OFL), Lucide Icons (ISC)

---

## 👨‍💻 Author

**Hasn Al-Badran**
- Website: [https://hasn2mr.pages.dev/](https://hasn2mr.pages.dev/)
- GitHub: [@hassanalbadran](https://github.com/hassanalbadran)

---

<div align="center">
  <i>Built with ❤️ for Clinics. Fully offline. Zero subscriptions.</i>
</div>
