/**
 * VUMA Store — Tanzania Seller Registration
 * Smart 3-step flow based on seller type
 * Individual (NIDA) | Business (BRELA+TIN) | Agricultural Supplier
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  TextInput, Alert, Platform, Modal, FlatList, Image,
  ScrollView,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../utils/constants';
import Button from '../../components/common/Button';
import { upload } from '../../api/client';

// ── Constants ─────────────────────────────────────────
const SELLER_TYPES = [
  {
    value: 'individual',
    icon: '👤',
    title: 'Individual Seller',
    subtitle: 'Students, home businesses, small traders',
    color: COLORS.primary,
    examples: 'Selling clothes, food, crafts, electronics from home',
  },
  {
    value: 'business',
    icon: '🏢',
    title: 'Business / Company',
    subtitle: 'Registered shops, wholesalers, distributors',
    color: '#12162B',
    examples: 'BRELA-registered business, wholesale supplier',
  },
  {
    value: 'agricultural',
    icon: '🌾',
    title: 'Agricultural Supplier',
    subtitle: 'Farmers, cooperatives, agri-businesses',
    color: '#1B4332',
    examples: 'Crops, livestock, fresh produce, farm inputs',
  },
];

const TANZANIA_CITIES = [
  'Dar es Salaam', 'Dodoma', 'Arusha', 'Mwanza', 'Mbeya',
  'Morogoro', 'Tanga', 'Zanzibar', 'Tabora', 'Kigoma',
  'Moshi', 'Iringa', 'Songea', 'Lindi', 'Mtwara', 'Other',
];

const PAYOUT_METHODS = [
  { value: 'mpesa', icon: '📱', label: 'M-Pesa (Vodacom)', desc: 'Most popular in Tanzania' },
  { value: 'airtel', icon: '📱', label: 'Airtel Money', desc: 'Airtel Tanzania' },
  { value: 'halopesa', icon: '📱', label: 'HaloPesa', desc: 'Halotel Tanzania' },
  { value: 'tigopesa', icon: '📱', label: 'Tigo Pesa', desc: 'Tigo Tanzania' },
  { value: 'bank', icon: '🏦', label: 'Bank Account', desc: 'CRDB, NMB, NBC, Stanbic' },
];

const BUSINESS_CATEGORIES = [
  'Fashion & Clothing', 'Electronics & Phones', 'Food & Groceries',
  'Beauty & Health', 'Home & Furniture', 'Construction & Hardware',
  'Agriculture & Farming', 'Automotive', 'Books & Education',
  'Sports & Fitness', 'Toys & Kids', 'Services', 'Other',
];

const EMPTY_FORM = {
  // Step 1 — Personal
  full_name: '', phone: '', email: '', password: '', confirm_password: '',
  // Step 2 — Business
  shop_name: '', business_category: '',
  city: 'Dar es Salaam', ward: '', landmark: '',
  latitude: null, longitude: null,
  description: '',
  delivery_radius_km: 10,
  // Step 3 — Verification
  nida_number: '',
  voter_id_number: '',
  passport_number: '',
  id_type: 'nida', // nida | voter_id | passport
  brela_number: '',
  tin_number: '',
  selfie_uri: null,
  id_front_uri: null,
  id_back_uri: null,
  certificate_uri: null,
  payout_method: 'mpesa',
  payout_phone: '',
  bank_name: '',
  bank_account_number: '',
  bank_account_name: '',
};

// ── Picker Modal ──────────────────────────────────────
const PickerModal = ({ visible, title, data, onSelect, onClose, keyFn, labelFn, descFn, iconFn }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.pickerOverlay}>
      <View style={styles.pickerContainer}>
        <View style={styles.pickerHeader}>
          <Text style={styles.pickerTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.pickerClose}>✕</Text></TouchableOpacity>
        </View>
        <FlatList
          data={data}
          keyExtractor={keyFn || ((item) => item.toString())}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.pickerItem} onPress={() => { onSelect(item); onClose(); }}>
              {iconFn && <Text style={styles.pickerItemIcon}>{iconFn(item)}</Text>}
              <View style={styles.pickerItemTexts}>
                <Text style={styles.pickerItemText}>{labelFn ? labelFn(item) : item}</Text>
                {descFn && <Text style={styles.pickerItemDesc}>{descFn(item)}</Text>}
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      </View>
    </View>
  </Modal>
);

export default function SellerRegisterScreen({ navigation }) {
  const [sellerType, setSellerType] = useState(null); // null = not chosen yet
  const [step, setStep] = useState(0); // 0=type selection, 1=personal, 2=business, 3=verify
  const [form, setFormState] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showPayoutPicker, setShowPayoutPicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const setField = (key, value) => setFormState(prev => ({ ...prev, [key]: value }));

  const selectedType = SELLER_TYPES.find(t => t.value === sellerType);

  const getGPS = async () => {
    setGpsLoading(true);
    try {
      const Location = await import('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission denied', 'Please allow location access.'); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setFormState(prev => ({ ...prev, latitude: loc.coords.latitude, longitude: loc.coords.longitude }));
      Alert.alert('📍 Location Pinned!', `Accuracy: ±${Math.round(loc.coords.accuracy)}m`);
    } catch { Alert.alert('Error', 'Could not get location. Try again.'); }
    finally { setGpsLoading(false); }
  };

  // Selfie: ask the seller to choose Camera or Gallery up front, instead of
  // forcing the camera automatically. Some devices' cameras fail at the OS
  // level (a native error dialog outside our control) — letting the seller
  // pick Gallery directly avoids that entirely on phones where it happens.
  const pickImage = async (field) => {
    if (field === 'selfie_uri') {
      Alert.alert(
        'Selfie with ID',
        'How would you like to add this photo?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Choose from Gallery', onPress: () => openGallery(field) },
          { text: 'Take Photo', onPress: () => openCamera(field) },
        ]
      );
      return;
    }
    openGallery(field);
  };

  const openCamera = async (field) => {
    try {
      const ImagePicker = await import('expo-image-picker');
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      if (!cam.granted) {
        Alert.alert('Camera Permission Needed', 'Please allow camera access, or choose from gallery instead.');
        return;
      }
      const r = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if (!r.canceled) setField(field, r.assets[0].uri);
    } catch (e) {
      Alert.alert('Camera Unavailable', 'The camera could not be opened on this device. Please choose from gallery instead.');
    }
  };

  const openGallery = async (field) => {
    try {
      const ImagePicker = await import('expo-image-picker');
      await ImagePicker.requestMediaLibraryPermissionsAsync();
      const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
      if (!r.canceled) setField(field, r.assets[0].uri);
    } catch { Alert.alert('Error', 'Could not open gallery.'); }
  };

  // ── Validation ────────────────────────────────────
  const validateStep1 = () => {
    if (!form.full_name.trim()) { Alert.alert('Required', 'Full name is required.'); return false; }
    if (!form.phone.trim()) { Alert.alert('Required', 'Phone number is required.'); return false; }
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) { Alert.alert('Required', 'Valid email is required.'); return false; }
    if (!form.password || form.password.length < 6) { Alert.alert('Required', 'Password must be at least 6 characters.'); return false; }
    if (form.password !== form.confirm_password) { Alert.alert('Error', 'Passwords do not match.'); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (!form.shop_name.trim()) { Alert.alert('Required', 'Shop/business name is required.'); return false; }
    if (!form.business_category) { Alert.alert('Required', 'Please select a category.'); return false; }
    if (!form.ward.trim()) { Alert.alert('Required', 'Ward/area is required.'); return false; }
    return true;
  };

  const validateStep3 = () => {
    if (sellerType === 'individual' || sellerType === 'agricultural') {
      if (form.id_type === 'nida' && !form.nida_number.trim()) {
        Alert.alert('Required', 'NIDA number is required.'); return false;
      }
      if (form.id_type === 'voter_id' && !form.voter_id_number.trim()) {
        Alert.alert('Required', 'Voter ID number is required.'); return false;
      }
      if (form.id_type === 'passport' && !form.passport_number.trim()) {
        Alert.alert('Required', 'Passport number is required.'); return false;
      }
    }
    if (sellerType === 'business') {
      if (!form.brela_number.trim()) { Alert.alert('Required', 'BRELA number is required.'); return false; }
      if (!form.nida_number.trim()) { Alert.alert('Required', 'Owner NIDA number is required.'); return false; }
    }
    if (!form.payout_method) { Alert.alert('Required', 'Select a payout method.'); return false; }
    if (form.payout_method !== 'bank' && !form.payout_phone.trim()) {
      Alert.alert('Required', 'Payout phone number is required.'); return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('seller_type', sellerType);
      formData.append('full_name', form.full_name.trim());
      formData.append('contact_phone', form.phone.trim());
      formData.append('shop_name', form.shop_name.trim());
      formData.append('business_name', form.shop_name.trim());
      formData.append('business_type', sellerType);
      formData.append('business_category', form.business_category);
      formData.append('city', form.city);
      formData.append('ward', form.ward.trim());
      formData.append('landmark', form.landmark.trim());
      formData.append('description', form.description.trim());
      if (form.latitude) formData.append('latitude', String(form.latitude));
      if (form.longitude) formData.append('longitude', String(form.longitude));
      formData.append('id_type', form.id_type);
      formData.append('id_card_number', form.nida_number || form.voter_id_number || form.passport_number);
      if (form.brela_number) formData.append('business_registration_number', form.brela_number);
      if (form.tin_number) formData.append('tin_number', form.tin_number);
      formData.append('payout_method', form.payout_method);
      formData.append('payout_phone', form.payout_phone.trim());
      formData.append('bank_name', form.bank_name.trim());
      formData.append('bank_account_number', form.bank_account_number.trim());
      formData.append('bank_account_name', form.bank_account_name.trim());
      formData.append('is_draft', 'false');

      if (form.id_front_uri) formData.append('id_card_front', { uri: form.id_front_uri, name: 'id_front.jpg', type: 'image/jpeg' });
      if (form.id_back_uri) formData.append('id_card_back', { uri: form.id_back_uri, name: 'id_back.jpg', type: 'image/jpeg' });
      if (form.selfie_uri) formData.append('selfie_image', { uri: form.selfie_uri, name: 'selfie.jpg', type: 'image/jpeg' });
      if (form.certificate_uri) formData.append('business_certificate', { uri: form.certificate_uri, name: 'certificate.jpg', type: 'image/jpeg' });

      await upload('/vendors/applications/apply/', formData);

      Alert.alert(
        '🎉 Application Submitted!',
        'Thank you! We will review your application within 24 hours and notify you via SMS.',
        [{ text: 'OK', onPress: () => navigation.replace('Login') }]
      );
    } catch (err) {
      // Show the REAL error instead of a generic connection message.
      // DRF validation errors come back as { field: "message" } or
      // { field: ["message"] } — surface those specifically so the
      // seller knows exactly what to fix, rather than guessing.
      const data = err?.response?.data;
      let message = 'Could not submit your application. Please try again.';

      if (data && typeof data === 'object') {
        const fieldErrors = Object.entries(data)
          .map(([field, msg]) => {
            const text = Array.isArray(msg) ? msg.join(' ') : String(msg);
            return text;
          })
          .filter(Boolean);
        if (fieldErrors.length > 0) {
          message = fieldErrors.join('\n');
        } else if (data.detail) {
          message = String(data.detail);
        }
      } else if (err?.message && err.message !== 'Network Error') {
        message = err.message;
      } else if (!err?.response) {
        // A genuine network/connectivity failure — this is the only
        // case where the connection message is actually accurate.
        message = 'Could not reach the server. Please check your internet connection and try again.';
      }

      Alert.alert('Submission Failed', message);
    } finally {
      setSaving(false);
    }
  };

  // ── Photo Upload Box ──────────────────────────────
  const PhotoBox = ({ field, label, icon, hint }) => (
    <View style={styles.photoWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {hint && <Text style={styles.fieldHint}>{hint}</Text>}
      <TouchableOpacity style={styles.photoBox} onPress={() => pickImage(field)}>
        {form[field] ? (
          <Image source={{ uri: form[field] }} style={styles.photoPreview} resizeMode="cover" />
        ) : (
          <View style={styles.photoEmpty}>
            <Text style={styles.photoIcon}>{icon}</Text>
            <Text style={styles.photoText}>Tap to upload</Text>
          </View>
        )}
      </TouchableOpacity>
      {form[field] && (
        <TouchableOpacity onPress={() => setField(field, null)}>
          <Text style={styles.removePhoto}>✕ Remove</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ── Step 0: Seller Type Selection ────────────────
  const renderTypeSelection = () => (
    <View style={styles.typeWrap}>
      <Text style={styles.typeQuestion}>What best describes you?</Text>
      <Text style={styles.typeSubtitle}>We'll only ask for what you need</Text>
      {SELLER_TYPES.map(type => (
        <TouchableOpacity
          key={type.value}
          style={[styles.typeCard, { borderColor: type.color }]}
          onPress={() => { setSellerType(type.value); setStep(1); }}
          activeOpacity={0.85}
        >
          <View style={[styles.typeIconWrap, { backgroundColor: type.color }]}>
            <Text style={styles.typeIcon}>{type.icon}</Text>
          </View>
          <View style={styles.typeText}>
            <Text style={styles.typeTitle}>{type.title}</Text>
            <Text style={styles.typeSubtitleText}>{type.subtitle}</Text>
            <Text style={styles.typeExamples}>{type.examples}</Text>
          </View>
          <Text style={[styles.typeArrow, { color: type.color }]}>›</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // ── Step 1: Personal Info ─────────────────────────
  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>👤 Your Information</Text>
      <Text style={styles.stepDesc}>Tell us about yourself</Text>

      <Text style={styles.fieldLabel}>Full Name *</Text>
      <TextInput style={styles.input} value={form.full_name} onChangeText={v => setField('full_name', v)}
        placeholder="Your full name as on ID" placeholderTextColor={COLORS.textLight} />

      <Text style={styles.fieldLabel}>Phone Number *</Text>
      <TextInput style={styles.input} value={form.phone} onChangeText={v => setField('phone', v)}
        placeholder="+255 7XX XXX XXX" keyboardType="phone-pad" placeholderTextColor={COLORS.textLight} />

      <Text style={styles.fieldLabel}>Email Address *</Text>
      <TextInput style={styles.input} value={form.email} onChangeText={v => setField('email', v)}
        placeholder="your@email.com" keyboardType="email-address" autoCapitalize="none"
        placeholderTextColor={COLORS.textLight} />

      <Text style={styles.fieldLabel}>Password *</Text>
      <View style={styles.passwordRow}>
        <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} value={form.password}
          onChangeText={v => setField('password', v)} placeholder="At least 6 characters"
          secureTextEntry={!showPassword} placeholderTextColor={COLORS.textLight} />
        <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
          <Text>{showPassword ? '🙈' : '👁'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.fieldLabel}>Confirm Password *</Text>
      <TextInput style={styles.input} value={form.confirm_password}
        onChangeText={v => setField('confirm_password', v)} placeholder="Re-enter password"
        secureTextEntry={!showPassword} placeholderTextColor={COLORS.textLight} />

      <View style={styles.stepBtns}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setStep(0)}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Button title="Next →" onPress={() => { if (validateStep1()) setStep(2); }} style={styles.nextBtn} />
      </View>
    </View>
  );

  // ── Step 2: Business/Shop Info ────────────────────
  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>
        {sellerType === 'agricultural' ? '🌾 Farm Details' : sellerType === 'business' ? '🏢 Business Details' : '🏪 Shop Details'}
      </Text>
      <Text style={styles.stepDesc}>
        {sellerType === 'agricultural' ? 'Tell us about your farm and products' : 'Tell us about your shop'}
      </Text>

      <Text style={styles.fieldLabel}>
        {sellerType === 'agricultural' ? 'Farm/Business Name *' : 'Shop Name *'}
      </Text>
      <TextInput style={styles.input} value={form.shop_name} onChangeText={v => setField('shop_name', v)}
        placeholder={sellerType === 'agricultural' ? "e.g. Kilimanjaro Farm, Mama Grace's Garden" : "e.g. Mama Fatuma's Duka, TechHub TZ"}
        placeholderTextColor={COLORS.textLight} />

      <Text style={styles.fieldLabel}>Category *</Text>
      <TouchableOpacity style={styles.selector} onPress={() => setShowCategoryPicker(true)}>
        <Text style={form.business_category ? styles.selectorValue : styles.selectorPlaceholder}>
          {form.business_category || 'What do you sell?'}
        </Text>
        <Text>▼</Text>
      </TouchableOpacity>

      <Text style={styles.fieldLabel}>Description</Text>
      <TextInput style={[styles.input, styles.textArea]} value={form.description}
        onChangeText={v => setField('description', v)} multiline numberOfLines={3}
        placeholder="Describe what you sell..." textAlignVertical="top"
        placeholderTextColor={COLORS.textLight} />

      <Text style={styles.sectionTitle}>📍 Location</Text>

      <TouchableOpacity style={[styles.gpsBtn, form.latitude && styles.gpsBtnActive]} onPress={getGPS} disabled={gpsLoading}>
        <Text style={styles.gpsBtnIcon}>📍</Text>
        <View style={styles.gpsBtnContent}>
          <Text style={[styles.gpsBtnTitle, form.latitude && { color: COLORS.success }]}>
            {gpsLoading ? 'Getting location...' : form.latitude ? '✓ Location Pinned' : 'Pin My Location (GPS)'}
          </Text>
          <Text style={styles.gpsBtnSub}>
            {form.latitude ? `${Number(form.latitude).toFixed(4)}, ${Number(form.longitude).toFixed(4)}` : 'Helps customers find you'}
          </Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.fieldLabel}>City *</Text>
      <TouchableOpacity style={styles.selector} onPress={() => setShowCityPicker(true)}>
        <Text style={styles.selectorValue}>{form.city}</Text>
        <Text>▼</Text>
      </TouchableOpacity>

      <Text style={styles.fieldLabel}>Ward / Area *</Text>
      <TextInput style={styles.input} value={form.ward} onChangeText={v => setField('ward', v)}
        placeholder="e.g. Kinondoni, Kariakoo, Ilala" placeholderTextColor={COLORS.textLight} />

      <Text style={styles.fieldLabel}>Nearby Landmark <Text style={styles.optional}>(optional)</Text></Text>
      <TextInput style={styles.input} value={form.landmark} onChangeText={v => setField('landmark', v)}
        placeholder="e.g. Near Kariakoo Market, Next to CRDB" placeholderTextColor={COLORS.textLight} />

      <View style={styles.stepBtns}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Button title="Next →" onPress={() => { if (validateStep2()) setStep(3); }} style={styles.nextBtn} />
      </View>
    </View>
  );

  // ── Step 3: Verification ──────────────────────────
  const renderStep3 = () => (
    <View>
      <Text style={styles.stepTitle}>🪪 Verification & Payout</Text>
      <Text style={styles.stepDesc}>
        {sellerType === 'individual'
          ? 'We need to verify your identity. NIDA is preferred.'
          : sellerType === 'business'
          ? 'Business verification is required before you can sell.'
          : 'Quick verification to activate your seller account.'}
      </Text>

      {/* Individual/Agricultural: ID type selector */}
      {(sellerType === 'individual' || sellerType === 'agricultural') && (
        <>
          <Text style={styles.sectionTitle}>🪪 Identity Verification</Text>

          <View style={styles.idTypeRow}>
            {[
              { value: 'nida', label: 'NIDA', preferred: true },
              { value: 'voter_id', label: 'Voter ID' },
              { value: 'passport', label: 'Passport' },
            ].map(id => (
              <TouchableOpacity
                key={id.value}
                style={[styles.idTypeChip, form.id_type === id.value && styles.idTypeChipActive]}
                onPress={() => setField('id_type', id.value)}
              >
                <Text style={[styles.idTypeText, form.id_type === id.value && styles.idTypeTextActive]}>
                  {id.label}{id.preferred ? ' ⭐' : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {form.id_type === 'nida' && (
            <>
              <Text style={styles.fieldLabel}>NIDA Number *</Text>
              <Text style={styles.fieldHint}>Your National Identification Number (20 digits)</Text>
              <TextInput style={styles.input} value={form.nida_number}
                onChangeText={v => setField('nida_number', v)}
                placeholder="XXXX-XXXXX-XXXXX-XX" keyboardType="numeric"
                maxLength={20} placeholderTextColor={COLORS.textLight} />
            </>
          )}

          {form.id_type === 'voter_id' && (
            <>
              <Text style={styles.fieldLabel}>Voter ID Number *</Text>
              <TextInput style={styles.input} value={form.voter_id_number}
                onChangeText={v => setField('voter_id_number', v)}
                placeholder="Voter ID number" placeholderTextColor={COLORS.textLight} />
            </>
          )}

          {form.id_type === 'passport' && (
            <>
              <Text style={styles.fieldLabel}>Passport Number *</Text>
              <TextInput style={styles.input} value={form.passport_number}
                onChangeText={v => setField('passport_number', v)}
                placeholder="Passport number" autoCapitalize="characters"
                placeholderTextColor={COLORS.textLight} />
            </>
          )}

          <PhotoBox field="id_front_uri" label="ID Photo — Front *" icon="🪪" hint="Take a clear photo of your ID" />
          <PhotoBox field="selfie_uri" label="Selfie with ID *" icon="🤳" hint="Hold your ID next to your face" />
        </>
      )}

      {/* Business: Extra fields */}
      {sellerType === 'business' && (
        <>
          <Text style={styles.sectionTitle}>🏢 Business Documents</Text>

          <Text style={styles.fieldLabel}>BRELA Registration Number *</Text>
          <Text style={styles.fieldHint}>Business Registration Certificate number</Text>
          <TextInput style={styles.input} value={form.brela_number}
            onChangeText={v => setField('brela_number', v)}
            placeholder="e.g. 0000XX-XXXX" placeholderTextColor={COLORS.textLight} />

          <Text style={styles.fieldLabel}>TIN Number <Text style={styles.optional}>(if applicable)</Text></Text>
          <TextInput style={styles.input} value={form.tin_number}
            onChangeText={v => setField('tin_number', v)}
            placeholder="Tax Identification Number" keyboardType="numeric"
            placeholderTextColor={COLORS.textLight} />

          <Text style={styles.fieldLabel}>Owner NIDA Number *</Text>
          <TextInput style={styles.input} value={form.nida_number}
            onChangeText={v => setField('nida_number', v)}
            placeholder="NIDA of business owner" keyboardType="numeric"
            placeholderTextColor={COLORS.textLight} />

          <PhotoBox field="certificate_uri" label="BRELA Certificate *" icon="📄" hint="Upload your business registration certificate" />
          <PhotoBox field="id_front_uri" label="Owner ID (NIDA) *" icon="🪪" hint="Front of owner's national ID" />
          <PhotoBox field="selfie_uri" label="Owner Selfie *" icon="🤳" hint="Photo of the business owner" />
        </>
      )}

      {/* Payout */}
      <Text style={styles.sectionTitle}>💳 How Should We Pay You?</Text>
      <Text style={styles.fieldHint}>After each sale, we'll pay you here. Commission varies by product category (3%–15%) — farmers and food sellers pay the lowest rates.</Text>

      <TouchableOpacity style={styles.selector} onPress={() => setShowPayoutPicker(true)}>
        <Text style={form.payout_method ? styles.selectorValue : styles.selectorPlaceholder}>
          {PAYOUT_METHODS.find(p => p.value === form.payout_method)?.label || 'Select payout method...'}
        </Text>
        <Text>▼</Text>
      </TouchableOpacity>

      {form.payout_method !== 'bank' && (
        <>
          <Text style={styles.fieldLabel}>
            {PAYOUT_METHODS.find(p => p.value === form.payout_method)?.label} Phone Number *
          </Text>
          <TextInput style={styles.input} value={form.payout_phone}
            onChangeText={v => setField('payout_phone', v)}
            placeholder="+255 7XX XXX XXX" keyboardType="phone-pad"
            placeholderTextColor={COLORS.textLight} />
        </>
      )}

      {form.payout_method === 'bank' && (
        <>
          <Text style={styles.fieldLabel}>Bank Name *</Text>
          <TextInput style={styles.input} value={form.bank_name}
            onChangeText={v => setField('bank_name', v)}
            placeholder="e.g. CRDB, NMB, NBC, Stanbic" placeholderTextColor={COLORS.textLight} />
          <Text style={styles.fieldLabel}>Account Number *</Text>
          <TextInput style={styles.input} value={form.bank_account_number}
            onChangeText={v => setField('bank_account_number', v)}
            placeholder="Bank account number" keyboardType="numeric"
            placeholderTextColor={COLORS.textLight} />
          <Text style={styles.fieldLabel}>Account Name *</Text>
          <TextInput style={styles.input} value={form.bank_account_name}
            onChangeText={v => setField('bank_account_name', v)}
            placeholder="Name on bank account" placeholderTextColor={COLORS.textLight} />
        </>
      )}

      <View style={styles.termsCard}>
        <Text style={styles.termsText}>
          By submitting, you agree to VUMA's Seller Terms.{'\n'}
          • Commission varies by product category (3%–15%){'\n'}
          • Payouts within 3 business days{'\n'}
          • Account verified within 24 hours{'\n'}
          {sellerType === 'business' ? '• Business verification required before selling' : '• You can start listing products after approval'}
        </Text>
      </View>

      <View style={styles.stepBtns}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setStep(2)}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Button title="Submit Application" onPress={handleSubmit} loading={saving} style={styles.nextBtn} />
      </View>
    </View>
  );

  const STEP_LABELS = ['Type', 'Personal', 'Business', 'Verify'];
  const typeColor = selectedType?.color || COLORS.primary;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={typeColor} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: typeColor }]}>
        <TouchableOpacity onPress={() => step > 0 ? setStep(step - 1) : navigation.goBack()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 0 ? 'Start Selling on VUMA' : `Become a Seller`}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Progress */}
      {step > 0 && (
        <View style={[styles.progressWrap, { backgroundColor: typeColor + '22' }]}>
          {[1, 2, 3].map((s, i) => {
            const isActive = step === s;
            const isDone = step > s;
            return (
              <React.Fragment key={s}>
                <View style={styles.progressStep}>
                  <View style={[styles.progressDot,
                    isActive && { backgroundColor: typeColor, borderColor: typeColor },
                    isDone && { backgroundColor: COLORS.success, borderColor: COLORS.success },
                  ]}>
                    <Text style={[styles.progressDotText, (isActive || isDone) && { color: 'white' }]}>
                      {isDone ? '✓' : s}
                    </Text>
                  </View>
                  <Text style={[styles.progressLabel, (isActive || isDone) && { color: typeColor, fontWeight: FONTS.bold }]}>
                    {STEP_LABELS[s]}
                  </Text>
                </View>
                {i < 2 && <View style={[styles.progressLine, isDone && { backgroundColor: COLORS.success }]} />}
              </React.Fragment>
            );
          })}
        </View>
      )}

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="always"
        enableOnAndroid extraScrollHeight={120}
        showsVerticalScrollIndicator={false}
      >
        {step === 0 && renderTypeSelection()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        <View style={{ height: 80 }} />
      </KeyboardAwareScrollView>

      {/* Pickers */}
      <PickerModal visible={showCityPicker} title="Select City"
        data={TANZANIA_CITIES} onSelect={c => setField('city', c)} onClose={() => setShowCityPicker(false)} />
      <PickerModal visible={showCategoryPicker} title="Business Category"
        data={BUSINESS_CATEGORIES} onSelect={c => setField('business_category', c)} onClose={() => setShowCategoryPicker(false)} />
      <PickerModal visible={showPayoutPicker} title="Select Payout Method"
        data={PAYOUT_METHODS}
        keyFn={item => item.value}
        labelFn={item => item.label}
        descFn={item => item.desc}
        iconFn={item => item.icon}
        onSelect={item => setField('payout_method', item.value)}
        onClose={() => setShowPayoutPicker(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.base, paddingTop: Platform.OS === 'ios' ? 50 : SPACING.base, paddingBottom: SPACING.base },
  backArrow: { fontSize: FONTS.xl, color: 'white', fontWeight: FONTS.bold },
  headerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: 'white' },
  progressWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.sm, paddingHorizontal: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  progressStep: { alignItems: 'center', gap: 3 },
  progressDot: { width: 28, height: 28, borderRadius: RADIUS.full, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface },
  progressDotText: { fontSize: FONTS.xs, color: COLORS.textMuted, fontWeight: FONTS.bold },
  progressLabel: { fontSize: 9, color: COLORS.textMuted, textAlign: 'center', maxWidth: 60 },
  progressLine: { flex: 1, height: 2, backgroundColor: COLORS.border, marginHorizontal: 4, marginBottom: 14 },
  scroll: { padding: SPACING.base },
  // Type selection
  typeWrap: { paddingTop: SPACING.sm },
  typeQuestion: { fontSize: FONTS['2xl'], fontWeight: FONTS.black, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  typeSubtitle: { fontSize: FONTS.sm, color: COLORS.textMuted, marginBottom: SPACING.xl },
  typeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, borderWidth: 2, padding: SPACING.base, marginBottom: SPACING.base, gap: SPACING.base, ...SHADOWS.sm },
  typeIconWrap: { width: 52, height: 52, borderRadius: RADIUS.xl, alignItems: 'center', justifyContent: 'center' },
  typeIcon: { fontSize: 28 },
  typeText: { flex: 1 },
  typeTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  typeSubtitleText: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  typeExamples: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 4, fontStyle: 'italic' },
  typeArrow: { fontSize: FONTS['2xl'], fontWeight: FONTS.bold },
  // Form
  stepTitle: { fontSize: FONTS.xl, fontWeight: FONTS.black, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  stepDesc: { fontSize: FONTS.sm, color: COLORS.textMuted, marginBottom: SPACING.base },
  sectionTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginTop: SPACING.base, marginBottom: SPACING.sm, paddingBottom: SPACING.xs, borderBottomWidth: 2, borderBottomColor: COLORS.divider },
  fieldLabel: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary, marginBottom: 4, marginTop: SPACING.sm },
  fieldHint: { fontSize: FONTS.xs, color: COLORS.textMuted, marginBottom: SPACING.xs },
  optional: { fontSize: FONTS.xs, color: COLORS.textMuted, fontWeight: FONTS.regular },
  input: { backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 2, fontSize: FONTS.base, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  textArea: { minHeight: 80, textAlignVertical: 'top', paddingTop: SPACING.sm },
  passwordRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, backgroundColor: COLORS.surface, marginBottom: SPACING.xs },
  eyeBtn: { padding: SPACING.sm },
  selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 4, marginBottom: SPACING.xs },
  selectorValue: { fontSize: FONTS.base, color: COLORS.textPrimary },
  selectorPlaceholder: { fontSize: FONTS.base, color: COLORS.textLight },
  gpsBtn: { flexDirection: 'row', alignItems: 'center', padding: SPACING.base, borderRadius: RADIUS.xl, borderWidth: 2, borderColor: COLORS.primary, backgroundColor: COLORS.primaryFade, marginVertical: SPACING.sm, gap: SPACING.sm },
  gpsBtnActive: { borderColor: COLORS.success, backgroundColor: COLORS.successLight },
  gpsBtnIcon: { fontSize: 28 },
  gpsBtnContent: { flex: 1 },
  gpsBtnTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.primary },
  gpsBtnSub: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  idTypeRow: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap', marginBottom: SPACING.sm },
  idTypeChip: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  idTypeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  idTypeText: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  idTypeTextActive: { color: 'white', fontWeight: FONTS.bold },
  photoWrap: { marginBottom: SPACING.sm },
  photoBox: { height: 120, borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed', borderRadius: RADIUS.xl, overflow: 'hidden', backgroundColor: COLORS.surfaceAlt },
  photoPreview: { width: '100%', height: '100%' },
  photoEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  photoIcon: { fontSize: 32 },
  photoText: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.semiBold },
  removePhoto: { fontSize: FONTS.xs, color: COLORS.danger, marginTop: 4 },
  termsCard: { backgroundColor: COLORS.primaryFade, borderRadius: RADIUS.lg, padding: SPACING.base, marginVertical: SPACING.base },
  termsText: { fontSize: FONTS.sm, color: COLORS.textSecondary, lineHeight: 22 },
  stepBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xl },
  backBtn: { flex: 1, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.xl, alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.base },
  backBtnText: { fontSize: FONTS.base, color: COLORS.textSecondary, fontWeight: FONTS.semiBold },
  nextBtn: { flex: 2 },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerContainer: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS['2xl'], borderTopRightRadius: RADIUS['2xl'], maxHeight: '75%', paddingBottom: Platform.OS === 'ios' ? 34 : 16 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  pickerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  pickerClose: { fontSize: FONTS.xl, color: COLORS.textMuted, fontWeight: FONTS.bold },
  pickerItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.base, paddingVertical: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, gap: SPACING.sm },
  pickerItemIcon: { fontSize: 20 },
  pickerItemTexts: { flex: 1 },
  pickerItemText: { fontSize: FONTS.base, color: COLORS.textPrimary, fontWeight: FONTS.medium },
  pickerItemDesc: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
});