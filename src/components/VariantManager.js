/**
 * VUMA Store — Product Options Manager (Seller Add/Edit Product)
 * (Internally still "variants" in code/API — user-facing label is "Product Options")
 *
 * Shows different fields depending on the product's category:
 *   Fashion (Men/Women/Kids/Clothing)  → Size, Color, Material, Stock
 *   Shoes                                → Shoe Size (EU/UK/US) [required], Color, Stock
 *   Electronics                          → Storage, RAM, Color, Model, Stock
 *   Food / Grocery / Mazao                → Weight/Volume, Stock
 *   Beauty / Cosmetics                    → Volume/Size, Stock
 *   Anything else                         → section is hidden entirely
 *
 * Seller fills in one combination at a time and taps "+ Add Option" —
 * each combination becomes a row in the list below, with its own stock.
 * `variants` / `onChange` hold the full list; the parent screen is
 * responsible for saving it (existing UI/styling untouched — this is
 * purely additive).
 *
 * Colour photos: when the options have colours and the product has pictures,
 * a "Colour photos" box lets the seller choose which of the product's pictures
 * shows each colour to buyers (`images` = the product's pictures). The choice
 * is kept on every option of that colour as `image_ref`.
 */
import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/constants';
import { ColorPicker, MaterialPicker } from './OptionPickers';
import { colorsOf, imageRefOf, photoRefOfColor, setColorPhoto } from '../utils/variants';

const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
const SHOE_SIZES_EU  = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'];
const STORAGE_OPTIONS = ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB'];
const RAM_OPTIONS      = ['3GB', '4GB', '6GB', '8GB', '12GB', '16GB'];

// ── Category → variant type detection ─────────────────
// Keyword match so this keeps working even if exact category names change.
export function getVariantType(categoryName) {
  if (!categoryName) return null;
  const c = categoryName.toLowerCase();
  if (c.includes('shoe') || c.includes('footwear') || c.includes('sneaker')) return 'shoes';
  if (c.includes('electronic') || c.includes('phone') || c.includes('laptop') || c.includes('computer') || c.includes('tablet')) return 'electronics';
  if (c.includes('beauty') || c.includes('cosmetic') || c.includes('skincare') || c.includes('perfume')) return 'beauty';
  if (c.includes('food') || c.includes('grocery') || c.includes('mazao') || c.includes('produce')) return 'food';
  if (c.includes('fashion') || c.includes('cloth') || c.includes('men') || c.includes('women') || c.includes('kid') || c.includes('apparel')) return 'fashion';
  return null;
}

function ChipRow({ options, value, onSelect }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.sm }}>
      <View style={styles.chipRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.chip, value === opt && styles.chipActive]}
            onPress={() => onSelect(value === opt ? '' : opt)}
          >
            <Text style={[styles.chipText, value === opt && styles.chipTextActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

export default function VariantManager({ categoryName, variants = [], onChange, images = [] }) {
  const variantType = useMemo(() => getVariantType(categoryName), [categoryName]);

  // Draft fields for the "add one combination" form
  const [size, setSize] = useState('');
  const [sizeUnit, setSizeUnit] = useState('EU');
  const [color, setColor] = useState('');
  const [material, setMaterial] = useState('');
  const [storage, setStorage] = useState('');
  const [ram, setRam] = useState('');
  const [modelName, setModelName] = useState('');
  const [weightVolume, setWeightVolume] = useState('');
  const [stock, setStock] = useState('');
  // Bumped after each added option so the colour / material pickers start fresh.
  const [pickerKey, setPickerKey] = useState(0);

  if (!variantType) return null;

  // The product's pictures the seller can choose from (the ones that have a picture to show).
  const pictures = (Array.isArray(images) ? images : [])
    .map((img) => ({ ref: imageRefOf(img), uri: (img && (img.image_url || img.uri)) || '' }))
    .filter((pic) => pic.ref && pic.uri);

  const resetDraft = () => {
    setSize(''); setColor(''); setMaterial('');
    setStorage(''); setRam(''); setModelName('');
    setWeightVolume(''); setStock('');
    setPickerKey((k) => k + 1);
  };

  const buildDraft = () => {
    const draft = { stock: parseInt(stock, 10) || 0, price_adjustment: 0, is_active: true };
    if (variantType === 'fashion') {
      draft.size = size; draft.color = color; draft.material = material;
    } else if (variantType === 'shoes') {
      draft.size = size ? `${sizeUnit} ${size}` : ''; draft.color = color;
    } else if (variantType === 'electronics') {
      draft.storage = storage; draft.ram = ram; draft.color = color; draft.model_name = modelName;
    } else if (variantType === 'food' || variantType === 'beauty') {
      draft.weight_volume = weightVolume;
    }
    return draft;
  };

  const hasAnyAttribute = (d) =>
    d.size || d.color || d.material || d.storage || d.ram || d.model_name || d.weight_volume;

  const handleAdd = () => {
    const draft = buildDraft();

    // Shoes: Size is mandatory — a shoe listing without a size is unusable for customers.
    if (variantType === 'shoes' && !size) {
      Alert.alert('Size Required', 'Please select a shoe size before adding this option.');
      return;
    }

    if (!hasAnyAttribute(draft)) return; // need at least one attribute filled
    if (!draft.stock || draft.stock <= 0) {
      Alert.alert('Stock Required', 'Please enter stock quantity for this option.');
      return;
    }
    // A colour that already has a photo keeps it for the new option too.
    const sharedRef = draft.color ? photoRefOfColor(variants, draft.color) : '';
    onChange([...variants, sharedRef ? { ...draft, image_ref: sharedRef } : draft]);
    resetDraft();
  };

  const handleRemove = (index) => {
    onChange(variants.filter((_, i) => i !== index));
  };

  const displayName = (v) => {
    const parts = [v.size, v.color, v.material, v.storage, v.ram, v.model_name, v.weight_volume].filter(Boolean);
    return parts.length ? parts.join(' / ') : 'Option';
  };

  return (
    <View style={styles.container}>
      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionAccent} />
        <Text style={styles.sectionTitle}>Product Options</Text>
      </View>
      <Text style={styles.hint}>
        {variantType === 'shoes'
          ? 'Add each size + color combination with its own stock. Size is required for shoes.'
          : 'Add each option (e.g. size + color) with its own stock. Leave this empty if this product has no options.'}
      </Text>

      {/* ── Fashion: Size + Color + Material ── */}
      {variantType === 'fashion' && (
        <>
          <Text style={styles.fieldLabel}>Size</Text>
          <ChipRow options={CLOTHING_SIZES} value={size} onSelect={setSize} />
          <TextInput
            style={styles.input} value={size} onChangeText={setSize}
            placeholder="Or type a custom size" placeholderTextColor={COLORS.textLight}
          />
          <Text style={styles.fieldLabel}>Color</Text>
          <ColorPicker key={`c${pickerKey}`} value={color} onChange={setColor} />
          <Text style={styles.fieldLabel}>Material</Text>
          <MaterialPicker key={`m${pickerKey}`} value={material} onChange={setMaterial} />
        </>
      )}

      {/* ── Shoes: Size (EU/UK/US) [required] + Color ── */}
      {variantType === 'shoes' && (
        <>
          <Text style={styles.fieldLabel}>Size Unit</Text>
          <View style={styles.unitRow}>
            {['EU', 'UK', 'US'].map((u) => (
              <TouchableOpacity
                key={u} style={[styles.unitBtn, sizeUnit === u && styles.unitBtnActive]}
                onPress={() => setSizeUnit(u)}
              >
                <Text style={[styles.unitBtnText, sizeUnit === u && styles.unitBtnTextActive]}>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.fieldLabel}>Shoe Size *</Text>
          <ChipRow options={SHOE_SIZES_EU} value={size} onSelect={setSize} />
          <Text style={styles.fieldLabel}>Color</Text>
          <ColorPicker key={`c${pickerKey}`} value={color} onChange={setColor} />
        </>
      )}

      {/* ── Electronics: Storage + RAM + Color + Model ── */}
      {variantType === 'electronics' && (
        <>
          <Text style={styles.fieldLabel}>Storage</Text>
          <ChipRow options={STORAGE_OPTIONS} value={storage} onSelect={setStorage} />
          <TextInput
            style={styles.input} value={storage} onChangeText={setStorage}
            placeholder="Or type custom storage" placeholderTextColor={COLORS.textLight}
          />
          <Text style={styles.fieldLabel}>RAM</Text>
          <ChipRow options={RAM_OPTIONS} value={ram} onSelect={setRam} />
          <Text style={styles.fieldLabel}>Color</Text>
          <ColorPicker key={`c${pickerKey}`} value={color} onChange={setColor} />
          <Text style={styles.fieldLabel}>Model <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput
            style={styles.input} value={modelName} onChangeText={setModelName}
            placeholder="e.g. Pro Max, Ultra" placeholderTextColor={COLORS.textLight}
          />
        </>
      )}

      {/* ── Food: Weight/Volume ── */}
      {variantType === 'food' && (
        <>
          <Text style={styles.fieldLabel}>Weight / Volume</Text>
          <TextInput
            style={styles.input} value={weightVolume} onChangeText={setWeightVolume}
            placeholder="e.g. 500g, 1kg, 1L" placeholderTextColor={COLORS.textLight}
          />
        </>
      )}

      {/* ── Beauty: Volume/Size ── */}
      {variantType === 'beauty' && (
        <>
          <Text style={styles.fieldLabel}>Volume / Size</Text>
          <TextInput
            style={styles.input} value={weightVolume} onChangeText={setWeightVolume}
            placeholder="e.g. 50ml, 100ml, 200ml" placeholderTextColor={COLORS.textLight}
          />
        </>
      )}

      {/* ── Stock (shared by every category) ── */}
      <Text style={styles.fieldLabel}>Stock for this option</Text>
      <TextInput
        style={styles.input} value={stock} onChangeText={setStock}
        placeholder="e.g. 10" keyboardType="numeric" placeholderTextColor={COLORS.textLight}
      />

      <TouchableOpacity style={styles.addBtn} onPress={handleAdd} activeOpacity={0.85}>
        <Text style={styles.addBtnText}>+ Add Option</Text>
      </TouchableOpacity>

      {/* ── Colour photos: which product picture shows each colour ── */}
      {colorsOf(variants).length > 0 && (
        <View style={styles.photoSection}>
          <Text style={styles.fieldLabel}>Colour photos <Text style={styles.optional}>(optional)</Text></Text>
          {pictures.length === 0 ? (
            <Text style={styles.hint}>Add pictures of the product above, then choose which picture shows each colour.</Text>
          ) : (
            <>
              <Text style={styles.hint}>Buyers see this picture in the colour box. Tap a picture to choose it.</Text>
              {colorsOf(variants).map((c) => {
                const chosen = photoRefOfColor(variants, c);
                return (
                  <View key={c} style={styles.photoRow}>
                    <Text style={styles.photoColor}>{c}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.thumbRow}>
                        <TouchableOpacity
                          onPress={() => onChange(setColorPhoto(variants, c, ''))}
                          style={[styles.thumb, styles.thumbNone, !chosen && styles.thumbOn]}
                          accessibilityRole="button" accessibilityState={{ selected: !chosen }}
                        >
                          <Text style={styles.thumbNoneText}>None</Text>
                        </TouchableOpacity>
                        {pictures.map((pic) => (
                          <TouchableOpacity
                            key={pic.ref}
                            onPress={() => onChange(setColorPhoto(variants, c, pic.ref))}
                            style={[styles.thumb, chosen === pic.ref && styles.thumbOn]}
                            accessibilityRole="button" accessibilityState={{ selected: chosen === pic.ref }}
                          >
                            <Image source={{ uri: pic.uri }} style={styles.thumbImage} resizeMode="cover" />
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                );
              })}
            </>
          )}
        </View>
      )}

      {/* ── List of added options ── */}
      {variants.length > 0 && (
        <View style={styles.list}>
          {variants.map((v, i) => (
            <View key={i} style={styles.listItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listItemName}>{displayName(v)}</Text>
                <Text style={styles.listItemStock}>
                  {v.stock} in stock{v.is_active === false ? ' \u00B7 switched off (buyers cannot see it)' : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleRemove(i)} style={styles.removeBtn}>
                <Text style={styles.removeBtnText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: SPACING.base },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionAccent: { width: 4, height: 14, borderRadius: 2, backgroundColor: COLORS.primary },
  sectionTitle: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary },
  hint: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 4, marginBottom: SPACING.sm, lineHeight: 16 },
  fieldLabel: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary, marginBottom: 6, marginTop: 4 },
  optional: { fontSize: FONTS.xs, color: COLORS.textMuted, fontWeight: FONTS.regular },
  input: {
    backgroundColor: COLORS.surfaceAlt, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.lg, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 2,
    fontSize: FONTS.base, color: COLORS.textPrimary, marginBottom: SPACING.sm,
  },
  chipRow: { flexDirection: 'row', gap: SPACING.xs, paddingBottom: 2 },
  chip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surfaceAlt,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  chipTextActive: { color: COLORS.textWhite, fontWeight: FONTS.bold },
  unitRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  unitBtn: { flex: 1, paddingVertical: SPACING.xs + 2, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', backgroundColor: COLORS.surfaceAlt },
  unitBtnActive: { backgroundColor: COLORS.primaryFade, borderColor: COLORS.primary },
  unitBtnText: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  unitBtnTextActive: { color: COLORS.primaryDark, fontWeight: FONTS.bold },
  addBtn: {
    borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm + 2, alignItems: 'center', backgroundColor: COLORS.primaryFade, marginTop: 2,
  },
  addBtnText: { fontSize: FONTS.sm, color: COLORS.primaryDark, fontWeight: FONTS.bold },
  photoSection: { marginTop: SPACING.base },
  photoRow: { marginBottom: SPACING.sm },
  photoColor: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textPrimary, marginBottom: 4 },
  thumbRow: { flexDirection: 'row', gap: SPACING.xs, paddingBottom: 2 },
  thumb: {
    width: 56, height: 56, borderRadius: RADIUS.md, overflow: 'hidden',
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surfaceAlt,
  },
  thumbOn: { borderWidth: 3, borderColor: COLORS.primary },
  thumbNone: { alignItems: 'center', justifyContent: 'center' },
  thumbNoneText: { fontSize: FONTS.xs, color: COLORS.textMuted, fontWeight: FONTS.medium },
  thumbImage: { width: '100%', height: '100%' },
  list: { marginTop: SPACING.base, gap: SPACING.xs },
  listItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm,
  },
  listItemName: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textPrimary },
  listItemStock: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  removeBtn: { paddingHorizontal: SPACING.sm, paddingVertical: 4 },
  removeBtnText: { fontSize: FONTS.xs, color: COLORS.danger, fontWeight: FONTS.semiBold },
});