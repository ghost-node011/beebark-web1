// Company names compared loosely, so "Crave Design Pvt. Ltd." on a resume finds
// the "Crave Design" page: case, punctuation, "&"/"and" and legal endings
// (Pvt Ltd, LLP, Inc…) don't matter.
const LEGAL_ENDING = /\b(private limited|pvt\.? ?ltd|pvt|ltd|limited|llp|inc|incorporated|corp|corporation|co|company|india)\.?$/;

function companyKey(name) {
  let key = String(name || '').toLowerCase().replace(/&/g, ' and ').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  key = key.replace(/^the /, '');
  for (let i = 0; i < 3; i += 1) {
    const shorter = key.replace(LEGAL_ENDING, '').trim();
    if (!shorter || shorter === key) break;
    key = shorter;
  }
  return key;
}

// The first word of a name's key, to find candidate pages before comparing keys
const firstWord = (name) => companyKey(name).split(' ')[0] || '';

module.exports = { companyKey, firstWord };
