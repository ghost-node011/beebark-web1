const fs = require('fs');
const { askGroqVisionForJson } = require('./groqClient');

const PROMPT = `You are checking whether an uploaded image is suitable as a profile photo on a
professional networking app.

Accept any genuine photo that clearly shows a real person's face — formal or casual, indoor or
outdoor, any style of dress. Only reject it if it is NOT a real photo of a person at all: a random
object, an animal, a screenshot, a meme, a logo, text/document, an illustration/cartoon avatar, a
blank or corrupted image, or content that is offensive/inappropriate.

Respond ONLY with a JSON object in this exact shape:
{ "suitable": true, "reason": "one short, friendly sentence — if rejecting, explain what to upload instead" }`;

/**
 * Vision check for a profile photo upload. Returns null (never throws) if
 * Groq is unavailable — the caller should then allow the upload through
 * rather than block users because an AI call failed.
 */
const verifyProfilePhoto = async (filePath, mimeType) => {
  try {
    const base64Data = fs.readFileSync(filePath).toString('base64');
    const result = await askGroqVisionForJson(PROMPT, base64Data, mimeType);
    if (typeof result.suitable !== 'boolean') return null;
    return {
      suitable: result.suitable,
      reason: typeof result.reason === 'string' ? result.reason : ''
    };
  } catch (error) {
    console.error('Profile photo verification error:', error.message);
    return null;
  }
};

module.exports = { verifyProfilePhoto };
