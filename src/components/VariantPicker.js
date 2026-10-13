/**
 * VUMA Store — Product Options picker (customer product page)
 *
 * Shows the options the seller added (size, colour, storage ...).
 *   - Options that fill two or more attributes (size AND colour ...) are shown
 *     as one row per attribute, like Coupang. The customer picks one value in
 *     each row; values with no stock left for the current picks are greyed out.
 *   - Anything else is shown as one simple list of options.
 * The chosen option is handed back through onSelect (null while incomplete).
 * Prices, stock and the option id used at checkout all come from the option
 * the seller saved - nothing is calculated here.
 */
import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { t } from '../i18n';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/constants';
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

  // What the customer has picked, in words.
  let summary = null;
  if (selectedVariant) {
    const left = stockOf(selectedVariant);
    const parts = [variantName(selectedVariant)];
    const adj = adjustmentText(selectedVariant);
    if (adj) parts.push(adj);
    parts.push(left > 0 && left <= 5 ? t('products.onlyLeft', { count: left }) : t('products.inStockCount', { count: left }));
    summary = { done: true, text: parts.join('  ·  ') };
  } else if (model.mode === 'grouped') {
    const missing = model.rows.filter((r) => !choice[r.key]).map((r) => t(LABEL_KEYS[r.key]));
    summary = { done: false, text: t('products.selectOptions', { options: missing.join(' & ') }) };
  }

  return (
    <View>
      <View style={styles.titleRow}>
        <View style={styles.accent} />
        <Text style={styles.title}>{t('products.chooseOptions')}</Text>
      </View>
      {!!error && <Text style={styles.error}>{'⚠️ ' + t('products.pleaseSelectOption')}</Text>}

      {model.mode === 'grouped' ? (
        model.rows.map((row) => (
          <View key={row.key} style={styles.group}>
            <Text style={styles.groupLabel}>
              {t(LABEL_KEYS[row.key])}
              {choice[row.key] ? <Text style={styles.groupValue}>{'   ' + choice[row.key]}</Text> : null}
            </Text>
            <View style={styles.chips}>
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
            </View>
          </View>
        ))
      ) : (
        <View style={styles.chips}>
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
                {!!adj && <Text style={[styles.chipSub, selected && styles.chipTextActive]}>{adj}</Text>}
                {out && <Text style={styles.chipOut}>{t('products.outOfStock')}</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {summary && (
        <View style={[styles.summary, summary.done && styles.summaryDone]}>
          <Text style={[styles.summaryText, summary.done && styles.summaryTextDone]}>
            {(summary.done ? '✓  ' : '') + summary.text}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.sm },
  accent: { width: 4, height: 15, borderRadius: 2, backgroundColor: COLORS.primary },
  title: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  error: { fontSize: FONTS.xs, color: COLORS.danger, marginBottom: SPACING.sm, fontWeight: FONTS.medium },
  group: { marginBottom: SPACING.md },
  groupLabel: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  groupValue: { color: COLORS.primaryDark, fontWeight: FONTS.bold },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 2,
    backgroundColor: COLORS.surface, minWidth: 56, alignItems: 'center',
  },
  chipFlat: { minWidth: 80, paddingVertical: SPACING.sm },
  chipActive: { backgroundColor: COLORS.primaryFade, borderColor: COLORS.primary },
  chipDisabled: { opacity: 0.45, backgroundColor: COLORS.surfaceSunken },
  chipText: { fontSize: FONTS.md, color: COLORS.textSecondary, fontWeight: FONTS.semiBold },
  chipTextActive: { color: COLORS.primaryDark, fontWeight: FONTS.bold },
  chipTextDisabled: { textDecorationLine: 'line-through', color: COLORS.textMuted },
  chipSub: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  chipOut: { fontSize: 10, color: COLORS.danger, marginTop: 2, fontWeight: FONTS.semiBold },
  summary: {
    alignSelf: 'flex-start', marginTop: SPACING.xs, borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm, paddingVertical: 5, backgroundColor: COLORS.surfaceSunken,
  },
  summaryDone: { backgroundColor: COLORS.successLight },
  summaryText: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  summaryTextDone: { color: COLORS.successText, fontWeight: FONTS.semiBold },
});
