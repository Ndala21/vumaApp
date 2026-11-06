/**
 * VUMA Store - which sign-in choices the login and register screens show.
 *
 * "Continue with Google" is Android only for now. On an iPhone, Apple's App
 * Store rules (4.8) ask for "Sign in with Apple" next to any other company's
 * sign-in button, and Google sign-in on iPhone also needs its own client
 * setup that is not done yet. Email and password works on both phones.
 * Switch this on for iOS only after both of those are in place.
 */
import { Platform } from 'react-native';

export function googleSignInEnabled(os) {
  return os === 'android';
}

export const GOOGLE_SIGNIN_ENABLED = googleSignInEnabled(Platform.OS);
