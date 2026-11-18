# Helix BioFast Labs — Autonomous WhatsApp CRM & Bot Engine

A standalone, production-grade WhatsApp Automation CRM, AI Enquiry Bot, and Student Pipeline Management Suite designed specifically for **Helix BioFast Labs (Noida, India)**.

---

## Key Features

1. **Standalone Desktop Application**:
   - Run directly as a native Windows desktop app window without browser clutter using `Start-Desktop-App.bat`.
   - Accessible from any web browser at `http://localhost:3000`.

2. **Access from Any Computer or Mobile Device on Local Wi-Fi**:
   - The server detects your local LAN IP automatically.
   - Any team member on the same Wi-Fi network can manage leads, live chats, and campaigns from their laptop, iPad, or mobile browser without installing Node.js or copying files.
   - Click the **Wi-Fi Network Link** badge in the CRM navbar or Settings page to copy your device's URL.

3. **In-App Google Drive Cloud Backup**:
   - Back up all student leads, chat histories, drip sequences, broadcast campaigns, and faculty contacts with one click.
   - Change and save your Google Drive folder link anytime directly in **Settings > Google Drive Cloud Backup**.
   - No code edits or GitHub re-uploads needed to change your Drive backup link.

4. **Multi-Stage Automated Drip Sequences**:
   - Automated nurture sequences (Day 0, Day 1, Day 3, Day 5, Day 7) for General Enquiries, Lab Visits, and Call Inquiries.
   - Global pause switch to immediately halt all drip campaigns whenever required.

5. **Targeted Broadcasts & Anti-Ban Protection**:
   - Custom broadcast campaigns with Excel contact list upload and dynamic placeholder replacement (`{{name}}`, `{{college}}`).
   - Built-in anti-ban pauses, humanized typing simulation, resting periods, and one-click emergency broadcast stop.

6. **SQLite Embedded Database with WAL Mode**:
   - High-performance, zero-maintenance local database with Write-Ahead Logging (WAL) and automatic table indexing.
   - Complete data isolation and privacy: your customer database and session tokens stay on your machine and are excluded from GitHub.

---

## Quick Setup Guide for Any Computer

### Step 1: Install Node.js
Download and install Node.js (version 18 or higher) from [https://nodejs.org](https://nodejs.org).

### Step 2: Clone or Download the Repository
```bash
git clone <your-github-repo-url>
cd helix-whatsapp-bot
```

### Step 3: Install Dependencies
Run `install.bat` or run in terminal:
```bash
npm install
```

### Step 4: Launch the CRM
- **As a Native Desktop App**: Double-click `Start-Desktop-App.bat`.
- **In Browser / Console**: Double-click `start-crm.bat` and open `http://localhost:3000` in any browser.

### Step 5: Connect WhatsApp
1. Open the CRM screen.
2. In the top-right or Settings page, scan the displayed QR barcode using WhatsApp on your phone (**Linked Devices > Link a Device**).
3. Once linked, the status turns green ("WhatsApp Connected") and operates 24/7.

---

## Accessing CRM from Another Computer on Wi-Fi

1. Keep the software running on the main computer.
2. Open the CRM and check the top navbar for your local network URL (e.g., `http://192.168.1.15:3000`).
3. Open that URL in Chrome, Edge, or Safari on any computer, laptop, or smartphone connected to the same Wi-Fi.

---

## GitHub & Security Rules

The repository includes a strict `.gitignore` that prevents sensitive data from ever reaching GitHub:
- WhatsApp session keys (`.session/`) are kept local.
- SQLite databases (`*.sqlite`, `*.db`) remain private on your computer.
- Secrets and uploaded broadcast files are safely ignored.

You can freely push updates to GitHub without worrying about leaking customer data or WhatsApp sessions.
