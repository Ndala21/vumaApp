/**
 * VUMA Store — Wallet Screen
 * A closed wallet: gift money (with its end dates), invite rewards and refunds come in,
 * orders are paid out of it. No deposit, no withdraw, no transfer to a person.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/authSlice';
import {
  COLORS,
  FONTS,
  SPACING,
  RADIUS,
  SHADOWS,
} from '../../utils/constants';
import {
  formatPrice,
  formatDateTime,
  getErrorMessage,
} from '../../utils/helpers';
import { paymentsAPI } from '../../api/payments';
import Loading from '../../components/common/Loading';
import {
  FullScreenError,
  EmptyState,
} from '../../components/common/ErrorMessage';
import { t } from '../../i18n';
import {
  giftLots,
  nextEnding,
  daysLeftText,
  refundStatus,
  refundMessage,
} from '../../utils/walletInfo';

const TX_ICONS = {
  order_payment: '🛒',
  refund: '↩️',
  payout: '💸',
  commission: '📊',
  promo_credit: '🎁',
  referral_reward: '🎁',
  promo_expiry: '⌛',
  adjustment: '🛠️',
};

// the words for a transaction type; anything new falls back to the plain type name
const TX_LABELS = {
  order_payment: 'wallet.txOrder',
  refund: 'wallet.txRefund',
  promo_credit: 'wallet.txPromo',
  referral_reward: 'wallet.txReferral',
  promo_expiry: 'wallet.txGiftEnded',
  adjustment: 'wallet.txAdjustment',
};

const REFUND_TONES = {
  done: { bg: COLORS.successLight, fg: COLORS.successText },
  wait: { bg: COLORS.warningLight, fg: COLORS.warningText },
  stop: { bg: COLORS.surfaceAlt, fg: COLORS.textMuted },
};

const txLabel = (type) => {
  const key = TX_LABELS[type];
  if (key) return t(key);
  return String(type || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

export default function WalletScreen({ navigation }) {
  const user = useSelector(selectUser);

  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [walletData, txData, refundData] = await Promise.all([
        paymentsAPI.getWallet(),
        paymentsAPI.getTransactions({ page: 1 }),
        // an older server has no refund list: the screen simply shows none
        paymentsAPI.getMyRefunds().catch(() => null),
      ]);
      setWallet(walletData);
      setTransactions(txData.results || txData || []);
      const list = refundData && (refundData.results || refundData);
      setRefunds(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  if (loading) return <Loading fullScreen />;
  if (error) return <FullScreenError error={error} onRetry={loadData} />;

  const lots = giftLots(wallet);
  const ending = nextEnding(wallet);

  const renderTx = (tx, i) => {
    const isIncoming = tx.receiver_email === user?.email && tx.tx_type !== 'order_payment';
    return (
      <View key={tx.id || i} style={styles.txItem}>
        <View style={styles.txIconWrap}>
          <Text style={styles.txIcon}>{TX_ICONS[tx.tx_type] || '💳'}</Text>
        </View>
        <View style={styles.txInfo}>
          <Text style={styles.txType}>{txLabel(tx.tx_type)}</Text>
          <Text style={styles.txDescription} numberOfLines={1}>{tx.description || '-'}</Text>
          <Text style={styles.txDate}>{formatDateTime(tx.created_at)}</Text>
        </View>
        <View style={styles.txAmountWrap}>
          <Text style={[styles.txAmount, { color: isIncoming ? COLORS.success : COLORS.danger }]}>
            {isIncoming ? '+' : '-'}{formatPrice(tx.amount)}
          </Text>
          <View style={[styles.txStatusBadge, { backgroundColor: tx.status === 'success' ? COLORS.successLight : COLORS.warningLight }]}>
            <Text style={[styles.txStatusText, { color: tx.status === 'success' ? COLORS.successText : COLORS.warningText }]}>
              {tx.status}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderRefund = (refund) => {
    const status = refundStatus(refund);
    const tone = REFUND_TONES[status.tone] || REFUND_TONES.wait;
    return (
      <View key={refund.id} style={styles.refundItem} testID={`wallet-refund-${refund.id}`}>
        <View style={styles.refundTop}>
          <Text style={styles.refundOrder}>{t('wallet.refundOrder', { order: refund.order_number || refund.reference })}</Text>
          <Text style={styles.refundAmount}>{formatPrice(Number(refund.amount))}</Text>
        </View>
        <View style={[styles.refundPill, { backgroundColor: tone.bg }]}>
          <Text style={[styles.refundPillText, { color: tone.fg }]}>{status.label}</Text>
        </View>
        <Text style={styles.refundMessage}>{refundMessage(refund)}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('wallet.vumaWallet')}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>{t('wallet.totalBalance')}</Text>
          <Text style={styles.balanceAmount}>{formatPrice(wallet?.balance || 0)}</Text>
          <Text style={styles.balanceCurrency}>TZS • {user?.username}</Text>
          {Number(wallet?.promo_balance) > 0 && (
            <View style={styles.promoPill} testID="wallet-gift-pill">
              <Text style={styles.promoPillText}>
                🎁 {t('wallet.giftTitle')}: {formatPrice(wallet.promo_balance)}. {t('wallet.giftIntro')}
              </Text>
              {ending ? (
                <Text
                  testID="wallet-next-ends"
                  style={[styles.promoPillText, styles.promoPillEnds, ending.soon && styles.promoPillSoon]}
                >
                  ⏳ {ending.line}
                </Text>
              ) : null}
            </View>
          )}
          {wallet?.is_frozen && (
            <View style={styles.frozenBadge}>
              <Text style={styles.frozenText}>{t('wallet.frozen')}</Text>
            </View>
          )}
        </View>

        <View style={styles.actionsRow}>
          {[
            { key: 'invite', icon: '🎁', label: t('wallet.invite'), onPress: () => navigation.navigate('Referral') },
            { key: 'shop', icon: '🛍️', label: t('wallet.shop'), onPress: () => navigation.navigate('Tabs') },
          ].map((action) => (
            <TouchableOpacity
              key={action.key}
              testID={`wallet-action-${action.key}`}
              style={styles.actionBtn}
              onPress={action.onPress}
            >
              <View style={styles.actionIconWrap}>
                <Text style={styles.actionIcon}>{action.icon}</Text>
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {lots.length > 0 && (
          <View style={styles.section} testID="wallet-gift-lots">
            <Text style={styles.sectionTitle}>🎁 {t('wallet.giftTitle')}</Text>
            {lots.map((lot) => (
              <View key={lot.id} style={styles.lotRow} testID={`wallet-lot-${lot.id}`}>
                <View style={styles.lotInfo}>
                  <Text style={styles.lotLabel}>{lot.label}</Text>
                  <Text style={[styles.lotEnds, lot.soon && styles.lotEndsSoon]}>
                    {lot.endsAt
                      ? `${t('wallet.endsOn', { date: lot.endsText })} - ${daysLeftText(lot.days)}`
                      : t('wallet.noEnd')}
                  </Text>
                </View>
                <Text style={styles.lotAmount}>{t('wallet.lotLeft', { amount: formatPrice(lot.left) })}</Text>
              </View>
            ))}
          </View>
        )}

        {refunds.length > 0 && (
          <View style={styles.section} testID="wallet-refunds">
            <Text style={styles.sectionTitle}>↩️ {t('wallet.refundsTitle')}</Text>
            {refunds.slice(0, 10).map(renderRefund)}
          </View>
        )}

        <View style={styles.txSection}>
          <Text style={styles.txTitle}>📋 {t('wallet.recentTransactions')}</Text>
          {transactions.length === 0 ? (
            <EmptyState icon="📋" title={t('wallet.noTransactions')} message={t('wallet.noTransactionsHint')} style={styles.emptyTx} />
          ) : (
            transactions.map(renderTx)
          )}
        </View>

        <View style={styles.howCard} testID="wallet-how">
          <Text style={styles.howTitle}>{t('wallet.howTitle')}</Text>
          <Text style={styles.howText}>{t('wallet.howText')}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: SPACING['2xl'] },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.primary, paddingHorizontal: SPACING.base,
    paddingTop: Platform.OS === 'ios' ? SPACING['3xl'] : SPACING.base,
    paddingBottom: SPACING.base,
  },
  backIcon: { fontSize: FONTS.xl, color: COLORS.textWhite, fontWeight: FONTS.bold },
  headerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textWhite },
  balanceCard: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingBottom: SPACING['2xl'], paddingTop: SPACING.base, alignItems: 'center' },
  balanceLabel: { fontSize: FONTS.sm, color: 'rgba(255,255,255,0.92)', fontWeight: FONTS.medium, marginBottom: SPACING.xs },
  balanceAmount: { fontSize: 42, fontWeight: FONTS.black, color: COLORS.textWhite, letterSpacing: -1, marginBottom: SPACING.xs },
  balanceCurrency: { fontSize: FONTS.sm, color: 'rgba(255,255,255,0.9)' },
  promoPill: {
    marginTop: SPACING.md, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, maxWidth: 320,
  },
  promoPillText: { color: '#FFFFFF', fontSize: FONTS.sm, lineHeight: 18, textAlign: 'center' },
  promoPillEnds: { marginTop: SPACING.xs, fontWeight: FONTS.semiBold },
  promoPillSoon: { color: '#FFFFFF', fontWeight: FONTS.black },
  frozenBadge: { marginTop: SPACING.sm, backgroundColor: COLORS.surface, borderRadius: RADIUS.full, paddingHorizontal: SPACING.base, paddingVertical: SPACING.xs },
  frozenText: { color: COLORS.dangerText, fontSize: FONTS.sm, fontWeight: FONTS.bold },
  actionsRow: { flexDirection: 'row', backgroundColor: COLORS.surface, paddingVertical: SPACING.xl, paddingHorizontal: SPACING.base, gap: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider, ...SHADOWS.sm },
  actionBtn: { flex: 1, alignItems: 'center', gap: SPACING.xs },
  actionIconWrap: { width: 52, height: 52, borderRadius: RADIUS.full, backgroundColor: COLORS.primaryFade, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.primary },
  actionIcon: { fontSize: 22 },
  actionLabel: { fontSize: FONTS.xs, fontWeight: FONTS.semiBold, color: COLORS.textSecondary },
  section: { backgroundColor: COLORS.surface, marginTop: SPACING.sm, paddingTop: SPACING.base },
  sectionTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary, paddingHorizontal: SPACING.base, marginBottom: SPACING.sm },
  lotRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 2, borderTopWidth: 1, borderTopColor: COLORS.borderLight, gap: SPACING.sm },
  lotInfo: { flex: 1, gap: 2 },
  lotLabel: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textPrimary },
  lotEnds: { fontSize: FONTS.xs, color: COLORS.textMuted },
  lotEndsSoon: { color: COLORS.danger, fontWeight: FONTS.semiBold },
  lotAmount: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.success },
  refundItem: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 2, borderTopWidth: 1, borderTopColor: COLORS.borderLight, gap: SPACING.xs },
  refundTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  refundOrder: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textPrimary },
  refundAmount: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  refundPill: { alignSelf: 'flex-start', paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full },
  refundPillText: { fontSize: FONTS.xs, fontWeight: FONTS.semiBold },
  refundMessage: { fontSize: FONTS.xs, color: COLORS.textMuted, lineHeight: 17 },
  txSection: { backgroundColor: COLORS.surface, marginTop: SPACING.sm, paddingTop: SPACING.base },
  txTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary, paddingHorizontal: SPACING.base, marginBottom: SPACING.sm },
  txItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 2, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, gap: SPACING.sm },
  txIconWrap: { width: 44, height: 44, borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  txIcon: { fontSize: 20 },
  txInfo: { flex: 1, gap: 2 },
  txType: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textPrimary },
  txDescription: { fontSize: FONTS.xs, color: COLORS.textMuted },
  txDate: { fontSize: FONTS.xs, color: COLORS.textLight },
  txAmountWrap: { alignItems: 'flex-end', gap: 3 },
  txAmount: { fontSize: FONTS.base, fontWeight: FONTS.bold },
  txStatusBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full },
  txStatusText: { fontSize: FONTS.xs, fontWeight: FONTS.semiBold, textTransform: 'capitalize' },
  emptyTx: { paddingVertical: SPACING.xl },
  howCard: { backgroundColor: COLORS.surfaceAlt, marginHorizontal: SPACING.base, marginTop: SPACING.base, borderRadius: RADIUS.lg, padding: SPACING.base, gap: SPACING.xs },
  howTitle: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  howText: { fontSize: FONTS.xs, color: COLORS.textMuted, lineHeight: 17 },
});
