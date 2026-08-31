/**
 * VUMA Store — Account Menu Screen
 * Everything that isn't the main product-feed profile page lives
 * here, matching Coupang's real structure (Menu is a separate
 * destination, not inline on the profile feed). Logout and Delete
 * Account moved here from ProfileScreen too — Coupang doesn't put
 * sign-out on the main feed either.
 */

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  Platform, ScrollView, Alert, Modal,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { logout, selectUser } from '../../store/authSlice';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../utils/constants';

export default function AccountMenuScreen({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const isVendor = user?.role === 'vendor';
  const isApprovedVendor = isVendor && user?.vendor_status === 'approved';

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

  const handleVendorAction = () => {
    if (isVendor && isApprovedVendor) {
      navigation.navigate('VendorDashboard');
    } else if (isVendor && !isApprovedVendor) {
      Alert.alert('⏳ Application Pending', 'Your seller application is being reviewed. We will notify you once approved.', [{ text: 'OK' }]);
    } else {
      navigation.navigate('VendorRegister');
    }
  };

  const ACCOUNT_ITEMS = [
    { icon: '✏️', label: 'Edit Profile', onPress: () => navigation.navigate('EditProfile') },
    { icon: '📍', label: 'Saved Addresses', onPress: () => navigation.navigate('Address') },
    { icon: '💳', label: 'Payment Methods', onPress: () => navigation.navigate('Wallet') },
    { icon: '🔔', label: 'Notifications', onPress: () => navigation.navigate('Notifications') },
  ];

  const SUPPORT_ITEMS = [
    { icon: '🎁', label: 'Invite & Earn', onPress: () => navigation.navigate('Referral'), highlight: true },
    { icon: '💬', label: 'Help & Support', onPress: () => navigation.navigate('Chat') },
    { icon: '⚙️', label: 'Settings', onPress: () => navigation.navigate('Settings') },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Menu</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.menuSection}>
          {ACCOUNT_ITEMS.map((item) => (
            <TouchableOpacity key={item.label} style={styles.menuItem} onPress={item.onPress}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Seller entry point — same real logic as before */}
        <TouchableOpacity style={styles.vendorItem} onPress={handleVendorAction}>
          <Text style={styles.menuIcon}>🏪</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>
              {isVendor ? (isApprovedVendor ? 'Seller Dashboard' : 'Seller Application (Pending)') : 'Become a Seller'}
            </Text>
            {!isVendor && <Text style={styles.menuSub}>Commission from 3% only · Free registration</Text>}
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <View style={[styles.menuSection, { marginTop: SPACING.sm }]}>
          {SUPPORT_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuItem, item.highlight && styles.menuItemHighlight]}
              onPress={item.onPress}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={[styles.menuLabel, item.highlight && styles.menuLabelHighlight]}>{item.label}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => setShowLogoutModal(true)}
          disabled={loggingOut}
        >
          <Text style={styles.logoutText}>{loggingOut ? 'Logging out...' : 'Logout'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={() => setShowDeleteModal(true)}>
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>

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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, paddingHorizontal: SPACING.base, paddingTop: Platform.OS === 'ios' ? 50 : SPACING.base, paddingBottom: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider, ...SHADOWS.sm },
  backIcon: { fontSize: FONTS.xl, color: COLORS.textPrimary, fontWeight: FONTS.bold },
  headerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  menuSection: { backgroundColor: COLORS.surface, marginTop: SPACING.sm },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.base, paddingVertical: SPACING.base + 2, borderBottomWidth: 1, borderBottomColor: COLORS.divider, gap: SPACING.base },
  menuItemHighlight: { backgroundColor: '#FFF8F0' },
  menuIcon: { fontSize: 20, width: 28 },
  menuLabel: { flex: 1, fontSize: FONTS.base, color: COLORS.textPrimary, fontWeight: FONTS.medium },
  menuLabelHighlight: { color: COLORS.primary, fontWeight: FONTS.bold },
  menuSub: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  menuArrow: { fontSize: FONTS.xl, color: COLORS.textMuted },
  vendorItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, paddingHorizontal: SPACING.base, paddingVertical: SPACING.base + 2, marginTop: SPACING.sm, gap: SPACING.base },
  logoutBtn: { backgroundColor: COLORS.surface, marginHorizontal: SPACING.sm, marginTop: SPACING.xl, marginBottom: SPACING.sm, borderRadius: RADIUS.xl, padding: SPACING.base, alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.primary },
  logoutText: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.primary },
  deleteBtn: { alignItems: 'center', padding: SPACING.base },
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