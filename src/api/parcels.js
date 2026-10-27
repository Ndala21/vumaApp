/**
 * VUMA Store - Parcels API
 * A paid order is packed into one parcel per seller. These calls show where each parcel is,
 * give the customer the delivery code of one parcel, and let a seller say "packed".
 */

import { get, post } from './client';

export const parcelsAPI = {

  // ══════════════════════════════════════════════════
  // CUSTOMER
  // ══════════════════════════════════════════════════

  /**
   * The customer's parcels of one order, newest first. The list is empty while the order has none
   * (the parcel system is off, or the order is older than it).
   * Every parcel: { id, waybill_spaced, seller_name, status, status_label, status_label_sw,
   *   item_summary, items_count, delivery_attempts, can_show_code, timeline: [{ kind, label, label_sw, place, at }] }
   */
  getMyParcels: (order) => get('/parcels/mine/', order ? { order: String(order) } : {}),

  /**
   * The delivery code of ONE parcel. It works only while that parcel is out for delivery.
   * Returns { ok, code, message, minutes }. The same code is texted to the receiving phone.
   */
  getParcelCode: (parcelId) => post(`/parcels/${parcelId}/code/`),

  // The delivery photo (the picture a rider took where the parcel was left) is a private address the phone shows
  // as an image together with the sign-in: see utils/parcelInfo.js (photoUri) and components/ParcelPhoto.js.
  // The server shows it to the customer and to the seller of the parcel only, and only while VUMA allows it.

  // ══════════════════════════════════════════════════
  // SELLER
  // ══════════════════════════════════════════════════

  /**
   * The seller's own parcels, newest first (the newest 100).
   * Every parcel: { id, waybill_spaced, order_number, status, status_label, status_label_sw,
   *   item_summary, can_mark_packed, rider: { name, phone } | null }
   */
  getSellerParcels: () => get('/parcels/seller/'),

  /**
   * The seller says the parcel is packed and ready for the VUMA rider.
   * Returns { ok, message, parcel }.
   */
  markPacked: (parcelId) => post(`/parcels/seller/${parcelId}/packed/`),
};
