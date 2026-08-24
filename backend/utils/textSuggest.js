const { askGroqForJson } = require('./groqClient');

/**
 * Generic "did you mean X" correction for a short free-text value — a skill,
 * a custom industry/domain, a tag, etc. Domain-aware: e.g. "photograph" as a
 * skill should suggest "Photography" plus adjacent tools like "Adobe
 * Photoshop". Returns null (never throws) if Groq is unavailable — the
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

This app is a professional network built for architecture, interior design, construction, and real
estate — plus closely adjacent professional/creative fields (e.g. product design, urban planning,
facilities management, structural engineering, quantity surveying, graphic design, and similar all
count as related). Judge whether this value is a plausible answer for that "${context}" field on
this app. Set "relevant" to false only if it's gibberish, spam, or has no discernible connection to
any real profession or creative field — not merely because it's outside architecture/construction
specifically. If false, give a one-sentence "relevantReason" explaining what it looks like instead.

Respond ONLY with a JSON object in this exact shape:
{ "corrected": "the corrected/standard term", "alternatives": ["related term", "..."], "changed": true, "relevant": true, "relevantReason": "" }`;

  try {
    const result = await askGroqForJson(prompt);
    if (typeof result.corrected !== 'string') return null;
    return {
      corrected: result.corrected,
      alternatives: Array.isArray(result.alternatives) ? result.alternatives.slice(0, 3) : [],
      changed: !!result.changed && result.corrected.toLowerCase() !== text.trim().toLowerCase(),
      relevant: result.relevant !== false,
      relevantReason: typeof result.relevantReason === 'string' ? result.relevantReason : ''
    };
  } catch (error) {
    console.error('Text suggestion error:', error.message);
    return null;
  }
};

module.exports = { suggestCorrection };
