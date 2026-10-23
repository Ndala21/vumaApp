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
    group = '',
  } = {}) => {
    const params = { page };
    if (category) params.category = category;
    if (unread_only) params.unread_only = 'true';
    if (group && group !== 'all') params.group = group;
    return get(API.NOTIFICATIONS, params);
  },

  getCount: () => get(API.NOTIFICATIONS_COUNT),

  markRead: (notificationIds = []) =>
    post(API.NOTIFICATIONS_READ, {
      notification_ids: notificationIds,
    }),

  // One tab only (orders, promotions, restock, account); 'all' marks everything.
  markGroupRead: (group = 'all') =>
    post(
      API.NOTIFICATIONS_READ,
      group && group !== 'all' ? { group } : { notification_ids: [] }
    ),

  markSingleRead: (notificationId) =>
    post(`/notifications/${notificationId}/read/`),

  deleteNotification: (notificationId) =>
    del(`/notifications/${notificationId}/delete/`),

  clearAll: (group = 'all') =>
    del(group && group !== 'all' ? `/notifications/clear/?group=${group}` : '/notifications/clear/'),
};
