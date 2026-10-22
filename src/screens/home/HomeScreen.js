/**
 * VUMA Store — Home Screen
 * Upgraded: Banners, Trending, Daily Deals, Recently Viewed, Recommendations
 *
 * Added: "VUMA Faida & Ofa" promotions row, Welcome Gift highlight card,
 * and Become a Seller banner — all driven by real backend data from
 * /products/home-promotions/ (real Coupon/WelcomeGiftCampaign/
 * ReferralCampaign/flash-sale state). A card only shows if its real
 * underlying campaign is currently active — nothing here is faked.
 *
 * Product grid redesigned to a Coupang-style three-column masonry layout:
 * one continuous scroll, cards distributed left/right and staggering
 * naturally by height (not two independently-scrolling panes — that
 * would fight a single swipe gesture). Infinite scroll is preserved via
 * a scroll-position listener replacing FlatList's onEndReached, since
 * true masonry can't use FlatList's row-based numColumns.
 *
 * No product data, fetching, filtering, or navigation logic changed —
 * only how the "All Products" section is laid out.
 *
 * Updated: added Buy It Again, Inspired by Your Recent Searches, Deals
 * You Might Like, and Need This Now - using the new self-fetching
 * RecommendationSection component (real backend engines, never
 * touches this screen's existing data-loading logic).
 *
 * Updated: "VUMA Faida & Ofa" row now also fetches campaigns from the
 * new Promotion/Offer Engine (/products/promo-campaigns/) - Admin can
 * create/edit/schedule these from Internal Admin, and they show here
 * automatically, no app update needed. This is additive: the existing
 * coupons/welcome_gift/flash_sale/free_delivery/referral cards are
 * untouched (they're still powered by their own real, working
 * backends) - dynamic campaigns are appended after them in the same
 * row, in the admin-defined display order.
 */

import { t } from '../../i18n';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, Dimensions, StatusBar, Platform, Image, Alert, Linking,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import {
  fetchProducts, fetchFeaturedProducts, fetchFlashSaleProducts, fetchCategories,
  selectProducts, selectFeaturedProducts, selectFlashSaleProducts, selectCategories,
  selectProductsLoading, selectHasNextPage, selectCurrentPage, resetProducts,
} from '../../store/productSlice';
import { addToCartAndSave, selectCartItemCount } from '../../store/cartSlice';
import { selectUnreadCount } from '../../store/notificationSlice';
import { selectUser, selectIsAuthenticated } from '../../store/authSlice';
import { COLORS, FONTS, SPACING, RADIUS, SCREENS, CATEGORIES, SHADOWS } from '../../utils/constants';
import { formatPrice, formatCountdown, secondsUntil } from '../../utils/helpers';
import {
  groupBanners, feedBanners, slotBanner, slotBannerIds, buildFaidaRow, bannerAction, formatAmount,
} from '../../utils/homeBanners';
import ProductCard from '../../components/ProductCard';
import CategoryBar from '../../components/CategoryBar';
import SearchBar from '../../components/SearchBar';
import HomeBanner from '../../components/HomeBanner';
import { OfferCard, OfferBanner, BannerCard, BannerStrip } from '../../components/OfferCards';
import FeedBanner from '../../components/FeedBanner';
import RecommendationSection from '../../components/RecommendationSection';
import SellersYouMightLike from '../../components/SellersYouMightLike';
import { SkeletonProductGrid } from '../../components/common/Loading';
import { EmptyState } from '../../components/common/ErrorMessage';
import { productsAPI } from '../../api/products';
import { get, post } from '../../api/client';
import CouponSheet from '../../components/CouponSheet';
import { getPendingCoupon, setPendingCoupon } from '../../utils/pendingCoupon';
import { giftCardCopy } from '../../utils/rewards';

const { width } = Dimensions.get('window');
const NUM_COLUMNS = width >= 700 ? 4 : 3; // still used by wide-screen horizontal rows above the grid

export default function HomeScreen({ navigation }) {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const products = useSelector(selectProducts);
  const featured = useSelector(selectFeaturedProducts);
  const flashSale = useSelector(selectFlashSaleProducts);
  const categories = useSelector(selectCategories);
  const loading = useSelector(selectProductsLoading);
  const hasNextPage = useSelector(selectHasNextPage);
  const currentPage = useSelector(selectCurrentPage);
  const cartCount = useSelector(selectCartItemCount);
  const unreadCount = useSelector(selectUnreadCount);

  const [activeCategory, setActiveCategory] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [flashCountdown, setFlashCountdown] = useState(0);
  const [banners, setBanners] = useState([]);
  const [trending, setTrending] = useState([]);
  const [dailyDeals, setDailyDeals] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [promotions, setPromotions] = useState(null);
  const [couponSheetOpen, setCouponSheetOpen] = useState(false);
  const [chosenCoupon, setChosenCoupon] = useState('');
  const [dynamicOffers, setDynamicOffers] = useState([]);
  const [toastMessage, setToastMessage] = useState('');
  const toastTimer = React.useRef(null);
  const mainScrollRef = useRef(null);
  const allProductsYRef = useRef(0);

  // Banners from Admin -> Home Banners. Every banner has a position; the ones
  // for an offer card or a strip replace that built-in card/strip (see
  // utils/homeBanners.js). Nothing replaced = the built-in one stays.
  const bannerGroups = useMemo(() => groupBanners(banners), [banners]);
  const heroBanners = bannerGroups.hero;
  const feedList = useMemo(() => feedBanners(bannerGroups), [bannerGroups]);
  const viewedSlotBanners = useRef({});

  useEffect(() => {
    slotBannerIds(bannerGroups).forEach((id) => {
      if (viewedSlotBanners.current[id]) return;
      viewedSlotBanners.current[id] = true;
      post(`/products/banners/${id}/track/`, { action: 'view' }).catch(() => {});
    });
  }, [bannerGroups]);

  useEffect(() => { loadInitialData(); }, []);

  // Coming back to Home (after claiming a gift, or paying for an order) shows
  // the cards as they are now: a claimed gift says "Itumie Sasa", a coupon the
  // customer already used is no longer offered.
  const firstFocus = useRef(true);
  useFocusEffect(useCallback(() => {
    if (firstFocus.current) { firstFocus.current = false; return; }
    get('/products/home-promotions/')
      .then((data) => { if (data) setPromotions(data); })
      .catch(() => {});
  }, [isAuthenticated]));

  useEffect(() => {
    if (!flashSale?.length) return;
    const endTime = flashSale[0]?.flash_sale_end;
    if (!endTime) return;
    setFlashCountdown(secondsUntil(endTime));
    const timer = setInterval(() => setFlashCountdown((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [flashSale]);

  const loadInitialData = useCallback(async () => {
    dispatch(resetProducts());
    await Promise.all([
      dispatch(fetchProducts({ page: 1, category: '', refresh: true })),
      dispatch(fetchFeaturedProducts()),
      dispatch(fetchFlashSaleProducts()),
      dispatch(fetchCategories()),
    ]);
    loadExtraFeatures();
  }, []);

  const loadExtraFeatures = useCallback(async () => {
    try {
      const [bannersData, trendingData, dealsData, promotionsData, offersData] = await Promise.all([
        productsAPI.getHomeBanners().catch(() => []),
        productsAPI.getTrending().catch(() => []),
        productsAPI.getDailyDeals().catch(() => []),
        get('/products/home-promotions/').catch(() => null),
        get('/products/promo-campaigns/').catch(() => null),
      ]);
      setBanners(bannersData || []);
      setTrending(trendingData?.results || trendingData || []);
      setDailyDeals(dealsData?.results || dealsData || []);
      setPromotions(promotionsData);
      setDynamicOffers(offersData?.campaigns || []);

      if (isAuthenticated) {
        const [recentData, recData] = await Promise.all([
          productsAPI.getRecentlyViewed().catch(() => []),
          productsAPI.getRecommendations().catch(() => []),
        ]);
        setRecentlyViewed(recentData?.results || recentData || []);
        setRecommendations(recData?.results || recData || []);
      }
    } catch (e) {}
  }, [isAuthenticated]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  }, [loadInitialData]);

  const handleLoadMore = useCallback(() => {
    if (loading.loadingMore || loading.products || !hasNextPage) return;
    dispatch(fetchProducts({ page: currentPage + 1, category: activeCategory }));
  }, [loading, hasNextPage, currentPage, activeCategory]);

  // Replaces FlatList's onEndReached — true masonry needs a ScrollView,
  // so infinite scroll is triggered manually near the bottom instead.
  const handleScroll = useCallback((e) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const paddingToBottom = 400;
    // Require a real minimum scroll distance too - on Android, the
    // keyboard opening shrinks layoutMeasurement.height (adjustResize),
    // which could otherwise satisfy this "near bottom" check while
    // sitting at the very top of the screen and spuriously trigger a
    // reload that drops keyboard focus.
    if (contentOffset.y > 200 && layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      handleLoadMore();
    }
  }, [handleLoadMore]);

  const handleCategorySelect = useCallback((slug) => {
    setActiveCategory(slug);
    dispatch(resetProducts());
    dispatch(fetchProducts({ page: 1, category: slug, refresh: true }));
    // Auto-scroll to the filtered results so a category tap has
    // immediate, visible feedback - previously the top of the screen
    // (banners, recommendations, deals) never changed on category
    // selection, so unless the user manually scrolled all the way
    // down, a tap on an empty or lightly-stocked category looked like
    // nothing happened at all.
    setTimeout(() => {
      mainScrollRef.current?.scrollTo({ y: Math.max(0, allProductsYRef.current - 12), animated: true });
    }, 100);
  }, []);

  const handleProductPress = useCallback((product) => {
    if (isAuthenticated) productsAPI.trackView(product.id).catch(() => {});
    navigation.navigate(SCREENS.PRODUCT_DETAIL, { productId: product.id, product });
  }, [isAuthenticated]);

  // Temporary "Added to cart" confirmation — replaces the old permanent
  // checkmark on the product image, matching Coupang-style feedback.
  const handleAddedToCart = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMessage('Added to cart ✓');
    toastTimer.current = setTimeout(() => setToastMessage(''), 1800);
  }, []);

  // What a banner does when tapped (top slider and every other position).
  const handleBannerPress = (banner) => {
    const action = bannerAction(banner);
    if (!action) return;
    switch (action.kind) {
      case 'product':
        navigation.navigate(SCREENS.PRODUCT_DETAIL, { productId: action.id });
        break;
      case 'category':
        handleCategorySelect(action.slug);
        break;
      case 'flash_sale':
        dispatch(resetProducts());
        dispatch(fetchProducts({ page: 1, flash_sale: true, refresh: true }));
        break;
      case 'url':
        Linking.openURL(action.url).catch(() => {});
        break;
      case 'coupons':
        handleCouponPress();
        break;
      case 'welcome_gift':
        handleWelcomeGiftPress();
        break;
      case 'referral':
        navigation.navigate('Referral');
        break;
      case 'seller_register':
        navigation.navigate('VendorRegister');
        break;
      case 'all_products':
        mainScrollRef.current?.scrollTo({ y: Math.max(0, allProductsYRef.current - 12), animated: true });
        break;
      default:
        break;
    }
  };

  // A banner that sits in the place of a built-in card/strip: count the tap, then do its action.
  const handleSlotBannerPress = (banner) => {
    post(`/products/banners/${banner.id}/track/`, { action: 'click' }).catch(() => {});
    handleBannerPress(banner);
  };

  const handleSearchSubmit = (query) => navigation.navigate(SCREENS.SEARCH, { query });

  // ── Promotion card actions — real data, and honest fallbacks (an
  // informational alert with real numbers) for the two flows that
  // don't have a confirmed dedicated screen yet, rather than guessing
  // a navigation target that could crash. ──
  // The Kuponi card opens the list of real coupons; "Tumia" saves the code
  // and the checkout screen fills its coupon box with it.
  const handleCouponPress = async () => {
    const c = promotions?.coupons;
    if (!c?.active) return;
    setChosenCoupon(await getPendingCoupon());
    setCouponSheetOpen(true);
  };

  const handleUseCoupon = async (code) => {
    await setPendingCoupon(code);
    setChosenCoupon(code);
    setCouponSheetOpen(false);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMessage(`Kuponi ${code} imehifadhiwa ✓`);
    toastTimer.current = setTimeout(() => setToastMessage(''), 2600);
  };

  // The Zawadi ya Karibu card opens the gift screen, where the customer
  // claims the gift and sees where it is. A visitor signs up or logs in first.
  const handleWelcomeGiftPress = () => {
    const g = promotions?.welcome_gift;
    if (!g?.active) return;
    if (!isAuthenticated) {
      Alert.alert('Zawadi ya Karibu', 'Jisajili au ingia ili upokee zawadi yako.', [
        { text: 'Baadaye', style: 'cancel' },
        { text: 'Ingia', onPress: () => navigation.navigate('Auth', { screen: 'Login' }) },
        { text: 'Jisajili', onPress: () => navigation.navigate('Auth', { screen: 'Register' }) },
      ]);
      return;
    }
    navigation.navigate('WelcomeGift');
  };

  // ── Dynamic offer card press — routes based on admin-set
  // cta_destination_type, and records a real click for analytics. ──
  const handleDynamicOfferPress = useCallback((offer) => {
    post(`/products/promo-campaigns/${offer.id}/track/`, { action: 'click' }).catch(() => {});
    switch (offer.cta_destination_type) {
      case 'screen':
        if (offer.cta_destination_value) navigation.navigate(offer.cta_destination_value);
        break;
      case 'category':
        if (offer.cta_destination_value) handleCategorySelect(offer.cta_destination_value);
        break;
      case 'product':
        // Uses the real target_product_ids array (from Internal
        // Admin's product picker). Single product goes straight to
        // its detail page. Multiple products open a dedicated
        // results screen, passing just the campaign id - that screen
        // fetches full product details for this campaign's targets
        // in one call, rather than the app fetching each product
        // individually from a list of raw ids.
        if (offer.target_product_ids?.length === 1) {
          navigation.navigate(SCREENS.PRODUCT_DETAIL, { productId: offer.target_product_ids[0] });
        } else if (offer.target_product_ids?.length > 1) {
          navigation.navigate('PromotionProducts', {
            campaignId: offer.id,
            title: offer.title,
          });
        }
        break;
      case 'external_url':
        if (offer.cta_destination_value) Linking.openURL(offer.cta_destination_value).catch(() => {});
        break;
      default:
        break;
    }
  }, [navigation, handleCategorySelect]);

  // Memoized so the array reference stays stable across re-renders -
  // previously a brand-new array was created on every HomeScreen
  // render (including the very re-render a category tap itself
  // triggers via setActiveCategory/dispatch), which defeated
  // CategoryBar's memo() and could cause its re-render to happen
  // while a touch gesture was still settling, occasionally producing
  // a duplicate tap on the same category button.
  const allCategories = useMemo(() => [
    { id: 'all', label: t('common.all'), icon: '🏠', slug: '' },
    ...CATEGORIES.filter((c) => c.id !== 'all'),
  ], []);

  // ── VUMA Faida & Ofa — promotion cards, Swahili-labeled, each only
  // shown when its real backing campaign is active. ──
  const giftCopy = giftCardCopy(promotions?.welcome_gift);
  const couponCount = promotions?.coupons?.count || 0;
  const FAIDA_CARDS = [
    {
      key: 'coupons',
      show: promotions?.coupons?.active,
      icon: '🎫', bg: '#FDE8EC',
      title: 'Kuponi',
      subtitle: couponCount === 1 ? 'Kuponi 1 inakusubiri' : `Kuponi ${couponCount} zinakusubiri`,
      cta: 'Chagua Sasa', ctaColor: '#E5426B',
      onPress: handleCouponPress,
    },
    {
      key: 'welcome_gift',
      show: promotions?.welcome_gift?.active,
      icon: '🎁', bg: '#FFF1DB',
      title: 'Zawadi ya Karibu', subtitle: giftCopy.subtitle,
      cta: giftCopy.cta, ctaColor: COLORS.primary,
      onPress: handleWelcomeGiftPress,
    },
    {
      key: 'flash_sale',
      show: promotions?.flash_sale?.active,
      icon: '⚡', bg: '#EFE7FD',
      title: 'Ofa za Kijana', subtitle: 'Punguzo hadi 70%',
      cta: 'Nunua Sasa', ctaColor: '#7C4DE0',
      onPress: () => {
        dispatch(resetProducts());
        dispatch(fetchProducts({ page: 1, flash_sale: true, refresh: true }));
      },
    },
    {
      key: 'free_delivery',
      show: promotions?.free_delivery?.active,
      icon: '🚚', bg: COLORS.primaryFade,
      title: 'Usafirishaji Bure', subtitle: 'Kwa oda zote Tanzania nzima',
      cta: 'Tazama', ctaColor: COLORS.primary,
      onPress: () => {
        mainScrollRef.current?.scrollTo({ y: Math.max(0, allProductsYRef.current - 12), animated: true });
      },
    },
    {
      key: 'referral',
      show: promotions?.referral?.active,
      icon: '👥', bg: '#E6EEFD',
      title: promotions?.referral?.referrer_amount
        ? `Alika Rafiki & Pata TZS ${formatAmount(promotions.referral.referrer_amount)}`
        : 'Alika Rafiki & Pata Zawadi',
      subtitle: 'Pata zawadi kwa kila rafiki unayemualika.',
      cta: 'Shiriki Sasa', ctaColor: '#3B6FE0',
      onPress: () => navigation.navigate('Referral'),
    },
    // Dynamic campaigns from the Promotion/Offer Engine, appended
    // after the existing hardcoded cards - Admin-created, admin-
    // scheduled, admin-ordered. Nothing here is faked: the backend
    // already only returns currently-active, eligible campaigns.
    ...dynamicOffers.map((offer) => ({
      key: `dyn_${offer.id}`,
      show: true,
      icon: offer.icon || '🎁',
      image: offer.image || null,
      bg: offer.bg_color || '#FFF1DB',
      title: offer.title,
      subtitle: offer.subtitle || '',
      cta: offer.cta_text || 'Angalia',
      ctaColor: COLORS.primary,
      onPress: () => handleDynamicOfferPress(offer),
    })),
  ].filter((c) => c.show).map((c, i) => ({ c, i })).sort((a, b) => (Number(b.c.key.startsWith('dyn_')) - Number(a.c.key.startsWith('dyn_'))) || (a.i - b.i)).map((x) => x.c);

  // The row as it is shown: built-in cards, except where the Admin has put a
  // banner in that card's place (then the banner is shown instead - never both).
  const faidaDefaults = {};
  FAIDA_CARDS.forEach((c) => { if (!c.key.startsWith('dyn_')) faidaDefaults[c.key] = c; });
  const FAIDA_ROW = buildFaidaRow(bannerGroups, FAIDA_CARDS.filter((c) => c.key.startsWith('dyn_')), faidaDefaults);
  const giftStripBanner = slotBanner(bannerGroups, 'gift_strip');
  const sellerStripBanner = slotBanner(bannerGroups, 'seller_strip');
  const trendingStrips = bannerGroups.slots.above_trending || [];

  // ── Horizontal product row ──
  const HorizontalRow = ({ title, data, accent = COLORS.primary }) => {
    if (!data?.length) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionAccent, { backgroundColor: accent }]} />
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
          {data.slice(0, 8).map((product) => (
            <ProductCard key={product.id} product={product} variant="grid" onPress={() => handleProductPress(product)} style={styles.featuredCard} />
          ))}
        </ScrollView>
      </View>
    );
  };

  // ── Daily deal card ──
  const DealCard = ({ deal }) => {
    const timeLeft = deal.deal_ends_at ? secondsUntil(deal.deal_ends_at) : 0;
    return (
      <TouchableOpacity style={styles.dealCard} onPress={() => handleProductPress(deal)} activeOpacity={0.9}>
        <View style={styles.dealImageWrap}>
          {deal.primary_image ? (
            <Image source={{ uri: deal.primary_image }} style={styles.dealImage} resizeMode="cover" />
          ) : (
            <View style={[styles.dealImage, styles.dealImagePlaceholder]}>
              <Text style={{ fontSize: 32, opacity: 0.35 }}>📦</Text>
            </View>
          )}
          <View style={styles.dealRibbonWrap}>
            <View style={styles.dealRibbonBody}>
              <Text style={styles.dealRibbonText}>-{deal.deal_discount || deal.discount_percent}%</Text>
            </View>
            <View style={styles.dealRibbonFold} />
          </View>
        </View>
        <View style={styles.dealInfo}>
          <Text style={styles.dealName} numberOfLines={2}>{deal.name}</Text>
          <Text style={styles.dealPrice}>{formatPrice(deal.deal_price || deal.price)}</Text>
          {timeLeft > 0 && (
            <View style={styles.dealTimerPill}>
              <Text style={styles.dealTimerText}>⏱ {formatCountdown(timeLeft)}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // ── Masonry grid: distribute products into two columns. Strict
  // alternation (even index -> left, odd -> right) keeps both columns
  // near-equal length; ProductCard's natural (non-forced) height per
  // card is what actually creates the staggered look, since columns
  // are no longer stretched to match a row's tallest cell.
  //
  // Chunked into groups of 9 (3 rows worth) so a real FeedBanner can
  // be inserted between chunks - genuinely interspersed through the
  // feed rather than only living in one top carousel. Banners cycle
  // through the real fetched list rather than repeating the same one.
  const CHUNK_SIZE = 9;
  const productChunks = [];
  for (let i = 0; i < products.length; i += CHUNK_SIZE) {
    productChunks.push(products.slice(i, i + CHUNK_SIZE));
  }

  const MasonryChunk = ({ chunk }) => {
    const cols = [[], [], []];
    chunk.forEach((p, i) => cols[i % 3].push(p));
    return (
      <View style={styles.masonryRow}>
        {cols.map((col, colIndex) => (
          <View key={colIndex} style={styles.masonryColumn}>
            {col.map((product) => (
              <ProductCard key={product.id} product={product} variant="grid" onPress={() => handleProductPress(product)} style={styles.masonryCard} onAddedToCart={handleAddedToCart} />
            ))}
          </View>
        ))}
      </View>
    );
  };

  const MasonryGrid = () => {
    if (loading.products && products.length === 0) return <SkeletonProductGrid count={6} />;
    if (products.length === 0) {
      return (
        <EmptyState
          icon="🛍️" title="No products found"
          message={activeCategory ? 'No products in this category yet.' : 'Check back soon!'}
          actionLabel={activeCategory ? 'All Products' : null}
          onAction={activeCategory ? () => handleCategorySelect('') : null}
        />
      );
    }
    return (
      <View>
        {productChunks.map((chunk, chunkIndex) => (
          <React.Fragment key={chunkIndex}>
            <MasonryChunk chunk={chunk} />
            {feedList.length > 0 && (
              <FeedBanner
                banner={feedList[chunkIndex % feedList.length]}
                navigation={navigation}
                style={styles.feedBanner}
              />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  };


  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      <View style={styles.topBar}>
        <Text style={styles.logoWord}>VUMA</Text>
        <View style={styles.topSearch}>
          <SearchBar
            onSearch={handleSearchSubmit} placeholder="Search products..."
            style={styles.searchBar}
          />
        </View>
        <View style={styles.topIcons}>
          <TouchableOpacity onPress={() => navigation.navigate(SCREENS.NOTIFICATIONS)} style={styles.iconBtn}>
            <Text style={styles.topIcon}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.iconBadge}>
                <Text style={styles.iconBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate(SCREENS.CART)} style={styles.iconBtn}>
            <Text style={styles.topIcon}>🛒</Text>
            {cartCount > 0 && (
              <View style={styles.iconBadge}>
                <Text style={styles.iconBadgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <CategoryBar categories={allCategories} activeCategory={activeCategory} onSelect={handleCategorySelect} />

      <ScrollView
        ref={mainScrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={200}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
      >
        {/* ── Banners ── */}
        <View style={styles.bannerWrap}>
          <HomeBanner
            banners={heroBanners}
            onBannerPress={handleBannerPress}
            navigation={navigation}
          />
        </View>

        {/* ── VUMA Faida & Ofa — real, active promotions only ── */}
        {FAIDA_ROW.length > 0 && (
          <View style={[styles.section, styles.faidaSection]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.faidaTitle}>
                <Text style={styles.faidaBrand}>VUMA</Text>{' Faida & Ofa'}
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.faidaList}>
              {FAIDA_ROW.map((item) => (
                item.type === 'banner' ? (
                  <BannerCard key={item.key} banner={item.banner} onPress={handleSlotBannerPress} />
                ) : (
                  <OfferCard key={item.key} card={item.card} tint={item.key.startsWith('dyn_') ? item.card.bg : null} />
                )
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Welcome Gift strip and Become-a-Seller strip (an Admin banner in the
             same position replaces the built-in strip) ── */}
        <View style={styles.stripGroup}>
          {giftStripBanner ? (
            <BannerStrip banner={giftStripBanner} onPress={handleSlotBannerPress} />
          ) : promotions?.welcome_gift?.active ? (
            <OfferBanner
              testID="offer-gift-banner"
              variant="gift"
              amount={promotions.welcome_gift.amount}
              title={`Zawadi Maalum ya\u00A0Karibu!`}
              subtitle={giftCopy.subtitle}
              onPress={handleWelcomeGiftPress}
            />
          ) : null}

          {sellerStripBanner ? (
            <BannerStrip banner={sellerStripBanner} onPress={handleSlotBannerPress} />
          ) : (
            <OfferBanner
              testID="offer-seller-banner"
              variant="seller"
              title="Uza Bidhaa Zako VUMA 🚀"
              subtitle="Fikia wateja wengi zaidi. Jisajili bure — hakuna gharama ya kuanza."
              cta="Anza Kuuza"
              onPress={() => navigation.navigate('VendorRegister')}
            />
          )}
        </View>

        {/* Flash Sale — tinted section, distinct from the rest of the feed */}
        {flashSale?.length > 0 && (
          <View style={[styles.section, styles.flashSection]}>
            <View style={styles.sectionHeader}>
              <View style={styles.flashTitleRow}>
                <Text style={styles.flashTitle}>⚡ Flash Sale</Text>
                {flashCountdown > 0 && (
                  <View style={styles.countdownBadge}>
                    <Text style={styles.countdownText}>{formatCountdown(flashCountdown)}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.seeAllBtn}
                onPress={() => navigation.navigate('ProductList', { flash_sale: true })}
              >
                <Text style={styles.seeAll}>See all</Text>
                <Text style={styles.seeAllArrow}>›</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {flashSale.slice(0, 8).map((p) => (
                <ProductCard key={p.id} product={p} variant="grid" onPress={() => handleProductPress(p)} style={styles.featuredCard} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Daily Deals */}
        {dailyDeals.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionAccent, { backgroundColor: COLORS.discount }]} />
                <Text style={styles.sectionTitle}>Daily Deals</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {dailyDeals.map((d, i) => <DealCard key={d.id || i} deal={d} />)}
            </ScrollView>
          </View>
        )}

        {/* Strip(s) the Admin puts just above Trending Now (nothing here until one is added) */}
        {trendingStrips.length > 0 && (
          <View style={styles.stripGroup}>
            {trendingStrips.map((b) => (
              <BannerStrip key={b.id} banner={b} onPress={handleSlotBannerPress} />
            ))}
          </View>
        )}

        {/* Trending */}
        <HorizontalRow title="Trending Now" data={trending} accent={COLORS.info} />

        {/* Products sellers paid to promote (nothing shows until there are some) */}
        <RecommendationSection title="Sponsored" endpoint="/products/sponsored/" navigation={navigation} />

        {/* Recommendations */}
        {isAuthenticated && recommendations.length > 0 && (
          <HorizontalRow title="Recommended for You" data={recommendations} accent={COLORS.rating} />
        )}

        {/* New recommendation sections — self-fetching, real backend
            engines, render nothing if there's no real data yet. */}
        {isAuthenticated && (
          <RecommendationSection title="Buy It Again" endpoint="/promotions/reorder/" navigation={navigation} />
        )}
        {isAuthenticated && (
          <RecommendationSection title="Inspired by Your Recent Searches" endpoint="/promotions/search-inspired/" navigation={navigation} />
        )}
        {isAuthenticated && (
          <RecommendationSection title="Deals You Might Like" endpoint="/promotions/deals-for-you/" navigation={navigation} />
        )}
        <RecommendationSection title="Need This Now" endpoint="/promotions/low-stock-deals/" navigation={navigation} />
        {isAuthenticated && (
          <SellersYouMightLike navigation={navigation} isAuthenticated={isAuthenticated} />
        )}

        {/* Featured */}
        {featured?.length > 0 && (
          <HorizontalRow title="Featured" data={featured} accent={COLORS.secondary} />
        )}

        {/* Recently Viewed */}
        {isAuthenticated && recentlyViewed.length > 0 && (
          <HorizontalRow title="Recently Viewed" data={recentlyViewed} accent={COLORS.textMuted} />
        )}

        {/* All Products Header */}
        <View
          style={styles.allProductsHeader}
          onLayout={(e) => { allProductsYRef.current = e.nativeEvent.layout.y; }}
        >
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionAccent, { backgroundColor: COLORS.primary }]} />
            <Text style={styles.sectionTitle}>
              {activeCategory ? allCategories.find((c) => c.slug === activeCategory)?.label || 'Products' : 'All Products'}
            </Text>
          </View>
          <View style={styles.productCountPill}>
            <Text style={styles.productCount}>{products.length}</Text>
          </View>
        </View>

        {/* Two-column masonry product grid */}
        <MasonryGrid />

        {loading.loadingMore && (
          <View style={styles.loadingMore}><Text style={styles.loadingMoreText}>Loading more…</Text></View>
        )}
      </ScrollView>

      <CouponSheet
        visible={couponSheetOpen}
        items={promotions?.coupons?.items}
        chosenCode={chosenCoupon}
        onUse={handleUseCoupon}
        onClose={() => setCouponSheetOpen(false)}
      />

      {toastMessage !== '' && (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // ── Top bar ──
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm,
    paddingTop: Platform.OS === 'ios' ? SPACING['3xl'] + SPACING.xs : (StatusBar.currentHeight || SPACING.xl) + SPACING.sm,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.divider,
    gap: SPACING.sm,
  },
  logoWord: {
    fontSize: FONTS.xl, fontWeight: FONTS.black, color: COLORS.primary,
    letterSpacing: FONTS.trackTight,
  },
  topSearch: { flex: 1 },
  searchBar: {
    paddingHorizontal: 0, paddingVertical: 0,
    backgroundColor: COLORS.surfaceSunken,
    borderRadius: RADIUS.full,
  },
  topIcons: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  iconBtn: {
    position: 'relative', width: 38, height: 38,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: RADIUS.full,
  },
  topIcon: { fontSize: 21 },
  iconBadge: {
    position: 'absolute', top: 2, right: 2, backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full, minWidth: 16, height: 16, alignItems: 'center',
    justifyContent: 'center', paddingHorizontal: 2, borderWidth: 1.5, borderColor: COLORS.surface,
  },
  iconBadgeText: { color: COLORS.textWhite, fontSize: 8.5, fontWeight: FONTS.bold },

  // ── Banner wrap ──
  bannerWrap: { backgroundColor: COLORS.surface, paddingBottom: SPACING.sm },

  // ── Sections ──
  section: { backgroundColor: COLORS.surface, marginBottom: SPACING.sm, paddingVertical: SPACING.base },
  flashSection: { backgroundColor: COLORS.primaryFade },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.base, marginBottom: SPACING.sm,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // Coupang-style headings: no coloured bar, just a big bold title
  sectionAccent: { display: 'none' },
  sectionTitle: { fontSize: 20, fontWeight: FONTS.bold, color: COLORS.textPrimary, letterSpacing: FONTS.trackTight },
  flashTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  flashTitle: { fontSize: FONTS.lg, fontWeight: FONTS.extraBold, color: COLORS.primaryDark, letterSpacing: FONTS.trackTight },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  seeAll: { fontSize: FONTS.base, color: COLORS.primary, fontWeight: FONTS.semiBold },
  seeAllArrow: { fontSize: FONTS.xl, color: COLORS.primary, fontWeight: FONTS.bold, marginTop: -1 },
  countdownBadge: { backgroundColor: COLORS.secondary, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 3 },
  countdownText: { color: COLORS.textWhite, fontSize: 11.5, fontWeight: FONTS.bold, letterSpacing: 0.3 },
  horizontalList: { paddingHorizontal: SPACING.base, gap: SPACING.md },
  featuredCard: { width: 128 },

  // ── VUMA Faida & Ofa ──
  faidaTitle: { fontSize: 22, fontWeight: FONTS.black, color: COLORS.secondary, letterSpacing: FONTS.trackTight },
  faidaSection: { marginBottom: 0, paddingBottom: SPACING.sm },
  faidaBrand: { color: COLORS.primary },
  faidaList: { paddingHorizontal: SPACING.base, paddingVertical: 4, gap: SPACING.md },
  stripGroup: { backgroundColor: COLORS.surface, paddingTop: SPACING.sm + 2, marginBottom: SPACING.sm },

  // ── Deal card ──
  dealCard: {
    width: 156, borderRadius: RADIUS.lg, overflow: 'hidden',
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    ...SHADOWS.xs, marginRight: SPACING.sm,
  },
  dealImageWrap: { position: 'relative' },
  dealImage: { width: '100%', height: 112 },
  dealImagePlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceAlt },
  dealRibbonWrap: { position: 'absolute', top: 8, left: -1 },
  dealRibbonBody: {
    height: 20, paddingHorizontal: 7, justifyContent: 'center',
    backgroundColor: COLORS.discount, borderTopRightRadius: 4, borderBottomRightRadius: 4,
  },
  dealRibbonText: { color: COLORS.textWhite, fontSize: 10.5, fontWeight: FONTS.extraBold },
  dealRibbonFold: {
    width: 0, height: 0, borderTopWidth: 4, borderRightWidth: 4,
    borderRightColor: 'transparent', borderTopColor: '#8A2607', opacity: 0.6,
  },
  dealInfo: { padding: SPACING.sm },
  dealName: { fontSize: FONTS.sm, fontWeight: FONTS.medium, color: COLORS.textPrimary, lineHeight: 17, marginBottom: 5, minHeight: 34 },
  dealPrice: { fontSize: FONTS.base, fontWeight: FONTS.extraBold, color: COLORS.textPrimary, letterSpacing: FONTS.trackTight, marginBottom: 4 },
  dealTimerPill: {
    alignSelf: 'flex-start', backgroundColor: COLORS.dangerLight,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.sm,
  },
  dealTimerText: { fontSize: 10.5, color: COLORS.dangerText, fontWeight: FONTS.bold },

  // ── All products header ──
  allProductsHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.divider,
  },
  productCountPill: { backgroundColor: COLORS.surfaceSunken, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  productCount: { fontSize: FONTS.xs, color: COLORS.textSecondary, fontWeight: FONTS.semiBold },

  // ── Masonry grid ──
  scrollContent: { paddingBottom: 90 },
  masonryRow: { flexDirection: 'row', paddingHorizontal: SPACING.base, gap: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.sm, backgroundColor: COLORS.surface },
  masonryColumn: { flex: 1, gap: SPACING.base },
  masonryCard: { width: '100%' },
  feedBanner: { marginHorizontal: SPACING.base, marginVertical: SPACING.sm },

  loadingMore: { padding: SPACING.xl, alignItems: 'center' },
  loadingMoreText: { fontSize: FONTS.sm, color: COLORS.textMuted },

  // ── Toast ──
  toast: {
    position: 'absolute', bottom: 24, alignSelf: 'center',
    backgroundColor: 'rgba(18,22,43,0.92)', borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.base + 4, paddingVertical: SPACING.sm + 2,
  },
  toastText: { color: 'white', fontSize: FONTS.sm, fontWeight: FONTS.semiBold },
});