/**
 * VUMA Store — Notification Slice
 * In-app notifications state management
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getErrorMessage } from '../utils/helpers';
import { groupOf } from '../utils/notificationLink';

// ══════════════════════════════════════════════════════
// ASYNC THUNKS
// ══════════════════════════════════════════════════════

/**
 * Fetch notifications list
 */
export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (
    { page = 1, category = '', unread_only = false, group = '' } = {},
    { rejectWithValue }
  ) => {
    try {
      const { notificationsAPI } = await import(
        '../api/notifications'
      );
      const data = await notificationsAPI.getNotifications({
        page,
        category,
        unread_only,
        group,
      });
      return { data, page };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

/**
 * Fetch notification count (unread badge)
 */
export const fetchNotificationCount = createAsyncThunk(
  'notifications/fetchCount',
  async (_, { rejectWithValue }) => {
    try {
      const { notificationsAPI } = await import(
        '../api/notifications'
      );
      const data = await notificationsAPI.getCount();
      return data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

/**
 * Mark notifications as read
 * Pass ids array or empty to mark all
 */
export const markNotificationsRead = createAsyncThunk(
  'notifications/markRead',
  async (notificationIds = [], { rejectWithValue }) => {
    try {
      const { notificationsAPI } = await import(
        '../api/notifications'
      );
      await notificationsAPI.markRead(notificationIds);
      return notificationIds;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

/**
 * Mark one tab (orders, promotions, restock, account) as read - or everything for 'all'
 */
export const markGroupRead = createAsyncThunk(
  'notifications/markGroupRead',
  async (group = 'all', { rejectWithValue }) => {
    try {
      const { notificationsAPI } = await import(
        '../api/notifications'
      );
      await notificationsAPI.markGroupRead(group);
      return group;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

/**
 * Mark single notification as read
 */
export const markSingleRead = createAsyncThunk(
  'notifications/markSingleRead',
  async (notificationId, { rejectWithValue }) => {
    try {
      const { notificationsAPI } = await import(
        '../api/notifications'
      );
      await notificationsAPI.markSingleRead(notificationId);
      return notificationId;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

/**
 * Delete notification
 */
export const deleteNotification = createAsyncThunk(
  'notifications/delete',
  async (notificationId, { rejectWithValue }) => {
    try {
      const { notificationsAPI } = await import(
        '../api/notifications'
      );
      await notificationsAPI.deleteNotification(
        notificationId
      );
      return notificationId;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

/**
 * Clear all notifications
 */
export const clearAllNotifications = createAsyncThunk(
  'notifications/clearAll',
  async (group = 'all', { rejectWithValue }) => {
    try {
      const { notificationsAPI } = await import(
        '../api/notifications'
      );
      await notificationsAPI.clearAll(group);
      return group;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// ══════════════════════════════════════════════════════
// INITIAL STATE
// ══════════════════════════════════════════════════════

const initialState = {
  // Notification list
  items: [],
  currentPage: 1,
  hasNextPage: false,
  totalCount: 0,

  // Unread counts
  unreadCount: 0,
  unreadByCategory: {},
  unreadByGroup: {},
  // Does the server know the tabs? null until the first count answers. An older server does not
  // send by_group, and then the screen shows one list and leaves the tab actions out.
  groupsSupported: null,

  // Active tab of the Notification Center: all, orders, promotions, restock, account
  activeGroup: 'all',

  // Active filter
  activeCategory: '',
  showUnreadOnly: false,

  // Loading states
  loading: {
    fetch: false,
    count: false,
    markRead: false,
    delete: false,
    clearAll: false,
    loadingMore: false,
  },

  // Errors
  errors: {
    fetch: null,
    markRead: null,
    general: null,
  },
};

// ══════════════════════════════════════════════════════
// SLICE
// ══════════════════════════════════════════════════════

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,

  reducers: {
    // Add real-time notification (from WebSocket / push)
    addNotification: (state, action) => {
      const notification = action.payload;
      // Avoid duplicates
      const exists = state.items.some(
        (n) => n.id === notification.id
      );
      if (!exists) {
        state.items.unshift(notification);
        if (!notification.is_read) {
          state.unreadCount += 1;
          const cat = notification.category || 'system';
          state.unreadByCategory[cat] =
            (state.unreadByCategory[cat] || 0) + 1;
          const grp = groupOf(notification);
          state.unreadByGroup[grp] =
            (state.unreadByGroup[grp] || 0) + 1;
        }
      }
    },

    // Choose a tab of the Notification Center
    setActiveGroup: (state, action) => {
      state.activeGroup = action.payload || 'all';
      state.items = [];
      state.currentPage = 1;
      state.hasNextPage = false;
    },

    // Set active category filter
    setActiveCategory: (state, action) => {
      state.activeCategory = action.payload;
      state.items = [];
      state.currentPage = 1;
    },

    // Toggle unread only filter
    toggleUnreadOnly: (state) => {
      state.showUnreadOnly = !state.showUnreadOnly;
      state.items = [];
      state.currentPage = 1;
    },

    // Update unread count directly
    setUnreadCount: (state, action) => {
      state.unreadCount = action.payload;
    },

    // Reset unread count (after viewing all)
    resetUnreadCount: (state) => {
      state.unreadCount = 0;
      state.unreadByCategory = {};
      state.unreadByGroup = {};
    },

    // Reset notifications list
    resetNotifications: (state) => {
      state.items = [];
      state.currentPage = 1;
      state.hasNextPage = false;
    },

    // Clear errors
    clearNotificationError: (state) => {
      Object.keys(state.errors).forEach((k) => {
        state.errors[k] = null;
      });
    },
  },

  extraReducers: (builder) => {
    // ── Fetch Notifications ───────────────────────────
    builder
      .addCase(fetchNotifications.pending, (state, action) => {
        const isLoadMore = action.meta.arg?.page > 1;
        if (isLoadMore) {
          state.loading.loadingMore = true;
        } else {
          state.loading.fetch = true;
        }
        state.errors.fetch = null;
      })
      .addCase(
        fetchNotifications.fulfilled,
        (state, action) => {
          state.loading.fetch = false;
          state.loading.loadingMore = false;
          // The person may have moved to another tab while this was loading.
          if ((action.meta.arg?.group || 'all') !== state.activeGroup) return;
          const { data, page } = action.payload;
          const results = data.results || data;

          if (page === 1) {
            state.items = Array.isArray(results)
              ? results
              : [];
          } else {
            const existingIds = new Set(
              state.items.map((n) => n.id)
            );
            const newItems = (
              Array.isArray(results) ? results : []
            ).filter((n) => !existingIds.has(n.id));
            state.items = [...state.items, ...newItems];
          }

          state.currentPage = page;
          state.totalCount = data.count || results.length;
          state.hasNextPage = !!data.next;
        }
      )
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading.fetch = false;
        state.loading.loadingMore = false;
        state.errors.fetch = action.payload;
      });

    // ── Fetch Count ───────────────────────────────────
    builder
      .addCase(fetchNotificationCount.pending, (state) => {
        state.loading.count = true;
      })
      .addCase(
        fetchNotificationCount.fulfilled,
        (state, action) => {
          state.loading.count = false;
          const { unread, by_category, by_group } = action.payload;
          state.unreadCount = unread || 0;
          state.unreadByCategory = by_category || {};
          state.unreadByGroup = by_group || {};
          state.groupsSupported = !!by_group && typeof by_group === 'object';
        }
      )
      .addCase(fetchNotificationCount.rejected, (state) => {
        state.loading.count = false;
      });

    // ── Mark Read (bulk) ──────────────────────────────
    builder
      .addCase(markNotificationsRead.pending, (state) => {
        state.loading.markRead = true;
      })
      .addCase(
        markNotificationsRead.fulfilled,
        (state, action) => {
          state.loading.markRead = false;
          const ids = action.payload;

          if (!ids || ids.length === 0) {
            // Mark all as read
            state.items = state.items.map((n) => ({
              ...n,
              is_read: true,
            }));
            state.unreadCount = 0;
            state.unreadByCategory = {};
            state.unreadByGroup = {};
          } else {
            // Mark specific ones
            const idSet = new Set(ids.map(String));
            state.items.forEach((n) => {
              if (idSet.has(String(n.id)) && !n.is_read) {
                const grp = groupOf(n);
                if (state.unreadByGroup[grp] > 0) state.unreadByGroup[grp] -= 1;
                if (state.unreadCount > 0) state.unreadCount -= 1;
              }
            });
            state.items = state.items.map((n) =>
              idSet.has(String(n.id))
                ? { ...n, is_read: true }
                : n
            );
          }
        }
      )
      .addCase(markNotificationsRead.rejected, (state) => {
        state.loading.markRead = false;
      });

    // ── Mark a whole tab read ─────────────────────────
    builder
      .addCase(markGroupRead.fulfilled, (state, action) => {
        const group = action.payload;
        if (group === 'all') {
          state.items = state.items.map((n) => ({ ...n, is_read: true }));
          state.unreadCount = 0;
          state.unreadByCategory = {};
          state.unreadByGroup = {};
        } else {
          state.items = state.items.map((n) =>
            groupOf(n) === group ? { ...n, is_read: true } : n
          );
          state.unreadCount = Math.max(
            0,
            state.unreadCount - (state.unreadByGroup[group] || 0)
          );
          state.unreadByGroup[group] = 0;
        }
      });

    // ── Mark Single Read ──────────────────────────────
    builder
      .addCase(markSingleRead.fulfilled, (state, action) => {
        const id = action.payload;
        const index = state.items.findIndex(
          (n) => String(n.id) === String(id)
        );
        if (index >= 0 && !state.items[index].is_read) {
          state.items[index] = {
            ...state.items[index],
            is_read: true,
          };
          state.unreadCount = Math.max(
            0,
            state.unreadCount - 1
          );
          const cat = state.items[index].category;
          if (cat && state.unreadByCategory[cat] > 0) {
            state.unreadByCategory[cat] -= 1;
          }
          const grp = groupOf(state.items[index]);
          if (state.unreadByGroup[grp] > 0) state.unreadByGroup[grp] -= 1;
        }
      });

    // ── Delete Notification ───────────────────────────
    builder
      .addCase(deleteNotification.pending, (state) => {
        state.loading.delete = true;
      })
      .addCase(
        deleteNotification.fulfilled,
        (state, action) => {
          state.loading.delete = false;
          const id = action.payload;
          const notif = state.items.find(
            (n) => String(n.id) === String(id)
          );
          if (notif && !notif.is_read) {
            state.unreadCount = Math.max(
              0,
              state.unreadCount - 1
            );
            const grp = groupOf(notif);
            if (state.unreadByGroup[grp] > 0) state.unreadByGroup[grp] -= 1;
          }
          state.items = state.items.filter(
            (n) => String(n.id) !== String(id)
          );
          state.totalCount = Math.max(
            0,
            state.totalCount - 1
          );
        }
      )
      .addCase(deleteNotification.rejected, (state) => {
        state.loading.delete = false;
      });

    // ── Clear All ─────────────────────────────────────
    builder
      .addCase(clearAllNotifications.pending, (state) => {
        state.loading.clearAll = true;
      })
      .addCase(
        clearAllNotifications.fulfilled,
        (state, action) => {
          state.loading.clearAll = false;
          const group = action.payload || 'all';
          state.items = [];
          if (group === 'all') {
            state.unreadCount = 0;
            state.unreadByCategory = {};
            state.unreadByGroup = {};
          } else {
            state.unreadCount = Math.max(
              0,
              state.unreadCount - (state.unreadByGroup[group] || 0)
            );
            state.unreadByGroup[group] = 0;
          }
          state.totalCount = 0;
          state.currentPage = 1;
          state.hasNextPage = false;
        }
      )
      .addCase(clearAllNotifications.rejected, (state) => {
        state.loading.clearAll = false;
      });
  },
});

// ══════════════════════════════════════════════════════
// ACTIONS
// ══════════════════════════════════════════════════════

export const {
  addNotification,
  setActiveGroup,
  setActiveCategory,
  toggleUnreadOnly,
  setUnreadCount,
  resetUnreadCount,
  resetNotifications,
  clearNotificationError,
} = notificationSlice.actions;

// ══════════════════════════════════════════════════════
// SELECTORS
// ══════════════════════════════════════════════════════

export const selectNotifications = (state) =>
  state.notifications.items;
export const selectUnreadCount = (state) =>
  state.notifications.unreadCount;
export const selectUnreadByCategory = (state) =>
  state.notifications.unreadByCategory;
export const selectUnreadByGroup = (state) =>
  state.notifications.unreadByGroup;
export const selectActiveGroup = (state) =>
  state.notifications.activeGroup;
export const selectGroupsSupported = (state) =>
  state.notifications.groupsSupported;
export const selectNotificationsLoading = (state) =>
  state.notifications.loading;
export const selectNotificationsErrors = (state) =>
  state.notifications.errors;
export const selectNotificationsHasMore = (state) =>
  state.notifications.hasNextPage;
export const selectNotificationsTotalCount = (state) =>
  state.notifications.totalCount;
export const selectActiveCategory = (state) =>
  state.notifications.activeCategory;
export const selectShowUnreadOnly = (state) =>
  state.notifications.showUnreadOnly;
export const selectHasUnread = (state) =>
  state.notifications.unreadCount > 0;
export const selectOrderUnread = (state) =>
  state.notifications.unreadByCategory?.order || 0;
export const selectPaymentUnread = (state) =>
  state.notifications.unreadByCategory?.payment || 0;

export default notificationSlice.reducer;
