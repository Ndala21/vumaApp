/**
 * VUMA Store — Onboarding Screen
 * First-time user experience with language selection
 */

import React, { useState, useRef } from 'react';
import { t } from '../../i18n';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  Animated,
  StatusBar,
  Platform,
} from 'react-native';
import { useDispatch } from 'react-redux';
import {
  COLORS,
  FONTS,
  SPACING,
  RADIUS,
  SCREENS,
  LANGUAGES,
} from '../../utils/constants';
import { storage } from '../../utils/storage';

const { width, height } = Dimensions.get('window');

// ─── Onboarding Slides ─────────────────────────────────
const SLIDES = [
  {
    id: '1',
    emoji: '🛍️',
    title: 'Welcome to VUMA',
    subtitle:
      'Smart shopping. Fast delivery.\nBest prices in Africa & Asia.',
    bg: COLORS.primary,
    textColor: COLORS.textWhite,
  },
  {
    id: '2',
    emoji: '🚚',
    title: 'Fast Delivery',
    subtitle:
      'Get your orders delivered quickly\nwherever you are.',
    bg: COLORS.secondary,
    textColor: COLORS.textWhite,
  },
  {
    id: '3',
    emoji: '🏪',
    title: 'Multi-Vendor Marketplace',
    subtitle:
      'Thousands of verified vendors.\nMillions of products.',
    bg: '#1e3a5f',
    textColor: COLORS.textWhite,
  },
  {
    id: '4',
    emoji: '💳',
    title: 'Secure Payments',
    subtitle:
      'Pay with Card, M-Pesa, Wallet\nand more. Always secure.',
    bg: COLORS.surface,
    textColor: COLORS.textPrimary,
    dark: false,
  },
];

export default function OnboardingScreen({ navigation }) {
  const dispatch = useDispatch();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLang, setSelectedLang] = useState('en');
  const [showLangPicker, setShowLangPicker] = useState(false);
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const currentSlide = SLIDES[currentIndex];
  const isLastSlide = currentIndex === SLIDES.length - 1;

  // ── Handlers ───────────────────────────────────────

  const handleNext = () => {
    if (isLastSlide) {
      handleGetStarted();
      return;
    }
    const nextIndex = currentIndex + 1;
    flatListRef.current?.scrollToIndex({ index: nextIndex });
    setCurrentIndex(nextIndex);
  };

  const handleSkip = () => {
    handleGetStarted();
  };

  const handleGetStarted = async () => {
    await storage.setOnboarded();
    await storage.setLanguage(selectedLang);
    navigation.replace(SCREENS.LOGIN);
  };

  const handleLangSelect = async (code) => {
    setSelectedLang(code);
    await storage.setLanguage(code);
    setShowLangPicker(false);
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (e) => {
        const index = Math.round(
          e.nativeEvent.contentOffset.x / width
        );
        setCurrentIndex(index);
      },
    }
  );

  // ── Dot Indicator ──────────────────────────────────

  const renderDots = () => (
    <View style={styles.dotsRow}>
      {SLIDES.map((_, i) => {
        const inputRange = [
          (i - 1) * width,
          i * width,
          (i + 1) * width,
        ];
        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [8, 20, 8],
          extrapolate: 'clamp',
        });
        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.4, 1, 0.4],
          extrapolate: 'clamp',
        });
        return (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                width: dotWidth,
                opacity,
                backgroundColor:
                  currentSlide.textColor ||
                  COLORS.textWhite,
              },
            ]}
          />
        );
      })}
    </View>
  );

  // ── Slide Item ─────────────────────────────────────

  const renderSlide = ({ item }) => (
    <View
      style={[
        styles.slide,
        { backgroundColor: item.bg },
      ]}
    >
      <Text style={styles.slideEmoji}>{item.emoji}</Text>
      <Text
        style={[
          styles.slideTitle,
          { color: item.textColor },
        ]}
      >
        {item.title}
      </Text>
      <Text
        style={[
          styles.slideSubtitle,
          {
            color: item.textColor,
            opacity: 0.85,
          },
        ]}
      >
        {item.subtitle}
      </Text>
    </View>
  );

  // ── Language Picker ────────────────────────────────

  const renderLangPicker = () => (
    <View style={styles.langPickerOverlay}>
      <View style={styles.langPickerCard}>
        <Text style={styles.langPickerTitle}>
          🌍 Select Language
        </Text>
        {LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[
              styles.langOption,
              selectedLang === lang.code &&
                styles.langOptionActive,
            ]}
            onPress={() => handleLangSelect(lang.code)}
          >
            <Text style={styles.langFlag}>{lang.flag}</Text>
            <Text
              style={[
                styles.langName,
                selectedLang === lang.code &&
                  styles.langNameActive,
              ]}
            >
              {lang.name}
            </Text>
            {selectedLang === lang.code && (
              <Text style={styles.langCheck}>✓</Text>
            )}
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={styles.langCloseBtn}
          onPress={() => setShowLangPicker(false)}
        >
          <Text style={styles.langCloseBtnText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Render ─────────────────────────────────────────

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: currentSlide.bg },
      ]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Skip button */}
      {!isLastSlide && (
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={handleSkip}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Language button */}
      <TouchableOpacity
        style={styles.langBtn}
        onPress={() => setShowLangPicker(true)}
      >
        <Text style={styles.langBtnText}>
          {LANGUAGES.find((l) => l.code === selectedLang)
            ?.flag || '🌍'}{' '}
          {selectedLang.toUpperCase()}
        </Text>
      </TouchableOpacity>

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.slideList}
      />

      {/* Bottom controls */}
      <View style={styles.bottomControls}>
        {renderDots()}

        {/* Next / Get Started button */}
        <TouchableOpacity
          style={styles.nextBtn}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.nextBtnText}>
            {isLastSlide ? '🚀 Get Started' : 'Next →'}
          </Text>
        </TouchableOpacity>

        {/* Login link */}
        <TouchableOpacity
          style={styles.loginLink}
          onPress={() =>
            navigation.navigate(SCREENS.LOGIN)
          }
        >
          <Text style={styles.loginLinkText}>
            Already have an account?{' '}
            <Text style={styles.loginLinkBold}>Login</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Language picker modal */}
      {showLangPicker && renderLangPicker()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 40,
    left: SPACING.base,
    zIndex: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.full,
  },
  skipText: {
    color: COLORS.textWhite,
    fontSize: FONTS.sm,
    fontWeight: FONTS.semiBold,
  },
  langBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 40,
    right: SPACING.base,
    zIndex: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  langBtnText: {
    color: COLORS.textWhite,
    fontSize: FONTS.sm,
    fontWeight: FONTS.semiBold,
  },
  slideList: {
    flex: 1,
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING['2xl'],
    paddingTop: 80,
  },
  slideEmoji: {
    fontSize: 100,
    marginBottom: SPACING.xl,
  },
  slideTitle: {
    fontSize: FONTS['4xl'],
    fontWeight: FONTS.black,
    textAlign: 'center',
    marginBottom: SPACING.base,
    letterSpacing: -1,
  },
  slideSubtitle: {
    fontSize: FONTS.lg,
    textAlign: 'center',
    lineHeight: 26,
  },
  bottomControls: {
    paddingHorizontal: SPACING.xl,
    paddingBottom:
      Platform.OS === 'ios' ? SPACING['3xl'] : SPACING.xl,
    paddingTop: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.base,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  dot: {
    height: 8,
    borderRadius: RADIUS.full,
  },
  nextBtn: {
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.base,
    paddingHorizontal: SPACING['2xl'],
    borderRadius: RADIUS.full,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  nextBtnText: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
    color: COLORS.primary,
  },
  loginLink: {
    paddingVertical: SPACING.xs,
  },
  loginLinkText: {
    fontSize: FONTS.sm,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  loginLinkBold: {
    fontWeight: FONTS.bold,
    color: COLORS.textWhite,
    textDecorationLine: 'underline',
  },
  // Language picker
  langPickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  langPickerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    width: width * 0.85,
    maxWidth: 360,
  },
  langPickerTitle: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.base,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.xs,
    gap: SPACING.md,
  },
  langOptionActive: {
    backgroundColor: COLORS.primaryFade,
  },
  langFlag: {
    fontSize: 24,
  },
  langName: {
    flex: 1,
    fontSize: FONTS.base,
    color: COLORS.textSecondary,
    fontWeight: FONTS.medium,
  },
  langNameActive: {
    color: COLORS.primary,
    fontWeight: FONTS.bold,
  },
  langCheck: {
    fontSize: FONTS.base,
    color: COLORS.primary,
    fontWeight: FONTS.bold,
  },
  langCloseBtn: {
    marginTop: SPACING.sm,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  langCloseBtnText: {
    fontSize: FONTS.base,
    color: COLORS.textMuted,
    fontWeight: FONTS.semiBold,
  },
});
