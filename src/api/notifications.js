/**
 * VUMA Store — Notifications API
 */

import { get, post, del } from './client';
import { API } from '../utils/constants';

export const notificationsAPI = {

  getNotifications: ({
    page = 1,
    category = '',
    unread_only = false,
  } = {}) => {
    const params = { page };
    if (category) params.category = category;
    if (unread_only) params.unread_only = 'true';
    return get(API.NOTIFICATIONS, params);
  },

  getCount: () => get(API.NOTIFICATIONS_COUNT),

  markRead: (notificationIds = []) =>
    post(API.NOTIFICATIONS_READ, {
      notification_ids: notificationIds,
    }),

  markSingleRead: (notificationId) =>
    post(`/notifications/${notificationId}/read/`),

  deleteNotification: (notificationId) =>
    del(`/notifications/${notificationId}/delete/`),

  clearAll: () =>
    del('/notifications/clear/'),
};