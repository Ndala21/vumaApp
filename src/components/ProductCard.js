/**
 * VUMA Store — Product Card Component
 * Fixed: image error fallback, onError handler
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
      <TouchableOpacity style={[styles.listCard, style]} onPress={onPress} activeOpacity={0.85}>
        <View style={styles.listImageWrap}>
          <ProductImage uri={imageUrl} style={styles.listImage} placeholderSize={32} />
          {onSale && (
            <View style={styles.flashBadge}>
              <Text style={styles.flashBadgeText}>⚡ SALE</Text>
            </View>
          )}
        </View>
        <View style={styles.listInfo}>
          <Text style={styles.listName} numberOfLines={2}>{product.name}</Text>
          {product.vendor_name && (
            <Text style={styles.vendorName}>🏪 {product.vendor_name}</Text>
          )}
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(effectivePrice)}</Text>
            {discount > 0 && <Text style={styles.originalPrice}>{formatPrice(product.price)}</Text>}
          </View>
          {product.rating_avg > 0 && (
            <View style={styles.ratingRow}>
              <Text style={styles.ratingStar}>⭐</Text>
              <Text style={styles.ratingText}>{Number(product.rating_avg).toFixed(1)}</Text>
              <Text style={styles.ratingCount}>({product.rating_count})</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={[styles.listCartBtn, isInCart && styles.listCartBtnActive, outOfStock && styles.listCartBtnDisabled]}
          onPress={handleAddToCart} disabled={outOfStock}
        >
          <Text style={styles.listCartBtnText}>{outOfStock ? '✗' : isInCart ? '✓' : '+'}</Text>
        </TouchableOpacity>
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

  // ── Grid Variant (default) ────────────────────────
  return (
    <TouchableOpacity style={[styles.gridCard, style]} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.imageWrap}>
        <ProductImage uri={imageUrl} style={styles.image} placeholderSize={40} />

        {onSale && (
          <View style={styles.flashBadge}>
            <Text style={styles.flashBadgeText}>⚡</Text>
          </View>
        )}
        {discount > 0 && !onSale && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountBadgeText}>-{discount}%</Text>
          </View>
        )}
        {outOfStock && (
          <View style={styles.outOfStockOverlay}>
            <Text style={styles.outOfStockText}>Out of Stock</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.wishlistBtn} onPress={handleWishlist}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.wishlistIcon}>{isWishlisted ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.info}>
        {product.vendor_name && (
          <Text style={styles.vendorName} numberOfLines={1}>{product.vendor_name}</Text>
        )}
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(effectivePrice)}</Text>
          {discount > 0 && <Text style={styles.originalPrice}>{formatPrice(product.price)}</Text>}
        </View>
        {product.rating_avg > 0 && (
          <View style={styles.ratingRow}>
            <Text style={styles.ratingStar}>⭐</Text>
            <Text style={styles.ratingText}>{Number(product.rating_avg).toFixed(1)}</Text>
            <Text style={styles.ratingCount}>({product.rating_count})</Text>
          </View>
        )}
        <Text style={styles.freeShip}>🚚 Free Delivery</Text>
        <TouchableOpacity
          style={[styles.cartBtn, isInCart && styles.cartBtnActive, outOfStock && styles.cartBtnDisabled]}
          onPress={handleAddToCart} disabled={outOfStock} activeOpacity={0.8}
        >
          <Text style={styles.cartBtnText}>
            {outOfStock ? 'Out of Stock' : isInCart ? '✓ Added' : '🛒 Add'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default memo(ProductCard);

const styles = StyleSheet.create({
  // Grid
  gridCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOWS.sm },
  imageWrap: { width: '100%', aspectRatio: 1, backgroundColor: COLORS.skeleton, position: 'relative' },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceAlt },
  flashBadge: { position: 'absolute', top: 6, left: 6, backgroundColor: COLORS.flashSale, borderRadius: RADIUS.sm, paddingHorizontal: 5, paddingVertical: 2 },
  flashBadgeText: { color: COLORS.textWhite, fontSize: FONTS.xs - 1, fontWeight: FONTS.bold },
  discountBadge: { position: 'absolute', top: 6, left: 6, backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, paddingHorizontal: 5, paddingVertical: 2 },
  discountBadgeText: { color: COLORS.textWhite, fontSize: FONTS.xs - 1, fontWeight: FONTS.bold },
  outOfStockOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  outOfStockText: { color: COLORS.textWhite, fontSize: FONTS.xs, fontWeight: FONTS.bold, backgroundColor: COLORS.danger, paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.sm },
  wishlistBtn: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: RADIUS.full, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  wishlistIcon: { fontSize: 14 },
  info: { padding: SPACING.sm },
  vendorName: { fontSize: FONTS.xs, color: COLORS.textMuted, marginBottom: 2 },
  name: { fontSize: FONTS.sm, color: COLORS.textPrimary, lineHeight: 16, fontWeight: FONTS.medium, marginBottom: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  price: { fontSize: FONTS.base, fontWeight: FONTS.extraBold, color: COLORS.primary },
  originalPrice: { fontSize: FONTS.xs, color: COLORS.textMuted, textDecorationLine: 'line-through' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 2 },
  ratingStar: { fontSize: FONTS.xs },
  ratingText: { fontSize: FONTS.xs, color: COLORS.textSecondary, fontWeight: FONTS.semiBold },
  ratingCount: { fontSize: FONTS.xs, color: COLORS.textMuted },
  freeShip: { fontSize: FONTS.xs, color: COLORS.freeShip, fontWeight: FONTS.semiBold, marginBottom: SPACING.xs },
  cartBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 6, alignItems: 'center', marginTop: 2 },
  cartBtnActive: { backgroundColor: COLORS.success },
  cartBtnDisabled: { backgroundColor: COLORS.skeleton },
  cartBtnText: { color: COLORS.textWhite, fontSize: FONTS.xs, fontWeight: FONTS.bold },
  // List
  listCard: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: SPACING.sm, ...SHADOWS.sm },
  listImageWrap: { width: 110, height: 110, position: 'relative' },
  listImage: { width: '100%', height: '100%' },
  listInfo: { flex: 1, padding: SPACING.sm, justifyContent: 'center' },
  listName: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textPrimary, marginBottom: 4, lineHeight: 18 },
  listCartBtn: { width: 32, height: 32, alignSelf: 'center', marginRight: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  listCartBtnActive: { backgroundColor: COLORS.success },
  listCartBtnDisabled: { backgroundColor: COLORS.skeleton },
  listCartBtnText: { color: COLORS.textWhite, fontSize: FONTS.lg, fontWeight: FONTS.bold, lineHeight: 20 },
  // Featured
  featuredCard: { width: 180, height: 220, borderRadius: RADIUS.xl, overflow: 'hidden', marginRight: SPACING.sm, ...SHADOWS.md },
  featuredImage: { width: '100%', height: '100%', position: 'absolute' },
  featuredOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.sm, backgroundColor: 'rgba(0,0,0,0.5)' },
  discountPill: { alignSelf: 'flex-start', backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 2, marginBottom: 4 },
  discountPillText: { color: COLORS.textWhite, fontSize: FONTS.xs, fontWeight: FONTS.bold },
  featuredName: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.textWhite, marginBottom: 2 },
  featuredPrice: { fontSize: FONTS.base, fontWeight: FONTS.extraBold, color: COLORS.primary },
});
