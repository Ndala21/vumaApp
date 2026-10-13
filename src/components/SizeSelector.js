/**
 * VUMA Store — Size Selector Component
 * Same exports/logic (CLOTHING_SIZES, SHOE_SIZES, SIZE_CATEGORIES, requiresSize,
 * getSizeOptions) — visual rebuild of VendorSizePicker/CustomerSizeSelector only.
 */

import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { t } from '../i18n';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/constants';

export const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
export const SHOE_SIZES = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'];

export const SIZE_CATEGORIES = ['fashion', 'clothing', 'shoes', 'Fashion', 'Clothing', 'Shoes'];

export function requiresSize(categoryName) {
  if (!categoryName) return false;
  return SIZE_CATEGORIES.some(c =>
    c.toLowerCase() === categoryName.toLowerCase()
  );
}

export function getSizeOptions(categoryName) {
  if (!categoryName) return [];
  const lower = categoryName.toLowerCase();
  if (lower === 'shoes') return SHOE_SIZES;
  return CLOTHING_SIZES;
}

// ── Vendor Size Picker — select multiple available sizes ──
export const VendorSizePicker = memo(({ categoryName, selectedSizes = [], onToggle }) => {
  if (!requiresSize(categoryName)) return null;
  const sizes = getSizeOptions(categoryName);

  return (
    <View style={styles.container}>
      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionAccent} />
        <Text style={styles.label}>Available Sizes</Text>
      </View>
      <Text style={styles.hint}>Select all sizes available for this product</Text>
      <View style={styles.sizeGrid}>
        {sizes.map((size) => {
          const selected = selectedSizes.includes(size);
          return (
            <TouchableOpacity
              key={size}
              style={[styles.sizeBtn, selected && styles.sizeBtnActive]}
              onPress={() => onToggle(size)}
              activeOpacity={0.8}
            >
              <Text style={[styles.sizeBtnText, selected && styles.sizeBtnTextActive]}>
                {size}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {selectedSizes.length > 0 && (
        <View style={styles.selectedPill}>
          <Text style={styles.selectedText}>Selected: {selectedSizes.join(', ')}</Text>
        </View>
      )}
    </View>
  );
});

// ── Customer Size Selector — select one size before buy ──
export const CustomerSizeSelector = memo(({
  categoryName,
  availableSizes = [],
  selectedSize,
  onSelect,
  error,
}) => {
  if (!requiresSize(categoryName) || availableSizes.length === 0) return null;

  // Same look as the option rows on the product page ("Size: M" and a line of boxes).
  return (
    <View style={styles.container}>
      {error && <Text style={styles.errorText}>Please select a size</Text>}
      <Text style={styles.customerLabel}>
        {t('products.optSize') + ': '}
        {selectedSize ? <Text style={styles.customerLabelValue}>{selectedSize}</Text> : null}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.customerRow}>
        {availableSizes.map((size) => {
          const selected = selectedSize === size;
          return (
            <TouchableOpacity
              key={size}
              testID={`size-${size}`}
              style={[styles.customerSizeBtn, selected && styles.customerSizeBtnActive]}
              onPress={() => onSelect(size)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.customerSizeBtnText, selected && styles.customerSizeBtnTextActive]}>
                {size}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { marginBottom: SPACING.base },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionAccent: { width: 4, height: 14, borderRadius: 2, backgroundColor: COLORS.primary },
  label: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  hint: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 4, marginBottom: SPACING.sm },
  errorText: { fontSize: FONTS.xs, color: COLORS.danger, fontWeight: FONTS.semiBold },
  sizeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  sizeBtn: {
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm, borderRadius: RADIUS.lg,
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surfaceAlt,
    minWidth: 48, alignItems: 'center',
  },
  sizeBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary, ...SHADOWS.primary },
  sizeBtnText: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  sizeBtnTextActive: { color: COLORS.textWhite, fontWeight: FONTS.bold },
  selectedPill: { alignSelf: 'flex-start', backgroundColor: COLORS.primaryFade, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 4, marginTop: SPACING.sm },
  selectedText: { fontSize: FONTS.xs, color: COLORS.primaryDark, fontWeight: FONTS.semiBold },
  sizeRow: { flexDirection: 'row', gap: SPACING.sm, paddingVertical: 4 },
  customerLabel: { fontSize: FONTS.md, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  customerLabelValue: { color: COLORS.textPrimary, fontWeight: FONTS.bold },
  customerRow: { flexDirection: 'row', alignItems: 'stretch', gap: SPACING.sm, paddingRight: SPACING.base },
  customerSizeBtn: {
    borderWidth: 1, borderColor: COLORS.borderStrong, borderRadius: 6,
    paddingHorizontal: 14, paddingVertical: 9, backgroundColor: COLORS.surface,
    minWidth: 52, alignItems: 'center', justifyContent: 'center',
  },
  // thicker border for the chosen box; padding shrinks so the box keeps its size
  customerSizeBtnActive: { borderWidth: 2, borderColor: COLORS.primary, paddingHorizontal: 13, paddingVertical: 8 },
  customerSizeBtnText: { fontSize: FONTS.md, color: COLORS.textPrimary },
  customerSizeBtnTextActive: { fontWeight: FONTS.bold },
});