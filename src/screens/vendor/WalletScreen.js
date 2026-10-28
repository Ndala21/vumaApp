/**
 * VUMA Store — Seller Wallet & Payments
 * Real balance data (the withdraw summary and the vendor dashboard), real
 * withdrawal history (my-payouts), and a Withdraw sheet that works on iPhone
 * AND Android (the old Alert.prompt only worked on iPhone) —
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
import { t, i18n, useTranslation } from '../../i18n';
import { get, post } from '../../api/client';
import { vendorsAPI } from '../../api/vendors';
import WithdrawSheet from '../../components/WithdrawSheet';
import {
  tx, tsh, statusLabel, STATUS_STYLE, reasonText, METHOD_LABELS, errorText,
  holdRule, moneyStateText, MONEY_STYLE, lineFormula, groupDigits,
} from '../../utils/payouts';

const PAYMENT_METHODS = [
  { code: 'mpesa', label: 'M-Pesa', bg: '#4CAF50' },
  { code: 'tigopesa', label: 'Tigo Pesa', bg: '#0066B3' },
  { code: 'airtel', label: 'Airtel Money', bg: '#E4002B' },
  { code: 'halopesa', label: 'HaloPesa', bg: '#F7941D' },
  { code: 'nmb', label: 'NMB', bg: '#1B4F72' },
  { code: 'crdb', label: 'CRDB', bg: '#003D7A' },
];

export default function WalletScreen({ navigation }) {
  useTranslation();
  const lang = i18n.getLocale();
  const T = (key, vars) => tx(lang, key, vars);

  const [dashboard, setDashboard] = useState(null);
  const [summary, setSummary] = useState(null);
  const [profile, setProfile] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [statement, setStatement] = useState(null);
  const [moreBusy, setMoreBusy] = useState(false);
  const [salesFailed, setSalesFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const [dash, payoutData, sum, prof, stmt] = await Promise.all([
        vendorsAPI.getDashboard(),
        get('/vendors/payouts/my-payouts/'),
        vendorsAPI.getPayoutSummary().catch(() => null),
        vendorsAPI.getProfile().catch(() => null),
        vendorsAPI.getStatement({ limit: 20 }).catch(() => null),
      ]);
      setDashboard(dash);
      setPayouts(Array.isArray(payoutData) ? payoutData : []);
      setSummary(sum);
      setProfile(prof);
      setStatement(stmt && Array.isArray(stmt.lines) ? stmt : null);
      setSalesFailed(!stmt);
    } catch (e) {
      Alert.alert(t('common.error'), T('loadFail'));
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

  const showMore = async () => {
    if (!statement || moreBusy) return;
    setMoreBusy(true);
    try {
      const next = await vendorsAPI.getStatement({ limit: 20, offset: statement.lines.length });
      if (next && Array.isArray(next.lines)) {
        setStatement({ ...next, lines: [...statement.lines, ...next.lines] });
      }
    } catch (e) {
      Alert.alert(t('common.error'), T('salesFail'));
    } finally {
      setMoreBusy(false);
    }
  };

  const handleCancel = (payout) => {
    Alert.alert(T('cancelAsk'), tsh(payout.amount), [
      { text: T('no'), style: 'cancel' },
      {
        text: T('yes'),
        style: 'destructive',
        onPress: async () => {
          try {
            await vendorsAPI.cancelPayout(payout.id);
            load();
          } catch (e) {
            Alert.alert(t('common.error'), errorText(lang, e, summary));
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Off while a rule says no. "No account yet" keeps it on, because tapping it opens the account form.
  const btnOff = !!summary && !summary.can_request && summary.reason_code !== 'no_destination';
  const moneyNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
  const comingAmount = moneyNum(summary ? summary.coming : (statement && statement.balances && statement.balances.coming));
  const owesAmount = moneyNum(summary ? summary.owes : (statement && statement.balances && statement.balances.owes));

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
          <Text style={styles.balanceLabel}>{T('available')}</Text>
          <Text style={styles.balanceAmount}>{formatPrice(summary ? Number(summary.available) : (dashboard?.available_balance || 0))}</Text>
          <View style={styles.balanceSplitRow}>
            <View style={[styles.balanceSplitItem, styles.balanceSplitFirst]}>
              <Text style={styles.balanceSplitLabel}>{T('onHold')}</Text>
              <Text style={styles.balanceSplitValue} numberOfLines={1} adjustsFontSizeToFit>{formatPrice(dashboard?.pending_balance || 0)}</Text>
            </View>
            <View style={styles.balanceSplitDivider} />
            <View style={styles.balanceSplitItem}>
              <Text style={styles.balanceSplitLabel}>{T('inProgress')}</Text>
              <Text style={styles.balanceSplitValue} numberOfLines={1} adjustsFontSizeToFit>{formatPrice(summary ? Number(summary.in_progress) : 0)}</Text>
            </View>
            <View style={styles.balanceSplitDivider} />
            <View style={styles.balanceSplitItem}>
              <Text style={styles.balanceSplitLabel}>{T('totalEarned')}</Text>
              <Text style={styles.balanceSplitValue} numberOfLines={1} adjustsFontSizeToFit>{formatPrice(dashboard?.total_earnings || 0)}</Text>
            </View>
          </View>
          {comingAmount > 0 && (
            <Text style={styles.comingNote} testID="coming-note">
              {T('comingLabel')}: {tsh(comingAmount)}
            </Text>
          )}
          {owesAmount > 0 && (
            <Text style={styles.owesNote} testID="owes-note">{T('owesNote', { amount: groupDigits(owesAmount) })}</Text>
          )}
          <Text style={styles.holdNote} testID="hold-rule">{holdRule(lang, summary) || T('holdNote')}</Text>
          {!!summary && (
            <TouchableOpacity
              style={[styles.payoutBtn, btnOff && styles.payoutBtnOff]}
              onPress={() => setSheetOpen(true)}
              disabled={btnOff}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <Text style={[styles.payoutBtnText, btnOff && styles.payoutBtnTextOff]}>{T('withdraw')}</Text>
            </TouchableOpacity>
          )}
          {!!summary && !summary.can_request && !!summary.reason && (
            <Text style={styles.reasonText}>{reasonText(lang, summary)}</Text>
          )}
        </View>

        {/* The exact amount of every sale: sale - VUMA fee - payment cost = what you receive, and where the money is */}
        <Text style={styles.sectionTitle} testID="sales-title">{T('salesTitle')}</Text>
        {salesFailed ? (
          <Text style={styles.emptyText}>{T('salesFail')}</Text>
        ) : !statement || statement.lines.length === 0 ? (
          <Text style={styles.emptyText}>{T('salesEmpty')}</Text>
        ) : (
          statement.lines.map((line, idx) => {
            const style = MONEY_STYLE[line.state] || MONEY_STYLE.waiting;
            return (
              <View key={`${line.order_number}-${idx}`} style={styles.saleRow} testID={`sale-line-${line.order_number}`}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.saleTitle} numberOfLines={1}>
                    #{line.order_number} · {line.product_name}{line.quantity > 1 ? ` x${line.quantity}` : ''}
                  </Text>
                  <Text style={styles.saleDate}>{line.date}</Text>
                  <Text style={styles.saleFormula} testID={`sale-formula-${line.order_number}`}>{lineFormula(lang, line)}</Text>
                  <View style={[styles.payoutStatusPill, { backgroundColor: style.bg, alignSelf: 'flex-start', marginTop: 6 }]}>
                    <Text style={[styles.payoutStatusText, { color: style.fg }]}>
                      {style.icon} {moneyStateText(lang, line.state, line.releases_at)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.saleNet}>{tsh(line.net)}</Text>
              </View>
            );
          })
        )}
        {!!statement && statement.has_more && (
          <TouchableOpacity style={styles.moreBtn} onPress={showMore} disabled={moreBusy} accessibilityRole="button" testID="sales-more">
            <Text style={styles.moreBtnText}>{moreBusy ? '...' : T('salesMore')}</Text>
          </TouchableOpacity>
        )}

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

        {/* Withdrawals */}
        <Text style={styles.sectionTitle}>{T('history')}</Text>
        {payouts.length === 0 ? (
          <Text style={styles.emptyText}>{T('empty')}</Text>
        ) : (
          payouts.map((p) => {
            const colors = STATUS_STYLE[p.status] || STATUS_STYLE.pending;
            return (
              <View key={p.id} style={styles.payoutRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.payoutAmount}>{tsh(p.amount)}</Text>
                  <Text style={styles.payoutDate}>
                    {p.created_at ? p.created_at.slice(0, 10) : ''}
                    {p.destination ? ` · ${p.destination}` : (p.payout_method ? ` · ${METHOD_LABELS[p.payout_method] || p.payout_method}` : '')}
                  </Text>
                  {!!p.reference && <Text style={styles.payoutRef}>{p.reference}</Text>}
                  {p.status === 'failed' && !!p.failure_reason && (
                    <Text style={styles.payoutReason}>{T('reason')}: {p.failure_reason}</Text>
                  )}
                  {p.status === 'pending' && (
                    <TouchableOpacity onPress={() => handleCancel(p)} accessibilityRole="button">
                      <Text style={styles.cancelLink}>{T('cancel')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={[styles.payoutStatusPill, { backgroundColor: colors.bg }]}>
                  <Text style={[styles.payoutStatusText, { color: colors.fg }]}>{statusLabel(lang, p.status)}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <WithdrawSheet
        visible={sheetOpen}
        summary={summary}
        profile={profile}
        onClose={() => setSheetOpen(false)}
        onChanged={load}
      />
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
  balanceSplitItem: { flex: 1, paddingLeft: 10, paddingRight: 4 },
  balanceSplitFirst: { paddingLeft: 0 },
  balanceSplitDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.25)' },
  balanceSplitLabel: { fontSize: 10.5, color: 'rgba(255,255,255,0.75)', marginBottom: 2 },
  balanceSplitValue: { fontSize: FONTS.base, color: 'white', fontWeight: FONTS.bold },
  payoutBtn: { marginTop: SPACING.base, backgroundColor: 'white', borderRadius: RADIUS.full, paddingVertical: SPACING.sm + 2, alignItems: 'center' },
  payoutBtnText: { color: COLORS.primaryDark, fontSize: FONTS.base, fontWeight: FONTS.bold },
  payoutBtnOff: { backgroundColor: 'rgba(255,255,255,0.2)' },
  payoutBtnTextOff: { color: 'rgba(255,255,255,0.7)' },
  holdNote: { marginTop: SPACING.sm, fontSize: 10.5, color: 'rgba(255,255,255,0.8)', lineHeight: 15 },
  reasonText: { marginTop: SPACING.sm, fontSize: FONTS.xs, color: 'white', textAlign: 'center' },
  comingNote: { marginTop: SPACING.sm, fontSize: FONTS.sm, color: 'white', fontWeight: FONTS.bold },
  owesNote: { marginTop: SPACING.sm, fontSize: FONTS.xs, color: '#FFE2E2', lineHeight: 16, fontWeight: FONTS.bold },

  saleRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.xs, borderWidth: 1, borderColor: COLORS.border },
  saleTitle: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  saleDate: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  saleFormula: { fontSize: FONTS.xs, color: COLORS.textSecondary || COLORS.textMuted, marginTop: 4, lineHeight: 16 },
  saleNet: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.success, marginLeft: SPACING.sm },
  moreBtn: { alignSelf: 'center', paddingVertical: SPACING.sm, paddingHorizontal: SPACING.xl, marginTop: SPACING.xs, marginBottom: SPACING.base },
  moreBtnText: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.primary },

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
  payoutRef: { fontSize: 10.5, color: COLORS.textLight, marginTop: 2 },
  payoutReason: { fontSize: FONTS.xs, color: COLORS.danger, marginTop: 4 },
  cancelLink: { fontSize: FONTS.xs, fontWeight: FONTS.bold, color: COLORS.primary, marginTop: 6 },
  payoutStatusPill: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.full },
  payoutStatusText: { fontSize: 10.5, fontWeight: FONTS.bold },
});