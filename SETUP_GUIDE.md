# Helix BioFast Labs — WhatsApp Bot
# SIMPLE 3-STEP SETUP ON YOUR OWN PHONE

No laptop needed after setup. Bot runs on your own phone.

---

## STEP 1 — Install Termux (5 minutes)

On YOUR phone (the one with WhatsApp Business):

1. Open browser → go to: **https://f-droid.org**
2. Download and install F-Droid
3. Open F-Droid → Search "Termux" → Install
4. Also search "Termux:Boot" → Install (for auto-start)

> Do NOT install Termux from Google Play — it is outdated.

---

## STEP 2 — Run the Setup Script (5 minutes)

Open Termux on your phone.

Type this ONE command and press Enter:
```
bash <(curl -fsSL https://raw.githubusercontent.com/your-username/helix-bot/main/termux-setup.sh)
```

OR: If the above does not work, copy the content of `termux-setup.sh`
and paste it directly into Termux.

Wait for it to finish. It will show:
```
>>> http://192.168.X.X:3000/qr <<<
```

---

## STEP 3 — Scan QR Code (30 seconds)

Open the URL shown above in your phone's browser (Chrome/Firefox).
A QR code page opens.

On the SAME phone:
1. Open WhatsApp Business App
2. Settings → Linked Devices → Link a Device
3. Point camera at QR code on your screen

Done! You will see: **WhatsApp Connected! Bot is running.**

---

## After Setup — Keep Bot Always Running

### Disable battery optimization for Termux:
1. Phone Settings → Apps → Termux
2. Battery → Select "Unrestricted" or "No restrictions"
3. Do the same for "Termux:Boot"

### Run in background (bot keeps running even if you close Termux):
In Termux:
```
cd ~/helix-bot
nohup node helix-bot.js > bot.log 2>&1 &
```

### Bot auto-starts when phone restarts:
Already set up by the setup script! (via Termux:Boot)

---

## Personalise Your Bot

Edit the bot file to add your actual fees and phone number:
```
nano ~/helix-bot/helix-bot.js
```

Find and change:
- `91XXXXXXXXXX` → your actual number (e.g. 919876543210)
- `[YOUR PHONE NUMBER]` → your Helix phone number
- `[Update in bot file]` → actual course fees

Press Ctrl+X, Y, Enter to save. Then restart:
```
pkill -f helix-bot
cd ~/helix-bot
nohup node helix-bot.js > bot.log 2>&1 &
```

---

## Set Up Brochure PDF

1. Upload PDF to Google Drive
2. Share → Anyone with link → Copy link
3. Your link: `https://drive.google.com/file/d/FILE_ID/view`
4. Direct link: `https://drive.google.com/uc?export=download&id=FILE_ID`
5. In helix-bot.js, set:
   ```
   const BROCHURE_URL = 'https://drive.google.com/uc?export=download&id=FILE_ID';
   ```

---

## Checking if Bot is Running

View logs:
```
tail -f ~/helix-bot/bot.log
```

Check if running:
```
ps aux | grep node
```

Restart bot:
```
pkill -f helix-bot
cd ~/helix-bot
nohup node helix-bot.js > bot.log 2>&1 &
echo "Bot restarted!"
```

---

## WhatsApp Session Expired? (Rare)

If bot stops responding after weeks:
1. Open Termux
2. Run: `cd ~/helix-bot && node helix-bot.js`
3. Open browser → `http://localhost:3000/qr`
4. Scan QR code again

---

## Total Cost: Rs. 0

| What | Cost |
|---|---|
| Termux app | Free |
| Node.js | Free |
| WhatsApp connection (Baileys) | Free |
| Your phone | Already yours |
| **TOTAL** | **Rs. 0** |
