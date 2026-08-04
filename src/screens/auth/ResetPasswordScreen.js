/**
 * VUMA Store — Reset Password Screen
 * Opened via deep link: vuma://reset-password/:uid/:token
 * (route.params.uid / route.params.token come from the linking config)
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, StatusBar, Platform, Alert,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../utils/constants';
import { post } from '../../api/client';

export default function ResetPasswordScreen({ navigation, route }) {
  const { uid, token } = route.params || {};

  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!password || password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== password2) {
      Alert.alert('Passwords Don\u2019t Match', 'Please make sure both passwords are the same.');
      return;
    }
    if (!uid || !token) {
      Alert.alert('Invalid Link', 'This reset link is invalid or has expired. Please request a new one.');
      return;
    }
    setIsLoading(true);
    try {
      await post('/users/password-reset-confirm/', {
        uidb64: uid,
        token,
        new_password: password,
        new_password2: password2,
      });
      setDone(true);
    } catch (e) {
      const msg = e?.response?.data?.error || 'This reset link is invalid or has expired. Please request a new one.';
      Alert.alert('Reset Failed', Array.isArray(msg) ? msg.join('\n') : msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <View style={styles.header}>
        <View style={{ width: 36 }} />
        <Text style={styles.headerTitle}>Set New Password</Text>
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
        {!done ? (
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <Text style={styles.icon}>🔒</Text>
            </View>
            <Text style={styles.title}>Choose a new password</Text>
            <Text style={styles.subtitle}>Your new password must be at least 6 characters.</Text>

            <Text style={styles.label}>New Password</Text>
            <View style={styles.inputWrap}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                placeholderTextColor={COLORS.textLight}
                secureTextEntry={!showPassword}
                autoFocus
                returnKeyType="next"
                editable={!isLoading}
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Confirm New Password</Text>
            <View style={styles.inputWrap}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.input}
                value={password2}
                onChangeText={setPassword2}
                placeholder="Re-enter password"
                placeholderTextColor={COLORS.textLight}
                secureTextEntry={!showPassword}
                returnKeyType="done"
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
                <Text style={styles.submitBtnText}>Reset Password</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={[styles.iconWrap, styles.iconWrapSuccess]}>
              <Text style={styles.icon}>✅</Text>
            </View>
            <Text style={styles.title}>Password reset!</Text>
            <Text style={styles.subtitle}>You can now sign in with your new password.</Text>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}
              activeOpacity={0.88}
            >
              <Text style={styles.submitBtnText}>Sign In</Text>
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
  eyeBtn: { padding: SPACING.xs },
  eyeIcon: { fontSize: 16 },
  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: SPACING.md + 2,
    alignItems: 'center', ...SHADOWS.primary,
  },
  submitBtnLoading: { opacity: 0.88, shadowOpacity: 0, elevation: 0 },
  submitBtnText: { color: COLORS.textWhite, fontSize: FONTS.lg, fontWeight: FONTS.bold },
});