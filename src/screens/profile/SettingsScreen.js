/**
 * VUMA Store — Settings Screen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  Alert,
  Switch,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  updateProfile,
  changePassword,
  logout,
  selectUser,
  selectAuthLoading,
  selectAuthErrors,
  clearError,
} from '../../store/authSlice';
import {
  COLORS,
  FONTS,
  SPACING,
  RADIUS,
  SHADOWS,
  LANGUAGES,
} from '../../utils/constants';
import { storage } from '../../utils/storage';
import {
  i18n,
  useTranslation,
  notifyLanguageChange,
} from '../../i18n';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

export default function SettingsScreen({ navigation }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const loading = useSelector(selectAuthLoading);
  const errors = useSelector(selectAuthErrors);

  const [activeSection, setActiveSection] = useState(null);
  const [language, setLanguage] = useState('en');
  const [notifications, setNotifications] = useState({
    orders: true,
    promotions: true,
    payments: true,
    system: true,
  });

  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [pwErrors, setPwErrors] = useState({});

  const [profileForm, setProfileForm] = useState({
    username: user?.username || '',
    phone: user?.phone || '',
  });

  useEffect(() => {
    loadLanguage();
    return () => dispatch(clearError());
  }, []);

  const loadLanguage = async () => {
    const lang = await storage.getLanguage();
    setLanguage(lang || 'en');
  };

  const handleLanguageChange = async (code) => {
    setLanguage(code);
    i18n.setLocale(code);
    await storage.setLanguage(code);
    dispatch(updateProfile({ language: code }));
    notifyLanguageChange();
  };

  const handleUpdateProfile = async () => {
    const result = await dispatch(updateProfile(profileForm));
    if (updateProfile.fulfilled.match(result)) {
      Alert.alert(t('common.ok'), 'Profile updated!');
      setActiveSection(null);
    }
  };

  const handleChangePassword = async () => {
    const errs = {};
    if (!pwForm.currentPassword)
      errs.currentPassword = 'Required.';
    if (!pwForm.newPassword || pwForm.newPassword.length < 6)
      errs.newPassword = 'Min 6 characters.';
    if (pwForm.newPassword !== pwForm.confirmPassword)
      errs.confirmPassword = 'Passwords do not match.';
    setPwErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const result = await dispatch(changePassword(pwForm));
    if (changePassword.fulfilled.match(result)) {
      Alert.alert(t('common.ok'), 'Password changed!');
      setPwForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setActiveSection(null);
    } else if (errors.changePassword) {
      Alert.alert(
        t('common.error'),
        typeof errors.changePassword === 'string'
          ? errors.changePassword
          : 'Failed.'
      );
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '⚠️ Delete Account',
      'This will permanently delete your account.',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              t('common.ok'),
              'Email support@vumastore.com to delete your account.'
            ),
        },
      ]
    );
  };

const SectionToggle = ({ title, section }) => (
    <TouchableOpacity
      style={[styles.sectionToggle, activeSection === section && styles.sectionToggleActive]}
      onPress={() => setActiveSection(activeSection === section ? null : section)}
      activeOpacity={0.75}
    >
      <Text style={styles.sectionToggleText}>{title}</Text>
      <View style={[styles.sectionToggleChevron, activeSection === section && styles.sectionToggleChevronOpen]}>
        <Text style={styles.sectionToggleArrow}>›</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.settings')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Profile ── */}
        <Text style={styles.groupLabel}>{t('profile.profile').toUpperCase()}</Text>
        <View style={styles.card}>
          <SectionToggle title={t('settings.editProfile')} section="profile" />
          {activeSection === 'profile' && (
            <View style={styles.sectionBody}>
              <Input
                label={t('auth.username')}
                value={profileForm.username}
                onChangeText={(v) => setProfileForm((p) => ({ ...p, username: v }))}
                placeholder="Username"
                leftIcon="👤"
              />
              <Input
                label={t('auth.phone')}
                value={profileForm.phone}
                onChangeText={(v) => setProfileForm((p) => ({ ...p, phone: v }))}
                placeholder="+82 10-xxxx-xxxx"
                keyboardType="phone-pad"
                leftIcon="📱"
              />
              <Button
                title={t('settings.saveChanges')}
                onPress={handleUpdateProfile}
                loading={loading.updateProfile}
                fullWidth
              />
            </View>
          )}
        </View>

        {/* ── Security ── */}
        <Text style={styles.groupLabel}>{t('settings.changePassword').toUpperCase()}</Text>
        <View style={styles.card}>
          <SectionToggle title={t('settings.changePassword')} section="password" />
          {activeSection === 'password' && (
            <View style={styles.sectionBody}>
              <Input
                label={t('settings.currentPassword')}
                value={pwForm.currentPassword}
                onChangeText={(v) => setPwForm((p) => ({ ...p, currentPassword: v }))}
                isPassword
                leftIcon="🔒"
                error={pwErrors.currentPassword}
              />
              <Input
                label={t('settings.newPassword')}
                value={pwForm.newPassword}
                onChangeText={(v) => setPwForm((p) => ({ ...p, newPassword: v }))}
                isPassword
                leftIcon="🔑"
                error={pwErrors.newPassword}
              />
              <Input
                label={t('settings.confirmPassword')}
                value={pwForm.confirmPassword}
                onChangeText={(v) => setPwForm((p) => ({ ...p, confirmPassword: v }))}
                isPassword
                leftIcon="🔑"
                error={pwErrors.confirmPassword}
              />
              <Button
                title={t('settings.changePassword')}
                onPress={handleChangePassword}
                loading={loading.changePassword}
                fullWidth
              />
            </View>
          )}
        </View>

        {/* ── Language ── */}
        <Text style={styles.groupLabel}>{t('settings.language').toUpperCase()}</Text>
        <View style={styles.card}>
          {LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[styles.langOption, language === lang.code && styles.langOptionActive]}
              onPress={() => handleLanguageChange(lang.code)}
              activeOpacity={0.75}
            >
              <Text style={styles.langFlag}>{lang.flag}</Text>
              <Text style={[styles.langName, language === lang.code && styles.langNameActive]}>
                {lang.name}
              </Text>
              {language === lang.code && (
                <View style={styles.langCheckChip}>
                  <Text style={styles.langCheck}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Notifications ── */}
        <Text style={styles.groupLabel}>{t('settings.notifications').toUpperCase()}</Text>
        <View style={styles.card}>
          {[
            ['orders', t('settings.orderUpdates')],
            ['payments', t('settings.paymentAlerts')],
            ['promotions', t('settings.promotions')],
            ['system', t('settings.systemNotifications')],
          ].map(([key, label]) => (
            <View key={key} style={styles.switchRow}>
              <Text style={styles.switchLabel}>{label}</Text>
              <Switch
                value={notifications[key]}
                onValueChange={(v) => setNotifications((p) => ({ ...p, [key]: v }))}
                trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                thumbColor={notifications[key] ? COLORS.primary : COLORS.surface}
                ios_backgroundColor={COLORS.border}
              />
            </View>
          ))}
        </View>

        {/* ── App Info ── */}
        <Text style={styles.groupLabel}>{t('settings.appInfo').toUpperCase()}</Text>
        <View style={styles.card}>
          {[
            [t('settings.version'), '1.0.0'],
            [t('settings.build'), '2024.1'],
            [t('settings.environment'), __DEV__ ? 'Development' : 'Production'],
          ].map(([label, value]) => (
            <View key={label} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{label}</Text>
              <Text style={styles.infoValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* ── Danger Zone ── */}
        <Text style={[styles.groupLabel, styles.dangerGroupLabel]}>{t('settings.dangerZone').toUpperCase()}</Text>
        <View style={[styles.card, styles.dangerCard]}>
          <TouchableOpacity style={styles.dangerBtn} onPress={handleDeleteAccount} activeOpacity={0.8}>
            <Text style={styles.dangerBtnText}>{t('settings.deleteAccount')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: SPACING.xl },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, paddingHorizontal: SPACING.base,
    paddingTop: Platform.OS === 'ios' ? SPACING['3xl'] : SPACING.base,
    paddingBottom: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider,
  },
  backBtn: { width: 36, height: 36, borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 24, color: COLORS.textPrimary, fontWeight: FONTS.bold, marginTop: -2 },
  headerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  groupLabel: {
    fontSize: 11, fontWeight: FONTS.bold, color: COLORS.textMuted,
    paddingHorizontal: SPACING.base, paddingTop: SPACING.lg, paddingBottom: SPACING.sm,
    letterSpacing: 0.8,
  },
  dangerGroupLabel: { color: COLORS.danger },
  card: {
    backgroundColor: COLORS.surface, marginHorizontal: SPACING.base, marginBottom: SPACING.sm,
    borderRadius: RADIUS.xl, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.xs,
  },
  dangerCard: { borderColor: 'rgba(229,72,77,0.25)' },
  sectionToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.base },
  sectionToggleActive: { borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  sectionToggleText: { fontSize: FONTS.base, fontWeight: FONTS.semiBold, color: COLORS.textPrimary },
  sectionToggleChevron: { transform: [{ rotate: '0deg' }] },
  sectionToggleChevronOpen: { transform: [{ rotate: '90deg' }] },
  sectionToggleArrow: { fontSize: FONTS.xl, color: COLORS.textMuted, fontWeight: FONTS.bold },
  sectionBody: { padding: SPACING.base, paddingTop: 4, gap: SPACING.xs },
  langOption: {
    flexDirection: 'row', alignItems: 'center', padding: SPACING.base,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, gap: SPACING.sm,
  },
  langOptionActive: { backgroundColor: COLORS.primaryFade },
  langFlag: { fontSize: 21 },
  langName: { flex: 1, fontSize: FONTS.base, color: COLORS.textSecondary },
  langNameActive: { color: COLORS.primaryDark, fontWeight: FONTS.bold },
  langCheckChip: { width: 22, height: 22, borderRadius: RADIUS.full, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  langCheck: { fontSize: 12, color: COLORS.textWhite, fontWeight: FONTS.black },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  switchLabel: { fontSize: FONTS.base, color: COLORS.textPrimary, fontWeight: FONTS.medium },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', padding: SPACING.base,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  infoLabel: { fontSize: FONTS.sm, color: COLORS.textMuted },
  infoValue: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  dangerBtn: { padding: SPACING.base, alignItems: 'center' },
  dangerBtnText: { fontSize: FONTS.base, color: COLORS.danger, fontWeight: FONTS.semiBold },
});