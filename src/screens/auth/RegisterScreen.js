/**
 * VUMA Store — Register Screen
 * Customer and vendor registration
 */

import React, { useState, useEffect, useRef } from 'react';
import { t } from '../../i18n';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, StatusBar, Alert, Modal,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { register, clearError, selectAuthLoading, selectAuthErrors } from '../../store/authSlice';
import { COLORS, FONTS, SPACING, RADIUS, SCREENS, LANGUAGES } from '../../utils/constants';
import { validateEmail, validatePassword, validateUsername, validatePhone } from '../../utils/helpers';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

const TERMS_CONTENT = `VUMA Store — Terms of Service
Last updated: April 2026

1. ACCEPTANCE OF TERMS
By using VUMA Store, you agree to these Terms of Service. If you do not agree, please do not use the app.

2. USER ACCOUNTS
• You must provide accurate information when registering.
• You are responsible for keeping your password secure.
• One account per person is allowed.

3. PURCHASES & PAYMENTS
• All prices are shown in your selected currency.
• Payments are processed securely via Stripe.
• Orders are confirmed only after payment is successful.

4. RETURNS & REFUNDS
• Items can be returned within 7 days of delivery.
• Items must be unused and in original packaging.
• Refunds are processed within 5-7 business days.

5. VENDOR POLICY
• Vendors must provide accurate product descriptions.
• VUMA charges a 10% commission on all sales.
• Vendors are responsible for shipping within agreed timeframes.

6. PROHIBITED ACTIVITIES
• Selling counterfeit or illegal products.
• Harassing other users or vendors.
• Attempting to hack or manipulate the platform.

7. PRIVACY
• We collect only necessary data to process orders.
• We never sell your personal data to third parties.

8. CONTACT
For questions: support@vumastore.store
Website: https://vumastore.store`;

const PRIVACY_CONTENT = `VUMA Store — Privacy Policy
Last updated: April 2026

1. INFORMATION WE COLLECT
• Account information (name, email, phone)
• Order and payment information
• Device and usage information

2. HOW WE USE YOUR INFORMATION
• To process your orders and payments
• To send order updates and notifications
• To improve our services

3. DATA SHARING
• We never sell your personal data
• We share data only with payment processors (Stripe, Flutterwave)
• We may share with shipping partners for delivery

4. DATA SECURITY
• All data is encrypted in transit and at rest
• We use industry-standard security measures
• Passwords are never stored in plain text

5. YOUR RIGHTS
• You can request your data at any time
• You can delete your account from Settings
• Contact support@vumastore.store for data requests

6. COOKIES
• We use minimal cookies for authentication
• No advertising cookies are used

7. CONTACT
privacy@vumastore.store`;

export default function RegisterScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const loading = useSelector(selectAuthLoading);
  const errors = useSelector(selectAuthErrors);
  const isVendorMode = route?.params?.isVendor || false;

  const [form, setForm] = useState({
    username: '', email: '', password: '', confirmPassword: '', phone: '', language: 'en',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);
  const phoneRef = useRef(null);

  useEffect(() => { return () => dispatch(clearError()); }, []);

  useEffect(() => {
    if (!errors.register) return;
    if (typeof errors.register === 'string') {
      Alert.alert('Registration Failed', errors.register, [{ text: 'OK', onPress: () => dispatch(clearError('register')) }]);
    } else {
      setFieldErrors(errors.register);
      dispatch(clearError('register'));
    }
  }, [errors.register]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) setFieldErrors((prev) => ({ ...prev, [key]: null }));
  };

  const validate = () => {
    const errs = {};
    const usernameErr = validateUsername(form.username);
    if (usernameErr) errs.username = usernameErr;
    const emailErr = validateEmail(form.email);
    if (emailErr) errs.email = emailErr;
    const passErr = validatePassword(form.password);
    if (passErr) errs.password = passErr;
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    const phoneErr = validatePhone(form.phone);
    if (phoneErr) errs.phone = phoneErr;
    if (!agreedToTerms) errs.terms = 'Please agree to Terms & Conditions.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    await dispatch(register({
      username: form.username.trim(),
      email: form.email.trim(),
      password: form.password,
      confirmPassword: form.confirmPassword,
      phone: form.phone.trim(),
      language: form.language,
    }));
  };

  const selectedLangInfo = LANGUAGES.find((l) => l.code === form.language);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.logo}>VUMA</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>{isVendorMode ? '🏪 Create Vendor Account' : '👋 Create Account'}</Text>
          <Text style={styles.subtitle}>{isVendorMode ? 'Register to start selling on VUMA' : 'Join millions of VUMA shoppers'}</Text>

          <Input label="Username" required value={form.username} onChangeText={(v) => setField('username', v)}
            placeholder="Choose a username" leftIcon="👤" error={fieldErrors.username}
            autoCapitalize="none" returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} />

          <Input label="Email" required value={form.email} onChangeText={(v) => setField('email', v)}
            placeholder="your@email.com" keyboardType="email-address" autoCapitalize="none"
            leftIcon="✉️" error={fieldErrors.email} inputRef={emailRef}
            returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} />

          <Input label="Password" required value={form.password} onChangeText={(v) => setField('password', v)}
            placeholder="Min. 6 characters" isPassword leftIcon="🔒" error={fieldErrors.password}
            inputRef={passwordRef} returnKeyType="next" onSubmitEditing={() => confirmRef.current?.focus()}
            helper="Use at least 6 characters" />

          <Input label="Confirm Password" required value={form.confirmPassword}
            onChangeText={(v) => setField('confirmPassword', v)} placeholder="Repeat your password"
            isPassword leftIcon="🔒" error={fieldErrors.confirmPassword}
            inputRef={confirmRef} returnKeyType="next" onSubmitEditing={() => phoneRef.current?.focus()} />

          <Input label="Phone Number" value={form.phone} onChangeText={(v) => setField('phone', v)}
            placeholder="+255 7XX XXX XXX" keyboardType="phone-pad" leftIcon="📱"
            error={fieldErrors.phone} inputRef={phoneRef} returnKeyType="done"
            helper="Optional — for order updates" />

          {/* Language */}
          <View style={styles.langSection}>
            <Text style={styles.langLabel}>🌍 Language</Text>
            <TouchableOpacity style={styles.langSelector} onPress={() => setShowLangPicker(true)}>
              <Text style={styles.langSelectorText}>{selectedLangInfo?.flag} {selectedLangInfo?.name}</Text>
              <Text style={styles.langArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {showLangPicker && (
            <View style={styles.langPicker}>
              {LANGUAGES.map((lang) => (
                <TouchableOpacity key={lang.code}
                  style={[styles.langOption, form.language === lang.code && styles.langOptionActive]}
                  onPress={() => { setField('language', lang.code); setShowLangPicker(false); }}>
                  <Text style={styles.langFlag}>{lang.flag}</Text>
                  <Text style={[styles.langName, form.language === lang.code && styles.langNameActive]}>{lang.name}</Text>
                  {form.language === lang.code && <Text style={styles.langCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Terms */}
          <TouchableOpacity style={styles.termsRow} onPress={() => setAgreedToTerms(!agreedToTerms)} activeOpacity={0.7}>
            <View style={[styles.checkbox, agreedToTerms && styles.checkboxActive]}>
              {agreedToTerms && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.termsText}>
              I agree to VUMA's{' '}
              <Text style={styles.termsLink} onPress={() => setShowTermsModal(true)}>
                Terms of Service
              </Text>
              {' '}and{' '}
              <Text style={styles.termsLink} onPress={() => setShowPrivacyModal(true)}>
                Privacy Policy
              </Text>
            </Text>
          </TouchableOpacity>
          {fieldErrors.terms && <Text style={styles.termsError}>⚠️ {fieldErrors.terms}</Text>}

          <Button
            title={isVendorMode ? 'Create Vendor Account' : 'Create Account'}
            onPress={handleRegister} loading={loading.register}
            disabled={loading.register} fullWidth size="lg" style={styles.registerBtn} />

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate(SCREENS.LOGIN)}>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Benefits */}
        <View style={styles.benefits}>
          {[
            '🎁 Welcome bonus on first order',
            '🚀 Fast delivery across Tanzania & Kenya',
            '🔒 100% secure payments',
            '↩️ Easy 7-day returns',
          ].map((benefit, i) => (
            <View key={i} style={styles.benefitItem}>
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Terms Modal */}
      <Modal visible={showTermsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📄 Terms of Service</Text>
              <TouchableOpacity onPress={() => setShowTermsModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: SPACING.base }}>
              <Text style={styles.modalContent}>{TERMS_CONTENT}</Text>
              <View style={{ height: 40 }} />
            </ScrollView>
            <TouchableOpacity style={styles.agreeBtn} onPress={() => { setAgreedToTerms(true); setShowTermsModal(false); }}>
              <Text style={styles.agreeBtnText}>I Agree</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Privacy Modal */}
      <Modal visible={showPrivacyModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔒 Privacy Policy</Text>
              <TouchableOpacity onPress={() => setShowPrivacyModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: SPACING.base }}>
              <Text style={styles.modalContent}>{PRIVACY_CONTENT}</Text>
              <View style={{ height: 40 }} />
            </ScrollView>
            <TouchableOpacity style={styles.agreeBtn} onPress={() => { setAgreedToTerms(true); setShowPrivacyModal(false); }}>
              <Text style={styles.agreeBtnText}>I Agree</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, paddingHorizontal: SPACING.base, paddingBottom: SPACING['2xl'] },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? SPACING['3xl'] : SPACING.xl,
    paddingBottom: SPACING.base,
  },
  backBtn: { padding: SPACING.sm, marginRight: SPACING.sm },
  backIcon: { fontSize: FONTS.xl, color: COLORS.textPrimary, fontWeight: FONTS.bold },
  logo: { fontSize: FONTS['3xl'], fontWeight: FONTS.black, color: COLORS.primary, letterSpacing: -1 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 4 },
  title: { fontSize: FONTS['2xl'], fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  subtitle: { fontSize: FONTS.base, color: COLORS.textMuted, marginBottom: SPACING.xl },
  langSection: { marginBottom: SPACING.base },
  langLabel: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  langSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surfaceAlt, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 4 },
  langSelectorText: { fontSize: FONTS.base, color: COLORS.textPrimary, fontWeight: FONTS.medium },
  langArrow: { fontSize: FONTS.xl, color: COLORS.textMuted },
  langPicker: { backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.base, overflow: 'hidden' },
  langOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm + 2, paddingHorizontal: SPACING.base, gap: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  langOptionActive: { backgroundColor: COLORS.primaryFade },
  langFlag: { fontSize: 22 },
  langName: { flex: 1, fontSize: FONTS.base, color: COLORS.textSecondary },
  langNameActive: { color: COLORS.primary, fontWeight: FONTS.bold },
  langCheck: { fontSize: FONTS.base, color: COLORS.primary, fontWeight: FONTS.bold },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginBottom: SPACING.sm },
  checkbox: { width: 20, height: 20, borderWidth: 2, borderColor: COLORS.border, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0 },
  checkboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkmark: { color: COLORS.textWhite, fontSize: FONTS.xs, fontWeight: FONTS.bold },
  termsText: { flex: 1, fontSize: FONTS.sm, color: COLORS.textSecondary, lineHeight: 20 },
  termsLink: { color: COLORS.primary, fontWeight: FONTS.semiBold, textDecorationLine: 'underline' },
  termsError: { fontSize: FONTS.xs, color: COLORS.danger, marginBottom: SPACING.sm, marginLeft: SPACING.lg + 4 },
  registerBtn: { marginTop: SPACING.sm, marginBottom: SPACING.base },
  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.divider },
  loginText: { fontSize: FONTS.sm, color: COLORS.textMuted },
  loginLink: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.bold },
  benefits: { marginTop: SPACING.xl, gap: SPACING.sm },
  benefitItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, paddingVertical: SPACING.sm + 2, paddingHorizontal: SPACING.base },
  benefitText: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS['2xl'], borderTopRightRadius: RADIUS['2xl'], maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  modalTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  modalClose: { fontSize: FONTS.lg, color: COLORS.textMuted, padding: SPACING.xs },
  modalContent: { fontSize: FONTS.sm, color: COLORS.textSecondary, lineHeight: 22 },
  agreeBtn: { margin: SPACING.base, backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, padding: SPACING.base, alignItems: 'center' },
  agreeBtnText: { color: COLORS.textWhite, fontSize: FONTS.base, fontWeight: FONTS.bold },
});
