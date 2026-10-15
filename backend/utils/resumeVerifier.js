const { askGroqForJson } = require('./groqClient');
const { cleanEducation } = require('./educationFromResume');
const { cleanExperienceEntries } = require('./experienceFromResume');

const VALID_INTENT = ['learn', 'network', 'hire', 'get_hired'];
const VALID_INDUSTRY = ['architecture', 'interiors', 'construction', 'real_estate', 'related'];

const namesLikelyDiffer = (resumeName, currentName) => {
  if (!resumeName || !currentName) return false;
  const norm = (s) => s.trim().toLowerCase();
  if (norm(resumeName) === norm(currentName)) return false;
  // Also treat "contains" matches as the same person (e.g. "Gaurank" vs "Gaurank Sharma")
  return !norm(currentName).includes(norm(resumeName)) && !norm(resumeName).includes(norm(currentName));
};

/**
 * One combined Groq pass over an uploaded resume: is this actually a
 * resume, what name does it contain, and — if so — a bio to suggest and
 * likely intent/industry tags. Returns null (never throws) if Groq is
 * unavailable; the caller should then skip verification/auto-fill entirely
 * rather than block the upload.
 */
const analyzeResumeForProfile = async (rawText, currentName) => {
  if (!rawText?.trim()) return null;

  const prompt = `You are checking a file someone uploaded as their resume/CV on a professional
networking app (architecture, real estate, construction, or general professional work).

File text:
"""
${rawText.slice(0, 14000)}
"""

First, decide if this text is actually a resume/CV (a document about one person's work history,
skills, and education) — not a project brief, a book, an invoice, or unrelated text.

If it IS a resume, also extract the person's full name as written, their current city/country if the
resume states one (else null), and write 5 short (1-2 sentence) professional bio options for their
profile, each with a slightly different angle (achievement-focused, personality-focused,
concise/punchy, etc) — order them best-first, since the first one will be offered as the
recommended default. Also suggest which of these platform intents apply —
${VALID_INTENT.join(', ')} — and which industries apply — ${VALID_INDUSTRY.join(', ')} — based only
on what the resume actually shows. Also list the education entries exactly as the resume states
them (school, degree, field of study, start and end year), and every work experience entry
(job title, company, location, start and end month as "YYYY-MM", whether it is the current job,
and the description or bullet points joined with new lines). Leave a value empty or null when the
resume doesn't say it, and never guess.

Respond ONLY with a JSON object in this exact shape:
{
  "isResume": true,
  "reason": "one short sentence",
  "detectedName": "Full Name or null",
  "detectedLocation": "City, Country or null",
  "bios": ["bio option 1", "bio option 2", "bio option 3", "bio option 4", "bio option 5"],
  "suggestedIntent": ["learn"],
  "suggestedIndustries": ["architecture"],
  "education": [{ "school": "CEPT University", "degree": "B.Arch", "field": "Architecture", "startYear": 2013, "endYear": 2018 }],
  "experience": [{ "title": "Senior Architect", "company": "Studio Mehta", "location": "Mumbai", "startDate": "2021-04", "endDate": null, "current": true, "description": "Led residential projects" }]
}
If it is NOT a resume, respond with:
{ "isResume": false, "reason": "one short sentence explaining what it looks like instead", "detectedName": null, "detectedLocation": null, "bios": [], "suggestedIntent": [], "suggestedIndustries": [], "education": [], "experience": [] }`;

  try {
    // A full answer (bios, education, every job) takes a while to write
    const result = await askGroqForJson(prompt, { timeout: 45000 });
    if (typeof result.isResume !== 'boolean') return null;

    return {
      isResume: result.isResume,
      reason: typeof result.reason === 'string' ? result.reason : '',
      detectedName: typeof result.detectedName === 'string' ? result.detectedName : null,
      detectedLocation: typeof result.detectedLocation === 'string' && result.detectedLocation.trim() ? result.detectedLocation.trim() : null,
      nameMismatch: namesLikelyDiffer(result.detectedName, currentName),
      bios: Array.isArray(result.bios) ? result.bios.slice(0, 5) : [],
      suggestedIntent: (Array.isArray(result.suggestedIntent) ? result.suggestedIntent : []).filter((i) => VALID_INTENT.includes(i)),
      suggestedIndustries: (Array.isArray(result.suggestedIndustries) ? result.suggestedIndustries : []).filter((i) => VALID_INDUSTRY.includes(i)),
      education: cleanEducation(result.education),
      experience: cleanExperienceEntries(result.experience)
    };
  } catch (error) {
    console.error('Resume analysis error:', error.message);
    return null;
  }
};

module.exports = { analyzeResumeForProfile };
