/**
 * VUMA Store — Seller Home (Duka Langu)
 *
 * Built so a seller who is not used to apps can find the important things at once:
 *   1. money they can withdraw, with one big "Withdraw money" button
 *   2. a banner when new orders are waiting
 *   3. big picture-and-word buttons: Add product, My products, Orders,
 *      Money, Promote, Messages and help
 *   4. the order stages at a glance
 * Text is Kiswahili or English, with a language switch on the screen itself.
 *
 * This screen does NOT render its own bottom tab bar — VendorNavigator
 * already wraps it.
 *
 * All numbers come from real backend fields — see
 * apps/vendors/views.py `dashboard()`. Nothing here is made up.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Platform, RefreshControl, Alert, Modal, Linking,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { selectUser, logout, updateProfile } from '../../store/authSlice';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../utils/constants';
import { getErrorMessage } from '../../utils/helpers';
import { storage } from '../../utils/storage';
import { i18n, useTranslation, notifyLanguageChange } from '../../i18n';
import { vendorsAPI } from '../../api/vendors';
import { tsh } from '../../utils/payouts';
import { needsLogo } from '../../utils/shopProfile';
import {
  hx, homeLang, greetingKey, newOrdersLine, productsLine, ordersLine, moneyVisible, badgeText,
} from '../../utils/sellerHome';
import Loading from '../../components/common/Loading';
import { FullScreenError } from '../../components/common/ErrorMessage';

// ── Menu (opens from the "Menu" button) ───────────────────────────────────────
// Only things that really open somewhere. (The old "Coming soon" lines are gone.)
const menuSections = (lang) => [
  {
    heading: hx(lang, 'menuShop'),
    items: [
      { key: 'home', label: hx(lang, 'menuHome'), icon: '🏠', active: true },
      { key: 'products', label: hx(lang, 'menuProducts'), icon: '📦', screen: 'VendorProducts' },
      { key: 'shopProfile', label: hx(lang, 'menuShopProfile'), icon: '🏪', screen: 'ShopProfile' },
      { key: 'orders', label: hx(lang, 'menuOrders'), icon: '🧾', screen: 'VendorOrders', params: { status: '' } },
    ],
  },
  {
    heading: hx(lang, 'menuMoney'),
    items: [
      { key: 'earnings', label: hx(lang, 'menuEarnings'), icon: '💰', screen: 'SellerWallet', money: true },
      { key: 'promote', label: hx(lang, 'menuPromote'), icon: '📣', screen: 'PromoteProducts' },
    ],
  },
  {
    heading: hx(lang, 'menuHelp'),
    items: [
      { key: 'messages', label: hx(lang, 'menuMessages'), icon: '💬', screen: 'Chat' },
      { key: 'settings', label: hx(lang, 'menuSettings'), icon: '⚙️', screen: 'Settings' },
    ],
  },
];

const SellerMenu = ({ visible, onClose, navigation, shopName, onLogout, lang, showMoney }) => (
  <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <View style={styles.menuContainer}>
      <View style={styles.menuHeader}>
        <View style={styles.menuAvatar}>
          <Text style={styles.menuAvatarText}>{(shopName || 'V')[0].toUpperCase()}</Text>
        </View>
        <Text style={styles.menuShopName} numberOfLines={1}>{shopName || 'My Store'}</Text>
        <TouchableOpacity onPress={onClose} style={styles.menuCloseBtn} accessibilityRole="button">
          <Text style={styles.menuCloseIcon}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {menuSections(lang).map((section) => (
          <View key={section.heading} style={styles.menuSection}>
            <Text style={styles.menuSectionHeading}>{section.heading}</Text>
            {section.items.filter((item) => showMoney || !item.money).map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[styles.menuItem, item.active && styles.menuItemActive]}
                activeOpacity={0.7}
                onPress={() => {
                  onClose();
                  if (item.screen) navigation.navigate(item.screen, item.params);
                }}
              >
                <Text style={styles.menuItemIcon}>{item.icon}</Text>
                <Text style={[styles.menuItemLabel, item.active && styles.menuItemLabelActive]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <View style={styles.menuDivider} />
        <TouchableOpacity style={styles.menuLogout} onPress={() => { onClose(); onLogout(); }} activeOpacity={0.7}>
          <Text style={styles.menuLogoutIcon}>↪</Text>
          <Text style={styles.menuLogoutLabel}>{hx(lang, 'logout')}</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  </Modal>
);

// ── Small pieces ──────────────────────────────────────────────────────────────

const LangSwitch = ({ lang, onChange }) => (
  <View style={styles.langWrap}>
    {[['sw', 'Kiswahili'], ['en', 'English']].map(([code, label]) => (
      <TouchableOpacity
        key={code}
        onPress={() => onChange(code)}
        style={[styles.langBtn, lang === code && styles.langBtnOn]}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityState={{ selected: lang === code }}
      >
        <Text style={[styles.langText, lang === code && styles.langTextOn]}>{label}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

const Tile = ({ icon, title, sub, onPress, primary, badge }) => (
  <TouchableOpacity
    style={[styles.tile, primary && styles.tilePrimary]}
    onPress={onPress}
    activeOpacity={0.85}
    accessibilityRole="button"
    accessibilityLabel={title}
  >
    <View style={[styles.tileIcon, primary && styles.tileIconPrimary]}>
      <Text style={styles.tileEmoji}>{icon}</Text>
    </View>
    <Text style={[styles.tileTitle, primary && styles.tileTitlePrimary]} numberOfLines={2}>{title}</Text>
    {!!sub && <Text style={[styles.tileSub, primary && styles.tileSubPrimary]} numberOfLines={2}>{sub}</Text>}
    {!!badge && (
      <View style={styles.tileBadge}>
        <Text style={styles.tileBadgeText}>{badge}</Text>
      </View>
    )}
  </TouchableOpacity>
);

export default function VendorDashboard({ navigation }) {
  useTranslation(); // re-draw when the language changes
  const lang = homeLang(i18n.getLocale());
  const T = (key, vars) => hx(lang, key, vars);

  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const lastLoad = useRef(0);

  // silent = a background refresh: if it fails, keep showing what is already on the screen.
  const loadDashboard = useCallback(async (silent) => {
    lastLoad.current = Date.now();
    try {
      if (!silent) setError(null);
      const data = await vendorsAPI.getDashboard();
      setDashboard(data);
    } catch (e) {
      if (!silent) setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(false); }, []);

  // Come back to this screen (for example after withdrawing) -> show fresh numbers.
  useEffect(() => {
    if (!navigation || typeof navigation.addListener !== 'function') return undefined;
    return navigation.addListener('focus', () => {
      if (Date.now() - lastLoad.current > 5000) loadDashboard(true);
    });
  }, [navigation, loadDashboard]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboard(false);
    setRefreshing(false);
  }, [loadDashboard]);

  const changeLanguage = async (code) => {
    try {
      i18n.setLocale(code);
      await storage.setLanguage(code);
      notifyLanguageChange();
      try { dispatch(updateProfile({ language: code })); } catch (e) { /* the screen already changed */ }
    } catch (e) { /* keep the screen as it is */ }
  };

  const goWallet = () => navigation.navigate('SellerWallet');
  const goAddProduct = () => navigation.navigate('VendorProducts', { action: 'add' });
  const goProducts = () => navigation.navigate('VendorProducts');
  const goOrders = (status) => navigation.navigate('VendorOrders', { status: status || '' });

  const handleOpenSellerCenter = () => {
    Linking.openURL('https://vumastore.store/seller/').catch(() => {
      Alert.alert(T('sellerCenterFailTitle'), T('sellerCenterFail'));
    });
  };

  const handleLogout = async () => {
    setShowLogoutModal(false);
    try {
      await dispatch(logout());
    } catch {
      Alert.alert(T('error'), T('logoutFail'));
    }
  };

  if (loading) return <Loading fullScreen />;
  if (error) return <FullScreenError error={error} onRetry={() => loadDashboard(false)} />;

  const shopName = dashboard?.shop_name || user?.shop_name || 'My Store';
  const counts = dashboard?.order_status_counts || {};
  const newOrders = Number(counts.new) || 0;
  const showMoney = moneyVisible(dashboard);

  const STAGES = [
    { key: 'new', icon: '🛍️', label: T('stageNew'), status: 'pending', hot: true },
    { key: 'preparing', icon: '📦', label: T('stagePreparing') },
    { key: 'on_the_way', icon: '🚚', label: T('stageOnTheWay') },
    { key: 'delivered', icon: '✅', label: T('stageDelivered') },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerLogo}>VUMA</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.headerIconBtn} accessibilityRole="button">
            <Text style={styles.headerBell}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowMenu(true)} activeOpacity={0.8} style={styles.menuBtn} accessibilityRole="button" accessibilityLabel={T('menu')}>
            <Text style={styles.menuBtnIcon}>☰</Text>
            <Text style={styles.menuBtnText}>{T('menu')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Greeting + language */}
        <View style={styles.greetingRow}>
          <View style={{ flex: 1, paddingRight: SPACING.sm }}>
            <Text style={styles.greetingText}>{T(greetingKey(new Date().getHours()))} 👋</Text>
            <Text style={styles.shopNameText} numberOfLines={2}>{shopName}</Text>
            {dashboard?.is_approved && (
              <View style={styles.approvedPill}>
                <Text style={styles.approvedPillText}>{T('approved')}</Text>
              </View>
            )}
          </View>
          <LangSwitch lang={lang} onChange={changeLanguage} />
        </View>

        {/* New orders waiting */}
        {newOrders > 0 && (
          <TouchableOpacity style={styles.alertCard} onPress={() => goOrders('pending')} activeOpacity={0.85} accessibilityRole="button">
            <View style={styles.alertIcon}>
              <Text style={styles.alertEmoji}>🔔</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>{newOrdersLine(lang, newOrders)}</Text>
              <Text style={styles.alertSub}>{T('tapToOpen')}</Text>
            </View>
            <Text style={styles.alertArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* A shop without a logo looks unfinished: one tap to the Shop profile screen */}
        {showMoney && needsLogo(dashboard?.shop_pictures) && (
          <TouchableOpacity style={styles.nudgeCard} onPress={() => navigation.navigate('ShopProfile')} activeOpacity={0.85} accessibilityRole="button" testID="logo-nudge">
            <Text style={styles.nudgeEmoji}>🏪</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.nudgeTitle}>{T('logoNudgeTitle')}</Text>
              <Text style={styles.nudgeText}>{T('logoNudgeText')}</Text>
            </View>
            <Text style={styles.nudgeBtn}>{T('logoNudgeBtn')}</Text>
          </TouchableOpacity>
        )}

        {/* Money */}
        {showMoney && (
          <TouchableOpacity style={styles.moneyCard} onPress={goWallet} activeOpacity={0.92} accessibilityRole="button" accessibilityLabel={T('withdrawBtn')}>
            <Text style={styles.moneyLabel}>{T('moneyLabel')}</Text>
            <Text style={styles.moneyAmount} numberOfLines={1} adjustsFontSizeToFit>{tsh(dashboard.available_balance)}</Text>
            <View style={styles.moneySplitRow}>
              <View style={styles.moneySplitItem}>
                <Text style={styles.moneySplitLabel}>{T('onHold')}</Text>
                <Text style={styles.moneySplitValue} numberOfLines={1} adjustsFontSizeToFit>{tsh(dashboard.pending_balance)}</Text>
              </View>
              <View style={styles.moneySplitItem}>
                <Text style={styles.moneySplitLabel}>{T('totalEarned')}</Text>
                <Text style={styles.moneySplitValue} numberOfLines={1} adjustsFontSizeToFit>{tsh(dashboard.total_earnings)}</Text>
              </View>
            </View>
            <View style={styles.moneyBtn}>
              <Text style={styles.moneyBtnIcon}>💸</Text>
              <Text style={styles.moneyBtnText}>{T('withdrawBtn')}</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Big buttons */}
        <Text style={styles.sectionTitle}>{T('whatToDo')}</Text>
        <View style={styles.tileGrid}>
          <Tile primary icon="➕" title={T('addProduct')} sub={T('addProductSub')} onPress={goAddProduct} />
          <Tile icon="📦" title={T('products')} sub={productsLine(lang, dashboard?.total_products)} onPress={goProducts} />
          <Tile icon="🧾" title={T('orders')} sub={ordersLine(lang, newOrders)} badge={badgeText(newOrders)} onPress={() => goOrders('')} />
          {showMoney && <Tile icon="💰" title={T('money')} sub={T('moneySub')} onPress={goWallet} />}
          <Tile icon="📣" title={T('promote')} sub={T('promoteSub')} onPress={() => navigation.navigate('PromoteProducts')} />
          <Tile icon="💬" title={T('messages')} sub={T('messagesSub')} onPress={() => navigation.navigate('Chat')} />
        </View>

        {/* Orders at a glance */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitleInline}>{T('yourOrders')}</Text>
          <TouchableOpacity onPress={() => goOrders('')} accessibilityRole="button">
            <Text style={styles.sectionLink}>{T('seeAll')} ›</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.stageRow}>
          {STAGES.map((stage) => (
            <TouchableOpacity
              key={stage.key}
              style={[styles.stageCell, stage.hot && newOrders > 0 && styles.stageCellHot]}
              onPress={() => goOrders(stage.status)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`${stage.label}: ${Number(counts[stage.key]) || 0}`}
            >
              <Text style={styles.stageIcon}>{stage.icon}</Text>
              <Text style={[styles.stageCount, stage.key === 'delivered' && { color: COLORS.success }]}>{Number(counts[stage.key]) || 0}</Text>
              <Text style={styles.stageLabel} numberOfLines={1} adjustsFontSizeToFit>{stage.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Seller Center — for approved sellers only */}
        {dashboard?.is_approved && (
          <TouchableOpacity style={styles.centerCard} onPress={handleOpenSellerCenter} activeOpacity={0.85} accessibilityRole="button">
            <View style={styles.centerIcon}>
              <Text style={styles.centerEmoji}>🖥️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.centerTitle}>{T('sellerCenter')}</Text>
              <Text style={styles.centerSub}>{T('sellerCenterSub')}</Text>
            </View>
            <Text style={styles.centerArrow}>›</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <SellerMenu
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        navigation={navigation}
        shopName={shopName}
        onLogout={() => setShowLogoutModal(true)}
        lang={lang}
        showMoney={showMoney}
      />

      {/* Logout confirm */}
      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
        <View style={styles.logoutOverlay}>
          <View style={styles.logoutCard}>
            <Text style={styles.logoutIcon}>👋</Text>
            <Text style={styles.logoutTitle}>{T('logoutAsk')}</Text>
            <Text style={styles.logoutText}>{T('logoutText')}</Text>
            <TouchableOpacity style={styles.logoutConfirmBtn} onPress={handleLogout}>
              <Text style={styles.logoutConfirmText}>{T('logoutYes')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutCancelBtn} onPress={() => setShowLogoutModal(false)}>
              <Text style={styles.logoutCancelText}>{T('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { paddingHorizontal: SPACING.base, paddingBottom: SPACING.xl },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.base, paddingTop: Platform.OS === 'ios' ? SPACING['3xl'] : SPACING.base,
    paddingBottom: SPACING.sm,
  },
  headerLogo: { fontSize: 24, fontWeight: '900', color: COLORS.primary, letterSpacing: -0.5 },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  headerIconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerBell: { fontSize: 21 },
  menuBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 40,
    paddingHorizontal: SPACING.md, borderRadius: RADIUS.full,
    borderWidth: 1.5, borderColor: COLORS.primary, backgroundColor: COLORS.primaryFade,
  },
  menuBtnIcon: { fontSize: 17, color: COLORS.primaryDark, fontWeight: FONTS.bold },
  menuBtnText: { fontSize: FONTS.md, color: COLORS.primaryDark, fontWeight: FONTS.bold },

  greetingRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: SPACING.sm, marginBottom: SPACING.base },
  greetingText: { fontSize: FONTS.md, color: COLORS.textSecondary },
  shopNameText: { fontSize: 22, fontWeight: FONTS.black, color: COLORS.textPrimary, marginTop: 2 },
  approvedPill: { alignSelf: 'flex-start', marginTop: 6, backgroundColor: COLORS.successLight, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm + 2, paddingVertical: 3 },
  approvedPillText: { fontSize: FONTS.xs, fontWeight: FONTS.bold, color: COLORS.successText },

  langWrap: { flexDirection: 'row', borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceSunken, padding: 3 },
  langBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.full },
  langBtnOn: { backgroundColor: COLORS.primary },
  langText: { fontSize: FONTS.xs + 0.5, fontWeight: FONTS.bold, color: COLORS.textSecondary },
  langTextOn: { color: 'white' },

  alertCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.warningLight, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.warning,
    padding: SPACING.md + 2, marginBottom: SPACING.base,
  },
  alertIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.warning, alignItems: 'center', justifyContent: 'center' },
  alertEmoji: { fontSize: 19 },
  alertTitle: { fontSize: FONTS.base, fontWeight: FONTS.black, color: COLORS.textPrimary },
  alertSub: { fontSize: FONTS.sm, color: COLORS.warningText, marginTop: 2, fontWeight: FONTS.semiBold },
  nudgeCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.primaryFade, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.primary,
    padding: SPACING.md + 2, marginBottom: SPACING.base,
  },
  nudgeEmoji: { fontSize: 26 },
  nudgeTitle: { fontSize: FONTS.base, fontWeight: FONTS.black, color: COLORS.textPrimary },
  nudgeText: { fontSize: FONTS.sm, color: COLORS.textSecondary, marginTop: 2 },
  nudgeBtn: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.primaryDark },
  alertArrow: { fontSize: 26, color: COLORS.warningText, fontWeight: FONTS.bold },

  moneyCard: { backgroundColor: COLORS.primary, borderRadius: 20, padding: SPACING.base + 2, marginBottom: SPACING.lg, ...SHADOWS.primary },
  moneyLabel: { fontSize: FONTS.md, color: 'rgba(255,255,255,0.9)', fontWeight: FONTS.semiBold },
  moneyAmount: { fontSize: 36, fontWeight: FONTS.black, color: 'white', letterSpacing: -0.5, marginTop: 2, marginBottom: SPACING.sm + 2 },
  moneySplitRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.28)', paddingTop: SPACING.sm + 2, marginBottom: SPACING.md },
  moneySplitItem: { flex: 1, paddingRight: SPACING.sm },
  moneySplitLabel: { fontSize: FONTS.sm, color: 'rgba(255,255,255,0.8)', marginBottom: 2 },
  moneySplitValue: { fontSize: FONTS.lg, color: 'white', fontWeight: FONTS.bold },
  moneyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    backgroundColor: 'white', borderRadius: RADIUS.full, height: 50,
  },
  moneyBtnIcon: { fontSize: 20 },
  moneyBtnText: { fontSize: FONTS.lg, fontWeight: FONTS.black, color: COLORS.primaryDark },

  sectionTitle: { fontSize: FONTS.xl, fontWeight: FONTS.black, color: COLORS.textPrimary, marginBottom: SPACING.md },
  sectionTitleInline: { fontSize: FONTS.xl, fontWeight: FONTS.black, color: COLORS.textPrimary },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  sectionLink: { fontSize: FONTS.md, color: COLORS.primary, fontWeight: FONTS.bold },

  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: SPACING.md },
  tile: {
    width: '48.5%', minHeight: 108, backgroundColor: '#FFFFFF', borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.borderStrong, padding: SPACING.md, marginBottom: SPACING.sm + 2,
  },
  tilePrimary: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tileIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primaryFade, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  tileIconPrimary: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tileEmoji: { fontSize: 20 },
  tileTitle: { fontSize: FONTS.base + 1, fontWeight: FONTS.black, color: COLORS.textPrimary },
  tileTitlePrimary: { color: 'white' },
  tileSub: { fontSize: FONTS.sm, color: COLORS.textSecondary, marginTop: 2, lineHeight: 17 },
  tileSubPrimary: { color: 'rgba(255,255,255,0.9)' },
  tileBadge: {
    position: 'absolute', top: 10, right: 10, minWidth: 26, height: 26, borderRadius: 13,
    backgroundColor: COLORS.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  tileBadgeText: { color: 'white', fontSize: FONTS.sm, fontWeight: FONTS.black },

  stageRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.xl },
  stageCell: {
    width: '23.5%', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, paddingVertical: SPACING.md, paddingHorizontal: 4,
  },
  stageCellHot: { borderColor: COLORS.warning, backgroundColor: COLORS.warningLight },
  stageIcon: { fontSize: 18, marginBottom: 4 },
  stageCount: { fontSize: FONTS['2xl'], fontWeight: FONTS.black, color: COLORS.primary },
  stageLabel: { fontSize: FONTS.xs + 0.5, color: COLORS.textSecondary, marginTop: 2, fontWeight: FONTS.medium },

  centerCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surfaceAlt, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md + 2, marginBottom: SPACING.base,
  },
  centerIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: COLORS.secondaryFade, alignItems: 'center', justifyContent: 'center' },
  centerEmoji: { fontSize: 20 },
  centerTitle: { fontSize: FONTS.md, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  centerSub: { fontSize: FONTS.sm, color: COLORS.textSecondary, marginTop: 2 },
  centerArrow: { fontSize: 24, color: COLORS.textMuted, fontWeight: FONTS.bold },

  // Menu
  menuContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  menuHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.base, paddingTop: Platform.OS === 'ios' ? 54 : SPACING.xl, paddingBottom: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  menuAvatar: { width: 42, height: 42, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  menuAvatarText: { fontSize: 18, fontWeight: FONTS.bold, color: 'white' },
  menuShopName: { flex: 1, fontSize: FONTS.lg, fontWeight: FONTS.black, color: COLORS.textPrimary },
  menuCloseBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  menuCloseIcon: { fontSize: 20, color: COLORS.textMuted },
  menuSection: { paddingHorizontal: SPACING.base, marginTop: SPACING.base },
  menuSectionHeading: { fontSize: FONTS.md, fontWeight: FONTS.bold, color: COLORS.primary, marginBottom: SPACING.xs },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.md, paddingHorizontal: SPACING.sm, borderRadius: 12, minHeight: 52 },
  menuItemActive: { backgroundColor: COLORS.primaryFade },
  menuItemIcon: { fontSize: 20, width: 28 },
  menuItemLabel: { fontSize: FONTS.base + 1, color: COLORS.textPrimary, fontWeight: FONTS.medium },
  menuItemLabelActive: { color: COLORS.primary, fontWeight: FONTS.bold },
  menuDivider: { height: 1, backgroundColor: COLORS.divider, marginTop: SPACING.base, marginHorizontal: SPACING.base },
  menuLogout: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingHorizontal: SPACING.base + SPACING.sm, paddingVertical: SPACING.base },
  menuLogoutIcon: { fontSize: 20, width: 28, color: COLORS.danger },
  menuLogoutLabel: { fontSize: FONTS.base + 1, color: COLORS.danger, fontWeight: FONTS.semiBold },

  // Logout confirm modal
  logoutOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  logoutCard: { backgroundColor: '#FFFFFF', borderRadius: RADIUS['2xl'], padding: SPACING.xl, width: '100%', alignItems: 'center' },
  logoutIcon: { fontSize: 40, marginBottom: SPACING.sm },
  logoutTitle: { fontSize: FONTS.xl, fontWeight: FONTS.black, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  logoutText: { fontSize: FONTS.sm, color: COLORS.textMuted, textAlign: 'center', marginBottom: SPACING.xl },
  logoutConfirmBtn: { width: '100%', backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, padding: SPACING.base, alignItems: 'center', marginBottom: SPACING.sm },
  logoutConfirmText: { color: 'white', fontSize: FONTS.base, fontWeight: FONTS.bold },
  logoutCancelBtn: { paddingVertical: SPACING.sm },
  logoutCancelText: { fontSize: FONTS.sm, color: COLORS.textMuted, fontWeight: FONTS.semiBold },
});
