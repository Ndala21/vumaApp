/**
 * VUMA Store — Profile Screen (Account Page)
 * Redesigned to a Coupang-style account dashboard per reference spec.
 *
 * Honest scope note: the reference design includes a "VUMA Points"
 * card and a "Buy Again" product list. Neither has a real backend
 * source yet (confirmed: no Points/loyalty model exists anywhere in
 * the API, and no "frequently purchased" endpoint exists either) —
 * so neither is built here rather than shown with fabricated numbers.
 * Real Wallet balance (GET /payments/wallet/) and a real Total Orders
 * count fill that stat-card row instead. To finish tomorrow: decide
 * whether to build a real Points system, and what "Buy Again" should
 * actually be backed by.
 *
 * Everything else — guest screen, logout/delete account modals,
 * vendor dashboard navigation logic — is unchanged from before.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  Platform, ScrollView, Alert, Modal, ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { logout, selectIsAuthenticated, selectUser } from '../../store/authSlice';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../utils/constants';
import { get } from '../../api/client';
import { productsAPI } from '../../api/products';
import ProductCard from '../../components/ProductCard';

export default function ProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Real dashboard data
  const [walletBalance, setWalletBalance] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [totalOrders, setTotalOrders] = useState(null);
  const [buyAgainProducts, setBuyAgainProducts] = useState([]);

  // Recently Viewed — real data + real page-based infinite scroll
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [rvPage, setRvPage] = useState(1);
  const [rvHasMore, setRvHasMore] = useState(true);
  const [rvLoadingMore, setRvLoadingMore] = useState(false);

  // Inspired for You — real data + real page-based infinite scroll
  const [recommended, setRecommended] = useState([]);
  const [recPage, setRecPage] = useState(1);
  const [recHasMore, setRecHasMore] = useState(true);
  const [recLoadingMore, setRecLoadingMore] = useState(false);

  const loadDashboard = useCallback(() => {
    if (!isAuthenticated) return;

    get('/payments/wallet/').then((d) => setWalletBalance(d?.balance ?? 0)).catch(() => setWalletBalance(null));

    // Full-ish order history (not just the 2-item preview) so Buy
    // Again can be derived from real past purchases — no new backend
    // endpoint needed.
    get('/orders/').then((d) => {
      const results = d?.results || d || [];
      setTotalOrders(d?.count ?? results.length);
      setRecentOrders(results.slice(0, 2));

      // Buy Again: distinct products from the customer's own
      // DELIVERED orders (an order that never completed isn't really
      // something to "buy again"), most recent first.
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

    productsAPI.getRecentlyViewed().then((d) => {
      setRecentlyViewed(d?.results || d || []);
      setRvHasMore(!!d?.next);
    }).catch(() => {});

    productsAPI.getRecommendations().then((d) => {
      setRecommended(d?.results || d || []);
      setRecHasMore(!!d?.next);
    }).catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  // Real page-based "load more" as the user scrolls near the end of
  // each horizontal row — standard DRF page param. If a given backend
  // endpoint doesn't actually support pagination, this harmlessly
  // re-fetches the same first page rather than crashing (unverified
  // against the live server in this exchange — worth a quick check).
  const loadMoreRecentlyViewed = useCallback(() => {
    if (rvLoadingMore || !rvHasMore) return;
    setRvLoadingMore(true);
    const nextPage = rvPage + 1;
    get('/promotions/recently-viewed/', { page: nextPage })
      .then((d) => {
        const results = d?.results || d || [];
        if (results.length > 0) {
          setRecentlyViewed((prev) => [...prev, ...results]);
          setRvPage(nextPage);
        }
        setRvHasMore(!!d?.next);
      })
      .catch(() => setRvHasMore(false))
      .finally(() => setRvLoadingMore(false));
  }, [rvPage, rvHasMore, rvLoadingMore]);

  const loadMoreRecommended = useCallback(() => {
    if (recLoadingMore || !recHasMore) return;
    setRecLoadingMore(true);
    const nextPage = recPage + 1;
    get('/promotions/recommendations/', { page: nextPage })
      .then((d) => {
        const results = d?.results || d || [];
        if (results.length > 0) {
          setRecommended((prev) => [...prev, ...results]);
          setRecPage(nextPage);
        }
        setRecHasMore(!!d?.next);
      })
      .catch(() => setRecHasMore(false))
      .finally(() => setRecLoadingMore(false));
  }, [recPage, recHasMore, recLoadingMore]);

  // Fires while horizontally scrolling; triggers load-more once near
  // the end of the currently-loaded content.
  const handleHScroll = (loadMoreFn) => (e) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    if (contentOffset.x + layoutMeasurement.width >= contentSize.width - 200) {
      loadMoreFn();
    }
  };

  const handleLogout = async () => {
    setShowLogoutModal(false);
    setLoggingOut(true);
    try {
      await dispatch(logout());
    } catch {
      Alert.alert('Error', 'Could not log out. Please try again.');
    } finally {
      setLoggingOut(false);
    }
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(false);
    Alert.alert(
      '⚠️ Final Warning',
      'This will permanently delete your account and all your data. This action CANNOT be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Delete My Account',
          style: 'destructive',
          onPress: async () => {
            try {
              const { del } = await import('../../api/client');
              await del('/users/delete-account/');
              await dispatch(logout());
            } catch {
              Alert.alert('Error', 'Could not delete account. Please contact support@vumastore.store');
            }
          },
        },
      ]
    );
  };

  // ── Navigate to Seller Dashboard ──────────────────
  const handleGoToDashboard = () => {
    const isVendor = user?.role === 'vendor';
    const isApproved = user?.vendor_status === 'approved';

    if (!isAuthenticated) {
      navigation.navigate('Auth', { screen: 'Login' });
      return;
    }

    if (isVendor && isApproved) {
      navigation.navigate('VendorDashboard');
      return;
    }

    if (isVendor && !isApproved) {
      Alert.alert(
        '⏳ Application Pending',
        'Your seller application is being reviewed. We will notify you once approved.',
        [{ text: 'OK' }]
      );
      return;
    }

    navigation.navigate('VendorRegister');
  };

  // ── GUEST SCREEN ─────────────────────────────────
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

        {/* Top bar */}
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

  // ── LOGGED IN SCREEN ──────────────────────────────
  const isVendor = user?.role === 'vendor';
  const isApprovedVendor = isVendor && user?.vendor_status === 'approved';
  const initials = (user?.username || user?.email || 'U')[0].toUpperCase();

  const SHORTCUTS = [
    { icon: '📦', label: 'My Orders', screen: 'Orders' },
    { icon: '❤️', label: 'Wishlist', screen: 'Wishlist' },
    { icon: '🕐', label: 'Recently Viewed', screen: 'RecentlyViewed' },
    { icon: '🔄', label: 'Buy Again', screen: 'Orders' },
    { icon: '☰', label: 'Menu', screen: 'AccountMenu' },
  ];

  const MENU_ITEMS = [
    { icon: '✏️', label: 'Edit Profile', screen: 'EditProfile' },
    { icon: '📍', label: 'Saved Addresses', screen: 'Address' },
    { icon: '💳', label: 'Payment Methods', screen: 'Wallet' },
    { icon: '🔔', label: 'Notifications', screen: 'Notifications' },
    { icon: '💬', label: 'Help & Support', screen: 'Chat' },
    { icon: '⚙️', label: 'Settings', screen: 'Settings' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Top profile bar */}
        <View style={styles.topProfileBar}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.username || 'VUMA User'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            {user?.phone ? <Text style={styles.userPhone}>{user.phone}</Text> : null}
            {isVendor && (
              <View style={[styles.vendorBadge, !isApprovedVendor && styles.vendorBadgePending]}>
                <Text style={styles.vendorBadgeText}>
                  {isApprovedVendor ? '✓ Verified Seller' : '⏳ Seller Application Pending'}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.topBarIconsCol}>
            <TouchableOpacity style={styles.topIconBtn} onPress={() => navigation.navigate('Settings')}>
              <Text style={styles.topIcon}>⚙️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.topIconBtn} onPress={() => navigation.navigate('Notifications')}>
              <Text style={styles.topIcon}>🔔</Text>
              <View style={styles.notifDot} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Referral Banner */}
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
          <View style={styles.inviteNowBtn}>
            <Text style={styles.inviteNowText}>Invite Now ›</Text>
          </View>
        </TouchableOpacity>

        {/* Wallet + Orders stat row (real data) */}
        <View style={styles.statRow}>
          <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('Wallet')} activeOpacity={0.8}>
            <Text style={styles.statIcon}>👛</Text>
            <View style={styles.statTextCol}>
              <Text style={styles.statLabel}>VUMA Wallet</Text>
              <Text style={styles.statValue}>
                {walletBalance === null ? '—' : `TZS ${Number(walletBalance).toLocaleString()}`}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('Orders')} activeOpacity={0.8}>
            <Text style={styles.statIcon}>📦</Text>
            <View style={styles.statTextCol}>
              <Text style={styles.statLabel}>Total Orders</Text>
              <Text style={styles.statValue}>{totalOrders === null ? '—' : totalOrders}</Text>
            </View>
            <Text style={styles.statArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Shortcuts row */}
        <View style={styles.shortcutsRow}>
          {SHORTCUTS.map((s) => (
            <TouchableOpacity key={s.label} style={styles.shortcutItem} onPress={() => navigation.navigate(s.screen)}>
              <View style={styles.shortcutIconWrap}>
                <Text style={styles.shortcutIcon}>{s.icon}</Text>
              </View>
              <Text style={styles.shortcutLabel} numberOfLines={2}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Vendor Dashboard Button */}
        {isVendor && (
          <TouchableOpacity
            style={[styles.vendorDashBtn, !isApprovedVendor && styles.vendorDashBtnPending]}
            onPress={handleGoToDashboard}
          >
            <Text style={styles.vendorDashText}>
              {isApprovedVendor ? '🏪 Go to Seller Dashboard' : '⏳ Check Application Status'}
            </Text>
          </TouchableOpacity>
        )}
        {!isVendor && (
          <TouchableOpacity style={styles.becomeSellerBtn} onPress={() => navigation.navigate('VendorRegister')}>
            <Text style={styles.becomeSellerIcon}>🏪</Text>
            <View style={styles.becomeSellerText}>
              <Text style={styles.becomeSellerTitle}>Become a VUMA Seller</Text>
              <Text style={styles.becomeSellerSub}>Commission from 3% only · Free registration</Text>
            </View>
            <Text style={styles.becomeSellerArrow}>›</Text>
          </TouchableOpacity>
        )}

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
                <View style={styles.orderCardBottom}>
                  <Text style={styles.orderMeta}>
                    {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''} · TZS {Number(order.total_amount || 0).toLocaleString()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Buy Again — derived from real delivered-order history, no
            new backend endpoint needed */}
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

        {/* Recently Viewed — real data, real infinite scroll */}
        {recentlyViewed.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recently Viewed</Text>
              <TouchableOpacity onPress={() => navigation.navigate('RecentlyViewed')}>
                <Text style={styles.seeAll}>See all ›</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}
              onScroll={handleHScroll(loadMoreRecentlyViewed)} scrollEventThrottle={200}
            >
              {recentlyViewed.map((p) => (
                <ProductCard
                  key={p.id} product={p} variant="featured"
                  onPress={() => navigation.navigate('ProductDetail', { productId: p.id, product: p })}
                  style={styles.hCard}
                />
              ))}
              {rvLoadingMore && <View style={styles.hLoadingMore}><ActivityIndicator size="small" color={COLORS.primary} /></View>}
            </ScrollView>
          </View>
        )}

        {/* Inspired for You — real recommendations, real infinite scroll */}
        {recommended.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Inspired for You</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Home')}>
                <Text style={styles.seeAll}>See all ›</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}
              onScroll={handleHScroll(loadMoreRecommended)} scrollEventThrottle={200}
            >
              {recommended.map((p) => (
                <ProductCard
                  key={p.id} product={p} variant="featured"
                  onPress={() => navigation.navigate('ProductDetail', { productId: p.id, product: p })}
                  style={styles.hCard}
                />
              ))}
              {recLoadingMore && <View style={styles.hLoadingMore}><ActivityIndicator size="small" color={COLORS.primary} /></View>}
            </ScrollView>
          </View>
        )}

        {/* Menu */}
        <View style={styles.menuSection}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.menuItem}
              onPress={() => navigation.navigate(item.screen)}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => setShowLogoutModal(true)}
          disabled={loggingOut}
        >
          <Text style={styles.logoutIcon}>⭐</Text>
          <Text style={styles.logoutText}>{loggingOut ? 'Logging out...' : 'Logout'}</Text>
        </TouchableOpacity>

        {/* Delete Account */}
        <TouchableOpacity style={styles.deleteBtn} onPress={() => setShowDeleteModal(true)}>
          <Text style={styles.deleteIcon}>⚠️</Text>
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Logout Modal */}
      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalIcon}>👋</Text>
            <Text style={styles.modalTitle}>Logout?</Text>
            <Text style={styles.modalText}>You will be signed out. Your cart and data will be saved.</Text>
            <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleLogout}>
              <Text style={styles.modalConfirmText}>Yes, Logout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowLogoutModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalIcon}>⚠️</Text>
            <Text style={styles.modalTitle}>Delete Account?</Text>
            <Text style={styles.modalText}>
              This will permanently delete your account, orders, and all data.{'\n\n'}
              This action CANNOT be undone.
            </Text>
            <TouchableOpacity style={styles.modalDeleteBtn} onPress={handleDeleteAccount}>
              <Text style={styles.modalDeleteText}>Yes, Delete My Account</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowDeleteModal(false)}>
              <Text style={styles.modalCancelText}>Cancel — Keep My Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  // Top profile bar (logged in)
  topProfileBar: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.surface, padding: SPACING.base, paddingTop: Platform.OS === 'ios' ? 54 : SPACING.base, gap: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  avatar: { width: 56, height: 56, borderRadius: RADIUS.full, backgroundColor: COLORS.primaryFade, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: FONTS.xl, fontWeight: FONTS.black, color: COLORS.primary },
  userInfo: { flex: 1 },
  userName: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  userEmail: { fontSize: FONTS.sm, color: COLORS.textMuted, marginTop: 2 },
  userPhone: { fontSize: FONTS.sm, color: COLORS.textMuted, marginTop: 1 },
  vendorBadge: { alignSelf: 'flex-start', backgroundColor: COLORS.primaryFade, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 3, marginTop: 5 },
  vendorBadgePending: { backgroundColor: '#FFF8E7' },
  vendorBadgeText: { fontSize: FONTS.xs, color: COLORS.primary, fontWeight: FONTS.bold },
  topBarIconsCol: { flexDirection: 'row', gap: SPACING.sm },
  topIconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  topIcon: { fontSize: 18 },
  notifDot: { position: 'absolute', top: 2, right: 2, width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.primary },

  // Referral banner
  referralBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', marginHorizontal: SPACING.sm, marginTop: SPACING.sm, marginBottom: SPACING.sm, borderRadius: RADIUS.xl, padding: SPACING.base, borderWidth: 1.5, borderColor: COLORS.primary + '30', gap: SPACING.sm, ...SHADOWS.sm },
  referralBannerIcon: { fontSize: 26 },
  referralBannerText: { flex: 1 },
  referralBannerTitle: { fontSize: FONTS.sm, fontWeight: FONTS.black, color: COLORS.primary },
  referralBannerSub: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  inviteNowBtn: { backgroundColor: 'white', borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm + 2, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.primary + '40' },
  inviteNowText: { fontSize: FONTS.xs, color: COLORS.primary, fontWeight: FONTS.bold },

  // Wallet / Orders stat row
  statRow: { flexDirection: 'row', alignItems: 'stretch', backgroundColor: COLORS.surface, marginHorizontal: SPACING.sm, marginBottom: SPACING.sm, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  statCard: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: SPACING.base, gap: SPACING.sm },
  statIcon: { fontSize: 22 },
  statTextCol: { flex: 1 },
  statLabel: { fontSize: FONTS.xs, color: COLORS.textMuted },
  statValue: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginTop: 2 },
  statArrow: { fontSize: FONTS.lg, color: COLORS.textMuted },
  statDivider: { width: 1, backgroundColor: COLORS.divider, marginVertical: SPACING.sm },

  // Shortcuts
  shortcutsRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.surface, marginHorizontal: SPACING.sm, marginBottom: SPACING.sm, borderRadius: RADIUS.xl, padding: SPACING.base, borderWidth: 1, borderColor: COLORS.border },
  shortcutItem: { flex: 1, alignItems: 'center', gap: 6 },
  shortcutIconWrap: { width: 42, height: 42, borderRadius: RADIUS.lg, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  shortcutIcon: { fontSize: 18 },
  shortcutLabel: { fontSize: 10, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 12 },

  vendorDashBtn: { backgroundColor: COLORS.primary, marginHorizontal: SPACING.sm, marginBottom: SPACING.sm, borderRadius: RADIUS.xl, padding: SPACING.base, alignItems: 'center' },
  vendorDashBtnPending: { backgroundColor: COLORS.warning },
  vendorDashText: { color: 'white', fontSize: FONTS.base, fontWeight: FONTS.bold },
  becomeSellerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1B4332', marginHorizontal: SPACING.sm, marginBottom: SPACING.sm, borderRadius: RADIUS.xl, padding: SPACING.base, gap: SPACING.sm },
  becomeSellerIcon: { fontSize: 24 },
  becomeSellerText: { flex: 1 },
  becomeSellerTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: 'white' },
  becomeSellerSub: { fontSize: FONTS.xs, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  becomeSellerArrow: { fontSize: FONTS.xl, color: 'rgba(255,255,255,0.7)' },

  // Sections
  section: { marginBottom: SPACING.sm, backgroundColor: COLORS.surface, paddingVertical: SPACING.base },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.base, marginBottom: SPACING.sm },
  sectionTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  seeAll: { fontSize: FONTS.xs, color: COLORS.primary, fontWeight: FONTS.semiBold },
  hScroll: { paddingHorizontal: SPACING.base, gap: SPACING.sm },
  hCard: { width: 140, height: 190 },
  hLoadingMore: { width: 60, justifyContent: 'center', alignItems: 'center' },

  // My Orders cards
  orderCard: { marginHorizontal: SPACING.base, marginBottom: SPACING.sm, backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg, padding: SPACING.sm + 2, borderWidth: 1, borderColor: COLORS.borderLight },
  orderCardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  orderStatusText: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.success },
  orderDate: { fontSize: FONTS.xs, color: COLORS.textMuted },
  orderCardBottom: {},
  orderMeta: { fontSize: FONTS.xs, color: COLORS.textSecondary },

  menuSection: { backgroundColor: COLORS.surface, marginBottom: SPACING.sm },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.base, paddingVertical: SPACING.base + 2, borderBottomWidth: 1, borderBottomColor: COLORS.divider, gap: SPACING.base },
  menuIcon: { fontSize: 20, width: 28 },
  menuLabel: { flex: 1, fontSize: FONTS.base, color: COLORS.textPrimary, fontWeight: FONTS.medium },
  menuArrow: { fontSize: FONTS.xl, color: COLORS.textMuted },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, marginHorizontal: SPACING.sm, marginBottom: SPACING.sm, borderRadius: RADIUS.xl, padding: SPACING.base, gap: SPACING.base, borderWidth: 1.5, borderColor: COLORS.primary },
  logoutIcon: { fontSize: 20 },
  logoutText: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.primary },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.sm, marginBottom: SPACING.sm, padding: SPACING.base, gap: SPACING.base },
  deleteIcon: { fontSize: 16 },
  deleteText: { fontSize: FONTS.sm, color: COLORS.danger },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  modalCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS['2xl'], padding: SPACING.xl, width: '100%', alignItems: 'center' },
  modalIcon: { fontSize: 48, marginBottom: SPACING.base },
  modalTitle: { fontSize: FONTS['2xl'], fontWeight: FONTS.black, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  modalText: { fontSize: FONTS.sm, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.xl },
  modalConfirmBtn: { width: '100%', backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, padding: SPACING.base, alignItems: 'center', marginBottom: SPACING.sm },
  modalConfirmText: { color: 'white', fontSize: FONTS.base, fontWeight: FONTS.bold },
  modalDeleteBtn: { width: '100%', backgroundColor: COLORS.danger, borderRadius: RADIUS.xl, padding: SPACING.base, alignItems: 'center', marginBottom: SPACING.sm },
  modalDeleteText: { color: 'white', fontSize: FONTS.base, fontWeight: FONTS.bold },
  modalCancelBtn: { paddingVertical: SPACING.sm },
  modalCancelText: { fontSize: FONTS.sm, color: COLORS.textMuted, fontWeight: FONTS.semiBold },
});