/**
 * VUMA Store — Payments API
 * Wallet, transactions, payment methods
 */

import { get, post, patch, del } from './client';
import { API } from '../utils/constants';

export const paymentsAPI = {


  // ══════════════════════════════════════════════════
  // WALLET
  // ══════════════════════════════════════════════════

  /**
   * Get wallet balance and details
   */
  getWallet: () => get(API.WALLET),

  /**
   * Deposit to wallet via Stripe
   * Returns { checkout_url, session_id, amount }
   * Redirect user to checkout_url
   */
  deposit: (amount, currency = 'KRW') =>
    post(API.DEPOSIT, { amount, currency }),

  /**
   * Withdraw from wallet to bank account
   * data = { amount, payment_method_id, description }
   */
  withdraw: (data) =>
    post(API.WITHDRAW, {
      amount: data.amount,
      payment_method_id: data.paymentMethodId,
      description: data.description || 'Withdrawal',
    }),

  /**
   * Transfer to another VUMA user
   * data = { receiver_email, amount, description }
   */
  transfer: (data) =>
    post(API.TRANSFER, {
      receiver_email: data.receiverEmail,
      amount: data.amount,
      description: data.description || '',
    }),

  // ══════════════════════════════════════════════════
  // TRANSACTIONS
  // ══════════════════════════════════════════════════

  /**
   * Get transaction history
   */
  getTransactions: ({
    page = 1,
    tx_type = '',
    status = '',
  } = {}) => {
    const params = { page };
    if (tx_type) params.tx_type = tx_type;
    if (status) params.status = status;
    return get(API.TRANSACTIONS, params);
  },

  // ══════════════════════════════════════════════════
  // PAYMENT METHODS
  // ══════════════════════════════════════════════════

  /**
   * Get all saved payment methods
   */
  getPaymentMethods: () => get(API.PAYMENT_METHODS),

  /**
   * Add new payment method
   * For card: pass stripe_payment_method_id from Stripe.js
   * NEVER send raw card numbers
   * data = {
   *   type: 'card' | 'bank' | 'mpesa' | 'paypal',
   *   stripe_payment_method_id,  // card only
   *   bank_name,                 // bank only
   *   bank_account_last4,        // bank only
   *   mpesa_phone,               // mpesa only
   *   paypal_email,              // paypal only
   *   is_default
   * }
   */
  addPaymentMethod: (data) =>
    post(API.PAYMENT_METHODS, {
      type: data.type,
      stripe_payment_method_id:
        data.stripe_payment_method_id || '',
      bank_name: data.bank_name || '',
      bank_account_last4: data.bank_account_last4 || '',
      mpesa_phone: data.mpesa_phone || '',
      paypal_email: data.paypal_email || '',
      is_default: data.is_default || false,
    }),

  /**
   * Delete payment method
   */
  deletePaymentMethod: (methodId) =>
    del(API.PAYMENT_METHOD_DETAIL(methodId)),

  /**
   * Set payment method as default
   */
  setDefaultPaymentMethod: (methodId) =>
    post(API.PAYMENT_METHOD_DEFAULT(methodId)),

  // ══════════════════════════════════════════════════
  // STRIPE CHECKOUT
  // ══════════════════════════════════════════════════

  /**
   * Create Stripe checkout session for order payment
   * Returns { checkout_url, session_id }
   */
  createStripeCheckout: (orderId) =>
    post('/payments/stripe/checkout/', { order_id: orderId }),

  /**
   * Verify Stripe session after redirect
   */
  verifyStripeSession: (sessionId) =>
    get('/payments/stripe/verify/', { session_id: sessionId }),

  // ══════════════════════════════════════════════════
  // M-PESA
  // ══════════════════════════════════════════════════

  /**
   * Initiate M-Pesa STK push
   * data = { order_id, phone }
   */
  initiateMpesa: (data) =>
    post('/payments/mpesa/', {
      order_id: data.orderId,
      phone: data.phone,
    }),

  /**
   * Check M-Pesa payment status
   */
  checkMpesaStatus: (checkoutRequestId) =>
    get('/payments/mpesa/status/', {
      checkout_request_id: checkoutRequestId,
    }),
// Add to existing paymentsAPI object:

/**
 * Initiate mobile money STK push
 */
initiateMobileMoney: (data) =>
  post('/payments/mobile-money/initiate/', {
    phone: data.phone,
    amount: data.amount,
    provider: data.provider,
    order_id: data.orderId || undefined,
  }),

/**
 * Verify mobile money transaction
 */
verifyMobileMoney: (data) =>
  post('/payments/mobile-money/verify/', {
    tx_ref: data.txRef,
    flutterwave_tx_id: data.flutterwaveTxId || undefined,
  }),
  // ══════════════════════════════════════════════════
  // VENDOR PAYOUTS
  // ══════════════════════════════════════════════════

  /**
   * Get vendor payout history
   */
  getPayouts: ({ page = 1, status = '' } = {}) => {
    const params = { page };
    if (status) params.status = status;
    return get(API.VENDOR_PAYOUTS, params);
  },

  /**
   * Request vendor payout
   * data = { amount, notes }
   */
  requestPayout: (data) =>
    post(API.VENDOR_PAYOUT_REQUEST, {
      amount: data.amount,
      notes: data.notes || '',
    }),
};