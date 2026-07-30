/**
 * VUMA Referral & Viral Growth Screen
 * Invite & Earn - share via WhatsApp, SMS, etc.
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Share, Clipboard, Alert, ActivityIndicator,
  StatusBar, Platform, Linking,
} from 'react-native';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/authSlice';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../utils/constants';
import { get } from '../../api/client';

const SHARE_CHANNELS = [
  { id: 'whatsapp',  label: 'WhatsApp',  icon: '💬', color: '#25D366', scheme: 'whatsapp://send?text=' },
  { id: 'sms',       label: 'SMS',       icon: '📱', color: '#007AFF', scheme: 'sms:?body=' },
  { id: 'telegram',  label: 'Telegram',  icon: '✈️',  color: '#0088CC', scheme: 'tg://msg?text=' },
  { id: 'facebook',  label: 'Facebook',  icon: '👤', color: '#1877F2', scheme: 'fb://share?text=' },
  { id: 'copy',      label: 'Copy Link', icon: '🔗', color: '#FF6A00', scheme: null },
  { id: 'more',      label: 'More',      icon: '⋯',  color: '#666',    scheme: null },
];

const StatCard = memo(({ icon, value, label, color = COLORS.primary }) => (
  <View style={[styles.statCard, { borderTopColor: color }]}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
));

const MilestoneBar = memo(({ milestone, current }) => {
  const progress = Math.min(current / milestone.invites, 1);
  return (
    <View style={styles.milestone}>
      <View style={styles.milestoneHeader}>
        <Text style={styles.milestoneTitle}>
          🎯 Invite {milestone.invites} friends
        </Text>
        <Text style={styles.milestoneReward}>
          TZS {Number(milestone.amount).toLocaleString()}
        </Text>
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={styles.progressText}>
        {Math.min(current, milestone.invites)}/{milestone.invites} friends
      </Text>
    </View>
  );
});

export default function ReferralScreen({ navigation }) {
  const user = useSelector(selectUser);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('invite'); // invite | dashboard | leaderboard

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [codeData, dashData] = await Promise.all([
        get('/referrals/code/'),
        get('/referrals/dashboard/'),
      ]);
      setData({ ...codeData, ...dashData });
    } catch (e) {
      Alert.alert('Error', 'Could not load referral data.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = useCallback(async (channel) => {
    if (!data) return;
    const msg = data.whatsapp_message || `Join VUMA! Use my code ${data.code}: ${data.link}`;
    const link = data.link || '';

    if (channel.id === 'copy') {
      Clipboard.setString(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }

    if (channel.id === 'more') {
      Share.share({
        message: msg,
        url: link,
        title: 'Join VUMA Marketplace',
      });
      return;
    }

    if (channel.scheme) {
      const url = channel.scheme + encodeURIComponent(msg);
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        Linking.openURL(url);
      } else {
        Share.share({ message: msg, url: link });
      }
    }
  }, [data]);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invite & Earn</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {[
          { id: 'invite', label: '🎁 Invite' },
          { id: 'dashboard', label: '📊 Stats' },
          { id: 'leaderboard', label: '🏆 Top' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── INVITE TAB ── */}
        {activeTab === 'invite' && (
          <>
            {/* Hero */}
            <View style={styles.hero}>
              <Text style={styles.heroEmoji}>🎉</Text>
              <Text style={styles.heroTitle}>
                {data?.campaign
                  ? `Earn TZS ${Number(data.campaign.referrer_reward).toLocaleString()} per invite!`
                  : 'Invite Friends & Earn Rewards!'}
              </Text>
              <Text style={styles.heroSub}>
                Invite friends to VUMA. When they place their first order, you both get rewarded!
              </Text>
            </View>

            {/* How it works */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>How It Works</Text>
              {[
                { step: '1', icon: '📤', text: 'Share your unique referral link with friends' },
                { step: '2', icon: '👤', text: 'Your friend creates a VUMA account' },
                { step: '3', icon: '🛒', text: 'They place and pay for their first order' },
                { step: '4', icon: '💰', text: 'You both receive your reward automatically!' },
              ].map(item => (
                <View key={item.step} style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{item.step}</Text>
                  </View>
                  <Text style={styles.stepIcon}>{item.icon}</Text>
                  <Text style={styles.stepText}>{item.text}</Text>
                </View>
              ))}
            </View>

            {/* Referral Code */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Your Referral Code</Text>
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>{data?.code || '...'}</Text>
                <TouchableOpacity
                  style={styles.copyCodeBtn}
                  onPress={() => {
                    Clipboard.setString(data?.code || '');
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  <Text style={styles.copyCodeBtnText}>{copied ? '✓ Copied!' : 'Copy'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.codeLink} numberOfLines={1}>{data?.link}</Text>
            </View>

            {/* Share Buttons */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Share With Friends</Text>
              <View style={styles.shareGrid}>
                {SHARE_CHANNELS.map(channel => (
                  <TouchableOpacity
                    key={channel.id}
                    style={[styles.shareBtn, { backgroundColor: channel.color + '15', borderColor: channel.color + '40' }]}
                    onPress={() => handleShare(channel)}
                  >
                    <Text style={styles.shareBtnIcon}>{channel.icon}</Text>
                    <Text style={[styles.shareBtnLabel, { color: channel.color }]}>{channel.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Campaign milestones */}
            {data?.campaign?.milestones?.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>🎯 Milestone Rewards</Text>
                {data.campaign.milestones.map((m, i) => (
                  <MilestoneBar key={i} milestone={m} current={data.successful_referrals || 0} />
                ))}
              </View>
            )}
          </>
        )}

        {/* ── DASHBOARD TAB ── */}
        {activeTab === 'dashboard' && (
          <>
            {/* Stats */}
            <View style={styles.statsGrid}>
              <StatCard icon="📤" value={data?.total_invites || 0} label="Total Invites" color={COLORS.info} />
              <StatCard icon="✅" value={data?.successful_referrals || 0} label="Successful" color={COLORS.success} />
              <StatCard icon="⏳" value={data?.pending_rewards_count || 0} label="Pending Rewards" color={COLORS.warning} />
              <StatCard icon="💰" value={`TZS ${Number(data?.total_earned || 0).toLocaleString()}`} label="Total Earned" color={COLORS.primary} />
            </View>

            {/* Pending rewards */}
            {(data?.pending_reward_amount || 0) > 0 && (
              <View style={[styles.card, styles.pendingCard]}>
                <Text style={styles.pendingTitle}>⏳ Pending Rewards</Text>
                <Text style={styles.pendingAmount}>TZS {Number(data.pending_reward_amount).toLocaleString()}</Text>
                <Text style={styles.pendingSub}>Released after friend's order is confirmed</Text>
              </View>
            )}

            {/* Recent referrals */}
            {data?.recent_referrals?.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Recent Invites</Text>
                {data.recent_referrals.map((ref, i) => (
                  <View key={i} style={styles.refRow}>
                    <View style={styles.refAvatar}>
                      <Text style={styles.refAvatarText}>
                        {(ref.referee__username || ref.referee__email || '?')[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.refInfo}>
                      <Text style={styles.refName}>{ref.referee__username || ref.referee__email}</Text>
                      <Text style={styles.refDate}>{new Date(ref.clicked_at).toLocaleDateString()}</Text>
                    </View>
                    <View style={[styles.refStatus,
                      ref.status === 'rewarded' ? styles.refStatusGreen
                      : ref.status === 'completed' ? styles.refStatusBlue
                      : styles.refStatusGrey
                    ]}>
                      <Text style={styles.refStatusText}>
                        {ref.status === 'rewarded' ? '✅ Paid'
                        : ref.status === 'completed' ? '🔄 Processing'
                        : ref.status === 'registered' ? '👤 Joined'
                        : '🔗 Clicked'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Reward history */}
            {data?.reward_history?.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Reward History</Text>
                {data.reward_history.map((r, i) => (
                  <View key={i} style={styles.rewardRow}>
                    <View>
                      <Text style={styles.rewardDesc}>{r.description}</Text>
                      <Text style={styles.rewardDate}>{r.date}</Text>
                      {r.voucher_code ? <Text style={styles.voucherCode}>Code: {r.voucher_code}</Text> : null}
                    </View>
                    <View style={styles.rewardRight}>
                      <Text style={[styles.rewardAmount, { color: r.status === 'paid' ? COLORS.success : COLORS.warning }]}>
                        {r.amount > 0 ? `TZS ${Number(r.amount).toLocaleString()}` : r.reward_type}
                      </Text>
                      <Text style={styles.rewardStatus}>{r.status}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* ── LEADERBOARD TAB ── */}
        {activeTab === 'leaderboard' && (
          <LeaderboardTab navigation={navigation} />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const LeaderboardTab = memo(({ navigation }) => {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get('/referrals/leaderboard/')
      .then(data => setLeaders(data.leaderboard || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />;

  return (
    <View>
      <View style={styles.leaderboardHero}>
        <Text style={styles.leaderboardTitle}>🏆 Weekly Top Referrers</Text>
        <Text style={styles.leaderboardSub}>Top referrers win exclusive prizes every week!</Text>
      </View>
      {leaders.length === 0 ? (
        <View style={styles.emptyLeader}>
          <Text style={styles.emptyLeaderText}>Be the first on the leaderboard! 🚀</Text>
        </View>
      ) : (
        leaders.map((leader, i) => (
          <View key={i} style={[styles.leaderRow, i < 3 && styles.leaderRowTop]}>
            <Text style={styles.leaderBadge}>{leader.badge}</Text>
            <View style={styles.leaderInfo}>
              <Text style={styles.leaderName}>{leader.name}</Text>
              <Text style={styles.leaderStats}>{leader.referrals} referrals · TZS {Number(leader.earned).toLocaleString()}</Text>
            </View>
            <Text style={styles.leaderRank}>#{leader.rank}</Text>
          </View>
        ))
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F3F5' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.primary, paddingHorizontal: SPACING.base, paddingTop: Platform.OS === 'ios' ? 50 : SPACING.base, paddingBottom: SPACING.base },
  backBtn: { padding: 4 },
  backIcon: { fontSize: FONTS.xl, color: 'white', fontWeight: FONTS.bold },
  headerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: 'white' },
  tabs: { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  tab: { flex: 1, paddingVertical: SPACING.sm + 2, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: COLORS.primary },
  tabText: { fontSize: FONTS.sm, color: COLORS.textMuted, fontWeight: FONTS.medium },
  tabTextActive: { color: COLORS.primary, fontWeight: FONTS.bold },
  scroll: { padding: SPACING.base },
  hero: { backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, padding: SPACING.xl, alignItems: 'center', marginBottom: SPACING.sm },
  heroEmoji: { fontSize: 48, marginBottom: SPACING.sm },
  heroTitle: { fontSize: FONTS.xl, fontWeight: FONTS.black, color: 'white', textAlign: 'center', marginBottom: SPACING.xs },
  heroSub: { fontSize: FONTS.sm, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 20 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.base, marginBottom: SPACING.sm, ...SHADOWS.sm },
  cardTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.base },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  stepNumber: { width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { color: 'white', fontSize: FONTS.xs, fontWeight: FONTS.black },
  stepIcon: { fontSize: 20 },
  stepText: { flex: 1, fontSize: FONTS.sm, color: COLORS.textSecondary, lineHeight: 18 },
  codeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryFade, borderRadius: RADIUS.lg, padding: SPACING.base, borderWidth: 2, borderColor: COLORS.primary, borderStyle: 'dashed', marginBottom: SPACING.sm },
  codeText: { flex: 1, fontSize: 26, fontWeight: FONTS.black, color: COLORS.primary, letterSpacing: 3, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  copyCodeBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.base, paddingVertical: SPACING.xs + 2 },
  copyCodeBtnText: { color: 'white', fontSize: FONTS.sm, fontWeight: FONTS.bold },
  codeLink: { fontSize: FONTS.xs, color: COLORS.textMuted, textAlign: 'center' },
  shareGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  shareBtn: { width: '30%', flexGrow: 1, borderRadius: RADIUS.xl, padding: SPACING.sm, alignItems: 'center', borderWidth: 1, gap: 4 },
  shareBtnIcon: { fontSize: 24 },
  shareBtnLabel: { fontSize: FONTS.xs, fontWeight: FONTS.semiBold },
  milestone: { marginBottom: SPACING.sm },
  milestoneHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  milestoneTitle: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  milestoneReward: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.bold },
  progressBar: { height: 8, backgroundColor: COLORS.surfaceAlt, borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
  progressText: { fontSize: FONTS.xs, color: COLORS.textMuted },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.sm },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.base, alignItems: 'center', borderTopWidth: 3, ...SHADOWS.sm },
  statIcon: { fontSize: 24, marginBottom: 4 },
  statValue: { fontSize: FONTS.xl, fontWeight: FONTS.black },
  statLabel: { fontSize: FONTS.xs, color: COLORS.textMuted, textAlign: 'center' },
  pendingCard: { backgroundColor: '#FFF8E7', borderWidth: 1, borderColor: COLORS.warning + '60', alignItems: 'center' },
  pendingTitle: { fontSize: FONTS.sm, color: COLORS.warning, fontWeight: FONTS.bold },
  pendingAmount: { fontSize: 28, fontWeight: FONTS.black, color: COLORS.warning, marginVertical: SPACING.xs },
  pendingSub: { fontSize: FONTS.xs, color: COLORS.textMuted },
  refRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, gap: SPACING.sm },
  refAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primaryFade, alignItems: 'center', justifyContent: 'center' },
  refAvatarText: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.primary },
  refInfo: { flex: 1 },
  refName: { fontSize: FONTS.sm, fontWeight: FONTS.medium, color: COLORS.textPrimary },
  refDate: { fontSize: FONTS.xs, color: COLORS.textMuted },
  refStatus: { borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 3 },
  refStatusGreen: { backgroundColor: '#E8F5E9' },
  refStatusBlue: { backgroundColor: '#E3F2FD' },
  refStatusGrey: { backgroundColor: COLORS.surfaceAlt },
  refStatusText: { fontSize: FONTS.xs, fontWeight: FONTS.semiBold },
  rewardRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  rewardDesc: { fontSize: FONTS.sm, color: COLORS.textPrimary, fontWeight: FONTS.medium },
  rewardDate: { fontSize: FONTS.xs, color: COLORS.textMuted },
  voucherCode: { fontSize: FONTS.xs, color: COLORS.primary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginTop: 2 },
  rewardRight: { alignItems: 'flex-end' },
  rewardAmount: { fontSize: FONTS.sm, fontWeight: FONTS.bold },
  rewardStatus: { fontSize: FONTS.xs, color: COLORS.textMuted, textTransform: 'capitalize' },
  leaderboardHero: { backgroundColor: '#FFF8E7', borderRadius: RADIUS.xl, padding: SPACING.base, alignItems: 'center', marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.warning + '40' },
  leaderboardTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  leaderboardSub: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 4 },
  leaderRow: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.base, marginBottom: SPACING.sm, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, ...SHADOWS.sm },
  leaderRowTop: { borderWidth: 1.5, borderColor: COLORS.warning + '60' },
  leaderBadge: { fontSize: 28 },
  leaderInfo: { flex: 1 },
  leaderName: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  leaderStats: { fontSize: FONTS.xs, color: COLORS.textMuted },
  leaderRank: { fontSize: FONTS.lg, fontWeight: FONTS.black, color: COLORS.textMuted },
  emptyLeader: { alignItems: 'center', padding: SPACING.xl },
  emptyLeaderText: { fontSize: FONTS.base, color: COLORS.textMuted },
});