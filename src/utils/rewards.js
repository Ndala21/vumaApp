/**
 * VUMA Store — words and numbers for coupons and the Welcome Gift.
 * One place, so the Home cards, the coupon list, the gift screen and
 * checkout always say the same thing.
 */

export const tzs = (n) => `TZS ${Math.round(Number(n) || 0).toLocaleString()}`;

// "10% (hadi TZS 3,000)" or "TZS 2,000"
export function couponValue(c) {
  if (!c) return '';
  if (c.discount_type === 'percentage') {
    const cap = c.maximum_discount ? ` (hadi ${tzs(c.maximum_discount)})` : '';
    return `${Number(c.discount_value)}%${cap}`;
  }
  return tzs(c.discount_value);
}

export function couponHeadline(c) {
  return `Punguzo la ${couponValue(c)}`;
}

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const months = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ago', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// What the Home card and strip say for the customer's gift.
//   state: open | ready | pending_payment | daily_cap  (the card is hidden in the other states)
export function giftCardCopy(g) {
  const amount = tzs(g?.amount);
  const type = g?.gift_type || 'discount';
  switch (g?.state) {
    case 'ready':
      return { subtitle: type === 'product' ? 'Zawadi yako iko tayari' : `${amount} zinakusubiri kwenye malipo`, cta: 'Itumie Sasa' };
    case 'pending_payment':
      return { subtitle: 'Maliza malipo ya oda yako', cta: 'Angalia' };
    case 'daily_cap':
      return { subtitle: 'Zawadi za leo zimeisha. Rudi kesho!', cta: 'Tazama' };
    default:
      if (type === 'wallet') return { subtitle: `Pata ${amount} kwenye pochi yako`, cta: 'Pokea Sasa' };
      if (type === 'product') return { subtitle: 'Chagua bidhaa yako ya bure', cta: 'Pokea Sasa' };
      return { subtitle: `Pata punguzo la ${amount} kwenye oda ya kwanza`, cta: 'Pokea Sasa' };
  }
}

// Swahili for the reasons the server gives (it also sends English text).
const REASONS = {
  not_new: 'Zawadi hii ni kwa wateja wapya tu.',
  needs_referral: 'Zawadi hii ni kwa wateja walioalikwa na rafiki.',
  daily_cap: 'Zawadi za leo zimeisha. Rudi kesho!',
  no_campaign: 'Hakuna zawadi kwa sasa. Rudi tena hivi karibuni.',
  needs_verification: 'Tafadhali thibitisha akaunti yako kwanza.',
  already_claimed: 'Tayari umepokea zawadi yako.',
  needs_phone: 'Weka namba yako ya simu ili kupokea zawadi.',
  bad_phone: 'Weka namba sahihi ya simu, mfano 0712345678.',
  device_used: 'Zawadi tayari imechukuliwa kwenye simu hii.',
  phone_used: 'Zawadi tayari imechukuliwa kwa namba hii ya simu.',
  ip_limit: 'Zawadi nyingi mno zimechukuliwa kutoka mtandao huu leo. Jaribu tena kesho.',
  gift_gone: 'Zawadi hii imeisha. Chagua nyingine.',
  bad_gift: 'Chagua zawadi kwanza.',
};

export function reasonText(code, fallback) {
  return REASONS[code] || fallback || 'Kuna tatizo. Jaribu tena.';
}

// Text for an error thrown by api/client.js (it rejects with
// { type, message, errors: <server data> }).
export function errorText(err) {
  if (!err) return reasonText();
  if (err.type === 'NETWORK_ERROR' || err.type === 'TIMEOUT') {
    return 'Hakuna mtandao. Angalia intaneti yako kisha ujaribu tena.';
  }
  if (err.type === 'SESSION_EXPIRED') return 'Muda wa kuingia umekwisha. Tafadhali ingia tena.';
  const data = err.errors || err.response?.data;
  return reasonText(data?.code, data?.error || err.message);
}
