/**
 * VUMA Store — Product Detail Screen
 * Full product page with images, reviews, add to cart
 */

import { t } from '../../i18n';
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Platform,
  FlatList,
  Alert,
  Animated,
  Share,
} from 'react-native';
import { Image } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchProductDetail,
  submitReview,
  selectSelectedProduct,
  selectProductsLoading,
  selectProductsErrors,
  clearSelectedProduct,
} from '../../store/productSlice';
import {
  addToCartAndSave,
  toggleWishlistAndSave,
  selectIsInCart,
  selectIsInWishlist,
  selectCartItemByProductId,
} from '../../store/cartSlice';
import { selectIsAuthenticated } from '../../store/authSlice';
import {
  COLORS,
  FONTS,
  SPACING,
  RADIUS,
  SCREENS,
  SHADOWS,
} from '../../utils/constants';
import {
  formatPrice,
  formatDate,
  getDiscount,
  isFlashSale,
  getEffectivePrice,
  formatCountdown,
  secondsUntil,
  getInitials,
} from '../../utils/helpers';
import Button from '../../components/common/Button';
import Loading, {
  OverlayLoading,
} from '../../components/common/Loading';
import {
  FullScreenError,
} from '../../components/common/ErrorMessage';

const { width, height } = Dimensions.get('window');

export default function ProductDetailScreen({
  navigation,
  route,
}) {
  const dispatch = useDispatch();
  const { productId, product: routeProduct } =
    route?.params || {};

  // Redux
  const product = useSelector(selectSelectedProduct);
  const loading = useSelector(selectProductsLoading);
  const errors = useSelector(selectProductsErrors);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isInCart = useSelector(
    selectIsInCart(product?.id)
  );
  const isWishlisted = useSelector(
    selectIsInWishlist(product?.id)
  );
  const cartItem = useSelector(
    selectCartItemByProductId(product?.id)
  );

  // Local state
  const [activeImageIndex, setActiveImageIndex] =
    useState(0);
  const [quantity, setQuantity] = useState(1);
  const [showReviewModal, setShowReviewModal] =
    useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [flashCountdown, setFlashCountdown] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);

  // Animation
  const cartBounce = useRef(new Animated.Value(1)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  // ── Init ────────────────────────────────────────────
  useEffect(() => {
    if (productId) {
      dispatch(fetchProductDetail(productId));
    }
    return () => dispatch(clearSelectedProduct());
  }, [productId]);

  // Flash countdown
  useEffect(() => {
    if (!product?.is_flash_sale || !product?.flash_sale_end)
      return;
    setFlashCountdown(secondsUntil(product.flash_sale_end));
    const timer = setInterval(() => {
      setFlashCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [product?.flash_sale_end]);

  // ── Data ─────────────────────────────────────────────
  const displayProduct = product || routeProduct;
  if (!displayProduct && loading.detail) {
    return <Loading fullScreen message="Loading product..." />;
  }
  if (!displayProduct && errors.detail) {
    return (
      <FullScreenError
        error={errors.detail}
        onRetry={() => dispatch(fetchProductDetail(productId))}
      />
    );
  }
  if (!displayProduct) return null;

  const effectivePrice = getEffectivePrice(displayProduct);
  const discount = getDiscount(
    displayProduct.price,
    effectivePrice
  );
  const onSale = isFlashSale(displayProduct);
  const outOfStock = displayProduct.stock <= 0;
  const images = displayProduct.images || [];
  const reviews = displayProduct.reviews || [];

  // ── Handlers ─────────────────────────────────────────
  const handleAddToCart = () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Login Required',
        'Please login to add items to cart.',
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('auth.login'),
            onPress: () => navigation.navigate(SCREENS.LOGIN),
          },
        ]
      );
      return;
    }
    if (outOfStock) return;
    dispatch(addToCartAndSave(displayProduct, quantity));
    setAddedToCart(true);
    Animated.sequence([
      Animated.spring(cartBounce, {
        toValue: 1.2,
        useNativeDriver: true,
      }),
      Animated.spring(cartBounce, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleBuyNow = () => {
    if (!isAuthenticated) {
      navigation.navigate(SCREENS.LOGIN);
      return;
    }
    dispatch(addToCartAndSave(displayProduct, quantity));
    navigation.navigate(SCREENS.CHECKOUT);
  };

  const handleWishlist = () => {
    if (!isAuthenticated) {
      navigation.navigate(SCREENS.LOGIN);
      return;
    }
    dispatch(toggleWishlistAndSave(displayProduct.id));
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${displayProduct.name} on VUMA Store! ${formatPrice(effectivePrice)}`,
        title: displayProduct.name,
      });
    } catch {}
  };

  const handleSubmitReview = async () => {
    if (!isAuthenticated) {
      navigation.navigate(SCREENS.LOGIN);
      return;
    }
    const result = await dispatch(
      submitReview({
        productId: displayProduct.id,
        rating: reviewRating,
        comment: reviewComment,
      })
    );
    if (submitReview.fulfilled.match(result)) {
      setShowReviewModal(false);
      setReviewComment('');
      setReviewRating(5);
      Alert.alert('Success', 'Review submitted!');
    }
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // ── Image Gallery ─────────────────────────────────────
  const ImageGallery = () => (
    <View style={styles.galleryWrap}>
      <FlatList
        data={
          images.length > 0
            ? images
            : [{ image_url: null }]
        }
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(
            e.nativeEvent.contentOffset.x / width
          );
          setActiveImageIndex(index);
        }}
        renderItem={({ item }) =>
          item.image_url ? (
            <Image
              source={{ uri: item.image_url }}
              style={styles.galleryImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.galleryPlaceholder}>
              <Text style={styles.placeholderEmoji}>
                📦
              </Text>
            </View>
          )
        }
        keyExtractor={(_, i) => i.toString()}
      />

      {/* Image dots */}
      {images.length > 1 && (
        <View style={styles.imageDots}>
          {images.map((_, i) => (
            <View
              key={i}
              style={[
                styles.imageDot,
                i === activeImageIndex &&
                  styles.imageDotActive,
              ]}
            />
          ))}
        </View>
      )}

      {/* Badges */}
      {onSale && (
        <View style={styles.flashOverlay}>
          <Text style={styles.flashText}>⚡ FLASH SALE</Text>
          {flashCountdown > 0 && (
            <Text style={styles.flashCountdown}>
              {formatCountdown(flashCountdown)}
            </Text>
          )}
        </View>
      )}
      {discount > 0 && !onSale && (
        <View style={styles.discountOverlay}>
          <Text style={styles.discountOverlayText}>
            -{discount}%
          </Text>
        </View>
      )}
    </View>
  );

  // ── Price Section ─────────────────────────────────────
  const PriceSection = () => (
    <View style={styles.priceSection}>
      <View style={styles.priceRow}>
        <Text style={styles.effectivePrice}>
          {formatPrice(effectivePrice)}
        </Text>
        {discount > 0 && (
          <>
            <Text style={styles.originalPrice}>
              {formatPrice(displayProduct.price)}
            </Text>
            <View style={styles.discountPill}>
              <Text style={styles.discountPillText}>
                -{discount}%
              </Text>
            </View>
          </>
        )}
      </View>
      <Text style={styles.freeShip}>
        🚚 Free Shipping
      </Text>
    </View>
  );

  // ── Quantity Selector ─────────────────────────────────
  const QuantitySelector = () => (
    <View style={styles.qtySection}>
      <Text style={styles.qtyLabel}>Quantity</Text>
      <View style={styles.qtyRow}>
        <TouchableOpacity
          style={[
            styles.qtyBtn,
            quantity <= 1 && styles.qtyBtnDisabled,
          ]}
          onPress={() =>
            setQuantity((q) => Math.max(1, q - 1))
          }
          disabled={quantity <= 1}
        >
          <Text style={styles.qtyBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.qtyValue}>{quantity}</Text>
        <TouchableOpacity
          style={[
            styles.qtyBtn,
            quantity >= displayProduct.stock &&
              styles.qtyBtnDisabled,
          ]}
          onPress={() =>
            setQuantity((q) =>
              Math.min(q + 1, displayProduct.stock)
            )
          }
          disabled={quantity >= displayProduct.stock}
        >
          <Text style={styles.qtyBtnText}>+</Text>
        </TouchableOpacity>
        <Text style={styles.stockText}>
          {displayProduct.stock > 0
            ? `${displayProduct.stock} available`
            : '❌ Out of stock'}
        </Text>
      </View>
    </View>
  );

  // ── Reviews Section ───────────────────────────────────
  const ReviewsSection = () => (
    <View style={styles.reviewsSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          ⭐ Reviews ({reviews.length})
        </Text>
        <TouchableOpacity
          onPress={() => setShowReviewModal(true)}
        >
          <Text style={styles.writeReview}>
            Write Review
          </Text>
        </TouchableOpacity>
      </View>

      {/* Rating summary */}
      {displayProduct.rating_avg > 0 && (
        <View style={styles.ratingSummary}>
          <Text style={styles.ratingBig}>
            {Number(displayProduct.rating_avg).toFixed(1)}
          </Text>
          <View>
            <Text style={styles.ratingStars}>
              {'⭐'.repeat(
                Math.round(displayProduct.rating_avg)
              )}
            </Text>
            <Text style={styles.ratingCount}>
              {displayProduct.rating_count} reviews
            </Text>
          </View>
        </View>
      )}

      {/* Review list */}
      {reviews.slice(0, 5).map((review, i) => (
        <View key={i} style={styles.reviewItem}>
          <View style={styles.reviewHeader}>
            <View style={styles.reviewAvatar}>
              <Text style={styles.reviewAvatarText}>
                {getInitials(review.user_name || 'U')}
              </Text>
            </View>
            <View style={styles.reviewMeta}>
              <Text style={styles.reviewUser}>
                {review.user_name || 'Customer'}
              </Text>
              <Text style={styles.reviewDate}>
                {formatDate(review.created_at)}
              </Text>
            </View>
            <Text style={styles.reviewRating}>
              {'⭐'.repeat(review.rating)}
            </Text>
          </View>
          {review.comment && (
            <Text style={styles.reviewComment}>
              {review.comment}
            </Text>
          )}
          {review.is_verified_purchase && (
            <Text style={styles.verifiedPurchase}>
              ✅ Verified Purchase
            </Text>
          )}
        </View>
      ))}

      {reviews.length === 0 && (
        <Text style={styles.noReviews}>
          No reviews yet. Be the first!
        </Text>
      )}
    </View>
  );

  // ── Render ────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Animated back header */}
      <Animated.View
        style={[styles.animHeader, { opacity: headerOpacity }]}
      >
        <Text style={styles.animHeaderTitle} numberOfLines={1}>
          {displayProduct.name}
        </Text>
      </Animated.View>

      {/* Top Actions */}
      <View style={styles.topActions}>
        <TouchableOpacity
          style={styles.topActionBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.topActionIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.topActionRight}>
          <TouchableOpacity
            style={styles.topActionBtn}
            onPress={handleWishlist}
          >
            <Text style={styles.topActionIcon}>
              {isWishlisted ? '❤️' : '🤍'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.topActionBtn}
            onPress={handleShare}
          >
            <Text style={styles.topActionIcon}>📤</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.topActionBtn}
            onPress={() =>
              navigation.navigate(SCREENS.CART)
            }
          >
            <Text style={styles.topActionIcon}>🛒</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable content */}
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Image Gallery */}
        <ImageGallery />

        {/* Product Info */}
        <View style={styles.infoCard}>
          {/* Vendor */}
          {displayProduct.vendor_name && (
            <TouchableOpacity style={styles.vendorRow}>
              <Text style={styles.vendorIcon}>🏪</Text>
              <Text style={styles.vendorName}>
                {displayProduct.vendor_name}
              </Text>
              <Text style={styles.vendorArrow}>›</Text>
            </TouchableOpacity>
          )}

          {/* Name */}
          <Text style={styles.productName}>
            {displayProduct.name}
          </Text>

          {/* Category */}
          {displayProduct.category_name && (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>
                {displayProduct.category_name}
              </Text>
            </View>
          )}

          {/* Price */}
          <PriceSection />

          {/* Rating */}
          {displayProduct.rating_avg > 0 && (
            <View style={styles.ratingRow}>
              <Text style={styles.ratingStarSmall}>⭐</Text>
              <Text style={styles.ratingValue}>
                {Number(displayProduct.rating_avg).toFixed(1)}
              </Text>
              <Text style={styles.ratingCountSmall}>
                ({displayProduct.rating_count} reviews)
              </Text>
              <Text style={styles.salesCount}>
                · {displayProduct.sales_count || 0} sold
              </Text>
            </View>
          )}
        </View>

        {/* Quantity */}
        <View style={styles.card}>
          <QuantitySelector />
        </View>

        {/* Description */}
        {displayProduct.description && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              📋 Description
            </Text>
            <Text style={styles.description}>
              {displayProduct.description}
            </Text>
          </View>
        )}

        {/* Specs */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📦 Details</Text>
          {[
            ['SKU', displayProduct.sku],
            ['Stock', `${displayProduct.stock} units`],
            ['Weight', displayProduct.weight ? `${displayProduct.weight} kg` : null],
          ]
            .filter(([, v]) => v)
            .map(([label, value]) => (
              <View key={label} style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  {label}
                </Text>
                <Text style={styles.detailValue}>
                  {value}
                </Text>
              </View>
            ))}
        </View>

        {/* Reviews */}
        <View style={styles.card}>
          <ReviewsSection />
        </View>

        {/* Bottom padding */}
        <View style={{ height: 120 }} />
      </Animated.ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.chatBtn}
          onPress={() =>
            navigation.navigate(SCREENS.CHAT, {
              productId: displayProduct.id,
              vendorId: displayProduct.vendor_id,
            })
          }
        >
          <Text style={styles.chatBtnText}>💬</Text>
        </TouchableOpacity>

        <Animated.View
          style={[
            styles.cartBtnWrap,
            { transform: [{ scale: cartBounce }] },
          ]}
        >
          <Button
            title={
              outOfStock
                ? t('products.outOfStock')
                : addedToCart
                ? '✓ Added!'
                : t('products.addToCart')
            }
            variant={
              outOfStock
                ? 'outlineSecondary'
                : addedToCart
                ? 'success'
                : 'outline'
            }
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

      {/* Review Modal */}
      {showReviewModal && (
        <View style={styles.reviewModalOverlay}>
          <View style={styles.reviewModal}>
            <View style={styles.reviewModalHeader}>
              <Text style={styles.reviewModalTitle}>
                ✍️ Write a Review
              </Text>
              <TouchableOpacity
                onPress={() => setShowReviewModal(false)}
              >
                <Text style={styles.reviewModalClose}>
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            {/* Star rating */}
            <Text style={styles.reviewModalLabel}>
              Rating
            </Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setReviewRating(star)}
                >
                  <Text
                    style={[
                      styles.starIcon,
                      star <= reviewRating &&
                        styles.starIconActive,
                    ]}
                  >
                    ⭐
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Comment */}
            <Text style={styles.reviewModalLabel}>
              Comment (optional)
            </Text>
            <ScrollView
              style={styles.reviewInput}
              contentContainerStyle={{ flexGrow: 1 }}
            >
              <Text
                style={styles.reviewInputText}
                onChangeText={setReviewComment}
              >
                {reviewComment}
              </Text>
            </ScrollView>

            <Button
              title="Submit Review"
              onPress={handleSubmitReview}
              loading={loading.review}
              fullWidth
              style={{ marginTop: SPACING.base }}
            />
          </View>
        </View>
      )}

      <OverlayLoading visible={loading.detail && !product} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },

  // ── Animated Header ──────────────────────────────────
  animHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: COLORS.surface,
    paddingTop:
      Platform.OS === 'ios' ? 50 : SPACING.base,
    paddingBottom: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    alignItems: 'center',
  },
  animHeaderTitle: {
    fontSize: FONTS.base,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },

  // ── Top Actions ──────────────────────────────────────
  topActions: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : SPACING.base,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    zIndex: 100,
  },
  topActionRight: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  topActionBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  topActionIcon: {
    fontSize: 18,
  },

  // ── Gallery ──────────────────────────────────────────
  galleryWrap: {
    width,
    height: width * 0.85,
    backgroundColor: COLORS.surfaceAlt,
    position: 'relative',
  },
  galleryImage: {
    width,
    height: width * 0.85,
  },
  galleryPlaceholder: {
    width,
    height: width * 0.85,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceAlt,
  },
  placeholderEmoji: {
    fontSize: 80,
  },
  imageDots: {
    position: 'absolute',
    bottom: SPACING.base,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  imageDot: {
    width: 6,
    height: 6,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  imageDotActive: {
    backgroundColor: COLORS.primary,
    width: 16,
  },
  flashOverlay: {
    position: 'absolute',
    bottom: SPACING.xl,
    left: SPACING.base,
    backgroundColor: COLORS.flashSale,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  flashText: {
    color: COLORS.textWhite,
    fontSize: FONTS.xs,
    fontWeight: FONTS.bold,
  },
  flashCountdown: {
    color: COLORS.textWhite,
    fontSize: FONTS.xs,
    fontWeight: FONTS.bold,
    fontVariant: ['tabular-nums'],
  },
  discountOverlay: {
    position: 'absolute',
    top: SPACING.xl,
    right: SPACING.base,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  discountOverlayText: {
    color: COLORS.textWhite,
    fontSize: FONTS.sm,
    fontWeight: FONTS.bold,
  },

  // ── Info Card ────────────────────────────────────────
  infoCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.base,
    marginBottom: SPACING.sm,
  },
  vendorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  vendorIcon: {
    fontSize: FONTS.base,
  },
  vendorName: {
    flex: 1,
    fontSize: FONTS.sm,
    color: COLORS.primary,
    fontWeight: FONTS.semiBold,
  },
  vendorArrow: {
    fontSize: FONTS.xl,
    color: COLORS.textMuted,
  },
  productName: {
    fontSize: FONTS['2xl'],
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    lineHeight: 30,
    marginBottom: SPACING.sm,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primaryFade,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    marginBottom: SPACING.sm,
  },
  categoryText: {
    fontSize: FONTS.xs,
    color: COLORS.primary,
    fontWeight: FONTS.semiBold,
  },
  priceSection: {
    marginBottom: SPACING.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  effectivePrice: {
    fontSize: FONTS['3xl'],
    fontWeight: FONTS.black,
    color: COLORS.primary,
  },
  originalPrice: {
    fontSize: FONTS.base,
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
  discountPill: {
    backgroundColor: COLORS.danger,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  discountPillText: {
    color: COLORS.textWhite,
    fontSize: FONTS.xs,
    fontWeight: FONTS.bold,
  },
  freeShip: {
    fontSize: FONTS.sm,
    color: COLORS.freeShip,
    fontWeight: FONTS.semiBold,
    marginTop: SPACING.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  ratingStarSmall: {
    fontSize: FONTS.sm,
  },
  ratingValue: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.bold,
    color: COLORS.textSecondary,
  },
  ratingCountSmall: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
  },
  salesCount: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
  },

  // ── Cards ────────────────────────────────────────────
  card: {
    backgroundColor: COLORS.surface,
    padding: SPACING.base,
    marginBottom: SPACING.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.base,
  },
  sectionTitle: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },

  // ── Quantity ─────────────────────────────────────────
  qtySection: {},
  qtyLabel: {
    fontSize: FONTS.base,
    fontWeight: FONTS.semiBold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.base,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryFade,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  qtyBtnDisabled: {
    backgroundColor: COLORS.skeleton,
    borderColor: COLORS.border,
  },
  qtyBtnText: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.primary,
    lineHeight: 22,
  },
  qtyValue: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    minWidth: 32,
    textAlign: 'center',
  },
  stockText: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
    flex: 1,
  },

  // ── Description ──────────────────────────────────────
  description: {
    fontSize: FONTS.base,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },

  // ── Details ──────────────────────────────────────────
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  detailLabel: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
  },
  detailValue: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.semiBold,
    color: COLORS.textSecondary,
  },

  // ── Reviews ──────────────────────────────────────────
  reviewsSection: {},
  writeReview: {
    fontSize: FONTS.sm,
    color: COLORS.primary,
    fontWeight: FONTS.semiBold,
  },
  ratingSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.base,
    backgroundColor: COLORS.primaryFade,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginBottom: SPACING.base,
  },
  ratingBig: {
    fontSize: FONTS['4xl'],
    fontWeight: FONTS.black,
    color: COLORS.primary,
  },
  ratingStars: {
    fontSize: FONTS.base,
  },
  ratingCount: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
  },
  reviewItem: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    paddingVertical: SPACING.base,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarText: {
    color: COLORS.textWhite,
    fontSize: FONTS.sm,
    fontWeight: FONTS.bold,
  },
  reviewMeta: {
    flex: 1,
  },
  reviewUser: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },
  reviewDate: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
  },
  reviewRating: {
    fontSize: FONTS.xs,
  },
  reviewComment: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.xs,
  },
  verifiedPurchase: {
    fontSize: FONTS.xs,
    color: COLORS.success,
    fontWeight: FONTS.semiBold,
  },
  noReviews: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: SPACING.xl,
  },

  // ── Bottom Bar ───────────────────────────────────────
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    paddingBottom:
      Platform.OS === 'ios' ? SPACING.xl : SPACING.base,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    ...SHADOWS.md,
  },
  chatBtn: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryFade,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  chatBtnText: {
    fontSize: 22,
  },
  cartBtnWrap: {
    flex: 1,
  },
  addCartBtn: {
    flex: 1,
  },
  buyNowBtn: {
    flex: 1,
  },

  // ── Review Modal ─────────────────────────────────────
  reviewModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
    zIndex: 999,
  },
  reviewModal: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl,
    paddingBottom:
      Platform.OS === 'ios' ? 40 : SPACING.xl,
  },
  reviewModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  reviewModalTitle: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },
  reviewModalClose: {
    fontSize: FONTS.xl,
    color: COLORS.textMuted,
  },
  reviewModalLabel: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.semiBold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  starRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  starIcon: {
    fontSize: 32,
    opacity: 0.3,
  },
  starIconActive: {
    opacity: 1,
  },
  reviewInput: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    minHeight: 100,
    maxHeight: 150,
  },
  reviewInputText: {
    fontSize: FONTS.base,
    color: COLORS.textPrimary,
  },
});