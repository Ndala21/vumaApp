/**
 * VUMA Store — Wallet Screen
 * Balance, transactions, deposit, transfer
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
  Alert,
  RefreshControl,
  TextInput,
  Modal,
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
  validateAmount,
  validateEmail,
  getErrorMessage,
} from '../../utils/helpers';
import { paymentsAPI } from '../../api/payments';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import {
  FullScreenError,
  EmptyState,
} from '../../components/common/ErrorMessage';
import { t } from '../../i18n';

const TX_ICONS = {
  deposit: '💰',
  withdrawal: '🏦',
  transfer: '📤',
  order_payment: '🛒',
  refund: '↩️',
  payout: '💸',
  commission: '📊',
};

const TX_COLORS = {
  deposit: COLORS.success,
  withdrawal: COLORS.danger,
  transfer: COLORS.warning,
  order_payment: COLORS.primary,
  refund: COLORS.info,
  payout: COLORS.success,
  commission: COLORS.textMuted,
};

export default function WalletScreen({ navigation }) {
  const user = useSelector(selectUser);

  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferEmail, setTransferEmail] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [walletData, txData] = await Promise.all([
        paymentsAPI.getWallet(),
        paymentsAPI.getTransactions({ page: 1 }),
      ]);
      setWallet(walletData);
      setTransactions(txData.results || txData || []);
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

  const handleDeposit = async () => {
    const amountErr = validateAmount(depositAmount, 1000, 10000000);
    if (amountErr) { setActionError(amountErr); return; }
    setActionLoading(true);
    setActionError('');
    try {
      const data = await paymentsAPI.deposit(Number(depositAmount));
      setShowDeposit(false);
      setDepositAmount('');
      Alert.alert('💳 Stripe Checkout', `Redirect to: ${data.checkout_url}\n\nSession: ${data.session_id}`, [{ text: t('common.ok') }]);
    } catch (e) {
      setActionError(getErrorMessage(e));
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransfer = async () => {
    const emailErr = validateEmail(transferEmail);
    if (emailErr) { setActionError(emailErr); return; }
    const amountErr = validateAmount(transferAmount, 100);
    if (amountErr) { setActionError(amountErr); return; }
    setActionLoading(true);
    setActionError('');
    try {
      await paymentsAPI.transfer({
        receiverEmail: transferEmail.trim(),
        amount: Number(transferAmount),
        description: transferNote.trim(),
      });
      setShowTransfer(false);
      setTransferAmount('');
      setTransferEmail('');
      setTransferNote('');
      Alert.alert('Success', `₩${Number(transferAmount).toLocaleString()} sent!`);
      await loadData();
    } catch (e) {
      setActionError(getErrorMessage(e));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <Loading fullScreen />;
  if (error) return <FullScreenError error={error} onRetry={loadData} />;

  const TransactionItem = ({ tx }) => {
    const isIncoming = tx.receiver_email === user?.email && tx.tx_type !== 'order_payment';
    return (
      <View style={styles.txItem}>
        <View style={styles.txIconWrap}>
          <Text style={styles.txIcon}>{TX_ICONS[tx.tx_type] || '💳'}</Text>
        </View>
        <View style={styles.txInfo}>
          <Text style={styles.txType}>
            {tx.tx_type?.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </Text>
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

  const DepositModal = () => (
    <Modal visible={showDeposit} transparent animationType="slide" onRequestClose={() => setShowDeposit(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>💰 Deposit Funds</Text>
            <TouchableOpacity onPress={() => { setShowDeposit(false); setActionError(''); }}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.inputLabel}>Amount (₩)</Text>
          <TextInput
            style={styles.modalInput}
            value={depositAmount}
            onChangeText={(v) => { setDepositAmount(v); setActionError(''); }}
            placeholder="Min ₩1,000"
            keyboardType="numeric"
            placeholderTextColor={COLORS.textLight}
          />
          <View style={styles.quickAmounts}>
            {[10000, 50000, 100000, 500000].map((amt) => (
              <TouchableOpacity
                key={amt}
                style={[styles.quickAmtBtn, depositAmount === String(amt) && styles.quickAmtBtnActive]}
                onPress={() => setDepositAmount(String(amt))}
              >
                <Text style={[styles.quickAmtText, depositAmount === String(amt) && styles.quickAmtTextActive]}>
                  {formatPrice(amt)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {actionError ? <Text style={styles.modalError}>⚠️ {actionError}</Text> : null}
          <Text style={styles.modalHint}>🔒 Secure payment via Stripe. No card stored.</Text>
          <Button title="Proceed to Payment" onPress={handleDeposit} loading={actionLoading} fullWidth style={styles.modalBtn} />
        </View>
      </View>
    </Modal>
  );

  const TransferModal = () => (
    <Modal visible={showTransfer} transparent animationType="slide" onRequestClose={() => setShowTransfer(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>📤 Transfer Funds</Text>
            <TouchableOpacity onPress={() => { setShowTransfer(false); setActionError(''); }}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.inputLabel}>Recipient Email</Text>
          <TextInput
            style={styles.modalInput}
            value={transferEmail}
            onChangeText={(v) => { setTransferEmail(v); setActionError(''); }}
            placeholder="recipient@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={COLORS.textLight}
          />
          <Text style={styles.inputLabel}>Amount (₩)</Text>
          <TextInput
            style={styles.modalInput}
            value={transferAmount}
            onChangeText={(v) => { setTransferAmount(v); setActionError(''); }}
            placeholder="Min ₩100"
            keyboardType="numeric"
            placeholderTextColor={COLORS.textLight}
          />
          <Text style={styles.inputLabel}>Note (optional)</Text>
          <TextInput
            style={styles.modalInput}
            value={transferNote}
            onChangeText={setTransferNote}
            placeholder="What's this for?"
            placeholderTextColor={COLORS.textLight}
          />
          <View style={styles.balanceHint}>
            <Text style={styles.balanceHintText}>
              Available: <Text style={styles.balanceHintBold}>{formatPrice(wallet?.balance || 0)}</Text>
            </Text>
          </View>
          {actionError ? <Text style={styles.modalError}>⚠️ {actionError}</Text> : null}
          <Button title="Send Transfer" onPress={handleTransfer} loading={actionLoading} fullWidth style={styles.modalBtn} />
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>VUMA Wallet</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.textWhite} />}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={styles.balanceAmount}>{formatPrice(wallet?.balance || 0)}</Text>
          <Text style={styles.balanceCurrency}>{wallet?.currency || 'KRW'} • {user?.username}</Text>
          {wallet?.is_frozen && (
            <View style={styles.frozenBadge}>
              <Text style={styles.frozenText}>🔒 Wallet Frozen</Text>
            </View>
          )}
        </View>

        <View style={styles.actionsRow}>
          {[
            { icon: '💰', label: 'Deposit', onPress: () => setShowDeposit(true), disabled: wallet?.is_frozen },
            { icon: '📤', label: 'Transfer', onPress: () => setShowTransfer(true), disabled: wallet?.is_frozen || !wallet?.balance },
            { icon: '📊', label: 'History', onPress: () => {}, disabled: false },
          ].map((action) => (
            <TouchableOpacity
              key={action.label}
              style={[styles.actionBtn, action.disabled && styles.actionBtnDisabled]}
              onPress={action.onPress}
              disabled={action.disabled}
            >
              <View style={styles.actionIconWrap}>
                <Text style={styles.actionIcon}>{action.icon}</Text>
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.txSection}>
          <Text style={styles.txTitle}>📋 Recent Transactions</Text>
          {transactions.length === 0 ? (
            <EmptyState icon="📋" title="No transactions yet" message="Deposit funds or make a purchase to see activity" style={styles.emptyTx} />
          ) : (
            transactions.map((tx, i) => <TransactionItem key={tx.id || i} tx={tx} />)
          )}
        </View>
      </ScrollView>

      <DepositModal />
      <TransferModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: SPACING['2xl'] },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.secondary, paddingHorizontal: SPACING.base,
    paddingTop: Platform.OS === 'ios' ? SPACING['3xl'] : SPACING.base,
    paddingBottom: SPACING.base,
  },
  backIcon: { fontSize: FONTS.xl, color: COLORS.textWhite, fontWeight: FONTS.bold },
  headerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textWhite },
  balanceCard: { backgroundColor: COLORS.secondary, paddingHorizontal: SPACING.xl, paddingBottom: SPACING['2xl'], paddingTop: SPACING.base, alignItems: 'center' },
  balanceLabel: { fontSize: FONTS.sm, color: 'rgba(255,255,255,0.7)', fontWeight: FONTS.medium, marginBottom: SPACING.xs },
  balanceAmount: { fontSize: 42, fontWeight: FONTS.black, color: COLORS.textWhite, letterSpacing: -1, marginBottom: SPACING.xs },
  balanceCurrency: { fontSize: FONTS.sm, color: 'rgba(255,255,255,0.6)' },
  frozenBadge: { marginTop: SPACING.sm, backgroundColor: COLORS.danger, borderRadius: RADIUS.full, paddingHorizontal: SPACING.base, paddingVertical: SPACING.xs },
  frozenText: { color: COLORS.textWhite, fontSize: FONTS.sm, fontWeight: FONTS.bold },
  actionsRow: { flexDirection: 'row', backgroundColor: COLORS.surface, paddingVertical: SPACING.xl, paddingHorizontal: SPACING.base, gap: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider, ...SHADOWS.sm },
  actionBtn: { flex: 1, alignItems: 'center', gap: SPACING.xs },
  actionBtnDisabled: { opacity: 0.4 },
  actionIconWrap: { width: 52, height: 52, borderRadius: RADIUS.full, backgroundColor: COLORS.primaryFade, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.primary },
  actionIcon: { fontSize: 22 },
  actionLabel: { fontSize: FONTS.xs, fontWeight: FONTS.semiBold, color: COLORS.textSecondary },
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
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.xl, paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.xl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xl },
  modalTitle: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  modalClose: { fontSize: FONTS.xl, color: COLORS.textMuted, fontWeight: FONTS.bold },
  inputLabel: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  modalInput: { backgroundColor: COLORS.surfaceAlt, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 4, fontSize: FONTS.base, color: COLORS.textPrimary, marginBottom: SPACING.base },
  quickAmounts: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.base },
  quickAmtBtn: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs + 2, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surfaceAlt },
  quickAmtBtnActive: { backgroundColor: COLORS.primaryFade, borderColor: COLORS.primary },
  quickAmtText: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  quickAmtTextActive: { color: COLORS.primary, fontWeight: FONTS.bold },
  balanceHint: { backgroundColor: COLORS.primaryFade, borderRadius: RADIUS.lg, padding: SPACING.sm, marginBottom: SPACING.base, alignItems: 'center' },
  balanceHintText: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  balanceHintBold: { fontWeight: FONTS.bold, color: COLORS.primary },
  modalError: { fontSize: FONTS.sm, color: COLORS.danger, marginBottom: SPACING.sm },
  modalHint: { fontSize: FONTS.xs, color: COLORS.textMuted, textAlign: 'center', marginBottom: SPACING.base },
  modalBtn: { marginTop: SPACING.xs },
});
