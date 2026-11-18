// ============================================================
// HELIX BIOFAST LABS — Full-Featured WhatsApp CRM Backend
// File: helix-bot.js
// Powered by Baileys, Express, Socket.IO & SQLite3
// ============================================================


const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode');
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const pino = require('pino');
const https = require('https');
const os = require('os');
const { Server } = require('socket.io');

// Global resilience: Prevent process termination on transient socket connection drops or Baileys decryption errors
process.on('unhandledRejection', (reason) => {
  const errMsg = reason?.message || String(reason);
  if (errMsg.includes('Connection Closed') || errMsg.includes('Bad MAC') || errMsg.includes('Session error') || errMsg.includes('Precondition Required')) {
    console.warn('⚠️ [Transient Baileys Network Error Caught]:', errMsg);
    return;
  }
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  const errMsg = err?.message || String(err);
  if (errMsg.includes('Connection Closed') || errMsg.includes('Bad MAC') || errMsg.includes('Session error') || errMsg.includes('Precondition Required')) {
    console.warn('⚠️ [Transient Baileys Uncaught Exception Handled]:', errMsg);
    return;
  }
  console.error('Uncaught Exception:', err);
});

// Database module
const db = require('./db');

// Configuration defaults
const CONFIG = {
  ADMIN_PHONE: process.env.ADMIN_PHONE || '918383897225@s.whatsapp.net',
  BROCHURE_URL: process.env.BROCHURE_URL || 'https://www.helixbiofastlabs.com',
  PORT: process.env.PORT || 3000
};

// Memory Session Store for Multi-step Conversations
const userSessions = {};

function getSession(chatId) {
  if (!userSessions[chatId]) {
    userSessions[chatId] = { state: 'IDLE', failedAttempts: 0, data: {} };
  }
  return userSessions[chatId];
}

// Default Bot Messages
const MESSAGES = {
  mainMenu:
    'Hello! 👋 Thank you for contacting Helix BioFast Labs Pvt. Ltd., Noida.\n\n' +
    'I can instantly help you with our training programs, fees, and services.\n\n' +
    'Please select an option:\n\n' +
    '1️⃣ Training Courses\n' +
    '2️⃣ Training Brochure (PDF)\n' +
    '3️⃣ Student Projects & Dissertation\n' +
    '4️⃣ PhD Assistance\n' +
    '5️⃣ Forensic Services\n' +
    '6️⃣ Talk to Our Team 👨‍🔬\n\n' +
    'Reply with the number (1-6) or type your question directly. 😊',

  trainingMenu:
    'Thanks for showing interest in our training program! 🧬\n\n' +
    'Please select the duration / type:\n\n' +
    'A. Short Term Training (7 Days)\n' +
    'B. Advance Training (15 Days)\n' +
    'C. Industrial Training (30 Days)\n' +
    'D. Job-Oriented Training\n\n' +
    'Reply with A, B, C, or D.\n\n' +
    '🌐 Website: https://www.helixbiofastlabs.com',

  shortTerm:
    '🔬 Short-Term Training (7 Days) — Your First Step Towards a Biotech Career\n\n' +
    'Each short-term module is of 7 days. You can choose one or multiple modules according to your requirement.\n\n' +
    '📋 Available 7-Day Modules:\n' +
    '• Microbiology\n' +
    '• Molecular Biology\n' +
    '• Medical Biotechnology\n' +
    '• Food Biotechnology\n' +
    '• Immunology & more\n\n' +
    '🌐 For module details and fee structure, please visit:\n' +
    'https://www.helixbiofastlabs.com/short-term-biotechnology-training\n\n' +
    'Reply with 2 for Brochure PDF | Reply with 6 to Talk to Our Team.',

  advanceTraining:
    '🧪 Advance Training (15 Days) — Advanced Skills & Real Lab Experience\n\n' +
    'Each advance training module is of 15 days. You can select multiple modules for your training.\n\n' +
    '📋 Available 15-Day Modules:\n' +
    '• Microbiology\n' +
    '• Molecular Biology\n' +
    '• Medical Biotechnology\n' +
    '• Food Biotechnology\n' +
    '• Immunology\n' +
    '• Cancer Biology & more\n\n' +
    '🌐 For module details and fee structure, please visit:\n' +
    'https://www.helixbiofastlabs.com/advance-biotech-training-programes\n\n' +
    'Reply with 2 for Brochure PDF | Reply with 6 to Talk to Our Team.',

  industrialTraining:
    '🏬 Industrial Training (30 Days) — Hands-On Experience & Career-Ready Skills\n\n' +
    'Our 30-Day Industrial Training provides comprehensive hands-on exposure to industrial workflows, GLP/GMP, live experiments, and certification.\n\n' +
    '📋 Available 30-Day Modules:\n' +
    '• Industrial Microbiology\n' +
    '• Molecular Biology\n' +
    '• Medical Biotechnology\n' +
    '• Food Biotechnology\n' +
    '• Forensic Science\n' +
    '• Animal Cell Culture\n\n' +
    '🌐 For module details and fee structure, please visit:\n' +
    'https://www.helixbiofastlabs.com/industrial-biotech-training-programs\n\n' +
    'Reply with 2 for Brochure PDF | Reply with 6 to Talk to Our Team.',

  jobOrientedInfo:
    '💼 Job-Oriented Biotechnology Training Programme\n' +
    'Learn Practical Skills. Gain Industry Exposure. Build Your Career.\n\n' +
    '🧫 Get hands-on laboratory training in:\n' +
    '• Molecular Biology\n' +
    '• Microbiology\n' +
    '• Medical Biotechnology / Food Biotechnology\n\n' +
    '✅ Practical & Hands-on Training\n' +
    '✅ Industry-Relevant Skills\n' +
    '✅ Certificate of Training\n' +
    '✅ Resume & Interview Guidance\n' +
    '🎓 Designed for B.Sc. / M.Sc. Life Science Students\n\n' +
    '🌐 For complete program details and registration:\n' +
    'https://www.helixbiofastlabs.com/job-oriented-training\n\n' +
    'To help us guide you better, what is your qualification?\n' +
    '1. B.Sc\n' +
    '2. M.Sc\n' +
    '3. Other\n\n' +
    'Reply with 1, 2, or 3 (or B.Sc / M.Sc).',

  projectStart:
    '🔬 STUDENT PROJECTS & DISSERTATION TRAINING\n' +
    'Turn Your Research Idea into Real Laboratory Experience!\n' +
    'Hands-on Projects | Expert Mentorship | Complete Research Guidance\n\n' +
    'What are you looking for?\n' +
    '1️⃣ Project Work\n' +
    '2️⃣ Dissertation Training\n' +
    '3️⃣ Research Assistance\n\n' +
    'Reply with 1, 2, or 3.\n\n' +
    '🌐 For detailed research topics and fee structure, please visit:\n' +
    'https://www.helixbiofastlabs.com/project-dissertation-training-in-biotechnology',

  phdStart:
    '🎓 PhD RESEARCH ASSISTANCE\n' +
    'Need support with your PhD research? We can help you move from idea to research output.\n\n' +
    'What type of assistance do you need?\n' +
    '1️⃣ Research Topic & Experimental Planning\n' +
    '2️⃣ Laboratory & Experimental Support\n' +
    '3️⃣ Data Analysis & Interpretation\n' +
    '4️⃣ Thesis & Research Paper Support\n\n' +
    'Reply with 1, 2, 3, or 4.\n\n' +
    '🌐 For research assistance details, please visit:\n' +
    'https://www.helixbiofastlabs.com',

  forensicStart:
    '🔍 FORENSIC SCIENCE SERVICES\n' +
    'Reliable Laboratory Support for Forensic Investigations & Research.\n\n' +
    'What do you need?\n' +
    '1️⃣ Blood Grouping & ABO/Rh Analysis\n' +
    '2️⃣ Other Sample Examination & Lab Testing\n\n' +
    'Reply with 1 or 2.\n\n' +
    '🌐 For forensic services details, please visit:\n' +
    'https://www.helixbiofastlabs.com',

  humanPrompt:
    '👨‍🔬 Talk to Our Team\n\n' +
    'Please write a brief message telling us what you need help with. Our staff will review and contact you shortly.\n\n' +
    '📞 Direct Call: 8383897225\n' +
    '🌐 Website: https://www.helixbiofastlabs.com',

  human:
    'Thank you! Our staff at Helix BioFast Labs has received your message and will reach out to you shortly.\n\n' +
    '📞 Phone: 8383897225 | 📧 biofastlabs@gmail.com\n' +
    '🌐 Website: https://www.helixbiofastlabs.com',

  unknown:
    'I did not quite understand that. Please reply with a number (1-6) or type menu to view our options:\n\n' +
    '1. Training Courses\n' +
    '2. Training Brochure (PDF)\n' +
    '3. Student Projects & Dissertation\n' +
    '4. PhD Assistance\n' +
    '5. Forensic Services\n' +
    '6. Talk to Our Team\n\n' +
    '🌐 Website: https://www.helixbiofastlabs.com',

  location:
    '📍 Helix BioFast Labs Pvt. Ltd. Location:\n\n' +
    'A-52, First Floor, Sector-2, Noida\n' +
    'G.B. Nagar, Uttar Pradesh - 201301\n' +
    '(Near Sector-15 Metro Station)\n\n' +
    '🗺️ Google Maps Location:\n' +
    'https://maps.app.goo.gl/M9BGxKCjPn4PDVrU8\n\n' +
    '📞 Contact: +91-9717117289, +91-8383897225\n' +
    '🌐 Website: https://www.helixbiofastlabs.com'
};

// Clickable Interactive Buttons & List Options for WhatsApp
const BUTTONS = {
  mainMenu: [
    {
      name: 'single_select',
      buttonParamsJson: JSON.stringify({
        title: '📋 Select an Option',
        sections: [
          {
            title: 'Training & Services',
            rows: [
              { title: '1️⃣ Training Courses', id: '1', description: 'Short Term, Advance, Industrial & Job-Oriented' },
              { title: '2️⃣ Training Brochure (PDF)', id: '2', description: 'Download Official Information Brochure' },
              { title: '3️⃣ Student Projects & Dissertation', id: '3', description: 'B.Sc / M.Sc Thesis Guidance & Benchwork' },
              { title: '4️⃣ PhD Assistance', id: '4', description: 'Research Planning, Wet Lab & Data Support' },
              { title: '5️⃣ Forensic Services', id: '5', description: 'Blood Grouping & Sample Examination' },
              { title: '6️⃣ Talk to Our Team', id: '6', description: 'Connect with Academic Counselor' }
            ]
          }
        ]
      })
    }
  ],

  trainingMenu: [
    {
      name: 'single_select',
      buttonParamsJson: JSON.stringify({
        title: '🧬 Choose Training Type',
        sections: [
          {
            title: 'Training Programs',
            rows: [
              { title: 'A. Short Term Training (7 Days)', id: 'A', description: 'Rapid practical skill booster modules' },
              { title: 'B. Advance Training (15 Days)', id: 'B', description: '2 intensive research modules' },
              { title: 'C. Industrial Training (30 Days)', id: 'C', description: '1-Month industrial protocol & ISO' },
              { title: 'D. Job-Oriented Training', id: 'D', description: 'Hands-on lab training + placement guidance' }
            ]
          }
        ]
      })
    }
  ],

  trainingSubmenu: [
    {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: '📄 Brochure (PDF)',
        id: '2'
      })
    },
    {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: '👨‍🔬 Talk to Our Team',
        id: '6'
      })
    }
  ],

  jobQualification: [
    {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: '1. B.Sc',
        id: '1'
      })
    },
    {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: '2. M.Sc',
        id: '2'
      })
    },
    {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: '3. Other',
        id: '3'
      })
    }
  ],

  projectStart: [
    {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: '1. Project Work',
        id: '1'
      })
    },
    {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: '2. Dissertation',
        id: '2'
      })
    },
    {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: '3. Research Help',
        id: '3'
      })
    }
  ],

  projectTopic: [
    {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: '1. Yes (Have Topic)',
        id: '1'
      })
    },
    {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: '2. No (Discuss Topics)',
        id: '2'
      })
    }
  ],

  phdStart: [
    {
      name: 'single_select',
      buttonParamsJson: JSON.stringify({
        title: '🎓 PhD Assistance Type',
        sections: [
          {
            title: 'Assistance Options',
            rows: [
              { title: '1. Topic & Experimental Planning', id: '1', description: 'Design research methodology' },
              { title: '2. Lab & Experimental Support', id: '2', description: 'Wet lab benchwork & assay execution' },
              { title: '3. Data Analysis & Interpretation', id: '3', description: 'Statistical & bioinformatics analysis' },
              { title: '4. Thesis & Paper Support', id: '4', description: 'Manuscript drafting & thesis compilation' }
            ]
          }
        ]
      })
    }
  ],

  forensicStart: [
    {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: '1. Blood / ABO / Rh',
        id: '1'
      })
    },
    {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: '2. Sample & Lab Testing',
        id: '2'
      })
    }
  ],

  location: [
    {
      name: 'cta_url',
      buttonParamsJson: JSON.stringify({
        display_text: '📍 Open Google Maps',
        url: 'https://maps.app.goo.gl/M9BGxKCjPn4PDVrU8'
      })
    },
    {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: '📋 Main Menu',
        id: 'menu'
      })
    }
  ]
};
BUTTONS.unknown = BUTTONS.mainMenu;

// Intent Detection
function detectDirectIntent(text) {
  const msg = text.toLowerCase().trim();

  // Greetings & Main Menu
  if (/^(hi|hello|hey|hii|helo|hlo|start|menu|namaste|good\s*(morning|afternoon|evening))\b/i.test(msg) || msg.includes('main menu')) {
    return 'mainMenu';
  }

  // Location / Address Intent
  if (
    msg === 'location' ||
    msg === 'address' ||
    msg.includes('location') ||
    msg.includes('address') ||
    msg.includes('kaha hai') ||
    msg.includes('kahan hai') ||
    msg.includes('where is') ||
    msg.includes('google map') ||
    msg.includes('maps') ||
    msg.includes('direction') ||
    msg.includes('reach') ||
    msg.includes('noida address') ||
    msg.includes('open google maps')
  ) {
    return 'location';
  }

  // 1-6 Menu Numbers / Options
  if (msg === '1' || msg === '1.' || msg === 'courses' || msg === 'training courses' || msg.includes('training courses')) return 'trainingMenu';
  if (
    msg === '2' ||
    msg === '2.' ||
    msg === 'brochure' ||
    msg === 'pdf' ||
    msg === 'prospectus' ||
    msg.includes('brochure') ||
    msg.includes('broucher') ||
    msg.includes('brocher') ||
    msg.includes('brouchure') ||
    msg.includes('boucher') ||
    msg.includes('broshure') ||
    msg.includes('prospectus')
  ) return 'brochure';
  if (msg === '3' || msg === '3.' || msg === 'project' || msg === 'projects' || msg === 'dissertation' || msg.includes('student projects')) return 'projects';
  if (msg === '4' || msg === '4.' || msg === 'phd' || msg === 'ph.d' || msg === 'doctorate' || msg.includes('phd assistance')) return 'phd';
  if (msg === '5' || msg === '5.' || msg === 'forensic' || msg === 'forensics' || msg === 'dna test' || msg.includes('forensic services')) return 'forensic';
  if (msg === '6' || msg === '6.' || msg === 'human' || msg === 'talk' || msg === 'contact' || msg === 'call' || msg === 'team' || msg.includes('talk to our team') || msg.includes('talk to team')) return 'human';

  // Sub-options from Training Menu
  // Do NOT match if the message explicitly asks about "1 month", "one month", or "30 days" training/fee
  const mentions1Month = msg.includes('1 month') || msg.includes('one month') || msg.includes('1month') || msg.includes('30 day') || msg.includes('30day');

  if (!mentions1Month) {
    if (msg === 'a' || msg === 'a.' || msg === 'short term' || msg === 'short term training' || msg === 'short-term' || msg === '7 days' || msg === '7 day' || msg.includes('short term')) return 'shortTerm';
    if (msg === 'b' || msg === 'b.' || msg === 'advance' || msg === 'advance training' || msg === 'advanced training' || msg === '15 days' || msg === '15 day' || msg.includes('advance training')) return 'advanceTraining';
    if (msg === 'c' || msg === 'c.' || msg === 'industrial' || msg === 'industrial training' || msg.includes('industrial training')) return 'industrialTraining';
  }

  if (msg === 'd' || msg === 'd.' || msg === 'job oriented' || msg === 'job-oriented' || msg === 'job oriented training' || msg.includes('job-oriented') || msg.includes('job oriented')) return 'jobOriented';

  return null;
}

// Category extraction for lead scoring
function determineCategoryFromIntent(intent, text) {
  const msg = text.toLowerCase();
  if (intent === 'shortTerm' || msg.includes('short term')) return 'Short Term (7D)';
  if (intent === 'advanceTraining' || msg.includes('advance')) return 'Advance (15D)';
  if (intent === 'industrialTraining' || msg.includes('industrial')) return 'Industrial (30D)';
  if (intent === 'jobOriented' || msg.includes('job')) return 'Job-Oriented';
  if (intent === 'projects' || msg.includes('project') || msg.includes('dissertation')) return 'Project/Dissertation';
  if (intent === 'phd' || msg.includes('phd')) return 'PhD Assistance';
  if (intent === 'forensic' || msg.includes('forensic')) return 'Forensic Services';
  if (intent === 'human' || msg === '6' || msg === '6.' || msg.includes('talk to our team') || msg.includes('talk to team')) return 'Talk to Team';
  return 'General Inquiry';
}

// Download brochure PDF helper
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const fetchUrl = (currentUrl, redirectCount = 0) => {
      if (redirectCount > 6) return reject(new Error('Too many redirects'));

      let targetUrl = currentUrl;
      if (targetUrl.includes('drive.google.com/file/d/')) {
        const match = targetUrl.match(/\/file\/d\/([^\/]+)/);
        if (match && match[1]) {
          targetUrl = `https://drive.usercontent.google.com/download?id=${match[1]}&export=download&confirm=t`;
        }
      } else if (targetUrl.includes('drive.google.com') && !targetUrl.includes('confirm=t')) {
        targetUrl += (targetUrl.includes('?') ? '&' : '?') + 'confirm=t';
      }

      const proto = targetUrl.startsWith('https') ? https : http;
      proto.get(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (resp) => {
        if ([301, 302, 303, 307, 308].includes(resp.statusCode)) {
          const redirectUrl = resp.headers.location;
          return fetchUrl(redirectUrl, redirectCount + 1);
        }
        const chunks = [];
        resp.on('data', d => chunks.push(d));
        resp.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve(buffer);
        });
        resp.on('error', reject);
      }).on('error', reject);
    };
    fetchUrl(url);
  });
}

// Baileys Message Store Cache for resolving "Waiting for this message" retry receipts
const baileysMessageStore = new Map();

async function storeBaileysMessage(id, remoteJid, messageProto, text) {
  if (!id) return;
  try {
    if (messageProto) {
      baileysMessageStore.set(id, messageProto);
      if (baileysMessageStore.size > 5000) {
        const oldest = baileysMessageStore.keys().next().value;
        baileysMessageStore.delete(oldest);
      }
    }
    await db.saveBaileysMessage(id, remoteJid, messageProto, text);
  } catch (e) {}
}

async function getBaileysStoredMessage(key) {
  if (!key || !key.id) return undefined;
  // 1. In-memory Map
  if (baileysMessageStore.has(key.id)) {
    return baileysMessageStore.get(key.id);
  }
  // 2. Persistent SQLite store
  try {
    const row = await db.getBaileysMessage(key.id);
    if (row) {
      if (row.message_proto) {
        try {
          const parsed = JSON.parse(row.message_proto);
          baileysMessageStore.set(key.id, parsed);
          return parsed;
        } catch (e) {}
      }
      if (row.text) {
        const fallback = { conversation: row.text };
        baileysMessageStore.set(key.id, fallback);
        return fallback;
      }
    }
  } catch (e) {}
  return undefined;
}

async function sendAndStoreMessage(sockInstance, targetJid, content, options = {}, plainTextFallback = null) {
  if (!sockInstance) throw new Error('WhatsApp socket not initialized');
  const sent = await sockInstance.sendMessage(targetJid, content, options);
  if (sent && sent.key && sent.key.id) {
    const textToStore = plainTextFallback || (typeof content?.text === 'string' ? content.text : (content?.caption || null));
    await storeBaileysMessage(sent.key.id, targetJid, sent.message, textToStore);
  }
  return sent;
}

// Notify staff of new lead via WhatsApp
async function notifyStaff(sock, name, chatId, text, title = 'STUDENT LEAD') {
  if (!CONFIG.ADMIN_PHONE || CONFIG.ADMIN_PHONE.includes('XXXXXXXXXX')) return;
  try {
    const alertMsg =
      `🚨 *${title}*\n\n` +
      `👤 Name: ${name}\n` +
      `📱 Phone: ${chatId.split('@')[0]}\n` +
      `💬 Details: ${text}\n` +
      `⏰ Time: ${new Date().toLocaleString('en-IN')}`;
    await sendAndStoreMessage(sock, CONFIG.ADMIN_PHONE, { text: alertMsg });
    console.log('🔔 Staff notified via WhatsApp');
  } catch (err) {
    console.error('Failed to notify staff:', err.message);
  }
}

// Helper to send message from bot & log in DB + emit sockets (guaranteed delivery across all WhatsApp devices)
async function sendBotReply(sock, io, chatId, name, phone, replyText, interactiveButtons = null) {
  try {
    console.log(`🤖 Sending auto-reply to ${chatId}...`);
    try {
      await sock.sendPresenceUpdate('composing', chatId);
    } catch (e) {}

    const cleanPhone = phone ? db.normalizeIndianPhone(phone) : (lidToPhoneMap.get(chatId) ? db.normalizeIndianPhone(lidToPhoneMap.get(chatId)) : null);
    if (cleanPhone && chatId.endsWith('@lid')) {
      lidToPhoneMap.set(chatId, cleanPhone);
    }

    let sent = false;
    try {
      await sendAndStoreMessage(sock, chatId, { text: replyText });
      console.log(`✅ [AUTO-REPLY DELIVERED] Text sent successfully to: ${chatId}`);
      sent = true;
    } catch (sendErr) {
      console.warn(`⚠️ Failed to send to ${chatId} (${sendErr.message}), trying phone JID fallback...`);
      if (cleanPhone) {
        const phoneJid = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@s.whatsapp.net`;
        if (phoneJid !== chatId) {
          try {
            await sendAndStoreMessage(sock, phoneJid, { text: replyText });
            console.log(`✅ [AUTO-REPLY DELIVERED] Fallback sent to: ${phoneJid}`);
            sent = true;
          } catch (fallbackErr) {
            console.error(`❌ Fallback send failed to ${phoneJid}:`, fallbackErr.message);
          }
        }
      }
    }

    const canonicalChatId = (cleanPhone && cleanPhone.length >= 10) ? `${cleanPhone}@s.whatsapp.net` : chatId;
    await db.logMessage(canonicalChatId, 'Helix Bot', 'bot', replyText);
    await db.upsertChat(canonicalChatId, name, cleanPhone, replyText, false);

    io.emit('new-message', {
      chat_id: canonicalChatId,
      sender_name: 'Helix Bot',
      sender_type: 'bot',
      text: replyText,
      timestamp: new Date().toISOString()
    });
    if (canonicalChatId !== chatId) {
      io.emit('new-message', {
        chat_id: chatId,
        sender_name: 'Helix Bot',
        sender_type: 'bot',
        text: replyText,
        timestamp: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error('❌ [sendBotReply Error]:', err.message);
  }
}

let lastGeminiCallTime = 0;
async function throttleGeminiCall() {
  const now = Date.now();
  const elapsed = now - lastGeminiCallTime;
  if (elapsed < 2000) {
    await new Promise(r => setTimeout(r, 2000 - elapsed));
  }
  lastGeminiCallTime = Date.now();
}

// Generate Gemini AI response using Google Generative Language API
async function generateGeminiReply(chatId, userMessage, studentName) {
  try {
    const config = await db.getBotConfig();
    if (config.AI_ENABLED !== '1') return null;

    const apiKey = config.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ Gemini AI is enabled but no GEMINI_API_KEY is configured.');
      return null;
    }

    const modelName = (config.AI_MODEL && config.AI_MODEL !== 'gemini-flash-latest' && !config.AI_MODEL.includes('2.0') && !config.AI_MODEL.includes('1.5') && !config.AI_MODEL.includes('2.5'))
      ? config.AI_MODEL
      : 'gemini-3.6-flash';

    let systemPrompt = config.AI_SYSTEM_PROMPT || 'You are the official Academic Counselor for Helix BioFast Labs Pvt. Ltd.';
    if (studentName && studentName !== '~' && studentName !== '.' && studentName !== 'Student') {
      systemPrompt += `\nCandidate Name: ${studentName}`;
    }

    // Fetch conversation history from SQLite
    const history = await db.getRecentChatMessages(chatId, 10);
    const contents = [];

    for (const m of history) {
      if (!m.text || !m.text.trim()) continue;
      // Skip generic fallback error messages so they don't confuse the AI
      if (m.text.includes('I did not quite understand that. Please reply with a number')) continue;

      const role = m.sender_type === 'customer' ? 'user' : 'model';
      if (contents.length > 0 && contents[contents.length - 1].role === role) {
        contents[contents.length - 1].parts[0].text += '\n' + m.text;
      } else {
        contents.push({
          role,
          parts: [{ text: m.text }]
        });
      }
    }

    // Append current user message
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    // In Gemini API, multi-turn contents must start with role 'user'.
    // If the conversation started with a message sent by the bot (e.g. campaign broadcast, workshop confirmation, drip, or brochure),
    // do NOT discard it! Prepend an introductory user greeting so Gemini retains the critical context of what was sent.
    if (contents.length > 0 && contents[0].role !== 'user') {
      contents.unshift({
        role: 'user',
        parts: [{ text: 'Hello' }]
      });
    }

    if (contents.length === 0) {
      contents.push({
        role: 'user',
        parts: [{ text: userMessage }]
      });
    }

    const payload = {
      system_instruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: contents,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048
      }
    };

    const candidateModels = [
      modelName,
      'gemini-3.5-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-3.6-flash'
    ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

    for (const currentModel of candidateModels) {
      try {
        await throttleGeminiCall();
        console.log(`🤖 [GEMINI AI] Sending context (${contents.length} turns) to ${currentModel}...`);
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(20000)
        });

        if (res.ok) {
          const data = await res.json();
          let reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
          if (reply) {
            reply = reply.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/\*/g, '');
            console.log(`✅ Gemini reply received from ${currentModel}`);
            return reply;
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          console.warn(`❌ Gemini API (${res.status}) on ${currentModel}:`, errData.error?.message || errData);
        }
      } catch (callErr) {
        console.warn(`Gemini API call on ${currentModel} error:`, callErr.message);
      }
    }
    return null;
  } catch (err) {
    console.error('❌ Error in generateGeminiReply:', err.message);
    return null;
  }
}

// Helper to build tailored drip messages using the editable database template
function buildProgramSpecificDripMessage(sub, nextStep, template) {
  const name = sub.name || 'Candidate';
  const category = (sub.category || '').trim();

  // If a template is configured in the database, ALWAYS use it as the source of truth!
  if (template && template.message) {
    let msg = template.message;
    msg = msg.replace(/{name}/gi, name);
    msg = msg.replace(/{student_name}/gi, name);
    msg = msg.replace(/{program}/gi, category || 'Biotechnology Training');
    msg = msg.replace(/{category}/gi, category || 'Biotechnology Training');
    return msg.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/\*/g, '');
  }

  return `Hello ${name}, thank you for contacting Helix BioFast Labs regarding our training programs. We offer comprehensive hands-on modules in biotechnology and life sciences. Feel free to reply to this message for details.\n\nHelix BioFast Labs\nwww.helixbiofastlabs.com`;
}

// Global Concurrency Guard to prevent multiple simultaneous drip execution cycles
let isProcessingDrip = false;

// Drip Campaign Processor: sends scheduled 5-6 day follow-up messages
async function processDripCampaigns(sock, io) {
  if (!sock || !connected) return;

  const config = await db.getBotConfig();
  if (config && config.DRIP_ENABLED === '0') {
    return;
  }

  if (isProcessingDrip) {
    console.log('⏳ [DRIP ENGINE] Already running in another cycle, skipping.');
    return;
  }

  const botNumber = sock.user?.id ? sock.user.id.split(':')[0].replace(/[^0-9]/g, '') : '';
  if (!botNumber) {
    console.log('⚠️ [DRIP ENGINE] Connected WhatsApp bot number could not be determined. Skipping drip cycle.');
    return;
  }

  isProcessingDrip = true;
  try {
    const pendingSubscribers = await db.getPendingDripSubscribers(botNumber);
    if (!pendingSubscribers || pendingSubscribers.length === 0) return;

    console.log(`📬 [DRIP ENGINE] Found ${pendingSubscribers.length} pending drip message(s) for bot ${botNumber} to process.`);

    for (const sub of pendingSubscribers) {
      // Guard against old WhatsApp account subscribers
      if (sub.bot_phone && sub.bot_phone !== botNumber) {
        console.log(`🔒 [DRIP ISOLATION] Auto-pausing subscriber #${sub.id} (${sub.name}) because subscriber belongs to bot ${sub.bot_phone}, current bot is ${botNumber}.`);
        await db.run("UPDATE drip_subscribers SET status = 'paused' WHERE id = ?", [sub.id]);
        continue;
      }

      const nextStep = sub.current_step + 1;
      if (nextStep > 6) {
        await db.advanceDripSubscriber(sub.id, sub.current_step, 0, true);
        continue;
      }

      // Check if lead has already enrolled
      const cleanPhone = db.normalizeIndianPhone(sub.phone || sub.chat_id);
      const targetChatId = cleanPhone.includes('@') ? cleanPhone : cleanPhone + '@s.whatsapp.net';

      // Skip invalid phones, groups, or bot self
      if (!cleanPhone || cleanPhone.length < 10 || cleanPhone.startsWith('1203') || cleanPhone.includes(botNumber)) {
        console.log(`ℹ️ [DRIP] Skipping invalid/self subscriber #${sub.id} (${cleanPhone})`);
        await db.run("UPDATE drip_subscribers SET status = 'paused' WHERE id = ?", [sub.id]);
        continue;
      }

      const lead = await db.getLeads(null, null, cleanPhone);
      if (lead && lead[0] && lead[0].status === 'Enrolled') {
        await db.stopDripForChat(sub.chat_id);
        continue;
      }

      // Respect counselor manual override: if Auto-Reply Bot is toggled OFF for this chat, skip drip follow-up
      const chatRow = await db.get("SELECT auto_reply_enabled FROM chats WHERE chat_id = ? OR phone = ?", [targetChatId, cleanPhone]);
      if (chatRow && chatRow.auto_reply_enabled === 0) {
        console.log(`ℹ️ [DRIP] Auto-reply is toggled OFF for ${sub.name} (${cleanPhone}). Skipping drip follow-up.`);
        continue;
      }

      // 1. DEDUPLICATION SAFETY GUARD: Check if message for this step was already sent recently
      const alreadySent = await db.get(
        "SELECT id FROM drip_logs WHERE subscriber_id = ? AND day_number = ? AND status = 'sent' AND sent_at >= datetime('now', '-18 hours')",
        [sub.id, nextStep]
      );
      if (alreadySent) {
        console.log(`⚠️ [DRIP DEDUP] Day ${nextStep} was ALREADY sent to subscriber #${sub.id} (${sub.name}) in the last 18h. Advancing step to prevent duplicates.`);
        await db.advanceDripSubscriber(sub.id, nextStep, 24, nextStep >= 6);
        continue;
      }

      // 2. TEMPORARY IN-FLIGHT LOCK: Advance next_run_at by 2 hours immediately to prevent parallel pickups
      await db.run("UPDATE drip_subscribers SET next_run_at = datetime('now', '+2 hours') WHERE id = ?", [sub.id]);

      // Get template for this campaign and day
      let templates = await db.getDripTemplates(sub.campaign_type);
      let template = templates.find(t => t.day_number === nextStep && t.active === 1);
      if (!template && (sub.campaign_type === 'call_inquiry' || !sub.campaign_type)) {
        const inquiryTemplates = await db.getDripTemplates('inquiry');
        template = inquiryTemplates.find(t => t.day_number === nextStep && t.active === 1);
      }
      if (!template) {
        console.log(`⚠️ No active template found for ${sub.campaign_type} Day ${nextStep}`);
        await db.advanceDripSubscriber(sub.id, nextStep, 24, nextStep >= 6);
        continue;
      }

      if (!sock || !connected) {
        console.log('⚠️ WhatsApp socket not connected, pausing drip sequence.');
        break;
      }

      const messageText = buildProgramSpecificDripMessage(sub, nextStep, template);

      try {
        console.log(`📤 Sending Tailored Drip Day ${nextStep} (${sub.campaign_type}) to ${targetChatId}...`);
        await sendAndStoreMessage(sock, targetChatId, { text: messageText });

        await db.logMessage(targetChatId, 'Helix Bot', 'bot', messageText);
        await db.upsertChat(targetChatId, sub.name, cleanPhone, messageText, false);
        await db.logDripMessage(sub.id, targetChatId, sub.name, cleanPhone, sub.campaign_type, nextStep, messageText, 'sent');

        const isCompleted = nextStep >= 6;
        await db.advanceDripSubscriber(sub.id, nextStep, 24, isCompleted);

        io.emit('new-message', {
          chat_id: targetChatId,
          sender_name: 'Helix Bot',
          sender_type: 'bot',
          text: messageText,
          timestamp: new Date().toISOString()
        });
        io.emit('drip-updated');
      } catch (sendErr) {
        console.error(`❌ Failed to send drip message to ${targetChatId}:`, sendErr.message);
        await db.logDripMessage(sub.id, targetChatId, sub.name, cleanPhone, sub.campaign_type, nextStep, messageText, 'failed: ' + sendErr.message);
        // Reschedule for 6 hours later on failure so it doesn't immediately loop
        await db.run("UPDATE drip_subscribers SET next_run_at = datetime('now', '+6 hours') WHERE id = ?", [sub.id]);
      }

      // Safe throttle between messages
      await new Promise(r => setTimeout(r, 4000));
    }
  } catch (err) {
    console.error('❌ [DRIP ENGINE ERROR]:', err.message);
  } finally {
    isProcessingDrip = false;
  }
}

// Robust text extraction from all WhatsApp message formats (including interactive buttons & lists)
function extractMessageText(msg) {
  if (!msg || !msg.message) return '';
  let m = msg.message;
  while (m.ephemeralMessage?.message || m.viewOnceMessage?.message || m.viewOnceMessageV2?.message || m.documentWithCaptionMessage?.message) {
    m = m.ephemeralMessage?.message || m.viewOnceMessage?.message || m.viewOnceMessageV2?.message || m.documentWithCaptionMessage?.message;
  }

  // 1. Interactive response message (nativeFlow / quick reply / single select)
  if (m.interactiveResponseMessage) {
    const nativeParams = m.interactiveResponseMessage.nativeFlowResponseMessage?.paramsJson;
    if (nativeParams) {
      try {
        const parsed = JSON.parse(nativeParams);
        if (parsed.id) return String(parsed.id).trim();
      } catch (e) {}
    }
    if (m.interactiveResponseMessage.body?.text) {
      return m.interactiveResponseMessage.body.text.trim();
    }
  }

  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.buttonsResponseMessage?.selectedButtonId ||
    m.listResponseMessage?.singleSelectReply?.selectedRowId ||
    m.templateButtonReplyMessage?.selectedId ||
    ''
  ).trim();
}

// Map to cache LID -> Real Phone Number
const lidToPhoneMap = new Map();

async function preloadLidMap() {
  try {
    const data = await db.getAllContacts('', false, 10000, 0);
    const list = Array.isArray(data) ? data : (data?.contacts || []);
    for (const c of list) {
      if (c.jid && c.jid.endsWith('@lid') && c.phone) {
        const clean = db.normalizeIndianPhone(c.phone);
        if (clean) lidToPhoneMap.set(c.jid, clean);
      }
    }
    console.log(`📇 [LID PRELOAD] Loaded ${lidToPhoneMap.size} LID to Phone mappings.`);
  } catch (e) {
    console.warn('LID preload warning:', e.message);
  }
}

// Extract 10-digit Indian phone number from message text if shared by student
function extractPhoneNumberFromText(text) {
  if (!text) return null;
  const match = text.match(/(?:(?:\+|0{0,2})91[\s-]?)?[6-9]\d{9}\b/);
  if (match) {
    const digits = match[0].replace(/[^0-9]/g, '');
    return digits.length === 10 ? '91' + digits : digits;
  }
  return null;
}

// Resolve LID to real phone number using USync or cached mapping
async function resolveLidToPhone(sock, lid) {
  if (!lid || !lid.endsWith('@lid')) return lid ? lid.split('@')[0] : '';
  if (lidToPhoneMap.has(lid)) return lidToPhoneMap.get(lid);

  try {
    const { USyncQuery, USyncUser } = await import('@whiskeysockets/baileys');
    const usyncQuery = new USyncQuery().withContactProtocol().withLIDProtocol();
    usyncQuery.withUser(new USyncUser().withLid(lid));
    const result = await sock.executeUSyncQuery(usyncQuery);
    if (result && result.list && result.list.length > 0) {
      const match = result.list.find(item => item.id && item.id.endsWith('@s.whatsapp.net'));
      if (match) {
        const phone = match.id.split('@')[0].replace(/[^0-9]/g, '');
        lidToPhoneMap.set(lid, phone);
        await db.updatePhoneForLid(lid, phone);
        return phone;
      }
    }
  } catch (err) {
    // USync query silent fallback
  }

  return lid.split('@')[0];
}

// Process Incoming WhatsApp Message with State Machine & DB logging
async function processMessage(sock, io, chatId, name, text, explicitPhone = null) {
  let phone = explicitPhone;
  if (!phone) {
    if (lidToPhoneMap.has(chatId)) {
      phone = lidToPhoneMap.get(chatId);
    } else if (chatId.endsWith('@s.whatsapp.net')) {
      phone = chatId.split('@')[0].replace(/[^0-9]/g, '');
    } else {
      phone = await resolveLidToPhone(sock, chatId);
    }
  }

  // Check if student mentioned their phone number in their message
  const phoneInText = extractPhoneNumberFromText(text);
  if (phoneInText) {
    phone = phoneInText;
    if (chatId.endsWith('@lid')) {
      lidToPhoneMap.set(chatId, phone);
      await db.updatePhoneForLid(chatId, phone);
    }
  }

  const cleanPhone = phone ? db.normalizeIndianPhone(phone) : null;
  const canonicalChatId = (cleanPhone && cleanPhone.length >= 10) ? `${cleanPhone}@s.whatsapp.net` : chatId;

  const session = getSession(chatId);
  const msg = text.trim();
  const directIntent = detectDirectIntent(text);

  // 1. Log incoming message into DB
  await db.logMessage(canonicalChatId, name, 'customer', text);
  await db.upsertChat(canonicalChatId, name, cleanPhone, text, true);

  // 2. Classify and update Lead in CRM DB
  const category = determineCategoryFromIntent(directIntent, text);
  await db.upsertLead(canonicalChatId, name, cleanPhone, category);
  syncLeadToGoogleSheet({ name, phone: cleanPhone, category, status: 'New', notes: text, created_at: new Date().toISOString() });

  // Auto-enroll prospective student in 6-day Inquiry Drip sequence (Day 1 in 24 hours)
  // NEVER enroll bot's own number, admin phone, or WhatsApp groups into drip!
  const botNumber = sock.user?.id ? sock.user.id.split(':')[0].replace(/[^0-9]/g, '') : '';
  const isBotSelf = botNumber && cleanPhone && (cleanPhone === botNumber || cleanPhone.endsWith(botNumber) || botNumber.endsWith(cleanPhone));
  const isGroup = canonicalChatId.endsWith('@g.us') || chatId.endsWith('@g.us') || (cleanPhone && cleanPhone.startsWith('1203'));

  if (!isBotSelf && !isGroup && cleanPhone && cleanPhone.length >= 10) {
    await db.enrollInDrip(canonicalChatId, name, cleanPhone, 'inquiry', 24, botNumber, true);
  }

  // 3. Emit real-time updates to CRM frontend
  io.emit('new-message', {
    chat_id: canonicalChatId,
    sender_name: name,
    sender_type: 'customer',
    text: text,
    timestamp: new Date().toISOString()
  });
  if (canonicalChatId !== chatId) {
    io.emit('new-message', {
      chat_id: chatId,
      sender_name: name,
      sender_type: 'customer',
      text: text,
      timestamp: new Date().toISOString()
    });
  }

  const updatedStats = await db.getDashboardStats();
  io.emit('stats-updated', updatedStats);

  // 4. Check if auto reply is enabled for this chat
  const chatInfo = await db.db ? await new Promise(r => db.db.get('SELECT auto_reply_enabled FROM chats WHERE chat_id = ?', [chatId], (e, row) => r(row))) : null;
  if (chatInfo && chatInfo.auto_reply_enabled === 0) {
    console.log(`ℹ️ Auto-reply disabled for chat ${chatId}. Agent will reply manually from CRM.`);
    return;
  }

  // 5. Active Multi-step Session handling
  if (session.state !== 'IDLE') {
    switch (session.state) {
      case 'WAITING_JOB_QUALIFICATION': {
        let qual = msg;
        if (msg === '1' || msg === '1.' || msg.toLowerCase().includes('b.sc') || msg.toLowerCase().includes('bsc')) qual = 'B.Sc';
        else if (msg === '2' || msg === '2.' || msg.toLowerCase().includes('m.sc') || msg.toLowerCase().includes('msc')) qual = 'M.Sc';
        else if (msg === '3' || msg === '3.' || msg.toLowerCase().includes('other')) qual = 'Other';
        session.data.qualification = qual;
        session.state = 'IDLE';
        await db.upsertLead(chatId, name, phone, 'Job-Oriented', qual);
        const jobReply = `Thank you! Qualified as ${qual}.\n\n🌐 More details & registration: https://www.helixbiofastlabs.com/job-oriented-training\n\nTap a button below or type 2 for Brochure PDF | Type 6 to talk to our team.`;
        await sendBotReply(sock, io, chatId, name, phone, jobReply, BUTTONS.trainingSubmenu);
        await notifyStaff(sock, name, chatId, `Job-Oriented Enquirer (Qual: ${qual})`, 'JOB-ORIENTED LEAD');
        return;
      }

      case 'WAITING_PROJECT_TYPE': {
        let pType = msg;
        if (msg === '1' || msg === '1.' || msg.toLowerCase().includes('project')) pType = 'Project Work';
        else if (msg === '2' || msg === '2.' || msg.toLowerCase().includes('dissertation')) pType = 'Dissertation';
        else if (msg === '3' || msg === '3.' || msg.toLowerCase().includes('research')) pType = 'Research Help';
        session.data.projectType = pType;
        session.state = 'WAITING_PROJECT_TOPIC';
        const projReply = 'Do you already have a research topic in mind?\n\n1. Yes\n2. No (Discuss topics with mentor)\n\n🌐 https://www.helixbiofastlabs.com/project-dissertation-training-in-biotechnology';
        await sendBotReply(sock, io, chatId, name, phone, projReply, BUTTONS.projectTopic);
        return;
      }

      case 'WAITING_PROJECT_TOPIC': {
        let topicPref = msg;
        if (msg === '1' || msg.toLowerCase().includes('yes')) topicPref = 'Yes (Has topic)';
        else if (msg === '2' || msg.toLowerCase().includes('no')) topicPref = 'No (Needs topic guidance)';
        session.data.hasTopic = topicPref;
        session.state = 'IDLE';
        const topicReply = 'Thank you! Our research coordinator has received your project request and will discuss topics/details with you shortly.\n\n🌐 Project Details & Fees: https://www.helixbiofastlabs.com/project-dissertation-training-in-biotechnology\n\n📞 Direct Call: 8383897225';
        await sendBotReply(sock, io, chatId, name, phone, topicReply, BUTTONS.trainingSubmenu);
        await notifyStaff(sock, name, chatId, `Project Enquiry (Type: ${session.data.projectType}, Topic Preference: ${topicPref})`, 'PROJECT LEAD');
        return;
      }

      case 'WAITING_PHD_ASSISTANCE': {
        let phdReq = msg;
        if (msg === '1') phdReq = 'Topic & Experimental Planning';
        else if (msg === '2') phdReq = 'Lab & Experimental Support';
        else if (msg === '3') phdReq = 'Data Analysis & Interpretation';
        else if (msg === '4') phdReq = 'Thesis & Paper Support';
        session.data.phdRequirement = phdReq;
        session.state = 'IDLE';
        const phdReply = 'Thank you for sharing your PhD requirement. Our senior research scientist will contact you shortly to discuss your research work.\n\n🌐 Website: https://www.helixbiofastlabs.com\n📞 Direct Call: 8383897225\n📧 biofastlabs@gmail.com';
        await sendBotReply(sock, io, chatId, name, phone, phdReply, BUTTONS.trainingSubmenu);
        await notifyStaff(sock, name, chatId, `PhD Requirement: ${phdReq}`, 'PhD RESEARCH LEAD');
        return;
      }

      case 'WAITING_FORENSIC_TYPE': {
        let forReq = msg;
        if (msg === '1') forReq = 'Blood / ABO / Rh';
        else if (msg === '2') forReq = 'Sample & Lab Testing';
        session.data.forensicType = forReq;
        session.state = 'IDLE';
        const forensicReply = 'Thank you! Your forensic testing request has been registered. Our forensic expert will connect with you to discuss sample submission & testing protocol.\n\n🌐 Website: https://www.helixbiofastlabs.com\n📞 Contact: 8383897225';
        await sendBotReply(sock, io, chatId, name, phone, forensicReply, BUTTONS.trainingSubmenu);
        await notifyStaff(sock, name, chatId, `Forensic Testing Request: ${forReq}`, 'FORENSIC LEAD');
        return;
      }

      case 'WAITING_HUMAN_MESSAGE':
        session.state = 'IDLE';
        try {
          await db.markLeadTalkToTeam(canonicalChatId, msg);
          io.emit('dashboard-stats-updated');
        } catch (e) {}
        await sendBotReply(sock, io, chatId, name, phone, MESSAGES.human);
        await notifyStaff(sock, name, chatId, msg, 'STUDENT HUMAN ENQUIRY');
        return;
    }
  }

  // 6. Direct Flowchart Intent (Menu, numbers 1-6, options A-D, greetings)
  if (directIntent) {
    session.failedAttempts = 0;
    return handleDirectIntent(sock, io, chatId, name, phone, text, directIntent, session);
  }

  // 7. Gemini AI Auto-Responder (for natural language, questions & inquiries)
  const botConfig = await db.getBotConfig();
  if (botConfig.AI_ENABLED === '1' && botConfig.GEMINI_API_KEY) {
    try {
      console.log(`🧠 Generating Gemini AI response for ${chatId}...`);
      const aiReply = await generateGeminiReply(chatId, text, name);
      if (aiReply) {
        session.failedAttempts = 0;
        await sendBotReply(sock, io, chatId, name, phone, aiReply);
        return;
      }
    } catch (err) {
      console.error('Gemini AI generation failed, falling back to rule engine:', err.message);
    }
  }

  // 8. Fallback if AI fails or is disabled
  const lowerMsg = text.toLowerCase().trim();
  const isThankYou = /^(thank\s*you|thanks|thanku|thx|ok\s*thank|dhanyawad|shukriya)\b/i.test(lowerMsg) || lowerMsg.includes('thank you') || lowerMsg.includes('thanks') || lowerMsg.includes('thank u');
  const isAck = /^(ok|okay|k|alright|got it|sure|theek hai|thik h|done)\b/i.test(lowerMsg);

  if (isThankYou) {
    session.failedAttempts = 0;
    const politeReply = `You are most welcome! We look forward to having you with us. If you have any questions or need further details, feel free to ask here anytime.\n\nHelix BioFast Labs\n🌐 https://www.helixbiofastlabs.com\n📞 8383897225`;
    await sendBotReply(sock, io, chatId, name, phone, politeReply);
    return;
  }

  if (isAck) {
    session.failedAttempts = 0;
    const ackReply = `Great! Please let us know if you have any questions or need any assistance. We are happy to help.\n\nHelix BioFast Labs\n🌐 https://www.helixbiofastlabs.com`;
    await sendBotReply(sock, io, chatId, name, phone, ackReply);
    return;
  }

  session.failedAttempts += 1;
  if (session.failedAttempts >= 2) {
    session.failedAttempts = 0;
    session.state = 'IDLE';
    const failReply = 'I notice you need detailed help! I have forwarded your message directly to our team. Someone from Helix BioFast Labs will call/message you shortly.\n\n📞 8383897225 | 📧 biofastlabs@gmail.com\n🌐 https://www.helixbiofastlabs.com';
    await sendBotReply(sock, io, chatId, name, phone, failReply);
    await notifyStaff(sock, name, chatId, `Auto-Handover (2 failed bot attempts). Last message: "${text}"`, 'AUTO HUMAN HANDOVER');
  } else {
    await sendBotReply(sock, io, chatId, name, phone, MESSAGES.unknown, BUTTONS.unknown);
  }
}

// Handle Single-Step Intention
async function handleDirectIntent(sock, io, chatId, name, phone, text, directIntent, session) {
  switch (directIntent) {
    case 'mainMenu':
      await sendBotReply(sock, io, chatId, name, phone, MESSAGES.mainMenu, BUTTONS.mainMenu);
      break;
    case 'trainingMenu':
      await sendBotReply(sock, io, chatId, name, phone, MESSAGES.trainingMenu, BUTTONS.trainingMenu);
      break;
    case 'shortTerm':
      await sendBotReply(sock, io, chatId, name, phone, MESSAGES.shortTerm, BUTTONS.trainingSubmenu);
      break;
    case 'advanceTraining':
      await sendBotReply(sock, io, chatId, name, phone, MESSAGES.advanceTraining, BUTTONS.trainingSubmenu);
      break;
    case 'industrialTraining':
      await sendBotReply(sock, io, chatId, name, phone, MESSAGES.industrialTraining, BUTTONS.trainingSubmenu);
      break;
    case 'jobOriented':
      session.state = 'WAITING_JOB_QUALIFICATION';
      await sendBotReply(sock, io, chatId, name, phone, MESSAGES.jobOrientedInfo, BUTTONS.jobQualification);
      break;
    case 'projects':
      session.state = 'WAITING_PROJECT_TYPE';
      await sendBotReply(sock, io, chatId, name, phone, MESSAGES.projectStart, BUTTONS.projectStart);
      break;
    case 'phd':
      session.state = 'WAITING_PHD_ASSISTANCE';
      await sendBotReply(sock, io, chatId, name, phone, MESSAGES.phdStart, BUTTONS.phdStart);
      break;
    case 'forensic':
      session.state = 'WAITING_FORENSIC_TYPE';
      await sendBotReply(sock, io, chatId, name, phone, MESSAGES.forensicStart, BUTTONS.forensicStart);
      break;
    case 'human':
      session.state = 'WAITING_HUMAN_MESSAGE';
      try {
        const cleanPhoneForLead = phone ? db.normalizeIndianPhone(phone) : null;
        const targetCanonical = (cleanPhoneForLead && cleanPhoneForLead.length >= 10) ? `${cleanPhoneForLead}@s.whatsapp.net` : chatId;
        await db.markLeadTalkToTeam(targetCanonical, text);
        io.emit('dashboard-stats-updated');
      } catch (e) {}
      await sendBotReply(sock, io, chatId, name, phone, MESSAGES.humanPrompt);
      break;
    case 'location':
      await sendBotReply(sock, io, chatId, name, phone, MESSAGES.location, BUTTONS.location);
      break;
    case 'brochure': {
      const localBrochurePath = path.join(__dirname, 'public', 'Helix_BioFast_Information_Brochure.pdf');
      let sent = false;
      // Resolve targetChatId to real phone JID because Baileys document/media messages sent to @lid are silently dropped by WhatsApp servers
      let targetChatId = chatId;
      const cleanPhone = phone ? db.normalizeIndianPhone(phone) : (lidToPhoneMap.get(chatId) ? db.normalizeIndianPhone(lidToPhoneMap.get(chatId)) : null);
      if (cleanPhone) {
        targetChatId = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@s.whatsapp.net`;
      }

      if (fs.existsSync(localBrochurePath)) {
        try {
          console.log(`📤 Sending official Information Brochure PDF to ${targetChatId} (source chatId: ${chatId})...`);
          const buf = fs.readFileSync(localBrochurePath);
          await sendAndStoreMessage(sock, targetChatId, {
            document: buf,
            fileName: 'Helix_BioFast_Information_Brochure.pdf',
            mimetype: 'application/pdf',
            caption: 'Helix BioFast Labs — Official Information Brochure\n\nFor technical training, skill up-gradation, building of new skills and innovative thinking in Biotechnology.\n\n📍 Lab Location: https://maps.app.goo.gl/M9BGxKCjPn4PDVrU8\n🌐 Website: https://www.helixbiofastlabs.com\n📞 Contact: +91-9717117289, +91-8383897225'
          });
          await db.logMessage(chatId, 'Helix Bot', 'bot', '[Sent PDF Document: Helix_BioFast_Information_Brochure.pdf]');
          if (targetChatId !== chatId) {
            await db.logMessage(targetChatId, 'Helix Bot', 'bot', '[Sent PDF Document: Helix_BioFast_Information_Brochure.pdf]');
          }
          console.log('✅ Official Information Brochure PDF sent successfully to', targetChatId);
          sent = true;
        } catch (err) {
          console.error('Error sending local brochure PDF to targetChatId:', err.message);
          if (targetChatId !== chatId) {
            try {
              console.log(`🔄 Attempting fallback brochure send to original chatId ${chatId}...`);
              const buf = fs.readFileSync(localBrochurePath);
              await sendAndStoreMessage(sock, chatId, {
                document: buf,
                fileName: 'Helix_BioFast_Information_Brochure.pdf',
                mimetype: 'application/pdf',
                caption: 'Helix BioFast Labs — Official Information Brochure\n\n📍 Lab Location: https://maps.app.goo.gl/M9BGxKCjPn4PDVrU8\n🌐 Website: https://www.helixbiofastlabs.com\n📞 Contact: +91-9717117289, +91-8383897225'
              });
              sent = true;
            } catch (fallbackErr) {
              console.error('Fallback brochure send failed:', fallbackErr.message);
            }
          }
        }
      }

      if (!sent && CONFIG.BROCHURE_URL) {
        try {
          const buf = await downloadFile(CONFIG.BROCHURE_URL);
          await sendAndStoreMessage(sock, targetChatId, {
            document: buf,
            fileName: 'Helix_BioFast_Information_Brochure.pdf',
            mimetype: 'application/pdf',
            caption: 'Helix BioFast Labs — Official Information Brochure\n\n📍 Lab Location: https://maps.app.goo.gl/M9BGxKCjPn4PDVrU8\n🌐 Website: https://www.helixbiofastlabs.com\n📞 Contact: +91-9717117289, +91-8383897225'
          });
          await db.logMessage(chatId, 'Helix Bot', 'bot', '[Sent PDF Document: Helix_BioFast_Information_Brochure.pdf]');
          sent = true;
        } catch (err) {}
      }

      if (!sent) {
        await sendBotReply(sock, io, chatId, name, phone, '📄 For full brochure & course details, please visit our website:\n🌐 https://www.helixbiofastlabs.com\n📍 Lab Location: https://maps.app.goo.gl/M9BGxKCjPn4PDVrU8\n📞 +91-9717117289, +91-8383897225');
      }
      break;
    }
  }
}

// Baileys Socket Global Vars
let sock = null, qrData = null, connected = false;
let reconnectTimeout = null;
let isStartingBot = false;

function scheduleRestart(io, delay = 5000) {
  if (reconnectTimeout) clearTimeout(reconnectTimeout);
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    startBot(io);
  }, delay);
}

// Auto-repair Bad MAC session by deleting corrupted session file
function repairSignalSession(jidOrLid) {
  if (!jidOrLid) return;
  const clean = jidOrLid.split('@')[0].replace(/[^0-9]/g, '');
  if (!clean) return;
  const sessionDir = path.join(__dirname, '.session');
  try {
    if (fs.existsSync(sessionDir)) {
      const files = fs.readdirSync(sessionDir);
      for (const f of files) {
        if (f.startsWith(`session-${clean}.`)) {
          fs.unlinkSync(path.join(sessionDir, f));
          console.log(`🧹 Auto-repaired Signal session file: ${f}`);
        }
      }
    }
  } catch (e) {}
}

async function startBot(io) {
  if (isStartingBot) {
    console.log('⚠️ startBot already in progress, skipping duplicate call.');
    return;
  }
  isStartingBot = true;

  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  // Clean up previous socket if any
  if (sock) {
    try {
      sock.ev.removeAllListeners();
      sock.ws?.close();
      sock.end();
    } catch (e) {}
    sock = null;
  }

  try {
    const baileys = await import('@whiskeysockets/baileys');
    const makeWASocket = baileys.default?.default || baileys.default || baileys.makeWASocket;
    const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = baileys;

    const { state, saveCreds } = await useMultiFileAuthState('./.session');
    let version = [2, 3000, 1015901307];
    try {
      const v = await fetchLatestBaileysVersion();
      if (v && v.version) version = v.version;
    } catch (e) {
      console.log('Using default Baileys version');
    }

    sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: ['Helix BioFast Labs CRM', 'Chrome', '1.0'],
      syncFullHistory: false,
      getMessage: getBaileysStoredMessage
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        if (connected) {
          console.log('⚠️ Ignoring QR code since WhatsApp is already connected.');
          return;
        }
        qrData = await qrcode.toDataURL(qr);
        console.log('\n📱 WhatsApp QR Code Ready for Scanning on CRM Dashboard!\n');
        io.emit('bot-status', { connected: false, qrData });
      }
      if (connection === 'open') {
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = null;
        }
        qrData = null;
        connected = true;
        console.log('\n🟢 WhatsApp CONNECTED! CRM Live Desktop & Auto-Bot Active.\n');
        io.emit('bot-status', { connected: true, qrData: null });

        // Safe WhatsApp Account-Switch Isolation Guard:
        const currentBotNumber = sock.user?.id ? sock.user.id.split(':')[0].replace(/[^0-9]/g, '') : '';
        if (currentBotNumber) {
          console.log(`📱 Linked WhatsApp Bot Number: ${currentBotNumber}`);
          (async () => {
            try {
              const cfg = await db.getBotConfig();
              const prevBotPhone = cfg?.ACTIVE_BOT_PHONE || null;
              if (prevBotPhone && prevBotPhone !== currentBotNumber) {
                console.log(`⚠️ [ACCOUNT SWITCH] WhatsApp account switched from ${prevBotPhone} to ${currentBotNumber}.`);
                const result = await db.pauseSubscribersFromOldBot(prevBotPhone, currentBotNumber);
                console.log(`🔒 Safely auto-paused ${result?.changes || 0} active drip campaign(s) from older account ${prevBotPhone}.`);
              }
              await db.updateBotConfig('ACTIVE_BOT_PHONE', currentBotNumber);
            } catch (accErr) {
              console.error('Error handling WhatsApp account switch:', accErr.message);
            }
          })();
        }
      }
      if (connection === 'close') {
        connected = false;
        const code = (lastDisconnect?.error instanceof Boom) ? lastDisconnect.error.output.statusCode : 0;
        if (code === DisconnectReason.loggedOut) {
          console.log('❌ Logged out from WhatsApp. Resetting session for new QR code...');
          qrData = null;
          io.emit('bot-status', { connected: false, qrData: null });
          try {
            const sessionDir = path.join(__dirname, '.session');
            if (fs.existsSync(sessionDir)) {
              fs.rmSync(sessionDir, { recursive: true, force: true });
              console.log('🗑️ Previous WhatsApp .session removed.');
            }
          } catch (e) {
            console.error('Error removing .session on logout:', e.message);
          }
          scheduleRestart(io, 1500);
        } else {
          console.log('Reconnecting in 5s...');
          scheduleRestart(io, 5000);
        }
      }
    });
  } catch (err) {
    console.error('Error starting bot:', err);
  } finally {
    isStartingBot = false;
  }

  const processedMessageIds = new Set();

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    for (const msg of messages) {
      if (!msg.key || !msg.key.remoteJid) continue;

      // Always save message to store for retry receipts (even if fromMe so mobile phone can decrypt and sync!)
      if (msg.key.id && msg.message) {
        const text = extractMessageText(msg);
        storeBaileysMessage(msg.key.id, msg.key.remoteJid, msg.message, text);
      }

      // 1. NEVER process messages sent from our own account (prevents infinite self-reply loops)
      if (msg.key.fromMe) continue;

      // Deduplicate rapid duplicate events
      if (msg.key.id && processedMessageIds.has(msg.key.id)) continue;
      if (msg.key.id) {
        processedMessageIds.add(msg.key.id);
        if (processedMessageIds.size > 2000) {
          const first = processedMessageIds.values().next().value;
          processedMessageIds.delete(first);
        }
      }

      // Ignore broadcast status updates and group chats
      if (msg.key.remoteJid === 'status@broadcast' || msg.key.remoteJid.endsWith('@g.us')) continue;

      // Extract text
      const text = extractMessageText(msg);
      if (!text) continue;

      // Ignore messages from bot's own linked number
      const botNumber = sock.user?.id ? sock.user.id.split(':')[0].replace(/[^0-9]/g, '') : '';
      const chatId = msg.key.remoteJid;
      const cleanRemote = chatId.replace(/[^0-9]/g, '');
      if (botNumber && cleanRemote && (cleanRemote === botNumber || cleanRemote.endsWith(botNumber) || botNumber.endsWith(cleanRemote))) {
        continue;
      }
      const name = msg.pushName || chatId.split('@')[0];

      // Check for phone number in message key attributes
      let realPhone = null;
      if (msg.key?.senderPn) {
        realPhone = msg.key.senderPn.split('@')[0].replace(/[^0-9]/g, '');
      } else if (msg.key?.participantPn) {
        realPhone = msg.key.participantPn.split('@')[0].replace(/[^0-9]/g, '');
      } else if (chatId && chatId.endsWith('@s.whatsapp.net')) {
        realPhone = chatId.split('@')[0].replace(/[^0-9]/g, '');
      } else if (lidToPhoneMap.has(chatId)) {
        realPhone = lidToPhoneMap.get(chatId);
      }

      console.log(`\n📩 [INCOMING MESSAGE] From: ${name} (${chatId}) | Phone: ${realPhone || 'Resolving...'} | Text: "${text}"`);

      // Read status mark
      try {
        await sock.readMessages([msg.key]);
      } catch (e) {}

      await processMessage(sock, io, chatId, name, text, realPhone);
    }
  });

  // Listen to full messaging history set (sent on initial WhatsApp Web sync)
  sock.ev.on('messaging-history.set', async ({ chats, contacts, messages, isLatest }) => {
    if (contacts && contacts.length > 0) {
      console.log(`📇 [HISTORY SYNC] Received ${contacts.length} contacts from WhatsApp`);
      try {
        await db.upsertContactsBatch(contacts);
        for (const c of contacts) {
          const lid = c.lid || (c.id?.endsWith('@lid') ? c.id : null);
          const jid = c.jid || (c.id?.endsWith('@s.whatsapp.net') ? c.id : null);
          if (lid && jid) {
            const phone = jid.split('@')[0].replace(/[^0-9]/g, '');
            lidToPhoneMap.set(lid, phone);
            await db.updatePhoneForLid(lid, phone);
          }
        }
        io.emit('contacts-updated', { count: contacts.length });
      } catch (err) {
        console.error('Error in messaging-history.set contacts sync:', err.message);
      }
    }

    if (chats && chats.length > 0) {
      console.log(`💬 [HISTORY SYNC] Received ${chats.length} chats from WhatsApp`);
      try {
        for (const ch of chats) {
          const jid = ch.id;
          if (!jid || jid.endsWith('@g.us') || jid === 'status@broadcast') continue;
          const phone = jid.split('@')[0].replace(/[^0-9]/g, '');
          const cleanPhone = db.normalizeIndianPhone(phone);
          const canonicalJid = (cleanPhone && cleanPhone.length >= 10) ? `${cleanPhone}@s.whatsapp.net` : jid;
          const name = ch.name || null;
          await db.upsertChat(canonicalJid, name, cleanPhone, null, false);
        }
        io.emit('chats-updated');
      } catch (err) {
        console.error('Error in messaging-history.set chats sync:', err.message);
      }
    }

    if (messages && messages.length > 0) {
      for (const m of messages) {
        if (m?.key?.id && m?.message) {
          const t = extractMessageText(m);
          storeBaileysMessage(m.key.id, m.key.remoteJid, m.message, t);
        }
      }
    }
  });

  // Listen to full chats set
  sock.ev.on('chats.set', async ({ chats }) => {
    if (chats && chats.length > 0) {
      console.log(`💬 [CHATS SET] Received ${chats.length} chats from WhatsApp`);
      try {
        for (const ch of chats) {
          const jid = ch.id;
          if (!jid || jid.endsWith('@g.us') || jid === 'status@broadcast') continue;
          const phone = jid.split('@')[0].replace(/[^0-9]/g, '');
          const cleanPhone = db.normalizeIndianPhone(phone);
          const canonicalJid = (cleanPhone && cleanPhone.length >= 10) ? `${cleanPhone}@s.whatsapp.net` : jid;
          const name = ch.name || null;
          await db.upsertChat(canonicalJid, name, cleanPhone, null, false);
        }
        io.emit('chats-updated');
      } catch (err) {
        console.error('Error in chats.set sync:', err.message);
      }
    }
  });

  // Listen to chats upsert
  sock.ev.on('chats.upsert', async (chats) => {
    if (chats && chats.length > 0) {
      try {
        for (const ch of chats) {
          const jid = ch.id;
          if (!jid || jid.endsWith('@g.us') || jid === 'status@broadcast') continue;
          const phone = jid.split('@')[0].replace(/[^0-9]/g, '');
          const cleanPhone = db.normalizeIndianPhone(phone);
          const canonicalJid = (cleanPhone && cleanPhone.length >= 10) ? `${cleanPhone}@s.whatsapp.net` : jid;
          const name = ch.name || null;
          await db.upsertChat(canonicalJid, name, cleanPhone, null, false);
        }
        io.emit('chats-updated');
      } catch (err) {
        console.error('Error in chats.upsert sync:', err.message);
      }
    }
  });

  // Listen to chats update
  sock.ev.on('chats.update', async (updates) => {
    if (updates && updates.length > 0) {
      try {
        for (const u of updates) {
          const jid = u.id;
          if (!jid || jid.endsWith('@g.us') || jid === 'status@broadcast') continue;
          const phone = jid.split('@')[0].replace(/[^0-9]/g, '');
          const cleanPhone = db.normalizeIndianPhone(phone);
          const canonicalJid = (cleanPhone && cleanPhone.length >= 10) ? `${cleanPhone}@s.whatsapp.net` : jid;
          const name = u.name || null;
          await db.upsertChat(canonicalJid, name, cleanPhone, null, false);
        }
        io.emit('chats-updated');
      } catch (err) {
        console.error('Error in chats.update sync:', err.message);
      }
    }
  });

  // Listen to full contacts set
  sock.ev.on('contacts.set', async ({ contacts }) => {
    if (contacts && contacts.length > 0) {
      console.log(`📇 [CONTACTS SET] Received ${contacts.length} contacts from WhatsApp`);
      try {
        await db.upsertContactsBatch(contacts);
        for (const c of contacts) {
          const lid = c.lid || (c.id?.endsWith('@lid') ? c.id : null);
          const jid = c.jid || (c.id?.endsWith('@s.whatsapp.net') ? c.id : null);
          if (lid && jid) {
            const phone = jid.split('@')[0].replace(/[^0-9]/g, '');
            lidToPhoneMap.set(lid, phone);
            await db.updatePhoneForLid(lid, phone);
          }
        }
        io.emit('contacts-updated', { count: contacts.length });
      } catch (err) {
        console.error('Error in contacts.set sync:', err.message);
      }
    }
  });

  // Listen to contacts sync events to automatically map LIDs and save contacts
  sock.ev.on('contacts.upsert', async (contacts) => {
    if (contacts && contacts.length > 0) {
      try {
        await db.upsertContactsBatch(contacts);
        for (const c of contacts) {
          const lid = c.lid || (c.id?.endsWith('@lid') ? c.id : null);
          const jid = c.jid || (c.id?.endsWith('@s.whatsapp.net') ? c.id : null);
          if (lid && jid) {
            const phone = jid.split('@')[0].replace(/[^0-9]/g, '');
            lidToPhoneMap.set(lid, phone);
            await db.updatePhoneForLid(lid, phone);
          }
        }
        io.emit('contacts-updated', { count: contacts.length });
      } catch (err) {
        console.error('Error in contacts.upsert sync:', err.message);
      }
    }
  });

  sock.ev.on('contacts.update', async (updates) => {
    if (updates && updates.length > 0) {
      try {
        await db.upsertContactsBatch(updates);
        for (const u of updates) {
          const lid = u.lid || (u.id?.endsWith('@lid') ? u.id : null);
          const jid = u.jid || (u.id?.endsWith('@s.whatsapp.net') ? u.id : null);
          if (lid && jid) {
            const phone = jid.split('@')[0].replace(/[^0-9]/g, '');
            lidToPhoneMap.set(lid, phone);
            await db.updatePhoneForLid(lid, phone);
          }
        }
        io.emit('contacts-updated', { count: updates.length });
      } catch (err) {
        console.error('Error in contacts.update sync:', err.message);
      }
    }
  });
}

// Express & Socket.IO Web App Setup
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// REST API ENDPOINTS FOR CRM DASHBOARD

// 1. Dashboard Summary Metrics
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await db.getDashboardStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Lead Management Endpoints
app.get('/api/leads', async (req, res) => {
  try {
    const { status, category, search } = req.query;
    const leads = await db.getLeads(status, category, search);
    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/leads/talk-to-team', async (req, res) => {
  try {
    const leads = await db.getTalkToTeamLeads();
    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leads/:id/talk-to-team-status', async (req, res) => {
  try {
    const { status, notes } = req.body;
    await db.updateLeadTalkToTeamStatus(req.params.id, status, notes);
    const updatedStats = await db.getDashboardStats();
    io.emit('stats-updated', updatedStats);
    io.emit('dashboard-stats-updated');
    io.emit('lead-updated');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, category, name, phone } = req.body;
    await db.updateLeadStatus(id, status, notes, category, name, phone);

    const updatedStats = await db.getDashboardStats();
    io.emit('stats-updated', updatedStats);
    io.emit('lead-updated', { id, status, notes, category, name, phone });

    res.json({ success: true, message: 'Lead updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leads', async (req, res) => {
  try {
    const { name, phone, category, notes, status } = req.body;
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    const chatId = req.body.chatId || (cleanPhone ? `${cleanPhone}@s.whatsapp.net` : null);
    if (!chatId) {
      return res.status(400).json({ error: 'Valid phone number or chatId required' });
    }
    const leadId = await db.upsertLead(chatId, name || 'Student', cleanPhone, category || 'General');
    if (status || notes) {
      await db.updateLeadStatus(leadId, status || 'New', notes || '', category || 'General', name || 'Student', cleanPhone);
    }
    const updatedStats = await db.getDashboardStats();
    io.emit('stats-updated', updatedStats);
    io.emit('lead-updated');
    res.json({ success: true, leadId, message: 'Lead created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update contact name or phone directly from Live Chat desk
app.put('/api/chats/:chatId/contact', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { name, phone } = req.body;
    const decodedChatId = decodeURIComponent(chatId);

    if (phone && decodedChatId.endsWith('@lid')) {
      lidToPhoneMap.set(decodedChatId, phone);
    }

    await db.run(
      'UPDATE chats SET name = COALESCE(?, name), phone = COALESCE(?, phone) WHERE chat_id = ?',
      [name, phone, decodedChatId]
    );
    await db.run(
      'UPDATE leads SET name = COALESCE(?, name), phone = COALESCE(?, phone) WHERE chat_id = ?',
      [name, phone, decodedChatId]
    );

    io.emit('chat-updated', { chat_id: decodedChatId, name, phone });
    io.emit('lead-updated', { chat_id: decodedChatId, name, phone });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Live Chat Endpoints
app.get('/api/chats', async (req, res) => {
  try {
    const { timeframe, fresh, type } = req.query;
    let chats = await db.getAllChats();
    const isFreshOnly = fresh === 'true' || type === 'fresh' || timeframe === '24h-fresh' || timeframe === '48h-fresh';
    const activeTimeframe = timeframe ? timeframe.replace('-fresh', '') : null;

    const parse = (val) => {
      if (!val) return 0;
      let s = String(val).trim();
      if (/^\d+$/.test(s)) return parseInt(s, 10);
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s)) s = s.replace(' ', 'T') + 'Z';
      const d = new Date(s);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    };

    if (activeTimeframe === '24h' || activeTimeframe === '48h') {
      const hours = activeTimeframe === '24h' ? 24 : 48;
      const cutoff = Date.now() - hours * 60 * 60 * 1000;
      chats = chats.filter(c => {
        if (isFreshOnly) {
          const firstMsgT = parse(c.first_message_time);
          const createdT = parse(c.created_at);
          const startT = (firstMsgT && createdT) ? Math.min(firstMsgT, createdT) : (firstMsgT || createdT || parse(c.last_message_time));
          return startT >= cutoff;
        } else {
          const actT = Math.max(parse(c.last_message_time), parse(c.first_message_time), parse(c.created_at));
          return actT >= cutoff;
        }
      });
    } else if (isFreshOnly) {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      chats = chats.filter(c => {
        const firstMsgT = parse(c.first_message_time);
        const createdT = parse(c.created_at);
        const startT = (firstMsgT && createdT) ? Math.min(firstMsgT, createdT) : (firstMsgT || createdT || parse(c.last_message_time));
        return startT >= cutoff;
      });
    }
    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/chats/:chatId/messages', async (req, res) => {
  try {
    const { chatId } = req.params;
    const messages = await db.getChatMessages(decodeURIComponent(chatId));
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send Manual Message from CRM Agent Desk directly to WhatsApp (Supports Text & Attachments)
app.post('/api/chats/:chatId/send', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { text, agentName, attachment } = req.body;

    if (!sock || !connected) {
      return res.status(400).json({ error: 'WhatsApp is not connected! Please scan QR code.' });
    }

    const decodedChatId = decodeURIComponent(chatId);
    let targetChatId = decodedChatId;

    // Resolve target JID to real phone to avoid WhatsApp dropping media sent to @lid
    if (decodedChatId.endsWith('@lid')) {
      const mappedPhone = lidToPhoneMap.get(decodedChatId);
      if (mappedPhone) {
        const clean = db.normalizeIndianPhone(mappedPhone);
        targetChatId = `${clean}@s.whatsapp.net`;
      }
    } else if (!decodedChatId.includes('@')) {
      const clean = db.normalizeIndianPhone(decodedChatId);
      targetChatId = `${clean}@s.whatsapp.net`;
    }

    let sentSummaryText = (text || '').trim();

    if (attachment && attachment.data) {
      let base64Data = attachment.data;
      if (base64Data.includes(',')) {
        base64Data = base64Data.split(',')[1];
      }
      const buffer = Buffer.from(base64Data, 'base64');
      const mimetype = attachment.mimetype || 'application/octet-stream';
      const fileName = attachment.fileName || 'attachment';

      console.log(`📤 Sending attachment (${fileName}, ${mimetype}, ${buffer.length} bytes) to ${targetChatId}...`);

      if (mimetype.startsWith('image/')) {
        await sendAndStoreMessage(sock, targetChatId, {
          image: buffer,
          caption: text || '',
          mimetype: mimetype
        });
      } else {
        await sendAndStoreMessage(sock, targetChatId, {
          document: buffer,
          fileName: fileName,
          mimetype: mimetype,
          caption: text || ''
        });
      }

      sentSummaryText = `[Attachment: ${fileName}]` + (text ? ` ${text}` : '');
    } else {
      if (!sentSummaryText) {
        return res.status(400).json({ error: 'Please enter a message or attach a file.' });
      }
      await sendAndStoreMessage(sock, targetChatId, { text: sentSummaryText });
    }

    const phone = targetChatId.split('@')[0].replace(/[^0-9]/g, '');
    const cleanPhone = db.normalizeIndianPhone(phone);
    const canonicalChatId = (cleanPhone && cleanPhone.length >= 10) ? `${cleanPhone}@s.whatsapp.net` : targetChatId;

    await db.logMessage(canonicalChatId, agentName || 'CRM Agent', 'agent', sentSummaryText);
    await db.upsertChat(canonicalChatId, null, cleanPhone, sentSummaryText, false);

    io.emit('new-message', {
      chat_id: canonicalChatId,
      sender_name: agentName || 'CRM Agent',
      sender_type: 'agent',
      text: sentSummaryText,
      timestamp: new Date().toISOString()
    });
    if (decodedChatId !== canonicalChatId) {
      io.emit('new-message', {
        chat_id: decodedChatId,
        sender_name: agentName || 'CRM Agent',
        sender_type: 'agent',
        text: sentSummaryText,
        timestamp: new Date().toISOString()
      });
    }

    res.json({ success: true, message: 'Message sent successfully.' });
  } catch (err) {
    console.error('Error in /api/chats/:chatId/send:', err);
    res.status(500).json({ error: err.message });
  }
});

// Toggle Bot Auto-Reply for specific Chat
app.post('/api/chats/:chatId/toggle-bot', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { enabled } = req.body;
    const decodedChatId = decodeURIComponent(chatId);

    await db.setAutoReply(decodedChatId, enabled);
    io.emit('chat-updated', { chat_id: decodedChatId, auto_reply_enabled: enabled ? 1 : 0 });

    res.json({ success: true, auto_reply_enabled: enabled });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Bot Config Endpoints
app.get(['/api/config', '/api/bot/config'], async (req, res) => {
  try {
    const config = await db.getBotConfig();
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post(['/api/config', '/api/bot/config'], async (req, res) => {
  try {
    const configData = req.body;
    for (const [key, val] of Object.entries(configData)) {
      await db.updateBotConfig(key, String(val));
    }
    const updated = await db.getBotConfig();
    res.json({ success: true, config: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test Gemini AI Connection & Prompt
app.post('/api/test-ai', async (req, res) => {
  try {
    const { apiKey, model, systemPrompt, testMessage } = req.body;
    const currentConfig = await db.getBotConfig();
    const keyToUse = apiKey || currentConfig.GEMINI_API_KEY;
    const modelToUse = model || currentConfig.AI_MODEL || 'gemini-3.5-flash-lite';
    const promptToUse = systemPrompt || currentConfig.AI_SYSTEM_PROMPT || 'You are the official Academic Counselor for Helix BioFast Labs Pvt. Ltd.';
    const userMsg = testMessage || 'Hello, what courses do you offer for 15 days?';

    if (!keyToUse) {
      return res.status(400).json({ success: false, error: 'Gemini API key is required.' });
    }

    const payload = {
      system_instruction: { parts: [{ text: promptToUse }] },
      contents: [{ role: 'user', parts: [{ text: userMsg }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }
    };

    const modelsToTry = [
      modelToUse,
      'gemini-3.5-flash-lite',
      'gemini-flash-lite-latest'
    ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

    let lastError = null;
    for (const currentModel of modelsToTry) {
      try {
        console.log(`Testing Gemini API with model: ${currentModel}...`);
        const apiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${keyToUse}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(20000)
        });

        const data = await apiRes.json().catch(() => ({}));
        if (!apiRes.ok) {
          lastError = data.error?.message || `Model ${currentModel} returned status ${apiRes.status}`;
          console.warn(`Model ${currentModel} error:`, lastError);
          continue;
        }

        let reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (reply) {
          reply = reply.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/\*/g, '');
          return res.json({ success: true, reply, model: currentModel });
        }
      } catch (err) {
        lastError = err.message;
        console.warn(`Model ${currentModel} failed:`, err.message);
      }
    }

    res.status(500).json({ success: false, error: lastError || 'Gemini API request failed' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// DRIP CAMPAIGN ENDPOINTS
// ----------------------------------------------------

app.get('/api/drip/status', async (req, res) => {
  try {
    const config = await db.getBotConfig();
    const isEnabled = config && config.DRIP_ENABLED !== '0';
    const stats = await db.getDripStats();
    const pausedRow = await db.get("SELECT COUNT(*) as count FROM drip_subscribers WHERE status = 'paused'");
    const totalRow = await db.get("SELECT COUNT(*) as count FROM drip_subscribers");
    const campaignCounts = await db.all(
      "SELECT campaign_type, status, COUNT(*) as count FROM drip_subscribers GROUP BY campaign_type, status"
    );
    res.json({
      success: true,
      enabled: isEnabled,
      activeSubscribers: stats.activeSubscribers || 0,
      pausedSubscribers: pausedRow?.count || 0,
      totalSubscribers: totalRow?.count || 0,
      campaignCounts: campaignCounts || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/drip/stop-all', async (req, res) => {
  try {
    console.log('🛑 [DRIP API] Stopping all drip campaigns per user request...');
    await db.updateBotConfig('DRIP_ENABLED', '0');
    const result = await db.pauseAllActiveDripSubscribers();
    io.emit('drip-updated');
    io.emit('drip-status-changed', { enabled: false });
    res.json({
      success: true,
      enabled: false,
      message: 'All drip campaigns have been successfully stopped.',
      pausedCount: result.changes || 0
    });
  } catch (err) {
    console.error('Error stopping all drip campaigns:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/drip/resume-all', async (req, res) => {
  try {
    console.log('▶️ [DRIP API] Resuming all drip campaigns per user request...');
    await db.updateBotConfig('DRIP_ENABLED', '1');
    const result = await db.resumeAllPausedDripSubscribers();
    io.emit('drip-updated');
    io.emit('drip-status-changed', { enabled: true });
    res.json({
      success: true,
      enabled: true,
      message: 'All drip campaigns have been successfully resumed.',
      resumedCount: result.changes || 0
    });
  } catch (err) {
    console.error('Error resuming all drip campaigns:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/drip/stats', async (req, res) => {
  try {
    const stats = await db.getDripStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/drip/subscribers', async (req, res) => {
  try {
    const subscribers = await db.getDripSubscribers(req.query.status);
    res.json(subscribers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/lab-visits', async (req, res) => {
  try {
    const students = await db.getLabVisitStudents();
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/call-inquiries', async (req, res) => {
  try {
    const students = await db.getCallInquiryStudents();
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/drip/logs', async (req, res) => {
  try {
    const logs = await db.getDripLogs(Number(req.query.limit) || 50);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/drip/templates', async (req, res) => {
  try {
    const templates = await db.getDripTemplates(req.query.type);
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/drip/templates/:id', async (req, res) => {
  try {
    const { title, message } = req.body;
    await db.updateDripTemplate(req.params.id, title, message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/drip/subscribers/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    await db.updateDripSubscriberStatus(req.params.id, status);
    io.emit('drip-updated');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/drip/subscribers/:id', async (req, res) => {
  try {
    const result = await db.deleteDripSubscriber(req.params.id);
    io.emit('drip-updated');
    res.json({ success: true, changes: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/drip/subscribers/:id/delete', async (req, res) => {
  try {
    const result = await db.deleteDripSubscriber(req.params.id);
    io.emit('drip-updated');
    res.json({ success: true, changes: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/drip/subscribers/:id/restore', async (req, res) => {
  try {
    const result = await db.restoreDripSubscriber(req.params.id);
    io.emit('drip-updated');
    res.json({ success: true, changes: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/drip/subscribers/:id/send-now', async (req, res) => {
  try {
    const { id } = req.params;
    const subscribers = await db.getDripSubscribers();
    const sub = subscribers.find(s => String(s.id) === String(id));
    if (!sub) return res.status(404).json({ error: 'Subscriber not found' });
    if (sub.status === 'deleted') {
      return res.status(400).json({ error: 'This student was deleted from drip campaigns. Restore them first before sending.' });
    }

    if (!sock || !connected) {
      return res.status(400).json({ error: 'WhatsApp is not connected! Please scan QR code.' });
    }

    const nextStep = sub.current_step + 1;
    if (nextStep > 6) {
      return res.status(400).json({ error: 'All 6 drip messages have already been sent.' });
    }

    const templates = await db.getDripTemplates(sub.campaign_type);
    const template = templates.find(t => t.day_number === nextStep && t.active === 1);
    if (!template) {
      return res.status(400).json({ error: `No template found for Day ${nextStep}` });
    }

    // Normalize phone with country code 91
    const cleanPhone = db.normalizeIndianPhone(sub.phone || sub.chat_id);
    const targetChatId = cleanPhone.includes('@') ? cleanPhone : cleanPhone + '@s.whatsapp.net';

    // Generate tailored message focused on the student's program and counselor notes
    const messageText = await generateTailoredDripMessage(sub, nextStep, template);

    console.log(`📤 [SEND NOW] Sending Day ${nextStep} to ${targetChatId} (${sub.name})...`);
    await sendAndStoreMessage(sock, targetChatId, { text: messageText });

    await db.logMessage(targetChatId, 'Helix Bot', 'bot', messageText);
    await db.upsertChat(targetChatId, sub.name, cleanPhone, messageText, false);
    await db.logDripMessage(sub.id, targetChatId, sub.name, cleanPhone, sub.campaign_type, nextStep, messageText, 'sent');

    const isCompleted = nextStep >= 6;
    await db.advanceDripSubscriber(sub.id, nextStep, 24, isCompleted);

    io.emit('new-message', {
      chat_id: targetChatId,
      sender_name: 'Helix Bot',
      sender_type: 'bot',
      text: messageText,
      timestamp: new Date().toISOString()
    });
    io.emit('drip-updated');

    res.json({ success: true, daySent: nextStep, isCompleted, messageText });
  } catch (err) {
    console.error('❌ Error in /api/drip/subscribers/:id/send-now:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Reset Subscriber Step to allow re-testing or re-running sequence
app.post('/api/drip/subscribers/:id/reset', async (req, res) => {
  try {
    const { id } = req.params;
    const step = Number(req.body.step) || 0;
    await db.resetDripSubscriberStep(id, step);
    io.emit('drip-updated');
    res.json({ success: true, message: `Subscriber reset to step ${step}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register Walk-in Lab Visit Student & Start Drip Sequence
app.post('/api/drip/lab-visit', async (req, res) => {
  try {
    const { name, phone, visitDate, notes } = req.body;
    const courseInterest = req.body.courseInterest || req.body.course || 'General';

    if (!name || !phone) {
      return res.status(400).json({ error: 'Student name and WhatsApp phone number are required.' });
    }

    const result = await db.registerLabVisitStudent(name, phone, courseInterest, visitDate, notes);
    syncLeadToGoogleSheet({ id: result.leadId, name, phone, category: courseInterest, status: 'Contacted', notes, created_at: new Date().toISOString() });
    io.emit('drip-updated');
    io.emit('leads-updated');
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register Call Inquiry Student & Start Drip Sequence
app.post('/api/drip/call-inquiry', async (req, res) => {
  try {
    const { name, phone, callDate, notes, campaignType, scheduleMode } = req.body;
    const courseInterest = req.body.courseInterest || req.body.course || 'General';

    if (!name || !phone) {
      return res.status(400).json({ error: 'Student name and WhatsApp phone number are required.' });
    }

    const result = await db.registerCallInquiryStudent(
      name,
      phone,
      courseInterest,
      callDate,
      notes,
      campaignType || 'inquiry',
      scheduleMode || 'tomorrow_morning'
    );

    syncLeadToGoogleSheet({
      id: result.leadId,
      name,
      phone,
      category: courseInterest,
      status: 'Contacted',
      notes: `[Call Inquiry] ${notes || ''}`,
      created_at: new Date().toISOString()
    });

    io.emit('drip-updated');
    io.emit('leads-updated');
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk Import Students to Drip Campaigns from Excel Sheet
app.post('/api/drip/import-excel', async (req, res) => {
  try {
    const { students, campaignType, scheduleMode } = req.body;

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: 'No student records provided for import.' });
    }

    const result = await db.importDripSubscribersBatch(
      students,
      campaignType || 'inquiry',
      scheduleMode || 'tomorrow_morning'
    );

    io.emit('drip-updated');
    io.emit('leads-updated');
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// CUSTOM CAMPAIGNS & BROADCASTS (WITH INSTANT CANCELLATION)
// ----------------------------------------------------

let activeCampaignId = null;
let campaignStopRequested = false;

async function sleepCancellable(ms) {
  const step = 200;
  let elapsed = 0;
  while (elapsed < ms) {
    if (campaignStopRequested) return;
    const chunk = Math.min(step, ms - elapsed);
    await new Promise(r => setTimeout(r, chunk));
    elapsed += chunk;
  }
}

async function dispatchCustomCampaign(campaignId, title, message, attachment, recipients, options = {}) {
  if (!sock || !connected) {
    console.warn(`⚠️ Cannot dispatch campaign #${campaignId}: WhatsApp is disconnected.`);
    await db.updateCampaignProgress(campaignId, 0, recipients.length, 'failed');
    io.emit('campaign-updated', { id: campaignId, status: 'failed' });
    return;
  }

  activeCampaignId = campaignId;
  campaignStopRequested = false;

  const speedMode = options.speedMode || (options.audienceType === 'leads' ? 'warm' : 'safe');
  console.log(`🚀 [CAMPAIGN #${campaignId}] Starting dispatch to ${recipients.length} recipients (Mode: ${speedMode})...`);
  let sentCount = 0;
  let failedCount = 0;

  for (let i = 0; i < recipients.length; i++) {
    // 0. Check if user requested to stop broadcast
    if (campaignStopRequested) {
      console.log(`🛑 [CAMPAIGN #${campaignId}] Broadcast HALTED by user. Sent: ${sentCount}/${recipients.length}, remaining cancelled.`);
      await db.updateCampaignProgress(campaignId, sentCount, failedCount, 'cancelled');
      io.emit('campaign-updated', { id: campaignId, status: 'cancelled', sentCount, failedCount });
      io.emit('campaign-progress', {
        campaignId,
        current: i,
        total: recipients.length,
        sent: sentCount,
        failed: failedCount,
        recipient: 'Broadcast stopped by user',
        status: 'cancelled'
      });
      activeCampaignId = null;
      campaignStopRequested = false;
      return;
    }

    // 0.1 Check if WhatsApp connection dropped midway
    if (!sock || !connected) {
      console.warn(`⚠️ [CAMPAIGN #${campaignId}] WhatsApp connection lost during broadcast at recipient ${i + 1}/${recipients.length}. Pausing campaign.`);
      await db.updateCampaignProgress(campaignId, sentCount, failedCount, 'paused');
      io.emit('campaign-updated', { id: campaignId, status: 'paused', sentCount, failedCount });
      io.emit('campaign-progress', {
        campaignId,
        current: i,
        total: recipients.length,
        sent: sentCount,
        failed: failedCount,
        recipient: 'Paused: WhatsApp disconnected',
        status: 'paused'
      });
      activeCampaignId = null;
      return;
    }

    const r = recipients[i];
    const rawPhone = r.phone || r;
    const studentName = r.name || 'Student';
    const cleanPhone = db.normalizeIndianPhone(rawPhone);

    if (!cleanPhone || cleanPhone.length < 10) {
      failedCount++;
      await db.logCampaignRecipient(campaignId, rawPhone, studentName, 'failed', 'Invalid phone number');
      continue;
    }

    const targetChatId = cleanPhone.includes('@') ? cleanPhone : cleanPhone + '@s.whatsapp.net';
    let personalizedMsg = (message || '').replace(/{name}/g, studentName);

    // Dynamic field replacement from rowData (e.g. {course}, {registration_no}, etc.)
    if (r && typeof r === 'object' && r.rowData && typeof r.rowData === 'object') {
      for (const [k, v] of Object.entries(r.rowData)) {
        if (!k) continue;
        const valStr = v !== null && v !== undefined ? String(v).trim() : '';
        const keyPattern = new RegExp('{' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '}', 'gi');
        personalizedMsg = personalizedMsg.replace(keyPattern, valStr);
        const normalizedKey = k.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const normPattern = new RegExp('{' + normalizedKey + '}', 'gi');
        personalizedMsg = personalizedMsg.replace(normPattern, valStr);
      }
    }

    personalizedMsg = personalizedMsg.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/\*/g, '');

    try {
      // 1. Human Typing Simulation: Send 'composing' presence for 3-5 seconds
      try {
        await sock.sendPresenceUpdate('composing', targetChatId);
        const typingDuration = Math.floor(Math.random() * 2000) + 3000; // 3000ms to 5000ms
        await sleepCancellable(typingDuration);
        await sock.sendPresenceUpdate('paused', targetChatId);
      } catch (presErr) {
        // Presence updates may silently fail for non-contacts; non-blocking
      }

      if (campaignStopRequested) {
        console.log(`🛑 [CAMPAIGN #${campaignId}] Broadcast HALTED during typing. Dispatched ${sentCount}/${recipients.length}.`);
        await db.updateCampaignProgress(campaignId, sentCount, failedCount, 'cancelled');
        io.emit('campaign-updated', { id: campaignId, status: 'cancelled', sentCount, failedCount });
        io.emit('campaign-progress', {
          campaignId,
          current: i,
          total: recipients.length,
          sent: sentCount,
          failed: failedCount,
          recipient: 'Broadcast stopped by user',
          status: 'cancelled'
        });
        activeCampaignId = null;
        campaignStopRequested = false;
        return;
      }

      // 2. Dispatch Media or Text Message
      if (attachment && (attachment.base64 || attachment.dataUrl)) {
        const rawBase64 = attachment.base64 || attachment.dataUrl;
        const base64Data = rawBase64.replace(/^data:[^;]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const mime = attachment.mimeType || attachment.type || '';
        const fileName = attachment.fileName || attachment.name || '';
        const isPdf = mime === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');

        if (isPdf) {
          await sendAndStoreMessage(sock, targetChatId, {
            document: buffer,
            mimetype: 'application/pdf',
            fileName: fileName || 'Helix_BioFast_Document.pdf',
            caption: personalizedMsg
          });
        } else {
          await sendAndStoreMessage(sock, targetChatId, {
            image: buffer,
            caption: personalizedMsg
          });
        }
      } else {
        await sendAndStoreMessage(sock, targetChatId, { text: personalizedMsg });
      }

      sentCount++;
      await db.logCampaignRecipient(campaignId, cleanPhone, studentName, 'sent', null);
      const attachLabel = attachment ? ` [Attachment: ${attachment.fileName || attachment.name || 'file'}]` : '';
      await db.logMessage(targetChatId, 'Helix Broadcast', 'bot', personalizedMsg + attachLabel);
      await db.upsertChat(targetChatId, studentName, cleanPhone, personalizedMsg, false);
      console.log(`✅ [CAMPAIGN #${campaignId}] Sent to ${studentName} (${cleanPhone}) [${i + 1}/${recipients.length}]`);
    } catch (sendErr) {
      failedCount++;
      console.error(`❌ [CAMPAIGN #${campaignId}] Failed to send to ${cleanPhone}:`, sendErr.message);
      await db.logCampaignRecipient(campaignId, cleanPhone, studentName, 'failed', sendErr.message);
    }

    // Update progress in DB and emit socket
    const isCompleted = (i + 1) >= recipients.length;
    const status = isCompleted ? 'completed' : 'in_progress';
    await db.updateCampaignProgress(campaignId, sentCount, failedCount, status);

    io.emit('campaign-progress', {
      campaignId,
      current: i + 1,
      total: recipients.length,
      sent: sentCount,
      failed: failedCount,
      recipient: `${studentName} (+${cleanPhone})`,
      status
    });

    if (!isCompleted) {
      // 3. Resting Cooldown Break every 10 messages (90-120 seconds) to avoid tripping automated spam heuristics
      if ((i + 1) % 10 === 0) {
        const restDuration = 90000 + Math.floor(Math.random() * 30000); // 90 to 120s
        const restSeconds = Math.round(restDuration / 1000);
        console.log(`⏳ [CAMPAIGN #${campaignId}] Batch of 10 completed (${i + 1}/${recipients.length}). Resting for ${restSeconds}s to protect WhatsApp account from automated filters...`);
        io.emit('campaign-progress', {
          campaignId,
          current: i + 1,
          total: recipients.length,
          sent: sentCount,
          failed: failedCount,
          recipient: `Resting break (${restSeconds}s)...`,
          status: 'resting',
          restSeconds
        });
        await sleepCancellable(restDuration);
      } else {
        // Safe randomized human delay: 15–25s in safe mode (excel/cold lists), 8–14s in warm mode
        const baseDelay = speedMode === 'warm' ? 8000 : 15000;
        const jitter = speedMode === 'warm' ? 6000 : 10000;
        const delay = Math.floor(Math.random() * jitter) + baseDelay;
        await sleepCancellable(delay);
      }

      if (campaignStopRequested) {
        console.log(`🛑 [CAMPAIGN #${campaignId}] Broadcast HALTED during delay. Sent: ${sentCount}/${recipients.length}.`);
        await db.updateCampaignProgress(campaignId, sentCount, failedCount, 'cancelled');
        io.emit('campaign-updated', { id: campaignId, status: 'cancelled', sentCount, failedCount });
        io.emit('campaign-progress', {
          campaignId,
          current: i + 1,
          total: recipients.length,
          sent: sentCount,
          failed: failedCount,
          recipient: 'Broadcast stopped by user',
          status: 'cancelled'
        });
        activeCampaignId = null;
        campaignStopRequested = false;
        return;
      }
    }
  }

  activeCampaignId = null;
  campaignStopRequested = false;
  console.log(`🎉 [CAMPAIGN #${campaignId}] Finished. Sent: ${sentCount}, Failed: ${failedCount}`);
  io.emit('campaign-updated', { id: campaignId, status: 'completed', sentCount, failedCount });
}

app.post('/api/campaigns/send', async (req, res) => {
  try {
    const { title, message, audienceType, numbers, leadCategory, leadStatus, facultyDepartment, facultyCollege, attachment, speedMode } = req.body;
    let recipients = req.body.recipients || [];

    if (!title || !message) {
      return res.status(400).json({ error: 'Campaign title and message are required.' });
    }

    if (audienceType === 'excel' || audienceType === 'file') {
      if (Array.isArray(req.body.recipients)) {
        recipients = req.body.recipients;
      }
    } else if (audienceType === 'faculties') {
      const faculties = await db.getFacultyAudience(facultyDepartment || 'All', facultyCollege || '');
      recipients = faculties.map(f => ({
        phone: f.phone,
        name: f.name || 'Professor'
      }));
    } else if (audienceType === 'contacts_all') {
      const contacts = await db.getContactsAudience(false);
      recipients = contacts.map(c => ({
        phone: c.phone,
        name: c.name || 'Friend'
      }));
    } else if (audienceType === 'contacts_saved') {
      const contacts = await db.getContactsAudience(true);
      recipients = contacts.map(c => ({
        phone: c.phone,
        name: c.name || 'Friend'
      }));
    } else if (audienceType === 'leads') {
      const cat = leadCategory === 'All' ? null : leadCategory;
      const st = leadStatus === 'All' ? null : leadStatus;
      const leads = await db.getLeads(st, cat);
      recipients = leads.map(l => ({
        phone: l.phone,
        name: l.name || 'Student'
      }));
    } else if (audienceType === 'lab_visits') {
      const labStudents = await db.getLabVisitStudents();
      recipients = labStudents.map(s => ({
        phone: s.phone,
        name: s.name || 'Student',
        course: s.category || '',
        notes: s.notes || ''
      }));
    } else if (audienceType === 'call_inquiries') {
      const callStudents = await db.getCallInquiryStudents();
      recipients = callStudents.map(s => ({
        phone: s.phone,
        name: s.name || 'Student',
        course: s.category || '',
        notes: s.notes || ''
      }));
    } else if (audienceType === 'custom') {
      if (Array.isArray(numbers)) {
        recipients = numbers.map(n => ({
          phone: n,
          name: 'Student'
        }));
      }
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'No matching recipients found for this campaign.' });
    }

    const attachPath = attachment ? (attachment.fileName || attachment.name || 'file') : null;
    const attachType = attachment ? (attachment.mimeType || attachment.type || 'media') : null;
    const attachName = attachment ? (attachment.fileName || attachment.name || 'file') : null;

    const campaignId = await db.createCustomCampaign(
      title,
      message,
      attachPath,
      attachType,
      attachName,
      audienceType || 'custom',
      recipients.length
    );

    // Run dispatch asynchronously so HTTP request returns immediately
    dispatchCustomCampaign(campaignId, title, message, attachment, recipients, { speedMode, audienceType }).catch(e => {
      console.error('Campaign background error:', e.message);
    });

    res.json({ success: true, campaignId, total: recipients.length, totalRecipients: recipients.length, message: 'Campaign started successfully.' });
  } catch (err) {
    console.error('❌ Error in /api/campaigns/send:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// COLLEGE FACULTIES DIRECTORY REST ENDPOINTS
// ----------------------------------------------------

app.get('/api/faculties', async (req, res) => {
  try {
    const { search, department } = req.query;
    const faculties = await db.getCollegeFaculties(search, department);
    res.json(faculties);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/faculties', async (req, res) => {
  try {
    const { faculty_name, college_name, phone } = req.body;
    if (!faculty_name || !college_name || !phone) {
      return res.status(400).json({ error: 'Faculty name, college name, and phone number are required.' });
    }
    const id = await db.addCollegeFaculty(req.body);
    io.emit('faculties-updated');
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/faculties/:id', async (req, res) => {
  try {
    await db.updateCollegeFaculty(req.params.id, req.body);
    io.emit('faculties-updated');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/faculties/:id', async (req, res) => {
  try {
    await db.deleteCollegeFaculty(req.params.id);
    io.emit('faculties-updated');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/export/faculties', async (req, res) => {
  try {
    const csv = await db.exportFacultiesToCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="helix_college_faculties.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// WHATSAPP CONTACTS DIRECTORY REST ENDPOINTS
// ----------------------------------------------------

app.get('/api/contacts', async (req, res) => {
  try {
    const search = req.query.search || '';
    const savedOnly = req.query.savedOnly === 'true' || req.query.savedOnly === '1';
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;

    const result = await db.getAllContacts(search, savedOnly, limit, offset);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/contacts/stats', async (req, res) => {
  try {
    const stats = await db.getContactsStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/export/contacts', async (req, res) => {
  try {
    const csv = await db.exportContactsToCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="whatsapp_contacts.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/campaigns', async (req, res) => {
  try {
    const campaigns = await db.getCustomCampaigns();
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/campaigns/:id/logs', async (req, res) => {
  try {
    const logs = await db.getCampaignLogs(req.params.id);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/campaigns/stop', async (req, res) => {
  try {
    campaignStopRequested = true;
    console.log(`🛑 [CAMPAIGN] Stop broadcast requested by user. Active campaign ID: ${activeCampaignId}`);
    if (activeCampaignId) {
      await db.updateCampaignProgress(activeCampaignId, null, null, 'cancelled');
      io.emit('campaign-updated', { id: activeCampaignId, status: 'cancelled' });
    }
    // Set all pending or in-progress custom campaigns to cancelled
    await db.run("UPDATE custom_campaigns SET status = 'cancelled' WHERE status = 'in_progress'");
    io.emit('campaign-stopped', { campaignId: activeCampaignId });
    io.emit('campaign-progress', {
      campaignId: activeCampaignId,
      status: 'cancelled',
      recipient: 'Broadcast stopped by user'
    });
    const haltedId = activeCampaignId;
    activeCampaignId = null;
    res.json({ success: true, message: 'Broadcast stopped successfully. No further messages will be sent.', campaignId: haltedId });
  } catch (err) {
    console.error('Error stopping campaign:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/campaigns/active', (req, res) => {
  res.json({
    active: !!activeCampaignId && !campaignStopRequested,
    campaignId: activeCampaignId
  });
});

// ----------------------------------------------------
// INSTITUTIONAL & COLLEGE WORKSHOP PORTAL
// ----------------------------------------------------

app.get('/api/institutions', async (req, res) => {
  try {
    const inquiries = await db.getInstitutionalInquiries();
    res.json(inquiries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/institutions', async (req, res) => {
  try {
    const { collegeName, contactPerson, designation, phone, email, estimatedStudents, topicInterest, mouStatus, notes } = req.body;
    if (!collegeName || !contactPerson || !phone) {
      return res.status(400).json({ error: 'College name, contact person, and phone number are required.' });
    }

    const id = await db.addInstitutionalInquiry(collegeName, contactPerson, designation, phone, email, estimatedStudents, topicInterest, mouStatus, notes);
    io.emit('institution-updated');
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/institutions/:id', async (req, res) => {
  try {
    const { mouStatus, notes } = req.body;
    await db.updateInstitutionalStatus(req.params.id, mouStatus, notes);
    io.emit('institution-updated');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/institutions/:id/send-proposal', async (req, res) => {
  try {
    const inquiries = await db.getInstitutionalInquiries();
    const inst = inquiries.find(i => String(i.id) === String(req.params.id));
    if (!inst) return res.status(404).json({ error: 'Institutional inquiry not found' });

    if (!sock || !connected) {
      return res.status(400).json({ error: 'WhatsApp is disconnected. Please scan QR code.' });
    }

    const cleanPhone = db.normalizeIndianPhone(inst.phone);
    const targetChatId = cleanPhone.includes('@') ? cleanPhone : cleanPhone + '@s.whatsapp.net';

    const proposalMsg =
      `Dear ${inst.contact_person || 'Faculty Coordinator'},\n\n` +
      `Thank you for connecting with Helix BioFast Labs Pvt. Ltd., Noida regarding practical biotechnology training and workshop collaboration for students at ${inst.college_name || 'your institution'}.\n\n` +
      `We specialize in faculty-student hands-on laboratory workshops, value-added skill courses, and MoU-based academic partnerships covering:\n` +
      `• Molecular Biology & PCR Diagnostics\n` +
      `• Industrial Microbiology & GLP Compliance\n` +
      `• Animal Cell Culture & Applied Immunology\n` +
      `• B.Sc / M.Sc Student Dissertation & Project Training\n\n` +
      `Our Academic Director is pleased to coordinate with your department regarding curriculum alignment, laboratory batch dates, and student group fee concessions.\n\n` +
      `🌐 Review our lab facility and programs:\n` +
      `https://www.helixbiofastlabs.com\n\n` +
      `📞 Academic Coordinator: +91 8383897225\n` +
      `📧 biofastlabs@gmail.com\n\n` +
      `Helix BioFast Labs Pvt. Ltd., Noida`;

    await sendAndStoreMessage(sock, targetChatId, { text: proposalMsg });
    await db.logMessage(targetChatId, 'Helix Bot', 'bot', proposalMsg);
    await db.upsertChat(targetChatId, inst.contact_person, cleanPhone, proposalMsg, false);

    res.json({ success: true, message: 'Institutional proposal sent successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// DAILY TEAM MORNING DIGEST
// ----------------------------------------------------

async function sendMorningDigestToTeam() {
  if (!sock || !connected) {
    console.warn('⚠️ Cannot send morning digest: WhatsApp is not connected.');
    return { success: false, error: 'WhatsApp disconnected' };
  }

  const config = await db.getBotConfig();
  const rawStaff = config.STAFF_PHONE || config.ADMIN_PHONE;
  const rawCounselor = config.COUNSELOR_PHONE;
  const rawDirector = config.DIRECTOR_PHONE;

  const targetPhones = [rawStaff, rawCounselor, rawDirector]
    .map(p => db.normalizeIndianPhone(p))
    .filter(p => p && p.length >= 10);

  // Remove duplicates
  const uniquePhones = [...new Set(targetPhones)];

  if (uniquePhones.length === 0) {
    console.warn('⚠️ No staff, counselor, or director phone numbers configured for morning digest.');
    return { success: false, error: 'No team phone numbers configured in Settings' };
  }

  const digestText = await db.getMorningDigestData();
  const sentNumbers = [];

  for (const phone of uniquePhones) {
    const jid = phone.includes('@') ? phone : phone + '@s.whatsapp.net';
    try {
      await sendAndStoreMessage(sock, jid, { text: digestText });
      sentNumbers.push(phone);
      console.log(`☀️ [MORNING DIGEST] Sent to ${phone}`);
    } catch (e) {
      console.error(`❌ Failed to send digest to ${phone}:`, e.message);
    }
  }

  return { success: true, sentTo: sentNumbers };
}

app.post('/api/digest/send-now', async (req, res) => {
  try {
    const result = await sendMorningDigestToTeam();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// GOOGLE SHEETS LIVE SYNC & DATA EXPORTS
// ----------------------------------------------------

async function syncLeadToGoogleSheet(lead) {
  try {
    const config = await db.getBotConfig();
    const sheetUrl = config.GOOGLE_SHEET_URL;
    if (!sheetUrl || !sheetUrl.startsWith('http')) return;

    await fetch(sheetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sync_lead',
        timestamp: new Date().toISOString(),
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        category: lead.category,
        qualification: lead.qualification,
        status: lead.status,
        notes: lead.notes,
        created_at: lead.created_at
      })
    });
    console.log(`📊 Lead synced to Google Sheet: ${lead.name}`);
  } catch (err) {
    console.warn('Google Sheet sync error:', err.message);
  }
}

app.post('/api/sync/google-sheets/all', async (req, res) => {
  try {
    const config = await db.getBotConfig();
    const sheetUrl = config.GOOGLE_SHEET_URL;
    if (!sheetUrl || !sheetUrl.startsWith('http')) {
      return res.status(400).json({ error: 'Please configure a valid Google Sheet Webhook URL in Settings first.' });
    }

    const leads = await db.getLeads();
    await fetch(sheetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'bulk_sync',
        timestamp: new Date().toISOString(),
        total_leads: leads.length,
        leads: leads
      })
    });

    res.json({ success: true, message: `Synced ${leads.length} leads to Google Sheet.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/export/leads', async (req, res) => {
  try {
    const csv = await db.exportLeadsToCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=helix_leads_export.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).send('Error exporting leads CSV: ' + err.message);
  }
});

app.get('/api/export/chats', async (req, res) => {
  try {
    const csv = await db.exportChatsToCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=helix_chats_export.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).send('Error exporting chats CSV: ' + err.message);
  }
});

app.get('/api/export/drip-logs', async (req, res) => {
  try {
    const csv = await db.exportDripLogsToCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=helix_drip_logs_export.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).send('Error exporting drip logs CSV: ' + err.message);
  }
});

app.get('/api/export/lab-visits-csv', async (req, res) => {
  try {
    const csv = await db.exportLabVisitsToCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=helix_lab_visited_students.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).send('Error exporting lab visits CSV: ' + err.message);
  }
});

app.get('/api/export/call-inquiries-csv', async (req, res) => {
  try {
    const csv = await db.exportCallInquiriesToCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=helix_call_inquiry_students.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).send('Error exporting call inquiries CSV: ' + err.message);
  }
});

// ----------------------------------------------------
// BACKUP & GOOGLE DRIVE CLOUD SYNC ENDPOINTS
// ----------------------------------------------------
app.get('/api/backup/status', async (req, res) => {
  try {
    const config = await db.getBotConfig();
    const driveUrl = config.GOOGLE_DRIVE_BACKUP_URL || config.GOOGLE_DRIVE_URL || '';
    const lastBackupTime = config.LAST_BACKUP_TIME || null;
    res.json({
      success: true,
      driveUrl,
      googleDriveUrl: driveUrl,
      lastBackupTime
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/backup/save-link', async (req, res) => {
  try {
    const driveUrl = req.body.googleDriveUrl || req.body.driveUrl || '';
    await db.updateBotConfig('GOOGLE_DRIVE_BACKUP_URL', (driveUrl || '').trim());
    res.json({ success: true, driveUrl: (driveUrl || '').trim(), googleDriveUrl: (driveUrl || '').trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/backup/export', async (req, res) => {
  try {
    const backupData = await db.generateFullBackupData();
    const nowIso = new Date().toISOString();
    await db.updateBotConfig('LAST_BACKUP_TIME', nowIso);

    const dateStr = nowIso.split('T')[0];
    const filename = `Helix_CRM_Complete_Backup_${dateStr}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(backupData, null, 2));
  } catch (err) {
    console.error('Error generating CRM backup:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// LOCAL NETWORK ACCESS INFO (OPEN ON ANY COMPUTER BROWSER)
// ----------------------------------------------------
let activeListeningPort = Number(CONFIG.PORT) || 3000;

function getNetworkIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

app.get('/api/network-info', (req, res) => {
  try {
    const ips = getNetworkIpAddresses();
    const networkUrls = ips.map(ip => `http://${ip}:${activeListeningPort}`);
    res.json({
      success: true,
      port: activeListeningPort,
      localUrl: `http://localhost:${activeListeningPort}`,
      primaryNetworkUrl: networkUrls[0] || `http://localhost:${activeListeningPort}`,
      networkUrls: networkUrls
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// BOT DISCONNECT / RE-LINK NEW WHATSAPP NUMBER
// ----------------------------------------------------
app.get('/api/bot/status', (req, res) => {
  res.json({ connected, qrData });
});

app.post('/api/bot/disconnect', async (req, res) => {
  try {
    console.log('\n🔄 [BOT] Disconnecting WhatsApp session upon user request...');
    connected = false;
    qrData = null;
    io.emit('bot-status', { connected: false, qrData: null });

    try {
      await db.pauseAllActiveDripSubscribers();
    } catch (pauseErr) {
      console.error('Note: Error pausing active drip subscribers on disconnect:', pauseErr.message);
    }

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    if (sock) {
      try {
        sock.ev.removeAllListeners();
        await sock.logout();
      } catch (err) {
        console.log('Note: Socket logout:', err.message);
      }
      try {
        sock.end();
      } catch (err) {}
      sock = null;
    }

    // Clean up .session directory
    const sessionDir = path.join(__dirname, '.session');
    if (fs.existsSync(sessionDir)) {
      try {
        fs.rmSync(sessionDir, { recursive: true, force: true });
        console.log('🗑️ Previous WhatsApp .session removed.');
      } catch (rmErr) {
        console.error('Error removing .session directory:', rmErr.message);
      }
    }

    // Start bot fresh to generate a new QR barcode
    scheduleRestart(io, 1500);

    res.json({ success: true, message: 'WhatsApp disconnected successfully. Generating new QR barcode...' });
  } catch (err) {
    console.error('Error disconnecting WhatsApp:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// OFFICIAL INFORMATION BROCHURE (PDF) ENDPOINTS
// ----------------------------------------------------

app.get('/api/bot/brochure', (req, res) => {
  try {
    const brochurePath = path.join(__dirname, 'public', 'Helix_BioFast_Information_Brochure.pdf');
    if (fs.existsSync(brochurePath)) {
      const stat = fs.statSync(brochurePath);
      res.json({
        exists: true,
        fileName: 'Helix_BioFast_Information_Brochure.pdf',
        fileSize: stat.size,
        lastModified: stat.mtime,
        url: '/Helix_BioFast_Information_Brochure.pdf'
      });
    } else {
      res.json({ exists: false, fileName: 'Helix_BioFast_Information_Brochure.pdf' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bot/brochure/upload', (req, res) => {
  try {
    const { fileData } = req.body;
    if (!fileData) {
      return res.status(400).json({ success: false, error: 'No file data provided' });
    }

    // Extract base64 content
    let base64Data = fileData;
    if (base64Data.includes(',')) {
      base64Data = base64Data.split(',')[1];
    }

    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length === 0) {
      return res.status(400).json({ success: false, error: 'Empty file buffer' });
    }

    const brochurePath = path.join(__dirname, 'public', 'Helix_BioFast_Information_Brochure.pdf');
    fs.writeFileSync(brochurePath, buffer);
    console.log(`📄 [BROCHURE UPLOADED] New Information Brochure PDF saved (${buffer.length} bytes)`);

    res.json({
      success: true,
      message: 'Information Brochure PDF uploaded and saved successfully.',
      fileSize: buffer.length,
      fileName: 'Helix_BioFast_Information_Brochure.pdf'
    });
  } catch (err) {
    console.error('Error uploading brochure:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/bot/brochure/send', async (req, res) => {
  try {
    const { phone, chatId } = req.body;
    if (!phone && !chatId) {
      return res.status(400).json({ success: false, error: 'Please provide a recipient phone number or chatId' });
    }

    if (!sock || !connected) {
      return res.status(400).json({ success: false, error: 'WhatsApp is disconnected. Please scan QR barcode first.' });
    }

    const brochurePath = path.join(__dirname, 'public', 'Helix_BioFast_Information_Brochure.pdf');
    if (!fs.existsSync(brochurePath)) {
      return res.status(404).json({ success: false, error: 'No Information Brochure PDF found on server. Please upload one first.' });
    }

    let targetChatId = null;
    let cleanPhone = null;

    if (phone) {
      cleanPhone = db.normalizeIndianPhone(phone);
      targetChatId = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@s.whatsapp.net`;
    } else if (chatId) {
      if (chatId.endsWith('@s.whatsapp.net')) {
        targetChatId = chatId;
        cleanPhone = chatId.split('@')[0].replace(/[^0-9]/g, '');
      } else if (chatId.endsWith('@lid')) {
        const resolvedPhone = lidToPhoneMap.get(chatId);
        if (resolvedPhone) {
          cleanPhone = db.normalizeIndianPhone(resolvedPhone);
          targetChatId = `${cleanPhone}@s.whatsapp.net`;
        } else {
          targetChatId = chatId;
        }
      } else {
        cleanPhone = db.normalizeIndianPhone(chatId);
        targetChatId = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@s.whatsapp.net`;
      }
    }

    console.log(`📤 Sending brochure on-demand to ${targetChatId}...`);
    const buf = fs.readFileSync(brochurePath);

    await sendAndStoreMessage(sock, targetChatId, {
      document: buf,
      fileName: 'Helix_BioFast_Information_Brochure.pdf',
      mimetype: 'application/pdf',
      caption: 'Helix BioFast Labs — Official Information Brochure\n\nFor technical training, skill up-gradation, building of new skills and innovative thinking in Biotechnology.\n\n📍 Lab Location: https://maps.app.goo.gl/M9BGxKCjPn4PDVrU8\n🌐 Website: https://www.helixbiofastlabs.com\n📞 Contact: +91-9717117289, +91-8383897225'
    });

    const logText = '[Sent PDF Document: Helix_BioFast_Information_Brochure.pdf]';
    await db.logMessage(targetChatId, 'Helix Bot', 'bot', logText);
    if (chatId && chatId !== targetChatId) {
      await db.logMessage(chatId, 'Helix Bot', 'bot', logText);
    }

    io.emit('new-message', {
      chat_id: chatId || targetChatId,
      sender_name: 'Helix Bot',
      sender_type: 'bot',
      text: logText,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `Official Information Brochure sent successfully to ${cleanPhone || targetChatId}`
    });
  } catch (err) {
    console.error('Error sending brochure on-demand:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Background Scheduler: Checks for Drip follow-ups and Morning Digest
let lastDigestDate = '';
setInterval(async () => {
  // 1. Process pending drip sequence follow-ups
  await processDripCampaigns(sock, io);

  // 2. Check Daily Morning Digest
  try {
    const nowIst = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit' });
    const todayIst = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });

    const config = await db.getBotConfig();
    const digestTime = config.DIGEST_TIME || '09:00';
    const isDigestEnabled = config.DIGEST_ENABLED !== '0';

    if (isDigestEnabled && nowIst === digestTime && lastDigestDate !== todayIst) {
      lastDigestDate = todayIst;
      console.log(`⏰ [CRON] Triggering scheduled Morning Digest at ${nowIst} IST...`);
      await sendMorningDigestToTeam();
    }
  } catch (e) {
    console.error('Digest scheduler check error:', e.message);
  }
}, 60000);

// Socket.IO Connection Event
io.on('connection', (socket) => {
  console.log('⚡ CRM Dashboard Web Socket Connected:', socket.id);
  socket.emit('bot-status', { connected, qrData });
});

// Start Server & Init DB with dynamic port fallback
function startListening(port) {
  activeListeningPort = port;
  server.listen(port, '0.0.0.0', async () => {
    const ips = getNetworkIpAddresses();
    console.log(`\n============================================================`);
    console.log(`🌐 HELIX WHATSAPP CRM DASHBOARD IS RUNNING!`);
    console.log(`💻 Local Computer:       http://localhost:${port}`);
    if (ips.length > 0) {
      console.log(`📱 Other Computers/WiFi: http://${ips[0]}:${port}`);
      ips.slice(1).forEach(ip => console.log(`                        http://${ip}:${port}`));
    }
    console.log(`============================================================\n`);

    await db.initDb();
    await preloadLidMap();
    await db.run("UPDATE custom_campaigns SET status = 'cancelled' WHERE status = 'in_progress'");
    console.log('🛡️ [SAFETY] Custom campaigns verified: Any interrupted broadcasts are marked cancelled and will NOT resume.');
    startBot(io);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️ Port ${port} is occupied, trying port ${port + 1}...`);
      startListening(port + 1);
    } else {
      console.error('Server error:', err.message);
    }
  });
}

startListening(Number(CONFIG.PORT) || 3000);
