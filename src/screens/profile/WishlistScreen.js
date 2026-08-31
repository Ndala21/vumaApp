/**
 * VUMA Store — Wishlist Screen (Favorites)
 * Real, backend-synced wishlist (apps.products.promotions.WishlistItem).
 */

import React, { useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, StatusBar, Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { loadWishlist, selectWishlist, selectCartLoading } from '../../store/cartSlice';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../utils/constants';
import ProductCard from '../../components/ProductCard';

export default function WishlistScreen({ navigation }) {
  const dispatch = useDispatch();
  const wishlist = useSelector(selectWishlist);
  const loading = useSelector(selectCartLoading);

  useEffect(() => {
    dispatch(loadWishlist());
  }, []);

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
      ) : wishlist.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>🤍</Text>
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptySub}>Tap the heart on any product to save it here</Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.shopBtnText}>Browse Products</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={wishlist}
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