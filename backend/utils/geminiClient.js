const axios = require('axios');

// Default model can be overridden via env without a code change if Google
// renames/deprecates it.
const DEFAULT_MODEL = 'gemini-3.6-flash';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Google's actual error message (quota, invalid key, blocked, ...) is inside
// the response body, not axios's generic "Request failed with status code
// X" — surface it so failures are diagnosable from logs alone.
const describeAxiosError = (error) => {
  if (error.response) {
    const body = error.response.data?.error?.message || JSON.stringify(error.response.data)?.slice(0, 300);
    return `HTTP ${error.response.status}: ${body}`;
  }
  if (error.code) return `${error.code}: ${error.message}`;
  return error.message;
};

const requestGemini = async (parts, model, apiKey) => {
  const { data } = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      contents: [{ parts }],
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

/**
 * Send Gemini a set of content parts (text and/or inline images) and get
 * back the raw text response. Throws on any failure (missing key, network,
 * non-2xx) so callers can fall back to non-AI behavior instead of failing
 * the request. Retries transient failures (timeouts, 429/5xx) once with a
 * short backoff before giving up — production network blips shouldn't take
 * an AI feature down.
 */
const askGeminiParts = async (parts) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  try {
    return await requestGemini(parts, model, apiKey);
  } catch (firstError) {
    const status = firstError.response?.status;
    // 429 (rate limit) is deliberately excluded: Google's own retry-after for
    // it runs 30-50s, so a 1s backoff just burns a second call for nothing.
    const retryable = !status || status >= 500;
    if (!retryable) {
      throw new Error(describeAxiosError(firstError));
    }
    console.error('Gemini call failed, retrying once:', describeAxiosError(firstError));
    await sleep(1000);
    try {
      return await requestGemini(parts, model, apiKey);
    } catch (secondError) {
      throw new Error(describeAxiosError(secondError));
    }
  }
};

// Ask Gemini a plain text prompt and get back the raw text response.
const askGemini = (prompt) => askGeminiParts([{ text: prompt }]);

const parseJson = (text) => {
  const match = text.match(/[[{][\s\S]*[\]}]/);
  if (!match) {
    throw new Error('Gemini did not return valid JSON');
  }
  return JSON.parse(match[0]);
};

// Ask Gemini for a prompt whose response should be a single JSON object/array.
const askGeminiForJson = async (prompt) => parseJson(await askGemini(prompt));

// Ask Gemini a question about an image (base64-encoded) plus a text prompt,
// expecting a single JSON object/array back.
const askGeminiVisionForJson = async (prompt, base64Data, mimeType) => {
  const text = await askGeminiParts([
    { text: prompt },
    { inline_data: { mime_type: mimeType, data: base64Data } }
  ]);
  return parseJson(text);
};

module.exports = { askGemini, askGeminiForJson, askGeminiVisionForJson };
