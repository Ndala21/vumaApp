/**
 * VUMA Store — Bank Transfer Payment Screen
 * AzamPay bank checkout: CRDB, NMB
 * Flow: select bank -> account number -> confirm account holder name ->
 * enter phone + OTP from bank -> pay
 */

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  TextInput, Alert, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../utils/constants';
import Button from '../../components/common/Button';
import { post } from '../../api/client';

const BANKS = [
  { id: 'crdb', name: 'CRDB Bank', icon: '🏦', color: '#00563F' },
  { id: 'nmb',  name: 'NMB Bank',  icon: '🏦', color: '#F7941D' },
];

export default function BankTransferScreen({ navigation, route }) {
  const { orderId, amount, orderNumber } = route?.params || {};

  const [selectedBank, setSelectedBank] = useState(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('form'); // form | confirmed | waiting | success | failed

  const handleLookup = async () => {
    if (!selectedBank) { Alert.alert('Required', 'Please select your bank.'); return; }
    if (!accountNumber.trim() || accountNumber.trim().length < 5) {
      Alert.alert('Required', 'Enter a valid account number.');
      return;
    }
    setLookingUp(true);
    try {
      const result = await post('/payments/mobile-money/bank-name-lookup/', {
        provider: selectedBank.id,
        account_number: accountNumber.trim(),
      });
      if (result.success && result.account_name) {
        setAccountName(result.account_name);
        setStep('confirmed');
      } else {
        Alert.alert('Could Not Verify', result.error || 'Could not verify this account number. Please check and try again.');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not verify account. Please check the number and try again.');
    } finally {
      setLookingUp(false);
    }
  };

  const handlePay = async () => {
    if (!phone.trim() || phone.trim().length < 9) { Alert.alert('Required', 'Enter a valid phone number.'); return; }
    if (!otp.trim()) { Alert.alert('Required', 'Enter the OTP sent by your bank.'); return; }

    setLoading(true);
    setStep('waiting');

    try {
      const result = await post('/payments/mobile-money/bank-checkout/', {
        provider: selectedBank.id,
        account_number: accountNumber.trim(),
        phone: phone.trim(),
        otp: otp.trim(),
        amount: amount,
        order_id: orderId,
      });

      if (result.success) {
        setStep('success');
        setTimeout(() => {
          navigation.navigate('OrderDetail', { orderId });
        }, 3000);
      } else {
        setStep('failed');
        Alert.alert('Payment Failed', result.error || 'Please try again.');
      }
    } catch (e) {
      setStep('failed');
      Alert.alert('Error', 'Payment failed. Please check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Waiting Screen ────────────────────────────────
  if (step === 'waiting') {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.waitingTitle}>Processing Payment...</Text>
        <Text style={styles.waitingText}>
          Confirming your bank transfer.{'\n'}This may take a moment.
        </Text>
        <View style={styles.waitingCard}>
          <Text style={styles.waitingProvider}>{selectedBank?.icon} {selectedBank?.name}</Text>
          <Text style={styles.waitingAmount}>TZS {Number(amount).toLocaleString()}</Text>
          <Text style={styles.waitingPhone}>{accountName}</Text>
        </View>
        <Text style={styles.waitingFooter}>Do not close this screen</Text>
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
          TZS {Number(amount).toLocaleString()} paid via {selectedBank?.name}
        </Text>
        <Text style={styles.successSub}>Taking you to your order...</Text>
      </View>
    );
  }

  // ── Failed Screen ─────────────────────────────────
  if (step === 'failed') {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.failedIcon}>❌</Text>
        <Text style={styles.failedTitle}>Payment Failed</Text>
        <Text style={styles.failedText}>Please check your details and try again.</Text>
        <Button title="Try Again" onPress={() => setStep('confirmed')} style={styles.retryBtn} />
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pay by Bank Transfer</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Amount */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Order #{orderNumber}</Text>
          <Text style={styles.amountValue}>TZS {Number(amount).toLocaleString()}</Text>
          <Text style={styles.amountSub}>Total to pay</Text>
        </View>

        {step === 'form' && (
          <>
            {/* Bank Selection */}
            <Text style={styles.sectionTitle}>Select Your Bank</Text>
            {BANKS.map(bank => (
              <TouchableOpacity
                key={bank.id}
                style={[
                  styles.providerCard,
                  selectedBank?.id === bank.id && { borderColor: bank.color, backgroundColor: bank.color + '10' },
                ]}
                onPress={() => setSelectedBank(bank)}
                activeOpacity={0.85}
              >
                <View style={[styles.providerLogo, { backgroundColor: bank.color }]}>
                  <Text style={styles.providerLogoText}>{bank.icon}</Text>
                </View>
                <View style={styles.providerInfo}>
                  <Text style={styles.providerName}>{bank.name}</Text>
                </View>
                <View style={[
                  styles.providerRadio,
                  selectedBank?.id === bank.id && { backgroundColor: bank.color, borderColor: bank.color },
                ]}>
                  {selectedBank?.id === bank.id && <Text style={styles.radioCheck}>✓</Text>}
                </View>
              </TouchableOpacity>
            ))}

            {/* Account Number */}
            {selectedBank && (
              <View style={styles.phoneSection}>
                <Text style={styles.sectionTitle}>{selectedBank.name} Account Number</Text>
                <TextInput
                  style={styles.accountInput}
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  placeholder="Enter your account number"
                  keyboardType="number-pad"
                  placeholderTextColor={COLORS.textLight}
                />
                <Text style={styles.phoneHint}>We'll verify this account before charging you</Text>

                <Button
                  title={lookingUp ? 'Verifying...' : 'Verify Account'}
                  onPress={handleLookup}
                  loading={lookingUp}
                  disabled={!accountNumber.trim()}
                  fullWidth
                  style={styles.payBtn}
                />
              </View>
            )}
          </>
        )}

        {step === 'confirmed' && (
          <>
            <View style={styles.confirmCard}>
              <Text style={styles.confirmIcon}>✓</Text>
              <Text style={styles.confirmLabel}>Confirm this is your account</Text>
              <Text style={styles.confirmName}>{accountName}</Text>
              <Text style={styles.confirmAccount}>{selectedBank.name} — {accountNumber}</Text>
              <TouchableOpacity onPress={() => setStep('form')}>
                <Text style={styles.confirmChange}>Not you? Change account</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.phoneSection}>
              <Text style={styles.sectionTitle}>Phone Number on File with {selectedBank.name}</Text>
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

              <Text style={[styles.sectionTitle, { marginTop: SPACING.base }]}>OTP from Your Bank</Text>
              <TextInput
                style={styles.accountInput}
                value={otp}
                onChangeText={setOtp}
                placeholder="Enter the OTP your bank sent you"
                keyboardType="number-pad"
                placeholderTextColor={COLORS.textLight}
              />
              <Text style={styles.phoneHint}>
                Your bank will send this when you authorize this transfer
              </Text>
            </View>

            <Button
              title={`Pay TZS ${Number(amount).toLocaleString()}`}
              onPress={handlePay}
              loading={loading}
              disabled={!phone.trim() || !otp.trim()}
              fullWidth
              style={styles.payBtn}
            />
          </>
        )}

        <View style={styles.secureNote}>
          <Text style={styles.secureIcon}>🔒</Text>
          <Text style={styles.secureText}>Powered by AzamPay — Secure Tanzanian Payment Gateway</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  providerRadio: { width: 24, height: 24, borderRadius: RADIUS.full, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  radioCheck: { color: 'white', fontSize: FONTS.xs, fontWeight: FONTS.bold },
  phoneSection: { marginTop: SPACING.base },
  accountInput: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 2, fontSize: FONTS.lg, color: COLORS.textPrimary, marginBottom: SPACING.xs, backgroundColor: COLORS.surface },
  phoneInputWrap: { flexDirection: 'row', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: SPACING.xs },
  phonePrefix: { backgroundColor: COLORS.surfaceAlt, paddingHorizontal: SPACING.sm, justifyContent: 'center', borderRightWidth: 1, borderRightColor: COLORS.border },
  phonePrefixText: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONTS.semiBold },
  phoneInput: { flex: 1, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 2, fontSize: FONTS.lg, color: COLORS.textPrimary, letterSpacing: 2 },
  phoneHint: { fontSize: FONTS.xs, color: COLORS.textMuted },
  payBtn: { marginTop: SPACING.base, borderRadius: RADIUS.xl },
  secureNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs, marginTop: SPACING.base },
  secureIcon: { fontSize: FONTS.sm },
  secureText: { fontSize: FONTS.xs, color: COLORS.textMuted, textAlign: 'center' },
  confirmCard: { backgroundColor: COLORS.successLight, borderRadius: RADIUS.xl, padding: SPACING.xl, alignItems: 'center', marginBottom: SPACING.base, borderWidth: 1, borderColor: COLORS.success },
  confirmIcon: { fontSize: 40, color: COLORS.success, marginBottom: SPACING.sm },
  confirmLabel: { fontSize: FONTS.sm, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  confirmName: { fontSize: FONTS.xl, fontWeight: FONTS.black, color: COLORS.textPrimary, marginBottom: 4 },
  confirmAccount: { fontSize: FONTS.sm, color: COLORS.textMuted, marginBottom: SPACING.sm },
  confirmChange: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.semiBold },
  // Center screens
  centerScreen: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  waitingTitle: { fontSize: FONTS['2xl'], fontWeight: FONTS.bold, color: COLORS.textPrimary, marginTop: SPACING.xl, marginBottom: SPACING.sm },
  waitingText: { fontSize: FONTS.base, color: COLORS.textMuted, textAlign: 'center', lineHeight: 24, marginBottom: SPACING.xl },
  waitingCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, alignItems: 'center', width: '100%', ...SHADOWS.md },
  waitingProvider: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  waitingAmount: { fontSize: FONTS['3xl'], fontWeight: FONTS.black, color: COLORS.primary, marginBottom: SPACING.sm },
  waitingPhone: { fontSize: FONTS.base, color: COLORS.textMuted },
  waitingFooter: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: SPACING.xl },
  successIcon: { fontSize: 80, marginBottom: SPACING.base },
  successTitle: { fontSize: FONTS['2xl'], fontWeight: FONTS.black, color: COLORS.success, marginBottom: SPACING.sm },
  successText: { fontSize: FONTS.base, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.xs },
  successSub: { fontSize: FONTS.sm, color: COLORS.textMuted },
  failedIcon: { fontSize: 80, marginBottom: SPACING.base },
  failedTitle: { fontSize: FONTS['2xl'], fontWeight: FONTS.black, color: COLORS.danger, marginBottom: SPACING.sm },
  failedText: { fontSize: FONTS.base, color: COLORS.textMuted, textAlign: 'center', marginBottom: SPACING.xl },
  retryBtn: { minWidth: 200, marginBottom: SPACING.base },
  cancelText: { fontSize: FONTS.sm, color: COLORS.textMuted },
});