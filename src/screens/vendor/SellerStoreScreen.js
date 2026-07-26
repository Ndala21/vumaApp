import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Image, Share, Alert, Linking, ActivityIndicator,
  FlatList, Modal, TextInput, Dimensions, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_W } = Dimensions.get('window');
const API = 'https://vumastore.store/api/v1';

// ── Colors ────────────────────────────────────────────
const C = {
  bg:       '#F8F9FA',
  white:    '#FFFFFF',
  orange:   '#FF6B00',
  orangeL:  '#FFF3E8',
  blue:     '#1B8EF2',
  blueL:    '#E8F3FF',
  green:    '#16A34A',
  greenL:   '#EDFAF3',
  yellow:   '#F59E0B',
  yellowL:  '#FFFBEB',
  red:      '#EF4444',
  text:     '#111827',
  textSec:  '#6B7280',
  textMut:  '#9CA3AF',
  border:   '#E5E7EB',
  card:     '#FFFFFF',
};

// ── Badge config ──────────────────────────────────────
const BADGE_CONFIG = {
  verified_seller:  { color: C.blue,   bg: C.blueL,   icon: '✓' },
  verified_business:{ color: C.orange, bg: C.orangeL, icon: '🏢' },
  verified_agri:    { color: C.green,  bg: C.greenL,  icon: '🌾' },
  featured:         { color: C.yellow, bg: C.yellowL, icon: '⭐' },
};

// ── Star Rating ───────────────────────────────────────
const StarRating = ({ rating, size = 14, showNumber = true }) => {
  const stars = [1, 2, 3, 4, 5];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {stars.map(s => (
        <Text key={s} style={{ fontSize: size, color: s <= Math.round(rating) ? C.yellow : C.border }}>
          ★
        </Text>
      ))}
      {showNumber && (
        <Text style={{ fontSize: size - 2, color: C.textSec, marginLeft: 4 }}>
          {rating > 0 ? rating.toFixed(1) : 'New'}
        </Text>
      )}
    </View>
  );
};

// ── Badge Chip ────────────────────────────────────────
const BadgeChip = ({ badge, large = false }) => {
  const cfg = BADGE_CONFIG[badge.id] || { color: C.blue, bg: C.blueL, icon: '✓' };
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: cfg.bg, borderRadius: 20,
      paddingHorizontal: large ? 12 : 8,
      paddingVertical: large ? 6 : 3,
      borderWidth: 1, borderColor: `${cfg.color}30`,
      marginRight: 6, marginBottom: 6,
    }}>
      <Text style={{ fontSize: large ? 14 : 11 }}>{cfg.icon}</Text>
      <Text style={{
        fontSize: large ? 12 : 10, fontWeight: '700',
        color: cfg.color, letterSpacing: 0.2,
      }}>{badge.label}</Text>
    </View>
  );
};

// ── Product Card ──────────────────────────────────────
const ProductCard = ({ product, onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.productCard} activeOpacity={0.8}>
    <View style={styles.productImageWrap}>
      {product.image
        ? <Image source={{ uri: product.image }} style={styles.productImage} resizeMode="cover" />
        : <View style={[styles.productImage, { backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ fontSize: 32 }}>🛍️</Text>
          </View>
      }
      {product.original_price && product.original_price > product.price && (
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>
            -{Math.round((1 - product.price / product.original_price) * 100)}%
          </Text>
        </View>
      )}
    </View>
    <View style={styles.productInfo}>
      <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
      <Text style={styles.productPrice}>TZS {Number(product.price).toLocaleString()}</Text>
      {product.original_price && product.original_price > product.price && (
        <Text style={styles.productOriginalPrice}>TZS {Number(product.original_price).toLocaleString()}</Text>
      )}
      <StarRating rating={product.rating} size={12} />
    </View>
  </TouchableOpacity>
);

// ── Review Card ───────────────────────────────────────
const ReviewCard = ({ review }) => (
  <View style={styles.reviewCard}>
    <View style={styles.reviewHeader}>
      <View style={styles.reviewAvatar}>
        <Text style={styles.reviewAvatarText}>
          {review.customer.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.reviewCustomer}>{review.customer}</Text>
        <StarRating rating={review.rating} size={12} showNumber={false} />
      </View>
      <Text style={styles.reviewDate}>{review.date}</Text>
    </View>
    {review.comment ? (
      <Text style={styles.reviewComment}>{review.comment}</Text>
    ) : null}
    <Text style={styles.reviewProduct}>Re: {review.product}</Text>
  </View>
);

// ── Main Component ────────────────────────────────────
export default function SellerStoreScreen({ route, navigation }) {
  const { vendorId } = route.params;

  const [store, setStore]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('products');
  const [reportModal, setReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [reporting, setReporting] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API}/vendors/store/${vendorId}/`);
      const data = await res.json();
      setStore(data);
    } catch (e) {
      Alert.alert('Error', 'Could not load store. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [vendorId]);

  useEffect(() => { load(); }, [load]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `🛍️ Check out ${store?.store?.shop_name} on VUMA!\n\nShop quality products with verified seller badges.\n\nDownload VUMA app: vumastore.store`,
        title: `${store?.store?.shop_name} on VUMA`,
      });
    } catch (e) {}
  };

  const handleWhatsApp = () => {
    const phone = store?.store?.whatsapp?.replace(/\D/g, '') || '';
    if (!phone) return Alert.alert('Not Available', 'Seller has not provided WhatsApp contact.');
    const msg = encodeURIComponent(`Habari! Nimeona bidhaa yako kwenye VUMA Marketplace. Nataka kujua zaidi.`);
    Linking.openURL(`https://wa.me/${phone}?text=${msg}`);
  };

  const handleReport = async () => {
    if (!reportReason.trim()) {
      Alert.alert('Required', 'Please select a reason for reporting.');
      return;
    }
    setReporting(true);
    try {
      const res = await fetch(`${API}/vendors/store/${vendorId}/report/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reportReason, details: reportDetails }),
      });
      const data = await res.json();
      if (data.success) {
        setReportModal(false);
        setReportReason('');
        setReportDetails('');
        Alert.alert('Report Submitted', 'Thank you. Our team will review within 24 hours.');
      }
    } catch {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setReporting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.orange} />
        <Text style={styles.loadingText}>Loading store…</Text>
      </SafeAreaView>
    );
  }

  if (!store) return null;

  const { store: info, badges = [], stats, products = [], reviews = [], verification_info } = store;

  const TABS = [
    { id: 'products',     label: `Products (${stats.total_products})` },
    { id: 'reviews',      label: `Reviews (${stats.total_reviews})` },
    { id: 'verification', label: 'Verified ✓' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{info.shop_name}</Text>
        <TouchableOpacity onPress={handleShare} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>⬆</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={C.orange} />}
      >
        {/* Banner */}
        <View style={styles.bannerWrap}>
          {info.banner
            ? <Image source={{ uri: info.banner }} style={styles.banner} resizeMode="cover" />
            : <View style={[styles.banner, styles.bannerPlaceholder]}>
                <Text style={{ fontSize: 40 }}>🏪</Text>
              </View>
          }
          <View style={styles.bannerOverlay} />

          {/* Logo */}
          <View style={styles.logoWrap}>
            {info.logo
              ? <Image source={{ uri: info.logo }} style={styles.logo} resizeMode="cover" />
              : <View style={[styles.logo, styles.logoPlaceholder]}>
                  <Text style={{ fontSize: 28, fontWeight: '800', color: C.white }}>
                    {info.shop_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
            }
          </View>
        </View>

        {/* Store Info */}
        <View style={styles.storeInfo}>
          <Text style={styles.storeName}>{info.shop_name}</Text>

          {/* Badges */}
          {badges.length > 0 && (
            <View style={styles.badgesRow}>
              {badges.map(b => <BadgeChip key={b.id} badge={b} large />)}
            </View>
          )}

          {/* Location & Member since */}
          <View style={styles.metaRow}>
            {info.location_city ? (
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>📍</Text>
                <Text style={styles.metaText}>{info.location_city}{info.location_region ? `, ${info.location_region}` : ''}</Text>
              </View>
            ) : null}
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>📅</Text>
              <Text style={styles.metaText}>{info.member_since}</Text>
            </View>
          </View>

          {/* Description */}
          {info.description ? (
            <Text style={styles.description}>{info.description}</Text>
          ) : null}

          {/* Stats */}
          <View style={styles.statsRow}>
            {[
              { value: stats.rating > 0 ? stats.rating.toFixed(1) : 'New', label: 'Rating', icon: '⭐' },
              { value: stats.total_orders.toLocaleString(), label: 'Orders', icon: '📦' },
              { value: stats.total_products, label: 'Products', icon: '🛍️' },
              { value: stats.response_time.replace('Within ', ''), label: 'Response', icon: '⚡' },
            ].map((s, i) => (
              <View key={i} style={styles.statItem}>
                <Text style={styles.statIcon}>{s.icon}</Text>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtnPrimary} onPress={handleWhatsApp}>
              <Text style={styles.actionBtnPrimaryText}>💬 Contact Seller</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtnSecondary} onPress={handleShare}>
              <Text style={styles.actionBtnSecondaryText}>⬆ Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtnDanger} onPress={() => setReportModal(true)}>
              <Text style={styles.actionBtnDangerText}>⚑ Report</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t.id}
              onPress={() => setActiveTab(t.id)}
              style={[styles.tab, activeTab === t.id && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === t.id && styles.tabTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {activeTab === 'products' && (
          <View style={styles.tabContent}>
            {products.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🛍️</Text>
                <Text style={styles.emptyText}>No products yet</Text>
              </View>
            ) : (
              <View style={styles.productsGrid}>
                {products.map(p => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onPress={() => navigation.navigate('ProductDetail', { productId: p.id, slug: p.slug })}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === 'reviews' && (
          <View style={styles.tabContent}>
            {/* Rating Summary */}
            <View style={styles.ratingCard}>
              <View style={styles.ratingBig}>
                <Text style={styles.ratingNumber}>
                  {stats.rating > 0 ? stats.rating.toFixed(1) : '—'}
                </Text>
                <StarRating rating={stats.rating} size={20} showNumber={false} />
                <Text style={styles.ratingCount}>{stats.total_reviews} reviews</Text>
              </View>
            </View>

            {reviews.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>💬</Text>
                <Text style={styles.emptyText}>No reviews yet</Text>
                <Text style={styles.emptySubtext}>Be the first to review this seller</Text>
              </View>
            ) : (
              reviews.map(r => <ReviewCard key={r.id} review={r} />)
            )}
          </View>
        )}

        {activeTab === 'verification' && (
          <View style={styles.tabContent}>
            {/* Verification Banner */}
            <View style={styles.verifyBanner}>
              <Text style={styles.verifyBannerIcon}>🛡️</Text>
              <Text style={styles.verifyBannerTitle}>100% Verified by VUMA</Text>
              <Text style={styles.verifyBannerSubtitle}>
                Every verified seller goes through our strict verification process to protect buyers
              </Text>
            </View>

            {/* Current Badges */}
            {badges.length > 0 && (
              <View style={styles.verifySection}>
                <Text style={styles.verifySectionTitle}>Active Badges</Text>
                {badges.map(b => (
                  <View key={b.id} style={styles.verifyBadgeRow}>
                    <View style={[styles.verifyBadgeIcon, { backgroundColor: (BADGE_CONFIG[b.id] || {}).bg || C.blueL }]}>
                      <Text style={{ fontSize: 20 }}>{(BADGE_CONFIG[b.id] || {}).icon || '✓'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.verifyBadgeLabel}>{b.label}</Text>
                      <Text style={styles.verifyBadgeDesc}>{b.description}</Text>
                    </View>
                    <View style={styles.verifiedCheckmark}>
                      <Text style={{ color: C.white, fontSize: 12, fontWeight: '700' }}>✓</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Verification Process */}
            <View style={styles.verifySection}>
              <Text style={styles.verifySectionTitle}>Verification Process</Text>
              {(verification_info?.steps || []).map((step, i) => (
                <View key={i} style={styles.verifyStep}>
                  <View style={styles.verifyStepLeft}>
                    <View style={styles.verifyStepIcon}>
                      <Text style={{ fontSize: 18 }}>{step.icon}</Text>
                    </View>
                    {i < (verification_info.steps.length - 1) && (
                      <View style={styles.verifyStepLine} />
                    )}
                  </View>
                  <View style={styles.verifyStepContent}>
                    <Text style={styles.verifyStepTitle}>{step.title}</Text>
                    <Text style={styles.verifyStepDesc}>{step.desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Buyer Protection */}
            <View style={styles.protectionCard}>
              <Text style={styles.protectionTitle}>🔒 VUMA Buyer Protection</Text>
              {[
                '100% secure payments via M-Pesa, Airtel, Tigo',
                'Free delivery on all orders',
                'Easy returns & refunds within 7 days',
                'Direct support from VUMA team',
              ].map((item, i) => (
                <View key={i} style={styles.protectionItem}>
                  <Text style={styles.protectionCheck}>✓</Text>
                  <Text style={styles.protectionText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Report Modal */}
      <Modal visible={reportModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Report Seller</Text>
            <Text style={styles.modalSubtitle}>
              Help us keep VUMA safe. Our team reviews all reports within 24 hours.
            </Text>

            <Text style={styles.inputLabel}>Reason</Text>
            {[
              'Fake products / counterfeit goods',
              'Wrong product description',
              'Scam / fraud attempt',
              'Rude or unprofessional behavior',
              'Selling prohibited items',
              'Other',
            ].map(r => (
              <TouchableOpacity
                key={r}
                onPress={() => setReportReason(r)}
                style={[styles.reasonOption, reportReason === r && styles.reasonOptionActive]}
              >
                <View style={[styles.radioBtn, reportReason === r && styles.radioBtnActive]} />
                <Text style={[styles.reasonText, reportReason === r && { color: C.orange, fontWeight: '600' }]}>{r}</Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Additional Details (optional)</Text>
            <TextInput
              value={reportDetails}
              onChangeText={setReportDetails}
              placeholder="Describe the issue…"
              multiline
              numberOfLines={3}
              style={styles.textInput}
              placeholderTextColor={C.textMut}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setReportModal(false)} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleReport} disabled={reporting} style={styles.modalSubmitBtn}>
                {reporting
                  ? <ActivityIndicator color={C.white} size="small" />
                  : <Text style={styles.modalSubmitText}>Submit Report</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: C.bg },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  loadingText:      { marginTop: 12, fontSize: 14, color: C.textSec },

  // Header
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border },
  headerBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  headerBtnText:{ fontSize: 18, color: C.text },
  headerTitle:  { flex: 1, fontSize: 16, fontWeight: '700', color: C.text, textAlign: 'center', marginHorizontal: 12 },

  // Banner
  bannerWrap:       { position: 'relative', height: 160 },
  banner:           { width: '100%', height: '100%' },
  bannerPlaceholder:{ backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center' },
  bannerOverlay:    { ...StyleSheet.absoluteFillObject, backgroundColor: '#00000030' },
  logoWrap:         { position: 'absolute', bottom: -36, left: 20 },
  logo:             { width: 72, height: 72, borderRadius: 16, borderWidth: 3, borderColor: C.white },
  logoPlaceholder:  { backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center' },

  // Store Info
  storeInfo:    { backgroundColor: C.white, paddingTop: 48, paddingHorizontal: 20, paddingBottom: 20, marginBottom: 8 },
  storeName:    { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 8 },
  badgesRow:    { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  metaRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 10 },
  metaItem:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaIcon:     { fontSize: 12 },
  metaText:     { fontSize: 12, color: C.textSec },
  description:  { fontSize: 13, color: C.textSec, lineHeight: 20, marginBottom: 16 },

  // Stats
  statsRow:     { flexDirection: 'row', backgroundColor: C.bg, borderRadius: 12, padding: 16, marginBottom: 16, justifyContent: 'space-around' },
  statItem:     { alignItems: 'center', flex: 1 },
  statIcon:     { fontSize: 18, marginBottom: 4 },
  statValue:    { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 2 },
  statLabel:    { fontSize: 10, color: C.textMut, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },

  // Actions
  actionRow:        { flexDirection: 'row', gap: 8 },
  actionBtnPrimary: { flex: 2, backgroundColor: C.orange, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  actionBtnPrimaryText: { color: C.white, fontSize: 13, fontWeight: '700' },
  actionBtnSecondary:   { flex: 1, backgroundColor: C.bg, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  actionBtnSecondaryText: { color: C.text, fontSize: 13, fontWeight: '600' },
  actionBtnDanger:  { flex: 1, backgroundColor: '#FFF5F5', borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#FECACA' },
  actionBtnDangerText: { color: C.red, fontSize: 13, fontWeight: '600' },

  // Tabs
  tabBar:       { flexDirection: 'row', backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border },
  tab:          { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:    { borderBottomColor: C.orange },
  tabText:      { fontSize: 12, fontWeight: '500', color: C.textSec },
  tabTextActive:{ color: C.orange, fontWeight: '700' },
  tabContent:   { padding: 16 },

  // Products
  productsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  productCard:   { width: (SCREEN_W - 44) / 2, backgroundColor: C.white, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  productImageWrap: { position: 'relative' },
  productImage:  { width: '100%', height: 140 },
  discountBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: C.red, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  discountText:  { color: C.white, fontSize: 10, fontWeight: '700' },
  productInfo:   { padding: 10, gap: 4 },
  productName:   { fontSize: 12, fontWeight: '600', color: C.text, lineHeight: 16 },
  productPrice:  { fontSize: 14, fontWeight: '800', color: C.orange },
  productOriginalPrice: { fontSize: 11, color: C.textMut, textDecorationLine: 'line-through' },

  // Rating
  ratingCard:   { backgroundColor: C.white, borderRadius: 12, padding: 20, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  ratingBig:    { alignItems: 'center', gap: 8 },
  ratingNumber: { fontSize: 48, fontWeight: '800', color: C.text, lineHeight: 56 },
  ratingCount:  { fontSize: 13, color: C.textSec, marginTop: 4 },

  // Reviews
  reviewCard:   { backgroundColor: C.white, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center' },
  reviewAvatarText: { color: C.white, fontWeight: '700', fontSize: 14 },
  reviewCustomer:   { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 2 },
  reviewDate:       { fontSize: 11, color: C.textMut },
  reviewComment:    { fontSize: 13, color: C.text, lineHeight: 18, marginBottom: 6 },
  reviewProduct:    { fontSize: 11, color: C.textMut, fontStyle: 'italic' },

  // Verification
  verifyBanner:       { backgroundColor: C.orange, borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 16 },
  verifyBannerIcon:   { fontSize: 36, marginBottom: 8 },
  verifyBannerTitle:  { fontSize: 18, fontWeight: '800', color: C.white, marginBottom: 6, textAlign: 'center' },
  verifyBannerSubtitle:{ fontSize: 13, color: '#FFE0C8', textAlign: 'center', lineHeight: 18 },
  verifySection:      { backgroundColor: C.white, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  verifySectionTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 14 },
  verifyBadgeRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  verifyBadgeIcon:    { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  verifyBadgeLabel:   { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 2 },
  verifyBadgeDesc:    { fontSize: 11, color: C.textSec, lineHeight: 15 },
  verifiedCheckmark:  { width: 24, height: 24, borderRadius: 12, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  verifyStep:         { flexDirection: 'row', gap: 12, marginBottom: 4 },
  verifyStepLeft:     { alignItems: 'center', width: 44 },
  verifyStepIcon:     { width: 44, height: 44, borderRadius: 22, backgroundColor: C.orangeL, alignItems: 'center', justifyContent: 'center' },
  verifyStepLine:     { width: 2, flex: 1, backgroundColor: C.border, marginVertical: 4 },
  verifyStepContent:  { flex: 1, paddingTop: 10, paddingBottom: 16 },
  verifyStepTitle:    { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 2 },
  verifyStepDesc:     { fontSize: 12, color: C.textSec },
  protectionCard:     { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#BBF7D0', marginBottom: 16 },
  protectionTitle:    { fontSize: 14, fontWeight: '700', color: C.green, marginBottom: 12 },
  protectionItem:     { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  protectionCheck:    { fontSize: 14, color: C.green, fontWeight: '700', marginTop: 1 },
  protectionText:     { fontSize: 13, color: '#166534', flex: 1, lineHeight: 18 },

  // Empty state
  emptyState:   { alignItems: 'center', paddingVertical: 40 },
  emptyIcon:    { fontSize: 40, marginBottom: 12 },
  emptyText:    { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 4 },
  emptySubtext: { fontSize: 13, color: C.textSec },

  // Modal
  modalOverlay:   { flex: 1, backgroundColor: '#00000060', justifyContent: 'flex-end' },
  modalCard:      { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalTitle:     { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 6 },
  modalSubtitle:  { fontSize: 13, color: C.textSec, marginBottom: 20, lineHeight: 18 },
  inputLabel:     { fontSize: 12, fontWeight: '700', color: C.text, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  reasonOption:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  reasonOptionActive: { backgroundColor: C.orangeL, marginHorizontal: -4, paddingHorizontal: 4, borderRadius: 8 },
  radioBtn:       { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: C.border },
  radioBtnActive: { borderColor: C.orange, backgroundColor: C.orange },
  reasonText:     { fontSize: 13, color: C.text, flex: 1 },
  textInput:      { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, fontSize: 13, color: C.text, textAlignVertical: 'top', minHeight: 80 },
  modalActions:   { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalCancelBtn: { flex: 1, backgroundColor: C.bg, borderRadius: 10, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  modalCancelText:{ fontSize: 14, fontWeight: '600', color: C.textSec },
  modalSubmitBtn: { flex: 2, backgroundColor: C.red, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  modalSubmitText:{ fontSize: 14, fontWeight: '700', color: C.white },
});