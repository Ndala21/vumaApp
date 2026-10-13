/**
 * VUMA Store - Offer cards and strips (Home screen)
 *
 * Built-in designs (used whenever the Admin has not put a banner in that place):
 *   OfferCard   - one tile of "VUMA Faida & Ofa": soft colour background, round
 *                 icon, a small illustration, bold title, short text and a
 *                 pill button with an arrow. Offers made in the Offer Engine
 *                 (key "dyn_...") keep their own colour and picture.
 *   OfferBanner - one wide strip. variant "gift": gold strip, gift box with the
 *                 real welcome-gift amount on its tag, round arrow button.
 *                 variant "seller": orange strip, shop illustration, white
 *                 "Anza Kuuza" button.
 *
 * Admin banners (they replace the built-in card/strip of the same position):
 *   BannerCard  - the Admin's picture in the size of an offer card
 *   BannerStrip - the Admin's picture as a wide strip
 * Both can show the banner's title / text / button over the picture (with a
 * soft fade so the words stay readable) or show the picture alone.
 *
 * Every size is fixed or comes from the picture's own shape, and the words
 * live in their own area, so nothing overlaps the illustrations or the
 * product cards below.
 */
import React, { memo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../utils/constants';
import { formatAmount } from '../utils/homeBanners';

export const CARD_W = 168;
export const CARD_H = 208;
const NAVY = COLORS.secondary;
const BODY = '#3B4157';
const YELLOW = '#FFD93D';

const IMG = {
  bgGift: require('../../assets/offers/bg_gift.png'),
  bgDelivery: require('../../assets/offers/bg_delivery.png'),
  bgFriends: require('../../assets/offers/bg_friends.png'),
  bgCoupon: require('../../assets/offers/bg_coupon.png'),
  bgFlash: require('../../assets/offers/bg_flash.png'),
  bgStripGold: require('../../assets/offers/bg_strip_gold.png'),
  bgStripOrange: require('../../assets/offers/bg_strip_orange.png'),
  artGift: require('../../assets/offers/art_gift.webp'),
  artDelivery: require('../../assets/offers/art_delivery.webp'),
  artFriends: require('../../assets/offers/art_friends.webp'),
  artCoupon: require('../../assets/offers/art_coupon.webp'),
  artFlash: require('../../assets/offers/art_flash.webp'),
  artStripGift: require('../../assets/offers/art_strip_gift.webp'),
  artStripShop: require('../../assets/offers/art_strip_shop.webp'),
  icGift: require('../../assets/offers/ic_gift.webp'),
  icTruck: require('../../assets/offers/ic_truck.webp'),
  icPeople: require('../../assets/offers/ic_people.webp'),
  icCoupon: require('../../assets/offers/ic_coupon.webp'),
  icBolt: require('../../assets/offers/ic_bolt.webp'),
  scrimVDark: require('../../assets/offers/scrim_v_dark.png'),
  scrimVLight: require('../../assets/offers/scrim_v_light.png'),
  scrimHDark: require('../../assets/offers/scrim_h_dark.png'),
  scrimHLight: require('../../assets/offers/scrim_h_light.png'),
};

// Look of every built-in card (Free Delivery uses the VUMA orange)
const THEMES = {
  welcome_gift: { bg: IMG.bgGift, art: IMG.artGift, icon: IMG.icGift, button: '#F2500F' },
  free_delivery: { bg: IMG.bgDelivery, art: IMG.artDelivery, icon: IMG.icTruck, button: COLORS.primary },
  referral: { bg: IMG.bgFriends, art: IMG.artFriends, icon: IMG.icPeople, button: '#5B3FE0' },
  coupons: { bg: IMG.bgCoupon, art: IMG.artCoupon, icon: IMG.icCoupon, button: '#E5426B' },
  flash_sale: { bg: IMG.bgFlash, art: IMG.artFlash, icon: IMG.icBolt, button: '#7C4DE0' },
};

const FILL = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' };

const label = (...parts) => parts.filter(Boolean).join('. ');

// ─────────────────────────────────────────────────────────────────────────────
// Built-in card
// ─────────────────────────────────────────────────────────────────────────────
export const OfferCard = memo(function OfferCard({ card, tint }) {
  if (!card) return null;
  const theme = THEMES[card.key] || null;
  const hasImage = !!card.image;
  const buttonColor = (theme && theme.button) || card.ctaColor || COLORS.primary;
  return (
    <View style={styles.shadow}>
      <TouchableOpacity
        testID={`offer-${card.key}`}
        style={[
          styles.card,
          hasImage && styles.cardTall,
          { backgroundColor: tint || (theme ? '#FFF3EA' : COLORS.primaryFade) },
        ]}
        onPress={card.onPress}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={label(card.title, card.subtitle)}
      >
        {theme ? <Image source={theme.bg} style={FILL} resizeMode="stretch" /> : null}

        {hasImage ? (
          <Image source={{ uri: card.image }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={styles.head}>
            <View style={styles.iconCircle}>
              {theme ? (
                <Image source={theme.icon} style={styles.iconImg} resizeMode="contain" />
              ) : (
                <Text style={styles.iconEmoji}>{card.icon}</Text>
              )}
            </View>
            {theme ? <Image source={theme.art} style={styles.art} resizeMode="contain" /> : null}
          </View>
        )}

        <Text style={styles.title} numberOfLines={2}>{card.title}</Text>
        {!!card.subtitle && <Text style={styles.sub} numberOfLines={2}>{card.subtitle}</Text>}
        <View style={styles.spacer} />
        {!!card.cta && (
          <View style={[styles.cta, { backgroundColor: buttonColor }]}>
            <Text style={styles.ctaText} numberOfLines={1}>{card.cta}</Text>
            <Text style={styles.ctaArrow}>→</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Admin banner in the place of an offer card
// ─────────────────────────────────────────────────────────────────────────────
function WordsOnPicture({ banner, dark, wide }) {
  const hasButton = !!banner.button_text && banner.link_type && banner.link_type !== 'none';
  if (!banner.title && !banner.subtitle && !hasButton) return null;
  const ink = dark ? NAVY : '#FFFFFF';
  const inkSoft = dark ? BODY : 'rgba(255,255,255,0.92)';
  return (
    <View style={wide ? styles.wordsWide : styles.wordsTall} pointerEvents="none">
      {!!banner.title && (
        <Text style={[wide ? styles.wTitleWide : styles.wTitle, { color: ink }]} numberOfLines={wide ? 1 : 2}>{banner.title}</Text>
      )}
      {!!banner.subtitle && (
        <Text style={[styles.wSub, { color: inkSoft }]} numberOfLines={1}>{banner.subtitle}</Text>
      )}
      {hasButton && (
        <View style={styles.wButton}>
          <Text style={styles.ctaText} numberOfLines={1}>{banner.button_text}</Text>
          <Text style={styles.ctaArrow}>→</Text>
        </View>
      )}
    </View>
  );
}

export const BannerCard = memo(function BannerCard({ banner, onPress }) {
  if (!banner || !banner.image) return null;
  const showWords = banner.text_mode !== 'image';
  const dark = banner.text_color === 'dark';
  const acts = !!banner.link_type && banner.link_type !== 'none';
  return (
    <View style={[styles.shadow, styles.shadowTop]}>
      <TouchableOpacity
        testID={`banner-card-${banner.placement || 'x'}`}
        style={[styles.card, styles.bannerCard]}
        onPress={() => { if (onPress) onPress(banner); }}
        activeOpacity={0.9}
        accessibilityRole={acts ? 'button' : 'image'}
        accessibilityLabel={label(banner.title, banner.subtitle)}
      >
        <Image source={{ uri: banner.image }} style={FILL} resizeMode="cover" />
        {showWords ? (
          <>
            <Image source={dark ? IMG.scrimVLight : IMG.scrimVDark} style={styles.scrimBottom} resizeMode="stretch" />
            <WordsOnPicture banner={banner} dark={dark} wide={false} />
          </>
        ) : null}
      </TouchableOpacity>
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Admin banner as a wide strip (shape 1200 x 375)
// ─────────────────────────────────────────────────────────────────────────────
export const BannerStrip = memo(function BannerStrip({ banner, onPress }) {
  if (!banner || !banner.image) return null;
  const showWords = banner.text_mode !== 'image';
  const dark = banner.text_color === 'dark';
  const acts = !!banner.link_type && banner.link_type !== 'none';
  return (
    <View style={styles.stripShadow}>
      <TouchableOpacity
        testID={`banner-strip-${banner.placement || 'x'}`}
        style={[styles.strip, styles.stripPicture]}
        onPress={() => { if (onPress) onPress(banner); }}
        activeOpacity={0.9}
        accessibilityRole={acts ? 'button' : 'image'}
        accessibilityLabel={label(banner.title, banner.subtitle)}
      >
        <Image source={{ uri: banner.image }} style={FILL} resizeMode="cover" />
        {showWords ? (
          <>
            <Image source={dark ? IMG.scrimHLight : IMG.scrimHDark} style={styles.scrimLeft} resizeMode="stretch" />
            <WordsOnPicture banner={banner} dark={dark} wide />
          </>
        ) : null}
      </TouchableOpacity>
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Built-in strips
// ─────────────────────────────────────────────────────────────────────────────
function VumaTitle({ title }) {
  const parts = String(title || '').split(/(VUMA)/);
  return parts.map((p, i) => (p === 'VUMA' ? <Text key={i} style={styles.vumaWord}>{p}</Text> : p));
}

export const OfferBanner = memo(function OfferBanner({ variant = 'gift', amount, title, subtitle, cta, onPress, testID }) {
  const seller = variant === 'seller';
  const tagAmount = !seller && amount ? formatAmount(amount) : '';
  return (
    <View style={styles.stripShadow}>
      <TouchableOpacity
        testID={testID}
        style={styles.strip}
        onPress={onPress}
        activeOpacity={0.92}
        accessibilityRole="button"
        accessibilityLabel={label(title, subtitle)}
      >
        <Image source={seller ? IMG.bgStripOrange : IMG.bgStripGold} style={FILL} resizeMode="stretch" />

        {seller ? (
          <Image source={IMG.artStripShop} style={styles.shopArt} resizeMode="contain" />
        ) : (
          <View style={styles.giftBox}>
            <Image source={IMG.artStripGift} style={styles.giftArt} resizeMode="contain" />
            {!!tagAmount && (
              <View style={styles.tag}>
                <Text style={styles.tagSmall}>TZS</Text>
                <Text style={styles.tagAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{tagAmount}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.stripText}>
          <Text style={seller ? styles.sellerTitle : styles.giftTitle} numberOfLines={seller ? 1 : 2}>
            {seller ? <VumaTitle title={title} /> : title}
          </Text>
          {!!subtitle && (
            <Text style={seller ? styles.sellerSub : styles.giftSub} numberOfLines={2}>{subtitle}</Text>
          )}
          {seller && !!cta && (
            <View style={styles.sellerButton}>
              <Text style={styles.sellerButtonText} numberOfLines={1}>{cta}</Text>
              <Text style={styles.sellerButtonArrow}>→</Text>
            </View>
          )}
        </View>

        {!seller && (
          <View style={styles.chevron}>
            <Text style={styles.chevronText}>›</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
});

const SHADOW = {
  backgroundColor: '#FFFFFF',
  shadowColor: NAVY, shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

const styles = StyleSheet.create({
  // ── tile ──
  shadow: { width: CARD_W, borderRadius: 18, ...SHADOW },
  shadowTop: { alignSelf: 'flex-start' },
  card: {
    width: CARD_W, minHeight: CARD_H, flexGrow: 1, borderRadius: 18, overflow: 'hidden',
    paddingHorizontal: 12, paddingTop: 12, paddingBottom: 12,
    borderWidth: 1, borderColor: 'rgba(18,22,43,0.05)',
  },
  cardTall: { minHeight: CARD_H + 24 },
  head: { height: 72 },
  iconCircle: {
    width: 44, height: 44, borderRadius: RADIUS.full, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: NAVY, shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  iconImg: { width: 28, height: 28 },
  iconEmoji: { fontSize: 22 },
  art: { position: 'absolute', top: -8, right: -4, width: 78, height: 78 },
  photo: { width: '100%', height: 88, borderRadius: 12, marginBottom: 8, backgroundColor: COLORS.skeleton },
  title: { fontSize: 15.5, lineHeight: 19, fontWeight: FONTS.extraBold, color: NAVY },
  sub: { marginTop: 3, fontSize: 12.5, lineHeight: 16, color: BODY },
  spacer: { flex: 1, minHeight: 8 },
  cta: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 8,
  },
  ctaText: { fontSize: 13, fontWeight: FONTS.bold, color: '#FFFFFF' },
  ctaArrow: { fontSize: 14, fontWeight: FONTS.bold, color: '#FFFFFF', marginTop: -1 },

  // ── admin banner in a card place ──
  bannerCard: { height: CARD_H, minHeight: CARD_H, flexGrow: 0, padding: 0, backgroundColor: COLORS.skeleton },
  scrimBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '62%', width: '100%' },
  wordsTall: { position: 'absolute', left: 12, right: 12, bottom: 12 },
  wTitle: { fontSize: 15.5, lineHeight: 19, fontWeight: FONTS.extraBold },
  wTitleWide: { fontSize: 18, lineHeight: 22, fontWeight: FONTS.extraBold },
  wSub: { marginTop: 2, fontSize: 12.5, lineHeight: 16 },
  wButton: {
    marginTop: 8, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 7,
  },

  // ── wide strip ──
  stripShadow: {
    marginHorizontal: SPACING.base, marginBottom: SPACING.sm + 2, borderRadius: 18, ...SHADOW,
  },
  strip: {
    borderRadius: 18, overflow: 'hidden', minHeight: 112,
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 14,
  },
  stripPicture: { aspectRatio: 1200 / 375, minHeight: 0, padding: 0, backgroundColor: COLORS.skeleton },
  scrimLeft: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '72%', height: '100%' },
  wordsWide: { position: 'absolute', left: 14, top: 0, bottom: 0, width: '62%', justifyContent: 'center' },
  stripText: { flex: 1, paddingLeft: 4 },

  // gift strip
  giftBox: { width: 98, height: 98, marginLeft: -6, marginRight: 6 },
  giftArt: { width: 98, height: 98 },
  tag: {
    position: 'absolute', left: 38, top: 58, minWidth: 54, paddingHorizontal: 6, paddingVertical: 3,
    borderRadius: 6, backgroundColor: '#E8392B', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.9)',
    transform: [{ rotate: '-14deg' }],
  },
  tagSmall: { fontSize: 9, lineHeight: 10, fontWeight: FONTS.extraBold, color: '#FFFFFF', letterSpacing: 0.4 },
  tagAmount: { fontSize: 13, lineHeight: 15, fontWeight: FONTS.black, color: '#FFFFFF', maxWidth: 62 },
  giftTitle: { fontSize: 18, lineHeight: 22, fontWeight: FONTS.black, color: NAVY },
  giftSub: { marginTop: 3, fontSize: 13, lineHeight: 17, color: '#2B2F45' },
  chevron: {
    width: 38, height: 38, borderRadius: RADIUS.full, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center', marginLeft: 8,
    shadowColor: NAVY, shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  chevronText: { fontSize: 26, lineHeight: 29, fontWeight: FONTS.bold, color: COLORS.primary, marginTop: -2, marginLeft: 2 },

  // seller strip
  shopArt: { width: 100, height: 75, marginLeft: -4, marginRight: 8 },
  sellerTitle: { fontSize: 16.5, lineHeight: 21, fontWeight: FONTS.black, color: '#FFFFFF' },
  vumaWord: { color: YELLOW },
  sellerSub: { marginTop: 3, fontSize: 12.5, lineHeight: 16, color: 'rgba(255,255,255,0.96)' },
  sellerButton: {
    marginTop: 8, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFFFF', borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 7,
  },
  sellerButtonText: { fontSize: 13, fontWeight: FONTS.extraBold, color: COLORS.primaryDark },
  sellerButtonArrow: { fontSize: 14, fontWeight: FONTS.bold, color: COLORS.primaryDark, marginTop: -1 },
});
