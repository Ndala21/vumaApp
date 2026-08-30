/**
 * VUMA Store — Product Detail Screen
 * Fixed: Size selector for Fashion/Clothing/Shoes + auth modal
 * Updated: SellerBadge + TrustSignals + SellerStore navigation
 * Updated: Related Products section at the bottom
 * Fixed: Buy Now no longer adds the product to the shared cart before
 * checking out — it navigates straight to Checkout with just that one
 * item, so anything already saved in the cart is left untouched.
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
import ProductCard from '../../components/ProductCard';
import { productsAPI } from '../../api/products';

// ── NEW: Seller Badge & Trust Signals ────────────────
import { SellerBadge, TrustSignals } from '../../components/vendor/SellerBadge';

const { width } = Dimensions.get('window');

// ── Auth Modal ────────────────────────────────────────
const AuthModal = memo(({ visible, onClose, onLogin, onRegister }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.authOverlay}>
      <View style={styles.authModal}>
        <View style={styles.authIconWrap}>
          <Text style={styles.authIcon}>🔐</Text>
        </View>
        <Text style={styles.authTitle}>Login required</Text>
        <Text style={styles.authMessage}>
          Log in or create an account to continue shopping on VUMA.
        </Text>
        <View style={styles.authBenefits}>
          {['Add items to cart', 'Fast checkout', 'Track your orders', 'Save your wishlist'].map((b, i) => (
            <View key={i} style={styles.authBenefitRow}>
              <Text style={styles.authBenefitCheck}>✓</Text>
              <Text style={styles.authBenefit}>{b}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity style={styles.authLoginBtn} onPress={onLogin} activeOpacity={0.88}>
          <Text style={styles.authLoginText}>Log in to my account</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.authRegisterBtn} onPress={onRegister} activeOpacity={0.85}>
          <Text style={styles.authRegisterText}>Create new account</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.authCancelBtn} onPress={onClose}>
          <Text style={styles.authCancelText}>Continue browsing</Text>
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
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [variantError, setVariantError] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);

  const cartBounce = useRef(new Animated.Value(1)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (productId) dispatch(fetchProductDetail(productId));
    return () => dispatch(clearSelectedProduct());
  }, [productId]);

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    productsAPI.getRelatedProducts(productId)
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : (data?.results || []);
        setRelatedProducts(list);
      })
      .catch(() => {
        if (!cancelled) setRelatedProducts([]);
      });
    return () => { cancelled = true; };
  }, [productId]);

  useEffect(() => {
    if (!product?.is_flash_sale || !product?.flash_sale_end) return;
    setFlashCountdown(secondsUntil(product.flash_sale_end));
    const timer = setInterval(() => setFlashCountdown((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [product?.flash_sale_end]);

  useEffect(() => {
    setSelectedSize(null);
    setSizeError(false);
    setSelectedVariant(null);
    setVariantError(false);
  }, [product?.id]);

  const displayProduct = product || routeProduct;

  const effectivePrice = displayProduct ? getEffectivePrice(displayProduct) : 0;
  const variantPriceAdjustment = selectedVariant ? Number(selectedVariant.price_adjustment || 0) : 0;
  const finalPrice = effectivePrice + variantPriceAdjustment;

  // Buy Now purchases this one product directly — it deliberately never
  // touches the shared cart, so whatever else is already saved there
  // (from earlier browsing) is left completely alone.
  const goToDirectCheckout = useCallback(() => {
    const directItem = {
      id: `direct_${displayProduct.id}_${Date.now()}`,
      product: displayProduct,
      quantity,
      selectedSize,
      selectedVariant,
    };
    const total = finalPrice * quantity;
    navigation.navigate(SCREENS.CHECKOUT, {
      items: [directItem],
      total,
      source: 'buyNow',
    });
  }, [displayProduct, quantity, selectedSize, selectedVariant, finalPrice, navigation]);

  useEffect(() => {
    if (isAuthenticated && pendingAction && displayProduct) {
      if (pendingAction === 'cart') {
        dispatch(addToCartAndSave({ ...displayProduct, selectedSize, selectedVariant }, quantity));
        setAddedToCart(true);
        setTimeout(() => setAddedToCart(false), 2000);
      } else if (pendingAction === 'buy') {
        goToDirectCheckout();
      }
      setPendingAction(null);
    }
  }, [isAuthenticated]);

  if (!displayProduct && loading.detail) return <Loading fullScreen message="Loading product..." />;
  if (!displayProduct && errors.detail) return <FullScreenError error={errors.detail} onRetry={() => dispatch(fetchProductDetail(productId))} />;
  if (!displayProduct) return null;

  const discount = getDiscount(displayProduct.price, effectivePrice);
  const onSale = isFlashSale(displayProduct);
  const outOfStock = displayProduct.stock <= 0;
  const images = displayProduct.images || [];
  const reviews = displayProduct.reviews || [];
  const productNeedsSize = displayProduct.requires_size && displayProduct.available_sizes?.length > 0;
  const productVariants = displayProduct.variants || [];
  const needsVariant = productVariants.length > 0;

  const validateSize = () => {
    if (productNeedsSize && !selectedSize) {
      setSizeError(true);
      Alert.alert('Select Size', 'Please select a size before continuing.');
      return false;
    }
    return true;
  };

  const validateVariant = () => {
    if (needsVariant && !selectedVariant) {
      setVariantError(true);
      Alert.alert('Select an option', 'Please select a product option before continuing.');
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
    if (!validateVariant()) return;
    dispatch(addToCartAndSave({ ...displayProduct, selectedSize, selectedVariant }, quantity));
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
    if (!validateVariant()) return;
    goToDirectCheckout();
  };

  const handleWishlist = () => {
    if (!isAuthenticated) { setPendingAction(null); setShowAuthModal(true); return; }
    dispatch(toggleWishlistAndSave(displayProduct));
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: `Check out ${displayProduct.name} on VUMA Store! ${formatPrice(effectivePrice)}`, title: displayProduct.name });
    } catch {}
  };

  // Navigate to full seller store page
  const handleSellerStore = () => {
    const vendorId = displayProduct.vendor_info?.id || displayProduct.vendor_id;
    if (!vendorId) return;
    navigation.navigate('SellerStore', { vendorId });
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

  const handleRelatedProductPress = (relatedProduct) => {
    navigation.push(SCREENS.PRODUCT_DETAIL, { productId: relatedProduct.id, product: relatedProduct });
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
          <Text style={styles.topActionIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.topActionRight}>
          <TouchableOpacity style={styles.topActionBtn} onPress={handleWishlist}>
            <Text style={styles.topActionIcon}>{isWishlisted ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.topActionBtn} onPress={handleShare}>
            <Text style={styles.topActionIcon}>↗</Text>
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
            <View style={styles.flashRibbonWrap}>
              <View style={styles.flashRibbonBody}>
                <Text style={styles.flashText}>⚡ FLASH SALE</Text>
                {flashCountdown > 0 && <Text style={styles.flashCountdown}>{formatCountdown(flashCountdown)}</Text>}
              </View>
            </View>
          )}
          {discount > 0 && !onSale && (
            <View style={styles.discountRibbonWrap}>
              <View style={styles.discountRibbonBody}>
                <Text style={styles.discountOverlayText}>-{discount}%</Text>
              </View>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.infoCard}>
          {displayProduct.category_name && (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>{displayProduct.category_name}</Text>
            </View>
          )}
          <Text style={styles.productName}>{displayProduct.name}</Text>
          <View style={styles.priceSection}>
            <View style={styles.priceRow}>
              <Text style={styles.effectivePrice}>{formatPrice(finalPrice)}</Text>
              {discount > 0 && (
                <>
                  <Text style={styles.originalPrice}>{formatPrice(displayProduct.price)}</Text>
                  <View style={styles.discountPill}>
                    <Text style={styles.discountPillText}>-{discount}%</Text>
                  </View>
                </>
              )}
            </View>
            <View style={styles.freeShipPill}>
              <Text style={styles.freeShip}>🚚 Free delivery</Text>
            </View>
          </View>
          {displayProduct.rating_avg > 0 && (
            <View style={styles.ratingRow}>
              <Text style={styles.ratingStarSmall}>★</Text>
              <Text style={styles.ratingValue}>{Number(displayProduct.rating_avg).toFixed(1)}</Text>
              <Text style={styles.ratingCountSmall}>({displayProduct.rating_count} reviews)</Text>
              <View style={styles.ratingDivider} />
              <Text style={styles.salesCount}>{displayProduct.sales_count || 0} sold</Text>
            </View>
          )}
        </View>

        {/* Seller badge + trust signals */}
        <View style={styles.card}>
          {displayProduct.vendor_info ? (
            <>
              <SellerBadge vendor={displayProduct.vendor_info} onPress={handleSellerStore} />
              <TrustSignals vendor={displayProduct.vendor_info} />
            </>
          ) : (displayProduct.vendor_name || displayProduct.vendor_id) ? (
            <TouchableOpacity style={styles.vendorRow} onPress={handleSellerStore} activeOpacity={0.8}>
              <View style={styles.vendorIconChip}>
                <Text style={styles.vendorIcon}>🏪</Text>
              </View>
              <Text style={styles.vendorName}>{displayProduct.vendor_name || 'View Store'}</Text>
              <Text style={styles.vendorArrow}>›</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Guest Banner */}
        {!isAuthenticated && (
          <TouchableOpacity style={styles.guestBanner} onPress={() => setShowAuthModal(true)} activeOpacity={0.85}>
            <View style={styles.guestBannerIconChip}>
              <Text style={styles.guestBannerIcon}>👤</Text>
            </View>
            <View style={styles.guestBannerText}>
              <Text style={styles.guestBannerTitle}>Log in to shop on VUMA</Text>
              <Text style={styles.guestBannerSub}>Get exclusive deals and track your orders</Text>
            </View>
            <Text style={styles.guestBannerArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* Size Selector */}
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

        {/* Product Variants (size/color/material/storage/etc — from the seller's variant list) */}
        {needsVariant && (
          <View style={styles.card}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>Choose Options</Text>
            </View>
            {variantError && <Text style={styles.fieldError}>⚠️ Please select an option</Text>}
            <View style={styles.variantGrid}>
              {productVariants.map((v) => {
                const isSelected = selectedVariant?.id === v.id;
                const isOut = v.stock <= 0;
                return (
                  <TouchableOpacity
                    key={v.id}
                    disabled={isOut}
                    style={[
                      styles.variantChip,
                      isSelected && styles.variantChipActive,
                      isOut && styles.variantChipDisabled,
                    ]}
                    onPress={() => { setSelectedVariant(v); setVariantError(false); }}
                  >
                    <Text style={[styles.variantChipText, isSelected && styles.variantChipTextActive]}>
                      {v.display_name}
                    </Text>
                    {Number(v.price_adjustment) !== 0 && (
                      <Text style={[styles.variantChipPrice, isSelected && styles.variantChipTextActive]}>
                        {Number(v.price_adjustment) > 0 ? '+' : ''}{formatPrice(v.price_adjustment)}
                      </Text>
                    )}
                    {isOut && <Text style={styles.variantChipOut}>Out of stock</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Quantity */}
        <View style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionAccent} />
            <Text style={styles.qtyLabel}>Quantity</Text>
          </View>
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
            <Text style={[styles.stockText, outOfStock && styles.stockTextDanger]}>
              {displayProduct.stock > 0 ? `${displayProduct.stock} available` : 'Out of stock'}
            </Text>
          </View>
        </View>

        {/* Description */}
        {displayProduct.description && (
          <View style={styles.card}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>Description</Text>
            </View>
            <Text style={styles.description}>{displayProduct.description}</Text>
          </View>
        )}

        {/* Details */}
        <View style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionAccent} />
            <Text style={styles.sectionTitle}>Details</Text>
          </View>
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
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>Reviews ({reviews.length})</Text>
            </View>
            <TouchableOpacity onPress={() => setShowReviewModal(true)}>
              <Text style={styles.writeReview}>Write review</Text>
            </TouchableOpacity>
          </View>
          {displayProduct.rating_avg > 0 && (
            <View style={styles.ratingSummary}>
              <Text style={styles.ratingBig}>{Number(displayProduct.rating_avg).toFixed(1)}</Text>
              <View>
                <Text style={styles.ratingStars}>{'★'.repeat(Math.round(displayProduct.rating_avg))}</Text>
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
                <Text style={styles.reviewRating}>{'★'.repeat(review.rating)}</Text>
              </View>
              {review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
              {review.is_verified_purchase && (
                <View style={styles.verifiedPurchasePill}>
                  <Text style={styles.verifiedPurchase}>✓ Verified Purchase</Text>
                </View>
              )}
            </View>
          ))}
          {reviews.length === 0 && <Text style={styles.noReviews}>No reviews yet. Be the first!</Text>}
        </View>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <View style={styles.relatedSection}>
            <View style={styles.relatedTitleRow}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>You May Also Like</Text>
            </View>
            <FlatList
              data={relatedProducts}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) => item.id?.toString() || index.toString()}
              contentContainerStyle={styles.relatedList}
              renderItem={({ item }) => (
                <ProductCard
                  product={item}
                  variant="featured"
                  onPress={() => handleRelatedProductPress(item)}
                  style={styles.relatedCard}
                />
              )}
            />
          </View>
        )}

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
              <Text style={styles.reviewModalTitle}>Write a review</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <Text style={styles.reviewModalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.reviewModalLabel}>Rating</Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setReviewRating(star)}>
                  <Text style={[styles.starIcon, star <= reviewRating && styles.starIconActive]}>★</Text>
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
  animHeader: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50,
    backgroundColor: COLORS.surface, paddingTop: Platform.OS === 'ios' ? 50 : SPACING.base,
    paddingBottom: SPACING.sm, paddingHorizontal: SPACING.xl,
    borderBottomWidth: 1, borderBottomColor: COLORS.divider, alignItems: 'center',
  },
  animHeaderTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  topActions: {
    position: 'absolute', top: Platform.OS === 'ios' ? 50 : SPACING.base, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.sm, zIndex: 100,
  },
  topActionRight: { flexDirection: 'row', gap: SPACING.xs },
  topActionBtn: {
    width: 38, height: 38, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm,
  },
  topActionIcon: { fontSize: 18 },
  galleryWrap: { width, height: width * 0.9, backgroundColor: COLORS.surfaceAlt, position: 'relative' },
  galleryImage: { width, height: width * 0.9 },
  galleryPlaceholder: { width, height: width * 0.9, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceAlt },
  placeholderEmoji: { fontSize: 76, opacity: 0.35 },
  imageDots: { position: 'absolute', bottom: SPACING.base, alignSelf: 'center', flexDirection: 'row', gap: 4 },
  imageDot: { width: 6, height: 6, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.55)' },
  imageDotActive: { backgroundColor: COLORS.primary, width: 18 },

  flashRibbonWrap: { position: 'absolute', top: SPACING.xl, left: -1 },
  flashRibbonBody: {
    backgroundColor: COLORS.flashSale, paddingHorizontal: SPACING.md, paddingVertical: 6,
    borderTopRightRadius: RADIUS.sm, borderBottomRightRadius: RADIUS.sm,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  flashText: { color: COLORS.textWhite, fontSize: FONTS.xs, fontWeight: FONTS.extraBold },
  flashCountdown: { color: COLORS.textWhite, fontSize: FONTS.xs, fontWeight: FONTS.bold, opacity: 0.9 },
  discountRibbonWrap: { position: 'absolute', top: SPACING.xl, left: -1 },
  discountRibbonBody: {
    backgroundColor: COLORS.discount, paddingHorizontal: SPACING.md, paddingVertical: 6,
    borderTopRightRadius: RADIUS.sm, borderBottomRightRadius: RADIUS.sm,
  },
  discountOverlayText: { color: COLORS.textWhite, fontSize: FONTS.sm, fontWeight: FONTS.extraBold },

  infoCard: { backgroundColor: COLORS.surface, padding: SPACING.base, marginBottom: SPACING.sm },
  vendorRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.xs },
  vendorIconChip: { width: 32, height: 32, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  vendorIcon: { fontSize: 16 },
  vendorName: { flex: 1, fontSize: FONTS.sm, color: COLORS.primaryDark, fontWeight: FONTS.semiBold },
  vendorArrow: { fontSize: FONTS.xl, color: COLORS.textMuted },

  productName: { fontSize: FONTS['2xl'], fontWeight: FONTS.bold, color: COLORS.textPrimary, lineHeight: 30, marginBottom: SPACING.sm },
  categoryPill: { alignSelf: 'flex-start', backgroundColor: COLORS.surfaceSunken, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 3, marginBottom: SPACING.sm },
  categoryText: { fontSize: 10.5, color: COLORS.textSecondary, fontWeight: FONTS.semiBold, textTransform: 'uppercase', letterSpacing: 0.4 },
  priceSection: { marginBottom: SPACING.sm },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: SPACING.sm, flexWrap: 'wrap' },
  effectivePrice: { fontSize: FONTS['3xl'], fontWeight: FONTS.black, color: COLORS.textPrimary, letterSpacing: FONTS.trackTight },
  originalPrice: { fontSize: FONTS.base, color: COLORS.textLight, textDecorationLine: 'line-through' },
  discountPill: { backgroundColor: COLORS.discount, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 2 },
  discountPillText: { color: COLORS.textWhite, fontSize: FONTS.xs, fontWeight: FONTS.bold },
  freeShipPill: { alignSelf: 'flex-start', backgroundColor: COLORS.successLight, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 3, marginTop: SPACING.xs },
  freeShip: { fontSize: FONTS.xs, color: COLORS.successText, fontWeight: FONTS.semiBold },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.sm },
  ratingStarSmall: { fontSize: FONTS.sm, color: COLORS.rating },
  ratingValue: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.textSecondary },
  ratingCountSmall: { fontSize: FONTS.sm, color: COLORS.textMuted },
  ratingDivider: { width: 1, height: 12, backgroundColor: COLORS.border },
  salesCount: { fontSize: FONTS.sm, color: COLORS.textMuted },

  guestBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryFade,
    marginHorizontal: SPACING.sm, marginBottom: SPACING.sm, borderRadius: RADIUS.xl,
    padding: SPACING.base, borderWidth: 1, borderColor: 'rgba(255,106,0,0.2)',
  },
  guestBannerIconChip: { width: 40, height: 40, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
  guestBannerIcon: { fontSize: 19 },
  guestBannerText: { flex: 1 },
  guestBannerTitle: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.primaryDark },
  guestBannerSub: { fontSize: FONTS.xs, color: COLORS.textSecondary, marginTop: 2 },
  guestBannerArrow: { fontSize: FONTS.xl, color: COLORS.primary },

  card: { backgroundColor: COLORS.surface, padding: SPACING.base, marginBottom: SPACING.sm },
  relatedSection: { backgroundColor: COLORS.surface, paddingTop: SPACING.base, paddingBottom: SPACING.sm, marginBottom: SPACING.sm },
  relatedTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.sm, paddingHorizontal: SPACING.base },
  relatedList: { paddingHorizontal: SPACING.base, gap: SPACING.sm },
  relatedCard: { width: 160, height: 200 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.base },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.sm },
  sectionAccent: { width: 4, height: 15, borderRadius: 2, backgroundColor: COLORS.primary },
  sectionTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  qtyLabel: { fontSize: FONTS.base, fontWeight: FONTS.semiBold, color: COLORS.textSecondary },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.base },
  qtyBtn: { width: 36, height: 36, borderRadius: RADIUS.full, backgroundColor: COLORS.primaryFade, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.primary },
  qtyBtnDisabled: { backgroundColor: COLORS.surfaceSunken, borderColor: COLORS.border },
  qtyBtnText: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.primary, lineHeight: 22 },
  qtyValue: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textPrimary, minWidth: 32, textAlign: 'center' },
  stockText: { fontSize: FONTS.sm, color: COLORS.textMuted, flex: 1, textAlign: 'right' },
  stockTextDanger: { color: COLORS.danger, fontWeight: FONTS.semiBold },
  description: { fontSize: FONTS.base, color: COLORS.textSecondary, lineHeight: 24 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  detailLabel: { fontSize: FONTS.sm, color: COLORS.textMuted },
  detailValue: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary },
  writeReview: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.semiBold },
  ratingSummary: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.base,
    backgroundColor: COLORS.surfaceSunken, borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.base,
  },
  ratingBig: { fontSize: FONTS['4xl'], fontWeight: FONTS.black, color: COLORS.textPrimary, letterSpacing: FONTS.trackTight },
  ratingStars: { fontSize: FONTS.base, color: COLORS.rating },
  ratingCount: { fontSize: FONTS.sm, color: COLORS.textMuted },
  reviewItem: { borderBottomWidth: 1, borderBottomColor: COLORS.divider, paddingVertical: SPACING.base },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  reviewAvatar: { width: 36, height: 36, borderRadius: RADIUS.full, backgroundColor: COLORS.secondary, alignItems: 'center', justifyContent: 'center' },
  reviewAvatarText: { color: COLORS.textWhite, fontSize: FONTS.sm, fontWeight: FONTS.bold },
  reviewMeta: { flex: 1 },
  reviewUser: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  reviewDate: { fontSize: FONTS.xs, color: COLORS.textMuted },
  reviewRating: { fontSize: FONTS.xs, color: COLORS.rating },
  reviewComment: { fontSize: FONTS.sm, color: COLORS.textSecondary, lineHeight: 20, marginBottom: SPACING.xs },
  verifiedPurchasePill: { alignSelf: 'flex-start', backgroundColor: COLORS.successLight, borderRadius: RADIUS.sm, paddingHorizontal: 6, paddingVertical: 2 },
  verifiedPurchase: { fontSize: 10.5, color: COLORS.successText, fontWeight: FONTS.semiBold },
  noReviews: { fontSize: FONTS.sm, color: COLORS.textMuted, textAlign: 'center', paddingVertical: SPACING.xl },

  bottomBar: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm,
    paddingBottom: Platform.OS === 'ios' ? SPACING.xl : SPACING.base,
    backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.divider, ...SHADOWS.lg,
  },
  chatBtn: { width: 48, height: 48, borderRadius: RADIUS.full, backgroundColor: COLORS.primaryFade, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.primary },
  chatBtnText: { fontSize: 21 },
  cartBtnWrap: { flex: 1 },
  addCartBtn: { flex: 1 },
  buyNowBtn: { flex: 1 },

  authOverlay: { flex: 1, backgroundColor: 'rgba(18,22,43,0.65)', justifyContent: 'center', alignItems: 'center', padding: SPACING.base },
  authModal: { backgroundColor: COLORS.surface, borderRadius: RADIUS['2xl'], padding: SPACING.xl, width: '100%', maxWidth: 380, alignItems: 'center', ...SHADOWS.lg },
  authIconWrap: { width: 72, height: 72, borderRadius: RADIUS.full, backgroundColor: COLORS.primaryFade, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.base },
  authIcon: { fontSize: 34 },
  authTitle: { fontSize: FONTS['2xl'], fontWeight: FONTS.black, color: COLORS.textPrimary, textAlign: 'center', marginBottom: SPACING.sm },
  authMessage: { fontSize: FONTS.sm, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.base },
  authBenefits: { width: '100%', backgroundColor: COLORS.surfaceSunken, borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.base, gap: SPACING.sm },
  authBenefitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  authBenefitCheck: { fontSize: 12, color: COLORS.success, fontWeight: FONTS.black },
  authBenefit: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  authLoginBtn: { width: '100%', backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, paddingVertical: SPACING.base, alignItems: 'center', marginBottom: SPACING.sm, ...SHADOWS.primary },
  authLoginText: { color: COLORS.textWhite, fontSize: FONTS.base, fontWeight: FONTS.bold },
  authRegisterBtn: { width: '100%', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, paddingVertical: SPACING.base, alignItems: 'center', marginBottom: SPACING.sm, borderWidth: 2, borderColor: COLORS.primary },
  authRegisterText: { color: COLORS.primary, fontSize: FONTS.base, fontWeight: FONTS.bold },
  authCancelBtn: { paddingVertical: SPACING.sm },
  authCancelText: { color: COLORS.textMuted, fontSize: FONTS.sm },

  reviewModalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: COLORS.overlay, justifyContent: 'flex-end', zIndex: 999 },
  reviewModal: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.xl, paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.xl, ...SHADOWS.lg },
  reviewModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xl },
  reviewModalTitle: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  reviewModalClose: { fontSize: FONTS.xl, color: COLORS.textMuted },
  reviewModalLabel: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  starRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xl },
  starIcon: { fontSize: 32, opacity: 0.28, color: COLORS.rating },
  starIconActive: { opacity: 1 },

  fieldError: { fontSize: FONTS.xs, color: COLORS.danger, marginBottom: SPACING.sm, fontWeight: FONTS.medium },
  variantGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  variantChip: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm, backgroundColor: COLORS.surfaceAlt,
    minWidth: 80, alignItems: 'center',
  },
  variantChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  variantChipDisabled: { opacity: 0.4 },
  variantChipText: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONTS.semiBold },
  variantChipTextActive: { color: COLORS.textWhite },
  variantChipPrice: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  variantChipOut: { fontSize: 10, color: COLORS.danger, marginTop: 2, fontWeight: FONTS.semiBold },
});
