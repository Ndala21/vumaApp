/**
 * VUMA Store — Size Selector Component
 * Reusable for both vendor (add sizes) and customer (select size)
 */

import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/constants';

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
      <Text style={styles.label}>Available Sizes</Text>
      <Text style={styles.hint}>Select all sizes available for this product</Text>
      <View style={styles.sizeGrid}>
        {sizes.map((size) => {
          const selected = selectedSizes.includes(size);
          return (
            <TouchableOpacity
              key={size}
              style={[styles.sizeBtn, selected && styles.sizeBtnActive]}
              onPress={() => onToggle(size)}
            >
              <Text style={[styles.sizeBtnText, selected && styles.sizeBtnTextActive]}>
                {size}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {selectedSizes.length > 0 && (
        <Text style={styles.selectedText}>
          ✅ Selected: {selectedSizes.join(', ')}
        </Text>
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

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Select Size</Text>
        {error && <Text style={styles.errorText}>⚠️ Please select a size</Text>}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.sizeRow}>
          {availableSizes.map((size) => {
            const selected = selectedSize === size;
            return (
              <TouchableOpacity
                key={size}
                style={[styles.customerSizeBtn, selected && styles.customerSizeBtnActive]}
                onPress={() => onSelect(size)}
              >
                <Text style={[styles.customerSizeBtnText, selected && styles.customerSizeBtnTextActive]}>
                  {size}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
      {selectedSize && (
        <Text style={styles.selectedSizeText}>Selected: <Text style={styles.selectedSizeBold}>{selectedSize}</Text></Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { marginBottom: SPACING.base },
  label: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary, marginBottom: 4 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  hint: { fontSize: FONTS.xs, color: COLORS.textMuted, marginBottom: SPACING.sm },
  errorText: { fontSize: FONTS.xs, color: COLORS.danger, fontWeight: FONTS.semiBold },
  sizeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  sizeBtn: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surfaceAlt, minWidth: 48, alignItems: 'center' },
  sizeBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  sizeBtnText: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  sizeBtnTextActive: { color: COLORS.textWhite, fontWeight: FONTS.bold },
  selectedText: { fontSize: FONTS.xs, color: COLORS.primary, fontWeight: FONTS.semiBold, marginTop: SPACING.sm },
  sizeRow: { flexDirection: 'row', gap: SPACING.sm, paddingVertical: 4 },
  customerSizeBtn: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 2, borderRadius: RADIUS.lg, borderWidth: 2, borderColor: COLORS.border, backgroundColor: COLORS.surface, minWidth: 52, alignItems: 'center' },
  customerSizeBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  customerSizeBtnText: { fontSize: FONTS.base, color: COLORS.textSecondary, fontWeight: FONTS.semiBold },
  customerSizeBtnTextActive: { color: COLORS.textWhite, fontWeight: FONTS.bold },
  selectedSizeText: { fontSize: FONTS.sm, color: COLORS.textMuted, marginTop: SPACING.xs },
  selectedSizeBold: { color: COLORS.primary, fontWeight: FONTS.bold },
});