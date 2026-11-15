/**
 * VUMA Store - tells Google that a person has just registered.
 *
 * Firebase Analytics is already inside the app (it counts installs and opens). Google Ads can only aim an ad at
 * "people who register" if the app tells it when somebody registers. This file sends that one message:
 *
 *     sign_up   { method: 'email' | 'google' | 'apple' }
 *
 * It is sent when a brand-new account is made:  by e-mail, or by Google / Apple when the server says "Account created."
 * (a person who only signs in to an old account is not a sign-up).
 *
 * Safety rules: it never waits, never throws and never shows anything. If Firebase is missing or fails, nothing happens
 * and the app goes on as before. Developer builds (__DEV__) send nothing.
 *
 * Plain app code only (no native part): it can be sent with an update to apps that already have Firebase (version 1.0.3).
 */

export const SIGN_UP_EVENT = 'sign_up';
const METHODS = ['email', 'google', 'apple'];

/** 'email', 'google' or 'apple'. Anything else is sent as 'email'. */
export function cleanMethod(method) {
  const m = typeof method === 'string' ? method.trim().toLowerCase() : '';
  return METHODS.indexOf(m) === -1 ? 'email' : m;
}

/** True when the server answer of a Google / Apple sign-in says a new account was made ("Account created."). */
export function isNewAccount(data) {
  const text = data && typeof data.message === 'string' ? data.message.trim().toLowerCase() : '';
  return text.indexOf('account created') === 0;
}

// The Firebase module, or null when the app does not have it. (`modules` is only for the tests.)
function loadAnalytics(modules) {
  if (modules) return modules.analytics || null;
  try {
    return require('@react-native-firebase/analytics');
  } catch (e) {
    return null;
  }
}

/**
 * Sends the sign_up event. Returns a promise that always answers true (sent to Firebase) or false (not sent). Never throws.
 *   options  { modules: { analytics }, force }   - for the tests only
 */
export function trackSignUp(method, options) {
  const opts = options || {};
  try {
    if (!opts.force && typeof __DEV__ !== 'undefined' && __DEV__) return Promise.resolve(false);
    const mod = loadAnalytics(opts.modules);
    if (!mod) return Promise.resolve(false);
    const params = { method: cleanMethod(method) };
    let sent;
    if (typeof mod.getAnalytics === 'function' && typeof mod.logEvent === 'function') {
      sent = mod.logEvent(mod.getAnalytics(), SIGN_UP_EVENT, params);          // the current way (react-native-firebase 22 and later)
    } else {
      const namespaced = typeof mod.default === 'function' ? mod.default : (typeof mod === 'function' ? mod : null);
      if (!namespaced) return Promise.resolve(false);
      sent = namespaced().logEvent(SIGN_UP_EVENT, params);                     // the older way, as a way back
    }
    return Promise.resolve(sent).then(() => true, () => false);
  } catch (e) {
    return Promise.resolve(false);
  }
}
