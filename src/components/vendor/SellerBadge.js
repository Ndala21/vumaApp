/**
 * VUMA SellerBadge Component
 * Drop into any product page or seller listing
 *
 * Usage:
 *   <SellerBadge vendor={product.vendor_info} onPress={() => nav.navigate('SellerStore', { vendorId })} />
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';

const C = {
  orange: '#FF6B00', orangeL: '#FFF3E8',
  blue:   '#1B8EF2', blueL:   '#E8F3FF',
  green:  '#16A34A', greenL:  '#EDFAF3',
  yellow: '#F59E0B', yellowL: '#FFFBEB',
  text:   '#111827', textSec: '#6B7280',
  border: '#E5E7EB', bg:      '#F8F9FA',
};

const BADGE_CONFIG = {
  verified_seller:   { color: C.blue,   bg: C.blueL,   icon: '✓',  short: 'Verified' },
  verified_business: { color: C.orange, bg: C.orangeL, icon: '🏢', short: 'Business' },
  verified_agri:     { color: C.green,  bg: C.greenL,  icon: '🌾', short: 'Agri' },
  featured:          { color: C.yellow, bg: C.yellowL, icon: '⭐', short: 'Featured' },
};

export const SellerBadge = ({ vendor, onPress, compact = false }) => {
  if (!vendor) return null;

  const badges      = vendor.badges || [];
  const topBadge    = badges[0];
  const badgeCfg    = topBadge ? BADGE_CONFIG[topBadge.id] : null;
  const rating      = vendor.rating || vendor.rating_avg || 0;
  const totalOrders = vendor.total_orders || 0;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}
      style={[styles.container, compact && styles.containerCompact]}>
      {/* Logo */}
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
            <Text style={{ fontSize: 8 }}>✓</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={{ flex: 1, marginLeft: 10 }}>
        <View style={styles.nameRow}>
          <Text style={styles.shopName} numberOfLines={1}>{vendor.shop_name}</Text>
          {badgeCfg && (
            <View style={[styles.badgeChip, { backgroundColor: badgeCfg.bg, borderColor: `${badgeCfg.color}30` }]}>
              <Text style={{ fontSize: 9 }}>{badgeCfg.icon}</Text>
              <Text style={[styles.badgeText, { color: badgeCfg.color }]}>{badgeCfg.short}</Text>
            </View>
          )}
        </View>
        <View style={styles.statsRow}>
          {rating > 0 && (
            <View style={styles.statPill}>
              <Text style={styles.statText}>⭐ {Number(rating).toFixed(1)}</Text>
            </View>
          )}
          {totalOrders > 0 && (
            <View style={styles.statPill}>
              <Text style={styles.statText}>📦 {totalOrders.toLocaleString()} sold</Text>
            </View>
          )}
          {vendor.response_time && (
            <View style={styles.statPill}>
              <Text style={styles.statText}>⚡ {vendor.response_time}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Arrow */}
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
            <Text style={{ fontSize: 8 }}>{cfg.icon}</Text>
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
        <Text style={styles.trustIcon}>🛡️</Text>
        <Text style={styles.trustTitle}>VUMA Verified Seller</Text>
      </View>
      <View style={styles.trustBadges}>
        {badges.map(b => {
          const cfg = BADGE_CONFIG[b.id];
          if (!cfg) return null;
          return (
            <View key={b.id} style={styles.trustBadgeItem}>
              <View style={[styles.trustBadgeIconWrap, { backgroundColor: cfg.bg }]}>
                <Text style={{ fontSize: 16 }}>{cfg.icon}</Text>
              </View>
              <Text style={styles.trustBadgeLabel}>{b.label}</Text>
              <Text style={styles.trustBadgeDesc} numberOfLines={2}>{b.description}</Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.trustFooter}>
        ✓ All VUMA verified sellers undergo strict identity and business verification
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.bg, borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: C.border,
    marginVertical: 8,
  },
  containerCompact: { padding: 8, borderRadius: 8 },
  logoWrap:   { position: 'relative' },
  logo:       { width: 44, height: 44, borderRadius: 10 },
  logoFallback:{ backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center' },
  logoText:   { color: '#fff', fontWeight: '800', fontSize: 18 },
  badgeDot:   { position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  nameRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  shopName:   { fontSize: 14, fontWeight: '700', color: C.text, flex: 1 },
  badgeChip:  { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, borderWidth: 1 },
  badgeText:  { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  statsRow:   { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  statPill:   { backgroundColor: C.border, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  statText:   { fontSize: 10, color: C.textSec, fontWeight: '500' },
  arrow:      { fontSize: 20, color: C.textSec, marginLeft: 8 },

  // Inline
  inlineRow:       { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  inlineShopName:  { fontSize: 12, fontWeight: '600', color: C.textSec },
  inlineBadge:     { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6 },
  inlineBadgeText: { fontSize: 9, fontWeight: '700' },

  // Trust Card
  trustCard:       { backgroundColor: '#F0F9FF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#BAE6FD', marginVertical: 8 },
  trustHeader:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  trustIcon:       { fontSize: 18 },
  trustTitle:      { fontSize: 14, fontWeight: '700', color: C.blue },
  trustBadges:     { gap: 10, marginBottom: 10 },
  trustBadgeItem:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  trustBadgeIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  trustBadgeLabel: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 2 },
  trustBadgeDesc:  { fontSize: 11, color: C.textSec, lineHeight: 15, flex: 1 },
  trustFooter:     { fontSize: 11, color: C.textSec, lineHeight: 15 },
});