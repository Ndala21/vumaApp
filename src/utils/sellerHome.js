/**
 * VUMA Store - seller home screen (dashboard) text and small helpers.
 *
 * Pure data and pure functions - no React - so they can be tested on their own.
 * Text comes in English and Kiswahili. The app language 'sw' gets Kiswahili,
 * every other language gets English (same rule as the Wallet screen).
 */

const TEXT = {
  en: {
    menu: 'Menu',
    approved: 'Approved ✓',
    goodMorning: 'Good morning',
    goodAfternoon: 'Good afternoon',
    goodEvening: 'Good evening',

    ordersWaitingOne: '1 new order is waiting for you',
    ordersWaitingMany: '{n} new orders are waiting for you',
    tapToOpen: 'Tap to open',

    moneyLabel: 'Money you can withdraw',
    withdrawBtn: 'Withdraw money',
    onHold: 'On hold',
    totalEarned: 'Total earned',

    whatToDo: 'What do you want to do?',
    addProduct: 'Add a product',
    addProductSub: 'Take photos and start selling',
    products: 'My products',
    productsOne: '1 product',
    productsMany: '{n} products',
    orders: 'Orders',
    ordersNew: '{n} new',
    ordersAll: 'See all orders',
    money: 'Money and withdrawals',
    moneySub: 'Send money to my phone',
    promote: 'Promote products',
    promoteSub: 'Reach more customers',
    messages: 'Messages and help',
    messagesSub: 'Get help from VUMA',

    yourOrders: 'Your orders',
    seeAll: 'See all',
    stageNew: 'New',
    stagePreparing: 'Preparing',
    stageOnTheWay: 'On the way',
    stageDelivered: 'Delivered',

    sellerCenter: 'VUMA Seller Center',
    sellerCenterSub: 'Manage your shop from a computer. Same login.',
    sellerCenterFailTitle: 'Could not open Seller Center',
    sellerCenterFail: 'Please try again or visit vumastore.store/seller in your browser.',

    menuShop: 'Your shop',
    menuHome: 'Home',
    menuProducts: 'Products',
    menuOrders: 'Orders',
    menuMoney: 'Money',
    menuEarnings: 'Earnings and payments',
    menuPromote: 'Promote products',
    menuHelp: 'Help and settings',
    menuMessages: 'Messages and help',
    menuSettings: 'Settings',
    logout: 'Log out',
    logoutAsk: 'Log out?',
    logoutText: 'You will be signed out of your seller account.',
    logoutYes: 'Yes, log out',
    cancel: 'Cancel',
    logoutFail: 'Could not log out. Please try again.',
    error: 'Error',
  },
  sw: {
    menu: 'Menyu',
    approved: 'Imeidhinishwa ✓',
    goodMorning: 'Habari za asubuhi',
    goodAfternoon: 'Habari za mchana',
    goodEvening: 'Habari za jioni',

    ordersWaitingOne: 'Una oda 1 mpya inayokusubiri',
    ordersWaitingMany: 'Una oda {n} mpya zinazokusubiri',
    tapToOpen: 'Gusa kufungua',

    moneyLabel: 'Pesa unazoweza kutoa',
    withdrawBtn: 'Toa pesa',
    onHold: 'Zinazosubiri',
    totalEarned: 'Jumla ya mapato',

    whatToDo: 'Unataka kufanya nini?',
    addProduct: 'Weka bidhaa mpya',
    addProductSub: 'Piga picha uanze kuuza',
    products: 'Bidhaa zangu',
    productsOne: 'Bidhaa 1',
    productsMany: 'Bidhaa {n}',
    orders: 'Oda',
    ordersNew: '{n} mpya',
    ordersAll: 'Ona oda zote',
    money: 'Pesa na kutoa pesa',
    moneySub: 'Tuma pesa kwenye simu yangu',
    promote: 'Tangaza bidhaa',
    promoteSub: 'Fikia wateja zaidi',
    messages: 'Ujumbe na msaada',
    messagesSub: 'Pata msaada wa VUMA',

    yourOrders: 'Oda zako',
    seeAll: 'Ona zote',
    stageNew: 'Mpya',
    stagePreparing: 'Zinaandaliwa',
    stageOnTheWay: 'Njiani',
    stageDelivered: 'Zimefika',

    sellerCenter: 'Kituo cha Muuzaji cha VUMA',
    sellerCenterSub: 'Simamia duka lako kwa kompyuta. Akaunti ile ile.',
    sellerCenterFailTitle: 'Imeshindikana kufungua Kituo cha Muuzaji',
    sellerCenterFail: 'Jaribu tena au tembelea vumastore.store/seller kwenye kivinjari.',

    menuShop: 'Duka lako',
    menuHome: 'Nyumbani',
    menuProducts: 'Bidhaa',
    menuOrders: 'Oda',
    menuMoney: 'Pesa',
    menuEarnings: 'Mapato na malipo',
    menuPromote: 'Tangaza bidhaa',
    menuHelp: 'Msaada na mipangilio',
    menuMessages: 'Ujumbe na msaada',
    menuSettings: 'Mipangilio',
    logout: 'Toka',
    logoutAsk: 'Unataka kutoka?',
    logoutText: 'Utatoka kwenye akaunti yako ya muuzaji.',
    logoutYes: 'Ndiyo, toka',
    cancel: 'Ghairi',
    logoutFail: 'Imeshindikana kutoka. Jaribu tena.',
    error: 'Hitilafu',
  },
};

const fill = (text, vars) => String(text).replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null ? vars[k] : m));

// lang: the app language code ('sw' = Kiswahili, anything else = English)
export const hx = (lang, key, vars) => {
  const dict = lang === 'sw' ? TEXT.sw : TEXT.en;
  return fill(dict[key] != null ? dict[key] : (TEXT.en[key] != null ? TEXT.en[key] : key), vars);
};

export const homeLang = (locale) => (String(locale || '').toLowerCase().startsWith('sw') ? 'sw' : 'en');

const count = (v) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export const greetingKey = (hour) => (hour < 12 ? 'goodMorning' : hour < 18 ? 'goodAfternoon' : 'goodEvening');

// "3 new orders are waiting for you" - empty when there are none
export const newOrdersLine = (lang, n) => {
  const c = count(n);
  if (!c) return '';
  return c === 1 ? hx(lang, 'ordersWaitingOne') : hx(lang, 'ordersWaitingMany', { n: c });
};

export const productsLine = (lang, n) => {
  const c = count(n);
  return c === 1 ? hx(lang, 'productsOne') : hx(lang, 'productsMany', { n: c });
};

export const ordersLine = (lang, newCount) => {
  const c = count(newCount);
  return c ? hx(lang, 'ordersNew', { n: c }) : hx(lang, 'ordersAll');
};

// The money numbers come from the server as null when a staff member may not see finance.
export const moneyVisible = (dashboard) => !!dashboard && dashboard.available_balance != null;

export const badgeText = (n) => {
  const c = count(n);
  if (!c) return '';
  return c > 99 ? '99+' : String(c);
};
