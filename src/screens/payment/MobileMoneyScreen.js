/**
 * VUMA Store — Mobile Money Payment Screen
 * AzamPay: M-Pesa, Airtel Money, Tigo Pesa, HaloPesa
 *
 * Flow: select provider/phone → confirm dialog → send STK push →
 * poll for real confirmation → Successful / Failed / Cancelled.
 * The order is only marked paid by the backend webhook after the
 * customer actually enters their PIN on their own phone — this screen
 * never collects, displays, logs, or stores that PIN.
 *
 * Select-screen layout redesigned to match the provided reference:
 * orange "Total to Pay" card, 2x2 provider grid, peach secure-payment
 * info box, "Lipa" pay button, trust badges, provider logo row.
 * All payment logic below (confirm dialog, STK push, polling,
 * processing/success/failed/cancelled screens) is unchanged.
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
    company: 'Vodacom Tanzania',
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
    color: '#E31E2D',
    prefix: '255 068/069',
    numbers: ['068', '069'],
  },
  {
    id: 'tigopesa',
    name: 'Tigo Pesa',
    company: 'Tigo Tanzania',
    icon: '📱',
    color: '#0072C6',
    prefix: '255 065/067',
    numbers: ['065', '067'],
  },
  {
    id: 'halopesa',
    name: 'HaloPesa',
    company: 'Halotel Tanzania',
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

  const handleCopyOrderNumber = async () => {
    // Dynamic import matches the same safe pattern api/client.js already
    // uses for axios — avoids a hard bundling dependency on whichever
    // clipboard package this project has (or hasn't) installed.
    if (!orderNumber) return;
    try {
      const Clipboard = (await import('@react-native-clipboard/clipboard')).default;
      Clipboard.setString(String(orderNumber));
    } catch (e) {
      // Clipboard package not available — the tap simply does nothing,
      // rather than crashing the screen.
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
        <View style={styles.headerSecureBadge}>
          <Text style={styles.headerSecureIcon}>🛡️</Text>
          <Text style={styles.headerSecureText}>Secure Payment</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Amount */}
        <View style={styles.amountCard}>
          <View style={styles.amountCardLeft}>
            <Text style={styles.amountLabel}>Total to Pay</Text>
            <Text style={styles.amountValue}>TZS {Number(amount).toLocaleString()}</Text>
            <TouchableOpacity style={styles.orderNumRow} onPress={handleCopyOrderNumber} activeOpacity={0.7}>
              <Text style={styles.amountSub}>Order #{orderNumber}</Text>
              <Text style={styles.copyIcon}>📋</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.walletIcon}>👛</Text>
        </View>

        {/* Provider Selection — 2x2 grid */}
        <Text style={styles.sectionTitle}>Choose payment method</Text>
        <View style={styles.providerGrid}>
          {PROVIDERS.map(provider => {
            const isSelected = selectedProvider?.id === provider.id;
            return (
              <TouchableOpacity
                key={provider.id}
                style={[styles.providerCard, isSelected && { borderColor: COLORS.primary, backgroundColor: COLORS.primaryFade }]}
                onPress={() => setSelectedProvider(provider)}
                activeOpacity={0.85}
              >
                <View style={[styles.providerLogo, { backgroundColor: provider.color }]}>
                  <Text style={styles.providerLogoText}>{provider.icon}</Text>
                </View>
                <View style={styles.providerInfo}>
                  <Text style={styles.providerName} numberOfLines={1}>{provider.name}</Text>
                  <Text style={styles.providerCompany} numberOfLines={1}>{provider.company}</Text>
                </View>
                <View style={[styles.providerRadio, isSelected && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}>
                  {isSelected && <Text style={styles.radioCheck}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Phone Number */}
        {selectedProvider && (
          <View style={styles.phoneSection}>
            <Text style={styles.sectionTitle}>Enter {selectedProvider.name} phone number</Text>
            <View style={styles.phoneInputWrap}>
              <View style={styles.phonePrefix}>
                <Text style={styles.phonePrefixText}>🇹🇿 +255</Text>
                <Text style={styles.phonePrefixCaret}>▾</Text>
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
              <View style={styles.contactIconWrap}>
                <Text style={styles.contactIcon}>👤</Text>
              </View>
            </View>
            <Text style={styles.phoneHint}>
              Enter the phone number registered with {selectedProvider.name}
            </Text>
          </View>
        )}

        {/* Secure payment info box */}
        <View style={styles.secureBox}>
          <Text style={styles.secureBoxIcon}>🛡️</Text>
          <View style={styles.secureBoxText}>
            <Text style={styles.secureBoxTitle}>Secure payment</Text>
            <Text style={styles.secureBoxDesc}>
              You will receive a payment prompt on your phone. Enter your PIN to complete the payment.
            </Text>
          </View>
        </View>

        {/* Pay Button */}
        <TouchableOpacity
          style={[styles.payBtn, (!selectedProvider || !phone.trim()) && styles.payBtnDisabled]}
          onPress={handleTapPay}
          disabled={!selectedProvider || !phone.trim()}
          activeOpacity={0.85}
        >
          <Text style={styles.payBtnLock}>🔒</Text>
          <Text style={styles.payBtnText}>Lipa TZS {Number(amount).toLocaleString()}</Text>
        </TouchableOpacity>

        <Text style={styles.securedByText}>
          Secured by <Text style={styles.securedByBrand}>AzamPay</Text>
        </Text>

        {/* Trust badges */}
        <View style={styles.trustRow}>
          {[
            { icon: '🛡️', title: 'Safe & Secure', sub: 'Encrypted' },
            { icon: '⚡', title: 'Fast Payments', sub: 'Instant' },
            { icon: '✅', title: 'Trusted by', sub: 'Millions' },
            { icon: '🎧', title: '24/7 Support', sub: "We're here" },
          ].map((item, i) => (
            <View key={i} style={styles.trustItem}>
              <Text style={styles.trustIcon}>{item.icon}</Text>
              <Text style={styles.trustTitle}>{item.title}</Text>
              <Text style={styles.trustSub}>{item.sub}</Text>
            </View>
          ))}
        </View>

        {/* Provider brand row — styled brand-color text, not
            reproduced trademarked logo artwork */}
        <View style={styles.brandRow}>
          <Text style={[styles.brandText, { color: '#4CAF50' }]}>M-PESA</Text>
          <View style={styles.brandDivider} />
          <Text style={[styles.brandText, { color: '#E31E2D' }]}>airtel money</Text>
          <View style={styles.brandDivider} />
          <Text style={[styles.brandText, { color: '#0072C6' }]}>tigo pesa</Text>
          <View style={styles.brandDivider} />
          <Text style={[styles.brandText, { color: '#6B2D8B' }]}>haloPesa</Text>
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
  headerSecureBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerSecureIcon: { fontSize: 12 },
  headerSecureText: { fontSize: 11, color: COLORS.primary, fontWeight: FONTS.semiBold },
  scroll: { padding: SPACING.base },

  // Amount card (orange, with wallet icon + copyable order number)
  amountCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, padding: SPACING.xl, marginBottom: SPACING.xl, ...SHADOWS.md },
  amountCardLeft: { flex: 1 },
  amountLabel: { fontSize: FONTS.sm, color: 'rgba(255,255,255,0.85)', marginBottom: SPACING.xs },
  amountValue: { fontSize: FONTS['4xl'], fontWeight: FONTS.black, color: 'white', letterSpacing: -1 },
  orderNumRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.sm },
  amountSub: { fontSize: FONTS.xs, color: 'rgba(255,255,255,0.85)' },
  copyIcon: { fontSize: 12 },
  walletIcon: { fontSize: 56, opacity: 0.35, marginLeft: SPACING.sm },

  sectionTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm, marginTop: SPACING.sm },

  // 2x2 provider grid
  providerGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: SPACING.sm },
  providerCard: { width: '48.5%', flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, borderWidth: 2, borderColor: COLORS.border, padding: SPACING.sm, marginBottom: SPACING.sm, gap: SPACING.sm, ...SHADOWS.sm },
  providerLogo: { width: 40, height: 40, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' },
  providerLogoText: { fontSize: 18 },
  providerInfo: { flex: 1 },
  providerName: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  providerCompany: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },
  providerRadio: { width: 22, height: 22, borderRadius: RADIUS.full, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  radioCheck: { color: 'white', fontSize: 11, fontWeight: FONTS.bold },

  phoneSection: { marginTop: SPACING.base },
  phoneInputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: SPACING.xs },
  phonePrefix: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.surfaceAlt, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.sm + 2, borderRightWidth: 1, borderRightColor: COLORS.border },
  phonePrefixText: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONTS.semiBold },
  phonePrefixCaret: { fontSize: 10, color: COLORS.textMuted },
  phoneInput: { flex: 1, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 2, fontSize: FONTS.lg, color: COLORS.textPrimary, letterSpacing: 2 },
  contactIconWrap: { paddingHorizontal: SPACING.sm },
  contactIcon: { fontSize: 18, opacity: 0.5 },
  phoneHint: { fontSize: FONTS.xs, color: COLORS.textMuted },

  // Peach secure-payment info box
  secureBox: { flexDirection: 'row', gap: SPACING.sm, backgroundColor: '#FFF1E6', borderRadius: RADIUS.lg, padding: SPACING.base, marginTop: SPACING.xl },
  secureBoxIcon: { fontSize: 20 },
  secureBoxText: { flex: 1 },
  secureBoxTitle: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: 2 },
  secureBoxDesc: { fontSize: FONTS.xs, color: COLORS.textSecondary, lineHeight: 18 },

  // Lipa pay button
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs, backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, paddingVertical: SPACING.base, marginTop: SPACING.xl, ...SHADOWS.md },
  payBtnDisabled: { opacity: 0.5 },
  payBtnLock: { fontSize: FONTS.base },
  payBtnText: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: 'white' },

  securedByText: { fontSize: FONTS.xs, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.base },
  securedByBrand: { color: COLORS.primary, fontWeight: FONTS.bold },

  // Trust badges row
  trustRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.xl, paddingTop: SPACING.base, borderTopWidth: 1, borderTopColor: COLORS.divider },
  trustItem: { flex: 1, alignItems: 'center', gap: 3 },
  trustIcon: { fontSize: 18 },
  trustTitle: { fontSize: 10, fontWeight: FONTS.semiBold, color: COLORS.textPrimary, textAlign: 'center' },
  trustSub: { fontSize: 9, color: COLORS.textMuted, textAlign: 'center' },

  // Provider brand row (styled text, not real logo artwork)
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.xl, paddingTop: SPACING.base, borderTopWidth: 1, borderTopColor: COLORS.divider },
  brandText: { fontSize: FONTS.sm, fontWeight: FONTS.black },
  brandDivider: { width: 1, height: 14, backgroundColor: COLORS.divider },

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
  secureIcon: { fontSize: FONTS.sm },
  secureText: { fontSize: FONTS.xs, color: COLORS.textMuted, textAlign: 'center' },
});