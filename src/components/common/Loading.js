/**
 * VUMA Store — Loading Component
 * Various loading states. Same exports/props as before — visual rebuild
 * plus a subtle shimmer pulse on skeletons (additive, no API change).
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../utils/constants';

// ── Shimmer wrapper — subtle pulse, no new deps ───────
function Shimmer({ style }) {
  const pulse = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return <Animated.View style={[style, { opacity: pulse }]} />;
}

// ── Full Screen Loading ────────────────────────────────
export function FullScreenLoading({ message = 'Loading...' }) {
  return (
    <View style={styles.fullScreen}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

// ── Inline Loading ─────────────────────────────────────
export function InlineLoading({
  message = '',
  size = 'small',
  color = COLORS.primary,
}) {
  return (
    <View style={styles.inline}>
      <ActivityIndicator size={size} color={color} />
      {message && <Text style={styles.inlineMessage}>{message}</Text>}
    </View>
  );
}

// ── Skeleton Card ──────────────────────────────────────
export function SkeletonCard({ style }) {
  return (
    <View style={[styles.skeletonCard, style]}>
      <Shimmer style={styles.skeletonImage} />
      <View style={styles.skeletonBody}>
        <Shimmer style={[styles.skeletonLine, { width: '80%' }]} />
        <Shimmer style={[styles.skeletonLine, { width: '50%', marginTop: 7 }]} />
        <Shimmer style={[styles.skeletonLine, { width: '30%', marginTop: 7 }]} />
      </View>
    </View>
  );
}

// ── Skeleton Product Grid ──────────────────────────────
export function SkeletonProductGrid({ count = 6 }) {
  return (
    <View style={styles.skeletonGrid}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} style={styles.skeletonGridItem} />
      ))}
    </View>
  );
}

// ── Skeleton List Item ─────────────────────────────────
export function SkeletonListItem() {
  return (
    <View style={styles.skeletonListItem}>
      <Shimmer style={styles.skeletonAvatar} />
      <View style={styles.skeletonListBody}>
        <Shimmer style={[styles.skeletonLine, { width: '70%' }]} />
        <Shimmer style={[styles.skeletonLine, { width: '40%', marginTop: 7 }]} />
      </View>
    </View>
  );
}

// ── Overlay Loading ────────────────────────────────────
export function OverlayLoading({ visible, message = '' }) {
  if (!visible) return null;
  return (
    <View style={styles.overlay}>
      <View style={styles.overlayCard}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        {message ? <Text style={styles.overlayMessage}>{message}</Text> : null}
      </View>
    </View>
  );
}

// ── Default export ─────────────────────────────────────
export default function Loading({
  fullScreen = false,
  message,
  size = 'large',
  color = COLORS.primary,
}) {
  if (fullScreen) {
    return <FullScreenLoading message={message} />;
  }
  return (
    <View style={styles.center}>
      <ActivityIndicator size={size} color={color} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  message: {
    marginTop: SPACING.md,
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
  },
  inlineMessage: {
    marginLeft: SPACING.sm,
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
  },
  // Skeleton
  skeletonCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  skeletonImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: COLORS.skeleton,
  },
  skeletonBody: {
    padding: SPACING.md,
  },
  skeletonLine: {
    height: 10,
    backgroundColor: COLORS.skeleton,
    borderRadius: RADIUS.xs,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: SPACING.sm,
    gap: SPACING.sm,
  },
  skeletonGridItem: {
    width: '48%',
  },
  skeletonListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.base,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  skeletonAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.skeleton,
    marginRight: SPACING.md,
  },
  skeletonListBody: {
    flex: 1,
  },
  // Overlay
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  overlayCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    minWidth: 130,
    ...SHADOWS.lg,
  },
  overlayMessage: {
    marginTop: SPACING.md,
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});