/**
 * VUMA Store — App Constants
 * Single source of truth for all app-wide constants
 */

// ─── API ──────────────────────────────────────────────
export const API = {
 BASE_URL: __DEV__
  ? 'http://172.30.1.39:8000/api/v1/'
  : 'https://vumastore.store/api/v1/',

  // Auth
REGISTER: 'users/register/',
LOGIN: 'users/login/',
LOGOUT: 'users/logout/',
TOKEN_REFRESH: 'users/token/refresh/',
PROFILE: 'users/profile/',
PROFILE_UPDATE: 'users/profile/update/',
PASSWORD_CHANGE: 'users/password/change/',
ME: 'users/me/',

  // Products
  PRODUCTS: '/products/',
  PRODUCT_DETAIL: (id) => `/products/${id}/`,
  PRODUCT_IMAGES: (id) => `/products/${id}/images/`,
  PRODUCT_REVIEWS: (id) => `/products/${id}/reviews/`,
  PRODUCT_MY: '/products/my-products/',
  CATEGORIES: '/products/categories/',
  CATEGORY_DETAIL: (slug) => `/products/categories/${slug}/`,

  // Orders
  ORDERS: '/orders/',
  ORDER_DETAIL: (id) => `/orders/${id}/`,
  ORDER_STATUS: (id) => `/orders/${id}/status/`,
  ORDER_CANCEL: (id) => `/orders/${id}/cancel/`,
  ORDER_ITEM_STATUS: (orderId, itemId) =>
    `/orders/${orderId}/items/${itemId}/status/`,
  SHIPPING_ADDRESSES: '/orders/addresses/',
  ADDRESS_DETAIL: (id) => `/orders/addresses/${id}/`,
  ADDRESS_DEFAULT: (id) => `/orders/addresses/${id}/set-default/`,

  // Payments
  WALLET: '/payments/wallet/',
  DEPOSIT: '/payments/wallet/deposit/',
  WITHDRAW: '/payments/wallet/withdraw/',
  TRANSFER: '/payments/wallet/transfer/',
  TRANSACTIONS: '/payments/transactions/',
  PAYMENT_METHODS: '/payments/methods/',
  PAYMENT_METHOD_DETAIL: (id) => `/payments/methods/${id}/`,
  PAYMENT_METHOD_DEFAULT: (id) =>
    `/payments/methods/${id}/set-default/`,
  STRIPE_WEBHOOK: '/payments/webhook/stripe/',

  // Vendors
  VENDOR_APPLY: '/vendors/applications/apply/',
  VENDOR_MY_APPLICATION: '/vendors/applications/my-application/',
  VENDOR_PROFILE: '/vendors/profiles/me/',
  VENDOR_PROFILE_UPDATE: '/vendors/profiles/me/update/',
  VENDOR_DASHBOARD: '/vendors/profiles/dashboard/',
  VENDOR_PAYOUTS: '/vendors/payouts/my-payouts/',
  VENDOR_PAYOUT_REQUEST: '/vendors/payouts/request/',

  // Notifications
  NOTIFICATIONS: '/notifications/list/',
  NOTIFICATIONS_COUNT: '/notifications/count/',
  NOTIFICATIONS_READ: '/notifications/mark-read/',

  // Chat
  CHAT_ROOMS: '/chat/rooms/list/',
  CHAT_ROOM_CREATE: '/chat/rooms/create/',
  CHAT_ROOM_DETAIL: (id) => `/chat/rooms/${id}/detail/`,
  CHAT_ROOM_MESSAGES: (id) => `/chat/rooms/${id}/messages/`,
  CHAT_ROOM_SEND: (id) => `/chat/rooms/${id}/send/`,
  SUPPORT_TICKETS: '/chat/tickets/my-tickets/',
  SUPPORT_TICKET_CREATE: '/chat/tickets/create/',

  // WebSocket
 WS_BASE: 'wss://vumastore.store',
 WS_CHAT: (roomId) => `wss://vumastore.store/ws/chat/${roomId}/`,
};

// ─── COLORS ───────────────────────────────────────────
export const COLORS = {
  // Brand
  primary: '#FF6B00',
  primaryDark: '#E55A00',
  primaryLight: '#FF8C33',
  primaryFade: '#FFF0E6',

  secondary: '#1A1A2E',
  secondaryLight: '#2D2D44',

  // UI
  background: '#F5F5F5',
  surface: '#FFFFFF',
  surfaceAlt: '#FAFAFA',
  border: '#E8E8E8',
  borderLight: '#F0F0F0',
  divider: '#EEEEEE',

  // Text
  textPrimary: '#1A1A1A',
  textSecondary: '#555555',
  textMuted: '#999999',
  textLight: '#BBBBBB',
  textWhite: '#FFFFFF',
  textInverse: '#FFFFFF',

  // Status
  success: '#28A745',
  successLight: '#D4EDDA',
  successText: '#155724',

  warning: '#FFC107',
  warningLight: '#FFF3CD',
  warningText: '#856404',

  danger: '#DC3545',
  dangerLight: '#F8D7DA',
  dangerText: '#721C24',

  info: '#17A2B8',
  infoLight: '#CCE5FF',
  infoText: '#004085',

  // Product
  discount: '#FF3C00',
  rating: '#FFB800',
  freeShip: '#28A745',
  flashSale: '#FF3C00',

  // Overlay
  overlay: 'rgba(0,0,0,0.5)',
  overlayLight: 'rgba(0,0,0,0.3)',

  // Skeleton
  skeleton: '#E0E0E0',
  skeletonHighlight: '#F5F5F5',

  // Tab bar
  tabActive: '#FF6B00',
  tabInactive: '#AAAAAA',
};

// ─── TYPOGRAPHY ───────────────────────────────────────
export const FONTS = {
  // Sizes
  xs: 10,
  sm: 12,
  md: 14,
  base: 15,
  lg: 16,
  xl: 18,
  '2xl': 20,
  '3xl': 24,
  '4xl': 28,
  '5xl': 32,
  '6xl': 42,

  // Weights
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
  extraBold: '800',
  black: '900',

  // Line heights
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.8,
};

// ─── SPACING ──────────────────────────────────────────
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
};

// ─── BORDER RADIUS ────────────────────────────────────
export const RADIUS = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 9999,
};

// ─── SHADOWS ──────────────────────────────────────────
export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  primary: {
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
};

// ─── APP INFO ─────────────────────────────────────────
export const APP = {
  name: 'VUMA Store',
  tagline: 'Smart Shopping. Fast Delivery. Best Prices.',
  version: '1.0.0',
  supportEmail: 'support@vumastore.com',
  website: 'https://vumastore.com',
  currency: 'KRW',
  currencySymbol: '₩',
  commissionRate: 0.10,
  minPayoutAmount: 10000,
  maxDepositAmount: 10000000,
  freeShippingThreshold: 50000,
};

// ─── LANGUAGES ────────────────────────────────────────
export const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸', rtl: false },
  { code: 'ko', name: '한국어', flag: '🇰🇷', rtl: false },
  { code: 'zh', name: '中文', flag: '🇨🇳', rtl: false },
  { code: 'sw', name: 'Kiswahili', flag: '🇹🇿', rtl: false },
  { code: 'fr', name: 'Français', flag: '🇫🇷', rtl: false },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', rtl: true },
];

// ─── PRODUCT CATEGORIES ───────────────────────────────
export const CATEGORIES = [
  { id: 'all', label: 'All', icon: '🏠', slug: '' },
  { id: 'electronics', label: 'Electronics', icon: '📱', slug: 'electronics' },
  { id: 'fashion', label: 'Fashion', icon: '👗', slug: 'fashion' },
  { id: 'food', label: 'Food', icon: '🍎', slug: 'food' },
  { id: 'beauty', label: 'Beauty', icon: '💄', slug: 'beauty' },
  { id: 'home', label: 'Home', icon: '🏡', slug: 'home' },
  { id: 'sports', label: 'Sports', icon: '⚽', slug: 'sports' },
  { id: 'books', label: 'Books', icon: '📚', slug: 'books' },
  { id: 'toys', label: 'Toys', icon: '🧸', slug: 'toys' },
  { id: 'health', label: 'Health', icon: '💊', slug: 'health' },
];

// ─── ORDER STATUS ─────────────────────────────────────
export const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
};

export const ORDER_STATUS_LABELS = {
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export const ORDER_STATUS_COLORS = {
  pending: COLORS.warning,
  processing: COLORS.info,
  shipped: COLORS.primary,
  delivered: COLORS.success,
  cancelled: COLORS.danger,
  refunded: COLORS.textMuted,
};

// ─── PAYMENT METHODS ──────────────────────────────────
export const PAYMENT_METHODS = [
  { id: 'card', label: 'Credit/Debit Card', icon: '💳' },
  { id: 'wallet', label: 'VUMA Wallet', icon: '💰' },
  { id: 'mpesa', label: 'M-Pesa', icon: '📱' },
  { id: 'bank', label: 'Bank Transfer', icon: '🏦' },
];

// ─── STORAGE KEYS ─────────────────────────────────────
export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@vuma_access_token',
  REFRESH_TOKEN: '@vuma_refresh_token',
  USER: '@vuma_user',
  LANGUAGE: '@vuma_language',
  CART: '@vuma_cart',
  ONBOARDED: '@vuma_onboarded',
  REMEMBER_ME: '@vuma_remember_me',
  BIOMETRIC_CREDENTIALS: '@vuma_biometric_creds',
  WISHLIST: '@vuma_wishlist',
  SEARCH_HISTORY: '@vuma_search_history',
};

// ─── PAGINATION ───────────────────────────────────────
export const PAGINATION = {
  pageSize: 20,
  initialPage: 1,
};

// ─── TIMEOUTS ─────────────────────────────────────────
export const TIMEOUTS = {
  api: 30000,
  upload: 120000,
  refresh: 5000,
};

// ─── VALIDATION ───────────────────────────────────────
export const VALIDATION = {
  passwordMinLength: 6,
  usernameMinLength: 3,
  usernameMaxLength: 30,
  productNameMaxLength: 200,
  reviewMaxLength: 1000,
  messageMaxLength: 5000,
};

// ─── SCREEN NAMES ─────────────────────────────────────
export const SCREENS = {
  // Auth
  ONBOARDING: 'Onboarding',
  LOGIN: 'Login',
  REGISTER: 'Register',

  // Main tabs
  HOME: 'Home',
  SEARCH: 'Search',
  CART: 'Cart',
  ORDERS: 'Orders',
  PROFILE: 'Profile',

  // Product
  PRODUCT_LIST: 'ProductList',
  PRODUCT_DETAIL: 'ProductDetail',

  // Order
  ORDER_DETAIL: 'OrderDetail',

  // Payment
  WALLET: 'Wallet',
  CHECKOUT: 'Checkout',

  // Vendor
  VENDOR_DASHBOARD: 'VendorDashboard',
  VENDOR_PRODUCTS: 'VendorProducts',
  VENDOR_ORDERS: 'VendorOrders',

  // Profile
  SETTINGS: 'Settings',

  // Chat
  CHAT: 'Chat',

  // Notifications
  NOTIFICATIONS: 'Notifications',
};

// ─── VENDOR STATUS ────────────────────────────────────
export const VENDOR_STATUS = {
  NONE: 'none',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

// ─── USER ROLES ───────────────────────────────────────
export const USER_ROLES = {
  CUSTOMER: 'customer',
  VENDOR: 'vendor',
  ADMIN: 'admin',
};

// ─── NOTIFICATION TYPES ───────────────────────────────
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
};

export const NOTIFICATION_CATEGORIES = {
  SYSTEM: 'system',
  ORDER: 'order',
  PAYMENT: 'payment',
  VENDOR: 'vendor',
  MARKETING: 'marketing',
};