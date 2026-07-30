/**
 * VUMA Store — Product Card Component
 * Redesign v2: ticket-ribbon discount tag, floating cart FAB (grid variant),
 * glass wishlist button, tighter price typography. Visual only — same props,
 * same Redux actions, same data contract as before.
 */

import React, { memo, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { COLORS, FONTS, RADIUS, SPACING, SHADOWS } from '../utils/constants';
import { formatPrice, getDiscount, isFlashSale, getEffectivePrice } from '../utils/helpers';
import { addToCartAndSave, toggleWishlistAndSave, selectIsInCart, selectIsInWishlist } from '../store/cartSlice';

// ── Safe Image with fallback ──────────────────────────
const ProductImage = memo(({ uri, style, placeholderSize = 40 }) => {
  const [failed, setFailed] = useState(false);

  if (!uri || failed) {
    return (
      <View style={[style, styles.imagePlaceholder]}>
        <Text style={{ fontSize: placeholderSize, opacity: 0.35 }}>📦</Text>
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

// ── Ribbon-style tag — the signature "market price tag" element ──
// Folded-corner ribbon built from layout only (no image assets).
const RibbonTag = ({ label, color = COLORS.discount }) => (
  <View style={styles.ribbonWrap}>
    <View style={[styles.ribbonBody, { backgroundColor: color }]}>
      <Text style={styles.ribbonText}>{label}</Text>
    </View>
    <View style={[styles.ribbonFold, { borderTopColor: color }]} />
  </View>
);

function ProductCard({ product, onPress, style, variant = 'grid' }) {
  const dispatch = useDispatch();
  const isInCart = useSelector(selectIsInCart(product?.id));
  const isWishlisted = useSelector(selectIsInWishlist(product?.id));

  if (!product) return null;

  const effectivePrice = getEffectivePrice(product);
  const discount = getDiscount(product.price, effectivePrice);
  const onSale = isFlashSale(product);
  const outOfStock = product.stock <= 0;
  const imageUrl = product.primary_image || product.images?.[0]?.image_url || null;

  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (outOfStock) return;
    dispatch(addToCartAndSave(product, 1));
  };

  const handleWishlist = (e) => {
    e.stopPropagation();
    dispatch(toggleWishlistAndSave(product.id));
  };

  // ── List Variant ──────────────────────────────────
  if (variant === 'list') {
    return (
      <TouchableOpacity style={[styles.listCard, style]} onPress={onPress} activeOpacity={0.9}>
        <View style={styles.listImageWrap}>
          <ProductImage uri={imageUrl} style={styles.listImage} placeholderSize={30} />
          {onSale && <RibbonTag label="SALE" color={COLORS.flashSale} />}
          {!onSale && discount > 0 && <RibbonTag label={`-${discount}%`} color={COLORS.discount} />}
        </View>
        <View style={styles.listInfo}>
          {product.vendor_name && (
            <Text style={styles.vendorName} numberOfLines={1}>{product.vendor_name}</Text>
          )}
          <Text style={styles.listName} numberOfLines={2}>{product.name}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(effectivePrice)}</Text>
            {discount > 0 && <Text style={styles.originalPrice}>{formatPrice(product.price)}</Text>}
          </View>
          <View style={styles.metaRow}>
            {product.rating_avg > 0 && (
              <View style={styles.ratingPill}>
                <Text style={styles.ratingStar}>★</Text>
                <Text style={styles.ratingText}>{Number(product.rating_avg).toFixed(1)}</Text>
              </View>
            )}
            <View style={styles.shipPill}>
              <Text style={styles.shipPillText}>Free delivery</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.listCartBtn, isInCart && styles.listCartBtnActive, outOfStock && styles.listCartBtnDisabled]}
          onPress={handleAddToCart} disabled={outOfStock} activeOpacity={0.8}
        >
          <Text style={styles.listCartBtnText}>{outOfStock ? '✕' : isInCart ? '✓' : '+'}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  // ── Featured Variant ──────────────────────────────
  if (variant === 'featured') {
    return (
      <TouchableOpacity style={[styles.featuredCard, style]} onPress={onPress} activeOpacity={0.9}>
        <ProductImage uri={imageUrl} style={styles.featuredImage} placeholderSize={44} />
        {/* two-stop fake gradient, no extra dependency */}
        <View style={styles.featuredGradientTop} pointerEvents="none" />
        <View style={styles.featuredGradientBottom} pointerEvents="none" />
        <View style={styles.featuredOverlay}>
          {discount > 0 && (
            <View style={styles.discountPill}>
              <Text style={styles.discountPillText}>-{discount}% OFF</Text>
            </View>
          )}
          <Text style={styles.featuredName} numberOfLines={2}>{product.name}</Text>
          <Text style={styles.featuredPrice}>{formatPrice(effectivePrice)}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // ── Grid Variant (default) ────────────────────────
  return (
    <TouchableOpacity style={[styles.gridCard, style]} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.imageWrap}>
        <ProductImage uri={imageUrl} style={styles.image} placeholderSize={38} />

        {onSale && <RibbonTag label="SALE" color={COLORS.flashSale} />}
        {!onSale && discount > 0 && <RibbonTag label={`-${discount}%`} color={COLORS.discount} />}

        {outOfStock && (
          <View style={styles.outOfStockOverlay}>
            <View style={styles.outOfStockPill}>
              <Text style={styles.outOfStockText}>Out of stock</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.wishlistBtn} onPress={handleWishlist}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.wishlistIcon}>{isWishlisted ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>

        {/* Floating cart FAB — sits on the seam between image and info */}
        <TouchableOpacity
          style={[styles.cartFab, isInCart && styles.cartFabActive, outOfStock && styles.cartFabDisabled]}
          onPress={handleAddToCart} disabled={outOfStock} activeOpacity={0.85}
        >
          <Text style={styles.cartFabText}>{outOfStock ? '✕' : isInCart ? '✓' : '+'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.info}>
        {product.vendor_name && (
          <Text style={styles.vendorName} numberOfLines={1}>{product.vendor_name}</Text>
        )}
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>

        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(effectivePrice)}</Text>
        </View>
        {discount > 0 && (
          <Text style={styles.originalPrice}>{formatPrice(product.price)}</Text>
        )}

        <View style={styles.metaRow}>
          {product.rating_avg > 0 && (
            <View style={styles.ratingPill}>
              <Text style={styles.ratingStar}>★</Text>
              <Text style={styles.ratingText}>{Number(product.rating_avg).toFixed(1)}</Text>
              {product.rating_count > 0 && (
                <Text style={styles.ratingCount}>({product.rating_count})</Text>
              )}
            </View>
          )}
          <View style={styles.shipPill}>
            <Text style={styles.shipPillText}>🚚 Free</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default memo(ProductCard);

const RIBBON_H = 22;

const styles = StyleSheet.create({
  // ── Grid ──────────────────────────────────────────
  gridCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'visible',
    ...SHADOWS.xs,
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: COLORS.skeleton,
    position: 'relative',
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceAlt },

  // Ribbon tag (signature element)
  ribbonWrap: { position: 'absolute', top: 8, left: -1, zIndex: 5 },
  ribbonBody: {
    height: RIBBON_H,
    paddingHorizontal: 8,
    justifyContent: 'center',
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  ribbonText: { color: COLORS.textWhite, fontSize: 10.5, fontWeight: FONTS.extraBold, letterSpacing: 0.2 },
  ribbonFold: {
    width: 0,
    height: 0,
    borderTopWidth: 5,
    borderRightWidth: 5,
    borderRightColor: 'transparent',
    // borderTopColor set inline per instance — creates a small notch shadow under the ribbon
    opacity: 0.55,
  },

  outOfStockOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: COLORS.scrim, alignItems: 'center', justifyContent: 'center',
  },
  outOfStockPill: { backgroundColor: COLORS.danger, paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.full },
  outOfStockText: { color: COLORS.textWhite, fontSize: FONTS.xs, fontWeight: FONTS.bold },

  wishlistBtn: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: RADIUS.full, width: 30, height: 30,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(20,20,26,0.06)',
    ...SHADOWS.xs,
  },
  wishlistIcon: { fontSize: 14 },

  // Floating cart FAB — the "Temu-style" seam button
  cartFab: {
    position: 'absolute',
    right: 10,
    bottom: -16,
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: COLORS.surface,
    ...SHADOWS.primary,
    zIndex: 6,
  },
  cartFabActive: { backgroundColor: COLORS.success },
  cartFabDisabled: { backgroundColor: COLORS.textLight, shadowOpacity: 0, elevation: 0 },
  cartFabText: { color: COLORS.textWhite, fontSize: 18, fontWeight: FONTS.bold, lineHeight: 20, marginTop: -1 },

  info: { padding: SPACING.sm, paddingTop: SPACING.md + 2 },
  vendorName: { fontSize: FONTS.xs, color: COLORS.textMuted, marginBottom: 3, fontWeight: FONTS.medium },
  name: {
    fontSize: FONTS.sm, color: COLORS.textPrimary, lineHeight: 17,
    fontWeight: FONTS.medium, marginBottom: 5, minHeight: 34,
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  price: {
    fontSize: FONTS.lg, fontWeight: FONTS.extraBold, color: COLORS.textPrimary,
    letterSpacing: FONTS.trackTight,
  },
  originalPrice: {
    fontSize: FONTS.xs, color: COLORS.textLight, textDecorationLine: 'line-through',
    marginBottom: 4, marginTop: -2,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  ratingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: COLORS.warningLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.sm,
  },
  ratingStar: { fontSize: 10, color: COLORS.rating },
  ratingText: { fontSize: 10.5, color: COLORS.warningText, fontWeight: FONTS.bold },
  ratingCount: { fontSize: 10, color: COLORS.textMuted },
  shipPill: {
    backgroundColor: COLORS.successLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.sm,
  },
  shipPillText: { fontSize: 10.5, color: COLORS.successText, fontWeight: FONTS.semiBold },

  // ── List ──────────────────────────────────────────
  listCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
    ...SHADOWS.xs,
  },
  listImageWrap: { width: 108, height: 108, position: 'relative', backgroundColor: COLORS.skeleton },
  listImage: { width: '100%', height: '100%' },
  listInfo: { flex: 1, padding: SPACING.sm, justifyContent: 'center' },
  listName: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textPrimary, marginBottom: 5, lineHeight: 18 },
  listCartBtn: {
    width: 34, height: 34, alignSelf: 'center', marginRight: SPACING.md,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    alignItems: 'center', justifyContent: 'center', ...SHADOWS.primary,
  },
  listCartBtnActive: { backgroundColor: COLORS.success, shadowColor: COLORS.success },
  listCartBtnDisabled: { backgroundColor: COLORS.textLight, shadowOpacity: 0, elevation: 0 },
  listCartBtnText: { color: COLORS.textWhite, fontSize: FONTS.lg, fontWeight: FONTS.bold, lineHeight: 20 },

  // ── Featured ──────────────────────────────────────
  featuredCard: {
    width: 184, height: 224, borderRadius: RADIUS.xl, overflow: 'hidden',
    marginRight: SPACING.sm, backgroundColor: COLORS.secondary, ...SHADOWS.md,
  },
  featuredImage: { width: '100%', height: '100%', position: 'absolute' },
  featuredGradientTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: '55%',
    backgroundColor: 'rgba(18,22,43,0.05)',
  },
  featuredGradientBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '58%',
    backgroundColor: 'rgba(18,22,43,0.72)',
  },
  featuredOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.md },
  discountPill: {
    alignSelf: 'flex-start', backgroundColor: COLORS.discount, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm, paddingVertical: 3, marginBottom: 6,
  },
  discountPillText: { color: COLORS.textWhite, fontSize: 10.5, fontWeight: FONTS.extraBold },
  featuredName: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.textWhite, marginBottom: 3, lineHeight: 17 },
  featuredPrice: { fontSize: FONTS.lg, fontWeight: FONTS.extraBold, color: COLORS.textWhite, letterSpacing: FONTS.trackTight },
});