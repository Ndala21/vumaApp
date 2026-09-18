/**
 * VUMA Store — Product List Screen
 * Search results, category listings, filtered products
 * Updated: added Now Trending and Inspired by Your Recent Searches
 * above the results grid - real backend engines via the shared
 * RecommendationSection component, self-hiding when there's no real
 * data (e.g. Inspired by Recent Searches for a guest with no history).
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
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  StatusBar,
  Platform,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchProducts,
  searchProducts,
  selectProducts,
  selectSearchResults,
  selectSearchQuery,
  selectSearchHasMore,
  selectProductsLoading,
  selectProductsErrors,
  selectHasNextPage,
  selectCurrentPage,
  setFilters,
  resetFilters,
  selectFilters,
  clearSearch,
  resetProducts,
} from '../../store/productSlice';
import { addToCartAndSave } from '../../store/cartSlice';
import { selectIsAuthenticated } from '../../store/authSlice';
import {
  COLORS,
  FONTS,
  SPACING,
  RADIUS,
  SCREENS,
  SHADOWS,
} from '../../utils/constants';
import { formatPrice } from '../../utils/helpers';
import ProductCard from '../../components/ProductCard';
import SearchBar from '../../components/SearchBar';
import RecommendationSection from '../../components/RecommendationSection';
import FeedBanner from '../../components/FeedBanner';
import {
  SkeletonProductGrid,
} from '../../components/common/Loading';
import {
  EmptyState,
  FullScreenError,
} from '../../components/common/ErrorMessage';
import Button from '../../components/common/Button';
import { get } from '../../api/client';

const SORT_OPTIONS = [
  { label: 'Newest', value: '-created_at' },
  { label: 'Price: Low → High', value: 'price' },
  { label: 'Price: High → Low', value: '-price' },
  { label: 'Best Rated', value: '-rating_avg' },
  { label: 'Most Sold', value: '-sales_count' },
];

export default function ProductListScreen({
  navigation,
  route,
}) {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // Route params
  const {
    query: initialQuery = '',
    category: initialCategory = '',
    featured: initialFeatured = false,
    flash_sale: initialFlashSale = false,
    title: screenTitle = '',
  } = route?.params || {};

  // Redux
  const products = useSelector(selectProducts);
  const searchResults = useSelector(selectSearchResults);
  const searchQuery = useSelector(selectSearchQuery);
  const searchHasMore = useSelector(selectSearchHasMore);
  const loading = useSelector(selectProductsLoading);
  const errors = useSelector(selectProductsErrors);
  const hasNextPage = useSelector(selectHasNextPage);
  const currentPage = useSelector(selectCurrentPage);
  const filters = useSelector(selectFilters);

  // Local state
  const [query, setQuery] = useState(initialQuery);
  const [isSearchMode, setIsSearchMode] =
    useState(!!initialQuery);
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [tempFilters, setTempFilters] = useState({
    minPrice: '',
    maxPrice: '',
    ordering: '-created_at',
  });
  const [refreshing, setRefreshing] = useState(false);
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    const params = initialCategory ? { category: initialCategory } : {};
    get('/products/banners/', params).then((d) => setBanners(Array.isArray(d) ? d : (d?.results || []))).catch(() => setBanners([]));
  }, [initialCategory]);

  // Data to display
  const displayData = isSearchMode ? searchResults : products;
  const displayHasMore = isSearchMode
    ? searchHasMore
    : hasNextPage;
  const isLoading = isSearchMode
    ? loading.search
    : loading.products;

  // ── Init ────────────────────────────────────────────
  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    } else {
      loadProducts(true);
    }
    return () => {
      dispatch(clearSearch());
      dispatch(resetProducts());
    };
  }, []);

  // ── Load Products ────────────────────────────────────
  const loadProducts = useCallback(
    (reset = false) => {
      if (reset) dispatch(resetProducts());
      dispatch(
        fetchProducts({
          page: reset ? 1 : currentPage,
          category: initialCategory,
          featured: initialFeatured,
          flash_sale: initialFlashSale,
          ordering: tempFilters.ordering,
          min_price: tempFilters.minPrice,
          max_price: tempFilters.maxPrice,
          refresh: reset,
        })
      );
    },
    [
      initialCategory,
      initialFeatured,
      initialFlashSale,
      tempFilters,
      currentPage,
    ]
  );

  const handleSearch = useCallback(
    (searchText, page = 1) => {
      setQuery(searchText || '');
      if (!searchText?.trim()) {
        setIsSearchMode(false);
        loadProducts(true);
        return;
      }
      setIsSearchMode(true);
      dispatch(searchProducts({ q: searchText, page }));
    },
    [loadProducts]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (isSearchMode && query) {
      await dispatch(
        searchProducts({ q: query, page: 1 })
      );
    } else {
      await loadProducts(true);
    }
    setRefreshing(false);
  }, [isSearchMode, query, loadProducts]);

  const handleLoadMore = useCallback(() => {
    if (loading.loadingMore || loading.search || !displayHasMore)
      return;
    if (isSearchMode) {
      const nextPage =
        searchResults.length / 20 + 1;
      handleSearch(query, Math.floor(nextPage));
    } else {
      dispatch(
        fetchProducts({
          page: currentPage + 1,
          category: initialCategory,
          ordering: tempFilters.ordering,
          min_price: tempFilters.minPrice,
          max_price: tempFilters.maxPrice,
        })
      );
    }
  }, [
    loading,
    displayHasMore,
    isSearchMode,
    query,
    currentPage,
    tempFilters,
  ]);

  // Replaces FlatList's onEndReached - the grid is now rendered as
  // chunked Views (to allow real full-width banners between chunks),
  // so infinite scroll is triggered manually near the bottom instead,
  // matching the same pattern already used on Home.
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

  const handleApplyFilters = () => {
    setShowFilters(false);
    dispatch(resetProducts());
    dispatch(
      fetchProducts({
        page: 1,
        category: initialCategory,
        ordering: tempFilters.ordering,
        min_price: tempFilters.minPrice,
        max_price: tempFilters.maxPrice,
        refresh: true,
      })
    );
  };

  const handleResetFilters = () => {
    setTempFilters({
      minPrice: '',
      maxPrice: '',
      ordering: '-created_at',
    });
  };

  const handleProductPress = (product) => {
    navigation.navigate(SCREENS.PRODUCT_DETAIL, {
      productId: product.id,
      product,
    });
  };

  // ── Active filter count ──────────────────────────────
  const activeFilterCount = [
    tempFilters.minPrice,
    tempFilters.maxPrice,
  ].filter(Boolean).length;

  // ── Screen title ─────────────────────────────────────
  const getTitle = () => {
    if (screenTitle) return screenTitle;
    if (isSearchMode && query) return `"${query}"`;
    if (initialFeatured) return '⭐ Featured';
    if (initialFlashSale) return '⚡ Flash Sale';
    if (initialCategory)
      return initialCategory
        .split('_')
        .map(
          (w) => w.charAt(0).toUpperCase() + w.slice(1)
        )
        .join(' ');
    return 'All Products';
  };

  // ── Filter Modal ──────────────────────────────────────
  const FilterModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      transparent
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              🔧 Filters
            </Text>
            <TouchableOpacity
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
          >
            {/* Price Range */}
            <Text style={styles.filterLabel}>
              💰 Price Range
            </Text>
            <View style={styles.priceRow}>
              <TextInput
                style={styles.priceInput}
                placeholder="Min ₩"
                value={tempFilters.minPrice}
                onChangeText={(v) =>
                  setTempFilters((p) => ({
                    ...p,
                    minPrice: v,
                  }))
                }
                keyboardType="numeric"
                placeholderTextColor={COLORS.textLight}
              />
              <Text style={styles.priceSeparator}>—</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="Max ₩"
                value={tempFilters.maxPrice}
                onChangeText={(v) =>
                  setTempFilters((p) => ({
                    ...p,
                    maxPrice: v,
                  }))
                }
                keyboardType="numeric"
                placeholderTextColor={COLORS.textLight}
              />
            </View>

            {/* Sort */}
            <Text style={styles.filterLabel}>
              📊 Sort By
            </Text>
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.sortOption,
                  tempFilters.ordering === opt.value &&
                    styles.sortOptionActive,
                ]}
                onPress={() =>
                  setTempFilters((p) => ({
                    ...p,
                    ordering: opt.value,
                  }))
                }
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    tempFilters.ordering === opt.value &&
                      styles.sortOptionTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
                {tempFilters.ordering === opt.value && (
                  <Text style={styles.sortCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Actions */}
          <View style={styles.filterActions}>
            <Button
              title="Reset"
              variant="outlineSecondary"
              onPress={handleResetFilters}
              style={styles.filterResetBtn}
            />
            <Button
              title="Apply Filters"
              onPress={handleApplyFilters}
              style={styles.filterApplyBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  // ── List Components ───────────────────────────────────
  // Now Trending / Inspired by Your Recent Searches sit above the
  // results grid, self-hiding when there's no real data (e.g. a guest
  // with no search history) - real backend engines, not fabricated.
  const ListHeader = () => (
    <View>
      <RecommendationSection title="Now Trending" endpoint="/promotions/trending/" navigation={navigation} />
      {isAuthenticated && (
        <RecommendationSection title="Inspired by Your Recent Searches" endpoint="/promotions/search-inspired/" navigation={navigation} />
      )}
      {displayData.length > 0 && (
        <View style={styles.listHeader}>
          <Text style={styles.resultsCount}>
            {displayData.length} products
          </Text>
          <TouchableOpacity
            style={styles.sortBtn}
            onPress={() => setShowSort(!showSort)}
          >
            <Text style={styles.sortBtnText}>
              Sort:{' '}
              {SORT_OPTIONS.find(
                (s) => s.value === tempFilters.ordering
              )?.label || 'Newest'}
            </Text>
            <Text>▾</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const ListFooter = () => {
    if (!loading.loadingMore && !loading.search) {
      return null;
    }
    return (
      <View style={styles.loadingMore}>
        <Text style={styles.loadingMoreText}>
          Loading...
        </Text>
      </View>
    );
  };

  const ListEmpty = () => {
    if (isLoading) return <SkeletonProductGrid count={6} />;
    if (errors.products || errors.search) {
      return (
        <FullScreenError
          error={errors.products || errors.search}
          onRetry={handleRefresh}
        />
      );
    }
    return (
      <EmptyState
        icon="🔍"
        title={
          isSearchMode
            ? 'No results found'
            : 'No products yet'
        }
        message={
          isSearchMode
            ? `No products match "${query}"`
            : 'Check back soon!'
        }
        actionLabel={
          isSearchMode ? 'Clear search' : null
        }
        onAction={
          isSearchMode
            ? () => {
                setQuery('');
                setIsSearchMode(false);
                loadProducts(true);
              }
            : null
        }
      />
    );
  };

  // Real fallback recommendations shown specifically when a search
  // returns zero results - reuses the same real backend engine, not
  // fabricated "similar" results.
  const ListEmptyFooter = () => {
    if (isLoading || errors.products || errors.search || !isSearchMode) return null;
    return (
      <RecommendationSection
        title="You Might Like"
        endpoint="/promotions/recommendations/"
        navigation={navigation}
      />
    );
  };

  // ── Render ────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.surface}
      />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <View style={styles.searchWrap}>
          <SearchBar
            onSearch={(q) => {
              handleSearch(q);
            }}
            placeholder={
              initialCategory
                ? `Search in ${initialCategory}...`
                : '🔍  Search products...'
            }
            showHistory
            style={styles.searchBarStyle}
          />
        </View>

        {/* Filter Button */}
        <TouchableOpacity
          style={[
            styles.filterBtn,
            activeFilterCount > 0 &&
              styles.filterBtnActive,
          ]}
          onPress={() => setShowFilters(true)}
        >
          <Text style={styles.filterIcon}>⚙️</Text>
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>
                {activeFilterCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Screen Title */}
      {!isSearchMode && (
        <View style={styles.titleBar}>
          <Text style={styles.screenTitle}>
            {getTitle()}
          </Text>
        </View>
      )}

      {/* Sort Dropdown */}
      {showSort && (
        <View style={styles.sortDropdown}>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.sortDropItem,
                tempFilters.ordering === opt.value &&
                  styles.sortDropItemActive,
              ]}
              onPress={() => {
                setTempFilters((p) => ({
                  ...p,
                  ordering: opt.value,
                }));
                setShowSort(false);
                dispatch(resetProducts());
                dispatch(
                  fetchProducts({
                    page: 1,
                    category: initialCategory,
                    ordering: opt.value,
                    min_price: tempFilters.minPrice,
                    max_price: tempFilters.maxPrice,
                    refresh: true,
                  })
                );
              }}
            >
              <Text
                style={[
                  styles.sortDropText,
                  tempFilters.ordering === opt.value &&
                    styles.sortDropTextActive,
                ]}
              >
                {opt.label}
              </Text>
              {tempFilters.ordering === opt.value && (
                <Text style={styles.sortCheck}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Product Grid */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={200}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        contentContainerStyle={styles.gridContent}
      >
        <ListHeader />
        {displayData.length === 0 ? (
          <>
            <ListEmpty />
            <ListEmptyFooter />
          </>
        ) : (
          (() => {
            const CHUNK_SIZE = 9;
            const chunks = [];
            for (let i = 0; i < displayData.length; i += CHUNK_SIZE) {
              chunks.push(displayData.slice(i, i + CHUNK_SIZE));
            }
            return chunks.map((chunk, chunkIndex) => {
              const cols = [[], [], []];
              chunk.forEach((p, i) => cols[i % 3].push(p));
              return (
                <React.Fragment key={chunkIndex}>
                  <View style={styles.masonryRow}>
                    {cols.map((col, colIndex) => (
                      <View key={colIndex} style={styles.masonryColumn}>
                        {col.map((product) => (
                          <ProductCard
                            key={product.id} product={product} variant="grid"
                            onPress={() => handleProductPress(product)}
                            style={styles.masonryCard}
                          />
                        ))}
                      </View>
                    ))}
                  </View>
                  {banners.length > 0 && (
                    <FeedBanner
                      banner={banners[chunkIndex % banners.length]}
                      navigation={navigation}
                      style={styles.feedBanner}
                    />
                  )}
                </React.Fragment>
              );
            });
          })()
        )}
        <ListFooter />
      </ScrollView>

      <FilterModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ── Top Bar ──────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm,
    paddingTop:
      Platform.OS === 'ios' ? SPACING['3xl'] : SPACING.base,
    paddingBottom: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    gap: SPACING.xs,
  },
  backBtn: {
    padding: SPACING.xs,
  },
  backIcon: {
    fontSize: FONTS.xl,
    color: COLORS.textPrimary,
    fontWeight: FONTS.bold,
  },
  searchWrap: {
    flex: 1,
  },
  searchBarStyle: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  filterBtn: {
    padding: SPACING.sm,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  filterBtnActive: {
    backgroundColor: COLORS.primaryFade,
    borderColor: COLORS.primary,
  },
  filterIcon: {
    fontSize: 20,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: COLORS.textWhite,
    fontSize: 9,
    fontWeight: FONTS.bold,
  },

  // ── Title Bar ────────────────────────────────────────
  titleBar: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  screenTitle: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },

  // ── List Header ──────────────────────────────────────
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  resultsCount: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortBtnText: {
    fontSize: FONTS.sm,
    color: COLORS.primary,
    fontWeight: FONTS.semiBold,
  },

  // ── Sort Dropdown ────────────────────────────────────
  sortDropdown: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    ...SHADOWS.sm,
  },
  sortDropItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  sortDropItemActive: {
    backgroundColor: COLORS.primaryFade,
  },
  sortDropText: {
    fontSize: FONTS.base,
    color: COLORS.textSecondary,
  },
  sortDropTextActive: {
    color: COLORS.primary,
    fontWeight: FONTS.bold,
  },
  sortCheck: {
    fontSize: FONTS.base,
    color: COLORS.primary,
    fontWeight: FONTS.bold,
  },

  // ── Product Grid ─────────────────────────────────────
  gridContent: {
    paddingBottom: 100,
  },
  masonryRow: { flexDirection: 'row', paddingHorizontal: SPACING.sm, gap: SPACING.xs, paddingTop: SPACING.xs },
  masonryColumn: { flex: 1, gap: SPACING.xs },
  masonryCard: { width: '100%' },
  feedBanner: { marginHorizontal: SPACING.sm, marginVertical: SPACING.sm },
  loadingMore: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  loadingMoreText: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
  },

  // ── Filter Modal ─────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingTop: SPACING.base,
    paddingHorizontal: SPACING.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  modalTitle: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },
  modalClose: {
    fontSize: FONTS.xl,
    color: COLORS.textMuted,
    fontWeight: FONTS.bold,
  },
  filterLabel: {
    fontSize: FONTS.base,
    fontWeight: FONTS.bold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.base,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.base,
  },
  priceInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm + 2,
    fontSize: FONTS.base,
    color: COLORS.textPrimary,
  },
  priceSeparator: {
    color: COLORS.textMuted,
    fontSize: FONTS.lg,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.base,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.xs,
  },
  sortOptionActive: {
    backgroundColor: COLORS.primaryFade,
  },
  sortOptionText: {
    fontSize: FONTS.base,
    color: COLORS.textSecondary,
  },
  sortOptionTextActive: {
    color: COLORS.primary,
    fontWeight: FONTS.bold,
  },
  filterActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    paddingTop: SPACING.base,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  filterResetBtn: {
    flex: 1,
  },
  filterApplyBtn: {
    flex: 2,
  },
});