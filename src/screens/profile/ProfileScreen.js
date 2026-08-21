/**
 * VUMA Store — Profile Screen
 * Fixed: Seller Dashboard navigation uses correct screen name
 */

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  Platform, ScrollView, Alert, Modal,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { logout, selectIsAuthenticated, selectUser } from '../../store/authSlice';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../utils/constants';

export default function ProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setShowLogoutModal(false);
    setLoggingOut(true);
    try {
      await dispatch(logout());
    } catch {
      Alert.alert('Error', 'Could not log out. Please try again.');
    } finally {
      setLoggingOut(false);
    }
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(false);
    Alert.alert(
      '⚠️ Final Warning',
      'This will permanently delete your account and all your data. This action CANNOT be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Delete My Account',
          style: 'destructive',
          onPress: async () => {
            try {
              const { del } = await import('../../api/client');
              await del('/users/delete-account/');
              await dispatch(logout());
            } catch {
              Alert.alert('Error', 'Could not delete account. Please contact support@vumastore.store');
            }
          },
        },
      ]
    );
  };

  // ── Navigate to Seller Dashboard ──────────────────
  const handleGoToDashboard = () => {
    const isVendor = user?.role === 'vendor';
    const isApproved = user?.vendor_status === 'approved';

    if (!isAuthenticated) {
      navigation.navigate('Auth', { screen: 'Login' });
      return;
    }

    if (isVendor && isApproved) {
      // Navigate to VendorDashboard tab inside VendorNavigator
      // The tab is named SCREENS.VENDOR_DASHBOARD = 'VendorDashboard'
      navigation.navigate('VendorDashboard');
      return;
    }

    if (isVendor && !isApproved) {
      Alert.alert(
        '⏳ Application Pending',
        'Your seller application is being reviewed. We will notify you once approved.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Not a vendor - go to registration
    navigation.navigate('VendorRegister');
  };

  // ── GUEST SCREEN ─────────────────────────────────
  if (!isAuthenticated) {
    const GUEST_FEATURES = [
      { icon: '📦', label: 'Track your orders in real time' },
      { icon: '❤️', label: 'Save your favourite products' },
      { icon: '⚡', label: 'Faster checkout every time' },
      { icon: '🔔', label: 'Get deals and flash sale alerts' },
      { icon: '🚚', label: 'Free delivery on all orders' },
      { icon: '🎁', label: 'Earn rewards by inviting friends' },
    ];

    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={styles.topBarLogo}>VUMA</Text>
          <View style={styles.topBarIcons}>
            <TouchableOpacity
              style={styles.topBarIconBtn}
              onPress={() => navigation.navigate('Auth', { screen: 'Login' })}
            >
              <Text style={styles.topBarIcon}>🔔</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.topBarIconBtn}
              onPress={() => navigation.navigate('Auth', { screen: 'Login' })}
            >
              <Text style={styles.topBarIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.guestScroll}>
          {/* Welcome card — no name shown here, since a guest isn't
              identified yet; that only happens after they sign in. */}
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeAvatar}>
              <Text style={styles.welcomeAvatarIcon}>👤</Text>
            </View>
            <View style={styles.welcomeText}>
              <Text style={styles.welcomeGreeting}>Welcome</Text>
              <Text style={styles.welcomeSub}>Shop, sell and manage your account</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.signInBtn}
            onPress={() => navigation.navigate('Auth', { screen: 'Login' })}
            activeOpacity={0.85}
          >
            <Text style={styles.signInIcon}>➜</Text>
            <View style={styles.signInText}>
              <Text style={styles.signInTitle}>Sign In</Text>
              <Text style={styles.signInSub}>Access your account</Text>
            </View>
            <Text style={styles.signInArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => navigation.navigate('Auth', { screen: 'Register' })}
            activeOpacity={0.7}
          >
            <View style={styles.createIconWrap}>
              <Text style={styles.createIcon}>👤</Text>
            </View>
            <View style={styles.createText}>
              <Text style={styles.createTitle}>Create Customer Account</Text>
              <Text style={styles.createSub}>Create a new customer account</Text>
            </View>
            <Text style={styles.createArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sellerBtn}
            onPress={() => navigation.navigate('VendorRegister', { isNewAccount: true })}
            activeOpacity={0.85}
          >
            <View style={styles.sellerIconWrap}>
              <Text style={styles.sellerIcon}>🏪</Text>
            </View>
            <View style={styles.sellerTextWrap}>
              <Text style={styles.sellerText}>Become a Seller</Text>
              <Text style={styles.sellerSub}>Start selling on VUMA</Text>
            </View>
            <View style={styles.sellerBadge}>
              <Text style={styles.sellerBadgeText}>Commission from 3%</Text>
            </View>
            <Text style={styles.sellerArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.guestFeatures}>
            <Text style={styles.featTitle}>Why join VUMA?</Text>
            {GUEST_FEATURES.map((f, i) => (
              <View key={i} style={[styles.featRow, i === GUEST_FEATURES.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={styles.featIcon}>{f.icon}</Text>
                <Text style={styles.featText}>{f.label}</Text>
                <Text style={styles.featArrow}>›</Text>
              </View>
            ))}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  // ── LOGGED IN SCREEN ──────────────────────────────
  const isVendor = user?.role === 'vendor';
  const isApprovedVendor = isVendor && user?.vendor_status === 'approved';
  const initials = (user?.username || user?.email || 'U')[0].toUpperCase();

  const MENU_ITEMS = [
    { icon: '✏️', label: 'Edit Profile', screen: 'EditProfile' },
    { icon: '📦', label: 'My Orders', screen: 'Orders' },
    { icon: '📍', label: 'Saved Addresses', screen: 'Address' },
    { icon: '💳', label: 'Payment Methods', screen: 'Wallet' },
    { icon: '🎁', label: 'Invite & Earn', screen: 'Referral', highlight: true },
    { icon: '🔔', label: 'Notifications', screen: 'Notifications' },
    { icon: '💬', label: 'Help & Support', screen: 'Chat' },
    { icon: '⚙️', label: 'Settings', screen: 'Settings' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Account</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.username || 'VUMA User'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            {user?.phone ? <Text style={styles.userPhone}>📞 {user.phone}</Text> : null}
            {isVendor && (
              <View style={[styles.vendorBadge,
                !isApprovedVendor && styles.vendorBadgePending]}>
                <Text style={styles.vendorBadgeText}>
                  {isApprovedVendor ? '🏪 Verified Seller' : '⏳ Seller Application Pending'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Referral Banner */}
        <TouchableOpacity
          style={styles.referralBanner}
          onPress={() => navigation.navigate('Referral')}
          activeOpacity={0.85}
        >
          <Text style={styles.referralBannerIcon}>🎁</Text>
          <View style={styles.referralBannerText}>
            <Text style={styles.referralBannerTitle}>Invite & Earn TZS 2,000!</Text>
            <Text style={styles.referralBannerSub}>Invite friends to VUMA and earn rewards</Text>
          </View>
          <Text style={styles.referralBannerArrow}>›</Text>
        </TouchableOpacity>

        {/* Vendor Dashboard Button */}
        {isVendor && (
          <TouchableOpacity
            style={[styles.vendorDashBtn, !isApprovedVendor && styles.vendorDashBtnPending]}
            onPress={handleGoToDashboard}
          >
            <Text style={styles.vendorDashText}>
              {isApprovedVendor ? '🏪 Go to Seller Dashboard' : '⏳ Check Application Status'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Become Seller (for non-vendors) */}
        {!isVendor && (
          <TouchableOpacity
            style={styles.becomeSellerBtn}
            onPress={() => navigation.navigate('VendorRegister')}
          >
            <Text style={styles.becomeSellerIcon}>🏪</Text>
            <View style={styles.becomeSellerText}>
              <Text style={styles.becomeSellerTitle}>Become a VUMA Seller</Text>
              <Text style={styles.becomeSellerSub}>Commission from 3% only · Free registration</Text>
            </View>
            <Text style={styles.becomeSellerArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* Menu */}
        <View style={styles.menuSection}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuItem, item.highlight && styles.menuItemHighlight]}
              onPress={() => navigation.navigate(item.screen)}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={[styles.menuLabel, item.highlight && styles.menuLabelHighlight]}>
                {item.label}
              </Text>
              {item.highlight && (
                <View style={styles.menuBadge}>
                  <Text style={styles.menuBadgeText}>Earn Rewards</Text>
                </View>
              )}
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => setShowLogoutModal(true)}
          disabled={loggingOut}
        >
          <Text style={styles.logoutIcon}>⭐</Text>
          <Text style={styles.logoutText}>{loggingOut ? 'Logging out...' : 'Logout'}</Text>
        </TouchableOpacity>

        {/* Delete Account */}
        <TouchableOpacity style={styles.deleteBtn} onPress={() => setShowDeleteModal(true)}>
          <Text style={styles.deleteIcon}>⚠️</Text>
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Logout Modal */}
      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalIcon}>👋</Text>
            <Text style={styles.modalTitle}>Logout?</Text>
            <Text style={styles.modalText}>You will be signed out. Your cart and data will be saved.</Text>
            <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleLogout}>
              <Text style={styles.modalConfirmText}>Yes, Logout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowLogoutModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalIcon}>⚠️</Text>
            <Text style={styles.modalTitle}>Delete Account?</Text>
            <Text style={styles.modalText}>
              This will permanently delete your account, orders, and all data.{'\n\n'}
              This action CANNOT be undone.
            </Text>
            <TouchableOpacity style={styles.modalDeleteBtn} onPress={handleDeleteAccount}>
              <Text style={styles.modalDeleteText}>Yes, Delete My Account</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowDeleteModal(false)}>
              <Text style={styles.modalCancelText}>Cancel — Keep My Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.surface, paddingHorizontal: SPACING.base, paddingTop: Platform.OS === 'ios' ? 50 : SPACING.base, paddingBottom: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  headerTitle: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textPrimary },

  // Guest top bar
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, paddingHorizontal: SPACING.base, paddingTop: Platform.OS === 'ios' ? 54 : SPACING.base, paddingBottom: SPACING.sm },
  topBarLogo: { fontSize: 26, fontWeight: '900', color: COLORS.primary, letterSpacing: -1 },
  topBarIcons: { flexDirection: 'row', gap: SPACING.sm },
  topBarIconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  topBarIcon: { fontSize: 19 },
  guestScroll: { padding: SPACING.base },

  // Welcome card
  welcomeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryFade, borderRadius: 18, padding: SPACING.base, marginBottom: SPACING.base, gap: SPACING.base },
  welcomeAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  welcomeAvatarIcon: { fontSize: 24, color: COLORS.primary },
  welcomeText: { flex: 1 },
  welcomeGreeting: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  welcomeSub: { fontSize: FONTS.xs, color: COLORS.textSecondary, marginTop: 2 },

  signInBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: 16, padding: SPACING.base, gap: SPACING.base, marginBottom: SPACING.sm, ...SHADOWS.sm },
  signInIcon: { fontSize: 20, color: 'white' },
  signInText: { flex: 1 },
  signInTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: 'white' },
  signInSub: { fontSize: FONTS.xs, color: 'rgba(255,255,255,0.8)', marginTop: 1 },
  signInArrow: { fontSize: FONTS.xl, color: 'white' },

  createBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: SPACING.base, gap: SPACING.base, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  createIconWrap: { width: 36, height: 36, borderRadius: 12, backgroundColor: COLORS.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  createIcon: { fontSize: 17 },
  createText: { flex: 1 },
  createTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  createSub: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 1 },
  createArrow: { fontSize: FONTS.xl, color: COLORS.textMuted },

  sellerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryFade, borderRadius: 16, padding: SPACING.base, gap: SPACING.sm, marginBottom: SPACING.base, borderWidth: 1, borderColor: 'rgba(255,106,0,0.25)' },
  sellerIconWrap: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  sellerIcon: { fontSize: 17 },
  sellerTextWrap: { flex: 1 },
  sellerText: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  sellerSub: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 1 },
  sellerBadge: { backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 3 },
  sellerBadgeText: { fontSize: 10.5, color: 'white', fontWeight: FONTS.bold },
  sellerArrow: { fontSize: FONTS.xl, color: COLORS.primary },

  guestFeatures: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: SPACING.base, borderWidth: 1, borderColor: COLORS.border },
  featTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  featRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm + 2, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  featIcon: { fontSize: 17, width: 24 },
  featText: { flex: 1, fontSize: FONTS.sm, color: COLORS.textSecondary },
  featArrow: { fontSize: FONTS.lg, color: COLORS.textLight },

  guestHeader: { backgroundColor: COLORS.surface, alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 60 : SPACING['3xl'], paddingBottom: SPACING.xl, paddingHorizontal: SPACING.xl, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  logo: { fontSize: 40, fontWeight: '900', color: COLORS.primary, letterSpacing: -2, marginBottom: SPACING.sm },
  guestTitle: { fontSize: FONTS['2xl'], fontWeight: FONTS.black, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  guestSub: { fontSize: FONTS.sm, color: COLORS.textMuted, textAlign: 'center' },
  guestButtons: { padding: SPACING.base, gap: SPACING.sm },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: SPACING.base, marginBottom: SPACING.sm, gap: SPACING.base },
  avatar: { width: 60, height: 60, borderRadius: RADIUS.full, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: FONTS['2xl'], fontWeight: FONTS.black, color: 'white' },
  userInfo: { flex: 1 },
  userName: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  userEmail: { fontSize: FONTS.sm, color: COLORS.textMuted, marginTop: 2 },
  userPhone: { fontSize: FONTS.sm, color: COLORS.textMuted, marginTop: 2 },
  vendorBadge: { alignSelf: 'flex-start', backgroundColor: COLORS.primaryFade, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 3, marginTop: 4 },
  vendorBadgePending: { backgroundColor: '#FFF8E7' },
  vendorBadgeText: { fontSize: FONTS.xs, color: COLORS.primary, fontWeight: FONTS.bold },
  referralBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', marginHorizontal: SPACING.sm, marginBottom: SPACING.sm, borderRadius: RADIUS.xl, padding: SPACING.base, borderWidth: 1.5, borderColor: COLORS.primary + '60', gap: SPACING.sm, ...SHADOWS.sm },
  referralBannerIcon: { fontSize: 32 },
  referralBannerText: { flex: 1 },
  referralBannerTitle: { fontSize: FONTS.base, fontWeight: FONTS.black, color: COLORS.primary },
  referralBannerSub: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  referralBannerArrow: { fontSize: FONTS.xl, color: COLORS.primary, fontWeight: FONTS.bold },
  vendorDashBtn: { backgroundColor: COLORS.primary, marginHorizontal: SPACING.sm, marginBottom: SPACING.sm, borderRadius: RADIUS.xl, padding: SPACING.base, alignItems: 'center' },
  vendorDashBtnPending: { backgroundColor: COLORS.warning },
  vendorDashText: { color: 'white', fontSize: FONTS.base, fontWeight: FONTS.bold },
  becomeSellerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1B4332', marginHorizontal: SPACING.sm, marginBottom: SPACING.sm, borderRadius: RADIUS.xl, padding: SPACING.base, gap: SPACING.sm },
  becomeSellerIcon: { fontSize: 24 },
  becomeSellerText: { flex: 1 },
  becomeSellerTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: 'white' },
  becomeSellerSub: { fontSize: FONTS.xs, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  becomeSellerArrow: { fontSize: FONTS.xl, color: 'rgba(255,255,255,0.7)' },
  menuSection: { backgroundColor: COLORS.surface, marginBottom: SPACING.sm },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.base, paddingVertical: SPACING.base + 2, borderBottomWidth: 1, borderBottomColor: COLORS.divider, gap: SPACING.base },
  menuItemHighlight: { backgroundColor: '#FFF8F0' },
  menuIcon: { fontSize: 20, width: 28 },
  menuLabel: { flex: 1, fontSize: FONTS.base, color: COLORS.textPrimary, fontWeight: FONTS.medium },
  menuLabelHighlight: { color: COLORS.primary, fontWeight: FONTS.bold },
  menuBadge: { backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 2 },
  menuBadgeText: { fontSize: FONTS.xs, color: 'white', fontWeight: FONTS.bold },
  menuArrow: { fontSize: FONTS.xl, color: COLORS.textMuted },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, marginHorizontal: SPACING.sm, marginBottom: SPACING.sm, borderRadius: RADIUS.xl, padding: SPACING.base, gap: SPACING.base, borderWidth: 1.5, borderColor: COLORS.primary },
  logoutIcon: { fontSize: 20 },
  logoutText: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.primary },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.sm, marginBottom: SPACING.sm, padding: SPACING.base, gap: SPACING.base },
  deleteIcon: { fontSize: 16 },
  deleteText: { fontSize: FONTS.sm, color: COLORS.danger },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  modalCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS['2xl'], padding: SPACING.xl, width: '100%', alignItems: 'center' },
  modalIcon: { fontSize: 48, marginBottom: SPACING.base },
  modalTitle: { fontSize: FONTS['2xl'], fontWeight: FONTS.black, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  modalText: { fontSize: FONTS.sm, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.xl },
  modalConfirmBtn: { width: '100%', backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, padding: SPACING.base, alignItems: 'center', marginBottom: SPACING.sm },
  modalConfirmText: { color: 'white', fontSize: FONTS.base, fontWeight: FONTS.bold },
  modalDeleteBtn: { width: '100%', backgroundColor: COLORS.danger, borderRadius: RADIUS.xl, padding: SPACING.base, alignItems: 'center', marginBottom: SPACING.sm },
  modalDeleteText: { color: 'white', fontSize: FONTS.base, fontWeight: FONTS.bold },
  modalCancelBtn: { paddingVertical: SPACING.sm },
  modalCancelText: { fontSize: FONTS.sm, color: COLORS.textMuted, fontWeight: FONTS.semiBold },
});