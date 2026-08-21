/**
 * VUMA Store — Seller Dashboard (Duka Langu)
 * Rebuilt to match the reference design closely: orange earnings card,
 * 4-stage Orders Overview (New/Preparing/On the way/Delivered), My
 * Products + Customers summary row, Quick Actions, and a grouped Menu
 * (Your Store / Money / Delivery / Communication / Store / Help)
 * replacing the earlier flat drawer.
 *
 * This screen does NOT render its own bottom tab bar — VendorNavigator
 * (Home/Orders/Products/Earnings/Store) already wraps it; adding a
 * second tab bar here would duplicate navigation.
 *
 * All data below comes from real backend fields — see
 * apps/vendors/views.py `dashboard()`. Nothing here is fabricated.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Platform, RefreshControl, Alert, Modal,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { selectUser, logout } from '../../store/authSlice';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, VENDOR_STATUS } from '../../utils/constants';
import { formatPrice, formatNumber, getErrorMessage } from '../../utils/helpers';
import { t } from '../../i18n';
import { vendorsAPI } from '../../api/vendors';
import Loading from '../../components/common/Loading';
import { FullScreenError } from '../../components/common/ErrorMessage';

const MENU_SECTIONS = [
  {
    heading: 'YOUR STORE',
    items: [
      { key: 'home', label: 'Home', icon: '🏠', active: true },
      { key: 'products', label: 'Products', icon: '🛍️', screen: 'VendorProducts' },
      { key: 'orders', label: 'Orders', icon: '🧾', screen: 'VendorOrders' },
      { key: 'customers', label: 'Customers', icon: '👥', screen: null },
    ],
  },
  {
    heading: 'MONEY',
    items: [
      { key: 'earnings', label: 'Earnings & Payments', icon: '💳', screen: null },
      { key: 'sales', label: 'Sales', icon: '📊', screen: null },
    ],
  },
  {
    heading: 'DELIVERY',
    items: [
      { key: 'delivery', label: 'Delivery & Pickup', icon: '🚚', screen: null },
    ],
  },
  {
    heading: 'COMMUNICATION',
    items: [
      { key: 'messages', label: 'Messages', icon: '💬', screen: 'Chat' },
    ],
  },
  {
    heading: 'STORE',
    items: [
      { key: 'store_profile', label: 'Store Profile', icon: '🏪', screen: null },
      { key: 'store_settings', label: 'Store Settings', icon: '⚙️', screen: 'Settings' },
    ],
  },
  {
    heading: 'HELP',
    items: [
      { key: 'help', label: 'Help & Support', icon: '❓', screen: 'Chat' },
    ],
  },
];

const SellerMenu = ({ visible, onClose, navigation, shopName, onLogout }) => (
  <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <View style={styles.menuContainer}>
      <View style={styles.menuHeader}>
        <View style={styles.menuAvatar}>
          <Text style={styles.menuAvatarText}>{(shopName || 'V')[0].toUpperCase()}</Text>
        </View>
        <Text style={styles.menuShopName} numberOfLines={1}>{(shopName || 'My Store').toUpperCase()}</Text>
        <TouchableOpacity onPress={onClose} style={styles.menuCloseBtn}>
          <Text style={styles.menuCloseIcon}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {MENU_SECTIONS.map(section => (
          <View key={section.heading} style={styles.menuSection}>
            <Text style={styles.menuSectionHeading}>{section.heading}</Text>
            {section.items.map(item => (
              <TouchableOpacity
                key={item.key}
                style={[styles.menuItem, item.active && styles.menuItemActive]}
                activeOpacity={0.7}
                onPress={() => {
                  if (item.key === 'home') { onClose(); return; }
                  onClose();
                  if (item.screen) navigation.navigate(item.screen);
                  else Alert.alert(item.label, 'Coming soon.');
                }}
              >
                <Text style={styles.menuItemIcon}>{item.icon}</Text>
                <Text style={[styles.menuItemLabel, item.active && styles.menuItemLabelActive]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <View style={styles.menuDivider} />
        <TouchableOpacity style={styles.menuLogout} onPress={() => { onClose(); onLogout(); }} activeOpacity={0.7}>
          <Text style={styles.menuLogoutIcon}>↪</Text>
          <Text style={styles.menuLogoutLabel}>Log out</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  </Modal>
);

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

export default function VendorDashboard({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const scrollRef = useRef(null);

  const loadDashboard = useCallback(async () => {
    try {
      setError(null);
      const data = await vendorsAPI.getDashboard();
      setDashboard(data);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }, [loadDashboard]);

  const handleRequestPayout = () => {
    Alert.prompt(
      t('vendor.requestPayout'),
      `Available: ${formatPrice(dashboard?.available_balance || 0)}\nEnter amount:`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async (amount) => {
            if (!amount || isNaN(amount)) return;
            try {
              await vendorsAPI.requestPayout(Number(amount));
              Alert.alert(t('common.ok'), 'Payout request submitted!');
              loadDashboard();
            } catch (e) {
              Alert.alert(t('common.error'), getErrorMessage(e));
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleLogout = async () => {
    setShowLogoutModal(false);
    try {
      await dispatch(logout());
    } catch {
      Alert.alert('Error', 'Could not log out. Please try again.');
    }
  };

  if (loading) return <Loading fullScreen />;
  if (error) return <FullScreenError error={error} onRetry={loadDashboard} />;

  const shopName = dashboard?.shop_name || user?.shop_name || 'My Store';
  const counts = dashboard?.order_status_counts || {};

  const ORDER_STAGES = [
    { key: 'new', icon: '🛍️', label: 'New orders', color: COLORS.primary },
    { key: 'preparing', icon: '📦', label: 'Preparing', color: COLORS.primary },
    { key: 'on_the_way', icon: '🚚', label: 'On the way', color: COLORS.primary },
    { key: 'delivered', icon: '✅', label: 'Delivered', color: COLORS.success },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerLogo}>VUMA</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.headerIconBtn}>
            <Text style={styles.headerBell}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowMenu(true)} activeOpacity={0.8}>
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>{shopName[0].toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Greeting */}
        <View style={styles.greetingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greetingText}>{getGreeting()}, 👋</Text>
            <Text style={styles.shopNameText}>{shopName}</Text>
            <Text style={styles.greetingSub}>Here's how your store is doing today.</Text>
          </View>
          {dashboard?.is_approved && (
            <View style={styles.approvedPill}>
              <Text style={styles.approvedPillText}>Approved ✓</Text>
            </View>
          )}
        </View>

        {/* Earnings */}
        <View style={styles.earningsCard}>
          <View style={styles.earningsTopRow}>
            <Text style={styles.earningsLabel}>Your earnings</Text>
            <Text style={styles.earningsViewLink}>View earnings →</Text>
          </View>
          <Text style={styles.earningsAmount}>{formatPrice(dashboard?.total_earnings || 0)}</Text>
          <View style={styles.earningsSplitRow}>
            <View style={styles.earningsSplitItem}>
              <Text style={styles.earningsSplitLabel}>Available</Text>
              <Text style={styles.earningsSplitValue}>{formatPrice(dashboard?.available_balance || 0)}</Text>
            </View>
            <View style={styles.earningsSplitItem}>
              <Text style={styles.earningsSplitLabel}>Pending</Text>
              <Text style={styles.earningsSplitValue}>{formatPrice(dashboard?.pending_balance || 0)}</Text>
            </View>
          </View>
          {(dashboard?.available_balance || 0) > 0 && (
            <TouchableOpacity style={styles.payoutBtn} onPress={handleRequestPayout} activeOpacity={0.85}>
              <Text style={styles.payoutBtnText}>{t('vendor.requestPayout')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Orders Overview */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Orders overview</Text>
          <TouchableOpacity onPress={() => navigation.navigate('VendorOrders')}>
            <Text style={styles.sectionLink}>View all orders →</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.ordersGrid}>
          {ORDER_STAGES.map(stage => (
            <TouchableOpacity
              key={stage.key}
              style={styles.orderStageCard}
              onPress={() => navigation.navigate('VendorOrders')}
              activeOpacity={0.75}
            >
              <Text style={styles.orderStageIcon}>{stage.icon}</Text>
              <Text style={styles.orderStageLabel}>{stage.label}</Text>
              <Text style={[styles.orderStageCount, { color: stage.color }]}>{counts[stage.key] || 0}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Products + Customers */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryIcon}>📦</Text>
            <Text style={styles.summaryTitle}>My products</Text>
            <Text style={styles.summaryCount}>{formatNumber(dashboard?.total_products || 0)}</Text>
            <Text style={styles.summarySub}>products</Text>
            <View style={styles.summaryLinks}>
              <TouchableOpacity onPress={() => navigation.navigate('VendorProducts', { action: 'add' })}>
                <Text style={styles.summaryLinkAdd}>+ Add product</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('VendorProducts')}>
                <Text style={styles.summaryLinkView}>Manage products →</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryIcon}>👥</Text>
            <Text style={styles.summaryTitle}>Customers</Text>
            <Text style={styles.summaryCount}>{formatNumber(dashboard?.total_customers || 0)}</Text>
            <Text style={styles.summarySub}>customers</Text>
            <TouchableOpacity onPress={() => Alert.alert('Customers', 'Coming soon.')}>
              <Text style={styles.summaryLinkView}>View customers →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('VendorProducts', { action: 'add' })}
            activeOpacity={0.8}
          >
            <View style={styles.quickActionIconSolid}>
              <Text style={styles.quickActionEmojiSolid}>➕</Text>
            </View>
            <Text style={styles.quickActionLabel}>Add Product</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('VendorOrders')} activeOpacity={0.8}>
            <View style={styles.quickActionIcon}>
              <Text style={styles.quickActionEmoji}>🛍️</Text>
            </View>
            <Text style={styles.quickActionLabel}>Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
            activeOpacity={0.8}
          >
            <View style={styles.quickActionIcon}>
              <Text style={styles.quickActionEmoji}>💳</Text>
            </View>
            <Text style={styles.quickActionLabel}>Earnings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('Chat')} activeOpacity={0.8}>
            <View style={styles.quickActionIcon}>
              <Text style={styles.quickActionEmoji}>💬</Text>
            </View>
            <Text style={styles.quickActionLabel}>Messages</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <SellerMenu
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        navigation={navigation}
        shopName={shopName}
        onLogout={() => setShowLogoutModal(true)}
      />

      {/* Logout confirm */}
      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
        <View style={styles.logoutOverlay}>
          <View style={styles.logoutCard}>
            <Text style={styles.logoutIcon}>👋</Text>
            <Text style={styles.logoutTitle}>Log out?</Text>
            <Text style={styles.logoutText}>You will be signed out of your seller account.</Text>
            <TouchableOpacity style={styles.logoutConfirmBtn} onPress={handleLogout}>
              <Text style={styles.logoutConfirmText}>Yes, Log out</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutCancelBtn} onPress={() => setShowLogoutModal(false)}>
              <Text style={styles.logoutCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { paddingHorizontal: SPACING.base, paddingBottom: SPACING.xl },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.base, paddingTop: Platform.OS === 'ios' ? SPACING['3xl'] : SPACING.base,
    paddingBottom: SPACING.sm,
  },
  headerLogo: { fontSize: 24, fontWeight: '900', color: COLORS.primary, letterSpacing: -0.5 },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: SPACING.base },
  headerIconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerBell: { fontSize: 19 },
  headerAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  headerAvatarText: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: 'white' },

  greetingRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: SPACING.sm, marginBottom: SPACING.base },
  greetingText: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  shopNameText: { fontSize: 22, fontWeight: FONTS.black, color: COLORS.textPrimary, marginTop: 2 },
  greetingSub: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  approvedPill: { backgroundColor: COLORS.successLight, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 4 },
  approvedPillText: { fontSize: 10.5, fontWeight: FONTS.bold, color: COLORS.successText },

  earningsCard: { backgroundColor: COLORS.primary, borderRadius: 18, padding: SPACING.base + 2, marginBottom: SPACING.xl, ...SHADOWS.primary },
  earningsTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  earningsLabel: { fontSize: FONTS.sm, color: 'rgba(255,255,255,0.85)', fontWeight: FONTS.medium },
  earningsViewLink: { fontSize: FONTS.xs, color: 'rgba(255,255,255,0.9)', fontWeight: FONTS.semiBold },
  earningsAmount: { fontSize: 34, fontWeight: FONTS.black, color: 'white', letterSpacing: -0.5, marginBottom: SPACING.base },
  earningsSplitRow: { flexDirection: 'row', gap: SPACING.xl, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.25)', paddingTop: SPACING.sm },
  earningsSplitItem: {},
  earningsSplitLabel: { fontSize: 10.5, color: 'rgba(255,255,255,0.75)', marginBottom: 2 },
  earningsSplitValue: { fontSize: FONTS.base, color: 'white', fontWeight: FONTS.bold },
  payoutBtn: { marginTop: SPACING.base, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: RADIUS.full, paddingVertical: SPACING.sm, alignItems: 'center' },
  payoutBtnText: { color: 'white', fontSize: FONTS.sm, fontWeight: FONTS.bold },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  sectionTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  sectionLink: { fontSize: FONTS.xs, color: COLORS.primary, fontWeight: FONTS.semiBold },

  ordersGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.xl },
  orderStageCard: { width: '47%', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.base },
  orderStageIcon: { fontSize: 17, marginBottom: 6 },
  orderStageLabel: { fontSize: FONTS.xs, color: COLORS.textSecondary, marginBottom: 4 },
  orderStageCount: { fontSize: 24, fontWeight: FONTS.black },

  summaryRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xl },
  summaryCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.base },
  summaryIcon: { fontSize: 18, marginBottom: 6 },
  summaryTitle: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary, marginBottom: 4 },
  summaryCount: { fontSize: 26, fontWeight: FONTS.black, color: COLORS.textPrimary },
  summarySub: { fontSize: FONTS.xs, color: COLORS.textMuted, marginBottom: SPACING.sm },
  summaryLinks: { gap: 4 },
  summaryLinkAdd: { fontSize: 11, color: COLORS.primary, fontWeight: FONTS.bold },
  summaryLinkView: { fontSize: 11, color: COLORS.textMuted, fontWeight: FONTS.semiBold },

  quickActions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.base },
  quickAction: { alignItems: 'center', gap: SPACING.xs, flex: 1 },
  quickActionIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border },
  quickActionEmoji: { fontSize: 21 },
  quickActionIconSolid: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary },
  quickActionEmojiSolid: { fontSize: 21, color: 'white' },
  quickActionLabel: { fontSize: 10.5, color: COLORS.textSecondary, fontWeight: FONTS.medium, textAlign: 'center' },

  // Menu
  menuContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  menuHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.base, paddingTop: Platform.OS === 'ios' ? 54 : SPACING.xl, paddingBottom: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  menuAvatar: { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  menuAvatarText: { fontSize: 17, fontWeight: FONTS.bold, color: 'white' },
  menuShopName: { flex: 1, fontSize: FONTS.base, fontWeight: FONTS.black, color: COLORS.textPrimary },
  menuCloseBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  menuCloseIcon: { fontSize: 18, color: COLORS.textMuted },
  menuSection: { paddingHorizontal: SPACING.base, marginTop: SPACING.base },
  menuSectionHeading: { fontSize: 10.5, fontWeight: FONTS.bold, color: COLORS.primary, letterSpacing: 0.6, marginBottom: SPACING.xs },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm + 2, paddingHorizontal: SPACING.sm, borderRadius: 10 },
  menuItemActive: { backgroundColor: COLORS.primaryFade },
  menuItemIcon: { fontSize: 17, width: 24 },
  menuItemLabel: { fontSize: FONTS.sm, color: COLORS.textPrimary, fontWeight: FONTS.medium },
  menuItemLabelActive: { color: COLORS.primary, fontWeight: FONTS.bold },
  menuDivider: { height: 1, backgroundColor: COLORS.divider, marginTop: SPACING.base, marginHorizontal: SPACING.base },
  menuLogout: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.base + SPACING.sm, paddingVertical: SPACING.base },
  menuLogoutIcon: { fontSize: 17, width: 24, color: COLORS.danger },
  menuLogoutLabel: { fontSize: FONTS.sm, color: COLORS.danger, fontWeight: FONTS.semiBold },

  // Logout confirm modal
  logoutOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  logoutCard: { backgroundColor: '#FFFFFF', borderRadius: RADIUS['2xl'], padding: SPACING.xl, width: '100%', alignItems: 'center' },
  logoutIcon: { fontSize: 40, marginBottom: SPACING.sm },
  logoutTitle: { fontSize: FONTS.xl, fontWeight: FONTS.black, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  logoutText: { fontSize: FONTS.sm, color: COLORS.textMuted, textAlign: 'center', marginBottom: SPACING.xl },
  logoutConfirmBtn: { width: '100%', backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, padding: SPACING.base, alignItems: 'center', marginBottom: SPACING.sm },
  logoutConfirmText: { color: 'white', fontSize: FONTS.base, fontWeight: FONTS.bold },
  logoutCancelBtn: { paddingVertical: SPACING.sm },
  logoutCancelText: { fontSize: FONTS.sm, color: COLORS.textMuted, fontWeight: FONTS.semiBold },
});