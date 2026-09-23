/**
 * VUMA Store — Register Screen (Fixed)
 * - Spinner always stops
 * - Auto login after registration
 * - Clear error messages
 * - 15s timeout safety
 *
 * MVP launch-blocker fixes:
 * - Terms & Conditions / Privacy Policy text is now actually tappable
 *   and opens an in-app modal with the real content (previously plain
 *   <Text> with no onPress at all - styled like a link, did nothing).
 *   Content below is placeholder MVP-launch text - replace with real,
 *   lawyer-reviewed Terms/Privacy before public launch.
 * - After successful registration, the user is now explicitly
 *   navigated to the main app (Tabs/Home) via navigation.reset().
 *   Previously the code only set isAuthenticated=true and assumed
 *   AppNavigator would "auto-switch" - but Auth/Register is just one
 *   more screen pushed onto the same stack as Tabs, so nothing ever
 *   actually navigated away, leaving the user stuck on this screen
 *   after a successful signup.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, StatusBar, Alert,
  ActivityIndicator, TextInput, ToastAndroid, Modal,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  register, clearError, selectAuthLoading,
  selectAuthErrors, selectIsAuthenticated,
} from '../../store/authSlice';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, LANGUAGES } from '../../utils/constants';
import { storage } from '../../utils/storage';
import { setAuthToken } from '../../api/client';

const TIMEOUT_MS = 15000;

// Placeholder MVP-launch legal text - replace with real, lawyer-reviewed
// Terms & Conditions and Privacy Policy before public launch.
const TERMS_TEXT = `Welcome to VUMA Store.

By creating an account and using the VUMA Store app, you agree to the following:

1. Account Registration
You must provide accurate information when creating your account. You are responsible for maintaining the confidentiality of your login credentials.

2. Marketplace
VUMA Store is a multi-vendor marketplace. Products are listed and sold by independent vendors. VUMA Store facilitates the transaction but individual vendors are responsible for the accuracy of their listings and the quality of their products.

3. Orders & Payments
All prices are shown in Tanzanian Shillings (TZS) unless otherwise noted. Payment is processed through our supported payment partners (mobile money, card, wallet, or bank transfer).

4. Delivery
Delivery times are estimates and may vary based on vendor location and courier availability.

5. Returns & Refunds
Please contact the vendor or VUMA Support within a reasonable time of delivery for any issues with your order.

6. Prohibited Use
You agree not to use VUMA Store for any unlawful purpose or to violate any applicable laws.

7. Changes
These terms may be updated from time to time. Continued use of the app after changes constitutes acceptance.

For questions, contact support@vumastore.store.`;

const PRIVACY_TEXT = `VUMA Store Privacy Policy

We collect information you provide directly to us, such as your name, email, phone number, and delivery address, in order to process your orders and provide our services.

Information We Collect
- Account information (username, email, phone)
- Order and payment history
- Delivery addresses
- App usage data to improve our service

How We Use Your Information
- To process and fulfill your orders
- To communicate with you about your account and orders
- To improve VUMA Store's products and services
- To send order updates and, where you've opted in, promotional offers

Sharing of Information
We share order details with the relevant vendor and delivery partner as needed to fulfill your order. We do not sell your personal information to third parties.

Data Security
We take reasonable measures to protect your information, but no method of transmission over the internet is 100% secure.

Your Choices
You may update your account information at any time in Settings. You may request account deletion by contacting support@vumastore.store.

Contact
Questions about this policy can be sent to support@vumastore.store.`;

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
  const [legalModal, setLegalModal] = useState(null); // 'terms' | 'privacy' | null

  const emailRef    = useRef(null);
  const passwordRef = useRef(null);
  const phoneRef    = useRef(null);
  const timeoutRef  = useRef(null);
  const mountedRef  = useRef(true);
  const navigateTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
      dispatch(clearError());
    };
  }, []);

  // Auto-navigate after successful registration (isAuthenticated = true)
  useEffect(() => {
    if (isAuthenticated && isLoading) {
      stopLoading();
      showToast('✅ Account created! Welcome to VUMA!');
      navigateToHome();
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

  // Explicitly navigate to the main app after a successful signup - a
  // brief delay lets the success toast actually be seen first.
  // RegisterScreen lives inside the nested Auth navigator, so
  // navigation.reset() here would try to reset that nested navigator
  // (which has no "Tabs" route) rather than the parent stack that
  // actually contains "Tabs" - getParent() targets that parent stack
  // directly, and reset() clears Auth/Register from its history
  // entirely so the user can't navigate "back" into the form.
  const navigateToHome = () => {
    if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
    navigateTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      const parent = navigation.getParent();
      if (parent) {
        parent.reset({ index: 0, routes: [{ name: 'Tabs' }] });
      } else {
        navigation.navigate('Tabs');
      }
    }, 900);
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
        navigateToHome();

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
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={Platform.OS === 'ios' ? 20 : 60}
        keyboardOpeningTime={0}
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
          <View style={styles.termsRow}>
            <TouchableOpacity
              onPress={() => setAgreedToTerms(v => !v)}
              activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={[styles.checkbox, agreedToTerms && styles.checkboxOn]}>
                {agreedToTerms && <Text style={styles.tick}>✓</Text>}
              </View>
            </TouchableOpacity>
            <Text style={styles.termsText}>
              I agree to VUMA's{' '}
              <Text style={styles.termsLink} onPress={() => setLegalModal('terms')}>
                Terms & Conditions
              </Text>
              {' '}and{' '}
              <Text style={styles.termsLink} onPress={() => setLegalModal('privacy')}>
                Privacy Policy
              </Text>
            </Text>
          </View>
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
      </KeyboardAwareScrollView>

      {/* Terms / Privacy modal */}
      <Modal
        visible={legalModal !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setLegalModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {legalModal === 'terms' ? 'Terms & Conditions' : 'Privacy Policy'}
              </Text>
              <TouchableOpacity onPress={() => setLegalModal(null)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator>
              <Text style={styles.modalText}>
                {legalModal === 'terms' ? TERMS_TEXT : PRIVACY_TEXT}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.modalDoneBtn}
              onPress={() => setLegalModal(null)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalDoneBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
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
  termsLink: { color: COLORS.primary, fontWeight: FONTS.semiBold, textDecorationLine: 'underline' },
  registerBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: SPACING.md + 2, alignItems: 'center', marginTop: SPACING.lg, ...SHADOWS.primary },
  registerBtnLoading: { opacity: 0.85, shadowOpacity: 0, elevation: 0 },
  registerBtnText: { color: COLORS.textWhite, fontSize: FONTS.lg, fontWeight: FONTS.bold },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: SPACING.md, gap: SPACING.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.divider },
  dividerText: { fontSize: 11, color: COLORS.textLight, fontWeight: FONTS.semiBold },
  loginBtn: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingVertical: SPACING.md, alignItems: 'center' },
  loginBtnText: { fontSize: FONTS.base, color: COLORS.textSecondary, fontWeight: FONTS.semiBold },
  // Legal modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,16,26,0.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS['2xl'], borderTopRightRadius: RADIUS['2xl'], maxHeight: '80%', paddingBottom: Platform.OS === 'ios' ? 24 : SPACING.base },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  modalTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  modalCloseBtn: { width: 32, height: 32, borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  modalCloseIcon: { fontSize: FONTS.base, color: COLORS.textSecondary, fontWeight: FONTS.bold },
  modalBody: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  modalText: { fontSize: FONTS.sm, color: COLORS.textSecondary, lineHeight: 22, paddingBottom: SPACING.lg },
  modalDoneBtn: { marginHorizontal: SPACING.lg, marginTop: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: SPACING.md, alignItems: 'center' },
  modalDoneBtnText: { color: COLORS.textWhite, fontSize: FONTS.base, fontWeight: FONTS.bold },
});