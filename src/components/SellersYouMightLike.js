/**
 * VUMA Store — Sellers You Might Like
 * Reusable across screens (Profile, Home, etc.) - real vendor
 * recommendations from /promotions/sellers-you-might-like/, using the
 * VendorProfile's own real id (not the underlying user's id) for
 * navigation, matching what SellerStoreView actually expects.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/constants';
import { get } from '../api/client';

export default function SellersYouMightLike({ navigation, isAuthenticated, style }) {
  const [sellers, setSellers] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { setSellers([]); setLoaded(true); return; }
    let cancelled = false;
    get('/promotions/sellers-you-might-like/')
      .then((d) => { if (!cancelled) setSellers(Array.isArray(d) ? d : (d?.results || [])); })
      .catch(() => { if (!cancelled) setSellers([]); })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  if (!loaded || sellers.length === 0) return null;

  return (
    <View style={[styles.section, style]}>
      <Text style={styles.title}>Sellers You Might Like</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
        {sellers.slice(0, 10).map((v) => (
          <TouchableOpacity
            key={v.id}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('SellerStore', { vendorId: v.id })}
          >
            {v.shop_logo_url ? (
              <Image source={{ uri: v.shop_logo_url }} style={styles.logo} />
            ) : (
              <View style={[styles.logo, styles.logoPlaceholder]}>
                <Text style={styles.logoText}>{(v.shop_name || 'S')[0].toUpperCase()}</Text>
              </View>
            )}
            <Text style={styles.name} numberOfLines={1}>{v.shop_name}</Text>
            {v.rating_avg > 0 && <Text style={styles.rating}>★ {Number(v.rating_avg).toFixed(1)}</Text>}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: SPACING.base },
  title: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm, paddingHorizontal: SPACING.base },
  list: { paddingHorizontal: SPACING.base, gap: SPACING.sm },
  card: { width: 100, alignItems: 'center', backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg, padding: SPACING.sm, borderWidth: 1, borderColor: COLORS.borderLight },
  logo: { width: 52, height: 52, borderRadius: RADIUS.full, marginBottom: SPACING.xs },
  logoPlaceholder: { backgroundColor: COLORS.primaryFade, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: FONTS.lg, fontWeight: FONTS.black, color: COLORS.primary },
  name: { fontSize: FONTS.xs, fontWeight: FONTS.semiBold, color: COLORS.textPrimary, textAlign: 'center' },
  rating: { fontSize: 10.5, color: COLORS.rating, marginTop: 2 },
});