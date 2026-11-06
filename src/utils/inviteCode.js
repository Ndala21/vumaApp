/**
 * VUMA Store - the invite code of the friend who sent you here.
 *
 * A friend shares a link like https://vumastore.store/invite/VUMAAB3K9XY . The code can reach the app in four ways,
 * and every one of them ends in the same place: the code is kept on the phone until the person signs up.
 *
 *   1. The link opens the app (vuma://invite/CODE or the web address)       -> codeFromLink()
 *   2. The link sent the phone to Google Play, then the app was installed   -> inviteFromReferrer()
 *   3. The invite page left "VUMA-INVITE:CODE" on the clipboard (Android)   -> codeFromClipboardText()
 *   4. The person types it in the "Invite code" box when creating the account
 *
 * The code is sent with the sign-up (register / Google). A person who already has an account and is still new
 * (first days, no paid order) can add it later: attachPendingInvite() asks the server, which decides.
 * Nothing here can make a payment or give money - the server checks every rule.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { get, post } from '../api/client';
import { getDeviceId } from './deviceId';

export const KEY = '@vuma_pending_invite';
export const CLIP_DONE_KEY = '@vuma_invite_clip_done';
const MARKER = 'VUMA-INVITE:';
const MIN_LENGTH = 6;     // real codes are 11 letters and digits; anything shorter is not a code
const MAX_LENGTH = 20;

/** 'vuma-ab3k9xy ' -> 'VUMAAB3K9XY'. Anything that cannot be a code -> ''. */
export function cleanCode(raw) {
  const code = String(raw == null ? '' : raw).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, MAX_LENGTH);
  return code.length >= MIN_LENGTH ? code : '';
}

function decode(text) {
  try { return decodeURIComponent(String(text).replace(/\+/g, ' ')); } catch (e) { return ''; }
}

/** 'vuma://invite/CODE' or 'https://vumastore.store/(app/)invite/CODE' -> 'CODE', else ''. */
export function codeFromLink(url) {
  const match = /^(?:vuma:\/\/|https?:\/\/(?:www\.)?vumastore\.store\/(?:app\/)?)invite\/([^/?#]+)/i.exec(String(url || '').trim());
  return match ? cleanCode(decode(match[1])) : '';
}

/** The Google Play install note 'utm_source=vuma_invite&vuma_ref=CODE' -> 'CODE', else ''. */
export function inviteFromReferrer(referrer) {
  if (typeof referrer !== 'string' || !referrer) return '';
  let found = '';
  referrer.split('&').forEach((pair) => {
    const i = pair.indexOf('=');
    if (i > 0 && decode(pair.slice(0, i)) === 'vuma_ref') found = cleanCode(decode(pair.slice(i + 1)));
  });
  return found;
}

/** 'VUMA-INVITE:CODE' (what the invite page copies) -> 'CODE', else ''. */
export function codeFromClipboardText(text) {
  const match = /VUMA-INVITE:([A-Za-z0-9]{6,20})/.exec(String(text || ''));
  return match ? cleanCode(match[1]) : '';
}

// ── What the phone remembers ─────────────────────────────────────────────────
export async function getPendingInvite() {
  try { return cleanCode(await AsyncStorage.getItem(KEY)); } catch (e) { return ''; }
}

export async function savePendingInvite(code) {
  const clean = cleanCode(code);
  if (!clean) return '';
  try { await AsyncStorage.setItem(KEY, clean); } catch (e) { /* storage not available: the code is simply not kept */ }
  return clean;
}

export async function clearPendingInvite() {
  try { await AsyncStorage.removeItem(KEY); } catch (e) { /* ignore */ }
}

/** The invite link opened the app: keep its code. Returns the code ('' when the link has none). */
export async function rememberInviteFromLink(url) {
  const code = codeFromLink(url);
  return code ? savePendingInvite(code) : '';
}

/**
 * First start only, Android only: the invite page leaves "VUMA-INVITE:CODE" on the clipboard when the person taps
 * the install button. If the Google Play note did not carry the code (no Play, an old install), this finds it.
 * It looks once, never when a code is already kept, and never lets a problem reach the person.
 */
export async function takeClipboardInvite() {
  if (Platform.OS !== 'android') return '';
  try {
    if (await AsyncStorage.getItem(CLIP_DONE_KEY)) return '';
    await AsyncStorage.setItem(CLIP_DONE_KEY, '1');
    if (await getPendingInvite()) return '';
    const Clipboard = require('react-native').Clipboard;
    if (!Clipboard || typeof Clipboard.getString !== 'function') return '';
    const code = codeFromClipboardText(await Clipboard.getString());
    if (!code) return '';
    try { if (typeof Clipboard.setString === 'function') Clipboard.setString(''); } catch (e) { /* ignore */ }
    return savePendingInvite(code);
  } catch (e) {
    return '';
  }
}

// ── Asking the server ────────────────────────────────────────────────────────

/** Is this a real invite code, and who sent it? -> { valid, referrerName, friendGift, message } (never throws). */
export async function checkInviteCode(raw) {
  const code = cleanCode(raw);
  if (!code) return { valid: false, referrerName: '', friendGift: 0, message: '' };
  try {
    const res = await get('/referrals/validate/', { code });
    if (res && res.valid) {
      return { valid: true, code: res.code || code, referrerName: res.referrer_name || '', friendGift: Number(res.friend_gift) || 0, message: res.message || '' };
    }
    return { valid: false, referrerName: '', friendGift: 0, message: '' };
  } catch (e) {
    return { valid: null, referrerName: '', friendGift: 0, message: '' };      // could not ask: say nothing wrong
  }
}

/** What goes into a sign-up request: { referral_code, device_id } ('' when there is nothing to send). */
export async function signupInviteFields(typed) {
  const code = cleanCode(typed) || (await getPendingInvite());
  return { referral_code: code, device_id: await getDeviceId() };
}

/**
 * A signed-in person adds the code that was kept on the phone. The code is removed when the server has given a
 * clear answer (done, not allowed, not found) and kept when the phone could not reach the server.
 * Returns the server's answer { applied, referrer_name?, reason?, message } or null.
 */
let attaching = null;
export function attachPendingInvite() {
  // Two places may ask at the same moment (the invite screen and the app start): they share one request.
  if (!attaching) attaching = attachNow().finally(() => { attaching = null; });
  return attaching;
}

async function attachNow() {
  const code = await getPendingInvite();
  if (!code) return null;
  try {
    const res = await post('/referrals/attach/', { code, device_id: await getDeviceId() });
    await clearPendingInvite();
    return res || { applied: false, reason: 'error' };
  } catch (e) {
    const status = e && e.status;
    if (status && status >= 400 && status < 500 && status !== 401 && status !== 429) {
      await clearPendingInvite();
      return (e.errors && typeof e.errors === 'object' && 'applied' in e.errors) ? e.errors : { applied: false, reason: 'error' };
    }
    return null;
  }
}
