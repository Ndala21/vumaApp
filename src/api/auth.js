/**
 * VUMA Store — Auth API
 * All authentication endpoints
 */

import { get, post, patch, upload } from './client';
import { API } from '../utils/constants';

export const authAPI = {

  // ══════════════════════════════════════════════════
  // REGISTRATION & LOGIN
  // ══════════════════════════════════════════════════

  /**
   * Register new customer account
   */
  register: (data) =>
  post(API.REGISTER, {
    username: data.username,
    email: data.email.toLowerCase().trim(),
    password: data.password,
    password2: data.password,  // ← confirm password
    phone: data.phone || '',
    language: data.language || 'en',
  }),

  /**
   * Login with email + password
   * Returns { access, refresh, user }
   */
  login: (data) =>
    post(API.LOGIN, {
      email: data.email.toLowerCase().trim(),
      password: data.password,
      fcm_token: data.fcm_token || '',
    }),

  /**
   * Logout — blacklists refresh token
   */
  logout: (refreshToken) =>
    post(API.LOGOUT, { refresh: refreshToken }),

  /**
   * Refresh access token
   */
  refreshToken: (refreshToken) =>
    post(API.TOKEN_REFRESH, { refresh: refreshToken }),

  // ══════════════════════════════════════════════════
  // PROFILE
  // ══════════════════════════════════════════════════

  /**
   * Get full profile
   */
  getProfile: () => get(API.PROFILE),

  /**
   * Quick current user info
   */
  me: () => get(API.ME),

  /**
   * Update profile
   * Handles both JSON and multipart (avatar upload)
   */
  updateProfile: (data) => {
    // Has avatar file — use multipart
    if (data.avatar && typeof data.avatar === 'object') {
      const formData = new FormData();
      Object.keys(data).forEach((key) => {
        if (key === 'avatar') {
          formData.append('avatar', {
            uri: data.avatar.uri,
            name:
              data.avatar.fileName ||
              data.avatar.name ||
              'avatar.jpg',
            type: data.avatar.type || 'image/jpeg',
          });
        } else if (
          data[key] !== undefined &&
          data[key] !== null
        ) {
          formData.append(key, String(data[key]));
        }
      });
      return upload(API.PROFILE_UPDATE, formData);
    }
    return patch(API.PROFILE_UPDATE, data);
  },

  /**
   * Change password
   */
  changePassword: (data) =>
    post(API.PASSWORD_CHANGE, {
      current_password: data.currentPassword,
      new_password: data.newPassword,
      new_password2: data.newPassword2 || data.newPassword,
    }),

  /**
   * Update FCM token for push notifications
   */
  updateFCMToken: (fcmToken) =>
    patch(API.PROFILE_UPDATE, { fcm_token: fcmToken }),

  /**
   * Update language preference
   */
  updateLanguage: (language) =>
    patch(API.PROFILE_UPDATE, { language }),
};