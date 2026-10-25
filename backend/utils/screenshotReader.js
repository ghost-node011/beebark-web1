const fs = require('fs');
const { askVisionForJson } = require('./groqClient');
const { cleanExperienceEntries } = require('./experienceFromResume');

// Reads screenshots with the vision AI: a LinkedIn profile (for the profile
// import) or a job post (to fill the "Post a job" form). Nothing is stored.

let sharp = null;
try { sharp = require('sharp'); } catch { /* images are sent as they are */ }

const MAX_SLICES = 6;
const WIDTH = 1100;
const SLICE = 1400;

/**
 * Screenshots as JPEG slices the AI can read: 1100 px wide, and long
 * full-page captures cut into overlapping 1400 px tall pieces.
 */
async function slicesOf(files) {
  const out = [];
  for (const f of files) {
    const original = fs.readFileSync(f.path);
    if (!sharp) { out.push({ base64: original.toString('base64'), mime: f.mimetype }); continue; }
    const img = sharp(original, { limitInputPixels: 200e6 }).rotate();
    const meta = await img.metadata();
    const scale = Math.min(1, WIDTH / (meta.width || WIDTH));
    const width = Math.round((meta.width || WIDTH) * scale);
    const height = Math.round((meta.height || SLICE) * scale);
    const resized = await img.resize({ width, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
    for (let top = 0; top < height && out.length < MAX_SLICES; top += SLICE - 120) {
      const h = Math.min(SLICE, height - top);
      if (h < 80) break;
      const piece = await sharp(resized).extract({ left: 0, top, width, height: h }).jpeg({ quality: 82 }).toBuffer();
      out.push({ base64: piece.toString('base64'), mime: 'image/jpeg' });
    }
    if (out.length >= MAX_SLICES) break;
  }
  return out;
}

const ask = async (prompt, files) => {
  const images = await slicesOf(files);
  if (!images.length) throw new Error('No readable image');
  // Groq first (fast; keys taken in turn), then Gemini
  return askVisionForJson(prompt, images, { timeout: 60000, temperature: 0 });
};

const str = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const list = (v, n, len) => [...new Set((Array.isArray(v) ? v : []).map((x) => str(x, len)).filter(Boolean))].slice(0, n);
const year = (v) => (/^(19|20)\d{2}$/.test(String(v ?? '').trim()) ? Number(String(v).trim()) : null);

const PROFILE_PROMPT = `These are screenshots of one person's LinkedIn profile (they may be parts of one long page, in order).
Read everything visible and return it exactly as shown; do not invent anything that isn't on screen.
Respond ONLY with JSON:
{
  "isProfile": true,
  "name": "", "headline": "", "location": "",
  "about": "the full About text",
  "experience": [{ "title": "", "company": "", "employmentType": "Full-time | Part-time | Internship | Freelance | Contract | Self-employed or empty",
                   "location": "", "startDate": "YYYY-MM or YYYY", "endDate": "YYYY-MM, YYYY or null", "current": false, "description": "" }],
  "education": [{ "school": "", "degree": "", "field": "", "startYear": 2018, "endYear": 2022 }],
  "skills": [""],
  "languages": [""]
}
Notes: LinkedIn shows dates like "Jan 2021 - Present · 3 yrs 2 mos": use the start and end, not the duration.
"Company · Full-time" means company and employment type. Several roles listed under one company logo all belong to that company.
List every experience and education entry you can see, newest first. If these aren't screenshots of a profile, return { "isProfile": false }.`;

const TYPE = { 'full-time': 'full_time', 'full time': 'full_time', 'part-time': 'part_time', 'part time': 'part_time', internship: 'internship', freelance: 'freelance', contract: 'contract', 'self-employed': 'self_employed', 'self employed': 'self_employed' };

/** A LinkedIn profile from screenshots: { isProfile, name, headline, location, about, experience, education, skills, languages } */
async function readLinkedInProfile(files) {
  const r = await ask(PROFILE_PROMPT, files);
  if (r?.isProfile === false) return { isProfile: false };
  const types = (Array.isArray(r?.experience) ? r.experience : []).map((e) => TYPE[String(e?.employmentType || '').trim().toLowerCase()] || '');
  return {
    isProfile: true,
    name: str(r?.name, 80),
    headline: str(r?.headline, 140),
    location: str(r?.location, 120),
    about: str(r?.about, 2000),
    // "Jaipur, Rajasthan, India · On-site": the place only
    experience: cleanExperienceEntries(r?.experience).map((e, i) => ({ ...e, location: e.location.replace(/\s*·\s*(on-?site|remote|hybrid)\s*$/i, ''), employmentType: types[i] || '' })),
    education: (Array.isArray(r?.education) ? r.education : []).map((e) => ({
      school: str(e?.school, 160), degree: str(e?.degree, 120), field: str(e?.field, 120), startYear: year(e?.startYear), endYear: year(e?.endYear)
    })).filter((e) => e.school).slice(0, 15),
    skills: list(r?.skills, 50, 40),
    languages: list(r?.languages, 10, 40)
  };
}

const JOB_PROMPT = `These are screenshots of one job post (LinkedIn or similar), possibly parts of one long page in order.
Read it exactly as shown; do not invent anything. Respond ONLY with JSON:
{
  "isJob": true,
  "title": "", "company": "", "location": "",
  "workplace": "onsite | hybrid | remote or empty",
  "employmentType": "full_time | part_time | internship | contract | freelance or empty",
  "experienceLevel": "fresher | junior | mid | senior or empty (Entry level = fresher, Associate = junior, Mid-Senior level = mid, Director/Executive = senior)",
  "salary": "the pay as written, e.g. ₹6–8 LPA, or empty",
  "skills": [""],
  "description": "the full job description: about the role, responsibilities, requirements and benefits, keeping its headings and bullet points as plain text lines"
}
If these aren't screenshots of a job post, return { "isJob": false }.`;

const pick = (v, allowed) => (allowed.includes(String(v || '').trim().toLowerCase()) ? String(v).trim().toLowerCase() : '');

/** A job post from screenshots, in the "Post a job" form's fields */
async function readJobPost(files) {
  const r = await ask(JOB_PROMPT, files);
  if (r?.isJob === false) return { isJob: false };
  return {
    isJob: true,
    title: str(r?.title, 150),
    company: str(r?.company, 150),
    location: str(r?.location, 150),
    workplace: pick(r?.workplace, ['onsite', 'hybrid', 'remote']),
    employmentType: pick(r?.employmentType, ['full_time', 'part_time', 'internship', 'contract', 'freelance']),
    experienceLevel: pick(r?.experienceLevel, ['fresher', 'junior', 'mid', 'senior']),
    // "₹8L/yr - ₹12L/yr" in words the job form takes: "₹8L per year - ₹12L per year"
    salary: str(r?.salary, 80).replace(/\s*\/\s*(yr|year|annum)\b/gi, ' per year').replace(/\s*\/\s*(mo|mon|month)\b/gi, ' per month'),
    skills: list(r?.skills, 20, 40),
    description: str(r?.description, 5000)
  };
}

module.exports = { readLinkedInProfile, readJobPost };
