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
  updateProfile: (data) => {
    if (
      (data.shop_logo &&
        typeof data.shop_logo === 'object') ||
      (data.shop_banner &&
        typeof data.shop_banner === 'object')
    ) {
      const formData = new FormData();
      Object.keys(data).forEach((key) => {
        if (
          key === 'shop_logo' &&
          typeof data[key] === 'object'
        ) {
          formData.append('shop_logo', {
            uri: data[key].uri,
            name: data[key].fileName || 'logo.jpg',
            type: data[key].type || 'image/jpeg',
          });
        } else if (
          key === 'shop_banner' &&
          typeof data[key] === 'object'
        ) {
          formData.append('shop_banner', {
            uri: data[key].uri,
            name: data[key].fileName || 'banner.jpg',
            type: data[key].type || 'image/jpeg',
          });
        } else if (
          data[key] !== undefined &&
          data[key] !== null
        ) {
          formData.append(key, String(data[key]));
        }
      });
      return upload(API.VENDOR_PROFILE_UPDATE, formData);
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
};