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
import { COLORS, FONTS, SPACING, RADIUS, LANGUAGES } from '../../utils/constants';
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
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.logo}>VUMA</Text>
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
              placeholderTextColor="#BBB"
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
            <Text style={styles.inputIcon}>✉️</Text>
            <TextInput
              ref={emailRef}
              style={styles.input}
              value={form.email}
              onChangeText={v => setField('email', v)}
              placeholder="your@email.com"
              placeholderTextColor="#BBB"
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
              placeholderTextColor="#BBB"
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
              placeholderTextColor="#BBB"
              secureTextEntry={!showPassword}
              returnKeyType="next"
              editable={!isLoading}
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
              <Text>{showPassword ? '🙈' : '👁'}</Text>
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
              placeholderTextColor="#BBB"
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
            activeOpacity={0.7}
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
            activeOpacity={0.85}
          >
            {isLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#fff" size="small" />
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
          >
            <Text style={styles.loginBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scroll: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingBottom: 8 },
  backBtn: { padding: 8 },
  backIcon: { fontSize: 22, color: '#FF6B00', fontWeight: '700' },
  logo: { fontSize: 24, fontWeight: '900', color: '#FF6B00', letterSpacing: -1 },
  title: { fontSize: 26, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#999', marginBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 12 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E8E8E8', borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#fff', minHeight: 50 },
  inputError: { borderColor: '#DC3545' },
  inputIcon: { fontSize: 16, marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: '#1A1A1A', paddingVertical: 12 },
  eyeBtn: { padding: 8 },
  fieldError: { fontSize: 12, color: '#DC3545', marginTop: 4 },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 16, marginBottom: 4 },
  checkbox: { width: 20, height: 20, borderWidth: 2, borderColor: '#E0E0E0', borderRadius: 4, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkboxOn: { backgroundColor: '#FF6B00', borderColor: '#FF6B00' },
  tick: { color: 'white', fontSize: 11, fontWeight: '900' },
  termsText: { flex: 1, fontSize: 13, color: '#555', lineHeight: 20 },
  termsLink: { color: '#FF6B00', fontWeight: '600' },
  registerBtn: { backgroundColor: '#FF6B00', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 20, shadowColor: '#FF6B00', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  registerBtnLoading: { opacity: 0.8, shadowOpacity: 0 },
  registerBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#F0F0F0' },
  dividerText: { fontSize: 12, color: '#BBB', fontWeight: '500' },
  loginBtn: { borderWidth: 1.5, borderColor: '#E8E8E8', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  loginBtnText: { fontSize: 15, color: '#555', fontWeight: '600' },
});