/**
 * VUMA Store — App Constants
 * Single source of truth for all app-wide constants
 */

// ─── API ──────────────────────────────────────────────
export const API = {
  BASE_URL: 'https://vumastore.store/api/v1/',

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
  BANNERS: '/products/banners/',

  // Mazao (Agricultural Marketplace)
  MAZAO: '/products/mazao/',
  MAZAO_DETAIL: (id) => `/products/mazao/${id}/`,
  MAZAO_MY: '/products/mazao/my-products/',
  MAZAO_FEATURED: '/products/mazao/featured/',
  MAZAO_CROP_TYPES: '/products/mazao/crop-types/',

  // Orders
  ORDERS: '/orders/',
  ORDER_DETAIL: (id) => `/orders/${id}/`,
  ORDER_STATUS: (id) => `/orders/${id}/status/`,
  ORDER_CANCEL: (id) => `/orders/${id}/cancel/`,
  ORDER_ITEM_STATUS: (orderId, itemId) => `/orders/${orderId}/items/${itemId}/status/`,
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
  PAYMENT_METHOD_DEFAULT: (id) => `/payments/methods/${id}/set-default/`,
  STRIPE_WEBHOOK: '/payments/webhook/stripe/',

  // Vendors
  VENDOR_APPLY: '/vendors/applications/apply/',
  VENDOR_MY_APPLICATION: '/vendors/applications/my-application/',
  VENDOR_PROFILE: '/vendors/profiles/me/',
  VENDOR_PROFILE_UPDATE: '/vendors/profiles/me/update/',
  VENDOR_DASHBOARD: '/vendors/profiles/dashboard/',
  VENDOR_PAYOUTS: '/vendors/payouts/my-payouts/',
  VENDOR_PAYOUT_REQUEST: '/vendors/payouts/request/',

  // Promotions
  PROMOTIONS_TRENDING: '/promotions/trending/',
  PROMOTIONS_DEALS: '/promotions/daily-deals/',
  PROMOTIONS_RECENTLY_VIEWED: '/promotions/recently-viewed/',
  PROMOTIONS_RECOMMENDATIONS: '/promotions/recommendations/',
  PROMOTIONS_TRACK_VIEW: '/promotions/track-view/',
  PROMOTIONS_COUPON: '/promotions/validate-coupon/',

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
// VUMA Design System v2 — Coupang/Temu-grade polish, VUMA brand identity
export const COLORS = {
  // Brand
  primary: '#FF6A00',
  primaryDark: '#D9550A',
  primaryLight: '#FF8A3D',
  primaryFade: '#FFF3EA',
  primaryTint: '#FFE4CC',

  secondary: '#12162B',      // deep navy — headers, premium sections
  secondaryLight: '#242A4A',
  secondaryFade: '#EEEFF6',

  // UI surfaces
  background: '#F6F6F8',
  surface: '#FFFFFF',
  surfaceAlt: '#FBFBFC',
  surfaceSunken: '#F0F0F3',
  border: '#EBEBEF',
  borderLight: '#F2F2F5',
  borderStrong: '#DCDCE2',
  divider: '#EFEFF3',

  // Text — near-black ink, never pure gray-black
  textPrimary: '#14141A',
  textSecondary: '#5B5F6B',
  textMuted: '#9497A3',
  textLight: '#C4C6CF',
  textWhite: '#FFFFFF',
  textInverse: '#FFFFFF',

  // Status
  success: '#0E9F6E',
  successLight: '#E3F9F0',
  successText: '#087054',

  warning: '#F5A623',
  warningLight: '#FFF6E5',
  warningText: '#92620A',

  danger: '#E5484D',
  dangerLight: '#FDECEC',
  dangerText: '#9B2020',

  info: '#3B82C4',
  infoLight: '#E8F2FB',
  infoText: '#1E5C8A',

  // Product / commerce accents
  discount: '#E8390B',       // hot coral-red — price-cut chips
  rating: '#F5A623',
  freeShip: '#0E9F6E',
  flashSale: '#E8390B',
  priceGreen: '#0E9F6E',

  // Overlay
  overlay: 'rgba(15,16,26,0.55)',
  overlayLight: 'rgba(15,16,26,0.28)',
  scrim: 'rgba(15,16,26,0.85)',

  // Skeleton
  skeleton: '#EAEAED',
  skeletonHighlight: '#F8F8FA',

  // Tab bar
  tabActive: '#FF6A00',
  tabInactive: '#AEB0BC',
};

// ─── TYPOGRAPHY ───────────────────────────────────────
// Refined type scale — clearer hierarchy between price, title, and meta text
export const FONTS = {
  xs: 11,
  sm: 12.5,
  md: 14,
  base: 15,
  lg: 17,
  xl: 19,
  '2xl': 22,
  '3xl': 26,
  '4xl': 30,
  '5xl': 36,
  '6xl': 44,

  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
  extraBold: '800',
  black: '900',

  tight: 1.15,
  normal: 1.45,
  relaxed: 1.75,

  // Letter-spacing tokens — negative tracking on large numerals/prices
  // reads more premium than default 0, per Coupang/Temu price display
  trackTight: -0.4,
  trackNormal: 0,
  trackWide: 0.3,
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
  xs: 6,
  sm: 9,
  md: 12,
  lg: 14,
  xl: 18,
  '2xl': 24,
  full: 9999,
};

// ─── SHADOWS ──────────────────────────────────────────
// Cooler, softer tint (navy-black) instead of pure #000 — reads less "default RN card"
export const SHADOWS = {
  xs: {
    shadowColor: '#12162B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#12162B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  md: {
    shadowColor: '#12162B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 4,
  },
  lg: {
    shadowColor: '#12162B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 8,
  },
  primary: {
    shadowColor: '#FF6A00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
};

// ─── APP INFO ─────────────────────────────────────────
export const APP = {
  name: 'VUMA Store',
  tagline: 'Smart Shopping. Fast Delivery. Best Prices.',
  version: '1.0.0',
  supportEmail: 'support@vumastore.store',
  website: 'https://vumastore.store',
  currency: 'TZS',
  currencySymbol: 'TZS ',
  commissionRate: 0.10,
  freeDeliveryThreshold: 50000,
  minPayoutAmount: 5000,
  maxDepositAmount: 10000000,
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

// ─── PRODUCT CATEGORIES (32 African market categories) ─
export const CATEGORIES = [
  { id: 'all', label: 'All', icon: '🏠', slug: '' },
  // Tech
  { id: 'electronics', label: 'Electronics', icon: '📺', slug: 'electronics' },
  { id: 'phones-accessories', label: 'Phones', icon: '📱', slug: 'phones-accessories' },
  { id: 'computers', label: 'Computers', icon: '💻', slug: 'computers' },
  // Fashion
  { id: 'fashion-men', label: "Men's Fashion", icon: '👔', slug: 'fashion-men' },
  { id: 'fashion-women', label: "Women's Fashion", icon: '👗', slug: 'fashion-women' },
  { id: 'kids-baby', label: 'Kids & Baby', icon: '👶', slug: 'kids-baby' },
  { id: 'shoes', label: 'Shoes', icon: '👟', slug: 'shoes' },
  { id: 'bags', label: 'Bags', icon: '👜', slug: 'bags' },
  { id: 'jewelry-watches', label: 'Jewelry', icon: '💍', slug: 'jewelry-watches' },
  // Beauty & Health
  { id: 'beauty', label: 'Beauty', icon: '💄', slug: 'beauty' },
  { id: 'health', label: 'Health', icon: '💊', slug: 'health' },
  // Home
  { id: 'home-living', label: 'Home & Living', icon: '🏡', slug: 'home-living' },
  { id: 'furniture', label: 'Furniture', icon: '🛋️', slug: 'furniture' },
  { id: 'kitchen', label: 'Kitchen', icon: '🍳', slug: 'kitchen' },
  // Food
  { id: 'food-groceries', label: 'Groceries', icon: '🛒', slug: 'food-groceries' },
  { id: 'fresh-produce', label: 'Fresh Produce', icon: '🥦', slug: 'fresh-produce' },
  // Agriculture — special Mazao section
  { id: 'mazao', label: 'Mazao 🌾', icon: '🌾', slug: 'mazao', isMazao: true },
  { id: 'livestock', label: 'Livestock', icon: '🐄', slug: 'livestock' },
  { id: 'agri-inputs', label: 'Agri Inputs', icon: '🌱', slug: 'agri-inputs' },
  // Construction
  { id: 'construction', label: 'Construction', icon: '🧱', slug: 'construction' },
  { id: 'hardware', label: 'Hardware', icon: '🔧', slug: 'hardware' },
  // Automotive
  { id: 'automotive', label: 'Automotive', icon: '🚗', slug: 'automotive' },
  // Other
  { id: 'books', label: 'Books', icon: '📚', slug: 'books' },
  { id: 'sports', label: 'Sports', icon: '⚽', slug: 'sports' },
  { id: 'toys', label: 'Toys', icon: '🧸', slug: 'toys' },
  { id: 'office', label: 'Office', icon: '🖊️', slug: 'office' },
  { id: 'pets', label: 'Pets', icon: '🐕', slug: 'pets' },
  { id: 'services', label: 'Services', icon: '🛠️', slug: 'services' },
  { id: 'others', label: 'Others', icon: '📦', slug: 'others' },
];

// ─── SIZE CATEGORIES (require size selection) ─────────
export const SIZE_CATEGORIES = [
  'fashion-men', 'fashion-women', 'kids-baby', 'shoes',
  'Fashion - Men', 'Fashion - Women', 'Kids & Baby', 'Shoes',
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
  { id: 'airtel', label: 'Airtel Money', icon: '📱' },
  { id: 'halopesa', label: 'HaloPesa', icon: '📱' },
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

  // Mazao
  MAZAO: 'Mazao',
  MAZAO_DETAIL: 'MazaoDetail',
  MAZAO_ADD: 'MazaoAddProduct',

  // Order
  ORDER_DETAIL: 'OrderDetail',

  // Payment
  WALLET: 'Wallet',
  CHECKOUT: 'Checkout',

  // Vendor
  VENDOR_DASHBOARD: 'VendorDashboard',
  VENDOR_PRODUCTS: 'VendorProducts',
  VENDOR_ORDERS: 'VendorOrders',
  VENDOR_REGISTER: 'VendorRegister',

  // Profile
  SETTINGS: 'Settings',
  ADDRESS: 'Address',

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