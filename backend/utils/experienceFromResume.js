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
const tidy = (s) => String(s || '').replace(/\s+/g, ' ').replace(/^[\s,;:|•·\-–—*()]+|[\s,;:|•·\-–—*()]+$/g, '');

// "Senior Architect, Studio Mehta, Mumbai" / "Senior Architect at Studio Mehta" / "Studio Mehta | Senior Architect"
function titleAndCompany(text) {
  const t = tidy(text);
  const at = t.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
  if (at) return { title: tidy(at[1]), company: tidy(at[2]) };
  const parts = t.split(/\s*[|,–—]\s*|\s+-\s+/).map(tidy).filter(Boolean);
  if (parts.length >= 2) {
    const companyFirst = /\b(studio|associates|architects?|consultants?|pvt|ltd|llp|inc|group|developers?|builders?|constructions?|design|infra|realty|company|firm)\b/i.test(parts[0])
      && !/\b(architect|designer|engineer|manager|intern|trainee|lead|head|director|consultant|draftsman|planner|associate)\s*$/i.test(parts[0]);
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
    pendingHeading = pendingHeading ? `${pendingHeading}, ${line}` : line;
  }
  return entries
    .filter((e) => e.title && e.startDate)
    .map((e) => ({ ...e, description: e.description.join('\n').slice(0, 2000) }))
    .slice(0, 12);
}

// Keep only well-formed entries (from the AI or the rules)
function cleanExperienceEntries(list) {
  const month = (v) => (/^(19|20)\d{2}-(0[1-9]|1[0-2])$/.test(String(v || '')) ? String(v) : '');
  return (Array.isArray(list) ? list : []).map((e) => {
    const current = e?.current === true;
    return {
      title: tidy(e?.title).slice(0, 120),
      company: tidy(e?.company).slice(0, 120),
      location: tidy(e?.location).slice(0, 120),
      startDate: month(e?.startDate),
      endDate: current ? '' : month(e?.endDate),
      current,
      description: String(e?.description || '').trim().slice(0, 2000)
    };
  }).filter((e) => e.title || e.company).slice(0, 12);
}

module.exports = { experienceFromResume, cleanExperienceEntries };
