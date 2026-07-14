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
import { COLORS, FONTS, SPACING, RADIUS } from '../../utils/constants';
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* iOS Toast */}
      {ToastComponent}

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

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Welcome back 👋</Text>
          <Text style={styles.subtitle}>Sign in to continue shopping</Text>

          {/* Email */}
          <Text style={styles.label}>Email Address</Text>
          <View style={[styles.inputWrap, isLoading && styles.inputDisabled]}>
            <Text style={styles.inputIcon}>✉️</Text>
            <TextInput
              ref={emailRef}
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor="#BBB"
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
              placeholderTextColor="#BBB"
              secureTextEntry={!showPassword}
              autoComplete="password"
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              editable={!isLoading}
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn} disabled={isLoading}>
              <Text>{showPassword ? '🙈' : '👁'}</Text>
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
            activeOpacity={0.85}
          >
            {isLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.loginBtnText}>Signing in...</Text>
              </View>
            ) : (
              <Text style={styles.loginBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Biometric */}
          {biometrics.canUseBiometric && !isLoading && (
            <TouchableOpacity style={styles.bioBtn} onPress={handleBiometric}>
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
          >
            <Text style={styles.createBtnText}>Create new account</Text>
          </TouchableOpacity>
        </View>

        {/* Become a Seller */}
        <TouchableOpacity
          style={styles.sellerCTA}
          onPress={() => navigation.navigate('VendorRegister', { isNewAccount: true })}
          disabled={isLoading}
        >
          <Text style={styles.sellerCTAText}>
            🏪 Want to sell?{' '}
            <Text style={styles.sellerLink}>Become a Seller →</Text>
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
  logo: { fontSize: 52, fontWeight: '900', color: '#FF6B00', letterSpacing: -2 },
  tagline: { fontSize: 13, color: '#999', marginTop: 4, fontWeight: '500' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 6 },
  title: { fontSize: 24, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#999', marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 4 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E8E8E8', borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#fff', marginBottom: 12, minHeight: 52 },
  inputDisabled: { backgroundColor: '#F9F9F9', opacity: 0.8 },
  inputIcon: { fontSize: 16, marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: '#1A1A1A', paddingVertical: 14 },
  eyeBtn: { padding: 8 },
  optionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 20, height: 20, borderWidth: 2, borderColor: '#E0E0E0', borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: '#FF6B00', borderColor: '#FF6B00' },
  tick: { color: 'white', fontSize: 11, fontWeight: '900' },
  rememberText: { fontSize: 13, color: '#555' },
  forgotText: { fontSize: 13, color: '#FF6B00', fontWeight: '600' },
  loginBtn: { backgroundColor: '#FF6B00', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 12, shadowColor: '#FF6B00', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  loginBtnLoading: { opacity: 0.85, shadowOpacity: 0 },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bioBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#FF6B00', gap: 8, marginBottom: 12 },
  bioIcon: { fontSize: 20 },
  bioText: { fontSize: 14, color: '#FF6B00', fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#F0F0F0' },
  dividerText: { fontSize: 12, color: '#BBB', fontWeight: '600' },
  createBtn: { borderWidth: 1.5, borderColor: '#E8E8E8', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  createBtnText: { fontSize: 15, color: '#555', fontWeight: '600' },
  sellerCTA: { marginTop: 24, alignItems: 'center', paddingVertical: 8 },
  sellerCTAText: { fontSize: 13, color: '#999', textAlign: 'center' },
  sellerLink: { color: '#FF6B00', fontWeight: '700' },
});
