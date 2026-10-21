/**
 * VUMA Store - Withdraw sheet (Seller Wallet)
 *
 * A bottom sheet with three steps:
 *   amount   - how much, where it goes, fee, "Withdraw"
 *   account  - choose the mobile-money network, phone number and name (saved on the shop)
 *   done     - "Request received"
 * Replaces the old Alert.prompt, which only works on iPhone.
 *
 * The server checks every rule; this sheet gives a quick answer first and shows the
 * server's own message when it says no.
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/constants';
import { i18n, useTranslation } from '../i18n';
import { vendorsAPI } from '../api/vendors';
import {
  PAYOUT_METHODS, tx, tsh, groupDigits, parseAmount, feeAndNet, checkAmount, errorText,
  normalizeTzPhone, localPhone, quickErrorText,
} from '../utils/payouts';

export default function WithdrawSheet({ visible, summary, profile, onClose, onChanged }) {
  useTranslation();
  const lang = i18n.getLocale();
  const T = (key, vars) => tx(lang, key, vars);

  const [step, setStep] = useState('amount');
  const [amountText, setAmountText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const [method, setMethod] = useState('mpesa');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');

  const hasDestination = !!(summary && summary.destination);
  const isBank = !!(summary && summary.destination_method === 'bank');

  // Each time the sheet opens: start clean, and go straight to the account step if none is saved.
  useEffect(() => {
    if (!visible) return;
    setAmountText('');
    setError('');
    setDone(null);
    setBusy(false);
    setStep(hasDestination ? 'amount' : 'account');
    const m = profile && profile.payout_method;
    setMethod(PAYOUT_METHODS.some((x) => x.value === m) ? m : 'mpesa');
    setPhone(profile && profile.mpesa_phone ? profile.mpesa_phone : '');
    setName((profile && profile.bank_account_name) || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!summary) return null;

  const amount = parseAmount(amountText);
  const quick = checkAmount(amount, summary);
  const { fee, net } = amount ? feeAndNet(amount, summary) : { fee: 0, net: 0 };
  const showFee = amount && (fee > 0 || summary.fee_paid_by === 'seller');
  const canSubmit = !busy && !!amount && !quick;

  const submit = async () => {
    if (!canSubmit) {
      if (quick) setError(quickErrorText(lang, quick, summary));
      return;
    }
    setBusy(true);
    setError('');
    try {
      const payout = await vendorsAPI.requestPayout(amount);
      setDone(payout);
      setStep('done');
      if (onChanged) onChanged();
    } catch (e) {
      setError(errorText(lang, e, summary));
    } finally {
      setBusy(false);
    }
  };

  const saveAccount = async () => {
    const normalized = normalizeTzPhone(phone);
    if (!normalized) { setError(T('phoneBad')); return; }
    if (!name.trim()) { setError(T('nameBad')); return; }
    setBusy(true);
    setError('');
    try {
      await vendorsAPI.updateProfile({
        payout_method: method, mpesa_phone: localPhone(normalized), bank_account_name: name.trim(),
      });
      if (onChanged) await onChanged();
      setStep('amount');
    } catch (e) {
      setError(errorText(lang, e, summary));
    } finally {
      setBusy(false);
    }
  };

  const notice = () => {
    if (isBank) return T('noticeBank');
    return summary.sends_automatically ? T('noticeAuto') : T('noticeAdmin');
  };

  const renderAmount = () => (
    <>
      <Text style={styles.title}>{T('withdrawTitle')}</Text>
      <Text style={styles.line}>
        {T('available')}: <Text style={styles.strong}>{tsh(summary.available)}</Text>
      </Text>

      <View style={styles.destRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.small}>{T('goesTo')}</Text>
          <Text style={styles.destText}>{summary.destination || '-'}</Text>
        </View>
        <TouchableOpacity onPress={() => { setError(''); setStep('account'); }} accessibilityRole="button">
          <Text style={styles.link}>{hasDestination ? T('change') : T('setUp')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>{T('amount')}</Text>
      <TextInput
        style={styles.input}
        value={amountText}
        onChangeText={(v) => { setAmountText(v); setError(''); }}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor={COLORS.textLight}
        maxLength={12}
        accessibilityLabel={T('amount')}
      />
      <View style={styles.quickRow}>
        <Text style={styles.small}>{T('limits', { min: groupDigits(summary.min_amount), max: groupDigits(summary.max_amount) })}</Text>
        {Number(summary.available) > 0 && (
          <TouchableOpacity
            onPress={() => { setAmountText(String(Math.min(Number(summary.available), Number(summary.max_amount)))); setError(''); }}
            style={styles.chip}
          >
            <Text style={styles.chipText}>{T('all')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {!!amount && !quick && (
        <View style={styles.sumBox}>
          {showFee && (
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>{T('fee')}</Text>
              <Text style={styles.sumValue}>{tsh(fee)}</Text>
            </View>
          )}
          <View style={styles.sumRow}>
            <Text style={styles.sumLabelStrong}>{T('youReceive')}</Text>
            <Text style={styles.sumValueStrong}>{tsh(net)}</Text>
          </View>
        </View>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}
      <Text style={styles.notice}>{notice()}</Text>

      <TouchableOpacity
        style={[styles.primary, !canSubmit && styles.primaryOff]}
        onPress={submit}
        disabled={busy}
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        {busy
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.primaryText}>{amount ? T('submit', { amount: tsh(amount) }) : T('withdrawTitle')}</Text>}
      </TouchableOpacity>
    </>
  );

  const renderAccount = () => (
    <>
      <Text style={styles.title}>{T('accountTitle')}</Text>
      <Text style={styles.label}>{T('method')}</Text>
      <View style={styles.methodRow}>
        {PAYOUT_METHODS.map((m) => {
          const on = method === m.value;
          return (
            <TouchableOpacity
              key={m.value}
              onPress={() => { setMethod(m.value); setError(''); }}
              style={[styles.method, on && styles.methodOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.methodText, on && styles.methodTextOn]}>{m.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>{T('phone')}</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={(v) => { setPhone(v); setError(''); }}
        keyboardType="phone-pad"
        placeholder={T('phoneHint')}
        placeholderTextColor={COLORS.textLight}
        maxLength={18}
      />
      <Text style={styles.label}>{T('name')}</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={(v) => { setName(v); setError(''); }}
        autoCapitalize="words"
        placeholder="Fatuma Juma"
        placeholderTextColor={COLORS.textLight}
        maxLength={100}
      />
      {hasDestination && (
        <Text style={styles.notice}>{T('accountWarn', { hours: summary.cooldown_hours || 24 })}</Text>
      )}
      {!!error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={[styles.primary, busy && styles.primaryOff]} onPress={saveAccount} disabled={busy} activeOpacity={0.85}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{T('save')}</Text>}
      </TouchableOpacity>
      {hasDestination && (
        <TouchableOpacity style={styles.secondary} onPress={() => { setError(''); setStep('amount'); }}>
          <Text style={styles.secondaryText}>{T('back')}</Text>
        </TouchableOpacity>
      )}
    </>
  );

  const renderDone = () => (
    <>
      <View style={styles.doneBadge}><Text style={styles.doneTick}>{'✓'}</Text></View>
      <Text style={[styles.title, { textAlign: 'center' }]}>{T('doneTitle')}</Text>
      <Text style={[styles.line, { textAlign: 'center' }]}>
        {T('doneText', { ref: (done && done.reference) || '' })}
      </Text>
      <Text style={[styles.line, { textAlign: 'center' }]}>
        {T('receive')}: <Text style={styles.strong}>{tsh(done ? done.net_amount : 0)}</Text>
      </Text>
      <TouchableOpacity style={styles.primary} onPress={onClose} activeOpacity={0.85}>
        <Text style={styles.primaryText}>{T('close')}</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <Modal visible={!!visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={styles.backdropTap} activeOpacity={1} onPress={onClose} accessibilityLabel={T('close')} />
        <View style={styles.sheet}>
          <View style={styles.grab} />
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
            {step === 'amount' && renderAmount()}
            {step === 'account' && renderAccount()}
            {step === 'done' && renderDone()}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  backdropTap: { flex: 1 },
  sheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    maxHeight: '88%', paddingTop: SPACING.sm,
  },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, marginBottom: SPACING.sm },
  body: { padding: SPACING.base, paddingBottom: SPACING.xl },
  title: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  line: { fontSize: FONTS.base, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  strong: { fontWeight: FONTS.bold, color: COLORS.textPrimary },
  small: { fontSize: FONTS.xs, color: COLORS.textMuted },
  label: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textPrimary, marginTop: SPACING.sm, marginBottom: 4 },
  input: {
    backgroundColor: COLORS.surfaceAlt, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 2, fontSize: FONTS.lg, color: COLORS.textPrimary,
  },
  destRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg,
    padding: SPACING.sm + 2, marginTop: SPACING.xs,
  },
  destText: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginTop: 2 },
  link: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.primary, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs },
  quickRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  chip: { paddingHorizontal: SPACING.md, paddingVertical: 4, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.primary, backgroundColor: COLORS.primaryFade },
  chipText: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.primaryDark },
  sumBox: { marginTop: SPACING.sm, padding: SPACING.sm + 2, borderRadius: RADIUS.lg, backgroundColor: COLORS.primaryFade },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  sumLabel: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  sumValue: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  sumLabelStrong: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  sumValueStrong: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.primaryDark },
  error: { color: COLORS.danger, fontSize: FONTS.sm, marginTop: SPACING.sm },
  notice: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: SPACING.sm, lineHeight: 17 },
  primary: { marginTop: SPACING.base, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingVertical: SPACING.md, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  primaryOff: { opacity: 0.5 },
  primaryText: { color: '#fff', fontSize: FONTS.base, fontWeight: FONTS.bold },
  secondary: { marginTop: SPACING.sm, paddingVertical: SPACING.sm, alignItems: 'center' },
  secondaryText: { color: COLORS.textSecondary, fontSize: FONTS.sm, fontWeight: FONTS.semiBold },
  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  method: { paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surfaceAlt },
  methodOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  methodText: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  methodTextOn: { color: '#fff', fontWeight: FONTS.bold },
  doneBadge: { alignSelf: 'center', width: 64, height: 64, borderRadius: 32, backgroundColor: '#E4F7EC', alignItems: 'center', justifyContent: 'center', marginVertical: SPACING.sm },
  doneTick: { fontSize: 32, color: '#1B9C5A', fontWeight: FONTS.bold },
});
