#!/data/data/com.termux/files/usr/bin/bash
# ============================================================
# HELIX BIOFAST LABS — One-Click Bot Setup for Termux
# 
# HOW TO USE:
# 1. Open Termux on your phone
# 2. Paste this entire script and press Enter
# 3. Wait for it to finish (~5 minutes)
# 4. Scan QR code from your browser
# 5. Done!
# ============================================================

echo ""
echo "========================================"
echo "  Helix BioFast Labs WhatsApp Bot"
echo "  Automatic Setup Script"
echo "========================================"
echo ""

# Step 1: Update and install Node.js
echo "[1/5] Installing Node.js..."
pkg update -y -q 2>/dev/null
pkg install nodejs -y -q 2>/dev/null
echo "✅ Node.js installed: $(node --version)"

# Step 2: Create project folder
echo ""
echo "[2/5] Creating bot folder..."
mkdir -p ~/helix-bot
cd ~/helix-bot

# Step 3: Create package.json
cat > package.json << 'PKGEOF'
{
  "name": "helix-bot",
  "version": "3.0.0",
  "main": "helix-bot.js",
  "dependencies": {
    "@whiskeysockets/baileys": "^6.7.0",
    "@hapi/boom": "^10.0.1",
    "qrcode": "^1.5.3",
    "express": "^4.18.2",
    "pino": "^8.17.0"
  }
}
PKGEOF

# Step 4: Install packages
echo ""
echo "[3/5] Installing bot packages (2-4 minutes)..."
npm install --silent 2>/dev/null
echo "✅ Packages installed"

# Step 5: Create the bot file
echo ""
echo "[4/5] Creating bot file..."

cat > helix-bot.js << 'BOTEOF'
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode');
const express = require('express');
const pino = require('pino');
const https = require('https');
const http = require('http');
const fs = require('fs');

// ============================================================
// EDIT THESE TWO LINES WITH YOUR DETAILS
// ============================================================
const ADMIN_PHONE  = '91XXXXXXXXXX@s.whatsapp.net'; // your number e.g. 919876543210@s.whatsapp.net
const BROCHURE_URL = '';  // leave blank if no brochure yet
// ============================================================

const PORT = 3000;

const INTENTS = {
  menu:     ['hi','hello','hey','helo','hii','hai','hy','start','menu','help','namaste','good morning','good afternoon','good evening','good night','ji','ok'],
  courses:  ['1','course','courses','training','trainning','program','programme','internship','intern','learn','study','biotechnology','microbiology','molecular biology','biochemistry','cell culture','animal cell','plant cell','pcr','elisa','western blot','bioinformatics','recombinant','genomics','proteomics','immunology','tissue culture','fermentation','chromatography','protein','dna extraction','rna'],
  fees:     ['2','fee','fees','price','prices','cost','costs','charge','charges','how much','kitna','amount','rate','rupee','rupees','rs ','paisa','money','scholarship','discount','payment'],
  brochure: ['3','brochure','brocher','brochur','brocure','pdf','catalogue','catalog','prospectus','syllabus','send details','course details','more details'],
  projects: ['4','project','projects','student project','mini project','major project','project work','bsc project','msc project','final year'],
  phd:      ['5','phd','ph.d','doctorate','doctoral','phd assistance','thesis','dissertation','research scholar'],
  forensic: ['6','forensic','forensics','forensic service','dna test','fingerprint','crime scene','forensic biology'],
  human:    ['7','team','staff','human','person','talk','call','contact','speak','expert','counselor','admission','enquiry','register','enroll','join'],
  address:  ['address','location','where','kahan','noida','sector 2','office','lab','how to reach','directions','map','nearest metro'],
  cert:     ['certificate','cert','certification','letter','completion letter','internship letter'],
  duration: ['duration','how long','how many weeks','weeks','days','months','1 week','2 week','3 week','4 week']
};

const R = {
  menu:
    'Hello! \uD83D\uDC4B Thank you for contacting *Helix BioFast Labs Pvt. Ltd.*, Noida.\n\n' +
    'I can instantly help you with our training programs, fees, and services.\n\n' +
    'Please select:\n\n1\uFE0F\u20E3 Training Courses\n2\uFE0F\u20E3 Course Fees\n3\uFE0F\u20E3 Training Brochure (PDF)\n' +
    '4\uFE0F\u20E3 Student Projects\n5\uFE0F\u20E3 PhD Assistance\n6\uFE0F\u20E3 Forensic Services\n7\uFE0F\u20E3 Talk to Our Team\n\n' +
    'Type the number or ask your question. \uD83D\uDE0A',
  courses:
    '\uD83E\uDDEC *Helix BioFast Labs \u2014 Training Programs*\n\n' +
    'Hands-on laboratory training in:\n\n' +
    '\uD83D\uDD2C Molecular Biology\n\uD83E\uDDEB Microbiology\n\uD83E\uDDEA Biochemistry\n' +
    '\uD83E\uDDA0 Animal & Plant Cell Culture\n\uD83E\uDDEC PCR & Genomics\n\uD83D\uDC89 ELISA & Immunotechnology\n' +
    '\uD83D\uDDA5\uFE0F Bioinformatics\n\uD83D\uDD2C Recombinant DNA Technology\n\uD83E\uDDEC Western Blotting\n\uD83D\uDD0D Forensic Biology\n\n' +
    'All training is *hands-on* at our *Noida laboratory*.\n\nType *2* fees | *3* brochure | *7* talk to us.',
  fees:
    '\uD83D\uDCB0 *Helix BioFast Labs \u2014 Training Fees*\n\n' +
    '\uD83D\uDCC5 *1 Week*  \u2014 \u20B9[Update in bot file]\n\uD83D\uDCC5 *2 Weeks* \u2014 \u20B9[Update in bot file]\n' +
    '\uD83D\uDCC5 *3 Weeks* \u2014 \u20B9[Update in bot file]\n\uD83D\uDCC5 *4 Weeks* \u2014 \u20B9[Update in bot file]\n\n' +
    '_Fees vary by course. Tell us your course of interest._\n\nType *3* brochure | *7* speak with team.',
  projects:
    '\uD83D\uDD2C *Helix BioFast Labs \u2014 Student Projects*\n\n' +
    '\u2705 B.Sc / M.Sc Final Year Project Work\n\u2705 Hands-on Lab Training\n\u2705 Experimental Design\n' +
    '\u2705 Data Analysis Support\n\u2705 Thesis Lab Work\n\u2705 Project Completion Certificate\n\n' +
    'All at our Noida lab. Type *7* to discuss.',
  phd:
    '\uD83C\uDF93 *Helix BioFast Labs \u2014 PhD Assistance*\n\n' +
    '\u2705 Experimental Design Consultation\n\u2705 PCR, ELISA, Western Blot, Cell Culture\n' +
    '\u2705 Bioinformatics & Data Analysis\n\u2705 Thesis Lab Work Support\n\nType *7* to connect with our team.',
  forensic:
    '\uD83D\uDD0D *Helix BioFast Labs \u2014 Forensic Services*\n\n' +
    '\u2705 DNA Fingerprinting & Analysis\n\u2705 Forensic Biology Training\n\u2705 Molecular Forensics\n' +
    '\u2705 Forensic Training Programs\n\nType *7* for enquiries.',
  human:
    '\uD83D\uDE4F *Thank you for contacting Helix BioFast Labs!*\n\n' +
    'Your enquiry received. Our team will contact you shortly.\n\n' +
    '\uD83D\uDCDE [YOUR PHONE NUMBER]\n\uD83D\uDCE7 biofastlabs@gmail.com\n\uD83C\uDF10 www.helixbiofastlabs.com\n' +
    '\uD83D\uDCCD A-52, First Floor, Sector-2, Noida \u2014 201301\n\n\uD83D\uDD50 Mon\u2013Sat, 9 AM \u2013 6 PM',
  address:
    '\uD83D\uDCCD *Helix BioFast Labs Pvt. Ltd.*\n\nA-52, First Floor, Sector-2,\nNoida, Uttar Pradesh \u2014 201301\n\n' +
    '\uD83D\uDDFA\uFE0F https://maps.google.com/?q=A-52+Sector+2+Noida\n\n\uD83D\uDCDE [YOUR PHONE NUMBER]\n' +
    '\uD83D\uDCE7 biofastlabs@gmail.com\n\uD83C\uDF10 www.helixbiofastlabs.com\n\n\uD83D\uDD50 Mon\u2013Sat, 9 AM \u2013 6 PM',
  cert:
    '\uD83C\uDFC6 *Helix BioFast Labs \u2014 Certificate*\n\n' +
    '\u2705 Course Completion Certificate after training\n\u2705 Includes course, duration, date\n' +
    '\u2705 Signed by Lab Director | Official seal\n\u2705 Separate Project Completion Certificate\n\nType *7* for queries.',
  duration:
    '\u23F0 *Helix BioFast Labs \u2014 Training Duration*\n\n' +
    '\uD83D\uDCC5 *1 Week*  \u2014 Intensive\n\uD83D\uDCC5 *2 Weeks* \u2014 Comprehensive\n' +
    '\uD83D\uDCC5 *3 Weeks* \u2014 In-depth\n\uD83D\uDCC5 *4 Weeks* \u2014 Full professional\n\nType *2* fees | *3* brochure.',
  unknown:
    '\uD83E\uDD14 I did not understand your query fully.\n\n' +
    'Type *1* Courses | *2* Fees | *3* Brochure\nType *4* Projects | *5* PhD | *6* Forensic | *7* Team\n\n' +
    'Or just ask again! \uD83D\uDE0A\n\uD83D\uDCE7 biofastlabs@gmail.com'
};

function intent(msg) {
  const t = msg.toLowerCase().trim();
  for (const [k,v] of Object.entries(INTENTS)) if (v.some(w => t===w||t.includes(w))) return k;
  return 'unknown';
}

function downloadFile(url) {
  return new Promise((res,rej) => {
    const p = url.startsWith('https') ? https : http;
    p.get(url, {headers:{'User-Agent':'Mozilla/5.0'}}, r => {
      if ([301,302,303].includes(r.statusCode)) { downloadFile(r.headers.location).then(res).catch(rej); return; }
      const c=[]; r.on('data',d=>c.push(d)); r.on('end',()=>res(Buffer.concat(c))); r.on('error',rej);
    }).on('error',rej);
  });
}

let sock=null, qrData=null, connected=false;

async function start() {
  const {state,saveCreds} = await useMultiFileAuthState('./.session');
  const {version} = await fetchLatestBaileysVersion();
  sock = makeWASocket({version,auth:state,logger:pino({level:'silent'}),printQRInTerminal:false,browser:['Helix BioFast Labs','Chrome','1.0'],syncFullHistory:false});
  sock.ev.on('creds.update',saveCreds);
  sock.ev.on('connection.update', async ({connection,lastDisconnect,qr}) => {
    if (qr) { qrData=await qrcode.toDataURL(qr); connected=false; console.log('\n\uD83D\uDCF1 QR ready! Open: http://localhost:'+PORT+'/qr\n'); }
    if (connection==='open') { qrData=null; connected=true; console.log('\n\uD83D\uDFE2 WhatsApp CONNECTED! Bot running.\n'); }
    if (connection==='close') {
      connected=false;
      const code=(lastDisconnect?.error instanceof Boom)?lastDisconnect.error.output.statusCode:0;
      if (code===DisconnectReason.loggedOut) { console.log('\u274C Logged out. Delete .session folder and restart.'); }
      else { console.log('Reconnecting in 5s...'); setTimeout(start,5000); }
    }
  });
  sock.ev.on('messages.upsert', async ({messages,type}) => {
    if (type!=='notify') return;
    for (const msg of messages) {
      if (msg.key.fromMe||msg.key.remoteJid==='status@broadcast'||msg.key.remoteJid.endsWith('@g.us')) continue;
      const text=msg.message?.conversation||msg.message?.extendedTextMessage?.text||'';
      if (!text.trim()) continue;
      const chatId=msg.key.remoteJid, name=msg.pushName||chatId.split('@')[0], it=intent(text);
      console.log('\n\uD83D\uDCE8 ['+it+'] '+name+': "'+text.substring(0,50)+'"');
      try {
        if (it==='brochure') {
          await sock.sendMessage(chatId,{text:'\uD83D\uDCC4 Sending brochure...'});
          if (BROCHURE_URL) {
            const buf=await downloadFile(BROCHURE_URL);
            await sock.sendMessage(chatId,{document:buf,fileName:'Helix_BioFast_Labs_Brochure.pdf',mimetype:'application/pdf',caption:'Helix BioFast Labs \u2014 Complete Brochure\nType 1 courses | 7 talk to us.'});
          } else {
            await sock.sendMessage(chatId,{text:'\uD83D\uDCC4 Our brochure is not yet configured.\n\uD83D\uDCDE [YOUR PHONE NUMBER]\n\uD83D\uDCE7 biofastlabs@gmail.com'});
          }
        } else if (it==='human') {
          await sock.sendMessage(chatId,{text:R.human});
          if (ADMIN_PHONE&&!ADMIN_PHONE.includes('XXXXXXXXXX')) {
            await sock.sendMessage(ADMIN_PHONE,{text:'\uD83D\uDEA8 *Student Enquiry*\n\n\uD83D\uDC64 '+name+'\n\uD83D\uDCF1 '+chatId+'\n\uD83D\uDCAC '+text+'\n\uD83D\uDD50 '+new Date().toLocaleString('en-IN')});
          }
        } else {
          await sock.sendMessage(chatId,{text:R[it]||R.unknown});
        }
        fs.appendFile('log.tsv',[new Date().toISOString(),chatId,name,text.replace(/\n/g,' '),it].join('\t')+'\n',()=>{});
        console.log('\u2705 Replied');
      } catch(e) { console.error('\u274C Error:',e.message); }
    }
  });
}

const app=express();
app.get('/qr',(req,res)=>{
  if (qrData) res.send(`<!DOCTYPE html><html><head><title>Helix QR</title><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="28"><style>body{font-family:Arial;background:#f0f4f8;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}.card{background:#fff;border-radius:16px;padding:28px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.12);max-width:320px;width:90%}h2{color:#128C7E;margin:0 0 8px}p{color:#555;margin:6px 0;font-size:14px}img{width:240px;height:240px;border-radius:8px;margin:14px auto;display:block}.s{background:#f8f8f8;border-radius:8px;padding:12px;text-align:left;font-size:13px;margin:12px 0}.n{font-size:11px;color:#bbb;margin-top:12px}</style></head><body><div class="card"><h2>&#x1F517; Link WhatsApp</h2><div class="s">1. Open WhatsApp Business App<br>2. Settings &rarr; Linked Devices<br>3. Link a Device &rarr; Scan below</div><img src="${qrData}"><p class="n">Auto-refreshes every 28 sec</p></div></body></html>`);
  else if (connected) res.send('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:Arial;text-align:center;padding:60px 20px;background:#f0f4f8"><div style="background:#fff;border-radius:16px;padding:30px;display:inline-block;box-shadow:0 4px 20px rgba(0,0,0,.1)"><h2 style="color:#128C7E">&#x2705; WhatsApp Connected!</h2><p style="color:#555">Bot is running. You can close this page.</p></div></body></html>');
  else res.send('<html><head><meta http-equiv="refresh" content="3"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:Arial;text-align:center;padding:60px"><h2>Starting... please wait</h2></body></html>');
});
app.get('/health',(req,res)=>res.json({connected,time:new Date().toISOString()}));
app.listen(PORT,'0.0.0.0',()=>console.log('\uD83C\uDF10 QR page: http://localhost:'+PORT+'/qr'));

console.log('\n\uD83D\uDE80 Helix BioFast Labs WhatsApp Bot v3\nStarting...\n');
start();
BOTEOF

echo "✅ Bot file created"

# Step 6: Setup Termux:Boot auto-start (if installed)
echo ""
echo "[5/5] Setting up auto-start..."
mkdir -p ~/.termux/boot
cat > ~/.termux/boot/helix-bot.sh << 'BOOTEOF'
#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock
cd ~/helix-bot
nohup node helix-bot.js > ~/helix-bot/bot.log 2>&1 &
BOOTEOF
chmod +x ~/.termux/boot/helix-bot.sh

# Start the bot now
echo ""
echo "========================================"
echo "  Setup Complete! Starting bot now..."
echo "========================================"
echo ""

# Get phone's IP address
PHONE_IP=$(ip route get 8.8.8.8 2>/dev/null | grep -oP 'src \K[^ ]+' || hostname -I | awk '{print $1}')

echo "  Bot is starting..."
echo ""
echo "  NEXT STEP - Scan QR Code:"
echo "  Open this link in your browser:"
echo ""
echo "  >>> http://${PHONE_IP}:3000/qr <<<"
echo ""
echo "  Then scan with WhatsApp:"
echo "  Settings > Linked Devices > Link a Device"
echo ""
echo "  (Press Ctrl+C to stop. Use 'nohup node helix-bot.js &' to run in background)"
echo "========================================"
echo ""

# Wake lock to prevent Android from killing
termux-wake-lock 2>/dev/null || true

# Start the bot
node helix-bot.js
