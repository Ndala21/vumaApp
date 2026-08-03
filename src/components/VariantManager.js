/**
 * VUMA Store — Product Variant Manager (Seller Add/Edit Product)
 *
 * Shows different fields depending on the product's category:
 *   Fashion (Men/Women/Kids/Clothing)  → Size, Color, Material, Stock
 *   Shoes                                → Shoe Size (EU/UK/US), Color, Stock
 *   Electronics                          → Storage, RAM, Color, Model, Stock
 *   Food / Grocery / Mazao                → Weight/Volume, Stock
 *   Beauty / Cosmetics                    → Volume/Size, Stock
 *   Anything else                         → section is hidden entirely
 *
 * Seller fills in one combination at a time and taps "+ Add Variant" —
 * each combination becomes a row in the list below, with its own stock.
 * `variants` / `onChange` hold the full list; the parent screen is
 * responsible for saving it (existing UI/styling untouched — this is
 * purely additive).
 */
import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/constants';

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

export default function VariantManager({ categoryName, variants = [], onChange }) {
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

  if (!variantType) return null;

  const resetDraft = () => {
    setSize(''); setColor(''); setMaterial('');
    setStorage(''); setRam(''); setModelName('');
    setWeightVolume(''); setStock('');
  };

  const buildDraft = () => {
    const draft = { stock: parseInt(stock, 10) || 0, price_adjustment: 0 };
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
    if (!hasAnyAttribute(draft)) return; // need at least one attribute filled
    if (!draft.stock || draft.stock <= 0) return; // stock required
    onChange([...variants, draft]);
    resetDraft();
  };

  const handleRemove = (index) => {
    onChange(variants.filter((_, i) => i !== index));
  };

  const displayName = (v) => {
    const parts = [v.size, v.color, v.material, v.storage, v.ram, v.model_name, v.weight_volume].filter(Boolean);
    return parts.length ? parts.join(' / ') : 'Variant';
  };

  return (
    <View style={styles.container}>
      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionAccent} />
        <Text style={styles.sectionTitle}>Product Variants</Text>
      </View>
      <Text style={styles.hint}>
        Add each option (e.g. size + color) with its own stock. Leave this empty if this product has no variants.
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
          <TextInput
            style={styles.input} value={color} onChangeText={setColor}
            placeholder="e.g. Red, Navy Blue" placeholderTextColor={COLORS.textLight}
          />
          <Text style={styles.fieldLabel}>Material</Text>
          <TextInput
            style={styles.input} value={material} onChangeText={setMaterial}
            placeholder="e.g. Cotton, Polyester" placeholderTextColor={COLORS.textLight}
          />
        </>
      )}

      {/* ── Shoes: Size (EU/UK/US) + Color ── */}
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
          <Text style={styles.fieldLabel}>Shoe Size</Text>
          <ChipRow options={SHOE_SIZES_EU} value={size} onSelect={setSize} />
          <Text style={styles.fieldLabel}>Color</Text>
          <TextInput
            style={styles.input} value={color} onChangeText={setColor}
            placeholder="e.g. Black, White" placeholderTextColor={COLORS.textLight}
          />
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
          <TextInput
            style={styles.input} value={color} onChangeText={setColor}
            placeholder="e.g. Space Gray" placeholderTextColor={COLORS.textLight}
          />
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
        <Text style={styles.addBtnText}>+ Add Variant</Text>
      </TouchableOpacity>

      {/* ── List of added variants ── */}
      {variants.length > 0 && (
        <View style={styles.list}>
          {variants.map((v, i) => (
            <View key={i} style={styles.listItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listItemName}>{displayName(v)}</Text>
                <Text style={styles.listItemStock}>{v.stock} in stock</Text>
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