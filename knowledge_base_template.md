# Knowledge Base Template — Google Sheets

Create a Google Spreadsheet called "Helix WhatsApp Bot - Conversation Log"

---

## Sheet 1: Conversation Log

**Tab name:** `Conversation Log`

| Column A | Column B | Column C | Column D | Column E | Column F |
|---|---|---|---|---|---|
| Timestamp | ChatId | Name | Message | Intent | ReplyType |

Example data:
| 2026-09-14T08:30:00Z | 919876543210@c.us | Rahul Kumar | fee for molecular biology | fees | text |
| 2026-09-14T09:15:00Z | 918765432109@c.us | Priya Singh | send brochure | brochure | file |
| 2026-09-14T10:00:00Z | 917654321098@c.us | Amit Sharma | I need to talk to someone | human | human |

---

## Sheet 2: Company Info (Reference Only)

**Tab name:** `Company Info`

| Field | Value |
|---|---|
| Company Name | Helix BioFast Labs Pvt. Ltd. |
| Address | A-52, First Floor, Sector-2, Noida, UP-201301 |
| Email | biofastlabs@gmail.com |
| Website | https://www.helixbiofastlabs.com |
| Phone | [YOUR PHONE NUMBER] |
| Working Hours | Monday-Saturday, 9:00 AM to 6:00 PM |

---

## Sheet 3: Courses (Reference Only)

**Tab name:** `Courses`

| Course Name | Duration | Fee (1 Wk) | Fee (2 Wk) | Fee (3 Wk) | Fee (4 Wk) | Eligibility | Certificate |
|---|---|---|---|---|---|---|---|
| Molecular Biology | 1-4 Weeks | Rs.XXXX | Rs.XXXX | Rs.XXXX | Rs.XXXX | B.Sc/M.Sc | Yes |
| Microbiology | 1-4 Weeks | Rs.XXXX | Rs.XXXX | Rs.XXXX | Rs.XXXX | B.Sc/M.Sc | Yes |
| Biochemistry | 1-4 Weeks | Rs.XXXX | Rs.XXXX | Rs.XXXX | Rs.XXXX | B.Sc/M.Sc | Yes |
| Animal Cell Culture | 1-4 Weeks | Rs.XXXX | Rs.XXXX | Rs.XXXX | Rs.XXXX | M.Sc/PhD | Yes |
| Plant Tissue Culture | 1-4 Weeks | Rs.XXXX | Rs.XXXX | Rs.XXXX | Rs.XXXX | B.Sc/M.Sc | Yes |
| PCR Techniques | 1-4 Weeks | Rs.XXXX | Rs.XXXX | Rs.XXXX | Rs.XXXX | B.Sc/M.Sc | Yes |
| ELISA | 1-4 Weeks | Rs.XXXX | Rs.XXXX | Rs.XXXX | Rs.XXXX | B.Sc/M.Sc | Yes |
| Western Blotting | 1-4 Weeks | Rs.XXXX | Rs.XXXX | Rs.XXXX | Rs.XXXX | M.Sc/PhD | Yes |
| Bioinformatics | 1-4 Weeks | Rs.XXXX | Rs.XXXX | Rs.XXXX | Rs.XXXX | Any | Yes |
| Recombinant DNA | 1-4 Weeks | Rs.XXXX | Rs.XXXX | Rs.XXXX | Rs.XXXX | M.Sc/PhD | Yes |
| Forensic Biology | 1-4 Weeks | Rs.XXXX | Rs.XXXX | Rs.XXXX | Rs.XXXX | B.Sc/M.Sc | Yes |

---

## Sheet 4: FAQ (Reference Only)

**Tab name:** `FAQ`

| Question | Answer |
|---|---|
| Where are you located? | A-52, First Floor, Sector-2, Noida - 201301 |
| Do you provide certificates? | Yes, certificates are provided after completion |
| Is training hands-on? | Yes, all training is hands-on and lab-based |
| Do you provide individual training? | Yes, individual and batch training both available |
| What are your working hours? | Monday to Saturday, 9 AM to 6 PM |
| Do you accept students from other cities? | Yes, we have hostels/PG accommodations nearby |
| Is there a joining date? | Students can join any Monday throughout the year |
| Do you help with projects? | Yes, we provide B.Sc and M.Sc project assistance |

---

## Sheet 5: Human Handover Log

**Tab name:** `Human Handover Log`

| Timestamp | ChatId | Name | Message | Status | Responded By | Response Date |
|---|---|---|---|---|---|---|
| 2026-09-14T10:00:00Z | 917654321098@c.us | Amit Sharma | complex query | Pending | | |
| 2026-09-13T14:30:00Z | 916543210987@c.us | Neha Gupta | pricing for batch | Resolved | You | 2026-09-13 |

---

## How to Use This Reference

The bot currently uses the information HARDCODED in `intent_detection.js`.

When you want to update a reply:
1. Open `intent_detection.js` in Notepad
2. Find the relevant message in `replyMessages`
3. Update the text
4. Paste the updated code into n8n "Build Reply" node

In a future version, you can connect the bot directly to Google Sheets to read
fees and courses dynamically — so you update the sheet and the bot automatically
uses the new information without touching any code.
