/**
 * VUMA Store — Product Detail Screen
 * Fixed: Size selector for Fashion/Clothing/Shoes + auth modal
 * Updated: SellerBadge + TrustSignals + SellerStore navigation
 * Updated: Related Products section at the bottom
 * Fixed: Buy Now no longer adds the product to the shared cart before
 * checking out — it navigates straight to Checkout with just that one
 * item, so anything already saved in the cart is left untouched.
 * Updated: added Similar Products, Frequently Bought Together, and
 * More From This Seller - real product-detail-specific recommendation
 * engines, using the shared RecommendationSection component.
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
  formatPrice, formatDate, formatEastAfricaDate, getDiscount, isFlashSale,
  getEffectivePrice, formatCountdown, secondsUntil, getInitials,
} from '../../utils/helpers';
import Button from '../../components/common/Button';
import Loading, { OverlayLoading } from '../../components/common/Loading';
import { FullScreenError } from '../../components/common/ErrorMessage';
import { CustomerSizeSelector, requiresSize } from '../../components/SizeSelector';
import ProductCard from '../../components/ProductCard';
import RecommendationSection from '../../components/RecommendationSection';
import { productsAPI } from '../../api/products';
import VariantPicker from '../../components/VariantPicker';
import { variantsDefineSize, activeVariants, unitsAvailable, galleryIndexOf } from '../../utils/variants';
import { shortDescriptionOf, hasLongerDescription } from '../../utils/productText';

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
  const [showQtyModal, setShowQtyModal] = useState(false);
  const [barShown, setBarShown] = useState(false);

  const cartBounce = useRef(new Animated.Value(1)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const galleryRef = useRef(null);

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

  // The full product from the server wins; anything it does not carry (for
  // example sizes on an older server) is kept from the card that was tapped.
  const displayProduct = product
    ? (routeProduct && routeProduct.id === product.id ? { ...routeProduct, ...product } : product)
    : routeProduct;

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
  const images = displayProduct.images || [];
  const reviews = displayProduct.reviews || [];
  // Tapping a colour that has its own photo brings that picture to the front.
  const showGalleryPicture = (imageId) => {
    const index = galleryIndexOf(images, imageId);
    if (index < 0) return;
    setActiveImageIndex(index);
    try {
      if (galleryRef.current) galleryRef.current.scrollToIndex({ index, animated: true });
    } catch (e) { /* the picture list is not ready yet: the dots still show the right picture */ }
  };
  // Options the seller has switched off are never shown to customers.
  const productVariants = activeVariants(displayProduct.variants);
  const needsVariant = productVariants.length > 0;
  // With options, stock is counted per option (the product's own stock number
  // is not what gets sold).
  const unitsLeft = unitsAvailable(displayProduct, productVariants, selectedVariant);
  const outOfStock = unitsAvailable(displayProduct, productVariants, null) <= 0;
  // When the seller's options already say which size, the separate size
  // picker is not shown (it would ask for the size twice).
  const productNeedsSize = displayProduct.requires_size
    && displayProduct.available_sizes?.length > 0
    && !variantsDefineSize(productVariants);
  const shortText = shortDescriptionOf(displayProduct);

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

  const headerOpacity = scrollY.interpolate({ inputRange: [width * 0.5, width * 0.75], outputRange: [0, 1], extrapolate: 'clamp' });
  // Room for the phone's clock/battery bar above the round buttons.
  const topInset = Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 24) + 6;
  const vendorLabel = displayProduct.vendor_info?.shop_name || displayProduct.vendor_name || '';
  // "until 25 Oct" when the VUMA team set an end date for this product's free delivery.
  const freeUntilText = displayProduct.free_delivery && displayProduct.free_delivery_until
    ? t('products.freeDeliveryUntil', { date: formatEastAfricaDate(displayProduct.free_delivery_until) })
    : '';
  // Quantity list for the drop-down: 1 up to what is in stock (at most 30).
  const qtyChoices = Array.from({ length: Math.max(1, Math.min(unitsLeft, 30)) }, (_, i) => i + 1);
  const lowStock = !needsVariant && unitsLeft > 0 && unitsLeft <= 5;
  const showOptionsBlock = productNeedsSize || needsVariant || outOfStock || lowStock;
  const cartTitle = outOfStock ? t('products.outOfStock') : addedToCart ? '✓ Added!' : t('products.addToCart');
  const buyTitle = outOfStock ? 'Unavailable' : t('products.buyNow');
  const actionsOff = outOfStock || loading.detail;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Top bar that fades in once the photo has scrolled away: back arrow, search box, cart */}
      <Animated.View pointerEvents={barShown ? 'auto' : 'none'} style={[styles.animHeader, { opacity: headerOpacity, paddingTop: topInset }]}>
        <TouchableOpacity testID="search-pill" style={styles.searchPill} onPress={() => navigation.navigate(SCREENS.SEARCH)} activeOpacity={0.8}>
          <Text style={styles.searchPillText} numberOfLines={1}>{t('home.searchPlaceholder')}</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Round buttons that float over the photo: back on the left, cart on the right */}
      <View style={[styles.topActions, { top: topInset }]}>
        <TouchableOpacity testID="back-btn" style={[styles.topActionBtn, barShown && styles.topActionBtnFlat]} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="cart-btn" style={[styles.topActionBtn, barShown && styles.topActionBtnFlat]} onPress={() => navigation.navigate(SCREENS.CART)}>
          <Text style={styles.topActionIcon}>🛒</Text>
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
          listener: (e) => {
            const shown = e.nativeEvent.contentOffset.y > width * 0.65;
            setBarShown((prev) => (prev === shown ? prev : shown));
          },
        })}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Photo: full width and square, dots at the bottom, heart at the bottom right */}
        <View style={styles.galleryWrap}>
          <FlatList
            ref={galleryRef}
            data={images.length > 0 ? images : [{ image_url: null }]}
            horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
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
          <TouchableOpacity testID="wishlist-btn" style={styles.heartBtn} onPress={handleWishlist} activeOpacity={0.85}>
            <Text style={[styles.heartIcon, isWishlisted && styles.heartIconOn]}>{isWishlisted ? '♥' : '♡'}</Text>
          </TouchableOpacity>
        </View>

        {onSale && (
          <View style={styles.flashBar}>
            <Text style={styles.flashText}>⚡ FLASH SALE</Text>
            {flashCountdown > 0 && <Text style={styles.flashCountdown}>{formatCountdown(flashCountdown)}</Text>}
          </View>
        )}

        {/* Product info: shop link and share on one line, then title, rating, price */}
        <View style={styles.infoCard}>
          <View style={styles.shopShareRow}>
            {vendorLabel ? (
              <TouchableOpacity testID="shop-link" style={styles.shopLink} onPress={handleSellerStore} activeOpacity={0.7}>
                <Text style={styles.shopLinkText} numberOfLines={1}>{vendorLabel + ' ›'}</Text>
              </TouchableOpacity>
            ) : <View style={styles.shopLink} />}
            <TouchableOpacity testID="share-btn" style={styles.shareBtn} onPress={handleShare} activeOpacity={0.7}>
              <Text style={styles.shareIcon}>↗</Text>
            </TouchableOpacity>
          </View>

          {(displayProduct.rating_avg > 0 || (displayProduct.sales_count || 0) > 0) && (
            <View style={styles.ratingRow}>
              <Text style={styles.salesCount}>
                {(displayProduct.sales_count || 0) > 0 ? displayProduct.sales_count + ' ' + t('products.sold') : ''}
              </Text>
              {displayProduct.rating_avg > 0 && (
                <View style={styles.ratingRight}>
                  <Text style={styles.ratingStars}>
                    {'★'.repeat(Math.min(5, Math.round(displayProduct.rating_avg))) + '☆'.repeat(5 - Math.min(5, Math.round(displayProduct.rating_avg)))}
                  </Text>
                  <Text style={styles.ratingCountSmall}>{'(' + displayProduct.rating_count + ')'}</Text>
                </View>
              )}
            </View>
          )}

          <Text style={styles.productName}>{displayProduct.name}</Text>

          <View style={styles.priceRow}>
            {discount > 0 && <Text style={styles.discountPct}>{discount + '%'}</Text>}
            <Text style={styles.effectivePrice}>{formatPrice(finalPrice)}</Text>
          </View>
          {discount > 0 && <Text style={styles.originalPrice}>{formatPrice(displayProduct.price)}</Text>}
          {!!shortText && (
            <Text style={styles.shortDescription} numberOfLines={4}>{shortText}</Text>
          )}
          <Text style={styles.deliveryLine}>
            {displayProduct.free_delivery ? (
              <Text style={styles.deliveryBold}>
                {t('products.freeDelivery')}
                {freeUntilText ? '  ' + freeUntilText : ''}
              </Text>
            ) : (
              <Text>{t('products.deliveryAtCheckout')}</Text>
            )}
            {vendorLabel ? <Text>{'  ·  ' + t('products.soldBy') + ' ' + vendorLabel}</Text> : null}
          </Text>
        </View>

        {/* Guest Banner */}
        {!isAuthenticated && (
          <TouchableOpacity style={styles.guestBanner} onPress={() => setShowAuthModal(true)} activeOpacity={0.85}>
            <View style={styles.guestBannerText}>
              <Text style={styles.guestBannerTitle}>Log in to shop on VUMA</Text>
              <Text style={styles.guestBannerSub}>Get exclusive deals and track your orders</Text>
            </View>
            <Text style={styles.guestBannerArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* Options: "Size: L" rows of boxes (the seller's option list), or the older size row */}
        {showOptionsBlock && (
          <View style={styles.card}>
            {productNeedsSize && (
              <View style={styles.sizeWrap}>
                <CustomerSizeSelector
                  categoryName={displayProduct.category_name}
                  availableSizes={displayProduct.available_sizes}
                  selectedSize={selectedSize}
                  onSelect={(size) => { setSelectedSize(size); setSizeError(false); }}
                  error={sizeError}
                />
              </View>
            )}
            {needsVariant && (
              <VariantPicker
                key={`options-${displayProduct.id}`}
                variants={productVariants}
                selectedVariant={selectedVariant}
                onColorPhoto={showGalleryPicture}
                onSelect={(v) => {
                  setSelectedVariant(v);
                  if (v) setVariantError(false);
                  // never keep more in the basket than the chosen option has
                  setQuantity((q) => Math.max(1, Math.min(q, v ? Math.max(1, unitsAvailable(displayProduct, productVariants, v)) : q)));
                }}
                error={variantError}
              />
            )}
            {outOfStock ? (
              <Text style={styles.stockDanger}>{t('products.outOfStock')}</Text>
            ) : lowStock ? (
              <Text style={styles.stockDanger}>{t('products.onlyLeft', { count: unitsLeft })}</Text>
            ) : null}
          </View>
        )}

        {/* Seller: shop, trust badge and a chat button */}
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
          <TouchableOpacity
            testID="chat-seller"
            style={styles.chatRow}
            activeOpacity={0.8}
            onPress={() => navigation.navigate(SCREENS.CHAT, { productId: displayProduct.id, vendorId: displayProduct.vendor_id })}
          >
            <Text style={styles.chatRowText}>💬  Chat with seller</Text>
          </TouchableOpacity>
        </View>

        {/* Longer description - only for older products that still have one;
            the short description is already shown under the price. */}
        {hasLongerDescription(displayProduct) && (
          <View style={styles.card}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Description</Text>
            </View>
            <Text style={styles.description}>{displayProduct.description}</Text>
          </View>
        )}

        {/* Details */}
        <View style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Details</Text>
          </View>
          {[
            ['SKU', displayProduct.sku],
            ['Stock', `${unitsLeft} units`],
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

        {/* New product-detail recommendation engines — real backend
            data, self-fetching, each keyed to this specific product so
            they refresh correctly when navigating between products. */}
        <RecommendationSection
          key={`similar-${displayProduct.id}`}
          title="Similar Products"
          endpoint="/promotions/similar-products/"
          params={{ product_id: displayProduct.id }}
          navigation={navigation}
        />
        <RecommendationSection
          key={`fbt-${displayProduct.id}`}
          title="Frequently Bought Together"
          endpoint="/promotions/frequently-bought-together/"
          params={{ product_id: displayProduct.id }}
          navigation={navigation}
        />
        <RecommendationSection
          key={`more-seller-${displayProduct.id}`}
          title="More From This Seller"
          endpoint="/promotions/more-from-seller/"
          params={{ product_id: displayProduct.id }}
          navigation={navigation}
        />

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <View style={styles.relatedSection}>
            <View style={styles.relatedTitleRow}>
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
                  variant="grid"
                  onPress={() => handleRelatedProductPress(item)}
                  style={styles.relatedCard}
                />
              )}
            />
          </View>
        )}

        <View style={{ height: 120 }} />
      </Animated.ScrollView>

      {/* Bottom Action Bar: quantity drop-down, Add to Cart, Buy now */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          testID="qty-open"
          style={[styles.qtyBox, outOfStock && styles.qtyBoxOff]}
          onPress={() => setShowQtyModal(true)}
          disabled={outOfStock}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('products.quantity')}
        >
          <Text style={styles.qtyBoxValue}>{quantity}</Text>
          <View style={styles.qtyChevron} />
        </TouchableOpacity>
        <Animated.View style={[styles.cartBtnWrap, { transform: [{ scale: cartBounce }] }]}>
          <TouchableOpacity
            testID={`btn-${cartTitle}`}
            style={[styles.addCartBtn, addedToCart && styles.addCartBtnDone, actionsOff && styles.actionOff]}
            onPress={handleAddToCart}
            disabled={actionsOff}
            activeOpacity={0.85}
          >
            <Text style={[styles.addCartText, addedToCart && styles.addCartTextDone, actionsOff && styles.actionOffText]} numberOfLines={1}>{cartTitle}</Text>
          </TouchableOpacity>
        </Animated.View>
        <TouchableOpacity
          testID={`btn-${buyTitle}`}
          style={[styles.buyNowBtn, outOfStock && styles.actionOff]}
          onPress={handleBuyNow}
          disabled={outOfStock}
          activeOpacity={0.85}
        >
          <Text style={[styles.buyNowText, outOfStock && styles.actionOffText]} numberOfLines={1}>{buyTitle}</Text>
        </TouchableOpacity>
      </View>

      {/* Quantity list (opens from the box in the bottom bar) */}
      <Modal visible={showQtyModal} transparent animationType="slide" onRequestClose={() => setShowQtyModal(false)}>
        <View style={styles.qtyOverlay}>
          <TouchableOpacity style={styles.qtyBackdrop} activeOpacity={1} onPress={() => setShowQtyModal(false)} />
          <View style={styles.qtySheet}>
            <View style={styles.qtySheetHeader}>
              <Text style={styles.qtySheetTitle}>{t('products.quantity')}</Text>
              <TouchableOpacity testID="qty-close" onPress={() => setShowQtyModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.qtySheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.qtyList}>
              {qtyChoices.map((n) => (
                <TouchableOpacity
                  key={n}
                  testID={`qty-${n}`}
                  style={styles.qtyOption}
                  activeOpacity={0.7}
                  onPress={() => { setQuantity(n); setShowQtyModal(false); }}
                >
                  <Text style={[styles.qtyOptionText, n === quantity && styles.qtyOptionTextOn]}>{n}</Text>
                  {n === quantity && <Text style={styles.qtyOptionTick}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
  // Light grey page: the white sections sit on it and the grey shows through
  // as the thin bands between them.
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: SPACING.xl },
  animHeader: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50,
    backgroundColor: COLORS.surface,
    paddingBottom: SPACING.sm + 2, paddingLeft: 56, paddingRight: 56,
    borderBottomWidth: 1, borderBottomColor: COLORS.divider,
  },
  searchPill: {
    height: 38, borderRadius: RADIUS.full, borderWidth: 2, borderColor: COLORS.textPrimary,
    backgroundColor: COLORS.surface, justifyContent: 'center', paddingHorizontal: SPACING.md,
  },
  searchPillText: { fontSize: FONTS.md, color: COLORS.textMuted },
  topActions: {
    position: 'absolute', left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.md, zIndex: 100,
  },
  topActionBtn: {
    width: 38, height: 38, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm,
  },
  topActionBtnFlat: { backgroundColor: 'transparent', shadowOpacity: 0, elevation: 0 },
  topActionIcon: { fontSize: 17 },
  backIcon: { fontSize: 30, lineHeight: 33, color: COLORS.textPrimary, marginTop: -3, marginRight: 2 },

  galleryWrap: { width, height: width, backgroundColor: COLORS.surfaceAlt, position: 'relative' },
  galleryImage: { width, height: width },
  galleryPlaceholder: { width, height: width, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceAlt },
  placeholderEmoji: { fontSize: 76, opacity: 0.35 },
  imageDots: { position: 'absolute', bottom: 14, alignSelf: 'center', flexDirection: 'row', gap: 5 },
  imageDot: { width: 6, height: 6, borderRadius: RADIUS.full, backgroundColor: 'rgba(0,0,0,0.22)' },
  imageDotActive: { backgroundColor: 'rgba(0,0,0,0.72)' },
  heartBtn: {
    position: 'absolute', right: SPACING.md, bottom: SPACING.md,
    width: 40, height: 40, borderRadius: RADIUS.full, backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm,
  },
  heartIcon: { fontSize: 25, lineHeight: 29, color: COLORS.textSecondary },
  heartIconOn: { color: COLORS.danger },

  flashBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.flashSale, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm,
  },
  flashText: { color: COLORS.textWhite, fontSize: FONTS.sm, fontWeight: FONTS.extraBold },
  flashCountdown: { color: COLORS.textWhite, fontSize: FONTS.sm, fontWeight: FONTS.bold },

  infoCard: { backgroundColor: COLORS.surface, paddingHorizontal: SPACING.base, paddingBottom: SPACING.base, marginBottom: SPACING.sm },
  shopShareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  shopLink: { flex: 1, paddingRight: SPACING.sm },
  shopLinkText: { fontSize: FONTS.sm, color: COLORS.primaryDark, fontWeight: FONTS.medium },
  shareBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  shareIcon: { fontSize: 22, color: COLORS.textSecondary },

  productName: { fontSize: FONTS.lg, fontWeight: FONTS.regular, color: COLORS.textPrimary, lineHeight: 24 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  ratingRight: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ratingStars: { fontSize: FONTS.md, color: COLORS.rating, letterSpacing: 1 },
  ratingCountSmall: { fontSize: FONTS.sm, color: COLORS.info },
  salesCount: { fontSize: FONTS.sm, color: COLORS.textMuted },

  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: SPACING.sm, marginTop: SPACING.md },
  discountPct: { fontSize: FONTS.lg, color: COLORS.textPrimary },
  originalPrice: { fontSize: FONTS.md, color: COLORS.textMuted, textDecorationLine: 'line-through', marginTop: 2 },
  effectivePrice: { fontSize: 28, fontWeight: FONTS.extraBold, color: COLORS.textPrimary, letterSpacing: FONTS.trackTight },
  shortDescription: { fontSize: FONTS.md, color: COLORS.textSecondary, lineHeight: 21, marginTop: SPACING.sm },
  deliveryLine: { fontSize: FONTS.sm, color: COLORS.textSecondary, marginTop: SPACING.md, lineHeight: 19 },
  deliveryBold: { fontWeight: FONTS.bold, color: COLORS.textPrimary },

  vendorRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.xs },
  vendorIconChip: { width: 32, height: 32, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  vendorIcon: { fontSize: 16 },
  vendorName: { flex: 1, fontSize: FONTS.sm, color: COLORS.primaryDark, fontWeight: FONTS.semiBold },
  vendorArrow: { fontSize: FONTS.xl, color: COLORS.textMuted },
  chatRow: {
    marginTop: SPACING.md, borderWidth: 1, borderColor: COLORS.borderStrong, borderRadius: 6,
    paddingVertical: SPACING.md, alignItems: 'center', backgroundColor: COLORS.surface,
  },
  chatRowText: { fontSize: FONTS.md, color: COLORS.textPrimary, fontWeight: FONTS.medium },

  guestBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryFade,
    marginBottom: SPACING.sm, paddingHorizontal: SPACING.base, paddingVertical: SPACING.md,
  },
  guestBannerText: { flex: 1 },
  guestBannerTitle: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.primaryDark },
  guestBannerSub: { fontSize: FONTS.xs, color: COLORS.textSecondary, marginTop: 2 },
  guestBannerArrow: { fontSize: FONTS.xl, color: COLORS.primary },

  card: { backgroundColor: COLORS.surface, padding: SPACING.base, marginBottom: SPACING.sm },
  sizeWrap: { marginBottom: SPACING.xs },
  stockDanger: { fontSize: FONTS.sm, color: COLORS.danger, fontWeight: FONTS.semiBold, marginTop: SPACING.xs },
  relatedSection: { backgroundColor: COLORS.surface, paddingTop: SPACING.base, paddingBottom: SPACING.sm, marginBottom: SPACING.sm },
  relatedTitleRow: { marginBottom: SPACING.sm, paddingHorizontal: SPACING.base },
  relatedList: { paddingHorizontal: SPACING.base, gap: SPACING.sm },
  relatedCard: { width: 128 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.base },
  sectionTitleRow: { marginBottom: SPACING.sm },
  sectionTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
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
    paddingHorizontal: SPACING.md, paddingTop: SPACING.sm,
    paddingBottom: Platform.OS === 'ios' ? SPACING.xl : SPACING.sm + 2,
    backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.divider,
  },
  qtyBox: {
    width: 68, height: 48, borderRadius: 6, borderWidth: 1, borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  qtyBoxOff: { backgroundColor: COLORS.surfaceSunken },
  qtyBoxValue: { fontSize: FONTS.base, fontWeight: FONTS.semiBold, color: COLORS.textPrimary },
  qtyChevron: {
    width: 8, height: 8, borderRightWidth: 1.5, borderBottomWidth: 1.5, borderColor: COLORS.textSecondary,
    transform: [{ rotate: '45deg' }], marginTop: -3,
  },
  cartBtnWrap: { flex: 1 },
  addCartBtn: {
    height: 48, borderRadius: 6, borderWidth: 1.5, borderColor: COLORS.primary,
    backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.sm,
  },
  addCartBtnDone: { borderColor: COLORS.success, backgroundColor: COLORS.successLight },
  addCartText: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.primary },
  addCartTextDone: { color: COLORS.successText },
  buyNowBtn: {
    flex: 1, height: 48, borderRadius: 6, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.sm,
  },
  buyNowText: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textWhite },
  actionOff: { backgroundColor: COLORS.surfaceSunken, borderColor: COLORS.border },
  actionOffText: { color: COLORS.textMuted },

  qtyOverlay: { flex: 1, justifyContent: 'flex-end' },
  qtyBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: COLORS.overlay },
  qtySheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 14, borderTopRightRadius: 14,
    maxHeight: '60%', paddingBottom: Platform.OS === 'ios' ? 30 : SPACING.base,
  },
  qtySheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.base,
    borderBottomWidth: 1, borderBottomColor: COLORS.divider,
  },
  qtySheetTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  qtySheetClose: { fontSize: FONTS.lg, color: COLORS.textMuted },
  qtyList: { flexGrow: 0 },
  qtyOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.base, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  qtyOptionText: { fontSize: FONTS.base, color: COLORS.textPrimary },
  qtyOptionTextOn: { fontWeight: FONTS.bold, color: COLORS.primary },
  qtyOptionTick: { fontSize: FONTS.base, color: COLORS.primary, fontWeight: FONTS.bold },

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
});