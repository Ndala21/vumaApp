/**
 * VUMA Store - what the Home screen shows, worked out from the real shop data.
 *
 * Nothing here is typed in by hand: the New arrivals row, the category bar and the flash-sale percentage all
 * come from what the server sends right now, so they follow the shop when sellers add products.
 */

// A product counts as a "new arrival" for this many days after a seller adds it.
export const NEW_ARRIVAL_DAYS = 14;
// How many new arrivals the row shows.
export const NEW_ARRIVAL_MAX = 8;

const DAY_MS = 24 * 60 * 60 * 1000;

// Dates from the server look like 2026-11-15T01:12:58.123456+03:00 (six decimals). Some phones read only three,
// so the extra decimals are cut before the date is read. Returns milliseconds, or NaN when it is not a date.
export function readTime(value) {
  if (value instanceof Date) return value.getTime();
  if (typeof value !== 'string' || !value) return NaN;
  let text = value.trim().replace(' ', 'T').replace(/(\.\d{3})\d+/, '$1');
  // a date with a time but no time zone is read as UTC (phones would otherwise read it in their own time zone)
  if (/T\d{2}:\d{2}/.test(text) && !/(Z|[+-]\d{2}:?\d{2})$/i.test(text)) text += 'Z';
  return Date.parse(text);
}

// The products added in the last NEW_ARRIVAL_DAYS days that a customer can buy now, newest first.
export function pickNewArrivals(list, nowMs) {
  const now = typeof nowMs === 'number' ? nowMs : Date.now();
  const cutoff = now - NEW_ARRIVAL_DAYS * DAY_MS;
  const rows = Array.isArray(list) ? list : [];
  return rows
    .filter((p) => p && p.id != null)
    .filter((p) => p.is_in_stock !== false && (p.status == null || p.status === 'active'))
    .map((p) => ({ p, at: readTime(p.created_at) }))
    .filter((x) => !Number.isNaN(x.at) && x.at >= cutoff && x.at <= now + DAY_MS)
    .sort((a, b) => b.at - a.at)
    .slice(0, NEW_ARRIVAL_MAX)
    .map((x) => x.p);
}

// The biggest real discount among the flash-sale products, in whole percent (rounded down, so the card never
// promises more than a product gives). 0 when no flash-sale product shows a discount.
export function flashSalePercent(items) {
  let best = 0;
  (Array.isArray(items) ? items : []).forEach((p) => {
    if (!p) return;
    const price = Number(p.price) || 0;
    const original = Number(p.original_price) || 0;
    const flash = Number(p.flash_sale_price) || 0;
    const reference = Math.max(price, original);
    const sale = flash > 0 ? flash : price;
    let pct = reference > 0 && sale < reference ? Math.floor(((reference - sale) / reference) * 100) : 0;
    const given = Number(p.discount_percent) || 0;
    if (given > pct && given < 100) pct = Math.floor(given);
    if (pct > best && pct < 100) best = pct;
  });
  return best;
}

function isEmoji(text) {
  return typeof text === 'string' && text.length > 0 && text.length <= 8 && /[^\x00-\x7F]/.test(text);
}

// The icon a category gets when nobody chose one (the shopping bags). It says nothing about the category.
const GENERIC_ICONS = ['\u{1F6CD}\uFE0F', '\u{1F6CD}'];

// Icons by what a category is about. Used only when the server has no icon of its own for it and the built-in
// list does not know it, so every category still gets a fitting picture.
const ICON_WORDS = [
  [/shoe|sneaker|boot|sandal|footwear/, '\u{1F45F}'],
  [/phone|mobile/, '\u{1F4F1}'],
  [/computer|laptop|tablet/, '\u{1F4BB}'],
  [/electronic|appliance|\btvs?\b/, '\u{1F4FA}'],
  [/fashion|cloth|wear|apparel|dress|shirt|garment/, '\u{1F457}'],
  [/jewel|watch/, '\u{1F48D}'],
  [/\bbags?\b|luggage/, '\u{1F45C}'],
  [/beauty|cosmetic|makeup|salon/, '\u{1F484}'],
  [/health|pharmac|medic|wellness/, '\u{1F48A}'],
  [/baby|\bkids?\b|child/, '\u{1F476}'],
  [/\btoys?\b|\bgames?\b/, '\u{1F9F8}'],
  [/sport|fitness|gym/, '\u26BD'],
  [/\bpets?\b/, '\u{1F415}'],
  [/livestock|cattle|poultry/, '\u{1F404}'],
  [/agri|farm|mazao|crop|seed|fertili/, '\u{1F33E}'],
  [/produce|vegetable|fruit/, '\u{1F966}'],
  [/grocer|supermarket/, '\u{1F6D2}'],
  [/food|cake|bakery|restaurant|drink|beverage|snack/, '\u{1F370}'],
  [/furniture|sofa|\bbeds?\b/, '\u{1F6CB}'],
  [/kitchen|cooking|dining|tableware|crockery/, '\u{1F373}'],
  [/home|house|living|decor/, '\u{1F3E1}'],
  [/auto|\bcars?\b|vehicle|motor|spare|tyre|tire/, '\u{1F697}'],
  [/book|stationery|school/, '\u{1F4DA}'],
  [/construction|building|cement/, '\u{1F9F1}'],
  [/hardware|tools?\b/, '\u{1F527}'],
  [/office|printing/, '\u{1F58A}'],
  [/service/, '\u{1F6E0}'],
];

// The server's own icon first, then the built-in one for the same slug, then one that fits the name, then a box.
function iconFor(category, known) {
  const own = typeof category.icon === 'string' ? category.icon.trim() : '';
  if (isEmoji(own) && GENERIC_ICONS.indexOf(own) === -1) return own;
  if (known[category.slug] && known[category.slug].icon) return known[category.slug].icon;
  const text = (String(category.slug || '') + ' ' + String(category.name || '')).toLowerCase();
  for (let i = 0; i < ICON_WORDS.length; i++) {
    if (ICON_WORDS[i][0].test(text)) return ICON_WORDS[i][1];
  }
  return '\u{1F4E6}';
}

function nameOf(category, locale) {
  const translated = category['name_' + locale];
  if (typeof translated === 'string' && translated.trim()) return translated.trim();
  return String(category.name || category.slug || '').trim();
}

// The category bar: "All", then every real category that has products, the busiest first.
//   real     - the categories the server sent (name, slug, icon, product_count, ...)
//   builtin  - the built-in list, used only when the server list could not be loaded
//   options  - { all: the word for All, locale: 'en' | 'sw' ..., ready: the category request has been answered }
export function buildCategoryBar(real, builtin, options) {
  const opts = options || {};
  const all = { id: 'all', label: opts.all || 'All', icon: '\u{1F3E0}', slug: '' };
  const fallback = (Array.isArray(builtin) ? builtin : []).filter((c) => c && c.id !== 'all');
  const known = {};
  fallback.forEach((c) => { if (c.slug) known[c.slug] = c; });

  const list = (Array.isArray(real) ? real : []).filter((c) => c && c.slug && c.is_active !== false);
  if (list.length === 0) {
    // Before the answer arrives only "All" shows (the bar does not jump). If the request failed, the built-in
    // list keeps the bar usable.
    return opts.ready ? [all, ...fallback] : [all];
  }

  const counted = list.some((c) => typeof c.product_count === 'number');
  const shown = (counted ? list.filter((c) => Number(c.product_count) > 0) : list.slice())
    .map((c, i) => ({ c, i }))
    .sort((a, b) => {
      const byCount = (Number(b.c.product_count) || 0) - (Number(a.c.product_count) || 0);
      if (byCount !== 0) return byCount;
      const byOrder = (Number(a.c.order) || 0) - (Number(b.c.order) || 0);
      return byOrder !== 0 ? byOrder : a.i - b.i;
    })
    .map((x) => x.c);

  return [
    all,
    ...shown.map((c) => ({
      id: String(c.id != null ? c.id : c.slug),
      slug: c.slug,
      label: nameOf(c, opts.locale),
      icon: iconFor(c, known),
    })),
  ];
}
