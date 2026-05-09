/**
 * VUMA Store — Vendor Navigator
 * Bottom tab navigation for approved vendors
 * Fixed: Added Home, Search, Cart tabs so vendors can browse store
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SCREENS, COLORS, FONTS } from '../utils/constants';

import VendorDashboard from '../screens/vendor/VendorDashboard';
import VendorProducts from '../screens/vendor/VendorProducts';
import VendorOrders from '../screens/vendor/VendorOrders';
import ProfileScreen from '../screens/profile/ProfileScreen';
import HomeScreen from '../screens/home/HomeScreen';
import CartScreen from '../screens/cart/CartScreen';

const Tab = createBottomTabNavigator();

function VendorTabIcon({ icon, label, focused }) {
  return (
    <View style={styles.tabItem}>
      <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>{icon}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

export default function VendorNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarHideOnKeyboard: true,
      }}
    >
      {/* Store tabs - vendors can browse */}
      <Tab.Screen
        name={SCREENS.HOME}
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <VendorTabIcon icon="🏠" label="Home" focused={focused} />
          ),
        }}
      />

      <Tab.Screen
        name={SCREENS.CART}
        component={CartScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <VendorTabIcon icon="🛒" label="Cart" focused={focused} />
          ),
        }}
      />

      {/* Vendor tabs */}
      <Tab.Screen
        name={SCREENS.VENDOR_DASHBOARD}
        component={VendorDashboard}
        options={{
          tabBarIcon: ({ focused }) => (
            <VendorTabIcon icon="📊" label="Dashboard" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name={SCREENS.VENDOR_PRODUCTS}
        component={VendorProducts}
        options={{
          tabBarIcon: ({ focused }) => (
            <VendorTabIcon icon="📦" label="Products" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name={SCREENS.VENDOR_ORDERS}
        component={VendorOrders}
        options={{
          tabBarIcon: ({ focused }) => (
            <VendorTabIcon icon="📋" label="Orders" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name={SCREENS.PROFILE}
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <VendorTabIcon icon="👤" label="Profile" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 80 : 64,
    backgroundColor: COLORS.secondary,
    borderTopWidth: 0,
    paddingBottom: Platform.OS === 'ios' ? 20 : 4,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.5,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 9,
    marginTop: 2,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: FONTS.medium,
  },
  tabLabelActive: {
    color: COLORS.primary,
    fontWeight: FONTS.bold,
  },
});