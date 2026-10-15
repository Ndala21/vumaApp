/**
 * VUMA Store — Zawadi ya Karibu (Welcome Gift)
 *
 * Opens from the "Zawadi ya Karibu" card on Home. The customer sees what
 * the gift is worth, claims it, and then sees where it is:
 *   - a discount  : applied by itself at checkout on their first order
 *   - wallet money: already in their VUMA wallet (for shopping only)
 *   - a free product: chosen here, free at checkout when it is in the cart
 * Everything shown comes from /welcome-gift/status/; the server decides who
 * can claim and what they get.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image,
  ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../utils/constants';
import { get, post } from '../../api/client';
import { getDeviceId } from '../../utils/deviceId';
import { tzs, formatDate, reasonText, errorText } from '../../utils/rewards';

const GOLD = '#F59E0B';
const GOLD_FADE = '#FFF6DD';

function Hero({ title, amount, note, tone = 'gold' }) {
  const green = tone === 'green';
  return (
    <View style={[styles.hero, green && styles.heroGreen]}>
      <Text style={styles.heroEmoji}>{green ? '✅' : '🎁'}</Text>
      <Text style={[styles.heroTitle, green && { color: COLORS.successText }]}>{title}</Text>
      {!!amount && <Text style={[styles.heroAmount, green && { color: COLORS.successText }]}>{amount}</Text>}
      {!!note && <Text style={[styles.heroNote, green && { color: COLORS.successText }]}>{note}</Text>}
    </View>
  );
}

function Line({ icon, children }) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineIcon}>{icon}</Text>
      <Text style={styles.lineText}>{children}</Text>
    </View>
  );
}

export default function WelcomeGiftScreen({ navigation }) {
  const [status, setStatus] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [selected, setSelected] = useState(null);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      setLoadError(false);
      const data = await get('/welcome-gift/status/');
      setStatus(data);
    } catch (e) {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const goShopping = () => navigation.navigate('Tabs');

  const handleClaim = async () => {
    if (claiming) return;
    if (status?.gift_type === 'product' && !selected) {
      Alert.alert('Chagua zawadi', 'Chagua bidhaa unayotaka kwanza.');
      return;
    }
    if (status?.needs_phone && phone.replace(/\D/g, '').length < 9) {
      Alert.alert('Namba ya simu', reasonText('bad_phone'));
      return;
    }
    setClaiming(true);
    try {
      const body = { device_id: await getDeviceId() };
      if (status?.gift_type === 'product') body.gift_product_id = selected.id;
      if (status?.needs_phone) body.phone = phone.trim();
      const data = await post('/welcome-gift/claim/', body);
      setMessage(data?.message || '');
      await load();
    } catch (err) {
      Alert.alert('Haikufanikiwa', errorText(err));
      if (err?.errors?.code === 'already_claimed') load();
    } finally {
      setClaiming(false);
    }
  };

  // ── What the screen shows ──────────────────────────────────────────
  let body = null;

  if (loading) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.muted}>Tunatafuta zawadi yako…</Text>
      </View>
    );
  } else if (loadError || !status) {
    body = (
      <View style={styles.center}>
        <Text style={styles.bigEmoji}>📡</Text>
        <Text style={styles.heading}>Hatukuweza kupakia zawadi</Text>
        <Text style={styles.muted}>Angalia mtandao wako kisha ujaribu tena.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => { setLoading(true); load(); }}>
          <Text style={styles.primaryBtnText}>Jaribu Tena</Text>
        </TouchableOpacity>
      </View>
    );
  } else if (status.claimed) {
    const amount = tzs(status.amount);
    const min = status.min_order_value > 0 ? `Oda kuanzia ${tzs(status.min_order_value)}. ` : '';
    const until = status.expires_at ? `Inaisha ${formatDate(status.expires_at)}.` : '';
    switch (status.state) {
      case 'ready':
        body = (
          <>
            <Hero
              title={message || 'Zawadi yako iko tayari!'}
              amount={status.gift_type === 'product' ? status.gift?.name : `Punguzo la ${amount}`}
              note={status.gift_type === 'product' ? 'Itakuwa BURE ukiiweka kwenye oda yako' : 'Linaongezwa lenyewe kwenye malipo ya oda yako ya kwanza'}
            />
            <View style={styles.card}>
              <Line icon="🛒">Chagua bidhaa unazotaka kisha nenda kulipa. Hakuna msimbo wa kuweka.</Line>
              {!!(min || until) && <Line icon="⏳">{`${min}${until}`.trim()}</Line>}
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={goShopping}>
              <Text style={styles.primaryBtnText}>Anza Kununua</Text>
            </TouchableOpacity>
          </>
        );
        break;
      case 'pending_payment':
        body = (
          <>
            <Hero title="Una oda inayosubiri malipo" note="Kamilisha malipo ili zawadi yako ikamilike. Ukiifuta oda, zawadi inarudi kwako." />
            <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('Tabs', { screen: 'Orders' })}>
              <Text style={styles.primaryBtnText}>Angalia Oda Zangu</Text>
            </TouchableOpacity>
          </>
        );
        break;
      case 'used':
        body = (
          <>
            <Hero tone="green" title="Umeshatumia zawadi yako" note="Asante kwa kununua VUMA! Mwalike rafiki upate zaidi." />
            <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('Referral')}>
              <Text style={styles.primaryBtnText}>Alika Rafiki</Text>
            </TouchableOpacity>
          </>
        );
        break;
      case 'in_wallet':
        body = (
          <>
            <Hero
              tone="green"
              title={message || 'Zawadi yako iko kwenye pochi'}
              amount={amount}
              note="Ipo kwenye pochi yako ya VUMA. Unaweza kuitumia kulipia oda, lakini huwezi kuitoa kama pesa taslimu."
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('Wallet')}>
              <Text style={styles.primaryBtnText}>Fungua Pochi</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={goShopping}>
              <Text style={styles.secondaryBtnText}>Anza Kununua</Text>
            </TouchableOpacity>
          </>
        );
        break;
      default:
        body = (
          <Hero title="Zawadi yako imeisha muda" note="Zawadi ilikuwa halali kwa siku 30. Angalia ofa nyingine kwenye ukurasa wa mwanzo." />
        );
    }
  } else if (!status.eligible) {
    body = (
      <View style={styles.center}>
        <Text style={styles.bigEmoji}>🎁</Text>
        <Text style={styles.heading}>Zawadi ya Karibu</Text>
        <Text style={styles.muted}>{reasonText(status.reason_code, status.reason)}</Text>
        <TouchableOpacity style={styles.secondaryBtn} onPress={goShopping}>
          <Text style={styles.secondaryBtnText}>Rudi Kununua</Text>
        </TouchableOpacity>
      </View>
    );
  } else {
    // Can claim
    const type = status.gift_type;
    const amount = tzs(status.amount);
    const min = status.min_order_value > 0 ? `Oda kuanzia ${tzs(status.min_order_value)}.` : '';
    body = (
      <>
        {type === 'product' ? (
          <Hero title="Chagua zawadi yako" note="Bidhaa moja BURE kwa mteja mpya" />
        ) : (
          <Hero
            title={status.invited ? 'Umealikwa na rafiki — umepata zaidi!' : 'Karibu VUMA!'}
            amount={type === 'wallet' ? amount : `Punguzo la ${amount}`}
            note={type === 'wallet' ? 'Inaingia kwenye pochi yako ya VUMA' : 'Kwenye oda yako ya kwanza'}
          />
        )}

        {type === 'product' ? (
          <View style={styles.giftGrid}>
            {(status.gifts || []).length === 0 && <Text style={styles.muted}>Zawadi zote zimeisha kwa sasa.</Text>}
            {(status.gifts || []).map((g) => {
              const on = selected?.id === g.id;
              return (
                <TouchableOpacity key={g.id} style={[styles.giftItem, on && styles.giftItemOn]} onPress={() => setSelected(g)} activeOpacity={0.85}>
                  {g.image ? <Image source={{ uri: g.image }} style={styles.giftImg} resizeMode="cover" /> : <View style={[styles.giftImg, styles.giftImgEmpty]}><Text style={{ fontSize: 28 }}>🎁</Text></View>}
                  <Text style={styles.giftName} numberOfLines={2}>{g.name}</Text>
                  <Text style={styles.giftPrice}>{tzs(g.price)}</Text>
                  {on && <View style={styles.tick}><Text style={styles.tickText}>✓</Text></View>}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.card}>
            {type === 'discount' ? (
              <>
                <Line icon="🛒">Linaongezwa lenyewe kwenye malipo — hakuna msimbo wa kuweka.</Line>
                {!!min && <Line icon="📦">{min}</Line>}
                <Line icon="⏳">Ni halali kwa siku 30 baada ya kulipokea.</Line>
              </>
            ) : (
              <>
                <Line icon="💰">Pesa hizi zinatumika kulipia oda kwenye VUMA.</Line>
                <Line icon="🔒">Huwezi kuzitoa kama pesa taslimu au kumtumia mtu mwingine.</Line>
              </>
            )}
          </View>
        )}

        {status.needs_phone && (
          <View style={styles.card}>
            <Text style={styles.label}>Namba yako ya simu</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="0712 345 678"
              placeholderTextColor={COLORS.textLight}
              maxLength={16}
            />
            <Text style={styles.hint}>Tunatumia namba hii kuhakikisha zawadi inamfikia kila mteja mara moja tu.</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, (claiming || (type === 'product' && !(status.gifts || []).length)) && styles.btnDisabled]}
          onPress={handleClaim}
          disabled={claiming || (type === 'product' && !(status.gifts || []).length)}
          activeOpacity={0.85}
        >
          {claiming ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Pokea Zawadi</Text>}
        </TouchableOpacity>
      </>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} accessibilityLabel="Rudi">
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Zawadi ya Karibu</Text>
        <View style={styles.back} />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {body}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm, paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 24, color: COLORS.textPrimary },
  headerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  scroll: { padding: SPACING.base, paddingBottom: SPACING['3xl'] },
  center: { alignItems: 'center', paddingTop: SPACING['3xl'], paddingHorizontal: SPACING.lg },
  bigEmoji: { fontSize: 54, marginBottom: SPACING.md },
  heading: { fontSize: FONTS.xl, fontWeight: FONTS.extraBold, color: COLORS.textPrimary, textAlign: 'center' },
  muted: { fontSize: FONTS.md, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.sm, lineHeight: 21 },

  hero: {
    backgroundColor: GOLD_FADE, borderRadius: RADIUS.xl, padding: SPACING.lg,
    alignItems: 'center', borderWidth: 1, borderColor: '#FBE3A3',
  },
  heroGreen: { backgroundColor: COLORS.successLight, borderColor: '#B7ECD3' },
  heroEmoji: { fontSize: 46 },
  heroTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: '#8A5A00', marginTop: SPACING.sm, textAlign: 'center' },
  heroAmount: { fontSize: FONTS['3xl'], fontWeight: FONTS.black, color: COLORS.primaryDark, marginTop: SPACING.xs, textAlign: 'center' },
  heroNote: { fontSize: FONTS.md, color: '#8A5A00', marginTop: SPACING.sm, textAlign: 'center', lineHeight: 21 },

  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.base,
    marginTop: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  line: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 5 },
  lineIcon: { width: 28, fontSize: 16 },
  lineText: { flex: 1, fontSize: FONTS.md, color: COLORS.textPrimary, lineHeight: 21 },
  label: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: COLORS.borderStrong, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: 11, fontSize: FONTS.base, color: COLORS.textPrimary,
    backgroundColor: COLORS.surfaceAlt,
  },
  hint: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 6, lineHeight: 16 },

  giftGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: SPACING.md },
  giftItem: {
    width: '48%', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.sm,
    marginBottom: SPACING.md, borderWidth: 2, borderColor: COLORS.border, ...SHADOWS.xs,
  },
  giftItemOn: { borderColor: COLORS.primary },
  giftImg: { width: '100%', height: 110, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceSunken },
  giftImgEmpty: { alignItems: 'center', justifyContent: 'center' },
  giftName: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textPrimary, marginTop: 6 },
  giftPrice: { fontSize: FONTS.sm, color: COLORS.textMuted, textDecorationLine: 'line-through', marginTop: 2 },
  tick: {
    position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  tickText: { color: '#fff', fontWeight: FONTS.bold },

  primaryBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingVertical: 15,
    alignItems: 'center', marginTop: SPACING.lg, minWidth: 200,
  },
  primaryBtnText: { color: '#fff', fontSize: FONTS.base, fontWeight: FONTS.bold },
  secondaryBtn: {
    borderRadius: RADIUS.full, paddingVertical: 14, alignItems: 'center', marginTop: SPACING.md,
    borderWidth: 1.5, borderColor: COLORS.primary, minWidth: 200, paddingHorizontal: SPACING.lg,
  },
  secondaryBtnText: { color: COLORS.primary, fontSize: FONTS.base, fontWeight: FONTS.bold },
  btnDisabled: { opacity: 0.55 },
});
