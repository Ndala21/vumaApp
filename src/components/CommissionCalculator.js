/**
 * VUMA Commission Calculator
 * MVP: Shows Sale Price, VUMA Fee, Net Payout only
 * VAT hidden for MVP — modular, easy to re-enable
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/constants';
import { get } from '../api/client';

// Set to true when VUMA becomes VAT-registered
const SHOW_VAT = false;

// ── Commission Badge (for product listing forms) ──────
export const CommissionBadge = memo(({ categorySlug, price, quantity = 1, style }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const calculate = useCallback(async () => {
    if (!categorySlug || !price || Number(price) <= 0) { setData(null); return; }
    setLoading(true);
    try {
      const result = await get('/payments/commission/calculate/', { category: categorySlug, amount: price, quantity });
      setData(result);
    } catch { setData(null); }
    finally { setLoading(false); }
  }, [categorySlug, price, quantity]);

  useEffect(() => { calculate(); }, [calculate]);

  if (!price || Number(price) <= 0) return null;
  if (loading) return (
    <View style={[styles.badge, style]}>
      <ActivityIndicator size="small" color={COLORS.primary} />
      <Text style={styles.badgeLoading}>Calculating fee...</Text>
    </View>
  );
  if (!data) return null;

  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.badgeTitle}>💰 Your Earnings</Text>

      <View style={styles.badgeRow}>
        <Text style={styles.badgeLabel}>Sale Price</Text>
        <Text style={styles.badgeValue}>TZS {Number(data.gross_sale).toLocaleString()}</Text>
      </View>

      <View style={styles.badgeRow}>
        <Text style={styles.badgeLabel}>VUMA Fee ({data.commission_rate}%)</Text>
        <Text style={[styles.badgeValue, { color: COLORS.danger }]}>
          - TZS {Number(data.commission_amount).toLocaleString()}
        </Text>
      </View>

      {/* VAT row — hidden for MVP */}
      {SHOW_VAT && data.vat_on_commission > 0 && (
        <View style={styles.badgeRow}>
          <Text style={styles.badgeLabel}>VAT on Fee (18%)</Text>
          <Text style={[styles.badgeValue, { color: COLORS.danger }]}>
            - TZS {Number(data.vat_on_commission).toLocaleString()}
          </Text>
        </View>
      )}

      <View style={styles.badgeDivider} />

      <View style={styles.badgeRow}>
        <Text style={styles.badgeNetLabel}>You Receive</Text>
        <Text style={styles.badgeNetValue}>TZS {Number(data.net_payout).toLocaleString()}</Text>
      </View>

      {data.note ? <Text style={styles.badgeNote}>{data.note}</Text> : null}
    </View>
  );
});

// ── Full Commission Breakdown Card ─────────────────────
export const CommissionBreakdown = memo(({ categorySlug, price, quantity = 1, style }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const calculate = useCallback(async () => {
    if (!categorySlug || !price || Number(price) <= 0) return;
    setLoading(true);
    try {
      const result = await get('/payments/commission/calculate/', { category: categorySlug, amount: price, quantity });
      setData(result);
    } catch {}
    finally { setLoading(false); }
  }, [categorySlug, price, quantity]);

  useEffect(() => { calculate(); }, [calculate]);

  if (!data && !loading) return null;

  return (
    <View style={[styles.card, style]}>
      <TouchableOpacity style={styles.cardHeader} onPress={() => setExpanded(v => !v)}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.cardIcon}>💳</Text>
          <View>
            <Text style={styles.cardTitle}>Fee Breakdown</Text>
            {data && !loading && (
              <Text style={styles.cardSubtitle}>
                You receive:{' '}
                <Text style={styles.cardNetHighlight}>
                  TZS {Number(data.net_payout).toLocaleString()}
                </Text>
              </Text>
            )}
          </View>
        </View>
        {loading
          ? <ActivityIndicator size="small" color={COLORS.primary} />
          : <Text style={styles.cardArrow}>{expanded ? '▲' : '▼'}</Text>
        }
      </TouchableOpacity>

      {data && expanded && (
        <View style={styles.cardBody}>
          {/* Sale Price */}
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Sale Price</Text>
            <Text style={styles.breakdownValue}>
              TZS {Number(data.gross_sale).toLocaleString()}
            </Text>
          </View>

          {/* VUMA Fee */}
          <View style={[styles.breakdownRow, styles.breakdownFeeRow]}>
            <View>
              <Text style={styles.breakdownLabel}>VUMA Marketplace Fee</Text>
              <Text style={styles.breakdownRate}>{data.commission_rate}% of sale price</Text>
            </View>
            <Text style={[styles.breakdownValue, { color: COLORS.danger }]}>
              - TZS {Number(data.commission_amount).toLocaleString()}
            </Text>
          </View>

          {/* VAT — hidden for MVP, shown when SHOW_VAT = true */}
          {SHOW_VAT && data.vat_on_commission > 0 && (
            <View style={[styles.breakdownRow, styles.breakdownFeeRow]}>
              <View>
                <Text style={styles.breakdownLabel}>VAT on Commission</Text>
                <Text style={styles.breakdownRate}>18% on commission only</Text>
              </View>
              <Text style={[styles.breakdownValue, { color: COLORS.danger }]}>
                - TZS {Number(data.vat_on_commission).toLocaleString()}
              </Text>
            </View>
          )}

          <View style={styles.breakdownDivider} />

          {/* Net Payout */}
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownNetLabel}>💰 You Receive</Text>
            <Text style={styles.breakdownNetValue}>
              TZS {Number(data.net_payout).toLocaleString()}
            </Text>
          </View>

          {data.note ? <Text style={styles.breakdownNote}>{data.note}</Text> : null}
        </View>
      )}
    </View>
  );
});

// ── Vendor Earnings Card ───────────────────────────────
export const VendorEarningsCard = memo(({ style }) => {
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    get('/payments/commission/statement/')
      .then(data => setStatement(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <View style={[styles.earningsCard, style]}>
      <ActivityIndicator color={COLORS.primary} />
    </View>
  );
  if (!statement) return null;

  const s = statement.summary;

  return (
    <View style={[styles.earningsCard, style]}>
      <Text style={styles.earningsTitle}>📊 Earnings Summary</Text>

      <View style={styles.earningsGrid}>
        <View style={styles.earningsStat}>
          <Text style={styles.earningsStatValue}>{s.total_transactions}</Text>
          <Text style={styles.earningsStatLabel}>Total Orders</Text>
        </View>
        <View style={styles.earningsStat}>
          <Text style={styles.earningsStatValue}>{s.total_sales}</Text>
          <Text style={styles.earningsStatLabel}>Gross Revenue</Text>
        </View>
        <View style={styles.earningsStat}>
          <Text style={[styles.earningsStatValue, { color: COLORS.danger }]}>
            {s.total_commission_paid}
          </Text>
          <Text style={styles.earningsStatLabel}>VUMA Fees</Text>
        </View>
        <View style={[styles.earningsStat, styles.earningsStatHighlight]}>
          <Text style={[styles.earningsStatValue, { color: 'white' }]}>
            {s.total_net_earnings}
          </Text>
          <Text style={[styles.earningsStatLabel, { color: 'rgba(255,255,255,0.8)' }]}>
            Net Earnings
          </Text>
        </View>
      </View>

      {/* Recent Transactions */}
      {statement.transactions?.length > 0 && (
        <View style={styles.txList}>
          <Text style={styles.txListTitle}>Recent Sales</Text>
          {statement.transactions.slice(0, 5).map((tx, i) => (
            <View key={i} style={styles.txRow}>
              <View style={styles.txInfo}>
                <Text style={styles.txProduct} numberOfLines={1}>{tx.product}</Text>
                <Text style={styles.txDate}>{tx.date} · {tx.commission_rate} fee</Text>
              </View>
              <View style={styles.txAmounts}>
                <Text style={styles.txNet}>{tx.net_payout}</Text>
                <Text style={styles.txGross}>{tx.gross_sale} gross</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Re-enable VAT info when needed */}
      {SHOW_VAT && (
        <Text style={styles.vatNote}>
          * 18% VAT applied on VUMA fees only, not on your sale price.
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  // Badge
  badge: { backgroundColor: COLORS.primaryFade, borderRadius: RADIUS.lg, padding: SPACING.base, borderWidth: 1, borderColor: COLORS.primary + '40' },
  badgeTitle: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.primary, marginBottom: SPACING.sm },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  badgeLabel: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  badgeValue: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textPrimary },
  badgeDivider: { height: 1, backgroundColor: COLORS.primary + '30', marginVertical: SPACING.sm },
  badgeNetLabel: { fontSize: FONTS.base, fontWeight: FONTS.black, color: COLORS.textPrimary },
  badgeNetValue: { fontSize: FONTS.base, fontWeight: FONTS.black, color: COLORS.success },
  badgeNote: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: SPACING.xs },
  badgeLoading: { fontSize: FONTS.xs, color: COLORS.textMuted, marginLeft: SPACING.sm },
  // Card
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', ...SHADOWS.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.base },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  cardIcon: { fontSize: 24 },
  cardTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  cardSubtitle: { fontSize: FONTS.sm, color: COLORS.textMuted, marginTop: 2 },
  cardNetHighlight: { color: COLORS.success, fontWeight: FONTS.bold },
  cardArrow: { fontSize: FONTS.sm, color: COLORS.textMuted },
  cardBody: { padding: SPACING.base, paddingTop: 0, borderTopWidth: 1, borderTopColor: COLORS.divider },
  // Breakdown
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.sm },
  breakdownFeeRow: { backgroundColor: '#FFF3F3', borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, marginHorizontal: -SPACING.sm },
  breakdownLabel: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  breakdownRate: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  breakdownValue: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textPrimary },
  breakdownDivider: { height: 1.5, backgroundColor: COLORS.divider, marginVertical: SPACING.sm },
  breakdownNetLabel: { fontSize: FONTS.base, fontWeight: FONTS.black, color: COLORS.textPrimary },
  breakdownNetValue: { fontSize: FONTS.lg, fontWeight: FONTS.black, color: COLORS.success },
  breakdownNote: { fontSize: FONTS.xs, color: COLORS.primary, marginTop: SPACING.sm, textAlign: 'center' },
  // Earnings Card
  earningsCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.base, ...SHADOWS.md },
  earningsTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.base },
  earningsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.base },
  earningsStat: { flex: 1, minWidth: '45%', backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg, padding: SPACING.sm, alignItems: 'center' },
  earningsStatHighlight: { backgroundColor: COLORS.primary },
  earningsStatValue: { fontSize: FONTS.base, fontWeight: FONTS.black, color: COLORS.textPrimary, textAlign: 'center' },
  earningsStatLabel: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2, textAlign: 'center' },
  txList: { borderTopWidth: 1, borderTopColor: COLORS.divider, paddingTop: SPACING.base },
  txListTitle: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  txInfo: { flex: 1 },
  txProduct: { fontSize: FONTS.sm, fontWeight: FONTS.medium, color: COLORS.textPrimary },
  txDate: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  txAmounts: { alignItems: 'flex-end' },
  txNet: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.success },
  txGross: { fontSize: FONTS.xs, color: COLORS.textMuted },
  vatNote: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: SPACING.sm, textAlign: 'center' },
});