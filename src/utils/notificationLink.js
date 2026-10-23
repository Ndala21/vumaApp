/**
 * VUMA Store - where a notification leads, and the small texts around it.
 *
 * Every notification (in the Notification Center and every push) can carry a link such as
 * vuma://orders/12 or https://vumastore.store/app/product/5. openLink() turns it into a real
 * move to the right screen, so a tap always does something. The same links are used by the
 * e-mail buttons (see the `linking` table in navigation/AppNavigator.js).
 */

import { Linking } from 'react-native';
import { SCREENS } from './constants';
import { i18n, t } from '../i18n';

const PREFIXES = [
  'vuma://',
  'https://www.vumastore.store/app/',
  'https://vumastore.store/app/',
  'https://www.vumastore.store/',
  'https://vumastore.store/',
];

// The tabs along the bottom are different for customers and for sellers.
const VENDOR_TABS = [SCREENS.VENDOR_DASHBOARD, SCREENS.VENDOR_PRODUCTS, SCREENS.VENDOR_ORDERS];

/** 'vuma://orders/12?x=1' -> 'orders/12'. Anything that is not a VUMA link -> ''. */
export function linkPath(url) {
  const raw = String(url || '').trim();
  const prefix = PREFIXES.find((p) => raw.startsWith(p));
  if (!prefix) return '';
  return raw.slice(prefix.length).split('?')[0].split('#')[0].replace(/^\/+|\/+$/g, '');
}

/**
 * What a link points at: { kind, id, path } or null when it is not a VUMA link.
 * kind: order, orders, product, seller-order, seller-orders, seller-dashboard, seller-products,
 *       seller-earnings, seller-shop, seller-apply, cart, search, home, profile, wishlist, wallet,
 *       referral, gift, chat, notifications, other
 */
export function parseLink(url) {
  const path = linkPath(url);
  if (!path && !String(url || '').startsWith('vuma://')) return null;
  const parts = path.split('/');
  const [a, b, c] = parts;
  const out = (kind, id = '') => ({ kind, id, path });
  if (a === 'orders') return b ? out('order', b) : out('orders');
  if (a === 'order' && b) return out('order', b);
  if (a === 'product' || a === 'products') return b ? out('product', b) : out('search');
  if (a === 'seller' || a === 'vendor') {
    if (b === 'orders') return c ? out('seller-order', c) : out('seller-orders');
    if (b === 'products') return out('seller-products');
    if (b === 'earnings' || b === 'payouts') return out('seller-earnings');
    if (b === 'shop') return out('seller-shop');
    if (b === 'apply' || b === 'application') return out('seller-apply');
    return out('seller-dashboard');
  }
  if (a === 'cart') return out('cart');
  if (a === 'search') return out('search');
  if (a === 'wishlist') return out('wishlist');
  if (a === 'wallet') return out('wallet');
  if (a === 'referral') return out('referral');
  if (a === 'welcome-gift') return out('gift');
  if (a === 'chat') return out('chat');
  if (a === 'notifications') return out('notifications');
  if (a === 'profile' || a === 'account') return out('profile');
  if (a === 'home' || a === '') return out('home');
  return out('other');
}

// Customer tabs and seller tabs: a link meant for the other kind of account lands somewhere sensible.
function tabFor(name, isVendor) {
  if (isVendor) {
    if (name === SCREENS.ORDERS) return SCREENS.VENDOR_ORDERS;
    if (name === SCREENS.SEARCH) return SCREENS.HOME;
    return name;
  }
  if (VENDOR_TABS.includes(name)) return SCREENS.PROFILE;
  return name;
}

/**
 * Go to the screen a link points at. Returns true when the app moved, false when the link
 * leads nowhere (no link, or the Notification Center itself) so the caller can show the full
 * message instead.
 */
export function openLink(navigation, url, { isVendor = false } = {}) {
  const link = parseLink(url);
  if (!link || link.kind === 'notifications') return false;
  const tab = (name, params) => navigation.navigate('Tabs', params ? { screen: tabFor(name, isVendor), params } : { screen: tabFor(name, isVendor) });
  switch (link.kind) {
    case 'order': navigation.navigate('OrderDetail', { orderId: link.id }); return true;
    case 'product': navigation.navigate('ProductDetail', { productId: link.id }); return true;
    case 'orders': tab(SCREENS.ORDERS); return true;
    case 'cart': tab(SCREENS.CART); return true;
    case 'search': tab(SCREENS.SEARCH); return true;
    case 'home': tab(SCREENS.HOME); return true;
    case 'profile': tab(SCREENS.PROFILE); return true;
    case 'seller-dashboard': tab(SCREENS.VENDOR_DASHBOARD); return true;
    case 'seller-products': tab(SCREENS.VENDOR_PRODUCTS); return true;
    case 'seller-orders': tab(SCREENS.VENDOR_ORDERS); return true;
    case 'seller-order': tab(SCREENS.VENDOR_ORDERS, { orderId: link.id }); return true;
    case 'seller-earnings': navigation.navigate('SellerWallet'); return true;
    case 'seller-shop': navigation.navigate('ShopProfile'); return true;
    case 'seller-apply': navigation.navigate('ApplicationStatus'); return true;
    case 'wishlist': navigation.navigate('Wishlist'); return true;
    case 'wallet': navigation.navigate('Wallet'); return true;
    case 'referral': navigation.navigate('Referral'); return true;
    case 'gift': navigation.navigate('WelcomeGift'); return true;
    case 'chat': navigation.navigate('Chat'); return true;
    default:
      // A link the app has no direct move for: let the app's own link table decide.
      try { Linking.openURL(String(url)); return true; } catch (e) { return false; }
  }
}

// ── The button on a card ──────────────────────────────────────────────────────
const BUTTON_KEY = {
  order: 'viewOrder', orders: 'viewOrders', product: 'viewProduct', cart: 'openCart',
  wishlist: 'openWishlist', wallet: 'openWallet', referral: 'openReferral', gift: 'openGift',
  'seller-dashboard': 'openShop', 'seller-products': 'openProducts', 'seller-orders': 'viewOrders',
  'seller-order': 'viewOrder', 'seller-earnings': 'viewEarnings', 'seller-shop': 'openShop',
  'seller-apply': 'viewApplication', chat: 'openChat',
};

/** The text of the button: the one the server chose, else a plain one for where the link leads. */
export function buttonText(notif) {
  const own = String((notif && notif.cta_text) || (notif && notif.action_data && notif.action_data.cta_text) || '').trim();
  if (own) return own;
  const link = parseLink(linkOf(notif));
  return t('notifications.' + ((link && BUTTON_KEY[link.kind]) || 'open'));
}

/** The link of a notification (the server sends it as `link`, older rows only as `action_url`). */
export function linkOf(notif) {
  return String((notif && (notif.link || notif.action_url)) || '');
}

// ── The tabs ──────────────────────────────────────────────────────────────────
export const GROUPS = ['all', 'orders', 'promotions', 'restock', 'account'];

/** The tab of a notification when the server did not say (older app data). */
export function groupOf(notif) {
  if (notif && notif.group) return notif.group;
  const event = (notif && notif.action_data && notif.action_data.event) || '';
  if (['back_in_stock', 'price_drop', 'cart_low_stock'].includes(event)) return 'restock';
  const c = notif && notif.category;
  if (c === 'order' || c === 'payment') return 'orders';
  if (c === 'marketing') return 'promotions';
  return 'account';
}

const ICONS = { orders: '📦', promotions: '🎁', restock: '🔔', account: '👤' };
const EVENT_ICONS = {
  payment_success: '💳', payment_failed: '⚠️', payout_sent: '💸', payout_failed: '⚠️', wallet_topup: '💰',
  order_delivered: '✅', order_completed: '✅', order_cancelled: '❌', order_refund: '💸',
  order_shipped: '🚚', order_in_transit: '🚚', order_out_for_delivery: '🚚',
  flash_sale: '⚡', flash_sale_live: '⚡', coupon_new: '🎟️', coupon_earned: '🎟️', coupon_expiring: '⏰',
  seller_approved: '🏪', seller_new_order: '🛒', price_drop: '📉', back_in_stock: '🔔', cart_reminder: '🛒',
};

export function iconOf(notif) {
  const event = (notif && notif.action_data && notif.action_data.event) || '';
  return EVENT_ICONS[event] || ICONS[groupOf(notif)] || '🔔';
}

// ── Time, like "Yesterday 9:00 AM" ────────────────────────────────────────────
const MONTHS = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  sw: ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ago', 'Sep', 'Okt', 'Nov', 'Des'],
};

function clock(d) {
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return h + ':' + m + ' ' + ap;
}

const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function formatWhen(iso, now = new Date()) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const mins = Math.floor((now - d) / 60000);
  if (mins < 1) return t('notifications.justNow');
  if (mins < 60) return t('notifications.minutesAgo', { n: mins });
  if (sameDay(d, now)) return t('notifications.today') + ' ' + clock(d);
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (sameDay(d, yesterday)) return t('notifications.yesterday') + ' ' + clock(d);
  const names = MONTHS[i18n.getLocale()] || MONTHS.en;
  const base = d.getDate() + ' ' + names[d.getMonth()];
  return d.getFullYear() === now.getFullYear() ? base : base + ' ' + d.getFullYear();
}

/** A message that is long enough to be cut in the list gets a "Read more". */
export const LONG_MESSAGE = 110;
export function isLong(message) {
  const text = String(message || '');
  return text.length > LONG_MESSAGE || text.split('\n').length > 3;
}
