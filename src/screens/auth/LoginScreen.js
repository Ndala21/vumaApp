/**
 * VUMA Store — Login Screen (Professional Final)
 * - Spinner always stops
 * - Success toast → auto-redirect to home
 * - Stack reset after login
 * - Network timeout handled
 * - No stuck states
 *
 * Updated: Google Sign-In added as another way to reach the same
 * signed-in state - shares the exact same success path (token
 * storage, toast, navigation reset) as normal email/password login.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, StatusBar, Alert,
  ActivityIndicator, TextInput, ToastAndroid, Animated,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  login, googleLogin, biometricLogin, checkBiometrics, clearError,
  selectAuthLoading, selectAuthErrors, selectBiometrics,
  selectIsAuthenticated,
} from '../../store/authSlice';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../utils/constants';
import { storage } from '../../utils/storage';
import { setAuthToken } from '../../api/client';

const TIMEOUT_MS = 15000;

// Web Client ID from Google Cloud Console - required even for
// Android/iOS sign-in, since this is what lets the backend verify
// the resulting ID token's audience. Not a secret (it ships inside
// the app itself either way).
const GOOGLE_WEB_CLIENT_ID = '532626175456-qppebcnam0qu1m0shlh63uto8jsg6sqc.apps.googleusercontent.com';

// Google's official multi-color "G" mark, embedded directly as a
// small base64 PNG so the sign-in button never depends on a network
// fetch for its own icon, and matches Google's real branding instead
// of a plain styled letter.
const GOOGLE_LOGO_URI = 'data:image/png;base64,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';

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  offlineAccess: false,
});

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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

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

  // Shared by both email/password and Google sign-in — same toast,
  // same stack-reset back to the auto-switching AppNavigator root.
  const goToHomeAfterSignIn = (message) => {
    showToast(message);
    setTimeout(() => {
      if (mountedRef.current && navigation.canGoBack()) {
        navigation.popToTop();
      }
    }, 800);
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
        goToHomeAfterSignIn('✅ Login successful! Welcome back.');

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

  const handleGoogleSignIn = async () => {
    if (isGoogleLoading || isLoading) return;
    setIsGoogleLoading(true);
    dispatch(clearError('login'));

    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();

      // The library's response shape differs by version - newer ones
      // wrap everything under result.data, older ones return it
      // directly. This covers both without needing to know which.
      const idToken = result?.data?.idToken || result?.idToken;
      if (!idToken) {
        throw new Error('Could not get a Google ID token. Please try again.');
      }

      const dispatched = await dispatch(googleLogin({ idToken }));

      if (googleLogin.fulfilled.match(dispatched)) {
        const { user } = dispatched.payload || {};
        setIsGoogleLoading(false);
        goToHomeAfterSignIn(`✅ Welcome${user?.username ? ', ' + user.username : ''}!`);
      } else if (googleLogin.rejected.match(dispatched)) {
        setIsGoogleLoading(false);
        const payload = dispatched.payload;
        const msg = typeof payload === 'string' ? payload : 'Google sign-in failed. Please try again.';
        Alert.alert('Google Sign-In Failed', msg);
        dispatch(clearError('login'));
      }
    } catch (error) {
      setIsGoogleLoading(false);
      // A cancelled sign-in (user backed out of the Google picker) is
      // not an error worth interrupting them about.
      if (error?.code === statusCodes?.SIGN_IN_CANCELLED) return;
      if (error?.code === statusCodes?.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Google Play Services Required', 'Please update Google Play Services and try again.');
        return;
      }
      Alert.alert('Google Sign-In Failed', error?.message || 'Something went wrong. Please try again.');
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
            <TouchableOpacity disabled={isLoading} onPress={() => navigation.navigate('ForgotPassword')}>
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

          {/* Google Sign-In */}
          <View style={styles.googleDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.googleBtn, isGoogleLoading && styles.loginBtnLoading]}
            onPress={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
            activeOpacity={0.85}
          >
            {isGoogleLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={COLORS.textPrimary} size="small" />
                <Text style={styles.googleBtnText}>Signing in...</Text>
              </View>
            ) : (
              <View style={styles.loadingRow}>
                <Image source={{ uri: GOOGLE_LOGO_URI }} style={styles.googleIcon} resizeMode="contain" />
                <Text style={styles.googleBtnText}>Continue with Google</Text>
              </View>
            )}
          </TouchableOpacity>

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
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, justifyContent: 'center' },
  bioBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.primary, backgroundColor: COLORS.primaryFade,
    gap: SPACING.sm, marginBottom: SPACING.md,
  },
  bioIcon: { fontSize: 19 },
  bioText: { fontSize: FONTS.sm, color: COLORS.primaryDark, fontWeight: FONTS.semiBold },
  googleDivider: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.xs, marginBottom: SPACING.md, gap: SPACING.sm },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface,
    gap: SPACING.sm, marginBottom: SPACING.md,
  },
  googleIcon: { width: 20, height: 20 },
  googleBtnText: { fontSize: FONTS.sm, color: COLORS.textPrimary, fontWeight: FONTS.semiBold },
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