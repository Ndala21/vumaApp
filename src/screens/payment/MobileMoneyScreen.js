/**
 * VUMA Store — Mobile Money Payment Screen
 * AzamPay: M-Pesa, Airtel, Tigo Pesa, HaloPesa
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  TextInput, Alert, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
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

export default function MobileMoneyScreen({ navigation, route }) {
  const { orderId, amount, orderNumber } = route?.params || {};

  const [selectedProvider, setSelectedProvider] = useState(null);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('select'); // select | confirm | waiting | success | failed

  const handlePay = async () => {
    if (!selectedProvider) { Alert.alert('Required', 'Please select a payment method.'); return; }
    if (!phone.trim() || phone.trim().length < 9) { Alert.alert('Required', 'Enter a valid phone number.'); return; }

    setLoading(true);
    setStep('waiting');

    try {
      const result = await post('/payments/mobile-money/initiate/', {
        provider: selectedProvider.id,
        phone: phone.trim(),
        amount: amount,
        order_id: orderId,
      });

      if (result.success || result.transaction_id) {
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
      Alert.alert('Error', 'Payment failed. Please check your phone and try again.');
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
          Please check your phone.{'\n'}
          Enter your {selectedProvider?.name} PIN to confirm.
        </Text>
        <View style={styles.waitingCard}>
          <Text style={styles.waitingProvider}>{selectedProvider?.icon} {selectedProvider?.name}</Text>
          <Text style={styles.waitingAmount}>TZS {Number(amount).toLocaleString()}</Text>
          <Text style={styles.waitingPhone}>{phone}</Text>
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
          TZS {Number(amount).toLocaleString()} paid via {selectedProvider?.name}
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
        <Text style={styles.failedText}>Please check your balance and try again.</Text>
        <Button title="Try Again" onPress={() => setStep('select')} style={styles.retryBtn} />
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
          onPress={handlePay}
          loading={loading}
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
