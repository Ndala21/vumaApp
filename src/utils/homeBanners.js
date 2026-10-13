/**
 * VUMA Store - Home banner placement rules (no screens, no network).
 *
 * The Admin puts every banner in a position (see BANNER_PLACEMENTS on the
 * server). The built-in cards and strips on the Home screen stay exactly as
 * they are; this file only decides, for every position, whether a banner
 * takes its place:
 *
 *   - a live banner is assigned to the position  -> show the banner and hide
 *     the built-in card/strip of that same position (no duplicates)
 *   - no live banner is assigned                 -> show the built-in one
 *
 * The server already drops banners that are switched off, not started yet or
 * finished, so everything that arrives here is live.
 */

// Built-in "VUMA Faida & Ofa" card  ->  banner position that replaces it
export const CARD_SLOT = {
  coupons: 'faida_coupons',
  welcome_gift: 'faida_welcome_gift',
  flash_sale: 'faida_flash_sale',
  free_delivery: 'faida_free_delivery',
  referral: 'faida_referral',
};

// Order of the built-in cards inside the row
export const CARD_ORDER = ['coupons', 'welcome_gift', 'flash_sale', 'free_delivery', 'referral'];

// How many banners one position shows
const SLOT_LIMIT = { above_trending: 3 };
const SINGLE = 1;

const cleanList = (list) => (Array.isArray(list) ? list.filter((b) => b && typeof b === 'object' && b.id) : []);

/**
 * Sort the banners the server sent into: hero (top slider), feed (between the
 * products) and slots (every other position, a list per position).
 * A banner from an older server has no position -> it is a top-slider banner.
 * A position this app version does not know is ignored (never shown in the
 * wrong place). A banner without a picture never replaces a built-in card.
 */
export function groupBanners(list) {
  const out = { hero: [], feed: [], slots: {} };
  cleanList(list).forEach((b) => {
    const place = b.placement || 'hero';
    if (place === 'hero') { out.hero.push(b); return; }
    if (place === 'feed') { out.feed.push(b); return; }
    if (!b.image) return;
    if (!out.slots[place]) out.slots[place] = [];
    out.slots[place].push(b);
  });
  Object.keys(out.slots).forEach((k) => { out.slots[k] = out.slots[k].slice(0, SLOT_LIMIT[k] || SINGLE); });
  return out;
}

/** Banners for the All Products list: the "feed" ones, else the top slider ones (as before). */
export function feedBanners(groups) {
  if (!groups) return [];
  return groups.feed.length ? groups.feed : groups.hero;
}

/** The banner that replaces a built-in position, or null. */
export function slotBanner(groups, slot) {
  const list = groups && groups.slots && groups.slots[slot];
  return list && list.length ? list[0] : null;
}

/**
 * The cards of the "VUMA Faida & Ofa" row, in order.
 *   dynamic    - offers from the Offer Engine (kept first, as before)
 *   defaults   - { coupons: card|null, ... } the built-in cards that are active
 * Returns [{ type: 'card', key, card } | { type: 'banner', key, banner }].
 */
export function buildFaidaRow(groups, dynamic, defaults) {
  const row = [];
  (dynamic || []).forEach((card) => { if (card && card.show !== false) row.push({ type: 'card', key: card.key, card }); });
  CARD_ORDER.forEach((key) => {
    const banner = slotBanner(groups, CARD_SLOT[key]);
    if (banner) { row.push({ type: 'banner', key: `banner_${banner.id}`, banner }); return; }
    const card = defaults && defaults[key];
    if (card) row.push({ type: 'card', key, card });
  });
  return row;
}

/** Every banner (id list) the Home screen puts on a position other than the sliders. */
export function slotBannerIds(groups) {
  const ids = [];
  Object.keys((groups && groups.slots) || {}).forEach((k) => groups.slots[k].forEach((b) => ids.push(b.id)));
  return ids;
}

/**
 * What tapping a banner does. Returns { kind, ... } or null (nothing to do).
 * Web links must start with http:// or https://.
 */
export function bannerAction(banner) {
  if (!banner) return null;
  const type = banner.link_type;
  const value = typeof banner.link_value === 'string' ? banner.link_value.trim() : '';
  switch (type) {
    case 'product': return value ? { kind: 'product', id: value } : null;
    case 'category': return value ? { kind: 'category', slug: value } : null;
    case 'url': return /^https?:\/\/\S+$/i.test(value) ? { kind: 'url', url: value } : null;
    case 'flash_sale':
    case 'coupons':
    case 'welcome_gift':
    case 'referral':
    case 'seller_register':
    case 'all_products':
      return { kind: type };
    default:
      return null;
  }
}

/** 50000 -> "50,000" (does not depend on the phone's language data). */
export function formatAmount(n) {
  const v = Math.round(Number(n));
  if (!isFinite(v)) return '';
  return String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
