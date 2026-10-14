// Image links that may be saved on profiles, portfolios, posts, listings and
// company pages: only files uploaded through BeeBark (which are checked for
// nudity and other unsafe content on upload), sign-in profile photos from
// Google and LinkedIn, and the Unsplash photos used by demo content. A link to
// any other site would skip that check, so it isn't accepted.
const trimSlash = (s) => String(s || '').replace(/\/+$/, '');

function allowedPrefixes() {
  const out = ['/uploads/', 'https://lh3.googleusercontent.com/', 'https://media.licdn.com/', 'https://images.unsplash.com/'];
  const bucket = (process.env.S3_BUCKET || '').trim();
  if (bucket) {
    const region = process.env.S3_REGION || process.env.AWS_REGION || 'ap-southeast-2';
    out.push(`${trimSlash(process.env.S3_PUBLIC_URL || `https://${bucket}.s3.${region}.amazonaws.com`)}/`);
    out.push(`https://${bucket}.s3.${region}.amazonaws.com/`, `https://${bucket}.s3.amazonaws.com/`);
  }
  const cloud = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();
  if (cloud) out.push(`https://res.cloudinary.com/${cloud}/`);
  return out;
}

const isAllowedImageUrl = (url) => {
  const s = String(url || '').trim();
  if (!s || s.length > 600 || /[\s"'<>]/.test(s)) return false;
  return allowedPrefixes().some((p) => s.startsWith(p));
};

// The links from a list that are allowed (others are dropped)
const allowedImageUrls = (list, max = 20) => (Array.isArray(list) ? list : []).filter(isAllowedImageUrl).slice(0, max);

const IMAGE_URL_ERROR = 'Please upload the image to BeeBark instead of linking to another site';

module.exports = { isAllowedImageUrl, allowedImageUrls, IMAGE_URL_ERROR };
