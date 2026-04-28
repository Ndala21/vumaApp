/**
 * VUMA Store — Auth Navigator
 * Onboarding, Login, Register screens
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SCREENS, COLORS } from '../utils/constants';

import OnboardingScreen from '../screens/auth/OnboardingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name={SCREENS.ONBOARDING}
        component={OnboardingScreen}
      />
      <Stack.Screen
        name={SCREENS.LOGIN}
        component={LoginScreen}
      />
      <Stack.Screen
        name={SCREENS.REGISTER}
        component={RegisterScreen}
      />
    </Stack.Navigator>
  );
}