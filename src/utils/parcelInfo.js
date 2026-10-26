/**
 * VUMA Store - what customers and sellers read about a parcel.
 * Small plain functions so the order page, the seller orders screen and the tests all use the same rules.
 *
 * A paid order is packed into one parcel per seller. The server decides everything (where a parcel is,
 * whether a code may be shown, whether the seller may say "packed"); the app only shows it in words.
 */

import { t } from '../i18n';
import { COLORS } from './constants';
import { formatDateTime } from './helpers';
import { isSwahili, fmtDay, spacedCode } from './walletInfo';

export { spacedCode };

// How often the order page looks again while a rider has the parcel (the customer is about to give the code).
export const POLL_MS = 20000;

// How many steps of one parcel's history the order page lists (the newest ones).
export const STEP_LIMIT = 5;

export const FINAL_STATUSES = ['delivered', 'returned', 'cancelled', 'lost'];

const CANCELLED_ORDERS = ['cancelled', 'rejected', 'refunded'];

/** The parcels of an answer. Only a list, or { results: [...] }, counts; anything else is "no parcels". */
export function parcelList(data) {
  const rows = Array.isArray(data) ? data : (data && Array.isArray(data.results) ? data.results : []);
  return rows.filter((p) => p && typeof p === 'object' && p.id && typeof p.status === 'string');
}

/** One word for a parcel's state: done | moving | wait | problem | ended (the colour follows it). */
export function tone(parcel) {
  switch (parcel && parcel.status) {
    case 'delivered': return 'done';
    case 'collected':
    case 'at_hub':
    case 'in_transfer':
    case 'out_for_delivery': return 'moving';
    case 'delivery_failed':
    case 'returning':
    case 'lost': return 'problem';
    case 'returned':
    case 'cancelled': return 'ended';
    default: return 'wait';
  }
}

/** { bg, fg } for the pill of a tone. */
export function toneColors(name) {
  switch (name) {
    case 'done': return { bg: COLORS.successLight, fg: COLORS.successText };
    case 'moving': return { bg: COLORS.infoLight, fg: COLORS.infoText };
    case 'problem': return { bg: COLORS.dangerLight, fg: COLORS.dangerText };
    case 'ended': return { bg: COLORS.surfaceAlt, fg: COLORS.textMuted };
    default: return { bg: COLORS.warningLight, fg: COLORS.warningText };
  }
}

/** The state of a parcel in the app language (the server writes both). */
export function statusText(parcel) {
  if (!parcel) return '';
  const en = parcel.status_label || '';
  const sw = parcel.status_label_sw || '';
  return (isSwahili() ? (sw || en) : (en || sw)) || String(parcel.status || '').replace(/_/g, ' ');
}

export const isFinal = (parcel) => !!parcel && FINAL_STATUSES.includes(parcel.status);

/** Parcels that are still on their way first, finished ones last. Order inside each group is kept. */
export function orderedParcels(parcels) {
  const rows = parcelList(parcels);
  return [...rows.filter((p) => !isFinal(p)), ...rows.filter((p) => isFinal(p))];
}

/** Only ask about parcels for an order that was paid and was not cancelled (a cancelled order shows its own banner). */
export function shouldLoadParcels(order) {
  return !!order && order.payment_status === 'paid' && !CANCELLED_ORDERS.includes(order.status)
    && !!(order.order_number || order.id);
}

/** What to send as ?order= (the order number is shorter and the server accepts it). */
export function orderRef(order) {
  return (order && (order.order_number || order.id)) || '';
}

/** A short signature of every parcel's state: when it changes, the order itself may have moved too. */
export function signature(parcels) {
  return parcelList(parcels).map((p) => p.id + ':' + p.status + ':' + (p.delivery_attempts || 0)).join('|');
}

// ---------------------------------------------------------------- customer

const HINT_KEYS = {
  created: 'parcels.hintCreated',
  ready: 'parcels.hintReady',
  pickup_assigned: 'parcels.hintReady',
  collected: 'parcels.hintMoving',
  at_hub: 'parcels.hintMoving',
  in_transfer: 'parcels.hintMoving',
  out_for_delivery: 'parcels.hintOut',
  delivery_failed: 'parcels.hintFailed',
  returning: 'parcels.hintReturning',
  returned: 'parcels.hintReturned',
  cancelled: 'parcels.hintCancelled',
  lost: 'parcels.hintLost',
};

/** One sentence for the customer: what is happening to this parcel now. */
export function hintFor(parcel) {
  if (!parcel) return '';
  if (parcel.status === 'delivered') {
    const day = fmtDay(parcel.delivered_at);
    return day ? t('parcels.hintDelivered', { date: day }) : t('parcels.hintDeliveredPlain');
  }
  const key = HINT_KEYS[parcel.status];
  return key ? t(key, { n: parcel.delivery_attempts || 1 }) : '';
}

/** 0 = not packed yet, 1 = packed, 2 = on the way, 3 = out for delivery, 4 = delivered. null = no progress bar (cancelled, returned ...). */
export function progressStep(parcel) {
  switch (parcel && parcel.status) {
    case 'created': return 0;
    case 'ready':
    case 'pickup_assigned': return 1;
    case 'collected':
    case 'at_hub':
    case 'in_transfer':
    case 'delivery_failed': return 2;
    case 'out_for_delivery': return 3;
    case 'delivered': return 4;
    default: return null;
  }
}

/** The four stages of the progress bar, in the app language. */
export function stageNames() {
  return [t('parcels.stagePacked'), t('parcels.stageOnWay'), t('parcels.stageOut'), t('parcels.stageDelivered')];
}

/**
 * The newest steps of one parcel, newest first: [{ key, text, place, when }].
 * `hidden` is how many older steps were left out.
 */
export function historyOf(parcel, limit = STEP_LIMIT) {
  const rows = parcel && Array.isArray(parcel.timeline) ? parcel.timeline.filter((s) => s && s.label) : [];
  const newest = rows.slice().reverse();
  const shown = newest.slice(0, limit).map((s, i) => ({
    key: String(s.kind || 'step') + ':' + String(s.at || i),
    text: (isSwahili() ? (s.label_sw || s.label) : s.label),
    place: s.place || '',
    when: formatDateTime(s.at),
  }));
  return { steps: shown, hidden: Math.max(0, newest.length - shown.length) };
}

/** The delivery code can be asked for only while the rider has this parcel. */
export function canShowCode(parcel) {
  return !!parcel && parcel.status === 'out_for_delivery' && parcel.can_show_code === true;
}

/** The sentence for a failed code request: the server's own words when it said why, else a plain one. */
export function codeErrorText(error) {
  return error && error.type === 'VALIDATION_ERROR' && error.message ? error.message : t('wallet.codeError');
}

/** 'Order comes in 2 parcels...' only when there is more than one. */
export function manyNote(count) {
  return count > 1 ? t('parcels.manyNote', { n: count }) : '';
}

/** 'Parcel number VM 1234 5678' */
export function waybillLine(parcel) {
  const number = (parcel && (parcel.waybill_spaced || parcel.waybill)) || '';
  return number ? t('parcels.waybill', { number }) : '';
}

// ---------------------------------------------------------------- seller

// What a seller reads under each state: [English, Kiswahili]
const SELLER_HINTS = {
  created: ['Pack the items, then tap "Mark as packed".', 'Funga bidhaa, kisha bonyeza "Imefungwa".'],
  ready: ['Packed. Waiting for VUMA to send a rider.', 'Imefungwa. Inasubiri VUMA kutuma dereva.'],
  pickup_assigned: ['A VUMA rider is coming to collect it.', 'Dereva wa VUMA anakuja kuichukua.'],
  collected: ['VUMA has collected it.', 'VUMA imeichukua.'],
  at_hub: ['On its way to the customer.', 'Iko njiani kwa mteja.'],
  in_transfer: ['On its way to the customer.', 'Iko njiani kwa mteja.'],
  out_for_delivery: ['On its way to the customer.', 'Iko njiani kwa mteja.'],
  delivered: ['Delivered to the customer.', 'Imefikishwa kwa mteja.'],
  delivery_failed: ['The delivery did not work. VUMA will try again.', 'Kufikisha kumeshindikana. VUMA itajaribu tena.'],
  returning: ['The parcel is coming back to you.', 'Kifurushi kinarudi kwako.'],
  returned: ['The parcel is back with you.', 'Kifurushi kimerudi kwako.'],
  cancelled: ['This parcel was cancelled.', 'Kifurushi hiki kimefutwa.'],
  lost: ['VUMA could not find this parcel. Please contact support.', 'VUMA haijaweza kupata kifurushi hiki. Tafadhali wasiliana na msaada.'],
};

/** One sentence for the seller. */
export function sellerHint(parcel) {
  const pair = parcel && SELLER_HINTS[parcel.status];
  return pair ? pair[isSwahili() ? 1 : 0] : '';
}

/** The seller's parcels of one order (by order number). */
export function parcelsForOrder(parcels, orderNumber) {
  if (!orderNumber) return [];
  return parcelList(parcels).filter((p) => p.order_number === orderNumber);
}

/** True when the seller may say "packed" for this parcel (the server decides; this only reads its answer). */
export function canMarkPacked(parcel) {
  return !!parcel && parcel.can_mark_packed === true && parcel.status === 'created';
}

/** The rider coming for a parcel, or null. Only while a rider was given the pickup. */
export function riderOf(parcel) {
  const r = parcel && parcel.status === 'pickup_assigned' ? parcel.rider : null;
  return r && r.name ? { name: String(r.name), phone: String(r.phone || '') } : null;
}

/** The same list with one parcel replaced by its newer version (matched by id). Unknown ids are added at the top. */
export function withParcel(parcels, fresh) {
  const rows = parcelList(parcels);
  if (!fresh || !fresh.id) return rows;
  return rows.some((p) => p.id === fresh.id)
    ? rows.map((p) => (p.id === fresh.id ? fresh : p))
    : [fresh, ...rows];
}
