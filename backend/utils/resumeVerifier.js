const { askGroqForJson } = require('./groqClient');

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
 * One combined Groq pass over an uploaded résumé: is this actually a
 * résumé, what name does it contain, and — if so — a bio to suggest and
 * likely intent/industry tags. Returns null (never throws) if Groq is
 * unavailable; the caller should then skip verification/auto-fill entirely
 * rather than block the upload.
 */
const analyzeResumeForProfile = async (rawText, currentName) => {
  if (!rawText?.trim()) return null;

  const prompt = `You are checking a file someone uploaded as their résumé/CV on a professional
networking app (architecture, real estate, construction, or general professional work).

File text:
"""
${rawText.slice(0, 8000)}
"""

First, decide if this text is actually a résumé/CV (a document about one person's work history,
skills, and education) — not a project brief, a book, an invoice, or unrelated text.

If it IS a résumé, also extract the person's full name as written, their current city/country if the
résumé states one (else null), and write 5 short (1-2 sentence) professional bio options for their
profile, each with a slightly different angle (achievement-focused, personality-focused,
concise/punchy, etc) — order them best-first, since the first one will be offered as the
recommended default. Also suggest which of these platform intents apply —
${VALID_INTENT.join(', ')} — and which industries apply — ${VALID_INDUSTRY.join(', ')} — based only
on what the résumé actually shows.

Respond ONLY with a JSON object in this exact shape:
{
  "isResume": true,
  "reason": "one short sentence",
  "detectedName": "Full Name or null",
  "detectedLocation": "City, Country or null",
  "bios": ["bio option 1", "bio option 2", "bio option 3", "bio option 4", "bio option 5"],
  "suggestedIntent": ["learn"],
  "suggestedIndustries": ["architecture"]
}
If it is NOT a résumé, respond with:
{ "isResume": false, "reason": "one short sentence explaining what it looks like instead", "detectedName": null, "detectedLocation": null, "bios": [], "suggestedIntent": [], "suggestedIndustries": [] }`;

  try {
    const result = await askGroqForJson(prompt);
    if (typeof result.isResume !== 'boolean') return null;

    return {
      isResume: result.isResume,
      reason: typeof result.reason === 'string' ? result.reason : '',
      detectedName: typeof result.detectedName === 'string' ? result.detectedName : null,
      detectedLocation: typeof result.detectedLocation === 'string' && result.detectedLocation.trim() ? result.detectedLocation.trim() : null,
      nameMismatch: namesLikelyDiffer(result.detectedName, currentName),
      bios: Array.isArray(result.bios) ? result.bios.slice(0, 5) : [],
      suggestedIntent: (Array.isArray(result.suggestedIntent) ? result.suggestedIntent : []).filter((i) => VALID_INTENT.includes(i)),
      suggestedIndustries: (Array.isArray(result.suggestedIndustries) ? result.suggestedIndustries : []).filter((i) => VALID_INDUSTRY.includes(i))
    };
  } catch (error) {
    console.error('Resume analysis error:', error.message);
    return null;
  }
};

module.exports = { analyzeResumeForProfile };
