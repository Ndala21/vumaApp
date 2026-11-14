/**
 * VUMA Store — Home Banner Component
 * Auto-sliding swipeable promotional banners.
 * Same props, same paging math (width-based snap), same onPress contract —
 * visual rebuild only. Fallback banner colors now pull from the shared
 * COLORS tokens instead of one-off hex values.
 *
 * Updated: the bottom text-scrim was a heavy flat 68%-opacity rectangle
 * covering 62% of the banner, which read as a hard-edged dark block
 * rather than a subtle fade once banner backgrounds got cleaner.
 * Softened to a much lighter, shorter overlay - still keeps white
 * text readable without dominating the image. A true smooth gradient
 * would need expo-linear-gradient, which isn't installed yet.
 *
 * A banner can also carry a short video (tap the play button on the slide: the
 * video plays on the slide and the sliding pauses, nothing is downloaded before
 * the tap) and event details (a calendar tile with the date, and a line with the
 * time and place). See utils/bannerMedia.js and components/BannerVideo.js.
 */

import React, { useState, useEffect, useRef, memo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Dimensions, Image,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/constants';
import { i18n } from '../i18n';
import { bannerEvent, bannerVideoUrl, bannerWords } from '../utils/bannerMedia';
import { VIDEO_READY, BannerVideoPlayer, PlayButton, RoundButton } from './BannerVideo';
import EventTile from './EventTile';

const { width } = Dimensions.get('window');
const BANNER_HEIGHT = 184;
const AUTO_SLIDE_INTERVAL = 4000;

const BannerSlide = memo(({ item, onPress, active = true, onPlayChange }) => {
  const hasImage = !!item.image;
  const focused = useIsFocused();
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [videoFailed, setVideoFailed] = useState(false);

  const setPlay = (value) => {
    setPlaying(value);
    if (onPlayChange) onPlayChange(value);
  };

  // swiped to another slide, or this screen was left: the video stops
  useEffect(() => {
    if (playing && (!active || !focused)) setPlay(false);
  }, [active, focused]);

  const lang = i18n.getLocale ? i18n.getLocale() : 'en';
  const words = bannerWords(lang);
  const videoUrl = hasImage && VIDEO_READY && !videoFailed ? bannerVideoUrl(item) : null;
  const ev = hasImage ? bannerEvent(item, Date.now(), lang) : null;
  const isPlaying = playing && !!videoUrl;

  const handleSlidePress = () => {
    if (playing) setPlay(false);
    onPress(item);
  };

  if (hasImage) {
    return (
      <TouchableOpacity activeOpacity={0.95} onPress={handleSlidePress} style={styles.slide}>
        <View style={styles.slideCard}>
          <Image source={{ uri: item.image }} style={styles.bannerImage} resizeMode="cover" />
          {isPlaying ? (
            <BannerVideoPlayer
              uri={videoUrl}
              muted={muted}
              onEnd={() => setPlay(false)}
              onFail={() => { setPlay(false); setVideoFailed(true); }}
            />
          ) : null}
          {ev && !isPlaying ? <EventTile info={ev} large style={styles.eventTile} /> : null}
          {videoUrl && !isPlaying ? (
            <PlayButton size={44} label={words.play} style={styles.corner} onPress={() => { setMuted(true); setPlay(true); }} />
          ) : null}
          {isPlaying ? (
            <View style={styles.controls}>
              <RoundButton symbol={muted ? '🔇' : '🔊'} label={muted ? words.soundOn : words.soundOff} onPress={() => setMuted((m) => !m)} />
              <RoundButton symbol={'✕'} label={words.close} onPress={() => setPlay(false)} />
            </View>
          ) : null}
          <View style={[styles.imageOverlay, isPlaying && styles.imageOverlayOnVideo]}>
            {item.title ? <Text style={styles.overlayTitle} numberOfLines={1}>{item.title}</Text> : null}
            {ev ? (
              <View style={styles.overlayEventBox}>
                {!!ev.whenLine && <Text style={styles.overlayEvent} numberOfLines={1}>{ev.whenLine}</Text>}
                {!!ev.placeLine && <Text style={styles.overlayEvent} numberOfLines={1}>{ev.placeLine}</Text>}
              </View>
            ) : (item.subtitle ? <Text style={styles.overlaySubtitle} numberOfLines={1}>{item.subtitle}</Text> : null)}
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

  const displayBanners = Array.isArray(banners) ? banners : [];

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

  // a video is playing on a slide: hold the sliding until it stops
  const handlePlayChange = (isPlaying) => {
    if (isPlaying) stopTimer();
    else if (displayBanners.length > 1) startTimer();
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
        extraData={activeIndex}
        renderItem={({ item, index }) => (
          <BannerSlide item={item} onPress={handlePress} active={index === activeIndex} onPlayChange={handlePlayChange} />
        )}
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
  imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.base },
  imageOverlayOnVideo: { backgroundColor: 'rgba(0,0,0,0.38)' },
  eventTile: { position: 'absolute', top: 10, left: 12 },
  corner: { position: 'absolute', top: 12, right: 12 },
  controls: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', gap: 8 },
  overlayEventBox: { marginBottom: SPACING.sm },
  overlayEvent: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: '#FFFFFF', marginTop: 1, textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  overlayTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textWhite, marginBottom: 3, letterSpacing: FONTS.trackTight, textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  overlaySubtitle: { fontSize: FONTS.sm, color: 'rgba(255,255,255,0.92)', marginBottom: SPACING.sm, textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
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