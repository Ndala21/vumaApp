/**
 * VUMA Store - the Back button for screens that have no header bar.
 * A round button with an arrow and the word "Back" (in the app language).
 * compact = the arrow only, for a tight header.
 */
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, RADIUS } from '../utils/constants';
import { t } from '../i18n';
import { goBackOrHome } from '../utils/goBack';

export default function BackButton({ navigation, compact = false, style }) {
  return (
    <TouchableOpacity
      onPress={() => goBackOrHome(navigation)}
      style={[styles.btn, compact && styles.compact, style]}
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
    >
      <Text style={styles.arrow}>{'‹'}</Text>
      {!compact && <Text style={styles.label} numberOfLines={1}>{t('common.back')}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 40, minWidth: 84, paddingHorizontal: 12,
    borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceSunken,
  },
  compact: { width: 36, height: 36, minWidth: 36, paddingHorizontal: 0 },
  arrow: { fontSize: 26, lineHeight: 28, color: COLORS.textPrimary, fontWeight: FONTS.bold, marginTop: -2, marginRight: 4 },
  label: { fontSize: FONTS.sm, color: COLORS.textPrimary, fontWeight: FONTS.semiBold },
});
