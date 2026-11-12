/**
 * VUMA Store - "Continue with Google" and "Continue with Apple" for the Sign In and Create Account screens.
 *
 * Both buttons have the same height, width, corner radius and outline, each with its own official logo:
 *   - Google: Android always; iPhone once the Google iPhone client id is set (utils/loginOptions.js).
 *   - Apple: iPhone only. It is Apple's own button (the logo and the words come from the phone, App Store rule 4.8).
 * Shows nothing at all when neither is available.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/constants';
import { GOOGLE_SIGNIN_ENABLED } from '../utils/loginOptions';
import { appleModule, appleSignInAvailable } from '../utils/appleSignIn';

const GOOGLE_G = require('../../assets/google-g.png');
const BTN_HEIGHT = 52;

export default function SocialButtons({ onGoogle, onApple, googleLoading, appleLoading, disabled }) {
  const [appleOk, setAppleOk] = useState(false);

  useEffect(() => {
    let alive = true;
    appleSignInAvailable().then((ok) => { if (alive) setAppleOk(ok); });
    return () => { alive = false; };
  }, []);

  const Apple = appleOk ? appleModule() : null;
  if (!GOOGLE_SIGNIN_ENABLED && !Apple) return null;
  const busy = !!(disabled || googleLoading || appleLoading);

  return (
    <View>
      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
        <View style={styles.line} />
      </View>

      {GOOGLE_SIGNIN_ENABLED && (
        <TouchableOpacity
          style={[styles.btn, busy && !googleLoading && styles.dim]}
          onPress={onGoogle}
          disabled={busy}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
        >
          {googleLoading ? (
            <ActivityIndicator color={COLORS.textPrimary} size="small" />
          ) : (
            <>
              <Image source={GOOGLE_G} style={styles.googleLogo} resizeMode="contain" />
              <Text style={styles.btnText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {Apple && (
        <View style={[styles.appleWrap, busy && !appleLoading && styles.dim]} pointerEvents={busy ? 'none' : 'auto'}>
          {appleLoading ? (
            <View style={[styles.btn, styles.appleBusy]}>
              <ActivityIndicator color={COLORS.textPrimary} size="small" />
            </View>
          ) : (
            <Apple.AppleAuthenticationButton
              buttonType={Apple.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={Apple.AppleAuthenticationButtonStyle.WHITE_OUTLINE}
              cornerRadius={RADIUS.lg}
              style={styles.appleBtn}
              onPress={onApple}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  divider: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.xs, marginBottom: SPACING.md, gap: SPACING.sm },
  line: { flex: 1, height: 1, backgroundColor: COLORS.divider },
  dividerText: { fontSize: 11, color: COLORS.textLight, fontWeight: FONTS.bold, letterSpacing: 0.5 },
  btn: {
    height: BTN_HEIGHT, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: '#747775', backgroundColor: COLORS.surface,
    marginBottom: SPACING.md,
  },
  googleLogo: { width: 22, height: 22 },
  btnText: { fontSize: FONTS.lg, color: '#1F1F1F', fontWeight: FONTS.semiBold },
  appleWrap: { marginBottom: SPACING.md },
  appleBtn: { width: '100%', height: BTN_HEIGHT },
  appleBusy: { marginBottom: 0 },
  dim: { opacity: 0.5 },
});
