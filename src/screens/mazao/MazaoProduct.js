/**
 * VUMA Mazao — Add/Edit Crop Product Screen
 * For farmers/vendors to list agricultural products
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  TextInput, Alert, Platform, Modal, FlatList, Image, Switch,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSelector } from 'react-redux';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../utils/constants';
import Button from '../../components/common/Button';
import { post, patch, upload } from '../../api/client';

const CROP_TYPES = [
  { value: 'cereals', label: '🌾 Cereals (Nafaka)', examples: 'Maize, Rice, Wheat, Sorghum' },
  { value: 'legumes', label: '🫘 Legumes (Mikunde)', examples: 'Beans, Soybeans, Groundnuts, Peas' },
  { value: 'vegetables', label: '🥬 Vegetables (Mboga)', examples: 'Tomatoes, Onions, Cabbage, Spinach' },
  { value: 'fruits', label: '🍎 Fruits (Matunda)', examples: 'Bananas, Mangoes, Avocados, Pineapples' },
  { value: 'roots', label: '🥔 Roots & Tubers', examples: 'Cassava, Sweet Potato, Yam, Potato' },
  { value: 'cash_crops', label: '☕ Cash Crops', examples: 'Coffee, Tea, Tobacco, Cashew, Cotton' },
  { value: 'spices', label: '🌿 Spices & Herbs', examples: 'Ginger, Turmeric, Cloves, Cardamom' },
  { value: 'livestock', label: '🐄 Livestock & Poultry', examples: 'Cattle, Goats, Chickens, Pigs' },
  { value: 'dairy', label: '🥛 Dairy & Eggs', examples: 'Milk, Eggs, Butter, Cheese' },
  { value: 'fish', label: '🐟 Fish & Seafood', examples: 'Tilapia, Sardines, Prawns, Dried Fish' },
  { value: 'other', label: '📦 Other', examples: 'Other agricultural products' },
];

const UNITS = [
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'g', label: 'Gram (g)' },
  { value: 'ton', label: 'Ton' },
  { value: 'bag_50', label: 'Bag - 50kg' },
  { value: 'bag_100', label: 'Bag - 100kg' },
  { value: 'crate', label: 'Crate' },
  { value: 'bunch', label: 'Bunch' },
  { value: 'bucket', label: 'Bucket' },
  { value: 'piece', label: 'Piece' },
  { value: 'litre', label: 'Litre' },
];

const QUALITY_GRADES = [
  { value: 'A', label: '⭐ Grade A — Premium', color: COLORS.success },
  { value: 'B', label: '✅ Grade B — Standard', color: COLORS.primary },
  { value: 'C', label: '🔵 Grade C — Economy', color: COLORS.warning },
  { value: 'mixed', label: '📦 Mixed Grade', color: COLORS.textMuted },
];

const SELLING_TYPES = [
  { value: 'retail', label: '🛒 Retail Only' },
  { value: 'wholesale', label: '🏭 Wholesale Only' },
  { value: 'both', label: '🛒🏭 Retail & Wholesale' },
];

const TANZANIA_REGIONS = [
  'Arusha', 'Dar es Salaam', 'Dodoma', 'Geita', 'Iringa',
  'Kagera', 'Katavi', 'Kigoma', 'Kilimanjaro', 'Lindi',
  'Manyara', 'Mara', 'Mbeya', 'Morogoro', 'Mtwara',
  'Mwanza', 'Njombe', 'Pwani', 'Rukwa', 'Ruvuma',
  'Shinyanga', 'Simiyu', 'Singida', 'Songwe', 'Tabora',
  'Tanga', 'Zanzibar North', 'Zanzibar South', 'Zanzibar West',
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const EMPTY_FORM = {
  name: '', name_swahili: '', description: '',
  crop_type: '', quality_grade: 'B', selling_type: 'both',
  unit: 'kg', retail_price: '', wholesale_price: '', wholesale_min_qty: '100',
  available_stock: '', min_order_qty: '1', max_order_qty: '',
  is_available: true, is_seasonal: false,
  season_start_month: '', season_end_month: '',
  harvest_date: '', next_harvest_date: '',
  farm_region: '', farm_district: '',
  farm_latitude: null, farm_longitude: null,
  offers_delivery: false, offers_pickup: true,
  delivery_notes: '',
};

const PickerModal = ({ visible, title, data, onSelect, onClose, keyFn, labelFn, descFn }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.pickerOverlay}>
      <View style={styles.pickerContainer}>
        <View style={styles.pickerHeader}>
          <Text style={styles.pickerTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.pickerClose}>✕</Text></TouchableOpacity>
        </View>
        <FlatList
          data={data}
          keyExtractor={keyFn || (item => item.toString())}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.pickerItem} onPress={() => { onSelect(item); onClose(); }}>
              <Text style={styles.pickerItemText}>{labelFn ? labelFn(item) : item}</Text>
              {descFn && <Text style={styles.pickerItemDesc}>{descFn(item)}</Text>}
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      </View>
    </View>
  </Modal>
);

export default function MazaoAddProduct({ navigation, route }) {
  const editingProduct = route?.params?.product;
  const [form, setFormState] = useState(editingProduct ? {
    name: editingProduct.name || '',
    name_swahili: editingProduct.name_swahili || '',
    description: editingProduct.description || '',
    crop_type: editingProduct.crop_type || '',
    quality_grade: editingProduct.quality_grade || 'B',
    selling_type: editingProduct.selling_type || 'both',
    unit: editingProduct.unit || 'kg',
    retail_price: String(editingProduct.retail_price || ''),
    wholesale_price: String(editingProduct.wholesale_price || ''),
    wholesale_min_qty: String(editingProduct.wholesale_min_qty || '100'),
    available_stock: String(editingProduct.available_stock || ''),
    min_order_qty: String(editingProduct.min_order_qty || '1'),
    max_order_qty: String(editingProduct.max_order_qty || ''),
    is_available: editingProduct.is_available !== false,
    is_seasonal: editingProduct.is_seasonal || false,
    season_start_month: String(editingProduct.season_start_month || ''),
    season_end_month: String(editingProduct.season_end_month || ''),
    harvest_date: editingProduct.harvest_date || '',
    next_harvest_date: editingProduct.next_harvest_date || '',
    farm_region: editingProduct.farm_region || '',
    farm_district: editingProduct.farm_district || '',
    farm_latitude: editingProduct.farm_latitude || null,
    farm_longitude: editingProduct.farm_longitude || null,
    offers_delivery: editingProduct.offers_delivery || false,
    offers_pickup: editingProduct.offers_pickup !== false,
    delivery_notes: editingProduct.delivery_notes || '',
  } : EMPTY_FORM);

  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [imageUri, setImageUri] = useState(null);
  const [showCropTypePicker, setShowCropTypePicker] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [showRegionPicker, setShowRegionPicker] = useState(false);
  const [showStartMonthPicker, setShowStartMonthPicker] = useState(false);
  const [showEndMonthPicker, setShowEndMonthPicker] = useState(false);

  const setField = (key, value) => setFormState(prev => ({ ...prev, [key]: value }));

  const getGPS = async () => {
    setGpsLoading(true);
    try {
      const Location = await import('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission denied'); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setFormState(prev => ({ ...prev, farm_latitude: loc.coords.latitude, farm_longitude: loc.coords.longitude }));
      Alert.alert('📍 Farm Location Pinned!', `±${Math.round(loc.coords.accuracy)}m accuracy`);
    } catch { Alert.alert('Error', 'Could not get GPS'); } finally { setGpsLoading(false); }
  };

  const pickImage = async () => {
    try {
      const ImagePicker = await import('expo-image-picker');
      await ImagePicker.requestMediaLibraryPermissionsAsync();
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
      if (!result.canceled && result.assets?.[0]) setImageUri(result.assets[0].uri);
    } catch { Alert.alert('Error', 'Could not open gallery'); }
  };

  const validate = () => {
    if (!form.name.trim()) { Alert.alert('Required', 'Product name is required'); return false; }
    if (!form.crop_type) { Alert.alert('Required', 'Please select crop type'); return false; }
    if (!form.unit) { Alert.alert('Required', 'Please select unit of measure'); return false; }
    if (!form.retail_price || isNaN(form.retail_price)) { Alert.alert('Required', 'Valid retail price required'); return false; }
    if (!form.available_stock || isNaN(form.available_stock)) { Alert.alert('Required', 'Stock quantity required'); return false; }
    if (!form.farm_region) { Alert.alert('Required', 'Farm region is required'); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const formData = new FormData();
      const fields = { ...form };

      // Convert numeric fields
      ['retail_price', 'wholesale_price', 'wholesale_min_qty', 'available_stock',
        'min_order_qty', 'max_order_qty', 'season_start_month', 'season_end_month',
        'farm_latitude', 'farm_longitude'].forEach(key => {
        if (fields[key] !== '' && fields[key] !== null && fields[key] !== undefined) {
          formData.append(key, String(fields[key]));
        }
      });

      // String fields
      ['name', 'name_swahili', 'description', 'crop_type', 'quality_grade',
        'selling_type', 'unit', 'harvest_date', 'next_harvest_date',
        'farm_region', 'farm_district', 'delivery_notes'].forEach(key => {
        formData.append(key, fields[key] || '');
      });

      // Boolean fields
      ['is_available', 'is_seasonal', 'offers_delivery', 'offers_pickup'].forEach(key => {
        formData.append(key, fields[key] ? 'true' : 'false');
      });

      if (imageUri) {
        formData.append('primary_image', { uri: imageUri, name: 'crop.jpg', type: 'image/jpeg' });
      }

      if (editingProduct) {
        await upload(`/products/mazao/${editingProduct.id}/`, formData);
        Alert.alert('✅ Updated!', 'Product updated successfully', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else {
        await upload('/products/mazao/', formData);
        Alert.alert('✅ Listed!', 'Your crop is now listed on Mazao Market!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not save product. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const selectedCropType = CROP_TYPES.find(c => c.value === form.crop_type);
  const selectedUnit = UNITS.find(u => u.value === form.unit);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1B4332" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editingProduct ? '✏️ Edit Crop' : '🌾 List Your Crop'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="always"
        enableOnAndroid extraScrollHeight={120}
        showsVerticalScrollIndicator={false}
      >
        {/* Image */}
        <TouchableOpacity style={styles.imageUpload} onPress={pickImage}>
          {imageUri || editingProduct?.image_url ? (
            <Image source={{ uri: imageUri || editingProduct?.image_url }} style={styles.imagePreview} resizeMode="cover" />
          ) : (
            <View style={styles.imageUploadEmpty}>
              <Text style={styles.imageUploadIcon}>📷</Text>
              <Text style={styles.imageUploadText}>Add Product Photo</Text>
              <Text style={styles.imageUploadSub}>Helps buyers see your product quality</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Crop Type */}
        <Text style={styles.sectionTitle}>🌿 Product Details</Text>

        <Text style={styles.fieldLabel}>Crop Type *</Text>
        <TouchableOpacity style={styles.selector} onPress={() => setShowCropTypePicker(true)}>
          <Text style={form.crop_type ? styles.selectorValue : styles.selectorPlaceholder}>
            {selectedCropType ? selectedCropType.label : 'Select crop type...'}
          </Text>
          <Text>▼</Text>
        </TouchableOpacity>
        {selectedCropType && (
          <Text style={styles.examplesText}>e.g. {selectedCropType.examples}</Text>
        )}

        <Text style={styles.fieldLabel}>Product Name (English) *</Text>
        <TextInput
          style={styles.input} value={form.name}
          onChangeText={v => setField('name', v)}
          placeholder="e.g. Maize, Tomatoes, Onions"
          placeholderTextColor={COLORS.textLight}
        />

        <Text style={styles.fieldLabel}>Jina la Kiswahili</Text>
        <TextInput
          style={styles.input} value={form.name_swahili}
          onChangeText={v => setField('name_swahili', v)}
          placeholder="e.g. Mahindi, Nyanya, Vitunguu"
          placeholderTextColor={COLORS.textLight}
        />

        <Text style={styles.fieldLabel}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]} value={form.description}
          onChangeText={v => setField('description', v)}
          placeholder="Describe your product quality, origin, farming method..."
          multiline numberOfLines={3} textAlignVertical="top"
          placeholderTextColor={COLORS.textLight}
        />

        {/* Quality Grade */}
        <Text style={styles.fieldLabel}>Quality Grade *</Text>
        <View style={styles.gradeRow}>
          {QUALITY_GRADES.map(g => (
            <TouchableOpacity
              key={g.value}
              style={[styles.gradeChip, form.quality_grade === g.value && { backgroundColor: g.color, borderColor: g.color }]}
              onPress={() => setField('quality_grade', g.value)}
            >
              <Text style={[styles.gradeChipText, form.quality_grade === g.value && { color: 'white' }]}>
                {g.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Pricing */}
        <Text style={styles.sectionTitle}>💰 Pricing & Stock</Text>

        <Text style={styles.fieldLabel}>Unit of Measure *</Text>
        <TouchableOpacity style={styles.selector} onPress={() => setShowUnitPicker(true)}>
          <Text style={form.unit ? styles.selectorValue : styles.selectorPlaceholder}>
            {selectedUnit ? selectedUnit.label : 'Select unit...'}
          </Text>
          <Text>▼</Text>
        </TouchableOpacity>

        <Text style={styles.fieldLabel}>Selling Type *</Text>
        <View style={styles.sellingRow}>
          {SELLING_TYPES.map(s => (
            <TouchableOpacity
              key={s.value}
              style={[styles.sellingChip, form.selling_type === s.value && styles.sellingChipActive]}
              onPress={() => setField('selling_type', s.value)}
            >
              <Text style={[styles.sellingChipText, form.selling_type === s.value && styles.sellingChipTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Retail Price (TZS per {selectedUnit?.label || 'unit'}) *</Text>
        <TextInput
          style={styles.input} value={form.retail_price}
          onChangeText={v => setField('retail_price', v)}
          placeholder="e.g. 500" keyboardType="numeric"
          placeholderTextColor={COLORS.textLight}
        />

        {form.selling_type !== 'retail' && (
          <>
            <Text style={styles.fieldLabel}>Wholesale Price (TZS)</Text>
            <TextInput
              style={styles.input} value={form.wholesale_price}
              onChangeText={v => setField('wholesale_price', v)}
              placeholder="e.g. 400 (lower than retail)"
              keyboardType="numeric" placeholderTextColor={COLORS.textLight}
            />
            <Text style={styles.fieldLabel}>Minimum Quantity for Wholesale</Text>
            <TextInput
              style={styles.input} value={form.wholesale_min_qty}
              onChangeText={v => setField('wholesale_min_qty', v)}
              placeholder="e.g. 100 kg" keyboardType="numeric"
              placeholderTextColor={COLORS.textLight}
            />
          </>
        )}

        <View style={styles.rowFields}>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>Available Stock *</Text>
            <TextInput
              style={styles.input} value={form.available_stock}
              onChangeText={v => setField('available_stock', v)}
              placeholder="e.g. 1000" keyboardType="numeric"
              placeholderTextColor={COLORS.textLight}
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>Min Order Qty</Text>
            <TextInput
              style={styles.input} value={form.min_order_qty}
              onChangeText={v => setField('min_order_qty', v)}
              placeholder="e.g. 1" keyboardType="numeric"
              placeholderTextColor={COLORS.textLight}
            />
          </View>
        </View>

        {/* Harvest & Seasonality */}
        <Text style={styles.sectionTitle}>📅 Harvest & Seasonality</Text>

        <Text style={styles.fieldLabel}>Harvest Date</Text>
        <TextInput
          style={styles.input} value={form.harvest_date}
          onChangeText={v => setField('harvest_date', v)}
          placeholder="YYYY-MM-DD (e.g. 2026-07-01)"
          placeholderTextColor={COLORS.textLight}
        />

        <Text style={styles.fieldLabel}>Next Harvest Date (if seasonal)</Text>
        <TextInput
          style={styles.input} value={form.next_harvest_date}
          onChangeText={v => setField('next_harvest_date', v)}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={COLORS.textLight}
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Seasonal Product</Text>
          <Switch
            value={form.is_seasonal}
            onValueChange={v => setField('is_seasonal', v)}
            trackColor={{ true: '#1B4332' }}
          />
        </View>

        {form.is_seasonal && (
          <View style={styles.rowFields}>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Season Start</Text>
              <TouchableOpacity style={styles.selector} onPress={() => setShowStartMonthPicker(true)}>
                <Text style={form.season_start_month ? styles.selectorValue : styles.selectorPlaceholder}>
                  {form.season_start_month ? MONTHS[Number(form.season_start_month) - 1] : 'Month...'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Season End</Text>
              <TouchableOpacity style={styles.selector} onPress={() => setShowEndMonthPicker(true)}>
                <Text style={form.season_end_month ? styles.selectorValue : styles.selectorPlaceholder}>
                  {form.season_end_month ? MONTHS[Number(form.season_end_month) - 1] : 'Month...'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Farm Location */}
        <Text style={styles.sectionTitle}>📍 Farm Location</Text>

        <TouchableOpacity
          style={[styles.gpsBtn, form.farm_latitude && styles.gpsBtnActive]}
          onPress={getGPS} disabled={gpsLoading}
        >
          <Text style={styles.gpsBtnIcon}>📍</Text>
          <View style={styles.gpsBtnContent}>
            <Text style={[styles.gpsBtnTitle, form.farm_latitude && { color: '#1B4332' }]}>
              {gpsLoading ? 'Getting location...' : form.farm_latitude ? '✓ Farm Location Pinned' : 'Pin My Farm Location'}
            </Text>
            <Text style={styles.gpsBtnSub}>
              {form.farm_latitude
                ? `${Number(form.farm_latitude).toFixed(5)}, ${Number(form.farm_longitude).toFixed(5)}`
                : 'Helps buyers know where your farm is'}
            </Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.fieldLabel}>Region *</Text>
        <TouchableOpacity style={styles.selector} onPress={() => setShowRegionPicker(true)}>
          <Text style={form.farm_region ? styles.selectorValue : styles.selectorPlaceholder}>
            {form.farm_region || 'Select region...'}
          </Text>
          <Text>▼</Text>
        </TouchableOpacity>

        <Text style={styles.fieldLabel}>District</Text>
        <TextInput
          style={styles.input} value={form.farm_district}
          onChangeText={v => setField('farm_district', v)}
          placeholder="e.g. Kilosa, Morogoro Rural"
          placeholderTextColor={COLORS.textLight}
        />

        {/* Delivery */}
        <Text style={styles.sectionTitle}>🚚 Delivery Options</Text>

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>Offers Pickup</Text>
            <Text style={styles.switchSub}>Buyers can collect from your farm</Text>
          </View>
          <Switch value={form.offers_pickup} onValueChange={v => setField('offers_pickup', v)} trackColor={{ true: '#1B4332' }} />
        </View>

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>Offers Delivery</Text>
            <Text style={styles.switchSub}>You can deliver to buyers</Text>
          </View>
          <Switch value={form.offers_delivery} onValueChange={v => setField('offers_delivery', v)} trackColor={{ true: '#1B4332' }} />
        </View>

        {form.offers_delivery && (
          <>
            <Text style={styles.fieldLabel}>Delivery Notes</Text>
            <TextInput
              style={styles.input} value={form.delivery_notes}
              onChangeText={v => setField('delivery_notes', v)}
              placeholder="e.g. Can deliver within Dodoma region, min order 100kg"
              placeholderTextColor={COLORS.textLight}
            />
          </>
        )}

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Product Available Now</Text>
          <Switch value={form.is_available} onValueChange={v => setField('is_available', v)} trackColor={{ true: '#1B4332' }} />
        </View>

        <Button
          title={editingProduct ? 'Update Product' : '🌾 List on Mazao Market'}
          onPress={handleSubmit}
          loading={saving}
          fullWidth
          style={styles.submitBtn}
        />
        <View style={{ height: 80 }} />
      </KeyboardAwareScrollView>

      {/* Pickers */}
      <PickerModal
        visible={showCropTypePicker} title="Select Crop Type"
        data={CROP_TYPES}
        keyFn={item => item.value}
        labelFn={item => item.label}
        descFn={item => item.examples}
        onSelect={item => setField('crop_type', item.value)}
        onClose={() => setShowCropTypePicker(false)}
      />
      <PickerModal
        visible={showUnitPicker} title="Unit of Measure"
        data={UNITS}
        keyFn={item => item.value}
        labelFn={item => item.label}
        onSelect={item => setField('unit', item.value)}
        onClose={() => setShowUnitPicker(false)}
      />
      <PickerModal
        visible={showRegionPicker} title="Select Region"
        data={TANZANIA_REGIONS}
        onSelect={r => setField('farm_region', r)}
        onClose={() => setShowRegionPicker(false)}
      />
      <PickerModal
        visible={showStartMonthPicker} title="Season Start Month"
        data={MONTHS}
        onSelect={(m, i) => setField('season_start_month', String(MONTHS.indexOf(m) + 1))}
        onClose={() => setShowStartMonthPicker(false)}
      />
      <PickerModal
        visible={showEndMonthPicker} title="Season End Month"
        data={MONTHS}
        onSelect={(m) => setField('season_end_month', String(MONTHS.indexOf(m) + 1))}
        onClose={() => setShowEndMonthPicker(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1B4332', paddingHorizontal: SPACING.base, paddingTop: Platform.OS === 'ios' ? 50 : SPACING.base, paddingBottom: SPACING.base },
  backBtn: { fontSize: FONTS.xl, color: 'white', fontWeight: FONTS.bold },
  headerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: 'white' },
  scroll: { padding: SPACING.base },
  imageUpload: { height: 160, borderWidth: 2, borderColor: '#52B788', borderStyle: 'dashed', borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: SPACING.base, backgroundColor: '#D8F3DC' },
  imagePreview: { width: '100%', height: '100%' },
  imageUploadEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  imageUploadIcon: { fontSize: 36 },
  imageUploadText: { fontSize: FONTS.base, fontWeight: FONTS.semiBold, color: '#1B4332' },
  imageUploadSub: { fontSize: FONTS.xs, color: COLORS.textMuted },
  sectionTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: '#1B4332', marginTop: SPACING.base, marginBottom: SPACING.sm, paddingBottom: SPACING.xs, borderBottomWidth: 2, borderBottomColor: '#D8F3DC' },
  fieldLabel: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary, marginBottom: SPACING.xs, marginTop: SPACING.sm },
  input: { backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 2, fontSize: FONTS.base, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  textArea: { minHeight: 80, textAlignVertical: 'top', paddingTop: SPACING.sm },
  selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 4, marginBottom: SPACING.xs },
  selectorValue: { fontSize: FONTS.base, color: COLORS.textPrimary },
  selectorPlaceholder: { fontSize: FONTS.base, color: COLORS.textLight },
  examplesText: { fontSize: FONTS.xs, color: COLORS.textMuted, marginBottom: SPACING.sm, fontStyle: 'italic' },
  gradeRow: { gap: SPACING.sm, marginBottom: SPACING.sm },
  gradeChip: { padding: SPACING.sm, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  gradeChipText: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  sellingRow: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap', marginBottom: SPACING.sm },
  sellingChip: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs + 2, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: '#52B788', backgroundColor: COLORS.surface },
  sellingChipActive: { backgroundColor: '#1B4332', borderColor: '#1B4332' },
  sellingChipText: { fontSize: FONTS.xs, color: '#1B4332', fontWeight: FONTS.semiBold },
  sellingChipTextActive: { color: 'white' },
  rowFields: { flexDirection: 'row', gap: SPACING.sm },
  halfField: { flex: 1 },
  gpsBtn: { flexDirection: 'row', alignItems: 'center', padding: SPACING.base, borderRadius: RADIUS.xl, borderWidth: 2, borderColor: '#52B788', backgroundColor: '#D8F3DC', marginVertical: SPACING.sm, gap: SPACING.sm },
  gpsBtnActive: { borderColor: '#1B4332', backgroundColor: '#B7E4C7' },
  gpsBtnIcon: { fontSize: 28 },
  gpsBtnContent: { flex: 1 },
  gpsBtnTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: '#52B788' },
  gpsBtnSub: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  switchLabel: { fontSize: FONTS.base, fontWeight: FONTS.semiBold, color: COLORS.textPrimary },
  switchSub: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  submitBtn: { marginTop: SPACING.xl, backgroundColor: '#1B4332' },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerContainer: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS['2xl'], borderTopRightRadius: RADIUS['2xl'], maxHeight: '75%', paddingBottom: Platform.OS === 'ios' ? 34 : 16 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  pickerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  pickerClose: { fontSize: FONTS.xl, color: COLORS.textMuted, fontWeight: FONTS.bold },
  pickerItem: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  pickerItemText: { fontSize: FONTS.base, color: COLORS.textPrimary },
  pickerItemDesc: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
});
