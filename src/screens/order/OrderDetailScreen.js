/**
 * VUMA Store — Order Detail Screen
 * With Receipt, Return Policy, Share Receipt
 */

import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Platform, Alert, Image, Modal,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchOrderDetail, cancelOrder, selectSelectedOrder,
  selectOrdersLoading, selectOrdersErrors, clearSelectedOrder,
} from '../../store/orderSlice';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../utils/constants';
import {
  formatPrice, formatDateTime,
  getOrderStatusLabel, getOrderStatusColor, canCancelOrder,
} from '../../utils/helpers';
import { t } from '../../i18n';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import { FullScreenError } from '../../components/common/ErrorMessage';

const ORDER_STEPS = [
  { key: 'pending', label: 'Order Placed', icon: '📋' },
  { key: 'paid', label: 'Payment Confirmed', icon: '💳' },
  { key: 'processing', label: 'Processing', icon: '⚙️' },
  { key: 'shipped', label: 'Shipped', icon: '🚚' },
  { key: 'delivered', label: 'Delivered', icon: '✅' },
];

const STATUS_ORDER = ['pending', 'paid', 'processing', 'shipped', 'delivered'];

export default function OrderDetailScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { orderId, order: routeOrder } = route?.params || {};
  const order = useSelector(selectSelectedOrder);
  const loading = useSelector(selectOrdersLoading);
  const errors = useSelector(selectOrdersErrors);
  const displayOrder = order || routeOrder;
  const [showReceipt, setShowReceipt] = useState(false);
  const [showReturnPolicy, setShowReturnPolicy] = useState(false);

  useEffect(() => {
    if (orderId) dispatch(fetchOrderDetail(orderId));
    return () => dispatch(clearSelectedOrder());
  }, [orderId]);

  const handleCancel = useCallback(() => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            const result = await dispatch(cancelOrder(displayOrder.id));
            if (cancelOrder.fulfilled.match(result)) {
              Alert.alert('Cancelled', 'Your order has been cancelled.');
            }
          },
        },
      ]
    );
  }, [displayOrder]);

  if (loading.detail && !displayOrder) return <Loading fullScreen message="Loading order..." />;
  if (errors.detail && !displayOrder) return <FullScreenError error={errors.detail} onRetry={() => dispatch(fetchOrderDetail(orderId))} />;
  if (!displayOrder) return null;

  const statusColor = getOrderStatusColor(displayOrder.status);
  const statusLabel = getOrderStatusLabel(displayOrder.status);
  const currentStepIndex = STATUS_ORDER.indexOf(displayOrder.status);
  const isCancelled = displayOrder.status === 'cancelled' || displayOrder.status === 'refunded';
  const canCancel = canCancelOrder(displayOrder.status, displayOrder.payment_status);

  const addr = displayOrder.shipping_address
    ? (typeof displayOrder.shipping_address === 'string'
      ? JSON.parse(displayOrder.shipping_address)
      : displayOrder.shipping_address)
    : null;

  const ProgressTracker = () => {
    if (isCancelled) {
      return (
        <View style={styles.cancelledBanner}>
          <Text style={styles.cancelledIcon}>❌</Text>
          <View>
            <Text style={styles.cancelledTitle}>Order Cancelled</Text>
            <Text style={styles.cancelledSub}>
              {displayOrder.payment_status === 'paid'
                ? 'Refund will be processed in 3-5 business days.'
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
                <View style={[styles.stepCircle, isCompleted && styles.stepCircleActive, isActive && styles.stepCircleCurrent]}>
                  <Text style={[styles.stepIcon, !isCompleted && styles.stepIconInactive]}>{step.icon}</Text>
                </View>
                {!isLast && <View style={[styles.stepLine, isCompleted && index < currentStepIndex && styles.stepLineActive]} />}
              </View>
              <Text style={[styles.stepLabel, isCompleted && styles.stepLabelActive]}>{step.label}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  // ── Receipt Modal ─────────────────────────────────
  const ReceiptModal = () => (
    <Modal visible={showReceipt} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.receiptContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Receipt Header */}
            <View style={styles.receiptHeader}>
              <Text style={styles.receiptLogo}>VUMA</Text>
              <Text style={styles.receiptTitle}>Official Receipt</Text>
              <Text style={styles.receiptStore}>VUMA MARKETPLACE LIMITED</Text>
              <Text style={styles.receiptWebsite}>vumastore.store</Text>
              <Text style={styles.receiptEmail}>support@vumastore.store</Text>
            </View>

            <View style={styles.receiptDivider} />

            {/* Order Info */}
            <View style={styles.receiptSection}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Receipt No:</Text>
                <Text style={styles.receiptValue}>#{displayOrder.order_number}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Date:</Text>
                <Text style={styles.receiptValue}>{formatDateTime(displayOrder.created_at)}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Payment:</Text>
                <Text style={[styles.receiptValue, { color: COLORS.success }]}>
                  {displayOrder.payment_status === 'paid' ? '✓ PAID' : displayOrder.payment_status?.toUpperCase()}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Method:</Text>
                <Text style={styles.receiptValue}>{displayOrder.payment_method?.toUpperCase()}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Status:</Text>
                <Text style={[styles.receiptValue, { color: statusColor }]}>{statusLabel.toUpperCase()}</Text>
              </View>
            </View>

            <View style={styles.receiptDivider} />

            {/* Delivery Address */}
            {addr && (
              <View style={styles.receiptSection}>
                <Text style={styles.receiptSectionTitle}>DELIVER TO</Text>
                <Text style={styles.receiptAddressName}>{addr.full_name}</Text>
                <Text style={styles.receiptAddressLine}>{addr.phone}</Text>
                <Text style={styles.receiptAddressLine}>{addr.address_line1}</Text>
                <Text style={styles.receiptAddressLine}>{addr.city}, {addr.country}</Text>
              </View>
            )}

            <View style={styles.receiptDivider} />

            {/* Items */}
            <View style={styles.receiptSection}>
              <Text style={styles.receiptSectionTitle}>ITEMS PURCHASED</Text>
              {(displayOrder.items || []).map((item, i) => (
                <View key={i} style={styles.receiptItem}>
                  <View style={styles.receiptItemLeft}>
                    <Text style={styles.receiptItemName} numberOfLines={2}>{item.product_name}</Text>
                    <Text style={styles.receiptItemVendor}>Sold by: {item.vendor_name || 'VUMA Store'}</Text>
                    <Text style={styles.receiptItemQty}>Qty: {item.quantity} × {formatPrice(item.unit_price)}</Text>
                  </View>
                  <Text style={styles.receiptItemTotal}>{formatPrice(item.total_price)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.receiptDivider} />

            {/* Totals */}
            <View style={styles.receiptSection}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Subtotal:</Text>
                <Text style={styles.receiptValue}>{formatPrice(displayOrder.subtotal)}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Shipping:</Text>
                <Text style={styles.receiptValue}>
                  {displayOrder.shipping_cost > 0 ? formatPrice(displayOrder.shipping_cost) : 'FREE'}
                </Text>
              </View>
              <View style={styles.receiptTotalRow}>
                <Text style={styles.receiptTotalLabel}>TOTAL:</Text>
                <Text style={styles.receiptTotalValue}>{formatPrice(displayOrder.total_amount)}</Text>
              </View>
            </View>

            <View style={styles.receiptDivider} />

            {/* Footer */}
            <View style={styles.receiptFooter}>
              <Text style={styles.receiptFooterText}>Thank you for shopping with VUMA! 🎉</Text>
              <Text style={styles.receiptFooterSub}>For returns & support: support@vumastore.store</Text>
              <Text style={styles.receiptFooterSub}>Return policy: 7 days from delivery date</Text>
              <View style={styles.receiptBarcode}>
                <Text style={styles.receiptBarcodeText}>||||||||| {displayOrder.order_number} |||||||||</Text>
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.closeReceiptBtn} onPress={() => setShowReceipt(false)}>
            <Text style={styles.closeReceiptText}>Close Receipt</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // ── Return Policy Modal ───────────────────────────
  const ReturnPolicyModal = () => (
    <Modal visible={showReturnPolicy} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.policyContainer}>
          <View style={styles.policyHeader}>
            <Text style={styles.policyTitle}>↩️ Return & Refund Policy</Text>
            <TouchableOpacity onPress={() => setShowReturnPolicy(false)}>
              <Text style={styles.policyClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.base }}>
            {[
              {
                title: '✅ Return Period',
                content: 'You can return items within 7 days of delivery. Items must be unused, unworn, and in original packaging with all tags attached.',
              },
              {
                title: '📦 How to Return',
                content: '1. Contact our support at support@vumastore.store\n2. Provide your order number and reason for return\n3. We will arrange pickup or drop-off\n4. Refund processed within 3-5 business days after we receive the item.',
              },
              {
                title: '💰 Refund Method',
                content: 'Refunds are issued to the original payment method:\n• Mobile Money: M-Pesa, Airtel, Halopesa\n• Bank transfer (2-5 business days)\n• VUMA Wallet (instant)',
              },
              {
                title: '❌ Non-Returnable Items',
                content: '• Food & perishable items\n• Personal hygiene products (opened)\n• Digital products & downloads\n• Items damaged by misuse\n• Sale items marked as final sale',
              },
              {
                title: '🔄 Exchange Policy',
                content: 'We offer free exchanges for wrong size or defective items. Contact support within 7 days of delivery.',
              },
              {
                title: '📞 Contact Support',
                content: 'Email: support@vumastore.store\nWebsite: vumastore.store\nResponse time: Within 24 hours',
              },
            ].map((section, i) => (
              <View key={i} style={styles.policySection}>
                <Text style={styles.policySectionTitle}>{section.title}</Text>
                <Text style={styles.policySectionContent}>{section.content}</Text>
              </View>
            ))}
            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Detail</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Chat', { relatedOrderId: displayOrder.id })}>
          <Text style={styles.headerIcon}>💬</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Order Meta */}
        <View style={styles.card}>
          <View style={styles.orderMeta}>
            <View>
              <Text style={styles.orderNumber}>#{displayOrder.order_number}</Text>
              <Text style={styles.orderDate}>{formatDateTime(displayOrder.created_at)}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Payment:</Text>
            <Text style={[styles.paymentValue, displayOrder.payment_status === 'paid' ? styles.paymentPaid : styles.paymentPending]}>
              {displayOrder.payment_status === 'paid' ? '✓ Paid' : '⏳ ' + displayOrder.payment_status}
              {' '}via {displayOrder.payment_method?.toUpperCase()}
            </Text>
          </View>
          {displayOrder.tracking_number && (
            <View style={styles.trackingRow}>
              <Text style={styles.trackingLabel}>Tracking:</Text>
              <Text style={styles.trackingValue}>{displayOrder.tracking_number}</Text>
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickBtn} onPress={() => setShowReceipt(true)}>
              <Text style={styles.quickBtnIcon}>🧾</Text>
              <Text style={styles.quickBtnText}>Receipt</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtn} onPress={() => setShowReturnPolicy(true)}>
              <Text style={styles.quickBtnIcon}>↩️</Text>
              <Text style={styles.quickBtnText}>Returns</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Chat', { relatedOrderId: displayOrder.id })}>
              <Text style={styles.quickBtnIcon}>💬</Text>
              <Text style={styles.quickBtnText}>Support</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📍 Order Progress</Text>
          <ProgressTracker />
        </View>

        {/* Items */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📦 Items ({displayOrder.items?.length || 0})</Text>
          {(displayOrder.items || []).map((item, i) => (
            <View key={item.id || i} style={[styles.orderItem, i < (displayOrder.items?.length || 0) - 1 && styles.orderItemBorder]}>
              {item.product_image ? (
                <Image source={{ uri: item.product_image }} style={styles.itemImage} resizeMode="cover" />
              ) : (
                <View style={styles.itemImagePlaceholder}>
                  <Text style={{ fontSize: 28 }}>📦</Text>
                </View>
              )}
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>{item.product_name}</Text>
                <Text style={styles.itemVendor}>🏪 {item.vendor_name || 'VUMA Store'}</Text>
                <View style={styles.itemPriceRow}>
                  <Text style={styles.itemPrice}>{formatPrice(item.unit_price)}</Text>
                  <Text style={styles.itemQty}>× {item.quantity}</Text>
                </View>
              </View>
              <Text style={styles.itemSubtotal}>{formatPrice(item.total_price)}</Text>
            </View>
          ))}
        </View>

        {/* Shipping Address */}
        {addr && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📍 Delivery Address</Text>
            <View style={styles.addressBlock}>
              <Text style={styles.addressName}>{addr.full_name}</Text>
              <Text style={styles.addressLine}>{addr.phone}</Text>
              <Text style={styles.addressLine}>{addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ''}</Text>
              <Text style={styles.addressLine}>{addr.city}{addr.state ? `, ${addr.state}` : ''}, {addr.country}</Text>
            </View>
          </View>
        )}

        {/* Price Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💰 Price Summary</Text>
          {[
            ['Subtotal', formatPrice(displayOrder.subtotal)],
            ['Shipping', displayOrder.shipping_cost > 0 ? formatPrice(displayOrder.shipping_cost) : '🎉 FREE'],
          ].map(([label, value]) => (
            <View key={label} style={styles.priceRow}>
              <Text style={styles.priceLabel}>{label}</Text>
              <Text style={[styles.priceValue, value === '🎉 FREE' && styles.freeShipText]}>{value}</Text>
            </View>
          ))}
          <View style={styles.priceDivider} />
          <View style={styles.priceRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPrice(displayOrder.total_amount)}</Text>
          </View>
        </View>

        {/* Return Policy Banner */}
        <TouchableOpacity style={styles.returnBanner} onPress={() => setShowReturnPolicy(true)}>
          <Text style={styles.returnBannerIcon}>↩️</Text>
          <View style={styles.returnBannerText}>
            <Text style={styles.returnBannerTitle}>7-Day Return Policy</Text>
            <Text style={styles.returnBannerSub}>Free returns within 7 days of delivery. Tap to learn more.</Text>
          </View>
          <Text style={styles.returnBannerArrow}>›</Text>
        </TouchableOpacity>

        {/* Actions */}
        <View style={styles.actionsCard}>
          {canCancel && (
            <Button title="Cancel Order" variant="danger" onPress={handleCancel} loading={loading.cancel} fullWidth style={styles.actionBtn} />
          )}
          <Button
            title="🧾 View Receipt"
            variant="outline"
            onPress={() => setShowReceipt(true)}
            fullWidth style={styles.actionBtn}
          />
          <Button
            title="💬 Contact Support"
            variant="outline"
            onPress={() => navigation.navigate('Chat', { relatedOrderId: displayOrder.id })}
            fullWidth style={styles.actionBtn}
          />
          {displayOrder.status === 'delivered' && (
            <Button title="🛍️ Buy Again" variant="light" onPress={() => navigation.navigate('Home')} fullWidth style={styles.actionBtn} />
          )}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      <ReceiptModal />
      <ReturnPolicyModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SPACING.sm, paddingBottom: SPACING['2xl'] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, paddingHorizontal: SPACING.base, paddingTop: Platform.OS === 'ios' ? SPACING['3xl'] : SPACING.base, paddingBottom: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider, ...SHADOWS.sm },
  backIcon: { fontSize: FONTS.xl, color: COLORS.textPrimary, fontWeight: FONTS.bold },
  headerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  headerIcon: { fontSize: 22 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.base, marginBottom: SPACING.sm, ...SHADOWS.sm },
  cardTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.base },
  orderMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm },
  orderNumber: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  orderDate: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: SPACING.sm, paddingVertical: 5, borderRadius: RADIUS.full },
  statusDot: { width: 7, height: 7, borderRadius: RADIUS.full },
  statusText: { fontSize: FONTS.xs, fontWeight: FONTS.bold },
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs },
  paymentLabel: { fontSize: FONTS.sm, color: COLORS.textMuted },
  paymentValue: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold },
  paymentPaid: { color: COLORS.success },
  paymentPending: { color: COLORS.warning },
  trackingRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.xs },
  trackingLabel: { fontSize: FONTS.sm, color: COLORS.textMuted },
  trackingValue: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.primary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  quickActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.base, paddingTop: SPACING.base, borderTopWidth: 1, borderTopColor: COLORS.divider },
  quickBtn: { flex: 1, alignItems: 'center', backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg, paddingVertical: SPACING.sm, gap: 4, borderWidth: 1, borderColor: COLORS.border },
  quickBtnIcon: { fontSize: 20 },
  quickBtnText: { fontSize: FONTS.xs, color: COLORS.textSecondary, fontWeight: FONTS.semiBold },
  tracker: { paddingVertical: SPACING.sm },
  stepWrap: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.base, minHeight: 56 },
  stepColumn: { alignItems: 'center', width: 36 },
  stepCircle: { width: 36, height: 36, borderRadius: RADIUS.full, backgroundColor: COLORS.skeleton, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.border },
  stepCircleActive: { backgroundColor: COLORS.primaryFade, borderColor: COLORS.primary },
  stepCircleCurrent: { backgroundColor: COLORS.primary, borderColor: COLORS.primaryDark },
  stepLine: { width: 2, flex: 1, minHeight: 20, backgroundColor: COLORS.border, marginTop: 2 },
  stepLineActive: { backgroundColor: COLORS.primary },
  stepIcon: { fontSize: 16 },
  stepIconInactive: { opacity: 0.3 },
  stepLabel: { fontSize: FONTS.sm, color: COLORS.textMuted, paddingTop: SPACING.sm, flex: 1 },
  stepLabelActive: { color: COLORS.textPrimary, fontWeight: FONTS.semiBold },
  cancelledBanner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.base, backgroundColor: COLORS.dangerLight, borderRadius: RADIUS.lg, padding: SPACING.base },
  cancelledIcon: { fontSize: 32 },
  cancelledTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.dangerText },
  cancelledSub: { fontSize: FONTS.sm, color: COLORS.dangerText, opacity: 0.8, marginTop: 2 },
  orderItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: SPACING.sm, gap: SPACING.sm },
  orderItemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  itemImage: { width: 72, height: 72, borderRadius: RADIUS.lg, backgroundColor: COLORS.skeleton },
  itemImagePlaceholder: { width: 72, height: 72, borderRadius: RADIUS.lg, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1, gap: 3 },
  itemName: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textPrimary, lineHeight: 18 },
  itemVendor: { fontSize: FONTS.xs, color: COLORS.textMuted },
  itemPriceRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  itemPrice: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.primary },
  itemQty: { fontSize: FONTS.sm, color: COLORS.textMuted },
  itemSubtotal: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary, minWidth: 72, textAlign: 'right' },
  addressBlock: { gap: 3 },
  addressName: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  addressLine: { fontSize: FONTS.sm, color: COLORS.textSecondary, lineHeight: 20 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.sm },
  priceLabel: { fontSize: FONTS.base, color: COLORS.textSecondary },
  priceValue: { fontSize: FONTS.base, fontWeight: FONTS.semiBold, color: COLORS.textPrimary },
  freeShipText: { color: COLORS.success, fontWeight: FONTS.bold },
  priceDivider: { height: 1, backgroundColor: COLORS.divider, marginVertical: SPACING.xs },
  totalLabel: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  totalValue: { fontSize: FONTS.xl, fontWeight: FONTS.black, color: COLORS.primary },
  returnBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryFade, borderRadius: RADIUS.xl, padding: SPACING.base, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.primary + '30' },
  returnBannerIcon: { fontSize: 28, marginRight: SPACING.sm },
  returnBannerText: { flex: 1 },
  returnBannerTitle: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.primary },
  returnBannerSub: { fontSize: FONTS.xs, color: COLORS.textSecondary, marginTop: 2 },
  returnBannerArrow: { fontSize: FONTS.xl, color: COLORS.primary },
  actionsCard: { gap: SPACING.sm, marginBottom: SPACING.sm },
  actionBtn: { borderRadius: RADIUS.xl },
  // Receipt Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  receiptContainer: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS['2xl'], borderTopRightRadius: RADIUS['2xl'], maxHeight: '90%', paddingBottom: Platform.OS === 'ios' ? 34 : 16 },
  receiptHeader: { alignItems: 'center', padding: SPACING.xl, backgroundColor: COLORS.secondary, borderTopLeftRadius: RADIUS['2xl'], borderTopRightRadius: RADIUS['2xl'] },
  receiptLogo: { fontSize: FONTS['4xl'], fontWeight: FONTS.black, color: COLORS.primary, letterSpacing: -2 },
  receiptTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textWhite, marginTop: SPACING.xs },
  receiptStore: { fontSize: FONTS.sm, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  receiptWebsite: { fontSize: FONTS.xs, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  receiptEmail: { fontSize: FONTS.xs, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  receiptDivider: { height: 1, backgroundColor: COLORS.divider, marginHorizontal: SPACING.base },
  receiptSection: { padding: SPACING.base },
  receiptSectionTitle: { fontSize: FONTS.xs, fontWeight: FONTS.bold, color: COLORS.textMuted, letterSpacing: 1, marginBottom: SPACING.sm },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  receiptLabel: { fontSize: FONTS.sm, color: COLORS.textMuted },
  receiptValue: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textPrimary },
  receiptAddressName: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  receiptAddressLine: { fontSize: FONTS.sm, color: COLORS.textSecondary, lineHeight: 20 },
  receiptItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  receiptItemLeft: { flex: 1, marginRight: SPACING.sm },
  receiptItemName: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textPrimary },
  receiptItemVendor: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  receiptItemQty: { fontSize: FONTS.xs, color: COLORS.textSecondary, marginTop: 2 },
  receiptItemTotal: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.primary },
  receiptTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.sm, marginTop: SPACING.xs, borderTopWidth: 2, borderTopColor: COLORS.textPrimary },
  receiptTotalLabel: { fontSize: FONTS.lg, fontWeight: FONTS.black, color: COLORS.textPrimary },
  receiptTotalValue: { fontSize: FONTS.xl, fontWeight: FONTS.black, color: COLORS.primary },
  receiptFooter: { alignItems: 'center', padding: SPACING.base },
  receiptFooterText: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary, textAlign: 'center' },
  receiptFooterSub: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 4, textAlign: 'center' },
  receiptBarcode: { marginTop: SPACING.base, padding: SPACING.sm, backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.sm },
  receiptBarcodeText: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: FONTS.sm, color: COLORS.textSecondary, letterSpacing: 2 },
  closeReceiptBtn: { margin: SPACING.base, backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, padding: SPACING.base, alignItems: 'center' },
  closeReceiptText: { color: COLORS.textWhite, fontSize: FONTS.base, fontWeight: FONTS.bold },
  // Return Policy Modal
  policyContainer: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS['2xl'], borderTopRightRadius: RADIUS['2xl'], maxHeight: '90%' },
  policyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  policyTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  policyClose: { fontSize: FONTS.xl, color: COLORS.textMuted, fontWeight: FONTS.bold },
  policySection: { marginBottom: SPACING.base, backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg, padding: SPACING.base },
  policySectionTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  policySectionContent: { fontSize: FONTS.sm, color: COLORS.textSecondary, lineHeight: 22 },
});