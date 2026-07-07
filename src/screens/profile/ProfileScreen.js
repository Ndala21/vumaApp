/**
 * VUMA — Guest Profile Screen
 * Shown when user is not logged in
 * Tanzania-friendly: Sign In, Create Account, Become a Seller
 */

import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar, Platform, Image,
} from 'react-native';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectUser } from '../../store/authSlice';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../utils/constants';

export default function ProfileScreen({ navigation }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);

  // If logged in, show real profile options
  if (isAuthenticated && user) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Account</Text>
        </View>
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user.username || user.email || 'U')[0].toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.username || user.email}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            {user.role === 'vendor' && (
              <View style={styles.vendorBadge}>
                <Text style={styles.vendorBadgeText}>🏪 Seller</Text>
              </View>
            )}
          </View>
        </View>

        {/* Menu items */}
        {[
          { icon: '📦', label: 'My Orders', screen: 'Orders' },
          { icon: '❤️', label: 'Wishlist', screen: 'Wishlist' },
          { icon: '📍', label: 'My Addresses', screen: 'Address' },
          { icon: '💳', label: 'Wallet & Payments', screen: 'Wallet' },
          { icon: '🔔', label: 'Notifications', screen: 'Notifications' },
          { icon: '⚙️', label: 'Settings', screen: 'Settings' },
        ].map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.screen)}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}

        {user.role === 'vendor' && (
          <TouchableOpacity
            style={styles.sellerDashBtn}
            onPress={() => navigation.navigate('VendorDashboard')}
          >
            <Text style={styles.sellerDashText}>🏪 Go to Seller Dashboard</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Guest screen — not logged in
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      <View style={styles.guestTop}>
        <Text style={styles.logo}>VUMA</Text>
        <Text style={styles.guestTitle}>Your Account</Text>
        <Text style={styles.guestSubtitle}>
          Sign in to track orders, save products and checkout faster
        </Text>
      </View>

      <View style={styles.guestButtons}>
        {/* Sign In */}
        <TouchableOpacity
          style={styles.signInBtn}
          onPress={() => navigation.navigate('Auth', { screen: 'Login' })}
          activeOpacity={0.85}
        >
          <Text style={styles.signInIcon}>🛒</Text>
          <Text style={styles.signInText}>Sign In</Text>
        </TouchableOpacity>

        {/* Create Customer Account */}
        <TouchableOpacity
          style={styles.registerBtn}
          onPress={() => navigation.navigate('Auth', { screen: 'Register' })}
          activeOpacity={0.85}
        >
          <Text style={styles.registerIcon}>👤</Text>
          <Text style={styles.registerText}>Create Customer Account</Text>
        </TouchableOpacity>

        {/* Become a Seller */}
        <TouchableOpacity
          style={styles.sellerBtn}
          onPress={() => navigation.navigate('VendorRegister', { isNewAccount: true })}
          activeOpacity={0.85}
        >
          <Text style={styles.sellerIcon}>🏪</Text>
          <View style={styles.sellerTextWrap}>
            <Text style={styles.sellerText}>Become a Seller</Text>
            <Text style={styles.sellerSub}>Start earning on VUMA</Text>
          </View>
          <Text style={styles.sellerArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.guestFeatures}>
        <Text style={styles.featuresTitle}>Why create an account?</Text>
        {[
          '📦 Track your orders',
          '❤️ Save your favourites',
          '⚡ Faster checkout',
          '🔔 Get deal alerts',
        ].map((f, i) => (
          <Text key={i} style={styles.featureText}>{f}</Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.surface, paddingHorizontal: SPACING.base, paddingTop: Platform.OS === 'ios' ? 50 : SPACING.base, paddingBottom: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  headerTitle: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: SPACING.base, marginBottom: SPACING.sm, gap: SPACING.base },
  avatar: { width: 56, height: 56, borderRadius: RADIUS.full, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: FONTS['2xl'], fontWeight: FONTS.black, color: 'white' },
  userInfo: { flex: 1 },
  userName: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  userEmail: { fontSize: FONTS.sm, color: COLORS.textMuted, marginTop: 2 },
  vendorBadge: { alignSelf: 'flex-start', backgroundColor: COLORS.primaryFade, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 2, marginTop: 4 },
  vendorBadgeText: { fontSize: FONTS.xs, color: COLORS.primary, fontWeight: FONTS.bold },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, paddingHorizontal: SPACING.base, paddingVertical: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider, gap: SPACING.base },
  menuIcon: { fontSize: 20 },
  menuLabel: { flex: 1, fontSize: FONTS.base, color: COLORS.textPrimary, fontWeight: FONTS.medium },
  menuArrow: { fontSize: FONTS.xl, color: COLORS.textMuted },
  sellerDashBtn: { margin: SPACING.base, backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, padding: SPACING.base, alignItems: 'center' },
  sellerDashText: { color: 'white', fontSize: FONTS.base, fontWeight: FONTS.bold },
  // Guest styles
  guestTop: { backgroundColor: COLORS.surface, alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 60 : SPACING['3xl'], paddingBottom: SPACING.xl, paddingHorizontal: SPACING.xl, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  logo: { fontSize: FONTS['4xl'], fontWeight: FONTS.black, color: COLORS.primary, letterSpacing: -2, marginBottom: SPACING.sm },
  guestTitle: { fontSize: FONTS['2xl'], fontWeight: FONTS.black, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  guestSubtitle: { fontSize: FONTS.sm, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
  guestButtons: { padding: SPACING.base, gap: SPACING.sm },
  signInBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, padding: SPACING.base, gap: SPACING.base, ...SHADOWS.sm },
  signInIcon: { fontSize: 24 },
  signInText: { flex: 1, fontSize: FONTS.lg, fontWeight: FONTS.bold, color: 'white' },
  registerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.base, gap: SPACING.base, borderWidth: 2, borderColor: COLORS.primary, ...SHADOWS.sm },
  registerIcon: { fontSize: 24 },
  registerText: { flex: 1, fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.primary },
  sellerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1B4332', borderRadius: RADIUS.xl, padding: SPACING.base, gap: SPACING.base, ...SHADOWS.sm },
  sellerIcon: { fontSize: 24 },
  sellerTextWrap: { flex: 1 },
  sellerText: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: 'white' },
  sellerSub: { fontSize: FONTS.xs, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  sellerArrow: { fontSize: FONTS.xl, color: 'rgba(255,255,255,0.7)' },
  guestFeatures: { margin: SPACING.base, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.base },
  featuresTitle: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.textMuted, marginBottom: SPACING.sm },
  featureText: { fontSize: FONTS.sm, color: COLORS.textSecondary, paddingVertical: 4 },
});
