/**
 * VUMA Store — Mobile Money Payment Screen
 * AzamPay: M-Pesa, Airtel Money, Tigo Pesa, HaloPesa
 *
 * Flow: select provider/phone → confirm dialog → send STK push →
 * poll for real confirmation → Successful / Failed / Cancelled.
 * The order is only marked paid by the backend webhook after the
 * customer actually enters their PIN on their own phone — this screen
 * never collects, displays, logs, or stores that PIN.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  TextInput, Alert, Platform, ActivityIndicator, ScrollView, Modal,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../utils/constants';
import Button from '../../components/common/Button';
import { post } from '../../api/client';

const PROVIDERS = [
  {
    id: 'mpesa',
    name: 'M-Pesa',
    company: 'Vodacom',
    icon: '📱',
    color: '#E31E2D',
    prefix: '255 07X',
    numbers: ['071', '074', '075', '076'],
  },
  {
    id: 'airtel',
    name: 'Airtel Money',
    company: 'Airtel Tanzania',
    icon: '📱',
    color: '#FF0000',
    prefix: '255 068/069',
    numbers: ['068', '069'],
  },
  {
    id: 'tigopesa',
    name: 'Tigo Pesa',
    company: 'Tigo Tanzania',
    icon: '📱',
    color: '#00A0E3',
    prefix: '255 065/067',
    numbers: ['065', '067'],
  },
  {
    id: 'halopesa',
    name: 'HaloPesa',
    company: 'Halotel',
    icon: '📱',
    color: '#6B2D8B',
    prefix: '255 062',
    numbers: ['062'],
  },
];

// Poll every 4s, give up after ~2 minutes (STK pushes typically expire
// around then if the customer never enters their PIN).
const POLL_INTERVAL_MS = 4000;
const MAX_POLL_ATTEMPTS = 30;

export default function MobileMoneyScreen({ navigation, route }) {
  const { orderId, amount, orderNumber } = route?.params || {};

  const [selectedProvider, setSelectedProvider] = useState(null);
  const [phone, setPhone] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  // select | processing | success | failed | cancelled
  const [step, setStep] = useState('select');
  const [txRef, setTxRef] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const pollTimer = useRef(null);
  const pollAttempts = useRef(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    return () => stopPolling();
  }, []);

  const stopPolling = () => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  };

  // ── Step 1: tap Pay → open confirm dialog (nothing sent yet) ──
  const handleTapPay = () => {
    if (!selectedProvider) { Alert.alert('Required', 'Please select a payment method.'); return; }
    if (!phone.trim() || phone.trim().length < 9) { Alert.alert('Required', 'Enter a valid phone number.'); return; }
    setShowConfirm(true);
  };

  // ── Step 2: customer confirms in the dialog → actually send the STK push ──
  const handleConfirmSend = async () => {
    setSending(true);
    try {
      const result = await post('/payments/mobile-money/initiate/', {
        provider: selectedProvider.id,
        phone: phone.trim(),
        amount: amount,
        order_id: orderId,
      });

      if (result.success && result.tx_ref) {
        setTxRef(result.tx_ref);
        setShowConfirm(false);
        setStep('processing');
        cancelledRef.current = false;
        pollAttempts.current = 0;
        pollPaymentStatus(result.tx_ref);
      } else {
        setShowConfirm(false);
        setErrorMessage(result.error || 'Could not send payment request. Please try again.');
        setStep('failed');
      }
    } catch (e) {
      setShowConfirm(false);
      setErrorMessage('Could not reach the payment gateway. Please check your connection and try again.');
      setStep('failed');
    } finally {
      setSending(false);
    }
  };

  // ── Poll the backend for real confirmation (never assume success) ──
  const pollPaymentStatus = useCallback((ref) => {
    if (cancelledRef.current) return;

    pollTimer.current = setTimeout(async () => {
      if (cancelledRef.current) return;
      pollAttempts.current += 1;

      try {
        const result = await post('/payments/mobile-money/verify/', {
          tx_ref: ref,
          provider: selectedProvider?.id,
        });

        if (cancelledRef.current) return;

        if (result.success && result.status === 'completed') {
          setStep('success');
          return;
        }
        if (result.status === 'failed') {
          setErrorMessage(result.message || 'Payment was not completed.');
          setStep('failed');
          return;
        }
        // Still pending — keep polling until the timeout
        if (pollAttempts.current >= MAX_POLL_ATTEMPTS) {
          setErrorMessage('We did not receive confirmation in time. If you completed the payment on your phone, check your order status shortly — you have not been charged twice.');
          setStep('failed');
          return;
        }
        pollPaymentStatus(ref);
      } catch (e) {
        if (cancelledRef.current) return;
        if (pollAttempts.current >= MAX_POLL_ATTEMPTS) {
          setErrorMessage('Could not confirm payment status. Please check your order shortly.');
          setStep('failed');
          return;
        }
        pollPaymentStatus(ref);
      }
    }, POLL_INTERVAL_MS);
  }, [selectedProvider]);

  const handleCancelProcessing = () => {
    cancelledRef.current = true;
    stopPolling();
    setStep('cancelled');
  };

  const handleRetry = () => {
    stopPolling();
    cancelledRef.current = false;
    setTxRef(null);
    setErrorMessage('');
    setStep('select');
  };

  // ── Confirm Dialog ──────────────────────────────────
  const ConfirmDialog = () => (
    <Modal visible={showConfirm} transparent animationType="fade" onRequestClose={() => !sending && setShowConfirm(false)}>
      <View style={styles.dialogOverlay}>
        <View style={styles.dialogCard}>
          <Text style={styles.dialogTitle}>Confirm Payment</Text>
          <View style={styles.dialogRow}>
            <Text style={styles.dialogLabel}>Method</Text>
            <Text style={styles.dialogValue}>{selectedProvider?.icon} {selectedProvider?.name}</Text>
          </View>
          <View style={styles.dialogRow}>
            <Text style={styles.dialogLabel}>Phone Number</Text>
            <Text style={styles.dialogValue}>+255 {phone}</Text>
          </View>
          <View style={styles.dialogRow}>
            <Text style={styles.dialogLabel}>Amount</Text>
            <Text style={styles.dialogAmount}>TZS {Number(amount).toLocaleString()}</Text>
          </View>
          <Text style={styles.dialogNote}>
            You'll receive a prompt on this phone to enter your {selectedProvider?.name} PIN. VUMA never asks for or stores your PIN.
          </Text>
          <View style={styles.dialogBtns}>
            <TouchableOpacity style={styles.dialogCancelBtn} onPress={() => setShowConfirm(false)} disabled={sending}>
              <Text style={styles.dialogCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Button
              title={sending ? 'Sending...' : 'Confirm & Pay'}
              onPress={handleConfirmSend}
              loading={sending}
              style={styles.dialogConfirmBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  // ── Processing Screen ────────────────────────────────
  if (step === 'processing') {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.waitingTitle}>Processing Payment...</Text>
        <Text style={styles.waitingText}>
          Please check your phone.{'\n'}
          Enter your {selectedProvider?.name} PIN to confirm.
        </Text>
        <View style={styles.waitingCard}>
          <Text style={styles.waitingProvider}>{selectedProvider?.icon} {selectedProvider?.name}</Text>
          <Text style={styles.waitingAmount}>TZS {Number(amount).toLocaleString()}</Text>
          <Text style={styles.waitingPhone}>+255 {phone}</Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>Status: Waiting for confirmation</Text>
          </View>
        </View>
        <Text style={styles.waitingFooter}>Do not close this screen</Text>
        <TouchableOpacity onPress={handleCancelProcessing} style={styles.cancelProcessingBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Success Screen ────────────────────────────────
  if (step === 'success') {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>Payment Successful!</Text>
        <Text style={styles.successText}>
          TZS {Number(amount).toLocaleString()} paid via {selectedProvider?.name}
        </Text>
        <View style={styles.successSecureNote}>
          <Text style={styles.secureIcon}>🔒</Text>
          <Text style={styles.secureText}>Secured by AzamPay</Text>
        </View>
        <Button
          title="View Order"
          onPress={() => navigation.replace('OrderDetail', { orderId })}
          style={{ marginTop: SPACING.xl, minWidth: 200 }}
        />
      </View>
    );
  }

  // ── Failed Screen ─────────────────────────────────
  if (step === 'failed') {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.failedIcon}>❌</Text>
        <Text style={styles.failedTitle}>Payment Failed</Text>
        <Text style={styles.failedText}>{errorMessage || 'Please check your balance and try again.'}</Text>
        <Button title="Try Again" onPress={handleRetry} style={styles.retryBtn} />
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Back to Order</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Cancelled Screen ───────────────────────────────
  if (step === 'cancelled') {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.failedIcon}>⚠️</Text>
        <Text style={styles.failedTitle}>Payment Cancelled</Text>
        <Text style={styles.failedText}>
          Your payment was not completed. If you already entered your PIN on your phone, check your order status shortly — you have not been charged twice.
        </Text>
        <Button title="Try Again" onPress={handleRetry} style={styles.retryBtn} />
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Back to Order</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Select Screen ──────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pay with Mobile Money</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Amount */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Order #{orderNumber}</Text>
          <Text style={styles.amountValue}>TZS {Number(amount).toLocaleString()}</Text>
          <Text style={styles.amountSub}>Total to pay</Text>
        </View>

        {/* Provider Selection */}
        <Text style={styles.sectionTitle}>Select Payment Method</Text>
        {PROVIDERS.map(provider => (
          <TouchableOpacity
            key={provider.id}
            style={[
              styles.providerCard,
              selectedProvider?.id === provider.id && { borderColor: provider.color, backgroundColor: provider.color + '10' },
            ]}
            onPress={() => setSelectedProvider(provider)}
            activeOpacity={0.85}
          >
            <View style={[styles.providerLogo, { backgroundColor: provider.color }]}>
              <Text style={styles.providerLogoText}>{provider.icon}</Text>
            </View>
            <View style={styles.providerInfo}>
              <Text style={styles.providerName}>{provider.name}</Text>
              <Text style={styles.providerCompany}>{provider.company}</Text>
              <Text style={styles.providerNumbers}>Numbers: {provider.numbers.join(', ')}</Text>
            </View>
            <View style={[
              styles.providerRadio,
              selectedProvider?.id === provider.id && { backgroundColor: provider.color, borderColor: provider.color },
            ]}>
              {selectedProvider?.id === provider.id && <Text style={styles.radioCheck}>✓</Text>}
            </View>
          </TouchableOpacity>
        ))}

        {/* Phone Number */}
        {selectedProvider && (
          <View style={styles.phoneSection}>
            <Text style={styles.sectionTitle}>{selectedProvider.name} Phone Number</Text>
            <View style={styles.phoneInputWrap}>
              <View style={styles.phonePrefix}>
                <Text style={styles.phonePrefixText}>🇹🇿 +255</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="7XX XXX XXX"
                keyboardType="phone-pad"
                maxLength={12}
                placeholderTextColor={COLORS.textLight}
              />
            </View>
            <Text style={styles.phoneHint}>
              Enter the number registered with {selectedProvider.name}
            </Text>
          </View>
        )}

        {/* Pay Button */}
        <Button
          title={`Pay TZS ${Number(amount).toLocaleString()}`}
          onPress={handleTapPay}
          disabled={!selectedProvider || !phone.trim()}
          fullWidth
          style={styles.payBtn}
        />

        <View style={styles.secureNote}>
          <Text style={styles.secureIcon}>🔒</Text>
          <Text style={styles.secureText}>Powered by AzamPay — Secure Tanzanian Payment Gateway</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <ConfirmDialog />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, paddingHorizontal: SPACING.base, paddingTop: Platform.OS === 'ios' ? 50 : SPACING.base, paddingBottom: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider, ...SHADOWS.sm },
  headerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  backBtn: { fontSize: FONTS.xl, color: COLORS.primary, fontWeight: FONTS.bold },
  scroll: { padding: SPACING.base },
  amountCard: { backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, padding: SPACING.xl, alignItems: 'center', marginBottom: SPACING.xl, ...SHADOWS.md },
  amountLabel: { fontSize: FONTS.sm, color: 'rgba(255,255,255,0.8)', marginBottom: SPACING.xs },
  amountValue: { fontSize: FONTS['4xl'], fontWeight: FONTS.black, color: 'white', letterSpacing: -1 },
  amountSub: { fontSize: FONTS.xs, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  sectionTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm, marginTop: SPACING.sm },
  providerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, borderWidth: 2, borderColor: COLORS.border, padding: SPACING.base, marginBottom: SPACING.sm, gap: SPACING.base, ...SHADOWS.sm },
  providerLogo: { width: 48, height: 48, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' },
  providerLogoText: { fontSize: 24 },
  providerInfo: { flex: 1 },
  providerName: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  providerCompany: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  providerNumbers: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  providerRadio: { width: 24, height: 24, borderRadius: RADIUS.full, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  radioCheck: { color: 'white', fontSize: FONTS.xs, fontWeight: FONTS.bold },
  phoneSection: { marginTop: SPACING.base },
  phoneInputWrap: { flexDirection: 'row', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: SPACING.xs },
  phonePrefix: { backgroundColor: COLORS.surfaceAlt, paddingHorizontal: SPACING.sm, justifyContent: 'center', borderRightWidth: 1, borderRightColor: COLORS.border },
  phonePrefixText: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONTS.semiBold },
  phoneInput: { flex: 1, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 2, fontSize: FONTS.lg, color: COLORS.textPrimary, letterSpacing: 2 },
  phoneHint: { fontSize: FONTS.xs, color: COLORS.textMuted },
  payBtn: { marginTop: SPACING.xl, borderRadius: RADIUS.xl },
  secureNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs, marginTop: SPACING.base },
  secureIcon: { fontSize: FONTS.sm },
  secureText: { fontSize: FONTS.xs, color: COLORS.textMuted, textAlign: 'center' },
  // Confirm Dialog
  dialogOverlay: { flex: 1, backgroundColor: 'rgba(18,22,43,0.6)', justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  dialogCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, width: '100%', maxWidth: 380, ...SHADOWS.lg },
  dialogTitle: { fontSize: FONTS.xl, fontWeight: FONTS.black, color: COLORS.textPrimary, marginBottom: SPACING.base, textAlign: 'center' },
  dialogRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  dialogLabel: { fontSize: FONTS.sm, color: COLORS.textMuted },
  dialogValue: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textPrimary },
  dialogAmount: { fontSize: FONTS.lg, fontWeight: FONTS.black, color: COLORS.primary },
  dialogNote: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: SPACING.base, marginBottom: SPACING.base, lineHeight: 18, textAlign: 'center' },
  dialogBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
  dialogCancelBtn: { flex: 1, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.xl, alignItems: 'center', justifyContent: 'center' },
  dialogCancelText: { fontSize: FONTS.base, color: COLORS.textSecondary, fontWeight: FONTS.semiBold },
  dialogConfirmBtn: { flex: 2 },
  // Center screens
  centerScreen: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  waitingTitle: { fontSize: FONTS['2xl'], fontWeight: FONTS.bold, color: COLORS.textPrimary, marginTop: SPACING.xl, marginBottom: SPACING.sm },
  waitingText: { fontSize: FONTS.base, color: COLORS.textMuted, textAlign: 'center', lineHeight: 24, marginBottom: SPACING.xl },
  waitingCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, alignItems: 'center', width: '100%', ...SHADOWS.md },
  waitingProvider: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  waitingAmount: { fontSize: FONTS['3xl'], fontWeight: FONTS.black, color: COLORS.primary, marginBottom: SPACING.sm },
  waitingPhone: { fontSize: FONTS.base, color: COLORS.textMuted, marginBottom: SPACING.base },
  statusPill: { backgroundColor: COLORS.primaryFade, borderRadius: RADIUS.full, paddingHorizontal: SPACING.base, paddingVertical: SPACING.xs },
  statusPillText: { fontSize: FONTS.xs, color: COLORS.primaryDark, fontWeight: FONTS.semiBold },
  waitingFooter: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: SPACING.xl },
  cancelProcessingBtn: { marginTop: SPACING.base },
  successIcon: { fontSize: 80, marginBottom: SPACING.base },
  successTitle: { fontSize: FONTS['2xl'], fontWeight: FONTS.black, color: COLORS.success, marginBottom: SPACING.sm },
  successText: { fontSize: FONTS.base, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.xs },
  successSecureNote: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginTop: SPACING.sm },
  successSub: { fontSize: FONTS.sm, color: COLORS.textMuted },
  failedIcon: { fontSize: 80, marginBottom: SPACING.base },
  failedTitle: { fontSize: FONTS['2xl'], fontWeight: FONTS.black, color: COLORS.danger, marginBottom: SPACING.sm },
  failedText: { fontSize: FONTS.base, color: COLORS.textMuted, textAlign: 'center', marginBottom: SPACING.xl },
  retryBtn: { minWidth: 200, marginBottom: SPACING.base },
  cancelText: { fontSize: FONTS.sm, color: COLORS.textMuted },
});