/**
 * VUMA Store — Recommendation Section
 * One reusable component that powers every recommendation surface
 * across the app (Home, Product Details, Search, Cart, Profile, Order
 * History) - matching the real backend's design as "a reusable
 * recommendation engine/API" rather than 15 separate UI components.
 *
 * Fetches from any of the real /products/promotions/ endpoints, shows
 * nothing while empty/loading (no placeholder clutter for sections
 * with no real data yet), and renders a horizontal row of ProductCard
 * (featured variant). Every endpoint it calls already filters to
 * active + in-stock products server-side, so this component never
 * needs to re-filter for availability.
 *
 * Usage:
 *   <RecommendationSection
 *     title="Recommended for You"
 *     endpoint="/promotions/recommendations/"
 *     navigation={navigation}
 *   />
 *
 *   <RecommendationSection
 *     title="Similar Products"
 *     endpoint="/promotions/similar-products/"
 *     params={{ product_id: product.id }}
 *     navigation={navigation}
 *   />
 */
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING, SCREENS } from '../utils/constants';
import { get } from '../api/client';
import ProductCard from './ProductCard';

export default function RecommendationSection({ title, endpoint, params, navigation, style }) {
  const [products, setProducts] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    get(endpoint, params || {})
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : (data?.results || []);
        setProducts(list);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => { cancelled = true; };
    // Re-fetch if the endpoint or its params (e.g. product_id) change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, JSON.stringify(params || {})]);

  // Nothing to show yet, or genuinely no real data for this user/product —
  // render nothing rather than an empty section or a loading flicker.
  if (!loaded || products.length === 0) return null;

  const handlePress = (product) => {
    navigation.push(SCREENS.PRODUCT_DETAIL, { productId: product.id, product });
  };

  return (
    <View style={[styles.wrap, style]}>
      <Text style={styles.title}>{title}</Text>
      <FlatList
        data={products}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            variant="featured"
            onPress={() => handlePress(item)}
            style={styles.card}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: SPACING.base },
  title: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm, paddingHorizontal: SPACING.base },
  list: { paddingHorizontal: SPACING.base, gap: SPACING.sm },
  card: { width: 160, height: 200 },
});