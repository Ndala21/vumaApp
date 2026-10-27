/**
 * VUMA Store - the delivery photo of one parcel: the picture the rider took where the parcel was left
 * (at the door, or at the pickup point). The customer and the seller of the parcel see it, like Coupang or CJ.
 *
 * The photo is a private address: the phone sends its sign-in with the request, nobody else can open it.
 * If it cannot be loaded (no internet, or VUMA switched the photo off) the box says so and offers "Try again".
 * The words come from the screen (so each screen keeps its own language rules).
 */

import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { storage } from '../utils/storage';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/constants';

export default function ParcelPhoto({
  uri, title, caption, tapHint, failedText, retryText, closeText, onRetry, testID = 'parcel-photo',
}) {
  const [token, setToken] = useState(null);      // null = not read yet, '' = nobody is signed in
  const [failed, setFailed] = useState(false);
  const [big, setBig] = useState(false);
  const [round, setRound] = useState(0);

  useEffect(() => {
    let alive = true;
    setToken(null);
    setFailed(false);
    (async () => {
      let value = '';
      try { value = (await storage.getAccessToken()) || ''; } catch (e) { value = ''; }
      if (alive) setToken(value);
    })();
    return () => { alive = false; };
  }, [uri, round]);

  const tryAgain = async () => {
    // asking the server for anything makes the phone renew an old sign-in first, then the photo is asked for again
    try { if (onRetry) await onRetry(); } catch (e) { /* the new try below tells the person */ }
    setRound((n) => n + 1);
  };

  if (!uri) return null;
  const source = token ? { uri, headers: { Authorization: `Bearer ${token}` } } : null;
  return (
    <View style={styles.box} testID={testID}>
      {!!title && <Text style={styles.title}>{`📷 ${title}`}</Text>}
      {failed || (token !== null && !source) ? (
        <View style={styles.failed} testID={`${testID}-failed`}>
          <Text style={styles.failedText}>{failedText}</Text>
          <TouchableOpacity testID={`${testID}-retry`} style={styles.retry} onPress={tryAgain}>
            <Text style={styles.retryText}>{retryText}</Text>
          </TouchableOpacity>
        </View>
      ) : source ? (
        <TouchableOpacity testID={`${testID}-open`} activeOpacity={0.9} onPress={() => setBig(true)}>
          <Image
            testID={`${testID}-image`}
            source={source}
            style={styles.image}
            resizeMode="contain"
            accessibilityLabel={title}
            onError={() => setFailed(true)}
          />
        </TouchableOpacity>
      ) : (
        <View style={styles.image} />
      )}
      {!!caption && <Text style={styles.caption} testID={`${testID}-caption`}>{caption}</Text>}
      {!!tapHint && !failed && !!source && <Text style={styles.tap}>{tapHint}</Text>}
      <Modal visible={big} transparent animationType="fade" onRequestClose={() => setBig(false)}>
        <View style={styles.modal} testID={`${testID}-big`}>
          {!!source && <Image source={source} style={styles.bigImage} resizeMode="contain" accessibilityLabel={title} />}
          <TouchableOpacity testID={`${testID}-close`} style={styles.close} onPress={() => setBig(false)}>
            <Text style={styles.closeText}>{closeText}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: SPACING.sm },
  title: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  image: { width: '100%', aspectRatio: 4 / 3, borderRadius: RADIUS.md, backgroundColor: COLORS.secondary },
  caption: { fontSize: FONTS.xs, color: COLORS.textSecondary, marginTop: 6, lineHeight: 17 },
  tap: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  failed: { padding: SPACING.base, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceSunken, alignItems: 'flex-start', gap: SPACING.sm },
  failedText: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  retry: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.xs + 2, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.primary },
  retryText: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.primary },
  modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', padding: SPACING.base },
  bigImage: { width: '100%', height: '80%' },
  close: { alignSelf: 'center', marginTop: SPACING.base, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, backgroundColor: COLORS.surface },
  closeText: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary },
});
