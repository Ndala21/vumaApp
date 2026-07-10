/**
 * VUMA Store — Login Screen (Final Fix)
 * Keyboard works, spinner stops, navigation happens automatically
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, StatusBar, Alert,
  ActivityIndicator, TextInput,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  login, biometricLogin, checkBiometrics, clearError,
  selectAuthLoading, selectAuthErrors, selectBiometrics,
  selectIsAuthenticated,
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
  const [localLoading, setLocalLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  // Focus email on mount
  useEffect(() => {
    dispatch(checkBiometrics());
    const t = setTimeout(() => emailRef.current?.focus(), 400);
    return () => { clearTimeout(t); dispatch(clearError()); };
  }, []);

  // ── Navigation: when isAuthenticated becomes true, AppNavigator auto-switches ──
  // No manual navigation needed — Redux state change triggers NavigationContainer re-render
  useEffect(() => {
    if (isAuthenticated && submitted) {
      setLocalLoading(false);
      setSubmitted(false);
    }
  }, [isAuthenticated]);

  // ── Show errors ──
  useEffect(() => {
    if (!errors.login) return;
    setLocalLoading(false);
    setSubmitted(false);
    const msg = typeof errors.login === 'string'
      ? errors.login
      : Object.values(errors.login).flat().join('\n') || 'Invalid email or password.';
    Alert.alert('Login Failed', msg, [
      { text: 'Try Again', onPress: () => dispatch(clearError('login')) },
    ]);
  }, [errors.login]);

  const validate = () => {
    if (!email.trim()) { Alert.alert('Required', 'Please enter your email.'); return false; }
    if (!password) { Alert.alert('Required', 'Please enter your password.'); return false; }
    return true;
  };

  const handleLogin = async () => {
    if (localLoading || loading.login || !validate()) return;
    setLocalLoading(true);
    setSubmitted(true);
    dispatch(clearError('login'));
    const result = await dispatch(login({
      email: email.trim().toLowerCase(),
      password,
      rememberMe,
    }));
    // If rejected, errors.login will trigger the useEffect above
    if (login.rejected.match(result)) {
      setLocalLoading(false);
      setSubmitted(false);
    }
  };

  const showLoading = localLoading || loading.login;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
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
          <Text style={styles.subtitle}>Sign in to continue shopping</Text>

          {/* Email */}
          <Text style={styles.label}>Email Address</Text>
          <View style={styles.inputWrap}>
            <Text style={styles.inputIcon}>✉️</Text>
            <TextInput
              ref={emailRef}
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor={COLORS.textLight}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              editable={!showLoading}
            />
          </View>

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrap}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput
              ref={passwordRef}
              style={[styles.input, { flex: 1 }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              placeholderTextColor={COLORS.textLight}
              secureTextEntry={!showPassword}
              autoComplete="password"
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              editable={!showLoading}
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
              <Text>{showPassword ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>

          {/* Options */}
          <View style={styles.optionsRow}>
            <TouchableOpacity style={styles.rememberRow} onPress={() => setRememberMe(v => !v)}>
              <View style={[styles.checkbox, rememberMe && styles.checkboxOn]}>
                {rememberMe && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.rememberText}>Remember me</Text>
            </TouchableOpacity>
            <TouchableOpacity><Text style={styles.forgotText}>Forgot password?</Text></TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginBtn, showLoading && styles.loginBtnLoading]}
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
            <TouchableOpacity
              style={styles.biometricBtn}
              onPress={() => dispatch(biometricLogin())}
            >
              <Text style={styles.biometricIcon}>{biometrics.hasFaceID ? '😊' : '👆'}</Text>
              <Text style={styles.biometricText}>
                {biometrics.hasFaceID ? 'Sign in with Face ID' : 'Sign in with Fingerprint'}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.createBtnText}>Create new account</Text>
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
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scroll: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 40 },
  header: { alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 28 },
  logo: { fontSize: 48, fontWeight: '900', color: '#FF6B00', letterSpacing: -2 },
  tagline: { fontSize: 13, color: '#999', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 4 },
  title: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#999', marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 4 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E8E8E8', borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#fff', marginBottom: 12, minHeight: 52 },
  inputIcon: { fontSize: 16, marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: '#1A1A1A', paddingVertical: 14 },
  eyeBtn: { padding: 8 },
  optionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 20, height: 20, borderWidth: 2, borderColor: '#E8E8E8', borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: '#FF6B00', borderColor: '#FF6B00' },
  checkmark: { color: 'white', fontSize: 11, fontWeight: '900' },
  rememberText: { fontSize: 13, color: '#555' },
  forgotText: { fontSize: 13, color: '#FF6B00', fontWeight: '600' },
  loginBtn: { backgroundColor: '#FF6B00', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  loginBtnLoading: { opacity: 0.8 },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  biometricBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#FF6B00', gap: 8, marginBottom: 12 },
  biometricIcon: { fontSize: 20 },
  biometricText: { fontSize: 14, color: '#FF6B00', fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#EEE' },
  dividerText: { fontSize: 12, color: '#999', fontWeight: '600' },
  createBtn: { borderWidth: 1.5, borderColor: '#E8E8E8', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  createBtnText: { fontSize: 15, color: '#555', fontWeight: '600' },
  sellerCTA: { marginTop: 24, alignItems: 'center', paddingVertical: 8 },
  sellerCTAText: { fontSize: 13, color: '#999', textAlign: 'center' },
  sellerCTALink: { color: '#FF6B00', fontWeight: '700' },
});