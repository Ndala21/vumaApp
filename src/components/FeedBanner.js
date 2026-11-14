/**
 * VUMA Store — Feed Banner
 * A single promotional banner styled per its real banner_type (one of
 * the 8 Coupang-inspired categories), meant to be inserted between
 * chunks of products in a scrolling feed rather than only living in
 * a single top carousel. Tracks a real view on mount and a real
 * click on press against the backend's actual view_count/click_count
 * fields - nothing here is a fabricated impression count.
 *
 * A banner can also carry a short video (tap the play button: the card
 * opens up and plays it, nothing is downloaded before the tap) and event
 * details (a calendar tile with the date, and a line with the time and place).
 * See utils/bannerMedia.js and components/BannerVideo.js.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { COLORS, FONTS, SPACING, RADIUS, SCREENS } from '../utils/constants';
import { post } from '../api/client';
import { i18n } from '../i18n';
import { bannerEvent, bannerVideoUrl, bannerWords } from '../utils/bannerMedia';
import { VIDEO_READY, BannerVideoPlayer, PlayButton, RoundButton } from './BannerVideo';
import EventTile from './EventTile';

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
  const focused = useIsFocused();
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [videoFailed, setVideoFailed] = useState(false);
  const [boxWidth, setBoxWidth] = useState(0);

  useEffect(() => {
    if (trackedView.current || !banner?.id) return;
    trackedView.current = true;
    post(`/products/banners/${banner.id}/track/`, { action: 'view' }).catch(() => {});
  }, [banner?.id]);

  // another banner in this place, or this screen is left: the video stops
  useEffect(() => {
    setPlaying(false);
    setMuted(true);
    setVideoFailed(false);
  }, [banner?.id]);
  useEffect(() => {
    if (!focused) setPlaying(false);
  }, [focused]);

  if (!banner) return null;

  const lang = i18n.getLocale ? i18n.getLocale() : 'en';
  const words = bannerWords(lang);
  const videoUrl = VIDEO_READY && !videoFailed ? bannerVideoUrl(banner) : null;
  const ev = bannerEvent(banner, Date.now(), lang);
  const isPlaying = playing && !!videoUrl;
  const openHeight = boxWidth ? Math.max(140, Math.min(240, Math.round((boxWidth * 9) / 16))) : 190;

  const handlePress = () => {
    setPlaying(false);
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
  const showCta = !!banner.button_text && banner.link_type !== 'none';
  const showEventRow = !!ev && !isPlaying;

  return (
    <TouchableOpacity
      style={[styles.wrap, style, isPlaying && { height: openHeight }]}
      onPress={handlePress}
      activeOpacity={0.9}
      onLayout={(e) => setBoxWidth(Math.round(e.nativeEvent.layout.width))}
    >
      {banner.image ? (
        <Image source={{ uri: banner.image }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={{ fontSize: 30, opacity: 0.35 }}>🖼️</Text>
        </View>
      )}

      {isPlaying ? (
        <BannerVideoPlayer
          uri={videoUrl}
          muted={muted}
          onEnd={() => setPlaying(false)}
          onFail={() => { setPlaying(false); setVideoFailed(true); }}
        />
      ) : null}

      {showEventRow ? <View style={styles.eventScrim} pointerEvents="none" /> : null}
      {showEventRow ? <View style={styles.eventScrimDeep} pointerEvents="none" /> : null}

      {badge && !isPlaying && (
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={styles.badgeText}>{badge.label}</Text>
        </View>
      )}

      {banner.banner_type === 'seller_ad' && banner.seller_name && !isPlaying && (
        <View style={[styles.sellerChip, videoUrl && styles.sellerChipWithPlay]}>
          {banner.seller_logo_url ? (
            <Image source={{ uri: banner.seller_logo_url }} style={styles.sellerLogo} />
          ) : null}
          <Text style={styles.sellerChipText} numberOfLines={1}>{banner.seller_name}</Text>
        </View>
      )}

      {videoUrl && !isPlaying ? (
        <PlayButton size={38} label={words.play} style={styles.corner} onPress={() => { setMuted(true); setPlaying(true); }} />
      ) : null}

      {isPlaying ? (
        <View style={styles.controls}>
          <RoundButton symbol={muted ? '🔇' : '🔊'} label={muted ? words.soundOn : words.soundOff} onPress={() => setMuted((m) => !m)} />
          <RoundButton symbol={'✕'} label={words.close} onPress={() => setPlaying(false)} />
        </View>
      ) : null}

      {showEventRow ? (
        <View style={styles.eventRow}>
          <EventTile info={ev} />
          <View style={styles.eventText}>
            <Text style={styles.eventTitle} numberOfLines={1}>{banner.title}</Text>
            {!!ev.whenLine && <Text style={styles.eventLine} numberOfLines={1}>{ev.whenLine}</Text>}
            {!!ev.placeLine && <Text style={styles.eventLine} numberOfLines={1}>{ev.placeLine}</Text>}
          </View>
          {showCta && (
            <View style={styles.cta}>
              <Text style={styles.ctaText}>{banner.button_text}</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={[styles.overlay, isPlaying && styles.overlayOnVideo]}>
          <Text style={styles.title} numberOfLines={1}>{banner.title}</Text>
          {isPlaying && ev ? (
            <Text style={styles.subtitle} numberOfLines={1}>{ev.line}</Text>
          ) : (!!banner.subtitle && <Text style={styles.subtitle} numberOfLines={1}>{banner.subtitle}</Text>)}
          {showCta && (
            <View style={styles.cta}>
              <Text style={styles.ctaText}>{banner.button_text}</Text>
            </View>
          )}
        </View>
      )}
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
  sellerChipWithPlay: { right: 54 },
  sellerLogo: { width: 16, height: 16, borderRadius: RADIUS.full },
  sellerChipText: { fontSize: 10.5, fontWeight: FONTS.semiBold, color: COLORS.textPrimary },
  corner: { position: 'absolute', top: 8, right: 8 },
  controls: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', gap: 8 },
  overlay: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm,
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
  },
  overlayOnVideo: { backgroundColor: 'rgba(0,0,0,0.38)' },
  eventScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 80, backgroundColor: 'rgba(0,0,0,0.18)' },
  eventScrimDeep: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 48, backgroundColor: 'rgba(0,0,0,0.18)' },
  eventRow: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: SPACING.sm, paddingVertical: 8,
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
  },
  eventText: { flex: 1 },
  eventLine: { marginTop: 1, fontSize: 11.5, fontWeight: FONTS.semiBold, color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  eventTitle: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.textWhite, textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  title: { flex: 1, fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.textWhite, textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  subtitle: { fontSize: 11, color: 'rgba(255,255,255,0.92)', textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  cta: { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 4 },
  ctaText: { color: COLORS.textWhite, fontSize: 10.5, fontWeight: FONTS.bold },
});
