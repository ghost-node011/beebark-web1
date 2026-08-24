const axios = require('axios');
const { askGroqVisionForJson } = require('./groqClient');

const PROMPT_TEMPLATE = (role, bio) => `Professional's role: ${role || 'professional'}. Bio: ${bio || 'none'}.

Look at this image. Decide in one step, without deliberating: is it a photo of finished or in-progress
professional work (a building, interior, site, listing, product, or similar) that could go in a work
portfolio — as opposed to a selfie, meme, screenshot, random object, or generic stock/lifestyle photo?

Answer immediately with ONLY this JSON object, no other text, no reasoning shown:
- If it IS work: { "isWorkPhoto": true, "title": "short punchy title", "description": "1-2 sentence description of what's shown", "tags": ["up to 4 short tags"] }
- If it is NOT: { "isWorkPhoto": false, "reason": "one short sentence" }`;

const downloadAsBase64 = async (imageUrl) => {
  const response = await axios.get(imageUrl, {
    responseType: 'arraybuffer',
    timeout: 15000,
    headers: { 'User-Agent': 'BeeBark/1.0 (+https://beebark-web1-awus.vercel.app)' }
  });
  const mimeType = response.headers['content-type'] || 'image/jpeg';
  return { base64Data: Buffer.from(response.data).toString('base64'), mimeType };
};

/**
 * Draft a portfolio entry (title/description/tags) for a single uploaded
 * work photo. Returns null (never throws) on any failure — the caller
 * should just drop that image from the batch rather than fail the whole
 * request over one bad image or a transient AI error.
 */
const draftPortfolioEntryFromImage = async (imageUrl, user) => {
  try {
    const { base64Data, mimeType } = await downloadAsBase64(imageUrl);
    const result = await askGroqVisionForJson(PROMPT_TEMPLATE(user?.role, user?.bio), base64Data, mimeType);
    if (typeof result.isWorkPhoto !== 'boolean') return null;
    if (!result.isWorkPhoto) {
      return { imageUrl, isWorkPhoto: false, reason: typeof result.reason === 'string' ? result.reason : "Doesn't look like a work photo" };
    }
    return {
      imageUrl,
      isWorkPhoto: true,
      title: typeof result.title === 'string' ? result.title : 'Untitled Project',
      description: typeof result.description === 'string' ? result.description : '',
      tags: Array.isArray(result.tags) ? result.tags.slice(0, 4) : []
    };
  } catch (error) {
    console.error('Portfolio auto-generate error for', imageUrl, ':', error.message);
    return null;
  }
};

/**
 * Draft portfolio entries for a batch of uploaded work photos in parallel.
 * Entries that fail (bad image, AI unavailable) are simply omitted rather
 * than failing the whole batch.
 */
const draftPortfolioFromImages = async (imageUrls, user) => {
  const results = await Promise.all(imageUrls.map((url) => draftPortfolioEntryFromImage(url, user)));
  return results.filter(Boolean);
};

module.exports = { draftPortfolioFromImages };
