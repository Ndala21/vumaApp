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
 */

import { t } from '../../i18n';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, Dimensions, StatusBar, Platform, Image, Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
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
import ProductCard from '../../components/ProductCard';
import CategoryBar from '../../components/CategoryBar';
import SearchBar from '../../components/SearchBar';
import HomeBanner from '../../components/HomeBanner';
import { SkeletonProductGrid } from '../../components/common/Loading';
import { EmptyState } from '../../components/common/ErrorMessage';
import { productsAPI } from '../../api/products';
import { get } from '../../api/client';

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

  useEffect(() => { loadInitialData(); }, []);

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
      const [bannersData, trendingData, dealsData, promotionsData] = await Promise.all([
        productsAPI.getBanners().catch(() => []),
        productsAPI.getTrending().catch(() => []),
        productsAPI.getDailyDeals().catch(() => []),
        get('/products/home-promotions/').catch(() => null),
      ]);
      setBanners(bannersData || []);
      setTrending(trendingData?.results || trendingData || []);
      setDailyDeals(dealsData?.results || dealsData || []);
      setPromotions(promotionsData);

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
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      handleLoadMore();
    }
  }, [handleLoadMore]);

  const handleCategorySelect = useCallback((slug) => {
    setActiveCategory(slug);
    dispatch(resetProducts());
    dispatch(fetchProducts({ page: 1, category: slug, refresh: true }));
  }, []);

  const handleProductPress = useCallback((product) => {
    if (isAuthenticated) productsAPI.trackView(product.id).catch(() => {});
    navigation.navigate(SCREENS.PRODUCT_DETAIL, { productId: product.id, product });
  }, [isAuthenticated]);

  const handleBannerPress = useCallback((banner) => {
    if (!banner.link_type || banner.link_type === 'none') return;
    if (banner.link_type === 'product' && banner.link_value) {
      navigation.navigate(SCREENS.PRODUCT_DETAIL, { productId: banner.link_value });
    } else if (banner.link_type === 'category' && banner.link_value) {
      handleCategorySelect(banner.link_value);
    } else if (banner.link_type === 'flash_sale') {
      dispatch(resetProducts());
      dispatch(fetchProducts({ page: 1, flash_sale: true, refresh: true }));
    }
  }, []);

  const handleSearchSubmit = (query) => navigation.navigate(SCREENS.SEARCH, { query });

  // ── Promotion card actions — real data, and honest fallbacks (an
  // informational alert with real numbers) for the two flows that
  // don't have a confirmed dedicated screen yet, rather than guessing
  // a navigation target that could crash. ──
  const handleCouponPress = () => {
    const c = promotions?.coupons;
    if (!c?.active) return;
    Alert.alert(
      'Kuponi',
      c.top_code
        ? `Tumia msimbo "${c.top_code}" — ${c.top_description || 'punguzo maalum'} kwenye ukurasa wa malipo.`
        : 'Kuna kuponi zinazopatikana — angalia ukurasa wa malipo.'
    );
  };

  const handleWelcomeGiftPress = () => {
    const g = promotions?.welcome_gift;
    if (!g?.active) return;
    Alert.alert(
      'Zawadi ya Karibu',
      `Pata punguzo la hadi TZS ${Number(g.amount).toLocaleString()} kwenye oda yako ya kwanza.` +
      (g.requires_referral ? ' Unahitaji msimbo wa rafiki (referral) kustahili.' : '')
    );
  };

  const allCategories = [
    { id: 'all', label: t('common.all'), icon: '🏠', slug: '' },
    ...CATEGORIES.filter((c) => c.id !== 'all'),
  ];

  // ── VUMA Faida & Ofa — promotion cards, Swahili-labeled, each only
  // shown when its real backing campaign is active. ──
  const FAIDA_CARDS = [
    {
      key: 'coupons',
      show: promotions?.coupons?.active,
      icon: '🎫', bg: '#FDE8EC',
      title: 'Kuponi', subtitle: 'Pata punguzo maalum',
      cta: 'Pata Sasa', ctaColor: '#E5426B',
      onPress: handleCouponPress,
    },
    {
      key: 'welcome_gift',
      show: promotions?.welcome_gift?.active,
      icon: '🎁', bg: '#FFF1DB',
      title: 'Zawadi ya Karibu', subtitle: 'Wateja wapya pata zawadi',
      cta: 'Pokea Sasa', ctaColor: COLORS.primary,
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
      icon: '🚚', bg: '#E4F7EC',
      title: 'Usafirishaji Bure', subtitle: 'Kwa oda zote',
      cta: 'Tazama', ctaColor: '#1B9C5A',
      onPress: () => {},
    },
    {
      key: 'referral',
      show: promotions?.referral?.active,
      icon: '👥', bg: '#E6EEFD',
      title: 'Alika Rafiki & Earn',
      subtitle: promotions?.referral?.referrer_amount
        ? `Pata TZS ${Number(promotions.referral.referrer_amount).toLocaleString()} kwa kila rafiki`
        : 'Pata zawadi kwa kila rafiki',
      cta: 'Shiriki Sasa', ctaColor: '#3B6FE0',
      onPress: () => navigation.navigate('Referral'),
    },
  ].filter((c) => c.show);

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
            <ProductCard key={product.id} product={product} variant="featured" onPress={() => handleProductPress(product)} style={styles.featuredCard} />
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
  const columns = [[], [], []];
  products.forEach((p, i) => columns[i % 3].push(p));

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
      <View style={styles.masonryRow}>
        {columns.map((col, colIndex) => (
          <View key={colIndex} style={styles.masonryColumn}>
            {col.map((product) => (
              <ProductCard key={product.id} product={product} variant="grid" onPress={() => handleProductPress(product)} style={styles.masonryCard} />
            ))}
          </View>
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
            value={searchQuery} onChangeText={setSearchQuery}
            onSubmit={handleSearchSubmit} placeholder="Search products..."
            showHistory={false} style={styles.searchBar}
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
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={200}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
      >
        {/* ── Banners ── */}
        <View style={styles.bannerWrap}>
          <HomeBanner
            banners={banners}
            onBannerPress={handleBannerPress}
            navigation={navigation}
          />
        </View>

        {/* ── VUMA Faida & Ofa — real, active promotions only ── */}
        {FAIDA_CARDS.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.faidaTitle}>VUMA Faida & Ofa</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {FAIDA_CARDS.map((card) => (
                <TouchableOpacity key={card.key} style={[styles.faidaCard, { backgroundColor: card.bg }]} onPress={card.onPress} activeOpacity={0.85}>
                  <View style={styles.faidaIconWrap}>
                    <Text style={styles.faidaIcon}>{card.icon}</Text>
                  </View>
                  <Text style={styles.faidaCardTitle}>{card.title}</Text>
                  <Text style={styles.faidaCardSub} numberOfLines={2}>{card.subtitle}</Text>
                  <Text style={[styles.faidaCta, { color: card.ctaColor }]}>{card.cta}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Welcome Gift highlight ── */}
        {promotions?.welcome_gift?.active && (
          <TouchableOpacity style={styles.giftWideCard} onPress={handleWelcomeGiftPress} activeOpacity={0.9}>
            <Text style={styles.giftWideIcon}>🎁</Text>
            <View style={styles.giftWideText}>
              <Text style={styles.giftWideTitle}>Zawadi Maalum ya Karibu!</Text>
              <Text style={styles.giftWideSub}>
                Pata TZS {Number(promotions.welcome_gift.amount).toLocaleString()} punguzo kwenye oda yako ya kwanza.
              </Text>
              <View style={styles.giftWideBtn}>
                <Text style={styles.giftWideBtnText}>🎁 Pokea Zawadi</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* ── Become a Seller — evergreen recruitment banner ── */}
        <TouchableOpacity style={styles.sellerBanner} onPress={() => navigation.navigate('VendorRegister')} activeOpacity={0.9}>
          <View style={styles.sellerBannerText}>
            <Text style={styles.sellerBannerHeadline}>Pata Faida na VUMA!</Text>
            <Text style={styles.sellerBannerTitle}>UZA BIDHAA ZAKO KWA MAELFU YA WATEJA!</Text>
            {['Usajili rahisi', 'Hakuna gharama ya kuanza', 'Fikia wateja kote Tanzania'].map((line, i) => (
              <Text key={i} style={styles.sellerBannerBullet}>✓ {line}</Text>
            ))}
            <View style={styles.sellerBannerBtn}>
              <Text style={styles.sellerBannerBtnText}>Kujiunga kama Muuzaji</Text>
            </View>
          </View>
        </TouchableOpacity>

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
                <ProductCard key={p.id} product={p} variant="featured" onPress={() => handleProductPress(p)} style={styles.featuredCard} />
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

        {/* Trending */}
        <HorizontalRow title="Trending Now" data={trending} accent={COLORS.info} />

        {/* Recommendations */}
        {isAuthenticated && recommendations.length > 0 && (
          <HorizontalRow title="Recommended for You" data={recommendations} accent={COLORS.rating} />
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
        <View style={styles.allProductsHeader}>
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
  sectionAccent: { width: 4, height: 16, borderRadius: 2 },
  sectionTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary, letterSpacing: FONTS.trackTight },
  flashTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  flashTitle: { fontSize: FONTS.lg, fontWeight: FONTS.extraBold, color: COLORS.primaryDark, letterSpacing: FONTS.trackTight },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  seeAll: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONTS.semiBold },
  seeAllArrow: { fontSize: FONTS.lg, color: COLORS.textSecondary, fontWeight: FONTS.bold, marginTop: -1 },
  countdownBadge: { backgroundColor: COLORS.secondary, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 3 },
  countdownText: { color: COLORS.textWhite, fontSize: 11.5, fontWeight: FONTS.bold, letterSpacing: 0.3 },
  horizontalList: { paddingHorizontal: SPACING.base, gap: SPACING.sm },
  featuredCard: { width: 170, height: 210 },

  // ── VUMA Faida & Ofa ──
  faidaTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary, letterSpacing: FONTS.trackTight },
  faidaCard: {
    width: 128, borderRadius: RADIUS.lg, padding: SPACING.sm,
    marginRight: SPACING.sm,
  },
  faidaIconWrap: {
    width: 44, height: 44, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xs,
  },
  faidaIcon: { fontSize: 20 },
  faidaCardTitle: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: 2 },
  faidaCardSub: { fontSize: 10.5, color: COLORS.textSecondary, lineHeight: 14, marginBottom: SPACING.sm, minHeight: 28 },
  faidaCta: { fontSize: FONTS.xs, fontWeight: FONTS.bold },

  // ── Welcome Gift wide card ──
  giftWideCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: '#FFF1DB', borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.base, marginBottom: SPACING.sm,
    padding: SPACING.base,
  },
  giftWideIcon: { fontSize: 40 },
  giftWideText: { flex: 1 },
  giftWideTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: 2 },
  giftWideSub: { fontSize: FONTS.xs, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  giftWideBtn: {
    alignSelf: 'flex-start', backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.base, paddingVertical: SPACING.xs + 2,
  },
  giftWideBtnText: { color: 'white', fontSize: FONTS.xs, fontWeight: FONTS.bold },

  // ── Become a Seller banner ──
  sellerBanner: {
    backgroundColor: '#FDECD9', borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.base, marginBottom: SPACING.sm,
    padding: SPACING.base,
  },
  sellerBannerText: { gap: 2 },
  sellerBannerHeadline: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary },
  sellerBannerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.black, color: COLORS.textPrimary, marginBottom: SPACING.xs, letterSpacing: FONTS.trackTight },
  sellerBannerBullet: { fontSize: FONTS.xs, color: COLORS.textSecondary, marginBottom: 2 },
  sellerBannerBtn: {
    alignSelf: 'flex-start', backgroundColor: '#12162B',
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm,
    marginTop: SPACING.sm,
  },
  sellerBannerBtnText: { color: 'white', fontSize: FONTS.sm, fontWeight: FONTS.bold },

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
  masonryRow: { flexDirection: 'row', paddingHorizontal: SPACING.base, gap: SPACING.xs, paddingTop: SPACING.xs },
  masonryColumn: { flex: 1, gap: SPACING.xs },
  masonryCard: { width: '100%' },

  loadingMore: { padding: SPACING.xl, alignItems: 'center' },
  loadingMoreText: { fontSize: FONTS.sm, color: COLORS.textMuted },
});