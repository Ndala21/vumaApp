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
