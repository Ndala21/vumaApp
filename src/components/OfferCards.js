/**
 * VUMA Store — Offer cards (home screen, "VUMA Faida & Ofa")
 *
 * OfferCard   - one tile in the sideways row: round icon, bold title, a short
 *               line of text, and an orange button at the bottom.
 * OfferBanner - one wide strip: icon, title, text and an arrow button. Comes
 *               in two tones, "orange" (VUMA orange) and "navy".
 *
 * Everything is brand orange on white or on a soft orange tint, with dark,
 * easy-to-read text (13px and up) - no pastel rainbow, no tiny grey text.
 * Offers an admin creates in the Offer Engine may bring their own background
 * colour (tint) or a picture; those keep working.
 */
import React, { memo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING, SHADOWS } from '../utils/constants';

export const OfferCard = memo(function OfferCard({ card, tint }) {
  if (!card) return null;
  const hasImage = !!card.image;
  return (
    <TouchableOpacity
      testID={`offer-${card.key}`}
      style={[
        styles.card,
        hasImage && styles.cardWithImage,
        tint ? { backgroundColor: tint, borderColor: 'rgba(0,0,0,0.06)' } : null,
      ]}
      onPress={card.onPress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={[card.title, card.subtitle].filter(Boolean).join('. ')}
    >
      {hasImage ? (
        <Image source={{ uri: card.image }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>{card.icon}</Text>
        </View>
      )}
      <Text style={styles.title} numberOfLines={2}>{card.title}</Text>
      {!!card.subtitle && <Text style={styles.sub} numberOfLines={2}>{card.subtitle}</Text>}
      <View style={styles.spacer} />
      {!!card.cta && (
        <View style={styles.cta}>
          <Text style={styles.ctaText} numberOfLines={1}>{card.cta + '  ›'}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

export const OfferBanner = memo(function OfferBanner({ tone = 'orange', icon, title, subtitle, onPress, testID }) {
  const navy = tone === 'navy';
  return (
    <TouchableOpacity
      testID={testID}
      style={[styles.banner, navy ? styles.bannerNavy : styles.bannerOrange]}
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle].filter(Boolean).join('. ')}
    >
      <View style={[styles.bannerIcon, navy && styles.bannerIconNavy]}>
        <Text style={styles.bannerEmoji}>{icon}</Text>
      </View>
      <View style={styles.bannerText}>
        <Text style={styles.bannerTitle} numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text style={[styles.bannerSub, navy && styles.bannerSubNavy]} numberOfLines={2}>{subtitle}</Text>}
      </View>
      <View style={[styles.bannerArrow, navy && styles.bannerArrowNavy]}>
        <Text style={[styles.bannerArrowText, navy && styles.bannerArrowTextNavy]}>›</Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  // ── tile ──
  card: {
    width: 158, minHeight: 184, borderRadius: 16, padding: 14,
    backgroundColor: COLORS.primaryFade, borderWidth: 1, borderColor: COLORS.primaryTint,
  },
  cardWithImage: { width: 210, minHeight: 236 },
  iconCircle: {
    width: 46, height: 46, borderRadius: RADIUS.full, backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center', ...SHADOWS.xs,
  },
  icon: { fontSize: 23 },
  image: { width: '100%', height: 104, borderRadius: 12, backgroundColor: COLORS.skeleton },
  title: { marginTop: 12, fontSize: 15, lineHeight: 20, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  sub: { marginTop: 4, fontSize: 12.5, lineHeight: 17, color: COLORS.textSecondary },
  spacer: { flex: 1, minHeight: 10 },
  cta: {
    alignSelf: 'flex-start', backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  ctaText: { fontSize: 12.5, fontWeight: FONTS.bold, color: COLORS.textWhite },

  // ── wide strip ──
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 16, marginHorizontal: SPACING.base, marginBottom: SPACING.sm + 2,
    paddingHorizontal: SPACING.base, paddingVertical: 14,
  },
  bannerOrange: { backgroundColor: COLORS.primaryDark },
  bannerNavy: { backgroundColor: COLORS.secondary },
  bannerIcon: {
    width: 42, height: 42, borderRadius: RADIUS.full, backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  bannerIconNavy: { backgroundColor: 'rgba(255,255,255,0.14)' },
  bannerEmoji: { fontSize: 21 },
  bannerText: { flex: 1 },
  bannerTitle: { fontSize: 16, lineHeight: 21, fontWeight: FONTS.bold, color: COLORS.textWhite },
  bannerSub: { marginTop: 2, fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.95)' },
  bannerSubNavy: { color: 'rgba(255,255,255,0.78)' },
  bannerArrow: {
    width: 30, height: 30, borderRadius: RADIUS.full, backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  bannerArrowNavy: { backgroundColor: COLORS.primary },
  bannerArrowText: { fontSize: 22, lineHeight: 25, fontWeight: FONTS.bold, color: COLORS.primaryDark, marginTop: -2, marginLeft: 1 },
  bannerArrowTextNavy: { color: COLORS.textWhite },
});
