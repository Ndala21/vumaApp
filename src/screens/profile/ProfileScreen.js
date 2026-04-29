/**
 * VUMA Store — Profile Screen
 * Full i18n support + Guest browsing
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, Platform, Alert, Image, RefreshControl, Linking, Modal,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  logout, getProfile, selectUser, selectIsVendor,
  selectIsApprovedVendor, selectVendorStatus, selectIsAuthenticated,
} from '../../store/authSlice';
import { selectCartItemCount } from '../../store/cartSlice';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, SCREENS, VENDOR_STATUS } from '../../utils/constants';
import { formatDate, getInitials } from '../../utils/helpers';
import { t } from '../../i18n';

const TERMS_CONTENT = `VUMA Store — Terms of Service
Last updated: April 2026

1. ACCEPTANCE OF TERMS
By using VUMA Store, you agree to these Terms of Service.

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

6. PRIVACY
• We collect only necessary data to process orders.
• We never sell your personal data to third parties.

7. CONTACT
For questions: support@vumastore.com
Website: https://vumastore.com`;

export default function ProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isVendor = useSelector(selectIsVendor);
  const isApprovedVendor = useSelector(selectIsApprovedVendor);
  const vendorStatus = useSelector(selectVendorStatus);
  const cartCount = useSelector(selectCartItemCount);

  const [refreshing, setRefreshing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [expandedHelp, setExpandedHelp] = useState(null);

  const HELP_TOPICS = [
    { icon: '📦', title: 'How to track my order?', answer: 'Go to My Orders → tap your order → view real-time tracking status.' },
    { icon: '↩️', title: 'How to return an item?', answer: 'Go to My Orders → tap the order → select "Return Item". Returns are accepted within 7 days.' },
    { icon: '💳', title: 'Payment methods accepted?', answer: 'We accept Credit/Debit Cards, VUMA Wallet, M-Pesa, and Bank Transfer.' },
    { icon: '🚚', title: 'When will I get free shipping?', answer: 'Orders over ₩50,000 qualify for free shipping automatically.' },
    { icon: '🏪', title: 'How to become a vendor?', answer: 'Tap "Become a Vendor" on your profile. Fill the application and we review within 24-48 hours.' },
    { icon: '🔒', title: 'Is my payment secure?', answer: 'Yes. All payments are encrypted and processed via Stripe. We never store card details.' },
    { icon: '📞', title: 'Contact support?', answer: 'Email us at support@vumastore.com or use Chat Support for instant help.' },
  ];

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(getProfile());
    setRefreshing(false);
  }, []);

  const handleLogout = () => {
    Alert.alert(t('auth.logout'), t('profile.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('auth.logout'), style: 'destructive', onPress: () => dispatch(logout()) },
    ]);
  };

  const handleWishlist = () => {
    Alert.alert('❤️ ' + t('profile.wishlist'), 'Your saved items will appear here once you heart a product.', [
      { text: 'Browse Products', onPress: () => navigation.navigate(SCREENS.SEARCH) },
      { text: t('common.ok') },
    ]);
  };

  const handleReturns = () => {
    Alert.alert('↩️ ' + t('profile.returns'), 'To return an item:\n\n1. Go to My Orders\n2. Tap the order\n3. Select "Return Item"\n\nReturns accepted within 7 days. Need help?', [
      { text: t('orders.myOrders'), onPress: () => navigation.navigate(SCREENS.ORDERS) },
      { text: t('profile.chatSupport'), onPress: () => navigation.navigate(SCREENS.CHAT) },
      { text: t('common.close'), style: 'cancel' },
    ]);
  };

  const handleBecomeVendor = () => {
    Alert.alert('🏪 ' + t('profile.becomeVendor'),
      'Start selling on VUMA!\n\n✅ Easy setup\n✅ Only 10% commission\n✅ Fast payouts\n✅ Millions of customers\n\nReady to apply?',
      [
        { text: 'Apply Now', onPress: () => navigation.navigate('VendorApply') },
        { text: 'Not Now', style: 'cancel' },
      ]
    );
  };

  const MenuItem = ({ icon, label, value, onPress, color = COLORS.textPrimary, badge, showArrow = true }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.menuLeft}>
        <Text style={styles.menuIcon}>{icon}</Text>
        <Text style={[styles.menuLabel, { color }]}>{label}</Text>
      </View>
      <View style={styles.menuRight}>
        {value && <Text style={styles.menuValue}>{value}</Text>}
        {badge != null && badge > 0 && (
          <View style={styles.menuBadge}>
            <Text style={styles.menuBadgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
        {showArrow && <Text style={styles.menuArrow}>›</Text>}
      </View>
    </TouchableOpacity>
  );

  const SectionHeader = ({ title }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  // ── GUEST VIEW ─────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('profile.profile')}</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.guestContainer}>
          <Text style={styles.guestIcon}>👤</Text>
          <Text style={styles.guestTitle}>You're not logged in</Text>
          <Text style={styles.guestSubtitle}>Login or create an account to access your profile, orders and more.</Text>
          <TouchableOpacity
            style={styles.guestLoginBtn}
            onPress={() => navigation.navigate('Auth')}
          >
            <Text style={styles.guestLoginText}>{t('auth.login')} / {t('auth.register')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.guestTermsBtn} onPress={() => setShowTerms(true)}>
            <Text style={styles.guestTermsText}>📄 {t('profile.terms')}</Text>
          </TouchableOpacity>
        </View>
        <Modal visible={showTerms} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>📄 {t('profile.terms')}</Text>
                <TouchableOpacity onPress={() => setShowTerms(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.base }}>
                <Text style={styles.termsText}>{TERMS_CONTENT}</Text>
                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ── AUTHENTICATED VIEW ─────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('profile.profile')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate(SCREENS.SETTINGS)}>
          <Text style={styles.headerIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.avatarCard}>
          <View style={styles.avatarWrap}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>{getInitials(user?.username || 'U')}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.avatarEdit}>
              <Text style={styles.avatarEditIcon}>📷</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.username}>{user?.username}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {user?.phone && <Text style={styles.phone}>{user.phone}</Text>}
          <Text style={styles.memberSince}>{t('profile.memberSince')} {formatDate(user?.created_at)}</Text>
          <View style={[styles.roleBadge, isApprovedVendor && styles.roleBadgeVendor]}>
            <Text style={[styles.roleBadgeText, isApprovedVendor && styles.roleBadgeTextVendor]}>
              {isApprovedVendor ? t('profile.approvedVendor') : user?.role === 'admin' ? t('profile.admin') : t('profile.customer')}
            </Text>
          </View>
        </View>

        {vendorStatus === VENDOR_STATUS.PENDING && (
          <View style={styles.vendorBanner}>
            <Text style={styles.vendorBannerIcon}>⏳</Text>
            <View style={styles.vendorBannerText}>
              <Text style={styles.vendorBannerTitle}>Application Under Review</Text>
              <Text style={styles.vendorBannerSub}>We'll notify you within 24-48 hours.</Text>
            </View>
          </View>
        )}
        {vendorStatus === VENDOR_STATUS.REJECTED && (
          <View style={[styles.vendorBanner, styles.vendorBannerRejected]}>
            <Text style={styles.vendorBannerIcon}>❌</Text>
            <View style={styles.vendorBannerText}>
              <Text style={styles.vendorBannerTitle}>Application Rejected</Text>
              <Text style={styles.vendorBannerSub}>{user?.rejection_reason || 'Contact support for details.'}</Text>
            </View>
          </View>
        )}

        <View style={styles.statsRow}>
          {[
            ['🛒', t('profile.orders'), user?.order_count || 0],
            ['❤️', t('profile.wishlist'), user?.wishlist_count || 0],
            ['⭐', t('profile.reviews'), user?.review_count || 0],
          ].map(([icon, label, value]) => (
            <View key={label} style={styles.statItem}>
              <Text style={styles.statIcon}>{icon}</Text>
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <SectionHeader title="SHOPPING" />
        <View style={styles.menuCard}>
          <MenuItem icon="📦" label={t('orders.myOrders')} onPress={() => navigation.navigate(SCREENS.ORDERS)} />
          <MenuItem icon="🛒" label={t('cart.myCart')} badge={cartCount} onPress={() => navigation.navigate(SCREENS.CART)} />
          <MenuItem icon="❤️" label={t('profile.wishlist')} onPress={handleWishlist} />
          <MenuItem icon="💰" label={t('profile.wallet')} onPress={() => navigation.navigate(SCREENS.WALLET)} />
          <MenuItem icon="↩️" label={t('profile.returns')} onPress={handleReturns} />
        </View>

        <SectionHeader title="SUPPORT" />
        <View style={styles.menuCard}>
          <MenuItem icon="💬" label={t('profile.chatSupport')} onPress={() => navigation.navigate(SCREENS.CHAT)} />
          <MenuItem icon="🔔" label={t('profile.notifications')} onPress={() => navigation.navigate(SCREENS.NOTIFICATIONS)} />
          <MenuItem icon="❓" label={t('profile.helpCenter')} onPress={() => setShowHelp(true)} />
        </View>

        {!isVendor && (
          <>
            <SectionHeader title="SELL ON VUMA" />
            <View style={styles.menuCard}>
              <MenuItem icon="🏪" label={t('profile.becomeVendor')} value={t('profile.commission')} onPress={handleBecomeVendor} />
            </View>
          </>
        )}

        <SectionHeader title="ACCOUNT" />
        <View style={styles.menuCard}>
          <MenuItem icon="⚙️" label={t('profile.settings')} onPress={() => navigation.navigate(SCREENS.SETTINGS)} />
          <MenuItem icon="🔒" label={t('profile.privacy')} onPress={() => navigation.navigate(SCREENS.SETTINGS)} />
          <MenuItem icon="📄" label={t('profile.terms')} onPress={() => setShowTerms(true)} />
          <MenuItem icon="🚪" label={t('auth.logout')} color={COLORS.danger} showArrow={false} onPress={handleLogout} />
        </View>

        <Text style={styles.version}>VUMA Store v1.0.0</Text>
        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={showHelp} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>❓ {t('profile.helpCenter')}</Text>
              <TouchableOpacity onPress={() => setShowHelp(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.helpIntro}>How can we help you?</Text>
              {HELP_TOPICS.map((topic, i) => (
                <TouchableOpacity key={i} style={styles.helpItem} onPress={() => setExpandedHelp(expandedHelp === i ? null : i)}>
                  <View style={styles.helpQuestion}>
                    <Text style={styles.helpIcon}>{topic.icon}</Text>
                    <Text style={styles.helpTitle}>{topic.title}</Text>
                    <Text style={styles.helpArrow}>{expandedHelp === i ? '▲' : '▼'}</Text>
                  </View>
                  {expandedHelp === i && <Text style={styles.helpAnswer}>{topic.answer}</Text>}
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.helpContactBtn} onPress={() => { setShowHelp(false); navigation.navigate(SCREENS.CHAT); }}>
                <Text style={styles.helpContactText}>💬 Still need help? Chat with us</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.helpEmailBtn} onPress={() => Linking.openURL('mailto:support@vumastore.com')}>
                <Text style={styles.helpEmailText}>✉️ support@vumastore.com</Text>
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showTerms} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📄 {t('profile.terms')}</Text>
              <TouchableOpacity onPress={() => setShowTerms(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.base }}>
              <Text style={styles.termsText}>{TERMS_CONTENT}</Text>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingBottom: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider, ...SHADOWS.sm,
  },
  headerTitle: { fontSize: FONTS['2xl'], fontWeight: FONTS.bold, color: COLORS.textPrimary },
  headerIcon: { fontSize: 22 },
  // Guest styles
  guestContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  guestIcon: { fontSize: 64, marginBottom: SPACING.base },
  guestTitle: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  guestSubtitle: { fontSize: FONTS.base, color: COLORS.textMuted, textAlign: 'center', marginBottom: SPACING.xl, lineHeight: 22 },
  guestLoginBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, paddingVertical: SPACING.base, paddingHorizontal: SPACING['2xl'], marginBottom: SPACING.base, width: '100%', alignItems: 'center' },
  guestLoginText: { color: COLORS.textWhite, fontSize: FONTS.lg, fontWeight: FONTS.bold },
  guestTermsBtn: { padding: SPACING.base },
  guestTermsText: { color: COLORS.textMuted, fontSize: FONTS.sm },
  // Normal styles
  avatarCard: { backgroundColor: COLORS.surface, alignItems: 'center', paddingVertical: SPACING.xl, paddingHorizontal: SPACING.base, marginBottom: SPACING.sm },
  avatarWrap: { position: 'relative', marginBottom: SPACING.base },
  avatar: { width: 90, height: 90, borderRadius: RADIUS.full, borderWidth: 3, borderColor: COLORS.primary },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: RADIUS.full, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: COLORS.primaryLight },
  avatarInitials: { fontSize: FONTS['3xl'], fontWeight: FONTS.bold, color: COLORS.textWhite },
  avatarEdit: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.border },
  avatarEditIcon: { fontSize: 14 },
  username: { fontSize: FONTS['2xl'], fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: 2 },
  email: { fontSize: FONTS.sm, color: COLORS.textMuted, marginBottom: 2 },
  phone: { fontSize: FONTS.sm, color: COLORS.textMuted, marginBottom: 2 },
  memberSince: { fontSize: FONTS.xs, color: COLORS.textLight, marginBottom: SPACING.sm },
  roleBadge: { backgroundColor: COLORS.primaryFade, borderRadius: RADIUS.full, paddingHorizontal: SPACING.base, paddingVertical: SPACING.xs },
  roleBadgeVendor: { backgroundColor: COLORS.successLight },
  roleBadgeText: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.bold },
  roleBadgeTextVendor: { color: COLORS.successText },
  vendorBanner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.warningLight, marginHorizontal: SPACING.sm, marginBottom: SPACING.sm, borderRadius: RADIUS.xl, padding: SPACING.base, borderLeftWidth: 4, borderLeftColor: COLORS.warning },
  vendorBannerRejected: { backgroundColor: COLORS.dangerLight, borderLeftColor: COLORS.danger },
  vendorBannerIcon: { fontSize: 28 },
  vendorBannerText: { flex: 1 },
  vendorBannerTitle: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  vendorBannerSub: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  statsRow: { flexDirection: 'row', backgroundColor: COLORS.surface, marginBottom: SPACING.sm, paddingVertical: SPACING.base },
  statItem: { flex: 1, alignItems: 'center', gap: 3, borderRightWidth: 1, borderRightColor: COLORS.divider },
  statIcon: { fontSize: 20 },
  statValue: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  statLabel: { fontSize: FONTS.xs, color: COLORS.textMuted },
  sectionHeader: { fontSize: FONTS.xs, fontWeight: FONTS.bold, color: COLORS.textMuted, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm, letterSpacing: 1 },
  menuCard: { backgroundColor: COLORS.surface, marginHorizontal: SPACING.sm, marginBottom: SPACING.sm, borderRadius: RADIUS.xl, overflow: 'hidden', ...SHADOWS.sm },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.base, paddingVertical: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
  menuIcon: { fontSize: 20, width: 28 },
  menuLabel: { fontSize: FONTS.base, fontWeight: FONTS.medium },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  menuValue: { fontSize: FONTS.sm, color: COLORS.textMuted },
  menuBadge: { backgroundColor: COLORS.primary, borderRadius: RADIUS.full, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  menuBadgeText: { color: COLORS.textWhite, fontSize: 10, fontWeight: FONTS.bold },
  menuArrow: { fontSize: FONTS.xl, color: COLORS.textMuted },
  version: { fontSize: FONTS.xs, color: COLORS.textLight, textAlign: 'center', marginTop: SPACING.xl },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS['2xl'], borderTopRightRadius: RADIUS['2xl'], maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  modalTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  modalClose: { fontSize: FONTS.lg, color: COLORS.textMuted, padding: SPACING.xs },
  helpIntro: { fontSize: FONTS.base, color: COLORS.textMuted, padding: SPACING.base, textAlign: 'center' },
  helpItem: { borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, marginHorizontal: SPACING.base },
  helpQuestion: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.base, gap: SPACING.sm },
  helpIcon: { fontSize: 20 },
  helpTitle: { flex: 1, fontSize: FONTS.base, fontWeight: FONTS.medium, color: COLORS.textPrimary },
  helpArrow: { fontSize: FONTS.xs, color: COLORS.textMuted },
  helpAnswer: { fontSize: FONTS.sm, color: COLORS.textSecondary, paddingBottom: SPACING.base, lineHeight: 20 },
  helpContactBtn: { margin: SPACING.base, backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, padding: SPACING.base, alignItems: 'center' },
  helpContactText: { color: COLORS.textWhite, fontWeight: FONTS.bold, fontSize: FONTS.base },
  helpEmailBtn: { marginHorizontal: SPACING.base, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: SPACING.base, alignItems: 'center' },
  helpEmailText: { color: COLORS.textSecondary, fontSize: FONTS.sm },
  termsText: { fontSize: FONTS.sm, color: COLORS.textSecondary, lineHeight: 22 },
});