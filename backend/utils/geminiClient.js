const axios = require('axios');

// Default model can be overridden via env without a code change if Google
// renames/deprecates it.
const DEFAULT_MODEL = 'gemini-3.6-flash';

/**
 * Ask Gemini a prompt and get back the raw text response.
 * Throws on any failure (missing key, network, non-2xx) so callers can
 * fall back to non-AI behavior instead of failing the request.
 */
const askGemini = async (prompt) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  const { data } = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 2000 }
    },
    { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
  );

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini returned no content');
  }
  return text;
};

// Ask Gemini for a prompt whose response should be a single JSON object/array.
const askGeminiForJson = async (prompt) => {
  const text = await askGemini(prompt);
  const match = text.match(/[[{][\s\S]*[\]}]/);
  if (!match) {
    throw new Error('Gemini did not return valid JSON');
  }
  return JSON.parse(match[0]);
};

module.exports = { askGemini, askGeminiForJson };
