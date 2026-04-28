/**
 * VUMA Store — Notification Slice
 * In-app notifications state management
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getErrorMessage } from '../utils/helpers';

// ══════════════════════════════════════════════════════
// ASYNC THUNKS
// ══════════════════════════════════════════════════════

/**
 * Fetch notifications list
 */
export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (
    { page = 1, category = '', unread_only = false } = {},
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
  async (_, { rejectWithValue }) => {
    try {
      const { notificationsAPI } = await import(
        '../api/notifications'
      );
      await notificationsAPI.clearAll();
      return true;
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
        }
      }
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
          const { unread, by_category } = action.payload;
          state.unreadCount = unread || 0;
          state.unreadByCategory = by_category || {};
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
          } else {
            // Mark specific ones
            const idSet = new Set(ids.map(String));
            state.items = state.items.map((n) =>
              idSet.has(String(n.id))
                ? { ...n, is_read: true }
                : n
            );
            // Recalculate unread count
            state.unreadCount = state.items.filter(
              (n) => !n.is_read
            ).length;
          }
        }
      )
      .addCase(markNotificationsRead.rejected, (state) => {
        state.loading.markRead = false;
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
        (state) => {
          state.loading.clearAll = false;
          state.items = [];
          state.unreadCount = 0;
          state.unreadByCategory = {};
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