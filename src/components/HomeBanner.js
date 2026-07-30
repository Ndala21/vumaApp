/**
 * VUMA Store — Home Banner Component
 * Auto-sliding swipeable promotional banners.
 * Same props, same paging math (width-based snap), same onPress contract —
 * visual rebuild only. Fallback banner colors now pull from the shared
 * COLORS tokens instead of one-off hex values.
 */

import React, { useState, useEffect, useRef, memo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Dimensions, Image,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/constants';

const { width } = Dimensions.get('window');
const BANNER_HEIGHT = 184;
const AUTO_SLIDE_INTERVAL = 4000;

// Fallback gradient banners when no images
const FALLBACK_BANNERS = [
  {
    id: 'f1',
    title: 'Best Prices in Tanzania',
    subtitle: 'Free delivery on all orders',
    button_text: 'Shop Now',
    link_type: 'none',
    bg: [COLORS.primary, COLORS.primaryDark],
    emoji: '🛒',
  },
  {
    id: 'f2',
    title: 'Flash Sales Every Day',
    subtitle: 'Up to 70% off selected items',
    button_text: 'See Deals',
    link_type: 'flash_sale',
    bg: [COLORS.secondary, COLORS.secondaryLight],
    emoji: '⚡',
  },
  {
    id: 'f3',
    title: 'Sell on VUMA',
    subtitle: 'Join 100+ vendors. Only 10% commission.',
    button_text: 'Start Selling',
    link_type: 'none',
    bg: [COLORS.success, '#0B7F58'],
    emoji: '💰',
  },
];

const BannerSlide = memo(({ item, onPress }) => {
  const hasImage = !!item.image;

  if (hasImage) {
    return (
      <TouchableOpacity activeOpacity={0.95} onPress={() => onPress(item)} style={styles.slide}>
        <View style={styles.slideCard}>
          <Image source={{ uri: item.image }} style={styles.bannerImage} resizeMode="cover" />
          <View style={styles.gradientTop} pointerEvents="none" />
          <View style={styles.gradientBottom} pointerEvents="none" />
          <View style={styles.imageOverlay}>
            {item.title ? <Text style={styles.overlayTitle} numberOfLines={1}>{item.title}</Text> : null}
            {item.subtitle ? <Text style={styles.overlaySubtitle} numberOfLines={1}>{item.subtitle}</Text> : null}
            {item.button_text ? (
              <View style={styles.overlayBtn}>
                <Text style={styles.overlayBtnText}>{item.button_text}</Text>
                <Text style={styles.overlayBtnArrow}>›</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  const colors = item.bg || [COLORS.primary, COLORS.primaryDark];
  return (
    <TouchableOpacity activeOpacity={0.95} onPress={() => onPress(item)} style={styles.slide}>
      <View style={[styles.slideCard, styles.fallbackCard, { backgroundColor: colors[0] }]}>
        <View style={[styles.fallbackAccent, { backgroundColor: colors[1] }]} />
        <View style={styles.fallbackContent}>
          <View style={styles.fallbackLeft}>
            <Text style={styles.fallbackTitle}>{item.title}</Text>
            {item.subtitle ? <Text style={styles.fallbackSubtitle}>{item.subtitle}</Text> : null}
            {item.button_text ? (
              <View style={styles.fallbackBtn}>
                <Text style={styles.fallbackBtnText}>{item.button_text}</Text>
                <Text style={styles.fallbackBtnArrow}>›</Text>
              </View>
            ) : null}
          </View>
          {item.emoji ? <Text style={styles.fallbackEmoji}>{item.emoji}</Text> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default function HomeBanner({ banners = [], onBannerPress, navigation }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef(null);
  const timerRef = useRef(null);

  const displayBanners = banners.length > 0 ? banners : FALLBACK_BANNERS;

  useEffect(() => {
    if (displayBanners.length <= 1) return;
    startTimer();
    return () => stopTimer();
  }, [displayBanners.length, activeIndex]);

  const startTimer = () => {
    stopTimer();
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % displayBanners.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, AUTO_SLIDE_INTERVAL);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleMomentumScrollEnd = (e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
    startTimer();
  };

  const handlePress = (item) => {
    if (!onBannerPress) return;
    onBannerPress(item);
  };

  if (displayBanners.length === 0) return null;

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={displayBanners}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={({ item }) => <BannerSlide item={item} onPress={handlePress} />}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScrollBeginDrag={stopTimer}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={width}
        snapToAlignment="center"
      />

      {displayBanners.length > 1 && (
        <View style={styles.dotsRow}>
          {displayBanners.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => {
                flatListRef.current?.scrollToIndex({ index: i, animated: true });
                setActiveIndex(i);
                startTimer();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <View style={[styles.dot, i === activeIndex && styles.dotActive]} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.surface, paddingTop: SPACING.sm },
  slide: { width, height: BANNER_HEIGHT, paddingHorizontal: SPACING.base },
  slideCard: {
    flex: 1, borderRadius: RADIUS.xl, overflow: 'hidden',
    backgroundColor: COLORS.secondary, ...SHADOWS.sm,
  },
  bannerImage: { width: '100%', height: '100%' },
  gradientTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
    backgroundColor: 'rgba(18,22,43,0.02)',
  },
  gradientBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '62%',
    backgroundColor: 'rgba(18,22,43,0.68)',
  },
  imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.base },
  overlayTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textWhite, marginBottom: 3, letterSpacing: FONTS.trackTight },
  overlaySubtitle: { fontSize: FONTS.sm, color: 'rgba(255,255,255,0.82)', marginBottom: SPACING.sm },
  overlayBtn: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: 6, ...SHADOWS.primary,
  },
  overlayBtnText: { fontSize: FONTS.sm, color: COLORS.textWhite, fontWeight: FONTS.bold },
  overlayBtnArrow: { fontSize: FONTS.base, color: COLORS.textWhite, fontWeight: FONTS.bold, marginLeft: 2, marginTop: -1 },

  fallbackCard: { position: 'relative' },
  fallbackAccent: {
    position: 'absolute', right: -30, top: -30, width: 140, height: 140,
    borderRadius: RADIUS.full, opacity: 0.35,
  },
  fallbackContent: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.base },
  fallbackLeft: { flex: 1 },
  fallbackTitle: { fontSize: FONTS.xl, fontWeight: FONTS.black, color: COLORS.textWhite, marginBottom: SPACING.xs, lineHeight: 27, letterSpacing: FONTS.trackTight },
  fallbackSubtitle: { fontSize: FONTS.sm, color: 'rgba(255,255,255,0.82)', marginBottom: SPACING.base, lineHeight: 18 },
  fallbackBtn: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: 8,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
  },
  fallbackBtnText: { fontSize: FONTS.sm, color: COLORS.textWhite, fontWeight: FONTS.bold },
  fallbackBtnArrow: { fontSize: FONTS.base, color: COLORS.textWhite, fontWeight: FONTS.bold, marginLeft: 2, marginTop: -1 },
  fallbackEmoji: { fontSize: 60, marginLeft: SPACING.base },

  dotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: SPACING.md, backgroundColor: COLORS.surface },
  dot: { width: 6, height: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.borderStrong },
  dotActive: { width: 20, backgroundColor: COLORS.primary },
});