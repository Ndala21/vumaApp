/**
 * VUMA Store — Product Card Component
 *
 * Laid out like the Coupang product lists: a flat tile with no shadow and no
 * frame, a square photo with softly rounded corners, then
 *   - the product name on one line (two lines in the list variant),
 *   - a red "%" dot with "17% off" while a sale price is running,
 *   - the price (old price crossed out next to it),
 *   - an orange "Free Delivery" tag,
 *   - five stars with the number of ratings, e.g. "(9,999+)".
 * A small round cart button sits at the bottom right of the photo.
 * The featured variant (text over the photo) is unchanged.
 */

import React, { memo, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { t } from '../i18n';
import { COLORS, FONTS, RADIUS, SPACING, SHADOWS } from '../utils/constants';
import { formatPrice, getDiscount, isFlashSale, getEffectivePrice } from '../utils/helpers';
import { addToCartAndSave, selectIsInCart } from '../store/cartSlice';

// 1284 -> "1,284", 12500 -> "9,999+"
export const formatRatingCount = (n) => {
  const count = Number(n) || 0;
  if (count > 9999) return '9,999+';
  return String(count).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export const starsFor = (avg) => {
  const filled = Math.max(0, Math.min(5, Math.round(Number(avg) || 0)));
  return '★'.repeat(filled) + '☆'.repeat(5 - filled);
};

// ── Safe Image with fallback ──────────────────────────
const ProductImage = memo(({ uri, style, placeholderSize = 40 }) => {
  const [failed, setFailed] = useState(false);

  if (!uri || failed) {
    return (
      <View style={[style, styles.imagePlaceholder]}>
        <Text style={{ fontSize: placeholderSize }}>📦</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
});

function ProductCard({ product, onPress, style, variant = 'grid', onAddedToCart }) {
  const dispatch = useDispatch();
  const isInCart = useSelector(selectIsInCart(product?.id));

  if (!product) return null;

  const effectivePrice = getEffectivePrice(product);
  const discount = getDiscount(product.price, effectivePrice);
  const onSale = isFlashSale(product);
  const outOfStock = product.stock <= 0;
  const imageUrl = product.primary_image || product.images?.[0]?.image_url || null;
  const hasRating = Number(product.rating_avg) > 0;

  const handleAddToCart = (e) => {
    e && e.stopPropagation && e.stopPropagation();
    if (outOfStock) return;
    dispatch(addToCartAndSave(product, 1));
    onAddedToCart && onAddedToCart(product);
  };

  // The text under the photo — the same in the grid and the list.
  const meta = (nameLines) => (
    <>
      {product.is_sponsored && <Text style={styles.sponsoredLabel}>Sponsored</Text>}
      <Text style={styles.name} numberOfLines={nameLines}>{product.name}</Text>
      {discount > 0 && (
        <View style={styles.offRow}>
          <View style={styles.offDot}><Text style={styles.offDotText}>%</Text></View>
          <Text style={styles.offText} numberOfLines={1}>{t('products.percentOff', { count: discount })}</Text>
        </View>
      )}
      <View style={styles.priceRow}>
        <Text style={styles.price}>{formatPrice(effectivePrice)}</Text>
        {discount > 0 && <Text style={styles.originalPrice}>{formatPrice(product.price)}</Text>}
      </View>
      <View style={styles.freeTag}>
        <Text style={styles.freeTagText} numberOfLines={1}>{t('products.freeDeliveryChip')}</Text>
      </View>
      {hasRating && (
        <View style={styles.ratingRow}>
          <Text style={styles.stars}>{starsFor(product.rating_avg)}</Text>
          {Number(product.rating_count) > 0 && (
            <Text style={styles.ratingCount}>{'(' + formatRatingCount(product.rating_count) + ')'}</Text>
          )}
        </View>
      )}
    </>
  );

  const cartButton = (extraStyle) => (
    <TouchableOpacity
      testID="card-cart"
      style={[styles.cartFab, extraStyle, outOfStock && styles.cartFabDisabled]}
      onPress={handleAddToCart} disabled={outOfStock}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      accessibilityRole="button"
    >
      <Text style={styles.cartFabIcon}>{outOfStock ? '✗' : '🛒'}</Text>
    </TouchableOpacity>
  );

  // ── List Variant ──────────────────────────────────
  if (variant === 'list') {
    return (
      <TouchableOpacity style={[styles.listCard, style]} onPress={onPress} activeOpacity={0.85}>
        <View style={styles.listImageWrap}>
          <ProductImage uri={imageUrl} style={styles.listImage} placeholderSize={32} />
          {outOfStock && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>{t('products.outOfStock')}</Text>
            </View>
          )}
        </View>
        <View style={styles.listInfo}>
          {meta(2)}
          {product.vendor_name ? <Text style={styles.vendorName} numberOfLines={1}>{product.vendor_name}</Text> : null}
        </View>
        {cartButton(styles.listCartFab)}
      </TouchableOpacity>
    );
  }

  // ── Featured Variant ──────────────────────────────
  if (variant === 'featured') {
    return (
      <TouchableOpacity style={[styles.featuredCard, style]} onPress={onPress} activeOpacity={0.85}>
        <ProductImage uri={imageUrl} style={styles.featuredImage} placeholderSize={48} />
        <View style={styles.featuredOverlay}>
          {discount > 0 && (
            <View style={styles.discountPill}>
              <Text style={styles.discountPillText}>-{discount}%</Text>
            </View>
          )}
          <Text style={styles.featuredName} numberOfLines={2}>{product.name}</Text>
          <Text style={styles.featuredPrice}>{formatPrice(effectivePrice)}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // ── Grid Variant (default) ─────────────────────────
  return (
    <TouchableOpacity style={[styles.gridCard, style]} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.imageWrap}>
        <ProductImage uri={imageUrl} style={styles.image} placeholderSize={30} />
        {outOfStock && (
          <View style={styles.outOfStockOverlay}>
            <Text style={styles.outOfStockText}>{t('products.outOfStock')}</Text>
          </View>
        )}
        {cartButton()}
      </View>
      <View style={styles.info}>
        {meta(1)}
      </View>
    </TouchableOpacity>
  );
}

export default memo(ProductCard);

const styles = StyleSheet.create({
  // Grid — flat tile
  gridCard: { backgroundColor: COLORS.surface },
  imageWrap: { width: '100%', aspectRatio: 1, backgroundColor: COLORS.surfaceSunken, borderRadius: 8, overflow: 'hidden', position: 'relative' },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceAlt },
  outOfStockOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  outOfStockText: { color: COLORS.textWhite, fontSize: 9.5, fontWeight: FONTS.bold, backgroundColor: COLORS.danger, paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.sm, textAlign: 'center' },
  // Plain white round button with a thin edge, like the cart button in Coupang lists.
  cartFab: {
    position: 'absolute', bottom: 6, right: 6, backgroundColor: COLORS.surface, borderRadius: RADIUS.full,
    width: 28, height: 28, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.xs,
  },
  cartFabDisabled: { backgroundColor: COLORS.surfaceSunken },
  cartFabIcon: { fontSize: 13 },
  info: { paddingTop: 8, paddingBottom: 2 },

  // Shared text blocks
  sponsoredLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: FONTS.medium, marginBottom: 2 },
  vendorName: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 4 },
  name: { fontSize: 12.5, color: COLORS.textPrimary, lineHeight: 17, fontWeight: FONTS.regular },
  offRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  offDot: { width: 15, height: 15, borderRadius: RADIUS.full, backgroundColor: COLORS.discount, alignItems: 'center', justifyContent: 'center' },
  offDotText: { color: COLORS.textWhite, fontSize: 9.5, fontWeight: FONTS.extraBold, lineHeight: 12 },
  offText: { flexShrink: 1, fontSize: 12, fontWeight: FONTS.bold, color: COLORS.discount },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 5, marginTop: 4 },
  price: { fontSize: 15, fontWeight: FONTS.extraBold, color: COLORS.textPrimary, letterSpacing: FONTS.trackTight },
  originalPrice: { fontSize: 11, color: COLORS.textMuted, textDecorationLine: 'line-through' },
  freeTag: { alignSelf: 'flex-start', backgroundColor: COLORS.primaryFade, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginTop: 5 },
  freeTagText: { fontSize: 11, fontWeight: FONTS.bold, color: COLORS.primaryDark },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 5 },
  stars: { fontSize: 11, color: COLORS.rating, letterSpacing: 0.5 },
  ratingCount: { fontSize: 11, color: COLORS.textSecondary },

  // List — flat row with a thin line under it
  listCard: {
    flexDirection: 'row', backgroundColor: COLORS.surface, padding: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.divider,
  },
  listImageWrap: { width: 112, height: 112, borderRadius: 8, overflow: 'hidden', backgroundColor: COLORS.surfaceSunken, position: 'relative' },
  listImage: { width: '100%', height: '100%' },
  listInfo: { flex: 1, paddingLeft: SPACING.md, paddingRight: 36, justifyContent: 'flex-start' },
  listCartFab: { bottom: SPACING.md, right: SPACING.md },

  // Featured — unchanged
  featuredCard: { width: 180, height: 220, borderRadius: RADIUS.xl, overflow: 'hidden', marginRight: SPACING.sm, ...SHADOWS.md },
  featuredImage: { width: '100%', height: '100%', position: 'absolute' },
  featuredOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.sm, backgroundColor: 'rgba(0,0,0,0.5)' },
  discountPill: { alignSelf: 'flex-start', backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 2, marginBottom: 4 },
  discountPillText: { color: COLORS.textWhite, fontSize: FONTS.xs, fontWeight: FONTS.bold },
  featuredName: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.textWhite, marginBottom: 2 },
  featuredPrice: { fontSize: FONTS.base, fontWeight: FONTS.extraBold, color: COLORS.primary },
});
