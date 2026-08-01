/**
 * VUMA Store — Login Screen (Professional Final)
 * - Spinner always stops
 * - Success toast → auto-redirect to home
 * - Stack reset after login
 * - Network timeout handled
 * - No stuck states
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, StatusBar, Alert,
  ActivityIndicator, TextInput, ToastAndroid, Animated,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  login, biometricLogin, checkBiometrics, clearError,
  selectAuthLoading, selectAuthErrors, selectBiometrics,
  selectIsAuthenticated,
} from '../../store/authSlice';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../utils/constants';
import { storage } from '../../utils/storage';
import { setAuthToken } from '../../api/client';

const TIMEOUT_MS = 15000;

// Simple inline toast for iOS (Android uses ToastAndroid)
function useToast() {
  const [toast, setToast] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const showToast = (message, type = 'success') => {
    if (Platform.OS === 'android') {
      ToastAndroid.showWithGravity(message, ToastAndroid.SHORT, ToastAndroid.CENTER);
      return;
    }
    setToast({ message, type });
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1500),
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToast(null));
  };

  const ToastComponent = toast ? (
    <Animated.View style={[toastStyles.wrap, { opacity: fadeAnim }]}>
      <Text style={toastStyles.text}>{toast.message}</Text>
    </Animated.View>
  ) : null;

  return { showToast, ToastComponent };
}

const toastStyles = StyleSheet.create({
  wrap: { position: 'absolute', top: 60, alignSelf: 'center', backgroundColor: '#1B4332', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 30, zIndex: 9999, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 10 },
  text: { color: 'white', fontSize: 14, fontWeight: '600' },
});

export default function LoginScreen({ navigation }) {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const errors = useSelector(selectAuthErrors);
  const biometrics = useSelector(selectBiometrics);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const timeoutRef = useRef(null);
  const mountedRef = useRef(true);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    dispatch(checkBiometrics());
    const t = setTimeout(() => emailRef.current?.focus(), 400);
    return () => {
      mountedRef.current = false;
      clearTimeout(t);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      dispatch(clearError());
    };
  }, []);

  // When authenticated — navigate back to root (home)
  useEffect(() => {
    if (isAuthenticated && isLoading) {
      stopLoading();
    }
  }, [isAuthenticated]);

  const stopLoading = () => {
    if (mountedRef.current) setIsLoading(false);
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  };

  const handleLogin = async () => {
    if (isLoading) return;
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) { Alert.alert('Required', 'Please enter your email address.'); return; }
    if (!password) { Alert.alert('Required', 'Please enter your password.'); return; }
    if (!/\S+@\S+\.\S+/.test(trimmedEmail)) { Alert.alert('Invalid Email', 'Please enter a valid email address.'); return; }

    setIsLoading(true);
    dispatch(clearError('login'));

    // Safety: spinner always stops after 15s
    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        stopLoading();
        Alert.alert('Connection Timeout', 'Login is taking too long. Please check your internet and try again.');
      }
    }, TIMEOUT_MS);

    try {
      const result = await dispatch(login({ email: trimmedEmail, password, rememberMe }));

      if (login.fulfilled.match(result)) {
        const { access, refresh, user } = result.payload || {};

        // Explicitly save tokens (belt + suspenders)
        if (access) {
          await Promise.all([
            storage.setAccessToken(access),
            refresh ? storage.setRefreshToken(refresh) : Promise.resolve(),
            user ? storage.setUser(user) : Promise.resolve(),
          ]);
          setAuthToken(access);
        }

        stopLoading();
        showToast('✅ Login successful! Welcome back.');

        // Navigate to home after brief toast — reset the navigation stack
        setTimeout(() => {
          if (mountedRef.current) {
            // If we came from inside the app (Auth modal), go back
            if (navigation.canGoBack()) {
              navigation.popToTop();
            }
            // AppNavigator auto-switches based on isAuthenticated — no manual route needed
          }
        }, 800);

      } else if (login.rejected.match(result)) {
        stopLoading();
        const payload = result.payload;
        const msg = typeof payload === 'string'
          ? payload
          : typeof payload === 'object' && payload !== null
          ? Object.values(payload).flat().join('\n')
          : 'Invalid email or password. Please try again.';
        Alert.alert('Login Failed', msg);
        dispatch(clearError('login'));
      }
    } catch (e) {
      stopLoading();
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const handleBiometric = async () => {
    setIsLoading(true);
    const result = await dispatch(biometricLogin());
    if (biometricLogin.fulfilled.match(result)) {
      stopLoading();
      showToast('✅ Biometric login successful!');
    } else {
      stopLoading();
      const msg = result.payload || 'Biometric authentication failed.';
      Alert.alert('Error', msg);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {ToastComponent}

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={Platform.OS === 'ios' ? 20 : 60}
        keyboardOpeningTime={0}
      >
        {/* Logo */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>V</Text>
          </View>
          <Text style={styles.logoWord}>VUMA</Text>
          <Text style={styles.tagline}>Smart Shopping. Fast Delivery.</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue shopping</Text>

          {/* Email */}
          <Text style={styles.label}>Email Address</Text>
          <View style={[styles.inputWrap, isLoading && styles.inputDisabled]}>
            <Text style={styles.inputIcon}>✉</Text>
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
              editable={!isLoading}
            />
          </View>

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <View style={[styles.inputWrap, isLoading && styles.inputDisabled]}>
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
              editable={!isLoading}
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn} disabled={isLoading}>
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>

          {/* Options */}
          <View style={styles.optionsRow}>
            <TouchableOpacity style={styles.rememberRow} onPress={() => setRememberMe(v => !v)} disabled={isLoading}>
              <View style={[styles.checkbox, rememberMe && styles.checkboxOn]}>
                {rememberMe && <Text style={styles.tick}>✓</Text>}
              </View>
              <Text style={styles.rememberText}>Remember me</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={isLoading}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginBtn, isLoading && styles.loginBtnLoading]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.88}
          >
            {isLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={COLORS.textWhite} size="small" />
                <Text style={styles.loginBtnText}>Signing in...</Text>
              </View>
            ) : (
              <Text style={styles.loginBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Biometric */}
          {biometrics.canUseBiometric && !isLoading && (
            <TouchableOpacity style={styles.bioBtn} onPress={handleBiometric} activeOpacity={0.85}>
              <Text style={styles.bioIcon}>{biometrics.hasFaceID ? '😊' : '👆'}</Text>
              <Text style={styles.bioText}>
                {biometrics.hasFaceID ? 'Sign in with Face ID' : 'Sign in with Fingerprint'}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => navigation.navigate('Register')}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            <Text style={styles.createBtnText}>Create new account</Text>
          </TouchableOpacity>
        </View>

        {/* Become a Seller */}
        <TouchableOpacity
          style={styles.sellerCTA}
          onPress={() => navigation.navigate('VendorRegister', { isNewAccount: true })}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <View style={styles.sellerCTAInner}>
            <Text style={styles.sellerCTAIcon}>🏪</Text>
            <Text style={styles.sellerCTAText}>
              Want to sell? <Text style={styles.sellerLink}>Become a Seller ›</Text>
            </Text>
          </View>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, paddingHorizontal: SPACING.base, paddingBottom: SPACING['2xl'] },
  header: { alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 60 : 44, paddingBottom: SPACING.xl },
  logoBadge: {
    width: 56, height: 56, borderRadius: RADIUS.xl, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm, ...SHADOWS.primary,
  },
  logoBadgeText: { color: COLORS.textWhite, fontSize: FONTS['3xl'], fontWeight: FONTS.black },
  logoWord: { fontSize: FONTS['2xl'], fontWeight: FONTS.black, color: COLORS.secondary, letterSpacing: FONTS.trackTight, marginBottom: 2 },
  tagline: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2, fontWeight: FONTS.medium },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS['2xl'], padding: SPACING.xl, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.md },
  title: { fontSize: FONTS['3xl'], fontWeight: FONTS.extraBold, color: COLORS.textPrimary, marginBottom: 4, letterSpacing: FONTS.trackTight },
  subtitle: { fontSize: FONTS.sm, color: COLORS.textMuted, marginBottom: SPACING.xl },
  label: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary, marginBottom: 6, marginTop: 4 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, backgroundColor: COLORS.surfaceAlt,
    marginBottom: SPACING.md, minHeight: 52,
  },
  inputDisabled: { backgroundColor: COLORS.surfaceSunken, opacity: 0.75 },
  inputIcon: { fontSize: 15, marginRight: SPACING.sm, opacity: 0.6 },
  input: { flex: 1, fontSize: FONTS.base, color: COLORS.textPrimary, paddingVertical: SPACING.md },
  eyeBtn: { padding: SPACING.xs },
  eyeIcon: { fontSize: 16 },
  optionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  checkbox: { width: 20, height: 20, borderWidth: 2, borderColor: COLORS.borderStrong, borderRadius: RADIUS.xs, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tick: { color: COLORS.textWhite, fontSize: 11, fontWeight: FONTS.black },
  rememberText: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  forgotText: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.semiBold },
  loginBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: SPACING.md + 2,
    alignItems: 'center', marginBottom: SPACING.md, ...SHADOWS.primary,
  },
  loginBtnLoading: { opacity: 0.88, shadowOpacity: 0, elevation: 0 },
  loginBtnText: { color: COLORS.textWhite, fontSize: FONTS.lg, fontWeight: FONTS.bold, letterSpacing: 0.2 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  bioBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.primary, backgroundColor: COLORS.primaryFade,
    gap: SPACING.sm, marginBottom: SPACING.md,
  },
  bioIcon: { fontSize: 19 },
  bioText: { fontSize: FONTS.sm, color: COLORS.primaryDark, fontWeight: FONTS.semiBold },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: SPACING.md, gap: SPACING.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.divider },
  dividerText: { fontSize: 11, color: COLORS.textLight, fontWeight: FONTS.bold, letterSpacing: 0.5 },
  createBtn: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingVertical: SPACING.md, alignItems: 'center' },
  createBtnText: { fontSize: FONTS.base, color: COLORS.textSecondary, fontWeight: FONTS.semiBold },
  sellerCTA: { marginTop: SPACING.xl, alignItems: 'center', paddingVertical: SPACING.sm },
  sellerCTAInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sellerCTAIcon: { fontSize: 14 },
  sellerCTAText: { fontSize: FONTS.sm, color: COLORS.textMuted, textAlign: 'center' },
  sellerLink: { color: COLORS.primary, fontWeight: FONTS.bold },
});