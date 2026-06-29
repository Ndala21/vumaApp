/**
 * VUMA Store — Home Screen Upgraded
 * Recently Viewed, Recommendations, Trending, Daily Deals, Coupons
 */

import { t } from '../../i18n';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, Dimensions, StatusBar, Platform, Animated, Image,
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
import { SkeletonProductGrid } from '../../components/common/Loading';
import { EmptyState } from '../../components/common/ErrorMessage';
import { productsAPI } from '../../api/products';

const { width } = Dimensions.get('window');
const NUM_COLUMNS = 2;

export default function HomeScreen({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
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
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [trending, setTrending] = useState([]);
  const [dailyDeals, setDailyDeals] = useState([]);
  const scrollY = useRef(new Animated.Value(0)).current;

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
      const [trendingData, dealsData] = await Promise.all([
        productsAPI.getTrending().catch(() => []),
        productsAPI.getDailyDeals().catch(() => []),
      ]);
      setTrending(trendingData?.results || trendingData || []);
      setDailyDeals(dealsData?.results || dealsData || []);

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

  const handleCategorySelect = useCallback((slug) => {
    setActiveCategory(slug);
    dispatch(resetProducts());
    dispatch(fetchProducts({ page: 1, category: slug, refresh: true }));
  }, []);

  const handleProductPress = useCallback((product) => {
    // Track view
    if (isAuthenticated) {
      productsAPI.trackView(product.id).catch(() => {});
    }
    navigation.navigate(SCREENS.PRODUCT_DETAIL, { productId: product.id, product });
  }, [isAuthenticated]);

  const handleSearchSubmit = (query) => navigation.navigate(SCREENS.SEARCH, { query });

  const allCategories = [
    { id: 'all', label: t('common.all'), icon: '🏠', slug: '' },
    ...CATEGORIES.filter((c) => c.id !== 'all'),
  ];

  // ── Product Row ──────────────────────────────────
  const HorizontalProductRow = ({ title, data, icon, onSeeAll }) => {
    if (!data || data.length === 0) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{icon} {title}</Text>
          {onSeeAll && (
            <TouchableOpacity onPress={onSeeAll}>
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
          {data.slice(0, 8).map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              variant="featured"
              onPress={() => handleProductPress(product)}
              style={styles.featuredCard}
            />
          ))}
        </ScrollView>
      </View>
    );
  };

  // ── Daily Deal Card ──────────────────────────────
  const DealCard = ({ deal }) => {
    const timeLeft = deal.deal_ends_at ? secondsUntil(deal.deal_ends_at) : 0;
    return (
      <TouchableOpacity
        style={styles.dealCard}
        onPress={() => handleProductPress(deal)}
        activeOpacity={0.85}
      >
        {deal.primary_image ? (
          <Image source={{ uri: deal.primary_image }} style={styles.dealImage} resizeMode="cover" />
        ) : (
          <View style={[styles.dealImage, { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceAlt }]}>
            <Text style={{ fontSize: 40 }}>📦</Text>
          </View>
        )}
        <View style={styles.dealBadge}>
          <Text style={styles.dealBadgeText}>-{deal.deal_discount || deal.discount_percent}%</Text>
        </View>
        <View style={styles.dealInfo}>
          <Text style={styles.dealName} numberOfLines={2}>{deal.name}</Text>
          <Text style={styles.dealPrice}>{formatPrice(deal.deal_price || deal.price)}</Text>
          {timeLeft > 0 && (
            <Text style={styles.dealTimer}>⏰ {formatCountdown(timeLeft)}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View>
      {/* Promo Banner */}
      <View style={styles.promoBanner}>
        <Text style={styles.promoText}>
          🔥 Best prices guaranteed — Free shipping on all orders!
        </Text>
      </View>

      {/* Flash Sale */}
      {flashSale?.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.flashTitleRow}>
              <Text style={styles.sectionTitle}>⚡ {t('home.flashSale')}</Text>
              {flashCountdown > 0 && (
                <View style={styles.countdownBadge}>
                  <Text style={styles.countdownText}>⏰ {formatCountdown(flashCountdown)}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={() => navigation.navigate(SCREENS.PRODUCT_LIST || 'ProductList', { flash_sale: true })}>
              <Text style={styles.seeAll}>{t('common.seeAll')} →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {flashSale.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} variant="featured" onPress={() => handleProductPress(product)} style={styles.featuredCard} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Daily Deals */}
      {dailyDeals.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🔥 Daily Deals</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {dailyDeals.map((deal, i) => <DealCard key={deal.id || i} deal={deal} />)}
          </ScrollView>
        </View>
      )}

      {/* Trending */}
      <HorizontalProductRow
        title="Trending Now"
        icon="📈"
        data={trending}
      />

      {/* Recommendations (logged in only) */}
      {isAuthenticated && recommendations.length > 0 && (
        <HorizontalProductRow
          title="Recommended for You"
          icon="⭐"
          data={recommendations}
        />
      )}

      {/* Featured */}
      {featured?.length > 0 && (
        <HorizontalProductRow
          title={t('home.featured')}
          icon="🏆"
          data={featured}
        />
      )}

      {/* Recently Viewed (logged in only) */}
      {isAuthenticated && recentlyViewed.length > 0 && (
        <HorizontalProductRow
          title="Recently Viewed"
          icon="👁"
          data={recentlyViewed}
        />
      )}

      {/* All Products Header */}
      <View style={styles.allProductsHeader}>
        <Text style={styles.sectionTitle}>
          🛍️ {activeCategory
            ? allCategories.find((c) => c.slug === activeCategory)?.label || t('home.allProducts')
            : t('home.allProducts')}
        </Text>
        <Text style={styles.productCount}>{products.length} items</Text>
      </View>
    </View>
  );

  const ListFooter = () => loading.loadingMore ? (
    <View style={styles.loadingMore}>
      <Text style={styles.loadingMoreText}>{t('common.loading')}</Text>
    </View>
  ) : null;

  const ListEmpty = () => {
    if (loading.products) return <SkeletonProductGrid count={6} />;
    return (
      <EmptyState
        icon="🛍️"
        title={t('common.noResults')}
        message={activeCategory ? 'No products in this category yet.' : 'Check back soon!'}
        actionLabel={activeCategory ? t('home.allProducts') : null}
        onAction={activeCategory ? () => handleCategorySelect('') : null}
      />
    );
  };

  const renderProduct = useCallback(({ item, index }) => (
    <View style={[styles.productItemWrap, index % 2 === 0 ? styles.productLeft : styles.productRight]}>
      <ProductCard product={item} variant="grid" onPress={() => handleProductPress(item)} style={styles.productCard} />
    </View>
  ), []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      <View style={styles.topBar}>
        <Text style={styles.topLogo}>VUMA</Text>
        <View style={styles.topSearch}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmit={handleSearchSubmit}
            placeholder="Search products..."
            showHistory={false}
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

      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id?.toString()}
        numColumns={NUM_COLUMNS}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={ListEmpty}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
        contentContainerStyle={styles.flatListContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={6}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, paddingHorizontal: SPACING.sm, paddingTop: Platform.OS === 'ios' ? SPACING['3xl'] : SPACING.xl, paddingBottom: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.divider, gap: SPACING.sm, ...SHADOWS.sm },
  topLogo: { fontSize: FONTS['2xl'], fontWeight: FONTS.black, color: COLORS.primary, letterSpacing: -1 },
  topSearch: { flex: 1 },
  searchBar: { paddingHorizontal: 0, paddingVertical: 0 },
  topIcons: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  iconBtn: { position: 'relative', padding: SPACING.xs },
  topIcon: { fontSize: 22 },
  iconBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, borderWidth: 1.5, borderColor: COLORS.surface },
  iconBadgeText: { color: COLORS.textWhite, fontSize: 8, fontWeight: FONTS.bold },
  promoBanner: { backgroundColor: COLORS.primary, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.base },
  promoText: { color: COLORS.textWhite, fontSize: FONTS.sm, fontWeight: FONTS.semiBold, textAlign: 'center' },
  section: { backgroundColor: COLORS.surface, marginBottom: SPACING.sm, paddingVertical: SPACING.base },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.base, marginBottom: SPACING.sm },
  flashTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  sectionTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  seeAll: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.semiBold },
  countdownBadge: { backgroundColor: COLORS.flashSale, borderRadius: RADIUS.md, paddingHorizontal: SPACING.sm, paddingVertical: 2 },
  countdownText: { color: COLORS.textWhite, fontSize: FONTS.xs, fontWeight: FONTS.bold },
  horizontalList: { paddingHorizontal: SPACING.base, gap: SPACING.sm },
  featuredCard: { width: 170, height: 210 },
  // Daily Deal Card
  dealCard: { width: 160, borderRadius: RADIUS.xl, overflow: 'hidden', backgroundColor: COLORS.surface, ...SHADOWS.md, marginRight: SPACING.sm },
  dealImage: { width: '100%', height: 120 },
  dealBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: COLORS.danger, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  dealBadgeText: { color: 'white', fontSize: FONTS.xs, fontWeight: FONTS.bold },
  dealInfo: { padding: SPACING.sm },
  dealName: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textPrimary, lineHeight: 16, marginBottom: 4 },
  dealPrice: { fontSize: FONTS.base, fontWeight: FONTS.black, color: COLORS.primary, marginBottom: 2 },
  dealTimer: { fontSize: FONTS.xs, color: COLORS.danger, fontWeight: FONTS.semiBold },
  flatListContent: { paddingBottom: 90 },
  allProductsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  productCount: { fontSize: FONTS.sm, color: COLORS.textMuted },
  productItemWrap: { flex: 1, padding: SPACING.xs },
  productLeft: { paddingLeft: SPACING.sm, paddingRight: SPACING.xs },
  productRight: { paddingLeft: SPACING.xs, paddingRight: SPACING.sm },
  productCard: { flex: 1 },
  loadingMore: { padding: SPACING.xl, alignItems: 'center' },
  loadingMoreText: { fontSize: FONTS.sm, color: COLORS.textMuted },
});