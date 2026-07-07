/**
 * VUMA Store — Category Bar Component
 * Horizontal scrollable category icons like Coupang
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
              {/* Icon bubble */}
              <View
                style={[
                  styles.iconBubble,
                  isActive && styles.iconBubbleActive,
                ]}
              >
                <Text style={styles.icon}>{cat.icon}</Text>
              </View>

              {/* Label */}
              <Text
                style={[
                  styles.label,
                  isActive && styles.labelActive,
                ]}
                numberOfLines={1}
              >
                {cat.label || cat.name}
              </Text>

              {/* Active dot */}
              {isActive && <View style={styles.activeDot} />}
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
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  item: {
    alignItems: 'center',
    minWidth: 64,
    paddingHorizontal: SPACING.xs,
    position: 'relative',
  },
  iconBubble: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primaryFade,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
    marginBottom: 4,
  },
  iconBubbleActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
  },
  icon: {
    fontSize: 24,
  },
  label: {
    fontSize: FONTS.xs,
    color: COLORS.textSecondary,
    fontWeight: FONTS.medium,
    textAlign: 'center',
  },
  labelActive: {
    color: COLORS.primary,
    fontWeight: FONTS.bold,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    marginTop: 3,
  },
});
