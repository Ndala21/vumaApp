/**
 * VUMA Store — the choices shown under a product on the home screen and in lists.
 *
 * The server sends `option_summary` with every product in a list, for example
 *   { color: ['Black', 'Brown'], size: ['EU 38', 'EU 40', 'EU 43'] }                 (shoes)
 *   { color: ['Black', 'Blue'], storage: ['128GB', '256GB'], ram: ['6GB'] }          (phones)
 * It holds only the options that are switched on and in stock. This file turns
 * it into small colour dots and one short line ("EU 38–43", "128GB–256GB · 6GB RAM").
 *
 * Pure functions only - no React - so they can be tested on their own.
 */

import { COLOR_OPTIONS, findColor } from './productOptions';

export const MAX_DOTS = 4;
const NEUTRAL_DOT = '#D1D5DB';
const EN_DASH = '–';

const clean = (v) => String(v == null ? '' : v).trim();

const uniq = (list) => {
  const seen = [];
  list.forEach((x) => {
    if (x && !seen.some((y) => y.toLowerCase() === x.toLowerCase())) seen.push(x);
  });
  return seen;
};

const listOf = (summary, key) =>
  (summary && Array.isArray(summary[key]) ? uniq(summary[key].map(clean).filter(Boolean)) : []);

// A short list: all of it when it is small, otherwise the first two and how many more.
export const listText = (values, max = 3) => {
  if (values.length <= max) return values.join(', ');
  return `${values.slice(0, 2).join(', ')} +${values.length - 2}`;
};

const LETTER_RANK = {
  XXS: 0, XS: 1, S: 2, M: 3, L: 4, XL: 5, XXL: 6, '2XL': 6, XXXL: 7, '3XL': 7, '4XL': 8, '5XL': 9,
};

const fmtNum = (n) => String(Math.round(n * 10) / 10);

// "EU 38–43", "EU 38, 40, 43", "S–XL", "M, L" ...
export const sizeText = (values) => {
  if (!values.length) return '';
  if (values.length === 1) return values[0];

  // Shoe and number sizes: "EU 40", "UK 8", "42"
  const nums = values.map((v) => /^([A-Za-z]{0,3})\s*(\d{1,3}(?:[.,]\d)?)$/.exec(v));
  if (nums.every(Boolean)) {
    const prefixes = nums.map((m) => m[1].toUpperCase()).filter((x, i, a) => a.indexOf(x) === i);
    if (prefixes.length === 1) {
      const p = prefixes[0] ? `${prefixes[0]} ` : '';
      const ns = nums.map((m) => parseFloat(m[2].replace(',', '.'))).sort((a, b) => a - b);
      if (ns.length <= 3) return `${p}${ns.map(fmtNum).join(', ')}`;
      return `${p}${fmtNum(ns[0])}${EN_DASH}${fmtNum(ns[ns.length - 1])}`;
    }
  }

  // Clothes: S, M, L, XL ...
  const letters = values.map((v) => v.toUpperCase().replace(/\s+/g, ''));
  if (letters.every((v) => LETTER_RANK[v] !== undefined)) {
    const sorted = letters.slice().sort((a, b) => LETTER_RANK[a] - LETTER_RANK[b]);
    if (sorted.length <= 3) return sorted.join(', ');
    return `${sorted[0]}${EN_DASH}${sorted[sorted.length - 1]}`;
  }

  return listText(values);
};

const UNIT_SIZE = { MB: 1, GB: 1024, TB: 1024 * 1024 };

// "64GB", "128GB, 256GB", "64GB–1TB" (phone storage and memory)
export const memoryText = (values) => {
  if (!values.length) return '';
  const parsed = values.map((v) => {
    const m = /^(\d+(?:\.\d+)?)\s*(MB|GB|TB)$/i.exec(v);
    return m ? { text: `${m[1]}${m[2].toUpperCase()}`, size: parseFloat(m[1]) * UNIT_SIZE[m[2].toUpperCase()] } : null;
  });
  if (!parsed.every(Boolean)) return listText(values);
  parsed.sort((a, b) => a.size - b.size);
  if (parsed.length === 1) return parsed[0].text;
  if (parsed.length <= 3) return parsed.map((p) => p.text).join(', ');
  return `${parsed[0].text}${EN_DASH}${parsed[parsed.length - 1].text}`;
};

// What colour to draw for a colour name the seller picked or typed.
export const colorDot = (name) => {
  const known = findColor(name);
  if (known) return known.hex ? { name, hex: known.hex, multi: false } : { name, hex: null, multi: true };
  // "Dark Blue", "Sky blue", "Nyeusi": use the first word that is a colour we know.
  const words = clean(name).toLowerCase().split(/[\s\-\/,&]+/).filter(Boolean);
  for (let i = words.length - 1; i >= 0; i -= 1) {
    const hit = COLOR_OPTIONS.find((c) => c.hex && (c.name.toLowerCase() === words[i] || c.sw.toLowerCase() === words[i]));
    if (hit) return { name, hex: hit.hex, multi: false };
  }
  return { name, hex: NEUTRAL_DOT, multi: false };
};

/**
 * What to show under a product card.
 *   colors      the dots to draw (at most MAX_DOTS)
 *   moreColors  how many more colours there are
 *   line        one short line, or ''
 *   hasChoices  true when the customer has to choose something before buying
 *   label       the same in words, for screen readers
 */
export const cardOptions = (product) => {
  const summary = product && product.option_summary && typeof product.option_summary === 'object'
    ? product.option_summary : {};

  const colorNames = listOf(summary, 'color');
  let sizes = listOf(summary, 'size');
  // Older products keep their sizes on the product itself, not in the options.
  if (!sizes.length && product && product.requires_size && Array.isArray(product.available_sizes)) {
    sizes = uniq(product.available_sizes.map(clean).filter(Boolean));
  }
  const storage = listOf(summary, 'storage');
  const ram = listOf(summary, 'ram');
  const weight = listOf(summary, 'weight_volume');
  const material = listOf(summary, 'material');
  const model = listOf(summary, 'model_name');

  const parts = [];
  if (sizes.length) parts.push(sizeText(sizes));
  if (storage.length) parts.push(memoryText(storage));
  if (ram.length) parts.push(`${memoryText(ram)} RAM`);
  if (weight.length) parts.push(listText(weight));
  if (material.length) parts.push(listText(material));
  if (model.length) parts.push(listText(model));
  const line = parts.slice(0, 2).join(' · ');

  const dots = colorNames.map(colorDot);
  const words = [];
  if (colorNames.length) words.push(`Colors: ${colorNames.join(', ')}`);
  if (line) words.push(line);

  return {
    colors: dots.slice(0, MAX_DOTS),
    moreColors: Math.max(0, dots.length - MAX_DOTS),
    line,
    hasChoices: colorNames.length + sizes.length + storage.length + ram.length + weight.length + material.length + model.length > 0,
    label: words.join('. '),
  };
};
