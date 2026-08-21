/**
 * VUMA Store — Seller Dashboard (Duka Langu)
 * Redesigned: clean white Coupang-Wing-style layout, slide-out drawer
 * menu with the 9 seller sections, real order-stage funnel, friendly
 * Tanzania-market labels (English + Swahili subtitles).
 *
 * All data below comes from real backend fields — see
 * apps/vendors/views.py `dashboard()`. Nothing here is fabricated.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Platform, RefreshControl, Alert, Modal,
} from 'react-native';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/authSlice';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, VENDOR_STATUS } from '../../utils/constants';
import { formatPrice, formatNumber, formatDate, getErrorMessage } from '../../utils/helpers';
import { t } from '../../i18n';
import { vendorsAPI } from '../../api/vendors';
import Loading from '../../components/common/Loading';
import { FullScreenError } from '../../components/common/ErrorMessage';
import { VendorEarningsCard } from '../../components/CommissionCalculator';

// ── The 9 seller sections, English label + short Swahili subtitle,
// matching how M-Pesa/Tigo Pesa apps pair the two languages. Only
// sections with a real, existing screen navigate there directly —
// the rest show "Coming soon" rather than link to something that
// doesn't exist yet.
const DRAWER_SECTIONS = [
  { key: 'home', label: 'Home', sw: 'Nyumbani', icon: '🏠', screen: null },
  { key: 'products', label: 'My Products', sw: 'Bidhaa Zangu', icon: '📦', screen: 'VendorProducts' },
  { key: 'orders', label: 'Orders', sw: 'Maagizo', icon: '🧾', screen: 'VendorOrders' },
  { key: 'customers', label: 'Customers', sw: 'Wateja', icon: '👥', screen: null },
  { key: 'messages', label: 'Messages', sw: 'Ujumbe', icon: '💬', screen: 'Chat' },
  { key: 'payments', label: 'Payments', sw: 'Malipo', icon: '💰', screen: null },
  { key: 'delivery', label: 'Delivery', sw: 'Usafirishaji', icon: '🚚', screen: null },
  { key: 'sales', label: 'Sales', sw: 'Mauzo', icon: '📊', screen: null },
  { key: 'settings', label: 'Store Settings', sw: 'Mipangilio ya Duka', icon: '⚙️', screen: 'Settings' },
];

// Coupang-style order funnel — 5 stages, matching the real backend
// buckets in order_status_counts.
const FUNNEL_STAGES = [
  { key: 'payment_completed', label: 'Payment', sw: 'Malipo' },
  { key: 'processing', label: 'Processing', sw: 'Inatayarishwa' },
  { key: 'shipped', label: 'Shipped', sw: 'Imesafirishwa' },
  { key: 'in_transit', label: 'In Transit', sw: 'Njiani' },
  { key: 'delivered', label: 'Delivered', sw: 'Imefika' },
];

const SellerDrawer = ({ visible, onClose, navigation, shopName }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.drawerOverlay}>
      <TouchableOpacity style={styles.drawerBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.drawerPanel}>
        <View style={styles.drawerHeader}>
          <View style={styles.drawerShopIcon}>
            <Text style={styles.drawerShopIconText}>{(shopName || 'V')[0].toUpperCase()}</Text>
          </View>
          <Text style={styles.drawerShopName} numberOfLines={1}>{shopName || 'My Store'}</Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {DRAWER_SECTIONS.map(section => (
            <TouchableOpacity
              key={section.key}
              style={styles.drawerItem}
              activeOpacity={0.7}
              onPress={() => {
                onClose();
                if (section.screen) {
                  navigation.navigate(section.screen);
                } else if (section.key !== 'home') {
                  Alert.alert(section.label, 'Coming soon.');
                }
              }}
            >
              <Text style={styles.drawerItemIcon}>{section.icon}</Text>
              <View style={styles.drawerItemText}>
                <Text style={styles.drawerItemLabel}>{section.label}</Text>
                <Text style={styles.drawerItemSw}>{section.sw}</Text>
              </View>
              <Text style={styles.drawerItemArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

export default function VendorDashboard({ navigation }) {
  const user = useSelector(selectUser);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);

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

  if (loading) return <Loading fullScreen />;
  if (error) return <FullScreenError error={error} onRetry={loadDashboard} />;

  const StatCard = ({ icon, label, labelSw, value, color = COLORS.primary, style }) => (
    <View style={[styles.statCard, style]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {labelSw && <Text style={styles.statLabelSw}>{labelSw}</Text>}
    </View>
  );

  const RecentOrderRow = ({ order }) => (
    <TouchableOpacity
      style={styles.recentOrder}
      onPress={() => order.order_id && navigation.navigate('OrderDetail', { orderId: order.order_id })}
      activeOpacity={0.75}
    >
      <View style={styles.recentOrderLeft}>
        <Text style={styles.recentOrderNum}>#{order.order_number}</Text>
        <Text style={styles.recentOrderProduct} numberOfLines={1}>{order.product_name} ×{order.quantity}</Text>
        <Text style={styles.recentOrderDate}>{order.date}</Text>
      </View>
      <View style={styles.recentOrderRight}>
        <Text style={styles.recentOrderAmount}>{formatPrice(order.earning)}</Text>
        <View style={styles.recentOrderStatus}>
          <Text style={styles.recentOrderStatusText}>{order.status}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const counts = dashboard?.order_status_counts || {};
  const ordersToPrepare = counts.processing || 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowDrawer(true)} style={styles.menuBtn}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.shopName} numberOfLines={1}>{dashboard?.shop_name || user?.shop_name || 'My Store'}</Text>
          <Text style={styles.shopNameSw}>Duka Langu</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.menuBtn}>
          <Text style={styles.menuIcon}>🔔</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Money Received */}
        <View style={styles.moneyCard}>
          <Text style={styles.moneyLabel}>Money Received</Text>
          <Text style={styles.moneyLabelSw}>Pesa Ulizopokea</Text>
          <Text style={styles.moneyAmount}>{formatPrice(dashboard?.total_earnings || 0)}</Text>
          <View style={styles.moneySplitRow}>
            <View style={styles.moneySplitItem}>
              <Text style={styles.moneySplitLabel}>Available</Text>
              <Text style={styles.moneySplitValue}>{formatPrice(dashboard?.available_balance || 0)}</Text>
            </View>
            <View style={styles.moneySplitDivider} />
            <View style={styles.moneySplitItem}>
              <Text style={styles.moneySplitLabel}>Pending</Text>
              <Text style={styles.moneySplitValue}>{formatPrice(dashboard?.pending_balance || 0)}</Text>
            </View>
          </View>
          {(dashboard?.available_balance || 0) > 0 && (
            <TouchableOpacity style={styles.payoutBtn} onPress={handleRequestPayout} activeOpacity={0.85}>
              <Text style={styles.payoutBtnText}>{t('vendor.requestPayout')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <StatCard icon="🧾" label="My Sales" labelSw="Mauzo Yangu" value={formatNumber(dashboard?.total_orders || 0)} style={styles.statThird} />
          <StatCard icon="📦" label="Products" labelSw="Bidhaa" value={formatNumber(dashboard?.total_products || 0)} style={styles.statThird} />
          <StatCard icon="👥" label="Customers" labelSw="Wateja" value={formatNumber(dashboard?.total_customers || 0)} style={styles.statThird} />
        </View>

        {/* Orders to Prepare — highlighted actionable stat */}
        {ordersToPrepare > 0 && (
          <TouchableOpacity style={styles.prepareCard} onPress={() => navigation.navigate('VendorOrders')} activeOpacity={0.85}>
            <View>
              <Text style={styles.prepareLabel}>Orders to Prepare</Text>
              <Text style={styles.prepareLabelSw}>Maagizo ya Kuandaa</Text>
            </View>
            <View style={styles.prepareCountWrap}>
              <Text style={styles.prepareCount}>{ordersToPrepare}</Text>
              <Text style={styles.prepareArrow}>›</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Sales / Delivery funnel */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sales & Delivery</Text>
          <View style={styles.funnelRow}>
            {FUNNEL_STAGES.map((stage, i) => (
              <React.Fragment key={stage.key}>
                <View style={styles.funnelStage}>
                  <Text style={styles.funnelCount}>{counts[stage.key] || 0}</Text>
                  <Text style={styles.funnelLabel}>{stage.label}</Text>
                  <Text style={styles.funnelLabelSw}>{stage.sw}</Text>
                </View>
                {i < FUNNEL_STAGES.length - 1 && <Text style={styles.funnelChevron}>›</Text>}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Commission & Earnings Statement */}
        <View style={styles.commissionSection}>
          <Text style={styles.cardTitle}>Commission & Earnings</Text>
          <VendorEarningsCard style={styles.earningsCard} />
        </View>

        {/* Quick Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            {[
              { icon: '➕', label: 'Add Product', onPress: () => navigation.navigate('VendorProducts', { action: 'add' }) },
              { icon: '🧾', label: 'Orders', onPress: () => navigation.navigate('VendorOrders') },
              { icon: '📦', label: 'Products', onPress: () => navigation.navigate('VendorProducts') },
              { icon: '💬', label: 'Messages', onPress: () => navigation.navigate('Chat') },
            ].map((action) => (
              <TouchableOpacity key={action.label} style={styles.quickAction} onPress={action.onPress} activeOpacity={0.7}>
                <View style={styles.quickActionIcon}>
                  <Text style={styles.quickActionEmoji}>{action.icon}</Text>
                </View>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Orders */}
        {dashboard?.recent_orders?.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Recent Orders</Text>
              <TouchableOpacity onPress={() => navigation.navigate('VendorOrders')}>
                <Text style={styles.seeAll}>See all ›</Text>
              </TouchableOpacity>
            </View>
            {dashboard.recent_orders.slice(0, 5).map((order, i) => (
              <RecentOrderRow key={order.order_id || i} order={order} />
            ))}
          </View>
        )}

        {/* Out of Stock alert */}
        {(dashboard?.out_of_stock || 0) > 0 && (
          <TouchableOpacity style={[styles.card, styles.warningCard]} onPress={() => navigation.navigate('VendorProducts')} activeOpacity={0.85}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Out of Stock</Text>
              <Text style={styles.outOfStockCount}>{dashboard.out_of_stock}</Text>
            </View>
            <Text style={styles.outOfStockHint}>Tap to restock your products — Gusa kuongeza bidhaa</Text>
          </TouchableOpacity>
        )}

        {/* Store Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Store Info</Text>
          {[
            ['Status', user?.vendor_status],
            ['Rating', dashboard?.rating_avg ? Number(dashboard.rating_avg).toFixed(1) : 'N/A'],
            ['Commission Rate', `${dashboard?.commission_rate || 0}%`],
            ['Payout Schedule', 'Within 3 business days'],
          ].map(([label, value]) => (
            <View key={label} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{label}</Text>
              <Text style={[styles.infoValue, label === 'Status' && user?.vendor_status === VENDOR_STATUS.APPROVED && { color: COLORS.success }]}>
                {value || '-'}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <SellerDrawer
        visible={showDrawer}
        onClose={() => setShowDrawer(false)}
        navigation={navigation}
        shopName={dashboard?.shop_name || user?.shop_name}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F8' },
  scrollContent: { paddingBottom: SPACING.xl },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', paddingHorizontal: SPACING.base,
    paddingTop: Platform.OS === 'ios' ? SPACING['3xl'] : SPACING.base, paddingBottom: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  menuBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  menuIcon: { fontSize: 20, color: COLORS.textPrimary },
  headerCenter: { flex: 1, alignItems: 'center' },
  shopName: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  shopNameSw: { fontSize: 10.5, color: COLORS.textMuted, marginTop: 1 },

  // Drawer
  drawerOverlay: { flex: 1, flexDirection: 'row' },
  drawerBackdrop: { flex: 1, backgroundColor: 'rgba(18,22,43,0.4)' },
  drawerPanel: { width: 280, backgroundColor: '#FFFFFF', paddingTop: Platform.OS === 'ios' ? 54 : SPACING.xl },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.base, paddingBottom: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider, marginBottom: SPACING.xs },
  drawerShopIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.primaryFade, alignItems: 'center', justifyContent: 'center' },
  drawerShopIconText: { fontSize: 17, fontWeight: FONTS.bold, color: COLORS.primary },
  drawerShopName: { flex: 1, fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  drawerItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 4 },
  drawerItemIcon: { fontSize: 18, width: 26 },
  drawerItemText: { flex: 1 },
  drawerItemLabel: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textPrimary },
  drawerItemSw: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  drawerItemArrow: { fontSize: 18, color: COLORS.textLight },

  // Money card
  moneyCard: { backgroundColor: '#FFFFFF', margin: SPACING.sm, borderRadius: 18, padding: SPACING.xl, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  moneyLabel: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONTS.semiBold },
  moneyLabelSw: { fontSize: 11, color: COLORS.textMuted, marginBottom: SPACING.sm },
  moneyAmount: { fontSize: 36, fontWeight: FONTS.black, color: COLORS.textPrimary, letterSpacing: -0.5, marginBottom: SPACING.base },
  moneySplitRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F7F8', borderRadius: RADIUS.lg, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg },
  moneySplitItem: { alignItems: 'center', paddingHorizontal: SPACING.md },
  moneySplitLabel: { fontSize: 10.5, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  moneySplitValue: { fontSize: FONTS.sm, color: COLORS.textPrimary, fontWeight: FONTS.bold },
  moneySplitDivider: { width: 1, height: 28, backgroundColor: COLORS.border },
  payoutBtn: { marginTop: SPACING.base, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm + 2 },
  payoutBtnText: { color: '#FFFFFF', fontSize: FONTS.sm, fontWeight: FONTS.bold },

  // Stats row
  statsRow: { flexDirection: 'row', paddingHorizontal: SPACING.sm, gap: SPACING.sm, marginBottom: SPACING.sm },
  statThird: { flex: 1 },
  statCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: SPACING.base, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  statIcon: { fontSize: 18, marginBottom: 4 },
  statValue: { fontSize: FONTS.xl, fontWeight: FONTS.black, color: COLORS.textPrimary },
  statLabel: { fontSize: 10.5, color: COLORS.textSecondary, fontWeight: FONTS.medium, marginTop: 2 },
  statLabelSw: { fontSize: 9.5, color: COLORS.textMuted },

  // Orders to prepare
  prepareCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.primaryFade, marginHorizontal: SPACING.sm, marginBottom: SPACING.sm, borderRadius: 14, padding: SPACING.base, borderWidth: 1, borderColor: 'rgba(255,106,0,0.25)' },
  prepareLabel: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.primaryDark },
  prepareLabelSw: { fontSize: 11, color: COLORS.primaryDark, opacity: 0.7 },
  prepareCountWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  prepareCount: { fontSize: 22, fontWeight: FONTS.black, color: COLORS.primary },
  prepareArrow: { fontSize: 20, color: COLORS.primary },

  card: { backgroundColor: '#FFFFFF', margin: SPACING.sm, marginTop: 0, borderRadius: 14, padding: SPACING.base, borderWidth: 1, borderColor: COLORS.border },
  warningCard: { borderLeftWidth: 4, borderLeftColor: COLORS.danger },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.base },
  cardTitle: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.base },
  seeAll: { fontSize: FONTS.xs, color: COLORS.primary, fontWeight: FONTS.semiBold },

  // Funnel
  funnelRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  funnelStage: { alignItems: 'center', flex: 1 },
  funnelCount: { fontSize: FONTS.lg, fontWeight: FONTS.black, color: COLORS.textPrimary },
  funnelLabel: { fontSize: 10, color: COLORS.textSecondary, fontWeight: FONTS.medium, marginTop: 3, textAlign: 'center' },
  funnelLabelSw: { fontSize: 9, color: COLORS.textMuted, textAlign: 'center' },
  funnelChevron: { fontSize: 14, color: COLORS.textLight, marginTop: 6 },

  commissionSection: { marginHorizontal: SPACING.sm, marginBottom: SPACING.sm },
  earningsCard: {},

  quickActions: { flexDirection: 'row', justifyContent: 'space-between' },
  quickAction: { alignItems: 'center', gap: SPACING.xs, flex: 1 },
  quickActionIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F7F8' },
  quickActionEmoji: { fontSize: 20 },
  quickActionLabel: { fontSize: 10.5, color: COLORS.textSecondary, fontWeight: FONTS.medium, textAlign: 'center' },

  recentOrder: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: SPACING.sm + 2, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  recentOrderLeft: { flex: 1, gap: 2, paddingRight: SPACING.sm },
  recentOrderNum: { fontSize: FONTS.xs, fontWeight: FONTS.bold, color: COLORS.textPrimary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  recentOrderProduct: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  recentOrderDate: { fontSize: 10.5, color: COLORS.textMuted },
  recentOrderRight: { alignItems: 'flex-end', gap: 4 },
  recentOrderAmount: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  recentOrderStatus: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full, backgroundColor: '#F7F7F8' },
  recentOrderStatusText: { fontSize: 10, fontWeight: FONTS.semiBold, color: COLORS.textSecondary, textTransform: 'capitalize' },

  outOfStockCount: { fontSize: FONTS.lg, fontWeight: FONTS.black, color: COLORS.danger },
  outOfStockHint: { fontSize: FONTS.xs, color: COLORS.textMuted },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  infoLabel: { fontSize: FONTS.sm, color: COLORS.textMuted },
  infoValue: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary, textTransform: 'capitalize' },
});