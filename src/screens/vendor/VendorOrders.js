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

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, StatusBar, Platform, Alert,
  RefreshControl, Modal, ScrollView, TextInput,
  Image, Linking, ActivityIndicator,
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
import { t, i18n } from '../../i18n';
import { SkeletonListItem } from '../../components/common/Loading';
import { EmptyState, FullScreenError } from '../../components/common/ErrorMessage';
import Button from '../../components/common/Button';
import { get } from '../../api/client';
import { ordersAPI } from '../../api/orders';

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

// ===================================================================
// Seller order card + "View Order Details".
// Everything shown here comes from the order data the backend returns
// (GET /orders/ and GET /orders/<id>/). Nothing is hardcoded.
// Labels follow the app language (Swahili when the app is in Swahili).
// ===================================================================
const isSwahili = () => {
  try {
    const loc = typeof i18n.getLocale === 'function' ? i18n.getLocale() : i18n.locale;
    return String(loc || '').toLowerCase().startsWith('sw');
  } catch (e) {
    return false;
  }
};
const L = (en, sw) => (isSwahili() ? sw : en);

const STAGE_SW = {
  New: 'Mpya',
  Preparing: 'Inaandaliwa',
  'On the way': 'Njiani',
  Delivered: 'Imefikishwa',
};
const stageLabel = (label) => (isSwahili() && STAGE_SW[label]) || label;

const ITEM_STATUS_SW = {
  pending: 'Inasubiri',
  processing: 'Inaandaliwa',
  shipped: 'Imetumwa',
  delivered: 'Imefikishwa',
  cancelled: 'Imeghairiwa',
  returned: 'Imerudishwa',
};
const itemStatusLabel = (status) =>
  (isSwahili() && ITEM_STATUS_SW[status]) || getOrderStatusLabel(status);

const getPaymentInfo = (status) => {
  if (status === 'paid') {
    return { label: L('Paid', 'Imelipwa'), icon: '✓',
      color: COLORS.success, text: COLORS.successText };
  }
  if (status === 'failed') {
    return { label: L('Payment failed', 'Malipo yameshindwa'), icon: '✕',
      color: COLORS.danger, text: COLORS.dangerText };
  }
  if (status === 'refunded') {
    return { label: L('Refunded', 'Imerejeshwa'), icon: '↩',
      color: COLORS.info, text: COLORS.infoText };
  }
  return { label: L('Not paid', 'Haijalipwa'), icon: '⏳',
    color: COLORS.warning, text: COLORS.warningText };
};

const paymentMethodLabel = (method) => {
  if (!method) return '';
  const map = {
    mpesa: 'M-Pesa',
    mobile_money: L('Mobile money', 'Pesa ya simu'),
    card: L('Card', 'Kadi'),
    stripe: L('Card', 'Kadi'),
    paypal: 'PayPal',
    bank: L('Bank', 'Benki'),
    bank_transfer: L('Bank transfer', 'Uhamisho wa benki'),
    wallet: L('Wallet', 'Pochi'),
  };
  return map[method] || String(method).replace(/_/g, ' ');
};

const hasValue = (v) => v !== undefined && v !== null && v !== '';

// The seller's own earnings for this order (backend: seller_earnings).
const sellerEarnings = (order) => {
  if (hasValue(order.seller_earnings)) return order.seller_earnings;
  if (hasValue(order.vendor_earnings)) return order.vendor_earnings;
  return (order.items || []).reduce(
    (sum, i) => sum + (parseFloat(i.vendor_earning) || 0), 0);
};

const openLink = (url) => {
  try {
    Linking.openURL(url).catch(() =>
      Alert.alert(L('Cannot open', 'Imeshindwa kufungua'),
        L('Please try again.', 'Tafadhali jaribu tena.')));
  } catch (e) {
    // ignore
  }
};
const callNumber = (phone) => {
  const n = String(phone || '').replace(/[^\d+]/g, '');
  if (n) openLink('tel:' + n);
};

function StatusPill({ label, color, textColor, icon }) {
  return (
    <View style={[styles.pill, { backgroundColor: color + '18' }]}>
      {!icon && <View style={[styles.statusDot, { backgroundColor: color }]} />}
      <Text style={[styles.pillText, { color: textColor || color }]}>
        {icon ? icon + ' ' : ''}{label}
      </Text>
    </View>
  );
}

function ProductThumb({ uri, size = 64 }) {
  const [failed, setFailed] = useState(false);
  const ok = typeof uri === 'string' && /^https?:\/\//i.test(uri) && !failed;
  return (
    <View style={[styles.thumb, { width: size, height: size }]}>
      {ok ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size }}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Text style={styles.thumbPlaceholder}>📦</Text>
      )}
    </View>
  );
}

// One product line: picture, name, quantity x unit price, line total, status.
function OrderItemRow({ item, onUpdate, last, compact }) {
  const canUpdate = !!onUpdate
    && item.item_status !== 'delivered' && item.item_status !== 'cancelled';
  const statusColor = getOrderStatusColor(item.item_status);
  return (
    <View style={[styles.oiRow, compact && styles.oiRowCompact,
      !last && styles.oiRowBorder]}>
      <ProductThumb uri={item.product_image} />
      <View style={styles.oiInfo}>
        <Text style={styles.oiName} numberOfLines={2}>
          {item.product_name}
        </Text>
        {!!item.variant_display && (
          <Text style={styles.oiVariant} numberOfLines={1}>
            {item.variant_display}
          </Text>
        )}
        <Text style={styles.oiQty}>
          {L('Qty', 'Idadi')}:{' '}
          <Text style={styles.oiQtyNum}>{item.quantity}</Text>
          {'  ×  '}{formatPrice(item.unit_price)}
        </Text>
        <Text style={styles.oiTotal}>{formatPrice(item.total_price)}</Text>
        {!!item.tracking_number && (
          <Text style={styles.tracking}>🚚 {item.tracking_number}</Text>
        )}
        <View style={styles.oiActions}>
          <View style={[styles.itemStatusBadge,
            { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.itemStatusText, { color: statusColor }]}>
              {itemStatusLabel(item.item_status)}
            </Text>
          </View>
          {canUpdate && (
            <TouchableOpacity
              style={styles.updateBtn}
              onPress={() => onUpdate(item)}
            >
              <Text style={styles.updateBtnText}>
                {L('Update', 'Sasisha')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

function OrderCard({ order, onUpdate, onDetails }) {
  const stage = getFriendlyStage(order.status);
  const pay = getPaymentInfo(order.payment_status);
  const items = Array.isArray(order.items) ? order.items : [];

  // Real shipment/tracking info - fetched per-card via the
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
        <View style={{ flex: 1 }}>
          <Text style={styles.orderNum}>#{order.order_number}</Text>
          <Text style={styles.orderDate}>
            {formatDateTime(order.created_at)}
          </Text>
        </View>
        <View style={styles.headerBadges}>
          <StatusPill label={stageLabel(stage.label)} color={stage.color} />
          <StatusPill label={pay.label} color={pay.color}
            textColor={pay.text} icon={pay.icon} />
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
          {!!shipment.tracking_number && (
            <Text style={styles.deliveryTracking}>{shipment.tracking_number}</Text>
          )}
        </View>
      )}

      <View style={styles.customerRow}>
        <Text style={styles.customerIcon}>👤</Text>
        <Text style={styles.customerName} numberOfLines={1}>
          {order.customer_name || L('Customer', 'Mteja')}
        </Text>
        {!!order.customer_phone && (
          <Text style={styles.customerPhone}>{order.customer_phone}</Text>
        )}
      </View>

      <View style={styles.divider} />

      {items.map((item, i) => (
        <OrderItemRow
          key={item.id || i}
          item={item}
          last={i === items.length - 1}
          onUpdate={(it) => onUpdate(order, it)}
        />
      ))}

      <View style={styles.sumBox}>
        <View style={styles.sumRow}>
          <Text style={styles.sumLabel}>{L('Order total', 'Jumla ya oda')}</Text>
          <Text style={styles.sumValue}>{formatPrice(order.total_amount)}</Text>
        </View>
        <View style={styles.sumRow}>
          <Text style={styles.earnLabel}>{L('Your earnings', 'Mapato yako')}</Text>
          <Text style={styles.earnValue}>
            {formatPrice(sellerEarnings(order))}
          </Text>
        </View>
        {!!order.has_other_sellers && (
          <Text style={styles.otherNote}>
            {L('This order also has items from other sellers. Your items: ',
              'Oda hii ina pia bidhaa za wauzaji wengine. Bidhaa zako: ')}
            {formatPrice(order.seller_subtotal)}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.detailsBtn}
        onPress={() => onDetails(order)}
        activeOpacity={0.8}
      >
        <Text style={styles.detailsBtnText}>
          {L('View Order Details', 'Angalia maelezo ya oda')}  ›
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function DetailSection({ title, children }) {
  return (
    <View style={styles.dtSection}>
      <Text style={styles.dtSectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function DetailRow({ label, value, strong, color }) {
  if (!hasValue(value)) return null;
  return (
    <View style={styles.dtRow}>
      <Text style={styles.dtLabel}>{label}</Text>
      <Text selectable style={[styles.dtValue,
        strong && styles.dtValueStrong, color && { color }]}>
        {value}
      </Text>
    </View>
  );
}

// Full order information: customer contact, delivery address, products,
// payment and dates. `detail` is the full order from GET /orders/<id>/.
function OrderDetailsModal({
  visible, order, detail, loading, error, onClose, onRetry,
}) {
  if (!order) return null;
  const o = { ...order, ...(detail || {}) };
  const stage = getFriendlyStage(o.status);
  const pay = getPaymentInfo(o.payment_status);
  const items = Array.isArray(o.items) ? o.items : [];
  const d = (detail && detail.delivery) || null;
  const phone = o.customer_phone || (d && d.phone) || '';
  const isPickup = !!d && d.delivery_type === 'pickup';
  const hasAddress = !!d && !!(d.address || d.landmark || d.receiver_name || d.phone);
  const dates = [
    [L('Order placed', 'Oda iliwekwa'), o.created_at],
    [L('Paid on', 'Ilipolipwa'), o.paid_at],
    [L('Shipped on', 'Ilitumwa'), o.shipped_at],
    [L('Delivered on', 'Ilifikishwa'), o.delivered_at],
    [L('Cancelled on', 'Ilighairiwa'), o.cancelled_at],
  ];
  const slop = { top: 10, bottom: 10, left: 10, right: 10 };

  return (
    <Modal visible={visible} transparent animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.dtCard}>
          <View style={styles.dtHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dtTitle}>
                {L('Order details', 'Maelezo ya oda')}
              </Text>
              <Text style={styles.dtOrderNum}>#{o.order_number}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={slop}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.dtScroll}
            contentContainerStyle={styles.dtScrollContent}
            showsVerticalScrollIndicator={false}>
            <View style={styles.dtPills}>
              <StatusPill label={stageLabel(stage.label)} color={stage.color} />
              <StatusPill label={pay.label} color={pay.color}
                textColor={pay.text} icon={pay.icon} />
            </View>

            <DetailSection title={L('Customer', 'Mteja')}>
              <DetailRow label={L('Name', 'Jina')} value={o.customer_name} strong />
              <DetailRow label={L('Phone', 'Simu')} value={phone} />
              <DetailRow label={L('Email', 'Barua pepe')} value={o.customer_email} />
              {!!phone && (
                <TouchableOpacity style={styles.dtActionBtn}
                  onPress={() => callNumber(phone)}>
                  <Text style={styles.dtActionText}>
                    📞  {L('Call customer', 'Mpigie mteja')}
                  </Text>
                </TouchableOpacity>
              )}
            </DetailSection>

            <DetailSection title={L('Delivery address', 'Anwani ya kupeleka')}>
              {d ? (
                <>
                  <DetailRow label={L('Type', 'Aina')}
                    value={isPickup
                      ? L('Pickup point', 'Kuchukua kituoni')
                      : L('Home delivery', 'Kupelekewa')} />
                  <DetailRow label={L('Receiver', 'Mpokeaji')} value={d.receiver_name} />
                  <DetailRow label={L('Receiver phone', 'Simu ya mpokeaji')} value={d.phone} />
                  <DetailRow
                    label={isPickup ? L('Pickup point', 'Kituo') : L('Address', 'Anwani')}
                    value={d.address} strong />
                  <DetailRow label={L('Landmark', 'Alama ya eneo')} value={d.landmark} />
                  {!hasAddress && (
                    <Text style={styles.dtMuted}>
                      {L('No address was saved for this order.',
                        'Hakuna anwani iliyohifadhiwa kwenye oda hii.')}
                    </Text>
                  )}
                  {!!d.maps_url && (
                    <TouchableOpacity style={styles.dtActionBtn}
                      onPress={() => openLink(d.maps_url)}>
                      <Text style={styles.dtActionText}>
                        🗺️  {L('Open map', 'Fungua ramani')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : loading ? (
                <View style={styles.dtLoadingRow}>
                  <ActivityIndicator color={COLORS.primary} />
                  <Text style={styles.dtMuted}>
                    {L('Loading...', 'Inapakia...')}
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.dtError}>
                    {error || L('Address is not available.', 'Anwani haipatikani.')}
                  </Text>
                  <TouchableOpacity style={styles.dtActionBtn} onPress={onRetry}>
                    <Text style={styles.dtActionText}>
                      {L('Try again', 'Jaribu tena')}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </DetailSection>

            {!!String(o.notes || '').trim() && (
              <DetailSection title={L('Customer note', 'Ujumbe wa mteja')}>
                <Text selectable style={styles.dtNoteText}>{o.notes}</Text>
              </DetailSection>
            )}

            <DetailSection title={L('Products', 'Bidhaa')}>
              {items.map((item, i) => (
                <OrderItemRow
                  key={item.id || i}
                  item={item}
                  last={i === items.length - 1}
                  compact
                />
              ))}
            </DetailSection>

            <DetailSection title={L('Payment', 'Malipo')}>
              <DetailRow label={L('Payment status', 'Hali ya malipo')}
                value={pay.label} color={pay.text} strong />
              <DetailRow label={L('Payment method', 'Njia ya malipo')}
                value={paymentMethodLabel(o.payment_method)} />
              <View style={styles.dtDivider} />
              <DetailRow label={L('Your items', 'Bidhaa zako')}
                value={hasValue(o.seller_subtotal) ? formatPrice(o.seller_subtotal) : ''} />
              <DetailRow label={L('VUMA fee', 'Ada ya VUMA')}
                value={hasValue(o.seller_fee) ? '- ' + formatPrice(o.seller_fee) : ''} />
              <DetailRow label={L('Your earnings', 'Mapato yako')}
                value={formatPrice(sellerEarnings(o))}
                strong color={COLORS.success} />
              <View style={styles.dtDivider} />
              <DetailRow label={L('Shipping (whole order)', 'Usafirishaji (oda nzima)')}
                value={hasValue(o.shipping_cost) ? formatPrice(o.shipping_cost) : ''} />
              <DetailRow label={L('Order total', 'Jumla ya oda')}
                value={formatPrice(o.total_amount)} strong />
              {!!o.has_other_sellers && (
                <Text style={styles.dtNote}>
                  {L('This order also has items from other sellers. The earnings above are for your items only.',
                    'Oda hii ina pia bidhaa za wauzaji wengine. Mapato yaliyoonyeshwa ni ya bidhaa zako tu.')}
                </Text>
              )}
            </DetailSection>

            <DetailSection title={L('Order information', 'Taarifa za oda')}>
              <DetailRow label={L('Order number', 'Namba ya oda')} value={'#' + o.order_number} />
              {dates.map(([label, value]) => (
                <DetailRow key={label} label={label}
                  value={value ? formatDateTime(value) : ''} />
              ))}
              <DetailRow label={L('Tracking number', 'Namba ya ufuatiliaji')}
                value={o.tracking_number} />
            </DetailSection>
          </ScrollView>

          <TouchableOpacity style={styles.dtCloseBtn} onPress={onClose}
            activeOpacity={0.85}>
            <Text style={styles.dtCloseText}>{L('Close', 'Funga')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function VendorOrders({ navigation, route }) {
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
  const [showDetails, setShowDetails] = useState(false);
  const [detailsOrder, setDetailsOrder] = useState(null);
  const [detailsData, setDetailsData] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const detailsReq = useRef(0);

  // Tab filter *values* unchanged — only the visible labels are friendlier.
  const STATUS_TABS = [
    { label: t('common.all'), value: '' },
    { label: stageLabel('New'), value: ORDER_STATUS.PENDING },
    { label: stageLabel('Preparing'), value: ORDER_STATUS.PROCESSING },
    { label: stageLabel('On the way'), value: ORDER_STATUS.SHIPPED },
    { label: stageLabel('Delivered'), value: ORDER_STATUS.DELIVERED },
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

  // "View Order Details": the list already carries most fields; the full
  // order (delivery address, contact, dates) is fetched when it is opened.
  const fetchDetails = useCallback(async (order) => {
    const reqId = ++detailsReq.current;
    setDetailsLoading(true);
    setDetailsError('');
    try {
      const data = await ordersAPI.getOrderDetail(order.id);
      if (detailsReq.current === reqId) setDetailsData(data || null);
    } catch (e) {
      if (detailsReq.current === reqId) {
        setDetailsError(L(
          'Could not load the full details. Check your internet and try again.',
          'Imeshindwa kupakia maelezo kamili. Angalia intaneti kisha jaribu tena.'));
      }
    } finally {
      if (detailsReq.current === reqId) setDetailsLoading(false);
    }
  }, []);

  const openDetails = (order) => {
    setDetailsOrder(order);
    setDetailsData(null);
    setShowDetails(true);
    fetchDetails(order);
  };

  const closeDetails = () => {
    detailsReq.current += 1;
    setShowDetails(false);
    setDetailsLoading(false);
  };

  // Opened from an email or link (vuma://seller/orders/<id>):
  // show that order straight away.
  const deepOrderId = route && route.params ? route.params.orderId : null;
  useEffect(() => {
    if (!deepOrderId) return;
    openDetails({ id: deepOrderId });
    if (navigation && navigation.setParams) {
      navigation.setParams({ orderId: undefined });
    }
  }, [deepOrderId]);

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.order_number?.toLowerCase().includes(q) ||
      o.customer_name?.toLowerCase().includes(q)
    );
  });

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
        renderItem={({ item }) => (
          <OrderCard order={item} onUpdate={openUpdateModal}
            onDetails={openDetails} />
        )}
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

      {UpdateModal()}

      <OrderDetailsModal
        visible={showDetails}
        order={detailsOrder}
        detail={detailsData}
        loading={detailsLoading}
        error={detailsError}
        onClose={closeDetails}
        onRetry={() => { if (detailsOrder) fetchDetails(detailsOrder); }}
      />
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

  // -- Seller order card --------------------------------------------
  headerBadges: { alignItems: 'flex-end', gap: 6 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  pillText: { fontSize: FONTS.xs, fontWeight: FONTS.bold },
  thumb: {
    borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceSunken,
    borderWidth: 1, borderColor: COLORS.borderLight, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  thumbPlaceholder: { fontSize: FONTS['2xl'] },
  oiRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: SPACING.sm, padding: SPACING.base,
  },
  oiRowCompact: { padding: 0, paddingVertical: SPACING.sm },
  oiRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  oiInfo: { flex: 1, gap: 3 },
  oiName: {
    fontSize: FONTS.sm, fontWeight: FONTS.semiBold,
    color: COLORS.textPrimary, lineHeight: 18,
  },
  oiVariant: { fontSize: FONTS.xs, color: COLORS.textMuted },
  oiQty: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  oiQtyNum: { fontWeight: FONTS.bold, color: COLORS.textPrimary },
  oiTotal: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.primary },
  oiActions: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: SPACING.xs,
  },
  sumBox: {
    backgroundColor: COLORS.surfaceAlt, padding: SPACING.base, gap: 6,
    borderTopWidth: 1, borderTopColor: COLORS.divider,
  },
  sumRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center',
  },
  sumLabel: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  sumValue: {
    fontSize: FONTS.base, fontWeight: FONTS.semiBold, color: COLORS.textPrimary,
  },
  earnLabel: {
    fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary,
  },
  earnValue: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.success },
  otherNote: { fontSize: FONTS.xs, color: COLORS.textMuted, lineHeight: 16 },
  detailsBtn: {
    margin: SPACING.base, marginTop: SPACING.sm,
    paddingVertical: SPACING.sm + 2, borderRadius: RADIUS.lg,
    borderWidth: 1.5, borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryFade, alignItems: 'center',
  },
  detailsBtnText: {
    fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.primary,
  },

  // -- Order details sheet ------------------------------------------
  dtCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    paddingTop: SPACING.base, paddingHorizontal: SPACING.base,
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.base,
    maxHeight: '92%',
  },
  dtHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: SPACING.sm,
  },
  dtTitle: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  dtOrderNum: {
    fontSize: FONTS.sm, color: COLORS.textMuted, marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  dtScroll: { flexShrink: 1 },
  dtScrollContent: { paddingBottom: SPACING.sm, gap: SPACING.sm },
  dtPills: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  dtSection: {
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.sm + 2, gap: 6,
  },
  dtSectionTitle: {
    fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.primary,
  },
  dtRow: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.sm },
  dtLabel: { fontSize: FONTS.sm, color: COLORS.textMuted, maxWidth: '45%' },
  dtValue: {
    flex: 1, fontSize: FONTS.sm, color: COLORS.textPrimary, textAlign: 'right',
  },
  dtValueStrong: { fontWeight: FONTS.bold },
  dtDivider: { height: 1, backgroundColor: COLORS.divider, marginVertical: 2 },
  dtMuted: { fontSize: FONTS.sm, color: COLORS.textMuted },
  dtError: { fontSize: FONTS.sm, color: COLORS.dangerText },
  dtNote: { fontSize: FONTS.xs, color: COLORS.textMuted, lineHeight: 16 },
  dtNoteText: { fontSize: FONTS.sm, color: COLORS.textPrimary, lineHeight: 20 },
  dtLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  dtActionBtn: {
    marginTop: 4, paddingVertical: SPACING.sm, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.primary, alignItems: 'center',
  },
  dtActionText: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.primary },
  dtCloseBtn: {
    marginTop: SPACING.sm, paddingVertical: SPACING.sm + 4,
    borderRadius: RADIUS.lg, backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  dtCloseText: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textWhite },
});