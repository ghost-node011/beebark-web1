const fs = require('fs');
const crypto = require('crypto');
const { askGroqVisionForJson } = require('./groqClient');

// Checks every uploaded image for nudity, sexual content, graphic violence and
// hate symbols before it is stored. Two checkers, in order:
//   1. Amazon Rekognition content moderation (when AWS is set up: S3_BUCKET or
//      MODERATION_REKOGNITION=1; region REKOGNITION_REGION, else AWS_REGION, else ap-southeast-2)
//   2. The vision AI (Groq / Gemini, see groqClient)
// If neither can answer right now, the image is stored and checked again in
// the background for a few minutes (checkLater); one that's refused then is
// deleted from storage. MODERATION_DISABLED=1 turns all of this off (local dev only).

let sharp = null;
try { sharp = require('sharp'); } catch { /* optional: images are sent as they are */ }

const useRekognition = () => process.env.MODERATION_REKOGNITION === '1'
  || (process.env.MODERATION_REKOGNITION !== '0' && Boolean((process.env.S3_BUCKET || '').trim()));
let rekognition = null;
const rekognitionClient = () => {
  if (!rekognition) {
    const { RekognitionClient } = require('@aws-sdk/client-rekognition');
    rekognition = new RekognitionClient({ region: process.env.REKOGNITION_REGION || process.env.AWS_REGION || 'ap-southeast-2' });
  }
  return rekognition;
};

// Rekognition labels (both its 2023 and older names) that are never allowed
const BLOCKED_LABEL = /^(Explicit|Explicit Nudity|Exposed .*|Nudity|Graphic .*Nudity|Illustrated Explicit Nudity|Sexual Activity|Sex Toys|Adult Toys|Non-Explicit Nudity.*|Obstructed Intimate Parts|Kissing on the Lips|Partially Exposed .*|Graphic Violence.*|Visually Disturbing|Emaciated Bodies|Corpses|Explosions and Blasts|Self-Harm|Self Injury|Air Crash|Hate Symbols|Nazi Party|White Supremacy|Extremist)$/i;
// Also blocked on profile photos, which everyone sees first
const PROFILE_ONLY_LABEL = /^(Suggestive|Swimwear or Underwear|Female Swimwear Or Underwear|Male Swimwear Or Underwear|Revealing Clothes|Barechested Male|Middle Finger|Rude Gestures)$/i;

const REASON = {
  sexual: "This image looks like it contains nudity or sexual content, which isn't allowed on BeeBark.",
  violence: "This image looks like it contains graphic or disturbing content, which isn't allowed on BeeBark.",
  hate: "This image looks like it contains a hate symbol, which isn't allowed on BeeBark.",
  revealing: 'Please use a photo with appropriate clothing for your professional profile.'
};
const reasonFor = (names) => (/viol|disturb|corpse|emaciat|blast|crash|self/i.test(names) ? REASON.violence
  : /hate|nazi|supremac|extrem/i.test(names) ? REASON.hate
    : /nud|explicit|sex|intimate|exposed|kiss/i.test(names) ? REASON.sexual : REASON.revealing);

// A small JPEG of the image (first frame of a GIF), so checks are fast and under size limits
// (1280 px for Rekognition; 448 px for the vision AI, which counts image size against its per-minute limit)
async function preview(filePath, mimeType, size = 1280) {
  const original = fs.readFileSync(filePath);
  if (!sharp) return { bytes: original, mime: mimeType };
  try {
    const bytes = await sharp(original, { animated: false, limitInputPixels: 100e6 })
      .rotate().resize(size, size, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
    return { bytes, mime: 'image/jpeg' };
  } catch {
    return null; // not a readable image
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Set when Rekognition refuses us (no permission / no credentials): skipped until then
let rekognitionOffUntil = 0;

async function checkWithRekognition(bytes, { profile }) {
  const { DetectModerationLabelsCommand } = require('@aws-sdk/client-rekognition');
  const out = await rekognitionClient().send(new DetectModerationLabelsCommand({ Image: { Bytes: bytes }, MinConfidence: 60 }));
  const labels = (out.ModerationLabels || []).map((l) => ({ name: l.Name, parent: l.ParentName || '', confidence: Math.round(l.Confidence || 0) }));
  const hit = labels.find((l) => (BLOCKED_LABEL.test(l.name) || BLOCKED_LABEL.test(l.parent)) && l.confidence >= 60)
    || (profile && labels.find((l) => (PROFILE_ONLY_LABEL.test(l.name) || PROFILE_ONLY_LABEL.test(l.parent)) && l.confidence >= 80));
  return { ok: !hit, reason: hit ? reasonFor(`${hit.name} ${hit.parent}`) : '', labels, provider: 'rekognition' };
}

const PROMPT = (profile) => `You are the content-safety check for uploads to BeeBark, a professional network for
architecture, interiors, construction and real estate. Look at the image and decide if it may be shown.

Not allowed (answer "allowed": false):
- nudity of any kind (exposed breasts, buttocks or genitals), including artistic nudes, drawings and AI images
- sexual or pornographic content, sexual acts, sexual poses, sex toys
- graphic violence, gore, blood, injuries, dead bodies, self-harm
- hate symbols or extremist imagery
${profile ? '- for this PROFILE PHOTO also: underwear, swimwear, lingerie, shirtless or sexually suggestive poses, rude gestures\n' : ''}
Allowed: buildings, interiors, construction sites, drawings and plans, products, landscapes, people who are
dressed normally, classical buildings with ordinary sculpture or ornament.

Respond ONLY with JSON: { "allowed": true, "category": "none" | "nudity" | "sexual" | "violence" | "hate" | "revealing", "confidence": 0-100 }`;

async function checkWithVisionAi(bytes, mime, { profile }) {
  const result = await askGroqVisionForJson(PROMPT(profile), bytes.toString('base64'), mime);
  if (typeof result?.allowed !== 'boolean') throw new Error('No answer from the vision AI');
  const category = String(result.category || 'none').toLowerCase();
  return {
    ok: result.allowed,
    reason: result.allowed ? '' : category === 'violence' ? REASON.violence : category === 'hate' ? REASON.hate : category === 'revealing' ? REASON.revealing : REASON.sexual,
    labels: [{ name: category, confidence: Number(result.confidence) || 0 }],
    provider: 'vision-ai'
  };
}

/**
 * Check one uploaded image file. Returns { ok, reason, provider, labels }.
 * `profile: true` is stricter (profile photos). `ok: false` with
 * `unavailable: true` means no checker could answer: ask the person to try again.
 */
// Answers for files already checked (same bytes, same strictness), for a day
const recent = new Map();
const DAY = 24 * 60 * 60 * 1000;

async function moderateImage(filePath, mimeType, opts = {}) {
  if (process.env.MODERATION_DISABLED === '1') return { ok: true, provider: 'disabled', labels: [] };
  let key = '';
  try { key = `${opts.profile ? 'p' : 'g'}:${crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')}`; } catch { /* unreadable: checked below */ }
  const hit = key && recent.get(key);
  if (hit && Date.now() - hit.at < DAY) return hit.result;
  const result = await checkImage(filePath, mimeType, opts);
  if (key && !result.unavailable) {
    recent.set(key, { result, at: Date.now() });
    if (recent.size > 5000) recent.delete(recent.keys().next().value);
  }
  return result;
}

async function checkImage(filePath, mimeType, { profile = false } = {}) {
  const img = await preview(filePath, mimeType);
  if (!img) return { ok: false, reason: "This file couldn't be read as an image. Please try a JPG or PNG.", provider: 'none', labels: [] };
  return checkBytes(img.bytes, img.mime, { profile });
}

// The check itself, on a ready-made preview (JPEG bytes)
async function checkBytes(bytes, mime, { profile = false } = {}) {
  const img = { bytes, mime };

  if (useRekognition() && Date.now() > rekognitionOffUntil) {
    try {
      return await checkWithRekognition(img.bytes, { profile });
    } catch (error) {
      // Not allowed or not set up (permissions, credentials): stop asking for a while, so each
      // upload doesn't wait on a call that can't work
      if (/AccessDenied|UnrecognizedClient|InvalidSignature|CredentialsProvider|Could not load credentials|SubscriptionRequired/i.test(`${error.name} ${error.message}`)) {
        rekognitionOffUntil = Date.now() + 15 * 60 * 1000;
      }
      console.error('Image moderation (Rekognition) failed, using the vision AI:', error.name || '', error.message);
    }
  }
  // Small previews for the vision AI, which counts image size against its per-minute allowance
  const shrink = async (size, quality) => (sharp && await sharp(img.bytes).resize(size, size, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality }).toBuffer()
    .then((b) => ({ bytes: b, mime: 'image/jpeg' })).catch(() => null)) || img;
  let small = await shrink(384, 75);
  // The free AI plan limits requests per minute: wait and retry briefly before giving up
  // (kept short so an upload never waits close to a minute)
  for (const wait of [0, 2000, 5000]) {
    if (wait) await sleep(wait);
    try {
      return await checkWithVisionAi(small.bytes, small.mime, { profile });
    } catch (error) {
      // Too big for the plan: try again straight away with a smaller preview
      if (/request too large/i.test(error.message) && small.bytes.length > 12000) { small = await shrink(256, 60); continue; }
      const limited = /429|rate limit|rate-limited/i.test(error.message);
      console.error(`Image moderation (vision AI) failed${limited ? ', rate-limited' : ''}:`, error.message.slice(0, 160));
      if (!limited) break;
    }
  }
  return { ok: false, unavailable: true, reason: "We couldn't check this image for safety right now. Please try again in a minute.", provider: 'none', labels: [] };
}

/**
 * Check several multer files. Refused images have their temp files removed.
 * Images no checker could answer right now are let through with
 * `file.recheck` set (a small preview to check again later with checkLater).
 * Returns { ok, rejected: [{ name, reason }], pending: count }.
 */
async function moderateFiles(files, { profile = false, userId = '' } = {}) {
  // Two at a time, to stay inside the AI's per-minute limits on big batches
  const results = [];
  for (let i = 0; i < files.length; i += 2) {
    results.push(...await Promise.all(files.slice(i, i + 2).map(async (f) => ({ f, r: /^image\//.test(f.mimetype) ? await moderateImage(f.path, f.mimetype, { profile }) : { ok: true } }))));
  }
  const rejected = results.filter(({ r }) => !r.ok && !r.unavailable);
  for (const { f, r } of rejected) {
    console.warn(`Image refused for user ${userId}: ${f.originalname} (${r.provider}: ${(r.labels || []).map((l) => `${l.name} ${l.confidence}`).join(', ')})`);
  }
  if (rejected.length) {
    for (const f of files) { try { if (f.path && fs.existsSync(f.path)) fs.unlinkSync(f.path); } catch { /* already gone */ } }
    return { ok: false, rejected: rejected.map(({ f, r }) => ({ name: f.originalname, reason: r.reason })), pending: 0 };
  }
  // Not checked yet: keep a small preview so it can be checked after it's stored
  const pending = results.filter(({ r }) => r.unavailable);
  for (const { f } of pending) {
    const img = await preview(f.path, f.mimetype).catch(() => null);
    if (img) f.recheck = { bytes: img.bytes, mime: img.mime, profile, userId, name: f.originalname };
  }
  if (pending.length) console.warn(`Image safety check unavailable: ${pending.length} image(s) from user ${userId} stored and queued for a later check`);
  return { ok: true, rejected: [], pending: pending.length };
}

// Checked again 30 s, 1, 2, 4 and 8 minutes after upload
const RECHECK_DELAYS = [30e3, 60e3, 120e3, 240e3, 480e3];

/**
 * Check a stored image again in the background (file.recheck from moderateFiles).
 * `remove()` deletes it from storage if it's refused.
 */
function checkLater(recheck, remove) {
  if (!recheck) return;
  let attempt = 0;
  const run = async () => {
    try {
      const r = await checkBytes(recheck.bytes, recheck.mime, { profile: recheck.profile });
      if (r.ok) return;
      if (!r.unavailable) {
        console.warn(`Image refused after upload for user ${recheck.userId}: ${recheck.name} (${r.provider}: ${(r.labels || []).map((l) => `${l.name} ${l.confidence}`).join(', ')}); removing it`);
        await remove();
        return;
      }
    } catch (error) {
      console.error('Later image check failed:', error.message);
    }
    if (attempt < RECHECK_DELAYS.length) setTimeout(run, RECHECK_DELAYS[attempt++]).unref();
    else console.warn(`Image never checked (no checker answered): ${recheck.name} from user ${recheck.userId}`);
  };
  setTimeout(run, RECHECK_DELAYS[attempt++]).unref();
}

module.exports = { moderateImage, moderateFiles, checkLater };
