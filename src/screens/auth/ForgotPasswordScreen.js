/**
 * VUMA Store — Forgot Password Screen
 * Enter email → backend sends a deep-link password reset email.
 * Matches Login/Register screen styling and keyboard handling.
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, StatusBar, Platform, Alert,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../utils/constants';
import { post } from '../../api/client';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    setIsLoading(true);
    try {
      await post('/users/password-reset/', { email: trimmed });
      setSent(true);
    } catch (e) {
      // Backend intentionally always returns success (doesn't reveal if email exists)
      setSent(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reset Password</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={Platform.OS === 'ios' ? 20 : 60}
        keyboardOpeningTime={0}
      >
        {!sent ? (
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <Text style={styles.icon}>🔑</Text>
            </View>
            <Text style={styles.title}>Forgot your password?</Text>
            <Text style={styles.subtitle}>
              Enter the email address linked to your VUMA account and we'll send you a link to reset your password.
            </Text>

            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputWrap}>
              <Text style={styles.inputIcon}>✉</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                placeholderTextColor={COLORS.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                returnKeyType="send"
                onSubmitEditing={handleSubmit}
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, isLoading && styles.submitBtnLoading]}
              onPress={handleSubmit}
              disabled={isLoading}
              activeOpacity={0.88}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.textWhite} size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backToLogin}>
              <Text style={styles.backToLoginText}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={[styles.iconWrap, styles.iconWrapSuccess]}>
              <Text style={styles.icon}>✅</Text>
            </View>
            <Text style={styles.title}>Check your email</Text>
            <Text style={styles.subtitle}>
              If an account exists for <Text style={{ fontWeight: FONTS.bold, color: COLORS.textPrimary }}>{email.trim()}</Text>, a password reset link has been sent. Tap the link in that email to set a new password.
            </Text>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.88}
            >
              <Text style={styles.submitBtnText}>Back to Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSent(false)} style={styles.backToLogin}>
              <Text style={styles.backToLoginText}>Didn't get it? Try again</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, paddingHorizontal: SPACING.base,
    paddingTop: Platform.OS === 'ios' ? 50 : 24, paddingBottom: SPACING.base,
    borderBottomWidth: 1, borderBottomColor: COLORS.divider,
  },
  backBtn: { width: 36, height: 36, borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 24, color: COLORS.textPrimary, fontWeight: FONTS.bold, marginTop: -2 },
  headerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  scroll: { flexGrow: 1, padding: SPACING.base, justifyContent: 'center' },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS['2xl'], padding: SPACING.xl, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.md },
  iconWrap: { width: 72, height: 72, borderRadius: RADIUS.full, backgroundColor: COLORS.primaryFade, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: SPACING.base },
  iconWrapSuccess: { backgroundColor: COLORS.successLight },
  icon: { fontSize: 32 },
  title: { fontSize: FONTS['2xl'], fontWeight: FONTS.extraBold, color: COLORS.textPrimary, textAlign: 'center', marginBottom: SPACING.sm, letterSpacing: FONTS.trackTight },
  subtitle: { fontSize: FONTS.sm, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.xl },
  label: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, backgroundColor: COLORS.surfaceAlt,
    marginBottom: SPACING.lg, minHeight: 52,
  },
  inputIcon: { fontSize: 15, marginRight: SPACING.sm, opacity: 0.6 },
  input: { flex: 1, fontSize: FONTS.base, color: COLORS.textPrimary, paddingVertical: SPACING.md },
  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: SPACING.md + 2,
    alignItems: 'center', ...SHADOWS.primary,
  },
  submitBtnLoading: { opacity: 0.88, shadowOpacity: 0, elevation: 0 },
  submitBtnText: { color: COLORS.textWhite, fontSize: FONTS.lg, fontWeight: FONTS.bold },
  backToLogin: { marginTop: SPACING.lg, alignItems: 'center' },
  backToLoginText: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.semiBold },
});