import axios from 'axios';
import { API_URL } from '../config/api';

// Image uploads, the same everywhere: check the format first, shrink big photos
// in the browser (phone photos are often 5–10 MB), then upload each photo on
// its own, a few at a time, so one slow or refused photo doesn't fail the rest.

export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';
export const IMAGE_FORMAT_ERROR = 'Please select an image in JPEG or PNG format.';
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 18 * 1024 * 1024;
const UPLOAD_TIMEOUT = 120000;

/** True for the formats BeeBark takes (JPEG, PNG, WebP, GIF) */
// (the name's extension must be one of these too, as the server checks both; e.g. .jfif is refused)
export const isSupportedImage = (file) => Boolean(file)
  && (TYPES.includes(file.type) || !file.type)
  && /\.(jpe?g|png|webp|gif)$/i.test(file.name || '');

/** Why this file can't be uploaded, or '' */
export const imageFileError = (file) => {
  if (!isSupportedImage(file)) return IMAGE_FORMAT_ERROR;
  if (file.size > MAX_BYTES) return `${file.name || 'This image'} is too large. Each image must be under 18 MB.`;
  return '';
};

/**
 * A smaller copy of a big photo (longest side `maxSide`, JPEG; PNGs stay PNG so
 * logos keep their transparency). Small images, GIFs and anything the browser
 * can't read go as they are.
 */
export async function shrinkImage(file, { maxSide = 2400, quality = 0.85 } = {}) {
  if (file.type === 'image/gif' || typeof createImageBitmap !== 'function') return file;
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file;
  }
  try {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= 1.5 * 1024 * 1024) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, quality));
    if (!blob || blob.size >= file.size) return file;
    const name = (file.name || 'image').replace(/\.[a-z0-9]+$/i, '') + (type === 'image/png' ? '.png' : '.jpg');
    return new File([blob], name, { type, lastModified: Date.now() });
  } finally {
    bitmap.close?.();
  }
}

/** The message to show for a failed upload */
export const uploadErrorMessage = (error) => {
  const data = error?.response?.data;
  if (data?.error) return data.error;
  if (error?.code === 'ECONNABORTED' || /timeout/i.test(error?.message || '')) return 'The upload took too long. Please try again.';
  if (!error?.response) return 'The upload failed. Please check your connection and try again.';
  return 'The upload failed. Please try again.';
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Worth one more try: the safety check was busy (503), the connection dropped or timed out
const retryable = (error) => !error?.response || error.response.status === 503 || error.code === 'ECONNABORTED';

/**
 * Upload one image; resolves to its URL. `endpoint` is /api/upload/image (default)
 * or /api/upload/profile-photo. Throws with a message ready to show.
 */
export async function uploadImage(file, { endpoint = '/api/upload/image', maxSide } = {}) {
  const problem = imageFileError(file);
  if (problem) throw new Error(problem);
  const ready = await shrinkImage(file, maxSide ? { maxSide } : undefined);
  for (let attempt = 0; ; attempt += 1) {
    const body = new FormData();
    body.append('image', ready);
    try {
      const res = await axios.post(`${API_URL}${endpoint}`, body, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: UPLOAD_TIMEOUT });
      return res.data.url;
    } catch (error) {
      if (attempt === 0 && retryable(error)) { await sleep(2500); continue; }
      throw Object.assign(new Error(uploadErrorMessage(error)), { refused: Boolean(error.response?.data?.moderation && !error.response?.data?.retry) });
    }
  }
}

/**
 * Upload several images, `concurrency` at a time. Resolves to
 * { uploaded: [{ file, url }] in the order given, failed: [{ file, error }] }.
 * onProgress(done, total) after each one.
 */
export async function uploadImages(files, { concurrency = 3, onProgress, maxSide } = {}) {
  const list = Array.from(files || []);
  const results = new Array(list.length);
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < list.length) {
      const i = next;
      next += 1;
      try {
        results[i] = { file: list[i], url: await uploadImage(list[i], { maxSide }) };
      } catch (error) {
        results[i] = { file: list[i], error: error.message, refused: error.refused };
      }
      done += 1;
      onProgress?.(done, list.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, list.length) }, worker));
  return { uploaded: results.filter((r) => r.url), failed: results.filter((r) => !r.url) };
}

/** One toast-ready line about the photos that failed */
export const failedSummary = (failed, total) => {
  if (!failed.length) return '';
  const first = failed[0].error;
  if (failed.length === 1) return total > 1 ? `${failed[0].file.name}: ${first}` : first;
  const same = failed.every((f) => f.error === first);
  return `${failed.length} of ${total} photos weren't added. ${same ? first : 'Please try those again.'}`;
};
