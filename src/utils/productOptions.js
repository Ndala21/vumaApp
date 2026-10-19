/**
 * VUMA Store — ready-made lists for product options (seller Add / Edit Product).
 *
 * Sellers tap a colour or a material instead of typing it. The value that is
 * saved is the plain English name (for example "Navy Blue" or "Cotton"), the
 * same kind of text that was typed before, so old products, search and the
 * customer product page keep working. `sw` is the Swahili name shown beside it.
 *
 * Pure data and pure functions only - no React.
 */

// hex is only used to draw the colour dot; the saved value is `name`.
export const COLOR_OPTIONS = [
  { name: 'Black', sw: 'Nyeusi', hex: '#111111' },
  { name: 'White', sw: 'Nyeupe', hex: '#FFFFFF' },
  { name: 'Gray', sw: 'Kijivu', hex: '#9CA3AF' },
  { name: 'Charcoal', sw: 'Kijivu iliyokolea', hex: '#4B5563' },
  { name: 'Silver', sw: 'Fedha', hex: '#C7CBD1' },
  { name: 'Gold', sw: 'Dhahabu', hex: '#D4AF37' },
  { name: 'Rose Gold', sw: 'Rose Gold', hex: '#B76E79' },
  { name: 'Red', sw: 'Nyekundu', hex: '#DC2626' },
  { name: 'Maroon', sw: 'Maroon', hex: '#7F1D1D' },
  { name: 'Pink', sw: 'Pinki', hex: '#F472B6' },
  { name: 'Orange', sw: 'Chungwa', hex: '#F97316' },
  { name: 'Yellow', sw: 'Njano', hex: '#FACC15' },
  { name: 'Cream', sw: 'Krimu', hex: '#FFF1D0' },
  { name: 'Beige', sw: 'Beige', hex: '#E0CDA9' },
  { name: 'Khaki', sw: 'Khaki', hex: '#B5A36A' },
  { name: 'Brown', sw: 'Kahawia', hex: '#7C4A21' },
  { name: 'Green', sw: 'Kijani', hex: '#16A34A' },
  { name: 'Olive', sw: 'Olive', hex: '#6B7A2A' },
  { name: 'Dark Green', sw: 'Kijani iliyokolea', hex: '#14532D' },
  { name: 'Teal', sw: 'Teal', hex: '#0F766E' },
  { name: 'Turquoise', sw: 'Turquoise', hex: '#2DD4BF' },
  { name: 'Light Blue', sw: 'Samawati', hex: '#7DD3FC' },
  { name: 'Blue', sw: 'Buluu', hex: '#2563EB' },
  { name: 'Navy Blue', sw: 'Buluu iliyokolea', hex: '#1E2A5E' },
  { name: 'Purple', sw: 'Zambarau', hex: '#7C3AED' },
  { name: 'Lavender', sw: 'Zambarau hafifu', hex: '#C4B5FD' },
  { name: 'Multicolor', sw: 'Rangi mchanganyiko', hex: null },
];

// Fashion materials, the most used first (the form shows the first few, "More" shows the rest).
export const MATERIAL_OPTIONS = [
  { name: 'Cotton', sw: 'Pamba' },
  { name: 'Polyester', sw: 'Polyester' },
  { name: 'Kitenge', sw: 'Kitenge' },
  { name: 'Denim', sw: 'Denim' },
  { name: 'Leather', sw: 'Ngozi' },
  { name: 'Lace', sw: 'Lesi' },
  { name: 'Linen', sw: 'Kitani' },
  { name: 'Silk', sw: 'Hariri' },
  { name: 'Satin', sw: 'Satin' },
  { name: 'Chiffon', sw: 'Chiffon' },
  { name: 'Khanga', sw: 'Khanga' },
  { name: 'Wool', sw: 'Sufi' },
  { name: 'Velvet', sw: 'Kadifa' },
  { name: 'Nylon', sw: 'Nailoni' },
  { name: 'Jersey', sw: 'Jezi' },
  { name: 'Fleece', sw: 'Fleece' },
  { name: 'Viscose', sw: 'Viscose' },
  { name: 'Spandex', sw: 'Spandex' },
  { name: 'Canvas', sw: 'Turubai' },
  { name: 'Suede', sw: 'Suede' },
  { name: 'Synthetic Leather', sw: 'Ngozi bandia' },
  { name: 'Cotton Blend', sw: 'Pamba mchanganyiko' },
];

// How many materials show before the seller taps "More".
export const MATERIAL_FIRST_COUNT = 10;

const norm = (s) => String(s == null ? '' : s).trim().toLowerCase();

export const findColor = (value) => {
  const v = norm(value);
  if (!v) return null;
  return COLOR_OPTIONS.find((c) => norm(c.name) === v) || null;
};

export const findMaterial = (value) => {
  const v = norm(value);
  if (!v) return null;
  return MATERIAL_OPTIONS.find((m) => norm(m.name) === v) || null;
};

// Is the colour dot light (so a tick on it must be dark)?
export const isLightHex = (hex) => {
  if (!hex || hex.length !== 7) return true;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
};

// "Navy Blue / Buluu iliyokolea" for a known colour, otherwise just what was typed.
export const colorLabel = (value) => {
  const c = findColor(value);
  if (!c) return String(value || '').trim();
  return c.sw && c.sw !== c.name ? `${c.name} / ${c.sw}` : c.name;
};

export const materialLabel = (value) => {
  const m = findMaterial(value);
  if (!m) return String(value || '').trim();
  return m.sw && m.sw !== m.name ? `${m.name} / ${m.sw}` : m.name;
};
