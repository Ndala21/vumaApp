/**
 * VUMA Store — Coupon list (opens from the "Kuponi" card on Home)
 *
 * Shows the real public coupons the customer can still use. "Tumia" saves
 * the code; the checkout screen fills its coupon box with it, and the server
 * checks it again when the order is priced.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/constants';
import { couponValue, formatDate, tzs } from '../utils/rewards';

const PINK = '#E5426B';
const PINK_FADE = '#FDE8EC';

function Ticket({ coupon, chosen, onUse }) {
  const isPercent = coupon.discount_type === 'percentage';
  const details = [
    coupon.minimum_order > 0 ? `Oda kuanzia ${tzs(coupon.minimum_order)}` : 'Oda yoyote',
    coupon.valid_until ? `Hadi ${formatDate(coupon.valid_until)}` : '',
  ].filter(Boolean).join(' · ');
  return (
    <View style={styles.ticket}>
      <View style={styles.value}>
        <Text style={styles.valueBig} numberOfLines={1} adjustsFontSizeToFit>
          {isPercent ? `${Number(coupon.discount_value)}%` : tzs(coupon.discount_value)}
        </Text>
        <Text style={styles.valueSmall}>punguzo</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.code}>{coupon.code}</Text>
        {!!coupon.description && <Text style={styles.desc} numberOfLines={2}>{coupon.description}</Text>}
        {isPercent && !!coupon.maximum_discount && (
          <Text style={styles.desc}>Punguzo la juu: {tzs(coupon.maximum_discount)}</Text>
        )}
        <Text style={styles.meta}>{details}</Text>
      </View>
      <TouchableOpacity
        style={[styles.useBtn, chosen && styles.useBtnDone]}
        onPress={() => onUse(coupon.code)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Tumia kuponi ${coupon.code}, punguzo la ${couponValue(coupon)}`}
      >
        <Text style={[styles.useText, chosen && styles.useTextDone]}>{chosen ? 'Imechaguliwa ✓' : 'Tumia'}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function CouponSheet({ visible, items, chosenCode, onUse, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Kuponi</Text>
              <Text style={styles.subtitle}>Chagua kuponi, kisha endelea kulipa. Punguzo linaongezwa kwenye malipo.</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Funga">
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={items || []}
            keyExtractor={(c) => c.code}
            renderItem={({ item }) => (
              <Ticket coupon={item} chosen={chosenCode === item.code} onUse={onUse} />
            )}
            ListEmptyComponent={<Text style={styles.empty}>Hakuna kuponi kwa sasa. Rudi tena hivi karibuni.</Text>}
            contentContainerStyle={styles.list}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(18,22,43,0.45)' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS['2xl'],
    borderTopRightRadius: RADIUS['2xl'],
    maxHeight: '82%',
    paddingBottom: SPACING.lg,
  },
  handle: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.borderStrong, marginTop: SPACING.sm,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', padding: SPACING.base, paddingBottom: SPACING.sm },
  title: { fontSize: FONTS.xl, fontWeight: FONTS.extraBold, color: COLORS.textPrimary },
  subtitle: { fontSize: FONTS.sm, color: COLORS.textSecondary, marginTop: 2, lineHeight: 18 },
  closeBtn: { padding: SPACING.sm },
  close: { fontSize: FONTS.lg, color: COLORS.textMuted },
  list: { paddingHorizontal: SPACING.base, paddingBottom: SPACING.base },
  empty: { textAlign: 'center', color: COLORS.textMuted, padding: SPACING['2xl'], fontSize: FONTS.md },
  ticket: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface, marginTop: SPACING.sm, overflow: 'hidden',
  },
  value: {
    width: 84, alignSelf: 'stretch', backgroundColor: PINK_FADE,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
    borderRightWidth: 1, borderRightColor: COLORS.border, borderStyle: 'dashed',
  },
  valueBig: { fontSize: FONTS.lg, fontWeight: FONTS.black, color: PINK },
  valueSmall: { fontSize: FONTS.xs, color: PINK, marginTop: 1 },
  body: { flex: 1, padding: SPACING.md },
  code: { fontSize: FONTS.base, fontWeight: FONTS.extraBold, color: COLORS.textPrimary, letterSpacing: 0.6 },
  desc: { fontSize: FONTS.sm, color: COLORS.textSecondary, marginTop: 2 },
  meta: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 4 },
  useBtn: {
    backgroundColor: PINK, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: 8, marginRight: SPACING.md,
  },
  useBtnDone: { backgroundColor: COLORS.successLight },
  useText: { color: '#FFFFFF', fontSize: FONTS.sm, fontWeight: FONTS.bold },
  useTextDone: { color: COLORS.successText },
});
