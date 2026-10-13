/**
 * VUMA Store — Product Options picker (customer product page)
 *
 * Laid out like the Coupang product page: one row per option type, with the
 * label and the chosen value in bold ("Size: L") and the choices below it in
 * a single sideways-scrolling line of bordered boxes. The chosen box gets a
 * thick coloured border.
 *   - Options that fill two or more attributes (size AND colour ...) are shown
 *     as one row per attribute. The customer picks one value in each row;
 *     values with no stock left for the current picks are greyed out.
 *   - Anything else is shown as one simple row of options.
 * The chosen option is handed back through onSelect (null while incomplete).
 * Prices, stock and the option id used at checkout all come from the option
 * the seller saved - nothing is calculated here.
 */
import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { t } from '../i18n';
import { COLORS, FONTS, SPACING } from '../utils/constants';
import { formatPrice } from '../utils/helpers';
import {
  buildOptionModel, chooseOption, choiceFromVariant, isBuyable, optionStatus,
  priceAdjustmentOf, resolveVariant, stockOf, variantName,
} from '../utils/variants';

const LABEL_KEYS = {
  size: 'products.optSize',
  color: 'products.optColor',
  material: 'products.optMaterial',
  storage: 'products.optStorage',
  ram: 'products.optRam',
  model_name: 'products.optModel',
  weight_volume: 'products.optWeightVolume',
};

const adjustmentText = (variant) => {
  const adj = priceAdjustmentOf(variant);
  if (adj === 0) return '';
  return (adj > 0 ? '+' : '-') + formatPrice(Math.abs(adj));
};

export default function VariantPicker({ variants, selectedVariant, onSelect, error }) {
  const model = useMemo(() => buildOptionModel(variants), [variants]);
  const [choice, setChoice] = useState(() => choiceFromVariant(model, selectedVariant));

  const tapGrouped = useCallback((rowKey, value) => {
    const next = chooseOption(model, choice, rowKey, value);
    setChoice(next);
    onSelect(resolveVariant(model, next));
  }, [model, choice, onSelect]);

  const tapFlat = useCallback((variant) => {
    if (!isBuyable(variant)) return;
    onSelect(selectedVariant && selectedVariant.id === variant.id ? null : variant);
  }, [onSelect, selectedVariant]);

  if (model.variants.length === 0) return null;

  // What the customer has picked, in words. Only the "Only N left" part turns red.
  let summary = null;
  if (selectedVariant) {
    const left = stockOf(selectedVariant);
    const parts = [variantName(selectedVariant)];
    const adj = adjustmentText(selectedVariant);
    if (adj) parts.push(adj);
    const low = left > 0 && left <= 5;
    if (!low) parts.push(t('products.inStockCount', { count: left }));
    summary = {
      done: true,
      text: parts.join('  ·  ') + (low ? '  ·  ' : ''),
      lowText: low ? t('products.onlyLeft', { count: left }) : '',
    };
  } else if (model.mode === 'grouped') {
    const missing = model.rows.filter((r) => !choice[r.key]).map((r) => t(LABEL_KEYS[r.key]));
    summary = { done: false, text: t('products.selectOptions', { options: missing.join(' & ') }), lowText: '' };
  }

  return (
    <View>
      {!!error && <Text style={styles.error}>{'⚠️ ' + t('products.pleaseSelectOption')}</Text>}

      {model.mode === 'grouped' ? (
        model.rows.map((row) => (
          <View key={row.key} style={styles.group}>
            <Text style={styles.groupLabel}>
              {t(LABEL_KEYS[row.key]) + ': '}
              {choice[row.key] ? <Text style={styles.groupValue}>{choice[row.key]}</Text> : null}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {row.values.map((value) => {
                const selected = !!choice[row.key] && choice[row.key].toLowerCase() === value.toLowerCase();
                const { available } = optionStatus(model, choice, row.key, value);
                const disabled = !available && !selected;
                return (
                  <TouchableOpacity
                    key={value}
                    disabled={disabled}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityState={{ selected, disabled }}
                    testID={`opt-${row.key}-${value}`}
                    style={[styles.chip, selected && styles.chipActive, disabled && styles.chipDisabled]}
                    onPress={() => tapGrouped(row.key, value)}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextActive, disabled && styles.chipTextDisabled]}>
                      {value}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ))
      ) : (
        <View style={styles.group}>
          <Text style={styles.groupLabel}>
            {t('products.chooseOptions')}
            {selectedVariant ? ': ' : ''}
            {selectedVariant ? <Text style={styles.groupValue}>{variantName(selectedVariant)}</Text> : null}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {model.variants.map((v) => {
              const selected = !!selectedVariant && selectedVariant.id === v.id;
              const out = !isBuyable(v);
              const adj = adjustmentText(v);
              return (
                <TouchableOpacity
                  key={String(v.id)}
                  disabled={out}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled: out }}
                  testID={`opt-${v.id}`}
                  style={[styles.chip, styles.chipFlat, selected && styles.chipActive, out && styles.chipDisabled]}
                  onPress={() => tapFlat(v)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextActive, out && styles.chipTextDisabled]}>
                    {variantName(v)}
                  </Text>
                  {!!adj && <Text style={styles.chipSub}>{adj}</Text>}
                  {out && <Text style={styles.chipOut}>{t('products.outOfStock')}</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {summary && (
        <Text style={[styles.summary, summary.done && styles.summaryDone]}>
          {(summary.done ? '✓  ' : '') + summary.text}
          {summary.lowText ? <Text style={styles.summaryLow}>{summary.lowText}</Text> : null}
        </Text>
      )}
    </View>
  );
}

const CHIP_RADIUS = 6;

const styles = StyleSheet.create({
  error: { fontSize: FONTS.xs, color: COLORS.danger, marginBottom: SPACING.sm, fontWeight: FONTS.medium },
  group: { marginBottom: SPACING.md },
  groupLabel: { fontSize: FONTS.md, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  groupValue: { color: COLORS.textPrimary, fontWeight: FONTS.bold },
  // The row scrolls sideways; the first box lines up with the page edge.
  chips: { flexDirection: 'row', alignItems: 'stretch', gap: SPACING.sm, paddingRight: SPACING.base },
  chip: {
    borderWidth: 1, borderColor: COLORS.borderStrong, borderRadius: CHIP_RADIUS,
    paddingHorizontal: 14, paddingVertical: 9,
    backgroundColor: COLORS.surface, minWidth: 52, alignItems: 'center', justifyContent: 'center',
  },
  chipFlat: { minWidth: 76 },
  // Thicker border for the chosen box; the padding shrinks by the same
  // amount so the boxes do not change size when one is picked.
  chipActive: { borderWidth: 2, borderColor: COLORS.primary, paddingHorizontal: 13, paddingVertical: 8 },
  chipDisabled: { backgroundColor: COLORS.surfaceAlt, borderColor: COLORS.border },
  chipText: { fontSize: FONTS.md, color: COLORS.textPrimary },
  chipTextActive: { fontWeight: FONTS.bold },
  chipTextDisabled: { textDecorationLine: 'line-through', color: COLORS.textLight },
  chipSub: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  chipOut: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  summary: { fontSize: FONTS.sm, color: COLORS.primaryDark, marginTop: -SPACING.xs },
  summaryDone: { color: COLORS.textSecondary },
  summaryLow: { color: COLORS.danger, fontWeight: FONTS.semiBold },
});
