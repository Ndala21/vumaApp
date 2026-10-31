/**
 * VUMA Store — product option (variant) helpers for the customer product page.
 *
 * A seller adds options one combination at a time (e.g. size M + colour Red,
 * 5 in stock). When every option fills two or more of the same attributes
 * (size AND colour ...) the customer picks one value per attribute, like on
 * Coupang. Otherwise the options are shown as one simple list.
 *
 * Pure functions only - no React - so they can be tested on their own.
 */

export const VARIANT_ATTRS = ['size', 'color', 'material', 'storage', 'ram', 'model_name', 'weight_volume'];

export const ATTR_LABELS = {
  size: 'Size',
  color: 'Color',
  material: 'Material',
  storage: 'Storage',
  ram: 'RAM',
  model_name: 'Model',
  weight_volume: 'Weight / Volume',
};

const val = (v, k) => String(v && v[k] != null ? v[k] : '').trim();
const same = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

export const stockOf = (v) => {
  const n = Number(v && v.stock);
  return Number.isFinite(n) ? n : 0;
};

// An option can be bought when it has stock and has not been switched off.
export const isBuyable = (v) => !!v && v.is_active !== false && stockOf(v) > 0;

export const variantName = (v) => {
  if (v && v.display_name) return String(v.display_name);
  const parts = VARIANT_ATTRS.map((k) => val(v, k)).filter(Boolean);
  return parts.length ? parts.join(' / ') : 'Option';
};

export const priceAdjustmentOf = (v) => {
  const n = Number(v && v.price_adjustment);
  return Number.isFinite(n) ? n : 0;
};

// Decides how the options are shown: 'grouped' (one row per attribute) or 'flat'.
export const buildOptionModel = (variants) => {
  const list = Array.isArray(variants) ? variants.filter(Boolean) : [];
  const flat = { mode: 'flat', variants: list, rows: [], fixed: {} };
  if (list.length === 0) return flat;

  const used = VARIANT_ATTRS.filter((k) => list.some((v) => val(v, k)));
  if (used.length < 2) return flat;
  // Every option must fill every used attribute, otherwise the grid has holes.
  if (!list.every((v) => used.every((k) => val(v, k)))) return flat;
  // Each combination must be unique, otherwise one tap could mean two options.
  const seen = new Set();
  for (let i = 0; i < list.length; i += 1) {
    const key = used.map((k) => val(list[i], k).toLowerCase()).join('\u0001');
    if (seen.has(key)) return flat;
    seen.add(key);
  }

  const all = used.map((k) => {
    const values = [];
    list.forEach((v) => {
      const x = val(v, k);
      if (!values.some((y) => same(y, x))) values.push(x);
    });
    return { key: k, values };
  });
  const rows = all.filter((r) => r.values.length > 1);
  if (rows.length < 2) return flat;
  const fixed = {};
  all.filter((r) => r.values.length === 1).forEach((r) => { fixed[r.key] = r.values[0]; });
  return { mode: 'grouped', variants: list, rows, fixed };
};

const agrees = (v, choice, skipKey) =>
  Object.keys(choice).every((k) => k === skipKey || same(val(v, k), choice[k]));

// Can the customer still pick `value` in row `rowKey`, given what is chosen in the other rows?
export const optionStatus = (model, choice, rowKey, value) => {
  const matching = model.variants.filter((v) => same(val(v, rowKey), value) && agrees(v, choice, rowKey));
  return { exists: matching.length > 0, available: matching.some(isBuyable) };
};

// New choice after the customer taps `value` in row `rowKey` (tapping it again clears it).
export const chooseOption = (model, choice, rowKey, value) => {
  const next = Object.assign({}, choice);
  if (next[rowKey] && same(next[rowKey], value)) {
    delete next[rowKey];
    return next;
  }
  next[rowKey] = value;
  // Drop earlier picks that can no longer lead to an option that is in stock.
  Object.keys(next).forEach((k) => {
    if (k === rowKey) return;
    if (!model.variants.some((v) => isBuyable(v) && agrees(v, next))) delete next[k];
  });
  return next;
};

// The option that matches every row, or null while something is still unpicked.
export const resolveVariant = (model, choice) => {
  if (model.mode !== 'grouped') return null;
  if (!model.rows.every((r) => choice[r.key])) return null;
  return model.variants.find((v) => agrees(v, choice)) || null;
};

// Rebuilds the row picks from an option that is already selected.
export const choiceFromVariant = (model, variant) => {
  const choice = {};
  if (model.mode !== 'grouped' || !variant) return choice;
  model.rows.forEach((r) => {
    const x = val(variant, r.key);
    const hit = r.values.find((y) => same(y, x));
    if (hit) choice[r.key] = hit;
  });
  return choice;
};

// Does any option define a size? Then the old separate size picker is not needed.
export const variantsDefineSize = (variants) =>
  Array.isArray(variants) && variants.some((v) => val(v, 'size'));

// The options a customer may see: the ones the seller has not switched off.
export const activeVariants = (variants) =>
  Array.isArray(variants) ? variants.filter((v) => v && v.is_active !== false) : [];

// How many units can be bought right now.
//  - no options: the product's own stock
//  - an option is chosen: that option's stock
//  - options, none chosen yet: all options together
export const unitsAvailable = (product, variants, selectedVariant) => {
  const list = activeVariants(variants);
  if (list.length === 0) {
    const n = Number(product && product.stock);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }
  if (selectedVariant) return Math.max(0, stockOf(selectedVariant));
  return list.reduce((sum, v) => sum + Math.max(0, stockOf(v)), 0);
};

// ── Colour photos ─────────────────────────────────────
// The seller can choose one of the product's own pictures for each colour. The
// server sends it on every option as image_id / image_url, and the best selling
// colours as color_sales_rank (1 or 2). Pure helpers, no React.

const colorOf = (v) => val(v, 'color');

// Photo and sales rank of one colour, taken from the options of that colour.
export const colorPhotoInfo = (variants, colorValue) => {
  let imageId = null;
  let imageUrl = null;
  let rank = null;
  activeVariants(variants).forEach((v) => {
    if (!same(colorOf(v), colorValue)) return;
    if (!imageUrl && v.image_url) {
      imageUrl = String(v.image_url);
      imageId = v.image_id != null ? String(v.image_id) : null;
    }
    const r = Number(v.color_sales_rank);
    if (r === 1 || r === 2) rank = rank == null ? r : Math.min(rank, r);
  });
  return { imageUrl, imageId, rank };
};

// Does any option the customer can see have a colour photo?
export const hasColorPhotos = (variants) =>
  activeVariants(variants).some((v) => colorOf(v) && v.image_url);

// Options that differ by colour only (every option has a colour and nothing else).
export const isColorOnly = (variants) => {
  const list = activeVariants(variants);
  return list.length > 0 && list.every((v) => colorOf(v) && VARIANT_ATTRS.every((k) => k === 'color' || !val(v, k)));
};

// Position of a picture in the product's gallery, or -1.
export const galleryIndexOf = (images, imageId) => {
  if (imageId == null || !Array.isArray(images)) return -1;
  return images.findIndex((img) => img && img.id != null && String(img.id) === String(imageId));
};

// ── Colour photos: seller side ────────────────────────
// A picture is referred to as 'id:<server id>' once it is on the server, or as
// 'uri:<phone path>' while it is still waiting to be uploaded.
export const imageRefOf = (img) => {
  if (!img) return '';
  if (img.isExisting !== false && img.id != null && img.id !== '') return `id:${img.id}`;
  return img.uri ? `uri:${img.uri}` : '';
};

export const colorsOf = (variants) => {
  const seen = [];
  (Array.isArray(variants) ? variants : []).forEach((v) => {
    const c = colorOf(v);
    if (c && !seen.some((x) => same(x, c))) seen.push(c);
  });
  return seen;
};

// The picture reference shared by the options of one colour ('' when none).
export const photoRefOfColor = (variants, colorValue) => {
  const hit = (Array.isArray(variants) ? variants : []).find((v) => same(colorOf(v), colorValue) && v.image_ref);
  return hit ? hit.image_ref : '';
};

// Give every option of this colour the picture `ref` ('' removes it).
export const setColorPhoto = (variants, colorValue, ref) =>
  (Array.isArray(variants) ? variants : []).map((v) =>
    (same(colorOf(v), colorValue) ? Object.assign({}, v, { image_ref: ref || '' }) : v));

// Forget a picture that was removed from the product.
export const clearPhotoRef = (variants, ref) =>
  (Array.isArray(variants) ? variants : []).map((v) =>
    (ref && v.image_ref === ref ? Object.assign({}, v, { image_ref: '' }) : v));

// Turns a picture reference into what the server needs, for variantsForSave.
//  - 'id:...'  a picture already on the server: its id (null if it is no longer one of the product's pictures)
//  - ''        no photo chosen: null clears it
//  - 'uri:...' a picture that is still on the phone: left out of the first save (undefined),
//              and, once `uploadedIds` (phone path -> server id) is known, its new id, or null
//              if that picture failed to upload.
export const picturesResolver = (productImages, uploadedIds) => {
  const ids = new Set((Array.isArray(productImages) ? productImages : [])
    .filter((img) => img && img.isExisting && img.id != null)
    .map((img) => String(img.id)));
  return (ref) => {
    if (!ref) return null;
    if (String(ref).indexOf('id:') === 0) return ids.has(String(ref).slice(3)) ? String(ref).slice(3) : null;
    if (!uploadedIds) return undefined;
    return uploadedIds[String(ref).slice(4)] || null;
  };
};

// What is sent to the server. `resolve(ref)` gives the server id of a picture, null
// to clear it, or undefined to leave the option's picture as it is.
export const variantsForSave = (variants, resolve) =>
  (Array.isArray(variants) ? variants : []).map((v) => {
    const out = {};
    Object.keys(v).forEach((k) => {
      if (['image_ref', 'image_url', 'image_id', 'color_sales_rank', 'display_name', 'effective_price'].indexOf(k) === -1) out[k] = v[k];
    });
    if (v.image_ref !== undefined) {
      const id = resolve(v.image_ref);
      if (id !== undefined) out.image_id = id;
    }
    return out;
  });

// After the pictures are uploaded: does any option still wait for a new picture?
export const waitsForUpload = (variants) =>
  (Array.isArray(variants) ? variants : []).some((v) => String(v.image_ref || '').indexOf('uri:') === 0);
