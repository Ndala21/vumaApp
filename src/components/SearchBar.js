/**
 * VUMA Intelligent Search Bar
 * Real-time suggestions, typo tolerance, Swahili/English synonyms
 * Like Amazon/Temu/Coupang
 */

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, Keyboard, Platform, ActivityIndicator,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/constants';
import { get, post } from '../api/client';

const RECENT_KEY = '@vuma_recent_searches';
const MAX_RECENT = 8;
const DEBOUNCE_MS = 300;

const SUGGESTION_ICONS = {
  product: '🛍️',
  category: '📂',
  trending: '🔥',
  popular: '⭐',
  recent: '🕒',
  correction: '✏️',
};

// ── Single Suggestion Row ─────────────────────────────
const SuggestionRow = memo(({ item, onPress, onFill }) => (
  <TouchableOpacity style={styles.suggRow} onPress={() => onPress(item.text)} activeOpacity={0.7}>
    <Text style={styles.suggIcon}>{SUGGESTION_ICONS[item.type] || '🔍'}</Text>
    <View style={styles.suggContent}>
      <Text style={styles.suggText} numberOfLines={1}>
        {item.did_you_mean && <Text style={styles.didYouMean}>Did you mean: </Text>}
        {item.text}
      </Text>
      {item.category ? <Text style={styles.suggCategory}>{item.category}</Text> : null}
    </View>
    {/* Fill icon — tap to fill search bar without submitting */}
    <TouchableOpacity onPress={() => onFill(item.text)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <Text style={styles.fillIcon}>↗</Text>
    </TouchableOpacity>
  </TouchableOpacity>
));

// ── Section Header ────────────────────────────────────
const SectionHeader = memo(({ title }) => (
  <Text style={styles.sectionHeader}>{title}</Text>
));

// ── Main SearchBar Component ──────────────────────────
export default function SearchBar({
  onSearch,
  onFocus,
  placeholder = 'Search phones, clothes, food...',
  autoFocus = false,
  style,
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const dropdownAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadRecent();
    loadTrending();
    if (autoFocus) setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const loadRecent = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_KEY);
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch {}
  };

  const saveRecent = async (searchQuery) => {
    try {
      const existing = await AsyncStorage.getItem(RECENT_KEY);
      let recent = existing ? JSON.parse(existing) : [];
      recent = [searchQuery, ...recent.filter(r => r.toLowerCase() !== searchQuery.toLowerCase())];
      recent = recent.slice(0, MAX_RECENT);
      await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(recent));
      setRecentSearches(recent);
    } catch {}
  };

  const clearRecent = async () => {
    await AsyncStorage.removeItem(RECENT_KEY);
    setRecentSearches([]);
  };

  const loadTrending = async () => {
    try {
      const data = await get('/products/search/trending/', { limit: 8 });
      setTrending(data?.trending || []);
    } catch {}
  };

  const showDropdown = useCallback((show) => {
    Animated.timing(dropdownAnim, {
      toValue: show ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, []);

  const fetchSuggestions = useCallback(async (text) => {
    if (!text || text.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await get('/products/search/suggestions/', { q: text, limit: 10 });
      setSuggestions(data?.suggestions || []);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChangeText = useCallback((text) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length >= 2) {
      debounceRef.current = setTimeout(() => fetchSuggestions(text), DEBOUNCE_MS);
    } else {
      setSuggestions([]);
      setLoading(false);
    }
  }, [fetchSuggestions]);

  const handleSubmit = useCallback(async (searchQuery = query) => {
    const q = searchQuery.trim();
    if (!q) return;
    Keyboard.dismiss();
    setFocused(false);
    showDropdown(false);
    await saveRecent(q);
    try { await post('/products/search/record/', { query: q }); } catch {}
    onSearch?.(q);
  }, [query, onSearch]);

  const handleFillQuery = useCallback((text) => {
    setQuery(text);
    inputRef.current?.focus();
    fetchSuggestions(text);
  }, [fetchSuggestions]);

  const handleFocus = useCallback(() => {
    setFocused(true);
    showDropdown(true);
    onFocus?.();
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    // Delay to allow suggestion tap
    setTimeout(() => {
      setFocused(false);
      showDropdown(false);
    }, 150);
  }, []);

  const clearQuery = useCallback(() => {
    setQuery('');
    setSuggestions([]);
    inputRef.current?.focus();
  }, []);

  // Build dropdown content
  const dropdownItems = [];

  if (query.length >= 2 && suggestions.length > 0) {
    // Correction first
    const corrections = suggestions.filter(s => s.type === 'correction');
    const rest = suggestions.filter(s => s.type !== 'correction');
    if (corrections.length > 0) {
      dropdownItems.push({ key: 'h_correction', type: 'header', title: '💡 Did you mean?' });
      corrections.forEach((s, i) => dropdownItems.push({ ...s, key: `corr_${i}` }));
    }
    if (rest.length > 0) {
      dropdownItems.push({ key: 'h_suggestions', type: 'header', title: '🔍 Suggestions' });
      rest.forEach((s, i) => dropdownItems.push({ ...s, key: `sugg_${i}` }));
    }
  } else {
    // Recent searches
    if (recentSearches.length > 0) {
      dropdownItems.push({ key: 'h_recent', type: 'header', title: '🕒 Recent Searches', showClear: true });
      recentSearches.slice(0, 5).forEach((r, i) => dropdownItems.push({ key: `rec_${i}`, text: r, type: 'recent', icon: '🕒', category: '' }));
    }
    // Trending
    if (trending.length > 0) {
      dropdownItems.push({ key: 'h_trending', type: 'header', title: '🔥 Trending in Tanzania' });
      trending.slice(0, 6).forEach((t, i) => dropdownItems.push({ ...t, key: `trend_${i}` }));
    }
  }

  const showDropdownContent = focused && dropdownItems.length > 0;

  return (
    <View style={[styles.container, style]}>
      {/* Search Input */}
      <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={query}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={() => handleSubmit()}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textLight}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="never"
        />
        {loading && <ActivityIndicator size="small" color={COLORS.primary} style={styles.loader} />}
        {!loading && query.length > 0 && (
          <TouchableOpacity onPress={clearQuery} style={styles.clearBtn}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.searchBtn} onPress={() => handleSubmit()}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Dropdown */}
      {showDropdownContent && (
        <Animated.View style={[styles.dropdown, { opacity: dropdownAnim, transform: [{ translateY: dropdownAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }] }]}>
          <FlatList
            data={dropdownItems}
            keyExtractor={item => item.key}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              if (item.type === 'header') {
                return (
                  <View style={styles.headerRow}>
                    <Text style={styles.sectionHeader}>{item.title}</Text>
                    {item.showClear && (
                      <TouchableOpacity onPress={clearRecent}>
                        <Text style={styles.clearRecent}>Clear</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }
              return (
                <SuggestionRow
                  item={item}
                  onPress={handleSubmit}
                  onFill={handleFillQuery}
                />
              );
            }}
            style={styles.dropdownList}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative', zIndex: 100 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: SPACING.sm, paddingVertical: Platform.OS === 'ios' ? SPACING.sm : 2, gap: SPACING.xs, ...SHADOWS.sm },
  inputWrapFocused: { borderColor: COLORS.primary, ...SHADOWS.md },
  searchIcon: { fontSize: 16 },
  input: { flex: 1, fontSize: FONTS.base, color: COLORS.textPrimary, paddingVertical: SPACING.sm },
  loader: { marginRight: SPACING.xs },
  clearBtn: { padding: SPACING.xs },
  clearIcon: { fontSize: FONTS.sm, color: COLORS.textMuted, fontWeight: FONTS.bold },
  searchBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.base, paddingVertical: SPACING.xs + 2 },
  searchBtnText: { color: 'white', fontSize: FONTS.sm, fontWeight: FONTS.bold },
  dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, marginTop: SPACING.xs, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.lg, maxHeight: 420, zIndex: 999 },
  dropdownList: { borderRadius: RADIUS.xl, overflow: 'hidden' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.base, paddingTop: SPACING.sm, paddingBottom: SPACING.xs },
  sectionHeader: { fontSize: FONTS.xs, fontWeight: FONTS.bold, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  clearRecent: { fontSize: FONTS.xs, color: COLORS.primary, fontWeight: FONTS.semiBold },
  suggRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 2, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, gap: SPACING.sm },
  suggIcon: { fontSize: 18, width: 24 },
  suggContent: { flex: 1 },
  suggText: { fontSize: FONTS.base, color: COLORS.textPrimary, fontWeight: FONTS.medium },
  didYouMean: { fontSize: FONTS.sm, color: COLORS.textMuted, fontWeight: FONTS.regular },
  suggCategory: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 1 },
  fillIcon: { fontSize: FONTS.base, color: COLORS.textMuted, fontWeight: FONTS.bold, padding: SPACING.xs },
});