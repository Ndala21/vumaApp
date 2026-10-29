/**
 * VUMA Store - asking the person to allow notifications.
 *
 * Android 13 and newer, and iPhones, never let an app switch notifications on by itself:
 * the phone always shows its own Allow / Don't allow box. So the app asks politely:
 *  - Android 12 and older: notifications are on by default, nothing is asked.
 *  - Already allowed, or switched off in the phone settings: nothing is asked.
 *  - Otherwise a VUMA message comes first (what the person gets), then the phone's box.
 *    "Not now" -> asked one more time after 3 days, then never again.
 *    "Turn on" followed by "Don't allow" in the phone's box -> never asked again.
 * If the saved answer cannot be read, nothing is asked (so a storage problem can never make the
 * question appear again and again).
 */
import { Alert, AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { i18n } from '../i18n';

const KEY = '@vuma_push_ask';
export const MAX_ASKS = 2;
export const WAIT_BETWEEN_ASKS_MS = 3 * 24 * 60 * 60 * 1000;
const SETTLE_MS = 4000;

const TEXT = {
  en: {
    title: 'Get order updates and deals',
    body: 'Turn on notifications to know when your order is packed, on its way and delivered, and to see new deals first. You can change this any time in your phone settings.',
    yes: 'Turn on',
    no: 'Not now',
  },
  sw: {
    title: 'Pata taarifa za oda na ofa',
    body: 'Washa arifa ili ujue oda yako ikifungwa, ikiwa njiani na ikifika, na uone ofa mpya kwanza. Unaweza kubadilisha wakati wowote kwenye mipangilio ya simu yako.',
    yes: 'Washa',
    no: 'Si sasa',
  },
};

async function readState() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { asks: 0, last: 0 };
    const s = JSON.parse(raw);
    return { asks: Number(s && s.asks) || 0, last: Number(s && s.last) || 0 };
  } catch {
    return null;
  }
}

async function writeState(state) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

function explain() {
  return new Promise((resolve) => {
    const tx = TEXT[i18n.getLocale()] || TEXT.en;
    let done = false;
    const finish = (answer) => {
      if (!done) {
        done = true;
        resolve(answer);
      }
    };
    try {
      Alert.alert(
        tx.title,
        tx.body,
        [
          { text: tx.no, style: 'cancel', onPress: () => finish(false) },
          { text: tx.yes, onPress: () => finish(true) },
        ],
        { cancelable: true, onDismiss: () => finish(false) }
      );
    } catch {
      finish(false);
    }
  });
}

let pending = null;        // a question that is already on its way: a second caller joins it
let askedThisRun = false;  // never twice while the app stays open, even if saving the answer fails

/**
 * Resolves true when this phone allows notifications (so a push token can be taken),
 * false when it does not (and the person was not, or can no longer be, asked).
 */
export function ensurePushPermission() {
  if (!pending) {
    pending = decide().finally(() => {
      pending = null;
    });
  }
  return pending;
}

async function decide() {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;

  // Android 12 and older are on by default; "not granted" there means it was switched off in the
  // phone settings, which no question can change.
  if (Platform.OS === 'android' && Number(Platform.Version) < 33) return false;
  // Switched off in the phone settings, or refused twice: the phone no longer shows its box.
  if (current.canAskAgain === false) return false;

  const state = await readState();
  if (!state) return false;
  if (state.asks >= MAX_ASKS) return false;
  if (state.asks > 0 && Date.now() - state.last < WAIT_BETWEEN_ASKS_MS) return false;

  // Let the app finish opening first, and only ask while the app is on the screen.
  if (askedThisRun || AppState.currentState !== 'active') return false;
  await new Promise((r) => setTimeout(r, SETTLE_MS));
  if (AppState.currentState !== 'active') return false;
  askedThisRun = true;

  // Count the question before showing it, so a crash can never make it repeat.
  await writeState({ asks: state.asks + 1, last: Date.now() });
  const yes = await explain();
  if (!yes) return false;

  let granted = false;
  try {
    const res = await Notifications.requestPermissionsAsync();
    granted = res.status === 'granted';
  } catch {}
  if (!granted) {
    // They saw the phone's own box and refused: do not ask again.
    await writeState({ asks: MAX_ASKS, last: Date.now() });
  }
  return granted;
}
