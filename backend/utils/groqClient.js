const axios = require('axios');

// Default text model can be overridden via env without a code change if Groq
// renames/deprecates it. gpt-oss-120b is on Groq's free tier.
const DEFAULT_MODEL = 'openai/gpt-oss-120b';
// Vision needs a model that accepts image content blocks; also free-tier.
const DEFAULT_VISION_MODEL = 'qwen/qwen3.6-27b';

const BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Groq's actual error message (quota, invalid key, blocked, ...) is inside
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

const requestGroq = async (messages, model, apiKey, { json } = {}) => {
  const body = {
    model,
    messages,
    temperature: 0.3
  };
  if (json) body.response_format = { type: 'json_object' };

  const { data } = await axios.post(BASE_URL, body, {
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    timeout: 30000
  });

  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('Groq returned no content');
  }
  return text;
};

/**
 * Send Groq a list of chat messages and get back the raw text response.
 * Throws on any failure (missing key, network, non-2xx) so callers can fall
 * back to non-AI behavior instead of failing the request. Retries transient
 * failures (timeouts, 5xx) once with a short backoff — production network
 * blips shouldn't take an AI feature down. 429s are NOT retried: Groq's
 * actual reset window runs well past a short backoff, so retrying just
 * burns a second call against the same limit.
 */
const askGroqMessages = async (messages, opts) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured');
  }
  const model = opts?.vision
    ? (process.env.GROQ_VISION_MODEL || DEFAULT_VISION_MODEL)
    : (process.env.GROQ_MODEL || DEFAULT_MODEL);

  try {
    return await requestGroq(messages, model, apiKey, opts);
  } catch (firstError) {
    const status = firstError.response?.status;
    const retryable = !status || status >= 500;
    if (!retryable) {
      throw new Error(describeAxiosError(firstError));
    }
    console.error('Groq call failed, retrying once:', describeAxiosError(firstError));
    await sleep(1000);
    try {
      return await requestGroq(messages, model, apiKey, opts);
    } catch (secondError) {
      throw new Error(describeAxiosError(secondError));
    }
  }
};

// Ask Groq a plain text prompt and get back the raw text response.
const askGroq = (prompt) => askGroqMessages([{ role: 'user', content: prompt }]);

const parseJson = (text) => {
  const match = text.match(/[[{][\s\S]*[\]}]/);
  if (!match) {
    throw new Error('Groq did not return valid JSON');
  }
  return JSON.parse(match[0]);
};

// Ask Groq for a prompt whose response should be a single JSON object/array.
const askGroqForJson = async (prompt) => {
  const text = await askGroqMessages([{ role: 'user', content: prompt }], { json: true });
  return parseJson(text);
};

// Ask Groq a question about an image (base64-encoded) plus a text prompt,
// expecting a single JSON object/array back.
const askGroqVisionForJson = async (prompt, base64Data, mimeType) => {
  const text = await askGroqMessages(
    [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } }
        ]
      }
    ],
    { json: true, vision: true }
  );
  return parseJson(text);
};

module.exports = { askGroq, askGroqForJson, askGroqVisionForJson };
