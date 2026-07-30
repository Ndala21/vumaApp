/**
 * VUMA Store — Error Message Component
 * Same exports (default ErrorMessage, FullScreenError, EmptyState, FieldError,
 * ToastMessage) and same props — visual rebuild only.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {
  COLORS,
  FONTS,
  RADIUS,
  SPACING,
  SHADOWS,
} from '../../utils/constants';

// ── Inline Error Banner ────────────────────────────────
export default function ErrorMessage({
  error,
  onRetry,
  retryLabel = 'Try Again',
  style,
}) {
  if (!error) return null;

  const message =
    typeof error === 'string'
      ? error
      : error.message || error[0] || 'Something went wrong.';

  return (
    <View style={[styles.container, style]}>
      <View style={styles.row}>
        <View style={styles.iconChip}>
          <Text style={styles.icon}>!</Text>
        </View>
        <Text style={styles.message} numberOfLines={3}>{message}</Text>
      </View>
      {onRetry && (
        <TouchableOpacity onPress={onRetry} style={styles.retryBtn}>
          <Text style={styles.retryText}>{retryLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Full Screen Error ──────────────────────────────────
export function FullScreenError({
  error,
  onRetry,
  retryLabel = 'Try Again',
}) {
  const message =
    typeof error === 'string' ? error : error?.message || 'Something went wrong.';

  return (
    <View style={styles.fullScreen}>
      <View style={styles.errorIconCircle}>
        <Text style={styles.errorEmoji}>😕</Text>
      </View>
      <Text style={styles.errorTitle}>Something didn't load</Text>
      <Text style={styles.errorSubtitle}>{message}</Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry} style={styles.fullRetryBtn} activeOpacity={0.85}>
          <Text style={styles.fullRetryText}>{retryLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Empty State ────────────────────────────────────────
export function EmptyState({
  icon = '📭',
  title = 'Nothing here',
  message,
  actionLabel,
  onAction,
  style,
}) {
  return (
    <View style={[styles.emptyState, style]}>
      <View style={styles.emptyIconCircle}>
        <Text style={styles.emptyIcon}>{icon}</Text>
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {message && <Text style={styles.emptyMessage}>{message}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction} style={styles.emptyAction} activeOpacity={0.85}>
          <Text style={styles.emptyActionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Field Error ────────────────────────────────────────
export function FieldError({ error }) {
  if (!error) return null;
  const message = typeof error === 'string' ? error : error[0];
  return <Text style={styles.fieldError}>{message}</Text>;
}

// ── Toast Message ──────────────────────────────────────
export function ToastMessage({ message, type = 'info' }) {
  if (!message) return null;

  const colors = {
    info: COLORS.info,
    success: COLORS.success,
    warning: COLORS.warning,
    error: COLORS.danger,
  };

  const icons = {
    info: 'ℹ',
    success: '✓',
    warning: '!',
    error: '✕',
  };

  const tint = colors[type] || COLORS.info;

  return (
    <View style={[styles.toast, { borderLeftColor: tint }]}>
      <View style={[styles.toastIconChip, { backgroundColor: tint }]}>
        <Text style={styles.toastIcon}>{icons[type] || 'ℹ'}</Text>
      </View>
      <Text style={styles.toastMessage}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Inline error
  container: {
    backgroundColor: COLORS.dangerLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(229,72,77,0.18)',
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  iconChip: {
    width: 22, height: 22, borderRadius: RADIUS.full,
    backgroundColor: COLORS.danger, alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  icon: { fontSize: 12, color: COLORS.textWhite, fontWeight: FONTS.black },
  message: { flex: 1, fontSize: FONTS.sm, color: COLORS.dangerText, lineHeight: 19, fontWeight: FONTS.medium },
  retryBtn: { marginTop: SPACING.sm, alignSelf: 'flex-end' },
  retryText: { fontSize: FONTS.sm, color: COLORS.danger, fontWeight: FONTS.bold },

  // Full screen
  fullScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING['2xl'], backgroundColor: COLORS.background },
  errorIconCircle: {
    width: 88, height: 88, borderRadius: RADIUS.full, backgroundColor: COLORS.dangerLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg,
  },
  errorEmoji: { fontSize: 40 },
  errorTitle: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm, textAlign: 'center' },
  errorSubtitle: { fontSize: FONTS.base, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xl },
  fullRetryBtn: { backgroundColor: COLORS.primary, paddingVertical: SPACING.sm + 5, paddingHorizontal: SPACING.xl, borderRadius: RADIUS.lg, ...SHADOWS.primary },
  fullRetryText: { color: COLORS.textWhite, fontSize: FONTS.base, fontWeight: FONTS.bold },

  // Empty state
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING['2xl'] },
  emptyIconCircle: {
    width: 96, height: 96, borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceSunken,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg,
  },
  emptyIcon: { fontSize: 44 },
  emptyTitle: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm, textAlign: 'center' },
  emptyMessage: { fontSize: FONTS.base, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xl },
  emptyAction: { backgroundColor: COLORS.primary, paddingVertical: SPACING.sm + 5, paddingHorizontal: SPACING.xl, borderRadius: RADIUS.lg, ...SHADOWS.primary },
  emptyActionText: { color: COLORS.textWhite, fontSize: FONTS.base, fontWeight: FONTS.bold },

  // Field error
  fieldError: { fontSize: FONTS.xs, color: COLORS.danger, marginTop: SPACING.xs, marginLeft: 2, fontWeight: FONTS.medium },

  // Toast
  toast: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginHorizontal: SPACING.base, marginVertical: SPACING.sm,
    borderLeftWidth: 4, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.md,
  },
  toastIconChip: {
    width: 24, height: 24, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm,
  },
  toastIcon: { fontSize: 12, color: COLORS.textWhite, fontWeight: FONTS.black },
  toastMessage: { flex: 1, fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONTS.medium },
});