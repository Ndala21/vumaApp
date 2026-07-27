/**
 * VUMA Welcome Gift Screen
 * Shows gift collection and allows customer to claim their free gift
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, Alert, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const API = 'https://vumastore.store/api/v1';

const C = {
  orange:  '#FF6B00',
  orangeL: '#FFF3E8',
  green:   '#22C55E',
  greenL:  '#F0FDF4',
  gold:    '#F59E0B',
  goldL:   '#FFFBEB',
  text:    '#1F2937',
  textSec: '#6B7280',
  textMut: '#9CA3AF',
  bg:      '#F8F9FA',
  white:   '#FFFFFF',
  border:  '#E5E7EB',
  navy:    '#1B1F3B',
  red:     '#EF4444',
};

export default function WelcomeGiftScreen({ navigation, route }) {
  const { token } = route.params || {};

  const [status, setStatus]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [selected, setSelected] = useState(null);
  const [claimed, setClaimed]   = useState(false);
  const [claimedGift, setClaimedGift] = useState(null);

  const shimmer = new Animated.Value(0);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const res = await fetch(`${API}/welcome-gift/status/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setStatus(data);

      // Already claimed
      if (data.already_claimed && data.status === 'claimed') {
        setClaimed(true);
        setClaimedGift(data.gift);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not load your welcome gift. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!selected) {
      Alert.alert('Select a Gift', 'Please select your welcome gift first!');
      return;
    }
    setClaiming(true);
    try {
      const deviceId = await AsyncStorage.getItem('@vuma_device_id') || '';
      const res = await fetch(`${API}/welcome-gift/claim/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gift_product_id: selected.id,
          device_id: deviceId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setClaimed(true);
        setClaimedGift(selected);
        Alert.alert('🎁 Gift Claimed!', data.message);
      } else {
        Alert.alert('Error', data.error || 'Could not claim gift');
      }
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={C.orange} />
          <Text style={styles.loadingText}>Loading your gift…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Already claimed
  if (claimed && claimedGift) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backBtnText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Welcome Gift</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.claimedBanner}>
            <Text style={styles.claimedEmoji}>🎁</Text>
            <Text style={styles.claimedTitle}>Gift Claimed!</Text>
            <Text style={styles.claimedSub}>
              Your gift will be applied automatically at checkout
            </Text>
          </View>

          <View style={styles.claimedCard}>
            {claimedGift.image ? (
              <Image source={{ uri: claimedGift.image }} style={styles.claimedImage} resizeMode="cover" />
            ) : (
              <View style={[styles.claimedImage, styles.claimedImagePlaceholder]}>
                <Text style={{ fontSize: 48 }}>🎁</Text>
              </View>
            )}
            <Text style={styles.claimedName}>{claimedGift.name || claimedGift.product_name}</Text>
            <View style={styles.claimedPriceRow}>
              <Text style={styles.claimedOriginalPrice}>
                TZS {Number(claimedGift.price || claimedGift.discount_applied || 0).toLocaleString()}
              </Text>
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>FREE</Text>
              </View>
            </View>
          </View>

          <View style={styles.howToUseCard}>
            <Text style={styles.howToUseTitle}>How to use your gift</Text>
            {[
              { icon: '🛒', text: 'Add your gift item to cart' },
              { icon: '✅', text: 'Gift discount applies automatically at checkout' },
              { icon: '💳', text: 'Pay only for other items in your order' },
              { icon: '🚚', text: 'Free delivery on your entire order!' },
            ].map((s, i) => (
              <View key={i} style={styles.howToUseStep}>
                <Text style={styles.howToUseIcon}>{s.icon}</Text>
                <Text style={styles.howToUseText}>{s.text}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.shopNowBtn}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.shopNowBtnText}>Shop Now →</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Not eligible
  if (!status?.eligible) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Welcome Gift</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.notEligibleWrap}>
          <Text style={styles.notEligibleEmoji}>🎁</Text>
          <Text style={styles.notEligibleTitle}>Welcome Gift</Text>
          <Text style={styles.notEligibleText}>
            {status?.reason === 'Registration without referral link'
              ? 'Welcome gifts are exclusive to customers who join VUMA via a referral link from a friend.'
              : status?.reason === 'No active campaign'
              ? 'No welcome gift campaign is active right now. Check back soon!'
              : status?.reason || 'You are not eligible for a welcome gift at this time.'}
          </Text>
          <View style={styles.referralTip}>
            <Text style={styles.referralTipTitle}>💡 How to get a Welcome Gift</Text>
            <Text style={styles.referralTipText}>
              Ask a friend who is already on VUMA to share their referral link with you.
              Register using their link and complete phone verification to unlock your FREE gift!
            </Text>
          </View>
          <TouchableOpacity style={styles.shopNowBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.shopNowBtnText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { campaign, gifts = [] } = status;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Welcome Gift</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <Text style={styles.heroEmoji}>🎁</Text>
          <Text style={styles.heroTitle}>Your Welcome Gift Awaits!</Text>
          <Text style={styles.heroSub}>
            As a thank you for joining VUMA, pick ONE item from our gift collection — absolutely FREE!
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{campaign.remaining}</Text>
              <Text style={styles.heroStatLabel}>Gifts Left</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>
                TZS {Number(campaign.max_gift_value).toLocaleString()}
              </Text>
              <Text style={styles.heroStatLabel}>Max Value</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>FREE</Text>
              <Text style={styles.heroStatLabel}>You Pay</Text>
            </View>
          </View>
        </View>

        {/* Rules */}
        <View style={styles.rulesCard}>
          <Text style={styles.rulesTitle}>🎯 Gift Rules</Text>
          <View style={styles.rulesList}>
            {[
              '✅ One gift per customer — no exceptions',
              '✅ Gift must be in your order to apply',
              '✅ Free delivery included on your order',
              '⏰ Claim before gifts run out!',
            ].map((r, i) => (
              <Text key={i} style={styles.rulesItem}>{r}</Text>
            ))}
          </View>
        </View>

        {/* Gift Collection */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🎁 Gift Collection</Text>
          <Text style={styles.sectionSub}>Pick one FREE item</Text>
        </View>

        {gifts.length === 0 ? (
          <View style={styles.emptyGifts}>
            <Text style={styles.emptyGiftsEmoji}>😔</Text>
            <Text style={styles.emptyGiftsText}>All gifts have been claimed!</Text>
            <Text style={styles.emptyGiftsSub}>Check back soon for new campaign</Text>
          </View>
        ) : (
          <View style={styles.giftsGrid}>
            {gifts.map(gift => {
              const isSelected = selected?.id === gift.id;
              return (
                <TouchableOpacity
                  key={gift.id}
                  onPress={() => setSelected(gift)}
                  style={[styles.giftCard, isSelected && styles.giftCardSelected]}
                  activeOpacity={0.85}
                >
                  {/* Selected checkmark */}
                  {isSelected && (
                    <View style={styles.selectedCheck}>
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>
                    </View>
                  )}

                  {/* Gift image */}
                  <View style={styles.giftImageWrap}>
                    {gift.image ? (
                      <Image source={{ uri: gift.image }} style={styles.giftImage} resizeMode="cover" />
                    ) : (
                      <View style={[styles.giftImage, styles.giftImagePlaceholder]}>
                        <Text style={{ fontSize: 36 }}>🎁</Text>
                      </View>
                    )}
                    <View style={styles.freePill}>
                      <Text style={styles.freePillText}>FREE</Text>
                    </View>
                  </View>

                  {/* Gift info */}
                  <View style={styles.giftInfo}>
                    <Text style={styles.giftName} numberOfLines={2}>{gift.name}</Text>
                    <View style={styles.giftPriceRow}>
                      <Text style={styles.giftOriginalPrice}>
                        TZS {Number(gift.price).toLocaleString()}
                      </Text>
                      <Text style={styles.giftFreePrice}>FREE</Text>
                    </View>
                    <Text style={styles.giftStock}>{gift.stock} remaining</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Selected summary */}
        {selected && (
          <View style={styles.selectedSummary}>
            <View style={styles.selectedSummaryLeft}>
              <Text style={styles.selectedSummaryLabel}>Selected Gift:</Text>
              <Text style={styles.selectedSummaryName} numberOfLines={1}>{selected.name}</Text>
            </View>
            <View style={styles.selectedSummaryRight}>
              <Text style={styles.selectedSummaryOriginal}>
                TZS {Number(selected.price).toLocaleString()}
              </Text>
              <Text style={styles.selectedSummaryFree}>FREE</Text>
            </View>
          </View>
        )}

        {/* Claim button */}
        {gifts.length > 0 && (
          <TouchableOpacity
            style={[styles.claimBtn, !selected && styles.claimBtnDisabled]}
            onPress={handleClaim}
            disabled={claiming || !selected}
            activeOpacity={0.85}
          >
            {claiming ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.claimBtnText}>
                {selected ? `🎁 Claim ${selected.name} for FREE!` : 'Select a Gift First'}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Anti abuse notice */}
        <Text style={styles.antiAbuse}>
          🔒 Each customer can claim one gift per account, phone number, and device
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg },
  loadingWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText:  { marginTop: 12, fontSize: 14, color: C.textSec },

  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  backBtnText:  { fontSize: 20, color: C.text },
  headerTitle:  { fontSize: 16, fontWeight: '700', color: C.text },

  heroBanner:   { backgroundColor: C.navy, padding: 24, alignItems: 'center' },
  heroEmoji:    { fontSize: 52, marginBottom: 10 },
  heroTitle:    { fontSize: 22, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 8 },
  heroSub:      { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  heroStats:    { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, alignItems: 'center' },
  heroStatItem: { flex: 1, alignItems: 'center' },
  heroStatValue:{ fontSize: 16, fontWeight: '800', color: C.orange },
  heroStatLabel:{ fontSize: 10, color: '#94A3B8', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  heroStatDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.15)' },

  rulesCard:    { backgroundColor: C.greenL, margin: 16, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#BBF7D0' },
  rulesTitle:   { fontSize: 14, fontWeight: '700', color: '#166534', marginBottom: 10 },
  rulesList:    { gap: 6 },
  rulesItem:    { fontSize: 13, color: '#166534', lineHeight: 20 },

  sectionHeader:{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  sectionSub:   { fontSize: 12, color: C.textSec, marginTop: 2 },

  giftsGrid:    { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 12, marginTop: 8 },
  giftCard:     { width: (width - 36) / 2, backgroundColor: C.white, borderRadius: 14, overflow: 'hidden', borderWidth: 2, borderColor: C.border },
  giftCardSelected: { borderColor: C.orange, shadowColor: C.orange, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  selectedCheck:{ position: 'absolute', top: 8, right: 8, zIndex: 10, width: 24, height: 24, borderRadius: 12, backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center' },
  giftImageWrap:{ position: 'relative' },
  giftImage:    { width: '100%', height: 130 },
  giftImagePlaceholder: { backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  freePill:     { position: 'absolute', bottom: 8, left: 8, backgroundColor: C.green, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  freePillText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  giftInfo:     { padding: 10 },
  giftName:     { fontSize: 12, fontWeight: '600', color: C.text, lineHeight: 16, marginBottom: 6 },
  giftPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  giftOriginalPrice: { fontSize: 11, color: C.textMut, textDecorationLine: 'line-through' },
  giftFreePrice:{ fontSize: 14, fontWeight: '800', color: C.green },
  giftStock:    { fontSize: 10, color: C.textMut },

  selectedSummary:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.orangeL, marginHorizontal: 16, marginTop: 16, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: `${C.orange}30` },
  selectedSummaryLeft: { flex: 1 },
  selectedSummaryLabel:{ fontSize: 11, color: C.orange, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  selectedSummaryName: { fontSize: 14, fontWeight: '700', color: C.text, marginTop: 2 },
  selectedSummaryRight:{ alignItems: 'flex-end' },
  selectedSummaryOriginal: { fontSize: 11, color: C.textMut, textDecorationLine: 'line-through' },
  selectedSummaryFree: { fontSize: 18, fontWeight: '800', color: C.green },

  claimBtn:         { backgroundColor: C.orange, marginHorizontal: 16, marginTop: 16, borderRadius: 14, paddingVertical: 16, alignItems: 'center', shadowColor: C.orange, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 },
  claimBtnDisabled: { backgroundColor: C.textMut, shadowOpacity: 0 },
  claimBtnText:     { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },

  antiAbuse:    { fontSize: 11, color: C.textMut, textAlign: 'center', marginHorizontal: 24, marginTop: 12, lineHeight: 16 },

  // Claimed state
  claimedBanner:       { backgroundColor: C.navy, padding: 32, alignItems: 'center' },
  claimedEmoji:        { fontSize: 56, marginBottom: 12 },
  claimedTitle:        { fontSize: 26, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  claimedSub:          { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 20 },
  claimedCard:         { backgroundColor: C.white, margin: 16, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  claimedImage:        { width: 160, height: 160, borderRadius: 12, marginBottom: 14 },
  claimedImagePlaceholder: { backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  claimedName:         { fontSize: 18, fontWeight: '700', color: C.text, textAlign: 'center', marginBottom: 10 },
  claimedPriceRow:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  claimedOriginalPrice:{ fontSize: 16, color: C.textMut, textDecorationLine: 'line-through' },
  freeBadge:           { backgroundColor: C.green, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  freeBadgeText:       { color: '#fff', fontSize: 14, fontWeight: '800' },

  howToUseCard:        { backgroundColor: C.white, marginHorizontal: 16, borderRadius: 14, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: C.border },
  howToUseTitle:       { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 14 },
  howToUseStep:        { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  howToUseIcon:        { fontSize: 18, width: 28 },
  howToUseText:        { fontSize: 13, color: C.textSec, flex: 1, lineHeight: 18 },

  shopNowBtn:          { backgroundColor: C.orange, marginHorizontal: 16, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  shopNowBtnText:      { color: '#fff', fontSize: 15, fontWeight: '800' },

  // Not eligible
  notEligibleWrap:     { flex: 1, padding: 24, alignItems: 'center' },
  notEligibleEmoji:    { fontSize: 56, marginBottom: 16, marginTop: 32 },
  notEligibleTitle:    { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 8 },
  notEligibleText:     { fontSize: 14, color: C.textSec, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  referralTip:         { backgroundColor: C.orangeL, borderRadius: 14, padding: 18, width: '100%', marginBottom: 24, borderWidth: 1, borderColor: `${C.orange}30` },
  referralTipTitle:    { fontSize: 14, fontWeight: '700', color: C.orange, marginBottom: 8 },
  referralTipText:     { fontSize: 13, color: C.text, lineHeight: 20 },

  emptyGifts:          { alignItems: 'center', padding: 40 },
  emptyGiftsEmoji:     { fontSize: 48, marginBottom: 12 },
  emptyGiftsText:      { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 4 },
  emptyGiftsSub:       { fontSize: 13, color: C.textSec },
});