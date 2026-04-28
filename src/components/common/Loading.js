/**
 * VUMA Store — Loading Component
 * Various loading states
 */

import React from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../../utils/constants';

// ── Full Screen Loading ────────────────────────────────
export function FullScreenLoading({ message = 'Loading...' }) {
  return (
    <View style={styles.fullScreen}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      {message && (
        <Text style={styles.message}>{message}</Text>
      )}
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
      {message && (
        <Text style={styles.inlineMessage}>{message}</Text>
      )}
    </View>
  );
}

// ── Skeleton Card ──────────────────────────────────────
export function SkeletonCard({ style }) {
  return (
    <View style={[styles.skeletonCard, style]}>
      <View style={styles.skeletonImage} />
      <View style={styles.skeletonBody}>
        <View style={[styles.skeletonLine, { width: '80%' }]} />
        <View
          style={[
            styles.skeletonLine,
            { width: '50%', marginTop: 6 },
          ]}
        />
        <View
          style={[
            styles.skeletonLine,
            { width: '30%', marginTop: 6 },
          ]}
        />
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
      <View style={styles.skeletonAvatar} />
      <View style={styles.skeletonListBody}>
        <View style={[styles.skeletonLine, { width: '70%' }]} />
        <View
          style={[
            styles.skeletonLine,
            { width: '40%', marginTop: 6 },
          ]}
        />
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
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />
        {message ? (
          <Text style={styles.overlayMessage}>{message}</Text>
        ) : null}
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
      {message && (
        <Text style={styles.message}>{message}</Text>
      )}
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
    marginTop: SPACING.sm,
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
    borderRadius: 10,
    overflow: 'hidden',
  },
  skeletonImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: COLORS.skeleton,
  },
  skeletonBody: {
    padding: SPACING.sm,
  },
  skeletonLine: {
    height: 10,
    backgroundColor: COLORS.skeleton,
    borderRadius: RADIUS.sm,
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
    borderRadius: 16,
    padding: SPACING.xl,
    alignItems: 'center',
    minWidth: 120,
  },
  overlayMessage: {
    marginTop: SPACING.sm,
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

