/**
 * VUMA Store — i18n Internationalization
 * Supports: English, Korean, Chinese, Swahili, French, Arabic
 */

import { I18nManager } from 'react-native';
import { storage } from '../utils/storage';

const translations = {
  en: {
    common: {
      loading: 'Loading...', error: 'Something went wrong.', retry: 'Try Again',
      cancel: 'Cancel', confirm: 'Confirm', save: 'Save', delete: 'Delete',
      edit: 'Edit', close: 'Close', back: 'Back', next: 'Next', done: 'Done',
      yes: 'Yes', no: 'No', ok: 'OK', search: 'Search', filter: 'Filter',
      sort: 'Sort', all: 'All', seeAll: 'See all', noResults: 'No results found',
      required: 'Required', optional: 'Optional', submit: 'Submit', continue: 'Continue', skip: 'Skip',
    },
    auth: {
      login: 'Login', logout: 'Logout', register: 'Create Account', email: 'Email',
      password: 'Password', confirmPassword: 'Confirm Password', username: 'Username',
      phone: 'Phone Number', forgotPassword: 'Forgot password?', rememberMe: 'Remember me',
      noAccount: "Don't have an account?", haveAccount: 'Already have an account?',
      loginWithFaceID: 'Login with Face ID', loginWithFingerprint: 'Login with Fingerprint',
      welcomeBack: 'Welcome back 👋', createAccount: 'Create Account',
      loginSubtitle: 'Login to your account', registerSubtitle: 'Join millions of VUMA shoppers',
      becomeVendor: 'Want to sell on VUMA?', registerAsVendor: 'Register as vendor →',
    },
    home: {
      flashSale: '⚡ Flash Sale', featured: '⭐ Featured', allProducts: '🛍️ All Products',
      freeShipping: '🚚 Free Delivery on orders over', shopNow: 'Shop Now!',
      searchPlaceholder: '🔍 Search products...',
    },
    products: {
      addToCart: 'Add to Cart', buyNow: 'Buy Now', outOfStock: 'Out of Stock',
      inStock: 'In Stock', freeShipping: '🚚 Free Delivery', quantity: 'Quantity',
      sold: 'sold', reviews: '⭐ Reviews', wishlist: 'Wishlist', description: 'Description',
      details: 'Details', writeReview: 'Write Review', noReviews: 'No reviews yet',
      relatedProducts: 'Related Products', share: 'Share',
    },
    cart: {
      myCart: 'My Cart', emptyCart: 'Your cart is empty',
      emptyCartMessage: 'Browse products and add items to your cart',
      startShopping: 'Start Shopping', checkout: 'Checkout', clearCart: 'Clear',
      orderSummary: 'Order Summary', subtotal: 'Subtotal', shipping: 'Shipping',
      total: 'Total', free: 'FREE', freeShippingEarned: "🎉 You've earned Free Delivery!",
      removeItem: 'Remove Item', clearCartMessage: 'Remove all items from cart?',
    },
    orders: {
      myOrders: 'My Orders', orderDetail: 'Order Details', orderNumber: 'Order Number',
      orderDate: 'Order Date', orderStatus: 'Order Status', items: 'Items',
      shippingAddress: 'Shipping Address', priceSummary: 'Price Summary',
      cancelOrder: 'Cancel Order', contactSupport: 'Contact Support', buyAgain: 'Buy Again',
      noOrders: 'No orders yet', noOrdersMessage: 'Start shopping to place your first order!',
      viewDetails: 'View Details →', pending: 'Pending', processing: 'Processing',
      shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled', refunded: 'Refunded',
    },
    checkout: {
      checkout: 'Checkout', deliveryAddress: 'Delivery Address', paymentMethod: 'Payment Method',
      orderReview: 'Order Review', addNewAddress: 'Add New Address', placeOrder: 'Place Order',
      confirmOrder: 'Confirm Order', selectAddress: 'Please select a delivery address.',
      address: 'Address', payment: 'Payment', review: 'Review',
      securePayment: '🔒 Secure payment via Stripe.',
    },
    wallet: {
      vumaWallet: 'VUMA Wallet', totalBalance: 'Total Balance', deposit: 'Deposit',
      transfer: 'Transfer', history: 'History', recentTransactions: 'Recent Transactions',
      depositFunds: 'Deposit Funds', transferFunds: 'Transfer Funds', amount: 'Amount',
      recipientEmail: 'Recipient Email', noTransactions: 'No transactions yet',
      available: 'Available', frozen: '🔒 Wallet Frozen',
    },
    profile: {
      profile: 'Profile', myOrders: 'My Orders', cart: 'Cart', wishlist: 'Wishlist',
      wallet: 'VUMA Wallet', returns: 'Returns & Refunds', chatSupport: '💬 Chat Support',
      notifications: 'Notifications', helpCenter: 'Help Center',
      becomeVendor: '🏪 Become a Vendor', commission: '10% commission',
      settings: 'Settings', privacy: 'Privacy & Security', terms: 'Terms of Service',
      logout: 'Logout', logoutConfirm: 'Are you sure?', memberSince: 'Member since',
      approvedVendor: '🏪 Approved Vendor', admin: '👑 Admin', customer: '🛍️ Customer',
      orders: 'Orders', reviews: 'Reviews',
    },
    settings: {
      settings: 'Settings', editProfile: '✏️ Edit Profile', changePassword: '🔒 Change Password',
      language: 'LANGUAGE', notifications: 'NOTIFICATIONS', appInfo: 'APP INFO',
      dangerZone: 'DANGER ZONE', deleteAccount: '🗑️ Delete Account',
      saveChanges: 'Save Changes', currentPassword: 'Current Password',
      newPassword: 'New Password', confirmPassword: 'Confirm Password',
      orderUpdates: '📦 Order Updates', paymentAlerts: '💳 Payment Alerts',
      promotions: '🎁 Promotions & Deals', systemNotifications: '🔔 System Notifications',
      version: 'Version', build: 'Build', environment: 'Environment',
      countryLanguageCurrency: 'COUNTRY, LANGUAGE & CURRENCY',
      country: 'Country/Region', currency: 'Currency',
    },
    vendor: {
      dashboard: 'Dashboard', myProducts: 'My Products', customerOrders: 'Customer Orders',
      totalEarnings: 'Total Earnings', requestPayout: '💸 Request Payout',
      addProduct: '➕ Add Product', viewOrders: '📋 View Orders',
      inventory: '📦 Inventory', messages: '💬 Messages', recentOrders: '🛒 Recent Orders',
      topProducts: '🏆 Top Products', storeInfo: '🏪 Store Info',
      revenue: 'Revenue', newCustomers: 'New Customers',
    },
    chat: {
      vendorChat: '🏪 Vendor Chat', support: '🤖 VUMA Support', online: 'Online',
      connecting: 'Connecting...', typeMessage: 'Type a message...', sendMessage: 'Send',
      noMessages: 'Send a message to start chatting',
    },
    notifications: {
      notifications: 'Notifications', unread: 'unread', markAllRead: 'Mark all read',
      clearAll: 'Clear all', noNotifications: 'No notifications',
      noNotificationsMessage: "You're all caught up!",
    },
    errors: {
      networkError: 'No internet connection. Check your network.',
      timeout: 'Request timed out. Please try again.',
      sessionExpired: 'Your session has expired. Please login again.',
      somethingWentWrong: 'Something went wrong. Please try again.',
    },
  },

  ko: {
    common: {
      loading: '로딩 중...', error: '오류가 발생했습니다.', retry: '다시 시도',
      cancel: '취소', confirm: '확인', save: '저장', delete: '삭제',
      edit: '수정', close: '닫기', back: '뒤로', next: '다음', done: '완료',
      yes: '예', no: '아니요', ok: '확인', search: '검색', filter: '필터',
      sort: '정렬', all: '전체', seeAll: '전체보기', noResults: '결과가 없습니다',
      required: '필수', optional: '선택', submit: '제출', continue: '계속', skip: '건너뛰기',
    },
    auth: {
      login: '로그인', logout: '로그아웃', register: '회원가입', email: '이메일',
      password: '비밀번호', confirmPassword: '비밀번호 확인', username: '사용자명',
      phone: '전화번호', forgotPassword: '비밀번호를 잊으셨나요?', rememberMe: '로그인 상태 유지',
      noAccount: '계정이 없으신가요?', haveAccount: '이미 계정이 있으신가요?',
      loginWithFaceID: 'Face ID로 로그인', loginWithFingerprint: '지문으로 로그인',
      welcomeBack: '다시 오셨군요 👋', createAccount: '회원가입',
      loginSubtitle: '계정에 로그인하세요', registerSubtitle: '수백만 VUMA 쇼퍼와 함께하세요',
      becomeVendor: 'VUMA에서 판매하시겠어요?', registerAsVendor: '판매자로 등록 →',
    },
    home: {
      flashSale: '⚡ 특가 세일', featured: '⭐ 추천 상품', allProducts: '🛍️ 전체 상품',
      freeShipping: '🚚 무료배송 혜택', shopNow: '지금 쇼핑하기!', searchPlaceholder: '🔍  상품 검색...',
    },
    products: {
      addToCart: '장바구니 담기', buyNow: '바로 구매', outOfStock: '품절', inStock: '재고 있음',
      freeShipping: '🚚 무료배송', quantity: '수량', sold: '판매됨', reviews: '⭐ 리뷰',
      wishlist: '위시리스트', description: '상품 설명', details: '상세 정보',
      writeReview: '리뷰 작성', noReviews: '리뷰가 없습니다', relatedProducts: '관련 상품', share: '공유',
    },
    cart: {
      myCart: '장바구니', emptyCart: '장바구니가 비어있습니다',
      emptyCartMessage: '상품을 둘러보고 장바구니에 추가하세요',
      startShopping: '쇼핑 시작', checkout: '결제하기', clearCart: '비우기',
      orderSummary: '주문 요약', subtotal: '소계', shipping: '배송비',
      total: '합계', free: '무료', freeShippingEarned: '🎉 무료배송 혜택을 받으셨습니다!',
      removeItem: '상품 삭제', clearCartMessage: '장바구니를 비우시겠습니까?',
    },
    orders: {
      myOrders: '내 주문', orderDetail: '주문 상세', orderNumber: '주문 번호',
      orderDate: '주문 날짜', orderStatus: '주문 상태', items: '상품',
      shippingAddress: '배송 주소', priceSummary: '가격 요약',
      cancelOrder: '주문 취소', contactSupport: '고객센터 문의', buyAgain: '재구매',
      noOrders: '주문 내역이 없습니다', noOrdersMessage: '첫 주문을 해보세요!',
      viewDetails: '상세 보기 →', pending: '대기중', processing: '처리중',
      shipped: '배송중', delivered: '배송완료', cancelled: '취소됨', refunded: '환불됨',
    },
    checkout: {
      checkout: '결제', deliveryAddress: '배송 주소', paymentMethod: '결제 방법',
      orderReview: '주문 확인', addNewAddress: '새 주소 추가', placeOrder: '주문하기',
      confirmOrder: '주문 확인', selectAddress: '배송 주소를 선택해주세요.',
      address: '주소', payment: '결제', review: '확인', securePayment: '🔒 Stripe로 안전하게 결제합니다.',
    },
    wallet: {
      vumaWallet: 'VUMA 지갑', totalBalance: '총 잔액', deposit: '충전',
      transfer: '이체', history: '내역', recentTransactions: '최근 거래',
      depositFunds: '자금 충전', transferFunds: '자금 이체', amount: '금액',
      recipientEmail: '수신자 이메일', noTransactions: '거래 내역이 없습니다',
      available: '사용 가능', frozen: '🔒 지갑 동결됨',
    },
    profile: {
      profile: '프로필', myOrders: '내 주문', cart: '장바구니', wishlist: '위시리스트',
      wallet: 'VUMA 지갑', returns: '반품 및 환불', chatSupport: '💬 채팅 지원',
      notifications: '알림', helpCenter: '고객센터',
      becomeVendor: '🏪 판매자 되기', commission: '10% 수수료',
      settings: '설정', privacy: '개인정보 및 보안', terms: '이용약관',
      logout: '로그아웃', logoutConfirm: '로그아웃하시겠습니까?', memberSince: '가입일',
      approvedVendor: '🏪 승인된 판매자', admin: '👑 관리자', customer: '🛍️ 고객',
      orders: '주문', reviews: '리뷰',
    },
    settings: {
      settings: '설정', editProfile: '✏️ 프로필 편집', changePassword: '🔒 비밀번호 변경',
      language: '언어', notifications: '알림', appInfo: '앱 정보',
      dangerZone: '위험 구역', deleteAccount: '🗑️ 계정 삭제',
      saveChanges: '변경사항 저장', currentPassword: '현재 비밀번호',
      newPassword: '새 비밀번호', confirmPassword: '비밀번호 확인',
      orderUpdates: '📦 주문 업데이트', paymentAlerts: '💳 결제 알림',
      promotions: '🎁 프로모션 및 할인', systemNotifications: '🔔 시스템 알림',
      version: '버전', build: '빌드', environment: '환경',
      countryLanguageCurrency: '국가, 언어 및 통화',
      country: '국가/지역', currency: '통화',
    },
    vendor: {
      dashboard: '대시보드', myProducts: '내 상품', customerOrders: '고객 주문',
      totalEarnings: '총 수익', requestPayout: '💸 정산 요청',
      addProduct: '➕ 상품 추가', viewOrders: '📋 주문 보기',
      inventory: '📦 재고', messages: '💬 메시지', recentOrders: '🛒 최근 주문',
      topProducts: '🏆 인기 상품', storeInfo: '🏪 스토어 정보',
      revenue: '수익', newCustomers: '신규 고객',
    },
    chat: {
      vendorChat: '🏪 판매자 채팅', support: '🤖 VUMA 지원', online: '온라인',
      connecting: '연결 중...', typeMessage: '메시지를 입력하세요...', sendMessage: '전송',
      noMessages: '메시지를 보내 채팅을 시작하세요',
    },
    notifications: {
      notifications: '알림', unread: '읽지 않음', markAllRead: '모두 읽음',
      clearAll: '모두 지우기', noNotifications: '알림이 없습니다',
      noNotificationsMessage: '모두 확인했습니다!',
    },
    errors: {
      networkError: '인터넷 연결을 확인해주세요.',
      timeout: '요청 시간이 초과되었습니다.',
      sessionExpired: '세션이 만료되었습니다. 다시 로그인해주세요.',
      somethingWentWrong: '오류가 발생했습니다. 다시 시도해주세요.',
    },
  },

  zh: {
    common: {
      loading: '加载中...', error: '出现错误。', retry: '重试', cancel: '取消', confirm: '确认',
      save: '保存', delete: '删除', edit: '编辑', close: '关闭', back: '返回',
      next: '下一步', done: '完成', yes: '是', no: '否', ok: '确定', search: '搜索',
      filter: '筛选', sort: '排序', all: '全部', seeAll: '查看全部',
      noResults: '没有找到结果', submit: '提交', continue: '继续', skip: '跳过',
    },
    auth: {
      login: '登录', logout: '退出', register: '注册', email: '邮箱', password: '密码',
      confirmPassword: '确认密码', username: '用户名', phone: '手机号',
      forgotPassword: '忘记密码？', rememberMe: '记住我',
      noAccount: '没有账号？', haveAccount: '已有账号？', welcomeBack: '欢迎回来 👋',
      loginWithFaceID: '面容ID登录', loginWithFingerprint: '指纹登录',
      createAccount: '注册账号', loginSubtitle: '登录您的账号',
      becomeVendor: '想在VUMA上销售？', registerAsVendor: '注册成为卖家 →',
    },
    home: {
      flashSale: '⚡ 限时特卖', featured: '⭐ 精选商品', allProducts: '🛍️ 全部商品',
      freeShipping: '🚚 免费配送', shopNow: '立即购物！', searchPlaceholder: '🔍  搜索商品...',
    },
    products: {
      addToCart: '加入购物车', buyNow: '立即购买', outOfStock: '缺货', inStock: '有货',
      freeShipping: '🚚 免费配送', quantity: '数量', sold: '已售', reviews: '⭐ 评价',
      wishlist: '收藏', description: '商品描述', details: '详情',
      writeReview: '写评价', noReviews: '暂无评价', relatedProducts: '相关商品', share: '分享',
    },
    cart: {
      myCart: '购物车', emptyCart: '购物车是空的', emptyCartMessage: '浏览商品并添加到购物车',
      startShopping: '开始购物', checkout: '结账', clearCart: '清空',
      orderSummary: '订单摘要', subtotal: '小计', shipping: '运费',
      total: '合计', free: '免费', freeShippingEarned: '🎉 您已获得免费配送！',
      removeItem: '删除商品', clearCartMessage: '确定清空购物车？',
    },
    orders: {
      myOrders: '我的订单', orderDetail: '订单详情', orderNumber: '订单号',
      orderDate: '下单日期', orderStatus: '订单状态', items: '商品',
      shippingAddress: '收货地址', priceSummary: '价格明细',
      cancelOrder: '取消订单', contactSupport: '联系客服', buyAgain: '再次购买',
      noOrders: '暂无订单', noOrdersMessage: '开始购物吧！',
      viewDetails: '查看详情 →', pending: '待处理', processing: '处理中',
      shipped: '已发货', delivered: '已送达', cancelled: '已取消', refunded: '已退款',
    },
    checkout: {
      checkout: '结账', deliveryAddress: '收货地址', paymentMethod: '支付方式',
      orderReview: '确认订单', addNewAddress: '添加新地址', placeOrder: '下单',
      confirmOrder: '确认订单', selectAddress: '请选择收货地址。',
      address: '地址', payment: '支付', review: '确认', securePayment: '🔒 通过Stripe安全支付。',
    },
    wallet: {
      vumaWallet: 'VUMA钱包', totalBalance: '总余额', deposit: '充值',
      transfer: '转账', history: '记录', recentTransactions: '最近交易',
      depositFunds: '充值资金', transferFunds: '转账', amount: '金额',
      recipientEmail: '收款人邮箱', noTransactions: '暂无交易记录',
      available: '可用余额', frozen: '🔒 钱包已冻结',
    },
    profile: {
      profile: '个人中心', myOrders: '我的订单', cart: '购物车', wishlist: '收藏',
      wallet: 'VUMA钱包', returns: '退换货', chatSupport: '💬 在线客服',
      notifications: '通知', helpCenter: '帮助中心',
      becomeVendor: '🏪 成为卖家', commission: '10%佣金',
      settings: '设置', privacy: '隐私与安全', terms: '服务条款',
      logout: '退出登录', logoutConfirm: '确定退出？', memberSince: '注册时间',
      approvedVendor: '🏪 认证卖家', admin: '👑 管理员', customer: '🛍️ 买家',
      orders: '订单', reviews: '评价',
    },
    settings: {
      settings: '设置', editProfile: '✏️ 编辑资料', changePassword: '🔒 修改密码',
      language: '语言', notifications: '通知', appInfo: '应用信息',
      dangerZone: '危险区域', deleteAccount: '🗑️ 删除账号',
      saveChanges: '保存更改', currentPassword: '当前密码',
      newPassword: '新密码', confirmPassword: '确认密码',
      orderUpdates: '📦 订单更新', paymentAlerts: '💳 支付提醒',
      promotions: '🎁 促销活动', systemNotifications: '🔔 系统通知',
      version: '版本', build: '构建', environment: '环境',
      countryLanguageCurrency: '国家、语言和货币', country: '国家/地区', currency: '货币',
    },
    vendor: {
      dashboard: '控制台', myProducts: '我的商品', customerOrders: '客户订单',
      totalEarnings: '总收入', requestPayout: '💸 申请提现',
      addProduct: '➕ 添加商品', viewOrders: '📋 查看订单',
      inventory: '📦 库存', messages: '💬 消息', recentOrders: '🛒 最近订单',
      topProducts: '🏆 热销商品', storeInfo: '🏪 店铺信息',
      revenue: '收入', newCustomers: '新客户',
    },
    chat: {
      vendorChat: '🏪 卖家聊天', support: '🤖 VUMA客服', online: '在线',
      connecting: '连接中...', typeMessage: '输入消息...', sendMessage: '发送',
      noMessages: '发送消息开始聊天',
    },
    notifications: {
      notifications: '通知', unread: '未读', markAllRead: '全部标为已读',
      clearAll: '清除全部', noNotifications: '暂无通知', noNotificationsMessage: '全部已读！',
    },
    errors: {
      networkError: '请检查网络连接。', somethingWentWrong: '出现错误，请重试。',
    },
  },

  sw: {
    common: {
      loading: 'Inapakia...', error: 'Hitilafu imetokea.', retry: 'Jaribu Tena',
      cancel: 'Ghairi', confirm: 'Thibitisha', save: 'Hifadhi', delete: 'Futa',
      edit: 'Hariri', close: 'Funga', back: 'Rudi', next: 'Ifuatayo', done: 'Imekamilika',
      yes: 'Ndiyo', no: 'Hapana', ok: 'Sawa', search: 'Tafuta', filter: 'Chuja',
      sort: 'Panga', all: 'Yote', seeAll: 'Ona yote', noResults: 'Hakuna matokeo',
      submit: 'Wasilisha', continue: 'Endelea', skip: 'Ruka',
    },
    auth: {
      login: 'Ingia', logout: 'Toka', register: 'Jisajili', email: 'Barua pepe',
      password: 'Nywila', confirmPassword: 'Thibitisha Nywila', username: 'Jina la mtumiaji',
      phone: 'Nambari ya simu', forgotPassword: 'Umesahau nywila?', rememberMe: 'Nikumbuke',
      noAccount: 'Huna akaunti?', haveAccount: 'Una akaunti tayari?',
      loginWithFaceID: 'Ingia na Face ID', loginWithFingerprint: 'Ingia na Alama ya Kidole',
      welcomeBack: 'Karibu tena 👋', createAccount: 'Fungua Akaunti',
      loginSubtitle: 'Ingia kwenye akaunti yako', registerSubtitle: 'Jiunge na watumiaji wa VUMA',
      becomeVendor: 'Unataka kuuza VUMA?', registerAsVendor: 'Jiandikishe kama muuzaji →',
    },
    home: {
      flashSale: '⚡ Mauzo ya Haraka', featured: '⭐ Iliyoangaziwa', allProducts: '🛍️ Bidhaa Zote',
      freeShipping: '🚚 Usafirishaji Bure', shopNow: 'Nunua Sasa!', searchPlaceholder: '🔍  Tafuta bidhaa...',
    },
    products: {
      addToCart: 'Ongeza kwenye Kikapu', buyNow: 'Nunua Sasa', outOfStock: 'Haina Stok',
      inStock: 'Ipo', freeShipping: '🚚 Usafirishaji Bure', quantity: 'Wingi',
      sold: 'Imeuzwa', reviews: '⭐ Maoni', wishlist: 'Orodha ya Matakwa',
      description: 'Maelezo', details: 'Undani', writeReview: 'Andika Maoni',
      noReviews: 'Hakuna maoni bado', relatedProducts: 'Bidhaa Zinazohusiana', share: 'Shiriki',
    },
    cart: {
      myCart: 'Kikapu Changu', emptyCart: 'Kikapu chako kiko tupu',
      emptyCartMessage: 'Vinjari bidhaa na uongeze kwenye kikapu',
      startShopping: 'Anza Kununua', checkout: 'Lipia', clearCart: 'Futa',
      orderSummary: 'Muhtasari wa Agizo', subtotal: 'Jumla ndogo', shipping: 'Usafirishaji',
      total: 'Jumla', free: 'BURE', freeShippingEarned: '🎉 Umepata Usafirishaji Bure!',
      removeItem: 'Ondoa Bidhaa', clearCartMessage: 'Ondoa bidhaa zote kwenye kikapu?',
    },
    orders: {
      myOrders: 'Maagizo Yangu', orderDetail: 'Maelezo ya Agizo', orderNumber: 'Nambari ya Agizo',
      orderDate: 'Tarehe ya Agizo', orderStatus: 'Hali ya Agizo', items: 'Bidhaa',
      shippingAddress: 'Anwani ya Usafirishaji', priceSummary: 'Muhtasari wa Bei',
      cancelOrder: 'Ghairi Agizo', contactSupport: 'Wasiliana na Msaada', buyAgain: 'Nunua Tena',
      noOrders: 'Hakuna maagizo bado', noOrdersMessage: 'Anza kununua ili uweke agizo lako la kwanza!',
      viewDetails: 'Ona Maelezo →', pending: 'Inasubiri', processing: 'Inashughulikiwa',
      shipped: 'Imesafirishwa', delivered: 'Imewasilishwa', cancelled: 'Imeghairiwa', refunded: 'Imerudishwa',
    },
    checkout: {
      checkout: 'Lipia', deliveryAddress: 'Anwani ya Uwasilishaji', paymentMethod: 'Njia ya Malipo',
      orderReview: 'Kagua Agizo', addNewAddress: 'Ongeza Anwani Mpya', placeOrder: 'Weka Agizo',
      confirmOrder: 'Thibitisha Agizo', selectAddress: 'Tafadhali chagua anwani ya uwasilishaji.',
      address: 'Anwani', payment: 'Malipo', review: 'Kagua', securePayment: '🔒 Malipo salama kupitia Stripe.',
    },
    wallet: {
      vumaWallet: 'Mkoba wa VUMA', totalBalance: 'Jumla ya Salio', deposit: 'Weka Pesa',
      transfer: 'Hamisha', history: 'Historia', recentTransactions: 'Miamala ya Hivi Karibuni',
      depositFunds: 'Weka Fedha', transferFunds: 'Hamisha Fedha', amount: 'Kiasi',
      recipientEmail: 'Barua pepe ya Mpokeaji', noTransactions: 'Hakuna miamala bado',
      available: 'Inapatikana', frozen: '🔒 Mkoba Umezuiwa',
    },
    profile: {
      profile: 'Wasifu', myOrders: 'Maagizo Yangu', cart: 'Kikapu', wishlist: 'Orodha ya Matakwa',
      wallet: 'Mkoba wa VUMA', returns: 'Marejesho na Malipo ya Kurudisha',
      chatSupport: '💬 Msaada wa Mazungumzo', notifications: 'Arifa', helpCenter: 'Kituo cha Msaada',
      becomeVendor: '🏪 Kuwa Muuzaji', commission: 'Asilimia 10',
      settings: 'Mipangilio', privacy: 'Faragha na Usalama', terms: 'Masharti ya Huduma',
      logout: 'Toka', logoutConfirm: 'Una uhakika?', memberSince: 'Mwanachama tangu',
      approvedVendor: '🏪 Muuzaji Aliyeidhinishwa', admin: '👑 Msimamizi', customer: '🛍️ Mteja',
      orders: 'Maagizo', reviews: 'Maoni',
    },
    settings: {
      settings: 'Mipangilio', editProfile: '✏️ Hariri Wasifu', changePassword: '🔒 Badilisha Nywila',
      language: 'LUGHA', notifications: 'ARIFA', appInfo: 'MAELEZO YA PROGRAMU',
      dangerZone: 'ENEO LA HATARI', deleteAccount: '🗑️ Futa Akaunti',
      saveChanges: 'Hifadhi Mabadiliko', currentPassword: 'Nywila ya Sasa',
      newPassword: 'Nywila Mpya', confirmPassword: 'Thibitisha Nywila',
      orderUpdates: '📦 Masasisho ya Maagizo', paymentAlerts: '💳 Arifa za Malipo',
      promotions: '🎁 Matangazo na Ofa', systemNotifications: '🔔 Arifa za Mfumo',
      version: 'Toleo', build: 'Ujenzi', environment: 'Mazingira',
      countryLanguageCurrency: 'NCHI, LUGHA NA SARAFU', country: 'Nchi/Mkoa', currency: 'Sarafu',
    },
    vendor: {
      dashboard: 'Dashibodi', myProducts: 'Bidhaa Zangu', customerOrders: 'Maagizo ya Wateja',
      totalEarnings: 'Mapato Yote', requestPayout: '💸 Omba Malipo',
      addProduct: '➕ Ongeza Bidhaa', viewOrders: '📋 Ona Maagizo',
      inventory: '📦 Hifadhi', messages: '💬 Ujumbe', recentOrders: '🛒 Maagizo ya Hivi Karibuni',
      topProducts: '🏆 Bidhaa Bora', storeInfo: '🏪 Maelezo ya Duka',
      revenue: 'Mapato', newCustomers: 'Wateja Wapya',
    },
    chat: {
      vendorChat: '🏪 Mazungumzo na Muuzaji', support: '🤖 Msaada wa VUMA', online: 'Mtandaoni',
      connecting: 'Inaunganisha...', typeMessage: 'Andika ujumbe...', sendMessage: 'Tuma',
      noMessages: 'Tuma ujumbe kuanza mazungumzo',
    },
    notifications: {
      notifications: 'Arifa', unread: 'ambayo haijasomwa', markAllRead: 'Weka zote kama zilizosomwa',
      clearAll: 'Futa zote', noNotifications: 'Hakuna arifa', noNotificationsMessage: 'Umesoma zote!',
    },
    errors: {
      networkError: 'Hakuna muunganisho wa intaneti.', somethingWentWrong: 'Hitilafu imetokea. Jaribu tena.',
    },
  },

  fr: {
    common: {
      loading: 'Chargement...', error: 'Une erreur est survenue.', retry: 'Réessayer',
      cancel: 'Annuler', confirm: 'Confirmer', save: 'Enregistrer', delete: 'Supprimer',
      edit: 'Modifier', close: 'Fermer', back: 'Retour', next: 'Suivant', done: 'Terminé',
      yes: 'Oui', no: 'Non', ok: 'OK', search: 'Rechercher', filter: 'Filtrer',
      sort: 'Trier', all: 'Tout', seeAll: 'Voir tout', noResults: 'Aucun résultat',
      submit: 'Soumettre', continue: 'Continuer', skip: 'Passer',
    },
    auth: {
      login: 'Connexion', logout: 'Déconnexion', register: 'Créer un compte', email: 'E-mail',
      password: 'Mot de passe', confirmPassword: 'Confirmer le mot de passe',
      username: "Nom d'utilisateur", phone: 'Téléphone',
      forgotPassword: 'Mot de passe oublié?', rememberMe: 'Se souvenir de moi',
      noAccount: 'Pas de compte?', haveAccount: 'Déjà un compte?', welcomeBack: 'Bon retour 👋',
      loginWithFaceID: 'Connexion avec Face ID', loginWithFingerprint: 'Connexion avec empreinte',
      createAccount: 'Créer un compte', loginSubtitle: 'Connectez-vous à votre compte',
      becomeVendor: 'Vendre sur VUMA?', registerAsVendor: "S'inscrire comme vendeur →",
    },
    home: {
      flashSale: '⚡ Vente Flash', featured: '⭐ À la une', allProducts: '🛍️ Tous les produits',
      freeShipping: '🚚 Livraison gratuite', shopNow: 'Acheter maintenant!',
      searchPlaceholder: '🔍  Rechercher des produits...',
    },
    products: {
      addToCart: 'Ajouter au panier', buyNow: 'Acheter maintenant', outOfStock: 'Rupture de stock',
      inStock: 'En stock', freeShipping: '🚚 Livraison gratuite', quantity: 'Quantité',
      sold: 'vendu', reviews: '⭐ Avis', wishlist: 'Liste de souhaits',
      description: 'Description', details: 'Détails', writeReview: 'Écrire un avis',
      noReviews: "Pas encore d'avis", relatedProducts: 'Produits similaires', share: 'Partager',
    },
    cart: {
      myCart: 'Mon panier', emptyCart: 'Votre panier est vide',
      emptyCartMessage: 'Parcourez les produits et ajoutez des articles à votre panier',
      startShopping: 'Commencer les achats', checkout: 'Commander', clearCart: 'Vider',
      orderSummary: 'Résumé de la commande', subtotal: 'Sous-total', shipping: 'Livraison',
      total: 'Total', free: 'GRATUIT', freeShippingEarned: '🎉 Vous avez gagné la livraison gratuite!',
      removeItem: "Supprimer l'article", clearCartMessage: 'Vider le panier?',
    },
    orders: {
      myOrders: 'Mes commandes', orderDetail: 'Détails de la commande', orderNumber: 'Numéro de commande',
      orderDate: 'Date de commande', orderStatus: 'Statut de commande', items: 'Articles',
      shippingAddress: 'Adresse de livraison', priceSummary: 'Récapitulatif des prix',
      cancelOrder: 'Annuler la commande', contactSupport: 'Contacter le support', buyAgain: 'Racheter',
      noOrders: 'Pas encore de commandes', noOrdersMessage: 'Commencez vos achats!',
      viewDetails: 'Voir les détails →', pending: 'En attente', processing: 'En traitement',
      shipped: 'Expédié', delivered: 'Livré', cancelled: 'Annulé', refunded: 'Remboursé',
    },
    checkout: {
      checkout: 'Commander', deliveryAddress: 'Adresse de livraison', paymentMethod: 'Mode de paiement',
      orderReview: 'Vérification de la commande', addNewAddress: 'Ajouter une adresse',
      placeOrder: 'Passer la commande', confirmOrder: 'Confirmer la commande',
      selectAddress: 'Veuillez sélectionner une adresse de livraison.',
      address: 'Adresse', payment: 'Paiement', review: 'Vérification',
      securePayment: '🔒 Paiement sécurisé via Stripe.',
    },
    wallet: {
      vumaWallet: 'Portefeuille VUMA', totalBalance: 'Solde total', deposit: 'Dépôt',
      transfer: 'Virement', history: 'Historique', recentTransactions: 'Transactions récentes',
      depositFunds: 'Déposer des fonds', transferFunds: 'Virer des fonds', amount: 'Montant',
      recipientEmail: 'Email du destinataire', noTransactions: 'Pas encore de transactions',
      available: 'Disponible', frozen: '🔒 Portefeuille gelé',
    },
    profile: {
      profile: 'Profil', myOrders: 'Mes commandes', cart: 'Panier', wishlist: 'Liste de souhaits',
      wallet: 'Portefeuille VUMA', returns: 'Retours et remboursements',
      chatSupport: '💬 Chat support', notifications: 'Notifications', helpCenter: "Centre d'aide",
      becomeVendor: '🏪 Devenir vendeur', commission: '10% de commission',
      settings: 'Paramètres', privacy: 'Confidentialité et sécurité', terms: "Conditions d'utilisation",
      logout: 'Déconnexion', logoutConfirm: 'Êtes-vous sûr?', memberSince: 'Membre depuis',
      approvedVendor: '🏪 Vendeur approuvé', admin: '👑 Admin', customer: '🛍️ Client',
      orders: 'Commandes', reviews: 'Avis',
    },
    settings: {
      settings: 'Paramètres', editProfile: '✏️ Modifier le profil', changePassword: '🔒 Changer le mot de passe',
      language: 'LANGUE', notifications: 'NOTIFICATIONS', appInfo: "INFOS DE L'APP",
      dangerZone: 'ZONE DANGEREUSE', deleteAccount: '🗑️ Supprimer le compte',
      saveChanges: 'Enregistrer', currentPassword: 'Mot de passe actuel',
      newPassword: 'Nouveau mot de passe', confirmPassword: 'Confirmer le mot de passe',
      orderUpdates: '📦 Mises à jour des commandes', paymentAlerts: '💳 Alertes de paiement',
      promotions: '🎁 Promotions et offres', systemNotifications: '🔔 Notifications système',
      version: 'Version', build: 'Build', environment: 'Environnement',
      countryLanguageCurrency: 'PAYS, LANGUE ET DEVISE', country: 'Pays/Région', currency: 'Devise',
    },
    vendor: {
      dashboard: 'Tableau de bord', myProducts: 'Mes produits', customerOrders: 'Commandes clients',
      totalEarnings: 'Gains totaux', requestPayout: '💸 Demander un paiement',
      addProduct: '➕ Ajouter un produit', viewOrders: '📋 Voir les commandes',
      inventory: '📦 Inventaire', messages: '💬 Messages', recentOrders: '🛒 Commandes récentes',
      topProducts: '🏆 Produits populaires', storeInfo: '🏪 Infos boutique',
      revenue: 'Revenus', newCustomers: 'Nouveaux clients',
    },
    chat: {
      vendorChat: '🏪 Chat vendeur', support: '🤖 Support VUMA', online: 'En ligne',
      connecting: 'Connexion...', typeMessage: 'Tapez un message...', sendMessage: 'Envoyer',
      noMessages: 'Envoyez un message pour commencer',
    },
    notifications: {
      notifications: 'Notifications', unread: 'non lues', markAllRead: 'Tout marquer comme lu',
      clearAll: 'Tout effacer', noNotifications: 'Pas de notifications', noNotificationsMessage: 'Tout est à jour!',
    },
    errors: {
      networkError: 'Pas de connexion internet.', somethingWentWrong: 'Une erreur est survenue. Réessayez.',
    },
  },

  ar: {
    common: {
      loading: '...جار التحميل', error: 'حدث خطأ ما.', retry: 'حاول مجدداً',
      cancel: 'إلغاء', confirm: 'تأكيد', save: 'حفظ', delete: 'حذف',
      edit: 'تعديل', close: 'إغلاق', back: 'رجوع', next: 'التالي', done: 'تم',
      yes: 'نعم', no: 'لا', ok: 'موافق', search: 'بحث', filter: 'تصفية',
      sort: 'ترتيب', all: 'الكل', seeAll: 'عرض الكل', noResults: 'لا توجد نتائج',
      submit: 'إرسال', continue: 'متابعة', skip: 'تخطي',
    },
    auth: {
      login: 'تسجيل الدخول', logout: 'تسجيل الخروج', register: 'إنشاء حساب',
      email: 'البريد الإلكتروني', password: 'كلمة المرور', confirmPassword: 'تأكيد كلمة المرور',
      username: 'اسم المستخدم', phone: 'رقم الهاتف',
      forgotPassword: 'نسيت كلمة المرور؟', rememberMe: 'تذكرني',
      noAccount: 'ليس لديك حساب؟', haveAccount: 'لديك حساب بالفعل؟', welcomeBack: '👋 مرحباً بعودتك',
      loginWithFaceID: 'تسجيل الدخول بـ Face ID', loginWithFingerprint: 'تسجيل الدخول بالبصمة',
      createAccount: 'إنشاء حساب', loginSubtitle: 'سجل الدخول إلى حسابك',
      becomeVendor: 'تريد البيع على VUMA؟', registerAsVendor: 'سجل كبائع ←',
    },
    home: {
      flashSale: '⚡ تخفيضات سريعة', featured: '⭐ منتجات مميزة', allProducts: '🛍️ جميع المنتجات',
      freeShipping: '🚚 شحن مجاني', shopNow: '!تسوق الآن', searchPlaceholder: '...🔍  ابحث عن منتجات',
    },
    products: {
      addToCart: 'أضف إلى السلة', buyNow: 'اشتر الآن', outOfStock: 'نفذت الكمية',
      inStock: 'متوفر', freeShipping: '🚚 شحن مجاني', quantity: 'الكمية',
      sold: 'مُباع', reviews: '⭐ التقييمات', wishlist: 'قائمة الأمنيات',
      description: 'الوصف', details: 'التفاصيل', writeReview: 'كتابة تقييم',
      noReviews: 'لا توجد تقييمات بعد', relatedProducts: 'منتجات مشابهة', share: 'مشاركة',
    },
    cart: {
      myCart: 'سلة التسوق', emptyCart: 'سلة التسوق فارغة',
      emptyCartMessage: 'تصفح المنتجات وأضف العناصر إلى سلتك',
      startShopping: 'ابدأ التسوق', checkout: 'إتمام الشراء', clearCart: 'مسح',
      orderSummary: 'ملخص الطلب', subtotal: 'المجموع الفرعي', shipping: 'الشحن',
      total: 'الإجمالي', free: 'مجاني', freeShippingEarned: '🎉 حصلت على شحن مجاني!',
      removeItem: 'إزالة المنتج', clearCartMessage: 'إزالة جميع العناصر من السلة؟',
    },
    orders: {
      myOrders: 'طلباتي', orderDetail: 'تفاصيل الطلب', orderNumber: 'رقم الطلب',
      orderDate: 'تاريخ الطلب', orderStatus: 'حالة الطلب', items: 'المنتجات',
      shippingAddress: 'عنوان الشحن', priceSummary: 'ملخص الأسعار',
      cancelOrder: 'إلغاء الطلب', contactSupport: 'التواصل مع الدعم', buyAgain: 'الشراء مجدداً',
      noOrders: 'لا توجد طلبات بعد', noOrdersMessage: 'ابدأ التسوق لإجراء أول طلب!',
      viewDetails: 'عرض التفاصيل ←', pending: 'قيد الانتظار', processing: 'قيد المعالجة',
      shipped: 'تم الشحن', delivered: 'تم التسليم', cancelled: 'ملغي', refunded: 'مُسترد',
    },
    checkout: {
      checkout: 'إتمام الشراء', deliveryAddress: 'عنوان التسليم', paymentMethod: 'طريقة الدفع',
      orderReview: 'مراجعة الطلب', addNewAddress: 'إضافة عنوان جديد', placeOrder: 'إرسال الطلب',
      confirmOrder: 'تأكيد الطلب', selectAddress: 'يرجى اختيار عنوان التسليم.',
      address: 'العنوان', payment: 'الدفع', review: 'المراجعة', securePayment: '🔒 دفع آمن عبر Stripe.',
    },
    wallet: {
      vumaWallet: 'محفظة VUMA', totalBalance: 'الرصيد الإجمالي', deposit: 'إيداع',
      transfer: 'تحويل', history: 'السجل', recentTransactions: 'المعاملات الأخيرة',
      depositFunds: 'إيداع الأموال', transferFunds: 'تحويل الأموال', amount: 'المبلغ',
      recipientEmail: 'بريد المستلم', noTransactions: 'لا توجد معاملات بعد',
      available: 'متاح', frozen: '🔒 المحفظة مجمدة',
    },
    profile: {
      profile: 'الملف الشخصي', myOrders: 'طلباتي', cart: 'سلة التسوق',
      wishlist: 'قائمة الأمنيات', wallet: 'محفظة VUMA',
      returns: 'المرتجعات والمبالغ المستردة', chatSupport: '💬 دعم الدردشة',
      notifications: 'الإشعارات', helpCenter: 'مركز المساعدة',
      becomeVendor: '🏪 كن بائعاً', commission: 'عمولة 10٪',
      settings: 'الإعدادات', privacy: 'الخصوصية والأمان', terms: 'شروط الخدمة',
      logout: 'تسجيل الخروج', logoutConfirm: 'هل أنت متأكد؟', memberSince: 'عضو منذ',
      approvedVendor: '🏪 بائع معتمد', admin: '👑 مدير', customer: '🛍️ عميل',
      orders: 'الطلبات', reviews: 'التقييمات',
    },
    settings: {
      settings: 'الإعدادات', editProfile: '✏️ تعديل الملف', changePassword: '🔒 تغيير كلمة المرور',
      language: 'اللغة', notifications: 'الإشعارات', appInfo: 'معلومات التطبيق',
      dangerZone: 'منطقة الخطر', deleteAccount: '🗑️ حذف الحساب',
      saveChanges: 'حفظ التغييرات', currentPassword: 'كلمة المرور الحالية',
      newPassword: 'كلمة المرور الجديدة', confirmPassword: 'تأكيد كلمة المرور',
      orderUpdates: '📦 تحديثات الطلبات', paymentAlerts: '💳 تنبيهات الدفع',
      promotions: '🎁 العروض والتخفيضات', systemNotifications: '🔔 إشعارات النظام',
      version: 'الإصدار', build: 'البناء', environment: 'البيئة',
      countryLanguageCurrency: 'الدولة واللغة والعملة', country: 'الدولة/المنطقة', currency: 'العملة',
    },
    vendor: {
      dashboard: 'لوحة التحكم', myProducts: 'منتجاتي', customerOrders: 'طلبات العملاء',
      totalEarnings: 'إجمالي الأرباح', requestPayout: '💸 طلب سحب',
      addProduct: '➕ إضافة منتج', viewOrders: '📋 عرض الطلبات',
      inventory: '📦 المخزون', messages: '💬 الرسائل', recentOrders: '🛒 الطلبات الأخيرة',
      topProducts: '🏆 المنتجات الأعلى مبيعاً', storeInfo: '🏪 معلومات المتجر',
      revenue: 'الإيرادات', newCustomers: 'عملاء جدد',
    },
    chat: {
      vendorChat: '🏪 محادثة البائع', support: '🤖 دعم VUMA', online: 'متصل',
      connecting: 'جار الاتصال...', typeMessage: 'اكتب رسالة...', sendMessage: 'إرسال',
      noMessages: 'أرسل رسالة لبدء المحادثة',
    },
    notifications: {
      notifications: 'الإشعارات', unread: 'غير مقروء', markAllRead: 'تحديد الكل كمقروء',
      clearAll: 'مسح الكل', noNotifications: 'لا توجد إشعارات', noNotificationsMessage: 'أنت محدّث تماماً!',
    },
    errors: {
      networkError: 'لا يوجد اتصال بالإنترنت.', somethingWentWrong: 'حدث خطأ ما. حاول مجدداً.',
    },
  },
};

class I18n {
  constructor() {
    this.locale = 'en';
    this.translations = translations;
    this.rtlLanguages = ['ar'];
    this._listeners = [];
  }

  async init() {
    try {
      const savedLang = await storage.getLanguage();
      this.setLocale(savedLang || 'en');
    } catch {
      this.setLocale('en');
    }
  }

  setLocale(locale) {
    if (this.translations[locale]) {
      this.locale = locale;
    } else {
      this.locale = 'en';
    }
    const isRTL = this.rtlLanguages.includes(this.locale);
    I18nManager.allowRTL(isRTL);
    I18nManager.forceRTL(isRTL);
    this._listeners.forEach(fn => fn(this.locale));
  }

  getLocale() { return this.locale; }
  isRTL() { return this.rtlLanguages.includes(this.locale); }

  onChange(fn) {
    this._listeners.push(fn);
    return () => {
      this._listeners = this._listeners.filter(l => l !== fn);
    };
  }

  t(key, params = {}) {
    try {
      const keys = key.split('.');
      let value = this.translations[this.locale] || this.translations['en'];
      for (const k of keys) {
        value = value?.[k];
        if (value === undefined) break;
      }
      if (value === undefined) {
        let fallback = this.translations['en'];
        for (const k of keys) {
          fallback = fallback?.[k];
          if (fallback === undefined) break;
        }
        value = fallback || key;
      }
      if (typeof value === 'string' && Object.keys(params).length > 0) {
        Object.keys(params).forEach(param => {
          value = value.replace(`{${param}}`, params[param]);
        });
      }
      return value || key;
    } catch {
      return key;
    }
  }
}

export const i18n = new I18n();
export const t = (key, params) => i18n.t(key, params);
export const getAvailableLanguages = () => [
  { code: 'en', name: 'English', flag: '🇺🇸', rtl: false },
  { code: 'ko', name: '한국어', flag: '🇰🇷', rtl: false },
  { code: 'zh', name: '中文', flag: '🇨🇳', rtl: false },
  { code: 'sw', name: 'Kiswahili', flag: '🇹🇿', rtl: false },
  { code: 'fr', name: 'Français', flag: '🇫🇷', rtl: false },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', rtl: true },
];

export default i18n;

// ── Language Change Event ─────────────────────────────
import { useState, useEffect, useCallback } from 'react';

// Global listeners list
const listeners = new Set();

/**
 * Notify all components when language changes
 */
export const notifyLanguageChange = () => {
  listeners.forEach((listener) => listener());
};

/**
 * Hook — use this in screens instead of t() directly
 * Forces re-render when language changes
 *
 * Usage:
 * const { t } = useTranslation();
 */
export const useTranslation = () => {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const listener = () =>
      forceUpdate((n) => n + 1);
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);

  const translate = useCallback(
    (key, params) => i18n.t(key, params),
    [i18n.locale]
  );

  return {
    t: translate,
    locale: i18n.getLocale(),
    isRTL: i18n.isRTL(),
  };
};
