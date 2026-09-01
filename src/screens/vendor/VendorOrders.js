/**
 * VUMA Store — Vendor Orders Screen
 * Restyled to match the new VUMA orange design system (Dashboard/Seller
 * Type screens): orange header, friendly stage labels (New/Preparing/
 * On the way/Delivered) and matching pill colors on order cards.
 *
 * All existing logic is unchanged — fetching, pagination, search, and
 * the per-item status update modal all work exactly as before. Tab
 * *labels* are friendlier now, but tab *filter values* are untouched,
 * since verifying whether the backend order-list endpoint supports
 * multi-status bucket filtering (matching the Dashboard's richer
 * grouping) needs its own check before changing real filter behavior.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, StatusBar, Platform, Alert,
  RefreshControl, Modal, ScrollView, TextInput,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchVendorOrders, updateOrderItemStatus,
  selectVendorOrders, selectOrdersLoading,
  selectOrdersErrors, selectVendorOrdersHasMore,
} from '../../store/orderSlice';
import {
  COLORS, FONTS, SPACING, RADIUS, SHADOWS, ORDER_STATUS,
} from '../../utils/constants';
import {
  formatPrice, formatDateTime,
  getOrderStatusLabel, getOrderStatusColor,
} from '../../utils/helpers';
import { t } from '../../i18n';
import { SkeletonListItem } from '../../components/common/Loading';
import { EmptyState, FullScreenError } from '../../components/common/ErrorMessage';
import Button from '../../components/common/Button';
import { get } from '../../api/client';

// Universal Shipment status -> friendly label + icon, matching the
// same mapping used on the customer's OrderDetailScreen tracking card.
const SHIPMENT_STATUS_INFO = {
  pending: { label: 'Preparing', icon: '📦' },
  ready_for_pickup: { label: 'Ready for pickup', icon: '📦' },
  pickup_requested: { label: 'Pickup requested', icon: '📞' },
  picked_up: { label: 'Picked up', icon: '🚚' },
  in_transit: { label: 'On the way', icon: '🛣️' },
  out_for_delivery: { label: 'Out for delivery', icon: '🏍️' },
  delivered: { label: 'Delivered', icon: '✅' },
  delivery_failed: { label: 'Delivery attempt failed', icon: '⚠️' },
  return_requested: { label: 'Return requested', icon: '↩️' },
  return_in_transit: { label: 'Return in progress', icon: '↩️' },
  returned: { label: 'Returned', icon: '↩️' },
  cancelled: { label: 'Cancelled', icon: '❌' },
};

const VENDOR_STATUS_OPTIONS = [
  { label: t('orders.processing'), value: 'processing',
    icon: '⚙️', color: COLORS.info },
  { label: t('orders.shipped'), value: 'shipped',
    icon: '🚚', color: COLORS.primary },
  { label: t('orders.delivered'), value: 'delivered',
    icon: '✅', color: COLORS.success },
];

// Friendly display for the order's overall status, matching the same
// New/Preparing/On the way/Delivered stages used on the Dashboard.
// This is purely presentational — it doesn't change what data loads.
const getFriendlyStage = (status) => {
  if (status === 'pending') return { label: 'New', color: COLORS.primary };
  if (['confirmed', 'processing', 'ready_for_pickup', 'picked_up'].includes(status)) {
    return { label: 'Preparing', color: COLORS.warning };
  }
  if (['shipped', 'in_transit', 'out_for_delivery'].includes(status)) {
    return { label: 'On the way', color: COLORS.info };
  }
  if (['delivered', 'completed'].includes(status)) {
    return { label: 'Delivered', color: COLORS.success };
  }
  // Exception statuses (cancelled/rejected/returned/refunded/on_hold) —
  // fall back to the existing shared label/color helpers.
  return { label: getOrderStatusLabel(status), color: getOrderStatusColor(status) };
};

export default function VendorOrders({ navigation }) {
  const dispatch = useDispatch();
  const orders = useSelector(selectVendorOrders);
  const loading = useSelector(selectOrdersLoading);
  const errors = useSelector(selectOrdersErrors);
  const hasMore = useSelector(selectVendorOrdersHasMore);

  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('');
  const [page, setPage] = useState(1);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Tab filter *values* unchanged — only the visible labels are friendlier.
  const STATUS_TABS = [
    { label: t('common.all'), value: '' },
    { label: 'New', value: ORDER_STATUS.PENDING },
    { label: 'Preparing', value: ORDER_STATUS.PROCESSING },
    { label: 'On the way', value: ORDER_STATUS.SHIPPED },
    { label: 'Delivered', value: ORDER_STATUS.DELIVERED },
  ];

  useEffect(() => { loadOrders(true); }, [activeTab]);

  const loadOrders = useCallback(async (reset = false) => {
    const p = reset ? 1 : page;
    if (reset) setPage(1);
    dispatch(fetchVendorOrders({ page: p, status: activeTab }));
  }, [activeTab, page]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrders(true);
    setRefreshing(false);
  }, [loadOrders]);

  const handleLoadMore = useCallback(() => {
    if (loading.vendorOrders || !hasMore) return;
    const next = page + 1;
    setPage(next);
    dispatch(fetchVendorOrders({ page: next, status: activeTab }));
  }, [loading, hasMore, page, activeTab]);

  const openUpdateModal = (order, item) => {
    setSelectedOrder(order);
    setSelectedItem(item);
    setNewStatus(item.item_status || '');
    setTrackingNumber(item.tracking_number || '');
    setShowUpdateModal(true);
  };

  const handleUpdateStatus = async () => {
    if (!newStatus) {
      Alert.alert(t('common.ok'), 'Please select a status.');
      return;
    }
    const result = await dispatch(updateOrderItemStatus({
      orderId: selectedOrder.id,
      itemId: selectedItem.id,
      status: newStatus,
      trackingNumber: trackingNumber.trim(),
    }));
    if (updateOrderItemStatus.fulfilled.match(result)) {
      setShowUpdateModal(false);
      Alert.alert(t('common.ok'), `Status updated to "${newStatus}".`);
      loadOrders(true);
    } else {
      Alert.alert(t('common.error'),
        errors.updateItemStatus || 'Update failed.');
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.order_number?.toLowerCase().includes(q) ||
      o.customer_name?.toLowerCase().includes(q)
    );
  });

  const OrderCard = ({ order }) => {
    const stage = getFriendlyStage(order.status);

    // Real shipment/tracking info — fetched per-card via the
    // vendor-accessible ShipmentByOrderView. 204 (no shipment yet)
    // just leaves this null, no error shown.
    const [shipment, setShipment] = useState(null);
    useEffect(() => {
      get(`/logistics/shipments/by-order/${order.id}/`)
        .then((d) => setShipment(d || null))
        .catch(() => setShipment(null));
    }, [order.id]);

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderNum}>
              #{order.order_number}
            </Text>
            <Text style={styles.orderDate}>
              {formatDateTime(order.created_at)}
            </Text>
          </View>
          <View style={[styles.statusBadge,
            { backgroundColor: stage.color + '18' }]}>
            <View style={[styles.statusDot,
              { backgroundColor: stage.color }]} />
            <Text style={[styles.statusText,
              { color: stage.color }]}>
              {stage.label}
            </Text>
          </View>
        </View>

        {shipment && (
          <View style={styles.deliveryRow}>
            <Text style={styles.deliveryIcon}>
              {(SHIPMENT_STATUS_INFO[shipment.status] || {}).icon || '🚚'}
            </Text>
            <Text style={styles.deliveryText}>
              {shipment.provider_name} · {(SHIPMENT_STATUS_INFO[shipment.status] || {}).label || shipment.status}
            </Text>
            {shipment.tracking_number && (
              <Text style={styles.deliveryTracking}>{shipment.tracking_number}</Text>
            )}
          </View>
        )}

        <View style={styles.customerRow}>
          <Text style={styles.customerIcon}>👤</Text>
          <Text style={styles.customerName}>
            {order.customer_name || 'Customer'}
          </Text>
          <Text style={styles.customerPhone}>
            {order.customer_phone}
          </Text>
        </View>

        <View style={styles.divider} />

        {(order.items || []).map((item, i) => (
          <View key={item.id || i} style={styles.orderItem}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.product_name}
              </Text>
              <Text style={styles.itemMeta}>
                {formatPrice(item.unit_price)} × {item.quantity} ={' '}
                <Text style={styles.itemTotal}>
                  {formatPrice(item.total_price)}
                </Text>
              </Text>
              {item.tracking_number && (
                <Text style={styles.tracking}>
                  🚚 {item.tracking_number}
                </Text>
              )}
            </View>
            <View style={styles.itemActions}>
              <View style={[styles.itemStatusBadge, {
                backgroundColor:
                  getOrderStatusColor(item.item_status) + '20',
              }]}>
                <Text style={[styles.itemStatusText, {
                  color: getOrderStatusColor(item.item_status),
                }]}>
                  {getOrderStatusLabel(item.item_status)}
                </Text>
              </View>
              {item.item_status !== 'delivered'
                && item.item_status !== 'cancelled' && (
                <TouchableOpacity
                  style={styles.updateBtn}
                  onPress={() => openUpdateModal(order, item)}
                >
                  <Text style={styles.updateBtnText}>
                    Update
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        <View style={styles.divider} />

        <View style={styles.orderFooter}>
          <View>
            <Text style={styles.earningsLabel}>
              {t('vendor.totalEarnings')}
            </Text>
            <Text style={styles.earningsAmount}>
              {formatPrice(order.vendor_earnings || 0)}
            </Text>
          </View>
          <Text style={styles.paymentStatus}>
            {order.payment_status === 'paid' ? '✓ Paid' : '⏳ Unpaid'}
          </Text>
        </View>
      </View>
    );
  };

  const UpdateModal = () => (
    <Modal visible={showUpdateModal} transparent
      animationType="slide"
      onRequestClose={() => setShowUpdateModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              📦 Update Status
            </Text>
            <TouchableOpacity
              onPress={() => setShowUpdateModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          {selectedItem && (
            <View style={styles.selectedItem}>
              <Text style={styles.selectedItemName}>
                {selectedItem.product_name}
              </Text>
              <Text style={styles.selectedItemMeta}>
                Qty: {selectedItem.quantity} ·{' '}
                {formatPrice(selectedItem.total_price)}
              </Text>
            </View>
          )}
          <Text style={styles.inputLabel}>New Status</Text>
          <View style={styles.statusOptions}>
            {VENDOR_STATUS_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.statusOption,
                  newStatus === opt.value && styles.statusOptionActive,
                  { borderColor: opt.color + '60' }]}
                onPress={() => setNewStatus(opt.value)}
              >
                <Text style={styles.statusOptionIcon}>
                  {opt.icon}
                </Text>
                <Text style={[styles.statusOptionLabel,
                  newStatus === opt.value && {
                    color: opt.color, fontWeight: FONTS.bold,
                  }]}>
                  {opt.label}
                </Text>
                {newStatus === opt.value && (
                  <Text style={[styles.statusCheck,
                    { color: opt.color }]}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
          {newStatus === 'shipped' && (
            <>
              <Text style={styles.inputLabel}>
                {t('orders.trackingNumber')}
              </Text>
              <TextInput
                style={styles.trackingInput}
                value={trackingNumber}
                onChangeText={setTrackingNumber}
                placeholder="e.g. KR123456789"
                autoCapitalize="characters"
                placeholderTextColor={COLORS.textLight}
              />
            </>
          )}
          <Button
            title="Update Status"
            onPress={handleUpdateStatus}
            loading={loading.updateItemStatus}
            disabled={!newStatus || loading.updateItemStatus}
            fullWidth
            style={styles.modalBtn}
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content"
        backgroundColor={COLORS.primary} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {t('vendor.customerOrders')}
        </Text>
        <View style={styles.headerCount}>
          <Text style={styles.headerCountText}>
            {filteredOrders.length}
          </Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchInput}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchText}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by order # or customer..."
            placeholderTextColor={COLORS.textLight}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
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
                activeTab === tab.value && styles.tabActive]}
              onPress={() => { setActiveTab(tab.value); setPage(1); }}
            >
              <Text style={[styles.tabText,
                activeTab === tab.value && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={({ item }) => <OrderCard order={item} />}
        ListEmptyComponent={() => {
          if (loading.vendorOrders) {
            return <View>
              {[1,2,3].map(i => <SkeletonListItem key={i} />)}
            </View>;
          }
          if (errors.vendorOrders) {
            return <FullScreenError
              error={errors.vendorOrders}
              onRetry={() => loadOrders(true)} />;
          }
          return <EmptyState
            icon="🛒"
            title={t('common.noResults')}
            message="Orders from customers will appear here."
          />;
        }}
        ListFooterComponent={() =>
          loading.vendorOrders && orders.length > 0
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

      <UpdateModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.base,
    paddingTop: Platform.OS === 'ios' ? SPACING['3xl'] : SPACING.base,
    paddingBottom: SPACING.base,
  },
  headerTitle: {
    fontSize: FONTS['2xl'], fontWeight: FONTS.bold, color: 'white',
  },
  headerCount: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: SPACING.sm, paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  headerCountText: {
    fontSize: FONTS.base, fontWeight: FONTS.bold, color: 'white',
  },
  searchWrap: {
    backgroundColor: COLORS.surface, paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm, borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  searchInput: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.full, paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm, gap: SPACING.sm,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  searchIcon: { fontSize: FONTS.base },
  searchText: {
    flex: 1, fontSize: FONTS.base, color: COLORS.textPrimary, padding: 0,
  },
  searchClear: {
    fontSize: FONTS.sm, color: COLORS.textMuted, fontWeight: FONTS.bold,
  },
  tabsWrap: {
    backgroundColor: COLORS.surface, borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  tabsContent: {
    paddingHorizontal: SPACING.sm, paddingVertical: SPACING.sm, gap: SPACING.xs,
  },
  tab: {
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: COLORS.primaryFade, borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONTS.medium,
  },
  tabTextActive: { color: COLORS.primary, fontWeight: FONTS.bold },
  listContent: { padding: SPACING.sm, paddingBottom: 100 },
  orderCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  orderHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: SPACING.base,
  },
  orderNum: {
    fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  orderDate: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  statusDot: { width: 6, height: 6, borderRadius: RADIUS.full },
  statusText: { fontSize: FONTS.xs, fontWeight: FONTS.bold },
  deliveryRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    paddingHorizontal: SPACING.base, paddingBottom: SPACING.sm,
    marginTop: -SPACING.xs,
  },
  deliveryIcon: { fontSize: FONTS.sm },
  deliveryText: { flex: 1, fontSize: FONTS.xs, color: COLORS.textSecondary, fontWeight: FONTS.semiBold },
  deliveryTracking: { fontSize: FONTS.xs, color: COLORS.textMuted, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  customerRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.base, paddingBottom: SPACING.sm,
  },
  customerIcon: { fontSize: FONTS.sm },
  customerName: {
    fontSize: FONTS.sm, fontWeight: FONTS.semiBold,
    color: COLORS.textSecondary, flex: 1,
  },
  customerPhone: { fontSize: FONTS.xs, color: COLORS.textMuted },
  divider: {
    height: 1, backgroundColor: COLORS.divider,
    marginHorizontal: SPACING.base,
  },
  orderItem: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: SPACING.base, borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight, gap: SPACING.sm,
  },
  itemInfo: { flex: 1, gap: 3 },
  itemName: {
    fontSize: FONTS.sm, fontWeight: FONTS.semiBold,
    color: COLORS.textPrimary, lineHeight: 18,
  },
  itemMeta: { fontSize: FONTS.xs, color: COLORS.textMuted },
  itemTotal: { color: COLORS.primary, fontWeight: FONTS.bold },
  tracking: {
    fontSize: FONTS.xs, color: COLORS.info,
    fontWeight: FONTS.medium, marginTop: 2,
  },
  itemActions: { alignItems: 'flex-end', gap: SPACING.sm },
  itemStatusBadge: {
    paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.full,
  },
  itemStatusText: {
    fontSize: FONTS.xs, fontWeight: FONTS.bold, textTransform: 'capitalize',
  },
  updateBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
  },
  updateBtnText: {
    color: COLORS.textWhite, fontSize: FONTS.xs, fontWeight: FONTS.bold,
  },
  orderFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: SPACING.base,
  },
  earningsLabel: { fontSize: FONTS.xs, color: COLORS.textMuted },
  earningsAmount: {
    fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.success,
  },
  paymentStatus: {
    fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.success,
  },
  loadingMore: { padding: SPACING.xl, alignItems: 'center' },
  loadingMoreText: { fontSize: FONTS.sm, color: COLORS.textMuted },
  modalOverlay: {
    flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.xl,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: SPACING.base,
  },
  modalTitle: {
    fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textPrimary,
  },
  modalClose: {
    fontSize: FONTS.xl, color: COLORS.textMuted, fontWeight: FONTS.bold,
  },
  selectedItem: {
    backgroundColor: COLORS.primaryFade, borderRadius: RADIUS.lg,
    padding: SPACING.sm, marginBottom: SPACING.base,
  },
  selectedItemName: {
    fontSize: FONTS.base, fontWeight: FONTS.semiBold, color: COLORS.textPrimary,
  },
  selectedItemMeta: {
    fontSize: FONTS.sm, color: COLORS.textMuted, marginTop: 2,
  },
  inputLabel: {
    fontSize: FONTS.sm, fontWeight: FONTS.semiBold,
    color: COLORS.textSecondary, marginBottom: SPACING.sm,
  },
  statusOptions: { gap: SPACING.sm, marginBottom: SPACING.base },
  statusOption: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    padding: SPACING.base, borderRadius: RADIUS.lg,
    borderWidth: 1.5, backgroundColor: COLORS.surfaceAlt,
  },
  statusOptionActive: { backgroundColor: COLORS.primaryFade },
  statusOptionIcon: { fontSize: FONTS.lg },
  statusOptionLabel: {
    flex: 1, fontSize: FONTS.base,
    color: COLORS.textSecondary, fontWeight: FONTS.medium,
  },
  statusCheck: { fontSize: FONTS.lg, fontWeight: FONTS.bold },
  trackingInput: {
    backgroundColor: COLORS.surfaceAlt, borderWidth: 1.5,
    borderColor: COLORS.border, borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 2,
    fontSize: FONTS.base, color: COLORS.textPrimary,
    marginBottom: SPACING.base, letterSpacing: 1,
  },
  modalBtn: { marginTop: SPACING.xs },
});