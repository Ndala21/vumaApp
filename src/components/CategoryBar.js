/**
 * VUMA Store — Category Bar Component
 * Horizontal scrollable category wheel. Same props/handlers — visual rebuild only.
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

function CategoryBar({
  categories,
  activeCategory = '',
  onSelect,
  style,
}) {
  const scrollRef = useRef(null);

  if (!categories || categories.length === 0) return null;

  return (
    <View style={[styles.wrapper, style]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
      >
        {categories.map((cat) => {
          const isActive =
            activeCategory === cat.slug ||
            activeCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id || cat.slug}
              style={styles.item}
              onPress={() =>
                onSelect?.(
                  isActive ? '' : cat.slug || cat.id
                )
              }
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