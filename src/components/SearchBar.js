/**
 * VUMA Store — Search Bar Component
 * Sticky top search bar like Coupang/Temu
 */

import React, { memo, useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING, SHADOWS } from '../utils/constants';
import { storage } from '../utils/storage';

function SearchBar({
  value = '',
  onChangeText,
  onSubmit,
  onFocus,
  onBlur,
  onClear,
  placeholder = 'Search products...',
  showHistory = true,
  autoFocus = false,
  showCart = false,
  cartCount = 0,
  onCartPress,
  showNotification = false,
  notificationCount = 0,
  onNotificationPress,
  style,
  containerStyle,
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [history, setHistory] = useState([]);
  const inputRef = useRef(null);
  const focusAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = async () => {
    setIsFocused(true);
    onFocus?.();
    Animated.timing(focusAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
    if (showHistory) {
      const h = await storage.getSearchHistory();
      setHistory(h || []);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
    Animated.timing(focusAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const handleSubmit = async () => {
    if (!value.trim()) return;
    await storage.addToSearchHistory(value.trim());
    onSubmit?.(value.trim());
    inputRef.current?.blur();
  };

  const handleHistorySelect = (query) => {
    onChangeText?.(query);
    onSubmit?.(query);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    onChangeText?.('');
    onClear?.();
    inputRef.current?.focus();
  };

  const handleClearHistory = async () => {
    await storage.clearSearchHistory();
    setHistory([]);
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.border, COLORS.primary],
  });

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <View style={[styles.row, style]}>
        <Animated.View style={[styles.inputWrap, { borderColor }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={COLORS.textLight}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus={autoFocus}
            style={styles.input}
          />
          {value.length > 0 && (
            <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {isFocused ? (
          <TouchableOpacity onPress={() => { inputRef.current?.blur(); onClear?.(); }} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.rightIcons}>
            {showNotification && (
              <TouchableOpacity onPress={onNotificationPress} style={styles.iconBtn}>
                <Text style={styles.actionIcon}>🔔</Text>
                {notificationCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{notificationCount > 99 ? '99+' : notificationCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            {showCart && (
              <TouchableOpacity onPress={onCartPress} style={styles.iconBtn}>
                <Text style={styles.actionIcon}>🛒</Text>
                {cartCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {isFocused && showHistory && history.length > 0 && !value && (
        <View style={styles.historyDropdown}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>🕐 Recent Searches</Text>
            <TouchableOpacity onPress={handleClearHistory}>
              <Text style={styles.historyClear}>Clear</Text>
            </TouchableOpacity>
          </View>
          {history.slice(0, 8).map((query, index) => (
            <TouchableOpacity key={index} style={styles.historyItem} onPress={() => handleHistorySelect(query)}>
              <Text style={styles.historyIcon}>🔍</Text>
              <Text style={styles.historyText} numberOfLines={1}>{query}</Text>
              <TouchableOpacity
                onPress={async () => {
                  const updated = history.filter((_, i) => i !== index);
                  setHistory(updated);
                  await storage.setWishlist(updated);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.historyRemove}>✕</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export default memo(SearchBar);

const styles = StyleSheet.create({
  wrapper: { backgroundColor: COLORS.surface, zIndex: 100 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.full,
    borderWidth: 1.5, paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm, gap: SPACING.xs,
  },
  searchIcon: { fontSize: FONTS.base },
  input: { flex: 1, fontSize: FONTS.base, color: COLORS.textPrimary, padding: 0, margin: 0 },
  clearIcon: { fontSize: FONTS.sm, color: COLORS.textMuted, fontWeight: FONTS.bold },
  cancelBtn: { paddingHorizontal: SPACING.xs },
  cancelText: { fontSize: FONTS.base, color: COLORS.primary, fontWeight: FONTS.semiBold },
  rightIcons: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  iconBtn: { position: 'relative', padding: SPACING.xs },
  actionIcon: { fontSize: 22 },
  badge: {
    position: 'absolute', top: 0, right: 0, backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full, minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2,
    borderWidth: 1.5, borderColor: COLORS.surface,
  },
  badgeText: { color: COLORS.textWhite, fontSize: 8, fontWeight: FONTS.bold },
  historyDropdown: { backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.divider, ...SHADOWS.md },
  historyHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.divider,
  },
  historyTitle: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.textSecondary },
  historyClear: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.semiBold },
  historyItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, gap: SPACING.sm,
  },
  historyIcon: { fontSize: FONTS.sm, opacity: 0.5 },
  historyText: { flex: 1, fontSize: FONTS.base, color: COLORS.textSecondary },
  historyRemove: { fontSize: FONTS.xs, color: COLORS.textMuted, padding: SPACING.xs },
});
