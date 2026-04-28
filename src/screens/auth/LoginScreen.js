/**
 * VUMA Store — Login Screen
 * Production-grade login with biometrics + remember me
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
  Dimensions,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  login,
  biometricLogin,
  checkBiometrics,
  clearError,
  selectAuthLoading,
  selectAuthErrors,
  selectBiometrics,
} from '../../store/authSlice';
import {
  COLORS,
  FONTS,
  SPACING,
  RADIUS,
  SCREENS,
} from '../../utils/constants';
import {
  validateEmail,
  validatePassword,
  getErrorMessage,
} from '../../utils/helpers';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { FieldError } from '../../components/common/ErrorMessage';

const { height } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const dispatch = useDispatch();
  const loading = useSelector(selectAuthLoading);
  const errors = useSelector(selectAuthErrors);
  const biometrics = useSelector(selectBiometrics);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});

  const passwordRef = useRef(null);

  // ── Init ────────────────────────────────────────────
  useEffect(() => {
    dispatch(checkBiometrics());
    return () => dispatch(clearError());
  }, []);

  // ── Show API errors ─────────────────────────────────
  useEffect(() => {
    if (!errors.login) return;
    if (typeof errors.login === 'string') {
      Alert.alert('Login Failed', errors.login, [
        {
          text: 'OK',
          onPress: () => dispatch(clearError('login')),
        },
      ]);
    } else {
      setFieldErrors(errors.login);
      dispatch(clearError('login'));
    }
  }, [errors.login]);

  // ── Validate ────────────────────────────────────────
  const validate = () => {
    const errs = {};
    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);
    if (emailErr) errs.email = emailErr;
    if (passErr) errs.password = passErr;
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Handlers ────────────────────────────────────────
  const handleLogin = async () => {
    if (!validate()) return;
    const result = await dispatch(
      login({
        email: email.trim(),
        password,
        rememberMe,
      })
    );
    if (login.fulfilled.match(result)) {
      // AppNavigator handles redirect automatically
    }
  };

  const handleBiometric = async () => {
    const result = await dispatch(biometricLogin());
    if (biometricLogin.rejected.match(result)) {
      Alert.alert('Error', result.payload || 'Failed.');
    }
  };

  const handleFieldChange = (field, value) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: null }));
    }
    if (field === 'email') setEmail(value);
    if (field === 'password') setPassword(value);
  };

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
          <Text style={styles.logo}>VUMA</Text>
          <Text style={styles.tagline}>
            Smart Shopping. Fast Delivery.
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Welcome back 👋</Text>
          <Text style={styles.subtitle}>
            Login to your account
          </Text>

          {/* Email */}
          <Input
            label="Email"
            required
            value={email}
            onChangeText={(v) =>
              handleFieldChange('email', v)
            }
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon="✉️"
            error={fieldErrors.email}
            returnKeyType="next"
            onSubmitEditing={() =>
              passwordRef.current?.focus()
            }
          />

          {/* Password */}
          <Input
            label="Password"
            required
            value={password}
            onChangeText={(v) =>
              handleFieldChange('password', v)
            }
            placeholder="Your password"
            isPassword
            leftIcon="🔒"
            error={fieldErrors.password}
            inputRef={passwordRef}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          {/* Remember me + Forgot */}
          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={styles.rememberRow}
              onPress={() => setRememberMe(!rememberMe)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.checkbox,
                  rememberMe && styles.checkboxActive,
                ]}
              >
                {rememberMe && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
              <Text style={styles.rememberText}>
                Remember me
              </Text>
            </TouchableOpacity>

            <TouchableOpacity>
              <Text style={styles.forgotText}>
                Forgot password?
              </Text>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <Button
            title="Login"
            onPress={handleLogin}
            loading={loading.login}
            disabled={loading.login}
            fullWidth
            size="lg"
            style={styles.loginBtn}
          />

          {/* Biometric */}
          {biometrics.canUseBiometric && (
            <TouchableOpacity
              style={styles.biometricBtn}
              onPress={handleBiometric}
              disabled={loading.biometric}
              activeOpacity={0.8}
            >
              <Text style={styles.biometricIcon}>
                {biometrics.hasFaceID ? '😊' : '👆'}
              </Text>
              <Text style={styles.biometricText}>
                {biometrics.hasFaceID
                  ? 'Login with Face ID'
                  : 'Login with Fingerprint'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Register link */}
          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() =>
              navigation.navigate(SCREENS.REGISTER)
            }
          >
            <Text style={styles.registerBtnText}>
              Create new account
            </Text>
          </TouchableOpacity>
        </View>

        {/* Vendor CTA */}
        <TouchableOpacity
          style={styles.vendorCTA}
          onPress={() =>
            navigation.navigate(SCREENS.REGISTER, {
              isVendor: true,
            })
          }
        >
          <Text style={styles.vendorCTAText}>
            🏪 Want to sell on VUMA?{' '}
            <Text style={styles.vendorCTALink}>
              Register as vendor →
            </Text>
          </Text>
        </TouchableOpacity>
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
    alignItems: 'center',
    paddingTop:
      Platform.OS === 'ios' ? SPACING['3xl'] : SPACING['2xl'],
    paddingBottom: SPACING.xl,
  },
  logo: {
    fontSize: FONTS['6xl'],
    fontWeight: FONTS.black,
    color: COLORS.primary,
    letterSpacing: -2,
  },
  tagline: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    fontWeight: FONTS.medium,
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
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    marginTop: -SPACING.sm,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
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
  rememberText: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    fontWeight: FONTS.medium,
  },
  forgotText: {
    fontSize: FONTS.sm,
    color: COLORS.primary,
    fontWeight: FONTS.semiBold,
  },
  loginBtn: {
    marginBottom: SPACING.base,
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm + 4,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    gap: SPACING.sm,
    marginBottom: SPACING.base,
  },
  biometricIcon: {
    fontSize: FONTS.xl,
  },
  biometricText: {
    fontSize: FONTS.base,
    color: COLORS.primary,
    fontWeight: FONTS.semiBold,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.base,
    gap: SPACING.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.divider,
  },
  dividerText: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    fontWeight: FONTS.semiBold,
  },
  registerBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm + 4,
    alignItems: 'center',
  },
  registerBtnText: {
    fontSize: FONTS.base,
    color: COLORS.textSecondary,
    fontWeight: FONTS.semiBold,
  },
  vendorCTA: {
    marginTop: SPACING.xl,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  vendorCTAText: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  vendorCTALink: {
    color: COLORS.primary,
    fontWeight: FONTS.bold,
  },
});