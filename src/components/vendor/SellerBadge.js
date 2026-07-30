/**
 * VUMA SellerBadge Component
 * Drop into any product page or seller listing.
 * Same exports (SellerBadge, SellerInlineBadge, TrustSignals) and same props —
 * now pulls colors from the shared VUMA design tokens instead of a local palette.
 *
 * Usage:
 *   <SellerBadge vendor={product.vendor_info} onPress={() => nav.navigate('SellerStore', { vendorId })} />
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING, SHADOWS } from '../../utils/constants';

const BADGE_CONFIG = {
  verified_seller:   { color: COLORS.info,    bg: COLORS.infoLight,    icon: '✓', short: 'Verified' },
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

// Trust signal for product detail page
export const TrustSignals = ({ vendor }) => {
  const badges = vendor?.badges || [];
  if (!badges.length) return null;

  return (
    <View style={styles.trustCard}>
      <View style={styles.trustHeader}>
        <View style={styles.trustIconChip}>
          <Text style={styles.trustIcon}>🛡</Text>
        </View>
        <Text style={styles.trustTitle}>VUMA Verified Seller</Text>
      </View>
      <View style={styles.trustBadges}>
        {badges.map(b => {
          const cfg = BADGE_CONFIG[b.id];
          if (!cfg) return null;
          return (
            <View key={b.id} style={styles.trustBadgeItem}>
              <View style={[styles.trustBadgeIconWrap, { backgroundColor: cfg.bg }]}>
                <Text style={styles.trustBadgeItemIcon}>{cfg.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.trustBadgeLabel}>{b.label}</Text>
                <Text style={styles.trustBadgeDesc} numberOfLines={2}>{b.description}</Text>
              </View>
            </View>
          );
        })}
      </View>
      <Text style={styles.trustFooter}>
        All VUMA verified sellers undergo strict identity and business verification
      </Text>
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
    backgroundColor: COLORS.info, alignItems: 'center', justifyContent: 'center',
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

  trustCard: {
    backgroundColor: COLORS.infoLight, borderRadius: RADIUS.lg, padding: SPACING.base,
    borderWidth: 1, borderColor: 'rgba(59,130,196,0.25)', marginVertical: SPACING.sm,
  },
  trustHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  trustIconChip: { width: 28, height: 28, borderRadius: RADIUS.md, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  trustIcon: { fontSize: 15 },
  trustTitle: { fontSize: FONTS.md, fontWeight: FONTS.bold, color: COLORS.infoText },
  trustBadges: { gap: SPACING.sm + 2, marginBottom: SPACING.sm + 2 },
  trustBadgeItem: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm + 2 },
  trustBadgeIconWrap: { width: 36, height: 36, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  trustBadgeItemIcon: { fontSize: 16 },
  trustBadgeLabel: { fontSize: FONTS.sm + 1, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: 2 },
  trustBadgeDesc: { fontSize: FONTS.xs, color: COLORS.textSecondary, lineHeight: 15 },
  trustFooter: { fontSize: FONTS.xs, color: COLORS.infoText, lineHeight: 16 },
});