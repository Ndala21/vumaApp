/**
 * VUMA Store — Tab Navigator
 * Bottom tab navigation for customers
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { SCREENS, COLORS, FONTS } from '../utils/constants';
import { selectCartItemCount } from '../store/cartSlice';
import { selectUnreadCount } from '../store/notificationSlice';

import HomeScreen from '../screens/home/HomeScreen';
import ProductListScreen from '../screens/product/ProductListScreen';
import CartScreen from '../screens/cart/CartScreen';
import OrderScreen from '../screens/order/OrderScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator();

// ─── Tab Icon ──────────────────────────────────────────
function TabIcon({ icon, label, focused, badgeCount = 0 }) {
  return (
    <View style={styles.tabItem}>
      <View style={styles.iconWrap}>
        <Text
          style={[
            styles.tabIcon,
            focused && styles.tabIconActive,
          ]}
        >
          {icon}
        </Text>
        {badgeCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {badgeCount > 99 ? '99+' : badgeCount}
            </Text>
          </View>
        )}
      </View>
      <Text
        style={[
          styles.tabLabel,
          focused && styles.tabLabelActive,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabNavigator() {
  const cartCount = useSelector(selectCartItemCount);
  const unreadCount = useSelector(selectUnreadCount);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarHideOnKeyboard: true,
      }}
    >
      {/* Home */}
      <Tab.Screen
        name={SCREENS.HOME}
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon="🏠"
              label="Home"
              focused={focused}
            />
          ),
        }}
      />

      {/* Search */}
      <Tab.Screen
        name={SCREENS.SEARCH}
        component={ProductListScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon="🔍"
              label="Search"
              focused={focused}
            />
          ),
        }}
      />

      {/* Cart */}
      <Tab.Screen
        name={SCREENS.CART}
        component={CartScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon="🛒"
              label="Cart"
              focused={focused}
              badgeCount={cartCount}
            />
          ),
        }}
      />

      {/* Orders */}
      <Tab.Screen
        name={SCREENS.ORDERS}
        component={OrderScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon="📦"
              label="Orders"
              focused={focused}
            />
          ),
        }}
      />

      {/* Profile */}
      <Tab.Screen
        name={SCREENS.PROFILE}
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon="👤"
              label="Profile"
              focused={focused}
              badgeCount={unreadCount}
            />
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
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: Platform.OS === 'ios' ? 20 : 4,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  iconWrap: {
    position: 'relative',
  },
  tabIcon: {
    fontSize: 22,
    opacity: 0.5,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: FONTS.xs,
    marginTop: 2,
    color: COLORS.tabInactive,
    fontWeight: FONTS.medium,
  },
  tabLabelActive: {
    color: COLORS.tabActive,
    fontWeight: FONTS.bold,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: COLORS.surface,
  },
  badgeText: {
    color: COLORS.textWhite,
    fontSize: 9,
    fontWeight: FONTS.bold,
  },
});
