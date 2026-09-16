/**
 * VUMA Store — Feed Banner
 * A single promotional banner styled per its real banner_type (one of
 * the 8 Coupang-inspired categories), meant to be inserted between
 * chunks of products in a scrolling feed rather than only living in
 * a single top carousel. Tracks a real view on mount and a real
 * click on press against the backend's actual view_count/click_count
 * fields - nothing here is a fabricated impression count.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SCREENS } from '../utils/constants';
import { post } from '../api/client';

const TYPE_BADGES = {
  promotional: null,
  seller_ad: { label: 'Sponsored Store', bg: 'rgba(18,22,43,0.75)' },
  category: null,
  deal: { label: '⏱ Limited-Time Deal', bg: COLORS.discount },
  sponsored_product: { label: 'Sponsored', bg: 'rgba(18,22,43,0.75)' },
  seasonal: null,
  brand: null,
  flash_offer: { label: '⚡ Flash Offer', bg: COLORS.flashSale },
};

export default function FeedBanner({ banner, navigation, style }) {
  const trackedView = useRef(false);

  useEffect(() => {
    if (trackedView.current || !banner?.id) return;
    trackedView.current = true;
    post(`/products/banners/${banner.id}/track/`, { action: 'view' }).catch(() => {});
  }, [banner?.id]);

  if (!banner) return null;

  const handlePress = () => {
    post(`/products/banners/${banner.id}/track/`, { action: 'click' }).catch(() => {});

    if (banner.link_type === 'product' && banner.link_value) {
      navigation.navigate(SCREENS.PRODUCT_DETAIL, { productId: banner.link_value });
    } else if (banner.link_type === 'category' && banner.link_value) {
      navigation.navigate(SCREENS.SEARCH, { category: banner.link_value });
    } else if (banner.link_type === 'flash_sale') {
      navigation.navigate('ProductList', { flash_sale: true, title: '⚡ Flash Sale' });
    } else if (banner.link_type === 'url' && banner.link_value) {
      Linking.openURL(banner.link_value).catch(() => {});
    }
  };

  const badge = TYPE_BADGES[banner.banner_type];

  return (
    <TouchableOpacity style={[styles.wrap, style]} onPress={handlePress} activeOpacity={0.9}>
      {banner.image ? (
        <Image source={{ uri: banner.image }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={{ fontSize: 30, opacity: 0.35 }}>🖼️</Text>
        </View>
      )}

      {badge && (
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={styles.badgeText}>{badge.label}</Text>
        </View>
      )}

      {banner.banner_type === 'seller_ad' && banner.seller_name && (
        <View style={styles.sellerChip}>
          {banner.seller_logo_url ? (
            <Image source={{ uri: banner.seller_logo_url }} style={styles.sellerLogo} />
          ) : null}
          <Text style={styles.sellerChipText} numberOfLines={1}>{banner.seller_name}</Text>
        </View>
      )}

      <View style={styles.overlay}>
        <Text style={styles.title} numberOfLines={1}>{banner.title}</Text>
        {!!banner.subtitle && <Text style={styles.subtitle} numberOfLines={1}>{banner.subtitle}</Text>}
        {!!banner.button_text && banner.link_type !== 'none' && (
          <View style={styles.cta}>
            <Text style={styles.ctaText}>{banner.button_text}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%', height: 120, borderRadius: RADIUS.lg, overflow: 'hidden',
    backgroundColor: COLORS.surfaceAlt, position: 'relative',
  },
  image: { width: '100%', height: '100%', position: 'absolute' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', top: 8, left: 8, borderRadius: RADIUS.sm,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  badgeText: { color: COLORS.textWhite, fontSize: 10.5, fontWeight: FONTS.bold },
  sellerChip: {
    position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 3, maxWidth: '55%',
  },
  sellerLogo: { width: 16, height: 16, borderRadius: RADIUS.full },
  sellerChipText: { fontSize: 10.5, fontWeight: FONTS.semiBold, color: COLORS.textPrimary },
  overlay: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.42)', paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm,
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
  },
  title: { flex: 1, fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.textWhite },
  subtitle: { fontSize: 11, color: 'rgba(255,255,255,0.85)' },
  cta: { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 4 },
  ctaText: { color: COLORS.textWhite, fontSize: 10.5, fontWeight: FONTS.bold },
});