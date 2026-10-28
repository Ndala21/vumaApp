/**
 * VUMA Store — Vendors API
 */

import { get, post, patch, upload } from './client';
import { API } from '../utils/constants';

export const vendorsAPI = {

  // ══════════════════════════════════════════════════
  // APPLICATIONS
  // ══════════════════════════════════════════════════

  /**
   * Apply to become a vendor
   * Requires business_certificate + id_card files
   */
  applyAsVendor: (data, onProgress = null) => {
    const formData = new FormData();
    formData.append('business_name', data.business_name);
    formData.append('business_type', data.business_type);
    formData.append('shop_name', data.shop_name);
    formData.append('description', data.description);
    formData.append('contact_phone', data.contact_phone);
    formData.append('contact_address', data.contact_address);
    if (data.website) {
      formData.append('website', data.website);
    }
    // Required documents
    formData.append('business_certificate', {
      uri: data.business_certificate.uri,
      name:
        data.business_certificate.fileName ||
        'business_cert.jpg',
      type:
        data.business_certificate.type || 'image/jpeg',
    });
    formData.append('id_card', {
      uri: data.id_card.uri,
      name: data.id_card.fileName || 'id_card.jpg',
      type: data.id_card.type || 'image/jpeg',
    });
    // Optional document
    if (data.kyc_document) {
      formData.append('kyc_document', {
        uri: data.kyc_document.uri,
        name:
          data.kyc_document.fileName || 'kyc_document.jpg',
        type: data.kyc_document.type || 'image/jpeg',
      });
    }
    return upload(
      API.VENDOR_APPLY,
      formData,
      onProgress
    );
  },

  /**
   * Get my application status
   */
  getMyApplication: () => get(API.VENDOR_MY_APPLICATION),

  // ══════════════════════════════════════════════════
  // VENDOR PROFILE
  // ══════════════════════════════════════════════════

  /**
   * Get my vendor profile
   */
  getProfile: () => get(API.VENDOR_PROFILE),

  /**
   * Update vendor profile
   */
  updateProfile: (data, onProgress = null) => {
    // A picture is an object picked on the phone ({ uri, fileName, mimeType }): it goes up as
    // multipart. The three pictures of a shop: shop_logo, shop_banner (cover), promotional_poster.
    // `remove_shop_logo` / `remove_shop_banner` / `remove_promotional_poster` = true clear one.
    const isPicture = (v) => !!v && typeof v === 'object' && !!v.uri;
    const PICTURE_KEYS = ['shop_logo', 'shop_banner', 'promotional_poster'];
    if (PICTURE_KEYS.some((k) => isPicture(data[k]))) {
      const formData = new FormData();
      Object.keys(data).forEach((key) => {
        const value = data[key];
        if (PICTURE_KEYS.includes(key) && isPicture(value)) {
          const extension = ((value.uri.split('?')[0].split('.').pop() || 'jpg').toLowerCase()).replace(/[^a-z0-9]/g, '') || 'jpg';
          const type = value.mimeType || value.type || (extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg');
          formData.append(key, {
            uri: value.uri,
            name: value.fileName || `${key}.${extension}`,
            type: String(type).includes('/') ? type : 'image/jpeg',
          });
        } else if (value !== undefined && value !== null && !PICTURE_KEYS.includes(key)) {
          formData.append(key, String(value));
        }
      });
      return upload(API.VENDOR_PROFILE_UPDATE, formData, onProgress);
    }
    return patch(API.VENDOR_PROFILE_UPDATE, data);
  },

  /**
   * Get vendor dashboard stats
   */
  getDashboard: () => get(API.VENDOR_DASHBOARD),

  // ══════════════════════════════════════════════════
  // PAYOUTS
  // ══════════════════════════════════════════════════

  /**
   * Get payout history
   */
  getPayouts: ({ page = 1, status = '' } = {}) => {
    const params = { page };
    if (status) params.status = status;
    return get(API.VENDOR_PAYOUTS, params);
  },

  /**
   * Request payout
   */
  requestPayout: (amount, notes = '') =>
    post(API.VENDOR_PAYOUT_REQUEST, { amount, notes }),

  /**
   * What the Withdraw screen needs: available / on hold / in progress, the limits and fee,
   * where the money goes, and whether a withdrawal can be requested (and if not, why).
   */
  getPayoutSummary: () => get(API.VENDOR_PAYOUT_SUMMARY),

  /**
   * The exact money statement: balances (coming, on hold, ready, owed ...) and one line per sale
   * with the sale price, VUMA fee, payment cost and the exact amount for the seller.
   * state: '' | 'waiting' | 'on_hold' | 'released' | 'reversed'
   */
  getStatement: ({ limit = 20, offset = 0, state = '' } = {}) => {
    const params = { limit, offset };
    if (state) params.state = state;
    return get(`${API.VENDOR_PAYOUTS_BASE}statement/`, params);
  },

  /**
   * Cancel a withdrawal that is still waiting for approval
   */
  cancelPayout: (id) => post(`${API.VENDOR_PAYOUTS_BASE}${id}/cancel/`),
};
