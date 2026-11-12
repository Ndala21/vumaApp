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
  register, googleLogin, appleLogin, clearError, selectAuthLoading,
  selectAuthErrors, selectIsAuthenticated,
} from '../../store/authSlice';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { GOOGLE_SIGNIN_ENABLED, GOOGLE_IOS_CLIENT_ID } from '../../utils/loginOptions';
import SocialButtons from '../../components/SocialButtons';
import { getAppleCredential, isAppleCancel } from '../../utils/appleSignIn';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, LANGUAGES } from '../../utils/constants';
import { iosTop } from '../../utils/safeArea';
import { storage } from '../../utils/storage';
import { setAuthToken } from '../../api/client';
import { checkInviteCode, cleanCode, getPendingInvite } from '../../utils/inviteCode';
import { tzs } from '../../utils/rewards';
import BackButton from '../../components/BackButton';
import BrandLogo from '../../components/BrandLogo';

const TIMEOUT_MS = 15000;

// Web Client ID from Google Cloud Console - required even for
// Android/iOS sign-in, since this is what lets the backend verify
// the resulting ID token's audience. Not a secret (it ships inside
// the app itself either way). Safe to configure again here even if
// LoginScreen already did - GoogleSignin.configure() is idempotent.
const GOOGLE_WEB_CLIENT_ID = '532626175456-qppebcnam0qu1m0shlh63uto8jsg6sqc.apps.googleusercontent.com';

// The Google "G" logo is the picture assets/google-g.png (drawn by components/SocialButtons.js).

if (GOOGLE_SIGNIN_ENABLED) {
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    ...(GOOGLE_IOS_CLIENT_ID ? { iosClientId: GOOGLE_IOS_CLIENT_ID } : {}),
    offlineAccess: false,
  });
}

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

7. User Content and Community Rules
Customers and vendors can post reviews, product listings and store information on VUMA Store. You must not post anything that is unlawful, abusive, hateful, threatening, sexually explicit, fake or misleading, or that breaks someone else's rights. There is no tolerance for objectionable content or abusive users. Reviews are checked for offensive words. You can report any review, product or seller with the Report button, and you can hide a person whose reviews you do not want to see (Settings shows who you hid and lets you unhide them). Our team looks at every report within 24 hours and removes content that breaks these rules. We may suspend or close accounts that break these rules without notice.

8. Changes
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
    confirmPassword: '', phone: '', language: 'en', referral_code: '',
  });
  // The invite code of the friend who sent this person: { status: idle | checking | ok | bad | unknown, name, gift }
  const [invite, setInvite] = useState({ status: 'idle', name: '', gift: 0 });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
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

  // A code kept from the friend's invite link is filled in for the person.
  useEffect(() => {
    let alive = true;
    getPendingInvite().then((code) => {
      if (alive && code) setFormState(prev => (prev.referral_code ? prev : { ...prev, referral_code: code }));
    });
    return () => { alive = false; };
  }, []);

  // Ask the server who the code belongs to, a moment after the person stops typing.
  useEffect(() => {
    const code = cleanCode(form.referral_code);
    if (!code) { setInvite({ status: 'idle', name: '', gift: 0 }); return undefined; }
    setInvite((prev) => ({ ...prev, status: 'checking' }));
    let alive = true;
    const timer = setTimeout(async () => {
      const checked = await checkInviteCode(code);
      if (!alive) return;
      if (checked.valid === true) setInvite({ status: 'ok', name: checked.referrerName, gift: checked.friendGift });
      else if (checked.valid === false) setInvite({ status: 'bad', name: '', gift: 0 });
      else setInvite({ status: 'unknown', name: '', gift: 0 });
    }, 500);
    return () => { alive = false; clearTimeout(timer); };
  }, [form.referral_code]);

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
    if (form.referral_code.trim() && invite.status === 'bad')
      errs.referral_code = 'Invite code not found. Check it, or clear the box.';
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
        referral_code: cleanCode(form.referral_code),
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
        const friend = result.payload && result.payload.referral;
        showToast(friend && friend.applied
          ? `✅ Account created! ${friend.referrer_name || 'Your friend'} invited you - your welcome gift is waiting.`
          : '✅ Account created! Welcome to VUMA!');
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

      const dispatched = await dispatch(googleLogin({ idToken, referralCode: cleanCode(form.referral_code) }));

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

  const handleAppleSignIn = async () => {
    if (isAppleLoading || isGoogleLoading || isLoading) return;
    setIsAppleLoading(true);
    dispatch(clearError('login'));

    try {
      // Apple's own sign-in sheet (iPhone only). Apple gives the name only the very first time.
      const apple = await getAppleCredential();
      const dispatched = await dispatch(appleLogin({ ...apple, referralCode: cleanCode(form.referral_code) }));

      if (appleLogin.fulfilled.match(dispatched)) {
        setIsAppleLoading(false);
        showToast('✅ Account created! Welcome to VUMA!');
        navigateToHome();
      } else if (appleLogin.rejected.match(dispatched)) {
        setIsAppleLoading(false);
        const payload = dispatched.payload;
        const msg = typeof payload === 'string' ? payload : 'Sign in with Apple failed. Please try again.';
        Alert.alert('Sign in with Apple Failed', msg);
        dispatch(clearError('login'));
      }
    } catch (error) {
      setIsAppleLoading(false);
      // The person closed Apple's sheet: not an error worth interrupting them about.
      if (isAppleCancel(error)) return;
      Alert.alert('Sign in with Apple Failed', error?.message || 'Something went wrong. Please try again.');
    }
  };

  const FieldError = ({ field }) => fieldErrors[field] ? (
    <Text style={styles.fieldError}>{fieldErrors[field]}</Text>
  ) : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <KeyboardAwareScrollView keyboardDismissMode="interactive"
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
          <BackButton navigation={navigation} />
          <BrandLogo height={26} />
          <View style={{ width: 84 }} />
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

          {/* Invite code of the friend who sent this person (optional) */}
          <Text style={styles.label}>Invite code (optional)</Text>
          <View style={[styles.inputWrap, (fieldErrors.referral_code || invite.status === 'bad') && styles.inputError,
            invite.status === 'ok' && styles.inputOk]}>
            <Text style={styles.inputIcon}>🎁</Text>
            <TextInput
              style={styles.input}
              value={form.referral_code}
              onChangeText={v => setField('referral_code', v)}
              placeholder="From a friend, if you have one"
              placeholderTextColor={COLORS.textLight}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="next"
              editable={!isLoading}
            />
          </View>
          {invite.status === 'checking' && <Text style={styles.inviteHint}>Checking the code...</Text>}
          {invite.status === 'ok' && (
            <Text style={[styles.inviteHint, styles.inviteOk]}>
              {`✓ Invited by ${invite.name || 'a friend'}.`}{invite.gift > 0 ? ` Your welcome gift: ${tzs(invite.gift)}.` : ''}
            </Text>
          )}
          {invite.status === 'bad' && !fieldErrors.referral_code && (
            <Text style={styles.fieldError}>Invite code not found. Check it, or clear the box.</Text>
          )}
          <FieldError field="referral_code" />

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

          {/* Continue with Google / Continue with Apple (see components/SocialButtons.js) */}
          <SocialButtons
            onGoogle={handleGoogleSignIn}
            onApple={handleAppleSignIn}
            googleLoading={isGoogleLoading}
            appleLoading={isAppleLoading}
            disabled={isLoading}
          />

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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? iosTop(3) : 24, paddingBottom: SPACING.sm },
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
  inputOk: { borderColor: COLORS.success },
  inviteHint: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 4 },
  inviteOk: { color: COLORS.success, fontWeight: FONTS.semiBold },
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