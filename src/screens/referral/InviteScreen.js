/**
 * VUMA Store - a friend's invite link opened the app (vuma://invite/CODE).
 *
 * The code is kept on the phone, then:
 *   - a guest sees who invited them and what waits for them, with "Create account" (the code is filled in there)
 *   - a signed-in person who is still new has the code added to their account (the server decides if it is allowed)
 * Nothing here pays anyone. The reward is paid by the server after the friend's first paid order.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated } from '../../store/authSlice';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../utils/constants';
import { tzs } from '../../utils/rewards';
import {
  attachPendingInvite, checkInviteCode, cleanCode, savePendingInvite,
} from '../../utils/inviteCode';

const goHome = (navigation) => navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });

export default function InviteScreen({ navigation, route }) {
  const code = cleanCode(route && route.params && route.params.code);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);       // { valid, referrerName, friendGift }
  const [result, setResult] = useState(null);   // the server's answer when a signed-in person added the code

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!code) { if (alive) setLoading(false); return; }
      await savePendingInvite(code);
      const checked = await checkInviteCode(code);
      if (!alive) return;
      setInfo(checked);
      if (isAuthenticated && checked.valid !== false) {
        const answer = await attachPendingInvite();
        if (alive) setResult(answer);
      }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [code, isAuthenticated]);

  const who = (info && info.referrerName) || 'A friend';
  const valid = !!code && !(info && info.valid === false);
  const gift = info && info.friendGift > 0 ? tzs(info.friendGift) : '';

  let title = 'Welcome to VUMA';
  let body = 'Shop thousands of products and pay with mobile money.';
  if (!code || !valid) {
    title = 'This invite link is not valid';
    body = 'You can still use VUMA. Create an account and start shopping.';
  } else if (isAuthenticated && result) {
    title = result.applied ? `Done. ${who} invited you` : 'Invite not added';
    body = result.message || '';
  } else if (!isAuthenticated) {
    title = `${who} invited you to VUMA`;
    body = gift
      ? `Create your account and claim your welcome gift of ${gift}. Use it on your first order.`
      : 'Create your account and start shopping with mobile money.';
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <View style={styles.card}>
        <View style={styles.logo}><Text style={styles.logoText}>VUMA</Text></View>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: SPACING.xl }} />
        ) : (
          <>
            <Text style={styles.title}>{title}</Text>
            {!!body && <Text style={styles.body}>{body}</Text>}
            {valid && !!code && !isAuthenticated && (
              <View style={styles.codeBox}>
                <Text style={styles.codeLabel}>Invite code</Text>
                <Text style={styles.code}>{code}</Text>
              </View>
            )}
            {!isAuthenticated && (
              <>
                <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.88}
                  onPress={() => navigation.navigate('Auth', { screen: 'Register' })}>
                  <Text style={styles.primaryText}>Create account</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.85}
                  onPress={() => navigation.navigate('Auth', { screen: 'Login' })}>
                  <Text style={styles.secondaryText}>I already have an account</Text>
                </TouchableOpacity>
              </>
            )}
            {isAuthenticated && result && result.applied && (
              <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.88} onPress={() => navigation.replace('WelcomeGift')}>
                <Text style={styles.primaryText}>See my welcome gift</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.linkBtn} onPress={() => goHome(navigation)}>
              <Text style={styles.linkText}>{isAuthenticated ? 'Go to VUMA' : 'Look around first'}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primaryFade, justifyContent: 'center', padding: SPACING.base },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS['2xl'], padding: SPACING.xl, alignItems: 'center', ...SHADOWS.md },
  logo: { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.xl, marginBottom: SPACING.lg },
  logoText: { color: COLORS.textWhite, fontSize: FONTS['2xl'], fontWeight: FONTS.black, letterSpacing: 1 },
  title: { fontSize: FONTS.xl, fontWeight: FONTS.extraBold, color: COLORS.textPrimary, textAlign: 'center', marginBottom: SPACING.sm },
  body: { fontSize: FONTS.sm, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: SPACING.base },
  codeBox: { borderWidth: 2, borderColor: COLORS.primary, borderStyle: 'dashed', borderRadius: RADIUS.lg, backgroundColor: COLORS.primaryFade, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.xl, alignItems: 'center', marginBottom: SPACING.base },
  codeLabel: { fontSize: FONTS.xs, color: COLORS.textMuted },
  code: { fontSize: FONTS.xl, fontWeight: FONTS.black, color: COLORS.primary, letterSpacing: 2 },
  primaryBtn: { alignSelf: 'stretch', backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: SPACING.md + 2, alignItems: 'center', marginTop: SPACING.sm },
  primaryText: { color: COLORS.textWhite, fontSize: FONTS.base, fontWeight: FONTS.bold },
  secondaryBtn: { alignSelf: 'stretch', borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: SPACING.md, alignItems: 'center', marginTop: SPACING.sm },
  secondaryText: { color: COLORS.primary, fontSize: FONTS.sm, fontWeight: FONTS.bold },
  linkBtn: { paddingVertical: SPACING.md, marginTop: SPACING.xs },
  linkText: { color: COLORS.textMuted, fontSize: FONTS.sm, fontWeight: FONTS.semiBold },
});
