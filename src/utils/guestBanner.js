/**
 * VUMA Store - the sign-up banner for guests: when to show it and how long "close" lasts.
 *
 * A person who closes the banner does not see it again for a day, then it comes back until they sign up.
 * Pure helpers, so the rules can be tested without a phone.
 */
import { storage } from './storage';

export const HIDE_KEY = 'guest_reward_banner_hidden_until';
export const HIDE_MS = 24 * 60 * 60 * 1000;
// Only on the browsing tabs. The cart, orders and profile already ask a guest to sign in, and the cart has its own buttons.
export const BANNER_TABS = ['Home', 'Search'];

export function shouldShowBanner({ isAuthenticated, hiddenUntil, now, tab, keyboardOpen }) {
  if (isAuthenticated) return false;
  if (keyboardOpen) return false;
  if (BANNER_TABS.indexOf(tab) === -1) return false;
  const until = Number(hiddenUntil) || 0;
  const t = typeof now === 'number' ? now : Date.now();
  return t >= until;
}

export async function readHiddenUntil() {
  try {
    const raw = await storage.get(HIDE_KEY);
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch (e) {
    return 0;
  }
}

export async function hideForADay(now) {
  const until = (typeof now === 'number' ? now : Date.now()) + HIDE_MS;
  try {
    await storage.set(HIDE_KEY, String(until));
  } catch (e) { /* the banner just comes back sooner */ }
  return until;
}
