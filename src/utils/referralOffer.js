/**
 * VUMA Store - what an invite pays, for people who have no account yet.
 *
 * The guest banner shows the exact amount ("Earn TZS 2,000 per invite"). The number comes from the server
 * (/referrals/offer/ - the running invite campaign), so it is always the one set in the console. The last answer
 * is kept on the phone, so the banner can show it at once and does not wait for the network.
 * No answer and nothing kept: the banner uses its general words (no amount).
 */
import { get } from '../api/client';
import { storage } from './storage';

export const OFFER_KEY = 'referral_offer_saved';
export const OFFER_KEEP_MS = 7 * 24 * 60 * 60 * 1000;   // a kept answer is used for up to a week when the network is down
const MAX_AMOUNT = 10000000;

export function formatMoney(amount) {
  const n = Math.round(Number(amount) || 0);
  return 'TZS ' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// The server answer -> { amount, text, atSignup } or null (no campaign, no cash amount, or nonsense)
export function cleanOffer(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.active === false) return null;
  const amount = Math.round(Number(raw.amount));
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) return null;
  return { amount, text: formatMoney(amount), atSignup: raw.pays_at_signup === true };
}

export async function readSavedOffer(now) {
  try {
    const raw = await storage.get(OFFER_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    const at = Number(saved && saved.at);
    const t = typeof now === 'number' ? now : Date.now();
    if (!Number.isFinite(at) || t - at > OFFER_KEEP_MS || at - t > 60 * 1000) return null;
    return cleanOffer(saved.offer);
  } catch (e) {
    return null;
  }
}

async function saveOffer(raw, now) {
  try {
    await storage.set(OFFER_KEY, JSON.stringify({ at: typeof now === 'number' ? now : Date.now(), offer: raw }));
  } catch (e) { /* it is only a shortcut */ }
}

async function forgetOffer() {
  try {
    await storage.set(OFFER_KEY, '');
  } catch (e) { /* ignore */ }
}

// Calls onOffer(offer) with the kept answer first (if any), then with the fresh answer from the server.
// A failed request changes nothing. Never throws.
export async function loadOffer(onOffer, now) {
  const kept = await readSavedOffer(now);
  if (kept) onOffer(kept);
  try {
    const raw = await get('/referrals/offer/');
    const fresh = cleanOffer(raw);
    if (fresh) {
      await saveOffer(raw, now);
    } else if (raw && typeof raw === 'object') {
      await forgetOffer();              // the server answered: nothing is running, so show no amount
    } else {
      return;
    }
    onOffer(fresh);
  } catch (e) { /* offline: what was shown stays */ }
}
