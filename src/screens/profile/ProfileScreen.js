/**
 * VUMA Store — Profile Screen (Account Page)
 * Rebuilt to match Coupang's real structure exactly:
 *   compact header -> wallet/orders stat row -> 5-icon shortcuts row
 *   -> continuous real product/order feed (My Orders, Recommendations,
 *   Buy Again) -> bottom tab bar.
 * Everything settings-related (Edit Profile, Addresses, Payment
 * Methods, Notifications, Help, Settings, Seller entry, Logout,
 * Delete Account) now lives in AccountMenuScreen, reached via the
 * "Menu" shortcut — matching how Coupang keeps this page product-
 * focused and puts account management behind a separate Menu screen.
 *
 * All five shortcuts (My Orders, Favorites, Recently Viewed, Buy
 * Again, Menu) are now real, registered navigation targets — this is
 * the actual fix for the "buttons don't work" issue, not just a
 * restyle.
 *
 * Honest scope note carried over: no real Points/loyalty system
 * exists in the backend, so no Points card is shown (Wallet balance
 * covers that row instead, paired with a real Total Orders count).
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  Platform, ScrollView, Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectUser } from '../../store/authSlice';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../utils/constants';
import { get } from '../../api/client';
import { productsAPI } from '../../api/products';
import ProductCard from '../../components/ProductCard';

export default function ProfileScreen({ navigation }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);

  // Real dashboard data
  const [walletBalance, setWalletBalance] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [totalOrders, setTotalOrders] = useState(null);
  const [buyAgainProducts, setBuyAgainProducts] = useState([]);
  const [recommended, setRecommended] = useState([]);

  const loadDashboard = useCallback(() => {
    if (!isAuthenticated) return;

    get('/payments/wallet/').then((d) => setWalletBalance(d?.balance ?? 0)).catch(() => setWalletBalance(null));

    get('/orders/').then((d) => {
      const results = d?.results || d || [];
      setTotalOrders(d?.count ?? results.length);
      setRecentOrders(results.slice(0, 2));

      const seen = new Set();
      const buyAgain = [];
      results
        .filter((o) => o.status === 'delivered')
        .forEach((order) => {
          (order.items || []).forEach((item) => {
            const pid = item.product?.id || item.product_id || item.product;
            if (!pid || seen.has(pid)) return;
            seen.add(pid);
            buyAgain.push({
              id: pid,
              name: item.product_name,
              primary_image: item.product_image,
              price: item.unit_price,
            });
          });
        });
      setBuyAgainProducts(buyAgain.slice(0, 10));
    }).catch(() => {});

    productsAPI.getRecommendations().then((d) => setRecommended(d?.results || d || [])).catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  // ── GUEST SCREEN — unchanged ──────────────────────
  if (!isAuthenticated) {
    const GUEST_FEATURES = [
      { icon: '📦', label: 'Track your orders in real time' },
      { icon: '❤️', label: 'Save your favourite products' },
      { icon: '⚡', label: 'Faster checkout every time' },
      { icon: '🔔', label: 'Get deals and flash sale alerts' },
      { icon: '🚚', label: 'Free delivery on all orders' },
      { icon: '🎁', label: 'Earn rewards by inviting friends' },
    ];

    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

        <View style={styles.topBar}>
          <Text style={styles.topBarLogo}>VUMA</Text>
          <View style={styles.topBarIcons}>
            <TouchableOpacity
              style={styles.topBarIconBtn}
              onPress={() => navigation.navigate('Auth', { screen: 'Login' })}
            >
              <Text style={styles.topBarIcon}>🔔</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.topBarIconBtn}
              onPress={() => navigation.navigate('Auth', { screen: 'Login' })}
            >
              <Text style={styles.topBarIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.guestScroll}>
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeAvatar}>
              <Text style={styles.welcomeAvatarIcon}>👤</Text>
            </View>
            <View style={styles.welcomeText}>
              <Text style={styles.welcomeGreeting}>Welcome</Text>
              <Text style={styles.welcomeSub}>Shop, sell and manage your account</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.signInBtn}
            onPress={() => navigation.navigate('Auth', { screen: 'Login' })}
            activeOpacity={0.85}
          >
            <Text style={styles.signInIcon}>➜</Text>
            <View style={styles.signInText}>
              <Text style={styles.signInTitle}>Sign In</Text>
              <Text style={styles.signInSub}>Access your account</Text>
            </View>
            <Text style={styles.signInArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => navigation.navigate('Auth', { screen: 'Register' })}
            activeOpacity={0.7}
          >
            <View style={styles.createIconWrap}>
              <Text style={styles.createIcon}>👤</Text>
            </View>
            <View style={styles.createText}>
              <Text style={styles.createTitle}>Create Customer Account</Text>
              <Text style={styles.createSub}>Create a new customer account</Text>
            </View>
            <Text style={styles.createArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sellerBtn}
            onPress={() => navigation.navigate('VendorRegister', { isNewAccount: true })}
            activeOpacity={0.85}
          >
            <View style={styles.sellerIconWrap}>
              <Text style={styles.sellerIcon}>🏪</Text>
            </View>
            <View style={styles.sellerTextWrap}>
              <Text style={styles.sellerText}>Become a Seller</Text>
              <Text style={styles.sellerSub}>Start selling on VUMA</Text>
            </View>
            <View style={styles.sellerBadge}>
              <Text style={styles.sellerBadgeText}>Commission from 3%</Text>
            </View>
            <Text style={styles.sellerArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.guestFeatures}>
            <Text style={styles.featTitle}>Why join VUMA?</Text>
            {GUEST_FEATURES.map((f, i) => (
              <View key={i} style={[styles.featRow, i === GUEST_FEATURES.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={styles.featIcon}>{f.icon}</Text>
                <Text style={styles.featText}>{f.label}</Text>
                <Text style={styles.featArrow}>›</Text>
              </View>
            ))}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  // ── LOGGED IN SCREEN — Coupang structure ──────────
  const initials = (user?.username || user?.email || 'U')[0].toUpperCase();

  const SHORTCUTS = [
    { icon: '📦', label: 'My Orders', onPress: () => navigation.navigate('Orders') },
    { icon: '❤️', label: 'Favorites', onPress: () => navigation.navigate('Wishlist') },
    { icon: '🕐', label: 'Recently\nViewed', onPress: () => navigation.navigate('RecentlyViewed') },
    { icon: '🔄', label: 'Buy Again', onPress: () => navigation.navigate('Orders') },
    { icon: '☰', label: 'Menu', onPress: () => navigation.navigate('AccountMenu') },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Compact profile header */}
        <View style={styles.topProfileBar}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.userName} numberOfLines={1}>{user?.username || 'VUMA User'}</Text>
          <TouchableOpacity style={styles.settingsIconBtn} onPress={() => navigation.navigate('AccountMenu')}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Referral banner — VUMA's real equivalent of a top promo card */}
        <TouchableOpacity
          style={styles.referralBanner}
          onPress={() => navigation.navigate('Referral')}
          activeOpacity={0.85}
        >
          <Text style={styles.referralBannerIcon}>🎁</Text>
          <View style={styles.referralBannerText}>
            <Text style={styles.referralBannerTitle}>Invite & Earn TZS 2,000!</Text>
            <Text style={styles.referralBannerSub}>Invite friends to VUMA and earn rewards</Text>
          </View>
          <Text style={styles.referralBannerArrow}>›</Text>
        </TouchableOpacity>

        {/* Wallet + Orders stat row (real data) */}
        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>VUMA Wallet</Text>
            <Text style={styles.statValue}>
              {walletBalance === null ? '—' : `TZS ${Number(walletBalance).toLocaleString()}`}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Orders</Text>
            <Text style={styles.statValue}>{totalOrders === null ? '—' : totalOrders}</Text>
          </View>
        </View>

        {/* Shortcuts row — all 5 real destinations now */}
        <View style={styles.shortcutsRow}>
          {SHORTCUTS.map((s) => (
            <TouchableOpacity key={s.label} style={styles.shortcutItem} onPress={s.onPress}>
              <View style={styles.shortcutIconWrap}>
                <Text style={styles.shortcutIcon}>{s.icon}</Text>
              </View>
              <Text style={styles.shortcutLabel} numberOfLines={2}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── From here down: continuous real product/order feed ── */}

        {/* My Orders — real data */}
        {recentOrders.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Orders</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Orders')}>
                <Text style={styles.seeAll}>See all ›</Text>
              </TouchableOpacity>
            </View>
            {recentOrders.map((order) => (
              <TouchableOpacity
                key={order.id}
                style={styles.orderCard}
                onPress={() => navigation.navigate('OrderDetail', { orderId: order.id, order })}
                activeOpacity={0.85}
              >
                <View style={styles.orderCardTop}>
                  <Text style={styles.orderStatusText}>
                    {(order.status || '').charAt(0).toUpperCase() + (order.status || '').slice(1)}
                  </Text>
                  <Text style={styles.orderDate}>
                    {order.created_at ? new Date(order.created_at).toLocaleDateString() : ''}
                  </Text>
                </View>
                <Text style={styles.orderMeta}>
                  {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''} · TZS {Number(order.total_amount || 0).toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Inspired by your recent activity — real recommendations */}
        {recommended.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Inspired for You</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Home')}>
                <Text style={styles.seeAll}>See all ›</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {recommended.slice(0, 10).map((p) => (
                <ProductCard
                  key={p.id} product={p} variant="featured"
                  onPress={() => navigation.navigate('ProductDetail', { productId: p.id, product: p })}
                  style={styles.hCard}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Buy Again — real, derived from delivered-order history */}
        {buyAgainProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Buy Again</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Orders')}>
                <Text style={styles.seeAll}>See all ›</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {buyAgainProducts.map((p) => (
                <ProductCard
                  key={p.id} product={p} variant="featured"
                  onPress={() => navigation.navigate('ProductDetail', { productId: p.id, product: p })}
                  style={styles.hCard}
                />
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Guest top bar
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, paddingHorizontal: SPACING.base, paddingTop: Platform.OS === 'ios' ? 54 : SPACING.base, paddingBottom: SPACING.sm },
  topBarLogo: { fontSize: 26, fontWeight: '900', color: COLORS.primary, letterSpacing: -1 },
  topBarIcons: { flexDirection: 'row', gap: SPACING.sm },
  topBarIconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  topBarIcon: { fontSize: 19 },
  guestScroll: { padding: SPACING.base },

  welcomeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryFade, borderRadius: 18, padding: SPACING.base, marginBottom: SPACING.base, gap: SPACING.base },
  welcomeAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  welcomeAvatarIcon: { fontSize: 24, color: COLORS.primary },
  welcomeText: { flex: 1 },
  welcomeGreeting: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  welcomeSub: { fontSize: FONTS.xs, color: COLORS.textSecondary, marginTop: 2 },

  signInBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: 16, padding: SPACING.base, gap: SPACING.base, marginBottom: SPACING.sm, ...SHADOWS.sm },
  signInIcon: { fontSize: 20, color: 'white' },
  signInText: { flex: 1 },
  signInTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: 'white' },
  signInSub: { fontSize: FONTS.xs, color: 'rgba(255,255,255,0.8)', marginTop: 1 },
  signInArrow: { fontSize: FONTS.xl, color: 'white' },

  createBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: SPACING.base, gap: SPACING.base, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  createIconWrap: { width: 36, height: 36, borderRadius: 12, backgroundColor: COLORS.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  createIcon: { fontSize: 17 },
  createText: { flex: 1 },
  createTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  createSub: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 1 },
  createArrow: { fontSize: FONTS.xl, color: COLORS.textMuted },

  sellerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryFade, borderRadius: 16, padding: SPACING.base, gap: SPACING.sm, marginBottom: SPACING.base, borderWidth: 1, borderColor: 'rgba(255,106,0,0.25)' },
  sellerIconWrap: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  sellerIcon: { fontSize: 17 },
  sellerTextWrap: { flex: 1 },
  sellerText: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  sellerSub: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 1 },
  sellerBadge: { backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 3 },
  sellerBadgeText: { fontSize: 10.5, color: 'white', fontWeight: FONTS.bold },
  sellerArrow: { fontSize: FONTS.xl, color: COLORS.primary },

  guestFeatures: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: SPACING.base, borderWidth: 1, borderColor: COLORS.border },
  featTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  featRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm + 2, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  featIcon: { fontSize: 17, width: 24 },
  featText: { flex: 1, fontSize: FONTS.sm, color: COLORS.textSecondary },
  featArrow: { fontSize: FONTS.lg, color: COLORS.textLight },

  // Compact profile header (logged in) — Coupang keeps this minimal:
  // avatar, name, settings icon. Nothing else.
  topProfileBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: SPACING.base, paddingTop: Platform.OS === 'ios' ? 54 : SPACING.base, gap: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  avatar: { width: 44, height: 44, borderRadius: RADIUS.full, backgroundColor: COLORS.primaryFade, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: FONTS.lg, fontWeight: FONTS.black, color: COLORS.primary },
  userName: { flex: 1, fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  settingsIconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  settingsIcon: { fontSize: 20 },

  // Referral banner
  referralBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', marginHorizontal: SPACING.sm, marginTop: SPACING.sm, marginBottom: SPACING.sm, borderRadius: RADIUS.xl, padding: SPACING.base, gap: SPACING.sm, ...SHADOWS.sm },
  referralBannerIcon: { fontSize: 26 },
  referralBannerText: { flex: 1 },
  referralBannerTitle: { fontSize: FONTS.sm, fontWeight: FONTS.black, color: COLORS.primary },
  referralBannerSub: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  referralBannerArrow: { fontSize: FONTS.xl, color: COLORS.primary, fontWeight: FONTS.bold },

  // Wallet / Orders stat row
  statRow: { flexDirection: 'row', alignItems: 'stretch', backgroundColor: COLORS.surface, marginHorizontal: SPACING.sm, marginBottom: SPACING.sm, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  statCard: { flex: 1, alignItems: 'center', padding: SPACING.base },
  statLabel: { fontSize: FONTS.xs, color: COLORS.textMuted },
  statValue: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginTop: 4 },
  statDivider: { width: 1, backgroundColor: COLORS.divider, marginVertical: SPACING.sm },

  // Shortcuts
  shortcutsRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.surface, marginHorizontal: SPACING.sm, marginBottom: SPACING.sm, borderRadius: RADIUS.xl, padding: SPACING.base, borderWidth: 1, borderColor: COLORS.border },
  shortcutItem: { flex: 1, alignItems: 'center', gap: 6 },
  shortcutIconWrap: { width: 42, height: 42, borderRadius: RADIUS.lg, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  shortcutIcon: { fontSize: 18 },
  shortcutLabel: { fontSize: 10, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 12 },

  // Sections (product feed)
  section: { marginBottom: SPACING.sm, backgroundColor: COLORS.surface, paddingVertical: SPACING.base },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.base, marginBottom: SPACING.sm },
  sectionTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  seeAll: { fontSize: FONTS.xs, color: COLORS.primary, fontWeight: FONTS.semiBold },
  hScroll: { paddingHorizontal: SPACING.base, gap: SPACING.sm },
  hCard: { width: 140, height: 190 },

  orderCard: { marginHorizontal: SPACING.base, marginBottom: SPACING.sm, backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg, padding: SPACING.sm + 2, borderWidth: 1, borderColor: COLORS.borderLight },
  orderCardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  orderStatusText: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.success },
  orderDate: { fontSize: FONTS.xs, color: COLORS.textMuted },
  orderMeta: { fontSize: FONTS.xs, color: COLORS.textSecondary },
});