// Work experience read from a resume's text, for the user to review before
// saving: [{ title, company, location, startDate, endDate, current, description }]
// with dates as "YYYY-MM". Rule-based, used when the AI reading isn't available.
const SECTION_START = /^\s*(work experience|professional experience|experience|employment( history)?|work history|career history|internships? (and|&) experience|professional background)\s*:?\s*$/i;
const SECTION_END = /^\s*(education|academic.*|qualifications?|skills|software( skills)?|technical skills|projects?|key projects|certifications?|achievements|awards|languages|interests|hobbies|personal details|references|declaration|publications|competitions|extra.?curricular|summary|profile|objective)\s*:?\s*$/i;
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
const MON = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const DATE = `(?:${MON}\\.?\\s*,?\\s*((?:19|20)\\d{2})|(\\d{1,2})[/.-]((?:19|20)\\d{2})|((?:19|20)\\d{2}))`;
const RANGE = new RegExp(`${DATE}\\s*(?:-|–|—|to|till|until)\\s*(?:${DATE}|(present|current|now|ongoing|till date|date))`, 'i');
const BULLET = /^\s*([•·▪●◦*–-]|\d+[.)])\s+/;

const pad = (n) => String(n).padStart(2, '0');
// The pieces of one DATE match (at offset `o` in the match array) as "YYYY-MM"
function ym(m, o) {
  if (m[o + 1]) return `${m[o + 1]}-${pad(MONTHS[m[o].slice(0, m[o].toLowerCase().startsWith('sept') ? 4 : 3).toLowerCase()] || 1)}`;
  if (m[o + 3]) return `${m[o + 3]}-${pad(Math.min(12, Math.max(1, Number(m[o + 2]))))}`;
  if (m[o + 4]) return `${m[o + 4]}-01`;
  return '';
}
// Trim spaces and separators from the ends; a bracket at an end goes only when it has no partner
// ("Web Developer (Full Stack)" keeps its ")")
const tidy = (s) => {
  let t = String(s || '').replace(/\s+/g, ' ').replace(/^[\s,;:|•·\-–—*]+|[\s,;:|•·\-–—*]+$/g, '');
  for (let i = 0; i < 3; i += 1) {
    const before = t;
    if (t.startsWith('(') && !t.includes(')')) t = t.slice(1);
    if (t.endsWith(')') && !t.includes('(')) t = t.slice(0, -1);
    if (t.startsWith('(') && t.endsWith(')') && t.indexOf(')') === t.length - 1) t = t.slice(1, -1);
    t = t.replace(/^[\s,;:|•·\-–—*]+|[\s,;:|•·\-–—*]+$/g, '');
    if (t === before) break;
  }
  return t;
};

// Words that end a job title (so "Software Developer | JF Knowledge Centre" is title first)
const ROLE_WORD = /\b(architect|designer|engineer|manager|intern|trainee|lead|head|director|consultant|draftsman|draughtsman|planner|associate|developer|programmer|analyst|executive|officer|specialist|coordinator|supervisor|technician|visuali[sz]er|estimator|surveyor|founder|partner|owner)\b/i;

// "Senior Architect, Studio Mehta, Mumbai" / "Senior Architect at Studio Mehta" / "Studio Mehta | Senior Architect"
function titleAndCompany(text) {
  const t = tidy(text);
  const at = t.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
  if (at) return { title: tidy(at[1]), company: tidy(at[2]) };
  const parts = t.split(/\s*[|,–—]\s*|\s+-\s+/).map(tidy).filter(Boolean);
  if (parts.length >= 2) {
    const companyFirst = !ROLE_WORD.test(parts[0]) && (ROLE_WORD.test(parts[1])
      || /\b(studio|associates|architects|consultants|pvt|ltd|llp|inc|group|developers|builders|constructions?|design|infra|realty|company|firm|centre|center|solutions|technologies|labs)\b/i.test(parts[0]));
    const [title, company, location] = companyFirst ? [parts[1], parts[0], parts[2]] : parts;
    return { title, company, location: location || '' };
  }
  return { title: t, company: '' };
}

function experienceFromResume(text) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const start = lines.findIndex((l) => SECTION_START.test(l));
  if (start === -1) return [];
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => SECTION_END.test(l));
  const section = (end === -1 ? rest : rest.slice(0, end)).slice(0, 120);

  const entries = [];
  let cur = null;
  let pendingHeading = '';
  for (const line of section) {
    const m = line.match(RANGE);
    if (m) {
      const startDate = ym(m, 1);
      const current = Boolean(m[11]);
      const endDate = current ? '' : ym(m, 6);
      const before = tidy(line.slice(0, m.index));
      const after = tidy(line.slice(m.index + m[0].length));
      const heading = before || pendingHeading || after;
      const { title, company, location } = titleAndCompany(heading);
      cur = { title, company: company || (before && pendingHeading ? tidy(pendingHeading) : ''), location: location || (before ? after : ''), startDate, endDate, current, description: [] };
      if (!cur.company && pendingHeading && before) cur.company = tidy(pendingHeading);
      entries.push(cur);
      pendingHeading = '';
      continue;
    }
    if (BULLET.test(line) || (cur && line.length > 70)) {
      if (cur) cur.description.push(line.replace(BULLET, '').trim());
      continue;
    }
    // A short line without dates: the heading of the next entry, or more of the current one
    if (cur && !cur.company && !pendingHeading && line.length < 70 && cur.description.length === 0) { cur.company = tidy(line); continue; }
    // A short line right after the dates, before any bullet points, with the company known: its location
    if (cur && cur.company && !cur.location && !pendingHeading && line.length < 50 && !/\d/.test(line) && cur.description.length === 0) { cur.location = tidy(line); continue; }
    pendingHeading = pendingHeading ? `${pendingHeading}, ${line}` : line;
  }
  return entries
    .filter((e) => e.title && e.startDate)
    .map((e) => ({ ...e, description: e.description.join('\n').slice(0, 2000) }))
    .slice(0, 12);
}

// "YYYY-MM" from "2021-04", "2021-4", "04/2021" or a bare year ("2021" -> "2021-01"); '' otherwise
function month(v) {
  const s = String(v ?? '').trim();
  let m = s.match(/^((?:19|20)\d{2})[-/.](\d{1,2})$/);
  if (m && Number(m[2]) >= 1 && Number(m[2]) <= 12) return `${m[1]}-${pad(Number(m[2]))}`;
  m = s.match(/^(\d{1,2})[-/.]((?:19|20)\d{2})$/);
  if (m && Number(m[1]) >= 1 && Number(m[1]) <= 12) return `${m[2]}-${pad(Number(m[1]))}`;
  m = s.match(/^((?:19|20)\d{2})$/);
  return m ? `${m[1]}-01` : '';
}

// Keep only well-formed entries (from the AI or the rules)
function cleanExperienceEntries(list) {
  return (Array.isArray(list) ? list : []).map((e) => {
    const current = e?.current === true || /^(present|current|now|till date|ongoing)$/i.test(String(e?.endDate || '').trim());
    return {
      title: tidy(e?.title).slice(0, 120),
      company: tidy(e?.company).slice(0, 120),
      location: tidy(e?.location).slice(0, 120),
      startDate: month(e?.startDate),
      endDate: current ? '' : month(e?.endDate),
      current,
      description: String(e?.description || '').trim().slice(0, 2000)
    };
  }).filter((e) => e.title || e.company).slice(0, 15);
}

// The same job in two readings: same start month, or titles that match
const sameJob = (a, b) => {
  const key = (s) => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  if (a.startDate && b.startDate && a.startDate === b.startDate) return true;
  const ta = key(a.title);
  const tb = key(b.title);
  return Boolean(ta && tb && (ta === tb || ta.startsWith(tb) || tb.startsWith(ta)));
};

/** Empty fields of `entries` filled from matching entries of `extra` (another reading of the resume) */
function fillGaps(entries, extra) {
  return entries.map((e) => {
    const other = (extra || []).find((x) => sameJob(e, x));
    if (!other) return e;
    const filled = { ...e };
    for (const k of ['company', 'location', 'startDate', 'description']) if (!filled[k] && other[k]) filled[k] = other[k];
    if (!filled.current && !filled.endDate && other.endDate) filled.endDate = other.endDate;
    return filled;
  });
}

/**
 * Every work experience entry in a resume, read by the AI on its own (a focused
 * question gets all the jobs, with their companies, dates and bullet points).
 * Returns the cleaned entries, or null when the AI can't answer.
 */
async function experienceWithAi(rawText) {
  const text = String(rawText || '').trim();
  if (!text) return null;
  const { askGroqForJson } = require('./groqClient');
  const prompt = `Below is the text of a resume/CV. List EVERY work experience entry in it (jobs, internships,
freelance work and positions held), newest first, exactly as the resume states them. Do not merge or
skip entries, and do not invent anything.
For each entry give:
- "title": the job title or role exactly as written, including anything in brackets (e.g. "Web Developer (Full Stack)")
- "company": the employer's name only (e.g. "Crave Design", "JF Knowledge Centre Pvt. Ltd."), without the city or dates.
  Look for it after "at", "@", "|", "-", "," or in brackets next to the title, on the line just above or below the
  title, or as a heading above several roles (then it applies to each role under it). For freelance or
  self-employed work with no organisation named, use "Freelance" or "Self-employed" as the resume says.
- "location": the city (and state/country if given) of that job, from the same entry: next to the company or
  title, on the dates line, or under the heading. Use "Remote" if the entry says remote. Leave "" only when
  the entry really has no place.
- "startDate" and "endDate": "YYYY-MM" (use "YYYY" when only the year is given); endDate null when it is the current job
- "current": true only if the resume says it is ongoing (Present, Current, Till date…)
- "description": the responsibilities and bullet points for that entry, each on its own line
Fill in every field the resume gives; the text may have been pulled out of a PDF, so lines can be split or out of order.
Resume text:
"""
${text.slice(0, 20000)}
"""
Respond ONLY with JSON: { "experience": [ { "title": "", "company": "", "location": "", "startDate": "2021-04", "endDate": null, "current": true, "description": "" } ] }
If there is no work experience, respond with { "experience": [] }.`;
  try {
    const result = await askGroqForJson(prompt, { timeout: 45000 });
    if (!Array.isArray(result?.experience)) return null;
    // Anything the AI left empty is filled from the rule-based reading of the same job
    return fillGaps(cleanExperienceEntries(result.experience), experienceFromResume(text));
  } catch (error) {
    console.error('Resume experience reading error:', error.message);
    return null;
  }
}

module.exports = { experienceFromResume, cleanExperienceEntries, experienceWithAi, fillGaps };
