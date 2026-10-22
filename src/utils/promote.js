/**
 * VUMA Store - "Promote products" text and small helpers.
 *
 * Pure data and pure functions (no React), so they can be tested on their own.
 * English and Kiswahili: the app language 'sw' gets Kiswahili, every other
 * language gets English (same rule as the seller home and Wallet screens).
 */

const TEXT = {
  en: {
    title: 'Promote products',
    heroTitle: 'Be seen first',
    heroPrice: '{price} for {days} days',
    benefit1: 'Your products show first on Home and in product lists',
    benefit2: 'They carry the word Sponsored, so customers notice them',
    benefit3: 'Up to {max} products. Change them any time',
    startBtn: 'Promote products',
    myPromos: 'My promotions',
    emptyPromos: 'You have not promoted any products yet.',
    loadFail: 'Could not load your promotions. Check your internet and try again.',
    retry: 'Try again',
    netFail: 'No internet connection. Try again.',
    generic: 'Something went wrong. Please try again.',

    st_active: 'Running',
    st_scheduled: 'Starts {date}',
    st_confirming: 'Confirming payment',
    st_draft: 'Not paid yet',
    st_failed: 'Payment not completed',
    st_expired: 'Ended',
    daysLeft: '{n} days left, until {date}',
    daysLeftOne: '1 day left, until {date}',
    lastDay: 'Ends today',
    startsOn: 'Starts {start}, ends {end}',
    endedOn: 'Ended {date}',
    productsLine: '{names}',
    moreProducts: '+{n} more',
    confirmingNote: 'We are waiting for your payment to be confirmed. The promotion starts by itself once it is.',
    changeProducts: 'Change products',
    add30: 'Add {days} days',
    add30Info: 'Adds {days} days after the current ones end.',
    renew: 'Renew',
    payBtn: 'Pay {price}',
    tryAgain: 'Try again',
    remove: 'Remove',
    keep: 'Keep',
    removeAsk: 'Remove this promotion?',
    removeText: 'It has not been paid, so nothing is lost.',
    checkNow: 'Check now',
    checking: 'Checking…',
    notYet: 'Not confirmed yet. Please wait a little and check again.',

    selectTitle: 'Choose products',
    search: 'Search your products',
    selectedCount: '{n} of {max} selected',
    selectAll: 'Select all',
    clearAll: 'Clear',
    noPicture: 'No picture',
    soldOut: 'Sold out',
    alreadyPromoted: 'Already promoted until {date}',
    continueBtn: 'Continue ({n})',
    saveChanges: 'Save changes',
    saving: 'Saving…',
    noProducts: 'You have no active products yet. Add a product first.',
    noMatch: 'No product matches “{q}”.',
    pictureWarn: 'Products without a picture do not appear in the Sponsored row. Add pictures first for the best result.',
    saved: 'Saved. This promotion now covers {n} products.',
    saved_one: 'Saved. This promotion now covers 1 product.',

    reviewTitle: 'Review and pay',
    yourProducts: '{n} products',
    yourProducts_one: '1 product',
    amountLabel: 'Amount to pay',
    forDays: 'for {days} days',
    startsToday: 'Starts today, ends {date}',
    startsAfter: 'Starts {start} (after your current promotion), ends {end}',
    payWith: 'Pay with',
    phoneLabel: 'Phone number',
    phoneHint: '712 345 678',
    phoneBad: 'Enter your 9-digit phone number, for example 712 345 678.',
    payNote: 'You will get a prompt on this phone. Enter your PIN to approve. The promotion starts when the payment is confirmed. Press Pay only once.',
    paying: 'Sending…',

    waitTitle: 'Waiting for confirmation…',
    waitSub: 'Check your phone and enter your PIN. This can take up to a minute.',
    waitLong: 'Still waiting. You can close this screen: the promotion starts by itself as soon as the payment is confirmed.',
    closeLater: 'Close and check later',
    failTitle: 'Payment not completed',
    failBody: 'We did not get a confirmation of your payment. If you approved it, wait a few minutes: it may still switch on. Otherwise try again.',

    doneTitle: 'Your promotion is live!',
    doneSub: '{n} products show first until {date}.',
    doneSub_one: 'Your product shows first until {date}.',
    doneBtn: 'Done',

    err_payment_in_progress: 'A payment request was just sent to your phone. Approve it with your PIN, or wait a few minutes before trying again.',
    err_already_promoted: 'Some of these products are already promoted: {names}. Take them out of this selection.',
    err_too_many: 'You can promote up to {max} products.',
    err_no_products: 'Choose at least one product.',
    err_ended: 'This promotion has ended. Start a new one.',
    err_paid: 'This promotion is already paid.',
  },
  sw: {
    title: 'Tangaza bidhaa',
    heroTitle: 'Onekana kwanza',
    heroPrice: '{price} kwa siku {days}',
    benefit1: 'Bidhaa zako zinaonekana kwanza kwenye Nyumbani na kwenye orodha za bidhaa',
    benefit2: 'Zinaonyeshwa na neno Sponsored ili wateja wazione',
    benefit3: 'Hadi bidhaa {max}. Unaweza kuzibadilisha wakati wowote',
    startBtn: 'Tangaza bidhaa',
    myPromos: 'Matangazo yangu',
    emptyPromos: 'Bado hujatangaza bidhaa yoyote.',
    loadFail: 'Imeshindikana kupakia matangazo yako. Angalia intaneti ujaribu tena.',
    retry: 'Jaribu tena',
    netFail: 'Hakuna intaneti. Jaribu tena.',
    generic: 'Kuna tatizo. Tafadhali jaribu tena.',

    st_active: 'Linaendelea',
    st_scheduled: 'Litaanza {date}',
    st_confirming: 'Tunahakiki malipo',
    st_draft: 'Halijalipiwa',
    st_failed: 'Malipo hayajakamilika',
    st_expired: 'Limeisha',
    daysLeft: 'Siku {n} zimebaki, hadi {date}',
    daysLeftOne: 'Siku 1 imebaki, hadi {date}',
    lastDay: 'Linaisha leo',
    startsOn: 'Litaanza {start}, litaisha {end}',
    endedOn: 'Liliisha {date}',
    productsLine: '{names}',
    moreProducts: '+{n} nyingine',
    confirmingNote: 'Tunasubiri malipo yako yathibitishwe. Tangazo litaanza lenyewe yakithibitishwa.',
    changeProducts: 'Badilisha bidhaa',
    add30: 'Ongeza siku {days}',
    add30Info: 'Linaongeza siku {days} baada ya zile za sasa kuisha.',
    renew: 'Tangaza tena',
    payBtn: 'Lipa {price}',
    tryAgain: 'Jaribu tena',
    remove: 'Futa',
    keep: 'Liache',
    removeAsk: 'Unataka kufuta tangazo hili?',
    removeText: 'Halijalipiwa, kwa hiyo hakuna kinachopotea.',
    checkNow: 'Hakiki sasa',
    checking: 'Inahakiki…',
    notYet: 'Bado haijathibitishwa. Subiri kidogo kisha uhakiki tena.',

    selectTitle: 'Chagua bidhaa',
    search: 'Tafuta bidhaa zako',
    selectedCount: '{n} kati ya {max} zimechaguliwa',
    selectAll: 'Chagua zote',
    clearAll: 'Futa chaguo',
    noPicture: 'Haina picha',
    soldOut: 'Zimeisha stoo',
    alreadyPromoted: 'Tayari inatangazwa hadi {date}',
    continueBtn: 'Endelea ({n})',
    saveChanges: 'Hifadhi mabadiliko',
    saving: 'Inahifadhi…',
    noProducts: 'Bado huna bidhaa zinazoonekana. Weka bidhaa kwanza.',
    noMatch: 'Hakuna bidhaa inayolingana na “{q}”.',
    pictureWarn: 'Bidhaa zisizo na picha hazionekani kwenye safu ya Sponsored. Weka picha kwanza upate matokeo bora.',
    saved: 'Imehifadhiwa. Tangazo hili sasa lina bidhaa {n}.',
    saved_one: 'Imehifadhiwa. Tangazo hili sasa lina bidhaa 1.',

    reviewTitle: 'Hakiki na ulipe',
    yourProducts: 'Bidhaa {n}',
    yourProducts_one: 'Bidhaa 1',
    amountLabel: 'Kiasi cha kulipa',
    forDays: 'kwa siku {days}',
    startsToday: 'Linaanza leo, linaisha {date}',
    startsAfter: 'Linaanza {start} (baada ya tangazo la sasa), linaisha {end}',
    payWith: 'Lipa kwa',
    phoneLabel: 'Namba ya simu',
    phoneHint: '712 345 678',
    phoneBad: 'Weka namba yako ya simu ya tarakimu 9, mfano 712 345 678.',
    payNote: 'Utapata ujumbe kwenye simu hii. Weka PIN yako kuthibitisha. Tangazo litaanza malipo yakithibitishwa. Bonyeza Lipa mara moja tu.',
    paying: 'Inatuma…',

    waitTitle: 'Tunasubiri uthibitisho…',
    waitSub: 'Angalia simu yako uweke PIN. Inaweza kuchukua hadi dakika moja.',
    waitLong: 'Bado tunasubiri. Unaweza kufunga skrini hii: tangazo litaanza lenyewe malipo yakithibitishwa.',
    closeLater: 'Funga, nitaangalia baadaye',
    failTitle: 'Malipo hayajakamilika',
    failBody: 'Hatukupata uthibitisho wa malipo yako. Kama ulithibitisha, subiri dakika chache: linaweza kuanza. Vinginevyo jaribu tena.',

    doneTitle: 'Tangazo lako limeanza!',
    doneSub: 'Bidhaa {n} zinaonekana kwanza hadi {date}.',
    doneSub_one: 'Bidhaa 1 inaonekana kwanza hadi {date}.',
    doneBtn: 'Sawa',

    err_payment_in_progress: 'Ombi la malipo limetumwa kwenye simu yako. Thibitisha kwa PIN, au subiri dakika chache kabla ya kujaribu tena.',
    err_already_promoted: 'Baadhi ya bidhaa tayari zinatangazwa: {names}. Ziondoe kwenye chaguo hili.',
    err_too_many: 'Unaweza kutangaza hadi bidhaa {max}.',
    err_no_products: 'Chagua angalau bidhaa moja.',
    err_ended: 'Tangazo hili limeisha. Anza jipya.',
    err_paid: 'Tangazo hili limeshalipiwa.',
  },
};

const fill = (text, vars) => String(text).replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null ? vars[k] : m));

// The app language 'sw...' gets Kiswahili, everything else English.
export const promoLang = (locale) => (String(locale || '').toLowerCase().startsWith('sw') ? 'sw' : 'en');

// A line can have a singular twin named key_one, used when the count n is exactly 1.
export const px = (lang, key, vars) => {
  const dict = lang === 'sw' ? TEXT.sw : TEXT.en;
  const k = vars && vars.n === 1 && `${key}_one` in TEXT.en ? `${key}_one` : key;
  const text = dict[k] != null ? dict[k] : TEXT.en[k];
  return text == null ? key : fill(text, vars);
};

// ── dates ───────────────────────────────────────────────
const MONTHS = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  sw: ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ago', 'Sep', 'Okt', 'Nov', 'Des'],
};

// 'YYYY-MM-DD' (what the server sends) or a Date -> '21 Nov 2026'
export const fmtDate = (value, lang) => {
  if (!value) return '';
  let y, m, d;
  if (value instanceof Date) {
    y = value.getFullYear(); m = value.getMonth(); d = value.getDate();
  } else {
    const parts = String(value).slice(0, 10).split('-').map(Number);
    if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return String(value);
    [y, m, d] = parts; m -= 1;
  }
  const names = lang === 'sw' ? MONTHS.sw : MONTHS.en;
  return `${d} ${names[m]} ${y}`;
};

export const addDays = (date, n) => {
  const out = new Date(date.getTime());
  out.setDate(out.getDate() + n);
  return out;
};

// Where a new promotion would start and end, for the review screen.
// parent = the promotion it carries on from (only when that one is still running).
export const planDates = (now, days, parent) => {
  const runningUntil = parent && parent.effective_status === 'active' && parent.end_date ? parent.end_date : null;
  if (runningUntil) {
    const [y, m, d] = runningUntil.split('-').map(Number);
    const start = new Date(y, m - 1, d);
    return { start, end: addDays(start, days), after: true };
  }
  return { start: now, end: addDays(now, days), after: false };
};

// ── phone ───────────────────────────────────────────────
// What the seller typed or has on file -> the 9 digits after +255 (no leading 0)
export const phoneDigits = (raw) => {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('255') && d.length > 9) d = d.slice(3);
  if (d.startsWith('0')) d = d.slice(1);
  return d.slice(0, 9);
};
export const phoneOk = (digits) => /^[67]\d{8}$/.test(String(digits || ''));
export const phoneShown = (digits) => {
  const d = String(digits || '');
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter(Boolean).join(' ');
};

// A first guess at the mobile money company from the number. The seller can always change it.
const PREFIXES = [
  ['mpesa', ['74', '75', '76']],
  ['airtel', ['68', '69', '78']],
  ['tigopesa', ['65', '67', '71', '77']],
  ['halopesa', ['61', '62']],
];
export const guessProvider = (digits) => {
  const d = String(digits || '');
  if (d.length < 2) return null;
  const two = d.slice(0, 2);
  for (const [provider, list] of PREFIXES) if (list.includes(two)) return provider;
  return null;
};

// ── products ────────────────────────────────────────────
export const isListable = (p) => !!p && (p.status == null || p.status === 'active');
export const hasNoPicture = (p) => !!p && 'primary_image' in p && !p.primary_image;
export const isSoldOut = (p) => !!p && p.stock != null && Number(p.stock) <= 0;

export const filterProducts = (products, query) => {
  const q = String(query || '').trim().toLowerCase();
  const list = (products || []).filter(isListable);
  return q ? list.filter((p) => String(p.name || '').toLowerCase().includes(q)) : list;
};

// promoted: { [productId]: 'YYYY-MM-DD' } for products already paid for elsewhere
export const rowNotes = (p, promoted, lang) => {
  const notes = [];
  const until = promoted && promoted[String(p.id)];
  if (until) notes.push(px(lang, 'alreadyPromoted', { date: fmtDate(until, lang) }));
  if (hasNoPicture(p)) notes.push(px(lang, 'noPicture'));
  if (isSoldOut(p)) notes.push(px(lang, 'soldOut'));
  return { blocked: !!until, notes };
};

export const sameSet = (a, b) => {
  const x = (a || []).map(String).sort();
  const y = (b || []).map(String).sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
};

// Select all: every product that can be chosen, up to the limit, keeping what is already chosen first.
export const selectAllIds = (visible, promoted, chosen, max) => {
  const out = [...chosen];
  for (const p of visible) {
    if (out.length >= max) break;
    if ((promoted && promoted[String(p.id)]) || out.includes(p.id)) continue;
    out.push(p.id);
  }
  return out;
};

// ── what a promotion card says ──────────────────────────
// tone: good (running), wait (needs the seller or a payment), bad (problem), quiet (over)
export const statusView = (promo, lang) => {
  const s = promo.effective_status || 'draft';
  const tone = { active: 'good', scheduled: 'good', confirming: 'wait', draft: 'wait', failed: 'bad', expired: 'quiet' }[s] || 'quiet';
  const text = s === 'scheduled'
    ? px(lang, 'st_scheduled', { date: fmtDate(promo.start_date, lang) })
    : px(lang, `st_${s}`);
  return { text, tone };
};

export const timeLine = (promo, lang) => {
  const s = promo.effective_status;
  if (s === 'active') {
    const n = Number(promo.remaining_days) || 0;
    const date = fmtDate(promo.end_date, lang);
    if (n <= 0) return px(lang, 'lastDay');
    return px(lang, n === 1 ? 'daysLeftOne' : 'daysLeft', { n, date });
  }
  if (s === 'scheduled') return px(lang, 'startsOn', { start: fmtDate(promo.start_date, lang), end: fmtDate(promo.end_date, lang) });
  if (s === 'expired') return promo.end_date ? px(lang, 'endedOn', { date: fmtDate(promo.end_date, lang) }) : '';
  return '';
};

export const productsLine = (promo, lang) => {
  const names = (promo.product_names || []).join(', ');
  const extra = (Number(promo.product_count) || 0) - (promo.product_names || []).length;
  return extra > 0 ? `${names} ${px(lang, 'moreProducts', { n: extra })}` : names;
};

// What the seller reads when the server says no. Kiswahili uses the server's code; English keeps
// the server's own sentence (it already names the real products and numbers).
export const errorText = (lang, err, max) => {
  if (err && err.type === 'NETWORK_ERROR') return px(lang, 'netFail');
  if (err && err.type === 'TIMEOUT') return px(lang, 'netFail');
  const body = (err && err.errors) || {};
  // the app's client keeps the server body only for 400/403/404; a 409 always means "payment in progress"
  const code = body.code || (err && err.status === 409 ? 'payment_in_progress' : undefined);
  if (lang === 'sw' && code && `err_${code}` in TEXT.sw) {
    const names = (body.products || []).map((x) => x.name).join(', ');
    return px(lang, `err_${code}`, { names, max });
  }
  if (err && err.message && err.type !== 'SERVER_ERROR') return err.message;
  return px(lang, 'generic');
};
