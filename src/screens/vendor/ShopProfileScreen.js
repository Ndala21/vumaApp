/**
 * VUMA Store - Shop profile (seller): the shop's logo, cover picture, poster and tagline.
 *
 * A seller picks a picture from the phone, sees it in a live preview of the shop page, and saves.
 * The server checks and shrinks every picture (apps/vendors/shop_images.py) and answers with a
 * plain sentence when one is refused (too small, too large, not a picture): that sentence is
 * shown under the picture it belongs to. Nothing is sent until "Save changes".
 *
 * Text is Kiswahili or English (utils/shopProfile.js).
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, Platform, Alert, RefreshControl, ActivityIndicator, Image,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../../utils/constants';
import { i18n, useTranslation } from '../../i18n';
import { vendorsAPI } from '../../api/vendors';
import { homeLang } from '../../utils/sellerHome';
import {
  PICTURES, TAGLINE_MAX, DESCRIPTION_MAX, sx, pictureById, buildChanges, checkPicked, fieldErrors,
} from '../../utils/shopProfile';

const NO_ERRORS = { logo: '', banner: '', poster: '', tagline: '', general: '' };

export default function ShopProfileScreen({ navigation }) {
  useTranslation(); // re-draw when the language changes
  const lang = homeLang(i18n.getLocale());
  const T = (key, vars) => sx(lang, key, vars);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // What the seller changed and has not saved yet:
  //   logo / banner / poster: a picked picture ({ uri, width, height, ... }) or 'remove'
  //   tagline / description: the typed text
  const [edits, setEdits] = useState({});
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState(NO_ERRORS);

  const load = useCallback(async () => {
    try {
      setProfile(await vendorsAPI.getProfile());
      setLoadFailed(false);
    } catch (e) {
      setLoadFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const changes = buildChanges(profile, edits);
  const canSave = Object.keys(changes).length > 0 && !saving;

  // The picture shown for one slot: the one just picked, else the saved one, else none.
  const shownUri = (pic) => {
    const edit = edits[pic.id];
    if (edit === 'remove') return null;
    if (edit && edit.uri) return edit.uri;
    return (profile && profile[pic.urlField]) || null;
  };

  const setEdit = (id, value) => setEdits((prev) => {
    const next = { ...prev };
    if (value === undefined) delete next[id]; else next[id] = value;
    return next;
  });

  const pick = async (id) => {
    const pic = pictureById(id);
    try {
      const ImagePicker = await import('expo-image-picker');
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(T('permissionTitle'), T('permissionText'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,      // the phone's own crop tool, in the shape the app shows this picture
        aspect: pic.aspect,
        quality: 0.8,
      });
      if (result.canceled || !result.assets || !result.assets[0]) return;
      const asset = result.assets[0];
      const problem = checkPicked(lang, id, asset);
      setErrors((prev) => ({ ...prev, [id]: problem, general: '' }));
      if (!problem) setEdit(id, asset);
    } catch (e) {
      Alert.alert(T('error'), T('pickFail'));
    }
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setProgress(0);
    setErrors(NO_ERRORS);
    try {
      const updated = await vendorsAPI.updateProfile(changes, setProgress);
      setProfile(updated);
      setEdits({});
      Alert.alert(T('saved'), T('savedText'));
    } catch (e) {
      const found = fieldErrors(e);
      setErrors({ ...found, general: found.general || T('saveFail') });
    } finally {
      setSaving(false);
    }
  };

  const Header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.headerBack}>←</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{T('title')}</Text>
      <View style={{ width: 24 }} />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        {Header}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.centerText}>{T('loading')}</Text>
        </View>
      </View>
    );
  }

  const logoUri = shownUri(pictureById('logo'));
  const bannerUri = shownUri(pictureById('banner'));
  const shopName = (profile && profile.shop_name) || T('noName');
  const tagline = typeof edits.tagline === 'string' ? edits.tagline : ((profile && profile.tagline) || '');
  const description = typeof edits.description === 'string' ? edits.description : ((profile && profile.shop_description) || '');

  const renderPicture = (pic) => {
    const uri = shownUri(pic);
    const edit = edits[pic.id];
    const picked = !!(edit && edit.uri);
    const removing = edit === 'remove';
    const saved = !!(profile && profile[pic.urlField]);
    const shape = pic.id === 'logo' ? styles.previewLogo : pic.id === 'banner' ? styles.previewBanner : styles.previewPoster;
    return (
      <View key={pic.id} style={styles.card}>
        <Text style={styles.cardTitle}>{T(pic.id)}</Text>
        <Text style={styles.cardHint}>{T(`${pic.id}Hint`)}</Text>
        <View style={[styles.previewBox, shape]}>
          {uri ? (
            <Image source={{ uri }} style={styles.previewImage} resizeMode="cover" />
          ) : (
            <Text style={styles.previewEmpty}>{pic.id === 'logo' ? '🏪' : '🖼️'}</Text>
          )}
        </View>
        <Text style={styles.cardSmall}>{T('minSize', { n: pic.minSide })}</Text>
        {picked ? <Text style={styles.statusNote}>{T('picked')}</Text> : null}
        {removing ? <Text style={styles.statusNote}>{T('willRemove')}</Text> : null}
        {!!errors[pic.id] && <Text style={styles.errorText} testID={`pic-${pic.id}-error`}>{errors[pic.id]}</Text>}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => pick(pic.id)}
            disabled={saving}
            testID={`pic-${pic.id}-choose`}
            accessibilityRole="button"
          >
            <Text style={styles.primaryBtnText}>{uri ? T('change') : T('choose')}</Text>
          </TouchableOpacity>
          {(picked || removing) ? (
            <TouchableOpacity style={styles.ghostBtn} onPress={() => setEdit(pic.id, undefined)} disabled={saving} testID={`pic-${pic.id}-undo`} accessibilityRole="button">
              <Text style={styles.ghostBtnText}>{T('undo')}</Text>
            </TouchableOpacity>
          ) : saved ? (
            <TouchableOpacity style={styles.ghostBtn} onPress={() => setEdit(pic.id, 'remove')} disabled={saving} testID={`pic-${pic.id}-remove`} accessibilityRole="button">
              <Text style={[styles.ghostBtnText, { color: COLORS.danger }]}>{T('remove')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      {Header}
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
      >
        {loadFailed && !profile ? (
          <Text style={styles.errorText} testID="load-failed">{T('loadFail')}</Text>
        ) : (
          <>
            {/* Live preview of the top of the shop page */}
            <Text style={styles.sectionLabel}>{T('preview')}</Text>
            <View style={styles.hero}>
              <View style={styles.heroCover}>
                {bannerUri
                  ? <Image source={{ uri: bannerUri }} style={styles.previewImage} resizeMode="cover" />
                  : <View style={[styles.previewImage, { backgroundColor: COLORS.primaryFade }]} />}
              </View>
              <View style={styles.heroRow}>
                <View style={styles.heroLogo}>
                  {logoUri
                    ? <Image source={{ uri: logoUri }} style={styles.previewImage} resizeMode="cover" />
                    : <Text style={styles.heroLogoLetter}>{shopName.charAt(0).toUpperCase()}</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroName} numberOfLines={1}>{shopName}</Text>
                  <Text style={[styles.heroTagline, !tagline && { color: COLORS.textMuted }]} numberOfLines={2}>
                    {tagline || T('noTagline')}
                  </Text>
                </View>
              </View>
            </View>

            {PICTURES.map(renderPicture)}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{T('tagline')}</Text>
              <TextInput
                style={styles.input}
                value={tagline}
                onChangeText={(v) => setEdits((prev) => ({ ...prev, tagline: v }))}
                placeholder={T('taglinePlaceholder')}
                placeholderTextColor={COLORS.textMuted}
                maxLength={TAGLINE_MAX}
                editable={!saving}
                testID="shop-tagline"
              />
              <Text style={styles.counter}>{tagline.length}/{TAGLINE_MAX}</Text>
              {!!errors.tagline && <Text style={styles.errorText}>{errors.tagline}</Text>}

              <Text style={[styles.cardTitle, { marginTop: SPACING.base }]}>{T('description')}</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={description}
                onChangeText={(v) => setEdits((prev) => ({ ...prev, description: v }))}
                placeholder={T('descriptionPlaceholder')}
                placeholderTextColor={COLORS.textMuted}
                maxLength={DESCRIPTION_MAX}
                multiline
                textAlignVertical="top"
                editable={!saving}
                testID="shop-description"
              />
              <Text style={styles.counter}>{description.length}/{DESCRIPTION_MAX}</Text>
            </View>

            {!!errors.general && <Text style={styles.errorText} testID="save-error">{errors.general}</Text>}
          </>
        )}
      </ScrollView>

      {!(loadFailed && !profile) && (
        <View style={styles.saveBar}>
          <TouchableOpacity
            style={[styles.saveBtn, !canSave && styles.saveBtnOff]}
            onPress={save}
            disabled={!canSave}
            testID="shop-save"
            accessibilityRole="button"
          >
            <Text style={styles.saveBtnText}>
              {saving
                ? (progress > 0 && progress < 100 ? T('uploading', { n: progress }) : T('saving'))
                : (Object.keys(changes).length ? T('save') : T('nothingToSave'))}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerText: { marginTop: SPACING.base, color: COLORS.textMuted, fontSize: FONTS.sm },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.primary, paddingHorizontal: SPACING.base,
    paddingTop: Platform.OS === 'ios' ? 50 : SPACING.base, paddingBottom: SPACING.base,
  },
  headerBack: { fontSize: 22, color: 'white', fontWeight: FONTS.bold },
  headerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: 'white' },
  scroll: { padding: SPACING.base, paddingBottom: 120 },

  sectionLabel: { fontSize: FONTS.sm, color: COLORS.textMuted, marginBottom: SPACING.sm },
  hero: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.base },
  heroCover: { width: '100%', aspectRatio: 16 / 7, backgroundColor: COLORS.primaryFade },
  heroRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.base },
  heroLogo: {
    width: 56, height: 56, borderRadius: 28, overflow: 'hidden', marginRight: SPACING.md,
    backgroundColor: COLORS.primaryFade, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.surface,
  },
  heroLogoLetter: { fontSize: 24, fontWeight: FONTS.black, color: COLORS.primary },
  heroName: { fontSize: FONTS.md, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  heroTagline: { fontSize: FONTS.sm, color: COLORS.textSecondary, marginTop: 2 },

  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.base, marginBottom: SPACING.base, borderWidth: 1, borderColor: COLORS.border },
  cardTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  cardHint: { fontSize: FONTS.sm, color: COLORS.textSecondary, marginTop: 2, marginBottom: SPACING.md },
  cardSmall: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: SPACING.sm },

  previewBox: { backgroundColor: COLORS.primaryFade, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  previewLogo: { width: 112, height: 112, borderRadius: 56 },
  previewBanner: { width: '100%', aspectRatio: 16 / 7, borderRadius: RADIUS.lg },
  previewPoster: { width: '56%', aspectRatio: 4 / 5, borderRadius: RADIUS.lg },
  previewImage: { width: '100%', height: '100%' },
  previewEmpty: { fontSize: 30 },

  statusNote: { fontSize: FONTS.sm, color: COLORS.primaryDark, marginTop: SPACING.sm },
  errorText: { fontSize: FONTS.sm, color: COLORS.dangerText, backgroundColor: COLORS.dangerLight, borderRadius: RADIUS.md, padding: SPACING.sm, marginTop: SPACING.sm },

  buttonRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.md },
  primaryBtn: { backgroundColor: COLORS.primaryFade, borderRadius: RADIUS.full, paddingHorizontal: SPACING.lg, paddingVertical: 10, marginRight: SPACING.md },
  primaryBtnText: { color: COLORS.primaryDark, fontWeight: FONTS.bold, fontSize: FONTS.sm },
  ghostBtn: { paddingHorizontal: SPACING.sm, paddingVertical: 10 },
  ghostBtnText: { color: COLORS.textSecondary, fontWeight: FONTS.semiBold, fontSize: FONTS.sm },

  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md,
    paddingVertical: 10, fontSize: FONTS.base, color: COLORS.textPrimary, marginTop: SPACING.sm,
  },
  inputMulti: { minHeight: 110 },
  counter: { fontSize: FONTS.xs, color: COLORS.textMuted, alignSelf: 'flex-end', marginTop: 4 },

  saveBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: COLORS.surface,
    borderTopWidth: 1, borderTopColor: COLORS.border, padding: SPACING.base,
    paddingBottom: Platform.OS === 'ios' ? 28 : SPACING.base,
  },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingVertical: 14, alignItems: 'center' },
  saveBtnOff: { backgroundColor: COLORS.border },
  saveBtnText: { color: 'white', fontWeight: FONTS.bold, fontSize: FONTS.base },
});
