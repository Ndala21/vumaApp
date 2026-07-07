/**
 * VUMA Store — Storage Utility
 * AsyncStorage wrapper with error handling
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './constants';

export const storage = {

  // ══════════════════════════════════════════════════
  // TOKENS
  // ══════════════════════════════════════════════════

  async getAccessToken() {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    } catch {
      return null;
    }
  },

  async setAccessToken(token) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
    } catch (e) {
      console.error('[Storage] setAccessToken:', e);
    }
  },

  async getRefreshToken() {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch {
      return null;
    }
  },

  async setRefreshToken(token) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
    } catch (e) {
      console.error('[Storage] setRefreshToken:', e);
    }
  },

  async clearTokens() {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
      ]);
    } catch (e) {
      console.error('[Storage] clearTokens:', e);
    }
  },

  // ══════════════════════════════════════════════════
  // USER
  // ══════════════════════════════════════════════════

  async getUser() {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      return json ? JSON.parse(json) : null;
    } catch {
      return null;
    }
  },

  async setUser(user) {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.USER,
        JSON.stringify(user)
      );
    } catch (e) {
      console.error('[Storage] setUser:', e);
    }
  },

  async clearUser() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER);
    } catch {}
  },

  // ══════════════════════════════════════════════════
  // LANGUAGE
  // ══════════════════════════════════════════════════

  async getLanguage() {
    try {
      return (
        (await AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE)) || 'en'
      );
    } catch {
      return 'en';
    }
  },

  async setLanguage(lang) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
    } catch (e) {
      console.error('[Storage] setLanguage:', e);
    }
  },

  // ══════════════════════════════════════════════════
  // CART
  // ══════════════════════════════════════════════════

  async getCart() {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.CART);
      return json ? JSON.parse(json) : [];
    } catch {
      return [];
    }
  },

  async setCart(cartItems) {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.CART,
        JSON.stringify(cartItems)
      );
    } catch (e) {
      console.error('[Storage] setCart:', e);
    }
  },

  async clearCart() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CART);
    } catch {}
  },

  // ══════════════════════════════════════════════════
  // ONBOARDING
  // ══════════════════════════════════════════════════

  async isOnboarded() {
    try {
      return (
        (await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDED)) ===
        'true'
      );
    } catch {
      return false;
    }
  },

  async setOnboarded() {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDED, 'true');
    } catch {}
  },

  // ══════════════════════════════════════════════════
  // REMEMBER ME
  // ══════════════════════════════════════════════════

  async getRememberMe() {
    try {
      return (
        (await AsyncStorage.getItem(STORAGE_KEYS.REMEMBER_ME)) ===
        'true'
      );
    } catch {
      return true;
    }
  },

  async setRememberMe(value) {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.REMEMBER_ME,
        value ? 'true' : 'false'
      );
    } catch {}
  },

  // ══════════════════════════════════════════════════
  // BIOMETRIC CREDENTIALS
  // ══════════════════════════════════════════════════

  async getBiometricCredentials() {
    try {
      const json = await AsyncStorage.getItem(
        STORAGE_KEYS.BIOMETRIC_CREDENTIALS
      );
      return json ? JSON.parse(json) : null;
    } catch {
      return null;
    }
  },

  async setBiometricCredentials(credentials) {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.BIOMETRIC_CREDENTIALS,
        JSON.stringify(credentials)
      );
    } catch (e) {
      console.error('[Storage] setBiometricCredentials:', e);
    }
  },

  async clearBiometricCredentials() {
    try {
      await AsyncStorage.removeItem(
        STORAGE_KEYS.BIOMETRIC_CREDENTIALS
      );
    } catch {}
  },

  // ══════════════════════════════════════════════════
  // WISHLIST
  // ══════════════════════════════════════════════════

  async getWishlist() {
    try {
      const json = await AsyncStorage.getItem(
        STORAGE_KEYS.WISHLIST
      );
      return json ? JSON.parse(json) : [];
    } catch {
      return [];
    }
  },

  async setWishlist(items) {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.WISHLIST,
        JSON.stringify(items)
      );
    } catch (e) {
      console.error('[Storage] setWishlist:', e);
    }
  },

  async addToWishlist(productId) {
    try {
      const current = await this.getWishlist();
      if (!current.includes(productId)) {
        const updated = [...current, productId];
        await this.setWishlist(updated);
        return updated;
      }
      return current;
    } catch {
      return [];
    }
  },

  async removeFromWishlist(productId) {
    try {
      const current = await this.getWishlist();
      const updated = current.filter((id) => id !== productId);
      await this.setWishlist(updated);
      return updated;
    } catch {
      return [];
    }
  },

  async isInWishlist(productId) {
    try {
      const current = await this.getWishlist();
      return current.includes(productId);
    } catch {
      return false;
    }
  },

  // ══════════════════════════════════════════════════
  // SEARCH HISTORY
  // ══════════════════════════════════════════════════

  async getSearchHistory() {
    try {
      const json = await AsyncStorage.getItem(
        STORAGE_KEYS.SEARCH_HISTORY
      );
      return json ? JSON.parse(json) : [];
    } catch {
      return [];
    }
  },

  async addToSearchHistory(query) {
    try {
      if (!query || !query.trim()) return;
      const current = await this.getSearchHistory();
      const filtered = current.filter(
        (q) => q.toLowerCase() !== query.toLowerCase()
      );
      const updated = [query.trim(), ...filtered].slice(0, 10);
      await AsyncStorage.setItem(
        STORAGE_KEYS.SEARCH_HISTORY,
        JSON.stringify(updated)
      );
      return updated;
    } catch {
      return [];
    }
  },

  async clearSearchHistory() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.SEARCH_HISTORY);
    } catch {}
  },

  // ══════════════════════════════════════════════════
  // BULK OPERATIONS
  // ══════════════════════════════════════════════════

  /**
   * Save all auth data at once after login/register
   */
  async saveAuthData({ accessToken, refreshToken, user, rememberMe }) {
    try {
      const pairs = [
        [STORAGE_KEYS.ACCESS_TOKEN, accessToken],
        [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
        [STORAGE_KEYS.USER, JSON.stringify(user)],
        [STORAGE_KEYS.REMEMBER_ME, rememberMe ? 'true' : 'false'],
      ];
      await AsyncStorage.multiSet(pairs);
    } catch (e) {
      console.error('[Storage] saveAuthData:', e);
    }
  },

  /**
   * Clear everything on logout
   */
  async clearAll() {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER,
        STORAGE_KEYS.CART,
        STORAGE_KEYS.REMEMBER_ME,
      ]);
    } catch (e) {
      console.error('[Storage] clearAll:', e);
    }
  },

  /**
   * Clear everything including preferences (full reset)
   */
  async hardReset() {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER,
        STORAGE_KEYS.CART,
        STORAGE_KEYS.REMEMBER_ME,
        STORAGE_KEYS.BIOMETRIC_CREDENTIALS,
        STORAGE_KEYS.WISHLIST,
        STORAGE_KEYS.SEARCH_HISTORY,
      ]);
    } catch (e) {
      console.error('[Storage] hardReset:', e);
    }
  },

  // ══════════════════════════════════════════════════
  // GENERIC HELPERS
  // ══════════════════════════════════════════════════

  async get(key) {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },

  async set(key, value) {
    try {
      await AsyncStorage.setItem(
        key,
        typeof value === 'string' ? value : JSON.stringify(value)
      );
    } catch (e) {
      console.error(`[Storage] set(${key}):`, e);
    }
  },

  async remove(key) {
    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  },
};
