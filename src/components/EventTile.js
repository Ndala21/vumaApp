/**
 * VUMA Store - the little calendar page shown on an event banner:
 * the month on a coloured strip and the day number below it.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, RADIUS } from '../utils/constants';

export default function EventTile({ info, large, style }) {
  if (!info || !info.hasDate) return null;
  return (
    <View
      style={[styles.tile, large && styles.tileLarge, style]}
      accessible
      accessibilityLabel={info.line}
    >
      <View style={[styles.strip, large && styles.stripLarge]}>
        <Text style={[styles.month, large && styles.monthLarge]} numberOfLines={1}>{info.month.toUpperCase()}</Text>
      </View>
      <View style={styles.body}>
        <Text style={[styles.day, large && styles.dayLarge]} numberOfLines={1}>{info.day}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 44, height: 50, borderRadius: RADIUS.sm, overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  tileLarge: { width: 48, height: 54 },
  strip: { height: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary },
  stripLarge: { height: 17 },
  month: { fontSize: 9.5, fontWeight: FONTS.bold, color: '#FFFFFF', letterSpacing: 0.6 },
  monthLarge: { fontSize: 10 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  day: { fontSize: 21, fontWeight: FONTS.black, color: COLORS.textPrimary },
  dayLarge: { fontSize: 24 },
});
