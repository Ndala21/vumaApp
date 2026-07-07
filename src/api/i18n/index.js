/**
 * VUMA Store — i18n Internationalization
 * Supports: English, Korean, Chinese, Swahili, French, Arabic
 */

import { I18nManager } from 'react-native';
import { storage } from '../../utils/storage';

// ── Translations ──────────────────────────────────────
const translations = {
  en: {
    // Common
    common: {
      loading: 'Loading...',
      error: 'Something went wrong.',
      retry: 'Try Again',
      cancel: 'Cancel',
      confirm: 'Confirm',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
      back: 'Back',
      next: 'Next',
      done: 'Done',
      yes: 'Yes',
      no: 'No',
      ok: 'OK',
      search: 'Search',
      filter: 'Filter',
      sort: 'Sort',
      all: 'All',
      none: 'None',
      submit: 'Submit',
      continue: 'Continue',
      skip: 'Skip',
      seeAll: 'See all',
      noResults: 'No results found',
      required: 'Required',
      optional: 'Optional',
    },

    // Auth
    auth: {
      login: 'Login',
      logout: 'Logout',
      register: 'Create Account',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      username: 'Username',
      phone: 'Phone Number',
      forgotPassword: 'Forgot password?',
      rememberMe: 'Remember me',
      noAccount: "Don't have an account?",
      haveAccount: 'Already have an account?',
      loginWithFaceID: 'Login with Face ID',
      loginWithFingerprint: 'Login with Fingerprint',
      welcomeBack: 'Welcome back 👋',
      createAccount: 'Create Account',
      loginSubtitle: 'Login to your account',
      registerSubtitle: 'Join millions of VUMA shoppers',
      agreeToTerms: "I agree to VUMA's",
      termsOfService: 'Terms of Service',
      privacyPolicy: 'Privacy Policy',
      becomeVendor: 'Want to sell on VUMA?',
      registerAsVendor: 'Register as vendor →',
    },

    // Home
    home: {
      flashSale: '⚡ Flash Sale',
      featured: '⭐ Featured',
      allProducts: '🛍️ All Products',
      freeShipping: '🚚 Free Delivery on orders over',
      shopNow: 'Shop Now!',
      searchPlaceholder: '🔍  Search products...',
    },

    // Products
    products: {
      addToCart: 'Add to Cart',
      buyNow: 'Buy Now',
      outOfStock: 'Out of Stock',
      inStock: 'In Stock',
      description: '📋 Description',
      details: '📦 Details',
      reviews: '⭐ Reviews',
      writeReview: 'Write Review',
      noReviews: 'No reviews yet. Be the first!',
      freeShipping: '🚚 Free Delivery',
      quantity: 'Quantity',
      available: 'available',
      sold: 'sold',
      category: 'Category',
      vendor: 'Vendor',
      sku: 'SKU',
      weight: 'Weight',
      share: 'Share',
      wishlist: 'Wishlist',
      added: '✓ Added!',
      relatedProducts: 'Related Products',
    },

    // Cart
    cart: {
      myCart: 'My Cart',
      emptyCart: 'Your cart is empty',
      emptyCartMessage: 'Browse products and add items to your cart',
      startShopping: 'Start Shopping',
      clearCart: 'Clear',
      checkout: 'Checkout',
      orderSummary: '📋 Order Summary',
      subtotal: 'Subtotal',
      shipping: 'Shipping',
      total: 'Total',
      free: 'FREE',
      freeShippingEarned: "🎉 You've earned Free Delivery!",
      addMoreForFreeShip: 'Add',
      moreForFreeShip: 'more for Free Delivery!',
      removeItem: 'Remove Item',
      removeItemMessage: 'Remove from cart?',
      clearCartMessage: 'Remove all items from cart?',
    },

    // Orders
    orders: {
      myOrders: 'My Orders',
      orderDetail: 'Order Details',
      orderNumber: 'Order Number',
      orderDate: 'Order Date',
      orderStatus: 'Order Status',
      orderProgress: '📍 Order Progress',
      items: 'Items',
      shippingAddress: '📍 Shipping Address',
      priceSummary: '💰 Price Summary',
      timeline: '🕐 Timeline',
      notes: '📝 Notes',
      cancelOrder: 'Cancel Order',
      cancelOrderMessage: 'Are you sure you want to cancel this order?',
      contactSupport: '💬 Contact Support',
      buyAgain: '🛍️ Buy Again',
      trackingNumber: 'Tracking Number',
      noOrders: 'No orders yet',
      noOrdersMessage: 'Start shopping to place your first order!',
      viewDetails: 'View Details →',
      pending: 'Pending',
      processing: 'Processing',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
      refunded: 'Refunded',
    },

    // Checkout
    checkout: {
      checkout: 'Checkout',
      deliveryAddress: '📍 Delivery Address',
      paymentMethod: '💳 Payment Method',
      orderReview: '📋 Order Review',
      addNewAddress: 'Add New Address',
      placeOrder: 'Place Order',
      confirmOrder: 'Confirm Order',
      confirmOrderMessage: 'Place order for',
      selectAddress: 'Please select a delivery address.',
      address: 'Address',
      payment: 'Payment',
      review: 'Review',
      deliveryTo: '📍 Delivery To',
      orderNotes: '📝 Order Notes (optional)',
      notesPlaceholder: 'Add notes for vendor...',
      securePayment: '🔒 Secure payment via Stripe.',
    },

    // Wallet
    wallet: {
      vumaWallet: 'VUMA Wallet',
      totalBalance: 'Total Balance',
      deposit: 'Deposit',
      transfer: 'Transfer',
      history: 'History',
      recentTransactions: '📋 Recent Transactions',
      depositFunds: '💰 Deposit Funds',
      transferFunds: '📤 Transfer Funds',
      amount: 'Amount',
      recipientEmail: 'Recipient Email',
      note: 'Note',
      proceedToPayment: 'Proceed to Payment',
      sendTransfer: 'Send Transfer',
      noTransactions: 'No transactions yet',
      available: 'Available',
      frozen: '🔒 Wallet Frozen',
    },

    // Profile
    profile: {
      profile: 'Profile',
      myOrders: 'My Orders',
      cart: 'Cart',
      wishlist: 'Wishlist',
      wallet: 'VUMA Wallet',
      returns: 'Returns & Refunds',
      chatSupport: '💬 Chat Support',
      notifications: 'Notifications',
      helpCenter: 'Help Center',
      becomeVendor: '🏪 Become a Vendor',
      commission: '10% commission',
      settings: 'Settings',
      privacy: 'Privacy & Security',
      terms: 'Terms of Service',
      logout: 'Logout',
      logoutConfirm: 'Are you sure?',
      memberSince: 'Member since',
      approvedVendor: '🏪 Approved Vendor',
      admin: '👑 Admin',
      customer: '🛍️ Customer',
      applicationPending: 'Application Under Review',
      applicationPendingMessage: "We'll notify you within 24-48 hours.",
      applicationRejected: 'Application Rejected',
    },

    // Settings
    settings: {
      settings: 'Settings',
      editProfile: '✏️ Edit Profile',
      changePassword: '🔒 Change Password',
      language: 'LANGUAGE',
      notifications: 'NOTIFICATIONS',
      appInfo: 'APP INFO',
      dangerZone: 'DANGER ZONE',
      deleteAccount: '🗑️ Delete Account',
      saveChanges: 'Save Changes',
      currentPassword: 'Current Password',
      newPassword: 'New Password',
      confirmPassword: 'Confirm Password',
      orderUpdates: '📦 Order Updates',
      paymentAlerts: '💳 Payment Alerts',
      promotions: '🎁 Promotions & Deals',
      systemNotifications: '🔔 System Notifications',
      version: 'Version',
      build: 'Build',
      environment: 'Environment',
    },

    // Vendor
    vendor: {
      dashboard: 'Dashboard',
      myProducts: 'My Products',
      customerOrders: 'Customer Orders',
      totalEarnings: 'Total Earnings',
      requestPayout: '💸 Request Payout',
      addProduct: '➕ Add Product',
      viewOrders: '📋 View Orders',
      inventory: '📦 Inventory',
      messages: '💬 Messages',
      recentOrders: '🛒 Recent Orders',
      topProducts: '🏆 Top Products',
      lowStockAlert: '⚠️ Low Stock Alert',
      storeInfo: '🏪 Store Info',
      thisMonth: '📈 This Month',
      revenue: 'Revenue',
      newCustomers: 'New Customers',
      addNewProduct: 'Add Product',
      editProduct: '✏️ Edit Product',
      productName: 'Product Name',
      description: 'Description',
      price: 'Price',
      stock: 'Stock',
      category: 'Category',
      updateStatus: '📦 Update Order Status',
      yourEarnings: 'Your Earnings',
    },

    // Chat
    chat: {
      vendorChat: '🏪 Vendor Chat',
      support: '🤖 VUMA Support',
      online: 'Online',
      connecting: 'Connecting...',
      typeMessage: 'Type a message...',
      sendMessage: 'Send',
      noMessages: 'Send a message to start chatting',
    },

    // Notifications
    notifications: {
      notifications: 'Notifications',
      unread: 'unread',
      markAllRead: 'Mark all read',
      clearAll: 'Clear all',
      noNotifications: 'No notifications',
      noNotificationsMessage: "You're all caught up!",
    },

    // Onboarding
    onboarding: {
      getStarted: '🚀 Get Started',
      next: 'Next →',
      alreadyHaveAccount: 'Already have an account?',
      login: 'Login',
      selectLanguage: '🌍 Select Language',
      slide1Title: 'Welcome to VUMA',
      slide1Subtitle: 'Smart shopping. Fast delivery.\nBest prices in Africa & Asia.',
      slide2Title: 'Fast Delivery',
      slide2Subtitle: 'Get your orders delivered quickly\nwherever you are.',
      slide3Title: 'Multi-Vendor Marketplace',
      slide3Subtitle: 'Thousands of verified vendors.\nMillions of products.',
      slide4Title: 'Secure Payments',
      slide4Subtitle: 'Pay with Card, M-Pesa, Wallet\nand more. Always secure.',
    },

    // Errors
    errors: {
      networkError: 'No internet connection. Check your network.',
      timeout: 'Request timed out. Please try again.',
      sessionExpired: 'Your session has expired. Please login again.',
      forbidden: 'You do not have permission to do this.',
      notFound: 'The requested item was not found.',
      serverError: 'Server error. Please try again later.',
      somethingWentWrong: 'Something went wrong. Please try again.',
      emailRequired: 'Email is required.',
      invalidEmail: 'Invalid email address.',
      passwordRequired: 'Password is required.',
      passwordTooShort: 'Password must be at least 6 characters.',
      passwordsDoNotMatch: 'Passwords do not match.',
      usernameRequired: 'Username is required.',
      usernameTooShort: 'Username must be at least 3 characters.',
      agreeToTerms: 'Please agree to Terms & Conditions.',
    },
  },

  // ── Korean ──────────────────────────────────────────
  ko: {
    common: {
      loading: '로딩 중...',
      error: '오류가 발생했습니다.',
      retry: '다시 시도',
      cancel: '취소',
      confirm: '확인',
      save: '저장',
      delete: '삭제',
      edit: '수정',
      close: '닫기',
      back: '뒤로',
      next: '다음',
      done: '완료',
      yes: '예',
      no: '아니요',
      ok: '확인',
      search: '검색',
      filter: '필터',
      sort: '정렬',
      all: '전체',
      seeAll: '전체보기',
      noResults: '결과가 없습니다',
      required: '필수',
      optional: '선택',
      submit: '제출',
      continue: '계속',
      skip: '건너뛰기',
    },
    auth: {
      login: '로그인',
      logout: '로그아웃',
      register: '회원가입',
      email: '이메일',
      password: '비밀번호',
      confirmPassword: '비밀번호 확인',
      username: '사용자명',
      phone: '전화번호',
      forgotPassword: '비밀번호를 잊으셨나요?',
      rememberMe: '로그인 상태 유지',
      noAccount: '계정이 없으신가요?',
      haveAccount: '이미 계정이 있으신가요?',
      welcomeBack: '다시 오셨군요 👋',
      loginSubtitle: '계정에 로그인하세요',
      becomeVendor: 'VUMA에서 판매하시겠어요?',
      registerAsVendor: '판매자로 등록 →',
    },
    home: {
      flashSale: '⚡ 특가 세일',
      featured: '⭐ 추천 상품',
      allProducts: '🛍️ 전체 상품',
      freeShipping: '🚚 무료배송 혜택',
      shopNow: '지금 쇼핑하기!',
      searchPlaceholder: '🔍  상품 검색...',
    },
    products: {
      addToCart: '장바구니 담기',
      buyNow: '바로 구매',
      outOfStock: '품절',
      inStock: '재고 있음',
      freeShipping: '🚚 무료배송',
      quantity: '수량',
      sold: '판매됨',
    },
    cart: {
      myCart: '장바구니',
      emptyCart: '장바구니가 비어있습니다',
      checkout: '결제하기',
      subtotal: '소계',
      shipping: '배송비',
      total: '합계',
      free: '무료',
    },
    orders: {
      myOrders: '내 주문',
      pending: '대기중',
      processing: '처리중',
      shipped: '배송중',
      delivered: '배송완료',
      cancelled: '취소됨',
    },
    errors: {
      networkError: '인터넷 연결을 확인해주세요.',
      somethingWentWrong: '오류가 발생했습니다. 다시 시도해주세요.',
    },
  },

  // ── Chinese ─────────────────────────────────────────
  zh: {
    common: {
      loading: '加载中...',
      error: '出现错误。',
      retry: '重试',
      cancel: '取消',
      confirm: '确认',
      save: '保存',
      delete: '删除',
      edit: '编辑',
      close: '关闭',
      back: '返回',
      next: '下一步',
      done: '完成',
      yes: '是',
      no: '否',
      ok: '确定',
      search: '搜索',
      seeAll: '查看全部',
      noResults: '没有找到结果',
      submit: '提交',
      continue: '继续',
      skip: '跳过',
    },
    auth: {
      login: '登录',
      logout: '退出',
      register: '注册',
      email: '邮箱',
      password: '密码',
      username: '用户名',
      phone: '手机号',
      forgotPassword: '忘记密码？',
      rememberMe: '记住我',
      noAccount: '没有账号？',
      haveAccount: '已有账号？',
      welcomeBack: '欢迎回来 👋',
      becomeVendor: '想在VUMA上销售？',
      registerAsVendor: '注册成为卖家 →',
    },
    home: {
      flashSale: '⚡ 限时特卖',
      featured: '⭐ 精选商品',
      allProducts: '🛍️ 全部商品',
      searchPlaceholder: '🔍  搜索商品...',
    },
    products: {
      addToCart: '加入购物车',
      buyNow: '立即购买',
      outOfStock: '缺货',
      freeShipping: '🚚 免费配送',
      quantity: '数量',
    },
    cart: {
      myCart: '购物车',
      checkout: '结账',
      subtotal: '小计',
      shipping: '运费',
      total: '合计',
      free: '免费',
    },
    orders: {
      myOrders: '我的订单',
      pending: '待处理',
      processing: '处理中',
      shipped: '已发货',
      delivered: '已送达',
      cancelled: '已取消',
    },
    errors: {
      networkError: '请检查网络连接。',
      somethingWentWrong: '出现错误，请重试。',
    },
  },

  // ── Swahili ─────────────────────────────────────────
  sw: {
    common: {
      loading: 'Inapakia...',
      error: 'Hitilafu imetokea.',
      retry: 'Jaribu Tena',
      cancel: 'Ghairi',
      confirm: 'Thibitisha',
      save: 'Hifadhi',
      delete: 'Futa',
      edit: 'Hariri',
      close: 'Funga',
      back: 'Rudi',
      next: 'Ifuatayo',
      done: 'Imekamilika',
      yes: 'Ndiyo',
      no: 'Hapana',
      ok: 'Sawa',
      search: 'Tafuta',
      seeAll: 'Ona yote',
      noResults: 'Hakuna matokeo',
      submit: 'Wasilisha',
      continue: 'Endelea',
      skip: 'Ruka',
    },
    auth: {
      login: 'Ingia',
      logout: 'Toka',
      register: 'Jisajili',
      email: 'Barua pepe',
      password: 'Nywila',
      username: 'Jina la mtumiaji',
      phone: 'Nambari ya simu',
      forgotPassword: 'Umesahau nywila?',
      rememberMe: 'Nikumbuke',
      noAccount: 'Huna akaunti?',
      haveAccount: 'Una akaunti tayari?',
      welcomeBack: 'Karibu tena 👋',
      becomeVendor: 'Unataka kuuza VUMA?',
      registerAsVendor: 'Jiandikishe kama muuzaji →',
    },
    home: {
      flashSale: '⚡ Mauzo ya Haraka',
      featured: '⭐ Iliyoangaziwa',
      allProducts: '🛍️ Bidhaa Zote',
      searchPlaceholder: '🔍  Tafuta bidhaa...',
    },
    products: {
      addToCart: 'Ongeza kwenye Kikapu',
      buyNow: 'Nunua Sasa',
      outOfStock: 'Haina Stok',
      freeShipping: '🚚 Usafirishaji Bure',
      quantity: 'Wingi',
    },
    cart: {
      myCart: 'Kikapu Changu',
      checkout: 'Lipia',
      subtotal: 'Jumla ndogo',
      shipping: 'Usafirishaji',
      total: 'Jumla',
      free: 'BURE',
    },
    orders: {
      myOrders: 'Maagizo Yangu',
      pending: 'Inasubiri',
      processing: 'Inashughulikiwa',
      shipped: 'Imesafirishwa',
      delivered: 'Imewasilishwa',
      cancelled: 'Imeghairiwa',
    },
    errors: {
      networkError: 'Hakuna muunganisho wa intaneti.',
      somethingWentWrong: 'Hitilafu imetokea. Jaribu tena.',
    },
  },

  // ── French ──────────────────────────────────────────
  fr: {
    common: {
      loading: 'Chargement...',
      error: 'Une erreur est survenue.',
      retry: 'Réessayer',
      cancel: 'Annuler',
      confirm: 'Confirmer',
      save: 'Enregistrer',
      delete: 'Supprimer',
      edit: 'Modifier',
      close: 'Fermer',
      back: 'Retour',
      next: 'Suivant',
      done: 'Terminé',
      yes: 'Oui',
      no: 'Non',
      ok: 'OK',
      search: 'Rechercher',
      seeAll: 'Voir tout',
      noResults: 'Aucun résultat',
      submit: 'Soumettre',
      continue: 'Continuer',
      skip: 'Passer',
    },
    auth: {
      login: 'Connexion',
      logout: 'Déconnexion',
      register: 'Créer un compte',
      email: 'E-mail',
      password: 'Mot de passe',
      username: "Nom d'utilisateur",
      phone: 'Téléphone',
      forgotPassword: 'Mot de passe oublié?',
      rememberMe: 'Se souvenir de moi',
      noAccount: 'Pas de compte?',
      haveAccount: 'Déjà un compte?',
      welcomeBack: 'Bon retour 👋',
      becomeVendor: 'Vendre sur VUMA?',
      registerAsVendor: "S'inscrire comme vendeur →",
    },
    home: {
      flashSale: '⚡ Vente Flash',
      featured: '⭐ À la une',
      allProducts: '🛍️ Tous les produits',
      searchPlaceholder: '🔍  Rechercher des produits...',
    },
    products: {
      addToCart: 'Ajouter au panier',
      buyNow: 'Acheter maintenant',
      outOfStock: 'Rupture de stock',
      freeShipping: '🚚 Livraison gratuite',
      quantity: 'Quantité',
    },
    cart: {
      myCart: 'Mon panier',
      checkout: 'Commander',
      subtotal: 'Sous-total',
      shipping: 'Livraison',
      total: 'Total',
      free: 'GRATUIT',
    },
    orders: {
      myOrders: 'Mes commandes',
      pending: 'En attente',
      processing: 'En traitement',
      shipped: 'Expédié',
      delivered: 'Livré',
      cancelled: 'Annulé',
    },
    errors: {
      networkError: 'Pas de connexion internet.',
      somethingWentWrong: 'Une erreur est survenue. Réessayez.',
    },
  },

  // ── Arabic ──────────────────────────────────────────
  ar: {
    common: {
      loading: '...جار التحميل',
      error: 'حدث خطأ ما.',
      retry: 'حاول مجدداً',
      cancel: 'إلغاء',
      confirm: 'تأكيد',
      save: 'حفظ',
      delete: 'حذف',
      edit: 'تعديل',
      close: 'إغلاق',
      back: 'رجوع',
      next: 'التالي',
      done: 'تم',
      yes: 'نعم',
      no: 'لا',
      ok: 'موافق',
      search: 'بحث',
      seeAll: 'عرض الكل',
      noResults: 'لا توجد نتائج',
      submit: 'إرسال',
      continue: 'متابعة',
      skip: 'تخطي',
    },
    auth: {
      login: 'تسجيل الدخول',
      logout: 'تسجيل الخروج',
      register: 'إنشاء حساب',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      username: 'اسم المستخدم',
      phone: 'رقم الهاتف',
      forgotPassword: 'نسيت كلمة المرور؟',
      rememberMe: 'تذكرني',
      noAccount: 'ليس لديك حساب؟',
      haveAccount: 'لديك حساب بالفعل؟',
      welcomeBack: '👋 مرحباً بعودتك',
      becomeVendor: 'تريد البيع على VUMA؟',
      registerAsVendor: 'سجل كبائع ←',
    },
    home: {
      flashSale: '⚡ تخفيضات سريعة',
      featured: '⭐ منتجات مميزة',
      allProducts: '🛍️ جميع المنتجات',
      searchPlaceholder: '...🔍  ابحث عن منتجات',
    },
    products: {
      addToCart: 'أضف إلى السلة',
      buyNow: 'اشتر الآن',
      outOfStock: 'نفذت الكمية',
      freeShipping: '🚚 شحن مجاني',
      quantity: 'الكمية',
    },
    cart: {
      myCart: 'سلة التسوق',
      checkout: 'إتمام الشراء',
      subtotal: 'المجموع الفرعي',
      shipping: 'الشحن',
      total: 'الإجمالي',
      free: 'مجاني',
    },
    orders: {
      myOrders: 'طلباتي',
      pending: 'قيد الانتظار',
      processing: 'قيد المعالجة',
      shipped: 'تم الشحن',
      delivered: 'تم التسليم',
      cancelled: 'ملغي',
    },
    errors: {
      networkError: 'لا يوجد اتصال بالإنترنت.',
      somethingWentWrong: 'حدث خطأ ما. حاول مجدداً.',
    },
  },
};

// ── i18n Class ────────────────────────────────────────
class I18n {
  constructor() {
    this.locale = 'en';
    this.translations = translations;
    this.rtlLanguages = ['ar'];
  }

  /**
   * Initialize with saved language
   */
  async init() {
    try {
      const savedLang = await storage.getLanguage();
      this.setLocale(savedLang || 'en');
    } catch {
      this.setLocale('en');
    }
  }

  /**
   * Set active language
   */
  setLocale(locale) {
    if (this.translations[locale]) {
      this.locale = locale;
    } else {
      this.locale = 'en';
    }
    // Handle RTL
    const isRTL = this.rtlLanguages.includes(this.locale);
    I18nManager.allowRTL(isRTL);
    I18nManager.forceRTL(isRTL);
  }

  /**
   * Get current locale
   */
  getLocale() {
    return this.locale;
  }

  /**
   * Check if current language is RTL
   */
  isRTL() {
    return this.rtlLanguages.includes(this.locale);
  }

  /**
   * Translate a key
   * Usage: t('auth.login') → 'Login'
   * Usage: t('cart.total') → 'Total'
   */
  t(key, params = {}) {
    try {
      const keys = key.split('.');
      let value =
        this.translations[this.locale] ||
        this.translations['en'];

      for (const k of keys) {
        value = value?.[k];
        if (value === undefined) break;
      }

      // Fallback to English
      if (value === undefined) {
        let fallback = this.translations['en'];
        for (const k of keys) {
          fallback = fallback?.[k];
          if (fallback === undefined) break;
        }
        value = fallback || key;
      }

      // Replace params
      if (typeof value === 'string' && Object.keys(params).length > 0) {
        Object.keys(params).forEach((param) => {
          value = value.replace(`{${param}}`, params[param]);
        });
      }

      return value || key;
    } catch {
      return key;
    }
  }
}

// ── Singleton Instance ────────────────────────────────
export const i18n = new I18n();

/**
 * Shorthand translate function
 * Usage: t('auth.login')
 */
export const t = (key, params) => i18n.t(key, params);

/**
 * Get all available languages
 */
export const getAvailableLanguages = () => [
  { code: 'en', name: 'English', flag: '🇺🇸', rtl: false },
  { code: 'ko', name: '한국어', flag: '🇰🇷', rtl: false },
  { code: 'zh', name: '中文', flag: '🇨🇳', rtl: false },
  { code: 'sw', name: 'Kiswahili', flag: '🇹🇿', rtl: false },
  { code: 'fr', name: 'Français', flag: '🇫🇷', rtl: false },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', rtl: true },
];

export default i18n;
