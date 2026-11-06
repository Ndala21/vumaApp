/**
 * VUMA Store - the "Report" window.
 *
 * Opens from a review, a product or a seller. The customer picks a reason, can add a few
 * words, and sends it; the VUMA team gets an e-mail and reads every report within 24 hours.
 * When the report is about a person's review, the same window also offers
 * "Hide reviews from <name>".
 *
 * Props: visible, onClose, kind ('review' | 'product' | 'seller' | 'user'), targetId,
 *        userId + userName (optional: the writer, to offer hiding), onBlocked(userId)
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, Modal, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/constants';
import { REPORT_REASONS, REPORT_TITLES, sendReport, blockUser, reportErrorText } from '../utils/safety';

export default function ReportSheet({ visible, onClose, kind, targetId, userId, userName, onBlocked }) {
  const [reason, setReason] = useState(null);
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const [hiding, setHiding] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [hideError, setHideError] = useState('');
  // Two quick taps must send one report (the state below only updates after the tap is handled).
  const busy = useRef(false);

  // A fresh, empty window every time it opens.
  useEffect(() => {
    if (visible) {
      setReason(null); setDetails(''); setSending(false); setError('');
      setDone(null); setHiding(false); setHidden(false); setHideError('');
      busy.current = false;
    }
  }, [visible, kind, targetId]);

  const send = async () => {
    if (busy.current) return;
    if (!reason) { setError('Choose a reason first.'); return; }
    busy.current = true;
    setSending(true);
    setError('');
    try {
      const r = await sendReport({ kind, targetId, reason, details: details.trim() });
      setDone(r);
    } catch (e) {
      setError(reportErrorText(e));
    } finally {
      busy.current = false;
      setSending(false);
    }
  };

  const hide = async () => {
    if (busy.current || !userId) return;
    busy.current = true;
    setHiding(true);
    setHideError('');
    try {
      await blockUser(userId);
      setHidden(true);
      if (onBlocked) onBlocked(userId);
    } catch (e) {
      setHideError(reportErrorText(e, 'Could not hide this person. Please try again.'));
    } finally {
      busy.current = false;
      setHiding(false);
    }
  };

  const who = userName || 'this person';

  return (
    <Modal visible={!!visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.headRow}>
              <Text style={styles.title}>{done ? 'Report sent' : (REPORT_TITLES[kind] || 'Report')}</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Close" testID="report-close">
                <Text style={styles.close}>✕</Text>
              </TouchableOpacity>
            </View>

            {done ? (
              <View>
                <Text style={styles.thanks} testID="report-done">
                  {done.already
                    ? 'You already reported this. Our team will look at it within 24 hours.'
                    : 'Thank you. Our team will look at this within 24 hours.'}
                </Text>
              </View>
            ) : (
              <View>
                <Text style={styles.sub}>Help us keep VUMA safe. Tell us what is wrong.</Text>
                {REPORT_REASONS.map((r) => {
                  const on = reason === r.key;
                  return (
                    <TouchableOpacity
                      key={r.key}
                      onPress={() => { setReason(r.key); setError(''); }}
                      style={[styles.reason, on && styles.reasonOn]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      testID={'report-reason-' + r.key}
                    >
                      <View style={[styles.radio, on && styles.radioOn]} />
                      <Text style={[styles.reasonText, on && styles.reasonTextOn]}>{r.label}</Text>
                    </TouchableOpacity>
                  );
                })}
                <Text style={styles.label}>More details (optional)</Text>
                <TextInput
                  value={details}
                  onChangeText={setDetails}
                  placeholder="Tell us more…"
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  maxLength={500}
                  style={styles.input}
                  testID="report-details"
                />
                {!!error && <Text style={styles.error} testID="report-error">{error}</Text>}
                <View style={styles.actions}>
                  <TouchableOpacity onPress={onClose} style={styles.cancelBtn} accessibilityRole="button" testID="report-cancel">
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={send}
                    disabled={sending}
                    style={[styles.sendBtn, !reason && styles.sendBtnOff]}
                    accessibilityRole="button"
                    testID="report-send"
                  >
                    {sending
                      ? <ActivityIndicator color={COLORS.textWhite} size="small" />
                      : <Text style={styles.sendText}>Send report</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {!!userId && (
              <View style={styles.hideBox}>
                {hidden ? (
                  <Text style={styles.hiddenText} testID="report-hidden">
                    Done. You will not see reviews from {who} any more. You can undo this in Settings.
                  </Text>
                ) : (
                  <View>
                    <TouchableOpacity onPress={hide} disabled={hiding} style={styles.hideBtn} accessibilityRole="button" testID="report-hide">
                      {hiding
                        ? <ActivityIndicator color={COLORS.danger} size="small" />
                        : <Text style={styles.hideText}>Hide reviews from {who}</Text>}
                    </TouchableOpacity>
                    {!!hideError && <Text style={styles.error} testID="report-hide-error">{hideError}</Text>}
                  </View>
                )}
              </View>
            )}

            {!!done && (
              <TouchableOpacity onPress={onClose} style={[styles.sendBtn, { marginTop: SPACING.base }]} accessibilityRole="button" testID="report-finish">
                <Text style={styles.sendText}>Done</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  card: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: SPACING.base, paddingBottom: SPACING.xl, maxHeight: '90%',
  },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  title: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  close: { fontSize: 18, color: COLORS.textSecondary },
  sub: { fontSize: FONTS.sm, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  reason: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm + 2, paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.xs + 2,
  },
  reasonOn: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryFade },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: COLORS.borderStrong, marginRight: SPACING.sm },
  radioOn: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  reasonText: { fontSize: FONTS.base, color: COLORS.textPrimary },
  reasonTextOn: { color: COLORS.primaryDark, fontWeight: FONTS.semiBold },
  label: { fontSize: FONTS.sm, color: COLORS.textSecondary, marginTop: SPACING.sm, marginBottom: SPACING.xs },
  input: {
    minHeight: 70, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.sm,
    fontSize: FONTS.base, color: COLORS.textPrimary, textAlignVertical: 'top',
  },
  error: { color: COLORS.danger, fontSize: FONTS.sm, marginTop: SPACING.sm },
  actions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.base },
  cancelBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
  },
  cancelText: { fontSize: FONTS.base, color: COLORS.textSecondary, fontWeight: FONTS.semiBold },
  sendBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md,
    borderRadius: RADIUS.md, backgroundColor: COLORS.primary,
  },
  sendBtnOff: { opacity: 0.55 },
  sendText: { fontSize: FONTS.base, color: COLORS.textWhite, fontWeight: FONTS.bold },
  thanks: { fontSize: FONTS.base, color: COLORS.textPrimary, lineHeight: 22 },
  hideBox: { marginTop: SPACING.base, paddingTop: SPACING.base, borderTopWidth: 1, borderTopColor: COLORS.divider },
  hideBtn: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.danger,
  },
  hideText: { fontSize: FONTS.base, color: COLORS.danger, fontWeight: FONTS.semiBold },
  hiddenText: { fontSize: FONTS.sm, color: COLORS.successText, lineHeight: 20 },
});
