/**
 * VUMA Store — Home Banner Component
 * Auto-sliding swipeable promotional banners
 */

import React, { useState, useEffect, useRef, memo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Dimensions, Animated, Image,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/constants';

const { width } = Dimensions.get('window');
const BANNER_HEIGHT = 180;
const AUTO_SLIDE_INTERVAL = 4000;

// Fallback gradient banners when no images
const FALLBACK_BANNERS = [
  {
    id: 'f1',
    title: '🔥 Best Prices in Tanzania',
    subtitle: 'Free shipping on all orders!',
    button_text: 'Shop Now',
    link_type: 'none',
    bg: ['#FF6B00', '#FF8C33'],
    emoji: '🛒',
  },
  {
    id: 'f2',
    title: '⚡ Flash Sales Every Day',
    subtitle: 'Up to 70% off selected items',
    button_text: 'See Deals',
    link_type: 'flash_sale',
    bg: ['#1A1A2E', '#2D2D44'],
    emoji: '⚡',
  },
  {
    id: 'f3',
    title: '🏪 Sell on VUMA',
    subtitle: 'Join 100+ vendors. Only 10% commission.',
    button_text: 'Start Selling',
    link_type: 'none',
    bg: ['#28A745', '#20883A'],
    emoji: '💰',
  },
];

const BannerSlide = memo(({ item, onPress }) => {
  const hasImage = !!item.image;

  if (hasImage) {
    return (
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={() => onPress(item)}
        style={styles.slide}
      >
        <Image
          source={{ uri: item.image }}
          style={styles.bannerImage}
          resizeMode="cover"
        />
        {/* Overlay text */}
        <View style={styles.imageOverlay}>
          {item.title ? <Text style={styles.overlayTitle} numberOfLines={1}>{item.title}</Text> : null}
          {item.subtitle ? <Text style={styles.overlaySubtitle} numberOfLines={1}>{item.subtitle}</Text> : null}
          {item.button_text ? (
            <View style={styles.overlayBtn}>
              <Text style={styles.overlayBtnText}>{item.button_text} →</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  }

  // Fallback colored banner
  const colors = item.bg || [COLORS.primary, COLORS.primaryDark];
  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={() => onPress(item)}
      style={[styles.slide, { backgroundColor: colors[0] }]}
    >
      <View style={styles.fallbackContent}>
        <View style={styles.fallbackLeft}>
          <Text style={styles.fallbackTitle}>{item.title}</Text>
          {item.subtitle ? <Text style={styles.fallbackSubtitle}>{item.subtitle}</Text> : null}
          {item.button_text ? (
            <View style={styles.fallbackBtn}>
              <Text style={styles.fallbackBtnText}>{item.button_text} →</Text>
            </View>
          ) : null}
        </View>
        {item.emoji ? (
          <Text style={styles.fallbackEmoji}>{item.emoji}</Text>
        ) : null}
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

      {/* Dots indicator */}
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
  container: { marginBottom: SPACING.sm },
  slide: { width, height: BANNER_HEIGHT, overflow: 'hidden' },
  bannerImage: { width: '100%', height: '100%' },
  imageOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: SPACING.base,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  overlayTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: '#fff', marginBottom: 2 },
  overlaySubtitle: { fontSize: FONTS.sm, color: 'rgba(255,255,255,0.85)', marginBottom: SPACING.sm },
  overlayBtn: { alignSelf: 'flex-start', backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.base, paddingVertical: 6 },
  overlayBtnText: { fontSize: FONTS.sm, color: '#fff', fontWeight: FONTS.bold },
  fallbackContent: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.base },
  fallbackLeft: { flex: 1 },
  fallbackTitle: { fontSize: FONTS.xl, fontWeight: FONTS.black, color: '#fff', marginBottom: SPACING.xs, lineHeight: 26 },
  fallbackSubtitle: { fontSize: FONTS.sm, color: 'rgba(255,255,255,0.85)', marginBottom: SPACING.base, lineHeight: 18 },
  fallbackBtn: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: RADIUS.lg, paddingHorizontal: SPACING.base, paddingVertical: 8, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' },
  fallbackBtnText: { fontSize: FONTS.sm, color: '#fff', fontWeight: FONTS.bold },
  fallbackEmoji: { fontSize: 64, marginLeft: SPACING.base },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: SPACING.sm, backgroundColor: COLORS.surface },
  dot: { width: 6, height: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.border },
  dotActive: { width: 20, backgroundColor: COLORS.primary },
});