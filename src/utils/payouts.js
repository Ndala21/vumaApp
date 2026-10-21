/**
 * VUMA Store - seller withdrawals (Wallet screen).
 *
 * Pure data and pure functions - no React - so they can be tested on their own.
 * The server decides every rule (minimum, balance, fee, waiting time); the app only
 * mirrors them to give a quick answer before the request is sent, and shows the
 * server's own message when it refuses.
 *
 * Text comes in English and Kiswahili. The app language 'sw' gets Kiswahili,
 * every other language gets English.
 */

export const PAYOUT_METHODS = [
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'airtel', label: 'Airtel Money' },
  { value: 'halopesa', label: 'Halopesa' },
  { value: 'tigopesa', label: 'Mixx by Yas (Tigo Pesa)' },
];

export const METHOD_LABELS = {
  mpesa: 'M-Pesa', airtel: 'Airtel Money', halopesa: 'Halopesa',
  tigopesa: 'Mixx by Yas (Tigo Pesa)', bank: 'Bank',
};

// ---- numbers ----------------------------------------------------------------

// '0652 000 111', '+255652000111', '652000111' -> '255652000111'; anything else -> null
export const normalizeTzPhone = (raw) => {
  let digits = String(raw == null ? '' : raw).replace(/\D/g, '');
  if (digits.startsWith('00255')) digits = digits.slice(2);
  let national;
  if (digits.startsWith('255')) {
    national = digits.slice(3);
    if (national.startsWith('0')) national = national.slice(1);
  } else if (digits.startsWith('0')) {
    national = digits.slice(1);
  } else {
    national = digits;
  }
  if (national.length !== 9 || (national[0] !== '6' && national[0] !== '7')) return null;
  return `255${national}`;
};

export const localPhone = (raw) => {
  const p = normalizeTzPhone(raw);
  return p ? `0${p.slice(3)}` : String(raw || '');
};

// '5,000', '5 000', '5000' -> 5000; '', 'abc', '12.5' -> null
export const parseAmount = (text) => {
  const clean = String(text == null ? '' : text).replace(/[,\s]/g, '');
  if (!/^\d+$/.test(clean)) return null;
  const n = Number(clean);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
};

// 1234567 -> '1,234,567'
export const groupDigits = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export const tsh = (n) => `TSh ${groupDigits(n)}`;

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Same arithmetic as the server: fee = flat + percent of the amount, rounded UP to a whole shilling.
export const feeAndNet = (amount, summary) => {
  const flat = num(summary && summary.fee_flat);
  const pct = num(summary && summary.fee_percent);
  const fee = Math.ceil(flat + (amount * pct) / 100 - 1e-9);
  const net = summary && summary.fee_paid_by === 'seller' ? amount - fee : amount;
  return { fee, net };
};

// A quick check before asking the server. Returns a code or null. The server has the last word.
export const checkAmount = (amount, summary) => {
  if (amount == null) return 'bad_amount';
  if (!summary) return null;
  if (amount < num(summary.min_amount)) return 'below_min';
  if (amount > num(summary.max_amount)) return 'above_max';
  if (amount > num(summary.available)) return 'insufficient';
  const { net } = feeAndNet(amount, summary);
  if (net <= 0) return 'below_fee';
  return null;
};

// ---- text -------------------------------------------------------------------

const TEXT = {
  en: {
    withdraw: 'Withdraw',
    withdrawTitle: 'Withdraw money',
    available: 'Available to withdraw',
    onHold: 'On hold',
    inProgress: 'In progress',
    totalEarned: 'Total earned',
    paidOut: 'Paid out',
    holdNote: 'Money from an order is held for 7 days after delivery. Then you can withdraw it.',
    goesTo: 'Money goes to',
    change: 'Change',
    setUp: 'Set up',
    amount: 'Amount (TSh)',
    all: 'All',
    limits: 'Smallest TSh {min}, largest TSh {max}',
    fee: 'Transfer fee',
    youReceive: 'You receive',
    submit: 'Withdraw {amount}',
    sending: 'Sending your request...',
    noticeAdmin: 'The VUMA team checks the request and sends the money. You get a message when it is paid.',
    noticeAuto: 'The money is sent to your phone within a few minutes.',
    noticeBank: 'Bank payouts are sent by VUMA by hand in 1 to 2 working days.',
    doneTitle: 'Request received',
    doneText: 'Request number {ref}. We will tell you when the money is sent.',
    close: 'Close',
    accountTitle: 'Where do you want to receive money?',
    method: 'Mobile money network',
    phone: 'Phone number',
    phoneHint: 'For example 0652 000 111',
    name: 'Name registered on that number',
    save: 'Save',
    saving: 'Saving...',
    back: 'Back',
    accountWarn: 'If you change this, you can withdraw again after {hours} hours. This keeps your money safe.',
    phoneBad: 'Enter a valid Tanzanian mobile number, for example 0652 000 111.',
    nameBad: 'Enter the name registered on that number.',
    history: 'Withdrawals',
    empty: 'No withdrawals yet.',
    cancel: 'Cancel request',
    cancelAsk: 'Cancel this withdrawal?',
    yes: 'Yes, cancel',
    no: 'No',
    reason: 'Reason',
    receive: 'You receive',
    loadFail: 'Could not load your wallet. Pull down to try again.',
    netFail: 'Could not reach the server. Check your internet and try again.',
    err_bad_amount: 'Enter the amount as a whole number.',
    err_below_min: 'The smallest withdrawal is TSh {min}.',
    err_above_max: 'The largest single withdrawal is TSh {max}.',
    err_insufficient: 'You can withdraw up to TSh {available} now.',
    err_below_fee: 'This amount is smaller than the transfer fee.',
    err_open_exists: 'You already have a withdrawal in progress.',
    err_no_destination: 'Set up where to receive your money first.',
    err_paused: 'Withdrawals are paused for a short while. Please try again later.',
    err_cooldown: 'You changed where your money goes. For your safety, please wait a little before withdrawing.',
    err_not_allowed: 'Your shop cannot withdraw money right now.',
    status_pending: 'Waiting for approval',
    status_processing: 'Being sent',
    status_review: 'Being checked',
    status_paid: 'Paid',
    status_failed: 'Failed',
    status_cancelled: 'Cancelled',
  },
  sw: {
    withdraw: 'Toa pesa',
    withdrawTitle: 'Toa pesa',
    available: 'Unaweza kutoa sasa',
    onHold: 'Zimeshikiliwa',
    inProgress: 'Zinashughulikiwa',
    totalEarned: 'Jumla ya mapato',
    paidOut: 'Ulizokwisha pokea',
    holdNote: 'Pesa za oda hushikiliwa siku 7 baada ya oda kufikishwa. Kisha unaweza kuzitoa.',
    goesTo: 'Pesa zinaenda kwa',
    change: 'Badilisha',
    setUp: 'Weka',
    amount: 'Kiasi (TSh)',
    all: 'Zote',
    limits: 'Kiwango cha chini TSh {min}, cha juu TSh {max}',
    fee: 'Ada ya kutuma',
    youReceive: 'Utapokea',
    submit: 'Toa {amount}',
    sending: 'Inatuma ombi lako...',
    noticeAdmin: 'Timu ya VUMA itakagua ombi na kutuma pesa. Utapata ujumbe pesa zikitumwa.',
    noticeAuto: 'Pesa zitatumwa kwenye simu yako ndani ya dakika chache.',
    noticeBank: 'Malipo ya benki hutumwa na VUMA ndani ya siku 1 hadi 2 za kazi.',
    doneTitle: 'Ombi limepokelewa',
    doneText: 'Namba ya ombi {ref}. Tutakujulisha pesa zikitumwa.',
    close: 'Funga',
    accountTitle: 'Unataka kupokea pesa wapi?',
    method: 'Mtandao wa pesa kwa simu',
    phone: 'Namba ya simu',
    phoneHint: 'Kwa mfano 0652 000 111',
    name: 'Jina lililosajiliwa kwenye namba hiyo',
    save: 'Hifadhi',
    saving: 'Inahifadhi...',
    back: 'Rudi',
    accountWarn: 'Ukibadilisha hapa, utaweza kutoa pesa tena baada ya saa {hours}. Hii inalinda pesa zako.',
    phoneBad: 'Weka namba sahihi ya simu ya Tanzania, kwa mfano 0652 000 111.',
    nameBad: 'Weka jina lililosajiliwa kwenye namba hiyo.',
    history: 'Maombi ya kutoa pesa',
    empty: 'Bado hujaomba kutoa pesa.',
    cancel: 'Ghairi ombi',
    cancelAsk: 'Ghairi ombi hili?',
    yes: 'Ndiyo, ghairi',
    no: 'Hapana',
    reason: 'Sababu',
    receive: 'Utapokea',
    loadFail: 'Imeshindikana kupakia pochi yako. Vuta chini ujaribu tena.',
    netFail: 'Imeshindikana kufikia seva. Angalia intaneti ujaribu tena.',
    err_bad_amount: 'Weka kiasi kama namba nzima.',
    err_below_min: 'Kiwango cha chini cha kutoa ni TSh {min}.',
    err_above_max: 'Kiwango cha juu cha mara moja ni TSh {max}.',
    err_insufficient: 'Unaweza kutoa hadi TSh {available} sasa.',
    err_below_fee: 'Kiasi hiki ni kidogo kuliko ada ya kutuma.',
    err_open_exists: 'Una ombi lingine linaloendelea.',
    err_no_destination: 'Weka kwanza unapotaka kupokea pesa zako.',
    err_paused: 'Utoaji wa pesa umesimamishwa kwa muda mfupi. Jaribu tena baadaye.',
    err_cooldown: 'Ulibadilisha unapopokea pesa. Kwa usalama wako, subiri kidogo kabla ya kutoa.',
    err_not_allowed: 'Duka lako haliwezi kutoa pesa kwa sasa.',
    status_pending: 'Linasubiri idhini',
    status_processing: 'Linatumwa',
    status_review: 'Linakaguliwa',
    status_paid: 'Limelipwa',
    status_failed: 'Limeshindikana',
    status_cancelled: 'Limeghairiwa',
  },
};

const fill = (text, vars) => String(text).replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null ? vars[k] : m));

// lang: the app language code ('sw' = Kiswahili, anything else = English)
export const tx = (lang, key, vars) => {
  const dict = lang === 'sw' ? TEXT.sw : TEXT.en;
  return fill(dict[key] != null ? dict[key] : (TEXT.en[key] != null ? TEXT.en[key] : key), vars);
};

export const STATUS_STYLE = {
  pending: { bg: '#FFF3CD', fg: '#8A6D00' },
  processing: { bg: '#E8F3FF', fg: '#2563EB' },
  review: { bg: '#E8F3FF', fg: '#2563EB' },
  paid: { bg: '#E4F7EC', fg: '#1B9C5A' },
  failed: { bg: '#FDE8EA', fg: '#D32F2F' },
  cancelled: { bg: '#EEEEEE', fg: '#666666' },
};

export const statusLabel = (lang, status) => tx(lang, `status_${status}`);

// What the seller reads when the server says no. Swahili uses the server's code; English keeps the
// server's own sentence (it already names the real numbers).
export const errorText = (lang, err, summary) => {
  if (err && err.type === 'NETWORK_ERROR') return tx(lang, 'netFail');
  const code = err && err.errors && err.errors.code;
  const vars = {
    min: groupDigits(summary && summary.min_amount),
    max: groupDigits(summary && summary.max_amount),
    available: groupDigits(summary && summary.available),
  };
  if (lang === 'sw' && code && TEXT.sw[`err_${code}`]) return tx(lang, `err_${code}`, vars);
  if (err && err.message) return err.message;
  return tx(lang, 'netFail');
};

// The sentence for a quick-check code (checkAmount), in the app language.
export const quickErrorText = (lang, code, summary) => {
  if (!code) return '';
  const vars = {
    min: groupDigits(summary && summary.min_amount),
    max: groupDigits(summary && summary.max_amount),
    available: groupDigits(summary && summary.available),
  };
  const key = `err_${code}`;
  return TEXT[lang] && TEXT[lang][key] ? tx(lang, key, vars) : tx('en', key, vars);
};

// The reason the Withdraw button is off, in the app language (the server sends English).
export const reasonText = (lang, summary) => {
  if (!summary || summary.can_request) return '';
  const code = summary.reason_code;
  const vars = {
    min: groupDigits(summary.min_amount), max: groupDigits(summary.max_amount),
    available: groupDigits(summary.available),
  };
  if (lang === 'sw' && code && TEXT.sw[`err_${code}`]) return tx(lang, `err_${code}`, vars);
  return summary.reason || '';
};
