/**
 * VUMA Mazao — Agricultural Marketplace Screen
 * Browse crops, fresh produce, livestock from Tanzanian farmers
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  StatusBar, Platform, TextInput, ScrollView, Image, RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, SCREENS } from '../../utils/constants';
import { selectIsAuthenticated } from '../../store/authSlice';
import { get } from '../../api/client';
import { formatPrice } from '../../utils/helpers';

const CROP_TYPE_ICONS = {
  cereals: '🌾', legumes: '🫘', vegetables: '🥬', fruits: '🍎',
  roots: '🥔', cash_crops: '☕', spices: '🌿', livestock: '🐄',
  dairy: '🥛', fish: '🐟', other: '📦',
};

const UNIT_LABELS = {
  kg: 'kg', g: 'g', ton: 'ton', bag_50: 'bag (50kg)',
  bag_100: 'bag (100kg)', crate: 'crate', bunch: 'bunch',
  bucket: 'bucket', piece: 'piece', litre: 'litre',
};

const QUALITY_COLORS = {
  A: COLORS.success,
  B: COLORS.primary,
  C: COLORS.warning,
  mixed: COLORS.textMuted,
};

// ── Mazao Product Card ────────────────────────────────
const MazaoCard = memo(({ item, onPress }) => {
  const hasWholesale = item.wholesale_price && item.selling_type !== 'retail';
  const qualityColor = QUALITY_COLORS[item.quality_grade] || COLORS.textMuted;

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.85}>
      {/* Image */}
      <View style={styles.cardImageWrap}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
            <Text style={styles.cropIcon}>{CROP_TYPE_ICONS[item.crop_type] || '🌾'}</Text>
          </View>
        )}
        <View style={[styles.gradeBadge, { backgroundColor: qualityColor }]}>
          <Text style={styles.gradeBadgeText}>Grade {item.quality_grade}</Text>
        </View>
        {!item.is_in_stock && (
          <View style={styles.outOfStockOverlay}>
            <Text style={styles.outOfStockText}>Out of Stock</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
        {item.name_swahili ? <Text style={styles.cardSwahili}>{item.name_swahili}</Text> : null}

        <View style={styles.priceRow}>
          <Text style={styles.price}>TZS {Number(item.retail_price).toLocaleString()}</Text>
          <Text style={styles.unit}>/{UNIT_LABELS[item.unit] || item.unit}</Text>
        </View>

        {hasWholesale && (
          <Text style={styles.wholesaleText}>
            🏭 Wholesale: TZS {Number(item.wholesale_price).toLocaleString()}/{UNIT_LABELS[item.unit] || item.unit}
          </Text>
        )}

        <View style={styles.metaRow}>
          {item.farm_region ? <Text style={styles.metaText}>📍 {item.farm_region}</Text> : null}
          {item.offers_delivery && <Text style={styles.deliveryBadge}>🚚 Delivery</Text>}
          {item.offers_pickup && <Text style={styles.pickupBadge}>📦 Pickup</Text>}
        </View>

        {item.harvest_date && (
          <Text style={styles.harvestText}>
            🌾 Harvested: {new Date(item.harvest_date).toLocaleDateString('en-TZ', { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
        )}

        <Text style={styles.stockText}>
          {item.is_in_stock ? `✅ ${Number(item.available_stock).toLocaleString()} ${UNIT_LABELS[item.unit] || item.unit} available` : '❌ Out of stock'}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

// ── Filter Chip ───────────────────────────────────────
const FilterChip = memo(({ label, active, onPress }) => (
  <TouchableOpacity
    style={[styles.filterChip, active && styles.filterChipActive]}
    onPress={onPress}
  >
    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
  </TouchableOpacity>
));

export default function MazaoScreen({ navigation }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [products, setProducts] = useState([]);
  const [cropTypes, setCropTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCropType, setActiveCropType] = useState('');
  const [sellingFilter, setSellingFilter] = useState('');

  useEffect(() => {
    loadCropTypes();
    loadProducts();
  }, []);

  const loadCropTypes = async () => {
    try {
      const data = await get('/products/mazao/crop-types/');
      setCropTypes([{ value: '', label: 'All' }, ...(data || [])]);
    } catch {}
  };

  const loadProducts = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const query = {
        available: 'true',
        ...params,
      };
      const data = await get('/products/mazao/', query);
      setProducts(Array.isArray(data) ? data : data.results || []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProducts({ crop_type: activeCropType, q: searchQuery, selling_type: sellingFilter });
    setRefreshing(false);
  };

  const handleCropTypeFilter = (val) => {
    setActiveCropType(val);
    loadProducts({ crop_type: val, q: searchQuery, selling_type: sellingFilter });
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text.length === 0 || text.length > 2) {
      loadProducts({ crop_type: activeCropType, q: text, selling_type: sellingFilter });
    }
  };

  const handleSellingFilter = (val) => {
    const newVal = sellingFilter === val ? '' : val;
    setSellingFilter(newVal);
    loadProducts({ crop_type: activeCropType, q: searchQuery, selling_type: newVal });
  };

  const handleProductPress = (item) => {
    navigation.navigate('MazaoDetail', { product: item });
  };

  const renderProduct = useCallback(({ item }) => (
    <MazaoCard item={item} onPress={handleProductPress} />
  ), []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1B4332" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>🌾 Mazao Market</Text>
            <Text style={styles.headerSubtitle}>Fresh from Tanzanian farms</Text>
          </View>
          {isAuthenticated && (
            <TouchableOpacity
              style={styles.sellBtn}
              onPress={() => navigation.navigate('MazaoAddProduct')}
            >
              <Text style={styles.sellBtnText}>+ Sell</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Search crops, vegetables, fruits..."
            placeholderTextColor="rgba(255,255,255,0.6)"
          />
        </View>
      </View>

      {/* Selling type filter */}
      <View style={styles.sellingFilterRow}>
        {[
          { value: 'retail', label: '🛒 Retail' },
          { value: 'wholesale', label: '🏭 Wholesale' },
        ].map(f => (
          <TouchableOpacity
            key={f.value}
            style={[styles.sellingChip, sellingFilter === f.value && styles.sellingChipActive]}
            onPress={() => handleSellingFilter(f.value)}
          >
            <Text style={[styles.sellingChipText, sellingFilter === f.value && styles.sellingChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Crop type filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        {cropTypes.map(ct => (
          <FilterChip
            key={ct.value}
            label={`${CROP_TYPE_ICONS[ct.value] || '🌿'} ${ct.label}`}
            active={activeCropType === ct.value}
            onPress={() => handleCropTypeFilter(ct.value)}
          />
        ))}
      </ScrollView>

      {/* Product List */}
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id?.toString()}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#1B4332']}
            tintColor="#1B4332"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>🌾</Text>
            <Text style={styles.emptyTitle}>
              {loading ? 'Loading products...' : 'No products found'}
            </Text>
            <Text style={styles.emptyText}>
              {loading ? 'Please wait...' : 'Try a different category or search term'}
            </Text>
          </View>
        }
        columnWrapperStyle={styles.columnWrapper}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: '#1B4332', paddingTop: Platform.OS === 'ios' ? 50 : SPACING.base, paddingBottom: SPACING.base, paddingHorizontal: SPACING.base },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  backBtn: { padding: SPACING.xs },
  backBtnText: { fontSize: FONTS.xl, color: 'white', fontWeight: FONTS.bold },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: FONTS.xl, fontWeight: FONTS.black, color: 'white' },
  headerSubtitle: { fontSize: FONTS.xs, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  sellBtn: { backgroundColor: '#52B788', borderRadius: RADIUS.lg, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs },
  sellBtnText: { color: 'white', fontSize: FONTS.sm, fontWeight: FONTS.bold },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.full, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm, gap: SPACING.sm },
  searchIcon: { fontSize: FONTS.base },
  searchInput: { flex: 1, fontSize: FONTS.base, color: 'white', padding: 0 },
  sellingFilterRow: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm, backgroundColor: '#D8F3DC' },
  sellingChip: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.xs + 2, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: '#52B788', backgroundColor: 'white' },
  sellingChipActive: { backgroundColor: '#1B4332', borderColor: '#1B4332' },
  sellingChipText: { fontSize: FONTS.sm, color: '#1B4332', fontWeight: FONTS.semiBold },
  sellingChipTextActive: { color: 'white' },
  filterRow: { backgroundColor: '#D8F3DC', maxHeight: 48, borderBottomWidth: 1, borderBottomColor: '#B7E4C7' },
  filterContent: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, gap: SPACING.xs },
  filterChip: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs + 2, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: '#52B788', backgroundColor: 'white' },
  filterChipActive: { backgroundColor: '#1B4332', borderColor: '#1B4332' },
  filterChipText: { fontSize: FONTS.xs, color: '#1B4332', fontWeight: FONTS.medium },
  filterChipTextActive: { color: 'white' },
  listContent: { padding: SPACING.sm, paddingBottom: 100 },
  columnWrapper: { gap: SPACING.sm },
  card: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: SPACING.sm, ...SHADOWS.sm },
  cardImageWrap: { position: 'relative', height: 120 },
  cardImage: { width: '100%', height: '100%' },
  cardImagePlaceholder: { backgroundColor: '#D8F3DC', alignItems: 'center', justifyContent: 'center' },
  cropIcon: { fontSize: 48 },
  gradeBadge: { position: 'absolute', top: 6, right: 6, borderRadius: RADIUS.sm, paddingHorizontal: 6, paddingVertical: 2 },
  gradeBadgeText: { fontSize: FONTS.xs - 1, color: 'white', fontWeight: FONTS.bold },
  outOfStockOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  outOfStockText: { color: 'white', fontSize: FONTS.xs, fontWeight: FONTS.bold, backgroundColor: COLORS.danger, paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.sm },
  cardInfo: { padding: SPACING.sm },
  cardName: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.textPrimary, lineHeight: 18 },
  cardSwahili: { fontSize: FONTS.xs, color: COLORS.textMuted, marginBottom: 4, fontStyle: 'italic' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 4 },
  price: { fontSize: FONTS.base, fontWeight: FONTS.black, color: '#1B4332' },
  unit: { fontSize: FONTS.xs, color: COLORS.textMuted },
  wholesaleText: { fontSize: FONTS.xs, color: '#52B788', fontWeight: FONTS.semiBold, marginTop: 2 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  metaText: { fontSize: FONTS.xs, color: COLORS.textMuted },
  deliveryBadge: { fontSize: FONTS.xs, color: '#1B4332', fontWeight: FONTS.medium },
  pickupBadge: { fontSize: FONTS.xs, color: COLORS.primary, fontWeight: FONTS.medium },
  harvestText: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  stockText: { fontSize: FONTS.xs, color: COLORS.textSecondary, marginTop: 4, fontWeight: FONTS.medium },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING['3xl'] },
  emptyIcon: { fontSize: 64, marginBottom: SPACING.base },
  emptyTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary, textAlign: 'center' },
  emptyText: { fontSize: FONTS.sm, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.xs },
});
