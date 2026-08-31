/**
 * VUMA Store — Wishlist Screen (Favorites)
 * Real, backend-synced wishlist (apps.products.promotions.WishlistItem).
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, StatusBar, Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { loadWishlist, selectWishlist, selectCartLoading } from '../../store/cartSlice';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../utils/constants';
import ProductCard from '../../components/ProductCard';
import { productsAPI } from '../../api/products';

export default function WishlistScreen({ navigation }) {
  const dispatch = useDispatch();
  const wishlist = useSelector(selectWishlist);
  const loading = useSelector(selectCartLoading);

  // Real fallback content — genuinely popular products, shown so an
  // empty wishlist never dead-ends the shopping flow. Fetched
  // unconditionally, same pattern as CartScreen.
  const [trendingProducts, setTrendingProducts] = useState([]);

  useEffect(() => {
    dispatch(loadWishlist());
    productsAPI.getTrending().then((d) => setTrendingProducts(d?.results || d || [])).catch(() => {});
  }, []);

  const isEmpty = !loading.wishlist && wishlist.length === 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Favorites</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading.wishlist && wishlist.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={wishlist}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={wishlist.length > 0 ? styles.gridRow : undefined}
          ListHeaderComponent={
            isEmpty ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyIcon}>🤍</Text>
                <Text style={styles.emptyTitle}>No favorites yet</Text>
                <Text style={styles.emptySub}>Tap the heart on any product to save it here — here's what's trending</Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            isEmpty && trendingProducts.length > 0 ? (
              <View style={styles.trendingSection}>
                <Text style={styles.trendingTitle}>Trending Now</Text>
                <View style={styles.trendingGrid}>
                  {trendingProducts.slice(0, 12).map((p) => (
                    <ProductCard
                      key={p.id} product={p} variant="grid"
                      onPress={() => navigation.navigate('ProductDetail', { productId: p.id, product: p })}
                      style={styles.trendingCard}
                    />
                  ))}
                </View>
              </View>
            ) : null
          }
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
  trendingSection: { paddingTop: SPACING.base },
  trendingTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm, paddingHorizontal: SPACING.xs },
  trendingGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: SPACING.sm },
  trendingCard: { width: '48%', marginBottom: SPACING.sm },
});