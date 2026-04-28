/**
 * VUMA Store — Order Detail Screen
 */

import React, { useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Platform, Alert, Image,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchOrderDetail, cancelOrder, selectSelectedOrder,
  selectOrdersLoading, selectOrdersErrors, clearSelectedOrder,
} from '../../store/orderSlice';
import {
  COLORS, FONTS, SPACING, RADIUS, SHADOWS, SCREENS,
} from '../../utils/constants';
import {
  formatPrice, formatDateTime,
  getOrderStatusLabel, getOrderStatusColor, canCancelOrder,
} from '../../utils/helpers';
import { t } from '../../i18n';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import { FullScreenError } from '../../components/common/ErrorMessage';

const ORDER_STEPS = [
  { key: 'pending', label: t('orders.pending'), icon: '📋' },
  { key: 'paid', label: 'Payment Confirmed', icon: '💳' },
  { key: 'processing', label: t('orders.processing'), icon: '⚙️' },
  { key: 'shipped', label: t('orders.shipped'), icon: '🚚' },
  { key: 'delivered', label: t('orders.delivered'), icon: '✅' },
];

const STATUS_ORDER = ['pending','paid','processing','shipped','delivered'];

export default function OrderDetailScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { orderId, order: routeOrder } = route?.params || {};
  const order = useSelector(selectSelectedOrder);
  const loading = useSelector(selectOrdersLoading);
  const errors = useSelector(selectOrdersErrors);
  const displayOrder = order || routeOrder;

  useEffect(() => {
    if (orderId) dispatch(fetchOrderDetail(orderId));
    return () => dispatch(clearSelectedOrder());
  }, [orderId]);

  const handleCancel = useCallback(() => {
    Alert.alert(
      t('orders.cancelOrder'),
      t('orders.cancelOrderMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            const result = await dispatch(
              cancelOrder(displayOrder.id)
            );
            if (cancelOrder.fulfilled.match(result)) {
              Alert.alert(t('common.ok'), t('orders.cancelled'));
            }
          },
        },
      ]
    );
  }, [displayOrder]);

  if (loading.detail && !displayOrder) {
    return <Loading fullScreen message={t('common.loading')} />;
  }
  if (errors.detail && !displayOrder) {
    return (
      <FullScreenError
        error={errors.detail}
        onRetry={() => dispatch(fetchOrderDetail(orderId))}
      />
    );
  }
  if (!displayOrder) return null;

  const statusColor = getOrderStatusColor(displayOrder.status);
  const statusLabel = getOrderStatusLabel(displayOrder.status);
  const currentStepIndex = STATUS_ORDER.indexOf(displayOrder.status);
  const isCancelled = displayOrder.status === 'cancelled'
    || displayOrder.status === 'refunded';
  const canCancel = canCancelOrder(
    displayOrder.status, displayOrder.payment_status
  );

  const ProgressTracker = () => {
    if (isCancelled) {
      return (
        <View style={styles.cancelledBanner}>
          <Text style={styles.cancelledIcon}>❌</Text>
          <View>
            <Text style={styles.cancelledTitle}>
              {t('orders.cancelled')}
            </Text>
            <Text style={styles.cancelledSub}>
              {displayOrder.payment_status === 'paid'
                ? 'Refund will be processed in 3-5 days.'
                : 'No charge was made.'}
            </Text>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.tracker}>
        {ORDER_STEPS.map((step, index) => {
          const isCompleted = index <= currentStepIndex;
          const isActive = index === currentStepIndex;
          const isLast = index === ORDER_STEPS.length - 1;
          return (
            <View key={step.key} style={styles.stepWrap}>
              <View style={styles.stepColumn}>
                <View style={[
                  styles.stepCircle,
                  isCompleted && styles.stepCircleActive,
                  isActive && styles.stepCircleCurrent,
                ]}>
                  <Text style={[
                    styles.stepIcon,
                    !isCompleted && styles.stepIconInactive,
                  ]}>
                    {step.icon}
                  </Text>
                </View>
                {!isLast && (
                  <View style={[
                    styles.stepLine,
                    isCompleted && index < currentStepIndex
                      && styles.stepLineActive,
                  ]} />
                )}
              </View>
              <Text style={[
                styles.stepLabel,
                isCompleted && styles.stepLabelActive,
              ]}>
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content"
        backgroundColor={COLORS.surface} />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('orders.orderDetail')}
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Chat', {
            relatedOrderId: displayOrder.id,
          })}
        >
          <Text style={styles.headerIcon}>💬</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Order Meta */}
        <View style={styles.card}>
          <View style={styles.orderMeta}>
            <View>
              <Text style={styles.orderNumber}>
                #{displayOrder.order_number}
              </Text>
              <Text style={styles.orderDate}>
                {formatDateTime(displayOrder.created_at)}
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
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>
              Payment:
            </Text>
            <Text style={[styles.paymentValue,
              displayOrder.payment_status === 'paid'
                ? styles.paymentPaid : styles.paymentPending]}>
              {displayOrder.payment_status === 'paid'
                ? '✓ Paid' : '⏳ ' + displayOrder.payment_status}
              {' '}via{' '}
              {displayOrder.payment_method?.toUpperCase()}
            </Text>
          </View>
          {displayOrder.tracking_number && (
            <View style={styles.trackingRow}>
              <Text style={styles.trackingLabel}>
                {t('orders.trackingNumber')}:
              </Text>
              <Text style={styles.trackingValue}>
                {displayOrder.tracking_number}
              </Text>
            </View>
          )}
        </View>

        {/* Progress */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {t('orders.orderProgress')}
          </Text>
          <ProgressTracker />
        </View>

        {/* Items */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            📦 {t('orders.items')} ({displayOrder.items?.length || 0})
          </Text>
          {(displayOrder.items || []).map((item, i) => (
            <View key={item.id || i} style={[styles.orderItem,
              i < (displayOrder.items?.length || 0) - 1
                && styles.orderItemBorder]}>
              {item.product_image ? (
                <Image source={{ uri: item.product_image }}
                  style={styles.itemImage} resizeMode="cover" />
              ) : (
                <View style={styles.itemImagePlaceholder}>
                  <Text style={{ fontSize: 28 }}>📦</Text>
                </View>
              )}
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.product_name}
                </Text>
                <Text style={styles.itemVendor}>
                  🏪 {item.vendor_name || 'VUMA Store'}
                </Text>
                <View style={styles.itemPriceRow}>
                  <Text style={styles.itemPrice}>
                    {formatPrice(item.unit_price)}
                  </Text>
                  <Text style={styles.itemQty}>
                    × {item.quantity}
                  </Text>
                </View>
              </View>
              <Text style={styles.itemSubtotal}>
                {formatPrice(item.total_price)}
              </Text>
            </View>
          ))}
        </View>

        {/* Shipping Address */}
        {displayOrder.shipping_address && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {t('checkout.deliveryAddress')}
            </Text>
            {(() => {
              const addr =
                typeof displayOrder.shipping_address === 'string'
                  ? JSON.parse(displayOrder.shipping_address)
                  : displayOrder.shipping_address;
              return (
                <View style={styles.addressBlock}>
                  <Text style={styles.addressName}>
                    {addr.full_name}
                  </Text>
                  <Text style={styles.addressLine}>
                    {addr.phone}
                  </Text>
                  <Text style={styles.addressLine}>
                    {addr.address_line1}
                    {addr.address_line2 ? `, ${addr.address_line2}` : ''}
                  </Text>
                  <Text style={styles.addressLine}>
                    {addr.city}{addr.state ? `, ${addr.state}` : ''},{' '}
                    {addr.country}
                  </Text>
                </View>
              );
            })()}
          </View>
        )}

        {/* Price Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            💰 {t('cart.orderSummary')}
          </Text>
          {[
            [t('cart.subtotal'), formatPrice(displayOrder.subtotal)],
            [t('cart.shipping'), displayOrder.shipping_cost > 0
              ? formatPrice(displayOrder.shipping_cost) : t('cart.free')],
          ].map(([label, value]) => (
            <View key={label} style={styles.priceRow}>
              <Text style={styles.priceLabel}>{label}</Text>
              <Text style={[styles.priceValue,
                label === t('cart.shipping')
                  && value === t('cart.free')
                  && styles.freeShipText]}>
                {value}
              </Text>
            </View>
          ))}
          <View style={styles.priceDivider} />
          <View style={styles.priceRow}>
            <Text style={styles.totalLabel}>{t('cart.total')}</Text>
            <Text style={styles.totalValue}>
              {formatPrice(displayOrder.total_amount)}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsCard}>
          {canCancel && (
            <Button
              title={t('orders.cancelOrder')}
              variant="danger"
              onPress={handleCancel}
              loading={loading.cancel}
              fullWidth
              style={styles.actionBtn}
            />
          )}
          <Button
            title={t('orders.contactSupport')}
            variant="outline"
            onPress={() => navigation.navigate('Chat', {
              relatedOrderId: displayOrder.id,
            })}
            fullWidth
            style={styles.actionBtn}
          />
          {displayOrder.status === 'delivered' && (
            <Button
              title="🛍️ Buy Again"
              variant="light"
              onPress={() => navigation.navigate('Home')}
              fullWidth
              style={styles.actionBtn}
            />
          )}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SPACING.sm, paddingBottom: SPACING['2xl'] },
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
  backIcon: {
    fontSize: FONTS.xl, color: COLORS.textPrimary, fontWeight: FONTS.bold,
  },
  headerTitle: {
    fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary,
  },
  headerIcon: { fontSize: 22 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  cardTitle: {
    fontSize: FONTS.base,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.base,
  },
  orderMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  orderNumber: {
    fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  orderDate: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center',
    gap: 5, paddingHorizontal: SPACING.sm,
    paddingVertical: 5, borderRadius: RADIUS.full,
  },
  statusDot: { width: 7, height: 7, borderRadius: RADIUS.full },
  statusText: { fontSize: FONTS.xs, fontWeight: FONTS.bold },
  paymentRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: SPACING.sm, marginBottom: SPACING.xs,
  },
  paymentLabel: { fontSize: FONTS.sm, color: COLORS.textMuted },
  paymentValue: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold },
  paymentPaid: { color: COLORS.success },
  paymentPending: { color: COLORS.warning },
  trackingRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: SPACING.sm, marginTop: SPACING.xs,
  },
  trackingLabel: { fontSize: FONTS.sm, color: COLORS.textMuted },
  trackingValue: {
    fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  tracker: { paddingVertical: SPACING.sm },
  stepWrap: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: SPACING.base, minHeight: 56,
  },
  stepColumn: { alignItems: 'center', width: 36 },
  stepCircle: {
    width: 36, height: 36, borderRadius: RADIUS.full,
    backgroundColor: COLORS.skeleton,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.border,
  },
  stepCircleActive: {
    backgroundColor: COLORS.primaryFade, borderColor: COLORS.primary,
  },
  stepCircleCurrent: {
    backgroundColor: COLORS.primary, borderColor: COLORS.primaryDark,
  },
  stepLine: {
    width: 2, flex: 1, minHeight: 20,
    backgroundColor: COLORS.border, marginTop: 2,
  },
  stepLineActive: { backgroundColor: COLORS.primary },
  stepIcon: { fontSize: 16 },
  stepIconInactive: { opacity: 0.3 },
  stepLabel: {
    fontSize: FONTS.sm, color: COLORS.textMuted,
    paddingTop: SPACING.sm, flex: 1,
  },
  stepLabelActive: {
    color: COLORS.textPrimary, fontWeight: FONTS.semiBold,
  },
  cancelledBanner: {
    flexDirection: 'row', alignItems: 'center',
    gap: SPACING.base, backgroundColor: COLORS.dangerLight,
    borderRadius: RADIUS.lg, padding: SPACING.base,
  },
  cancelledIcon: { fontSize: 32 },
  cancelledTitle: {
    fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.dangerText,
  },
  cancelledSub: {
    fontSize: FONTS.sm, color: COLORS.dangerText, opacity: 0.8, marginTop: 2,
  },
  orderItem: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: SPACING.sm, gap: SPACING.sm,
  },
  orderItemBorder: {
    borderBottomWidth: 1, borderBottomColor: COLORS.divider,
  },
  itemImage: {
    width: 72, height: 72, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.skeleton,
  },
  itemImagePlaceholder: {
    width: 72, height: 72, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  itemInfo: { flex: 1, gap: 3 },
  itemName: {
    fontSize: FONTS.sm, fontWeight: FONTS.semiBold,
    color: COLORS.textPrimary, lineHeight: 18,
  },
  itemVendor: { fontSize: FONTS.xs, color: COLORS.textMuted },
  itemPriceRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
  },
  itemPrice: {
    fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.primary,
  },
  itemQty: { fontSize: FONTS.sm, color: COLORS.textMuted },
  itemSubtotal: {
    fontSize: FONTS.base, fontWeight: FONTS.bold,
    color: COLORS.textPrimary, minWidth: 72, textAlign: 'right',
  },
  addressBlock: { gap: 3 },
  addressName: {
    fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary,
  },
  addressLine: {
    fontSize: FONTS.sm, color: COLORS.textSecondary, lineHeight: 20,
  },
  priceRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  priceLabel: { fontSize: FONTS.base, color: COLORS.textSecondary },
  priceValue: {
    fontSize: FONTS.base, fontWeight: FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  freeShipText: { color: COLORS.success, fontWeight: FONTS.bold },
  priceDivider: {
    height: 1, backgroundColor: COLORS.divider, marginVertical: SPACING.xs,
  },
  totalLabel: {
    fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary,
  },
  totalValue: {
    fontSize: FONTS.xl, fontWeight: FONTS.black, color: COLORS.primary,
  },
  actionsCard: { gap: SPACING.sm, marginBottom: SPACING.sm },
  actionBtn: { borderRadius: RADIUS.xl },
});