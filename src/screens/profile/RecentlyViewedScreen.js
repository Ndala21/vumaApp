/**
 * VUMA Store — Recently Viewed Screen
 * Real data via productsAPI.getRecentlyViewed() (confirmed to return a
 * plain list, not paginated — so no "load more" here, just the full
 * real list in one request).
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, StatusBar, Platform,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../utils/constants';
import { productsAPI } from '../../api/products';
import ProductCard from '../../components/ProductCard';

export default function RecentlyViewedScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    productsAPI.getRecentlyViewed()
      .then((d) => setProducts(d?.results || d || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recently Viewed</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading && products.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Loading...</Text>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>🕐</Text>
          <Text style={styles.emptyTitle}>Nothing viewed yet</Text>
          <Text style={styles.emptySub}>Products you look at will show up here</Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.shopBtnText}>Browse Products</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              variant="grid"
              onPress={() => navigation.navigate('ProductDetail', { productId: item.id, product: item })}
              style={styles.gridCard}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, paddingHorizontal: SPACING.base, paddingTop: Platform.OS === 'ios' ? 50 : SPACING.base, paddingBottom: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider, ...SHADOWS.sm },
  backIcon: { fontSize: FONTS.xl, color: COLORS.textPrimary, fontWeight: FONTS.bold },
  headerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  grid: { padding: SPACING.sm },
  gridRow: { gap: SPACING.sm },
  gridCard: { flex: 1, marginBottom: SPACING.sm },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  emptyIcon: { fontSize: 64, marginBottom: SPACING.base },
  emptyTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  emptySub: { fontSize: FONTS.sm, color: COLORS.textMuted, textAlign: 'center', marginBottom: SPACING.xl },
  emptyText: { fontSize: FONTS.sm, color: COLORS.textMuted },
  shopBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, paddingHorizontal: SPACING['2xl'], paddingVertical: SPACING.base },
  shopBtnText: { color: 'white', fontSize: FONTS.base, fontWeight: FONTS.bold },
});