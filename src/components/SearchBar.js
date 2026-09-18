/**
 * VUMA Intelligent Search Bar — DIAGNOSTIC VERSION
 * Temporarily strips out the suggestions dropdown entirely (recent
 * searches, trending, live suggestions) to isolate whether that
 * feature is the cause of the reported shaking/dropped-keystroke
 * behavior. This is NOT the final version - once we know whether
 * this fixes it, we go back and fix the real component properly
 * (either rebuilding the dropdown more carefully, or ruling it out
 * and looking elsewhere).
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Keyboard, Platform,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/constants';
import { post } from '../api/client';

export default function SearchBar({
  onSearch,
  onFocus,
  placeholder = 'Search phones, clothes, food...',
  autoFocus = false,
  style,
}) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  const handleChangeText = useCallback((text) => {
    setQuery(text);
  }, []);

  const handleSubmit = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    Keyboard.dismiss();
    try { await post('/products/search/record/', { query: q }); } catch {}
    onSearch?.(q);
  }, [query, onSearch]);

  const handleFocus = useCallback(() => {
    setFocused(true);
    onFocus?.();
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    setFocused(false);
  }, []);

  const clearQuery = useCallback(() => {
    setQuery('');
    inputRef.current?.focus();
  }, []);

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={query}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={handleSubmit}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textLight}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={autoFocus}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={clearQuery} style={styles.clearBtn}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.searchBtn} onPress={handleSubmit} activeOpacity={0.85}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surfaceSunken,
    borderRadius: RADIUS.full,
    borderWidth: 1.5, borderColor: 'transparent',
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? SPACING.xs + 2 : 2,
    gap: SPACING.xs,
  },
  inputWrapFocused: { borderColor: COLORS.primary, backgroundColor: COLORS.surface, ...SHADOWS.sm },
  searchIcon: { fontSize: 15, opacity: 0.55 },
  input: { flex: 1, fontSize: FONTS.base, color: COLORS.textPrimary, paddingVertical: SPACING.sm },
  clearBtn: { padding: SPACING.xs },
  clearIcon: { fontSize: FONTS.sm, color: COLORS.textMuted, fontWeight: FONTS.bold },
  searchBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 3,
    ...SHADOWS.primary,
  },
  searchBtnText: { color: COLORS.textWhite, fontSize: FONTS.sm, fontWeight: FONTS.bold },
});