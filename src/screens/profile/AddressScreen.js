/**
 * VUMA Store — African Address Screen
 * GPS-first delivery address for Tanzania/East Africa
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, Platform, StatusBar, FlatList, Modal,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useDispatch, useSelector } from 'react-redux';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../utils/constants';
import Button from '../../components/common/Button';
import { get, post, patch, del } from '../../api/client';

const TANZANIA_CITIES = [
  'Dar es Salaam', 'Dodoma', 'Arusha', 'Mwanza', 'Mbeya',
  'Morogoro', 'Tanga', 'Zanzibar', 'Tabora', 'Kigoma',
  'Moshi', 'Iringa', 'Songea', 'Lindi', 'Mtwara', 'Other',
];

const DELIVERY_TYPES = [
  { value: 'home', label: '🏠 Home', desc: 'Delivered to your door' },
  { value: 'work', label: '🏢 Work/Office', desc: 'Delivered to your workplace' },
  { value: 'pickup', label: '📦 Pickup Point', desc: 'Collect from nearby point' },
];

const ADDRESS_LABELS = ['Home', 'Work', 'Mama Shop', 'Duka', 'Other'];

const EMPTY_FORM = {
  full_name: '',
  phone: '',
  delivery_type: 'home',
  city: 'Dar es Salaam',
  ward: '',
  landmark: '',
  building_detail: '',
  latitude: null,
  longitude: null,
  gps_accuracy: null,
  label: 'Home',
  is_default: false,
};

// ── City Picker ───────────────────────────────────────
const CityPicker = memo(({ visible, onSelect, onClose }) => (
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
));

// ── Address Card ──────────────────────────────────────
const AddressCard = memo(({ address, onEdit, onDelete, onSetDefault }) => (
  <View style={[styles.addressCard, address.is_default && styles.addressCardDefault]}>
    {address.is_default && (
      <View style={styles.defaultBadge}>
        <Text style={styles.defaultBadgeText}>✓ Default</Text>
      </View>
    )}
    <View style={styles.addressCardHeader}>
      <View style={styles.addressLabelWrap}>
        <Text style={styles.addressLabel}>{address.label || 'Address'}</Text>
        <Text style={styles.deliveryTypeText}>
          {DELIVERY_TYPES.find(d => d.value === address.delivery_type)?.label || '🏠 Home'}
        </Text>
      </View>
      <View style={styles.addressCardActions}>
        <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(address)}>
          <Text style={styles.editBtnText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(address)}>
          <Text style={styles.deleteBtnText}>🗑</Text>
        </TouchableOpacity>
      </View>
    </View>

    <Text style={styles.addressName}>{address.full_name}</Text>
    <Text style={styles.addressPhone}>📞 {address.phone}</Text>
    <Text style={styles.addressDisplay}>{address.display_address}</Text>

    {address.landmark ? (
      <Text style={styles.addressLandmark}>🏢 Near {address.landmark}</Text>
    ) : null}

    {address.has_gps && (
      <View style={styles.gpsRow}>
        <Text style={styles.gpsText}>📍 GPS: {Number(address.latitude).toFixed(5)}, {Number(address.longitude).toFixed(5)}</Text>
      </View>
    )}

    {address.google_maps_url && (
      <Text style={styles.mapsLink}>🗺️ View on Google Maps</Text>
    )}

    {!address.is_default && (
      <TouchableOpacity style={styles.setDefaultBtn} onPress={() => onSetDefault(address)}>
        <Text style={styles.setDefaultText}>Set as Default</Text>
      </TouchableOpacity>
    )}
  </View>
));

export default function AddressScreen({ navigation, route }) {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [form, setFormState] = useState(EMPTY_FORM);
  const [gpsLoading, setGpsLoading] = useState(false);
  const isSelecting = route?.params?.selecting; // if true, selecting for checkout

  useEffect(() => { loadAddresses(); }, []);

  const loadAddresses = async () => {
    setLoading(true);
    try {
      const data = await get('/orders/addresses/');
      setAddresses(data?.results || data || []);
    } catch (e) {
      Alert.alert('Error', 'Could not load addresses.');
    } finally {
      setLoading(false);
    }
  };

  const setField = (key, value) => setFormState(prev => ({ ...prev, [key]: value }));

  const openAddForm = () => {
    setEditingAddress(null);
    setFormState(EMPTY_FORM);
    setShowForm(true);
  };

  const openEditForm = (address) => {
    setEditingAddress(address);
    setFormState({
      full_name: address.full_name || '',
      phone: address.phone || '',
      delivery_type: address.delivery_type || 'home',
      city: address.city || 'Dar es Salaam',
      ward: address.ward || '',
      landmark: address.landmark || '',
      building_detail: address.building_detail || '',
      latitude: address.latitude || null,
      longitude: address.longitude || null,
      gps_accuracy: address.gps_accuracy || null,
      label: address.label || 'Home',
      is_default: address.is_default || false,
    });
    setShowForm(true);
  };

  const getGPSLocation = async () => {
    setGpsLoading(true);
    try {
      const Location = await import('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow location access to use GPS.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setFormState(prev => ({
        ...prev,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        gps_accuracy: loc.coords.accuracy,
      }));
      Alert.alert('📍 Location Found!', `GPS captured with ${Math.round(loc.coords.accuracy)}m accuracy.`);
    } catch (e) {
      Alert.alert('Error', 'Could not get GPS location. Please try again.');
    } finally {
      setGpsLoading(false);
    }
  };

  const validateForm = () => {
    if (!form.full_name.trim()) { Alert.alert('Error', 'Full name is required.'); return false; }
    if (!form.phone.trim()) { Alert.alert('Error', 'Phone number is required.'); return false; }
    if (!form.city.trim()) { Alert.alert('Error', 'City is required.'); return false; }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const data = {
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        delivery_type: form.delivery_type,
        city: form.city,
        ward: form.ward.trim(),
        landmark: form.landmark.trim(),
        building_detail: form.building_detail.trim(),
        latitude: form.latitude,
        longitude: form.longitude,
        gps_accuracy: form.gps_accuracy,
        label: form.label,
        is_default: form.is_default,
      };

      if (editingAddress) {
        await patch(`/orders/addresses/${editingAddress.id}/`, data);
      } else {
        await post('/orders/addresses/', data);
      }

      setShowForm(false);
      await loadAddresses();
      Alert.alert('✅ Saved', 'Address saved successfully!');
    } catch (e) {
      Alert.alert('Error', 'Could not save address. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (address) => {
    Alert.alert('Delete Address', `Delete "${address.label || 'this address'}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await del(`/orders/addresses/${address.id}/`);
            await loadAddresses();
          } catch {
            Alert.alert('Error', 'Could not delete address.');
          }
        },
      },
    ]);
  };

  const handleSetDefault = async (address) => {
    try {
      await post(`/orders/addresses/${address.id}/set-default/`);
      await loadAddresses();
    } catch {
      Alert.alert('Error', 'Could not set default address.');
    }
  };

  const handleSelect = (address) => {
    if (isSelecting && route?.params?.onSelect) {
      route.params.onSelect(address);
      navigation.goBack();
    }
  };

  if (showForm) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowForm(false)}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{editingAddress ? 'Edit Address' : 'New Address'}</Text>
          <View style={{ width: 60 }} />
        </View>

        <KeyboardAwareScrollView
          contentContainerStyle={styles.formScroll}
          keyboardShouldPersistTaps="always"
          enableOnAndroid
          extraScrollHeight={100}
        >
          {/* Address Label */}
          <Text style={styles.sectionTitle}>📌 Address Label</Text>
          <View style={styles.labelRow}>
            {ADDRESS_LABELS.map(l => (
              <TouchableOpacity
                key={l}
                style={[styles.labelChip, form.label === l && styles.labelChipActive]}
                onPress={() => setField('label', l)}
              >
                <Text style={[styles.labelChipText, form.label === l && styles.labelChipTextActive]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Delivery Type */}
          <Text style={styles.sectionTitle}>🚚 Delivery Type</Text>
          {DELIVERY_TYPES.map(dt => (
            <TouchableOpacity
              key={dt.value}
              style={[styles.deliveryTypeCard, form.delivery_type === dt.value && styles.deliveryTypeCardActive]}
              onPress={() => setField('delivery_type', dt.value)}
            >
              <Text style={styles.deliveryTypeLabel}>{dt.label}</Text>
              <Text style={styles.deliveryTypeDesc}>{dt.desc}</Text>
            </TouchableOpacity>
          ))}

          {/* Personal Info */}
          <Text style={styles.sectionTitle}>👤 Personal Info</Text>
          <Text style={styles.fieldLabel}>Full Name *</Text>
          <TextInput
            style={styles.input}
            value={form.full_name}
            onChangeText={v => setField('full_name', v)}
            placeholder="Your full name"
            placeholderTextColor={COLORS.textLight}
          />

          <Text style={styles.fieldLabel}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            value={form.phone}
            onChangeText={v => setField('phone', v)}
            placeholder="+255 7XX XXX XXX"
            keyboardType="phone-pad"
            placeholderTextColor={COLORS.textLight}
          />

          {/* Location */}
          <Text style={styles.sectionTitle}>📍 Location</Text>

          {/* GPS Button */}
          <TouchableOpacity
            style={[styles.gpsBtn, form.latitude && styles.gpsBtnActive]}
            onPress={getGPSLocation}
            disabled={gpsLoading}
          >
            <Text style={styles.gpsBtnIcon}>📍</Text>
            <View style={styles.gpsBtnText}>
              <Text style={styles.gpsBtnTitle}>
                {gpsLoading ? 'Getting location...' : form.latitude ? 'GPS Location Captured ✓' : 'Use Current Location (GPS)'}
              </Text>
              {form.latitude ? (
                <Text style={styles.gpsBtnSub}>
                  {Number(form.latitude).toFixed(5)}, {Number(form.longitude).toFixed(5)}
                  {form.gps_accuracy ? ` (±${Math.round(form.gps_accuracy)}m)` : ''}
                </Text>
              ) : (
                <Text style={styles.gpsBtnSub}>Recommended for accurate delivery</Text>
              )}
            </View>
          </TouchableOpacity>

          {/* City */}
          <Text style={styles.fieldLabel}>City *</Text>
          <TouchableOpacity style={styles.selectorInput} onPress={() => setShowCityPicker(true)}>
            <Text style={form.city ? styles.selectorValue : styles.selectorPlaceholder}>
              {form.city || 'Select city...'}
            </Text>
            <Text style={styles.selectorArrow}>▼</Text>
          </TouchableOpacity>

          {/* Ward */}
          <Text style={styles.fieldLabel}>Ward / Area *</Text>
          <TextInput
            style={styles.input}
            value={form.ward}
            onChangeText={v => setField('ward', v)}
            placeholder="e.g. Kinondoni, Ilala, Temeke"
            placeholderTextColor={COLORS.textLight}
          />

          {/* Landmark */}
          <Text style={styles.fieldLabel}>Nearby Landmark <Text style={styles.optional}>(helps rider find you)</Text></Text>
          <TextInput
            style={styles.input}
            value={form.landmark}
            onChangeText={v => setField('landmark', v)}
            placeholder="e.g. Near Shoprite, Behind Mosque, Next to CRDB"
            placeholderTextColor={COLORS.textLight}
          />

          {/* Building */}
          <Text style={styles.fieldLabel}>Building / Floor / Shop Number <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput
            style={styles.input}
            value={form.building_detail}
            onChangeText={v => setField('building_detail', v)}
            placeholder="e.g. Urafiki House, 2nd Floor, Shop 4"
            placeholderTextColor={COLORS.textLight}
          />

          {/* Default toggle */}
          <TouchableOpacity
            style={styles.defaultToggle}
            onPress={() => setField('is_default', !form.is_default)}
          >
            <View style={[styles.toggleBox, form.is_default && styles.toggleBoxActive]}>
              {form.is_default && <Text style={styles.toggleCheck}>✓</Text>}
            </View>
            <Text style={styles.defaultToggleText}>Set as default delivery address</Text>
          </TouchableOpacity>

          <Button
            title={editingAddress ? 'Update Address' : 'Save Address'}
            onPress={handleSave}
            loading={saving}
            fullWidth
            style={styles.saveBtn}
          />
          <View style={{ height: 60 }} />
        </KeyboardAwareScrollView>

        <CityPicker
          visible={showCityPicker}
          onSelect={(city) => setField('city', city)}
          onClose={() => setShowCityPicker(false)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isSelecting ? 'Select Delivery Address' : 'My Addresses'}
        </Text>
        <TouchableOpacity onPress={openAddForm}>
          <Text style={styles.addBtn}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Loading addresses...</Text>
        </View>
      ) : addresses.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>📍</Text>
          <Text style={styles.emptyTitle}>No addresses saved</Text>
          <Text style={styles.emptyText}>Add your delivery address to start shopping</Text>
          <Button title="Add Address" onPress={openAddForm} style={styles.emptyBtn} />
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(item) => item.id?.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => isSelecting ? handleSelect(item) : null}
              activeOpacity={isSelecting ? 0.7 : 1}
            >
              <AddressCard
                address={item}
                onEdit={openEditForm}
                onDelete={handleDelete}
                onSetDefault={handleSetDefault}
              />
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, paddingHorizontal: SPACING.base, paddingTop: Platform.OS === 'ios' ? SPACING['3xl'] : SPACING.base, paddingBottom: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider, ...SHADOWS.sm },
  headerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  backBtn: { fontSize: FONTS.lg, color: COLORS.primary, fontWeight: FONTS.bold, paddingRight: SPACING.sm },
  addBtn: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.bold },
  formScroll: { padding: SPACING.base },
  sectionTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginTop: SPACING.base, marginBottom: SPACING.sm },
  labelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.sm },
  labelChip: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surfaceAlt },
  labelChipActive: { backgroundColor: COLORS.primaryFade, borderColor: COLORS.primary },
  labelChipText: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  labelChipTextActive: { color: COLORS.primary, fontWeight: FONTS.bold },
  deliveryTypeCard: { flexDirection: 'row', alignItems: 'center', padding: SPACING.base, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface, marginBottom: SPACING.sm },
  deliveryTypeCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryFade },
  deliveryTypeLabel: { fontSize: FONTS.base, fontWeight: FONTS.semiBold, color: COLORS.textPrimary, flex: 1 },
  deliveryTypeDesc: { fontSize: FONTS.xs, color: COLORS.textMuted },
  fieldLabel: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary, marginBottom: SPACING.xs, marginTop: SPACING.sm },
  optional: { fontSize: FONTS.xs, color: COLORS.textMuted, fontWeight: FONTS.regular },
  input: { backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 2, fontSize: FONTS.base, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  selectorInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 4, marginBottom: SPACING.xs },
  selectorValue: { fontSize: FONTS.base, color: COLORS.textPrimary },
  selectorPlaceholder: { fontSize: FONTS.base, color: COLORS.textLight },
  selectorArrow: { fontSize: FONTS.sm, color: COLORS.textMuted },
  gpsBtn: { flexDirection: 'row', alignItems: 'center', padding: SPACING.base, borderRadius: RADIUS.xl, borderWidth: 2, borderColor: COLORS.primary, backgroundColor: COLORS.primaryFade, marginBottom: SPACING.base, gap: SPACING.sm },
  gpsBtnActive: { backgroundColor: '#E8F5E9', borderColor: COLORS.success },
  gpsBtnIcon: { fontSize: 28 },
  gpsBtnText: { flex: 1 },
  gpsBtnTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.primary },
  gpsBtnSub: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  defaultToggle: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginVertical: SPACING.base },
  toggleBox: { width: 22, height: 22, borderWidth: 2, borderColor: COLORS.border, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  toggleBoxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  toggleCheck: { color: 'white', fontSize: FONTS.xs, fontWeight: FONTS.bold },
  defaultToggleText: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  saveBtn: { marginTop: SPACING.base },
  listContent: { padding: SPACING.sm, paddingBottom: 100 },
  addressCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.base, marginBottom: SPACING.sm, borderWidth: 1.5, borderColor: COLORS.border, ...SHADOWS.sm },
  addressCardDefault: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryFade },
  defaultBadge: { alignSelf: 'flex-start', backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 2, marginBottom: SPACING.sm },
  defaultBadgeText: { color: 'white', fontSize: FONTS.xs, fontWeight: FONTS.bold },
  addressCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  addressLabelWrap: { gap: 2 },
  addressLabel: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  deliveryTypeText: { fontSize: FONTS.xs, color: COLORS.textMuted },
  addressCardActions: { flexDirection: 'row', gap: SPACING.sm },
  editBtn: { width: 32, height: 32, borderRadius: RADIUS.full, backgroundColor: COLORS.primaryFade, alignItems: 'center', justifyContent: 'center' },
  editBtnText: { fontSize: 14 },
  deleteBtn: { width: 32, height: 32, borderRadius: RADIUS.full, backgroundColor: COLORS.dangerLight, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontSize: 14 },
  addressName: { fontSize: FONTS.base, fontWeight: FONTS.semiBold, color: COLORS.textPrimary, marginBottom: 2 },
  addressPhone: { fontSize: FONTS.sm, color: COLORS.textSecondary, marginBottom: 4 },
  addressDisplay: { fontSize: FONTS.sm, color: COLORS.textSecondary, marginBottom: 2 },
  addressLandmark: { fontSize: FONTS.sm, color: COLORS.textMuted, marginBottom: 4 },
  gpsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  gpsText: { fontSize: FONTS.xs, color: COLORS.success, fontWeight: FONTS.medium },
  mapsLink: { fontSize: FONTS.xs, color: COLORS.primary, fontWeight: FONTS.semiBold, marginBottom: SPACING.sm },
  setDefaultBtn: { alignSelf: 'flex-start', paddingHorizontal: SPACING.base, paddingVertical: SPACING.xs, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.primary, marginTop: SPACING.sm },
  setDefaultText: { fontSize: FONTS.xs, color: COLORS.primary, fontWeight: FONTS.semiBold },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: FONTS.base, color: COLORS.textMuted },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  emptyIcon: { fontSize: 64, marginBottom: SPACING.base },
  emptyTitle: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  emptyText: { fontSize: FONTS.sm, color: COLORS.textMuted, textAlign: 'center', marginBottom: SPACING.xl },
  emptyBtn: { minWidth: 200 },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerContainer: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS['2xl'], borderTopRightRadius: RADIUS['2xl'], maxHeight: '70%', paddingBottom: Platform.OS === 'ios' ? 34 : 16 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  pickerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  pickerClose: { fontSize: FONTS.xl, color: COLORS.textMuted, fontWeight: FONTS.bold },
  pickerItem: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  pickerItemText: { fontSize: FONTS.base, color: COLORS.textPrimary },
});
