/**
 * VUMA Store — Checkout Screen
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Platform, Alert,
  TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectCartItems, selectCartTotal, selectCartSubtotal,
  selectCartShipping, selectIsFreeShipping,
  selectCartItemCount, clearCartAndSave,
} from '../../store/cartSlice';
import {
  createOrder, fetchAddresses, createAddress,
  selectAddresses, selectOrdersLoading, selectOrdersErrors,
  selectCreatedOrder, clearCreatedOrder, clearOrderError,
} from '../../store/orderSlice';
import {
  COLORS, FONTS, SPACING, RADIUS, SHADOWS, PAYMENT_METHODS,
} from '../../utils/constants';
import {
  formatPrice, getEffectivePrice, validatePhone,
} from '../../utils/helpers';
import { t } from '../../i18n';
import Button from '../../components/common/Button';
import { OverlayLoading } from '../../components/common/Loading';

export default function CheckoutScreen({ navigation }) {
  const dispatch = useDispatch();
  const cartItems = useSelector(selectCartItems);
  const total = useSelector(selectCartTotal);
  const subtotal = useSelector(selectCartSubtotal);
  const shipping = useSelector(selectCartShipping);
  const isFreeShipping = useSelector(selectIsFreeShipping);
  const itemCount = useSelector(selectCartItemCount);
  const addresses = useSelector(selectAddresses);
  const loading = useSelector(selectOrdersLoading);
  const errors = useSelector(selectOrdersErrors);
  const createdOrder = useSelector(selectCreatedOrder);

  const [step, setStep] = useState(1);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState('card');
  const [notes, setNotes] = useState('');
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    full_name: '', phone: '', address_line1: '',
    address_line2: '', city: '', state: '',
    postal_code: '', country: 'Korea', is_default: false,
  });
  const [addressErrors, setAddressErrors] = useState({});
  const [addressLoading, setAddressLoading] = useState(false);

  useEffect(() => { dispatch(fetchAddresses()); }, []);

  useEffect(() => {
    if (addresses.length > 0 && !selectedAddress) {
      setSelectedAddress(
        addresses.find((a) => a.is_default) || addresses[0]
      );
    }
  }, [addresses]);

  useEffect(() => {
    if (createdOrder) {
      dispatch(clearCartAndSave());
      dispatch(clearCreatedOrder());
      navigation.replace('OrderDetail', {
        orderId: createdOrder.id, order: createdOrder,
      });
    }
  }, [createdOrder]);

  const validateAddress = () => {
    const errs = {};
    if (!newAddress.full_name.trim()) errs.full_name = 'Required.';
    const phoneErr = validatePhone(newAddress.phone);
    if (phoneErr) errs.phone = phoneErr;
    if (!newAddress.address_line1.trim()) errs.address_line1 = 'Required.';
    if (!newAddress.city.trim()) errs.city = 'Required.';
    setAddressErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveAddress = async () => {
    if (!validateAddress()) return;
    setAddressLoading(true);
    try {
      const result = await dispatch(createAddress(newAddress));
      if (createAddress.fulfilled.match(result)) {
        setSelectedAddress(result.payload);
        setShowAddAddress(false);
        setNewAddress({
          full_name: '', phone: '', address_line1: '',
          address_line2: '', city: '', state: '',
          postal_code: '', country: 'Korea', is_default: false,
        });
      }
    } finally {
      setAddressLoading(false);
    }
  };

  const handleNextStep = () => {
    if (step === 1 && !selectedAddress) {
      Alert.alert(t('checkout.deliveryAddress'),
        t('checkout.selectAddress'));
      return;
    }
    setStep((s) => Math.min(s + 1, 3));
  };

  const handlePlaceOrder = () => {
    if (!selectedAddress) {
      Alert.alert(t('checkout.deliveryAddress'),
        t('checkout.selectAddress'));
      return;
    }
    Alert.alert(
      t('checkout.confirmOrder'),
      `${t('checkout.placeOrder')} ${formatPrice(total)}?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('checkout.placeOrder'),
          onPress: () => {
            dispatch(createOrder({
              items: cartItems.map((item) => ({
                product_id: item.product.id,
                quantity: item.quantity,
              })),
              shipping_address: {
                full_name: selectedAddress.full_name,
                phone: selectedAddress.phone,
                address_line1: selectedAddress.address_line1,
                address_line2: selectedAddress.address_line2 || '',
                city: selectedAddress.city,
                state: selectedAddress.state || '',
                postal_code: selectedAddress.postal_code || '',
                country: selectedAddress.country,
              },
              payment_method: selectedPayment,
              notes: notes.trim(),
              currency: 'KRW',
            }));
          },
        },
      ]
    );
  };

  const StepIndicator = () => (
    <View style={styles.steps}>
      {[
        t('checkout.deliveryAddress').split(' ')[0],
        t('checkout.paymentMethod').split(' ')[0],
        t('common.save'),
      ].map((label, index) => {
        const stepNum = index + 1;
        const isActive = step === stepNum;
        const isDone = step > stepNum;
        return (
          <React.Fragment key={label}>
            <TouchableOpacity
              style={styles.stepItem}
              onPress={() => step > stepNum && setStep(stepNum)}
            >
              <View style={[styles.stepCircle,
                isActive && styles.stepCircleActive,
                isDone && styles.stepCircleDone]}>
                <Text style={[styles.stepNum,
                  (isActive || isDone) && styles.stepNumActive]}>
                  {isDone ? '✓' : stepNum}
                </Text>
              </View>
              <Text style={[styles.stepLabel,
                isActive && styles.stepLabelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
            {index < 2 && (
              <View style={[styles.stepLine,
                isDone && styles.stepLineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );

  const AddressCard = ({ address }) => (
    <TouchableOpacity
      style={[styles.addressCard,
        selectedAddress?.id === address.id && styles.addressCardActive]}
      onPress={() => setSelectedAddress(address)}
    >
      <View style={styles.addressRadio}>
        <View style={[styles.radioOuter,
          selectedAddress?.id === address.id && styles.radioOuterActive]}>
          {selectedAddress?.id === address.id && (
            <View style={styles.radioInner} />
          )}
        </View>
      </View>
      <View style={styles.addressInfo}>
        <Text style={styles.addressName}>{address.full_name}</Text>
        <Text style={styles.addressPhone}>{address.phone}</Text>
        <Text style={styles.addressText}>
          {address.address_line1}
          {address.address_line2 ? `, ${address.address_line2}` : ''}
        </Text>
        <Text style={styles.addressText}>
          {address.city}{address.state ? `, ${address.state}` : ''},{' '}
          {address.country}
        </Text>
        {address.is_default && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultBadgeText}>✓ Default</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const PaymentMethodCard = ({ method }) => (
    <TouchableOpacity
      style={[styles.paymentCard,
        selectedPayment === method.id && styles.paymentCardActive]}
      onPress={() => setSelectedPayment(method.id)}
    >
      <Text style={styles.paymentIcon}>{method.icon}</Text>
      <Text style={[styles.paymentLabel,
        selectedPayment === method.id && styles.paymentLabelActive]}>
        {method.label}
      </Text>
      {selectedPayment === method.id && (
        <Text style={styles.paymentCheck}>✓</Text>
      )}
    </TouchableOpacity>
  );

  const AddAddressModal = () => (
    <Modal visible={showAddAddress} animationType="slide"
      transparent onRequestClose={() => setShowAddAddress(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              📍 {t('checkout.deliveryAddress')}
            </Text>
            <TouchableOpacity
              onPress={() => setShowAddAddress(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {[
              { key: 'full_name', label: 'Full Name *',
                placeholder: 'John Doe' },
              { key: 'phone', label: 'Phone *',
                placeholder: '+82 10-xxxx-xxxx',
                keyboardType: 'phone-pad' },
              { key: 'address_line1', label: 'Address *',
                placeholder: '123 Main St' },
              { key: 'address_line2', label: 'Address Line 2',
                placeholder: 'Apt (optional)' },
              { key: 'city', label: 'City *',
                placeholder: 'Seoul' },
              { key: 'state', label: 'State',
                placeholder: 'Gyeonggi' },
              { key: 'postal_code', label: 'Postal Code',
                placeholder: '12345', keyboardType: 'numeric' },
              { key: 'country', label: 'Country *',
                placeholder: 'Korea' },
            ].map((field) => (
              <View key={field.key}>
                <Text style={styles.inputLabel}>{field.label}</Text>
                <TextInput
                  style={[styles.modalInput,
                    addressErrors[field.key] && styles.modalInputError]}
                  value={newAddress[field.key]}
                  onChangeText={(v) => {
                    setNewAddress((p) => ({ ...p, [field.key]: v }));
                    setAddressErrors((p) => ({ ...p, [field.key]: null }));
                  }}
                  placeholder={field.placeholder}
                  keyboardType={field.keyboardType || 'default'}
                  placeholderTextColor={COLORS.textLight}
                />
                {addressErrors[field.key] && (
                  <Text style={styles.fieldError}>
                    ⚠️ {addressErrors[field.key]}
                  </Text>
                )}
              </View>
            ))}
            <TouchableOpacity
              style={styles.defaultRow}
              onPress={() => setNewAddress((p) => ({
                ...p, is_default: !p.is_default,
              }))}
            >
              <View style={[styles.checkbox,
                newAddress.is_default && styles.checkboxActive]}>
                {newAddress.is_default && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
              <Text style={styles.defaultText}>
                Set as default address
              </Text>
            </TouchableOpacity>
          </ScrollView>
          <Button
            title={t('common.save')}
            onPress={handleSaveAddress}
            loading={addressLoading}
            fullWidth
            style={styles.modalBtn}
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content"
        backgroundColor={COLORS.surface} />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => step === 1
            ? navigation.goBack() : setStep((s) => s - 1)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('checkout.checkout')}
        </Text>
        <Text style={styles.headerItems}>
          {itemCount} items
        </Text>
      </View>

      <StepIndicator />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step 1 — Address */}
        {step === 1 && (
          <View>
            <Text style={styles.sectionTitle}>
              {t('checkout.deliveryAddress')}
            </Text>
            {loading.addresses ? (
              <ActivityIndicator color={COLORS.primary}
                style={{ padding: SPACING.xl }} />
            ) : (
              addresses.map((address) => (
                <AddressCard key={address.id} address={address} />
              ))
            )}
            <TouchableOpacity
              style={styles.addAddressBtn}
              onPress={() => setShowAddAddress(true)}
            >
              <Text style={styles.addAddressIcon}>+</Text>
              <Text style={styles.addAddressText}>
                Add New Address
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2 — Payment */}
        {step === 2 && (
          <View>
            <Text style={styles.sectionTitle}>
              {t('checkout.paymentMethod')}
            </Text>
            {PAYMENT_METHODS.map((method) => (
              <PaymentMethodCard key={method.id} method={method} />
            ))}
            <View style={styles.cardNote}>
              <Text style={styles.cardNoteText}>
                🔒 {t('checkout.securePayment')}
              </Text>
            </View>
          </View>
        )}

        {/* Step 3 — Review */}
        {step === 3 && (
          <View>
            <Text style={styles.sectionTitle}>
              {t('checkout.orderReview')}
            </Text>
            <View style={styles.reviewCard}>
              <Text style={styles.reviewCardTitle}>
                📍 {t('checkout.deliveryAddress')}
              </Text>
              {selectedAddress && (
                <View>
                  <Text style={styles.reviewName}>
                    {selectedAddress.full_name}
                  </Text>
                  <Text style={styles.reviewDetail}>
                    {selectedAddress.phone}
                  </Text>
                  <Text style={styles.reviewDetail}>
                    {selectedAddress.address_line1},{' '}
                    {selectedAddress.city},{' '}
                    {selectedAddress.country}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.reviewCard}>
              <Text style={styles.reviewCardTitle}>
                💳 {t('checkout.paymentMethod')}
              </Text>
              <Text style={styles.reviewDetail}>
                {PAYMENT_METHODS.find(
                  (m) => m.id === selectedPayment
                )?.label}
              </Text>
            </View>
            <View style={styles.reviewCard}>
              <Text style={styles.reviewCardTitle}>
                📦 Items ({itemCount})
              </Text>
              {cartItems.map((item) => (
                <View key={item.id} style={styles.orderItemRow}>
                  <Text style={styles.orderItemName} numberOfLines={1}>
                    {item.product.name}
                  </Text>
                  <Text style={styles.orderItemQty}>
                    × {item.quantity}
                  </Text>
                  <Text style={styles.orderItemTotal}>
                    {formatPrice(
                      getEffectivePrice(item.product) * item.quantity
                    )}
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.reviewCard}>
              <Text style={styles.reviewCardTitle}>
                📝 {t('checkout.orderNotes')}
              </Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder={t('checkout.notesPlaceholder')}
                multiline
                numberOfLines={3}
                placeholderTextColor={COLORS.textLight}
              />
            </View>
            <View style={styles.reviewCard}>
              <Text style={styles.reviewCardTitle}>
                💰 {t('cart.orderSummary')}
              </Text>
              {[
                [t('cart.subtotal'), formatPrice(subtotal)],
                [t('cart.shipping'), isFreeShipping
                  ? t('cart.free') : formatPrice(shipping)],
              ].map(([label, value]) => (
                <View key={label} style={styles.priceRow}>
                  <Text style={styles.priceLabel}>{label}</Text>
                  <Text style={[styles.priceValue,
                    value === t('cart.free') && styles.freeShipText]}>
                    {value}
                  </Text>
                </View>
              ))}
              <View style={styles.priceDivider} />
              <View style={styles.priceRow}>
                <Text style={styles.totalLabel}>
                  {t('cart.total')}
                </Text>
                <Text style={styles.totalValue}>
                  {formatPrice(total)}
                </Text>
              </View>
            </View>
            {errors.create && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>
                  ⚠️ {typeof errors.create === 'string'
                    ? errors.create : 'Order failed.'}
                </Text>
                <TouchableOpacity
                  onPress={() => dispatch(clearOrderError('create'))}>
                  <Text style={styles.errorDismiss}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.bottomTotal}>
          <Text style={styles.bottomTotalLabel}>
            {t('cart.total')}
          </Text>
          <Text style={styles.bottomTotalValue}>
            {formatPrice(total)}
          </Text>
        </View>
        {step < 3 ? (
          <Button
            title={`${t('common.continue')} →`}
            onPress={handleNextStep}
            style={styles.bottomBtn}
            size="lg"
          />
        ) : (
          <Button
            title={t('checkout.placeOrder')}
            onPress={handlePlaceOrder}
            loading={loading.create}
            disabled={loading.create}
            style={styles.bottomBtn}
            size="lg"
          />
        )}
      </View>

      <AddAddressModal />
      <OverlayLoading
        visible={loading.create}
        message={t('common.loading')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SPACING.base, paddingBottom: SPACING['2xl'] },
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
  headerItems: { fontSize: FONTS.sm, color: COLORS.textMuted },
  steps: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.base,
    borderBottomWidth: 1, borderBottomColor: COLORS.divider,
  },
  stepItem: { alignItems: 'center', gap: SPACING.xs },
  stepCircle: {
    width: 28, height: 28, borderRadius: RADIUS.full,
    backgroundColor: COLORS.skeleton,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.border,
  },
  stepCircleActive: {
    backgroundColor: COLORS.primaryFade, borderColor: COLORS.primary,
  },
  stepCircleDone: {
    backgroundColor: COLORS.primary, borderColor: COLORS.primaryDark,
  },
  stepNum: {
    fontSize: FONTS.xs, fontWeight: FONTS.bold, color: COLORS.textMuted,
  },
  stepNumActive: { color: COLORS.primary },
  stepLabel: {
    fontSize: FONTS.xs, color: COLORS.textMuted, fontWeight: FONTS.medium,
  },
  stepLabelActive: { color: COLORS.primary, fontWeight: FONTS.bold },
  stepLine: {
    flex: 1, height: 2, backgroundColor: COLORS.border,
    marginBottom: SPACING.lg, marginHorizontal: SPACING.xs,
  },
  stepLineDone: { backgroundColor: COLORS.primary },
  sectionTitle: {
    fontSize: FONTS.lg, fontWeight: FONTS.bold,
    color: COLORS.textPrimary, marginBottom: SPACING.base,
  },
  addressCard: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl, padding: SPACING.base,
    marginBottom: SPACING.sm, borderWidth: 2,
    borderColor: 'transparent', ...SHADOWS.sm,
  },
  addressCardActive: {
    borderColor: COLORS.primary, backgroundColor: COLORS.primaryFade,
  },
  addressRadio: { paddingTop: 2, marginRight: SPACING.sm },
  radioOuter: {
    width: 20, height: 20, borderRadius: RADIUS.full,
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterActive: { borderColor: COLORS.primary },
  radioInner: {
    width: 10, height: 10, borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
  },
  addressInfo: { flex: 1, gap: 2 },
  addressName: {
    fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary,
  },
  addressPhone: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  addressText: {
    fontSize: FONTS.sm, color: COLORS.textMuted, lineHeight: 18,
  },
  defaultBadge: {
    alignSelf: 'flex-start', marginTop: 4,
    backgroundColor: COLORS.successLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm, paddingVertical: 2,
  },
  defaultBadgeText: {
    fontSize: FONTS.xs, color: COLORS.successText, fontWeight: FONTS.semiBold,
  },
  addAddressBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    padding: SPACING.base, borderWidth: 2,
    borderColor: COLORS.border, borderStyle: 'dashed',
    marginBottom: SPACING.sm,
  },
  addAddressIcon: {
    fontSize: FONTS.xl, color: COLORS.primary, fontWeight: FONTS.bold,
  },
  addAddressText: {
    fontSize: FONTS.base, color: COLORS.primary, fontWeight: FONTS.semiBold,
  },
  paymentCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.base,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    padding: SPACING.base, marginBottom: SPACING.sm,
    borderWidth: 2, borderColor: 'transparent', ...SHADOWS.sm,
  },
  paymentCardActive: {
    borderColor: COLORS.primary, backgroundColor: COLORS.primaryFade,
  },
  paymentIcon: { fontSize: 24 },
  paymentLabel: {
    flex: 1, fontSize: FONTS.base,
    fontWeight: FONTS.semiBold, color: COLORS.textSecondary,
  },
  paymentLabelActive: { color: COLORS.primary, fontWeight: FONTS.bold },
  paymentCheck: {
    fontSize: FONTS.lg, color: COLORS.primary, fontWeight: FONTS.bold,
  },
  cardNote: {
    backgroundColor: COLORS.infoLight,
    borderRadius: RADIUS.lg, padding: SPACING.sm, marginTop: SPACING.xs,
  },
  cardNoteText: {
    fontSize: FONTS.sm, color: COLORS.infoText, lineHeight: 20,
  },
  reviewCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    padding: SPACING.base, marginBottom: SPACING.sm, ...SHADOWS.sm,
  },
  reviewCardTitle: {
    fontSize: FONTS.base, fontWeight: FONTS.bold,
    color: COLORS.textPrimary, marginBottom: SPACING.sm,
  },
  reviewName: {
    fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary,
  },
  reviewDetail: {
    fontSize: FONTS.sm, color: COLORS.textSecondary, lineHeight: 20,
  },
  orderItemRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: SPACING.sm, borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight, gap: SPACING.sm,
  },
  orderItemName: {
    flex: 1, fontSize: FONTS.sm, color: COLORS.textSecondary,
  },
  orderItemQty: { fontSize: FONTS.sm, color: COLORS.textMuted },
  orderItemTotal: {
    fontSize: FONTS.sm, fontWeight: FONTS.bold,
    color: COLORS.textPrimary, minWidth: 72, textAlign: 'right',
  },
  notesInput: {
    backgroundColor: COLORS.surfaceAlt, borderWidth: 1.5,
    borderColor: COLORS.border, borderRadius: RADIUS.lg,
    padding: SPACING.sm, fontSize: FONTS.sm,
    color: COLORS.textPrimary, minHeight: 80,
    textAlignVertical: 'top',
  },
  priceRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  priceLabel: { fontSize: FONTS.base, color: COLORS.textSecondary },
  priceValue: {
    fontSize: FONTS.base, fontWeight: FONTS.semiBold, color: COLORS.textPrimary,
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
  errorBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.dangerLight, borderRadius: RADIUS.lg,
    padding: SPACING.base, marginBottom: SPACING.sm, gap: SPACING.sm,
  },
  errorText: {
    flex: 1, fontSize: FONTS.sm,
    color: COLORS.dangerText, fontWeight: FONTS.medium,
  },
  errorDismiss: {
    fontSize: FONTS.base, color: COLORS.danger, fontWeight: FONTS.bold,
  },
  bottomBar: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.base,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm,
    paddingBottom: Platform.OS === 'ios' ? SPACING.xl : SPACING.base,
    borderTopWidth: 1, borderTopColor: COLORS.divider, ...SHADOWS.md,
  },
  bottomTotal: { flex: 1 },
  bottomTotalLabel: { fontSize: FONTS.xs, color: COLORS.textMuted },
  bottomTotalValue: {
    fontSize: FONTS.xl, fontWeight: FONTS.black, color: COLORS.primary,
  },
  bottomBtn: { flex: 2 },
  modalOverlay: {
    flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: SPACING.xl,
  },
  modalTitle: {
    fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textPrimary,
  },
  modalClose: {
    fontSize: FONTS.xl, color: COLORS.textMuted, fontWeight: FONTS.bold,
  },
  inputLabel: {
    fontSize: FONTS.sm, fontWeight: FONTS.semiBold,
    color: COLORS.textSecondary, marginBottom: SPACING.xs,
  },
  modalInput: {
    backgroundColor: COLORS.surfaceAlt, borderWidth: 1.5,
    borderColor: COLORS.border, borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 2,
    fontSize: FONTS.base, color: COLORS.textPrimary, marginBottom: SPACING.sm,
  },
  modalInputError: {
    borderColor: COLORS.danger, backgroundColor: COLORS.dangerLight,
  },
  fieldError: {
    fontSize: FONTS.xs, color: COLORS.danger,
    marginTop: -SPACING.xs, marginBottom: SPACING.sm,
  },
  defaultRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: SPACING.sm, marginVertical: SPACING.base,
  },
  checkbox: {
    width: 20, height: 20, borderWidth: 2,
    borderColor: COLORS.border, borderRadius: RADIUS.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: COLORS.primary, borderColor: COLORS.primary,
  },
  checkmark: {
    color: COLORS.textWhite, fontSize: FONTS.xs, fontWeight: FONTS.bold,
  },
  defaultText: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  modalBtn: { marginTop: SPACING.sm },
});