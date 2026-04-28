/**
 * VUMA Store — Orders API
 * All order and shipping address endpoints
 */

import { get, post, patch, del } from './client';
import { API } from '../utils/constants';

export const ordersAPI = {

  // ══════════════════════════════════════════════════
  // ORDERS
  // ══════════════════════════════════════════════════

  /**
   * Get customer orders with optional filters
   */
  getOrders: ({ page = 1, status = '' } = {}) => {
    const params = { page };
    if (status) params.status = status;
    return get(API.ORDERS, params);
  },

  /**
   * Get single order detail
   */
  getOrderDetail: (orderId) =>
    get(API.ORDER_DETAIL(orderId)),

  /**
   * Create new order from cart
   * data = {
   *   items: [{ product_id, quantity }],
   *   shipping_address: { full_name, phone, address_line1,
   *                        city, country, ... },
   *   payment_method: 'card' | 'wallet' | 'mpesa',
   *   notes: ''
   * }
   */
  createOrder: (data) =>
    post(API.ORDERS, {
      items: data.items,
      shipping_address: data.shipping_address,
      payment_method: data.payment_method || 'card',
      notes: data.notes || '',
      currency: data.currency || 'KRW',
    }),

  /**
   * Cancel order (customer — pending only)
   */
  cancelOrder: (orderId) =>
    post(API.ORDER_CANCEL(orderId)),

  /**
   * Update order status (vendor / admin)
   */
  updateOrderStatus: (orderId, data) =>
    patch(API.ORDER_STATUS(orderId), {
      status: data.status,
      tracking_number: data.trackingNumber || '',
      notes: data.notes || '',
    }),

  /**
   * Update single order item status (vendor)
   */
  updateItemStatus: (orderId, itemId, data) =>
    patch(API.ORDER_ITEM_STATUS(orderId, itemId), {
      item_status: data.item_status,
      tracking_number: data.tracking_number || '',
    }),

  /**
   * Get vendor orders
   */
  getVendorOrders: ({ page = 1, status = '' } = {}) => {
    const params = { page };
    if (status) params.status = status;
    return get(API.ORDERS, params);
  },

  // ══════════════════════════════════════════════════
  // SHIPPING ADDRESSES
  // ══════════════════════════════════════════════════

  /**
   * Get all saved shipping addresses
   */
  getAddresses: () => get(API.SHIPPING_ADDRESSES),

  /**
   * Get single address
   */
  getAddress: (addressId) =>
    get(API.ADDRESS_DETAIL(addressId)),

  /**
   * Create new shipping address
   * data = {
   *   full_name, phone,
   *   address_line1, address_line2,
   *   city, state, postal_code,
   *   country, is_default
   * }
   */
  createAddress: (data) =>
    post(API.SHIPPING_ADDRESSES, {
      full_name: data.full_name,
      phone: data.phone,
      address_line1: data.address_line1,
      address_line2: data.address_line2 || '',
      city: data.city,
      state: data.state || '',
      postal_code: data.postal_code || '',
      country: data.country || 'Korea',
      is_default: data.is_default || false,
    }),

  /**
   * Update shipping address
   */
  updateAddress: (addressId, data) =>
    patch(API.ADDRESS_DETAIL(addressId), data),

  /**
   * Delete shipping address
   */
  deleteAddress: (addressId) =>
    del(API.ADDRESS_DETAIL(addressId)),

  /**
   * Set address as default
   */
  setDefaultAddress: (addressId) =>
    post(API.ADDRESS_DEFAULT(addressId)),
};