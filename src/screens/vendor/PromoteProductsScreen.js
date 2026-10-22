/**
 * VUMA Store — Promote Products (Seller Marketing)
 *
 * How it works for the seller:
 *   1. Choose up to 20 of your products (search, select all, see what is already promoted).
 *   2. One Review and Pay screen: the chosen products (Change products), the price, the
 *      dates, the phone number. NOTHING is saved on the server until Pay is pressed.
 *   3. Waiting is safe: the seller can close the screen. The promotion switches on by
 *      itself when AzamPay confirms the payment, and the list shows "Confirming payment"
 *      with a Check now button. A second payment request is never sent while one waits.
 *   4. After paying, the products can still be changed any time (Change products), a
 *      running promotion can get 30 more days (Add 30 days), an ended one can be renewed,
 *      and an unpaid one can be removed.
 * English and Kiswahili (same language rule as the seller home screen).
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar, Platform, Alert, ScrollView,
  ActivityIndicator, Image, TextInput, RefreshControl, BackHandler,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../utils/constants';
import { formatPrice } from '../../utils/helpers';
import Button from '../../components/common/Button';
import { get, post } from '../../api/client';
import { useSelector, useDispatch } from 'react-redux';
import { selectMyProducts, fetchMyProducts } from '../../store/productSlice';
import { selectUser } from '../../store/authSlice';
import { i18n, useTranslation } from '../../i18n';
import {
  px, promoLang, fmtDate, planDates, phoneDigits, phoneOk, phoneShown, guessProvider, filterProducts,
  rowNotes, sameSet, selectAllIds, statusView, timeLine, productsLine, errorText, hasNoPicture,
} from '../../utils/promote';

const BASE = '/products/seller-promotions';

const PROVIDERS = [
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'airtel', label: 'Airtel Money' },
  { value: 'halopesa', label: 'HaloPesa' },
  { value: 'tigopesa', label: 'Mixx by Yas' },
];

const TONES = {
  good: { bg: COLORS.successLight, fg: COLORS.successText },
  wait: { bg: '#FFF3CD', fg: '#8A6D00' },
  bad: { bg: '#FDE8E8', fg: '#B42318' },
  quiet: { bg: COLORS.surfaceSunken, fg: COLORS.textMuted },
};

const MAX_POLLS = 45; // about 3 minutes of checking while the seller watches

export default function PromoteProductsScreen({ navigation }) {
  useTranslation(); // re-draw when the language changes
  const lang = promoLang(i18n.getLocale());
  const T = (key, vars) => px(lang, key, vars);

  const dispatch = useDispatch();
  const myProducts = useSelector(selectMyProducts) || [];
  const productsLoading = useSelector((s) => !!(s.products && s.products.loading && s.products.loading.myProducts));
  const user = useSelector(selectUser);

  const [packageInfo, setPackageInfo] = useState(null);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');

  const [step, setStep] = useState('list'); // list | select | review | waiting | done
  // target: { kind: 'new' } (nothing on the server yet) or { kind: 'promo', promo } (a saved one)
  const [target, setTarget] = useState(null);
  const [serverIds, setServerIds] = useState([]); // the products the server has for the target
  const [draftId, setDraftId] = useState('');     // a draft made when Pay was pressed for a new one
  const [selectedIds, setSelectedIds] = useState([]);
  const [promoted, setPromoted] = useState({});   // productId -> 'YYYY-MM-DD' (paid elsewhere)
  const [query, setQuery] = useState('');
  const [phone, setPhone] = useState('');
  const [provider, setProvider] = useState('mpesa');
  const [providerTouched, setProviderTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [waitingId, setWaitingId] = useState('');
  const [waitLong, setWaitLong] = useState(false);
  const [checking, setChecking] = useState(false);
  const [doneInfo, setDoneInfo] = useState(null);
  const [checkMsg, setCheckMsg] = useState('');
  const [fromReview, setFromReview] = useState(false); // the seller came to Choose products from Review and pay

  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const max = (packageInfo && packageInfo.max_products) || 20;
  const days = (packageInfo && packageInfo.duration_days) || 30;
  const price = (packageInfo && packageInfo.amount) || 5000;

  // ── loading ───────────────────────────────────────────
  const loadAll = useCallback(async (silent) => {
    if (!silent) setLoading(true);
    try {
      const [pkg, promoData] = await Promise.all([
        get(`${BASE}/package/`),
        get(`${BASE}/`),
      ]);
      if (!mounted.current) return null;
      setPackageInfo(pkg);
      const list = (promoData && promoData.promotions) || [];
      setPromotions(list);
      setLoadError('');
      return list;
    } catch (e) {
      if (mounted.current && !silent) setLoadError(errorText(lang, e, 20) || T('loadFail'));
      return null;
    } finally {
      if (mounted.current) { setLoading(false); setRefreshing(false); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => { loadAll(); }, [loadAll]);
  // the seller's own product list (for the choose step) is refreshed once when the screen opens
  useEffect(() => { dispatch(fetchMyProducts()); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The phone number on file is a good first answer
  useEffect(() => {
    if (phone) return;
    const d = phoneDigits(user && user.phone);
    if (phoneOk(d)) setPhone(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (providerTouched) return;
    const guess = guessProvider(phoneDigits(phone));
    if (guess) setProvider(guess);
  }, [phone, providerTouched]);

  const loadPromoted = useCallback(async (excludeId) => {
    try {
      const data = await get(`${BASE}/promoted/`, excludeId ? { exclude: excludeId } : undefined);
      const map = {};
      ((data && data.promoted) || []).forEach((x) => { map[String(x.product_id)] = x.until; });
      if (mounted.current) setPromoted(map);
    } catch (e) {
      if (mounted.current) setPromoted({});
    }
  }, []);

  // ── moving between steps ──────────────────────────────
  const reset = () => {
    setTarget(null); setServerIds([]); setDraftId(''); setSelectedIds([]); setQuery('');
    setFormError(''); setPhoneError(''); setWaitingId(''); setWaitLong(false); setPromoted({});
    setCheckMsg(''); setFromReview(false);
  };

  const startNew = () => {
    reset();
    setTarget({ kind: 'new' });
    loadPromoted(null);
    setStep('select');
  };

  const openPromo = (promo, nextStep) => {
    reset();
    setTarget({ kind: 'promo', promo });
    setServerIds(promo.product_ids || []);
    setSelectedIds(promo.product_ids || []);
    loadPromoted(promo.id);
    setStep(nextStep);
  };

  const backFromStep = useCallback(() => {
    if (step === 'select') {
      if (fromReview) { setFromReview(false); setStep('review'); return true; }
      reset(); setStep('list'); return true;
    }
    if (step === 'review') {
      if (target && target.kind === 'new' && !draftId) { setStep('select'); return true; }
      reset(); setStep('list'); loadAll(true); return true;
    }
    if (step === 'waiting' || step === 'done') { reset(); setStep('list'); loadAll(true); return true; }
    return false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, target, draftId, fromReview, loadAll]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => backFromStep());
    return () => { if (sub && sub.remove) sub.remove(); };
  }, [backFromStep]);

  // ── selection ─────────────────────────────────────────
  const visible = filterProducts(myProducts, query);

  const toggleProduct = (p) => {
    const { blocked } = rowNotes(p, promoted, lang);
    if (blocked) return;
    setSelectedIds((prev) => {
      if (prev.includes(p.id)) return prev.filter((x) => x !== p.id);
      if (prev.length >= max) {
        Alert.alert(T('selectedCount', { n: prev.length, max }), T('err_too_many', { max }));
        return prev;
      }
      return [...prev, p.id];
    });
    setFormError('');
  };

  const selectedProducts = selectedIds.map((id) => myProducts.find((p) => String(p.id) === String(id))).filter(Boolean);
  const missingPictures = selectedProducts.some(hasNoPicture);
  const targetState = target && target.kind === 'promo' ? target.promo.effective_status : 'draft';
  const isPaidTarget = targetState === 'active' || targetState === 'scheduled';

  const saveProducts = async (id) => {
    const r = await post(`${BASE}/${id}/products/`, { product_ids: selectedIds });
    setServerIds((r && r.promotion && r.promotion.product_ids) || selectedIds);
    return r;
  };

  const continueFromSelect = async () => {
    if (selectedIds.length === 0) return;
    setFormError('');
    if (target.kind === 'new' && !draftId) { setStep('review'); return; }   // nothing is saved yet
    const id = draftId || target.promo.id;
    if (sameSet(selectedIds, serverIds)) { setStep(isPaidTarget ? 'list' : 'review'); return; }
    setSubmitting(true);
    try {
      await saveProducts(id);
      if (isPaidTarget) {
        setNotice(T('saved', { n: selectedIds.length }));
        reset(); setStep('list'); loadAll(true);
      } else {
        setStep('review');
      }
    } catch (e) {
      setFormError(errorText(lang, e, max));
      if (e && e.errors && e.errors.code === 'already_promoted') loadPromoted(id);
    } finally {
      if (mounted.current) setSubmitting(false);
    }
  };

  // ── paying ────────────────────────────────────────────
  const reviewParent = () => {
    const parentId = target && target.kind === 'promo' ? target.promo.renews : null;
    return parentId ? promotions.find((x) => x.id === parentId) : null;
  };

  const pay = async () => {
    const digits = phoneDigits(phone);
    if (!phoneOk(digits)) { setPhoneError(T('phoneBad')); return; }
    setPhoneError(''); setFormError('');
    setSubmitting(true);
    let id = draftId || (target.kind === 'promo' ? target.promo.id : '');
    try {
      if (!id) {
        const made = await post(`${BASE}/create/`, { product_ids: selectedIds });
        id = made.id;
        setDraftId(id);
        setServerIds(selectedIds);
      } else if (!sameSet(selectedIds, serverIds)) {
        await saveProducts(id);
      }
      await post(`${BASE}/${id}/initiate-payment/`, { phone: digits, provider });
      setWaitingId(id); setWaitLong(false);
      setStep('waiting');
    } catch (e) {
      const code = (e && e.errors && e.errors.code) || (e && e.status === 409 ? 'payment_in_progress' : '');
      if (code === 'payment_in_progress' && id) {
        // a payment request is already waiting for this promotion: wait for it, never ask again
        setWaitingId(id); setWaitLong(false); setStep('waiting');
        return;
      }
      setFormError(errorText(lang, e, max));
      if (code === 'already_promoted') loadPromoted(id || null);
    } finally {
      if (mounted.current) setSubmitting(false);
    }
  };

  const showDone = (id, list) => {
    const promo = (list || []).find((x) => x.id === id);
    setDoneInfo({ n: (promo && promo.product_count) || selectedIds.length, date: fmtDate(promo && promo.end_date, lang) });
    setStep('done');
  };

  // One look at the payment. Returns the status word.
  // fromList: the seller pressed Check now on the list (no review screen to go back to).
  const checkPayment = useCallback(async (id, fromList) => {
    try {
      const r = await post(`${BASE}/${id}/verify-payment/`, {});
      if (!mounted.current) return 'gone';
      if (r.status === 'active') {
        const list = await loadAll(true);
        showDone(id, list);
        return 'active';
      }
      if (r.status === 'failed') {
        loadAll(true);
        if (fromList) {
          setNotice(T('failBody'));
        } else {
          setFormError(T('failBody'));
          setStep('review');
        }
        return 'failed';
      }
      return 'pending';
    } catch (e) {
      return 'error';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadAll, lang, selectedIds]);

  useEffect(() => {
    if (step !== 'waiting' || !waitingId) return undefined;
    let polls = 0;
    let stopped = false;
    const timer = setInterval(async () => {
      if (stopped) return;
      polls += 1;
      const r = await checkPayment(waitingId, false);
      if (r === 'active' || r === 'failed' || r === 'gone') { stopped = true; clearInterval(timer); return; }
      if (polls >= MAX_POLLS) { stopped = true; clearInterval(timer); if (mounted.current) setWaitLong(true); }
    }, 4000);
    return () => { stopped = true; clearInterval(timer); };
  }, [step, waitingId, checkPayment]);

  const checkNow = async (id, fromList) => {
    const say = (m) => (fromList ? setNotice(m) : setCheckMsg(m));
    setChecking(true); setBusyId(id); setCheckMsg(''); setNotice('');
    const r = await checkPayment(id, !!fromList);
    if (!mounted.current) return;
    setChecking(false); setBusyId('');
    if (r === 'pending') { say(T('notYet')); if (fromList) loadAll(true); }
    if (r === 'error') say(T('netFail'));
  };

  // ── actions on the list ───────────────────────────────
  const withBusy = async (id, fn) => {
    setBusyId(id); setNotice('');
    try { await fn(); } catch (e) { setNotice(errorText(lang, e, max)); } finally { if (mounted.current) setBusyId(''); }
  };

  const goReviewDraft = async (newId) => {
    const list = await loadAll(true);
    const promo = (list || []).find((x) => x.id === newId);
    if (promo) openPromo(promo, 'review');
  };

  const extend = (promo) => withBusy(promo.id, async () => {
    const r = await post(`${BASE}/${promo.id}/extend/`, {});
    await goReviewDraft(r.id);
  });

  const renew = (promo) => withBusy(promo.id, async () => {
    const r = await post(`${BASE}/${promo.id}/renew/`, {});
    await goReviewDraft(r.id);
  });

  const askRemove = (promo) => {
    Alert.alert(T('removeAsk'), T('removeText'), [
      { text: T('keep'), style: 'cancel' },
      {
        text: T('remove'), style: 'destructive',
        onPress: () => withBusy(promo.id, async () => {
          await post(`${BASE}/${promo.id}/cancel/`, {});
          await loadAll(true);
        }),
      },
    ]);
  };

  // ════════════════════════ screens ════════════════════════
  const Header = ({ title, onBack }) => (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityLabel="back">
        <Text style={styles.headerBack}>←</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      <View style={{ width: 24 }} />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // ── Select products ──
  if (step === 'select') {
    const unpaidChange = !isPaidTarget;
    const buttonTitle = submitting ? T('saving')
      : unpaidChange ? T('continueBtn', { n: selectedIds.length }) : T('saveChanges');
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <Header title={T('selectTitle')} onBack={backFromStep} />
        <View style={styles.searchWrap}>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={T('search')}
            placeholderTextColor={COLORS.textLight}
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>
        <View style={styles.selectCountBar}>
          <Text style={styles.selectCountText}>{T('selectedCount', { n: selectedIds.length, max })}</Text>
          <View style={styles.selectCountActions}>
            <TouchableOpacity onPress={() => setSelectedIds(selectAllIds(visible, promoted, selectedIds, max))} accessibilityLabel="select all">
              <Text style={styles.linkText}>{T('selectAll')}</Text>
            </TouchableOpacity>
            {selectedIds.length > 0 && (
              <TouchableOpacity onPress={() => setSelectedIds([])} accessibilityLabel="clear">
                <Text style={[styles.linkText, { marginLeft: SPACING.base }]}>{T('clearAll')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.selectList} keyboardShouldPersistTaps="handled">
          {productsLoading && myProducts.length === 0 && <ActivityIndicator style={{ marginTop: SPACING.xl }} color={COLORS.primary} />}
          {visible.map((p) => {
            const checked = selectedIds.includes(p.id);
            const { blocked, notes } = rowNotes(p, promoted, lang);
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.selectRow, checked && styles.selectRowActive, blocked && styles.selectRowBlocked]}
                onPress={() => toggleProduct(p)}
                activeOpacity={0.7}
                accessibilityLabel={`product ${p.name}`}
              >
                <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                  {checked && <Text style={styles.checkboxTick}>✓</Text>}
                </View>
                {p.primary_image ? (
                  <Image source={{ uri: p.primary_image }} style={styles.selectImage} />
                ) : (
                  <View style={[styles.selectImage, styles.selectImagePlaceholder]}><Text>📦</Text></View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectName} numberOfLines={1}>{p.name}</Text>
                  <Text style={styles.selectPrice}>{formatPrice(p.price)}</Text>
                  {notes.map((n, i) => (
                    <Text key={i} style={[styles.rowNote, blocked && i === 0 && styles.rowNoteBlocked]}>{n}</Text>
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
          {!productsLoading && visible.length === 0 && (
            <Text style={styles.emptyText}>
              {query.trim() ? T('noMatch', { q: query.trim() }) : T('noProducts')}
            </Text>
          )}
        </ScrollView>
        <View style={styles.footer}>
          {missingPictures && <Text style={styles.warnText}>{T('pictureWarn')}</Text>}
          {!!formError && <Text style={styles.errorText}>{formError}</Text>}
          <Button title={buttonTitle} onPress={continueFromSelect} loading={submitting} disabled={selectedIds.length === 0} fullWidth />
        </View>
      </View>
    );
  }

  // ── Review and pay ──
  if (step === 'review' && target) {
    const parent = reviewParent();
    const plan = planDates(new Date(), days, parent);
    const when = plan.after
      ? T('startsAfter', { start: fmtDate(plan.start, lang), end: fmtDate(plan.end, lang) })
      : T('startsToday', { date: fmtDate(plan.end, lang) });
    const shown = selectedProducts.slice(0, 5);
    const extra = selectedProducts.length - shown.length;
    const retry = !!formError && (draftId || target.kind === 'promo');
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <Header title={T('reviewTitle')} onBack={backFromStep} />
        <ScrollView contentContainerStyle={styles.payScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.reviewCard}>
            <View style={styles.reviewTop}>
              <Text style={styles.reviewCount}>{T('yourProducts', { n: selectedProducts.length })}</Text>
              <TouchableOpacity onPress={() => { setFormError(''); setFromReview(true); setStep('select'); }} accessibilityLabel="change products">
                <Text style={styles.linkText}>{T('changeProducts')}</Text>
              </TouchableOpacity>
            </View>
            {shown.map((p) => (
              <View key={p.id} style={styles.reviewRow}>
                {p.primary_image ? (
                  <Image source={{ uri: p.primary_image }} style={styles.reviewImage} />
                ) : (
                  <View style={[styles.reviewImage, styles.selectImagePlaceholder]}><Text>📦</Text></View>
                )}
                <Text style={styles.reviewName} numberOfLines={1}>{p.name}</Text>
              </View>
            ))}
            {extra > 0 && <Text style={styles.reviewMore}>{T('moreProducts', { n: extra })}</Text>}
          </View>

          <View style={styles.payCard}>
            <Text style={styles.payLabel}>{T('amountLabel')}</Text>
            <Text style={styles.payAmount}>{formatPrice(price)}</Text>
            <Text style={styles.paySub}>{T('forDays', { days })}</Text>
            <Text style={styles.paySub}>{when}</Text>
          </View>

          <Text style={styles.fieldLabel}>{T('payWith')}</Text>
          <View style={styles.providerRow}>
            {PROVIDERS.map((p) => (
              <TouchableOpacity
                key={p.value}
                style={[styles.providerChip, provider === p.value && styles.providerChipActive]}
                onPress={() => { setProvider(p.value); setProviderTouched(true); }}
                accessibilityLabel={`provider ${p.label}`}
              >
                <Text style={[styles.providerChipText, provider === p.value && styles.providerChipTextActive]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>{T('phoneLabel')}</Text>
          <View style={[styles.phoneRow, !!phoneError && styles.phoneRowError]}>
            <Text style={styles.phonePrefix}>+255</Text>
            <TextInput
              style={styles.phoneInput}
              value={phoneShown(phoneDigits(phone))}
              onChangeText={(v) => { setPhone(phoneDigits(v)); setPhoneError(''); }}
              placeholder={T('phoneHint')}
              keyboardType="phone-pad"
              maxLength={11}
              placeholderTextColor={COLORS.textLight}
            />
          </View>
          {!!phoneError && <Text style={styles.errorText}>{phoneError}</Text>}

          {!!formError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{formError}</Text>
            </View>
          )}
          {missingPictures && <Text style={styles.warnText}>{T('pictureWarn')}</Text>}

          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{T('payNote')}</Text>
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <Button
            title={submitting ? T('paying') : retry ? T('tryAgain') : T('payBtn', { price: formatPrice(price) })}
            onPress={pay}
            loading={submitting}
            fullWidth
          />
        </View>
      </View>
    );
  }

  // ── Waiting for the payment ──
  if (step === 'waiting') {
    return (
      <View style={styles.centerScreen}>
        {!waitLong && <ActivityIndicator size="large" color={COLORS.primary} />}
        <Text style={styles.processingTitle}>{T('waitTitle')}</Text>
        <Text style={styles.processingSub}>{waitLong ? T('waitLong') : T('waitSub')}</Text>
        <Button
          title={checking ? T('checking') : T('checkNow')}
          variant="outline"
          onPress={() => checkNow(waitingId, false)}
          loading={checking}
          style={{ marginTop: SPACING.xl, minWidth: 220 }}
        />
        {!!checkMsg && <Text style={[styles.processingSub, { marginTop: SPACING.sm }]}>{checkMsg}</Text>}
        <TouchableOpacity onPress={() => { reset(); setStep('list'); loadAll(true); }} style={{ marginTop: SPACING.base }} accessibilityLabel="close and check later">
          <Text style={styles.linkText}>{T('closeLater')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Done ──
  if (step === 'done') {
    return (
      <View style={styles.centerScreen}>
        <Text style={{ fontSize: 56 }}>🎉</Text>
        <Text style={styles.successTitle}>{T('doneTitle')}</Text>
        <Text style={styles.successSub}>{T('doneSub', { n: (doneInfo && doneInfo.n) || 0, date: (doneInfo && doneInfo.date) || '' })}</Text>
        <Button title={T('doneBtn')} onPress={() => { reset(); setStep('list'); loadAll(true); }} style={{ marginTop: SPACING.xl, width: 200 }} />
      </View>
    );
  }

  // ── List (default) ──
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <Header title={T('title')} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.listScroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAll(true); }} />}
      >
        {!!loadError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorBoxText}>{loadError}</Text>
            <Button title={T('retry')} variant="outline" size="sm" onPress={() => loadAll()} style={{ marginTop: SPACING.sm }} />
          </View>
        )}
        {!!notice && (
          <TouchableOpacity style={styles.noticeBar} onPress={() => setNotice('')} activeOpacity={0.8}>
            <Text style={styles.noticeBarText}>{notice}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.packageCard}>
          <View style={styles.packageBadge}><Text style={styles.packageBadgeText}>⭐ {T('heroTitle')}</Text></View>
          <Text style={styles.packagePrice}>{T('heroPrice', { price: formatPrice(price), days })}</Text>
          {['benefit1', 'benefit2', 'benefit3'].map((k) => (
            <Text key={k} style={styles.packageFeature}>✓ {T(k, { max })}</Text>
          ))}
          <Button title={T('startBtn')} onPress={startNew} style={{ marginTop: SPACING.base }} fullWidth />
        </View>

        <Text style={styles.sectionTitle}>{T('myPromos')}</Text>
        {promotions.length === 0 && !loadError ? (
          <Text style={styles.emptyText}>{T('emptyPromos')}</Text>
        ) : (
          promotions.map((p) => {
            const view = statusView(p, lang);
            const tone = TONES[view.tone] || TONES.quiet;
            const line = timeLine(p, lang);
            const busy = busyId === p.id;
            return (
              <View key={p.id} style={styles.promoCard} accessibilityLabel={`promotion ${p.effective_status}`}>
                <View style={styles.promoTopRow}>
                  <Text style={styles.promoName}>{T('yourProducts', { n: p.product_count })}</Text>
                  <View style={[styles.promoStatusPill, { backgroundColor: tone.bg }]}>
                    <Text style={[styles.promoStatusText, { color: tone.fg }]}>{view.text}</Text>
                  </View>
                </View>
                <Text style={styles.promoProducts} numberOfLines={2}>{productsLine(p, lang)}</Text>
                {!!line && <Text style={styles.promoMeta}>{line}</Text>}
                {p.effective_status === 'confirming' && <Text style={styles.promoMeta}>{T('confirmingNote')}</Text>}
                {!!p.renews && (p.effective_status === 'draft' || p.effective_status === 'failed') && (
                  <Text style={styles.promoMeta}>{T('add30Info', { days: p.duration_days })}</Text>
                )}

                <View style={styles.actionRow}>
                  {p.effective_status === 'confirming' && (
                    <Button title={busy && checking ? T('checking') : T('checkNow')} variant="outline" size="sm" loading={busy && checking}
                      onPress={() => checkNow(p.id, true)} style={styles.actionBtn} />
                  )}
                  {(p.effective_status === 'draft' || p.effective_status === 'failed') && (
                    <Button title={p.effective_status === 'failed' ? T('tryAgain') : T('payBtn', { price: formatPrice(p.amount) })} size="sm"
                      onPress={() => openPromo(p, 'review')} style={styles.actionBtn} />
                  )}
                  {p.can_extend && (
                    <Button title={T('add30', { days: p.duration_days })} size="sm" loading={busy} onPress={() => extend(p)} style={styles.actionBtn} />
                  )}
                  {p.can_renew && (
                    <Button title={T('renew')} size="sm" loading={busy} onPress={() => renew(p)} style={styles.actionBtn} />
                  )}
                  {p.can_edit && (
                    <Button title={T('changeProducts')} variant="outline" size="sm" onPress={() => openPromo(p, 'select')} style={styles.actionBtn} />
                  )}
                  {p.can_delete && (
                    <Button title={T('remove')} variant="outlineSecondary" size="sm" loading={busy && !checking} onPress={() => askRemove(p)} style={styles.actionBtn} />
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centerScreen: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.primary, paddingHorizontal: SPACING.base,
    paddingTop: Platform.OS === 'ios' ? 50 : SPACING.base, paddingBottom: SPACING.base,
  },
  headerBack: { fontSize: 22, color: 'white', fontWeight: FONTS.bold },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: FONTS.lg, fontWeight: FONTS.bold, color: 'white', marginHorizontal: SPACING.sm },
  linkText: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.primaryDark },

  listScroll: { padding: SPACING.base, paddingBottom: 60 },
  packageCard: { backgroundColor: '#FFF3E8', borderRadius: RADIUS.xl, padding: SPACING.base, marginBottom: SPACING.xl, borderWidth: 1, borderColor: 'rgba(255,106,0,0.25)' },
  packageBadge: { alignSelf: 'flex-start', backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 4, marginBottom: SPACING.sm },
  packageBadgeText: { color: 'white', fontSize: FONTS.xs, fontWeight: FONTS.bold },
  packagePrice: { fontSize: FONTS['2xl'], fontWeight: FONTS.black, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  packageFeature: { fontSize: FONTS.sm, color: COLORS.textSecondary, marginBottom: 4, lineHeight: 18 },

  sectionTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  emptyText: { fontSize: FONTS.sm, color: COLORS.textMuted, textAlign: 'center', padding: SPACING.xl },

  promoCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  promoTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  promoName: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  promoStatusPill: { paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.full, maxWidth: '60%' },
  promoStatusText: { fontSize: FONTS.xs, fontWeight: FONTS.bold },
  promoProducts: { fontSize: FONTS.sm, color: COLORS.textSecondary, marginBottom: 2 },
  promoMeta: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2, lineHeight: 16 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: SPACING.sm, marginHorizontal: -4 },
  actionBtn: { margin: 4 },

  noticeBar: { backgroundColor: '#E7F6EC', borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.base },
  noticeBarText: { fontSize: FONTS.sm, color: COLORS.successText },
  errorBox: { backgroundColor: '#FDE8E8', borderRadius: RADIUS.lg, padding: SPACING.md, marginTop: SPACING.base, marginBottom: SPACING.sm },
  errorBoxText: { fontSize: FONTS.sm, color: '#B42318', lineHeight: 18 },
  errorText: { fontSize: FONTS.xs, color: '#B42318', marginTop: 4, marginBottom: SPACING.xs, lineHeight: 16 },
  warnText: { fontSize: FONTS.xs, color: '#8A6D00', backgroundColor: '#FFF3CD', borderRadius: RADIUS.md, padding: SPACING.sm, marginTop: SPACING.sm, marginBottom: SPACING.xs, lineHeight: 16 },

  // Select products
  searchWrap: { backgroundColor: COLORS.surface, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm },
  searchInput: { backgroundColor: COLORS.surfaceSunken, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 2, fontSize: FONTS.base, color: COLORS.textPrimary },
  selectCountBar: { backgroundColor: COLORS.primaryFade, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.base, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectCountText: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.primaryDark },
  selectCountActions: { flexDirection: 'row', alignItems: 'center' },
  selectList: { padding: SPACING.base, paddingBottom: 100 },
  selectRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.sm, marginBottom: SPACING.xs, borderWidth: 1.5, borderColor: COLORS.border },
  selectRowActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryFade },
  selectRowBlocked: { opacity: 0.55 },
  checkbox: { width: 22, height: 22, borderRadius: RADIUS.sm, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkboxTick: { color: 'white', fontSize: FONTS.xs, fontWeight: FONTS.bold },
  selectImage: { width: 44, height: 44, borderRadius: RADIUS.md, marginRight: SPACING.sm },
  selectImagePlaceholder: { backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  selectName: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textPrimary },
  selectPrice: { fontSize: FONTS.xs, color: COLORS.primary, fontWeight: FONTS.bold },
  rowNote: { fontSize: FONTS.xs, color: '#8A6D00', marginTop: 1 },
  rowNoteBlocked: { color: COLORS.textMuted },

  footer: { padding: SPACING.base, borderTopWidth: 1, borderTopColor: COLORS.divider, backgroundColor: COLORS.surface },

  // Review and pay
  payScroll: { padding: SPACING.base, paddingBottom: 100 },
  reviewCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.base, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.xs },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  reviewCount: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  reviewRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  reviewImage: { width: 32, height: 32, borderRadius: RADIUS.sm, marginRight: SPACING.sm },
  reviewName: { flex: 1, fontSize: FONTS.sm, color: COLORS.textSecondary },
  reviewMore: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  payCard: { backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, padding: SPACING.xl, alignItems: 'center', marginBottom: SPACING.base },
  payLabel: { fontSize: FONTS.sm, color: 'rgba(255,255,255,0.85)', marginBottom: 4 },
  payAmount: { fontSize: 32, fontWeight: FONTS.black, color: 'white', marginBottom: 4 },
  paySub: { fontSize: FONTS.xs, color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginTop: 2 },
  fieldLabel: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary, marginBottom: SPACING.xs, marginTop: SPACING.sm },
  providerRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: SPACING.base },
  providerChip: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surfaceAlt, marginRight: SPACING.sm, marginBottom: SPACING.sm },
  providerChipActive: { backgroundColor: COLORS.primaryFade, borderColor: COLORS.primary },
  providerChipText: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  providerChipTextActive: { color: COLORS.primaryDark, fontWeight: FONTS.bold },
  phoneRow: { flexDirection: 'row', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, overflow: 'hidden' },
  phoneRowError: { borderColor: '#B42318' },
  phonePrefix: { backgroundColor: COLORS.surfaceAlt, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 4, fontSize: FONTS.base, fontWeight: FONTS.semiBold, color: COLORS.textSecondary },
  phoneInput: { flex: 1, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 4, fontSize: FONTS.base, color: COLORS.textPrimary },
  noticeBox: { backgroundColor: '#E8F3FF', borderRadius: RADIUS.lg, padding: SPACING.base, marginTop: SPACING.base },
  noticeText: { fontSize: FONTS.xs, color: '#2563EB', lineHeight: 17 },

  processingTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginTop: SPACING.base, textAlign: 'center' },
  processingSub: { fontSize: FONTS.sm, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.xs, lineHeight: 19 },
  successTitle: { fontSize: FONTS.xl, fontWeight: FONTS.black, color: COLORS.textPrimary, marginTop: SPACING.base, textAlign: 'center' },
  successSub: { fontSize: FONTS.sm, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.xs },
});
