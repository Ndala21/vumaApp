/**
 * VUMA Store — Order Screen
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, StatusBar, Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchOrders, selectOrders, selectOrdersLoading,
  selectOrdersErrors, selectOrdersHasNextPage,
  selectActiveStatusFilter, setStatusFilter, resetOrders,
} from '../../store/orderSlice';
import {
  COLORS, FONTS, SPACING, RADIUS, SHADOWS,
  ORDER_STATUS, ORDER_STATUS_COLORS,
} from '../../utils/constants';
import {
  formatPrice, formatDate,
  getOrderStatusLabel, getOrderStatusColor,
} from '../../utils/helpers';
import { t } from '../../i18n';
import { SkeletonListItem } from '../../components/common/Loading';
import { EmptyState, FullScreenError } from '../../components/common/ErrorMessage';

const getStatusTabs = () => [
  { label: t('common.all'), value: '' },
  { label: t('orders.pending'), value: ORDER_STATUS.PENDING },
  { label: t('orders.processing'), value: ORDER_STATUS.PROCESSING },
  { label: t('orders.shipped'), value: ORDER_STATUS.SHIPPED },
  { label: t('orders.delivered'), value: ORDER_STATUS.DELIVERED },
  { label: t('orders.cancelled'), value: ORDER_STATUS.CANCELLED },
];

export default function OrderScreen({ navigation }) {
  const dispatch = useDispatch();
  const orders = useSelector(selectOrders);
  const loading = useSelector(selectOrdersLoading);
  const errors = useSelector(selectOrdersErrors);
  const hasNextPage = useSelector(selectOrdersHasNextPage);
  const activeFilter = useSelector(selectActiveStatusFilter);

  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadOrders(true);
  }, [activeFilter]);

  const loadOrders = useCallback(async (reset = false) => {
    const page = reset ? 1 : currentPage;
    if (reset) {
      dispatch(resetOrders());
      setCurrentPage(1);
    }
    dispatch(fetchOrders({ page, status: activeFilter }));
  }, [activeFilter, currentPage]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrders(true);
    setRefreshing(false);
  }, [loadOrders]);

  const handleLoadMore = useCallback(() => {
    if (loading.loadingMore || loading.orders || !hasNextPage) return;
    const next = currentPage + 1;
    setCurrentPage(next);
    dispatch(fetchOrders({ page: next, status: activeFilter }));
  }, [loading, hasNextPage, currentPage, activeFilter]);

  const STATUS_TABS = getStatusTabs();

  const OrderItem = useCallback(({ item }) => {
    const statusColor = getOrderStatusColor(item.status);
    const statusLabel = getOrderStatusLabel(item.status);
    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => navigation.navigate('OrderDetail', {
          orderId: item.id, order: item,
        })}
        activeOpacity={0.85}
      >
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderNumber}>
              #{item.order_number}
            </Text>
            <Text style={styles.orderDate}>
              {formatDate(item.created_at)}
            </Text>
          </View>
          <View style={[styles.statusBadge,
            { backgroundColor: statusColor + '20' }]}>
            <View style={[styles.statusDot,
              { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText,
              { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </View>
        <View style={styles.orderDivider} />
        <View style={styles.orderBody}>
          <View style={styles.orderInfo}>
            <Text style={styles.itemCount}>
              📦 {item.item_count || 1}{' '}
              {(item.item_count || 1) === 1 ? 'item' : 'items'}
            </Text>
            {item.first_item_name && (
              <Text style={styles.firstItem} numberOfLines={1}>
                {item.first_item_name}
                {(item.item_count || 1) > 1 &&
                  ` +${(item.item_count || 1) - 1} more`}
              </Text>
            )}
          </View>
          <View style={styles.orderPriceWrap}>
            <Text style={styles.orderTotal}>
              {formatPrice(item.total_amount)}
            </Text>
            <Text style={styles.paymentMethod}>
              {item.payment_method?.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.orderFooter}>
          <View style={[styles.paymentBadge,
            item.payment_status === 'paid'
              ? styles.paymentPaid : styles.paymentUnpaid]}>
            <Text style={[styles.paymentBadgeText,
              item.payment_status === 'paid'
                ? styles.paymentPaidText
                : styles.paymentUnpaidText]}>
              {item.payment_status === 'paid'
                ? '✓ Paid'
                : '⏳ ' + (item.payment_status || 'Unpaid')}
            </Text>
          </View>
          <Text style={styles.viewDetails}>
            {t('orders.viewDetails')} →
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, []);

  const ListEmpty = () => {
    if (loading.orders) {
      return <View>{[1,2,3].map(i => <SkeletonListItem key={i} />)}</View>;
    }
    if (errors.orders) {
      return <FullScreenError error={errors.orders} onRetry={() => loadOrders(true)} />;
    }
    return (
      <EmptyState
        icon="📦"
        title={activeFilter
          ? `${t('common.noResults')}`
          : t('orders.noOrders')}
        message={activeFilter
          ? t('common.noResults')
          : t('orders.noOrdersMessage')}
        actionLabel={!activeFilter ? t('cart.startShopping') : null}
        onAction={!activeFilter
          ? () => navigation.navigate('Home') : null}
      />
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content"
        backgroundColor={COLORS.surface} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {t('orders.myOrders')}
        </Text>
        <Text style={styles.headerCount}>
          {orders.length} {t('common.all').toLowerCase()}
        </Text>
      </View>

      <View style={styles.tabsWrap}>
        <FlatList
          data={STATUS_TABS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.value}
          contentContainerStyle={styles.tabsContent}
          renderItem={({ item: tab }) => (
            <TouchableOpacity
              style={[styles.tab,
                activeFilter === tab.value && styles.tabActive]}
              onPress={() => dispatch(setStatusFilter(tab.value))}
            >
              {tab.value && (
                <View style={[styles.tabDot, {
                  backgroundColor:
                    ORDER_STATUS_COLORS[tab.value] || COLORS.textMuted,
                }]} />
              )}
              <Text style={[styles.tabText,
                activeFilter === tab.value && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={({ item }) => <OrderItem item={item} />}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={() =>
          loading.loadingMore
            ? <View style={styles.loadingMore}>
                <Text style={styles.loadingMoreText}>
                  {t('common.loading')}
                </Text>
              </View>
            : null
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.base,
    paddingTop: Platform.OS === 'ios' ? SPACING['3xl'] : SPACING.base,
    paddingBottom: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    ...SHADOWS.sm,
  },
  headerTitle: {
    fontSize: FONTS['2xl'],
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },
  headerCount: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
  },
  tabsWrap: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  tabsContent: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: COLORS.primaryFade,
    borderColor: COLORS.primary,
  },
  tabDot: {
    width: 6, height: 6, borderRadius: RADIUS.full,
  },
  tabText: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    fontWeight: FONTS.medium,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: FONTS.bold,
  },
  listContent: {
    padding: SPACING.sm,
    paddingBottom: 100,
  },
  orderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.base,
  },
  orderNumber: {
    fontSize: FONTS.base,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  orderDate: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  statusDot: { width: 6, height: 6, borderRadius: RADIUS.full },
  statusText: { fontSize: FONTS.xs, fontWeight: FONTS.bold },
  orderDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginHorizontal: SPACING.base,
  },
  orderBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.base,
  },
  orderInfo: { flex: 1, marginRight: SPACING.base },
  itemCount: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.semiBold,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  firstItem: { fontSize: FONTS.sm, color: COLORS.textMuted },
  orderPriceWrap: { alignItems: 'flex-end' },
  orderTotal: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
    color: COLORS.primary,
  },
  paymentMethod: {
    fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.base,
    paddingTop: SPACING.xs,
  },
  paymentBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  paymentPaid: { backgroundColor: COLORS.successLight },
  paymentUnpaid: { backgroundColor: COLORS.warningLight },
  paymentBadgeText: { fontSize: FONTS.xs, fontWeight: FONTS.bold },
  paymentPaidText: { color: COLORS.successText },
  paymentUnpaidText: { color: COLORS.warningText },
  viewDetails: {
    fontSize: FONTS.sm,
    color: COLORS.primary,
    fontWeight: FONTS.semiBold,
  },
  loadingMore: { padding: SPACING.xl, alignItems: 'center' },
  loadingMoreText: { fontSize: FONTS.sm, color: COLORS.textMuted },
});
