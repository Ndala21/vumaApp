/**
 * VUMA Store — Notifications Screen
 */

import React, {
  useEffect,
  useCallback,
  useState,
} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  RefreshControl,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchNotifications,
  markNotificationsRead,
  deleteNotification,
  clearAllNotifications,
  selectNotifications,
  selectNotificationsLoading,
  selectUnreadCount,
  selectNotificationsHasMore,
} from '../../store/notificationSlice';
import {
  COLORS,
  FONTS,
  SPACING,
  RADIUS,
  SHADOWS,
} from '../../utils/constants';
import { timeAgo } from '../../utils/helpers';
import {
  SkeletonListItem,
} from '../../components/common/Loading';
import {
  EmptyState,
} from '../../components/common/ErrorMessage';

const NOTIF_ICONS = {
  order: '📦',
  payment: '💳',
  vendor: '🏪',
  system: '🔔',
  marketing: '🎁',
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '❌',
};

export default function NotificationsScreen({ navigation }) {
  const dispatch = useDispatch();

  const notifications = useSelector(selectNotifications);
  const loading = useSelector(selectNotificationsLoading);
  const unreadCount = useSelector(selectUnreadCount);
  const hasMore = useSelector(selectNotificationsHasMore);

  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    dispatch(fetchNotifications({ page: 1 }));
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await dispatch(
      fetchNotifications({ page: 1 })
    );
    setRefreshing(false);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (loading.loadingMore || !hasMore) return;
    const next = page + 1;
    setPage(next);
    dispatch(fetchNotifications({ page: next }));
  }, [loading, hasMore, page]);

  const handleMarkAllRead = () => {
    dispatch(markNotificationsRead([]));
  };

  const handleClearAll = () => {
    dispatch(clearAllNotifications());
  };

  const handleNotificationPress = (notif) => {
    if (!notif.is_read) {
      dispatch(markNotificationsRead([notif.id]));
    }
    // Navigate based on category
    if (notif.category === 'order' && notif.related_id) {
      navigation.navigate('OrderDetail', {
        orderId: notif.related_id,
      });
    }
  };

  const handleDelete = (notifId) => {
    dispatch(deleteNotification(notifId));
  };

  // ── Notification Item ─────────────────────────────────
  const NotifItem = ({ item }) => {
    const icon =
      NOTIF_ICONS[item.category] ||
      NOTIF_ICONS[item.notif_type] ||
      '🔔';

    return (
      <TouchableOpacity
        style={[
          styles.notifItem,
          !item.is_read && styles.notifItemUnread,
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.8}
      >
        {/* Icon */}
        <View
          style={[
            styles.notifIcon,
            !item.is_read && styles.notifIconUnread,
          ]}
        >
          <Text style={styles.notifIconText}>{icon}</Text>
        </View>

        {/* Content */}
        <View style={styles.notifContent}>
          <Text
            style={[
              styles.notifTitle,
              !item.is_read && styles.notifTitleUnread,
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text
            style={styles.notifMessage}
            numberOfLines={2}
          >
            {item.message}
          </Text>
          <Text style={styles.notifTime}>
            {timeAgo(item.created_at)}
          </Text>
        </View>

        {/* Unread dot + delete */}
        <View style={styles.notifRight}>
          {!item.is_read && (
            <View style={styles.unreadDot} />
          )}
          <TouchableOpacity
            onPress={() => handleDelete(item.id)}
            hitSlop={{
              top: 8,
              bottom: 8,
              left: 8,
              right: 8,
            }}
            style={styles.deleteBtn}
          >
            <Text style={styles.deleteBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const ListFooter = () => {
    if (!loading.loadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <Text style={styles.loadingMoreText}>
          Loading...
        </Text>
      </View>
    );
  };

  const ListEmpty = () => {
    if (loading.fetch) {
      return (
        <View>
          {[1, 2, 3, 4].map((i) => (
            <SkeletonListItem key={i} />
          ))}
        </View>
      );
    }
    return (
      <EmptyState
        icon="🔔"
        title="No notifications"
        message="You're all caught up! New notifications will appear here."
      />
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.surface}
      />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            Notifications
          </Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadCount}>
              {unreadCount} unread
            </Text>
          )}
        </View>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.headerAction}
              onPress={handleMarkAllRead}
            >
              <Text style={styles.headerActionText}>
                Mark all read
              </Text>
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity
              style={styles.headerAction}
              onPress={handleClearAll}
            >
              <Text
                style={[
                  styles.headerActionText,
                  { color: COLORS.danger },
                ]}
              >
                Clear all
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {['All', '📦 Orders', '💳 Payments', '🔔 System'].map(
          (tab, i) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.filterTab,
                i === 0 && styles.filterTabActive,
              ]}
            >
              <Text
                style={[
                  styles.filterTabText,
                  i === 0 && styles.filterTabTextActive,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>

      {/* List */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={({ item }) => (
          <NotifItem item={item} />
        )}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.base,
    paddingTop:
      Platform.OS === 'ios' ? SPACING['3xl'] : SPACING.base,
    paddingBottom: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    ...SHADOWS.sm,
  },
  headerTitle: {
    fontSize: FONTS['2xl'],
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },
  unreadCount: {
    fontSize: FONTS.xs,
    color: COLORS.primary,
    fontWeight: FONTS.semiBold,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
    paddingTop: SPACING.xs,
  },
  headerAction: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  headerActionText: {
    fontSize: FONTS.sm,
    color: COLORS.primary,
    fontWeight: FONTS.semiBold,
  },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    gap: SPACING.xs,
  },
  filterTab: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  filterTabActive: {
    backgroundColor: COLORS.primaryFade,
    borderColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    fontWeight: FONTS.medium,
  },
  filterTabTextActive: {
    color: COLORS.primary,
    fontWeight: FONTS.bold,
  },
  listContent: {
    paddingBottom: 100,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.base,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: SPACING.sm,
  },
  notifItemUnread: {
    backgroundColor: COLORS.primaryFade + '40',
  },
  notifIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notifIconUnread: {
    backgroundColor: COLORS.primaryFade,
  },
  notifIconText: {
    fontSize: 20,
  },
  notifContent: {
    flex: 1,
    gap: 3,
  },
  notifTitle: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.medium,
    color: COLORS.textPrimary,
  },
  notifTitleUnread: {
    fontWeight: FONTS.bold,
  },
  notifMessage: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  notifTime: {
    fontSize: FONTS.xs,
    color: COLORS.textLight,
    marginTop: 2,
  },
  notifRight: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
  },
  deleteBtn: {
    padding: 2,
  },
  deleteBtnText: {
    fontSize: FONTS.xs,
    color: COLORS.textLight,
    fontWeight: FONTS.bold,
  },
  loadingMore: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  loadingMoreText: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
  },
});