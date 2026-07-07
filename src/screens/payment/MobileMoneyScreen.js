/**
 * VUMA Store — Mobile Money Payment Screen
 * M-Pesa, Airtel Money, Halopesa
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useTranslation } from '../../i18n';
import {
  COLORS,
  FONTS,
  SPACING,
  RADIUS,
  SHADOWS,
} from '../../utils/constants';
import { paymentsAPI } from '../../api/payments';
import { formatPrice } from '../../utils/helpers';

// ── Provider Config ───────────────────────────────────
const PROVIDERS = {
  mpesa: {
    id: 'mpesa',
    name: 'M-Pesa',
    color: '#00A651',
    lightColor: '#E8F8EF',
    icon: '📱',
    logo: 'M',
    countries: [
      { code: 'TZ', dialCode: '+255', placeholder: '+255 7XX XXX XXX' },
      { code: 'KE', dialCode: '+254', placeholder: '+254 7XX XXX XXX' },
    ],
    hint: 'Enter your M-Pesa registered number',
  },
  airtel: {
    id: 'airtel',
    name: 'Airtel Money',
    color: '#E2231A',
    lightColor: '#FDECEA',
    icon: '📱',
    logo: 'A',
    countries: [
      { code: 'TZ', dialCode: '+255', placeholder: '+255 6XX XXX XXX' },
      { code: 'RW', dialCode: '+250', placeholder: '+250 7XX XXX XXX' },
      { code: 'UG', dialCode: '+256', placeholder: '+256 7XX XXX XXX' },
    ],
    hint: 'Enter your Airtel Money registered number',
  },
  halopesa: {
    id: 'halopesa',
    name: 'Halopesa',
    color: '#F7941D',
    lightColor: '#FEF3E7',
    icon: '📱',
    logo: 'H',
    countries: [
      { code: 'TZ', dialCode: '+255', placeholder: '+255 6XX XXX XXX' },
    ],
    hint: 'Enter your Halopesa registered number',
  },
};

// ── PIN Dialog Component ──────────────────────────────
function PinDialog({
  visible,
  provider,
  phone,
  amount,
  currency,
  onConfirm,
  onCancel,
  loading,
}) {
  if (!visible || !provider) return null;
  const config = PROVIDERS[provider];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.pinOverlay}>
        <View style={styles.pinCard}>
          {/* Provider Header */}
          <View
            style={[
              styles.pinHeader,
              { backgroundColor: config.color },
            ]}
          >
            <View style={styles.pinLogoCircle}>
              <Text style={styles.pinLogoText}>
                {config.logo}
              </Text>
            </View>
            <Text style={styles.pinProviderName}>
              {config.name}
            </Text>
          </View>

          <View style={styles.pinBody}>
            {/* Amount */}
            <Text style={styles.pinAmountLabel}>
              Amount to Pay
            </Text>
            <Text
              style={[
                styles.pinAmount,
                { color: config.color },
              ]}
            >
              {currency} {Number(amount).toLocaleString()}
            </Text>

            {/* Phone */}
            <Text style={styles.pinPhoneLabel}>
              Paying from
            </Text>
            <Text style={styles.pinPhone}>{phone}</Text>

            {/* Instruction */}
            <View
              style={[
                styles.pinInstruction,
                { backgroundColor: config.lightColor },
              ]}
            >
              <Text style={styles.pinInstructionIcon}>
                📲
              </Text>
              <Text style={styles.pinInstructionText}>
                A push notification has been sent to your
                phone. Enter your {config.name} PIN to
                complete the payment.
              </Text>
            </View>

            {/* Spinner */}
            {loading && (
              <View style={styles.pinLoading}>
                <ActivityIndicator
                  size="large"
                  color={config.color}
                />
                <Text style={styles.pinLoadingText}>
                  Waiting for confirmation...
                </Text>
              </View>
            )}

            {/* Actions */}
            <View style={styles.pinActions}>
              <TouchableOpacity
                style={styles.pinCancelBtn}
                onPress={onCancel}
                disabled={loading}
              >
                <Text style={styles.pinCancelText}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.pinConfirmBtn,
                  { backgroundColor: config.color },
                  loading && styles.pinBtnDisabled,
                ]}
                onPress={onConfirm}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator
                    size="small"
                    color={COLORS.textWhite}
                  />
                ) : (
                  <Text style={styles.pinConfirmText}>
                    I've Entered PIN ✓
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Success Dialog ────────────────────────────────────
function SuccessDialog({ visible, provider, amount, currency, onDone }) {
  if (!visible || !provider) return null;
  const config = PROVIDERS[provider];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.pinOverlay}>
        <View style={styles.successCard}>
          <View
            style={[
              styles.successIconWrap,
              { backgroundColor: config.lightColor },
            ]}
          >
            <Text style={styles.successIcon}>✅</Text>
          </View>
          <Text style={styles.successTitle}>
            Payment Successful!
          </Text>
          <Text style={styles.successAmount}>
            {currency} {Number(amount).toLocaleString()}
          </Text>
          <Text style={styles.successProvider}>
            Paid via {config.name}
          </Text>
          <TouchableOpacity
            style={[
              styles.successBtn,
              { backgroundColor: config.color },
            ]}
            onPress={onDone}
          >
            <Text style={styles.successBtnText}>
              Continue →
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Component ────────────────────────────────────
export default function MobileMoneyScreen({
  navigation,
  route,
}) {
  const { t } = useTranslation();
  const {
    provider: initialProvider,
    amount,
    orderId,
    currency = 'TZS',
  } = route?.params || {};

  const [provider, setProvider] = useState(
    initialProvider || 'mpesa'
  );
  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(0);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [txRef, setTxRef] = useState('');
  const [flwTxId, setFlwTxId] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const pollRef = useRef(null);
  const config = PROVIDERS[provider];

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const validatePhone = () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 9) {
      setPhoneError('Enter a valid phone number');
      return false;
    }
    setPhoneError('');
    return true;
  };

  const handlePayNow = async () => {
    if (!validatePhone()) return;

    setLoading(true);
    try {
      const response = await paymentsAPI.initiateMobileMoney({
        phone: phone.trim(),
        amount,
        provider,
        orderId,
      });

      if (response.success) {
        setTxRef(response.tx_ref);
        setFlwTxId(response.flutterwave_tx_id || '');
        setShowPinDialog(true);
        // Start polling after 5 seconds
        startPolling(response.tx_ref, response.flutterwave_tx_id);
      } else {
        Alert.alert(
          'Payment Failed',
          response.error || 'Could not initiate payment.'
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error.message || 'Payment failed. Try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (ref, fwId) => {
    let attempts = 0;
    const maxAttempts = 12; // Poll for 60 seconds

    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts >= maxAttempts) {
        clearInterval(pollRef.current);
        return;
      }

      try {
        const result = await paymentsAPI.verifyMobileMoney({
          txRef: ref,
          flutterwaveTxId: fwId,
        });

        if (result.status === 'success') {
          clearInterval(pollRef.current);
          setShowPinDialog(false);
          setShowSuccess(true);
        } else if (result.status === 'failed') {
          clearInterval(pollRef.current);
          setShowPinDialog(false);
          Alert.alert(
            '❌ Payment Failed',
            result.message || 'Payment was not completed.'
          );
        }
      } catch {}
    }, 5000); // Poll every 5 seconds
  };

  const handlePinConfirm = async () => {
    setVerifying(true);
    try {
      const result = await paymentsAPI.verifyMobileMoney({
        txRef,
        flutterwaveTxId: flwTxId,
      });

      if (result.status === 'success') {
        clearInterval(pollRef.current);
        setShowPinDialog(false);
        setShowSuccess(true);
      } else if (result.status === 'pending') {
        Alert.alert(
          '⏳ Still Processing',
          'Your payment is being processed. Please wait.'
        );
      } else {
        setShowPinDialog(false);
        Alert.alert(
          '❌ Payment Failed',
          result.message || 'Payment failed.'
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Could not verify payment.');
    } finally {
      setVerifying(false);
    }
  };

  const handlePinCancel = () => {
    clearInterval(pollRef.current);
    setShowPinDialog(false);
    Alert.alert(
      'Payment Cancelled',
      'Your payment was cancelled.',
      [{ text: 'OK' }]
    );
  };

  const handleSuccessDone = () => {
    setShowSuccess(false);
    navigation.navigate('Orders');
  };

  const currentCountry = config.countries[selectedCountry];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.surface}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Mobile Money
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.content}>
        {/* Amount Card */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>
            Amount to Pay
          </Text>
          <Text style={styles.amountValue}>
            {currency} {Number(amount || 0).toLocaleString()}
          </Text>
        </View>

        {/* Provider Selection */}
        <Text style={styles.sectionLabel}>
          Select Provider
        </Text>
        <View style={styles.providersRow}>
          {Object.values(PROVIDERS).map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.providerBtn,
                provider === p.id && [
                  styles.providerBtnActive,
                  { borderColor: p.color },
                ],
              ]}
              onPress={() => {
                setProvider(p.id);
                setSelectedCountry(0);
                setPhone('');
                setPhoneError('');
              }}
            >
              <View
                style={[
                  styles.providerLogoWrap,
                  { backgroundColor: p.lightColor },
                ]}
              >
                <Text
                  style={[
                    styles.providerLogoText,
                    { color: p.color },
                  ]}
                >
                  {p.logo}
                </Text>
              </View>
              <Text
                style={[
                  styles.providerName,
                  provider === p.id && { color: p.color },
                ]}
              >
                {p.name}
              </Text>
              {provider === p.id && (
                <View
                  style={[
                    styles.providerCheck,
                    { backgroundColor: p.color },
                  ]}
                >
                  <Text style={styles.providerCheckText}>
                    ✓
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Country Selection */}
        {config.countries.length > 1 && (
          <>
            <Text style={styles.sectionLabel}>Country</Text>
            <View style={styles.countryRow}>
              {config.countries.map((country, index) => (
                <TouchableOpacity
                  key={country.code}
                  style={[
                    styles.countryBtn,
                    selectedCountry === index && [
                      styles.countryBtnActive,
                      { borderColor: config.color },
                    ],
                  ]}
                  onPress={() => {
                    setSelectedCountry(index);
                    setPhone(country.dialCode + ' ');
                  }}
                >
                  <Text style={styles.countryCode}>
                    {country.code}
                  </Text>
                  <Text style={styles.countryDial}>
                    {country.dialCode}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Phone Input */}
        <Text style={styles.sectionLabel}>
          Phone Number
        </Text>
        <View
          style={[
            styles.phoneInputWrap,
            phoneError && styles.phoneInputError,
          ]}
        >
          <Text style={styles.phoneFlag}>📱</Text>
          <TextInput
            style={styles.phoneInput}
            value={phone}
            onChangeText={(v) => {
              setPhone(v);
              setPhoneError('');
            }}
            placeholder={currentCountry.placeholder}
            keyboardType="phone-pad"
            placeholderTextColor={COLORS.textLight}
            autoFocus
          />
        </View>
        {phoneError ? (
          <Text style={styles.phoneError}>
            ⚠️ {phoneError}
          </Text>
        ) : (
          <Text style={styles.phoneHint}>{config.hint}</Text>
        )}

        {/* Info Box */}
        <View
          style={[
            styles.infoBox,
            { backgroundColor: config.lightColor },
          ]}
        >
          <Text style={styles.infoBoxIcon}>ℹ️</Text>
          <Text style={styles.infoBoxText}>
            After tapping Pay Now, you will receive a PIN
            prompt on your phone. Enter your{' '}
            {config.name} PIN to complete the payment.
          </Text>
        </View>

        {/* Pay Button */}
        <TouchableOpacity
          style={[
            styles.payBtn,
            { backgroundColor: config.color },
            loading && styles.payBtnDisabled,
          ]}
          onPress={handlePayNow}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator
              size="small"
              color={COLORS.textWhite}
            />
          ) : (
            <Text style={styles.payBtnText}>
              Pay Now via {config.name} →
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* PIN Dialog */}
      <PinDialog
        visible={showPinDialog}
        provider={provider}
        phone={phone}
        amount={amount}
        currency={currency}
        onConfirm={handlePinConfirm}
        onCancel={handlePinCancel}
        loading={verifying}
      />

      {/* Success Dialog */}
      <SuccessDialog
        visible={showSuccess}
        provider={provider}
        amount={amount}
        currency={currency}
        onDone={handleSuccessDone}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
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
  content: {
    flex: 1,
    padding: SPACING.base,
  },
  amountCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  amountLabel: {
    fontSize: FONTS.sm,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: SPACING.xs,
  },
  amountValue: {
    fontSize: FONTS['4xl'],
    fontWeight: FONTS.black,
    color: COLORS.textWhite,
    letterSpacing: -1,
  },
  sectionLabel: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.bold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.base,
  },
  providersRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  providerBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    ...SHADOWS.sm,
    position: 'relative',
  },
  providerBtnActive: {
    backgroundColor: COLORS.surface,
  },
  providerLogoWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  providerLogoText: {
    fontSize: FONTS['2xl'],
    fontWeight: FONTS.black,
  },
  providerName: {
    fontSize: FONTS.xs,
    fontWeight: FONTS.semiBold,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  providerCheck: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerCheckText: {
    color: COLORS.textWhite,
    fontSize: 10,
    fontWeight: FONTS.bold,
  },
  countryRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  countryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  countryBtnActive: {
    backgroundColor: COLORS.primaryFade,
  },
  countryCode: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },
  countryDial: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
  },
  phoneInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  phoneInputError: {
    borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerLight,
  },
  phoneFlag: {
    fontSize: FONTS.lg,
  },
  phoneInput: {
    flex: 1,
    fontSize: FONTS.lg,
    color: COLORS.textPrimary,
    fontWeight: FONTS.semiBold,
    letterSpacing: 1,
    padding: 0,
  },
  phoneError: {
    fontSize: FONTS.xs,
    color: COLORS.danger,
    marginTop: SPACING.xs,
  },
  phoneHint: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginTop: SPACING.base,
    marginBottom: SPACING.xl,
  },
  infoBoxIcon: {
    fontSize: FONTS.base,
  },
  infoBoxText: {
    flex: 1,
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  payBtn: {
    paddingVertical: SPACING.base,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    ...SHADOWS.primary,
  },
  payBtnDisabled: {
    opacity: 0.7,
  },
  payBtnText: {
    color: COLORS.textWhite,
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
  },

  // ── PIN Dialog ────────────────────────────────────
  pinOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  pinCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 360,
  },
  pinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.base,
  },
  pinLogoCircle: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinLogoText: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.black,
    color: COLORS.textWhite,
  },
  pinProviderName: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
    color: COLORS.textWhite,
  },
  pinBody: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  pinAmountLabel: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  pinAmount: {
    fontSize: FONTS['3xl'],
    fontWeight: FONTS.black,
    marginBottom: SPACING.base,
    letterSpacing: -1,
  },
  pinPhoneLabel: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
  },
  pinPhone: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.base,
    letterSpacing: 1,
  },
  pinInstruction: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginBottom: SPACING.base,
    width: '100%',
  },
  pinInstructionIcon: {
    fontSize: FONTS.lg,
  },
  pinInstructionText: {
    flex: 1,
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  pinLoading: {
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.base,
  },
  pinLoadingText: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  pinActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    width: '100%',
  },
  pinCancelBtn: {
    flex: 1,
    paddingVertical: SPACING.sm + 4,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  pinCancelText: {
    fontSize: FONTS.base,
    color: COLORS.textSecondary,
    fontWeight: FONTS.semiBold,
  },
  pinConfirmBtn: {
    flex: 2,
    paddingVertical: SPACING.sm + 4,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },
  pinBtnDisabled: {
    opacity: 0.7,
  },
  pinConfirmText: {
    fontSize: FONTS.base,
    color: COLORS.textWhite,
    fontWeight: FONTS.bold,
  },

  // ── Success Dialog ────────────────────────────────
  successCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING['2xl'],
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  successIconWrap: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.base,
  },
  successIcon: {
    fontSize: 48,
  },
  successTitle: {
    fontSize: FONTS['2xl'],
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  successAmount: {
    fontSize: FONTS['3xl'],
    fontWeight: FONTS.black,
    color: COLORS.success,
    marginBottom: SPACING.xs,
    letterSpacing: -1,
  },
  successProvider: {
    fontSize: FONTS.base,
    color: COLORS.textMuted,
    marginBottom: SPACING.xl,
  },
  successBtn: {
    paddingVertical: SPACING.base,
    paddingHorizontal: SPACING['2xl'],
    borderRadius: RADIUS.xl,
    width: '100%',
    alignItems: 'center',
  },
  successBtnText: {
    color: COLORS.textWhite,
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
  },
});
