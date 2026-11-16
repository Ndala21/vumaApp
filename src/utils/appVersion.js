/**
 * VUMA Store - asking people to update the app, or making them update it.
 *
 * When the app starts (and when it comes back to the front after a while) it asks the VUMA server one small question:
 *
 *     GET /api/v1/app-version/?platform=android&version=1.0.2
 *
 * The server answers with two numbers for this phone type:
 *   latest   the newest version in the store      -> an older app is OFFERED the update (Update / Later, at most once a day)
 *   min      the oldest version that may still run -> an older app MUST update before it can go on
 * Nothing is asked and nothing is forced until the server says so. All of it is decided here, in plain functions:
 *
 *   parseVersion / compareVersions   '1.0.10' is newer than '1.0.9' (numbers, not letters)
 *   cleanInfo(raw)                   the server answer, checked: only version numbers and safe store addresses are kept
 *   decideUpdate(info, installed)    { mode: 'none' | 'soft' | 'hard', ... }
 *   runCheck(...)                    asks the server, keeps the last answer for offline starts, never throws
 *   storeTargets(platform, info)     the store addresses to try, best first
 *   updateCopy(mode, locale, info)   the words on the screen (English and Swahili; the server may send its own)
 *
 * Safety rules: an app that cannot tell its own version is never blocked. A server that does not answer never blocks
 * anybody who was not already blocked by an earlier answer. A bad answer is ignored.
 */

export const ANDROID_PACKAGE = 'com.vumastore';
export const IOS_APP_ID = '6832867650';
export const CHECK_EVERY_MS = 30 * 60 * 1000;          // looks again when the app comes to the front after this long
export const SOFT_EVERY_MS = 24 * 60 * 60 * 1000;      // the polite box shows at most once a day for the same new version
export const INFO_KEY = 'vuma_app_version_info';
export const SNOOZE_KEY = 'vuma_app_update_snooze';
export const REQUEST_TIMEOUT_MS = 8000;

const VERSION = /^\s*v?(\d{1,5}(?:\.\d{1,5}){0,3})(?![\d.])/;
const STORE_HOSTS = ['play.google.com', 'apps.apple.com', 'itunes.apple.com'];

export function parseVersion(text) {
  if (typeof text !== 'string') return null;
  const m = VERSION.exec(text);
  if (!m) return null;
  const parts = m[1].split('.').map((x) => parseInt(x, 10));
  while (parts.length > 1 && parts[parts.length - 1] === 0) parts.pop();
  return parts;
}

/** -1 when a is older than b, 0 when equal, 1 when newer, null when either is not a version number. */
export function compareVersions(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (!pa || !pb) return null;
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i += 1) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

// The version as it is written ('1.0.3', without a 'v' or a suffix), or '' when it is not a version number.
function plainVersion(text) {
  const m = typeof text === 'string' ? VERSION.exec(text) : null;
  return m ? m[1] : '';
}

function safeStoreUrl(url) {
  if (typeof url !== 'string') return '';
  const m = /^https:\/\/([^/?#]+)[/?#]?/.exec(url.trim());
  if (!m || STORE_HOSTS.indexOf(m[1].toLowerCase()) === -1 || url.length > 300) return '';
  return url.trim();
}

function plainText(text) {
  return typeof text === 'string' ? text.replace(/\s+/g, ' ').trim().slice(0, 240) : '';
}

/** The server answer, reduced to what is safe to use. Anything else (a bad answer) gives null. */
export function cleanInfo(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const message = raw.message && typeof raw.message === 'object' ? raw.message : {};
  let min = plainVersion(raw.min);
  let latest = plainVersion(raw.latest);
  if (min && (!latest || compareVersions(latest, min) === -1)) latest = min;
  return {
    min,
    latest,
    storeUrl: safeStoreUrl(raw.store_url || raw.storeUrl),      // the server writes store_url; the kept copy says storeUrl
    message: { en: plainText(message.en), sw: plainText(message.sw) },
  };
}

/**
 * What to do for this app, given the server answer and the installed version.
 *   snooze   { version, at } - the polite box was already shown (or used) for that newest version at that time
 * Returns { mode: 'none' | 'soft' | 'hard', min, latest, installed, storeUrl, message }.
 */
export function decideUpdate(info, installed, options) {
  const opts = options || {};
  const now = typeof opts.now === 'number' ? opts.now : Date.now();
  const none = { mode: 'none', min: '', latest: '', installed: plainVersion(installed), storeUrl: '', message: { en: '', sw: '' } };
  const clean = cleanInfo(info);
  if (!clean || !parseVersion(installed)) return none;
  const base = { min: clean.min, latest: clean.latest, installed: plainVersion(installed), storeUrl: clean.storeUrl, message: clean.message };
  if (clean.min && compareVersions(installed, clean.min) === -1) return { mode: 'hard', ...base };
  if (clean.latest && compareVersions(installed, clean.latest) === -1) {
    const s = opts.snooze;
    const recent = s && s.version === clean.latest && typeof s.at === 'number' && now - s.at >= 0 && now - s.at < SOFT_EVERY_MS;
    if (!recent) return { mode: 'soft', ...base };
  }
  return { ...none, ...base, mode: 'none' };
}

/**
 * The version of the app that is installed on this phone ('' when it cannot be told). Never throws.
 * The phone's own record of the installed version comes first; the others are the way back if that module is missing.
 * (`modules` is only for the tests.)
 */
export function readInstalledVersion(modules) {
  const given = modules || null;
  let v = '';
  try { v = (given ? given.application : require('expo-application')).nativeApplicationVersion; } catch (e) { v = ''; }
  if (parseVersion(v)) return plainVersion(v);
  try { v = (given ? given.updates : require('expo-updates')).runtimeVersion; } catch (e) { v = ''; }
  if (parseVersion(v)) return plainVersion(v);
  try {
    const c = given ? given.constants : require('expo-constants');
    v = ((c.default || c).expoConfig || {}).version;
  } catch (e) { v = ''; }
  return parseVersion(v) ? plainVersion(v) : '';
}

/** The store addresses to try, best first. */
export function storeTargets(platform, info) {
  const given = info && typeof info.storeUrl === 'string' ? info.storeUrl : '';
  if (platform === 'ios') return [given || ('https://apps.apple.com/app/id' + IOS_APP_ID)];
  return ['market://details?id=' + ANDROID_PACKAGE, given || ('https://play.google.com/store/apps/details?id=' + ANDROID_PACKAGE)];
}

const COPY = {
  en: {
    softTitle: 'A new version of VUMA is ready',
    softBody: 'Update to get the latest improvements and fixes.',
    hardTitle: 'Please update VUMA',
    hardBody: 'This version of VUMA is no longer supported. Update to keep shopping and selling.',
    update: 'Update',
    updateNow: 'Update now',
    later: 'Later',
  },
  sw: {
    softTitle: 'Toleo jipya la VUMA liko tayari',
    softBody: 'Sasisha ili upate maboresho na marekebisho mapya.',
    hardTitle: 'Tafadhali sasisha VUMA',
    hardBody: 'Toleo hili la VUMA halitumiki tena. Sasisha ili uendelee kununua na kuuza.',
    update: 'Sasisha',
    updateNow: 'Sasisha sasa',
    later: 'Baadaye',
  },
};

/** The words for the update screen. Other languages read the English text; the server may send its own words. */
export function updateCopy(mode, locale, info) {
  const lang = locale === 'sw' ? 'sw' : 'en';
  const c = COPY[lang];
  const own = info && info.message ? info.message[lang] : '';
  if (mode === 'hard') return { title: c.hardTitle, body: own || c.hardBody, update: c.updateNow, later: '' };
  return { title: c.softTitle, body: own || c.softBody, update: c.update, later: c.later };
}

/**
 * Asks the server and decides. Never throws and never waits for more than the timeout.
 *   env: { platform, installed, base, storage, fetchImpl, now }
 *     storage   { getItem(key) -> Promise<string|null>, setItem(key, value) -> Promise }
 * Returns { decision, fresh }. fresh is false when the server could not be asked and the last answer was used.
 */
export async function runCheck(env) {
  const now = typeof env.now === 'number' ? env.now : Date.now();
  const store = env.storage;
  const readJson = async (key) => {
    try { const v = await store.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  };
  const writeJson = async (key, value) => {
    try { await store.setItem(key, JSON.stringify(value)); } catch (e) { /* keeping it is only a convenience */ }
  };
  const snooze = await readJson(SNOOZE_KEY);
  let info = null;
  let fresh = false;
  try {
    const url = String(env.base || '').replace(/\/+$/, '') + '/app-version/?platform=' + encodeURIComponent(env.platform)
      + '&version=' + encodeURIComponent(env.installed);
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = setTimeout(() => { try { if (ctl) ctl.abort(); } catch (e) { /* ignore */ } }, env.timeoutMs || REQUEST_TIMEOUT_MS);
    try {
      const res = await env.fetchImpl(url, { headers: { Accept: 'application/json' }, signal: ctl ? ctl.signal : undefined });
      if (res && res.ok) {
        info = cleanInfo(await res.json());
        fresh = !!info;
      }
    } finally {
      clearTimeout(timer);
    }
  } catch (e) { info = null; }
  if (fresh) {
    await writeJson(INFO_KEY, info);
  } else {
    info = cleanInfo(await readJson(INFO_KEY));       // no answer: the last answer still applies (a block stays a block)
  }
  return { decision: decideUpdate(info, env.installed, { now, snooze }), fresh };
}

/** Remembers that the polite box was shown / used for this newest version (so it does not come back for a day). */
export async function snoozeSoft(storage, latest, now) {
  try {
    await storage.setItem(SNOOZE_KEY, JSON.stringify({ version: latest, at: typeof now === 'number' ? now : Date.now() }));
  } catch (e) { /* ignore */ }
}
