/**
 * VUMA Store - what a tap on a push notification opens.
 *
 * The server puts the screen it is about in the push (data.link, for example vuma://orders/12).
 * React Navigation asks for it in two moments, and AppNavigator hands these two functions over:
 *   getInitialURL - the app was closed and the push opened it
 *   subscribe     - the app was already running (background or open)
 * Links from e-mail buttons and the web keep working exactly as before.
 * A brand-new install that came from an ad opens that ad's product (see installLink.js) when nothing else opened the app.
 */

import { Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import { takeInstallLink } from './installLink';

/** The VUMA link inside a push response, or null. */
export function pushLink(response) {
  try {
    const data = response && response.notification && response.notification.request
      && response.notification.request.content && response.notification.request.content.data;
    const link = data && data.link;
    return typeof link === 'string' && link.startsWith('vuma://') ? link : null;
  } catch (e) {
    return null;
  }
}

export async function getInitialURL() {
  const installLink = await takeInstallLink();      // read (and used up) on the first start only, never waits long
  const url = await Linking.getInitialURL();
  if (url != null) return url;
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    const link = pushLink(response);
    if (link) {
      // so the same tap is not opened again by the next start of the app
      try { await Notifications.clearLastNotificationResponseAsync(); } catch (e) { /* ignore */ }
      return link;
    }
  } catch (e) { /* no push, no link */ }
  return installLink;
}

export function subscribe(listener) {
  const urlSub = Linking.addEventListener('url', ({ url }) => listener(url));
  let pushSub = null;
  try {
    pushSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const link = pushLink(response);
      if (link) listener(link);
    });
  } catch (e) { /* push is not available here */ }
  return () => {
    if (urlSub && urlSub.remove) urlSub.remove();
    if (pushSub && pushSub.remove) pushSub.remove();
  };
}
