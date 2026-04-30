/**
 * VUMA Store — Checkout Screen
 * Card + Wallet + M-Pesa + Airtel Money + Halopesa
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
  COLORS, FONTS, SPACING, RADIUS, SHADOWS,
} from '../../utils/constants';
import {
  formatPrice, getEffectivePrice, validatePhone,
} from '../../utils/helpers';
import { useTranslation } from '../../i18n';
import Button from '../../components/common/Button';
import { OverlayLoading } from '../../components/common/Loading';

// ── Payment Options ───────────────────────────────────
const CARD_WALLET = [
  {
    id: 'card',
    label: 'Credit / Debit Card',
    icon: '💳',
    color: COLORS.secondary,
    lightColor: COLORS.primaryFade,
  },
  {
    id: 'wallet',
    label: 'VUMA Wallet',
    icon: '💰',
    color: COLORS.primary,
    lightColor: COLORS.primaryFade,
  },
];

const MOBILE_MONEY_PROVIDERS = [
  {
    id: 'mpesa',
    label: 'M-Pesa',
    icon: '📱',
    color: '#00A651',
    lightColor: '#E8F8EF',
    countries: 'Tanzania · Kenya',
    placeholder: '+255 7XX XXX XXX or +254 7XX',
  },
  {
    id: 'airtel',
    label: 'Airtel Money',
    icon: '📱',
    color: '#E2231A',
    lightColor: '#FDECEA',
    countries: 'Tanzania · Rwanda · Uganda',
    placeholder: '+255 6XX / +250 7XX / +256 7XX',
  },
  {
    id: 'halopesa',
    label: 'Halopesa',
    icon: '📱',
    color: '#F7941D',
    lightColor: '#FEF3E7',
    countries: 'Tanzania',
    placeholder: '+255 6XX XXX XXX',
  },
];

const ALL_PAYMENT_METHODS = [
  ...CARD_WALLET,
  ...MOBILE_MONEY_PROVIDERS,
];

const isMobileMoney = (id) =>
  ['mpesa', 'airtel', 'halopesa'].includes(id);

export default function CheckoutScreen({ navigation }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  // ── Redux ─────────────────────────────────────────
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

  // ── Local State ───────────────────────────────────
  const [step, setStep] = useState(1);
  const [selectedAddress, setSelectedAddress] =
    useState(null);
  const [selectedPayment, setSelectedPayment] =
    useState('card');
  const [mobilePhone, setMobilePhone] = useState('');
  const [notes, setNotes] = useState('');
  const [showAddAddress, setShowAddAddress] =
    useState(false);
  const [newAddress, setNewAddress] = useState({
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Korea',
    is_default: false,
  });
  const [addressErrors, setAddressErrors] = useState({});
  const [addressLoading, setAddressLoading] =
    useState(false);

  // ── Effects ───────────────────────────────────────
  useEffect(() => {
    dispatch(fetchAddresses());
  }, []);

  useEffect(() => {
    if (addresses.length > 0 && !selectedAddress) {
      setSelectedAddress(
        addresses.find((a) => a.is_default) ||
          addresses[0]
      );
    }
  }, [addresses]);

  useEffect(() => {
    if (createdOrder) {
      dispatch(clearCartAndSave());
      dispatch(clearCreatedOrder());
      navigation.replace('OrderDetail', {
        orderId: createdOrder.id,
        order: createdOrder,
      });
    }
  }, [createdOrder]);

  // ── Address Validation ────────────────────────────
  const validateAddress = () => {
    const errs = {};
    if (!newAddress.full_name.trim())
      errs.full_name = 'Required.';
    const phoneErr = validatePhone(newAddress.phone);
    if (phoneErr) errs.phone = phoneErr;
    if (!newAddress.address_line1.trim())
      errs.address_line1 = 'Required.';
    if (!newAddress.city.trim())
      errs.city = 'Required.';
    setAddressErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveAddress = async () => {
    if (!validateAddress()) return;
    setAddressLoading(true);
    try {
      const result = await dispatch(
        createAddress(newAddress)
      );
      if (createAddress.fulfilled.match(result)) {
        setSelectedAddress(result.payload);
        setShowAddAddress(false);
        setNewAddress({
          full_name: '',
          phone: '',
          address_line1: '',
          address_line2: '',
          city: '',
          state: '',
          postal_code: '',
          country: 'Korea',
          is_default: false,
        });
      }
    } finally {
      setAddressLoading(false);
    }
  };

  // ── Step Navigation ───────────────────────────────
  const handleNextStep = () => {
    if (step === 1 && !selectedAddress) {
      Alert.alert(
        t('checkout.deliveryAddress'),
        'Please select or add a delivery address.'
      );
      return;
    }
    if (step === 2 && isMobileMoney(selectedPayment)) {
      if (!mobilePhone.trim()) {
        Alert.alert(
          'Phone Required',
          'Please enter your mobile money phone number.'
        );
        return;
      }
    }
    setStep((s) => Math.min(s + 1, 3));
  };

  // ── Place Order ───────────────────────────────────
  const handlePlaceOrder = () => {
    if (!selectedAddress) {
      Alert.alert(
        'Address Required',
        'Please select a delivery address.'
      );
      return;
    }

    // ── Mobile Money → go to MobileMoneyScreen ──
    if (isMobileMoney(selectedPayment)) {
      if (!mobilePhone.trim()) {
        Alert.alert(
          'Phone Required',
          'Enter your mobile money phone number.'
        );
        return;
      }
      navigation.navigate('MobileMoney', {
        provider: selectedPayment,
        amount: total,
        orderId: null,
        currency: 'TZS',
        phone: mobilePhone,
      });
      return;
    }

    // ── Card / Wallet → create order directly ──
    Alert.alert(
      t('checkout.confirmOrder'),
      `Place order for ${formatPrice(total)}?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('checkout.placeOrder'),
          onPress: () => {
            dispatch(
              createOrder({
                items: cartItems.map((item) => ({
                  product_id: item.product.id,
                  quantity: item.quantity,
                })),
                shipping_address: { ...selectedAddress },
                payment_method: selectedPayment,
                notes: notes.trim(),
                currency: 'KRW',
              })
            );
          },
        },
      ]
    );
  };

  // ── Get selected payment info ─────────────────────
  const selectedPaymentInfo = ALL_PAYMENT_METHODS.find(
    (m) => m.id === selectedPayment
  );

  // ══════════════════════════════════════════════════
  // SUB COMPONENTS
  // ══════════════════════════════════════════════════

  const StepIndicator = () => (
    <View style={styles.steps}>
      {['Address', 'Payment', 'Review'].map(
        (label, index) => {
          const stepNum = index + 1;
          const isActive = step === stepNum;
          const isDone = step > stepNum;
          return (
            <React.Fragment key={label}>
              <TouchableOpacity
                style={styles.stepItem}
                onPress={() =>
                  step > stepNum && setStep(stepNum)
                }
              >
                <View
                  style={[
                    styles.stepCircle,
                    isActive && styles.stepCircleActive,
                    isDone && styles.stepCircleDone,
                  ]}
                >
                  <Text
                    style={[
                      styles.stepNum,
                      (isActive || isDone) &&
                        styles.stepNumActive,
                    ]}
                  >
                    {isDone ? '✓' : stepNum}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    isActive && styles.stepLabelActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
              {index < 2 && (
                <View
                  style={[
                    styles.stepLine,
                    isDone && styles.stepLineDone,
                  ]}
                />
              )}
            </React.Fragment>
          );
        }
      )}
    </View>
  );

  const AddressCard = ({ address }) => (
    <TouchableOpacity
      style={[
        styles.addressCard,
        selectedAddress?.id === address.id &&
          styles.addressCardActive,
      ]}
      onPress={() => setSelectedAddress(address)}
    >
      <View style={styles.addressRadio}>
        <View
          style={[
            styles.radioOuter,
            selectedAddress?.id === address.id &&
              styles.radioOuterActive,
          ]}
        >
          {selectedAddress?.id === address.id && (
            <View style={styles.radioInner} />
          )}
        </View>
      </View>
      <View style={styles.addressInfo}>
        <Text style={styles.addressName}>
          {address.full_name}
        </Text>
        <Text style={styles.addressPhone}>
          {address.phone}
        </Text>
        <Text style={styles.addressText}>
          {address.address_line1}
          {address.address_line2
            ? `, ${address.address_line2}`
            : ''}
        </Text>
        <Text style={styles.addressText}>
          {address.city}
          {address.state ? `, ${address.state}` : ''},{' '}
          {address.country}
        </Text>
        {address.is_default && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultBadgeText}>
              ✓ Default
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const AddAddressModal = () => (
    <Modal
      visible={showAddAddress}
      animationType="slide"
      transparent
      onRequestClose={() => setShowAddAddress(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              📍 New Address
            </Text>
            <TouchableOpacity
              onPress={() => setShowAddAddress(false)}
            >
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
          >
            {[
              {
                key: 'full_name',
                label: 'Full Name *',
                placeholder: 'John Doe',
              },
              {
                key: 'phone',
                label: 'Phone *',
                placeholder: '+82 10-xxxx-xxxx',
                keyboardType: 'phone-pad',
              },
              {
                key: 'address_line1',
                label: 'Address *',
                placeholder: '123 Main St',
              },
              {
                key: 'address_line2',
                label: 'Address Line 2',
                placeholder: 'Apt (optional)',
              },
              {
                key: 'city',
                label: 'City *',
                placeholder: 'Seoul',
              },
              {
                key: 'state',
                label: 'State / Province',
                placeholder: 'Gyeonggi',
              },
              {
                key: 'postal_code',
                label: 'Postal Code',
                placeholder: '12345',
                keyboardType: 'numeric',
              },
              {
                key: 'country',
                label: 'Country *',
                placeholder: 'Korea',
              },
            ].map((field) => (
              <View key={field.key}>
                <Text style={styles.inputLabel}>
                  {field.label}
                </Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    addressErrors[field.key] &&
                      styles.modalInputError,
                  ]}
                  value={newAddress[field.key]}
                  onChangeText={(v) => {
                    setNewAddress((p) => ({
                      ...p,
                      [field.key]: v,
                    }));
                    setAddressErrors((p) => ({
                      ...p,
                      [field.key]: null,
                    }));
                  }}
                  placeholder={field.placeholder}
                  keyboardType={
                    field.keyboardType || 'default'
                  }
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
              onPress={() =>
                setNewAddress((p) => ({
                  ...p,
                  is_default: !p.is_default,
                }))
              }
            >
              <View
                style={[
                  styles.checkbox,
                  newAddress.is_default &&
                    styles.checkboxActive,
                ]}
              >
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

  // ══════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.surface}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() =>
            step === 1
              ? navigation.goBack()
              : setStep((s) => s - 1)
          }
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

      {/* Step Indicator */}
      <StepIndicator />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ══════════════════════════════════════════
            STEP 1 — DELIVERY ADDRESS
        ══════════════════════════════════════════ */}
        {step === 1 && (
          <View>
            <Text style={styles.sectionTitle}>
              📍 {t('checkout.deliveryAddress')}
            </Text>

            {loading.addresses ? (
              <ActivityIndicator
                color={COLORS.primary}
                style={{ padding: SPACING.xl }}
              />
            ) : addresses.length === 0 ? (
              <View style={styles.emptyAddress}>
                <Text style={styles.emptyAddressText}>
                  📍 No addresses saved yet.
                </Text>
                <Text style={styles.emptyAddressSub}>
                  Add your delivery address below.
                </Text>
              </View>
            ) : (
              addresses.map((address) => (
                <AddressCard
                  key={address.id}
                  address={address}
                />
              ))
            )}

            <TouchableOpacity
              style={styles.addAddressBtn}
              onPress={() => setShowAddAddress(true)}
            >
              <View style={styles.addAddressIconWrap}>
                <Text style={styles.addAddressIcon}>
                  +
                </Text>
              </View>
              <Text style={styles.addAddressText}>
                Add New Address
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ══════════════════════════════════════════
            STEP 2 — PAYMENT METHOD
        ══════════════════════════════════════════ */}
        {step === 2 && (
          <View>
            <Text style={styles.sectionTitle}>
              💳 {t('checkout.paymentMethod')}
            </Text>

            {/* Card & Wallet */}
            {CARD_WALLET.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentCard,
                  selectedPayment === method.id &&
                    styles.paymentCardActive,
                ]}
                onPress={() => {
                  setSelectedPayment(method.id);
                  setMobilePhone('');
                }}
              >
                <Text style={styles.paymentIcon}>
                  {method.icon}
                </Text>
                <Text
                  style={[
                    styles.paymentLabel,
                    selectedPayment === method.id &&
                      styles.paymentLabelActive,
                  ]}
                >
                  {method.label}
                </Text>
                {selectedPayment === method.id && (
                  <Text style={styles.paymentCheck}>
                    ✓
                  </Text>
                )}
              </TouchableOpacity>
            ))}

            {/* Secure note for card */}
            {selectedPayment === 'card' && (
              <View style={styles.cardNote}>
                <Text style={styles.cardNoteText}>
                  🔒 Secure payment via Stripe. Your
                  card details are never stored.
                </Text>
              </View>
            )}

            {/* Mobile Money Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>
                📱 MOBILE MONEY
              </Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Mobile Money Providers */}
            {MOBILE_MONEY_PROVIDERS.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentCard,
                  styles.mobileMoneyCard,
                  selectedPayment === method.id && {
                    borderColor: method.color,
                    backgroundColor: method.lightColor,
                  },
                ]}
                onPress={() => {
                  setSelectedPayment(method.id);
                  setMobilePhone('');
                }}
              >
                {/* Logo */}
                <View
                  style={[
                    styles.mobileMoneyLogo,
                    { backgroundColor: method.lightColor },
                  ]}
                >
                  <Text
                    style={[
                      styles.mobileMoneyLogoText,
                      { color: method.color },
                    ]}
                  >
                    {method.label[0]}
                  </Text>
                </View>

                {/* Info */}
                <View style={styles.mobileMoneyInfo}>
                  <Text
                    style={[
                      styles.mobileMoneyName,
                      selectedPayment === method.id && {
                        color: method.color,
                        fontWeight: FONTS.bold,
                      },
                    ]}
                  >
                    {method.label}
                  </Text>
                  <Text style={styles.mobileMoneyCountries}>
                    {method.countries}
                  </Text>
                </View>

                {/* Check */}
                {selectedPayment === method.id && (
                  <View
                    style={[
                      styles.mobileMoneyCheck,
                      { backgroundColor: method.color },
                    ]}
                  >
                    <Text style={styles.mobileMoneyCheckText}>
                      ✓
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}

            {/* Phone input when mobile money selected */}
            {isMobileMoney(selectedPayment) && (
              <View
                style={[
                  styles.mobilePhoneWrap,
                  {
                    borderColor:
                      selectedPaymentInfo?.color ||
                      COLORS.border,
                    backgroundColor:
                      selectedPaymentInfo?.lightColor ||
                      COLORS.surfaceAlt,
                  },
                ]}
              >
                <View style={styles.mobilePhoneLabelRow}>
                  <Text style={styles.mobilePhoneLabel}>
                    📱 Phone Number
                  </Text>
                  <Text
                    style={[
                      styles.mobilePhoneProvider,
                      {
                        color:
                          selectedPaymentInfo?.color,
                      },
                    ]}
                  >
                    {selectedPaymentInfo?.label}
                  </Text>
                </View>
                <TextInput
                  style={[
                    styles.mobilePhoneInput,
                    {
                      borderColor:
                        selectedPaymentInfo?.color ||
                        COLORS.border,
                    },
                  ]}
                  value={mobilePhone}
                  onChangeText={setMobilePhone}
                  placeholder={
                    selectedPaymentInfo?.placeholder ||
                    '+255 7XX XXX XXX'
                  }
                  keyboardType="phone-pad"
                  placeholderTextColor={COLORS.textLight}
                  autoFocus
                />
                <Text style={styles.mobilePhoneHint}>
                  💡 You will receive a PIN prompt on
                  this number to confirm payment
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ══════════════════════════════════════════
            STEP 3 — ORDER REVIEW
        ══════════════════════════════════════════ */}
        {step === 3 && (
          <View>
            <Text style={styles.sectionTitle}>
              📋 Order Review
            </Text>

            {/* Delivery Address */}
            <View style={styles.reviewCard}>
              <View style={styles.reviewCardHeader}>
                <Text style={styles.reviewCardTitle}>
                  📍 Delivery Address
                </Text>
                <TouchableOpacity
                  onPress={() => setStep(1)}
                >
                  <Text style={styles.reviewEdit}>
                    Edit
                  </Text>
                </TouchableOpacity>
              </View>
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

            {/* Payment Method */}
            <View style={styles.reviewCard}>
              <View style={styles.reviewCardHeader}>
                <Text style={styles.reviewCardTitle}>
                  💳 Payment Method
                </Text>
                <TouchableOpacity
                  onPress={() => setStep(2)}
                >
                  <Text style={styles.reviewEdit}>
                    Edit
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.reviewPaymentRow}>
                <Text style={styles.reviewPaymentIcon}>
                  {selectedPaymentInfo?.icon}
                </Text>
                <View>
                  <Text style={styles.reviewPaymentName}>
                    {selectedPaymentInfo?.label}
                  </Text>
                  {isMobileMoney(selectedPayment) &&
                    mobilePhone && (
                      <Text style={styles.reviewPaymentPhone}>
                        {mobilePhone}
                      </Text>
                    )}
                </View>
              </View>
            </View>

            {/* Items */}
            <View style={styles.reviewCard}>
              <Text style={styles.reviewCardTitle}>
                📦 Items ({itemCount})
              </Text>
              {cartItems.map((item) => (
                <View
                  key={item.id}
                  style={styles.orderItemRow}
                >
                  <Text
                    style={styles.orderItemName}
                    numberOfLines={2}
                  >
                    {item.product.name}
                  </Text>
                  <Text style={styles.orderItemQty}>
                    × {item.quantity}
                  </Text>
                  <Text style={styles.orderItemTotal}>
                    {formatPrice(
                      getEffectivePrice(item.product) *
                        item.quantity
                    )}
                  </Text>
                </View>
              ))}
            </View>

            {/* Notes */}
            <View style={styles.reviewCard}>
              <Text style={styles.reviewCardTitle}>
                📝 Order Notes (optional)
              </Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add notes for vendor..."
                multiline
                numberOfLines={3}
                placeholderTextColor={COLORS.textLight}
              />
            </View>

            {/* Price Summary */}
            <View style={styles.reviewCard}>
              <Text style={styles.reviewCardTitle}>
                💰 Price Summary
              </Text>
              {[
                [
                  t('cart.subtotal'),
                  formatPrice(subtotal),
                ],
                [
                  t('cart.shipping'),
                  isFreeShipping
                    ? '🎉 FREE'
                    : formatPrice(shipping),
                ],
              ].map(([label, value]) => (
                <View key={label} style={styles.priceRow}>
                  <Text style={styles.priceLabel}>
                    {label}
                  </Text>
                  <Text
                    style={[
                      styles.priceValue,
                      value === '🎉 FREE' &&
                        styles.freeShipText,
                    ]}
                  >
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

            {/* Mobile money notice */}
            {isMobileMoney(selectedPayment) && (
              <View
                style={[
                  styles.mobileNotice,
                  {
                    backgroundColor:
                      selectedPaymentInfo?.lightColor,
                    borderColor:
                      selectedPaymentInfo?.color,
                  },
                ]}
              >
                <Text style={styles.mobileNoticeIcon}>
                  📲
                </Text>
                <Text
                  style={[
                    styles.mobileNoticeText,
                    {
                      color: selectedPaymentInfo?.color,
                    },
                  ]}
                >
                  After placing order, a PIN prompt will
                  be sent to{' '}
                  <Text style={styles.mobileNoticeBold}>
                    {mobilePhone}
                  </Text>{' '}
                  via {selectedPaymentInfo?.label}.
                </Text>
              </View>
            )}

            {/* Error Banner */}
            {errors.create && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>
                  ⚠️{' '}
                  {typeof errors.create === 'string'
                    ? errors.create
                    : 'Order failed. Please try again.'}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    dispatch(clearOrderError('create'))
                  }
                >
                  <Text style={styles.errorDismiss}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Action Bar */}
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
            title={`Continue →`}
            onPress={handleNextStep}
            style={styles.bottomBtn}
            size="lg"
          />
        ) : (
          <Button
            title={
              isMobileMoney(selectedPayment)
                ? `Pay via ${selectedPaymentInfo?.label}`
                : t('checkout.placeOrder')
            }
            onPress={handlePlaceOrder}
            loading={loading.create}
            disabled={loading.create}
            style={[
              styles.bottomBtn,
              isMobileMoney(selectedPayment) && {
                backgroundColor:
                  selectedPaymentInfo?.color,
              },
            ]}
            size="lg"
          />
        )}
      </View>

      {/* Add Address Modal */}
      <AddAddressModal />

      {/* Loading Overlay */}
      <OverlayLoading
        visible={loading.create}
        message="Placing order..."
      />
    </View>
  );
}

// ══════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.base,
    paddingBottom: SPACING['2xl'],
  },

  // ── Header ─────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.base,
    paddingTop:
      Platform.OS === 'ios' ? SPACING['3xl'] : SPACING.base,
    paddingBottom: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    ...SHADOWS.sm,
  },
  backIcon: {
    fontSize: FONTS.xl,
    color: COLORS.textPrimary,
    fontWeight: FONTS.bold,
  },
  headerTitle: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },
  headerItems: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
  },

  // ── Step Indicator ──────────────────────────────────
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  stepItem: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.skeleton,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  stepCircleActive: {
    backgroundColor: COLORS.primaryFade,
    borderColor: COLORS.primary,
  },
  stepCircleDone: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
  },
  stepNum: {
    fontSize: FONTS.xs,
    fontWeight: FONTS.bold,
    color: COLORS.textMuted,
  },
  stepNumActive: {
    color: COLORS.primary,
  },
  stepLabel: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    fontWeight: FONTS.medium,
  },
  stepLabelActive: {
    color: COLORS.primary,
    fontWeight: FONTS.bold,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.lg,
    marginHorizontal: SPACING.xs,
  },
  stepLineDone: {
    backgroundColor: COLORS.primary,
  },

  // ── Section ─────────────────────────────────────────
  sectionTitle: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.base,
  },

  // ── Address ─────────────────────────────────────────
  emptyAddress: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.base,
  },
  emptyAddressText: {
    fontSize: FONTS.base,
    fontWeight: FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  emptyAddressSub: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  addressCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
    marginBottom: SPACING.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    ...SHADOWS.sm,
  },
  addressCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryFade,
  },
  addressRadio: {
    paddingTop: 2,
    marginRight: SPACING.sm,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
  },
  addressInfo: {
    flex: 1,
    gap: 2,
  },
  addressName: {
    fontSize: FONTS.base,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },
  addressPhone: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
  },
  addressText: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  defaultBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: COLORS.successLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  defaultBadgeText: {
    fontSize: FONTS.xs,
    color: COLORS.successText,
    fontWeight: FONTS.semiBold,
  },
  addAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    marginBottom: SPACING.sm,
  },
  addAddressIconWrap: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryFade,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAddressIcon: {
    fontSize: FONTS.xl,
    color: COLORS.primary,
    fontWeight: FONTS.bold,
    lineHeight: 24,
  },
  addAddressText: {
    fontSize: FONTS.base,
    color: COLORS.primary,
    fontWeight: FONTS.semiBold,
  },

  // ── Payment Cards ───────────────────────────────────
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.base,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
    marginBottom: SPACING.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    ...SHADOWS.sm,
  },
  paymentCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryFade,
  },
  paymentIcon: {
    fontSize: 24,
  },
  paymentLabel: {
    flex: 1,
    fontSize: FONTS.base,
    fontWeight: FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  paymentLabelActive: {
    color: COLORS.primary,
    fontWeight: FONTS.bold,
  },
  paymentCheck: {
    fontSize: FONTS.lg,
    color: COLORS.primary,
    fontWeight: FONTS.bold,
  },
  cardNote: {
    backgroundColor: '#EFF6FF',
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    marginBottom: SPACING.base,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardNoteText: {
    fontSize: FONTS.xs,
    color: '#1E40AF',
    lineHeight: 18,
  },

  // ── Divider ──────────────────────────────────────────
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginVertical: SPACING.base,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.divider,
  },
  dividerText: {
    fontSize: FONTS.xs,
    fontWeight: FONTS.bold,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },

  // ── Mobile Money ─────────────────────────────────────
  mobileMoneyCard: {
    position: 'relative',
  },
  mobileMoneyLogo: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileMoneyLogoText: {
    fontSize: FONTS['2xl'],
    fontWeight: FONTS.black,
  },
  mobileMoneyInfo: {
    flex: 1,
  },
  mobileMoneyName: {
    fontSize: FONTS.base,
    fontWeight: FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  mobileMoneyCountries: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  mobileMoneyCheck: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileMoneyCheckText: {
    color: COLORS.textWhite,
    fontSize: FONTS.xs,
    fontWeight: FONTS.bold,
  },
  mobilePhoneWrap: {
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
    borderWidth: 2,
  },
  mobilePhoneLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  mobilePhoneLabel: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.bold,
    color: COLORS.textSecondary,
  },
  mobilePhoneProvider: {
    fontSize: FONTS.xs,
    fontWeight: FONTS.bold,
  },
  mobilePhoneInput: {
    fontSize: FONTS.lg,
    color: COLORS.textPrimary,
    borderWidth: 1.5,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm + 2,
    backgroundColor: COLORS.surface,
    letterSpacing: 1,
    fontWeight: FONTS.semiBold,
    marginBottom: SPACING.sm,
  },
  mobilePhoneHint: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    lineHeight: 16,
  },

  // ── Review Card ──────────────────────────────────────
  reviewCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  reviewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  reviewCardTitle: {
    fontSize: FONTS.base,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },
  reviewEdit: {
    fontSize: FONTS.sm,
    color: COLORS.primary,
    fontWeight: FONTS.semiBold,
  },
  reviewName: {
    fontSize: FONTS.base,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },
  reviewDetail: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  reviewPaymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  reviewPaymentIcon: {
    fontSize: 24,
  },
  reviewPaymentName: {
    fontSize: FONTS.base,
    fontWeight: FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  reviewPaymentPhone: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: SPACING.sm,
  },
  orderItemName: {
    flex: 1,
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  orderItemQty: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
  },
  orderItemTotal: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    minWidth: 72,
    textAlign: 'right',
  },
  notesInput: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    fontSize: FONTS.sm,
    color: COLORS.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // ── Price Summary ───────────────────────────────────
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  priceLabel: {
    fontSize: FONTS.base,
    color: COLORS.textSecondary,
  },
  priceValue: {
    fontSize: FONTS.base,
    fontWeight: FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  freeShipText: {
    color: COLORS.success,
    fontWeight: FONTS.bold,
  },
  priceDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: SPACING.xs,
  },
  totalLabel: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },
  totalValue: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.black,
    color: COLORS.primary,
  },

  // ── Mobile Notice ───────────────────────────────────
  mobileNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
    marginBottom: SPACING.sm,
    borderWidth: 1.5,
  },
  mobileNoticeIcon: {
    fontSize: FONTS.lg,
  },
  mobileNoticeText: {
    flex: 1,
    fontSize: FONTS.sm,
    lineHeight: 20,
  },
  mobileNoticeBold: {
    fontWeight: FONTS.bold,
  },

  // ── Error ───────────────────────────────────────────
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dangerLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  errorText: {
    flex: 1,
    fontSize: FONTS.sm,
    color: COLORS.dangerText,
    fontWeight: FONTS.medium,
  },
  errorDismiss: {
    fontSize: FONTS.base,
    color: COLORS.danger,
    fontWeight: FONTS.bold,
  },

  // ── Bottom Bar ──────────────────────────────────────
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.base,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    paddingBottom:
      Platform.OS === 'ios' ? SPACING.xl : SPACING.base,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    ...SHADOWS.md,
  },
  bottomTotal: {
    flex: 1,
  },
  bottomTotalLabel: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
  },
  bottomTotalValue: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.black,
    color: COLORS.primary,
  },
  bottomBtn: {
    flex: 2,
  },

  // ── Add Address Modal ───────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl,
    paddingBottom:
      Platform.OS === 'ios' ? 40 : SPACING.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  modalTitle: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },
  modalClose: {
    fontSize: FONTS.xl,
    color: COLORS.textMuted,
    fontWeight: FONTS.bold,
  },
  inputLabel: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.semiBold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  modalInput: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm + 2,
    fontSize: FONTS.base,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  modalInputError: {
    borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerLight,
  },
  fieldError: {
    fontSize: FONTS.xs,
    color: COLORS.danger,
    marginTop: -SPACING.xs,
    marginBottom: SPACING.sm,
  },
  defaultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginVertical: SPACING.base,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkmark: {
    color: COLORS.textWhite,
    fontSize: FONTS.xs,
    fontWeight: FONTS.bold,
  },
  defaultText: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
  },
  modalBtn: {
    marginTop: SPACING.sm,
  },
});