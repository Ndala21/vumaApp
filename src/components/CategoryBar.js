/**
 * VUMA Store — Category Bar Component
 * Horizontal scrollable category wheel.
 *
 * Rebuilt after diagnostic evidence showed a genuine duplicate tap
 * event firing on the same category button roughly 1-2 seconds after
 * a real tap - specifically on "All" and "Others" (the first and last
 * items, i.e. the scroll boundaries). This points at the horizontal
 * ScrollView's overscroll/bounce-back behavior interacting with the
 * touch, rather than anything in the press-handling logic itself
 * (which was already confirmed correct via logging).
 *
 * Two changes: overscroll/bounce disabled entirely on both platforms,
 * and a defensive guard that ignores a second press on the same item
 * within 1 second of the first - a robust safety net regardless of
 * the exact native mechanism producing the duplicate.
 *
 */

import React, { memo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {
  COLORS,
  FONTS,
  RADIUS,
  SPACING,
  SHADOWS,
} from '../utils/constants';

const DUPLICATE_PRESS_GUARD_MS = 1000;

function CategoryBar({
  categories,
  activeCategory = '',
  onSelect,
  style,
}) {
  const scrollRef = useRef(null);
  const lastPressRef = useRef({ key: null, time: 0 });

  if (!categories || categories.length === 0) return null;

  return (
    <View style={[styles.wrapper, style]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        bounces={false}
        overScrollMode="never"
      >
        {categories.map((cat) => {
          const isActive =
            activeCategory === cat.slug ||
            activeCategory === cat.id;
          const itemKey = cat.id || cat.slug;
          return (
            <TouchableOpacity
              key={itemKey}
              style={styles.item}
              onPress={() => {
                const now = Date.now();
                if (
                  lastPressRef.current.key === itemKey &&
                  now - lastPressRef.current.time < DUPLICATE_PRESS_GUARD_MS
                ) {
                  return;
                }
                lastPressRef.current = { key: itemKey, time: now };
                const value = isActive ? '' : cat.slug || cat.id;
                onSelect?.(value);
              }}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.iconBubble,
                  isActive && styles.iconBubbleActive,
                ]}
              >
                <Text style={[styles.icon, isActive && styles.iconActive]}>{cat.icon}</Text>
              </View>

              <Text
                style={[
                  styles.label,
                  isActive && styles.labelActive,
                ]}
                numberOfLines={1}
              >
                {cat.label || cat.name}
              </Text>

              <View style={[styles.underline, isActive && styles.underlineActive]} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default memo(CategoryBar);

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  item: {
    alignItems: 'center',
    minWidth: 62,
    paddingHorizontal: SPACING.xs,
    position: 'relative',
  },
  iconBubble: {
    width: 54,
    height: 54,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 6,
  },
  iconBubbleActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    ...SHADOWS.primary,
  },
  icon: { fontSize: 23 },
  iconActive: { transform: [{ scale: 1.05 }] },
  label: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: FONTS.medium,
    textAlign: 'center',
  },
  labelActive: {
    color: COLORS.primary,
    fontWeight: FONTS.bold,
  },
  underline: {
    width: 16, height: 2.5, borderRadius: 2,
    backgroundColor: 'transparent', marginTop: 5,
  },
  underlineActive: { backgroundColor: COLORS.primary },
});