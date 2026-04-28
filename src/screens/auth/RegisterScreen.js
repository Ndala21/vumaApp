/**
 * VUMA Store — Register Screen
 * Customer and vendor registration
 */

import React, { useState, useEffect, useRef } from 'react';
import { t } from '../../i18n';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  register,
  clearError,
  selectAuthLoading,
  selectAuthErrors,
} from '../../store/authSlice';
import {
  COLORS,
  FONTS,
  SPACING,
  RADIUS,
  SCREENS,
  LANGUAGES,
} from '../../utils/constants';
import {
  validateEmail,
  validatePassword,
  validateUsername,
  validatePhone,
} from '../../utils/helpers';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

export default function RegisterScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const loading = useSelector(selectAuthLoading);
  const errors = useSelector(selectAuthErrors);

  // Pre-fill vendor mode if coming from vendor CTA
  const isVendorMode = route?.params?.isVendor || false;

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    language: 'en',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);

  // Refs for focus chain
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);
  const phoneRef = useRef(null);

  // ── Init ────────────────────────────────────────────
  useEffect(() => {
    return () => dispatch(clearError());
  }, []);

  // ── API Errors ──────────────────────────────────────
  useEffect(() => {
    if (!errors.register) return;
    if (typeof errors.register === 'string') {
      Alert.alert('Registration Failed', errors.register, [
        {
          text: 'OK',
          onPress: () => dispatch(clearError('register')),
        },
      ]);
    } else {
      setFieldErrors(errors.register);
      dispatch(clearError('register'));
    }
  }, [errors.register]);

  // ── Helpers ─────────────────────────────────────────
  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => ({ ...prev, [key]: null }));
    }
  };

  // ── Validate ────────────────────────────────────────
  const validate = () => {
    const errs = {};

    const usernameErr = validateUsername(form.username);
    if (usernameErr) errs.username = usernameErr;

    const emailErr = validateEmail(form.email);
    if (emailErr) errs.email = emailErr;

    const passErr = validatePassword(form.password);
    if (passErr) errs.password = passErr;

    if (form.password !== form.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    const phoneErr = validatePhone(form.phone);
    if (phoneErr) errs.phone = phoneErr;

    if (!agreedToTerms) {
      errs.terms = 'Please agree to Terms & Conditions.';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ──────────────────────────────────────────
  const handleRegister = async () => {
  if (!validate()) return;
  const result = await dispatch(
    register({
      username: form.username.trim(),
      email: form.email.trim(),
      password: form.password,
      confirmPassword: form.confirmPassword,  // ← add this
      phone: form.phone.trim(),
      language: form.language,
    })
  );
};
  // ── Selected language display ───────────────────────
  const selectedLangInfo = LANGUAGES.find(
    (l) => l.code === form.language
  );

  // ── Render ──────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.surface}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.logo}>VUMA</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.title}>
            {isVendorMode
              ? '🏪 Create Vendor Account'
              : '👋 Create Account'}
          </Text>
          <Text style={styles.subtitle}>
            {isVendorMode
              ? 'Register to start selling on VUMA'
              : 'Join millions of VUMA shoppers'}
          </Text>

          {/* Username */}
          <Input
            label="Username"
            required
            value={form.username}
            onChangeText={(v) => setField('username', v)}
            placeholder="Choose a username"
            leftIcon="👤"
            error={fieldErrors.username}
            autoCapitalize="none"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
          />

          {/* Email */}
          <Input
            label="Email"
            required
            value={form.email}
            onChangeText={(v) => setField('email', v)}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon="✉️"
            error={fieldErrors.email}
            inputRef={emailRef}
            returnKeyType="next"
            onSubmitEditing={() =>
              passwordRef.current?.focus()
            }
          />

          {/* Password */}
          <Input
            label="Password"
            required
            value={form.password}
            onChangeText={(v) => setField('password', v)}
            placeholder="Min. 6 characters"
            isPassword
            leftIcon="🔒"
            error={fieldErrors.password}
            inputRef={passwordRef}
            returnKeyType="next"
            onSubmitEditing={() =>
              confirmRef.current?.focus()
            }
            helper="Use at least 6 characters"
          />

          {/* Confirm Password */}
          <Input
            label="Confirm Password"
            required
            value={form.confirmPassword}
            onChangeText={(v) =>
              setField('confirmPassword', v)
            }
            placeholder="Repeat your password"
            isPassword
            leftIcon="🔒"
            error={fieldErrors.confirmPassword}
            inputRef={confirmRef}
            returnKeyType="next"
            onSubmitEditing={() =>
              phoneRef.current?.focus()
            }
          />

          {/* Phone */}
          <Input
            label="Phone Number"
            value={form.phone}
            onChangeText={(v) => setField('phone', v)}
            placeholder="+82 10-xxxx-xxxx"
            keyboardType="phone-pad"
            leftIcon="📱"
            error={fieldErrors.phone}
            inputRef={phoneRef}
            returnKeyType="done"
            helper="Optional — for order updates"
          />

          {/* Language */}
          <View style={styles.langSection}>
            <Text style={styles.langLabel}>
              🌍 Language
            </Text>
            <TouchableOpacity
              style={styles.langSelector}
              onPress={() => setShowLangPicker(true)}
            >
              <Text style={styles.langSelectorText}>
                {selectedLangInfo?.flag}{' '}
                {selectedLangInfo?.name}
              </Text>
              <Text style={styles.langArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Language Picker */}
          {showLangPicker && (
            <View style={styles.langPicker}>
              {LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.langOption,
                    form.language === lang.code &&
                      styles.langOptionActive,
                  ]}
                  onPress={() => {
                    setField('language', lang.code);
                    setShowLangPicker(false);
                  }}
                >
                  <Text style={styles.langFlag}>
                    {lang.flag}
                  </Text>
                  <Text
                    style={[
                      styles.langName,
                      form.language === lang.code &&
                        styles.langNameActive,
                    ]}
                  >
                    {lang.name}
                  </Text>
                  {form.language === lang.code && (
                    <Text style={styles.langCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Terms */}
          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setAgreedToTerms(!agreedToTerms)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.checkbox,
                agreedToTerms && styles.checkboxActive,
              ]}
            >
              {agreedToTerms && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </View>
            <Text style={styles.termsText}>
              I agree to VUMA's{' '}
              <Text style={styles.termsLink}>
                Terms of Service
              </Text>{' '}
              and{' '}
              <Text style={styles.termsLink}>
                Privacy Policy
              </Text>
            </Text>
          </TouchableOpacity>
          {fieldErrors.terms && (
            <Text style={styles.termsError}>
              ⚠️ {fieldErrors.terms}
            </Text>
          )}

          {/* Register Button */}
          <Button
            title={
              isVendorMode
                ? 'Create Vendor Account'
                : 'Create Account'
            }
            onPress={handleRegister}
            loading={loading.register}
            disabled={loading.register}
            fullWidth
            size="lg"
            style={styles.registerBtn}
          />

          {/* Login link */}
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate(SCREENS.LOGIN)
              }
            >
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Benefits */}
        <View style={styles.benefits}>
          {[
            '🎁 Welcome bonus on first order',
            '🚚 Free shipping on ₩50,000+',
            '🔒 100% secure payments',
            '↩️ Easy 7-day returns',
          ].map((benefit, i) => (
            <View key={i} style={styles.benefitItem}>
              <Text style={styles.benefitText}>
                {benefit}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING['2xl'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop:
      Platform.OS === 'ios' ? SPACING['3xl'] : SPACING.xl,
    paddingBottom: SPACING.base,
  },
  backBtn: {
    padding: SPACING.sm,
    marginRight: SPACING.sm,
  },
  backIcon: {
    fontSize: FONTS.xl,
    color: COLORS.textPrimary,
    fontWeight: FONTS.bold,
  },
  logo: {
    fontSize: FONTS['3xl'],
    fontWeight: FONTS.black,
    color: COLORS.primary,
    letterSpacing: -1,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: FONTS['2xl'],
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONTS.base,
    color: COLORS.textMuted,
    marginBottom: SPACING.xl,
  },
  // Language
  langSection: {
    marginBottom: SPACING.base,
  },
  langLabel: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.semiBold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  langSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm + 4,
  },
  langSelectorText: {
    fontSize: FONTS.base,
    color: COLORS.textPrimary,
    fontWeight: FONTS.medium,
  },
  langArrow: {
    fontSize: FONTS.xl,
    color: COLORS.textMuted,
  },
  langPicker: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.base,
    overflow: 'hidden',
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.base,
    gap: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  langOptionActive: {
    backgroundColor: COLORS.primaryFade,
  },
  langFlag: {
    fontSize: 22,
  },
  langName: {
    flex: 1,
    fontSize: FONTS.base,
    color: COLORS.textSecondary,
  },
  langNameActive: {
    color: COLORS.primary,
    fontWeight: FONTS.bold,
  },
  langCheck: {
    fontSize: FONTS.base,
    color: COLORS.primary,
    fontWeight: FONTS.bold,
  },
  // Terms
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  checkboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkmark: {
    color: COLORS.textWhite,
    fontSize: FONTS.xs,
    fontWeight: FONTS.bold,
  },
  termsText: {
    flex: 1,
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  termsLink: {
    color: COLORS.primary,
    fontWeight: FONTS.semiBold,
  },
  termsError: {
    fontSize: FONTS.xs,
    color: COLORS.danger,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.lg + 4,
  },
  registerBtn: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.base,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  loginText: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
  },
  loginLink: {
    fontSize: FONTS.sm,
    color: COLORS.primary,
    fontWeight: FONTS.bold,
  },
  // Benefits
  benefits: {
    marginTop: SPACING.xl,
    gap: SPACING.sm,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.base,
  },
  benefitText: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    fontWeight: FONTS.medium,
  },
});