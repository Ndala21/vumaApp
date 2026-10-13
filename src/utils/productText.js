/**
 * VUMA Store — product description helpers
 *
 * A product has ONE description: a short one of 20 words or fewer. It is
 * saved under both `description` and `short_description` (the server keeps
 * the two in step). Older products can still carry a long description from
 * before this rule, so the customer page reads both fields and never loses
 * the old text.
 */

export const MAX_DESC_WORDS = 20;

// Smallest/largest size of the one-line snippet built from an old long description.
const SNIPPET_MIN = 40;
const SNIPPET_MAX = 160;

const squash = (text) => String(text == null ? '' : text).replace(/\s+/g, ' ').trim();

// A product saved without a description keeps its own name there (the server
// fills the old column that way). That is not a description, so it is not shown.
const repeatsName = (text, product) =>
  squash(product && product.name).toLowerCase() === text.toLowerCase();

export const wordCount = (text) => (String(text == null ? '' : text).trim().match(/\S+/g) || []).length;

// Cuts to `max` words. Text that is already short is returned untouched, so a
// space typed at the end of the 20th word is not swallowed while typing.
export const limitWords = (text, max = MAX_DESC_WORDS) => {
  const s = String(text == null ? '' : text);
  const words = s.trim().match(/\S+/g) || [];
  return words.length <= max ? s : words.slice(0, max).join(' ');
};

// First sentence of the AI text when it fits, otherwise its first 20 words.
export const shortenToLimit = (text, max = MAX_DESC_WORDS) => {
  const flat = squash(text);
  if (!flat) return '';
  const sentence = flat.match(/^.+?[.!?](?=\s|$)/);
  if (sentence && wordCount(sentence[0]) <= max) return sentence[0];
  return limitWords(flat, max);
};

// The short text shown under the price on the product page.
export const shortDescriptionOf = (product, maxChars = SNIPPET_MAX) => {
  if (!product) return '';
  const short = squash(product.short_description);
  if (short) return short;
  const long = squash(product.description);
  if (!long || repeatsName(long, product)) return '';
  if (long.length <= maxChars) return long;
  // Old long description: end at the first sentence that is long enough ...
  const window = long.slice(0, maxChars);
  const ends = /[.!?](?=\s)/g;
  let hit;
  while ((hit = ends.exec(window)) !== null) {
    if (hit.index + 1 >= SNIPPET_MIN) return window.slice(0, hit.index + 1);
  }
  // ... otherwise end at a word.
  const space = window.lastIndexOf(' ');
  return (space > SNIPPET_MIN ? window.slice(0, space) : window).replace(/[\s,;:.\-]+$/, '') + '…';
};

// True only when the product still has an older, longer text that the short
// line under the price does not already show in full.
export const hasLongerDescription = (product) => {
  if (!product) return false;
  const full = squash(product.description);
  if (!full || repeatsName(full, product)) return false;
  return full !== shortDescriptionOf(product);
};

// The text to put in the seller's description box when editing. A description
// that only repeats the product name is not the seller's own text: the box
// stays empty instead of showing the name twice.
export const editableDescriptionOf = (product) => {
  if (!product) return '';
  const short = String(product.short_description == null ? '' : product.short_description);
  if (short.trim()) return short;
  const long = String(product.description == null ? '' : product.description);
  return repeatsName(squash(long), product) ? '' : long;
};
