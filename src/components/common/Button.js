/**
 * VUMA Store — Button Component
 * Reusable button with variants and loading state.
 * Same prop contract as before (title, icon, iconPosition, variant, size,
 * fullWidth, loading, disabled, onPress, style, textStyle) — visual rebuild only.
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING, SHADOWS } from '../../utils/constants';

export default function Button({
  // Content
  title,
  icon,
  iconPosition = 'left',

  // Variants
  variant = 'primary',
  size = 'md',
  fullWidth = false,

  // States
  loading = false,
  disabled = false,

  // Handlers
  onPress,

  // Style overrides
  style,
  textStyle,
}) {
  const isDisabled = disabled || loading;

  // ── Variant styles ─────────────────────────────────
  const variantStyles = {
    primary: {
      container: { backgroundColor: COLORS.primary, ...SHADOWS.primary },
      text: { color: COLORS.textWhite },
    },
    secondary: {
      container: { backgroundColor: COLORS.secondary, ...SHADOWS.sm },
      text: { color: COLORS.textWhite },
    },
    outline: {
      container: {
        backgroundColor: COLORS.primaryFade,
        borderWidth: 1.5,
        borderColor: COLORS.primary,
      },
      text: { color: COLORS.primary },
    },
    outlineSecondary: {
      container: {
        backgroundColor: COLORS.surface,
        borderWidth: 1.5,
        borderColor: COLORS.borderStrong,
      },
      text: { color: COLORS.textSecondary },
    },
    ghost: {
      container: { backgroundColor: 'transparent' },
      text: { color: COLORS.primary },
    },
    danger: {
      container: { backgroundColor: COLORS.danger, shadowColor: COLORS.danger, ...SHADOWS.sm },
      text: { color: COLORS.textWhite },
    },
    success: {
      container: { backgroundColor: COLORS.success, shadowColor: COLORS.success, ...SHADOWS.sm },
      text: { color: COLORS.textWhite },
    },
    light: {
      container: { backgroundColor: COLORS.primaryFade },
      text: { color: COLORS.primaryDark },
    },
  };

  // ── Size styles ────────────────────────────────────
  const sizeStyles = {
    xs: {
      container: { paddingVertical: SPACING.xs, paddingHorizontal: SPACING.sm, borderRadius: RADIUS.sm },
      text: { fontSize: FONTS.xs },
    },
    sm: {
      container: { paddingVertical: SPACING.xs + 3, paddingHorizontal: SPACING.md, borderRadius: RADIUS.md },
      text: { fontSize: FONTS.sm },
    },
    md: {
      container: { paddingVertical: SPACING.sm + 5, paddingHorizontal: SPACING.lg, borderRadius: RADIUS.lg },
      text: { fontSize: FONTS.base },
    },
    lg: {
      container: { paddingVertical: SPACING.md + 4, paddingHorizontal: SPACING.xl, borderRadius: RADIUS.lg },
      text: { fontSize: FONTS.lg },
    },
    xl: {
      container: { paddingVertical: SPACING.base, paddingHorizontal: SPACING['2xl'], borderRadius: RADIUS.xl },
      text: { fontSize: FONTS.xl },
    },
  };

  const currentVariant = variantStyles[variant] || variantStyles.primary;
  const currentSize = sizeStyles[size] || sizeStyles.md;

  const isQuietVariant = variant === 'outline' || variant === 'outlineSecondary' || variant === 'ghost' || variant === 'light';
  const spinnerColor = isQuietVariant ? COLORS.primary : COLORS.textWhite;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      style={[
        styles.base,
        currentVariant.container,
        currentSize.container,
        fullWidth && styles.fullWidth,
        isDisabled && (isQuietVariant ? styles.disabledQuiet : styles.disabled),
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && (
            <Text style={[styles.icon, { marginRight: 6 }]}>{icon}</Text>
          )}
          {title && (
            <Text
              style={[styles.text, currentVariant.text, currentSize.text, textStyle]}
              numberOfLines={1}
            >
              {title}
            </Text>
          )}
          {icon && iconPosition === 'right' && (
            <Text style={[styles.icon, { marginLeft: 6 }]}>{icon}</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.45, shadowOpacity: 0, elevation: 0 },
  disabledQuiet: { opacity: 0.4 },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: FONTS.bold,
    textAlign: 'center',
    letterSpacing: FONTS.trackNormal,
  },
  icon: { fontSize: FONTS.base },
});