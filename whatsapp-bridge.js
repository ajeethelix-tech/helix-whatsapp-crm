// ============================================================
// HELIX BIOFAST LABS — WhatsApp Bridge (Baileys Edition)
// File: whatsapp-bridge.js
//
// Uses Baileys — no Chrome/browser needed, works on any server
// QR code is served as a web page — scan from your phone browser
//
// HOW TO RUN: node whatsapp-bridge.js
// ============================================================

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode  = require('qrcode');
const express = require('express');
const axios   = require('axios');
const pino    = require('pino');

// ============================================================
// CONFIGURATION
// ============================================================
const N8N_WEBHOOK_URL = 'http://localhost:5678/webhook/helix-whatsapp-bot';
const BRIDGE_PORT     = 3000;

// ============================================================
// STATE
// ============================================================
let sock          = null;
let currentQR     = null;   // latest QR as data URL (for web page)
let isConnected   = false;

// ============================================================
// WHATSAPP CONNECTION
// ============================================================
async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('./.whatsapp-session');
  const { version }          = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth:              state,
    logger:            pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser:           ['Helix BioFast Labs', 'Chrome', '1.0.0'],
    syncFullHistory:   false
  });

  sock.ev.on('creds.update', saveCreds);

  // -- Connection status --
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n📱 QR Code ready!');
      console.log('   Open in your browser: http://YOUR_SERVER_IP:3000/qr');
      console.log('   Then scan with WhatsApp > Settings > Linked Devices > Link a Device\n');
      currentQR   = await qrcode.toDataURL(qr);
      isConnected = false;
    }

    if (connection === 'open') {
      currentQR   = null;
      isConnected = true;
      console.log('\n\u{1F7E2} WhatsApp CONNECTED! Bot is now running 24/7.\n');
    }

    if (connection === 'close') {
      isConnected = false;
      const code = (lastDisconnect?.error instanceof Boom)
        ? lastDisconnect.error.output.statusCode
        : 0;

      if (code === DisconnectReason.loggedOut) {
        console.log('\u274C Logged out from WhatsApp.');
        console.log('   Delete .whatsapp-session folder, then restart the bridge.');
      } else {
        console.log('Connection closed. Reconnecting in 5s... (code:', code, ')');
        setTimeout(connectToWhatsApp, 5000);
      }
    }
  });

  // -- Incoming messages --
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (msg.key.fromMe)                                return; // own messages
      if (msg.key.remoteJid === 'status@broadcast')      return; // status updates
      if (msg.key.remoteJid.endsWith('@g.us'))           return; // group messages

      // Extract text
      const text = msg.message?.conversation
                || msg.message?.extendedTextMessage?.text
                || '';
      if (!text.trim()) continue;

      const chatId     = msg.key.remoteJid;
      const senderName = msg.pushName || chatId.split('@')[0];

      console.log('\n\u{1F4E8} Message from', chatId, ':', text.substring(0, 60));

      // Forward to n8n (same format as before — no changes to intent_detection.js)
      const payload = {
        typeWebhook: 'incomingMessageReceived',
        timestamp:   Math.floor(Date.now() / 1000),
        senderData: {
          chatId,
          senderName,
          sender: chatId
        },
        messageData: {
          typeMessage:     'textMessage',
          textMessageData: { textMessage: text }
        }
      };

      try {
        await axios.post(N8N_WEBHOOK_URL, payload, { timeout: 10000 });
        console.log('\u2705 Forwarded to n8n');
      } catch (err) {
        console.error('\u274C n8n unreachable:', err.message);
        console.error('   Check that n8n is running and the workflow is ACTIVE.');
      }
    }
  });
}

// ============================================================
// EXPRESS API — n8n calls these to send replies
// ============================================================
const app = express();
app.use(express.json());

// --- QR Code web page ---
app.get('/qr', (req, res) => {
  if (currentQR) {
    res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Helix BioFast Labs - Scan QR</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="30">
  <style>
    body { font-family: Arial, sans-serif; text-align: center;
           padding: 30px; background: #f5f5f5; }
    .box { background: white; border-radius: 12px; padding: 30px;
           display: inline-block; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    img  { width: 280px; height: 280px; display: block; margin: 15px auto; }
    h2   { color: #128C7E; }
    p    { color: #555; }
    .note { font-size: 12px; color: #999; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="box">
    <h2>&#128279; Helix BioFast Labs — Link WhatsApp</h2>
    <p>Scan this QR code with your WhatsApp Business App:</p>
    <p><strong>Settings &rarr; Linked Devices &rarr; Link a Device</strong></p>
    <img src="${currentQR}" alt="WhatsApp QR Code">
    <p class="note">Page auto-refreshes every 30 seconds.<br>QR code expires in ~60 seconds — refresh to get new one.</p>
  </div>
</body>
</html>`);
  } else if (isConnected) {
    res.send(`<!DOCTYPE html>
<html>
<head><title>WhatsApp Status</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{font-family:Arial;text-align:center;padding:50px;background:#f5f5f5}
.box{background:white;border-radius:12px;padding:40px;display:inline-block}</style>
</head>
<body><div class="box">
<h2 style="color:#128C7E">&#9989; WhatsApp is Connected!</h2>
<p>The bot is running. No QR code needed.</p>
<p style="color:#999;font-size:12px">If you were just disconnected, wait 10 seconds and refresh.</p>
</div></body></html>`);
  } else {
    res.send(`<!DOCTYPE html>
<html>
<head><title>Connecting...</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="5">
</head>
<body style="font-family:Arial;text-align:center;padding:50px">
<h2>Connecting to WhatsApp...</h2>
<p>Page will refresh automatically. Please wait.</p>
</body></html>`);
  }
});

// --- Health check ---
app.get('/health', (req, res) => {
  res.json({ status: 'ok', connected: isConnected, time: new Date().toISOString() });
});

// --- Send text message ---
app.post('/send', async (req, res) => {
  const { chatId, message } = req.body;
  if (!chatId || !message)
    return res.status(400).json({ success: false, error: 'chatId and message required' });

  try {
    await sock.sendMessage(chatId, { text: message });
    console.log('\u{1F4E4} Reply sent to', chatId);
    res.json({ success: true });
  } catch (err) {
    console.error('\u274C Send failed:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Send file (brochure PDF) ---
app.post('/send-file', async (req, res) => {
  const { chatId, urlFile, fileName, caption } = req.body;
  if (!chatId || !urlFile)
    return res.status(400).json({ success: false, error: 'chatId and urlFile required' });

  try {
    console.log('\u{1F4CE} Downloading and sending file to', chatId, '...');
    const https    = require('https');
    const http     = require('http');
    const protocol = urlFile.startsWith('https') ? https : http;

    const fileBuffer = await new Promise((resolve, reject) => {
      protocol.get(urlFile, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (resp) => {
        if (resp.statusCode === 302 || resp.statusCode === 301) {
          // handle redirect
          protocol.get(resp.headers.location, (r) => {
            const chunks = [];
            r.on('data', c => chunks.push(c));
            r.on('end',  () => resolve(Buffer.concat(chunks)));
            r.on('error', reject);
          });
        } else {
          const chunks = [];
          resp.on('data',  c => chunks.push(c));
          resp.on('end',   () => resolve(Buffer.concat(chunks)));
          resp.on('error', reject);
        }
      }).on('error', reject);
    });

    await sock.sendMessage(chatId, {
      document:  fileBuffer,
      fileName:  fileName || 'Helix_BioFast_Labs_Brochure.pdf',
      mimetype:  'application/pdf',
      caption:   caption || ''
    });

    console.log('\u2705 File sent to', chatId);
    res.json({ success: true });
  } catch (err) {
    console.error('\u274C File send failed:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// START
// ============================================================
app.listen(BRIDGE_PORT, '0.0.0.0', () => {
  console.log('\n\u{1F7E2} Helix BioFast Labs WhatsApp Bot Starting...');
  console.log('\u{1F310} Bridge API: http://0.0.0.0:' + BRIDGE_PORT);
  console.log('\u{1F4F1} QR Code page: http://YOUR_SERVER_IP:' + BRIDGE_PORT + '/qr');
});

connectToWhatsApp();
