// Education entries read from a resume's text, for the user to review before
// saving: [{ school, degree, field, startYear, endYear }]. Rule-based, used
// when the AI reading isn't available (or found nothing).
const SECTION_START = /^\s*(education|educational (details|qualifications?)|academic (background|details|qualifications?|profile)|qualifications?)\s*:?\s*$/i;
const SECTION_END = /^\s*(experience|work experience|professional experience|employment|projects?|skills|software|certifications?|achievements|awards|internships?|languages|interests|hobbies|personal details|references|declaration|publications|competitions|extra.?curricular)\b.*$/i;
const SCHOOL = /\b(university|universit[ée]|college|institute|institution|school|academy|polytechnic|IIT|NIT|IIIT|CEPT|SPA|vidyalaya|vidyapeeth|mahavidyalaya)\b/i;
const DEGREE = /\b(B\.?\s?Arch|M\.?\s?Arch|B\.?\s?Des|M\.?\s?Des|B\.?\s?Tech|M\.?\s?Tech|B\.?\s?E\.?|M\.?\s?E\.?|B\.?\s?Sc|M\.?\s?Sc|B\.?\s?Com|M\.?\s?Com|B\.?\s?B\.?\s?A|M\.?\s?B\.?\s?A|B\.?\s?A\.?|M\.?\s?A\.?|M\.?\s?Plan|B\.?\s?Plan|Ph\.?\s?D|PGDM|Diploma|Post[- ]?graduate diploma|Bachelor(?:'s)?(?: of [A-Za-z ]+)?|Master(?:'s)?(?: of [A-Za-z ]+)?|Doctorate|HSC|SSC|Class (?:XII|X|12(?:th)?|10(?:th)?)|12th|10th|Higher Secondary|Senior Secondary)\b/i;
const YEARS = /\b((?:19|20)\d{2})\b(?:\s*(?:-|–|—|to|till)\s*\b((?:19|20)\d{2}|present|current|now|ongoing)\b)?/i;

const tidy = (s) => String(s || '').replace(/\s+/g, ' ').replace(/^[\s,;:|•·\-–—*]+|[\s,;:|•·\-–—*]+$/g, '');

function parseLine(line) {
  const out = {};
  const y = line.match(YEARS);
  if (y) {
    out.startYear = y[2] ? Number(y[1]) : undefined;
    out.endYear = y[2] ? (/^\d/.test(y[2]) ? Number(y[2]) : undefined) : Number(y[1]);
  }
  const d = line.match(DEGREE);
  if (d) {
    out.degree = tidy(d[0]);
    // "B.Arch in Architecture" / "Bachelor of Design (Interior Design)"
    const after = line.slice(d.index + d[0].length).match(/^\s*(?:in|\(|,|-|–)\s*([A-Za-z &]{3,60})/);
    if (after && !SCHOOL.test(after[1]) && !DEGREE.test(after[1])) out.field = tidy(after[1]);
  }
  if (SCHOOL.test(line)) {
    const parts = line.split(/\s*[|,–—]\s*|\s{2,}|\s-\s/).filter((p) => SCHOOL.test(p));
    out.school = tidy((parts[0] || line).replace(YEARS, '').replace(DEGREE, ''));
  }
  return out;
}

function educationFromResume(text) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  // The education section if there is one, else the whole text
  let start = lines.findIndex((l) => SECTION_START.test(l));
  let section = lines;
  if (start !== -1) {
    const rest = lines.slice(start + 1);
    const end = rest.findIndex((l) => SECTION_END.test(l) && l.length < 60);
    section = end === -1 ? rest : rest.slice(0, end);
  }
  const entries = [];
  let cur = null;
  for (const line of section.slice(0, 60)) {
    const p = parseLine(line);
    if (!p.school && !p.degree && !p.startYear && !p.endYear) continue;
    // A new school, or a degree when the current entry already has one, starts a new entry
    const startsNew = !cur || (p.school && cur.school) || (p.degree && cur.degree && !p.school);
    if (startsNew) { cur = {}; entries.push(cur); }
    for (const k of ['school', 'degree', 'field', 'startYear', 'endYear']) if (p[k] && !cur[k]) cur[k] = p[k];
  }
  return entries
    .filter((e) => e.school || (e.degree && start !== -1))
    .map((e) => ({ school: e.school || '', degree: e.degree || '', field: e.field || '', startYear: e.startYear || null, endYear: e.endYear || null }))
    .slice(0, 6);
}

// Keep only well-formed entries (from the AI or the rules), trimmed
function cleanEducation(list) {
  const year = (v) => { const n = Number(v); return Number.isInteger(n) && n >= 1950 && n <= new Date().getFullYear() + 8 ? n : null; };
  return (Array.isArray(list) ? list : [])
    .map((e) => ({ school: tidy(e?.school).slice(0, 150), degree: tidy(e?.degree).slice(0, 100), field: tidy(e?.field).slice(0, 100), startYear: year(e?.startYear), endYear: year(e?.endYear) }))
    .filter((e) => e.school || e.degree)
    .slice(0, 6);
}

module.exports = { educationFromResume, cleanEducation };
