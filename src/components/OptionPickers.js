/**
 * VUMA Store — Colour and Material pickers (seller Add / Edit Product)
 *
 * The seller taps a colour dot or a material instead of typing. "Other" opens a
 * text box for anything that is not in the list. The saved value is the plain
 * English name (for example "Navy Blue"), exactly like typed text before, so
 * nothing else in the app or on the server has to change.
 * The form gives each picker a new `key` after "+ Add Option", which resets it.
 */
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/constants';
import {
  COLOR_OPTIONS, MATERIAL_OPTIONS, MATERIAL_FIRST_COUNT,
  findColor, findMaterial, isLightHex, colorLabel, materialLabel,
} from '../utils/productOptions';

const DOT = 36;
const MULTI_PARTS = ['#DC2626', '#FACC15', '#16A34A', '#2563EB'];

function ColorDot({ hex, size }) {
  if (!hex) {
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', flexDirection: 'row', flexWrap: 'wrap' }}>
        {MULTI_PARTS.map((c) => <View key={c} style={{ width: size / 2, height: size / 2, backgroundColor: c }} />)}
      </View>
    );
  }
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: hex }} />;
}

export function ColorPicker({ value, onChange }) {
  const known = findColor(value);
  const typedOther = !!value && !known;
  const [otherOpen, setOtherOpen] = useState(false);
  const showOther = otherOpen || typedOther;

  return (
    <View style={styles.block}>
      <View style={styles.dots}>
        {COLOR_OPTIONS.map((c) => {
          const on = !!known && known.name === c.name;
          return (
            <TouchableOpacity
              key={c.name}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={c.sw && c.sw !== c.name ? `${c.name}, ${c.sw}` : c.name}
              accessibilityState={{ selected: on }}
              onPress={() => { setOtherOpen(false); onChange(on ? '' : c.name); }}
              style={[styles.dotWrap, on && styles.dotWrapOn]}
            >
              <View style={[styles.dotBorder, !on && styles.dotBorderOff]}>
                <ColorDot hex={c.hex} size={DOT} />
                {on && (
                  <View style={styles.tickLayer} pointerEvents="none">
                    <Text style={[styles.tick, { color: isLightHex(c.hex) ? '#111111' : '#FFFFFF' }]}>{'✓'}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityState={{ selected: showOther }}
          onPress={() => { if (showOther) { setOtherOpen(false); onChange(''); } else { setOtherOpen(true); onChange(''); } }}
          style={[styles.otherChip, showOther && styles.otherChipOn]}
        >
          <Text style={[styles.otherChipText, showOther && styles.otherChipTextOn]}>+ Other</Text>
        </TouchableOpacity>
      </View>

      <Text style={value ? styles.picked : styles.pickHint}>
        {value ? `${colorLabel(value)}` : 'Tap a color / Gusa rangi'}
      </Text>

      {showOther && (
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholder="Type the color, e.g. Peach / Andika rangi"
          placeholderTextColor={COLORS.textLight}
          autoCapitalize="words"
        />
      )}
    </View>
  );
}

export function MaterialPicker({ value, onChange }) {
  const known = findMaterial(value);
  const typedOther = !!value && !known;
  const [otherOpen, setOtherOpen] = useState(false);
  const [more, setMore] = useState(false);
  const showOther = otherOpen || typedOther;
  // A material that sits in the hidden part must stay visible once it is chosen.
  const knownIndex = known ? MATERIAL_OPTIONS.findIndex((m) => m.name === known.name) : -1;
  const expanded = more || knownIndex >= MATERIAL_FIRST_COUNT;
  const list = expanded ? MATERIAL_OPTIONS : MATERIAL_OPTIONS.slice(0, MATERIAL_FIRST_COUNT);

  return (
    <View style={styles.block}>
      <View style={styles.chips}>
        {list.map((m) => {
          const on = !!known && known.name === m.name;
          return (
            <TouchableOpacity
              key={m.name}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => { setOtherOpen(false); onChange(on ? '' : m.name); }}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{m.name}</Text>
              {m.sw !== m.name && <Text style={[styles.chipSub, on && styles.chipSubOn]}>{m.sw}</Text>}
            </TouchableOpacity>
          );
        })}
        {!expanded && (
          <TouchableOpacity activeOpacity={0.8} onPress={() => setMore(true)} style={styles.chipGhost}>
            <Text style={styles.chipGhostText}>More / Zaidi</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityState={{ selected: showOther }}
          onPress={() => { if (showOther) { setOtherOpen(false); onChange(''); } else { setOtherOpen(true); onChange(''); } }}
          style={[styles.chipGhost, showOther && styles.chipOn]}
        >
          <Text style={[styles.chipGhostText, showOther && styles.chipTextOn]}>+ Other</Text>
        </TouchableOpacity>
      </View>

      <Text style={value ? styles.picked : styles.pickHint}>
        {value ? `${materialLabel(value)}` : 'Tap a material / Gusa nyenzo'}
      </Text>

      {showOther && (
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholder="Type the material / Andika nyenzo"
          placeholderTextColor={COLORS.textLight}
          autoCapitalize="words"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: SPACING.sm },
  dots: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  dotWrap: { padding: 3, borderRadius: 999, borderWidth: 2, borderColor: 'transparent' },
  dotWrapOn: { borderColor: COLORS.primary },
  dotBorder: { width: DOT, height: DOT, borderRadius: DOT / 2, overflow: 'hidden' },
  dotBorderOff: { borderWidth: 1, borderColor: COLORS.border },
  tickLayer: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  tick: { fontSize: 18, fontWeight: FONTS.bold, lineHeight: 20 },
  otherChip: {
    paddingHorizontal: SPACING.md, height: DOT + 6, borderRadius: RADIUS.full, borderWidth: 1.5,
    borderColor: COLORS.border, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  otherChipOn: { backgroundColor: COLORS.primaryFade, borderColor: COLORS.primary },
  otherChipText: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  otherChipTextOn: { color: COLORS.primaryDark, fontWeight: FONTS.bold },
  picked: { fontSize: FONTS.sm, color: COLORS.primaryDark, fontWeight: FONTS.semiBold, marginTop: 6 },
  pickHint: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 6 },
  input: {
    backgroundColor: COLORS.surfaceAlt, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.lg, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 2,
    fontSize: FONTS.base, color: COLORS.textPrimary, marginTop: SPACING.xs,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.md, borderWidth: 1.5,
    borderColor: COLORS.border, backgroundColor: COLORS.surfaceAlt, alignItems: 'center',
  },
  chipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  chipTextOn: { color: COLORS.textWhite, fontWeight: FONTS.bold },
  chipSub: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },
  chipSubOn: { color: COLORS.textWhite },
  chipGhost: {
    paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.md, borderWidth: 1.5,
    borderColor: COLORS.primary, backgroundColor: COLORS.primaryFade, justifyContent: 'center',
  },
  chipGhostText: { fontSize: FONTS.sm, color: COLORS.primaryDark, fontWeight: FONTS.bold },
});
