/**
 * VUMA Store - Notification Center
 *
 * Laid out like Coupang's: tabs along the top (All, Orders, Promotions, Restock, Account), and
 * a card for every notification with its time, the message, product pictures when there are
 * any, and a button. Everything is tappable:
 *   - tap a card (or its button): opens the screen it is about (order, product, cart...)
 *   - a card with nowhere to go, or a long press: opens the full message in a sheet
 *   - "Read more" opens a long message in place
 * The server sends the link, the button text, the tab and the pictures with each notification
 * (apps/notifications/serializers.py); how a link becomes a screen is in utils/notificationLink.js.
 */

import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  RefreshControl,
  Modal,
  Image,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchNotifications,
  fetchNotificationCount,
  markNotificationsRead,
  markGroupRead,
  deleteNotification,
  clearAllNotifications,
  setActiveGroup,
  selectNotifications,
  selectNotificationsLoading,
  selectNotificationsErrors,
  selectUnreadCount,
  selectUnreadByGroup,
  selectActiveGroup,
  selectGroupsSupported,
  selectNotificationsHasMore,
} from '../../store/notificationSlice';
import { selectIsApprovedVendor } from '../../store/authSlice';
import { COLORS, FONTS, SPACING, RADIUS } from '../../utils/constants';
import { t, useTranslation } from '../../i18n';
import {
  GROUPS, linkOf, parseLink, openLink, buttonText, iconOf, formatWhen, isLong,
} from '../../utils/notificationLink';
import { SkeletonListItem } from '../../components/common/Loading';
import { EmptyState } from '../../components/common/ErrorMessage';

const T = (key, params) => t('notifications.' + key, params);
const TAB_KEY = { all: 'tabAll', orders: 'tabOrders', promotions: 'tabPromotions', restock: 'tabRestock', account: 'tabAccount' };
const EMPTY_KEY = { all: 'emptyAll', orders: 'emptyOrders', promotions: 'emptyPromotions', restock: 'emptyRestock', account: 'emptyAccount' };
const EMPTY_ICON = { all: '🔔', orders: '📦', promotions: '🎁', restock: '🔔', account: '👤' };

/** Does tapping this notification lead to a screen? */
const hasTarget = (item) => {
  const link = parseLink(linkOf(item));
  return !!link && link.kind !== 'notifications';
};

// ── One notification ──────────────────────────────────
const NotifCard = React.memo(function NotifCard({ item, onOpen, onDetail, onThumb }) {
  const [expanded, setExpanded] = useState(false);
  const thumbs = Array.isArray(item.thumbs) ? item.thumbs : [];
  const long = isLong(item.message);
  const unread = !item.is_read;

  return (
    <TouchableOpacity
      testID={'notif-' + item.id}
      style={[styles.card, unread && styles.cardUnread]}
      onPress={() => onOpen(item)}
      onLongPress={() => onDetail(item)}
      activeOpacity={0.85}
    >
      <View style={styles.iconWrap}>
        <Text style={styles.iconText}>{iconOf(item)}</Text>
        {unread && <View style={styles.iconDot} testID={'notif-dot-' + item.id} />}
      </View>

      <View style={styles.cardBody}>
        <View style={styles.titleRow}>
          <Text style={[styles.cardTitle, unread && styles.cardTitleUnread]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.when}>{formatWhen(item.created_at)}</Text>
        </View>

        <Text style={styles.message} numberOfLines={expanded ? undefined : 3}>
          {item.message}
        </Text>
        {long && (
          <TouchableOpacity
            testID={'notif-more-' + item.id}
            onPress={() => setExpanded((v) => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 16 }}
          >
            <Text style={styles.readMore}>{expanded ? T('showLess') : T('readMore')}</Text>
          </TouchableOpacity>
        )}

        {thumbs.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.thumbs}
            contentContainerStyle={styles.thumbsContent}
          >
            {thumbs.map((th, i) => (
              <TouchableOpacity
                key={(th.id || 'p') + '-' + i}
                testID={'notif-thumb-' + item.id + '-' + i}
                onPress={() => onThumb(item, th)}
                activeOpacity={0.8}
              >
                <Image source={{ uri: th.image }} style={styles.thumb} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {hasTarget(item) && (
          <TouchableOpacity
            testID={'notif-cta-' + item.id}
            style={styles.cta}
            onPress={() => onOpen(item)}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaText}>{buttonText(item)}</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
});

// ── The screen ────────────────────────────────────────
export default function NotificationsScreen({ navigation }) {
  useTranslation(); // draw again when the language changes
  const dispatch = useDispatch();

  const notifications = useSelector(selectNotifications);
  const loading = useSelector(selectNotificationsLoading);
  const errors = useSelector(selectNotificationsErrors);
  const unreadCount = useSelector(selectUnreadCount);
  const unreadByGroup = useSelector(selectUnreadByGroup) || {};
  const hasMore = useSelector(selectNotificationsHasMore);
  const group = useSelector(selectActiveGroup);
  const groupsSupported = useSelector(selectGroupsSupported);
  const currentPage = useSelector((s) => s.notifications.currentPage);
  const isVendor = useSelector(selectIsApprovedVendor);

  const [refreshing, setRefreshing] = useState(false);
  const [detail, setDetail] = useState(null);

  // An older server does not know the tabs: stay on the one list, so no tab action can touch other messages.
  useEffect(() => {
    if (groupsSupported === false && group !== 'all') dispatch(setActiveGroup('all'));
  }, [groupsSupported, group]);

  // First load, and again each time another tab is chosen.
  useEffect(() => {
    dispatch(fetchNotifications({ page: 1, group }));
    dispatch(fetchNotificationCount());
  }, [group]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchNotifications({ page: 1, group }));
    await dispatch(fetchNotificationCount());
    setRefreshing(false);
  }, [group]);

  const handleLoadMore = useCallback(() => {
    if (loading.loadingMore || loading.fetch || !hasMore) return;
    dispatch(fetchNotifications({ page: (currentPage || 1) + 1, group }));
  }, [loading, hasMore, currentPage, group]);

  const goBack = () => {
    if (navigation.canGoBack && !navigation.canGoBack()) navigation.navigate('Tabs');
    else navigation.goBack();
  };

  const selectTab = (g) => {
    if (g !== group) dispatch(setActiveGroup(g));
  };

  const markRead = (item) => {
    if (!item.is_read) dispatch(markNotificationsRead([item.id]));
  };

  // Tap: go to the screen it is about; when there is none, show the whole message.
  const openItem = useCallback((item) => {
    markRead(item);
    if (!openLink(navigation, linkOf(item), { isVendor })) setDetail(item);
  }, [navigation, isVendor]);

  const showDetail = useCallback((item) => {
    markRead(item);
    setDetail(item);
  }, []);

  const openThumb = useCallback((item, thumb) => {
    markRead(item);
    if (thumb && thumb.id) openLink(navigation, 'vuma://product/' + thumb.id, { isVendor });
    else openItem(item);
  }, [navigation, isVendor, openItem]);

  const markAllRead = () => {
    dispatch(markGroupRead(group)).then(() => dispatch(fetchNotificationCount()));
  };

  const clearAll = () => {
    Alert.alert(
      T('clearTitle'),
      group === 'all' ? T('clearAllMessage') : T('clearTabMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: T('clearAll'),
          style: 'destructive',
          onPress: () => {
            dispatch(clearAllNotifications(group)).then(() => dispatch(fetchNotificationCount()));
          },
        },
      ]
    );
  };

  const closeDetail = () => setDetail(null);

  const deleteDetail = () => {
    if (detail) dispatch(deleteNotification(detail.id)).then(() => dispatch(fetchNotificationCount()));
    setDetail(null);
  };

  const openFromDetail = () => {
    const item = detail;
    setDetail(null);
    if (item) openLink(navigation, linkOf(item), { isVendor });
  };

  const unreadHere = group === 'all' ? unreadCount : (unreadByGroup[group] || 0);

  const ListEmpty = () => {
    if (loading.fetch) {
      return (
        <View>
          {[1, 2, 3, 4].map((i) => <SkeletonListItem key={i} />)}
        </View>
      );
    }
    if (errors && errors.fetch) {
      return (
        <View style={styles.errorBox} testID="notif-error">
          <Text style={styles.errorText}>{T('loadFailed')}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => dispatch(fetchNotifications({ page: 1, group }))}
          >
            <Text style={styles.retryText}>{T('retry')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <EmptyState
        icon={EMPTY_ICON[group] || '🔔'}
        title={T(EMPTY_KEY[group] || 'emptyAll')}
        message={T((EMPTY_KEY[group] || 'emptyAll') + 'Message')}
      />
    );
  };

  const ListFooter = () => (loading.loadingMore ? (
    <View style={styles.loadingMore}>
      <Text style={styles.loadingMoreText}>{t('common.loading')}</Text>
    </View>
  ) : null);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          testID="notif-back"
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel={T('back')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 14 }}
          style={styles.headerSide}
        >
          <Text style={styles.headerBack}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{T('title')}</Text>
        <View style={styles.headerSide} />
      </View>

      {/* Tabs */}
      {groupsSupported !== false && (
      <View style={styles.tabsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {GROUPS.map((g) => {
            const active = g === group;
            const dot = (g === 'all' ? unreadCount : (unreadByGroup[g] || 0)) > 0;
            return (
              <TouchableOpacity
                key={g}
                testID={'notif-tab-' + g}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => selectTab(g)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{T(TAB_KEY[g])}</Text>
                {dot && <View style={[styles.tabDot, active && styles.tabDotActive]} testID={'notif-tabdot-' + g} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      )}

      {/* Unread count and the two list actions */}
      {(unreadHere > 0 || notifications.length > 0) && (
        <View style={styles.actions}>
          <Text style={styles.unreadText} testID="notif-unread">
            {unreadHere > 0 ? unreadHere + ' ' + T('unread') : ''}
          </Text>
          <View style={styles.actionBtns}>
            {unreadHere > 0 && (
              <TouchableOpacity testID="notif-markall" onPress={markAllRead} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.actionText}>{T('markAllRead')}</Text>
              </TouchableOpacity>
            )}
            {notifications.length > 0 && (
              <TouchableOpacity testID="notif-clear" onPress={clearAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.actionText, styles.actionDanger]}>{T('clearAll')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* List */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <NotifCard item={item} onOpen={openItem} onDetail={showDetail} onThumb={openThumb} />
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

      {/* The whole message */}
      <Modal visible={!!detail} transparent animationType="slide" onRequestClose={closeDetail}>
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity style={styles.sheetDismiss} activeOpacity={1} onPress={closeDetail} testID="notif-sheet-dismiss" />
          {detail && (
            <View style={styles.sheet} testID="notif-sheet">
              <View style={styles.sheetHead}>
                <View style={styles.iconWrap}>
                  <Text style={styles.iconText}>{iconOf(detail)}</Text>
                </View>
                <View style={styles.sheetHeadText}>
                  <Text style={styles.sheetTitle}>{detail.title}</Text>
                  <Text style={styles.when}>{formatWhen(detail.created_at)}</Text>
                </View>
              </View>
              <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator>
                <Text style={styles.sheetMessage} selectable>{detail.message}</Text>
                {Array.isArray(detail.thumbs) && detail.thumbs.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbs} contentContainerStyle={styles.thumbsContent}>
                    {detail.thumbs.map((th, i) => (
                      <TouchableOpacity
                        key={(th.id || 'p') + '-' + i}
                        onPress={() => { setDetail(null); openThumb(detail, th); }}
                      >
                        <Image source={{ uri: th.image }} style={styles.thumb} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </ScrollView>
              {hasTarget(detail) && (
                <TouchableOpacity testID="notif-sheet-open" style={styles.cta} onPress={openFromDetail} activeOpacity={0.85}>
                  <Text style={styles.ctaText}>{buttonText(detail)}</Text>
                </TouchableOpacity>
              )}
              <View style={styles.sheetFoot}>
                <TouchableOpacity testID="notif-sheet-delete" onPress={deleteDetail} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={[styles.actionText, styles.actionDanger]}>{T('delete')}</Text>
                </TouchableOpacity>
                <TouchableOpacity testID="notif-sheet-close" onPress={closeDetail} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.actionText}>{T('close')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.base,
    paddingTop: Platform.OS === 'ios' ? 50 : SPACING.base,
    paddingBottom: SPACING.md,
  },
  headerSide: { width: 36, alignItems: 'flex-start' },
  headerBack: { fontSize: 34, lineHeight: 36, color: COLORS.textPrimary, fontWeight: '300' },
  headerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary, textAlign: 'center' },

  tabsWrap: { backgroundColor: COLORS.surface },
  tabs: { paddingHorizontal: SPACING.sm, paddingBottom: SPACING.sm, alignItems: 'center' },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    marginHorizontal: 2,
  },
  tabActive: { backgroundColor: COLORS.secondary },
  tabText: { fontSize: FONTS.md, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  tabTextActive: { color: COLORS.textWhite, fontWeight: FONTS.bold },
  tabDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary, marginLeft: 5, marginTop: -8 },
  tabDotActive: { backgroundColor: COLORS.primaryLight },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    backgroundColor: COLORS.surfaceAlt,
  },
  unreadText: { fontSize: FONTS.xs, color: COLORS.primary, fontWeight: FONTS.semiBold },
  actionBtns: { flexDirection: 'row', gap: SPACING.base },
  actionText: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.semiBold },
  actionDanger: { color: COLORS.danger },

  listContent: { paddingBottom: 100 },

  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.base,
    backgroundColor: COLORS.surface,
    gap: SPACING.md,
  },
  cardUnread: { backgroundColor: COLORS.primaryFade },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 22 },
  iconDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  cardBody: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING.sm },
  cardTitle: { flex: 1, fontSize: FONTS.md, fontWeight: FONTS.semiBold, color: COLORS.textPrimary },
  cardTitleUnread: { fontWeight: FONTS.bold },
  when: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  message: { fontSize: FONTS.sm, color: COLORS.textSecondary, lineHeight: 20, marginTop: 4 },
  readMore: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.semiBold, marginTop: 4 },

  thumbs: { marginTop: SPACING.md, marginRight: -SPACING.base },
  thumbsContent: { paddingRight: SPACING.base, gap: SPACING.sm },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSunken,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  cta: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  ctaText: { color: COLORS.textWhite, fontSize: FONTS.md, fontWeight: FONTS.bold },

  loadingMore: { padding: SPACING.xl, alignItems: 'center' },
  loadingMoreText: { fontSize: FONTS.sm, color: COLORS.textMuted },
  errorBox: { padding: SPACING.xl, alignItems: 'center', gap: SPACING.md },
  errorText: { fontSize: FONTS.md, color: COLORS.textSecondary, textAlign: 'center' },
  retryBtn: { paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.primary },
  retryText: { color: COLORS.primary, fontWeight: FONTS.bold },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheetDismiss: { flex: 1 },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.base,
    maxHeight: '80%',
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md },
  sheetHeadText: { flex: 1 },
  sheetTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  sheetScroll: { flexGrow: 0 },
  sheetMessage: { fontSize: FONTS.md, color: COLORS.textPrimary, lineHeight: 24 },
  sheetFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.base, paddingBottom: SPACING.sm },
});
