/**
 * VUMA Store — Login Screen
 * Fixed: keyboard opens instantly, Free Delivery, Tanzania-friendly
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, StatusBar, Alert, Dimensions,
  ActivityIndicator, TextInput,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  login, biometricLogin, checkBiometrics, clearError,
  selectAuthLoading, selectAuthErrors, selectBiometrics, selectIsAuthenticated,
} from '../../store/authSlice';
import { COLORS, FONTS, SPACING, RADIUS } from '../../utils/constants';

export default function LoginScreen({ navigation }) {
  const dispatch = useDispatch();
  const loading = useSelector(selectAuthLoading);
  const errors = useSelector(selectAuthErrors);
  const biometrics = useSelector(selectBiometrics);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  useEffect(() => {
    dispatch(checkBiometrics());
    // Auto-focus email on mount
    setTimeout(() => emailRef.current?.focus(), 300);
    return () => dispatch(clearError());
  }, []);

  useEffect(() => {
    if (isAuthenticated) setIsLoggingIn(false);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!errors.login) return;
    setIsLoggingIn(false);
    const msg = typeof errors.login === 'string'
      ? errors.login
      : Object.values(errors.login).flat().join('\n') || 'Invalid email or password';
    Alert.alert('Login Failed', msg);
    dispatch(clearError('login'));
  }, [errors.login]);

  const validate = () => {
    const errs = {};
    if (!email.trim()) errs.email = 'Email is required';
    if (!password) errs.password = 'Password is required';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async () => {
    if (!validate() || isLoggingIn || loading.login) return;
    setIsLoggingIn(true);
    dispatch(clearError('login'));
    try {
      const result = await dispatch(login({ email: email.trim().toLowerCase(), password, rememberMe }));
      if (login.rejected.match(result)) setIsLoggingIn(false);
    } catch {
      setIsLoggingIn(false);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const handleBiometric = async () => {
    const result = await dispatch(biometricLogin());
    if (biometricLogin.rejected.match(result)) {
      Alert.alert('Error', result.payload || 'Biometric failed.');
    }
  };

  const showLoading = isLoggingIn || loading.login;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.header}>
          <Text style={styles.logo}>VUMA</Text>
          <Text style={styles.tagline}>Smart Shopping. Fast Delivery.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Welcome back 👋</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>

          {/* Email */}
          <Text style={styles.label}>Email Address</Text>
          <View style={[styles.inputWrap, fieldErrors.email && styles.inputError]}>
            <Text style={styles.inputIcon}>✉️</Text>
            <TextInput
              ref={emailRef}
              style={styles.input}
              value={email}
              onChangeText={(v) => { setEmail(v); setFieldErrors(p => ({ ...p, email: null })); }}
              placeholder="your@email.com"
              placeholderTextColor={COLORS.textLight}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              editable={!showLoading}
            />
          </View>
          {fieldErrors.email && <Text style={styles.fieldError}>{fieldErrors.email}</Text>}

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <View style={[styles.inputWrap, fieldErrors.password && styles.inputError]}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput
              ref={passwordRef}
              style={[styles.input, { flex: 1 }]}
              value={password}
              onChangeText={(v) => { setPassword(v); setFieldErrors(p => ({ ...p, password: null })); }}
              placeholder="Your password"
              placeholderTextColor={COLORS.textLight}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              editable={!showLoading}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Text>{showPassword ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>
          {fieldErrors.password && <Text style={styles.fieldError}>{fieldErrors.password}</Text>}

          {/* Remember + Forgot */}
          <View style={styles.optionsRow}>
            <TouchableOpacity style={styles.rememberRow} onPress={() => setRememberMe(!rememberMe)}>
              <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                {rememberMe && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.rememberText}>Remember me</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginBtn, showLoading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={showLoading}
            activeOpacity={0.85}
          >
            {showLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.loginBtnText}>Signing in...</Text>
              </View>
            ) : (
              <Text style={styles.loginBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Biometric */}
          {biometrics.canUseBiometric && !showLoading && (
            <TouchableOpacity style={styles.biometricBtn} onPress={handleBiometric}>
              <Text style={styles.biometricIcon}>{biometrics.hasFaceID ? '😊' : '👆'}</Text>
              <Text style={styles.biometricText}>
                {biometrics.hasFaceID ? 'Login with Face ID' : 'Login with Fingerprint'}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.registerBtn} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerBtnText}>Create new account</Text>
          </TouchableOpacity>
        </View>

        {/* Become a Seller */}
        <TouchableOpacity
          style={styles.sellerCTA}
          onPress={() => navigation.navigate('VendorRegister', { isNewAccount: true })}
        >
          <Text style={styles.sellerCTAText}>
            🏪 Want to sell on VUMA?{' '}
            <Text style={styles.sellerCTALink}>Become a Seller →</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, paddingHorizontal: SPACING.base, paddingBottom: SPACING['2xl'] },
  header: { alignItems: 'center', paddingTop: Platform.OS === 'ios' ? SPACING['3xl'] : SPACING['2xl'], paddingBottom: SPACING.xl },
  logo: { fontSize: 48, fontWeight: '900', color: COLORS.primary, letterSpacing: -2 },
  tagline: { fontSize: FONTS.sm, color: COLORS.textMuted, marginTop: SPACING.xs },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 4 },
  title: { fontSize: FONTS['2xl'], fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  subtitle: { fontSize: FONTS.base, color: COLORS.textMuted, marginBottom: SPACING.xl },
  label: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.sm, backgroundColor: COLORS.surface, marginBottom: SPACING.sm, minHeight: 50 },
  inputError: { borderColor: COLORS.danger },
  inputIcon: { fontSize: 16, marginRight: SPACING.xs },
  input: { flex: 1, fontSize: FONTS.base, color: COLORS.textPrimary, paddingVertical: SPACING.sm },
  eyeBtn: { padding: SPACING.sm },
  fieldError: { fontSize: FONTS.xs, color: COLORS.danger, marginTop: -SPACING.xs, marginBottom: SPACING.sm },
  optionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  checkbox: { width: 20, height: 20, borderWidth: 2, borderColor: COLORS.border, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkmark: { color: 'white', fontSize: FONTS.xs, fontWeight: FONTS.bold },
  rememberText: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  forgotText: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.semiBold },
  loginBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: SPACING.base + 2, alignItems: 'center', marginBottom: SPACING.base },
  loginBtnDisabled: { opacity: 0.75 },
  loginBtnText: { color: 'white', fontSize: FONTS.base, fontWeight: FONTS.bold },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  biometricBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.sm + 4, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.primary, gap: SPACING.sm, marginBottom: SPACING.base },
  biometricIcon: { fontSize: FONTS.xl },
  biometricText: { fontSize: FONTS.base, color: COLORS.primary, fontWeight: FONTS.semiBold },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: SPACING.base, gap: SPACING.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.divider },
  dividerText: { fontSize: FONTS.xs, color: COLORS.textMuted, fontWeight: FONTS.semiBold },
  registerBtn: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingVertical: SPACING.sm + 4, alignItems: 'center' },
  registerBtnText: { fontSize: FONTS.base, color: COLORS.textSecondary, fontWeight: FONTS.semiBold },
  sellerCTA: { marginTop: SPACING.xl, alignItems: 'center', paddingVertical: SPACING.sm },
  sellerCTAText: { fontSize: FONTS.sm, color: COLORS.textMuted, textAlign: 'center' },
  sellerCTALink: { color: COLORS.primary, fontWeight: FONTS.bold },
});
