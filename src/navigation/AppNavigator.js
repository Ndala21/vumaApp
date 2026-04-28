/**
 * VUMA Store — App Navigator
 * Fixed: Added VendorApply screen to MainStack
 */

import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';

import { initializeAuth, forceLogout } from '../store/authSlice';
import { loadCart, loadWishlist } from '../store/cartSlice';
import { fetchNotificationCount } from '../store/notificationSlice';
import { storage } from '../utils/storage';
import { COLORS } from '../utils/constants';

import AuthNavigator from './AuthNavigator';
import TabNavigator from './TabNavigator';
import VendorNavigator from './VendorNavigator';

import ProductDetailScreen from '../screens/product/ProductDetailScreen';
import OrderDetailScreen from '../screens/order/OrderDetailScreen';
import CheckoutScreen from '../screens/payment/CheckoutScreen';
import WalletScreen from '../screens/payment/WalletScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import ChatScreen from '../screens/chat/ChatScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import VendorApplyScreen from '../screens/vendor/VendorApplyScreen';

const Stack = createNativeStackNavigator();

function SplashScreen() {
  return (
    <View style={styles.splash}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}

function MainStack({ isVendor }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="Tabs"
        component={isVendor ? VendorNavigator : TabNavigator}
      />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
      />
      <Stack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="Wallet"
        component={WalletScreen}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
      />
      {/* ← FIXED: VendorApply now inside MainStack */}
      <Stack.Screen
        name="VendorApply"
        component={VendorApplyScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const dispatch = useDispatch();

  const isAuthenticated = useSelector((state) => state.auth?.isAuthenticated ?? false);
  const isInitialized = useSelector((state) => state.auth?.isInitialized ?? false);
  const isApprovedVendor = useSelector((state) =>
    state.auth?.user?.role === 'vendor' && state.auth?.user?.vendor_status === 'approved'
  );
  const isVendor = useSelector((state) => state.auth?.user?.role === 'vendor');

  const sessionCheckRef = useRef(null);

  useEffect(() => {
    dispatch(initializeAuth());
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(loadCart());
      dispatch(loadWishlist());
      dispatch(fetchNotificationCount());
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      dispatch(fetchNotificationCount());
    }, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    sessionCheckRef.current = setInterval(async () => {
      try {
        const expired = await storage.get('@vuma_session_expired');
        if (expired === 'true') {
          await storage.remove('@vuma_session_expired');
          dispatch(forceLogout());
        }
      } catch {}
    }, 3000);
    return () => {
      if (sessionCheckRef.current) clearInterval(sessionCheckRef.current);
    };
  }, []);

  if (!isInitialized) return <SplashScreen />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} options={{ animation: 'fade' }} />
        ) : (
          <Stack.Screen name="Main" options={{ animation: 'fade' }}>
            {() => <MainStack isVendor={isApprovedVendor || isVendor} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center',
  },
});