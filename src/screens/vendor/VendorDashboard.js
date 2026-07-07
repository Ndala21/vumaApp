/**
 * VUMA Store — Vendor Dashboard
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Platform, RefreshControl, Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/authSlice';
import {
  COLORS, FONTS, SPACING, RADIUS, SHADOWS, SCREENS, VENDOR_STATUS,
} from '../../utils/constants';
import {
  formatPrice, formatNumber, formatDate, getErrorMessage,
} from '../../utils/helpers';
import { t } from '../../i18n';
import { vendorsAPI } from '../../api/vendors';
import Loading from '../../components/common/Loading';
import { FullScreenError } from '../../components/common/ErrorMessage';

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
      <View style={[styles.statIconWrap, { backgroundColor: color + '20' }]}>
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
      onPress={() => navigation.navigate('OrderDetail', {
        orderId: order.id, order,
      })}
    >
      <View style={styles.recentOrderLeft}>
        <Text style={styles.recentOrderNum}>
          #{order.order_number}
        </Text>
        <Text style={styles.recentOrderDate}>
          {formatDate(order.created_at)}
        </Text>
      </View>
      <View style={styles.recentOrderRight}>
        <Text style={styles.recentOrderAmount}>
          {formatPrice(order.vendor_earnings)}
        </Text>
        <View style={[styles.recentOrderStatus, {
          backgroundColor: order.status === 'delivered'
            ? COLORS.successLight : COLORS.warningLight,
        }]}>
          <Text style={[styles.recentOrderStatusText, {
            color: order.status === 'delivered'
              ? COLORS.successText : COLORS.warningText,
          }]}>
            {order.status}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content"
        backgroundColor={COLORS.secondary} />
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.username} 👋</Text>
          <Text style={styles.shopName}>
            🏪 {user?.shop_name || 'My Store'}
          </Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            style={styles.headerIconBtn}>
            <Text style={styles.headerIcon}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={styles.headerIconBtn}>
            <Text style={styles.headerIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.textWhite}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Earnings Banner */}
        <View style={styles.earningsBanner}>
          <Text style={styles.earningsLabel}>
            {t('vendor.totalEarnings')}
          </Text>
          <Text style={styles.earningsAmount}>
            {formatPrice(dashboard?.total_earnings || 0)}
          </Text>
          <Text style={styles.earningsSub}>
            Available:{' '}
            {formatPrice(dashboard?.available_for_payout || 0)}
            {' '}· Pending:{' '}
            {formatPrice(dashboard?.pending_earnings || 0)}
          </Text>
          {(dashboard?.available_for_payout || 0) > 0 && (
            <TouchableOpacity
              style={styles.payoutBtn}
              onPress={handleRequestPayout}
            >
              <Text style={styles.payoutBtnText}>
                {t('vendor.requestPayout')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="🛒"
            label={t('vendor.customerOrders')}
            value={formatNumber(dashboard?.total_orders || 0)}
            subValue={`${dashboard?.pending_orders || 0} pending`}
            color={COLORS.primary}
            style={styles.statHalf}
          />
          <StatCard
            icon="📦"
            label={t('vendor.myProducts')}
            value={formatNumber(dashboard?.total_products || 0)}
            subValue={`${dashboard?.active_products || 0} active`}
            color={COLORS.info}
            style={styles.statHalf}
          />
          <StatCard
            icon="⭐"
            label="Rating"
            value={dashboard?.avg_rating
              ? Number(dashboard.avg_rating).toFixed(1) : 'N/A'}
            subValue={`${dashboard?.total_reviews || 0} reviews`}
            color={COLORS.warning}
            style={styles.statHalf}
          />
          <StatCard
            icon="👥"
            label="Customers"
            value={formatNumber(dashboard?.total_customers || 0)}
            color={COLORS.success}
            style={styles.statHalf}
          />
        </View>

        {/* This Month */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📈 This Month</Text>
          <View style={styles.monthlyStats}>
            {[
              ['Revenue',
                formatPrice(dashboard?.monthly_revenue || 0),
                COLORS.primary],
              ['Orders', dashboard?.monthly_orders || 0, COLORS.info],
              ['Customers', dashboard?.monthly_customers || 0, COLORS.success],
            ].map(([label, value, color]) => (
              <View key={label} style={styles.monthlyStat}>
                <Text style={[styles.monthlyValue, { color }]}>
                  {value}
                </Text>
                <Text style={styles.monthlyLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⚡ Quick Actions</Text>
          <View style={styles.quickActions}>
            {[
              {
                icon: '➕', label: t('vendor.addProduct'),
                color: COLORS.primary,
                onPress: () => navigation.navigate(
                  'VendorProducts', { action: 'add' }
                ),
              },
              {
                icon: '📋', label: t('vendor.customerOrders'),
                color: COLORS.info,
                onPress: () => navigation.navigate('VendorOrders'),
              },
              {
                icon: '📦', label: t('vendor.myProducts'),
                color: COLORS.warning,
                onPress: () => navigation.navigate('VendorProducts'),
              },
              {
                icon: '💬', label: 'Messages',
                color: COLORS.success,
                onPress: () => navigation.navigate('Chat'),
              },
            ].map((action) => (
              <TouchableOpacity
                key={action.label}
                style={styles.quickAction}
                onPress={action.onPress}
              >
                <View style={[styles.quickActionIcon,
                  { backgroundColor: action.color + '20' }]}>
                  <Text style={styles.quickActionEmoji}>
                    {action.icon}
                  </Text>
                </View>
                <Text style={styles.quickActionLabel}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Orders */}
        {dashboard?.recent_orders?.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                🛒 {t('vendor.customerOrders')}
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('VendorOrders')}>
                <Text style={styles.seeAll}>See all →</Text>
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
            <Text style={styles.cardTitle}>⚠️ Low Stock Alert</Text>
            {dashboard.low_stock_products.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={styles.lowStockItem}
                onPress={() => navigation.navigate('VendorProducts')}
              >
                <Text style={styles.lowStockName} numberOfLines={1}>
                  {product.name}
                </Text>
                <Text style={styles.lowStockCount}>
                  {product.stock} left
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Store Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🏪 Store Info</Text>
          {[
            ['Status', user?.vendor_status],
            ['Member Since', formatDate(user?.approved_at)],
            ['Commission', '10%'],
          ].map(([label, value]) => (
            <View key={label} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{label}</Text>
              <Text style={[styles.infoValue,
                label === 'Status'
                  && user?.vendor_status === VENDOR_STATUS.APPROVED
                  && { color: COLORS.success }]}>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.base,
    paddingTop: Platform.OS === 'ios' ? SPACING['3xl'] : SPACING.base,
    paddingBottom: SPACING.base,
  },
  greeting: { fontSize: FONTS.base, color: 'rgba(255,255,255,0.8)' },
  shopName: {
    fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textWhite,
  },
  headerIcons: { flexDirection: 'row', gap: SPACING.sm },
  headerIconBtn: {
    width: 38, height: 38, borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerIcon: { fontSize: 18 },
  earningsBanner: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING['2xl'],
    paddingTop: SPACING.sm,
    alignItems: 'center',
  },
  earningsLabel: {
    fontSize: FONTS.sm, color: 'rgba(255,255,255,0.7)', marginBottom: SPACING.xs,
  },
  earningsAmount: {
    fontSize: 42, fontWeight: FONTS.black,
    color: COLORS.textWhite, letterSpacing: -1, marginBottom: SPACING.xs,
  },
  earningsSub: {
    fontSize: FONTS.xs, color: 'rgba(255,255,255,0.6)', textAlign: 'center',
  },
  payoutBtn: {
    marginTop: SPACING.base, backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm,
  },
  payoutBtnText: {
    color: COLORS.textWhite, fontSize: FONTS.sm, fontWeight: FONTS.bold,
  },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    padding: SPACING.sm, gap: SPACING.sm,
  },
  statCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    padding: SPACING.base, alignItems: 'flex-start', ...SHADOWS.sm,
  },
  statHalf: { flex: 1, minWidth: '45%' },
  statIconWrap: {
    width: 40, height: 40, borderRadius: RADIUS.lg,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm,
  },
  statIcon: { fontSize: 20 },
  statValue: {
    fontSize: FONTS['2xl'], fontWeight: FONTS.black, color: COLORS.textPrimary,
  },
  statLabel: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  statSub: { fontSize: FONTS.xs, color: COLORS.textLight, marginTop: 2 },
  card: {
    backgroundColor: COLORS.surface,
    margin: SPACING.sm, marginTop: 0,
    borderRadius: RADIUS.xl, padding: SPACING.base, ...SHADOWS.sm,
  },
  warningCard: { borderLeftWidth: 4, borderLeftColor: COLORS.warning },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: SPACING.base,
  },
  cardTitle: {
    fontSize: FONTS.base, fontWeight: FONTS.bold,
    color: COLORS.textPrimary, marginBottom: SPACING.base,
  },
  seeAll: {
    fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.semiBold,
  },
  monthlyStats: { flexDirection: 'row', justifyContent: 'space-between' },
  monthlyStat: { alignItems: 'center', flex: 1 },
  monthlyValue: { fontSize: FONTS.xl, fontWeight: FONTS.bold },
  monthlyLabel: {
    fontSize: FONTS.xs, color: COLORS.textMuted,
    marginTop: 2, textAlign: 'center',
  },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between' },
  quickAction: { alignItems: 'center', gap: SPACING.xs, flex: 1 },
  quickActionIcon: {
    width: 52, height: 52, borderRadius: RADIUS.xl,
    alignItems: 'center', justifyContent: 'center',
  },
  quickActionEmoji: { fontSize: 24 },
  quickActionLabel: {
    fontSize: FONTS.xs, color: COLORS.textSecondary,
    fontWeight: FONTS.medium, textAlign: 'center',
  },
  recentOrder: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  recentOrderLeft: { gap: 2 },
  recentOrderNum: {
    fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  recentOrderDate: { fontSize: FONTS.xs, color: COLORS.textMuted },
  recentOrderRight: { alignItems: 'flex-end', gap: 3 },
  recentOrderAmount: {
    fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.primary,
  },
  recentOrderStatus: {
    paddingHorizontal: SPACING.sm, paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  recentOrderStatusText: {
    fontSize: FONTS.xs, fontWeight: FONTS.semiBold, textTransform: 'capitalize',
  },
  lowStockItem: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  lowStockName: { flex: 1, fontSize: FONTS.sm, color: COLORS.textSecondary },
  lowStockCount: {
    fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.danger,
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: SPACING.sm, borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  infoLabel: { fontSize: FONTS.sm, color: COLORS.textMuted },
  infoValue: {
    fontSize: FONTS.sm, fontWeight: FONTS.semiBold,
    color: COLORS.textSecondary, textTransform: 'capitalize',
  },
});
