/**
 * VUMA Store — Input Component
 * Reusable text input with label, error, icons
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {
  COLORS,
  FONTS,
  RADIUS,
  SPACING,
} from '../../utils/constants';

export default function Input({
  // Label
  label,
  required = false,

  // Input props
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoCorrect = false,
  secureTextEntry = false,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  editable = true,
  returnKeyType = 'done',
  onSubmitEditing,
  onBlur,
  onFocus,
  inputRef,

  // Icons
  leftIcon,
  rightIcon,
  onRightIconPress,

  // Password toggle
  isPassword = false,

  // Error
  error,

  // Helper text
  helper,

  // Character count
  showCharCount = false,

  // Style overrides
  style,
  inputStyle,
  containerStyle,
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const isSecure =
    isPassword ? !showPassword : secureTextEntry;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {/* Label */}
      {label && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>
            {label}
            {required && (
              <Text style={styles.required}> *</Text>
            )}
          </Text>
          {showCharCount && maxLength && (
            <Text style={styles.charCount}>
              {value?.length || 0}/{maxLength}
            </Text>
          )}
        </View>
      )}

      {/* Input Container */}
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          error && styles.inputContainerError,
          !editable && styles.inputContainerDisabled,
          style,
        ]}
      >
        {/* Left Icon */}
        {leftIcon && (
          <Text style={styles.leftIcon}>{leftIcon}</Text>
        )}

        {/* Text Input */}
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textLight}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          secureTextEntry={isSecure}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          editable={editable}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[
            styles.input,
            leftIcon && styles.inputWithLeft,
            (rightIcon || isPassword) &&
              styles.inputWithRight,
            multiline && styles.inputMultiline,
            !editable && styles.inputDisabled,
            inputStyle,
          ]}
        />

        {/* Password toggle */}
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.rightIconBtn}
            hitSlop={{
              top: 8,
              bottom: 8,
              left: 8,
              right: 8,
            }}
          >
            <Text style={styles.rightIcon}>
              {showPassword ? '🙈' : '👁️'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Right Icon */}
        {rightIcon && !isPassword && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIconBtn}
            disabled={!onRightIconPress}
            hitSlop={{
              top: 8,
              bottom: 8,
              left: 8,
              right: 8,
            }}
          >
            <Text style={styles.rightIcon}>{rightIcon}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Error */}
      {error && (
        <Text style={styles.error}>
          ⚠️ {typeof error === 'string' ? error : error[0]}
        </Text>
      )}

      {/* Helper */}
      {helper && !error && (
        <Text style={styles.helper}>{helper}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: SPACING.base,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  label: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  required: {
    color: COLORS.danger,
  },
  charCount: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.base,
    minHeight: 50,
  },
  inputContainerFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  inputContainerError: {
    borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerLight,
  },
  inputContainerDisabled: {
    backgroundColor: COLORS.skeleton,
    opacity: 0.7,
  },
  input: {
    flex: 1,
    fontSize: FONTS.base,
    color: COLORS.textPrimary,
    paddingVertical: SPACING.sm + 2,
    height: '100%',
  },
  inputWithLeft: {
    marginLeft: SPACING.sm,
  },
  inputWithRight: {
    marginRight: SPACING.sm,
  },
  inputMultiline: {
    height: 'auto',
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: SPACING.sm,
  },
  inputDisabled: {
    color: COLORS.textMuted,
  },
  leftIcon: {
    fontSize: FONTS.lg,
    marginRight: 2,
  },
  rightIconBtn: {
    padding: SPACING.xs,
  },
  rightIcon: {
    fontSize: FONTS.lg,
  },
  error: {
    fontSize: FONTS.xs,
    color: COLORS.danger,
    marginTop: SPACING.xs,
    marginLeft: 2,
  },
  helper: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    marginLeft: 2,
  },
});
