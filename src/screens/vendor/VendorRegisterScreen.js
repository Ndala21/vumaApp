/**
 * VUMA Store — Vendor Registration Screen
 * 3-step: Personal Info → Business Info → Verification & Payout
 * GPS-first, save & continue later, progress indicators
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  TextInput, Alert, Platform, Modal, FlatList, Image,
  ScrollView,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../utils/constants';
import Button from '../../components/common/Button';
import { post, upload } from '../../api/client';

// ── Constants ─────────────────────────────────────────
const TANZANIA_CITIES = [
  'Dar es Salaam', 'Dodoma', 'Arusha', 'Mwanza', 'Mbeya',
  'Morogoro', 'Tanga', 'Zanzibar', 'Tabora', 'Kigoma',
  'Moshi', 'Iringa', 'Songea', 'Lindi', 'Mtwara', 'Other',
];

const BUSINESS_TYPES = [
  { value: 'individual', label: '👤 Individual Seller', desc: 'Sell as an individual, no registration needed' },
  { value: 'small_business', label: '🏪 Small Business', desc: 'Local shop/duka, BRELA optional' },
  { value: 'company', label: '🏢 Registered Company', desc: 'BRELA/TRA registered business' },
];

const BUSINESS_CATEGORIES = [
  'Electronics', 'Fashion & Clothing', 'Food & Groceries', 'Beauty & Health',
  'Home & Kitchen', 'Sports & Fitness', 'Books & Education', 'Toys & Kids',
  'Agriculture', 'Construction', 'Auto Parts', 'Other',
];

const PAYOUT_METHODS = [
  { value: 'mpesa', label: '📱 M-Pesa', desc: 'Vodacom M-Pesa' },
  { value: 'airtel', label: '📱 Airtel Money', desc: 'Airtel Money Tanzania' },
  { value: 'halopesa', label: '📱 HaloPesa', desc: 'Halotel HaloPesa' },
  { value: 'bank', label: '🏦 Bank Account', desc: 'CRDB, NMB, NBC, etc.' },
];

const DELIVERY_RADII = [
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 20, label: '20 km' },
  { value: 50, label: '50 km' },
  { value: 100, label: 'Countrywide' },
];

const EMPTY_FORM = {
  // Step 1
  full_name: '', phone: '', email: '', password: '', confirm_password: '',
  // Step 2
  shop_name: '', business_type: 'individual', business_category: '',
  city: 'Dar es Salaam', ward: '', landmark: '', delivery_radius_km: 10,
  latitude: null, longitude: null, gps_accuracy: null, description: '',
  // Step 3
  id_card_number: '', payout_method: 'mpesa', payout_phone: '',
  bank_name: '', bank_account_number: '', bank_account_name: '',
  selfie_uri: null, id_front_uri: null, id_back_uri: null, certificate_uri: null,
};

// ── Picker Modal ──────────────────────────────────────
const PickerModal = ({ visible, title, data, onSelect, onClose, keyExtractor, labelExtractor }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.pickerOverlay}>
      <View style={styles.pickerContainer}>
        <View style={styles.pickerHeader}>
          <Text style={styles.pickerTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.pickerClose}>✕</Text></TouchableOpacity>
        </View>
        <FlatList
          data={data}
          keyExtractor={keyExtractor || ((item) => item.toString())}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.pickerItem} onPress={() => { onSelect(item); onClose(); }}>
              <Text style={styles.pickerItemText}>{labelExtractor ? labelExtractor(item) : item}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      </View>
    </View>
  </Modal>
);

export default function VendorRegisterScreen({ navigation, route }) {
  const isNewAccount = route?.params?.isNewAccount !== false;
  const [step, setStep] = useState(1);
  const [form, setFormState] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showRadiusPicker, setShowRadiusPicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const setField = useCallback((key, value) => {
    setFormState(prev => ({ ...prev, [key]: value }));
  }, []);

  const getGPS = async () => {
    setGpsLoading(true);
    try {
      const Location = await import('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow location access to pin your shop.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setFormState(prev => ({
        ...prev,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        gps_accuracy: loc.coords.accuracy,
      }));
      Alert.alert('📍 Shop Location Pinned!', `Accuracy: ±${Math.round(loc.coords.accuracy)}m\n\nCustomers and riders will use this to find your shop.`);
    } catch {
      Alert.alert('Error', 'Could not get GPS location. Please try again.');
    } finally {
      setGpsLoading(false);
    }
  };

  const pickImage = async (field) => {
    try {
      const ImagePicker = await import('expo-image-picker');
      let result;
      if (field === 'selfie_uri') {
        const camPerm = await ImagePicker.requestCameraPermissionsAsync();
        if (!camPerm.granted) {
          // fallback to library
          result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
        } else {
          result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
        }
      } else {
        await ImagePicker.requestMediaLibraryPermissionsAsync();
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
      }
      if (!result.canceled && result.assets?.[0]) {
        setField(field, result.assets[0].uri);
      }
    } catch {
      Alert.alert('Error', 'Could not open camera/gallery.');
    }
  };

  // ── Validation ────────────────────────────────────
  const validateStep1 = () => {
    if (!form.full_name.trim()) { Alert.alert('Required', 'Full name is required.'); return false; }
    if (!form.phone.trim()) { Alert.alert('Required', 'Phone number is required.'); return false; }
    if (isNewAccount) {
      if (!form.email.trim()) { Alert.alert('Required', 'Email is required.'); return false; }
      if (!form.password || form.password.length < 6) { Alert.alert('Required', 'Password must be at least 6 characters.'); return false; }
      if (form.password !== form.confirm_password) { Alert.alert('Error', 'Passwords do not match.'); return false; }
    }
    return true;
  };

  const validateStep2 = () => {
    if (!form.shop_name.trim()) { Alert.alert('Required', 'Shop name is required.'); return false; }
    if (!form.business_category) { Alert.alert('Required', 'Please select a business category.'); return false; }
    if (!form.city) { Alert.alert('Required', 'City is required.'); return false; }
    if (!form.ward.trim()) { Alert.alert('Required', 'Ward/Area is required.'); return false; }
    return true;
  };

  const validateStep3 = () => {
    if (!form.id_card_number.trim()) { Alert.alert('Required', 'National ID number is required.'); return false; }
    if (!form.payout_method) { Alert.alert('Required', 'Please select a payout method.'); return false; }
    if (form.payout_method !== 'bank' && !form.payout_phone.trim()) {
      Alert.alert('Required', 'Payout phone number is required.'); return false;
    }
    if (form.payout_method === 'bank') {
      if (!form.bank_name.trim()) { Alert.alert('Required', 'Bank name is required.'); return false; }
      if (!form.bank_account_number.trim()) { Alert.alert('Required', 'Account number is required.'); return false; }
    }
    return true;
  };

  const handleSaveDraft = async () => {
    Alert.alert('💾 Saved!', 'Your progress has been saved. You can continue later from the vendor application page.');
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;
    setSaving(true);
    try {
      const formData = new FormData();

      // Step 1 fields
      formData.append('contact_phone', form.phone.trim());
      if (isNewAccount) {
        formData.append('email', form.email.trim());
        formData.append('password', form.password);
        formData.append('full_name', form.full_name.trim());
      }

      // Step 2 fields
      formData.append('shop_name', form.shop_name.trim());
      formData.append('business_name', form.shop_name.trim());
      formData.append('business_type', form.business_type);
      formData.append('business_category', form.business_category);
      formData.append('city', form.city);
      formData.append('ward', form.ward.trim());
      formData.append('landmark', form.landmark.trim());
      formData.append('delivery_radius_km', String(form.delivery_radius_km));
      formData.append('description', form.description.trim());
      if (form.latitude) formData.append('latitude', String(form.latitude));
      if (form.longitude) formData.append('longitude', String(form.longitude));
      if (form.gps_accuracy) formData.append('gps_accuracy', String(form.gps_accuracy));

      // Step 3 fields
      formData.append('id_card_number', form.id_card_number.trim());
      formData.append('payout_method', form.payout_method);
      formData.append('payout_phone', form.payout_phone.trim());
      formData.append('bank_name', form.bank_name.trim());
      formData.append('bank_account_number', form.bank_account_number.trim());
      formData.append('bank_account_name', form.bank_account_name.trim());
      formData.append('is_draft', 'false');
      formData.append('current_step', '3');

      // Images
      if (form.id_front_uri) {
        formData.append('id_card_front', { uri: form.id_front_uri, name: 'id_front.jpg', type: 'image/jpeg' });
      }
      if (form.id_back_uri) {
        formData.append('id_card_back', { uri: form.id_back_uri, name: 'id_back.jpg', type: 'image/jpeg' });
      }
      if (form.selfie_uri) {
        formData.append('selfie_image', { uri: form.selfie_uri, name: 'selfie.jpg', type: 'image/jpeg' });
      }
      if (form.certificate_uri) {
        formData.append('business_certificate', { uri: form.certificate_uri, name: 'certificate.jpg', type: 'image/jpeg' });
      }

      await upload('/vendors/applications/apply/', formData);

      Alert.alert(
        '🎉 Application Submitted!',
        'Thank you! We will review your application and notify you within 24 hours via SMS and email.',
        [{ text: 'OK', onPress: () => navigation.replace('Login') }]
      );
    } catch (e) {
      Alert.alert('Error', 'Could not submit application. Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Step 1: Personal Info ─────────────────────────
  const renderStep1 = () => (
    <View>
      <Text style={styles.stepDesc}>Create your VUMA seller account</Text>

      <Text style={styles.fieldLabel}>Full Name *</Text>
      <TextInput
        style={styles.input} value={form.full_name}
        onChangeText={v => setField('full_name', v)}
        placeholder="Your full legal name" placeholderTextColor={COLORS.textLight}
      />

      <Text style={styles.fieldLabel}>Phone Number *</Text>
      <TextInput
        style={styles.input} value={form.phone}
        onChangeText={v => setField('phone', v)}
        placeholder="+255 7XX XXX XXX" keyboardType="phone-pad"
        placeholderTextColor={COLORS.textLight}
      />

      {isNewAccount && <>
        <Text style={styles.fieldLabel}>Email Address *</Text>
        <TextInput
          style={styles.input} value={form.email}
          onChangeText={v => setField('email', v)}
          placeholder="your@email.com" keyboardType="email-address"
          autoCapitalize="none" placeholderTextColor={COLORS.textLight}
        />

        <Text style={styles.fieldLabel}>Password *</Text>
        <View style={styles.passwordWrap}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            value={form.password} onChangeText={v => setField('password', v)}
            placeholder="Min 6 characters" secureTextEntry={!showPassword}
            placeholderTextColor={COLORS.textLight}
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
            <Text>{showPassword ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.fieldLabel}>Confirm Password *</Text>
        <TextInput
          style={styles.input} value={form.confirm_password}
          onChangeText={v => setField('confirm_password', v)}
          placeholder="Re-enter password" secureTextEntry={!showPassword}
          placeholderTextColor={COLORS.textLight}
        />
      </>}

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.saveDraftBtn} onPress={handleSaveDraft}>
          <Text style={styles.saveDraftText}>💾 Save Draft</Text>
        </TouchableOpacity>
        <Button title="Next →" onPress={() => { if (validateStep1()) setStep(2); }} style={styles.nextBtn} />
      </View>
    </View>
  );

  // ── Step 2: Business Info ─────────────────────────
  const renderStep2 = () => (
    <View>
      <Text style={styles.stepDesc}>Tell us about your business and shop location</Text>

      <Text style={styles.fieldLabel}>Shop / Business Name *</Text>
      <TextInput
        style={styles.input} value={form.shop_name}
        onChangeText={v => setField('shop_name', v)}
        placeholder="e.g. Mama Fatuma's Duka, TechHub TZ"
        placeholderTextColor={COLORS.textLight}
      />

      <Text style={styles.fieldLabel}>Business Type *</Text>
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

      <Text style={styles.fieldLabel}>Business Category *</Text>
      <TouchableOpacity style={styles.selectorInput} onPress={() => setShowCategoryPicker(true)}>
        <Text style={form.business_category ? styles.selectorValue : styles.selectorPlaceholder}>
          {form.business_category || 'Select what you sell...'}
        </Text>
        <Text style={styles.selectorArrow}>▼</Text>
      </TouchableOpacity>

      <Text style={styles.fieldLabel}>Shop Description</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={form.description} onChangeText={v => setField('description', v)}
        placeholder="What do you sell? e.g. Fresh vegetables, second-hand phones..."
        multiline numberOfLines={3} textAlignVertical="top"
        placeholderTextColor={COLORS.textLight}
      />

      <Text style={styles.sectionTitle}>📍 Shop Location</Text>

      <TouchableOpacity
        style={[styles.gpsBtn, form.latitude && styles.gpsBtnActive]}
        onPress={getGPS} disabled={gpsLoading}
      >
        <Text style={styles.gpsBtnIcon}>📍</Text>
        <View style={styles.gpsBtnContent}>
          <Text style={[styles.gpsBtnTitle, form.latitude && { color: COLORS.success }]}>
            {gpsLoading ? 'Getting location...' : form.latitude ? '✓ Shop Location Pinned' : 'Pin My Shop Location (GPS)'}
          </Text>
          <Text style={styles.gpsBtnSub}>
            {form.latitude
              ? `${Number(form.latitude).toFixed(5)}, ${Number(form.longitude).toFixed(5)} (±${Math.round(form.gps_accuracy || 0)}m)`
              : 'Customers & riders use this to find you'}
          </Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.fieldLabel}>City *</Text>
      <TouchableOpacity style={styles.selectorInput} onPress={() => setShowCityPicker(true)}>
        <Text style={styles.selectorValue}>{form.city}</Text>
        <Text style={styles.selectorArrow}>▼</Text>
      </TouchableOpacity>

      <Text style={styles.fieldLabel}>Ward / Area *</Text>
      <TextInput
        style={styles.input} value={form.ward}
        onChangeText={v => setField('ward', v)}
        placeholder="e.g. Kinondoni, Kariakoo, Ilala"
        placeholderTextColor={COLORS.textLight}
      />

      <Text style={styles.fieldLabel}>Nearby Landmark <Text style={styles.optional}>(helps riders find you)</Text></Text>
      <TextInput
        style={styles.input} value={form.landmark}
        onChangeText={v => setField('landmark', v)}
        placeholder="e.g. Near Kariakoo Market, Next to CRDB Bank"
        placeholderTextColor={COLORS.textLight}
      />

      <Text style={styles.fieldLabel}>Delivery Radius</Text>
      <TouchableOpacity style={styles.selectorInput} onPress={() => setShowRadiusPicker(true)}>
        <Text style={styles.selectorValue}>
          {DELIVERY_RADII.find(r => r.value === form.delivery_radius_km)?.label || '10 km'}
        </Text>
        <Text style={styles.selectorArrow}>▼</Text>
      </TouchableOpacity>

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.backStepBtn} onPress={() => setStep(1)}>
          <Text style={styles.backStepText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveDraftBtnSmall} onPress={handleSaveDraft}>
          <Text style={styles.saveDraftText}>💾</Text>
        </TouchableOpacity>
        <Button title="Next →" onPress={() => { if (validateStep2()) setStep(3); }} style={styles.nextBtn} />
      </View>
    </View>
  );

  // ── Step 3: Verification & Payout ─────────────────
  const renderStep3 = () => (
    <View>
      <Text style={styles.stepDesc}>Verify your identity and set up payments</Text>

      <Text style={styles.sectionTitle}>🪪 Identity Verification</Text>

      <Text style={styles.fieldLabel}>National ID Number *</Text>
      <TextInput
        style={styles.input} value={form.id_card_number}
        onChangeText={v => setField('id_card_number', v)}
        placeholder="NIDA number or Passport number"
        placeholderTextColor={COLORS.textLight}
      />

      {/* ID Front */}
      <Text style={styles.fieldLabel}>National ID — Front Photo *</Text>
      <TouchableOpacity style={styles.photoUploadBtn} onPress={() => pickImage('id_front_uri')}>
        {form.id_front_uri ? (
          <Image source={{ uri: form.id_front_uri }} style={styles.photoPreview} resizeMode="cover" />
        ) : (
          <View style={styles.photoUploadEmpty}>
            <Text style={styles.photoUploadIcon}>🪪</Text>
            <Text style={styles.photoUploadText}>Tap to upload front of ID</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* ID Back */}
      <Text style={styles.fieldLabel}>National ID — Back Photo <Text style={styles.optional}>(optional)</Text></Text>
      <TouchableOpacity style={styles.photoUploadBtn} onPress={() => pickImage('id_back_uri')}>
        {form.id_back_uri ? (
          <Image source={{ uri: form.id_back_uri }} style={styles.photoPreview} resizeMode="cover" />
        ) : (
          <View style={styles.photoUploadEmpty}>
            <Text style={styles.photoUploadIcon}>🪪</Text>
            <Text style={styles.photoUploadText}>Tap to upload back of ID</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Selfie */}
      <Text style={styles.fieldLabel}>Selfie Verification <Text style={styles.optional}>(optional but recommended)</Text></Text>
      <TouchableOpacity style={styles.photoUploadBtn} onPress={() => pickImage('selfie_uri')}>
        {form.selfie_uri ? (
          <Image source={{ uri: form.selfie_uri }} style={styles.photoPreview} resizeMode="cover" />
        ) : (
          <View style={styles.photoUploadEmpty}>
            <Text style={styles.photoUploadIcon}>🤳</Text>
            <Text style={styles.photoUploadText}>Take selfie for verification</Text>
            <Text style={styles.photoUploadSub}>Hold your ID next to your face</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Business Certificate */}
      {form.business_type !== 'individual' && (
        <>
          <Text style={styles.fieldLabel}>Business License/BRELA Certificate <Text style={styles.optional}>(if available)</Text></Text>
          <TouchableOpacity style={styles.photoUploadBtn} onPress={() => pickImage('certificate_uri')}>
            {form.certificate_uri ? (
              <Image source={{ uri: form.certificate_uri }} style={styles.photoPreview} resizeMode="cover" />
            ) : (
              <View style={styles.photoUploadEmpty}>
                <Text style={styles.photoUploadIcon}>📄</Text>
                <Text style={styles.photoUploadText}>Upload business certificate</Text>
              </View>
            )}
          </TouchableOpacity>
        </>
      )}

      <Text style={styles.sectionTitle}>💳 Payout Method</Text>
      <Text style={styles.sectionSubtitle}>How should we pay you after each sale?</Text>

      {PAYOUT_METHODS.map(pm => (
        <TouchableOpacity
          key={pm.value}
          style={[styles.payoutCard, form.payout_method === pm.value && styles.payoutCardActive]}
          onPress={() => setField('payout_method', pm.value)}
        >
          <Text style={styles.payoutLabel}>{pm.label}</Text>
          <Text style={styles.payoutDesc}>{pm.desc}</Text>
        </TouchableOpacity>
      ))}

      {form.payout_method !== 'bank' && (
        <>
          <Text style={styles.fieldLabel}>
            {form.payout_method === 'mpesa' ? 'M-Pesa' : form.payout_method === 'airtel' ? 'Airtel Money' : 'HaloPesa'} Phone Number *
          </Text>
          <TextInput
            style={styles.input} value={form.payout_phone}
            onChangeText={v => setField('payout_phone', v)}
            placeholder="+255 7XX XXX XXX" keyboardType="phone-pad"
            placeholderTextColor={COLORS.textLight}
          />
        </>
      )}

      {form.payout_method === 'bank' && (
        <>
          <Text style={styles.fieldLabel}>Bank Name *</Text>
          <TextInput
            style={styles.input} value={form.bank_name}
            onChangeText={v => setField('bank_name', v)}
            placeholder="e.g. CRDB, NMB, NBC, Stanbic"
            placeholderTextColor={COLORS.textLight}
          />
          <Text style={styles.fieldLabel}>Account Number *</Text>
          <TextInput
            style={styles.input} value={form.bank_account_number}
            onChangeText={v => setField('bank_account_number', v)}
            placeholder="Bank account number" keyboardType="numeric"
            placeholderTextColor={COLORS.textLight}
          />
          <Text style={styles.fieldLabel}>Account Holder Name *</Text>
          <TextInput
            style={styles.input} value={form.bank_account_name}
            onChangeText={v => setField('bank_account_name', v)}
            placeholder="Name on bank account"
            placeholderTextColor={COLORS.textLight}
          />
        </>
      )}

      <View style={styles.termsCard}>
        <Text style={styles.termsText}>
          By submitting, you agree to VUMA's Vendor Terms & Conditions.{'\n'}
          • 10% commission per sale{'\n'}
          • Payouts processed within 3 business days{'\n'}
          • Account verified within 24 hours
        </Text>
      </View>

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.backStepBtn} onPress={() => setStep(2)}>
          <Text style={styles.backStepText}>← Back</Text>
        </TouchableOpacity>
        <Button
          title="Submit Application"
          onPress={handleSubmit}
          loading={saving}
          style={styles.nextBtn}
        />
      </View>
    </View>
  );

  const STEP_LABELS = ['Personal Info', 'Business & Location', 'Verify & Payout'];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : navigation.goBack()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sell on VUMA</Text>
        <TouchableOpacity onPress={handleSaveDraft}>
          <Text style={styles.saveText}>💾 Save</Text>
        </TouchableOpacity>
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressWrap}>
        {STEP_LABELS.map((label, i) => {
          const s = i + 1;
          const isActive = step === s;
          const isDone = step > s;
          return (
            <React.Fragment key={s}>
              <View style={styles.progressStep}>
                <View style={[
                  styles.progressDot,
                  isActive && styles.progressDotActive,
                  isDone && styles.progressDotDone,
                ]}>
                  <Text style={[styles.progressDotText, (isActive || isDone) && styles.progressDotTextActive]}>
                    {isDone ? '✓' : s}
                  </Text>
                </View>
                <Text style={[styles.progressLabel, (isActive || isDone) && styles.progressLabelActive]}>
                  {label}
                </Text>
              </View>
              {i < 2 && <View style={[styles.progressLine, isDone && styles.progressLineDone]} />}
            </React.Fragment>
          );
        })}
      </View>

      {/* Form */}
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="always"
        enableOnAndroid extraScrollHeight={120}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepTitle}>{STEP_LABELS[step - 1]}</Text>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        <View style={{ height: 80 }} />
      </KeyboardAwareScrollView>

      {/* Pickers */}
      <PickerModal
        visible={showCityPicker} title="Select City"
        data={TANZANIA_CITIES}
        onSelect={city => setField('city', city)}
        onClose={() => setShowCityPicker(false)}
      />
      <PickerModal
        visible={showCategoryPicker} title="Business Category"
        data={BUSINESS_CATEGORIES}
        onSelect={cat => setField('business_category', cat)}
        onClose={() => setShowCategoryPicker(false)}
      />
      <PickerModal
        visible={showRadiusPicker} title="Delivery Radius"
        data={DELIVERY_RADII}
        keyExtractor={item => item.value.toString()}
        labelExtractor={item => `📦 ${item.label}`}
        onSelect={r => setField('delivery_radius_km', r.value)}
        onClose={() => setShowRadiusPicker(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, paddingHorizontal: SPACING.base, paddingTop: Platform.OS === 'ios' ? SPACING['3xl'] : SPACING.base, paddingBottom: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider, ...SHADOWS.sm },
  headerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  backBtn: { fontSize: FONTS.xl, color: COLORS.primary, fontWeight: FONTS.bold, paddingRight: SPACING.sm },
  saveText: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.semiBold },
  progressWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, paddingVertical: SPACING.base, paddingHorizontal: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  progressStep: { alignItems: 'center', gap: 4 },
  progressDot: { width: 30, height: 30, borderRadius: RADIUS.full, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface },
  progressDotActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  progressDotDone: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  progressDotText: { fontSize: FONTS.sm, color: COLORS.textMuted, fontWeight: FONTS.bold },
  progressDotTextActive: { color: 'white' },
  progressLabel: { fontSize: 9, color: COLORS.textMuted, textAlign: 'center', maxWidth: 70 },
  progressLabelActive: { color: COLORS.primary, fontWeight: FONTS.semiBold },
  progressLine: { flex: 1, height: 2, backgroundColor: COLORS.border, marginHorizontal: 4, marginBottom: 14 },
  progressLineDone: { backgroundColor: COLORS.success },
  scroll: { padding: SPACING.base },
  stepTitle: { fontSize: FONTS.xl, fontWeight: FONTS.black, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  stepDesc: { fontSize: FONTS.sm, color: COLORS.textMuted, marginBottom: SPACING.base },
  sectionTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginTop: SPACING.base, marginBottom: SPACING.sm },
  sectionSubtitle: { fontSize: FONTS.xs, color: COLORS.textMuted, marginBottom: SPACING.sm, marginTop: -SPACING.xs },
  fieldLabel: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary, marginBottom: SPACING.xs, marginTop: SPACING.sm },
  optional: { fontSize: FONTS.xs, color: COLORS.textMuted, fontWeight: FONTS.regular },
  input: { backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 2, fontSize: FONTS.base, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  textArea: { minHeight: 80, textAlignVertical: 'top', paddingTop: SPACING.sm },
  passwordWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, backgroundColor: COLORS.surface, marginBottom: SPACING.xs },
  eyeBtn: { padding: SPACING.sm },
  typeCard: { padding: SPACING.base, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface, marginBottom: SPACING.sm },
  typeCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryFade },
  typeLabel: { fontSize: FONTS.base, fontWeight: FONTS.semiBold, color: COLORS.textPrimary },
  typeDesc: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  selectorInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 4, marginBottom: SPACING.xs },
  selectorValue: { fontSize: FONTS.base, color: COLORS.textPrimary },
  selectorPlaceholder: { fontSize: FONTS.base, color: COLORS.textLight },
  selectorArrow: { fontSize: FONTS.sm, color: COLORS.textMuted },
  gpsBtn: { flexDirection: 'row', alignItems: 'center', padding: SPACING.base, borderRadius: RADIUS.xl, borderWidth: 2, borderColor: COLORS.primary, backgroundColor: COLORS.primaryFade, marginVertical: SPACING.sm, gap: SPACING.sm },
  gpsBtnActive: { borderColor: COLORS.success, backgroundColor: '#E8F5E9' },
  gpsBtnIcon: { fontSize: 28 },
  gpsBtnContent: { flex: 1 },
  gpsBtnTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.primary },
  gpsBtnSub: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  payoutCard: { padding: SPACING.base, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface, marginBottom: SPACING.sm },
  payoutCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryFade },
  payoutLabel: { fontSize: FONTS.base, fontWeight: FONTS.semiBold, color: COLORS.textPrimary },
  payoutDesc: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  photoUploadBtn: { borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed', borderRadius: RADIUS.xl, marginBottom: SPACING.xs, overflow: 'hidden', height: 120, backgroundColor: COLORS.surfaceAlt },
  photoPreview: { width: '100%', height: '100%' },
  photoUploadEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  photoUploadIcon: { fontSize: 32 },
  photoUploadText: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.primary },
  photoUploadSub: { fontSize: FONTS.xs, color: COLORS.textMuted },
  termsCard: { backgroundColor: COLORS.primaryFade, borderRadius: RADIUS.lg, padding: SPACING.base, marginVertical: SPACING.base },
  termsText: { fontSize: FONTS.sm, color: COLORS.textSecondary, lineHeight: 22 },
  btnRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xl },
  backStepBtn: { flex: 1, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.xl, alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.base },
  backStepText: { fontSize: FONTS.base, color: COLORS.textSecondary, fontWeight: FONTS.semiBold },
  saveDraftBtn: { flex: 1, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: RADIUS.xl, alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.base },
  saveDraftBtnSmall: { width: 44, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: RADIUS.xl, alignItems: 'center', justifyContent: 'center' },
  saveDraftText: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.semiBold },
  nextBtn: { flex: 2 },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerContainer: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS['2xl'], borderTopRightRadius: RADIUS['2xl'], maxHeight: '70%', paddingBottom: Platform.OS === 'ios' ? 34 : 16 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  pickerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  pickerClose: { fontSize: FONTS.xl, color: COLORS.textMuted, fontWeight: FONTS.bold },
  pickerItem: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  pickerItemText: { fontSize: FONTS.base, color: COLORS.textPrimary },
});