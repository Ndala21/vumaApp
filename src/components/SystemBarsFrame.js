/**
 * VUMA Store - keeps the app clear of the phone's own buttons.
 *
 * On newer Android phones (Android 15 and up, which is what Expo SDK 54 builds
 * for) an app is drawn across the WHOLE screen, including the strip where the
 * phone's own Back / Home / Recent buttons (or the swipe bar) sit. Anything
 * fixed to the bottom of the screen, like the tab bar with Home, Cart and
 * Dashboard, ended up underneath those buttons.
 *
 * This frame wraps the whole app and leaves that strip free. It asks the
 * phone how tall the strip is (useSafeAreaInsets), so it adds nothing on
 * phones where the strip is not part of the app window, and nothing on iPhone
 * (the iPhone screens already carry their own space for the home bar).
 *
 * The strip itself is painted white. The seller tab bar is dark, so that
 * navigator calls setBottomStripColor() while it is on screen and the strip
 * takes the same dark colour.
 */
import React, { useSyncExternalStore } from 'react';
import { View, Platform } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../utils/constants';

let stripColor = null;
const listeners = new Set();

export function setBottomStripColor(color) {
  const next = color || null;
  if (next === stripColor) return;
  stripColor = next;
  listeners.forEach((l) => l());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
function getSnapshot() { return stripColor; }

// How much room to leave under the app on this phone (pure, so it can be tested).
export function bottomRoom(os, insets) {
  if (os === 'ios') return 0;
  const b = insets && Number(insets.bottom);
  return b > 0 ? b : 0;
}

export default function SystemBarsFrame({ children }) {
  const insets = useSafeAreaInsets();
  const color = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const room = bottomRoom(Platform.OS, insets);
  // The room is used up here, so anything below that asks for the bottom
  // inset gets 0 and does not leave the same room a second time.
  const inner = room > 0 ? { ...insets, bottom: 0 } : insets;
  return (
    <View style={{ flex: 1, paddingBottom: room, backgroundColor: color || COLORS.surface }}>
      <SafeAreaInsetsContext.Provider value={inner}>
        {children}
      </SafeAreaInsetsContext.Provider>
    </View>
  );
}
