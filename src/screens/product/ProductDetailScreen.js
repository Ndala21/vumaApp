/**
 * VUMA Store — Product Detail Screen
 * Fixed: Size selector for Fashion/Clothing/Shoes + auth modal
 */

import { t } from '../../i18n';
import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, StatusBar, Platform, FlatList, Alert,
  Animated, Share, Modal,
} from 'react-native';
import { Image } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchProductDetail, submitReview, selectSelectedProduct,
  selectProductsLoading, selectProductsErrors, clearSelectedProduct,
} from '../../store/productSlice';
import {
  addToCartAndSave, toggleWishlistAndSave,
  selectIsInCart, selectIsInWishlist,
} from '../../store/cartSlice';
import { selectIsAuthenticated } from '../../store/authSlice';
import { COLORS, FONTS, SPACING, RADIUS, SCREENS, SHADOWS } from '../../utils/constants';
import {
  formatPrice, formatDate, getDiscount, isFlashSale,
  getEffectivePrice, formatCountdown, secondsUntil, getInitials,
} from '../../utils/helpers';
import Button from '../../components/common/Button';
import Loading, { OverlayLoading } from '../../components/common/Loading';
import { FullScreenError } from '../../components/common/ErrorMessage';
import { CustomerSizeSelector, requiresSize } from '../../components/SizeSelector';

const { width } = Dimensions.get('window');

// ── Auth Modal ────────────────────────────────────────
const AuthModal = memo(({ visible, onClose, onLogin, onRegister }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.authOverlay}>
      <View style={styles.authModal}>
        <View style={styles.authIconWrap}>
          <Text style={styles.authIcon}>🔐</Text>
        </View>
        <Text style={styles.authTitle}>Login Required</Text>
        <Text style={styles.authMessage}>
          Please login or create an account to continue shopping on VUMA.
        </Text>
        <View style={styles.authBenefits}>
          {['🛒 Add items to cart', '⚡ Fast checkout', '📦 Track your orders', '❤️ Save your wishlist'].map((b, i) => (
            <Text key={i} style={styles.authBenefit}>{b}</Text>
          ))}
        </View>
        <TouchableOpacity style={styles.authLoginBtn} onPress={onLogin}>
          <Text style={styles.authLoginText}>Login to My Account</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.authRegisterBtn} onPress={onRegister}>
          <Text style={styles.authRegisterText}>Create New Account</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.authCancelBtn} onPress={onClose}>
          <Text style={styles.authCancelText}>Cancel — Continue Browsing</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
));

export default function ProductDetailScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { productId, product: routeProduct } = route?.params || {};

  const product = useSelector(selectSelectedProduct);
  const loading = useSelector(selectProductsLoading);
  const errors = useSelector(selectProductsErrors);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isInCart = useSelector(selectIsInCart(product?.id));
  const isWishlisted = useSelector(selectIsInWishlist(product?.id));

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [flashCountdown, setFlashCountdown] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [sizeError, setSizeError] = useState(false);

  const cartBounce = useRef(new Animated.Value(1)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (productId) dispatch(fetchProductDetail(productId));
    return () => dispatch(clearSelectedProduct());
  }, [productId]);

  useEffect(() => {
    if (!product?.is_flash_sale || !product?.flash_sale_end) return;
    setFlashCountdown(secondsUntil(product.flash_sale_end));
    const timer = setInterval(() => setFlashCountdown((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [product?.flash_sale_end]);

  useEffect(() => {
    // Reset size when product changes
    setSelectedSize(null);
    setSizeError(false);
  }, [product?.id]);

  useEffect(() => {
    if (isAuthenticated && pendingAction && displayProduct) {
      if (pendingAction === 'cart') {
        dispatch(addToCartAndSave(displayProduct, quantity));
        setAddedToCart(true);
        setTimeout(() => setAddedToCart(false), 2000);
      } else if (pendingAction === 'buy') {
        dispatch(addToCartAndSave(displayProduct, quantity));
        navigation.navigate(SCREENS.CHECKOUT);
      }
      setPendingAction(null);
    }
  }, [isAuthenticated]);

  const displayProduct = product || routeProduct;

  if (!displayProduct && loading.detail) return <Loading fullScreen message="Loading product..." />;
  if (!displayProduct && errors.detail) return <FullScreenError error={errors.detail} onRetry={() => dispatch(fetchProductDetail(productId))} />;
  if (!displayProduct) return null;

  const effectivePrice = getEffectivePrice(displayProduct);
  const discount = getDiscount(displayProduct.price, effectivePrice);
  const onSale = isFlashSale(displayProduct);
  const outOfStock = displayProduct.stock <= 0;
  const images = displayProduct.images || [];
  const reviews = displayProduct.reviews || [];
  const productNeedsSize = displayProduct.requires_size && displayProduct.available_sizes?.length > 0;

  // ── Validate size selection ──
  const validateSize = () => {
    if (productNeedsSize && !selectedSize) {
      setSizeError(true);
      Alert.alert('Select Size', 'Please select a size before continuing.');
      return false;
    }
    return true;
  };

  const handleAuthLogin = () => {
    setShowAuthModal(false);
    navigation.navigate('Auth', { screen: SCREENS.LOGIN, params: { returnTo: 'ProductDetail', productId } });
  };

  const handleAuthRegister = () => {
    setShowAuthModal(false);
    navigation.navigate('Auth', { screen: SCREENS.REGISTER, params: { returnTo: 'ProductDetail', productId } });
  };

  const handleAddToCart = () => {
    if (!isAuthenticated) { setPendingAction('cart'); setShowAuthModal(true); return; }
    if (outOfStock) return;
    if (!validateSize()) return;
    dispatch(addToCartAndSave({ ...displayProduct, selectedSize }, quantity));
    setAddedToCart(true);
    Animated.sequence([
      Animated.spring(cartBounce, { toValue: 1.2, useNativeDriver: true }),
      Animated.spring(cartBounce, { toValue: 1, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleBuyNow = () => {
    if (!isAuthenticated) { setPendingAction('buy'); setShowAuthModal(true); return; }
    if (!validateSize()) return;
    dispatch(addToCartAndSave({ ...displayProduct, selectedSize }, quantity));
    navigation.navigate(SCREENS.CHECKOUT);
  };

  const handleWishlist = () => {
    if (!isAuthenticated) { setPendingAction(null); setShowAuthModal(true); return; }
    dispatch(toggleWishlistAndSave(displayProduct.id));
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: `Check out ${displayProduct.name} on VUMA Store! ${formatPrice(effectivePrice)}`, title: displayProduct.name });
    } catch {}
  };

  const handleSubmitReview = async () => {
    if (!isAuthenticated) { setShowAuthModal(true); return; }
    const result = await dispatch(submitReview({ productId: displayProduct.id, rating: reviewRating, comment: reviewComment }));
    if (submitReview.fulfilled.match(result)) {
      setShowReviewModal(false);
      setReviewComment('');
      setReviewRating(5);
      Alert.alert('Success', 'Review submitted!');
    }
  };

  const headerOpacity = scrollY.interpolate({ inputRange: [0, 200], outputRange: [0, 1], extrapolate: 'clamp' });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <Animated.View style={[styles.animHeader, { opacity: headerOpacity }]}>
        <Text style={styles.animHeaderTitle} numberOfLines={1}>{displayProduct.name}</Text>
      </Animated.View>

      <View style={styles.topActions}>
        <TouchableOpacity style={styles.topActionBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.topActionIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.topActionRight}>
          <TouchableOpacity style={styles.topActionBtn} onPress={handleWishlist}>
            <Text style={styles.topActionIcon}>{isWishlisted ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.topActionBtn} onPress={handleShare}>
            <Text style={styles.topActionIcon}>📤</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.topActionBtn} onPress={() => navigation.navigate(SCREENS.CART)}>
            <Text style={styles.topActionIcon}>🛒</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Image Gallery */}
        <View style={styles.galleryWrap}>
          <FlatList
            data={images.length > 0 ? images : [{ image_url: null }]}
            horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setActiveImageIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.galleryImage} resizeMode="cover" />
            ) : (
              <View style={styles.galleryPlaceholder}>
                <Text style={styles.placeholderEmoji}>📦</Text>
              </View>
            )}
            keyExtractor={(_, i) => i.toString()}
          />
          {images.length > 1 && (
            <View style={styles.imageDots}>
              {images.map((_, i) => (
                <View key={i} style={[styles.imageDot, i === activeImageIndex && styles.imageDotActive]} />
              ))}
            </View>
          )}
          {onSale && (
            <View style={styles.flashOverlay}>
              <Text style={styles.flashText}>⚡ FLASH SALE</Text>
              {flashCountdown > 0 && <Text style={styles.flashCountdown}>{formatCountdown(flashCountdown)}</Text>}
            </View>
          )}
          {discount > 0 && !onSale && (
            <View style={styles.discountOverlay}>
              <Text style={styles.discountOverlayText}>-{discount}%</Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.infoCard}>
          {displayProduct.vendor_name && (
            <TouchableOpacity style={styles.vendorRow}>
              <Text style={styles.vendorIcon}>🏪</Text>
              <Text style={styles.vendorName}>{displayProduct.vendor_name}</Text>
              <Text style={styles.vendorArrow}>›</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.productName}>{displayProduct.name}</Text>
          {displayProduct.category_name && (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>{displayProduct.category_name}</Text>
            </View>
          )}
          <View style={styles.priceSection}>
            <View style={styles.priceRow}>
              <Text style={styles.effectivePrice}>{formatPrice(effectivePrice)}</Text>
              {discount > 0 && (
                <>
                  <Text style={styles.originalPrice}>{formatPrice(displayProduct.price)}</Text>
                  <View style={styles.discountPill}>
                    <Text style={styles.discountPillText}>-{discount}%</Text>
                  </View>
                </>
              )}
            </View>
            <Text style={styles.freeShip}>🚚 Free Shipping</Text>
          </View>
          {displayProduct.rating_avg > 0 && (
            <View style={styles.ratingRow}>
              <Text style={styles.ratingStarSmall}>⭐</Text>
              <Text style={styles.ratingValue}>{Number(displayProduct.rating_avg).toFixed(1)}</Text>
              <Text style={styles.ratingCountSmall}>({displayProduct.rating_count} reviews)</Text>
              <Text style={styles.salesCount}>· {displayProduct.sales_count || 0} sold</Text>
            </View>
          )}
        </View>

        {/* Guest Banner */}
        {!isAuthenticated && (
          <TouchableOpacity style={styles.guestBanner} onPress={() => setShowAuthModal(true)}>
            <Text style={styles.guestBannerIcon}>👤</Text>
            <View style={styles.guestBannerText}>
              <Text style={styles.guestBannerTitle}>Login to shop on VUMA</Text>
              <Text style={styles.guestBannerSub}>Get exclusive deals and track your orders</Text>
            </View>
            <Text style={styles.guestBannerArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* Size Selector — only for Fashion/Clothing/Shoes */}
        {productNeedsSize && (
          <View style={styles.card}>
            <CustomerSizeSelector
              categoryName={displayProduct.category_name}
              availableSizes={displayProduct.available_sizes}
              selectedSize={selectedSize}
              onSelect={(size) => { setSelectedSize(size); setSizeError(false); }}
              error={sizeError}
            />
          </View>
        )}

        {/* Quantity */}
        <View style={styles.card}>
          <Text style={styles.qtyLabel}>Quantity</Text>
          <View style={styles.qtyRow}>
            <TouchableOpacity
              style={[styles.qtyBtn, quantity <= 1 && styles.qtyBtnDisabled]}
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
            >
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qtyValue}>{quantity}</Text>
            <TouchableOpacity
              style={[styles.qtyBtn, quantity >= displayProduct.stock && styles.qtyBtnDisabled]}
              onPress={() => setQuantity((q) => Math.min(q + 1, displayProduct.stock))}
              disabled={quantity >= displayProduct.stock}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
            <Text style={styles.stockText}>
              {displayProduct.stock > 0 ? `${displayProduct.stock} available` : '❌ Out of stock'}
            </Text>
          </View>
        </View>

        {/* Description */}
        {displayProduct.description && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>📋 Description</Text>
            <Text style={styles.description}>{displayProduct.description}</Text>
          </View>
        )}

        {/* Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📦 Details</Text>
          {[
            ['SKU', displayProduct.sku],
            ['Stock', `${displayProduct.stock} units`],
            ['Weight', displayProduct.weight ? `${displayProduct.weight} kg` : null],
            ['Sizes', displayProduct.available_sizes?.length > 0 ? displayProduct.available_sizes.join(', ') : null],
          ].filter(([, v]) => v).map(([label, value]) => (
            <View key={label} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{label}</Text>
              <Text style={styles.detailValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Reviews */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>⭐ Reviews ({reviews.length})</Text>
            <TouchableOpacity onPress={() => setShowReviewModal(true)}>
              <Text style={styles.writeReview}>Write Review</Text>
            </TouchableOpacity>
          </View>
          {displayProduct.rating_avg > 0 && (
            <View style={styles.ratingSummary}>
              <Text style={styles.ratingBig}>{Number(displayProduct.rating_avg).toFixed(1)}</Text>
              <View>
                <Text style={styles.ratingStars}>{'⭐'.repeat(Math.round(displayProduct.rating_avg))}</Text>
                <Text style={styles.ratingCount}>{displayProduct.rating_count} reviews</Text>
              </View>
            </View>
          )}
          {reviews.slice(0, 5).map((review, i) => (
            <View key={i} style={styles.reviewItem}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewAvatar}>
                  <Text style={styles.reviewAvatarText}>{getInitials(review.user_name || 'U')}</Text>
                </View>
                <View style={styles.reviewMeta}>
                  <Text style={styles.reviewUser}>{review.user_name || 'Customer'}</Text>
                  <Text style={styles.reviewDate}>{formatDate(review.created_at)}</Text>
                </View>
                <Text style={styles.reviewRating}>{'⭐'.repeat(review.rating)}</Text>
              </View>
              {review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
              {review.is_verified_purchase && <Text style={styles.verifiedPurchase}>✅ Verified Purchase</Text>}
            </View>
          ))}
          {reviews.length === 0 && <Text style={styles.noReviews}>No reviews yet. Be the first!</Text>}
        </View>

        <View style={{ height: 120 }} />
      </Animated.ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.chatBtn}
          onPress={() => navigation.navigate(SCREENS.CHAT, { productId: displayProduct.id, vendorId: displayProduct.vendor_id })}
        >
          <Text style={styles.chatBtnText}>💬</Text>
        </TouchableOpacity>
        <Animated.View style={[styles.cartBtnWrap, { transform: [{ scale: cartBounce }] }]}>
          <Button
            title={outOfStock ? t('products.outOfStock') : addedToCart ? '✓ Added!' : t('products.addToCart')}
            variant={outOfStock ? 'outlineSecondary' : addedToCart ? 'success' : 'outline'}
            onPress={handleAddToCart}
            disabled={outOfStock || loading.detail}
            style={styles.addCartBtn}
          />
        </Animated.View>
        <Button
          title={outOfStock ? 'Unavailable' : t('products.buyNow')}
          onPress={handleBuyNow}
          disabled={outOfStock}
          style={styles.buyNowBtn}
        />
      </View>

      <AuthModal
        visible={showAuthModal}
        onClose={() => { setShowAuthModal(false); setPendingAction(null); }}
        onLogin={handleAuthLogin}
        onRegister={handleAuthRegister}
      />

      {showReviewModal && (
        <View style={styles.reviewModalOverlay}>
          <View style={styles.reviewModal}>
            <View style={styles.reviewModalHeader}>
              <Text style={styles.reviewModalTitle}>✍️ Write a Review</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <Text style={styles.reviewModalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.reviewModalLabel}>Rating</Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setReviewRating(star)}>
                  <Text style={[styles.starIcon, star <= reviewRating && styles.starIconActive]}>⭐</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Button title="Submit Review" onPress={handleSubmitReview} loading={loading.review} fullWidth style={{ marginTop: SPACING.base }} />
          </View>
        </View>
      )}

      <OverlayLoading visible={loading.detail && !product} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: SPACING.xl },
  animHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50, backgroundColor: COLORS.surface, paddingTop: Platform.OS === 'ios' ? 50 : SPACING.base, paddingBottom: SPACING.sm, paddingHorizontal: SPACING.xl, borderBottomWidth: 1, borderBottomColor: COLORS.divider, alignItems: 'center' },
  animHeaderTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  topActions: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : SPACING.base, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.sm, zIndex: 100 },
  topActionRight: { flexDirection: 'row', gap: SPACING.xs },
  topActionBtn: { width: 38, height: 38, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm },
  topActionIcon: { fontSize: 18 },
  galleryWrap: { width, height: width * 0.85, backgroundColor: COLORS.surfaceAlt, position: 'relative' },
  galleryImage: { width, height: width * 0.85 },
  galleryPlaceholder: { width, height: width * 0.85, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceAlt },
  placeholderEmoji: { fontSize: 80 },
  imageDots: { position: 'absolute', bottom: SPACING.base, alignSelf: 'center', flexDirection: 'row', gap: 4 },
  imageDot: { width: 6, height: 6, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.5)' },
  imageDotActive: { backgroundColor: COLORS.primary, width: 16 },
  flashOverlay: { position: 'absolute', bottom: SPACING.xl, left: SPACING.base, backgroundColor: COLORS.flashSale || COLORS.danger, borderRadius: RADIUS.md, paddingHorizontal: SPACING.sm, paddingVertical: 4 },
  flashText: { color: COLORS.textWhite, fontSize: FONTS.xs, fontWeight: FONTS.bold },
  flashCountdown: { color: COLORS.textWhite, fontSize: FONTS.xs, fontWeight: FONTS.bold },
  discountOverlay: { position: 'absolute', top: SPACING.xl, right: SPACING.base, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: SPACING.sm, paddingVertical: 4 },
  discountOverlayText: { color: COLORS.textWhite, fontSize: FONTS.sm, fontWeight: FONTS.bold },
  infoCard: { backgroundColor: COLORS.surface, padding: SPACING.base, marginBottom: SPACING.sm },
  vendorRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.sm, paddingVertical: SPACING.xs },
  vendorIcon: { fontSize: FONTS.base },
  vendorName: { flex: 1, fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.semiBold },
  vendorArrow: { fontSize: FONTS.xl, color: COLORS.textMuted },
  productName: { fontSize: FONTS['2xl'], fontWeight: FONTS.bold, color: COLORS.textPrimary, lineHeight: 30, marginBottom: SPACING.sm },
  categoryPill: { alignSelf: 'flex-start', backgroundColor: COLORS.primaryFade, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 3, marginBottom: SPACING.sm },
  categoryText: { fontSize: FONTS.xs, color: COLORS.primary, fontWeight: FONTS.semiBold },
  priceSection: { marginBottom: SPACING.sm },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' },
  effectivePrice: { fontSize: FONTS['3xl'], fontWeight: FONTS.black, color: COLORS.primary },
  originalPrice: { fontSize: FONTS.base, color: COLORS.textMuted, textDecorationLine: 'line-through' },
  discountPill: { backgroundColor: COLORS.danger, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 2 },
  discountPillText: { color: COLORS.textWhite, fontSize: FONTS.xs, fontWeight: FONTS.bold },
  freeShip: { fontSize: FONTS.sm, color: COLORS.success, fontWeight: FONTS.semiBold, marginTop: SPACING.xs },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginTop: SPACING.sm },
  ratingStarSmall: { fontSize: FONTS.sm },
  ratingValue: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.textSecondary },
  ratingCountSmall: { fontSize: FONTS.sm, color: COLORS.textMuted },
  salesCount: { fontSize: FONTS.sm, color: COLORS.textMuted },
  guestBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryFade, marginHorizontal: SPACING.sm, marginBottom: SPACING.sm, borderRadius: RADIUS.xl, padding: SPACING.base, borderWidth: 1, borderColor: COLORS.primary + '30' },
  guestBannerIcon: { fontSize: 28, marginRight: SPACING.sm },
  guestBannerText: { flex: 1 },
  guestBannerTitle: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.primary },
  guestBannerSub: { fontSize: FONTS.xs, color: COLORS.textSecondary, marginTop: 2 },
  guestBannerArrow: { fontSize: FONTS.xl, color: COLORS.primary },
  card: { backgroundColor: COLORS.surface, padding: SPACING.base, marginBottom: SPACING.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.base },
  sectionTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  qtyLabel: { fontSize: FONTS.base, fontWeight: FONTS.semiBold, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.base },
  qtyBtn: { width: 36, height: 36, borderRadius: RADIUS.full, backgroundColor: COLORS.primaryFade, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.primary },
  qtyBtnDisabled: { backgroundColor: COLORS.skeleton, borderColor: COLORS.border },
  qtyBtnText: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.primary, lineHeight: 22 },
  qtyValue: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textPrimary, minWidth: 32, textAlign: 'center' },
  stockText: { fontSize: FONTS.sm, color: COLORS.textMuted, flex: 1 },
  description: { fontSize: FONTS.base, color: COLORS.textSecondary, lineHeight: 24 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  detailLabel: { fontSize: FONTS.sm, color: COLORS.textMuted },
  detailValue: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary },
  writeReview: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.semiBold },
  ratingSummary: { flexDirection: 'row', alignItems: 'center', gap: SPACING.base, backgroundColor: COLORS.primaryFade, borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.base },
  ratingBig: { fontSize: FONTS['4xl'], fontWeight: FONTS.black, color: COLORS.primary },
  ratingStars: { fontSize: FONTS.base },
  ratingCount: { fontSize: FONTS.sm, color: COLORS.textMuted },
  reviewItem: { borderBottomWidth: 1, borderBottomColor: COLORS.divider, paddingVertical: SPACING.base },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  reviewAvatar: { width: 36, height: 36, borderRadius: RADIUS.full, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  reviewAvatarText: { color: COLORS.textWhite, fontSize: FONTS.sm, fontWeight: FONTS.bold },
  reviewMeta: { flex: 1 },
  reviewUser: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  reviewDate: { fontSize: FONTS.xs, color: COLORS.textMuted },
  reviewRating: { fontSize: FONTS.xs },
  reviewComment: { fontSize: FONTS.sm, color: COLORS.textSecondary, lineHeight: 20, marginBottom: SPACING.xs },
  verifiedPurchase: { fontSize: FONTS.xs, color: COLORS.success, fontWeight: FONTS.semiBold },
  noReviews: { fontSize: FONTS.sm, color: COLORS.textMuted, textAlign: 'center', paddingVertical: SPACING.xl },
  bottomBar: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm, paddingBottom: Platform.OS === 'ios' ? SPACING.xl : SPACING.base, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.divider, ...SHADOWS.md },
  chatBtn: { width: 48, height: 48, borderRadius: RADIUS.full, backgroundColor: COLORS.primaryFade, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.primary },
  chatBtnText: { fontSize: 22 },
  cartBtnWrap: { flex: 1 },
  addCartBtn: { flex: 1 },
  buyNowBtn: { flex: 1 },
  authOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: SPACING.base },
  authModal: { backgroundColor: COLORS.surface, borderRadius: RADIUS['2xl'], padding: SPACING.xl, width: '100%', maxWidth: 380, alignItems: 'center' },
  authIconWrap: { width: 72, height: 72, borderRadius: RADIUS.full, backgroundColor: COLORS.primaryFade, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.base },
  authIcon: { fontSize: 36 },
  authTitle: { fontSize: FONTS['2xl'], fontWeight: FONTS.black, color: COLORS.textPrimary, textAlign: 'center', marginBottom: SPACING.sm },
  authMessage: { fontSize: FONTS.sm, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.base },
  authBenefits: { width: '100%', backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.base, gap: SPACING.xs },
  authBenefit: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  authLoginBtn: { width: '100%', backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, paddingVertical: SPACING.base, alignItems: 'center', marginBottom: SPACING.sm },
  authLoginText: { color: COLORS.textWhite, fontSize: FONTS.base, fontWeight: FONTS.bold },
  authRegisterBtn: { width: '100%', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, paddingVertical: SPACING.base, alignItems: 'center', marginBottom: SPACING.sm, borderWidth: 2, borderColor: COLORS.primary },
  authRegisterText: { color: COLORS.primary, fontSize: FONTS.base, fontWeight: FONTS.bold },
  authCancelBtn: { paddingVertical: SPACING.sm },
  authCancelText: { color: COLORS.textMuted, fontSize: FONTS.sm },
  reviewModalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: COLORS.overlay, justifyContent: 'flex-end', zIndex: 999 },
  reviewModal: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.xl, paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.xl },
  reviewModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xl },
  reviewModalTitle: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  reviewModalClose: { fontSize: FONTS.xl, color: COLORS.textMuted },
  reviewModalLabel: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  starRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xl },
  starIcon: { fontSize: 32, opacity: 0.3 },
  starIconActive: { opacity: 1 },
});