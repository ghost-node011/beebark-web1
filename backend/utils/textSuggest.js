const { askGeminiForJson } = require('./geminiClient');

/**
 * Generic "did you mean X" correction for a short free-text value — a skill,
 * a custom industry/domain, a tag, etc. Domain-aware: e.g. "photograph" as a
 * skill should suggest "Photography" plus adjacent tools like "Adobe
 * Photoshop". Returns null (never throws) if Gemini is unavailable — the
 * caller should just keep the user's original text.
 */
const suggestCorrection = async (text, context = 'skill') => {
  if (!text?.trim()) return null;

  const prompt = `A user typed this value for a "${context}" field in a professional networking app
(architecture, real estate, construction, or general professional/creative work):

"${text}"

If it has a typo or an unclear/informal phrasing, correct it to the standard professional term.
If it's already fine, just return it unchanged. Also suggest up to 3 closely-related, more specific
terms someone in this exact field would recognize (e.g. "photography" -> "Adobe Photoshop", "Adobe
Lightroom") — skip this if there's nothing meaningfully more specific to suggest.

Respond ONLY with a JSON object in this exact shape:
{ "corrected": "the corrected/standard term", "alternatives": ["related term", "..."], "changed": true }`;

  try {
    const result = await askGeminiForJson(prompt);
    if (typeof result.corrected !== 'string') return null;
    return {
      corrected: result.corrected,
      alternatives: Array.isArray(result.alternatives) ? result.alternatives.slice(0, 3) : [],
      changed: !!result.changed && result.corrected.toLowerCase() !== text.trim().toLowerCase()
    };
  } catch (error) {
    console.error('Text suggestion error:', error.message);
    return null;
  }
};

module.exports = { suggestCorrection };
