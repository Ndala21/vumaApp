/**
 * VUMA SellerBadge Component
 * Drop into any product page or seller listing.
 * Same exports (SellerBadge, SellerInlineBadge, TrustSignals) and same props —
 * now pulls colors from the shared VUMA design tokens instead of a local palette.
 *
 * Updated: verified_seller badge color changed from blue (COLORS.info)
 * to VUMA orange (COLORS.primary) - blue didn't match the brand.
 * TrustSignals rebuilt as one compact, single-line trust badge instead
 * of a tall card listing every badge with its own description - matches
 * the app's rounded, minimal style instead of feeling like an info box.
 *
 * Usage:
 *   <SellerBadge vendor={product.vendor_info} onPress={() => nav.navigate('SellerStore', { vendorId })} />
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING, SHADOWS } from '../../utils/constants';

const BADGE_CONFIG = {
  verified_seller:   { color: COLORS.primary, bg: COLORS.primaryFade,  icon: '✓', short: 'Verified' },
  verified_business: { color: COLORS.primary, bg: COLORS.primaryFade,  icon: '🏢', short: 'Business' },
  verified_agri:     { color: COLORS.success, bg: COLORS.successLight, icon: '🌾', short: 'Agri' },
  featured:          { color: COLORS.warning, bg: COLORS.warningLight, icon: '⭐', short: 'Featured' },
};

export const SellerBadge = ({ vendor, onPress, compact = false }) => {
  if (!vendor) return null;

  const badges      = vendor.badges || [];
  const topBadge    = badges[0];
  const badgeCfg    = topBadge ? BADGE_CONFIG[topBadge.id] : null;
  const rating      = vendor.rating || vendor.rating_avg || 0;
  const totalOrders = vendor.total_orders || 0;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}
      style={[styles.container, compact && styles.containerCompact]}>
      <View style={styles.logoWrap}>
        {vendor.logo
          ? <Image source={{ uri: vendor.logo }} style={styles.logo} />
          : <View style={[styles.logo, styles.logoFallback]}>
              <Text style={styles.logoText}>
                {(vendor.shop_name || 'S').charAt(0).toUpperCase()}
              </Text>
            </View>
        }
        {badges.length > 0 && (
          <View style={styles.badgeDot}>
            <Text style={styles.badgeDotIcon}>✓</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.shopName} numberOfLines={1}>{vendor.shop_name}</Text>
          {badgeCfg && (
            <View style={[styles.badgeChip, { backgroundColor: badgeCfg.bg }]}>
              <Text style={styles.badgeChipIcon}>{badgeCfg.icon}</Text>
              <Text style={[styles.badgeText, { color: badgeCfg.color }]}>{badgeCfg.short}</Text>
            </View>
          )}
        </View>
        <View style={styles.statsRow}>
          {rating > 0 && (
            <View style={styles.statPill}>
              <Text style={styles.statText}>★ {Number(rating).toFixed(1)}</Text>
            </View>
          )}
          {totalOrders > 0 && (
            <View style={styles.statPill}>
              <Text style={styles.statText}>{totalOrders.toLocaleString()} sold</Text>
            </View>
          )}
          {vendor.response_time && (
            <View style={styles.statPill}>
              <Text style={styles.statText}>{vendor.response_time}</Text>
            </View>
          )}
        </View>
      </View>

      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
};

// Compact inline version for listings
export const SellerInlineBadge = ({ badges = [], shopName }) => {
  if (!badges.length) return (
    <Text style={styles.inlineShopName}>{shopName}</Text>
  );

  return (
    <View style={styles.inlineRow}>
      <Text style={styles.inlineShopName}>{shopName}</Text>
      {badges.slice(0, 2).map(b => {
        const cfg = BADGE_CONFIG[b.id];
        if (!cfg) return null;
        return (
          <View key={b.id} style={[styles.inlineBadge, { backgroundColor: cfg.bg }]}>
            <Text style={styles.inlineBadgeIcon}>{cfg.icon}</Text>
            <Text style={[styles.inlineBadgeText, { color: cfg.color }]}>{cfg.short}</Text>
          </View>
        );
      })}
    </View>
  );
};

// Compact trust badge for the product detail page - one small, orange,
// professional-looking badge rather than a tall info box listing every
// badge type separately.
export const TrustSignals = ({ vendor }) => {
  const badges = vendor?.badges || [];
  const isVerified = badges.some(b => ['verified_seller', 'verified_business', 'verified_agri'].includes(b.id));
  if (!isVerified) return null;

  return (
    <View style={styles.trustBadgeCompact}>
      <View style={styles.trustBadgeIconWrapCompact}>
        <Text style={styles.trustBadgeIconCompact}>✓</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.trustTitleCompact}>VUMA Verified Seller</Text>
        <Text style={styles.trustSubCompact}>Identity and business verified by VUMA team</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
    marginVertical: SPACING.sm, ...SHADOWS.xs,
  },
  containerCompact: { padding: SPACING.sm, borderRadius: RADIUS.md },
  logoWrap: { position: 'relative' },
  logo: { width: 44, height: 44, borderRadius: RADIUS.md },
  logoFallback: { backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: COLORS.textWhite, fontWeight: FONTS.extraBold, fontSize: 18 },
  badgeDot: {
    position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: 8,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.surface,
  },
  badgeDotIcon: { fontSize: 8, color: COLORS.textWhite, fontWeight: FONTS.black },
  info: { flex: 1, marginLeft: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  shopName: { fontSize: FONTS.md, fontWeight: FONTS.bold, color: COLORS.textPrimary, flex: 1 },
  badgeChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADIUS.sm },
  badgeChipIcon: { fontSize: 9 },
  badgeText: { fontSize: 9.5, fontWeight: FONTS.bold, letterSpacing: 0.3 },
  statsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  statPill: { backgroundColor: COLORS.surfaceSunken, borderRadius: RADIUS.sm, paddingHorizontal: 7, paddingVertical: 2 },
  statText: { fontSize: 10.5, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  arrow: { fontSize: FONTS.xl, color: COLORS.textMuted, marginLeft: SPACING.sm },

  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  inlineShopName: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary },
  inlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 5, paddingVertical: 1, borderRadius: RADIUS.sm },
  inlineBadgeIcon: { fontSize: 9 },
  inlineBadgeText: { fontSize: 9.5, fontWeight: FONTS.bold },

  // Compact trust badge - single row, small, orange, not a big card.
  trustBadgeCompact: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.primaryFade, borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.sm + 2,
    borderWidth: 1, borderColor: 'rgba(255,106,0,0.18)',
    marginVertical: SPACING.xs, alignSelf: 'flex-start', maxWidth: '100%',
  },
  trustBadgeIconWrapCompact: {
    width: 26, height: 26, borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center',
  },
  trustBadgeIconCompact: { fontSize: 15, fontWeight: FONTS.black, color: COLORS.primary },
  trustTitleCompact: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.primaryDark },
  trustSubCompact: { fontSize: 10.5, color: COLORS.textSecondary, marginTop: 1 },
});