// =============================================================
// HELIX BIOFAST LABS — WhatsApp Bot
// n8n Code Node: "Build Reply"
//
// INSTRUCTIONS:
// 1. In n8n, open the "Build Reply" Code node
// 2. Select "JavaScript" mode
// 3. Delete existing code and paste THIS entire file
// 4. Click "Save"
//
// TO CUSTOMISE MESSAGES: Edit the text inside replyMessages below
// TO ADD KEYWORDS: Add words to the intents object
// =============================================================

const body = $input.first().json;

// Safety check — skip non-text or invalid messages
if (!body.messageData || !body.messageData.textMessageData) {
  return [{ json: { skip: true, reason: 'Not a text message' } }];
}

// Extract sender info
const chatId      = body.senderData?.chatId     || '';
const senderName  = body.senderData?.senderName || 'Student';
const rawMessage  = body.messageData.textMessageData.textMessage || '';
const msg         = rawMessage.toLowerCase().trim();

// =============================================================
// INTENT KEYWORDS
// =============================================================
const intents = {
  menu: ['hi','hello','hey','helo','hii','hai','hy','start','menu','help','namaste','good morning','good afternoon','good evening','good night','ji','ok'],
  courses: ['1','course','courses','training','trainning','program','programme','internship','intern','learn','study','biotechnology','microbiology','molecular biology','biochemistry','cell culture','animal cell','plant cell','pcr','elisa','western blot','bioinformatics','recombinant','genomics','proteomics','immunology','tissue culture','fermentation','chromatography','protein','dna extraction','rna','sequencing'],
  fees: ['2','fee','fees','price','prices','cost','costs','charge','charges','how much','kitna','amount','rate','rupee','rupees','rs ','paisa','money','scholarship','discount','offer','payment','pay'],
  brochure: ['3','brochure','brocher','brochur','brocure','broshure','pdf','catalogue','catalog','prospectus','syllabus','send details','send information','course details','course information','more details','full details'],
  projects: ['4','project','projects','student project','mini project','major project','project work','dissertation project','research project','bsc project','msc project','final year','final project'],
  phd: ['5','phd','ph.d','ph d','doctorate','doctoral','phd assistance','phd support','phd help','thesis','dissertation','research assistance','phd training','research scholar','jrf','srf'],
  forensic: ['6','forensic','forensics','forensic service','forensic test','forensic lab','forensic report','forensic training','dna test','dna analysis','fingerprint','crime scene','forensic biology','paternity test','toxicology'],
  human: ['7','team','staff','human','person','talk to','call','contact','speak','expert','counselor','counsellor','admission','enquiry','inquiry','register','registration','enroll','enrolment','join','apply'],
  address: ['address','location','where','where are you','kahan','place','noida','sector 2','sector-2','office','lab location','how to reach','directions','map','nearest metro','near me','route'],
  certificate: ['certificate','cert','certification','certificat','certified','letter','completion letter','internship letter','experience letter','recommendation','bonafide'],
  duration: ['duration','how long','how many weeks','how many days','weeks','days','months','time period','1 week','2 week','3 week','4 week','one week','two week','three week','four week']
};

// Detect intent
let intent = 'unknown';
for (const [key, keywords] of Object.entries(intents)) {
  if (keywords.some(kw => msg === kw || msg.includes(kw))) {
    intent = key;
    break;
  }
}

// =============================================================
// REPLY MESSAGES — Edit these to customise the bot responses
// Use \n for new lines. Use *bold* and _italic_ for formatting.
// =============================================================
const replyMessages = {

  menu: 'Hello! Thank you for contacting *Helix BioFast Labs Pvt. Ltd.*, Noida.\n\nI can instantly help you with our training programs, fees, and services.\n\nPlease select:\n\n1 Training Courses\n2 Course Fees\n3 Training Brochure (PDF)\n4 Student Projects\n5 PhD Assistance\n6 Forensic Services\n7 Talk to Our Team\n\nType the number (e.g. 2) or ask your question directly.',

  courses: '*Helix BioFast Labs Training Programs*\n\nHands-on lab-based training in:\n\nMolecular Biology\nMicrobiology\nBiochemistry\nAnimal & Plant Cell Culture\nPCR & Genomics\nELISA & Immunotechnology\nBioinformatics\nRecombinant DNA Technology\nWestern Blotting\nForensic Biology\nResearch Project Assistance\n\nAll training is hands-on at our *Noida laboratory*.\n\nType 2 for fees | Type 3 for brochure | Type 7 to talk to us.',

  fees: '*Helix BioFast Labs Training Fees*\n\nAvailable durations:\n\n1 Week  — Please ask for current fee\n2 Weeks — Please ask for current fee\n3 Weeks — Please ask for current fee\n4 Weeks — Please ask for current fee\n\nFees vary by course. Tell us which course you are interested in for exact pricing.\n\nType 3 for complete brochure | Type 7 to talk to our team',

  projects: '*Helix BioFast Labs Student Projects*\n\nWe support:\n\nB.Sc / M.Sc Final Year Project Work\nHands-on Laboratory Training\nExperimental Design Guidance\nData Analysis Support\nResearch Methodology\nDissertation / Thesis Lab Work\nProject Completion Certificate\n\nAll projects at our Noida laboratory under expert supervision.\n\nType 7 to discuss your requirements with our team.',

  phd: '*Helix BioFast Labs PhD Assistance*\n\nWe provide support for PhD scholars:\n\nExperimental Design Consultation\nPCR, ELISA, Western Blot, Cell Culture\nProtein Extraction & Analysis\nBioinformatics & Data Analysis\nResearch Methodology Guidance\nThesis Lab Work Support\n\nType 7 to connect with our research team directly.',

  forensic: '*Helix BioFast Labs Forensic Services*\n\nWe offer:\n\nDNA Fingerprinting & Analysis\nForensic Biology Training\nMolecular Forensics\nForensic Training Programs\nForensic Project Assistance\n\nType 7 to speak with our forensic experts.',

  human: '*Thank you for contacting Helix BioFast Labs!*\n\nYour enquiry has been received. Our team will get back to you shortly.\n\nFor immediate assistance:\nPhone: [YOUR PHONE NUMBER]\nEmail: biofastlabs@gmail.com\nWebsite: www.helixbiofastlabs.com\nAddress: A-52, First Floor, Sector-2, Noida 201301\n\nWorking Hours: Monday-Saturday, 9:00 AM to 6:00 PM',

  address: '*Helix BioFast Labs Pvt. Ltd.*\n\nAddress:\nA-52, First Floor, Sector-2,\nNoida, Uttar Pradesh 201301\n\nGoogle Maps:\nhttps://maps.google.com/?q=A-52+Sector+2+Noida\n\nPhone: [YOUR PHONE NUMBER]\nEmail: biofastlabs@gmail.com\nWebsite: www.helixbiofastlabs.com\n\nWorking Hours: Monday-Saturday, 9:00 AM to 6:00 PM',

  certificate: '*Helix BioFast Labs Certificate Information*\n\nA Course Completion Certificate is provided after training.\n\nCertificate includes:\n- Course name and specialization\n- Duration and completion date\n- Signed by Lab Director\n- Official Helix BioFast Labs seal\n\nProject work students receive a separate Project Completion Certificate.\n\nType 7 for specific certification queries.',

  duration: '*Helix BioFast Labs Training Duration*\n\nAvailable durations:\n\n1 Week  - Intensive practical\n2 Weeks - Comprehensive coverage\n3 Weeks - In-depth practical + theory\n4 Weeks - Full professional training\n\nCustom durations may be available.\n\nType 2 for fees | Type 3 for complete brochure.',

  unknown: 'I did not fully understand your query.\n\nHere is how I can help:\n\nType 1 - Training Courses\nType 2 - Course Fees\nType 3 - Training Brochure\nType 4 - Student Projects\nType 5 - PhD Assistance\nType 6 - Forensic Services\nType 7 - Talk to Our Team\n\nOr ask your question again and I will try my best!\n\nEmail: biofastlabs@gmail.com\nWebsite: www.helixbiofastlabs.com'

};

// Determine message type
let messageType = 'text';
if (intent === 'brochure') messageType = 'file';
else if (intent === 'human') messageType = 'human';

const reply = replyMessages[intent] || replyMessages.unknown;

return [{
  json: { chatId, senderName, rawMessage, intent, reply, messageType, timestamp: new Date().toISOString() }
}];
