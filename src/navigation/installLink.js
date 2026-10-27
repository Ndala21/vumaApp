/**
 * VUMA Store - install from an ad, land on the product.
 *
 * The product page that a Facebook, Instagram or TikTok ad opens sends a phone without the app to Google Play with a
 * "referrer" note that says which product the ad was about (utm_content=<product id>). Google Play keeps that note.
 * The first time the app starts after that install it reads the note once and opens the same product, so the shopper
 * does not have to find it again.
 *
 *   takeInstallLink()   -> 'vuma://product/<id>' or null. Answers at most once per install, never throws and
 *                          never keeps the app waiting for more than a moment.
 *   linkFromReferrer()  -> the same decision for one referrer text (used by the function above and by the tests).
 *
 * Android only (Google Play). Only an ad note with a real product id is accepted; nothing else can open a screen.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const DONE_KEY = 'vuma_install_link_done';
const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;     // an old install is not a fresh ad click any more
// A new install first runs the code that came inside the Google Play version and picks up a later update on its NEXT start.
// While this code comes from such an update (not from the Play version), only a restart within minutes of the install counts,
// so nobody is thrown at a product days later.
const UPDATE_MAX_AGE_MS = 20 * 60 * 1000;
const WAIT_MS = 1500;                            // Google Play may be slow; the app never waits longer than this
const PRODUCT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOT_AVAILABLE = 'ERR_APPLICATION_INSTALL_REFERRER_UNAVAILABLE';

function decode(text) {
  try { return decodeURIComponent(String(text).replace(/\+/g, ' ')); } catch (e) { return ''; }
}

/** 'utm_source=meta&utm_medium=paid_social&utm_content=<id>' -> 'vuma://product/<id>', or null. */
export function linkFromReferrer(referrer) {
  if (typeof referrer !== 'string' || !referrer) return null;
  const params = {};
  referrer.split('&').forEach((pair) => {
    const i = pair.indexOf('=');
    if (i > 0) params[decode(pair.slice(0, i))] = decode(pair.slice(i + 1));
  });
  if (params.utm_medium !== 'paid_social') return null;
  const id = String(params.utm_content || '').trim();
  return PRODUCT_ID.test(id) ? 'vuma://product/' + id.toLowerCase() : null;
}

function freshWindow() {
  try {
    const Updates = require('expo-updates');
    if (Updates && Updates.isEmbeddedLaunch === false) return UPDATE_MAX_AGE_MS;
  } catch (e) { /* no updates module: this is the code that came with the Play version */ }
  return MAX_AGE_MS;
}

function within(promise, ms) {
  let timer;
  const late = new Promise((resolve) => { timer = setTimeout(() => resolve({ late: true }), ms); });
  return Promise.race([promise.then((value) => ({ value }), (error) => ({ error })), late])
    .then((result) => { clearTimeout(timer); return result; });
}

export async function takeInstallLink() {
  if (Platform.OS !== 'android') return null;
  try {
    if (await AsyncStorage.getItem(DONE_KEY)) return null;
    const Application = require('expo-application');
    const when = await within(Application.getInstallationTimeAsync(), WAIT_MS);
    if (when.late || when.error || !when.value) return null;          // try again the next time the app starts
    if (Date.now() - new Date(when.value).getTime() > freshWindow()) {
      await AsyncStorage.setItem(DONE_KEY, '1');
      return null;
    }
    const got = await within(Application.getInstallReferrerAsync(), WAIT_MS);
    if (got.late) return null;                                         // Google Play did not answer in time
    if (got.error) {
      if (got.error && got.error.code === NOT_AVAILABLE) await AsyncStorage.setItem(DONE_KEY, '1');
      return null;
    }
    await AsyncStorage.setItem(DONE_KEY, '1');                         // used up: it can only ever fire once
    return linkFromReferrer(got.value);
  } catch (e) {
    return null;
  }
}
