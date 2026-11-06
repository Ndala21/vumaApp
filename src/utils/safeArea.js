/**
 * VUMA Store - keeps headers clear of the iPhone's clock, notch and Dynamic Island.
 *
 * An iPhone draws the app across the WHOLE screen, including the strip at the
 * top where the clock and battery sit. That strip is not the same on every
 * iPhone: about 20 on an iPhone SE, 47 on an iPhone X to 13, and 54 to 59 on
 * the iPhones with the Dynamic Island. The old screens used one fixed number
 * (50), which is too small for the newest phones, so the clock touched the
 * screen title.
 *
 * iosTop(extra) asks the phone for its real top strip once, when the app
 * starts, and adds a small extra. The old fixed numbers stay as the
 * "extra", so a screen looks the same as before on an iPhone 13 and gets
 * the room it needs on every other iPhone.
 *
 * Only used in the iPhone branch of a style (Platform.OS === 'ios'). On
 * Android it is never read, and nothing changes there.
 */
import { Platform } from 'react-native';
import { initialWindowMetrics } from 'react-native-safe-area-context';

// Used only if the phone does not tell its top strip: the notch of an iPhone X to 13,
// which is what the old fixed numbers were made for.
export const FALLBACK_TOP = 47;

// Pure, so it can be tested without a phone.
export function pickTopInset(os, metrics, fallback = FALLBACK_TOP) {
  if (os !== 'ios') return 0;
  const raw = metrics && metrics.insets ? Number(metrics.insets.top) : NaN;
  if (!Number.isFinite(raw) || raw <= 0) return fallback;
  // A real iPhone is between 20 and about 60; anything outside 20..80 is not believable.
  return Math.min(Math.max(Math.round(raw), 20), 80);
}

export const IOS_TOP = pickTopInset(Platform.OS, initialWindowMetrics);

export function iosTop(extra = 0) {
  return IOS_TOP + extra;
}
