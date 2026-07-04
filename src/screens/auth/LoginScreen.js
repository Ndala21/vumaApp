/**
 * VUMA Store — Login Screen
 * Fixed: spinner always stops, clear error messages, proper navigation
 */

import React, { useState, useEffect, useRef } from 'react';
import { t } from '../../i18n';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, StatusBar, Alert, Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  login, biometricLogin, checkBiometrics, clearError,
  selectAuthLoading, selectAuthErrors, selectBiometrics, selectIsAuthenticated,
} from '../../store/authSlice';
import { COLORS, FONTS, SPACING, RADIUS, SCREENS } from '../../utils/constants';
import { validateEmail } from '../../utils/helpers';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

const { height } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const dispatch = useDispatch();
  const loading = useSelector(selectAuthLoading);
  const errors = useSelector(selectAuthErrors);
  const biometrics = useSelector(selectBiometrics);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isLoggingIn, setIsLoggingIn] = useState(false); // local loading state as backup

  const passwordRef = useRef(null);

  useEffect(() => {
    dispatch(checkBiometrics());
    return () => dispatch(clearError());
  }, []);

  // Navigate when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setIsLoggingIn(false);
    }
  }, [isAuthenticated]);

  // Show API errors
  useEffect(() => {
    if (!errors.login) return;
    setIsLoggingIn(false);
    if (typeof errors.login === 'string') {
      Alert.alert('Login Failed', errors.login);
      dispatch(clearError('login'));
    } else if (typeof errors.login === 'object') {
      const msg = Object.values(errors.login).flat().join('\n');
      Alert.alert('Login Failed', msg || 'Invalid credentials');
      dispatch(clearError('login'));
    }
  }, [errors.login]);

  const validate = () => {
    const errs = {};
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email.trim())) errs.email = 'Enter a valid email';
    if (!password) errs.password = 'Password is required';
    else if (password.length < 4) errs.password = 'Password too short';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    if (isLoggingIn || loading.login) return;

    setIsLoggingIn(true);
    dispatch(clearError('login'));

    try {
      const result = await dispatch(login({
        email: email.trim().toLowerCase(),
        password,
        rememberMe,
      }));

      if (login.rejected.match(result)) {
        // Error handled by useEffect above
        setIsLoggingIn(false);
      }
      // Success: AppNavigator auto-switches via isAuthenticated
    } catch (e) {
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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>VUMA</Text>
          <Text style={styles.tagline}>Smart Shopping. Fast Delivery.</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Welcome back 👋</Text>
          <Text style={styles.subtitle}>Login to your account</Text>

          {/* Email */}
          <Text style={styles.label}>Email</Text>
          <View style={[styles.inputWrap, fieldErrors.email && styles.inputError]}>
            <Text style={styles.inputIcon}>✉️</Text>
            <Input
              value={email}
              onChangeText={(v) => { setEmail(v); setFieldErrors(p => ({...p, email: null})); }}
              placeholder="your@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              style={styles.inputField}
            />
          </View>
          {fieldErrors.email && <Text style={styles.fieldError}>{fieldErrors.email}</Text>}

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <View style={[styles.inputWrap, fieldErrors.password && styles.inputError]}>
            <Text style={styles.inputIcon}>🔒</Text>
            <Input
              value={password}
              onChangeText={(v) => { setPassword(v); setFieldErrors(p => ({...p, password: null})); }}
              placeholder="Your password"
              isPassword
              inputRef={passwordRef}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              style={styles.inputField}
            />
          </View>
          {fieldErrors.password && <Text style={styles.fieldError}>{fieldErrors.password}</Text>}

          {/* Remember me + Forgot */}
          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={styles.rememberRow}
              onPress={() => setRememberMe(!rememberMe)}
              activeOpacity={0.7}
            >
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
            activeOpacity={0.8}
          >
            {showLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.loginBtnText}>Logging in...</Text>
              </View>
            ) : (
              <Text style={styles.loginBtnText}>Login</Text>
            )}
          </TouchableOpacity>

          {/* Biometric */}
          {biometrics.canUseBiometric && !showLoading && (
            <TouchableOpacity
              style={styles.biometricBtn}
              onPress={handleBiometric}
              disabled={loading.biometric}
            >
              <Text style={styles.biometricIcon}>
                {biometrics.hasFaceID ? '😊' : '👆'}
              </Text>
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

          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => navigation.navigate(SCREENS.REGISTER)}
          >
            <Text style={styles.registerBtnText}>Create new account</Text>
          </TouchableOpacity>
        </View>

        {/* Vendor CTA */}
        <TouchableOpacity
          style={styles.vendorCTA}
          onPress={() => navigation.navigate('VendorRegister', { isNewAccount: true })}
        >
          <Text style={styles.vendorCTAText}>
            🏪 Want to sell on VUMA?{' '}
            <Text style={styles.vendorCTALink}>Register as vendor →</Text>
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
  logo: { fontSize: FONTS['6xl'], fontWeight: FONTS.black, color: COLORS.primary, letterSpacing: -2 },
  tagline: { fontSize: FONTS.sm, color: COLORS.textMuted, marginTop: SPACING.xs, fontWeight: FONTS.medium },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 4 },
  title: { fontSize: FONTS['2xl'], fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  subtitle: { fontSize: FONTS.base, color: COLORS.textMuted, marginBottom: SPACING.xl },
  label: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.sm, backgroundColor: COLORS.surface, marginBottom: SPACING.sm },
  inputError: { borderColor: COLORS.danger },
  inputIcon: { fontSize: 16, marginRight: SPACING.xs },
  inputField: { flex: 1, borderWidth: 0, paddingHorizontal: 0 },
  fieldError: { fontSize: FONTS.xs, color: COLORS.danger, marginTop: -SPACING.xs, marginBottom: SPACING.sm },
  optionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  checkbox: { width: 20, height: 20, borderWidth: 2, borderColor: COLORS.border, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkmark: { color: COLORS.textWhite, fontSize: FONTS.xs, fontWeight: FONTS.bold },
  rememberText: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  forgotText: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.semiBold },
  loginBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: SPACING.base, alignItems: 'center', marginBottom: SPACING.base },
  loginBtnDisabled: { backgroundColor: COLORS.primaryLight, opacity: 0.8 },
  loginBtnText: { color: COLORS.textWhite, fontSize: FONTS.base, fontWeight: FONTS.bold },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  biometricBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.sm + 4, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.primary, gap: SPACING.sm, marginBottom: SPACING.base },
  biometricIcon: { fontSize: FONTS.xl },
  biometricText: { fontSize: FONTS.base, color: COLORS.primary, fontWeight: FONTS.semiBold },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: SPACING.base, gap: SPACING.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.divider },
  dividerText: { fontSize: FONTS.xs, color: COLORS.textMuted, fontWeight: FONTS.semiBold },
  registerBtn: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingVertical: SPACING.sm + 4, alignItems: 'center' },
  registerBtnText: { fontSize: FONTS.base, color: COLORS.textSecondary, fontWeight: FONTS.semiBold },
  vendorCTA: { marginTop: SPACING.xl, alignItems: 'center', paddingVertical: SPACING.sm },
  vendorCTAText: { fontSize: FONTS.sm, color: COLORS.textMuted, textAlign: 'center' },
  vendorCTALink: { color: COLORS.primary, fontWeight: FONTS.bold },
});