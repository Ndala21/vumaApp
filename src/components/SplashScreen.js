/**
 * VUMA Store — Branded Splash Screen
 *
 * Shown briefly on launch (while i18n initializes) instead of a blank
 * white flash, then fades smoothly into the app. Matches the new
 * app icon/native splash.png design: white background, centered
 * real VUMA logo (extracted from the official reference artwork,
 * not re-rendered text), gentle orange wave along the bottom.
 *
 * No login gate here - this is purely a branding screen. The app
 * still goes straight to the existing Home/product screen once ready,
 * exactly as before.
 *
 * Uses only built-in React Native <Image> - no new dependency like
 * react-native-svg is required, since that isn't confirmed to be
 * installed in this project.
 */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Image } from 'react-native';

export default function SplashScreen({ onFinish, ready, minDurationMs = 900 }) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const mountedAt = useRef(Date.now());

  useEffect(() => {
    if (!ready) return; // stays fully visible until the real app is actually ready
    const elapsed = Date.now() - mountedAt.current;
    const remaining = Math.max(0, minDurationMs - elapsed);
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start(() => {
        if (onFinish) onFinish();
      });
    }, remaining);
    return () => clearTimeout(timer);
  }, [ready, fadeAnim, minDurationMs, onFinish]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.centerBlock}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <Image
        source={require('../../assets/wave.png')}
        style={styles.wave}
        resizeMode="stretch"
        pointerEvents="none"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  centerBlock: {
    alignItems: 'center',
  },
  logo: {
    width: 220,
    height: 74,
  },
  wave: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: '16%',
  },
});