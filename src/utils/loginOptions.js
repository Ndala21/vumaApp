/**
 * VUMA Store - which sign-in choices the login and register screens show.
 *
 *  - "Continue with Google": Android always. On an iPhone only when GOOGLE_IOS_CLIENT_ID below is filled in. That is the
 *    Google "iOS" client made for the bundle id com.vumastore, and its reversed form must also be the iosUrlScheme of the
 *    @react-native-google-signin/google-signin plugin in app.json (the iPhone app has to be built again after that).
 *  - "Continue with Apple": iPhone only (src/utils/appleSignIn.js asks the phone). App Store rule 4.8: an app that offers
 *    Google sign-in must offer Sign in with Apple too, and it does.
 * Email and password works on both phones.
 */
import { Platform } from 'react-native';

// Google Cloud > APIs & Services > Credentials > the iOS client. Looks like 123456789-abcdefg.apps.googleusercontent.com
export const GOOGLE_IOS_CLIENT_ID = '532626175456-7d09dngvbfsobarl3nrqf4l003oj3b59.apps.googleusercontent.com';

export function googleSignInEnabled(os, iosClientId = GOOGLE_IOS_CLIENT_ID) {
  return os === 'android' || (os === 'ios' && !!iosClientId);
}

export const GOOGLE_SIGNIN_ENABLED = googleSignInEnabled(Platform.OS);
