/**
 * VUMA Store — Vendor Dashboard
 * + Commission earnings card added
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Platform, RefreshControl, Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/authSlice';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, SCREENS, VENDOR_STATUS } from '../../utils/constants';
import { formatPrice, formatNumber, formatDate, getErrorMessage } from '../../utils/helpers';
import { t } from '../../i18n';
import { vendorsAPI } from '../../api/vendors';
import Loading from '../../components/common/Loading';
import { FullScreenError } from '../../components/common/ErrorMessage';
import { VendorEarningsCard } from '../../components/CommissionCalculator';

export default function VendorDashboard({ navigation }) {
  const user = useSelector(selectUser);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

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
      `Available: ${formatPrice(dashboard?.available_for_payout || 0)}\nEnter amount:`,
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

const StatCard = ({ icon, label, value, subValue, color = COLORS.primary, style }) => (
    <View style={[styles.statCard, style]}>
      <View style={[styles.statIconWrap, { backgroundColor: color + '18' }]}>
        <Text style={styles.statIcon}>{icon}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {subValue && <Text style={styles.statSub}>{subValue}</Text>}
    </View>
  );

  const RecentOrderRow = ({ order }) => (
    <TouchableOpacity
      style={styles.recentOrder}
      onPress={() => navigation.navigate('OrderDetail', { orderId: order.id, order })}
      activeOpacity={0.75}
    >
      <View style={styles.recentOrderLeft}>
        <Text style={styles.recentOrderNum}>#{order.order_number}</Text>
        <Text style={styles.recentOrderDate}>{formatDate(order.created_at)}</Text>
      </View>
      <View style={styles.recentOrderRight}>
        <Text style={styles.recentOrderAmount}>{formatPrice(order.vendor_earnings)}</Text>
        <View style={[styles.recentOrderStatus, {
          backgroundColor: order.status === 'delivered' ? COLORS.successLight : COLORS.warningLight,
        }]}>
          <Text style={[styles.recentOrderStatusText, {
            color: order.status === 'delivered' ? COLORS.successText : COLORS.warningText,
          }]}>
            {order.status}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Hello, {user?.username}</Text>
          <View style={styles.shopRow}>
            <View style={styles.shopDot} />
            <Text style={styles.shopName}>{user?.shop_name || 'My Store'}</Text>
          </View>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.headerIconBtn}>
            <Text style={styles.headerIcon}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.headerIconBtn}>
            <Text style={styles.headerIcon}>⚙</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.textWhite} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Earnings Banner */}
        <View style={styles.earningsBanner}>
          <Text style={styles.earningsLabel}>{t('vendor.totalEarnings')}</Text>
          <Text style={styles.earningsAmount}>{formatPrice(dashboard?.total_earnings || 0)}</Text>
          <View style={styles.earningsSplitRow}>
            <View style={styles.earningsSplitItem}>
              <Text style={styles.earningsSplitLabel}>Available</Text>
              <Text style={styles.earningsSplitValue}>{formatPrice(dashboard?.available_for_payout || 0)}</Text>
            </View>
            <View style={styles.earningsSplitDivider} />
            <View style={styles.earningsSplitItem}>
              <Text style={styles.earningsSplitLabel}>Pending</Text>
              <Text style={styles.earningsSplitValue}>{formatPrice(dashboard?.pending_earnings || 0)}</Text>
            </View>
          </View>
          {(dashboard?.available_for_payout || 0) > 0 && (
            <TouchableOpacity style={styles.payoutBtn} onPress={handleRequestPayout} activeOpacity={0.85}>
              <Text style={styles.payoutBtnText}>{t('vendor.requestPayout')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard icon="🛒" label={t('vendor.customerOrders')} value={formatNumber(dashboard?.total_orders || 0)} subValue={`${dashboard?.pending_orders || 0} pending`} color={COLORS.primary} style={styles.statHalf} />
          <StatCard icon="📦" label={t('vendor.myProducts')} value={formatNumber(dashboard?.total_products || 0)} subValue={`${dashboard?.active_products || 0} active`} color={COLORS.info} style={styles.statHalf} />
          <StatCard icon="⭐" label="Rating" value={dashboard?.avg_rating ? Number(dashboard.avg_rating).toFixed(1) : 'N/A'} subValue={`${dashboard?.total_reviews || 0} reviews`} color={COLORS.warning} style={styles.statHalf} />
          <StatCard icon="👥" label="Customers" value={formatNumber(dashboard?.total_customers || 0)} color={COLORS.success} style={styles.statHalf} />
        </View>

        {/* Commission & Earnings Statement */}
        <View style={styles.commissionSection}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionAccent} />
            <Text style={styles.commissionSectionTitle}>Commission & Earnings</Text>
          </View>
          <VendorEarningsCard style={styles.earningsCard} />
        </View>

        {/* This Month */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>This Month</Text>
          <View style={styles.monthlyStats}>
            {[
              ['Revenue', formatPrice(dashboard?.monthly_revenue || 0), COLORS.primary],
              ['Orders', dashboard?.monthly_orders || 0, COLORS.info],
              ['Customers', dashboard?.monthly_customers || 0, COLORS.success],
            ].map(([label, value, color]) => (
              <View key={label} style={styles.monthlyStat}>
                <Text style={[styles.monthlyValue, { color }]}>{value}</Text>
                <Text style={styles.monthlyLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            {[
              { icon: '➕', label: t('vendor.addProduct'), color: COLORS.primary, onPress: () => navigation.navigate('VendorProducts', { action: 'add' }) },
              { icon: '📋', label: t('vendor.customerOrders'), color: COLORS.info, onPress: () => navigation.navigate('VendorOrders') },
              { icon: '📦', label: t('vendor.myProducts'), color: COLORS.warning, onPress: () => navigation.navigate('VendorProducts') },
              { icon: '💬', label: 'Messages', color: COLORS.success, onPress: () => navigation.navigate('Chat') },
            ].map((action) => (
              <TouchableOpacity key={action.label} style={styles.quickAction} onPress={action.onPress} activeOpacity={0.8}>
                <View style={[styles.quickActionIcon, { backgroundColor: action.color + '16' }]}>
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
              <Text style={styles.cardTitle}>{t('vendor.customerOrders')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('VendorOrders')}>
                <Text style={styles.seeAll}>See all ›</Text>
              </TouchableOpacity>
            </View>
            {dashboard.recent_orders.slice(0, 5).map((order) => (
              <RecentOrderRow key={order.id} order={order} />
            ))}
          </View>
        )}

        {/* Low Stock Warning */}
        {dashboard?.low_stock_products?.length > 0 && (
          <View style={[styles.card, styles.warningCard]}>
            <Text style={styles.cardTitle}>Low Stock Alert</Text>
            {dashboard.low_stock_products.map((product) => (
              <TouchableOpacity key={product.id} style={styles.lowStockItem} onPress={() => navigation.navigate('VendorProducts')} activeOpacity={0.75}>
                <Text style={styles.lowStockName} numberOfLines={1}>{product.name}</Text>
                <Text style={styles.lowStockCount}>{product.stock} left</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Store Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Store Info</Text>
          {[
            ['Status', user?.vendor_status],
            ['Member Since', formatDate(user?.approved_at)],
            ['Commission Rate', 'Category-based (3%-15%)'],
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: SPACING.xl },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.secondary, paddingHorizontal: SPACING.base,
    paddingTop: Platform.OS === 'ios' ? SPACING['3xl'] : SPACING.base, paddingBottom: SPACING.base,
  },
  headerLeft: {},
  greeting: { fontSize: FONTS.sm, color: 'rgba(255,255,255,0.65)' },
  shopRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  shopDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary },
  shopName: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textWhite },
  headerIcons: { flexDirection: 'row', gap: SPACING.sm },
  headerIconBtn: { width: 38, height: 38, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  headerIcon: { fontSize: 17, color: COLORS.textWhite },
  earningsBanner: { backgroundColor: COLORS.secondary, paddingHorizontal: SPACING.xl, paddingBottom: SPACING['2xl'], paddingTop: SPACING.sm, alignItems: 'center' },
  earningsLabel: { fontSize: FONTS.sm, color: 'rgba(255,255,255,0.6)', marginBottom: 4, fontWeight: FONTS.medium },
  earningsAmount: { fontSize: 40, fontWeight: FONTS.black, color: COLORS.textWhite, letterSpacing: FONTS.trackTight, marginBottom: SPACING.md },
  earningsSplitRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: RADIUS.lg, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg },
  earningsSplitItem: { alignItems: 'center', paddingHorizontal: SPACING.md },
  earningsSplitLabel: { fontSize: 10.5, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  earningsSplitValue: { fontSize: FONTS.sm, color: COLORS.textWhite, fontWeight: FONTS.bold },
  earningsSplitDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.15)' },
  payoutBtn: { marginTop: SPACING.base, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm + 2, ...SHADOWS.primary },
  payoutBtnText: { color: COLORS.textWhite, fontSize: FONTS.sm, fontWeight: FONTS.bold },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: SPACING.sm, gap: SPACING.sm },
  statCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.base, alignItems: 'flex-start', borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.xs },
  statHalf: { flex: 1, minWidth: '45%' },
  statIconWrap: { width: 40, height: 40, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm },
  statIcon: { fontSize: 19 },
  statValue: { fontSize: FONTS['2xl'], fontWeight: FONTS.black, color: COLORS.textPrimary, letterSpacing: FONTS.trackTight },
  statLabel: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  statSub: { fontSize: FONTS.xs, color: COLORS.textLight, marginTop: 2 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.sm },
  sectionAccent: { width: 4, height: 15, borderRadius: 2, backgroundColor: COLORS.primary },
  commissionSection: { margin: SPACING.sm, marginTop: 0 },
  commissionSectionTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  earningsCard: {},
  card: { backgroundColor: COLORS.surface, margin: SPACING.sm, marginTop: 0, borderRadius: RADIUS.xl, padding: SPACING.base, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.xs },
  warningCard: { borderLeftWidth: 4, borderLeftColor: COLORS.warning },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.base },
  cardTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.base },
  seeAll: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.semiBold },
  monthlyStats: { flexDirection: 'row', justifyContent: 'space-between' },
  monthlyStat: { alignItems: 'center', flex: 1 },
  monthlyValue: { fontSize: FONTS.xl, fontWeight: FONTS.bold, letterSpacing: FONTS.trackTight },
  monthlyLabel: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2, textAlign: 'center' },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between' },
  quickAction: { alignItems: 'center', gap: SPACING.xs, flex: 1 },
  quickActionIcon: { width: 52, height: 52, borderRadius: RADIUS.xl, alignItems: 'center', justifyContent: 'center' },
  quickActionEmoji: { fontSize: 23 },
  quickActionLabel: { fontSize: FONTS.xs, color: COLORS.textSecondary, fontWeight: FONTS.medium, textAlign: 'center' },
  recentOrder: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.sm + 2, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  recentOrderLeft: { gap: 2 },
  recentOrderNum: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.textPrimary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  recentOrderDate: { fontSize: FONTS.xs, color: COLORS.textMuted },
  recentOrderRight: { alignItems: 'flex-end', gap: 4 },
  recentOrderAmount: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary, letterSpacing: FONTS.trackTight },
  recentOrderStatus: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full },
  recentOrderStatusText: { fontSize: 10.5, fontWeight: FONTS.semiBold, textTransform: 'capitalize' },
  lowStockItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  lowStockName: { flex: 1, fontSize: FONTS.sm, color: COLORS.textSecondary },
  lowStockCount: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.danger },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  infoLabel: { fontSize: FONTS.sm, color: COLORS.textMuted },
  infoValue: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary, textTransform: 'capitalize' },
});