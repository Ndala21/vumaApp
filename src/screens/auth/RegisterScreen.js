/**
 * VUMA Store — Register Screen (Fixed)
 * - Spinner always stops
 * - Auto login after registration
 * - Clear error messages
 * - 15s timeout safety
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, StatusBar, Alert,
  ActivityIndicator, TextInput, ToastAndroid,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  register, clearError, selectAuthLoading,
  selectAuthErrors, selectIsAuthenticated,
} from '../../store/authSlice';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, LANGUAGES } from '../../utils/constants';
import { storage } from '../../utils/storage';
import { setAuthToken } from '../../api/client';

const TIMEOUT_MS = 15000;

export default function RegisterScreen({ navigation }) {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const errors = useSelector(selectAuthErrors);

  const [form, setFormState] = useState({
    username: '', email: '', password: '',
    confirmPassword: '', phone: '', language: 'en',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const emailRef    = useRef(null);
  const passwordRef = useRef(null);
  const phoneRef    = useRef(null);
  const timeoutRef  = useRef(null);
  const mountedRef  = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      dispatch(clearError());
    };
  }, []);

  // Auto-navigate after successful registration (isAuthenticated = true)
  useEffect(() => {
    if (isAuthenticated && isLoading) {
      stopLoading();
      showToast('✅ Account created! Welcome to VUMA!');
    }
  }, [isAuthenticated]);

  // Show API errors
  useEffect(() => {
    if (!errors.register) return;
    stopLoading();
    if (typeof errors.register === 'string') {
      Alert.alert('Registration Failed', errors.register);
    } else if (typeof errors.register === 'object') {
      const msgs = Object.entries(errors.register)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
        .join('\n');
      Alert.alert('Registration Failed', msgs || 'Please check your details and try again.');
      // Also set field-level errors
      setFieldErrors(errors.register);
    }
    dispatch(clearError('register'));
  }, [errors.register]);

  const stopLoading = () => {
    if (mountedRef.current) setIsLoading(false);
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  };

  const showToast = (msg) => {
    if (Platform.OS === 'android') {
      ToastAndroid.showWithGravity(msg, ToastAndroid.LONG, ToastAndroid.CENTER);
    }
  };

  const setField = (key, value) => {
    setFormState(prev => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) setFieldErrors(prev => ({ ...prev, [key]: null }));
  };

  const validate = () => {
    const errs = {};
    if (!form.username.trim() || form.username.trim().length < 3)
      errs.username = 'Username must be at least 3 characters';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email))
      errs.email = 'Enter a valid email address';
    if (!form.password || form.password.length < 6)
      errs.password = 'Password must be at least 6 characters';
    if (form.password !== form.confirmPassword)
      errs.confirmPassword = 'Passwords do not match';
    if (!agreedToTerms)
      errs.terms = 'Please agree to Terms & Conditions';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async () => {
    if (isLoading) return;
    if (!validate()) return;

    setIsLoading(true);
    dispatch(clearError('register'));
    setFieldErrors({});

    // Safety timeout — spinner always stops
    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        stopLoading();
        Alert.alert('Timeout', 'Registration is taking too long. Please check your internet and try again.');
      }
    }, TIMEOUT_MS);

    try {
      const result = await dispatch(register({
        username: form.username.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        password2: form.confirmPassword,
        phone: form.phone.trim(),
        language: form.language,
      }));

      if (register.fulfilled.match(result)) {
        const { access, refresh, user } = result.payload || {};

        // Explicitly save tokens
        if (access) {
          await Promise.all([
            storage.setAccessToken(access),
            refresh ? storage.setRefreshToken(refresh) : Promise.resolve(),
            user ? storage.setUser(user) : Promise.resolve(),
          ]);
          setAuthToken(access);
        }

        stopLoading();
        showToast('✅ Account created! Welcome to VUMA!');
        // AppNavigator auto-switches via isAuthenticated → true

      } else if (register.rejected.match(result)) {
        stopLoading();
        const payload = result.payload;
        if (typeof payload === 'string') {
          Alert.alert('Registration Failed', payload);
        } else if (typeof payload === 'object' && payload) {
          const msgs = Object.entries(payload)
            .map(([k, v]) => `${Array.isArray(v) ? v.join(', ') : v}`)
            .join('\n');
          Alert.alert('Registration Failed', msgs || 'Please check your details.');
          setFieldErrors(payload);
        } else {
          Alert.alert('Registration Failed', 'Please check your details and try again.');
        }
        dispatch(clearError('register'));
      }
    } catch (e) {
      stopLoading();
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const FieldError = ({ field }) => fieldErrors[field] ? (
    <Text style={styles.fieldError}>{fieldErrors[field]}</Text>
  ) : null;

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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerLogoRow}>
            <View style={styles.logoBadge}><Text style={styles.logoBadgeText}>V</Text></View>
            <Text style={styles.logo}>VUMA</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join thousands of shoppers in Tanzania</Text>

        <View style={styles.card}>
          {/* Username */}
          <Text style={styles.label}>Username *</Text>
          <View style={[styles.inputWrap, fieldErrors.username && styles.inputError]}>
            <Text style={styles.inputIcon}>👤</Text>
            <TextInput
              style={styles.input}
              value={form.username}
              onChangeText={v => setField('username', v)}
              placeholder="Choose a username"
              placeholderTextColor={COLORS.textLight}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              editable={!isLoading}
            />
          </View>
          <FieldError field="username" />

          {/* Email */}
          <Text style={styles.label}>Email Address *</Text>
          <View style={[styles.inputWrap, fieldErrors.email && styles.inputError]}>
            <Text style={styles.inputIcon}>✉</Text>
            <TextInput
              ref={emailRef}
              style={styles.input}
              value={form.email}
              onChangeText={v => setField('email', v)}
              placeholder="your@email.com"
              placeholderTextColor={COLORS.textLight}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => phoneRef.current?.focus()}
              editable={!isLoading}
            />
          </View>
          <FieldError field="email" />

          {/* Phone */}
          <Text style={styles.label}>Phone Number</Text>
          <View style={[styles.inputWrap, fieldErrors.phone && styles.inputError]}>
            <Text style={styles.inputIcon}>📞</Text>
            <TextInput
              ref={phoneRef}
              style={styles.input}
              value={form.phone}
              onChangeText={v => setField('phone', v)}
              placeholder="+255 7XX XXX XXX"
              placeholderTextColor={COLORS.textLight}
              keyboardType="phone-pad"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              editable={!isLoading}
            />
          </View>
          <FieldError field="phone" />

          {/* Password */}
          <Text style={styles.label}>Password *</Text>
          <View style={[styles.inputWrap, fieldErrors.password && styles.inputError]}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput
              ref={passwordRef}
              style={[styles.input, { flex: 1 }]}
              value={form.password}
              onChangeText={v => setField('password', v)}
              placeholder="At least 6 characters"
              placeholderTextColor={COLORS.textLight}
              secureTextEntry={!showPassword}
              returnKeyType="next"
              editable={!isLoading}
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>
          <FieldError field="password" />

          {/* Confirm Password */}
          <Text style={styles.label}>Confirm Password *</Text>
          <View style={[styles.inputWrap, fieldErrors.confirmPassword && styles.inputError]}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput
              style={styles.input}
              value={form.confirmPassword}
              onChangeText={v => setField('confirmPassword', v)}
              placeholder="Re-enter password"
              placeholderTextColor={COLORS.textLight}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleRegister}
              editable={!isLoading}
            />
          </View>
          <FieldError field="confirmPassword" />

          {/* Terms */}
          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setAgreedToTerms(v => !v)}
            activeOpacity={0.75}
          >
            <View style={[styles.checkbox, agreedToTerms && styles.checkboxOn]}>
              {agreedToTerms && <Text style={styles.tick}>✓</Text>}
            </View>
            <Text style={styles.termsText}>
              I agree to VUMA's{' '}
              <Text style={styles.termsLink}>Terms & Conditions</Text>
              {' '}and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>
          {fieldErrors.terms && <Text style={styles.fieldError}>{fieldErrors.terms}</Text>}

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.registerBtn, isLoading && styles.registerBtnLoading]}
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.88}
          >
            {isLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={COLORS.textWhite} size="small" />
                <Text style={styles.registerBtnText}>Creating account...</Text>
              </View>
            ) : (
              <Text style={styles.registerBtnText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Already have an account?</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => navigation.navigate('Login')}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            <Text style={styles.loginBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, paddingHorizontal: SPACING.base, paddingBottom: SPACING['2xl'] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 50 : 24, paddingBottom: SPACING.sm },
  backBtn: { width: 40, height: 40, borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 26, color: COLORS.textPrimary, fontWeight: FONTS.bold, marginTop: -2 },
  headerLogoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoBadge: { width: 24, height: 24, borderRadius: RADIUS.sm, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  logoBadgeText: { color: COLORS.textWhite, fontSize: FONTS.sm, fontWeight: FONTS.black },
  logo: { fontSize: FONTS.lg, fontWeight: FONTS.black, color: COLORS.secondary, letterSpacing: FONTS.trackTight },
  title: { fontSize: FONTS['3xl'], fontWeight: FONTS.extraBold, color: COLORS.textPrimary, marginBottom: 4, marginTop: SPACING.sm, letterSpacing: FONTS.trackTight },
  subtitle: { fontSize: FONTS.sm, color: COLORS.textMuted, marginBottom: SPACING.lg },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS['2xl'], padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.md },
  label: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary, marginBottom: 6, marginTop: SPACING.md },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, backgroundColor: COLORS.surfaceAlt, minHeight: 50 },
  inputError: { borderColor: COLORS.danger, backgroundColor: COLORS.dangerLight },
  inputIcon: { fontSize: 15, marginRight: SPACING.sm, opacity: 0.6 },
  input: { flex: 1, fontSize: FONTS.base, color: COLORS.textPrimary, paddingVertical: SPACING.sm + 2 },
  eyeBtn: { padding: SPACING.xs },
  eyeIcon: { fontSize: 16 },
  fieldError: { fontSize: FONTS.xs, color: COLORS.danger, marginTop: 4, fontWeight: FONTS.medium },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginTop: SPACING.md, marginBottom: 4 },
  checkbox: { width: 20, height: 20, borderWidth: 2, borderColor: COLORS.borderStrong, borderRadius: RADIUS.xs, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkboxOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tick: { color: COLORS.textWhite, fontSize: 11, fontWeight: FONTS.black },
  termsText: { flex: 1, fontSize: FONTS.sm, color: COLORS.textSecondary, lineHeight: 20 },
  termsLink: { color: COLORS.primary, fontWeight: FONTS.semiBold },
  registerBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: SPACING.md + 2, alignItems: 'center', marginTop: SPACING.lg, ...SHADOWS.primary },
  registerBtnLoading: { opacity: 0.85, shadowOpacity: 0, elevation: 0 },
  registerBtnText: { color: COLORS.textWhite, fontSize: FONTS.lg, fontWeight: FONTS.bold },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: SPACING.md, gap: SPACING.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.divider },
  dividerText: { fontSize: 11, color: COLORS.textLight, fontWeight: FONTS.semiBold },
  loginBtn: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingVertical: SPACING.md, alignItems: 'center' },
  loginBtnText: { fontSize: FONTS.base, color: COLORS.textSecondary, fontWeight: FONTS.semiBold },
});