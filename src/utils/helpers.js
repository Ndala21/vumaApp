/**
 * VUMA Store — Helper Utilities
 * All reusable utility functions
 */

import { APP, COLORS, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from './constants';

// ══════════════════════════════════════════════════════
// PRICE & CURRENCY
// ══════════════════════════════════════════════════════

/**
 * Format price with currency symbol
 * formatPrice(15000) → 'TZS15,000'
 * formatPrice(15000, 'USD') → '$15,000'
 */
export const formatPrice = (amount, currency = 'TZS') => {
  if (amount === null || amount === undefined) return 'TZS0';

  const symbols = {
    KRW: '₩',
    USD: '$',
    KES: 'KSh',
    NGN: '₦',
    EUR: '€',
    GBP: '£',
    CNY: '¥',
    TZS: 'TSh',
  };

  const symbol = symbols[currency] || currency;
  const num = Number(amount);

  if (isNaN(num)) return `${symbol}0`;

  // TZS has no decimals
  if (currency === 'TZS') {
    return `${symbol}${Math.round(num).toLocaleString()}`;
  }

  return `${symbol}${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Calculate discount percentage
 * getDiscount(10000, 8000) → 20
 */
export const getDiscount = (originalPrice, salePrice) => {
  if (!originalPrice || !salePrice) return 0;
  if (originalPrice <= salePrice) return 0;
  return Math.round((1 - salePrice / originalPrice) * 100);
};

/**
 * Format large numbers
 * formatNumber(1500000) → '1.5M'
 * formatNumber(15000) → '15K'
 */
export const formatNumber = (num) => {
  if (!num) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
};

// ══════════════════════════════════════════════════════
// DATE & TIME
// ══════════════════════════════════════════════════════

/**
 * Format date
 * formatDate('2024-01-15') → 'Jan 15, 2024'
 */
export const formatDate = (dateString, options = {}) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options,
    });
  } catch {
    return '';
  }
};

/**
 * Format date and time
 * formatDateTime('2024-01-15T14:30:00') → 'Jan 15, 2024 2:30 PM'
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

/**
 * Relative time
 * timeAgo('2024-01-15T12:00:00') → '2 hours ago'
 */
export const timeAgo = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (weeks < 4) return `${weeks}w ago`;
    if (months < 12) return `${months}mo ago`;
    return `${years}y ago`;
  } catch {
    return '';
  }
};

/**
 * Format countdown timer
 * formatCountdown(3665) → '01:01:05'
 */
export const formatCountdown = (seconds) => {
  if (!seconds || seconds <= 0) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
};

/**
 * Get seconds until a future date
 */
export const secondsUntil = (dateString) => {
  if (!dateString) return 0;
  const diff = new Date(dateString) - new Date();
  return Math.max(0, Math.floor(diff / 1000));
};

// ══════════════════════════════════════════════════════
// VALIDATION
// ══════════════════════════════════════════════════════

/**
 * Validate email address
 */
export const validateEmail = (email) => {
  if (!email) return 'Email is required.';
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email.trim())) return 'Invalid email address.';
  return null;
};

/**
 * Validate password
 */
export const validatePassword = (password) => {
  if (!password) return 'Password is required.';
  if (password.length < 6)
    return 'Password must be at least 6 characters.';
  return null;
};

/**
 * Validate username
 */
export const validateUsername = (username) => {
  if (!username) return 'Username is required.';
  if (username.length < 3)
    return 'Username must be at least 3 characters.';
  if (username.length > 30)
    return 'Username must be under 30 characters.';
  if (!/^[a-zA-Z0-9_]+$/.test(username))
    return 'Username can only contain letters, numbers, underscores.';
  return null;
};

/**
 * Validate phone number
 */
export const validatePhone = (phone) => {
  if (!phone) return null; // optional
  const regex = /^\+?[\d\s\-()]{8,20}$/;
  if (!regex.test(phone)) return 'Invalid phone number.';
  return null;
};

/**
 * Validate price
 */
export const validatePrice = (price) => {
  const num = Number(price);
  if (isNaN(num) || num <= 0) return 'Price must be greater than 0.';
  return null;
};

/**
 * Validate amount (for payments)
 */
export const validateAmount = (
  amount,
  min = 1000,
  max = APP.maxDepositAmount
) => {
  const num = Number(amount);
  if (isNaN(num) || num <= 0) return 'Invalid amount.';
  if (num < min) return `Minimum amount is ${formatPrice(min)}.`;
  if (num > max) return `Maximum amount is ${formatPrice(max)}.`;
  return null;
};

// ══════════════════════════════════════════════════════
// STRING UTILITIES
// ══════════════════════════════════════════════════════

/**
 * Truncate text
 * truncate('Hello World', 5) → 'Hello...'
 */
export const truncate = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

/**
 * Capitalize first letter
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Title case
 * titleCase('hello world') → 'Hello World'
 */
export const titleCase = (str) => {
  if (!str) return '';
  return str
    .split(' ')
    .map((word) => capitalize(word))
    .join(' ');
};

/**
 * Get initials from name
 * getInitials('John Doe') → 'JD'
 */
export const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Slugify string
 * slugify('Hello World') → 'hello-world'
 */
export const slugify = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// ══════════════════════════════════════════════════════
// ERROR HANDLING
// ══════════════════════════════════════════════════════

/**
 * Extract human-readable error message from API error
 * Use this in every catch block
 */
export const getErrorMessage = (error) => {
  if (!error) return 'Something went wrong.';

  // Our typed errors from client.js
  if (error.type) {
    switch (error.type) {
      case 'NETWORK_ERROR':
        return 'No internet connection. Please check your network.';
      case 'TIMEOUT':
        return 'Request timed out. Please try again.';
      case 'SESSION_EXPIRED':
        return 'Your session has expired. Please login again.';
      case 'FORBIDDEN':
        return 'You do not have permission to do this.';
      case 'NOT_FOUND':
        return 'The requested item was not found.';
      case 'RATE_LIMITED':
        return 'Too many requests. Please slow down.';
      case 'SERVER_ERROR':
        return 'Server error. Please try again later.';
      case 'VALIDATION_ERROR':
        return error.message || 'Please check your input.';
      default:
        return error.message || 'Something went wrong.';
    }
  }

  // Standard error message
  if (error.message) return error.message;

  // Axios response errors
  if (error.response?.data) {
    const data = error.response.data;
    if (typeof data === 'string') return data;
    if (data.detail) return data.detail;
    if (data.message) return data.message;
    if (data.error) return data.error;
    if (data.non_field_errors) return data.non_field_errors[0];
    const firstKey = Object.keys(data)[0];
    if (firstKey) {
      const val = data[firstKey];
      return Array.isArray(val) ? val[0] : String(val);
    }
  }

  return 'Something went wrong. Please try again.';
};

/**
 * Extract field-level errors from API response
 * Returns object like { email: 'Already registered', password: '...' }
 */
export const getFieldErrors = (error) => {
  if (!error) return {};
  const data = error.errors || error.response?.data;
  if (!data || typeof data !== 'object') return {};
  const fieldErrors = {};
  Object.keys(data).forEach((key) => {
    const val = data[key];
    if (Array.isArray(val)) {
      fieldErrors[key] = val[0];
    } else if (typeof val === 'string') {
      fieldErrors[key] = val;
    }
  });
  return fieldErrors;
};

// ══════════════════════════════════════════════════════
// ORDER & STATUS HELPERS
// ══════════════════════════════════════════════════════

/**
 * Get color for order status
 */
export const getOrderStatusColor = (status) => {
  return ORDER_STATUS_COLORS[status] || COLORS.textMuted;
};

/**
 * Get label for order status
 */
export const getOrderStatusLabel = (status) => {
  return ORDER_STATUS_LABELS[status] || capitalize(status || '');
};

/**
 * Check if order can be cancelled
 */
export const canCancelOrder = (status, paymentStatus) => {
  return status === 'pending' && paymentStatus !== 'paid';
};

// ══════════════════════════════════════════════════════
// PRODUCT HELPERS
// ══════════════════════════════════════════════════════

/**
 * Get primary image URL from product
 */
export const getProductImage = (product) => {
  if (!product) return null;
  if (product.primary_image) return product.primary_image;
  if (product.images && product.images.length > 0) {
    const primary = product.images.find((img) => img.is_primary);
    return primary
      ? primary.image_url
      : product.images[0]?.image_url || null;
  }
  return null;
};

/**
 * Check if product is in stock
 */
export const isInStock = (product) => {
  if (!product) return false;
  return product.stock > 0 && product.status === 'active';
};

/**
 * Check if product is on flash sale
 */
export const isFlashSale = (product) => {
  if (!product?.is_flash_sale) return false;
  if (!product.flash_sale_end) return false;
  return new Date(product.flash_sale_end) > new Date();
};

/**
 * Get effective price (flash sale or regular)
 */
export const getEffectivePrice = (product) => {
  if (!product) return 0;
  if (isFlashSale(product) && product.flash_sale_price) {
    return Number(product.flash_sale_price);
  }
  return Number(product.price);
};

// ══════════════════════════════════════════════════════
// CART HELPERS
// ══════════════════════════════════════════════════════

/**
 * Calculate cart totals
 * Delivery is free on all orders (VUMA policy) — shipping is always 0.
 */
export const calculateCartTotals = (items) => {
  if (!items || items.length === 0) {
    return {
      subtotal: 0,
      shipping: 0,
      total: 0,
      itemCount: 0,
      isfreeDelivery: true,
    };
  }
  const subtotal = items.reduce(
    (sum, item) => sum + getEffectivePrice(item.product) * item.quantity,
    0
  );
  const shipping = 0;
  return {
    subtotal,
    shipping,
    total: subtotal + shipping,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    isfreeDelivery: true,
  };
};

/**
 * Group cart items by vendor
 */
export const groupCartByVendor = (items) => {
  if (!items) return {};
  return items.reduce((groups, item) => {
    const vendorName =
      item.product?.vendor_name || 'VUMA Store';
    if (!groups[vendorName]) {
      groups[vendorName] = [];
    }
    groups[vendorName].push(item);
    return groups;
  }, {});
};

// ══════════════════════════════════════════════════════
// RATING HELPERS
// ══════════════════════════════════════════════════════

/**
 * Render star rating as string
 * formatRating(4.5) → '★★★★½'
 */
export const formatRating = (rating) => {
  if (!rating) return '☆☆☆☆☆';
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
};

/**
 * Get rating color
 */
export const getRatingColor = (rating) => {
  if (!rating) return COLORS.textMuted;
  if (rating >= 4) return COLORS.success;
  if (rating >= 3) return COLORS.warning;
  return COLORS.danger;
};

// ══════════════════════════════════════════════════════
// FILE & IMAGE HELPERS
// ══════════════════════════════════════════════════════

/**
 * Format file size
 * formatFileSize(1024000) → '1.0 MB'
 */
export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

/**
 * Get file extension
 */
export const getFileExtension = (filename) => {
  if (!filename) return '';
  return filename.split('.').pop()?.toLowerCase() || '';
};

/**
 * Check if file is an image
 */
export const isImageFile = (filename) => {
  const ext = getFileExtension(filename);
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
};

// ══════════════════════════════════════════════════════
// MISC
// ══════════════════════════════════════════════════════

/**
 * Generate a random ID
 */
export const generateId = () => {
  return Math.random().toString(36).substring(2, 11);
};

/**
 * Deep clone an object
 */
export const deepClone = (obj) => {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return obj;
  }
};

/**
 * Debounce a function
 */
export const debounce = (fn, delay = 300) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

/**
 * Check if value is empty
 */
export const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

/**
 * Sleep utility for async operations
 */
export const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Clamp a number between min and max
 */
export const clamp = (num, min, max) =>
  Math.min(Math.max(num, min), max);