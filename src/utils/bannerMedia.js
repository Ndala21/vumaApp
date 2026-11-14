/**
 * VUMA Store - what a banner carries besides its picture (no screens, no network).
 *
 * Admin staff can give a banner a short video and/or event details (a date and
 * a place). The server sends them with the banner as:
 *   video             full web address of the video (or empty)
 *   event_starts_at   the start of the event, e.g. "2026-12-20T18:00:00+03:00" (or empty)
 *   event_location    the place of the event (or empty)
 * An older server sends none of these, and the banner is then just a picture.
 *
 * Times are shown in Tanzania time (always UTC+3, no daylight saving) whatever
 * the phone's own clock zone is, so an event reads the same for everybody.
 */

const TZ_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
// An event that started more than this long ago is over: the card goes back to a plain banner.
const OVER_AFTER_MS = 12 * 60 * 60 * 1000;
const MAX_DAYS_AHEAD_WORD = 60;

const WORDS = {
  en: {
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    today: 'Today', tomorrow: 'Tomorrow', now: 'Happening now', inDays: 'in {n} days',
    play: 'Play video', close: 'Close video', soundOn: 'Sound on', soundOff: 'Sound off',
  },
  sw: {
    months: ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ago', 'Sep', 'Okt', 'Nov', 'Des'],
    days: ['Jumapili', 'Jumatatu', 'Jumanne', 'Jumatano', 'Alhamisi', 'Ijumaa', 'Jumamosi'],
    today: 'Leo', tomorrow: 'Kesho', now: 'Inaendelea sasa', inDays: 'baada ya siku {n}',
    play: 'Cheza video', close: 'Funga video', soundOn: 'Sauti imewashwa', soundOff: 'Sauti imezimwa',
  },
};

/** The words for a language code; every language the app has but Swahili gets English. */
export function bannerWords(lang) {
  return WORDS[lang] || WORDS.en;
}

/** The video address of a banner, or null when it has none (only a real web address counts). */
export function bannerVideoUrl(banner) {
  const v = banner && banner.video;
  if (typeof v !== 'string') return null;
  const url = v.trim();
  return /^https?:\/\/\S+$/i.test(url) ? url : null;
}

const two = (n) => (n < 10 ? '0' + n : String(n));

/**
 * The event of a banner, ready to show, or null when there is nothing to show
 * (no event, an unreadable date, or an event that is already over).
 *
 *   hasDate  true when there is a date (the calendar tile is shown only then)
 *   day, month, weekday, time   what the tile and the line show, in Tanzania time
 *   place    the place, or ''
 *   status   'now' | 'today' | 'tomorrow' | 'later' | 'none' (no date)
 *   whenLine  the day and time, e.g. "Sat 18:00" or "Tomorrow 18:00" (empty when there is no date)
 *   placeLine the place, e.g. "📍 Mlimani City" (empty when there is no place)
 *   line      both in one line, e.g. "Sat 18:00 · 📍 Mlimani City" (for screen readers and small spaces)
 */
export function bannerEvent(banner, now = Date.now(), lang = 'en') {
  if (!banner) return null;
  const w = bannerWords(lang);
  const place = typeof banner.event_location === 'string' ? banner.event_location.trim() : '';
  const raw = banner.event_starts_at;
  let startsAt = null;
  if (typeof raw === 'string' && raw.trim()) {
    const ms = Date.parse(raw.trim());
    if (!Number.isNaN(ms)) startsAt = ms;
  }
  if (startsAt === null && !place) return null;
  if (startsAt !== null && now > startsAt + OVER_AFTER_MS) return null;

  if (startsAt === null) {
    return { hasDate: false, day: '', month: '', weekday: '', time: '', place, status: 'none', whenLine: '', placeLine: '📍 ' + place, line: '📍 ' + place };
  }

  const local = new Date(startsAt + TZ_OFFSET_MS);
  const day = String(local.getUTCDate());
  const month = w.months[local.getUTCMonth()];
  const weekday = w.days[local.getUTCDay()];
  const time = two(local.getUTCHours()) + ':' + two(local.getUTCMinutes());
  const daysAway = Math.floor((startsAt + TZ_OFFSET_MS) / DAY_MS) - Math.floor((now + TZ_OFFSET_MS) / DAY_MS);

  let status = 'later';
  if (now >= startsAt) status = 'now';
  else if (daysAway <= 0) status = 'today';
  else if (daysAway === 1) status = 'tomorrow';

  const parts = [];
  if (status === 'now') parts.push(w.now);
  else if (status === 'today') parts.push(w.today + ' ' + time);
  else if (status === 'tomorrow') parts.push(w.tomorrow + ' ' + time);
  else parts.push(weekday + ' ' + time);
  if (status === 'later' && daysAway > 1 && daysAway <= MAX_DAYS_AHEAD_WORD) {
    parts[0] += ' (' + w.inDays.replace('{n}', String(daysAway)) + ')';
  }
  const whenLine = parts[0];
  const placeLine = place ? '📍 ' + place : '';
  if (placeLine) parts.push(placeLine);

  return { hasDate: true, day, month, weekday, time, place, status, daysAway, whenLine, placeLine, line: parts.join(' · ') };
}
