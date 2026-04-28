/**
 * VUMA Store — Error Message Component
 * Display errors inline or as alerts
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
      : error.message ||
        error[0] ||
        'Something went wrong.';

  return (
    <View style={[styles.container, style]}>
      <View style={styles.row}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.message} numberOfLines={3}>
          {message}
        </Text>
      </View>
      {onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          style={styles.retryBtn}
        >
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
    typeof error === 'string'
      ? error
      : error?.message || 'Something went wrong.';

  return (
    <View style={styles.fullScreen}>
      <Text style={styles.errorEmoji}>😕</Text>
      <Text style={styles.errorTitle}>Oops!</Text>
      <Text style={styles.errorSubtitle}>{message}</Text>
      {onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          style={styles.fullRetryBtn}
        >
          <Text style={styles.fullRetryText}>
            {retryLabel}
          </Text>
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
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {message && (
        <Text style={styles.emptyMessage}>{message}</Text>
      )}
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          style={styles.emptyAction}
        >
          <Text style={styles.emptyActionText}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Field Error ────────────────────────────────────────
export function FieldError({ error }) {
  if (!error) return null;
  const message =
    typeof error === 'string' ? error : error[0];
  return (
    <Text style={styles.fieldError}>⚠️ {message}</Text>
  );
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
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
  };

  return (
    <View
      style={[
        styles.toast,
        { borderLeftColor: colors[type] || COLORS.info },
      ]}
    >
      <Text style={styles.toastIcon}>
        {icons[type] || 'ℹ️'}
      </Text>
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
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: FONTS.base,
    marginRight: SPACING.sm,
    marginTop: 1,
  },
  message: {
    flex: 1,
    fontSize: FONTS.sm,
    color: COLORS.dangerText,
    lineHeight: 18,
    fontWeight: FONTS.medium,
  },
  retryBtn: {
    marginTop: SPACING.sm,
    alignSelf: 'flex-end',
  },
  retryText: {
    fontSize: FONTS.sm,
    color: COLORS.danger,
    fontWeight: FONTS.bold,
    textDecorationLine: 'underline',
  },
  // Full screen
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING['2xl'],
    backgroundColor: COLORS.background,
  },
  errorEmoji: {
    fontSize: 56,
    marginBottom: SPACING.base,
  },
  errorTitle: {
    fontSize: FONTS['2xl'],
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  errorSubtitle: {
    fontSize: FONTS.base,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  fullRetryBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm + 4,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
  },
  fullRetryText: {
    color: COLORS.textWhite,
    fontSize: FONTS.base,
    fontWeight: FONTS.bold,
  },
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING['2xl'],
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: SPACING.base,
  },
  emptyTitle: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: FONTS.base,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  emptyAction: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm + 4,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
  },
  emptyActionText: {
    color: COLORS.textWhite,
    fontSize: FONTS.base,
    fontWeight: FONTS.bold,
  },
  // Field error
  fieldError: {
    fontSize: FONTS.xs,
    color: COLORS.danger,
    marginTop: SPACING.xs,
    marginLeft: 2,
  },
  // Toast
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginHorizontal: SPACING.base,
    marginVertical: SPACING.sm,
    borderLeftWidth: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  toastIcon: {
    fontSize: FONTS.lg,
    marginRight: SPACING.sm,
  },
  toastMessage: {
    flex: 1,
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    fontWeight: FONTS.medium,
  },
});

