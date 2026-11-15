/**
 * VUMA Store - sign-up banner for guests, above the tab bar.
 *
 * People install the app, look around and leave without an account. This banner tells them what an account gives
 * (a link to share and rewards in the wallet) and sends them to the sign-up screen.
 * It names the exact amount one invite pays (read from the server, so it follows the console); until the amount is
 * known, or when none is running, it uses general words with no amount.
 * Arabic: the app already flips rows for right-to-left, so nothing here is mirrored by hand.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Keyboard, Platform, AccessibilityInfo } from 'react-native';
import { COLORS, FONTS } from '../utils/constants';
import { useTranslation } from '../i18n';
import { guestRewardText } from '../i18n/guestReward';
import { hideForADay, readHiddenUntil, shouldShowBanner } from '../utils/guestBanner';
import { loadOffer } from '../utils/referralOffer';

export const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 80 : 64;

export default function GuestRewardBanner({ isAuthenticated, tab, onSignUp, onSignIn }) {
  const { t, locale } = useTranslation();
  const [offer, setOffer] = useState(null);                 // what one invite pays (null until known)
  const words = guestRewardText(locale, offer);
  const [hiddenUntil, setHiddenUntil] = useState(null);   // null until the saved choice is read
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const slide = useRef(new Animated.Value(0)).current;
  const shown = useRef(false);

  useEffect(() => {
    let alive = true;
    readHiddenUntil().then((v) => { if (alive) setHiddenUntil(v); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (isAuthenticated) return undefined;                  // only people without an account need the number
    let alive = true;
    loadOffer((o) => { if (alive) setOffer(o); });
    return () => { alive = false; };
  }, [isAuthenticated]);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const a = Keyboard.addListener(showEvt, () => setKeyboardOpen(true));
    const b = Keyboard.addListener(hideEvt, () => setKeyboardOpen(false));
    return () => { a.remove(); b.remove(); };
  }, []);

  const visible = hiddenUntil !== null && shouldShowBanner({ isAuthenticated, hiddenUntil, tab, keyboardOpen });

  // It slides up once, a moment after the screen has settled. If the phone asks for less motion it just appears.
  useEffect(() => {
    if (!visible || shown.current) return undefined;
    shown.current = true;
    let timer;
    let alive = true;
    const run = (reduce) => {
      if (!alive) return;
      if (reduce) { slide.setValue(1); return; }
      timer = setTimeout(() => {
        Animated.timing(slide, { toValue: 1, duration: 320, useNativeDriver: true }).start();
      }, 900);
    };
    try {
      AccessibilityInfo.isReduceMotionEnabled().then(run, () => run(false));
    } catch (e) {
      run(false);
    }
    return () => { alive = false; if (timer) clearTimeout(timer); };
  }, [visible, slide]);

  if (!visible) return null;

  const close = async () => { setHiddenUntil(await hideForADay()); };
  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [28, 0] });

  return (
    <Animated.View
      pointerEvents="box-none"
      testID="guest-reward-banner"
      style={[styles.wrap, { bottom: TAB_BAR_HEIGHT + 8, opacity: slide, transform: [{ translateY }] }]}
    >
      <View style={styles.card}>
        <View style={styles.giftWrap}><Text style={styles.gift}>🎁</Text></View>
        <View style={styles.textCol}>
          <Text style={styles.title} numberOfLines={2}>{words.title}</Text>
          <Text style={styles.sub} numberOfLines={2}>{words.sub}</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity testID="guest-banner-signup" style={styles.joinBtn} onPress={onSignUp} activeOpacity={0.85}
            accessibilityRole="button" accessibilityLabel={words.join}>
            <Text style={styles.joinText} numberOfLines={1}>{words.join}</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="guest-banner-signin" onPress={onSignIn} hitSlop={{ top: 8, bottom: 8, left: 10, right: 10 }}
            accessibilityRole="button" accessibilityLabel={words.signIn}>
            <Text style={styles.signInText} numberOfLines={1}>{words.signIn}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity testID="guest-banner-close" style={styles.close} onPress={close}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button" accessibilityLabel={t('common.close')}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 8, right: 8, zIndex: 20, elevation: 16 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: 18,
    paddingVertical: 10, paddingHorizontal: 12, gap: 9,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 10, elevation: 16,
  },
  giftWrap: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  gift: { fontSize: 20 },
  textCol: { flex: 1, minWidth: 0 },
  title: { color: COLORS.textWhite, fontSize: 14, fontWeight: FONTS.bold, lineHeight: 18 },
  sub: { color: 'rgba(255,255,255,0.92)', fontSize: 12, lineHeight: 16, marginTop: 1 },
  actions: { alignItems: 'center', gap: 5 },
  joinBtn: { backgroundColor: COLORS.surface, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, minWidth: 78, alignItems: 'center' },
  joinText: { color: COLORS.primary, fontSize: 13, fontWeight: FONTS.bold },
  signInText: { color: COLORS.textWhite, fontSize: 11.5, fontWeight: FONTS.medium, textDecorationLine: 'underline' },
  close: {
    position: 'absolute', top: -9, end: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.secondary,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.surface,
  },
  closeText: { color: COLORS.textWhite, fontSize: 10, fontWeight: FONTS.bold, lineHeight: 12 },
});
