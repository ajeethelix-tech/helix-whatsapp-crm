const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'crm_database.sqlite');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at', DB_PATH);
    db.run('PRAGMA journal_mode = WAL;');
    db.run('PRAGMA busy_timeout = 5000;');
    db.run('PRAGMA synchronous = NORMAL;');
  }
});

// Helper wrapper for async database operations
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Initialize tables
async function initDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT UNIQUE,
      name TEXT,
      phone TEXT,
      category TEXT DEFAULT 'General',
      qualification TEXT DEFAULT 'Not Specified',
      status TEXT DEFAULT 'New',
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    const lCols = await all(`PRAGMA table_info(leads)`);
    if (lCols && !lCols.some(c => c.name === 'talk_to_team')) {
      await run(`ALTER TABLE leads ADD COLUMN talk_to_team INTEGER DEFAULT 0`);
      await run(`ALTER TABLE leads ADD COLUMN talk_to_team_at DATETIME`);
    }
    // Backfill historical Option 6 choices
    await run(`
      UPDATE leads 
      SET talk_to_team = 1, 
          talk_to_team_at = COALESCE(
            (SELECT timestamp FROM messages WHERE chat_id = leads.chat_id AND (text = '6' OR text = '6.' OR LOWER(text) LIKE '%talk%team%' OR LOWER(text) = 'human') ORDER BY id DESC LIMIT 1),
            leads.created_at
          )
      WHERE chat_id IN (
        SELECT DISTINCT chat_id FROM messages 
        WHERE (sender_type = 'customer' AND (text = '6' OR text = '6.' OR LOWER(text) LIKE '%talk%team%' OR LOWER(text) = 'human'))
           OR (sender_type = 'bot' AND text LIKE '%Talk to Our Team%Please write a brief message%')
      ) AND (talk_to_team = 0 OR talk_to_team IS NULL)
    `);
  } catch (e) {}

  await run(`
    CREATE TABLE IF NOT EXISTS chats (
      chat_id TEXT PRIMARY KEY,
      name TEXT,
      phone TEXT,
      last_message TEXT,
      last_message_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      unread_count INTEGER DEFAULT 0,
      auto_reply_enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT,
      sender_name TEXT,
      sender_type TEXT, -- 'customer', 'bot', 'agent'
      text TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await run(`CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);`);
  await run(`CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);`);

  await run(`
    CREATE TABLE IF NOT EXISTS bot_config (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS baileys_store (
      id TEXT PRIMARY KEY,
      remote_jid TEXT,
      message_proto TEXT,
      text TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await run(`
    CREATE INDEX IF NOT EXISTS idx_baileys_store_jid ON baileys_store(remote_jid);
  `);

  // Auto-prune raw Baileys protobuf message store older than 14 days to prevent database bloat
  try {
    const pruneRes = await run("DELETE FROM baileys_store WHERE created_at < datetime('now', '-14 days')");
    if (pruneRes && pruneRes.changes > 0) {
      console.log(`🧹 [MAINTENANCE] Auto-pruned ${pruneRes.changes} old message cache records from baileys_store.`);
    }
  } catch (e) {}

  await run(`
    CREATE TABLE IF NOT EXISTS drip_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_type TEXT, -- 'inquiry', 'lab_visit'
      day_number INTEGER,
      title TEXT,
      message TEXT,
      active INTEGER DEFAULT 1
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS drip_subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT,
      name TEXT,
      phone TEXT,
      campaign_type TEXT DEFAULT 'inquiry', -- 'inquiry', 'lab_visit'
      current_step INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active', -- 'active', 'completed', 'paused', 'enrolled'
      next_run_at DATETIME,
      last_sent_at DATETIME,
      bot_phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await run(`CREATE INDEX IF NOT EXISTS idx_drip_pending ON drip_subscribers(status, next_run_at);`);
  await run(`CREATE INDEX IF NOT EXISTS idx_drip_sub_phone ON drip_subscribers(phone);`);
  await run(`CREATE INDEX IF NOT EXISTS idx_drip_sub_chat ON drip_subscribers(chat_id);`);

  try {
    const dCols = await all(`PRAGMA table_info(drip_subscribers)`);
    if (dCols && !dCols.some(c => c.name === 'bot_phone')) {
      await run(`ALTER TABLE drip_subscribers ADD COLUMN bot_phone TEXT`);
      await run(`UPDATE drip_subscribers SET bot_phone = '918383897225' WHERE bot_phone IS NULL`);
    }
  } catch (e) {}

  await run(`
    CREATE TABLE IF NOT EXISTS drip_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subscriber_id INTEGER,
      chat_id TEXT,
      name TEXT,
      phone TEXT,
      campaign_type TEXT,
      day_number INTEGER,
      message TEXT,
      status TEXT DEFAULT 'sent',
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS custom_campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      message TEXT,
      attachment_path TEXT,
      attachment_type TEXT,
      attachment_name TEXT,
      target_type TEXT,
      total_recipients INTEGER DEFAULT 0,
      sent_count INTEGER DEFAULT 0,
      failed_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS campaign_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER,
      phone TEXT,
      name TEXT,
      status TEXT DEFAULT 'sent',
      error TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS institutional_inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      college_name TEXT,
      contact_person TEXT,
      designation TEXT,
      phone TEXT,
      email TEXT,
      estimated_students INTEGER DEFAULT 0,
      topic_interest TEXT,
      mou_status TEXT DEFAULT 'In Discussion',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS college_faculties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      faculty_name TEXT NOT NULL,
      designation TEXT,
      college_name TEXT NOT NULL,
      department TEXT,
      phone TEXT NOT NULL,
      email TEXT,
      city TEXT,
      state TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      jid TEXT UNIQUE,
      name TEXT,
      notify_name TEXT,
      phone TEXT,
      is_saved INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await run(`CREATE INDEX IF NOT EXISTS idx_contacts_jid ON contacts(jid);`);
  await run(`CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);`);

  // Seed contacts from existing chats
  await run(`
    INSERT OR IGNORE INTO contacts (jid, name, notify_name, phone, is_saved, updated_at)
    SELECT
      chat_id,
      name,
      name,
      phone,
      CASE WHEN name IS NOT NULL AND name != '' THEN 1 ELSE 0 END,
      CURRENT_TIMESTAMP
    FROM chats
    WHERE chat_id NOT LIKE '%@g.us' AND chat_id NOT LIKE '%@broadcast' AND chat_id NOT LIKE '%@newsletter'
  `);

  // Default Bot Config Setup
  const defaultConfig = {
    ADMIN_PHONE: '918383897225@s.whatsapp.net',
    STAFF_PHONE: '918383897225',
    COUNSELOR_PHONE: '',
    DIRECTOR_PHONE: '',
    DIGEST_TIME: '09:00',
    DIGEST_ENABLED: '1',
    GOOGLE_SHEET_URL: '',
    BROCHURE_URL: 'https://www.helixbiofastlabs.com',
    AUTO_REPLY_GLOBAL: '1',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
    AI_ENABLED: '1',
    AI_MODEL: 'gemini-3.6-flash',
    AI_SYSTEM_PROMPT: `You are the official Academic Counselor and Admissions Representative for Helix BioFast Labs Pvt. Ltd. (Noida / Delhi NCR, India). Website: https://www.helixbiofastlabs.com.

CRITICAL FORMATTING & STYLE RULES:
- NO STARS: Do NOT use any asterisks or stars (* or **) anywhere in your message. Absolutely NO markdown bolding with stars. Write in clean, professional plain text.
- TONE: Strictly professional, academic, courteous, and well-structured.
- EMOJIS: Do NOT use too many emojis. Keep emojis very minimal (at most 1 or none).
- LINKS: ALWAYS attach the exact relevant official website page link at the end of the message so the student can check the detailed fee structure and syllabus.
- LANGUAGE: Understand and reply in the language/style the student used (English, Hindi, or Hinglish), maintaining a polite, professional tone.

1. VACANCY & JOB INQUIRIES (STRICT TWO-STEP FLOW):
- STEP 1 (Initial Inquiry): If someone asks about a job, vacancy, or hiring (e.g., "Sir koi vacancy hai kya lab mai", "Any job opening?", "Job chahiye"):
  Do NOT explain any courses or training programs yet, and do NOT ask for a CV yet.
  ONLY ask this simple question:
  "Hello. Thank you for reaching out to Helix BioFast Labs. Could you please let us know whether you are a fresher or do you have prior lab experience?"
- STEP 2 (Follow-up):
  * If the candidate replies that they are a FRESHER:
    Explain that Helix BioFast Labs offers an industry-oriented Job-Oriented Training Program designed to provide 100% hands-on lab skill training, industrial SOP/GLP exposure, and placement assistance to help freshers enter the industry.
    Share the link: https://www.helixbiofastlabs.com/job-oriented-training
    And ask them for their educational qualification (e.g., B.Sc, M.Sc, B.Tech).
  * If the candidate replies that they are EXPERIENCED:
    Politely ask them to share their updated Resume/CV along with their qualification and domain expertise for HR review.

2. FEE STRUCTURE POLICY (STRICT RULE):
- Do NOT quote final exact fee amounts directly in the chat.
- When a student asks about fees, first explain the available program structures/options.
- Determine which specific option or domain they are interested in.
- Direct the student to the relevant official website page where the detailed fee structure is published.

3. 1-MONTH (30-DAY) TRAINING INQUIRIES (CRITICAL RULE):
- ONLY if the student explicitly asks for "1 month", "one month", or "30 days" training or fee, explain that Helix BioFast Labs offers 3 distinct options for a 1-month duration:
  1. Option 1: 4 Modules of 7 Days (Short Term Training) - allows mastering 4 different specialized lab techniques.
     Fee and details link: https://www.helixbiofastlabs.com/short-term-biotechnology-training
  2. Option 2: 2 Modules of 15 Days (Advance Training Program) - deeper practical lab protocols and instrumentation across 2 subjects.
     Fee and details link: https://www.helixbiofastlabs.com/advance-biotech-training-programes
  3. Option 3: 1 Module of 30 Days (Industrial Training Program) - comprehensive industrial workflow, GLP/GMP, live experiments, and certification.
     Fee and details link: https://www.helixbiofastlabs.com/industrial-biotech-training-programs
  Ask the student: "Which of these 3 options best matches your interest?" and direct them to the appropriate link above to review the detailed fee structure.
- CRITICAL: DO NOT mention these 3 options if the student is asking about Short Term Training (7 days), Advance Training (15 days), or other courses!

4. PROGRAM DETAILS & OFFICIAL LINKS:
- Short Term Training (7-Day Modules):
  Master specific practical techniques (Microbiology, Molecular Biology, Medical Biotech, Food Biotech, Immunology, Cancer Biology, Animal Cell Culture, Bioinformatics).
  Link: https://www.helixbiofastlabs.com/short-term-biotechnology-training
- Advance Training Program (15-Day Modules):
  Advanced practical lab protocols, instrumentation, and troubleshooting.
  Link: https://www.helixbiofastlabs.com/advance-biotech-training-programes
- Industrial Biotech Training (30 Days / 45 Days):
  Hands-on industrial exposure, SOPs, GLP/GMP, live experiments, certification.
  Link: https://www.helixbiofastlabs.com/industrial-biotech-training-programs
- Job-Oriented Training Program:
  100% hands-on wet lab skills, SOP/GLP protocols, placement assistance for freshers.
  Link: https://www.helixbiofastlabs.com/job-oriented-training
- Projects and Dissertation (3 Months / 6 Months):
  For B.Sc., M.Sc., B.Tech, M.Tech students. Complete bench work, data analysis, publication support, thesis writing.
  Link: https://www.helixbiofastlabs.com/project-dissertation-training-in-biotechnology

5. CONTACT & LOCATION (STRICT):
- Laboratory Address: Helix BioFast Labs Pvt. Ltd., A-52, First Floor, Sector-2, Noida, G.B. Nagar, Uttar Pradesh - 201301 (Near Sector-15 Metro Station).
- Google Maps Location Link: https://maps.app.goo.gl/M9BGxKCjPn4PDVrU8
- WhatsApp / Phone: +91-9717117289, +91-8383897225
- Email: biofastlabs@gmail.com
- Website: https://www.helixbiofastlabs.com
- When anyone asks for location, address, where is the lab, how to reach, or Google Maps: ALWAYS provide the complete address, the exact Google Maps link (https://maps.app.goo.gl/M9BGxKCjPn4PDVrU8), and phone numbers.
- When anyone asks for brochure, information brochure, or PDF: Inform them that the official Information Brochure PDF is available, and provide the website link https://www.helixbiofastlabs.com.`,
    mainMenu: `Hello! 👋 Thank you for contacting Helix BioFast Labs Pvt. Ltd., Noida.

I can instantly help you with our training programs, fees, and services.

Please select:

1️⃣ Training Courses
2️⃣ Training Brochure (PDF)
3️⃣ Student Projects & Dissertation
4️⃣ PhD Assistance
5️⃣ Forensic Services
6️⃣ Talk to Our Team 👨‍🔬

Type the number (1-6) or ask your question directly. 😊`
  };

  for (const [key, val] of Object.entries(defaultConfig)) {
    const existing = await get('SELECT value FROM bot_config WHERE key = ?', [key]);
    if (!existing) {
      await run('INSERT INTO bot_config (key, value) VALUES (?, ?)', [key, val]);
    } else if (key === 'AI_SYSTEM_PROMPT' || key === 'mainMenu') {
      await run('UPDATE bot_config SET value = ? WHERE key = ?', [val, key]);
    }
  }

  // Default Drip Templates Setup (6 Days for Inquiry, 6 Days for Lab Visit)
  const existingTemplates = await all('SELECT COUNT(*) as count FROM drip_templates');
  if (!existingTemplates || existingTemplates[0].count === 0) {
    const defaultTemplates = [
      // INQUIRY DRIP (Students who inquired on WhatsApp)
      {
        type: 'inquiry',
        day: 1,
        title: 'Welcome & Program Overview',
        message: 'Hello {name}, thank you for contacting Helix BioFast Labs regarding our biotechnology and life sciences training programs.\n\nHave you had a chance to decide on your preferred subject or duration? Whether you are looking for short-term technique mastery, industrial internship, or dissertation bench work, we provide 100% hands-on laboratory experience.\n\nYou can review our program options here:\nhttps://www.helixbiofastlabs.com\n\nPlease let us know your educational background so our academic counselor can assist you with the syllabus.'
      },
      {
        type: 'inquiry',
        day: 2,
        title: 'Hands-On Wet Lab Infrastructure',
        message: 'Hello {name}, at Helix BioFast Labs, we believe that true scientific learning happens at the laboratory bench.\n\nEvery student receives dedicated hands-on access to modern equipment, including Thermal Cyclers (PCR), Gel Electrophoresis, Autoclaves, Laminar Air Flow hoods, and UV-Vis Spectrophotometers.\n\nWould you like to know more about the practical protocols covered in your chosen domain? Reply to this message and we will share the details.'
      },
      {
        type: 'inquiry',
        day: 3,
        title: 'Batch Schedule & Small Group Mentorship',
        message: 'Hello {name}, to ensure individual attention and thorough hands-on practical training, our laboratory batches are restricted to 8 to 10 candidates per batch.\n\nOur upcoming practical batches are currently open for registration. If you are planning to begin your training this month, we recommend reserving your slot early.\n\nPlease let us know your preferred start date so we can check seat availability.'
      },
      {
        type: 'inquiry',
        day: 4,
        title: 'Certification & Career Guidance',
        message: 'Hello {name}, upon successful completion of your training at Helix BioFast Labs, you will receive an industry-recognized Certificate of Practical Training.\n\nWe also assist students with resume enhancement, project report compilation, and interview preparation for research and industrial roles in biotechnology and pharma.\n\nFeel free to ask any questions regarding certification or project assistance.'
      },
      {
        type: 'inquiry',
        day: 5,
        title: 'Customized Module Options & University Alignment',
        message: 'Hello {name}, are you looking to align your training modules with your university curriculum or thesis requirements?\n\nOur senior research scientists can customize your module combination (such as Molecular Biology combined with Bioinformatics or Microbiology).\n\nYou can also speak directly with our academic coordinator at +91 8383897225 or reply to this message.'
      },
      {
        type: 'inquiry',
        day: 6,
        title: 'Final Batch Confirmation',
        message: 'Hello {name}, we are currently finalizing the candidate roster for our upcoming laboratory batches.\n\nIf you would like to confirm your registration or visit our facility in Noida before joining, please let us know today.\n\nWebsite: https://www.helixbiofastlabs.com\nHelpline: +91 8383897225'
      },

      // LAB VISIT DRIP (Students who visited the lab in person)
      {
        type: 'lab_visit',
        day: 1,
        title: 'Thank You for Visiting Our Laboratory',
        message: 'Hello {name}, thank you for visiting Helix BioFast Labs today. It was a pleasure meeting you in person and showing you our laboratory infrastructure.\n\nWe hope you gained a clear view of our hands-on wet lab facilities and scientific training programs.\n\nIf you have any questions regarding the modules or batches we discussed during your visit, please feel free to ask us here.'
      },
      {
        type: 'lab_visit',
        day: 2,
        title: 'Follow-up on Your Lab Visit & Program Selection',
        message: 'Hello {name}, following up on your visit to Helix BioFast Labs, have you finalized your preferred program (Short Term, Advance, Industrial, or Dissertation)?\n\nTo review detailed module structures and fees, you can check our official portal:\nhttps://www.helixbiofastlabs.com\n\nPlease let us know if you would like us to reserve a seat in your preferred batch.'
      },
      {
        type: 'lab_visit',
        day: 3,
        title: 'Confirming Your Practical Batch Slot',
        message: 'Hello {name}, following your lab visit, we are allocating bench slots and mentorship schedules for upcoming batches.\n\nSince bench slots are limited to ensure individual equipment access, please let us know your intended start date so we can confirm your seat.'
      },
      {
        type: 'lab_visit',
        day: 4,
        title: 'Detailed Practical Syllabus',
        message: 'Hello {name}, if you need a detailed day-wise syllabus or experimental protocol list for the subjects you discussed during your visit, please reply with the module name and we will provide it promptly.'
      },
      {
        type: 'lab_visit',
        day: 5,
        title: 'Registration & Admission Assistance',
        message: 'Hello {name}, we would be glad to assist you in completing your admission process for Helix BioFast Labs.\n\nYou can complete your registration or speak with our coordinator at +91 8383897225. We look forward to welcoming you to the lab.'
      },
      {
        type: 'lab_visit',
        day: 6,
        title: 'Final Follow-up from Helix BioFast Labs',
        message: 'Hello {name}, this is a final follow-up regarding your laboratory visit. If you need any flexibility in batch timings or have additional questions for our scientists, we are here to help.\n\nHelpline: +91 8383897225\nWebsite: https://www.helixbiofastlabs.com'
      }
    ];

    for (const t of defaultTemplates) {
      await run(
        'INSERT INTO drip_templates (campaign_type, day_number, title, message) VALUES (?, ?, ?, ?)',
        [t.type, t.day, t.title, t.message]
      );
    }
    console.log('✅ Default 6-day drip templates seeded successfully.');
  }

  // Seed Call Inquiry Drip Templates if not yet present
  const callTemplates = await all("SELECT COUNT(*) as count FROM drip_templates WHERE campaign_type = 'call_inquiry'");
  if (!callTemplates || callTemplates[0].count === 0) {
    const defaultCallTemplates = [
      {
        type: 'call_inquiry',
        day: 1,
        title: 'Thank You for Calling Helix BioFast Labs',
        message: 'Hello {name}, thank you for speaking with our academic counselor on call today regarding our biotechnology and life sciences training programs at Helix BioFast Labs.\n\nAs discussed over the call, we provide 100% hands-on laboratory practical experience on real bench instruments.\n\nYou can review our program details and syllabus options here:\nhttps://www.helixbiofastlabs.com\n\nFeel free to reply if you need any assistance with course modules or batch schedules.'
      },
      {
        type: 'call_inquiry',
        day: 2,
        title: 'Hands-On Equipment & Protocol Information',
        message: 'Hello {name}, following up on our telephonic discussion, would you like more details regarding our wet lab infrastructure and equipment access? We conduct individual hands-on protocols for PCR, Gel Electrophoresis, Tissue Culture, and Spectroscopy.\n\nReply here anytime to receive the module syllabus.'
      },
      {
        type: 'call_inquiry',
        day: 3,
        title: 'Confirming Your Practical Batch Slot',
        message: 'Hello {name}, our upcoming hands-on laboratory batches have limited seats (8-10 candidates per batch) to ensure dedicated equipment time. If you have finalized your preferred start date as discussed on call, please let us know so we can reserve your bench slot.'
      },
      {
        type: 'call_inquiry',
        day: 4,
        title: 'Certification & Career Guidance',
        message: 'Hello {name}, upon completing your training at Helix BioFast Labs, you will receive an industry-recognized Certificate of Practical Training, along with project report assistance and interview guidance for biotech & pharma roles.'
      },
      {
        type: 'call_inquiry',
        day: 5,
        title: 'Customized Module Options & Academic Guidance',
        message: 'Hello {name}, if you need customized module combinations or syllabus alignment with your university/college guidelines, our senior research mentors can tailor it for you. You can also connect with our coordinator at +91 8383897225.'
      },
      {
        type: 'call_inquiry',
        day: 6,
        title: 'Final Follow-up from Helix BioFast Labs',
        message: 'Hello {name}, this is a gentle follow-up regarding our call discussion about Helix BioFast Labs training. If you would like to confirm your registration or schedule an in-person visit to our facility before joining, please let us know today.\n\nWebsite: https://www.helixbiofastlabs.com\nHelpline: +91 8383897225'
      }
    ];

    for (const t of defaultCallTemplates) {
      await run(
        'INSERT INTO drip_templates (campaign_type, day_number, title, message) VALUES (?, ?, ?, ?)',
        [t.type, t.day, t.title, t.message]
      );
    }
    console.log('✅ Default 6-day call inquiry drip templates seeded successfully.');
  }

  console.log('✅ SQLite database schema initialized successfully.');
}

// ----------------------------------------------------
// DB HELPER METHODS
// ----------------------------------------------------

async function resolveCanonicalJidAndPhone(chatId, phoneHint = null) {
  let cleanPhone = phoneHint ? normalizeIndianPhone(phoneHint) : null;
  if (!cleanPhone && chatId && chatId.endsWith('@s.whatsapp.net')) {
    cleanPhone = normalizeIndianPhone(chatId.split('@')[0]);
  }
  if (!cleanPhone && chatId && chatId.endsWith('@lid')) {
    const contact = await get('SELECT phone FROM contacts WHERE jid = ? AND phone IS NOT NULL AND phone != ""', [chatId]);
    if (contact && contact.phone) {
      cleanPhone = normalizeIndianPhone(contact.phone);
    }
  }
  if (cleanPhone && cleanPhone.length >= 10) {
    return {
      canonicalJid: `${cleanPhone}@s.whatsapp.net`,
      phone: cleanPhone
    };
  }
  return {
    canonicalJid: chatId,
    phone: cleanPhone || (chatId ? chatId.split('@')[0] : '')
  };
}

async function upsertChat(chatId, name, phone, lastMessage, incrementUnread = false) {
  const { canonicalJid, phone: cleanPhone } = await resolveCanonicalJidAndPhone(chatId, phone);
  const existing = await get('SELECT * FROM chats WHERE chat_id = ?', [canonicalJid]);
  const now = new Date().toISOString();

  const isGarbage = (n) => !n || n === '~' || n === '.' || n === '-' || String(n).trim().length <= 1;
  let resolvedName = !isGarbage(name) ? String(name).trim() : null;

  if (!resolvedName && existing && !isGarbage(existing.name)) {
    resolvedName = existing.name;
  }
  if (!resolvedName && cleanPhone) {
    const cLog = await get('SELECT name FROM campaign_logs WHERE phone = ? AND name IS NOT NULL AND name != "" ORDER BY id DESC LIMIT 1', [cleanPhone]);
    if (cLog && !isGarbage(cLog.name)) resolvedName = cLog.name;
  }
  if (!resolvedName && cleanPhone) {
    const contact = await get('SELECT name, notify_name FROM contacts WHERE phone = ? ORDER BY is_saved DESC LIMIT 1', [cleanPhone]);
    if (contact && !isGarbage(contact.name)) resolvedName = contact.name;
    else if (contact && !isGarbage(contact.notify_name)) resolvedName = contact.notify_name;
  }
  const bestName = resolvedName || cleanPhone || canonicalJid;

  if (existing) {
    const unread = incrementUnread ? (existing.unread_count || 0) + 1 : existing.unread_count;
    const bestLastMsg = (lastMessage !== null && lastMessage !== undefined) ? lastMessage : existing.last_message;
    const bestTime = (lastMessage !== null && lastMessage !== undefined) ? now : (existing.last_message_time || existing.created_at || now);
    await run(
      `UPDATE chats SET name = ?, phone = COALESCE(?, phone), last_message = ?, last_message_time = ?, unread_count = ? WHERE chat_id = ?`,
      [bestName, cleanPhone || existing.phone, bestLastMsg, bestTime, unread, canonicalJid]
    );
  } else {
    await run(
      `INSERT INTO chats (chat_id, name, phone, last_message, last_message_time, unread_count, auto_reply_enabled) VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [canonicalJid, bestName, cleanPhone, lastMessage || 'Chat synchronized', now, incrementUnread ? 1 : 0]
    );
  }
}

async function logMessage(chatId, senderName, senderType, text) {
  const now = new Date().toISOString();
  const { canonicalJid } = await resolveCanonicalJidAndPhone(chatId);
  const res = await run(
    `INSERT INTO messages (chat_id, sender_name, sender_type, text, timestamp) VALUES (?, ?, ?, ?, ?)`,
    [canonicalJid, senderName, senderType, text, now]
  );
  return res.id;
}

async function saveBaileysMessage(id, remoteJid, messageProto, text) {
  if (!id) return;
  try {
    const protoStr = messageProto ? (typeof messageProto === 'object' ? JSON.stringify(messageProto) : String(messageProto)) : null;
    await run(
      `INSERT OR REPLACE INTO baileys_store (id, remote_jid, message_proto, text, created_at) VALUES (?, ?, ?, ?, datetime('now'))`,
      [id, remoteJid || null, protoStr, text || null]
    );
  } catch (e) {
    // Non-blocking
  }
}

async function getBaileysMessage(id) {
  if (!id) return null;
  try {
    return await get(`SELECT message_proto, text FROM baileys_store WHERE id = ?`, [id]);
  } catch (e) {
    return null;
  }
}

async function upsertLead(chatId, name, phone, category = 'General', qualification = 'Not Specified') {
  const { canonicalJid, phone: cleanPhone } = await resolveCanonicalJidAndPhone(chatId, phone);
  const last10 = cleanPhone ? cleanPhone.slice(-10) : '';
  const existing = await get(
    'SELECT * FROM leads WHERE chat_id = ? OR (phone IS NOT NULL AND phone != "" AND (phone = ? OR phone LIKE ?))',
    [canonicalJid, cleanPhone, last10 ? `%${last10}%` : '___NONE___']
  );
  const now = new Date().toISOString();

  const isGarbage = (n) => !n || n === '~' || n === '.' || n === '-' || String(n).trim().length <= 1;
  let resolvedName = !isGarbage(name) ? String(name).trim() : null;
  if (!resolvedName && existing && !isGarbage(existing.name)) {
    resolvedName = existing.name;
  }
  if (!resolvedName && cleanPhone) {
    const cLog = await get('SELECT name FROM campaign_logs WHERE phone = ? AND name IS NOT NULL AND name != "" ORDER BY id DESC LIMIT 1', [cleanPhone]);
    if (cLog && !isGarbage(cLog.name)) resolvedName = cLog.name;
  }
  const bestName = resolvedName || (existing ? existing.name : 'Student');

  if (existing) {
    let updatedCat = category !== 'General' ? category : existing.category;
    let updatedQual = qualification !== 'Not Specified' ? qualification : existing.qualification;
    await run(
      `UPDATE leads SET name = ?, phone = ?, category = ?, qualification = ?, chat_id = ?, updated_at = ? WHERE id = ?`,
      [bestName, cleanPhone || existing.phone, updatedCat, updatedQual, canonicalJid, now, existing.id]
    );
    return existing.id;
  } else {
    const res = await run(
      `INSERT INTO leads (chat_id, name, phone, category, qualification, status, notes) VALUES (?, ?, ?, ?, ?, 'New', '')`,
      [canonicalJid, bestName, cleanPhone, category, qualification]
    );
    return res.id;
  }
}

async function getLeads(statusFilter = null, categoryFilter = null, search = null) {
  let query = 'SELECT * FROM leads WHERE 1=1';
  const params = [];

  if (statusFilter && statusFilter !== 'All') {
    query += ' AND status = ?';
    params.push(statusFilter);
  }
  if (categoryFilter && categoryFilter !== 'All') {
    query += ' AND category = ?';
    params.push(categoryFilter);
  }
  if (search) {
    query += ' AND (name LIKE ? OR phone LIKE ? OR notes LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY updated_at DESC';
  return await all(query, params);
}

async function updateLeadStatus(id, status, notes = null, category = null, name = null, phone = null) {
  const now = new Date().toISOString();
  let query = 'UPDATE leads SET status = ?, updated_at = ?';
  const params = [status, now];

  if (notes !== null) {
    query += ', notes = ?';
    params.push(notes);
  }
  if (category !== null) {
    query += ', category = ?';
    params.push(category);
  }
  if (name !== null) {
    query += ', name = ?';
    params.push(name);
  }
  if (phone !== null) {
    query += ', phone = ?';
    params.push(phone);
  }

  query += ' WHERE id = ?';
  params.push(id);

  await run(query, params);

  // If phone or name changed, also synchronize with chats table
  const lead = await get('SELECT chat_id FROM leads WHERE id = ?', [id]);
  if (lead && lead.chat_id) {
    if (name || phone) {
      await run(
        'UPDATE chats SET name = COALESCE(?, name), phone = COALESCE(?, phone) WHERE chat_id = ?',
        [name, phone, lead.chat_id]
      );
    }
    // If student status is changed to Enrolled, immediately stop all active drip messages
    if (status === 'Enrolled') {
      await stopDripForChat(lead.chat_id);
    }
  }
}

async function updatePhoneForLid(lid, phone) {
  if (!lid || !phone) return;
  await run('UPDATE chats SET phone = ? WHERE chat_id = ?', [phone, lid]);
  await run('UPDATE leads SET phone = ? WHERE chat_id = ?', [phone, lid]);
}

async function getAllChats() {
  return await all(`
    SELECT c.*, MIN(m.timestamp) as first_message_time, COUNT(m.id) as msg_count 
    FROM chats c 
    LEFT JOIN messages m ON c.chat_id = m.chat_id 
    WHERE c.chat_id NOT LIKE '%@newsletter' AND c.chat_id NOT LIKE '%@broadcast' AND c.chat_id NOT LIKE '%@g.us'
    GROUP BY c.chat_id 
    ORDER BY c.last_message_time DESC
  `);
}

async function getChatMessages(chatId) {
  // Clear unread count when fetching messages
  await run('UPDATE chats SET unread_count = 0 WHERE chat_id = ?', [chatId]);

  let phone = null;
  const chat = await get('SELECT phone FROM chats WHERE chat_id = ?', [chatId]);
  if (chat && chat.phone) {
    phone = normalizeIndianPhone(chat.phone);
  } else if (chatId.includes('@s.whatsapp.net')) {
    phone = normalizeIndianPhone(chatId.split('@')[0]);
  }

  if (phone && phone.length >= 10) {
    const canonicalJid = `${phone}@s.whatsapp.net`;
    const contact = await get('SELECT jid FROM contacts WHERE phone = ? AND jid LIKE "%@lid"', [phone]);
    const lidChat = await get('SELECT chat_id FROM chats WHERE phone = ? AND chat_id LIKE "%@lid"', [phone]);
    const lid = contact?.jid || lidChat?.chat_id;

    if (lid) {
      return await all(
        'SELECT * FROM messages WHERE chat_id IN (?, ?, ?) ORDER BY timestamp ASC, id ASC',
        [chatId, canonicalJid, lid]
      );
    } else {
      return await all(
        'SELECT * FROM messages WHERE chat_id IN (?, ?) ORDER BY timestamp ASC, id ASC',
        [chatId, canonicalJid]
      );
    }
  }

  return await all('SELECT * FROM messages WHERE chat_id = ? ORDER BY timestamp ASC, id ASC', [chatId]);
}

async function setAutoReply(chatId, enabled) {
  return await run('UPDATE chats SET auto_reply_enabled = ? WHERE chat_id = ?', [enabled ? 1 : 0, chatId]);
}

async function getBotConfig() {
  const rows = await all('SELECT * FROM bot_config');
  const config = {};
  for (const r of rows) {
    config[r.key] = r.value;
  }
  return config;
}

async function updateBotConfig(key, value) {
  return await run('INSERT OR REPLACE INTO bot_config (key, value) VALUES (?, ?)', [key, value]);
}

async function getDashboardStats() {
  const totalLeads = await get('SELECT COUNT(*) as count FROM leads');
  const newLeads = await get("SELECT COUNT(*) as count FROM leads WHERE status = 'New'");
  const enrolledLeads = await get("SELECT COUNT(*) as count FROM leads WHERE status = 'Enrolled'");
  const inProgressLeads = await get("SELECT COUNT(*) as count FROM leads WHERE status = 'In Progress'");
  const talkToTeam = await get("SELECT COUNT(*) as count FROM leads WHERE talk_to_team = 1");
  const totalChats = await get("SELECT COUNT(*) as count FROM chats WHERE chat_id NOT LIKE '%@newsletter' AND chat_id NOT LIKE '%@broadcast' AND chat_id NOT LIKE '%@g.us'");
  const totalMessages = await get('SELECT COUNT(*) as count FROM messages');

  const categoryBreakdown = await all(
    'SELECT category, COUNT(*) as count FROM leads GROUP BY category ORDER BY count DESC'
  );

  const statusBreakdown = await all(
    'SELECT status, COUNT(*) as count FROM leads GROUP BY status ORDER BY count DESC'
  );

  return {
    totalLeads: totalLeads.count || 0,
    newLeads: newLeads.count || 0,
    enrolledLeads: enrolledLeads.count || 0,
    inProgressLeads: inProgressLeads.count || 0,
    talkToTeam: talkToTeam?.count || 0,
    totalChats: totalChats.count || 0,
    totalMessages: totalMessages.count || 0,
    categoryBreakdown,
    statusBreakdown
  };
}

async function markLeadTalkToTeam(chatId, note = null) {
  const now = new Date().toISOString();
  const lead = await get('SELECT id, notes FROM leads WHERE chat_id = ?', [chatId]);
  if (lead) {
    let updatedNotes = lead.notes || '';
    if (note && !updatedNotes.includes('[Talk to Team Request]')) {
      updatedNotes = `[Talk to Team Request on ${new Date().toLocaleDateString('en-IN')}] ${note}\n${updatedNotes}`.trim();
    }
    return await run(
      'UPDATE leads SET talk_to_team = 1, talk_to_team_at = ?, notes = ?, updated_at = ? WHERE id = ?',
      [now, updatedNotes, now, lead.id]
    );
  } else {
    const cleanPhone = normalizeIndianPhone(chatId.split('@')[0]);
    const leadId = await upsertLead(chatId, cleanPhone || 'Student', cleanPhone, 'Talk to Team');
    return await run(
      'UPDATE leads SET talk_to_team = 1, talk_to_team_at = ? WHERE id = ?',
      [now, leadId]
    );
  }
}

async function getTalkToTeamLeads() {
  const query = `
    SELECT 
      l.id,
      l.chat_id,
      COALESCE(l.name, 'Student') as name,
      COALESCE(l.phone, REPLACE(l.chat_id, '@s.whatsapp.net', '')) as phone,
      COALESCE(l.category, 'General') as category,
      COALESCE(l.status, 'New') as status,
      COALESCE(l.notes, '') as notes,
      COALESCE(l.talk_to_team_at, l.updated_at, l.created_at) as requested_at,
      (SELECT text FROM messages WHERE chat_id = l.chat_id AND sender_type = 'customer' ORDER BY id DESC LIMIT 1) as latest_message
    FROM leads l
    WHERE l.talk_to_team = 1
    ORDER BY requested_at DESC
  `;
  return await all(query);
}

async function updateLeadTalkToTeamStatus(leadId, newStatus, notes = null) {
  const now = new Date().toISOString();
  if (notes !== null) {
    return await run(
      'UPDATE leads SET status = ?, notes = ?, updated_at = ? WHERE id = ?',
      [newStatus, notes, now, leadId]
    );
  }
  return await run(
    'UPDATE leads SET status = ?, updated_at = ? WHERE id = ?',
    [newStatus, now, leadId]
  );
}

async function getRecentChatMessages(chatId, limit = 10) {
  let phone = null;
  const chat = await get('SELECT phone FROM chats WHERE chat_id = ?', [chatId]);
  if (chat && chat.phone) {
    phone = normalizeIndianPhone(chat.phone);
  } else if (chatId.includes('@s.whatsapp.net')) {
    phone = normalizeIndianPhone(chatId.split('@')[0]);
  }

  let rows;
  if (phone && phone.length >= 10) {
    const canonicalJid = `${phone}@s.whatsapp.net`;
    rows = await all(
      'SELECT sender_name, sender_type, text, timestamp FROM messages WHERE chat_id = ? OR chat_id = ? ORDER BY id DESC LIMIT ?',
      [chatId, canonicalJid, limit]
    );
  } else {
    rows = await all(
      'SELECT sender_name, sender_type, text, timestamp FROM messages WHERE chat_id = ? ORDER BY id DESC LIMIT ?',
      [chatId, limit]
    );
  }
  return (rows || []).reverse();
}

// ----------------------------------------------------
// DRIP CAMPAIGN METHODS
// ----------------------------------------------------

function normalizeIndianPhone(phone) {
  if (!phone) return '';
  let clean = String(phone).replace(/[^0-9]/g, '');
  if (clean.length === 10 && /^[6-9]/.test(clean)) {
    clean = '91' + clean;
  } else if (clean.length === 11 && clean.startsWith('0')) {
    clean = '91' + clean.slice(1);
  }
  return clean;
}

async function enrollInDrip(chatId, name, phone, campaignType = 'inquiry', delayHours = 24, botPhone = null, isIncomingChat = false) {
  const cleanPhone = normalizeIndianPhone(phone || chatId);
  const normalizedChatId = cleanPhone.includes('@') ? cleanPhone : cleanPhone + '@s.whatsapp.net';
  const nextRun = new Date(Date.now() + delayHours * 3600 * 1000).toISOString();

  let activeBotPhone = botPhone;
  if (!activeBotPhone) {
    try {
      const cfg = await get('SELECT value FROM bot_config WHERE key = "ACTIVE_BOT_PHONE"');
      activeBotPhone = cfg?.value || null;
    } catch (e) {}
  }

  let initialStatus = 'active';
  try {
    const dripCfg = await get('SELECT value FROM bot_config WHERE key = "DRIP_ENABLED"');
    if (dripCfg && dripCfg.value === '0') {
      initialStatus = 'paused';
    }
  } catch (e) {}

  // Check if subscriber already exists
  const existing = await get(
    'SELECT * FROM drip_subscribers WHERE (chat_id = ? OR phone = ?) AND campaign_type = ?',
    [normalizedChatId, cleanPhone, campaignType]
  );

  if (existing) {
    if (existing.status === 'enrolled') return existing.id;
    if (existing.status === 'deleted') {
      if (isIncomingChat) {
        // Contact was deleted, but student actively initiated a new chat! Re-enroll fresh into Day 1
        console.log(`♻️ [DRIP RE-ENROLL] Contact ${cleanPhone} previously deleted, but student started a new chat. Re-enrolling fresh into ${campaignType} drip sequence.`);
        await run(
          'UPDATE drip_subscribers SET status = ?, current_step = 0, next_run_at = ?, bot_phone = ? WHERE id = ?',
          [initialStatus, nextRun, activeBotPhone, existing.id]
        );
        return existing.id;
      } else {
        // Keep deleted: do not re-add via imports or manual registration until student chats again
        console.log(`🚫 [DRIP BLOCKED] Contact ${cleanPhone} is marked deleted. Skipping drip re-enrollment.`);
        return existing.id;
      }
    }
    return existing.id;
  } else {
    // If not existing in this campaign, verify if contact was deleted under ANY campaign
    if (!isIncomingChat) {
      const anyDeleted = await get(
        "SELECT id FROM drip_subscribers WHERE (chat_id = ? OR phone = ?) AND status = 'deleted'",
        [normalizedChatId, cleanPhone]
      );
      if (anyDeleted) {
        console.log(`🚫 [DRIP BLOCKED] Contact ${cleanPhone} was previously deleted from drip campaigns. Skipping enrollment.`);
        return anyDeleted.id;
      }
    }

    const res = await run(
      `INSERT INTO drip_subscribers (chat_id, name, phone, campaign_type, current_step, status, next_run_at, bot_phone)
       VALUES (?, ?, ?, ?, 0, ?, ?, ?)`,
      [normalizedChatId, name || cleanPhone, cleanPhone, campaignType, initialStatus, nextRun, activeBotPhone]
    );
    return res.id;
  }
}

async function getDripSubscribers(statusFilter = null) {
  let query = `
    SELECT s.*, l.category, l.notes as lead_notes, l.status as lead_status
    FROM drip_subscribers s
    LEFT JOIN leads l ON l.id = (SELECT id FROM leads WHERE chat_id = s.chat_id OR phone = s.phone ORDER BY id DESC LIMIT 1)
    WHERE 1=1
  `;
  const params = [];
  if (statusFilter && statusFilter !== 'all') {
    query += ' AND s.status = ?';
    params.push(statusFilter);
  }
  query += ' ORDER BY s.id DESC';
  return await all(query, params);
}

async function getDripLogs(limit = 50) {
  return await all(
    'SELECT * FROM drip_logs ORDER BY id DESC LIMIT ?',
    [limit]
  );
}

async function getDripTemplates(campaignType = null) {
  let query = 'SELECT * FROM drip_templates WHERE 1=1';
  const params = [];
  if (campaignType) {
    query += ' AND campaign_type = ?';
    params.push(campaignType);
  }
  query += ' ORDER BY campaign_type, day_number ASC';
  return await all(query, params);
}

async function updateDripTemplate(id, title, message) {
  return await run(
    'UPDATE drip_templates SET title = ?, message = ? WHERE id = ?',
    [title, message, id]
  );
}

async function updateDripSubscriberStatus(id, status) {
  return await run(
    'UPDATE drip_subscribers SET status = ? WHERE id = ?',
    [status, id]
  );
}

async function resetDripSubscriberStep(id, step = 0) {
  const now = new Date().toISOString();
  return await run(
    'UPDATE drip_subscribers SET current_step = ?, next_run_at = ?, status = ? WHERE id = ?',
    [step, now, 'active', id]
  );
}

async function stopDripForChat(chatId) {
  return await run(
    "UPDATE drip_subscribers SET status = 'enrolled' WHERE chat_id = ? AND status IN ('active', 'paused')",
    [chatId]
  );
}

async function deleteDripSubscriber(id) {
  const sub = await get('SELECT * FROM drip_subscribers WHERE id = ?', [id]);
  if (!sub) return { changes: 0 };
  const cleanPhone = sub.phone;
  const chatId = sub.chat_id;
  console.log(`🗑️ [DRIP DELETE] Contact ${cleanPhone || chatId} deleted from drip campaigns.`);
  return await run(
    "UPDATE drip_subscribers SET status = 'deleted', next_run_at = NULL WHERE id = ? OR (phone = ? AND phone IS NOT NULL AND phone != '') OR (chat_id = ? AND chat_id IS NOT NULL AND chat_id != '')",
    [id, cleanPhone, chatId]
  );
}

async function restoreDripSubscriber(id) {
  const now = new Date();
  const nextRun = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();
  let activeBotPhone = null;
  try {
    const cfg = await get('SELECT value FROM bot_config WHERE key = "ACTIVE_BOT_PHONE"');
    activeBotPhone = cfg?.value || null;
  } catch (e) {}

  console.log(`♻️ [DRIP RESTORE] Subscriber #${id} restored to active drip sequence.`);
  return await run(
    "UPDATE drip_subscribers SET status = 'active', current_step = 0, next_run_at = ?, bot_phone = ? WHERE id = ?",
    [nextRun, activeBotPhone, id]
  );
}

async function pauseSubscribersFromOldBot(oldBotPhone, newBotPhone) {
  console.log(`🔒 [ACCOUNT SWITCH] WhatsApp number changed from ${oldBotPhone || 'None'} to ${newBotPhone}. Pausing older drip subscribers.`);
  return await run(
    "UPDATE drip_subscribers SET status = 'paused' WHERE status = 'active' AND (bot_phone != ? OR bot_phone IS NULL)",
    [newBotPhone]
  );
}

async function pauseAllActiveDripSubscribers() {
  console.log('⏸️ [DRIP ENGINE] Pausing all active drip subscribers.');
  return await run(
    "UPDATE drip_subscribers SET status = 'paused' WHERE status = 'active'"
  );
}

async function resumeAllPausedDripSubscribers() {
  console.log('▶️ [DRIP ENGINE] Resuming all paused drip subscribers.');
  const restartTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  return await run(
    "UPDATE drip_subscribers SET status = 'active', next_run_at = CASE WHEN next_run_at IS NULL OR next_run_at < ? THEN ? ELSE next_run_at END WHERE status = 'paused'",
    [restartTime, restartTime]
  );
}

async function getPendingDripSubscribers(activeBotPhone = null) {
  const now = new Date().toISOString();
  if (activeBotPhone) {
    return await all(
      `SELECT s.*, l.category, l.notes as lead_notes, l.status as lead_status
       FROM drip_subscribers s
       LEFT JOIN leads l ON l.id = (SELECT id FROM leads WHERE chat_id = s.chat_id OR phone = s.phone ORDER BY id DESC LIMIT 1)
       WHERE s.status = 'active' AND s.next_run_at <= ? AND s.current_step < 6 AND s.bot_phone = ?`,
      [now, activeBotPhone]
    );
  }
  return await all(
    `SELECT s.*, l.category, l.notes as lead_notes, l.status as lead_status
     FROM drip_subscribers s
     LEFT JOIN leads l ON l.id = (SELECT id FROM leads WHERE chat_id = s.chat_id OR phone = s.phone ORDER BY id DESC LIMIT 1)
     WHERE s.status = 'active' AND s.next_run_at <= ? AND s.current_step < 6`,
    [now]
  );
}

async function advanceDripSubscriber(id, nextStep, delayHours = 24, isCompleted = false) {
  const now = new Date().toISOString();
  const nextRun = isCompleted ? null : new Date(Date.now() + delayHours * 3600 * 1000).toISOString();
  const status = isCompleted ? 'completed' : 'active';
  return await run(
    'UPDATE drip_subscribers SET current_step = ?, next_run_at = ?, last_sent_at = ?, status = ? WHERE id = ?',
    [nextStep, nextRun, now, status, id]
  );
}

async function logDripMessage(subscriberId, chatId, name, phone, campaignType, dayNumber, message, status = 'sent') {
  const now = new Date().toISOString();
  return await run(
    `INSERT INTO drip_logs (subscriber_id, chat_id, name, phone, campaign_type, day_number, message, status, sent_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [subscriberId, chatId, name, phone, campaignType, dayNumber, message, status, now]
  );
}

async function getDripStats() {
  const activeSubscribers = await get("SELECT COUNT(*) as count FROM drip_subscribers WHERE status = 'active'");
  const completedSubscribers = await get("SELECT COUNT(*) as count FROM drip_subscribers WHERE status IN ('completed', 'enrolled')");
  const todaySent = await get("SELECT COUNT(*) as count FROM drip_logs WHERE DATE(sent_at) = DATE('now')");
  const totalSent = await get("SELECT COUNT(*) as count FROM drip_logs");

  return {
    activeSubscribers: activeSubscribers.count || 0,
    completedSubscribers: completedSubscribers.count || 0,
    todaySent: todaySent.count || 0,
    totalSent: totalSent.count || 0
  };
}

async function registerLabVisitStudent(name, phone, courseInterest, visitDate, notes) {
  const cleanPhone = normalizeIndianPhone(phone);
  const chatId = cleanPhone + '@s.whatsapp.net';
  const category = courseInterest || 'General';
  const fullNotes = `[Lab Visit on ${visitDate || new Date().toISOString().split('T')[0]}] ${notes || ''}`.trim();

  // 1. Create or update lead
  const leadId = await upsertLead(chatId, name, cleanPhone, category);
  await updateLeadStatus(leadId, 'Contacted', fullNotes, category, name, cleanPhone);

  // 2. Create or update chat
  await upsertChat(chatId, name, cleanPhone, 'Registered as Lab Visit', false);

  // 3. Enroll into Lab Visit drip campaign (Day 1 scheduled for next morning / 2 hours)
  const subscriberId = await enrollInDrip(chatId, name, cleanPhone, 'lab_visit', 2);

  return { leadId, subscriberId, chatId };
}

function computeDripScheduleTime(scheduleMode = 'tomorrow_morning') {
  const now = new Date();
  if (scheduleMode === 'immediate') {
    return now.toISOString();
  } else if (scheduleMode === '2_hours') {
    return new Date(now.getTime() + 2 * 3600 * 1000).toISOString();
  } else {
    // Tomorrow morning at 9:00 AM IST (UTC+5:30)
    const istOffsetMs = 5.5 * 3600 * 1000;
    const istNow = new Date(now.getTime() + istOffsetMs);
    const tomorrowIst = new Date(istNow);
    tomorrowIst.setUTCDate(tomorrowIst.getUTCDate() + 1);
    tomorrowIst.setUTCHours(9, 0, 0, 0); // 9:00 AM IST
    const targetUtc = new Date(tomorrowIst.getTime() - istOffsetMs);
    if (targetUtc.getTime() <= now.getTime()) {
      targetUtc.setTime(targetUtc.getTime() + 24 * 3600 * 1000);
    }
    return targetUtc.toISOString();
  }
}

async function registerCallInquiryStudent(name, phone, courseInterest, callDate, notes, campaignType = 'inquiry', scheduleMode = 'tomorrow_morning') {
  const cleanPhone = normalizeIndianPhone(phone);
  const chatId = cleanPhone.includes('@') ? cleanPhone : cleanPhone + '@s.whatsapp.net';
  const category = courseInterest || 'General';
  const effectiveCallDate = callDate || new Date().toISOString().split('T')[0];
  const fullNotes = `[Call Inquiry on ${effectiveCallDate}] ${notes || ''}`.trim();
  const nextRunAt = computeDripScheduleTime(scheduleMode);

  // 1. Create or update lead
  const leadId = await upsertLead(chatId, name, cleanPhone, category);
  await updateLeadStatus(leadId, 'Contacted', fullNotes, category, name, cleanPhone);

  // 2. Create or update chat
  await upsertChat(chatId, name, cleanPhone, 'Inquired via Phone Call', false);

  // 3. Check existing in drip_subscribers
  const existing = await get(
    'SELECT * FROM drip_subscribers WHERE (chat_id = ? OR phone = ?) AND campaign_type = ?',
    [chatId, cleanPhone, campaignType]
  );

  let activeBotPhone = null;
  try {
    const cfg = await get('SELECT value FROM bot_config WHERE key = "ACTIVE_BOT_PHONE"');
    activeBotPhone = cfg?.value || null;
  } catch (e) {}

  let subscriberId;
  const isDeleted = (existing && existing.status === 'deleted') || (await get(
    "SELECT id FROM drip_subscribers WHERE (chat_id = ? OR phone = ?) AND status = 'deleted'",
    [chatId, cleanPhone]
  ));

  let initialStatus = 'active';
  try {
    const dripCfg = await get('SELECT value FROM bot_config WHERE key = "DRIP_ENABLED"');
    if (dripCfg && dripCfg.value === '0') {
      initialStatus = 'paused';
    }
  } catch (e) {}

  if (isDeleted) {
    console.log(`🚫 [CALL INQUIRY] Student +${cleanPhone} is marked deleted from drip campaigns. Skipping drip enrollment.`);
    subscriberId = isDeleted.id || existing?.id;
  } else if (existing) {
    if (existing.status !== 'enrolled') {
      await run(
        'UPDATE drip_subscribers SET name = ?, status = ?, current_step = 0, next_run_at = ?, bot_phone = ? WHERE id = ?',
        [name || existing.name, initialStatus, nextRunAt, activeBotPhone, existing.id]
      );
    }
    subscriberId = existing.id;
  } else {
    const res = await run(
      `INSERT INTO drip_subscribers (chat_id, name, phone, campaign_type, current_step, status, next_run_at, bot_phone)
       VALUES (?, ?, ?, ?, 0, ?, ?, ?)`,
      [chatId, name || cleanPhone, cleanPhone, campaignType, initialStatus, nextRunAt, activeBotPhone]
    );
    subscriberId = res.id;
  }

  return { leadId, subscriberId, chatId };
}

async function importDripSubscribersBatch(students, campaignType = 'inquiry', scheduleMode = 'tomorrow_morning') {
  if (!Array.isArray(students) || students.length === 0) {
    return { success: false, totalParsed: 0, enrolledCount: 0, skippedCount: 0, errors: ['No students provided'] };
  }

  let activeBotPhone = null;
  try {
    const cfg = await get('SELECT value FROM bot_config WHERE key = "ACTIVE_BOT_PHONE"');
    activeBotPhone = cfg?.value || null;
  } catch (e) {}

  let initialStatus = 'active';
  try {
    const dripCfg = await get('SELECT value FROM bot_config WHERE key = "DRIP_ENABLED"');
    if (dripCfg && dripCfg.value === '0') {
      initialStatus = 'paused';
    }
  } catch (e) {}

  const nextRunAt = computeDripScheduleTime(scheduleMode);
  let enrolledCount = 0;
  let skippedCount = 0;
  const errors = [];

  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    const rawName = (s.name || '').trim();
    const rawPhone = (s.phone || '').toString().trim();
    const course = (s.course || s.category || 'General').trim();
    const notes = (s.notes || '').trim();

    if (!rawPhone) {
      skippedCount++;
      continue;
    }

    const cleanPhone = normalizeIndianPhone(rawPhone);
    if (!cleanPhone || cleanPhone.length < 10) {
      errors.push(`Row ${i + 1}: Invalid phone number "${rawPhone}"`);
      skippedCount++;
      continue;
    }

    const name = rawName || 'Student';
    const chatId = cleanPhone.includes('@') ? cleanPhone : cleanPhone + '@s.whatsapp.net';
    const importTag = campaignType === 'lab_visit' ? '[Imported Lab Visit Excel]' : '[Imported Drip Excel]';
    const fullNotes = notes ? `${importTag} ${notes}` : `${importTag} Enrolled in ${campaignType} drip sequence`;

    try {
      // 1. Check existing in drip_subscribers
      const existing = await get(
        'SELECT id, status, current_step FROM drip_subscribers WHERE (chat_id = ? OR phone = ?) AND campaign_type = ?',
        [chatId, cleanPhone, campaignType]
      );

      // If already active in this sequence, skip to avoid spamming
      if (existing && existing.status === 'active') {
        skippedCount++;
        continue;
      }

      // Check if contact was deleted from drip campaigns
      const isDeleted = (existing && existing.status === 'deleted') || (await get(
        "SELECT id FROM drip_subscribers WHERE (chat_id = ? OR phone = ?) AND status = 'deleted'",
        [chatId, cleanPhone]
      ));

      if (isDeleted) {
        console.log(`🚫 [EXCEL DRIP] Contact +${cleanPhone} was deleted from drip. Skipping re-enrollment.`);
        skippedCount++;
        errors.push(`Row ${i + 1} (${name}): Skipped because contact +${cleanPhone} was deleted from drip campaigns.`);
        continue;
      }

      // 2. Upsert lead & chat so student is visible across CRM
      const leadId = await upsertLead(chatId, name, cleanPhone, course);
      await updateLeadStatus(leadId, 'Contacted', fullNotes, course, name, cleanPhone);
      await upsertChat(chatId, name, cleanPhone, 'Enrolled via Excel Import', false);

      // 3. Upsert into drip_subscribers
      if (existing) {
        if (existing.status !== 'enrolled') {
          await run(
            'UPDATE drip_subscribers SET name = ?, status = ?, current_step = 0, next_run_at = ?, bot_phone = ? WHERE id = ?',
            [name, initialStatus, nextRunAt, activeBotPhone, existing.id]
          );
          enrolledCount++;
        } else {
          skippedCount++;
        }
      } else {
        await run(
          `INSERT INTO drip_subscribers (chat_id, name, phone, campaign_type, current_step, status, next_run_at, bot_phone)
           VALUES (?, ?, ?, ?, 0, ?, ?, ?)`,
          [chatId, name, cleanPhone, campaignType, initialStatus, nextRunAt, activeBotPhone]
        );
        enrolledCount++;
      }
    } catch (err) {
      console.error(`Error enrolling student ${cleanPhone} in drip:`, err.message);
      errors.push(`Row ${i + 1} (${name}): ${err.message}`);
      skippedCount++;
    }
  }

  return {
    success: true,
    totalParsed: students.length,
    enrolledCount,
    skippedCount,
    errors
  };
}

async function getLabVisitStudents() {
  const query = `
    SELECT 
      d.id as subscriber_id,
      l.id as lead_id,
      COALESCE(l.name, d.name, 'Student') as name,
      COALESCE(l.phone, d.phone, '') as phone,
      COALESCE(l.category, 'Lab Visit Walk-in') as category,
      COALESCE(l.status, 'Contacted') as lead_status,
      COALESCE(d.status, 'active') as drip_status,
      COALESCE(d.current_step, 0) as current_step,
      d.next_run_at,
      d.last_sent_at,
      COALESCE(l.notes, '') as notes,
      COALESCE(d.created_at, l.created_at) as created_at,
      COALESCE(l.chat_id, d.chat_id) as chat_id
    FROM drip_subscribers d
    LEFT JOIN leads l ON (l.phone = d.phone AND l.phone IS NOT NULL AND l.phone != '') OR l.chat_id = d.chat_id
    WHERE d.campaign_type = 'lab_visit'
    UNION
    SELECT
      NULL as subscriber_id,
      l.id as lead_id,
      l.name,
      l.phone,
      l.category,
      l.status as lead_status,
      'not_enrolled' as drip_status,
      0 as current_step,
      NULL as next_run_at,
      NULL as last_sent_at,
      l.notes,
      l.created_at,
      l.chat_id
    FROM leads l
    WHERE (l.notes LIKE '%Lab Visit%' OR l.category LIKE '%Lab Visit%')
      AND l.phone NOT IN (SELECT phone FROM drip_subscribers WHERE campaign_type = 'lab_visit' AND phone IS NOT NULL AND phone != '')
    ORDER BY created_at DESC
  `;
  return await all(query);
}

async function exportLabVisitsToCsv() {
  const students = await getLabVisitStudents();
  const headers = ['Student Name', 'WhatsApp Phone', 'Course Interest', 'Lab Visit Notes', 'Lead Status', 'Drip Status', 'Drip Step', 'Registered At'];
  const rows = students.map(s => [
    s.name || '',
    s.phone ? `+${s.phone}` : '',
    s.category || '',
    s.notes || '',
    s.lead_status || '',
    s.drip_status || '',
    s.current_step !== undefined ? `Step ${s.current_step}/6` : '',
    s.created_at || ''
  ].map(escapeCsvField).join(','));
  return [headers.join(','), ...rows].join('\r\n');
}

async function getCallInquiryStudents() {
  const query = `
    SELECT 
      d.id as subscriber_id,
      l.id as lead_id,
      COALESCE(l.name, d.name, 'Student') as name,
      COALESCE(l.phone, d.phone, '') as phone,
      COALESCE(l.category, 'Call Inquiry') as category,
      COALESCE(l.status, 'Contacted') as lead_status,
      COALESCE(d.status, 'not_enrolled') as drip_status,
      COALESCE(d.current_step, 0) as current_step,
      d.next_run_at,
      d.last_sent_at,
      COALESCE(l.notes, '') as notes,
      COALESCE(d.created_at, l.created_at) as created_at,
      COALESCE(l.chat_id, d.chat_id) as chat_id
    FROM leads l
    LEFT JOIN drip_subscribers d ON (d.phone = l.phone AND d.phone IS NOT NULL AND d.phone != '') OR d.chat_id = l.chat_id
    WHERE l.notes LIKE '%Call Inquiry%' OR l.notes LIKE '%[Call%' OR l.category LIKE '%Call%'
    UNION
    SELECT
      d.id as subscriber_id,
      l.id as lead_id,
      COALESCE(d.name, l.name, 'Student') as name,
      COALESCE(d.phone, l.phone, '') as phone,
      COALESCE(l.category, 'Call Inquiry') as category,
      COALESCE(l.status, 'Contacted') as lead_status,
      COALESCE(d.status, 'active') as drip_status,
      COALESCE(d.current_step, 0) as current_step,
      d.next_run_at,
      d.last_sent_at,
      COALESCE(l.notes, '') as notes,
      COALESCE(d.created_at, l.created_at) as created_at,
      COALESCE(d.chat_id, l.chat_id) as chat_id
    FROM drip_subscribers d
    LEFT JOIN leads l ON (l.phone = d.phone AND l.phone IS NOT NULL AND l.phone != '') OR l.chat_id = d.chat_id
    WHERE d.campaign_type = 'call_inquiry'
    ORDER BY created_at DESC
  `;
  return await all(query);
}

async function exportCallInquiriesToCsv() {
  const students = await getCallInquiryStudents();
  const headers = ['Student Name', 'WhatsApp Phone', 'Course Inquired', 'Call Discussion Notes', 'Lead Status', 'Drip Status', 'Drip Step', 'Call Inquiry Date'];
  const rows = students.map(s => [
    s.name || '',
    s.phone ? `+${s.phone}` : '',
    s.category || '',
    s.notes || '',
    s.lead_status || '',
    s.drip_status || '',
    s.current_step !== undefined ? `Step ${s.current_step}/6` : '',
    s.created_at || ''
  ].map(escapeCsvField).join(','));
  return [headers.join(','), ...rows].join('\r\n');
}

// ----------------------------------------------------
// CUSTOM CAMPAIGNS & BROADCASTS METHODS
// ----------------------------------------------------

async function createCustomCampaign(title, message, attachmentPath, attachmentType, attachmentName, targetType, totalRecipients) {
  const res = await run(
    `INSERT INTO custom_campaigns (title, message, attachment_path, attachment_type, attachment_name, target_type, total_recipients, sent_count, failed_count, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 'in_progress')`,
    [title, message, attachmentPath || null, attachmentType || null, attachmentName || null, targetType || 'manual', totalRecipients]
  );
  return res.id;
}

async function updateCampaignProgress(id, sentCount, failedCount, status = 'in_progress') {
  if (!id) return;
  if (sentCount !== null && sentCount !== undefined) {
    return await run(
      'UPDATE custom_campaigns SET sent_count = ?, failed_count = ?, status = ? WHERE id = ?',
      [sentCount, failedCount, status, id]
    );
  } else {
    return await run(
      'UPDATE custom_campaigns SET status = ? WHERE id = ?',
      [status, id]
    );
  }
}

async function logCampaignRecipient(campaignId, phone, name, status = 'sent', error = null) {
  return await run(
    `INSERT INTO campaign_logs (campaign_id, phone, name, status, error, sent_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [campaignId, phone, name || 'Candidate', status, error || null, new Date().toISOString()]
  );
}

async function getCustomCampaigns() {
  return await all('SELECT * FROM custom_campaigns ORDER BY id DESC');
}

async function getCampaignLogs(campaignId) {
  return await all('SELECT * FROM campaign_logs WHERE campaign_id = ? ORDER BY id ASC', [campaignId]);
}

// ----------------------------------------------------
// INSTITUTIONAL & WORKSHOP METHODS
// ----------------------------------------------------

async function addInstitutionalInquiry(collegeName, contactPerson, designation, phone, email, estimatedStudents, topicInterest, mouStatus, notes) {
  const cleanPhone = normalizeIndianPhone(phone);
  const res = await run(
    `INSERT INTO institutional_inquiries (college_name, contact_person, designation, phone, email, estimated_students, topic_interest, mou_status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [collegeName, contactPerson, designation || '', cleanPhone, email || '', estimatedStudents || 0, topicInterest || '', mouStatus || 'In Discussion', notes || '']
  );
  return res.lastID;
}

async function getInstitutionalInquiries() {
  return await all('SELECT * FROM institutional_inquiries ORDER BY id DESC');
}

async function updateInstitutionalStatus(id, mouStatus, notes) {
  return await run(
    'UPDATE institutional_inquiries SET mou_status = COALESCE(?, mou_status), notes = COALESCE(?, notes) WHERE id = ?',
    [mouStatus, notes, id]
  );
}

// ----------------------------------------------------
// MORNING DIGEST AGGREGATOR
// ----------------------------------------------------

async function getMorningDigestData() {
  const yesterdayIso = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const todayDate = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });

  const newLeadsYesterday = await all(
    'SELECT name, phone, category FROM leads WHERE created_at >= ? ORDER BY id DESC LIMIT 10',
    [yesterdayIso]
  );

  const pendingFollowups = await all(
    "SELECT name, phone, category, notes FROM leads WHERE status IN ('New', 'Contacted', 'In Progress') ORDER BY id DESC LIMIT 10"
  );

  const stats = await getDashboardStats();
  const dripStats = await getDripStats();

  let digestText = `☀️ Helix BioFast Labs — Daily Morning Briefing\n` +
    `Date: ${todayDate}\n\n` +
    `📊 CRM Pipeline Summary:\n` +
    `• Total Inquiries Received: ${stats.totalLeads}\n` +
    `• New Inquiries (Last 24h): ${newLeadsYesterday.length}\n` +
    `• Active In-Progress: ${stats.inProgressLeads}\n` +
    `• Enrolled Students: ${stats.enrolledLeads}\n\n` +
    `📬 Drip Campaign Status:\n` +
    `• Active in Follow-up: ${dripStats.activeSubscribers}\n` +
    `• Follow-up Messages Sent: ${dripStats.totalSent}\n\n`;

  if (newLeadsYesterday.length > 0) {
    digestText += `🆕 Recent Inquiries to Follow Up:\n`;
    newLeadsYesterday.forEach((l, idx) => {
      digestText += `${idx + 1}. ${l.name} (${l.phone}) — ${l.category || 'General'}\n`;
    });
    digestText += `\n`;
  }

  if (pendingFollowups.length > 0) {
    digestText += `📞 Top Priority Follow-ups:\n`;
    pendingFollowups.slice(0, 5).forEach((l, idx) => {
      digestText += `${idx + 1}. ${l.name} (${l.phone}) [${l.category}]: ${l.notes ? l.notes.slice(0, 40) + '...' : 'Pending call'}\n`;
    });
    digestText += `\n`;
  }

  digestText += `Have a great and productive day!\nHelix BioFast Labs\nwww.helixbiofastlabs.com`;
  return digestText;
}

// ----------------------------------------------------
// CSV EXPORT HELPERS
// ----------------------------------------------------

function escapeCsvField(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

async function exportLeadsToCsv() {
  const leads = await all('SELECT * FROM leads ORDER BY id DESC');
  const headers = ['ID', 'Chat ID', 'Student Name', 'WhatsApp Phone', 'Category', 'Qualification', 'Status', 'Notes', 'Created At'];
  const rows = leads.map(l => [
    l.id,
    l.chat_id,
    l.name,
    l.phone,
    l.category,
    l.qualification,
    l.status,
    l.notes,
    l.created_at
  ].map(escapeCsvField).join(','));
  return [headers.join(','), ...rows].join('\r\n');
}

async function exportChatsToCsv() {
  const chats = await all('SELECT * FROM chats ORDER BY last_message_time DESC');
  const headers = ['Chat ID', 'Student Name', 'Phone', 'Last Message', 'Last Message Time', 'Auto Reply Enabled'];
  const rows = chats.map(c => [
    c.chat_id,
    c.name,
    c.phone,
    c.last_message,
    c.last_message_time,
    c.auto_reply_enabled === 1 ? 'Yes' : 'No'
  ].map(escapeCsvField).join(','));
  return [headers.join(','), ...rows].join('\r\n');
}

async function exportDripLogsToCsv() {
  const logs = await all('SELECT * FROM drip_logs ORDER BY id DESC');
  const headers = ['ID', 'Subscriber ID', 'Student Name', 'WhatsApp Phone', 'Campaign Type', 'Day / Step', 'Message Content', 'Status', 'Sent At'];
  const rows = logs.map(l => [
    l.id,
    l.subscriber_id,
    l.name,
    l.phone,
    l.campaign_type,
    l.day_number,
    l.message,
    l.status,
    l.sent_at
  ].map(escapeCsvField).join(','));
  return [headers.join(','), ...rows].join('\r\n');
}

// ----------------------------------------------------
// COLLEGE FACULTY DIRECTORY HELPERS
// ----------------------------------------------------

async function addCollegeFaculty(data) {
  const { faculty_name, designation, college_name, department, phone, email, city, state, notes } = data;
  const cleanPhone = normalizeIndianPhone(phone);

  // Check if faculty with same phone and college already exists
  const existing = await get(
    `SELECT id FROM college_faculties WHERE phone = ? AND college_name = ? LIMIT 1`,
    [cleanPhone, college_name]
  );
  if (existing) {
    await run(
      `UPDATE college_faculties
       SET faculty_name = ?, designation = ?, department = ?, email = ?, city = ?, state = ?, notes = ?
       WHERE id = ?`,
      [faculty_name, designation || '', department || '', email || '', city || '', state || '', notes || '', existing.id]
    );
    return existing.id;
  }

  const res = await run(
    `INSERT INTO college_faculties (faculty_name, designation, college_name, department, phone, email, city, state, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [faculty_name, designation || '', college_name, department || '', cleanPhone, email || '', city || '', state || '', notes || '']
  );
  return res.id;
}

async function getCollegeFaculties(search = '', department = 'All') {
  let sql = 'SELECT * FROM college_faculties WHERE 1=1';
  const params = [];

  if (department && department !== 'All') {
    sql += ' AND department = ?';
    params.push(department);
  }

  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    sql += ' AND (faculty_name LIKE ? OR college_name LIKE ? OR department LIKE ? OR phone LIKE ? OR email LIKE ?)';
    params.push(s, s, s, s, s);
  }

  sql += ' ORDER BY id DESC';
  return await all(sql, params);
}

async function getCollegeFacultyById(id) {
  return await get('SELECT * FROM college_faculties WHERE id = ?', [id]);
}

async function updateCollegeFaculty(id, data) {
  const { faculty_name, designation, college_name, department, phone, email, city, state, notes } = data;
  const cleanPhone = normalizeIndianPhone(phone);
  return await run(
    `UPDATE college_faculties
     SET faculty_name = ?, designation = ?, college_name = ?, department = ?, phone = ?, email = ?, city = ?, state = ?, notes = ?
     WHERE id = ?`,
    [faculty_name, designation || '', college_name, department || '', cleanPhone, email || '', city || '', state || '', notes || '', id]
  );
}

async function deleteCollegeFaculty(id) {
  return await run('DELETE FROM college_faculties WHERE id = ?', [id]);
}

async function getFacultyAudience(department = 'All', college = '') {
  let sql = 'SELECT id, faculty_name as name, phone, college_name, department FROM college_faculties WHERE 1=1';
  const params = [];

  if (department && department !== 'All') {
    sql += ' AND department = ?';
    params.push(department);
  }

  if (college && college.trim()) {
    sql += ' AND college_name LIKE ?';
    params.push(`%${college.trim()}%`);
  }

  sql += ' ORDER BY id DESC';
  return await all(sql, params);
}

async function exportFacultiesToCsv() {
  const faculties = await all('SELECT * FROM college_faculties ORDER BY id DESC');
  const headers = ['ID', 'Faculty Name', 'Designation', 'College / University', 'Department', 'WhatsApp Phone', 'Email', 'City', 'State', 'Notes', 'Created At'];
  const rows = faculties.map(f => [
    f.id,
    f.faculty_name,
    f.designation,
    f.college_name,
    f.department,
    f.phone,
    f.email,
    f.city,
    f.state,
    f.notes,
    f.created_at
  ].map(escapeCsvField).join(','));
  return [headers.join(','), ...rows].join('\r\n');
}

// ----------------------------------------------------
// WHATSAPP CONTACTS HELPERS
// ----------------------------------------------------

async function upsertContactsBatch(contactsList) {
  if (!contactsList || !Array.isArray(contactsList) || contactsList.length === 0) return 0;

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      const stmt = db.prepare(`
        INSERT INTO contacts (jid, name, notify_name, phone, is_saved, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(jid) DO UPDATE SET
          name = CASE WHEN excluded.name IS NOT NULL AND excluded.name != '' THEN excluded.name ELSE contacts.name END,
          notify_name = CASE WHEN excluded.notify_name IS NOT NULL AND excluded.notify_name != '' THEN excluded.notify_name ELSE contacts.notify_name END,
          phone = CASE WHEN excluded.phone IS NOT NULL AND excluded.phone != '' THEN excluded.phone ELSE contacts.phone END,
          is_saved = CASE WHEN excluded.is_saved = 1 OR contacts.is_saved = 1 THEN 1 ELSE 0 END,
          updated_at = CURRENT_TIMESTAMP
      `);

      for (const c of contactsList) {
        if (!c) continue;
        const jid = c.id || c.jid;
        if (!jid || typeof jid !== 'string') continue;
        // Skip broadcast, group chats, server
        if (jid === 'status@broadcast' || jid.endsWith('@g.us') || jid.includes('@broadcast') || jid.includes('@newsletter')) continue;

        const name = (c.name || c.verifiedName || '').trim() || null;
        const notify = (c.notify || '').trim() || null;
        let phone = null;
        if (jid.endsWith('@s.whatsapp.net')) {
          phone = jid.split('@')[0].replace(/[^0-9]/g, '');
        } else if (c.phone) {
          phone = normalizeIndianPhone(c.phone);
        }
        const isSaved = name ? 1 : 0;

        stmt.run([jid, name, notify, phone, isSaved]);
      }

      stmt.finalize((err) => {
        if (err) {
          db.run('ROLLBACK');
          return reject(err);
        }
        db.run('COMMIT', (commitErr) => {
          if (commitErr) return reject(commitErr);
          resolve(contactsList.length);
        });
      });
    });
  });
}

async function getAllContacts(search = '', savedOnly = false, limit = 100, offset = 0) {
  let where = [];
  let params = [];

  if (savedOnly) {
    where.push('is_saved = 1');
  }

  if (search && search.trim()) {
    const q = `%${search.trim()}%`;
    where.push('(name LIKE ? OR notify_name LIKE ? OR phone LIKE ?)');
    params.push(q, q, q);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const countRow = await get(`SELECT COUNT(*) as count FROM contacts ${whereClause}`, params);
  const total = countRow ? countRow.count : 0;

  const contacts = await all(`
    SELECT * FROM contacts
    ${whereClause}
    ORDER BY is_saved DESC, COALESCE(name, notify_name) ASC
    LIMIT ? OFFSET ?
  `, [...params, limit, offset]);

  return { contacts, total };
}

async function getContactsStats() {
  const totalRow = await get('SELECT COUNT(*) as total FROM contacts');
  const savedRow = await get('SELECT COUNT(*) as saved FROM contacts WHERE is_saved = 1');
  const phoneRow = await get('SELECT COUNT(DISTINCT phone) as phones FROM contacts WHERE phone IS NOT NULL AND phone != ""');
  const total = totalRow ? totalRow.total : 0;
  const saved = savedRow ? savedRow.saved : 0;
  const phones = phoneRow ? phoneRow.phones : 0;
  return {
    total,
    saved,
    phones,
    totalContacts: total,
    savedContacts: saved,
    phoneContacts: phones
  };
}

async function exportContactsToCsv() {
  const contacts = await all('SELECT * FROM contacts ORDER BY is_saved DESC, COALESCE(name, notify_name) ASC');
  const headers = ['ID', 'Saved Contact Name', 'WhatsApp Profile Name', 'Phone Number', 'WhatsApp JID', 'Saved in Phonebook', 'Created At'];
  const rows = contacts.map(c => [
    c.id,
    c.name || '',
    c.notify_name || '',
    c.phone || '',
    c.jid,
    c.is_saved === 1 ? 'Yes' : 'No',
    c.created_at
  ].map(escapeCsvField).join(','));
  return [headers.join(','), ...rows].join('\r\n');
}

async function getContactsAudience(savedOnly = false) {
  let sql = 'SELECT DISTINCT phone, COALESCE(name, notify_name, "Contact") as name FROM contacts WHERE phone IS NOT NULL AND phone != ""';
  if (savedOnly) {
    sql += ' AND is_saved = 1';
  }
  return all(sql);
}

async function generateFullBackupData() {
  const [
    leads,
    contacts,
    chats,
    dripSubscribers,
    dripLogs,
    dripTemplates,
    customCampaigns,
    campaignLogs,
    institutionalInquiries,
    collegeFaculties,
    botConfig
  ] = await Promise.all([
    all('SELECT * FROM leads ORDER BY id ASC'),
    all('SELECT * FROM contacts ORDER BY id ASC'),
    all('SELECT chat_id, name, phone, last_message, last_message_time, unread_count, auto_reply_enabled, created_at FROM chats ORDER BY created_at ASC'),
    all('SELECT * FROM drip_subscribers ORDER BY id ASC'),
    all('SELECT * FROM drip_logs ORDER BY id DESC LIMIT 5000'),
    all('SELECT * FROM drip_templates ORDER BY id ASC'),
    all('SELECT * FROM custom_campaigns ORDER BY id ASC'),
    all('SELECT * FROM campaign_logs ORDER BY id DESC LIMIT 5000'),
    all('SELECT * FROM institutional_inquiries ORDER BY id ASC'),
    all('SELECT * FROM college_faculties ORDER BY id ASC'),
    all('SELECT key, value FROM bot_config')
  ]);

  const sanitizedConfig = (botConfig || []).reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});

  return {
    version: '3.0',
    app: 'Helix WhatsApp CRM',
    exportedAt: new Date().toISOString(),
    counts: {
      leads: leads?.length || 0,
      contacts: contacts?.length || 0,
      chats: chats?.length || 0,
      dripSubscribers: dripSubscribers?.length || 0,
      dripLogs: dripLogs?.length || 0,
      dripTemplates: dripTemplates?.length || 0,
      customCampaigns: customCampaigns?.length || 0,
      institutionalInquiries: institutionalInquiries?.length || 0,
      collegeFaculties: collegeFaculties?.length || 0
    },
    config: sanitizedConfig,
    leads: leads || [],
    contacts: contacts || [],
    chats: chats || [],
    dripSubscribers: dripSubscribers || [],
    dripLogs: dripLogs || [],
    dripTemplates: dripTemplates || [],
    customCampaigns: customCampaigns || [],
    campaignLogs: campaignLogs || [],
    institutionalInquiries: institutionalInquiries || [],
    collegeFaculties: collegeFaculties || []
  };
}

module.exports = {
  db,
  get,
  all,
  run,
  normalizeIndianPhone,
  initDb,
  upsertChat,
  logMessage,
  upsertLead,
  getLeads,
  updateLeadStatus,
  markLeadTalkToTeam,
  getTalkToTeamLeads,
  updateLeadTalkToTeamStatus,
  updatePhoneForLid,
  getAllChats,
  getChatMessages,
  getRecentChatMessages,
  setAutoReply,
  getBotConfig,
  updateBotConfig,
  getDashboardStats,
  enrollInDrip,
  getDripSubscribers,
  getDripLogs,
  getDripTemplates,
  updateDripTemplate,
  updateDripSubscriberStatus,
  resetDripSubscriberStep,
  stopDripForChat,
  deleteDripSubscriber,
  restoreDripSubscriber,
  pauseSubscribersFromOldBot,
  pauseAllActiveDripSubscribers,
  resumeAllPausedDripSubscribers,
  getPendingDripSubscribers,
  advanceDripSubscriber,
  logDripMessage,
  getDripStats,
  computeDripScheduleTime,
  registerCallInquiryStudent,
  importDripSubscribersBatch,
  registerLabVisitStudent,
  getLabVisitStudents,
  exportLabVisitsToCsv,
  getCallInquiryStudents,
  exportCallInquiriesToCsv,
  createCustomCampaign,
  updateCampaignProgress,
  logCampaignRecipient,
  getCustomCampaigns,
  getCampaignLogs,
  addInstitutionalInquiry,
  getInstitutionalInquiries,
  updateInstitutionalStatus,
  getMorningDigestData,
  exportLeadsToCsv,
  exportChatsToCsv,
  exportDripLogsToCsv,
  addCollegeFaculty,
  getCollegeFaculties,
  getCollegeFacultyById,
  updateCollegeFaculty,
  deleteCollegeFaculty,
  getFacultyAudience,
  exportFacultiesToCsv,
  upsertContactsBatch,
  getAllContacts,
  getContactsStats,
  exportContactsToCsv,
  getContactsAudience,
  generateFullBackupData,
  saveBaileysMessage,
  getBaileysMessage
};
