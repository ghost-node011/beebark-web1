const axios = require('axios');

// AI chat client with a key pool and provider fallback.
//
// Groq keys are tried first, taking turns (round-robin); Google Gemini keys are
// the backup. Both speak the OpenAI chat-completions format. A key that hits a
// rate limit is skipped until its limit resets, and at most MAX_CONCURRENT
// calls run at once so a burst can't stall the server.
//
// Env (keys are comma-separated; the single-key names still work):
//   GROQ_API_KEYS  (or GROQ_API_KEY)    GROQ_MODEL, GROQ_LIGHT_MODEL, GROQ_VISION_MODEL
//   GEMINI_API_KEYS (or GEMINI_API_KEY) GEMINI_MODEL, GEMINI_LIGHT_MODEL, GEMINI_VISION_MODEL
// Callers pass { light: true } for short, simple tasks (cheaper/faster model).

const MAX_CONCURRENT = 5;
const TIMEOUT_MS = 20000;
const DEFAULT_COOLDOWN_MS = 60 * 1000;

const PROVIDERS = [
  {
    name: 'groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    keysEnv: ['GROQ_API_KEYS', 'GROQ_API_KEY'],
    model: () => process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    lightModel: () => process.env.GROQ_LIGHT_MODEL || 'openai/gpt-oss-20b',
    visionModel: () => process.env.GROQ_VISION_MODEL || 'qwen/qwen3.6-27b',
    supportsJsonMode: true
  },
  {
    name: 'gemini',
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    keysEnv: ['GEMINI_API_KEYS', 'GEMINI_API_KEY'],
    model: () => process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    lightModel: () => process.env.GEMINI_LIGHT_MODEL || 'gemini-2.5-flash-lite',
    visionModel: () => process.env.GEMINI_VISION_MODEL || 'gemini-2.5-flash',
    // JSON is enforced by the prompt and parseJson below
    supportsJsonMode: false
  }
];

const keysFor = (provider) => {
  const raw = provider.keysEnv.map((name) => process.env[name] || '').join(',');
  return [...new Set(raw.split(',').map((k) => k.trim()).filter(Boolean))];
};

// "provider:keyIndex" -> timestamp until which that key is skipped (after a 429)
const coolingUntil = new Map();
// provider name -> next key index to start from (round-robin)
const nextIndex = new Map();

// Small semaphore: extra calls wait their turn instead of piling onto the APIs
let active = 0;
const waiting = [];
const acquire = () =>
  new Promise((resolve) => {
    if (active < MAX_CONCURRENT) {
      active += 1;
      resolve();
    } else {
      waiting.push(resolve);
    }
  });
const release = () => {
  const next = waiting.shift();
  if (next) next();
  else active -= 1;
};

// The provider's actual error message (quota, invalid key, blocked, ...) is in
// the response body, not axios's generic "Request failed with status code X".
const describeAxiosError = (error) => {
  if (error.response) {
    const body = error.response.data?.error?.message || JSON.stringify(error.response.data)?.slice(0, 300);
    return `HTTP ${error.response.status}: ${body}`;
  }
  if (error.code) return `${error.code}: ${error.message}`;
  return error.message;
};

const cooldownFrom = (error) => {
  const retryAfter = Number(error.response?.headers?.['retry-after']);
  return Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : DEFAULT_COOLDOWN_MS;
};

const pickModel = (provider, opts) => {
  if (opts?.vision) return provider.visionModel();
  if (opts?.light) return provider.lightModel();
  return provider.model();
};

const requestProvider = async (provider, key, messages, opts) => {
  const body = { model: pickModel(provider, opts), messages, temperature: 0.3 };
  if (opts?.json && provider.supportsJsonMode) body.response_format = { type: 'json_object' };
  const { data } = await axios.post(provider.url, body, {
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    timeout: TIMEOUT_MS
  });
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error(`${provider.name} returned no content`);
  return text;
};

/**
 * Send a list of chat messages and get back the raw text response. Tries every
 * Groq key (starting from the next one in turn), then every Gemini key; throws
 * only if all of them fail, so callers can fall back to non-AI behaviour.
 */
const askGroqMessages = async (messages, opts) => {
  const pool = PROVIDERS.map((provider) => ({ provider, keys: keysFor(provider) })).filter((p) => p.keys.length);
  if (!pool.length) {
    throw new Error('No AI provider configured (set GROQ_API_KEYS and/or GEMINI_API_KEYS)');
  }

  await acquire();
  try {
    const failures = [];
    for (const { provider, keys } of pool) {
      const start = (nextIndex.get(provider.name) || 0) % keys.length;
      nextIndex.set(provider.name, start + 1);
      for (let step = 0; step < keys.length; step += 1) {
        const index = (start + step) % keys.length;
        const slot = `${provider.name}:${index + 1}`;
        if ((coolingUntil.get(slot) || 0) > Date.now()) {
          failures.push(`${slot} rate-limited, skipped`);
          continue;
        }
        try {
          return await requestProvider(provider, keys[index], messages, opts);
        } catch (error) {
          if (error.response?.status === 429) {
            coolingUntil.set(slot, Date.now() + cooldownFrom(error));
          }
          failures.push(`${slot} ${describeAxiosError(error)}`);
        }
      }
    }
    throw new Error(`All AI keys failed — ${failures.join(' | ')}`);
  } finally {
    release();
  }
};

// Plain text prompt -> raw text response.
const askGroq = (prompt, opts) => askGroqMessages([{ role: 'user', content: prompt }], opts);

const parseJson = (text) => {
  const match = text.match(/[[{][\s\S]*[\]}]/);
  if (!match) {
    throw new Error('AI did not return valid JSON');
  }
  return JSON.parse(match[0]);
};

// Prompt whose response should be a single JSON object/array.
const askGroqForJson = async (prompt, opts = {}) => {
  const text = await askGroqMessages([{ role: 'user', content: prompt }], { ...opts, json: true });
  return parseJson(text);
};

// Question about an image (base64-encoded) plus a text prompt, expecting JSON.
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
