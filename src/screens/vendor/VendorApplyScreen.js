/**
 * VUMA Store — Vendor Apply Screen
 * African-style vendor registration with GPS shop location
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  TextInput, Alert, Platform, Modal, FlatList,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useDispatch } from 'react-redux';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../utils/constants';
import Button from '../../components/common/Button';
import { post } from '../../api/client';

const TANZANIA_CITIES = [
  'Dar es Salaam', 'Dodoma', 'Arusha', 'Mwanza', 'Mbeya',
  'Morogoro', 'Tanga', 'Zanzibar', 'Tabora', 'Kigoma',
  'Moshi', 'Iringa', 'Songea', 'Lindi', 'Mtwara', 'Other',
];

const BUSINESS_TYPES = [
  { value: 'individual', label: '👤 Individual Seller', desc: 'Sell as an individual' },
  { value: 'small_business', label: '🏪 Small Business', desc: 'Registered duka/shop' },
  { value: 'company', label: '🏢 Company', desc: 'Registered company' },
];

const EMPTY_FORM = {
  shop_name: '',
  contact_phone: '',
  business_type: 'individual',
  city: 'Dar es Salaam',
  ward: '',
  landmark: '',
  building_detail: '',
  latitude: null,
  longitude: null,
  gps_accuracy: null,
  shop_description: '',
};

const CityPicker = ({ visible, onSelect, onClose }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.pickerOverlay}>
      <View style={styles.pickerContainer}>
        <View style={styles.pickerHeader}>
          <Text style={styles.pickerTitle}>Select City</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.pickerClose}>✕</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={TANZANIA_CITIES}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.pickerItem} onPress={() => { onSelect(item); onClose(); }}>
              <Text style={styles.pickerItemText}>📍 {item}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      </View>
    </View>
  </Modal>
);

export default function VendorApplyScreen({ navigation }) {
  const [form, setFormState] = useState(EMPTY_FORM);
  const [loading, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [step, setStep] = useState(1); // 1=business info, 2=location, 3=review

  const setField = (key, value) => setFormState(prev => ({ ...prev, [key]: value }));

  const getGPSLocation = async () => {
    setGpsLoading(true);
    try {
      const Location = await import('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow location access.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setFormState(prev => ({
        ...prev,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        gps_accuracy: loc.coords.accuracy,
      }));
      Alert.alert('📍 Location Captured!', `Accuracy: ±${Math.round(loc.coords.accuracy)}m`);
    } catch {
      Alert.alert('Error', 'Could not get GPS. Try again.');
    } finally {
      setGpsLoading(false);
    }
  };

  const validateStep1 = () => {
    if (!form.shop_name.trim()) { Alert.alert('Required', 'Shop name is required.'); return false; }
    if (!form.contact_phone.trim()) { Alert.alert('Required', 'Phone number is required.'); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (!form.city.trim()) { Alert.alert('Required', 'City is required.'); return false; }
    if (!form.ward.trim()) { Alert.alert('Required', 'Ward/Area is required.'); return false; }
    return true;
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await post('/vendors/applications/apply/', {
        shop_name: form.shop_name.trim(),
        contact_phone: form.contact_phone.trim(),
        business_type: form.business_type,
        city: form.city,
        ward: form.ward.trim(),
        landmark: form.landmark.trim(),
        building_detail: form.building_detail.trim(),
        latitude: form.latitude,
        longitude: form.longitude,
        shop_description: form.shop_description.trim(),
      });
      Alert.alert(
        '🎉 Application Submitted!',
        'We will review your application and notify you within 24 hours.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      Alert.alert('Error', 'Could not submit application. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Step 1: Business Info ──────────────────────────
  const Step1 = () => (
    <View>
      <Text style={styles.stepTitle}>🏪 Business Information</Text>

      <Text style={styles.fieldLabel}>Business Type</Text>
      {BUSINESS_TYPES.map(bt => (
        <TouchableOpacity
          key={bt.value}
          style={[styles.typeCard, form.business_type === bt.value && styles.typeCardActive]}
          onPress={() => setField('business_type', bt.value)}
        >
          <Text style={styles.typeLabel}>{bt.label}</Text>
          <Text style={styles.typeDesc}>{bt.desc}</Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.fieldLabel}>Shop / Business Name *</Text>
      <TextInput
        style={styles.input}
        value={form.shop_name}
        onChangeText={v => setField('shop_name', v)}
        placeholder="e.g. Mama Fatuma's Duka, TechHub Tanzania"
        placeholderTextColor={COLORS.textLight}
      />

      <Text style={styles.fieldLabel}>Phone Number *</Text>
      <TextInput
        style={styles.input}
        value={form.contact_phone}
        onChangeText={v => setField('contact_phone', v)}
        placeholder="+255 7XX XXX XXX"
        keyboardType="phone-pad"
        placeholderTextColor={COLORS.textLight}
      />

      <Text style={styles.fieldLabel}>Shop Description</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={form.shop_description}
        onChangeText={v => setField('shop_description', v)}
        placeholder="What do you sell? e.g. Fresh vegetables, Electronics, Clothing..."
        multiline numberOfLines={3}
        textAlignVertical="top"
        placeholderTextColor={COLORS.textLight}
      />

      <Button
        title="Next: Location →"
        onPress={() => { if (validateStep1()) setStep(2); }}
        fullWidth style={styles.nextBtn}
      />
    </View>
  );

  // ── Step 2: Location ───────────────────────────────
  const Step2 = () => (
    <View>
      <Text style={styles.stepTitle}>📍 Shop Location</Text>

      {/* GPS */}
      <TouchableOpacity
        style={[styles.gpsBtn, form.latitude && styles.gpsBtnActive]}
        onPress={getGPSLocation}
        disabled={gpsLoading}
      >
        <Text style={styles.gpsBtnIcon}>📍</Text>
        <View style={styles.gpsBtnContent}>
          <Text style={styles.gpsBtnTitle}>
            {gpsLoading ? 'Getting location...' : form.latitude ? 'GPS Location Captured ✓' : 'Pin My Shop Location'}
          </Text>
          {form.latitude ? (
            <Text style={styles.gpsBtnSub}>
              {Number(form.latitude).toFixed(5)}, {Number(form.longitude).toFixed(5)}
              {form.gps_accuracy ? ` (±${Math.round(form.gps_accuracy)}m)` : ''}
            </Text>
          ) : (
            <Text style={styles.gpsBtnSub}>Helps customers and riders find your shop</Text>
          )}
        </View>
      </TouchableOpacity>

      <Text style={styles.fieldLabel}>City *</Text>
      <TouchableOpacity style={styles.selectorInput} onPress={() => setShowCityPicker(true)}>
        <Text style={form.city ? styles.selectorValue : styles.selectorPlaceholder}>
          {form.city || 'Select city...'}
        </Text>
        <Text>▼</Text>
      </TouchableOpacity>

      <Text style={styles.fieldLabel}>Ward / Area *</Text>
      <TextInput
        style={styles.input}
        value={form.ward}
        onChangeText={v => setField('ward', v)}
        placeholder="e.g. Kinondoni, Ilala, Kariakoo"
        placeholderTextColor={COLORS.textLight}
      />

      <Text style={styles.fieldLabel}>Nearby Landmark <Text style={styles.optional}>(helps riders)</Text></Text>
      <TextInput
        style={styles.input}
        value={form.landmark}
        onChangeText={v => setField('landmark', v)}
        placeholder="e.g. Near Kariakoo Market, Next to CRDB Bank"
        placeholderTextColor={COLORS.textLight}
      />

      <Text style={styles.fieldLabel}>Building / Floor / Shop No. <Text style={styles.optional}>(optional)</Text></Text>
      <TextInput
        style={styles.input}
        value={form.building_detail}
        onChangeText={v => setField('building_detail', v)}
        placeholder="e.g. Sumu Tower, Ground Floor, Shop 12"
        placeholderTextColor={COLORS.textLight}
      />

      <View style={styles.stepBtns}>
        <TouchableOpacity style={styles.backStepBtn} onPress={() => setStep(1)}>
          <Text style={styles.backStepText}>← Back</Text>
        </TouchableOpacity>
        <Button
          title="Review →"
          onPress={() => { if (validateStep2()) setStep(3); }}
          style={styles.nextBtnHalf}
        />
      </View>
    </View>
  );

  // ── Step 3: Review ─────────────────────────────────
  const Step3 = () => (
    <View>
      <Text style={styles.stepTitle}>✅ Review & Submit</Text>

      <View style={styles.reviewCard}>
        <Text style={styles.reviewSectionTitle}>🏪 Business</Text>
        <Text style={styles.reviewRow}><Text style={styles.reviewLabel}>Name: </Text>{form.shop_name}</Text>
        <Text style={styles.reviewRow}><Text style={styles.reviewLabel}>Phone: </Text>{form.contact_phone}</Text>
        <Text style={styles.reviewRow}><Text style={styles.reviewLabel}>Type: </Text>{BUSINESS_TYPES.find(b => b.value === form.business_type)?.label}</Text>
        {form.shop_description ? <Text style={styles.reviewRow}><Text style={styles.reviewLabel}>About: </Text>{form.shop_description}</Text> : null}
      </View>

      <View style={styles.reviewCard}>
        <Text style={styles.reviewSectionTitle}>📍 Location</Text>
        <Text style={styles.reviewRow}><Text style={styles.reviewLabel}>City: </Text>{form.city}</Text>
        <Text style={styles.reviewRow}><Text style={styles.reviewLabel}>Ward: </Text>{form.ward}</Text>
        {form.landmark ? <Text style={styles.reviewRow}><Text style={styles.reviewLabel}>Landmark: </Text>{form.landmark}</Text> : null}
        {form.building_detail ? <Text style={styles.reviewRow}><Text style={styles.reviewLabel}>Building: </Text>{form.building_detail}</Text> : null}
        {form.latitude ? (
          <Text style={styles.reviewRow}><Text style={styles.reviewLabel}>GPS: </Text>✅ Captured</Text>
        ) : (
          <Text style={[styles.reviewRow, { color: COLORS.warning }]}>⚠️ No GPS — riders may have trouble finding you</Text>
        )}
      </View>

      <View style={styles.termsCard}>
        <Text style={styles.termsText}>
          By submitting, you agree to VUMA's vendor terms. A 10% commission applies per sale.
          We'll review your application within 24 hours.
        </Text>
      </View>

      <View style={styles.stepBtns}>
        <TouchableOpacity style={styles.backStepBtn} onPress={() => setStep(2)}>
          <Text style={styles.backStepText}>← Edit</Text>
        </TouchableOpacity>
        <Button
          title="Submit Application"
          onPress={handleSubmit}
          loading={loading}
          style={styles.nextBtnHalf}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Become a Vendor</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        {[1, 2, 3].map(s => (
          <View key={s} style={styles.progressStep}>
            <View style={[styles.progressDot, step >= s && styles.progressDotActive]}>
              <Text style={[styles.progressDotText, step >= s && styles.progressDotTextActive]}>{s}</Text>
            </View>
            <Text style={[styles.progressLabel, step >= s && styles.progressLabelActive]}>
              {s === 1 ? 'Business' : s === 2 ? 'Location' : 'Review'}
            </Text>
          </View>
        ))}
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="always"
        enableOnAndroid extraScrollHeight={100}
      >
        {step === 1 && <Step1 />}
        {step === 2 && <Step2 />}
        {step === 3 && <Step3 />}
        <View style={{ height: 60 }} />
      </KeyboardAwareScrollView>

      <CityPicker
        visible={showCityPicker}
        onSelect={city => setField('city', city)}
        onClose={() => setShowCityPicker(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, paddingHorizontal: SPACING.base, paddingTop: Platform.OS === 'ios' ? SPACING['3xl'] : SPACING.base, paddingBottom: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  headerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  backBtn: { fontSize: FONTS.xl, color: COLORS.primary, fontWeight: FONTS.bold },
  progressBar: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: COLORS.surface, paddingVertical: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  progressStep: { alignItems: 'center', gap: 4 },
  progressDot: { width: 28, height: 28, borderRadius: RADIUS.full, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface },
  progressDotActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  progressDotText: { fontSize: FONTS.sm, color: COLORS.textMuted, fontWeight: FONTS.bold },
  progressDotTextActive: { color: 'white' },
  progressLabel: { fontSize: FONTS.xs, color: COLORS.textMuted },
  progressLabelActive: { color: COLORS.primary, fontWeight: FONTS.semiBold },
  scroll: { padding: SPACING.base },
  stepTitle: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.base },
  fieldLabel: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary, marginBottom: SPACING.xs, marginTop: SPACING.sm },
  optional: { fontSize: FONTS.xs, color: COLORS.textMuted, fontWeight: FONTS.regular },
  input: { backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 2, fontSize: FONTS.base, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  textArea: { minHeight: 80, textAlignVertical: 'top', paddingTop: SPACING.sm },
  typeCard: { padding: SPACING.base, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface, marginBottom: SPACING.sm },
  typeCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryFade },
  typeLabel: { fontSize: FONTS.base, fontWeight: FONTS.semiBold, color: COLORS.textPrimary },
  typeDesc: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  gpsBtn: { flexDirection: 'row', alignItems: 'center', padding: SPACING.base, borderRadius: RADIUS.xl, borderWidth: 2, borderColor: COLORS.primary, backgroundColor: COLORS.primaryFade, marginBottom: SPACING.base, gap: SPACING.sm },
  gpsBtnActive: { borderColor: COLORS.success, backgroundColor: '#E8F5E9' },
  gpsBtnIcon: { fontSize: 28 },
  gpsBtnContent: { flex: 1 },
  gpsBtnTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.primary },
  gpsBtnSub: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  selectorInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 4, marginBottom: SPACING.xs },
  selectorValue: { fontSize: FONTS.base, color: COLORS.textPrimary },
  selectorPlaceholder: { fontSize: FONTS.base, color: COLORS.textLight },
  nextBtn: { marginTop: SPACING.xl },
  stepBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xl },
  backStepBtn: { flex: 1, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.xl, alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.base },
  backStepText: { fontSize: FONTS.base, color: COLORS.textSecondary, fontWeight: FONTS.semiBold },
  nextBtnHalf: { flex: 2 },
  reviewCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.base, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.divider },
  reviewSectionTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  reviewRow: { fontSize: FONTS.sm, color: COLORS.textSecondary, marginBottom: 4 },
  reviewLabel: { fontWeight: FONTS.semiBold, color: COLORS.textPrimary },
  termsCard: { backgroundColor: COLORS.primaryFade, borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.base },
  termsText: { fontSize: FONTS.sm, color: COLORS.textSecondary, lineHeight: 20 },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerContainer: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS['2xl'], borderTopRightRadius: RADIUS['2xl'], maxHeight: '70%', paddingBottom: Platform.OS === 'ios' ? 34 : 16 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  pickerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  pickerClose: { fontSize: FONTS.xl, color: COLORS.textMuted, fontWeight: FONTS.bold },
  pickerItem: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  pickerItemText: { fontSize: FONTS.base, color: COLORS.textPrimary },
});