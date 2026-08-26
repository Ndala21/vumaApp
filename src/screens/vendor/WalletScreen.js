/**
 * VUMA Store — Seller Wallet & Payments
 * Real balance data (from the vendor dashboard endpoint), real payout
 * history (from the real my-payouts endpoint), real Request Payout —
 * plus the supported payment methods + AzamPay trust section.
 *
 * No brand logo image assets are bundled/confirmed in this app, so
 * payment methods are shown as clean colored text badges, consistent
 * with the emoji/text-badge style used everywhere else in VUMA tonight
 * — not real logo images I can't verify exist.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, Platform, Alert, RefreshControl, ActivityIndicator,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../utils/constants';
import { formatPrice } from '../../utils/helpers';
import { t } from '../../i18n';
import { get, post } from '../../api/client';
import { vendorsAPI } from '../../api/vendors';

const PAYMENT_METHODS = [
  { code: 'mpesa', label: 'M-Pesa', bg: '#4CAF50' },
  { code: 'tigopesa', label: 'Tigo Pesa', bg: '#0066B3' },
  { code: 'airtel', label: 'Airtel Money', bg: '#E4002B' },
  { code: 'halopesa', label: 'HaloPesa', bg: '#F7941D' },
  { code: 'nmb', label: 'NMB', bg: '#1B4F72' },
  { code: 'crdb', label: 'CRDB', bg: '#003D7A' },
];

const STATUS_COLORS = {
  pending: { bg: '#FFF3CD', text: '#8A6D00' },
  processing: { bg: '#E8F3FF', text: '#2563EB' },
  paid: { bg: '#E4F7EC', text: '#1B9C5A' },
  failed: { bg: '#FDE8EA', text: '#D32F2F' },
};

export default function WalletScreen({ navigation }) {
  const [dashboard, setDashboard] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [dash, payoutData] = await Promise.all([
        vendorsAPI.getDashboard(),
        get('/vendors/payouts/my-payouts/'),
      ]);
      setDashboard(dash);
      setPayouts(Array.isArray(payoutData) ? payoutData : []);
    } catch (e) {
      Alert.alert('Error', 'Could not load wallet data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleRequestPayout = () => {
    Alert.prompt(
      t('vendor.requestPayout'),
      `Available: ${formatPrice(dashboard?.available_balance || 0)}\nEnter amount:`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async (amount) => {
            if (!amount || isNaN(amount)) return;
            try {
              await vendorsAPI.requestPayout(Number(amount));
              Alert.alert(t('common.ok'), 'Payout request submitted!');
              load();
            } catch (e) {
              const msg = e?.response?.data?.error || 'Could not submit request.';
              Alert.alert(t('common.error'), msg);
            }
          },
        },
      ],
      'plain-text'
    );
  };

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerBack}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet & Payments</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
      >
        {/* Balance card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>{formatPrice(dashboard?.available_balance || 0)}</Text>
          <View style={styles.balanceSplitRow}>
            <View style={styles.balanceSplitItem}>
              <Text style={styles.balanceSplitLabel}>Pending</Text>
              <Text style={styles.balanceSplitValue}>{formatPrice(dashboard?.pending_balance || 0)}</Text>
            </View>
            <View style={styles.balanceSplitDivider} />
            <View style={styles.balanceSplitItem}>
              <Text style={styles.balanceSplitLabel}>Total Earned</Text>
              <Text style={styles.balanceSplitValue}>{formatPrice(dashboard?.total_earnings || 0)}</Text>
            </View>
          </View>
          {(dashboard?.available_balance || 0) > 0 && (
            <TouchableOpacity style={styles.payoutBtn} onPress={handleRequestPayout} activeOpacity={0.85}>
              <Text style={styles.payoutBtnText}>Request Payout</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Payment Methods */}
        <Text style={styles.sectionTitle}>Payment Methods We Support</Text>
        <View style={styles.methodsGrid}>
          {PAYMENT_METHODS.map((m) => (
            <View key={m.code} style={[styles.methodBadge, { backgroundColor: m.bg }]}>
              <Text style={styles.methodBadgeText}>{m.label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.trustRow}>
          <Text style={styles.trustIcon}>🔒</Text>
          <Text style={styles.trustText}>Secure payment — Secured by AzamPay</Text>
        </View>

        {/* Payout History */}
        <Text style={styles.sectionTitle}>Payout History</Text>
        {payouts.length === 0 ? (
          <Text style={styles.emptyText}>No payout requests yet.</Text>
        ) : (
          payouts.map((p) => {
            const colors = STATUS_COLORS[p.status] || STATUS_COLORS.pending;
            return (
              <View key={p.id} style={styles.payoutRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.payoutAmount}>{p.currency || 'TZS'} {Number(p.amount).toLocaleString()}</Text>
                  <Text style={styles.payoutDate}>{p.created_at ? p.created_at.slice(0, 10) : ''} · {p.payout_method}</Text>
                </View>
                <View style={[styles.payoutStatusPill, { backgroundColor: colors.bg }]}>
                  <Text style={[styles.payoutStatusText, { color: colors.text }]}>{p.status}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centerScreen: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.primary, paddingHorizontal: SPACING.base,
    paddingTop: Platform.OS === 'ios' ? 50 : SPACING.base, paddingBottom: SPACING.base,
  },
  headerBack: { fontSize: 22, color: 'white', fontWeight: FONTS.bold },
  headerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: 'white' },
  scroll: { padding: SPACING.base, paddingBottom: 60 },

  balanceCard: { backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, padding: SPACING.xl, marginBottom: SPACING.xl },
  balanceLabel: { fontSize: FONTS.sm, color: 'rgba(255,255,255,0.85)', marginBottom: 4 },
  balanceAmount: { fontSize: 32, fontWeight: FONTS.black, color: 'white', marginBottom: SPACING.base },
  balanceSplitRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.25)', paddingTop: SPACING.sm },
  balanceSplitItem: { flex: 1 },
  balanceSplitDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.25)' },
  balanceSplitLabel: { fontSize: 10.5, color: 'rgba(255,255,255,0.75)', marginBottom: 2 },
  balanceSplitValue: { fontSize: FONTS.base, color: 'white', fontWeight: FONTS.bold },
  payoutBtn: { marginTop: SPACING.base, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: RADIUS.full, paddingVertical: SPACING.sm, alignItems: 'center' },
  payoutBtnText: { color: 'white', fontSize: FONTS.sm, fontWeight: FONTS.bold },

  sectionTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm, marginTop: SPACING.sm },
  methodsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.sm },
  methodBadge: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm, borderRadius: RADIUS.md },
  methodBadgeText: { color: 'white', fontSize: FONTS.xs, fontWeight: FONTS.bold },
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.xl },
  trustIcon: { fontSize: FONTS.sm },
  trustText: { fontSize: FONTS.xs, color: COLORS.textMuted, fontWeight: FONTS.medium },

  emptyText: { fontSize: FONTS.sm, color: COLORS.textMuted, textAlign: 'center', padding: SPACING.xl },
  payoutRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.xs, borderWidth: 1, borderColor: COLORS.border },
  payoutAmount: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  payoutDate: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2, textTransform: 'capitalize' },
  payoutStatusPill: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.full },
  payoutStatusText: { fontSize: 10.5, fontWeight: FONTS.bold, textTransform: 'capitalize' },
});