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
    comingLabel: 'Coming after pickup',
    ruleAtPickup: 'Your money is calculated and credited when the VUMA rider collects the parcel from you. You can withdraw it {wait}.',
    ruleAtDelivery: 'Your money is calculated and credited when the customer receives the parcel. You can withdraw it {wait}.',
    waitNow: 'at once',
    waitDays1: 'after 1 day',
    waitDaysN: 'after {n} days',
    owesNote: 'You owe VUMA TSh {amount} because a parcel came back. It is taken from your next sales automatically.',
    salesTitle: 'Your sales - exact amounts',
    salesEmpty: 'No sales yet.',
    salesMore: 'Show more',
    salesFail: 'Could not load your sales. Pull down to try again.',
    money_waiting: 'Waiting for pickup',
    money_on_hold: 'On hold until {date}',
    money_on_hold_soon: 'On hold - released soon',
    money_on_hold_nodate: 'On hold',
    money_released: 'Ready to withdraw',
    money_reversed: 'Taken back',
    money_mixed: 'Part paid',
    sumItems: 'Your items',
    sumFee: 'VUMA fee',
    sumPay: 'Payment cost',
    sumNet: 'You receive',
    today: 'today',
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
    comingLabel: 'Zinakuja baada ya kuchukuliwa',
    ruleAtPickup: 'Pesa zako huhesabiwa na kuwekwa dereva wa VUMA anapochukua kifurushi kwako. Unaweza kuzitoa {wait}.',
    ruleAtDelivery: 'Pesa zako huhesabiwa na kuwekwa mteja anapopokea kifurushi. Unaweza kuzitoa {wait}.',
    waitNow: 'mara moja',
    waitDays1: 'baada ya siku 1',
    waitDaysN: 'baada ya siku {n}',
    owesNote: 'Unadaiwa na VUMA TSh {amount} kwa sababu kifurushi kilirudi. Zitakatwa kwenye mauzo yako yajayo moja kwa moja.',
    salesTitle: 'Mauzo yako - kiasi kamili',
    salesEmpty: 'Bado hakuna mauzo.',
    salesMore: 'Onyesha zaidi',
    salesFail: 'Imeshindikana kupakia mauzo yako. Vuta chini ujaribu tena.',
    money_waiting: 'Inasubiri kuchukuliwa',
    money_on_hold: 'Imeshikiliwa hadi {date}',
    money_on_hold_soon: 'Imeshikiliwa - itaachiliwa hivi karibuni',
    money_on_hold_nodate: 'Imeshikiliwa',
    money_released: 'Tayari kutoa',
    money_reversed: 'Imerudishwa',
    money_mixed: 'Imelipwa kwa sehemu',
    sumItems: 'Bidhaa zako',
    sumFee: 'Ada ya VUMA',
    sumPay: 'Gharama ya malipo',
    sumNet: 'Unapokea',
    today: 'leo',
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

// ---- the exact money (P53) ---------------------------------------------------

// The rule in one sentence, from what the server says (earn_at: 'pickup' | 'delivery', hold_days).
// Returns '' when the server did not send the rule (an older server): the screen keeps its old note.
export const holdRule = (lang, info) => {
  if (!info || (info.earn_at !== 'pickup' && info.earn_at !== 'delivery')) return '';
  const days = Math.max(0, Math.round(num(info.hold_days)));
  const wait = days === 0 ? tx(lang, 'waitNow') : days === 1 ? tx(lang, 'waitDays1') : tx(lang, 'waitDaysN', { n: days });
  return tx(lang, info.earn_at === 'pickup' ? 'ruleAtPickup' : 'ruleAtDelivery', { wait });
};

const MONTHS = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  sw: ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ago', 'Sep', 'Okt', 'Nov', 'Des'],
};
const two = (n) => (n < 10 ? `0${n}` : String(n));

// '2026-10-29T08:00:00Z' -> 'today 11:00' or '29 Oct, 11:00' (the phone's own time). '' if it is not a date.
export const whenText = (lang, iso, now = new Date()) => {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return '';
  const n = now instanceof Date ? now : new Date(now);
  const clock = `${two(d.getHours())}:${two(d.getMinutes())}`;
  if (d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()) {
    return `${tx(lang, 'today')} ${clock}`;
  }
  return `${d.getDate()} ${(lang === 'sw' ? MONTHS.sw : MONTHS.en)[d.getMonth()]}, ${clock}`;
};

// Where a sale's money is: 'waiting' | 'on_hold' | 'released' | 'reversed' | 'mixed'
export const moneyStateText = (lang, state, releasesAt, now = new Date()) => {
  if (state === 'on_hold') {
    const when = whenText(lang, releasesAt, now);
    if (!when) return tx(lang, 'money_on_hold_nodate');
    const d = new Date(releasesAt);
    const n = now instanceof Date ? now : new Date(now);
    if (d.getTime() <= n.getTime()) return tx(lang, 'money_on_hold_soon');
    return tx(lang, 'money_on_hold', { date: when });
  }
  const key = `money_${state}`;
  return TEXT.en[key] != null ? tx(lang, key) : '';
};

export const MONEY_STYLE = {
  waiting: { bg: '#EEF2F7', fg: '#475569', icon: '\u25D4' },
  on_hold: { bg: '#FFF3CD', fg: '#8A6D00', icon: '\u23F3' },
  released: { bg: '#E4F7EC', fg: '#1B9C5A', icon: '\u2713' },
  reversed: { bg: '#FDE8EA', fg: '#D32F2F', icon: '\u21A9' },
  mixed: { bg: '#E8F3FF', fg: '#2563EB', icon: '\u25D1' },
};

// 'Your items TSh 10,000 - VUMA fee TSh 800 - Payment cost TSh 90 = TSh 9,110'
// (the payment cost part only shows when there is one). parts: { sale, fee, pay, net } as numbers or numeric text.
export const formulaText = (lang, parts) => {
  if (!parts) return '';
  const fee = num(parts.fee);
  const pay = num(parts.pay);
  let out = `${tx(lang, 'sumItems')} ${tsh(parts.sale)} - ${tx(lang, 'sumFee')} ${tsh(fee)}`;
  if (pay > 0) out += ` - ${tx(lang, 'sumPay')} ${tsh(pay)}`;
  return `${out} = ${tsh(parts.net)}`;
};

// The same for one order as the server sends it to the seller (seller_subtotal, seller_fee, seller_payment_fee,
// seller_earnings). '' for an older server that does not send the fee.
export const orderFormula = (lang, order) => {
  if (!order || order.seller_fee === undefined || order.seller_fee === null || order.seller_fee === '') return '';
  return formulaText(lang, {
    sale: order.seller_subtotal, fee: order.seller_fee, pay: order.seller_payment_fee, net: order.seller_earnings,
  });
};

// One line of the statement from the server: { sale, commission, payment_fee, net, ... }
export const lineFormula = (lang, line) => formulaText(lang, {
  sale: line && line.sale, fee: line && line.commission, pay: line && line.payment_fee, net: line && line.net,
});

// The note under an order: where the money of this order is. '' when the server sent nothing.
export const orderMoneyText = (lang, order, now = new Date()) => {
  const m = order && order.seller_money;
  if (!m || !m.state) return '';
  return moneyStateText(lang, m.state, m.releases_at, now);
};
