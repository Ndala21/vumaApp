/**
 * VUMA Store - what the customer reads about gift money, refunds and the delivery code.
 * Small plain functions so the wallet screen, the order page and the tests all use the same rules.
 */

import { t, i18n } from '../i18n';
import { formatPrice } from './helpers';

const DAY = 86400000;

// The server warns by message 7 days before gift money ends (a setting on the admin Rules tab).
// The app only needs to know when to colour a date, so it uses the same default.
export const WARN_DAYS = 7;

// A parcel code can be asked for while the parcel is on its way (same list as the server).
export const CODE_STATUSES = ['picked_up', 'in_transit', 'at_pickup_point'];

const REFUND_ORDER_STATUSES = ['cancelled', 'rejected', 'returned', 'refunded'];
const ON_THE_WAY_STATUSES = ['processing', 'ready_for_pickup', 'picked_up', 'shipped', 'in_transit', 'out_for_delivery'];

const MONTHS = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  sw: ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ago', 'Sep', 'Okt', 'Nov', 'Des'],
};

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const isSwahili = () => String(i18n.getLocale() || '').toLowerCase().startsWith('sw');

/** '2027-04-22T18:30:00Z' -> '22 Apr 2027' (empty when there is no date) */
export function fmtDay(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const names = MONTHS[isSwahili() ? 'sw' : 'en'];
  return d.getDate() + ' ' + names[d.getMonth()] + ' ' + d.getFullYear();
}

/** Whole days left until `iso`. 0 = ends today (or the end has passed). null = no end date. */
export function daysLeft(iso, now = new Date()) {
  if (!iso) return null;
  const end = new Date(iso);
  if (isNaN(end.getTime())) return null;
  const ms = end.getTime() - now.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / DAY);
}

/** 'Ends today' / '1 day left' / '5 days left' */
export function daysLeftText(days) {
  if (days === null || days === undefined) return t('wallet.noEnd');
  if (days <= 0) return t('wallet.endsToday');
  if (days === 1) return t('wallet.dayLeft');
  return t('wallet.daysLeft', { n: days });
}

/** What a gift lot came from, in words the customer knows. */
export function lotSourceLabel(source) {
  const key = {
    welcome_gift: 'wallet.srcWelcome',
    referral: 'wallet.srcReferral',
    campaign: 'wallet.srcCampaign',
    refund: 'wallet.srcRefund',
    adjustment: 'wallet.srcAdjustment',
  }[source] || 'wallet.srcOther';
  return t(key);
}

/** The gift money that can still be spent, soonest-ending first. Anything empty is left out. */
export function giftLots(wallet, now = new Date()) {
  const rows = Array.isArray(wallet && wallet.gift_lots) ? wallet.gift_lots : [];
  return rows
    .map((lot) => {
      const days = daysLeft(lot.ends_at, now);
      return {
        id: String(lot.id),
        source: lot.source,
        label: lotSourceLabel(lot.source),
        left: num(lot.remaining),
        amount: num(lot.amount),
        endsAt: lot.ends_at || null,
        endsText: lot.ends_at ? fmtDay(lot.ends_at) : t('wallet.noEnd'),
        days,
        soon: days !== null && days <= WARN_DAYS,
      };
    })
    .filter((lot) => lot.left > 0)
    .sort((a, b) => {
      if (a.endsAt && b.endsAt) return new Date(a.endsAt) - new Date(b.endsAt);
      if (a.endsAt) return -1;
      if (b.endsAt) return 1;
      return 0;
    });
}

/** The first gift money to end: { amount, endsText, days, soon, line } or null. */
export function nextEnding(wallet, now = new Date()) {
  const next = wallet && wallet.next_gift_expiry;
  if (!next || !next.ends_at) return null;
  const amount = num(next.amount);
  if (amount <= 0) return null;
  const days = daysLeft(next.ends_at, now);
  const endsText = fmtDay(next.ends_at);
  return {
    amount,
    endsText,
    days,
    soon: days !== null && days <= WARN_DAYS,
    line: t('wallet.nextEnds', { amount: formatPrice(amount), date: endsText }) + ' (' + daysLeftText(days) + ')',
  };
}

// ---------------------------------------------------------------- refunds

/** { label, tone } for a refund status. tone: done | wait | stop */
export function refundStatus(refund) {
  switch (refund && refund.status) {
    case 'paid': return { label: t('wallet.rsPaid'), tone: 'done' };
    case 'rejected': return { label: t('wallet.rsRejected'), tone: 'stop' };
    case 'processing': return { label: t('wallet.rsProcessing'), tone: 'wait' };
    case 'failed':
    case 'review': return { label: t('wallet.rsReview'), tone: 'wait' };
    default: return { label: t('wallet.rsPending'), tone: 'wait' };
  }
}

/** The sentence the server wrote for this refund, in the app language. */
export function refundMessage(refund) {
  if (!refund) return '';
  return (isSwahili() ? (refund.message_sw || refund.message) : (refund.message || refund.message_sw)) || '';
}

/** The refund that belongs to one order (the newest), or null. */
export function refundForOrder(refunds, order) {
  if (!order || !Array.isArray(refunds)) return null;
  const id = order.id !== undefined && order.id !== null ? String(order.id) : '';
  const number = order.order_number || '';
  return refunds.find((r) => (id && String(r.order_id) === id) || (number && r.order_number === number)) || null;
}

/** Only ask the server about a refund when the order ended after being paid. */
export function shouldLoadRefund(order) {
  return !!order && REFUND_ORDER_STATUSES.includes(order.status)
    && (order.payment_status === 'paid' || order.payment_status === 'refunded');
}

// ---------------------------------------------------------------- delivery code

/** Only ask for deliveries when a parcel of a paid order can be on its way. */
export function shouldLoadDelivery(order) {
  return !!order && order.payment_status === 'paid' && ON_THE_WAY_STATUSES.includes(order.status);
}

/** The delivery of one order (from the customer's own list), or null. */
export function deliveryForOrder(deliveries, order) {
  const list = Array.isArray(deliveries) ? deliveries : (deliveries && deliveries.results) || [];
  if (!order || !order.order_number) return null;
  const mine = list.filter((d) => d && d.order_number === order.order_number);
  return mine.find((d) => d.status !== 'delivered') || mine[0] || null;
}

/** The code can be shown while the parcel is on its way and not yet handed over. */
export function canShowCode(delivery) {
  return !!delivery && !delivery.otp_verified && CODE_STATUSES.includes(delivery.status);
}

/** '482913' -> '482 913' (easier to read out loud) */
export function spacedCode(code) {
  const s = String(code || '').replace(/\s+/g, '');
  return s.length === 6 ? s.slice(0, 3) + ' ' + s.slice(3) : s;
}
