/**
 * VUMA Store - the update screen.
 *
 * Sits next to the rest of the app and shows nothing unless the VUMA server says this version should update
 * (see src/utils/appVersion.js for the rules):
 *
 *   soft  a polite box at the bottom: "A new version of VUMA is ready"  [Update] [Later]. At most once a day.
 *   hard  a full screen with one button: "Please update VUMA"  [Update now]. The app cannot be used until it is updated.
 *
 * It asks the server when the app has started (after the opening screen) and again when the app comes back to the front
 * after half an hour. If the server cannot be asked, the last answer is used (so a required update stays required),
 * and with no answer at all nothing is shown. It never throws: a problem here can never stop the app.
 *
 * Props: ready - true once the opening screen is gone (nothing is asked or shown before that)
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API, COLORS, FONTS, RADIUS, SPACING } from '../utils/constants';
import { useTranslation } from '../i18n';
import BrandLogo from './BrandLogo';
import {
  CHECK_EVERY_MS, readInstalledVersion, runCheck, snoozeSoft, storeTargets, updateCopy,
} from '../utils/appVersion';

function platformName() {
  return Platform.OS === 'ios' ? 'ios' : (Platform.OS === 'android' ? 'android' : '');
}

function UpdateGateInner({ ready = true }) {
  const { locale } = useTranslation();
  const insets = useSafeAreaInsets();
  const [decision, setDecision] = useState(null);
  const lastRun = useRef(0);
  const running = useRef(false);
  const alive = useRef(true);

  const check = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      if (typeof __DEV__ !== 'undefined' && __DEV__) return;      // developers' builds are never asked to update
      const platform = platformName();
      const installed = readInstalledVersion();
      if (!platform || !installed) return;                          // an app that cannot tell its version is never blocked
      const result = await runCheck({
        platform, installed, base: API.BASE_URL, storage: AsyncStorage, fetchImpl: fetch,
      });
      lastRun.current = Date.now();
      if (alive.current) setDecision(result.decision.mode === 'none' ? null : result.decision);
    } catch (e) {
      /* the update check never stops the app */
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  useEffect(() => {
    if (!ready) return undefined;
    check();
    let sub = null;
    try {
      sub = AppState.addEventListener('change', (state) => {
        if (state === 'active' && Date.now() - lastRun.current > CHECK_EVERY_MS) check();
      });
    } catch (e) { sub = null; }
    return () => { try { if (sub && sub.remove) sub.remove(); } catch (e) { /* ignore */ } };
  }, [ready, check]);

  const openStore = useCallback(async () => {
    const urls = storeTargets(platformName(), decision);
    for (let i = 0; i < urls.length; i += 1) {
      try { await Linking.openURL(urls[i]); return true; } catch (e) { /* try the next address */ }
    }
    return false;
  }, [decision]);

  const later = useCallback(async () => {
    if (decision) await snoozeSoft(AsyncStorage, decision.latest);
    if (alive.current) setDecision(null);
  }, [decision]);

  const update = useCallback(async () => {
    if (decision && decision.mode === 'soft') {
      await snoozeSoft(AsyncStorage, decision.latest);      // coming back without updating does not ask again today
      if (alive.current) setDecision(null);
    }
    await openStore();
  }, [decision, openStore]);

  if (!decision || (decision.mode !== 'soft' && decision.mode !== 'hard')) return null;
  const hard = decision.mode === 'hard';
  const copy = updateCopy(decision.mode, locale, decision);

  if (hard) {
    return (
      <Modal visible animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
        <View style={[styles.full, { paddingTop: insets.top + SPACING['3xl'], paddingBottom: insets.bottom + SPACING.xl }]} testID="update-hard">
          <View style={styles.fullBody}>
            <BrandLogo variant="full" height={84} />
            <Text style={styles.fullTitle} accessibilityRole="header">{copy.title}</Text>
            <Text style={styles.fullText}>{copy.body}</Text>
          </View>
          <TouchableOpacity style={styles.primary} onPress={update} activeOpacity={0.85} accessibilityRole="button" testID="update-now">
            <Text style={styles.primaryText}>{copy.update}</Text>
          </TouchableOpacity>
          <Text style={styles.version}>VUMA {decision.installed}</Text>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={later}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + SPACING.lg }]} testID="update-soft">
          <BrandLogo variant="mark" height={22} />
          <Text style={styles.title} accessibilityRole="header">{copy.title}</Text>
          <Text style={styles.text}>{copy.body}</Text>
          <TouchableOpacity style={styles.primary} onPress={update} activeOpacity={0.85} accessibilityRole="button" testID="update-btn">
            <Text style={styles.primaryText}>{copy.update}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.laterBtn} onPress={later} activeOpacity={0.7} accessibilityRole="button" testID="update-later">
            <Text style={styles.laterText}>{copy.later}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// If anything in the update screen ever fails while drawing, nothing is shown (the app goes on, nobody is blocked).
class QuietBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    try { console.log('Update screen problem:', String((error && error.message) || error).slice(0, 120)); } catch (e) { /* ignore */ }
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function UpdateGate(props) {
  return (
    <QuietBoundary>
      <UpdateGateInner {...props} />
    </QuietBoundary>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg,
  },
  title: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginTop: SPACING.base },
  text: { fontSize: FONTS.base, color: COLORS.textSecondary, lineHeight: 22, marginTop: SPACING.sm, marginBottom: SPACING.lg },
  primary: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md + 2,
    borderRadius: RADIUS.md, backgroundColor: COLORS.primary,
  },
  primaryText: { fontSize: FONTS.lg, color: COLORS.textWhite, fontWeight: FONTS.bold },
  laterBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md, marginTop: SPACING.xs },
  laterText: { fontSize: FONTS.base, color: COLORS.textSecondary, fontWeight: FONTS.semiBold },
  full: { flex: 1, backgroundColor: COLORS.surface, paddingHorizontal: SPACING.lg },
  fullBody: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fullTitle: {
    fontSize: FONTS['2xl'], fontWeight: FONTS.bold, color: COLORS.textPrimary, textAlign: 'center', marginTop: SPACING['2xl'],
  },
  fullText: {
    fontSize: FONTS.base, color: COLORS.textSecondary, lineHeight: 23, textAlign: 'center', marginTop: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  version: { fontSize: FONTS.xs, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.md },
});
