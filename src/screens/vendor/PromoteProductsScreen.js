/**
 * VUMA Store — Promote Products (Seller Marketing)
 * Real flow: choose the fixed MVP package -> select up to 20 of your
 * own products -> pay via real AzamPay mobile money -> promotion only
 * activates once payment is genuinely confirmed. Never activated on
 * request alone.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  Platform, Alert, ScrollView, ActivityIndicator, Image,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../utils/constants';
import { formatPrice } from '../../utils/helpers';
import Button from '../../components/common/Button';
import { get, post } from '../../api/client';
import { useSelector } from 'react-redux';
import { selectMyProducts } from '../../store/productSlice';

const PROVIDERS = [
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'airtel', label: 'Airtel Money' },
  { value: 'halopesa', label: 'HaloPesa' },
  { value: 'tigopesa', label: 'Tigo Pesa' },
];

export default function PromoteProductsScreen({ navigation }) {
  const myProducts = useSelector(selectMyProducts);

  const [packageInfo, setPackageInfo] = useState(null);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState('list'); // 'list' | 'select' | 'payment' | 'processing' | 'success'
  const [selectedIds, setSelectedIds] = useState([]);
  const [draftPromo, setDraftPromo] = useState(null);
  const [phone, setPhone] = useState('');
  const [provider, setProvider] = useState('mpesa');
  const [submitting, setSubmitting] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pkg, promoData] = await Promise.all([
        get('/products/seller-promotions/package/'),
        get('/products/seller-promotions/'),
      ]);
      setPackageInfo(pkg);
      setPromotions(promoData?.promotions || []);
    } catch (e) {
      Alert.alert('Error', 'Could not load promotions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const toggleProduct = (id) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (packageInfo && prev.length >= packageInfo.max_products) {
        Alert.alert('Limit reached', `You can promote up to ${packageInfo.max_products} products.`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const startSelection = () => {
    setSelectedIds([]);
    setStep('select');
  };

  const confirmSelection = async () => {
    if (selectedIds.length === 0) {
      Alert.alert('Select products', 'Choose at least one product to promote.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await post('/products/seller-promotions/create/', { product_ids: selectedIds });
      setDraftPromo(result);
      setStep('payment');
    } catch (e) {
      Alert.alert('Error', 'Could not create the promotion. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitPayment = async () => {
    if (!phone.trim()) {
      Alert.alert('Phone required', 'Enter the phone number to receive the payment prompt.');
      return;
    }
    setSubmitting(true);
    try {
      await post(`/products/seller-promotions/${draftPromo.id}/initiate-payment/`, {
        phone: phone.trim(), provider,
      });
      setStep('processing');
      setPollCount(0);
      pollVerify(0);
    } catch (e) {
      const msg = e?.response?.data?.error || 'Could not start payment. Please try again.';
      Alert.alert('Payment Failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const pollVerify = useCallback(async (attempt) => {
    if (attempt >= 30) {
      Alert.alert('Taking too long', 'Payment is taking longer than expected. Check "My Promotions" shortly — it will activate automatically once confirmed.');
      setStep('list');
      loadAll();
      return;
    }
    try {
      const result = await post(`/products/seller-promotions/${draftPromo.id}/verify-payment/`, {});
      if (result.success && result.status === 'active') {
        setStep('success');
        loadAll();
        return;
      }
      if (result.status === 'failed') {
        Alert.alert('Payment Failed', result.message || 'The payment was not successful.');
        setStep('list');
        loadAll();
        return;
      }
    } catch (e) {
      // keep polling — a transient error shouldn't abort the whole flow
    }
    setTimeout(() => {
      setPollCount(attempt + 1);
      pollVerify(attempt + 1);
    }, 4000);
  }, [draftPromo, loadAll]);

  const handleRenew = async (promo) => {
    try {
      const result = await post(`/products/seller-promotions/${promo.id}/renew/`, {});
      setDraftPromo(result);
      setStep('payment');
    } catch (e) {
      Alert.alert('Error', 'Could not start renewal. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // ── Step: Select Products ──
  if (step === 'select') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep('list')}>
            <Text style={styles.headerBack}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Products</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.selectCountBar}>
          <Text style={styles.selectCountText}>{selectedIds.length} / {packageInfo?.max_products || 20} selected</Text>
        </View>
        <ScrollView contentContainerStyle={styles.selectList}>
          {myProducts.map((p) => {
            const checked = selectedIds.includes(p.id);
            return (
              <TouchableOpacity key={p.id} style={[styles.selectRow, checked && styles.selectRowActive]} onPress={() => toggleProduct(p.id)} activeOpacity={0.7}>
                <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                  {checked && <Text style={styles.checkboxTick}>✓</Text>}
                </View>
                {p.primary_image ? (
                  <Image source={{ uri: p.primary_image }} style={styles.selectImage} />
                ) : (
                  <View style={[styles.selectImage, styles.selectImagePlaceholder]}><Text>📦</Text></View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectName} numberOfLines={1}>{p.name}</Text>
                  <Text style={styles.selectPrice}>{formatPrice(p.price)}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
          {myProducts.length === 0 && (
            <Text style={styles.emptyText}>You don't have any products yet. Add a product first.</Text>
          )}
        </ScrollView>
        <View style={styles.footer}>
          <Button title={`Continue (${selectedIds.length} selected)`} onPress={confirmSelection} loading={submitting} disabled={selectedIds.length === 0} fullWidth />
        </View>
      </View>
    );
  }

  // ── Step: Payment ──
  if (step === 'payment' && draftPromo) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep('list')}>
            <Text style={styles.headerBack}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={styles.payScroll}>
          <View style={styles.payCard}>
            <Text style={styles.payLabel}>Amount to pay</Text>
            <Text style={styles.payAmount}>{formatPrice(draftPromo.amount)}</Text>
            <Text style={styles.paySub}>{draftPromo.product_count} product(s) · {packageInfo?.duration_days} days</Text>
          </View>

          <Text style={styles.fieldLabel}>Payment Method</Text>
          <View style={styles.providerRow}>
            {PROVIDERS.map((p) => (
              <TouchableOpacity key={p.value} style={[styles.providerChip, provider === p.value && styles.providerChipActive]} onPress={() => setProvider(p.value)}>
                <Text style={[styles.providerChipText, provider === p.value && styles.providerChipTextActive]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Phone Number</Text>
          <View style={styles.phoneRow}>
            <Text style={styles.phonePrefix}>+255</Text>
            <TextInputLike value={phone} onChangeText={setPhone} />
          </View>

          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>Payment is required before your promotion goes live. Your products will be promoted only after successful payment.</Text>
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <Button title={`Pay ${formatPrice(draftPromo.amount)}`} onPress={submitPayment} loading={submitting} fullWidth />
        </View>
      </View>
    );
  }

  // ── Step: Processing ──
  if (step === 'processing') {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.processingTitle}>Waiting for confirmation…</Text>
        <Text style={styles.processingSub}>Check your phone and enter your PIN to complete payment.</Text>
      </View>
    );
  }

  // ── Step: Success ──
  if (step === 'success') {
    return (
      <View style={styles.centerScreen}>
        <Text style={{ fontSize: 56 }}>🎉</Text>
        <Text style={styles.successTitle}>Your promotion is live!</Text>
        <Text style={styles.successSub}>Your products now have Sponsored placement for {packageInfo?.duration_days} days.</Text>
        <Button title="Done" onPress={() => setStep('list')} style={{ marginTop: SPACING.xl, width: 200 }} />
      </View>
    );
  }

  // ── Step: List (default) ──
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerBack}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Promote Products</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.listScroll} refreshControl={undefined}>
        {packageInfo && (
          <View style={styles.packageCard}>
            <View style={styles.packageBadge}><Text style={styles.packageBadgeText}>⭐ {packageInfo.name}</Text></View>
            <Text style={styles.packagePrice}>{formatPrice(packageInfo.amount)} <Text style={styles.packagePriceSub}>/ {packageInfo.duration_days} Days</Text></Text>
            {[
              `Promote up to ${packageInfo.max_products} products`,
              'Sponsored placement in eligible areas',
              'More visibility to potential customers',
            ].map((line, i) => (
              <Text key={i} style={styles.packageFeature}>✓ {line}</Text>
            ))}
            <Button title="Start New Promotion" onPress={startSelection} style={{ marginTop: SPACING.base }} fullWidth />
          </View>
        )}

        <Text style={styles.sectionTitle}>My Promotions</Text>
        {promotions.length === 0 ? (
          <Text style={styles.emptyText}>You haven't promoted any products yet.</Text>
        ) : (
          promotions.map((p) => (
            <View key={p.id} style={styles.promoCard}>
              <View style={styles.promoTopRow}>
                <Text style={styles.promoName}>{p.package_name}</Text>
                <View style={[styles.promoStatusPill,
                  p.is_currently_active ? styles.statusActive : p.status === 'draft' ? styles.statusDraft : styles.statusExpired]}>
                  <Text style={[styles.promoStatusText,
                    p.is_currently_active ? styles.statusActiveText : p.status === 'draft' ? styles.statusDraftText : styles.statusExpiredText]}>
                    {p.is_currently_active ? 'Active' : p.payment_status === 'pending' ? 'Awaiting Payment' : p.status === 'expired' ? 'Expired' : p.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.promoProducts} numberOfLines={1}>{p.product_names.join(', ')}{p.product_count > 5 ? ` +${p.product_count - 5} more` : ''}</Text>
              {p.is_currently_active ? (
                <Text style={styles.promoMeta}>{p.start_date} → {p.end_date} · {p.remaining_days} days left</Text>
              ) : (
                <Text style={styles.promoMeta}>Created {p.created_at}</Text>
              )}
              {p.status === 'expired' && (
                <Button title="Renew Promotion" small outline onPress={() => handleRenew(p)} style={{ marginTop: SPACING.sm }} />
              )}
              {p.status === 'draft' && p.payment_status === 'pending' && (
                <Button title="Complete Payment" small onPress={() => { setDraftPromo(p); setStep('payment'); }} style={{ marginTop: SPACING.sm }} />
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

// Minimal styled text input, avoiding importing a new dependency for
// this one field.
function TextInputLike({ value, onChangeText }) {
  const { TextInput } = require('react-native');
  return (
    <TextInput
      style={styles.phoneInput}
      value={value}
      onChangeText={onChangeText}
      placeholder="7XX XXX XXX"
      keyboardType="phone-pad"
      maxLength={12}
      placeholderTextColor={COLORS.textLight}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centerScreen: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.primary, paddingHorizontal: SPACING.base,
    paddingTop: Platform.OS === 'ios' ? 50 : SPACING.base, paddingBottom: SPACING.base,
  },
  headerBack: { fontSize: 22, color: 'white', fontWeight: FONTS.bold },
  headerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: 'white' },

  listScroll: { padding: SPACING.base, paddingBottom: 60 },
  packageCard: { backgroundColor: '#FFF3E8', borderRadius: RADIUS.xl, padding: SPACING.base, marginBottom: SPACING.xl, borderWidth: 1, borderColor: 'rgba(255,106,0,0.25)' },
  packageBadge: { alignSelf: 'flex-start', backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 4, marginBottom: SPACING.sm },
  packageBadgeText: { color: 'white', fontSize: FONTS.xs, fontWeight: FONTS.bold },
  packagePrice: { fontSize: 26, fontWeight: FONTS.black, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  packagePriceSub: { fontSize: FONTS.sm, fontWeight: FONTS.medium, color: COLORS.textMuted },
  packageFeature: { fontSize: FONTS.sm, color: COLORS.textSecondary, marginBottom: 4 },

  sectionTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  emptyText: { fontSize: FONTS.sm, color: COLORS.textMuted, textAlign: 'center', padding: SPACING.xl },

  promoCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  promoTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  promoName: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  promoStatusPill: { paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.full },
  statusActive: { backgroundColor: COLORS.successLight },
  statusActiveText: { color: COLORS.successText },
  statusDraft: { backgroundColor: '#FFF3CD' },
  statusDraftText: { color: '#8A6D00' },
  statusExpired: { backgroundColor: COLORS.surfaceSunken },
  statusExpiredText: { color: COLORS.textMuted },
  promoStatusText: { fontSize: FONTS.xs, fontWeight: FONTS.bold, textTransform: 'capitalize' },
  promoProducts: { fontSize: FONTS.sm, color: COLORS.textSecondary, marginBottom: 2 },
  promoMeta: { fontSize: FONTS.xs, color: COLORS.textMuted },

  // Select products
  selectCountBar: { backgroundColor: COLORS.primaryFade, paddingVertical: SPACING.sm, alignItems: 'center' },
  selectCountText: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.primaryDark },
  selectList: { padding: SPACING.base, paddingBottom: 100 },
  selectRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.sm, marginBottom: SPACING.xs, borderWidth: 1.5, borderColor: COLORS.border },
  selectRowActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryFade },
  checkbox: { width: 22, height: 22, borderRadius: RADIUS.sm, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkboxTick: { color: 'white', fontSize: FONTS.xs, fontWeight: FONTS.bold },
  selectImage: { width: 44, height: 44, borderRadius: RADIUS.md },
  selectImagePlaceholder: { backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  selectName: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textPrimary },
  selectPrice: { fontSize: FONTS.xs, color: COLORS.primary, fontWeight: FONTS.bold },

  footer: { padding: SPACING.base, borderTopWidth: 1, borderTopColor: COLORS.divider, backgroundColor: COLORS.surface },

  // Payment
  payScroll: { padding: SPACING.base, paddingBottom: 100 },
  payCard: { backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, padding: SPACING.xl, alignItems: 'center', marginBottom: SPACING.xl },
  payLabel: { fontSize: FONTS.sm, color: 'rgba(255,255,255,0.85)', marginBottom: 4 },
  payAmount: { fontSize: 32, fontWeight: FONTS.black, color: 'white', marginBottom: 4 },
  paySub: { fontSize: FONTS.xs, color: 'rgba(255,255,255,0.8)' },
  fieldLabel: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary, marginBottom: SPACING.xs, marginTop: SPACING.sm },
  providerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.base },
  providerChip: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surfaceAlt },
  providerChipActive: { backgroundColor: COLORS.primaryFade, borderColor: COLORS.primary },
  providerChipText: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  providerChipTextActive: { color: COLORS.primaryDark, fontWeight: FONTS.bold },
  phoneRow: { flexDirection: 'row', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, overflow: 'hidden' },
  phonePrefix: { backgroundColor: COLORS.surfaceAlt, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 4, fontSize: FONTS.base, fontWeight: FONTS.semiBold, color: COLORS.textSecondary },
  phoneInput: { flex: 1, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 4, fontSize: FONTS.base, color: COLORS.textPrimary },
  noticeBox: { backgroundColor: '#E8F3FF', borderRadius: RADIUS.lg, padding: SPACING.base, marginTop: SPACING.base },
  noticeText: { fontSize: FONTS.xs, color: '#2563EB', lineHeight: 17 },

  processingTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginTop: SPACING.base },
  processingSub: { fontSize: FONTS.sm, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.xs },
  successTitle: { fontSize: FONTS.xl, fontWeight: FONTS.black, color: COLORS.textPrimary, marginTop: SPACING.base },
  successSub: { fontSize: FONTS.sm, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.xs },
});