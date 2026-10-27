/**
 * VUMA Store — Order Detail Screen
 * With Receipt, Return Policy, Share Receipt
 * Added: real Delivery Tracking card — shows real Shipment data
 * (provider, tracking number, event timeline) from the universal
 * logistics platform when one exists for this order. Shows nothing
 * extra when it doesn't (a brand-new order with no shipment yet) —
 * the existing 5-step progress tracker above still covers that case.
 */

import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Platform, Alert, Image, Modal, Linking,
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
import { get } from '../../api/client';
import { ordersAPI } from '../../api/orders';
import { paymentsAPI } from '../../api/payments';
import {
  shouldLoadDelivery, deliveryForOrder, canShowCode, spacedCode,
  shouldLoadRefund, refundForOrder, refundStatus, refundMessage,
} from '../../utils/walletInfo';
import { parcelsAPI } from '../../api/parcels';
import {
  POLL_MS, shouldLoadParcels, orderRef, parcelList, orderedParcels, signature, tone, toneColors, statusText,
  hintFor, progressStep, stageNames, historyOf, canShowCode as canShowParcelCode, codeErrorText, manyNote,
  waybillLine, pointInfo, isAtPoint, hasPhoto, photoUri, photoCaption,
} from '../../utils/parcelInfo';
import ParcelPhoto from '../../components/ParcelPhoto';

const ORDER_STEPS = [
  { key: 'pending', label: 'Order Placed', icon: '📋' },
  { key: 'paid', label: 'Payment Confirmed', icon: '💳' },
  { key: 'processing', label: 'Processing', icon: '⚙️' },
  { key: 'shipped', label: 'Shipped', icon: '🚚' },
  { key: 'delivered', label: 'Delivered', icon: '✅' },
];

const STATUS_ORDER = ['pending', 'paid', 'processing', 'shipped', 'delivered'];

// Universal Shipment status -> friendly label + icon, matching the
// app's existing tone (short, Tanzanian-friendly, no jargon).
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

export default function OrderDetailScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { orderId, order: routeOrder } = route?.params || {};
  const order = useSelector(selectSelectedOrder);
  const loading = useSelector(selectOrdersLoading);
  const errors = useSelector(selectOrdersErrors);
  const displayOrder = order || routeOrder;
  // The delivery fee before a free-delivery coupon: the coupon row above already shows the money
  // it took off, so the rows add up to the total.
  const shippingBeforeCoupon = Number(displayOrder?.shipping_cost || 0)
    + Number(displayOrder?.discount_details?.coupon?.delivery_fee_waived || 0);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showReturnPolicy, setShowReturnPolicy] = useState(false);
  const [tracking, setTracking] = useState(null);
  const [delivery, setDelivery] = useState(null);
  const [code, setCode] = useState('');
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [refund, setRefund] = useState(null);
  const [refundChecked, setRefundChecked] = useState(false);
  const [parcels, setParcels] = useState([]);
  const [parcelsChecked, setParcelsChecked] = useState(false);
  const [parcelCodes, setParcelCodes] = useState({});
  const [parcelCodeErrors, setParcelCodeErrors] = useState({});
  const [parcelCodeBusy, setParcelCodeBusy] = useState('');
  const parcelsSeen = useRef(null);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  useEffect(() => {
    if (orderId) dispatch(fetchOrderDetail(orderId));
    return () => dispatch(clearSelectedOrder());
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;
    get(`/logistics/shipments/by-order/${orderId}/`)
      .then((data) => setTracking(data || null))
      .catch(() => setTracking(null));
  }, [orderId]);

  // The parcels of a paid order (one per seller): where each one is, and the delivery code of each one.
  // An order without parcels (the parcel system is off, or an older order) keeps the old delivery card below.
  const needParcels = shouldLoadParcels(displayOrder);
  const parcelRef = orderRef(displayOrder);
  const reloadParcels = useCallback(async () => {
    try {
      const rows = parcelList(await parcelsAPI.getMyParcels(parcelRef));
      if (!mounted.current) return;
      const sig = signature(rows);
      const moved = parcelsSeen.current !== null && sig !== parcelsSeen.current;
      parcelsSeen.current = sig;
      setParcels(orderedParcels(rows));
      if (moved && orderId) dispatch(fetchOrderDetail(orderId));     // the order itself may have moved on
    } catch (e) {
      // keep what is on the screen; the customer can tap Refresh
    }
  }, [parcelRef, orderId]);
  useEffect(() => {
    setParcelCodes({});
    setParcelCodeErrors({});
    parcelsSeen.current = null;
    if (!needParcels) { setParcels([]); setParcelsChecked(false); return undefined; }
    let alive = true;
    setParcelsChecked(false);
    reloadParcels().then(() => { if (alive && mounted.current) setParcelsChecked(true); });
    return () => { alive = false; };
  }, [needParcels, displayOrder?.id, displayOrder?.status]);

  // While a rider has a parcel (or it waits at a pickup point), look again every few seconds:
  // the customer is about to give the code, and the page shows "Collected" as soon as the attendant has handed it over.
  const riderHasParcel = parcels.some((p) => p.status === 'out_for_delivery' || p.status === 'at_pickup_point');
  useEffect(() => {
    if (!needParcels || !riderHasParcel) return undefined;
    const timer = setInterval(() => { reloadParcels(); }, POLL_MS);
    return () => clearInterval(timer);
  }, [needParcels, riderHasParcel, reloadParcels]);

  // The handover code of the old delivery system: only while the parcel of a paid order is on its way,
  // and only when the order has no parcels.
  const needDelivery = shouldLoadDelivery(displayOrder) && (!needParcels || parcelsChecked) && parcels.length === 0;
  useEffect(() => {
    setCode('');
    setCodeError('');
    if (!needDelivery) { setDelivery(null); return undefined; }
    let alive = true;
    ordersAPI.getMyDeliveries()
      .then((rows) => { if (alive) setDelivery(deliveryForOrder(rows, displayOrder)); })
      .catch(() => { if (alive) setDelivery(null); });
    return () => { alive = false; };
  }, [needDelivery, displayOrder?.id, displayOrder?.status]);

  // The refund: only when a paid order ended as cancelled, rejected, returned or refunded.
  const needRefund = shouldLoadRefund(displayOrder);
  useEffect(() => {
    if (!needRefund) { setRefund(null); setRefundChecked(false); return undefined; }
    let alive = true;
    paymentsAPI.getMyRefunds()
      .then((data) => {
        if (!alive) return;
        setRefund(refundForOrder(data && (data.results || data), displayOrder));
        setRefundChecked(true);
      })
      .catch(() => { if (alive) { setRefund(null); setRefundChecked(true); } });
    return () => { alive = false; };
  }, [needRefund, displayOrder?.id, displayOrder?.status]);

  const handleShowCode = useCallback(async () => {
    if (!delivery || codeBusy) return;
    setCodeBusy(true);
    setCodeError('');
    try {
      const res = await ordersAPI.getDeliveryCode(delivery.id);
      const value = String((res && res.code) || '');
      setCode(value);
      if (!value) setCodeError(t('wallet.codeError'));
    } catch (e) {
      setCode('');
      setCodeError(e && e.type === 'VALIDATION_ERROR' && e.message ? e.message : t('wallet.codeError'));
    } finally {
      setCodeBusy(false);
    }
  }, [delivery, codeBusy]);

  // The code of ONE parcel (an order with two sellers has two parcels and two codes).
  const handleParcelCode = useCallback(async (parcel) => {
    if (!parcel || parcelCodeBusy) return;
    const id = parcel.id;
    setParcelCodeBusy(id);
    setParcelCodeErrors((m) => ({ ...m, [id]: '' }));
    try {
      const res = await parcelsAPI.getParcelCode(id);
      const value = String((res && res.code) || '');
      setParcelCodes((m) => ({ ...m, [id]: value }));
      if (!value) setParcelCodeErrors((m) => ({ ...m, [id]: t('wallet.codeError') }));
    } catch (e) {
      setParcelCodeErrors((m) => ({ ...m, [id]: codeErrorText(e) }));
    } finally {
      if (mounted.current) setParcelCodeBusy('');
    }
  }, [parcelCodeBusy]);

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

  // The current checkout flow (Region -> District -> Ward) sends a
  // different address shape than this screen originally read
  // (address_line1/city/country - fields the app no longer sends at
  // all, so this section was showing blank/incomplete info for every
  // real order). Derived once here for both the Delivery Address card
  // and the Receipt's "DELIVER TO" section below, so they can't drift
  // out of sync with each other. Pickup orders carry their own shape
  // entirely (pickup_point_name), handled separately.
  const isPickupOrder = addr?.delivery_type === 'pickup';
  const homeAddressLines = addr && !isPickupOrder
    ? [addr.village, addr.landmark, addr.ward, addr.district, addr.region].filter(Boolean)
    : [];

  const ProgressTracker = () => {
    if (isCancelled) {
      return (
        <View style={styles.cancelledBanner}>
          <Text style={styles.cancelledIcon}>❌</Text>
          <View>
            <Text style={styles.cancelledTitle}>Order Cancelled</Text>
            <Text style={styles.cancelledSub}>
              {displayOrder.payment_status === 'paid' || displayOrder.payment_status === 'refunded'
                ? t('wallet.orderRefundBanner')
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

  // ── Where each parcel of the order is (one parcel per seller), with the delivery code of each ──
  const renderParcel = (p) => {
    const stages = stageNames(p);
    const point = pointInfo(p);
    const atPoint = isAtPoint(p);
    const colors = toneColors(tone(p));
    const step = progressStep(p);
    const history = historyOf(p);
    const value = parcelCodes[p.id] || '';
    const problem = parcelCodeErrors[p.id] || '';
    const hint = hintFor(p);
    const way = waybillLine(p);
    return (
      <View key={p.id} style={styles.parcelBox} testID={`parcel-${p.id}`}>
        <View style={styles.parcelHead}>
          <View style={styles.parcelHeadText}>
            {p.seller_name ? <Text style={styles.parcelSeller} numberOfLines={2}>{t('parcels.from', { seller: p.seller_name })}</Text> : null}
            {p.item_summary ? <Text style={styles.parcelItems} numberOfLines={2}>{p.item_summary}</Text> : null}
          </View>
          <View style={[styles.parcelPill, { backgroundColor: colors.bg }]} testID={`parcel-status-${p.id}`}>
            <Text style={[styles.parcelPillText, { color: colors.fg }]}>{statusText(p)}</Text>
          </View>
        </View>
        {step !== null ? (
          <View style={styles.stageRow} testID={`parcel-stages-${p.id}`}>
            {stages.map((name, i) => (
              <View key={name} style={styles.stageCol}>
                <View style={[styles.stageBar, step > i && styles.stageBarOn]} />
                <Text style={[styles.stageName, step === i + 1 && styles.stageNameOn]} numberOfLines={1}>{name}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {hint ? <Text style={styles.parcelHint} testID={`parcel-hint-${p.id}`}>{hint}</Text> : null}
        {point && (p.status === 'out_for_delivery' || atPoint || p.status === 'delivered') ? (
          <View style={styles.pointBox} testID={`parcel-point-${p.id}`}>
            <Text style={styles.pointName}>📍 {t('parcels.pointTitle')}: {point.name}</Text>
            {point.address ? <Text style={styles.pointLine}>{point.address}</Text> : null}
            {point.landmark ? <Text style={styles.pointLine}>{point.landmark}</Text> : null}
            {point.hours ? <Text style={styles.pointLine}>{t('parcels.pointOpen', { hours: point.hours })}</Text> : null}
            {point.phone && p.status !== 'delivered' ? (
              <TouchableOpacity testID={`parcel-point-call-${p.id}`} style={styles.pointCall} onPress={() => { Linking.openURL(`tel:${String(point.phone).replace(/[^\d+]/g, '')}`).catch(() => {}); }}>
                <Text style={styles.pointCallText}>📞 {t('parcels.pointCall')}: {point.phone}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
        {canShowParcelCode(p) ? (
          <View style={styles.parcelCode} testID={`parcel-code-card-${p.id}`}>
            <Text style={styles.cardTitle}>🔑 {atPoint ? t('parcels.pointCodeTitle') : t('wallet.codeTitle')}</Text>
            <Text style={styles.codeHow}>{atPoint ? t('parcels.pointCodeHow') : t('wallet.codeHow')}</Text>
            {value ? (
              <View>
                <Text style={styles.codeDigits} testID={`parcel-code-digits-${p.id}`} selectable>{spacedCode(value)}</Text>
                <Text style={styles.codeHint}>{atPoint ? t('parcels.pointCodeValid') : t('wallet.codeValid')}</Text>
                <Text style={styles.codeHint}>{atPoint ? t('parcels.pointCodeSms') : t('wallet.codeSms')}</Text>
              </View>
            ) : null}
            {problem ? <Text style={styles.codeError} testID={`parcel-code-error-${p.id}`}>{problem}</Text> : null}
            <TouchableOpacity
              testID={`parcel-code-button-${p.id}`}
              style={styles.codeBtn}
              disabled={!!parcelCodeBusy}
              onPress={value ? () => setParcelCodes((m) => ({ ...m, [p.id]: '' })) : () => handleParcelCode(p)}
            >
              <Text style={styles.codeBtnText}>
                {parcelCodeBusy === p.id ? t('wallet.codeBusy') : (value ? t('wallet.codeHide') : t('wallet.codeShow'))}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {hasPhoto(p) ? (
          <ParcelPhoto
            testID={`parcel-photo-${p.id}`}
            uri={photoUri(p, 'customer')}
            title={t('parcels.photoTitle')}
            caption={photoCaption(p)}
            tapHint={t('parcels.photoTap')}
            failedText={t('parcels.photoFailed')}
            retryText={t('parcels.photoRetry')}
            closeText={t('parcels.photoClose')}
            onRetry={reloadParcels}
          />
        ) : null}
        {history.steps.length > 0 ? (
          <View style={styles.parcelSteps} testID={`parcel-steps-${p.id}`}>
            {history.steps.map((s, i) => (
              <View key={s.key} style={styles.parcelStepRow}>
                <View style={[styles.parcelDot, i === 0 && styles.parcelDotNew]} />
                <View style={styles.parcelStepText}>
                  <Text style={[styles.parcelStepLabel, i === 0 && styles.parcelStepLabelNew]}>
                    {s.text}{s.place ? ' - ' + s.place : ''}
                  </Text>
                  {s.when ? <Text style={styles.parcelStepTime}>{s.when}</Text> : null}
                </View>
              </View>
            ))}
            {history.hidden > 0 ? <Text style={styles.parcelStepTime}>{t('parcels.earlier', { n: history.hidden })}</Text> : null}
          </View>
        ) : null}
        {way ? <Text style={styles.parcelWaybill}>{way}</Text> : null}
      </View>
    );
  };

  const renderParcelsCard = () => {
    if (!needParcels || parcels.length === 0) return null;
    const note = manyNote(parcels.length);
    return (
      <View style={styles.card} testID="order-parcels-card">
        <View style={styles.parcelTop}>
          <Text style={styles.parcelTitle}>🚚 {parcels.length > 1 ? t('parcels.titleMany') : t('parcels.titleOne')}</Text>
          <TouchableOpacity testID="parcels-refresh" onPress={() => reloadParcels()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.parcelRefresh}>{t('parcels.refresh')}</Text>
          </TouchableOpacity>
        </View>
        {note ? <Text style={styles.parcelNote} testID="parcels-many-note">{note}</Text> : null}
        {parcels.map((p) => renderParcel(p))}
      </View>
    );
  };

  // ── The customer's handover code ──
  const renderCodeCard = () => {
    if (!canShowCode(delivery)) return null;
    return (
      <View style={[styles.card, styles.codeCard]} testID="delivery-code-card">
        <Text style={styles.cardTitle}>🔑 {t('wallet.codeTitle')}</Text>
        <Text style={styles.codeHow}>{t('wallet.codeHow')}</Text>
        {code ? (
          <View>
            <Text style={styles.codeDigits} testID="delivery-code-digits" selectable>{spacedCode(code)}</Text>
            <Text style={styles.codeHint}>{t('wallet.codeValid')}</Text>
            <Text style={styles.codeHint}>{t('wallet.codeSms')}</Text>
          </View>
        ) : null}
        {codeError ? <Text style={styles.codeError} testID="delivery-code-error">{codeError}</Text> : null}
        <TouchableOpacity
          testID="delivery-code-button"
          style={styles.codeBtn}
          disabled={codeBusy}
          onPress={code ? () => setCode('') : handleShowCode}
        >
          <Text style={styles.codeBtnText}>
            {codeBusy ? t('wallet.codeBusy') : (code ? t('wallet.codeHide') : t('wallet.codeShow'))}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── The refund of a paid order that ended ──
  const renderRefundCard = () => {
    if (!shouldLoadRefund(displayOrder) || (!refund && !refundChecked)) return null;
    const status = refund ? refundStatus(refund) : null;
    const tone = status ? ({
      done: { bg: COLORS.successLight, fg: COLORS.successText },
      wait: { bg: COLORS.warningLight, fg: COLORS.warningText },
      stop: { bg: COLORS.surfaceAlt, fg: COLORS.textMuted },
    })[status.tone] : null;
    return (
      <View style={styles.card} testID="order-refund-card">
        <Text style={styles.cardTitle}>↩️ {t('wallet.orderRefundTitle')}</Text>
        {refund ? (
          <View>
            <View style={styles.refundRow}>
              <Text style={styles.refundAmount}>{formatPrice(Number(refund.amount))}</Text>
              <View style={[styles.refundPill, { backgroundColor: tone.bg }]}>
                <Text style={[styles.refundPillText, { color: tone.fg }]}>{status.label}</Text>
              </View>
            </View>
            <Text style={styles.refundMessage} testID="order-refund-message">{refundMessage(refund)}</Text>
          </View>
        ) : (
          <Text style={styles.refundMessage} testID="order-refund-soon">{t('wallet.orderRefundSoon')}</Text>
        )}
      </View>
    );
  };

  // ── Real Delivery Tracking — from the universal Shipment system ──
  const DeliveryTrackingCard = () => {
    if (!tracking) return null;
    const currentInfo = SHIPMENT_STATUS_INFO[tracking.status] || { label: tracking.status, icon: '📍' };
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🚚 Delivery Tracking</Text>

        <View style={styles.trackingHeaderRow}>
          <View>
            <Text style={styles.trackingCompany}>{tracking.provider_name}</Text>
            {tracking.tracking_number ? (
              <Text style={styles.trackingNum}>Tracking: {tracking.tracking_number}</Text>
            ) : null}
          </View>
          <View style={[styles.trackingStatusPill, { backgroundColor: statusColor + '20' }]}>
            <Text style={styles.trackingStatusIcon}>{currentInfo.icon}</Text>
            <Text style={[styles.trackingStatusText, { color: statusColor }]}>{currentInfo.label}</Text>
          </View>
        </View>

        {tracking.estimated_delivery_date && (
          <Text style={styles.trackingEta}>Estimated delivery: {formatDateTime(tracking.estimated_delivery_date)}</Text>
        )}

        {tracking.events?.length > 0 && (
          <View style={styles.timeline}>
            {tracking.events.map((event, i) => {
              const info = SHIPMENT_STATUS_INFO[event.status] || { label: event.status, icon: '📍' };
              const isLast = i === tracking.events.length - 1;
              return (
                <View key={i} style={styles.timelineRow}>
                  <View style={styles.timelineDotCol}>
                    <View style={[styles.timelineDot, isLast && styles.timelineDotLatest]}>
                      <Text style={styles.timelineDotIcon}>{info.icon}</Text>
                    </View>
                    {i < tracking.events.length - 1 && <View style={styles.timelineLine} />}
                  </View>
                  <View style={styles.timelineTextCol}>
                    <Text style={[styles.timelineLabel, isLast && styles.timelineLabelLatest]}>{info.label}</Text>
                    <Text style={styles.timelineTime}>{formatDateTime(event.timestamp)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
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
                <Text style={styles.receiptSectionTitle}>{isPickupOrder ? 'PICKUP STATION' : 'DELIVER TO'}</Text>
                {isPickupOrder ? (
                  <>
                    <Text style={styles.receiptAddressName}>{addr.pickup_point_name || 'Pickup station'}</Text>
                    {addr.phone ? <Text style={styles.receiptAddressLine}>{addr.phone}</Text> : null}
                  </>
                ) : (
                  <>
                    {addr.full_name ? <Text style={styles.receiptAddressName}>{addr.full_name}</Text> : null}
                    {addr.phone ? <Text style={styles.receiptAddressLine}>{addr.phone}</Text> : null}
                    {homeAddressLines.length > 0 && <Text style={styles.receiptAddressLine}>{homeAddressLines.join(', ')}</Text>}
                    {addr.building_detail ? <Text style={styles.receiptAddressLine}>{addr.building_detail}</Text> : null}
                  </>
                )}
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
                    {item.variant_display ? <Text style={styles.receiptItemVendor}>{item.variant_display}</Text> : null}
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
              {Number(displayOrder.discount_details?.coupon?.amount) > 0 && (
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Coupon {displayOrder.discount_details.coupon.code}:</Text>
                  <Text style={styles.receiptValue}>-{formatPrice(displayOrder.discount_details.coupon.amount)}</Text>
                </View>
              )}
              {Number(displayOrder.discount_details?.welcome_gift?.amount) > 0 && (
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Welcome gift:</Text>
                  <Text style={styles.receiptValue}>-{formatPrice(displayOrder.discount_details.welcome_gift.amount)}</Text>
                </View>
              )}
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Shipping:</Text>
                <Text style={styles.receiptValue}>
                  {shippingBeforeCoupon > 0 ? formatPrice(shippingBeforeCoupon) : 'FREE'}
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

        {renderRefundCard()}
        {renderParcelsCard()}
        {renderCodeCard()}

        {/* Real Delivery Tracking — only shown when a real Shipment exists */}
        <DeliveryTrackingCard />

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
                {item.variant_display ? <Text style={styles.itemVendor}>{item.variant_display}</Text> : null}
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
            <Text style={styles.cardTitle}>📍 {isPickupOrder ? 'Pickup Station' : 'Delivery Address'}</Text>
            <View style={styles.addressBlock}>
              {isPickupOrder ? (
                <>
                  <Text style={styles.addressName}>{addr.pickup_point_name || 'Pickup station'}</Text>
                  {addr.phone ? <Text style={styles.addressLine}>{addr.phone}</Text> : null}
                </>
              ) : (
                <>
                  {addr.full_name ? <Text style={styles.addressName}>{addr.full_name}</Text> : null}
                  {addr.phone ? <Text style={styles.addressLine}>{addr.phone}</Text> : null}
                  {homeAddressLines.length > 0 && <Text style={styles.addressLine}>{homeAddressLines.join(', ')}</Text>}
                  {addr.building_detail ? <Text style={styles.addressLine}>{addr.building_detail}</Text> : null}
                </>
              )}
            </View>
          </View>
        )}

        {/* Price Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💰 Price Summary</Text>
          {[
            ['Subtotal', formatPrice(displayOrder.subtotal)],
            ...(Number(displayOrder.discount_details?.coupon?.amount) > 0
              ? [[`Coupon ${displayOrder.discount_details.coupon.code}`, `-${formatPrice(displayOrder.discount_details.coupon.amount)}`]]
              : []),
            ...(Number(displayOrder.discount_details?.welcome_gift?.amount) > 0
              ? [['🎁 Welcome gift', `-${formatPrice(displayOrder.discount_details.welcome_gift.amount)}`]]
              : []),
            ['Shipping', shippingBeforeCoupon > 0 ? formatPrice(shippingBeforeCoupon) : '🎉 FREE'],
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

  // Real Delivery Tracking card
  trackingHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm },
  trackingCompany: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  trackingNum: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  trackingStatusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: SPACING.sm, paddingVertical: 5, borderRadius: RADIUS.full },
  trackingStatusIcon: { fontSize: 12 },
  trackingStatusText: { fontSize: FONTS.xs, fontWeight: FONTS.bold },
  trackingEta: { fontSize: FONTS.xs, color: COLORS.textMuted, marginBottom: SPACING.sm },
  timeline: { marginTop: SPACING.sm, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.divider },
  timelineRow: { flexDirection: 'row', gap: SPACING.sm },
  timelineDotCol: { alignItems: 'center', width: 28 },
  timelineDot: { width: 26, height: 26, borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.border },
  timelineDotLatest: { backgroundColor: COLORS.primaryFade, borderColor: COLORS.primary },
  timelineDotIcon: { fontSize: 12 },
  timelineLine: { width: 2, flex: 1, minHeight: 16, backgroundColor: COLORS.border, marginTop: 2 },
  timelineTextCol: { flex: 1, paddingBottom: SPACING.sm },
  timelineLabel: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  timelineLabelLatest: { color: COLORS.textPrimary, fontWeight: FONTS.bold },
  timelineTime: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },

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
  // Delivery code card
  codeCard: { borderWidth: 1.5, borderColor: COLORS.primary },
  codeHow: { fontSize: FONTS.sm, color: COLORS.textSecondary, lineHeight: 20, marginBottom: SPACING.sm },
  codeDigits: { fontSize: 36, fontWeight: FONTS.black, color: COLORS.primary, letterSpacing: 6, textAlign: 'center', marginVertical: SPACING.sm },
  codeHint: { fontSize: FONTS.xs, color: COLORS.textMuted, textAlign: 'center', lineHeight: 17 },
  codeError: { fontSize: FONTS.sm, color: COLORS.danger, marginBottom: SPACING.sm },
  codeBtn: { marginTop: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, paddingVertical: SPACING.sm + 2, alignItems: 'center' },
  codeBtnText: { color: COLORS.textWhite, fontSize: FONTS.base, fontWeight: FONTS.bold },
  // Refund card
  refundRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs },
  refundAmount: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  refundPill: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full },
  refundPillText: { fontSize: FONTS.xs, fontWeight: FONTS.semiBold },
  refundMessage: { fontSize: FONTS.sm, color: COLORS.textSecondary, lineHeight: 20 },
  // Parcels card (one box per parcel)
  parcelTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  parcelTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  parcelRefresh: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.primary },
  parcelNote: { fontSize: FONTS.sm, color: COLORS.textSecondary, lineHeight: 20, marginBottom: SPACING.sm },
  parcelBox: { backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  parcelHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  parcelHeadText: { flex: 1, paddingRight: SPACING.sm },
  parcelSeller: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  parcelItems: { fontSize: FONTS.sm, color: COLORS.textSecondary, lineHeight: 19, marginTop: 2 },
  parcelPill: { paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.full, maxWidth: '45%' },
  parcelPillText: { fontSize: FONTS.xs, fontWeight: FONTS.semiBold },
  stageRow: { flexDirection: 'row', marginTop: SPACING.sm },
  stageCol: { flex: 1, paddingRight: 4 },
  stageBar: { height: 4, borderRadius: 2, backgroundColor: COLORS.border },
  stageBarOn: { backgroundColor: COLORS.primary },
  stageName: { fontSize: 10, color: COLORS.textMuted, marginTop: 3 },
  stageNameOn: { color: COLORS.textPrimary, fontWeight: FONTS.semiBold },
  parcelHint: { fontSize: FONTS.sm, color: COLORS.textSecondary, lineHeight: 20, marginTop: SPACING.sm },
  parcelCode: { marginTop: SPACING.sm, padding: SPACING.base, borderRadius: RADIUS.lg, backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.primary },
  parcelSteps: { marginTop: SPACING.sm },
  parcelStepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  parcelDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border, marginTop: 5, marginRight: SPACING.sm },
  parcelDotNew: { backgroundColor: COLORS.primary },
  parcelStepText: { flex: 1 },
  parcelStepLabel: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  parcelStepLabelNew: { color: COLORS.textPrimary, fontWeight: FONTS.semiBold },
  parcelStepTime: { fontSize: FONTS.xs, color: COLORS.textMuted },
  parcelWaybill: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: SPACING.xs },
  pointBox: { marginTop: SPACING.sm, padding: SPACING.md, borderRadius: RADIUS.lg, backgroundColor: COLORS.surfaceSunken },
  pointName: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  pointLine: { fontSize: FONTS.sm, color: COLORS.textSecondary, lineHeight: 19, marginTop: 2 },
  pointCall: { alignSelf: 'flex-start', marginTop: SPACING.sm, paddingVertical: 4 },
  pointCallText: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.primary },
});