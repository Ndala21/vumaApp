/**
 * VUMA Store — the coupon the customer chose on the Home screen.
 *
 * "Tumia" on a coupon saves its code here; the checkout screen reads it
 * and fills the coupon box. Only the code is kept. The server still
 * checks the coupon when the order is priced and placed.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@vuma_pending_coupon';

export async function getPendingCoupon() {
  try {
    return (await AsyncStorage.getItem(KEY)) || '';
  } catch {
    return '';
  }
}

export async function setPendingCoupon(code) {
  try {
    await AsyncStorage.setItem(KEY, String(code || '').trim().toUpperCase());
  } catch {}
}

export async function clearPendingCoupon() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}
