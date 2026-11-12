/**
 * VUMA Store - Sign in with Apple (iPhone only).
 *
 * expo-apple-authentication is loaded only on an iPhone and only when it is needed. Android, and an iPhone app that was
 * built before this module was added, simply get "not available": the Apple button is not shown and nothing breaks.
 */
import { Platform } from 'react-native';

let cached = null;

/** The expo-apple-authentication module, or null when this phone cannot use it. */
export function appleModule() {
  if (Platform.OS !== 'ios') return null;
  if (cached === null) {
    try {
      // eslint-disable-next-line global-require
      cached = require('expo-apple-authentication');
    } catch (e) {
      cached = false;
    }
  }
  return cached || null;
}

export async function appleSignInAvailable() {
  const Apple = appleModule();
  if (!Apple) return false;
  try {
    return !!(await Apple.isAvailableAsync());
  } catch (e) {
    return false;
  }
}

/** True when the person closed Apple's sign-in sheet (not an error worth a message). */
export function isAppleCancel(error) {
  return error?.code === 'ERR_REQUEST_CANCELED';
}

/**
 * Opens Apple's sign-in sheet and returns { identityToken, firstName, lastName }.
 * Apple gives the name only the very first time a person uses Sign in with Apple with this app.
 */
export async function getAppleCredential() {
  const Apple = appleModule();
  if (!Apple) throw new Error('Sign in with Apple is not available on this phone.');
  const credential = await Apple.signInAsync({
    requestedScopes: [
      Apple.AppleAuthenticationScope.FULL_NAME,
      Apple.AppleAuthenticationScope.EMAIL,
    ],
  });
  if (!credential?.identityToken) {
    throw new Error('Apple did not send a sign-in token. Please try again.');
  }
  return {
    identityToken: credential.identityToken,
    firstName: credential.fullName?.givenName || '',
    lastName: credential.fullName?.familyName || '',
  };
}
