/**
 * VUMA Store - "Hidden people" box for Settings.
 *
 * Shows the people this customer chose to hide (from the Report window) with an
 * "Unhide" button for each. Shows nothing at all when nobody is hidden, so
 * most customers never see it.
 */
import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/constants';
import { useBlocked, unblockUser, reportErrorText } from '../utils/safety';

export default function HiddenPeople({ isAuthenticated }) {
  const { people } = useBlocked(isAuthenticated);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const working = useRef(false);

  if (!isAuthenticated || !people.length) return null;

  const show = async (id) => {
    if (working.current) return;
    working.current = true;
    setBusy(id);
    setError('');
    try {
      await unblockUser(id);
    } catch (e) {
      setError(reportErrorText(e, 'Could not unhide. Please try again.'));
    } finally {
      working.current = false;
      setBusy(null);
    }
  };

  return (
    <View>
      <Text style={styles.groupLabel}>HIDDEN PEOPLE</Text>
      <View style={styles.card}>
        {people.map((p) => (
          <View key={p.id} style={styles.row} testID={'hidden-' + p.id}>
            <Text style={styles.name} numberOfLines={1}>{p.name || 'Customer'}</Text>
            <TouchableOpacity onPress={() => show(p.id)} disabled={!!busy} accessibilityRole="button" testID={'unhide-' + p.id}>
              {busy === p.id
                ? <ActivityIndicator size="small" color={COLORS.primary} />
                : <Text style={styles.unhide}>Unhide</Text>}
            </TouchableOpacity>
          </View>
        ))}
        {!!error && <Text style={styles.error} testID="hidden-error">{error}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  groupLabel: {
    fontSize: 11, fontWeight: FONTS.bold, color: COLORS.textMuted,
    paddingHorizontal: SPACING.base, paddingTop: SPACING.lg, paddingBottom: SPACING.sm,
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: COLORS.surface, marginHorizontal: SPACING.base, marginBottom: SPACING.sm,
    borderRadius: RADIUS.xl, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.xs,
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  name: { flex: 1, fontSize: FONTS.base, color: COLORS.textPrimary, fontWeight: FONTS.medium, marginRight: SPACING.sm },
  unhide: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.semiBold },
  error: { color: COLORS.danger, fontSize: FONTS.sm, padding: SPACING.base },
});
