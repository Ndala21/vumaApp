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
 *
 * Updated: Google Sign-In added as another way to create an account -
 * shares the exact same success path (navigateToHome) as normal
 * registration, so a brand-new Google user lands in the app the same
 * way a password-registered one does.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, StatusBar, Alert,
  ActivityIndicator, TextInput, ToastAndroid, Modal,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  register, googleLogin, clearError, selectAuthLoading,
  selectAuthErrors, selectIsAuthenticated,
} from '../../store/authSlice';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, LANGUAGES } from '../../utils/constants';
import { storage } from '../../utils/storage';
import { setAuthToken } from '../../api/client';

const TIMEOUT_MS = 15000;

// Web Client ID from Google Cloud Console - required even for
// Android/iOS sign-in, since this is what lets the backend verify
// the resulting ID token's audience. Not a secret (it ships inside
// the app itself either way). Safe to configure again here even if
// LoginScreen already did - GoogleSignin.configure() is idempotent.
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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
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
        setIsGoogleLoading(false);
        showToast('✅ Account created! Welcome to VUMA!');
        navigateToHome();
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

          {/* Google Sign-In */}
          <View style={styles.googleDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.googleBtn, isGoogleLoading && styles.registerBtnLoading]}
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
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, justifyContent: 'center' },
  googleDivider: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.md, marginBottom: SPACING.md, gap: SPACING.sm },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface,
    gap: SPACING.sm,
  },
  googleIcon: { width: 20, height: 20 },
  googleBtnText: { fontSize: FONTS.sm, color: COLORS.textPrimary, fontWeight: FONTS.semiBold },
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