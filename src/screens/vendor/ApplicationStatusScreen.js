/**
 * VUMA Store — Seller Application Status
 *
 * Shown right after a seller submits their application (instead of
 * dumping them back at Login), and reachable again any time they
 * re-open "Become a Seller" while an application is still pending -
 * so they can never submit a duplicate application.
 *
 * Polls the real GET /vendors/applications/my-application/ endpoint
 * every 20s while pending, and re-checks whenever this screen regains
 * focus, so approval is reflected automatically without the seller
 * needing to manually refresh anything.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  Platform, ScrollView, Linking, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../utils/constants';
import { get } from '../../api/client';
import { formatDate } from '../../utils/helpers';

const STEP_LABELS = ['Submitted', 'Under Review', 'Approved'];

function StepIndex(status) {
  if (status === 'approved') return 2;
  if (status === 'rejected') return 1; // reached review, but did not proceed to approved
  return 1; // pending -> "Under Review" is the current step
}

export default function ApplicationStatusScreen({ navigation }) {
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef(null);

  const loadStatus = useCallback(async () => {
    try {
      const data = await get('/vendors/applications/my-application/');
      setApplication(data);
    } catch (e) {
      // leave whatever we last had; a transient network error here
      // shouldn't blank out a screen the seller is anxiously checking
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh every time this screen comes into focus (e.g. returning
  // from the background after getting the approval notification).
  useFocusEffect(
    useCallback(() => {
      loadStatus();
    }, [loadStatus])
  );

  // Poll while pending, so approval reflects automatically even if the
  // seller just leaves this screen open. Stops once resolved.
  useEffect(() => {
    if (application?.status === 'pending') {
      pollRef.current = setInterval(loadStatus, 20000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [application?.status, loadStatus]);

  const handleOpenSellerCenter = () => {
    Linking.openURL('https://vumastore.store/seller/').catch(() => {
      Alert.alert('Could not open Seller Center', 'Please try again or visit vumastore.store/seller in your browser.');
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.centerFill}>
          <Text style={styles.loadingText}>Loading your application status...</Text>
        </View>
      </View>
    );
  }

  if (!application || application.status === 'not_applied') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.centerFill}>
          <Text style={styles.loadingText}>No application found.</Text>
          <TouchableOpacity style={styles.continueBtn} onPress={() => navigation.navigate('Tabs')}>
            <Text style={styles.continueBtnText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const status = application.status;
  const currentStep = StepIndex(status);
  const isApproved = status === 'approved';
  const isRejected = status === 'rejected';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.headerIconWrap}>
          <Text style={styles.headerIcon}>{isApproved ? '🎉' : isRejected ? '⚠️' : '✅'}</Text>
        </View>
        <Text style={styles.headerTitle}>
          {isApproved ? 'Application Approved!' : isRejected ? 'Application Needs Attention' : 'Application Submitted Successfully'}
        </Text>

        <View style={[
          styles.statusPill,
          isApproved && styles.statusPillApproved,
          isRejected && styles.statusPillRejected,
        ]}>
          <Text style={[
            styles.statusPillText,
            isApproved && styles.statusPillTextApproved,
            isRejected && styles.statusPillTextRejected,
          ]}>
            {isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Under Review'}
          </Text>
        </View>

        {/* Progress */}
        {!isRejected && (
          <View style={styles.progressWrap}>
            {STEP_LABELS.map((label, i) => {
              const isDone = i < currentStep || (i === currentStep && isApproved);
              const isActive = i === currentStep && !isApproved;
              return (
                <React.Fragment key={label}>
                  <View style={styles.progressStep}>
                    <View style={[
                      styles.progressDot,
                      isActive && styles.progressDotActive,
                      isDone && styles.progressDotDone,
                    ]}>
                      <Text style={[styles.progressDotText, (isActive || isDone) && styles.progressDotTextActive]}>
                        {isDone ? '✓' : i + 1}
                      </Text>
                    </View>
                    <Text style={[styles.progressLabel, (isActive || isDone) && styles.progressLabelActive]}>{label}</Text>
                  </View>
                  {i < STEP_LABELS.length - 1 && (
                    <View style={[styles.progressLine, isDone && styles.progressLineDone]} />
                  )}
                </React.Fragment>
              );
            })}
          </View>
        )}

        {/* Details card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Application Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Shop Name</Text>
            <Text style={styles.detailValue}>{application.shop_name || '—'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Business Type</Text>
            <Text style={styles.detailValue}>{application.business_type || '—'}</Text>
          </View>
          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.detailLabel}>Submitted</Text>
            <Text style={styles.detailValue}>{application.created_at ? formatDate(application.created_at) : '—'}</Text>
          </View>
        </View>

        {isRejected && application.rejection_reason && (
          <View style={styles.rejectionCard}>
            <Text style={styles.rejectionTitle}>Reason</Text>
            <Text style={styles.rejectionText}>{application.rejection_reason}</Text>
          </View>
        )}

        {!isRejected && !isApproved && (
          <Text style={styles.pendingNote}>
            We're reviewing your application. You'll be notified as soon as it's approved - this page updates automatically.
          </Text>
        )}

        {isApproved && (
          <TouchableOpacity style={styles.sellerCenterBtn} onPress={handleOpenSellerCenter} activeOpacity={0.85}>
            <Text style={styles.sellerCenterBtnText}>Open Seller Center</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.continueBtn} onPress={() => navigation.navigate('Tabs')} activeOpacity={0.85}>
          <Text style={styles.continueBtnText}>Continue Shopping</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  loadingText: { fontSize: FONTS.sm, color: COLORS.textMuted, marginBottom: SPACING.base },
  scroll: { padding: SPACING.xl, paddingTop: Platform.OS === 'ios' ? 70 : SPACING.xl, alignItems: 'center' },

  headerIconWrap: { width: 72, height: 72, borderRadius: RADIUS.full, backgroundColor: COLORS.primaryFade, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.base },
  headerIcon: { fontSize: 34 },
  headerTitle: { fontSize: FONTS.xl, fontWeight: FONTS.black, color: COLORS.textPrimary, textAlign: 'center', marginBottom: SPACING.sm },

  statusPill: { backgroundColor: COLORS.warningLight, borderRadius: RADIUS.full, paddingHorizontal: SPACING.base, paddingVertical: SPACING.xs, marginBottom: SPACING.xl },
  statusPillApproved: { backgroundColor: COLORS.successLight },
  statusPillRejected: { backgroundColor: COLORS.dangerLight || '#FEE2E2' },
  statusPillText: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.warningText || '#92400E' },
  statusPillTextApproved: { color: COLORS.successText },
  statusPillTextRejected: { color: COLORS.danger },

  progressWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: SPACING.xl, paddingHorizontal: SPACING.sm },
  progressStep: { alignItems: 'center', gap: 4 },
  progressDot: { width: 30, height: 30, borderRadius: RADIUS.full, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface },
  progressDotActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  progressDotDone: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  progressDotText: { fontSize: FONTS.xs, color: COLORS.textMuted, fontWeight: FONTS.bold },
  progressDotTextActive: { color: 'white' },
  progressLabel: { fontSize: 10, color: COLORS.textMuted, textAlign: 'center', maxWidth: 70 },
  progressLabelActive: { color: COLORS.textPrimary, fontWeight: FONTS.bold },
  progressLine: { flex: 1, height: 2, backgroundColor: COLORS.border, marginHorizontal: 4, marginBottom: 16 },
  progressLineDone: { backgroundColor: COLORS.success },

  card: { width: '100%', backgroundColor: COLORS.surfaceSunken, borderRadius: RADIUS.xl, padding: SPACING.base, marginBottom: SPACING.base },
  cardTitle: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  detailLabel: { fontSize: FONTS.sm, color: COLORS.textMuted },
  detailValue: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary },

  rejectionCard: { width: '100%', backgroundColor: '#FEF2F2', borderRadius: RADIUS.xl, padding: SPACING.base, marginBottom: SPACING.base, borderWidth: 1, borderColor: '#FECACA' },
  rejectionTitle: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.danger, marginBottom: 4 },
  rejectionText: { fontSize: FONTS.sm, color: COLORS.textSecondary, lineHeight: 20 },

  pendingNote: { fontSize: FONTS.xs, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18, marginBottom: SPACING.xl, paddingHorizontal: SPACING.base },

  sellerCenterBtn: { width: '100%', backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, paddingVertical: SPACING.base, alignItems: 'center', marginBottom: SPACING.sm, ...SHADOWS.primary },
  sellerCenterBtnText: { color: 'white', fontSize: FONTS.base, fontWeight: FONTS.bold },
  continueBtn: { width: '100%', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.xl, paddingVertical: SPACING.base, alignItems: 'center' },
  continueBtnText: { color: COLORS.textSecondary, fontSize: FONTS.base, fontWeight: FONTS.semiBold },
});