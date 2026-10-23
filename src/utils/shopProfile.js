/**
 * VUMA Store - the seller's "Shop profile" screen: text and small helpers.
 *
 * Pure data and pure functions - no React - so they can be tested on their own.
 * Text comes in English and Kiswahili (app language 'sw' gets Kiswahili, everything else English).
 *
 * A shop has three pictures:
 *   logo    - square. Shown next to the shop name and on every product the shop sells.
 *   cover   - wide (16 : 7). The top of the shop page.
 *   poster  - tall (4 : 5). The shop's own advertisement on the shop page.
 * The server checks and shrinks every picture (apps/vendors/shop_images.py); the limits here only
 * save the seller a wasted upload.
 */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const TAGLINE_MAX = 150;
export const DESCRIPTION_MAX = 1000;

export const PICTURES = [
  { id: 'logo',   field: 'shop_logo',          removeField: 'remove_shop_logo',          urlField: 'shop_logo_url',          aspect: [1, 1],  minSide: 120 },
  { id: 'banner', field: 'shop_banner',        removeField: 'remove_shop_banner',        urlField: 'shop_banner_url',        aspect: [16, 7], minSide: 300 },
  { id: 'poster', field: 'promotional_poster', removeField: 'remove_promotional_poster', urlField: 'promotional_poster_url', aspect: [4, 5],  minSide: 300 },
];

const TEXT = {
  en: {
    title: 'Shop profile',
    loading: 'Loading your shop…',
    loadFail: 'Could not load your shop. Pull down to try again.',
    preview: 'How customers see your shop',
    noName: 'Your shop',
    noTagline: 'Your tagline appears here',

    logo: 'Shop logo',
    logoHint: 'A square picture of your logo or your shop front. It shows next to your shop name.',
    banner: 'Cover picture',
    bannerHint: 'A wide picture across the top of your shop page.',
    poster: 'Poster',
    posterHint: 'Your own advertisement: your best offer or your newest products. It shows on your shop page.',
    choose: 'Choose picture',
    change: 'Change picture',
    remove: 'Remove',
    undo: 'Undo',
    willRemove: 'This picture will be removed when you save.',
    picked: 'New picture - not saved yet',
    minSize: 'At least {n} pixels wide and tall.',

    tagline: 'Tagline',
    taglinePlaceholder: 'For example: Quality clothes at fair prices',
    description: 'About your shop',
    descriptionPlaceholder: 'Tell customers what you sell and why they can trust you.',

    save: 'Save changes',
    saving: 'Saving…',
    nothingToSave: 'No changes yet',
    saved: 'Saved',
    savedText: 'Your shop profile is updated.',
    uploading: 'Uploading {n}%',

    permissionTitle: 'Allow photos',
    permissionText: 'Allow VUMA to open your photos so you can choose a picture.',
    pickFail: 'Could not open your photos. Please try again.',
    tooSmall: '{name} is too small ({w} x {h}). It must be at least {n} pixels wide and tall.',
    tooBig: '{name} is too large. The most allowed is 10 MB.',
    saveFail: 'Could not save. Check your internet and try again.',
    error: 'Error',
    ok: 'OK',

    dashNudgeTitle: 'Add your shop logo',
    dashNudgeText: 'Shops with a logo and a poster look more trusted and sell more.',
    dashNudgeBtn: 'Add now',
    menuShopProfile: 'Logo and poster',
  },
  sw: {
    title: 'Wasifu wa duka',
    loading: 'Inapakia duka lako…',
    loadFail: 'Imeshindikana kupakia duka lako. Vuta chini kujaribu tena.',
    preview: 'Wateja wanavyoliona duka lako',
    noName: 'Duka lako',
    noTagline: 'Kauli mbiu yako itaonekana hapa',

    logo: 'Nembo ya duka',
    logoHint: 'Picha ya mraba ya nembo yako au mbele ya duka lako. Inaonekana karibu na jina la duka.',
    banner: 'Picha ya juu',
    bannerHint: 'Picha pana inayoonekana juu ya ukurasa wa duka lako.',
    poster: 'Bango',
    posterHint: 'Tangazo lako mwenyewe: ofa yako bora au bidhaa mpya. Linaonekana kwenye ukurasa wa duka lako.',
    choose: 'Chagua picha',
    change: 'Badilisha picha',
    remove: 'Ondoa',
    undo: 'Rudisha',
    willRemove: 'Picha hii itaondolewa ukihifadhi.',
    picked: 'Picha mpya - bado haijahifadhiwa',
    minSize: 'Angalau pikseli {n} kwa upana na urefu.',

    tagline: 'Kauli mbiu',
    taglinePlaceholder: 'Mfano: Nguo bora kwa bei nafuu',
    description: 'Kuhusu duka lako',
    descriptionPlaceholder: 'Waambie wateja unauza nini na kwa nini wakuamini.',

    save: 'Hifadhi mabadiliko',
    saving: 'Inahifadhi…',
    nothingToSave: 'Hakuna mabadiliko bado',
    saved: 'Imehifadhiwa',
    savedText: 'Wasifu wa duka lako umesasishwa.',
    uploading: 'Inapakia {n}%',

    permissionTitle: 'Ruhusu picha',
    permissionText: 'Ruhusu VUMA kufungua picha zako ili uchague picha.',
    pickFail: 'Imeshindikana kufungua picha zako. Jaribu tena.',
    tooSmall: '{name} ni ndogo sana ({w} x {h}). Lazima iwe angalau pikseli {n} kwa upana na urefu.',
    tooBig: '{name} ni kubwa sana. Kikomo ni MB 10.',
    saveFail: 'Imeshindikana kuhifadhi. Angalia intaneti yako ujaribu tena.',
    error: 'Hitilafu',
    ok: 'Sawa',

    dashNudgeTitle: 'Weka nembo ya duka lako',
    dashNudgeText: 'Maduka yenye nembo na bango huaminika zaidi na huuza zaidi.',
    dashNudgeBtn: 'Weka sasa',
    menuShopProfile: 'Nembo na bango',
  },
};

const fill = (text, vars) => String(text).replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null ? vars[k] : m));

export const sx = (lang, key, vars) => {
  const dict = lang === 'sw' ? TEXT.sw : TEXT.en;
  return fill(dict[key] != null ? dict[key] : (TEXT.en[key] != null ? TEXT.en[key] : key), vars);
};

export const pictureById = (id) => PICTURES.find((p) => p.id === id);

/** What the seller changed, as the object api/vendors updateProfile takes. Nothing changed -> {}. */
export function buildChanges(profile, edits) {
  const data = {};
  const e = edits || {};
  const p = profile || {};
  PICTURES.forEach((pic) => {
    const edit = e[pic.id];
    if (edit === 'remove') {
      if (p[pic.urlField]) data[pic.removeField] = true;
    } else if (edit && edit.uri) {
      data[pic.field] = edit;
    }
  });
  if (typeof e.tagline === 'string') {
    const next = e.tagline.split(/\s+/).filter(Boolean).join(' ');
    if (next !== (p.tagline || '')) data.tagline = next;
  }
  if (typeof e.description === 'string') {
    const next = e.description.trim();
    if (next !== (p.shop_description || '').trim()) data.shop_description = next;
  }
  return data;
}

export const hasChanges = (profile, edits) => Object.keys(buildChanges(profile, edits)).length > 0;

/** Is this picked picture usable? Returns the message for the seller, or '' when it is fine. */
export function checkPicked(lang, picId, asset) {
  const pic = pictureById(picId);
  if (!pic || !asset) return '';
  const name = sx(lang, picId);
  if (asset.fileSize && asset.fileSize > MAX_UPLOAD_BYTES) return sx(lang, 'tooBig', { name });
  const w = Number(asset.width);
  const h = Number(asset.height);
  if (w > 0 && h > 0 && Math.min(w, h) < pic.minSide) {
    return sx(lang, 'tooSmall', { name, w, h, n: pic.minSide });
  }
  return '';
}

const first = (v) => (Array.isArray(v) ? String(v[0] || '') : (typeof v === 'string' ? v : ''));

/** Server refusal -> a message per picture/field, plus a general one. */
export function fieldErrors(err) {
  const out = { logo: '', banner: '', poster: '', tagline: '', general: '' };
  const data = err && err.errors && typeof err.errors === 'object' ? err.errors : null;
  if (data) {
    PICTURES.forEach((pic) => { out[pic.id] = first(data[pic.field]); });
    out.tagline = first(data.tagline);
    out.general = first(data.shop_description) || first(data.detail) || first(data.error) || first(data.non_field_errors);
  }
  const any = out.logo || out.banner || out.poster || out.tagline || out.general;
  if (!any && err) out.general = String(err.message || '');
  return out;
}

/** A shop with no logo is nudged on the seller home. `pictures` is dashboard.shop_pictures. */
export const needsLogo = (pictures) => !!pictures && pictures.logo === false;
