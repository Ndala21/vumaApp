/**
 * VUMA Store — Promotion Products Screen
 * Dedicated results screen shown when a promotion targets multiple
 * products (rather than one) - fetches the campaign's real target
 * products in one call and shows only those, nothing else. Tapping
 * an individual product opens its normal Product Details page.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Platform,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SCREENS } from '../../utils/constants';
import ProductCard from '../../components/ProductCard';
import { SkeletonProductGrid } from '../../components/common/Loading';
import { EmptyState } from '../../components/common/ErrorMessage';
import { get } from '../../api/client';

export default function PromotionProductsScreen({ navigation, route }) {
  const { campaignId, title } = route.params || {};
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [screenTitle, setScreenTitle] = useState(title || 'Promotion');

  const load = useCallback(async () => {
    if (!campaignId) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await get(`/products/promo-campaigns/${campaignId}/products/`);
      setProducts(data?.products || []);
      if (data?.title) setScreenTitle(data.title);
    } catch (e) {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  const handleProductPress = useCallback((product) => {
    navigation.navigate(SCREENS.PRODUCT_DETAIL, { productId: product.id, product });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{screenTitle}</Text>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <SkeletonProductGrid count={6} />
      ) : products.length === 0 ? (
        <EmptyState
          icon="🎁"
          title="No products found"
          message="This promotion's products aren't available right now."
        />
      ) : (
        <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
          <View style={styles.row}>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                variant="grid"
                onPress={() => handleProductPress(product)}
                style={styles.card}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.base,
    paddingTop: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || SPACING.xl) + SPACING.sm,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.divider,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: RADIUS.full,
    alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceSunken,
  },
  backIcon: { fontSize: FONTS.xl, color: COLORS.textPrimary, fontWeight: FONTS.bold },
  headerTitle: {
    flex: 1, textAlign: 'center', fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary,
    marginHorizontal: SPACING.sm,
  },
  grid: { padding: SPACING.base, paddingBottom: 40 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  card: { width: '31.5%' },
});