/**
 * VUMA Store — Vendor Products Screen
 * Adds: short description, key features (1-5 bullets), character
 * counters (title 120 / short desc 300 / description 1000), and a
 * single product video picker+upload — all backed by real, verified
 * backend fields and endpoints added tonight.
 *
 * Everything else — multi-image upload, AI description, pricing
 * check, variants, image quality checks — is unchanged.
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, StatusBar,
  Platform, Alert, RefreshControl, Modal, TextInput, Image, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchMyProducts, createProduct, updateProduct, deleteProduct,
  fetchCategories,
  selectMyProducts, selectProductsLoading, selectProductsErrors,
  selectCategories,
} from '../../store/productSlice';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../utils/constants';
import { formatPrice } from '../../utils/helpers';
import Button from '../../components/common/Button';
import Loading, { SkeletonListItem } from '../../components/common/Loading';
import { EmptyState } from '../../components/common/ErrorMessage';
import { VendorSizePicker, requiresSize } from '../../components/SizeSelector';
import { MultiImagePicker } from '../../components/MultiImagePicker';
import VariantManager from '../../components/VariantManager';
import { ImageQualityWarning, ImageQualityBadge } from '../../components/ImageQualityWarning';

const PRODUCT_STATUS = [
  { label: 'Active', value: 'active' },
  { label: 'Draft', value: 'draft' },
  { label: 'Out of Stock', value: 'out_of_stock' },
];

// Simple browse tabs matching the reference (All/Active/Inactive) —
// this is separate from the actual 3-value product.status field used
// when editing a product (still Active/Draft/Out of Stock there).
const BROWSE_TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
];

const TITLE_LIMIT = 120;
const SHORT_DESC_LIMIT = 300;
const DESC_LIMIT = 1000;
const MAX_KEY_FEATURES = 5;
const MAX_VIDEO_MB = 50;

const EMPTY_FORM = {
  name: '', description: '', short_description: '', price: '', stock: '',
  category: '', categoryId: '', sku: '', weight: '', status: 'active',
  available_sizes: [], requires_size: false, key_features: [],
};

// ── Character counter ─────────────────────────────────
const CharCounter = ({ current, limit }) => (
  <Text style={[styles.charCounter, current > limit && styles.charCounterOver]}>
    {current}/{limit}
  </Text>
);

// ── Key Features editor ───────────────────────────────
const KeyFeaturesEditor = ({ features, onChange }) => {
  const [draft, setDraft] = useState('');

  const addFeature = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (features.length >= MAX_KEY_FEATURES) {
      Alert.alert('Limit reached', `You can add up to ${MAX_KEY_FEATURES} key features.`);
      return;
    }
    onChange([...features, trimmed]);
    setDraft('');
  };

  const removeFeature = (index) => {
    onChange(features.filter((_, i) => i !== index));
  };

  return (
    <View>
      <Text style={styles.fieldLabel}>Key Features <Text style={styles.fieldHint}>({features.length}/{MAX_KEY_FEATURES})</Text></Text>
      {features.map((f, i) => (
        <View key={i} style={styles.featureRow}>
          <Text style={styles.featureBullet}>•</Text>
          <Text style={styles.featureText} numberOfLines={2}>{f}</Text>
          <TouchableOpacity onPress={() => removeFeature(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.featureRemove}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}
      {features.length < MAX_KEY_FEATURES && (
        <View style={styles.featureAddRow}>
          <TextInput
            style={styles.featureInput}
            value={draft}
            onChangeText={setDraft}
            placeholder="e.g. Waterproof, 2-year warranty"
            placeholderTextColor={COLORS.textLight}
            onSubmitEditing={addFeature}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.featureAddBtn} onPress={addFeature}>
            <Text style={styles.featureAddBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// ── Video picker ───────────────────────────────────────
const VideoPicker = ({ videoAsset, existingVideoUrl, onPick, onRemove, uploading }) => {
  const hasVideo = videoAsset || existingVideoUrl;
  return (
    <View>
      <Text style={styles.fieldLabel}>Product Video <Text style={styles.fieldHint}>(optional, max {MAX_VIDEO_MB}MB)</Text></Text>
      {hasVideo ? (
        <View style={styles.videoPreview}>
          <Text style={styles.videoPreviewIcon}>🎬</Text>
          <Text style={styles.videoPreviewText} numberOfLines={1}>
            {videoAsset ? (videoAsset.fileName || 'New video selected') : 'Current video'}
          </Text>
          {uploading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <TouchableOpacity onPress={onRemove}>
              <Text style={styles.videoRemove}>✕ Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <TouchableOpacity style={styles.videoPickBtn} onPress={onPick} activeOpacity={0.8}>
          <Text style={styles.videoPickIcon}>🎥</Text>
          <Text style={styles.videoPickText}>Tap to add a short product video</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ── Category Picker Modal ─────────────────────────────
const CategoryPickerModal = memo(({ visible, categories, onSelect, onClose, loading }) => {
  const [search, setSearch] = useState('');
  const filtered = categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerContainer}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select Category</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.pickerClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.pickerSearch}>
            <Text style={styles.pickerSearchIcon}>🔍</Text>
            <TextInput
              style={styles.pickerSearchInput}
              value={search} onChangeText={setSearch}
              placeholder="Search categories..."
              placeholderTextColor={COLORS.textLight}
              autoFocus
            />
          </View>
          {loading ? (
            <View style={styles.pickerLoading}>
              <Text style={styles.pickerLoadingText}>Loading categories...</Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id?.toString() || item.slug}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.pickerItem} onPress={() => { onSelect(item); setSearch(''); }}>
                  <Text style={styles.pickerItemText}>{item.name}</Text>
                  <Text style={styles.pickerItemCount}>{item.product_count || 0} products</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.pickerEmpty}>No categories found</Text>}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
              keyboardShouldPersistTaps="always"
            />
          )}
        </View>
      </View>
    </Modal>
  );
});

// ── Product Modal ─────────────────────────────────────
const ProductModal = memo(({
  visible, onClose, editingProduct,
  form, setField, formErrors,
  productImages, onAddImages, onRemoveImage, onSetPrimaryImage,
  onSubmit, loading, uploading, uploadingIndex,
  onOpenCategoryPicker, onToggleSize,
  variants, onVariantsChange,
  onGenerateDescription, aiDescLoading,
  onCheckPricing, pricingLoading, pricingSuggestion,
  videoAsset, existingVideoUrl, onPickVideo, onRemoveVideo, videoUploading,
}) => (
  <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent={false}>
    <View style={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.modalClose}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.modalTitle}>{editingProduct ? '✏️ Edit Product' : '➕ Add Product'}</Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.modalScroll}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={120}
        extraHeight={120}
      >
        {/* Multi Image Upload */}
        <MultiImagePicker
          images={productImages}
          onAdd={onAddImages}
          onRemove={onRemoveImage}
          onSetPrimary={onSetPrimaryImage}
          uploading={uploading}
          uploadingIndex={uploadingIndex}
        />

        {/* Video */}
        <VideoPicker
          videoAsset={videoAsset}
          existingVideoUrl={existingVideoUrl}
          onPick={onPickVideo}
          onRemove={onRemoveVideo}
          uploading={videoUploading}
        />

        {/* Name */}
        <View style={styles.labelRow}>
          <Text style={styles.fieldLabel}>Product Name *</Text>
          <CharCounter current={form.name.length} limit={TITLE_LIMIT} />
        </View>
        <TextInput
          style={[styles.fieldInput, formErrors.name && styles.fieldInputError]}
          value={form.name} onChangeText={(v) => setField('name', v.slice(0, TITLE_LIMIT))}
          placeholder="Product name" placeholderTextColor={COLORS.textLight}
          returnKeyType="next" blurOnSubmit={false} maxLength={TITLE_LIMIT}
        />
        {formErrors.name && <Text style={styles.fieldError}>⚠️ {formErrors.name}</Text>}

        {/* Short Description */}
        <View style={styles.labelRow}>
          <Text style={styles.fieldLabel}>Short Description</Text>
          <CharCounter current={form.short_description.length} limit={SHORT_DESC_LIMIT} />
        </View>
        <TextInput
          style={styles.fieldInput}
          value={form.short_description} onChangeText={(v) => setField('short_description', v.slice(0, SHORT_DESC_LIMIT))}
          placeholder="One or two sentences shown at the top of the product page"
          placeholderTextColor={COLORS.textLight} maxLength={SHORT_DESC_LIMIT}
          multiline
        />
        {formErrors.short_description && <Text style={styles.fieldError}>⚠️ {formErrors.short_description}</Text>}

        {/* Full Description */}
        <View style={styles.labelRow}>
          <Text style={styles.fieldLabel}>Full Description</Text>
          <CharCounter current={form.description.length} limit={DESC_LIMIT} />
        </View>
        <TextInput
          style={[styles.fieldInput, styles.textArea]}
          value={form.description} onChangeText={(v) => setField('description', v.slice(0, DESC_LIMIT))}
          placeholder="Product description..." multiline numberOfLines={4}
          textAlignVertical="top" placeholderTextColor={COLORS.textLight}
          blurOnSubmit={false} maxLength={DESC_LIMIT}
        />
        {formErrors.description && <Text style={styles.fieldError}>⚠️ {formErrors.description}</Text>}
        <TouchableOpacity
          style={styles.aiBtn}
          onPress={onGenerateDescription}
          disabled={aiDescLoading}
          activeOpacity={0.85}
        >
          {aiDescLoading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={styles.aiBtnText}>✨ Generate with AI</Text>
          )}
        </TouchableOpacity>

        {/* Key Features */}
        <KeyFeaturesEditor
          features={form.key_features}
          onChange={(features) => setField('key_features', features)}
        />

        {/* Price & Stock */}
        <View style={styles.rowFields}>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>Price (TZS) *</Text>
            <TextInput
              style={[styles.fieldInput, formErrors.price && styles.fieldInputError]}
              value={form.price} onChangeText={(v) => setField('price', v)}
              placeholder="0" keyboardType="numeric" placeholderTextColor={COLORS.textLight}
              returnKeyType="next" blurOnSubmit={false}
            />
            {formErrors.price && <Text style={styles.fieldError}>⚠️ {formErrors.price}</Text>}
            <TouchableOpacity
              style={styles.pricingCheckBtn}
              onPress={onCheckPricing}
              disabled={pricingLoading}
              activeOpacity={0.85}
            >
              {pricingLoading ? (
                <ActivityIndicator size="small" color={COLORS.info} />
              ) : (
                <Text style={styles.pricingCheckBtnText}>📊 Check Pricing</Text>
              )}
            </TouchableOpacity>
            {pricingSuggestion && pricingSuggestion.sample_size > 0 && (
              <View style={styles.pricingResult}>
                <Text style={styles.pricingResultText}>
                  Category avg: TZS {Math.round(pricingSuggestion.category_avg_price).toLocaleString()}
                  {pricingSuggestion.vs_category_avg_pct !== undefined && (
                    <Text> ({pricingSuggestion.vs_category_avg_pct > 0 ? '+' : ''}{pricingSuggestion.vs_category_avg_pct}% vs avg)</Text>
                  )}
                </Text>
                {pricingSuggestion.suggestion && (
                  <Text style={styles.pricingResultSuggestion}>{pricingSuggestion.suggestion}</Text>
                )}
              </View>
            )}
            {pricingSuggestion && pricingSuggestion.sample_size === 0 && (
              <Text style={styles.pricingResultEmpty}>No comparable products in this category yet.</Text>
            )}
          </View>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>Stock *</Text>
            <TextInput
              style={[styles.fieldInput, formErrors.stock && styles.fieldInputError]}
              value={form.stock} onChangeText={(v) => setField('stock', v)}
              placeholder="0" keyboardType="numeric" placeholderTextColor={COLORS.textLight}
              returnKeyType="next" blurOnSubmit={false}
            />
            {formErrors.stock && <Text style={styles.fieldError}>⚠️ {formErrors.stock}</Text>}
          </View>
        </View>

        {/* SKU & Weight */}
        <View style={styles.rowFields}>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>SKU</Text>
            <TextInput
              style={styles.fieldInput} value={form.sku}
              onChangeText={(v) => setField('sku', v)}
              placeholder="SKU-001" autoCapitalize="characters"
              placeholderTextColor={COLORS.textLight} returnKeyType="next" blurOnSubmit={false}
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>Weight (kg)</Text>
            <TextInput
              style={styles.fieldInput} value={form.weight}
              onChangeText={(v) => setField('weight', v)}
              placeholder="0.5" keyboardType="decimal-pad"
              placeholderTextColor={COLORS.textLight} returnKeyType="next" blurOnSubmit={false}
            />
          </View>
        </View>

        {/* Category Dropdown */}
        <Text style={styles.fieldLabel}>Category *</Text>
        <TouchableOpacity
          style={[styles.fieldInput, styles.categorySelector, formErrors.category && styles.fieldInputError]}
          onPress={onOpenCategoryPicker}
        >
          <Text style={form.category ? styles.categorySelected : styles.categoryPlaceholder}>
            {form.category || 'Select a category...'}
          </Text>
          <Text style={styles.categoryArrow}>▼</Text>
        </TouchableOpacity>
        {formErrors.category && <Text style={styles.fieldError}>⚠️ {formErrors.category}</Text>}

        {/* Size Selector */}
        {requiresSize(form.category) && (
          <VendorSizePicker
            categoryName={form.category}
            selectedSizes={form.available_sizes || []}
            onToggle={onToggleSize}
          />
        )}

        {/* Product Variants — size/color/material/storage/etc, based on category */}
        <VariantManager
          categoryName={form.category}
          variants={variants}
          onChange={onVariantsChange}
        />

        {/* Status */}
        <Text style={styles.fieldLabel}>Status</Text>
        <View style={styles.statusOptions}>
          {PRODUCT_STATUS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.statusOption, form.status === opt.value && styles.statusOptionActive]}
              onPress={() => setField('status', opt.value)}
            >
              <Text style={[styles.statusOptionText, form.status === opt.value && styles.statusOptionTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button
          title={editingProduct ? 'Update Product' : 'Add Product'}
          onPress={onSubmit}
          loading={loading || uploading}
          fullWidth style={styles.submitBtn}
        />
        <View style={{ height: 120 }} />
      </KeyboardAwareScrollView>
    </View>
  </Modal>
));

// ── Product Item ──────────────────────────────────────
const ProductItem = memo(({ item, onEdit, onDelete }) => {
  const imageUrl = item.primary_image || item.images?.[0]?.image_url;
  const isLowStock = item.stock > 0 && item.stock <= 5;
  const isOutOfStock = item.stock <= 0;
  const imageCount = item.images?.length || 0;
  const isActive = item.status === 'active';
  return (
    <View style={styles.productItem}>
      <View style={styles.productImageWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Text style={{ fontSize: 24 }}>📦</Text>
          </View>
        )}
        {imageCount > 1 && (
          <View style={styles.imageCountBadge}>
            <Text style={styles.imageCountText}>📷 {imageCount}</Text>
          </View>
        )}
        {item.video_url && (
          <View style={styles.videoBadge}>
            <Text style={styles.videoBadgeText}>🎬</Text>
          </View>
        )}
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.productPrice}>{formatPrice(item.price)}</Text>
        {item.available_sizes?.length > 0 && (
          <Text style={styles.sizesText}>📏 {item.available_sizes.join(', ')}</Text>
        )}
        {item.view_count > 0 && (
          <Text style={styles.viewsText}>👁 {item.view_count} views</Text>
        )}
        <View style={styles.productMeta}>
          <Text style={[styles.stockText, isOutOfStock && styles.stockDanger, isLowStock && styles.stockWarning]}>
            {isOutOfStock ? 'Out of stock' : isLowStock ? `Low stock: ${item.stock}` : `Stock: ${item.stock}`}
          </Text>
          <View style={styles.metaDivider} />
          <View style={styles.metaStatusRow}>
            <View style={[styles.statusDot, isActive ? styles.statusDotActive : styles.statusDotInactive]} />
            <Text style={[styles.metaStatusText, isActive ? styles.statusTextActive : styles.statusTextInactive]}>
              {isActive ? 'Active' : item.status === 'draft' ? 'Draft' : 'Inactive'}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.productActions}>
        <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(item)}>
          <Text style={styles.editBtnText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(item)}>
          <Text style={styles.deleteBtnText}>🗑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

// ── Main Component ────────────────────────────────────
export default function VendorProducts({ navigation, route }) {
  const dispatch = useDispatch();
  const products = useSelector(selectMyProducts);
  const loading = useSelector(selectProductsLoading);
  const errors = useSelector(selectProductsErrors);
  const categories = useSelector(selectCategories);

  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setFormState] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [browseTab, setBrowseTab] = useState('all');
  const [productImages, setProductImages] = useState([]); // array of {uri, ...} or existing {image_url, id}
  const [uploading, setUploading] = useState(false);
  const [qualityResults, setQualityResults] = useState([]);
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [currentQuality, setCurrentQuality] = useState(null);
  const [currentImageUri, setCurrentImageUri] = useState(null);
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const [variants, setVariants] = useState([]);
  const [aiDescLoading, setAiDescLoading] = useState(false);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingSuggestion, setPricingSuggestion] = useState(null);
  const [videoAsset, setVideoAsset] = useState(null); // newly picked, not yet uploaded
  const [existingVideoUrl, setExistingVideoUrl] = useState('');
  const [videoUploading, setVideoUploading] = useState(false);

  useEffect(() => {
    dispatch(fetchMyProducts());
    dispatch(fetchCategories());
    if (route?.params?.action === 'add') setShowModal(true);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchMyProducts());
    setRefreshing(false);
  }, []);

  const openAddModal = useCallback(() => {
    setEditingProduct(null);
    setFormState(EMPTY_FORM);
    setFormErrors({});
    setProductImages([]);
    setVariants([]);
    setPricingSuggestion(null);
    setVideoAsset(null);
    setExistingVideoUrl('');
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((product) => {
    setEditingProduct(product);
    setFormState({
      name: product.name || '',
      description: product.description || '',
      short_description: product.short_description || '',
      price: String(product.price || ''),
      stock: String(product.stock || ''),
      category: product.category_name || '',
      categoryId: product.category || '',
      sku: product.sku || '',
      weight: String(product.weight || ''),
      status: product.status || 'active',
      available_sizes: product.available_sizes || [],
      requires_size: product.requires_size || false,
      key_features: product.key_features || [],
    });
    setFormErrors({});
    // Load existing variants (map API shape -> the plain objects VariantManager expects)
    setVariants((product.variants || []).map(v => ({
      size: v.size || '', color: v.color || '', material: v.material || '',
      storage: v.storage || '', ram: v.ram || '', model_name: v.model_name || '',
      weight_volume: v.weight_volume || '', stock: v.stock || 0,
      price_adjustment: v.price_adjustment || 0,
    })));
    // Load existing images
    const existingImages = (product.images || []).map(img => ({
      id: img.id,
      image_url: img.image_url,
      is_primary: img.is_primary,
      isExisting: true,
    }));
    setProductImages(existingImages);
    setVideoAsset(null);
    setExistingVideoUrl(product.video_url || '');
    setShowModal(true);
  }, []);

  const setField = useCallback((key, value) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: null }));
  }, []);

  const handleToggleSize = useCallback((size) => {
    setFormState((prev) => {
      const current = prev.available_sizes || [];
      const updated = current.includes(size) ? current.filter(s => s !== size) : [...current, size];
      return { ...prev, available_sizes: updated };
    });
  }, []);

  // ── Multi image handlers ──
  const handleAddImages = useCallback((newAssets) => {
    setProductImages((prev) => {
      const combined = [...prev, ...newAssets.map(a => ({ ...a, isExisting: false }))];
      return combined.slice(0, 10); // max 10
    });
  }, []);

  const handleRemoveImage = useCallback(async (index) => {
    const img = productImages[index];
    // If existing image with id, delete from server
    if (img?.isExisting && img.id && editingProduct?.id) {
      try {
        const { del } = await import('../../api/client');
        await del(`/products/${editingProduct.id}/images/${img.id}/`);
      } catch (e) {
        // Continue removing from UI even if API fails
      }
    }
    setProductImages((prev) => prev.filter((_, i) => i !== index));
  }, [productImages, editingProduct]);

  const handleSetPrimaryImage = useCallback((index) => {
    setProductImages((prev) => {
      const reordered = [...prev];
      const [selected] = reordered.splice(index, 1);
      return [selected, ...reordered];
    });
  }, []);

  // ── Video handlers ──
  const handlePickVideo = useCallback(async () => {
    try {
      const ImagePicker = await import('expo-image-picker');
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Please allow access to your video library.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.8,
        videoMaxDuration: 60,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const sizeMb = (asset.fileSize || 0) / (1024 * 1024);
      if (asset.fileSize && sizeMb > MAX_VIDEO_MB) {
        Alert.alert('Video too large', `Please choose a video under ${MAX_VIDEO_MB}MB (this one is ${sizeMb.toFixed(1)}MB).`);
        return;
      }
      setVideoAsset(asset);
      setExistingVideoUrl(''); // new pick replaces whatever was there
    } catch (e) {
      Alert.alert('Error', 'Could not open video library.');
    }
  }, []);

  const handleRemoveVideo = useCallback(() => {
    setVideoAsset(null);
    setExistingVideoUrl('');
  }, []);

  const handleGenerateDescription = useCallback(async () => {
    if (!form.name.trim()) {
      Alert.alert('Product Name Required', 'Enter a product name first so the AI knows what to describe.');
      return;
    }
    setAiDescLoading(true);
    try {
      const { post } = await import('../../api/client');
      const result = await post('/ai/vendor/generate-description/', {
        product_name: form.name.trim(),
        category: form.category || '',
        keywords: '',
      });
      if (result?.success && result?.data?.description) {
        setField('description', result.data.description.slice(0, DESC_LIMIT));
      } else {
        Alert.alert('AI Unavailable', 'Could not generate a description right now. Please write one manually.');
      }
    } catch (e) {
      Alert.alert('AI Unavailable', 'Could not generate a description right now. Please write one manually.');
    } finally {
      setAiDescLoading(false);
    }
  }, [form.name, form.category]);

  const handleCheckPricing = useCallback(async () => {
    if (!form.categoryId) {
      Alert.alert('Select a Category', 'Choose a category first so pricing can be compared.');
      return;
    }
    if (!form.price || isNaN(form.price)) {
      Alert.alert('Enter a Price', 'Enter a price first to check it against similar products.');
      return;
    }
    setPricingLoading(true);
    setPricingSuggestion(null);
    try {
      const { post } = await import('../../api/client');
      const result = await post('/ai/vendor/pricing-suggestion/', {
        category_id: form.categoryId,
        proposed_price: Number(form.price),
      });
      if (result?.success) {
        setPricingSuggestion(result.data);
      }
    } catch (e) {
      // Silent — pricing suggestion is optional guidance, not a blocker
    } finally {
      setPricingLoading(false);
    }
  }, [form.categoryId, form.price]);

  const validateForm = useCallback(() => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Product name required.';
    else if (form.name.length > TITLE_LIMIT) errs.name = `Title must be ${TITLE_LIMIT} characters or fewer.`;
    if (form.short_description.length > SHORT_DESC_LIMIT) errs.short_description = `Short description must be ${SHORT_DESC_LIMIT} characters or fewer.`;
    if (form.description.length > DESC_LIMIT) errs.description = `Description must be ${DESC_LIMIT} characters or fewer.`;
    if (!form.price || isNaN(form.price) || Number(form.price) <= 0) errs.price = 'Valid price required.';
    if (!form.stock || isNaN(form.stock) || Number(form.stock) < 0) errs.stock = 'Valid stock quantity required.';
    if (!form.categoryId && !form.category) errs.category = 'Please select a category.';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    const needsSize = requiresSize(form.category);
    const productData = {
      name: form.name.trim(),
      description: form.description.trim(),
      short_description: form.short_description.trim(),
      key_features: form.key_features,
      price: Number(form.price),
      stock: Number(form.stock),
      category: form.categoryId,
      sku: form.sku.trim(),
      status: form.status,
      available_sizes: needsSize ? form.available_sizes : [],
      requires_size: needsSize,
    };
    if (form.weight) productData.weight = Number(form.weight);

    let result;
    let savedProduct;

    if (editingProduct) {
      result = await dispatch(updateProduct({ productId: editingProduct.id, data: productData }));
      if (updateProduct.fulfilled.match(result)) savedProduct = result.payload;
      else {
        const data = errors.updateProduct;
        Alert.alert('Error', typeof data === 'string' ? data : 'Failed to update. Check your description for phone numbers or contact links.');
        return;
      }
    } else {
      result = await dispatch(createProduct(productData));
      if (createProduct.fulfilled.match(result)) savedProduct = result.payload;
      else {
        const data = errors.createProduct;
        Alert.alert('Error', typeof data === 'string' ? data : 'Failed to create. Check your description for phone numbers or contact links.');
        return;
      }
    }

    // Save variants (replaces the full set for this product)
    if (variants.length > 0 && savedProduct?.id) {
      try {
        const { productsAPI } = await import('../../api/products');
        await productsAPI.bulkSaveVariants(savedProduct.id, variants);
      } catch (e) {
        Alert.alert('Partial Success', 'Product saved, but variants failed to save. Edit the product to retry.');
      }
    }

    // Upload video if a new one was picked
    if (videoAsset && savedProduct?.id) {
      setVideoUploading(true);
      try {
        const { upload } = await import('../../api/client');
        const formData = new FormData();
        formData.append('video', {
          uri: videoAsset.uri,
          name: videoAsset.fileName || 'product_video.mp4',
          type: videoAsset.mimeType || 'video/mp4',
        });
        await upload(`/products/${savedProduct.id}/video/`, formData);
      } catch (e) {
        Alert.alert('Partial Success', 'Product saved, but the video failed to upload. Edit the product to retry.');
      } finally {
        setVideoUploading(false);
      }
    }

    // Upload only NEW images (not existing ones)
    const newImages = productImages.filter(img => !img.isExisting);
    if (newImages.length > 0 && savedProduct?.id) {
      setUploading(true);
      const { productsAPI } = await import('../../api/products');
      let failedCount = 0;

      const uploadQualityResults = [];
      for (let i = 0; i < newImages.length; i++) {
        setUploadingIndex(productImages.indexOf(newImages[i]));
        try {
          const isFirstOverall = productImages.indexOf(newImages[i]) === 0;
          const response = await productsAPI.uploadProductImage(
            savedProduct.id,
            {
              uri: newImages[i].uri,
              name: newImages[i].fileName || `product_image_${i}.jpg`,
              type: newImages[i].mimeType || 'image/jpeg',
            },
            isFirstOverall
          );

          // Capture quality data from response
          if (response && response.image_quality) {
            uploadQualityResults.push({
              imageUri: newImages[i].uri,
              quality: response.image_quality,
              imageName: newImages[i].fileName || `Image ${i + 1}`,
            });
          }
        } catch (e) {
          // Handle quality blocked error (400)
          if (e?.response?.status === 400 && e?.response?.data?.issues) {
            const blockedQuality = {
              score: e.response.data.quality_score || 0,
              grade: 'F',
              passed: false,
              issues: e.response.data.issues || [],
              suggestions: e.response.data.suggestions || [],
              metrics: {},
              warnings: e.response.data.issues || [],
            };
            uploadQualityResults.push({
              imageUri: newImages[i].uri,
              quality: blockedQuality,
              imageName: newImages[i].fileName || `Image ${i + 1}`,
              blocked: true,
            });
            failedCount++;
          } else {
            failedCount++;
          }
        }
      }
      setUploadingIndex(null);
      setUploading(false);

      // Show quality results if any issues found
      const issueResults = uploadQualityResults.filter(r => !r.quality.passed || r.quality.warnings?.length > 0 || r.blocked);
      if (issueResults.length > 0) {
        setQualityResults(issueResults);
        setCurrentQuality(issueResults[0].quality);
        setCurrentImageUri(issueResults[0].imageUri);
        setShowQualityModal(true);
      } else if (uploadQualityResults.length > 0) {
        // All passed — show brief success with grade
        const best = uploadQualityResults[0];
        if (best.quality.grade === 'A') {
          Alert.alert('✅ Images Uploaded', `All ${newImages.length} image(s) passed quality check (Grade ${best.quality.grade})!`);
        }
      }

      if (failedCount > 0 && issueResults.filter(r => r.blocked).length === 0) {
        Alert.alert('Partial Success', `Product saved. ${failedCount} of ${newImages.length} images failed to upload.`);
      }
    }

    setShowModal(false);
    setFormState(EMPTY_FORM);
    setEditingProduct(null);
    setVariants([]);
    setProductImages([]);
    setVideoAsset(null);
    setExistingVideoUrl('');
    dispatch(fetchMyProducts());
  }, [form, productImages, editingProduct, validateForm, errors, videoAsset]);

  const handleDelete = useCallback((product) => {
    Alert.alert('Delete Product', `Delete "${product.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const result = await dispatch(deleteProduct(product.id));
          if (deleteProduct.fulfilled.match(result)) Alert.alert('Deleted', 'Product removed.');
        },
      },
    ]);
  }, []);

  const handleCategorySelect = useCallback((category) => {
    setFormState((prev) => ({
      ...prev,
      category: category.name,
      categoryId: category.id || category.slug,
      available_sizes: [],
      requires_size: requiresSize(category.name),
    }));
    setFormErrors((prev) => ({ ...prev, category: null }));
    setShowCategoryPicker(false);
  }, []);

  const filteredProducts = products.filter((p) => {
    const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    let matchTab = true;
    if (browseTab === 'active') matchTab = p.status === 'active';
    else if (browseTab === 'inactive') matchTab = p.status === 'draft' || p.status === 'out_of_stock';
    return matchSearch && matchTab;
  });

  const tabCount = (key) => {
    if (key === 'all') return products.length;
    if (key === 'active') return products.filter(p => p.status === 'active').length;
    return products.filter(p => p.status === 'draft' || p.status === 'out_of_stock').length;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Products</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.headerIcon}>🛍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={openAddModal}>
            <Text style={styles.headerIcon}>➕</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchBar}>
        <View style={styles.searchInput}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchText} value={searchQuery} onChangeText={setSearchQuery}
            placeholder="Search products..." placeholderTextColor={COLORS.textLight}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        {BROWSE_TABS.map((tab) => (
          <TouchableOpacity key={tab.key}
            style={[styles.filterChip, browseTab === tab.key && styles.filterChipActive]}
            onPress={() => setBrowseTab(tab.key)}
          >
            <Text style={[styles.filterChipText, browseTab === tab.key && styles.filterChipTextActive]}>
              {tab.label} ({tabCount(tab.key)})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={({ item }) => <ProductItem item={item} onEdit={openEditModal} onDelete={handleDelete} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          loading.myProducts ? (
            <View>{[1, 2, 3].map((i) => <SkeletonListItem key={i} />)}</View>
          ) : (
            <EmptyState icon="📦" title="No products yet" message="Add your first product to start selling" actionLabel="Add Product" onAction={openAddModal} />
          )
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
      />

      <ProductModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        editingProduct={editingProduct}
        form={form} setField={setField} formErrors={formErrors}
        productImages={productImages}
        onAddImages={handleAddImages}
        onRemoveImage={handleRemoveImage}
        onSetPrimaryImage={handleSetPrimaryImage}
        onSubmit={handleSubmit}
        loading={loading.createProduct || loading.updateProduct}
        uploading={uploading}
        uploadingIndex={uploadingIndex}
        onOpenCategoryPicker={() => setShowCategoryPicker(true)}
        onToggleSize={handleToggleSize}
        variants={variants}
        onVariantsChange={setVariants}
        onGenerateDescription={handleGenerateDescription}
        aiDescLoading={aiDescLoading}
        onCheckPricing={handleCheckPricing}
        pricingLoading={pricingLoading}
        pricingSuggestion={pricingSuggestion}
        videoAsset={videoAsset}
        existingVideoUrl={existingVideoUrl}
        onPickVideo={handlePickVideo}
        onRemoveVideo={handleRemoveVideo}
        videoUploading={videoUploading}
      />

      <CategoryPickerModal
        visible={showCategoryPicker}
        categories={categories}
        onSelect={handleCategorySelect}
        onClose={() => setShowCategoryPicker(false)}
        loading={loading.categories}
      />

      {/* Image Quality Warning Modal */}
      <ImageQualityWarning
        quality={currentQuality}
        visible={showQualityModal}
        imageUri={currentImageUri}
        onDismiss={() => setShowQualityModal(false)}
        onRetry={() => {
          setShowQualityModal(false);
          openAddModal();
        }}
        onPublishAnyway={() => setShowQualityModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.primary, paddingHorizontal: SPACING.base, paddingTop: Platform.OS === 'ios' ? SPACING['3xl'] : SPACING.base, paddingBottom: SPACING.base },
  headerTitle: { fontSize: FONTS['2xl'], fontWeight: FONTS.bold, color: 'white' },
  headerRight: { flexDirection: 'row', gap: SPACING.sm },
  headerIconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  headerIcon: { fontSize: 18 },
  searchBar: { backgroundColor: COLORS.surface, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  searchInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.full, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm, gap: SPACING.sm, borderWidth: 1.5, borderColor: COLORS.border },
  searchIcon: { fontSize: FONTS.base },
  searchText: { flex: 1, fontSize: FONTS.base, color: COLORS.textPrimary, padding: 0 },
  searchClear: { fontSize: FONTS.sm, color: COLORS.textMuted, fontWeight: FONTS.bold },
  filterRow: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.divider, maxHeight: 48 },
  filterContent: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.sm, gap: SPACING.xs },
  filterChip: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.xs + 2, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surfaceAlt },
  filterChipActive: { backgroundColor: COLORS.primaryFade, borderColor: COLORS.primary },
  filterChipText: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  filterChipTextActive: { color: COLORS.primary, fontWeight: FONTS.bold },
  listContent: { padding: SPACING.sm, paddingBottom: 100 },
  productItem: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  productImageWrap: { position: 'relative' },
  productImage: { width: 90, height: 90 },
  productImagePlaceholder: { width: 90, height: 90, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  imageCountBadge: { position: 'absolute', bottom: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: RADIUS.sm, paddingHorizontal: 5, paddingVertical: 2 },
  imageCountText: { fontSize: 9, color: 'white', fontWeight: FONTS.bold },
  videoBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: RADIUS.sm, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  videoBadgeText: { fontSize: 10 },
  productInfo: { flex: 1, padding: SPACING.sm, gap: 3, justifyContent: 'center' },
  productName: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textPrimary, lineHeight: 18 },
  productPrice: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.primary },
  sizesText: { fontSize: FONTS.xs, color: COLORS.textMuted },
  viewsText: { fontSize: FONTS.xs, color: COLORS.info },
  productMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginTop: 2 },
  stockText: { fontSize: FONTS.xs, color: COLORS.textMuted },
  stockDanger: { color: COLORS.danger, fontWeight: FONTS.semiBold },
  stockWarning: { color: COLORS.warning, fontWeight: FONTS.semiBold },
  metaDivider: { width: 1, height: 10, backgroundColor: COLORS.border },
  metaStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusDotActive: { backgroundColor: COLORS.success },
  statusDotInactive: { backgroundColor: COLORS.textLight },
  metaStatusText: { fontSize: FONTS.xs, fontWeight: FONTS.semiBold },
  statusTextActive: { color: COLORS.successText },
  statusTextInactive: { color: COLORS.textMuted },
  productActions: { flexDirection: 'column', justifyContent: 'center', padding: SPACING.sm, gap: SPACING.sm },
  editBtn: { width: 34, height: 34, borderRadius: RADIUS.full, backgroundColor: COLORS.primaryFade, alignItems: 'center', justifyContent: 'center' },
  editBtnText: { fontSize: 15 },
  deleteBtn: { width: 34, height: 34, borderRadius: RADIUS.full, backgroundColor: COLORS.dangerLight, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontSize: 15 },
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, paddingHorizontal: SPACING.base, paddingTop: Platform.OS === 'ios' ? SPACING['3xl'] : SPACING.base, paddingBottom: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  modalClose: { fontSize: FONTS.xl, color: COLORS.textMuted, fontWeight: FONTS.bold },
  modalTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  modalScroll: { padding: SPACING.base },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldLabel: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  fieldHint: { fontSize: FONTS.xs, color: COLORS.textMuted, fontWeight: FONTS.regular },
  charCounter: { fontSize: FONTS.xs, color: COLORS.textMuted, marginBottom: SPACING.xs },
  charCounterOver: { color: COLORS.danger, fontWeight: FONTS.bold },
  fieldInput: { backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 2, fontSize: FONTS.base, color: COLORS.textPrimary, marginBottom: SPACING.base },
  fieldInputError: { borderColor: COLORS.danger, backgroundColor: COLORS.dangerLight },
  textArea: { minHeight: 100, textAlignVertical: 'top', paddingTop: SPACING.sm },
  fieldError: { fontSize: FONTS.xs, color: COLORS.danger, marginTop: -SPACING.sm, marginBottom: SPACING.sm },
  rowFields: { flexDirection: 'row', gap: SPACING.sm },
  halfField: { flex: 1 },
  categorySelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categorySelected: { fontSize: FONTS.base, color: COLORS.textPrimary, flex: 1 },
  categoryPlaceholder: { fontSize: FONTS.base, color: COLORS.textLight, flex: 1 },
  categoryArrow: { fontSize: FONTS.sm, color: COLORS.textMuted },
  statusOptions: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.base, flexWrap: 'wrap' },
  statusOption: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surfaceAlt },
  statusOptionActive: { backgroundColor: COLORS.primaryFade, borderColor: COLORS.primary },
  statusOptionText: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  statusOptionTextActive: { color: COLORS.primary, fontWeight: FONTS.bold },
  submitBtn: { marginTop: SPACING.base, borderRadius: RADIUS.xl },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerContainer: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS['2xl'], borderTopRightRadius: RADIUS['2xl'], maxHeight: '80%', paddingBottom: Platform.OS === 'ios' ? 34 : 16 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  pickerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  pickerClose: { fontSize: FONTS.xl, color: COLORS.textMuted, fontWeight: FONTS.bold },
  pickerSearch: { flexDirection: 'row', alignItems: 'center', margin: SPACING.base, backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.full, paddingHorizontal: SPACING.base, borderWidth: 1.5, borderColor: COLORS.border },
  pickerSearchIcon: { fontSize: FONTS.base },
  pickerSearchInput: { flex: 1, fontSize: FONTS.base, color: COLORS.textPrimary, paddingVertical: SPACING.sm, marginLeft: SPACING.sm },
  pickerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.base, paddingVertical: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  pickerItemText: { fontSize: FONTS.base, color: COLORS.textPrimary, fontWeight: FONTS.medium },
  pickerItemCount: { fontSize: FONTS.xs, color: COLORS.textMuted },
  pickerLoading: { padding: SPACING.xl, alignItems: 'center' },
  pickerLoadingText: { fontSize: FONTS.sm, color: COLORS.textMuted },
  pickerEmpty: { textAlign: 'center', padding: SPACING.xl, fontSize: FONTS.sm, color: COLORS.textMuted },

  aiBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm, backgroundColor: COLORS.primaryFade,
    marginTop: -SPACING.sm, marginBottom: SPACING.base,
  },
  aiBtnText: { fontSize: FONTS.sm, color: COLORS.primaryDark, fontWeight: FONTS.bold },
  pricingCheckBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: COLORS.info, borderRadius: RADIUS.lg,
    paddingVertical: SPACING.xs + 4, backgroundColor: COLORS.infoLight, marginTop: 6,
  },
  pricingCheckBtnText: { fontSize: FONTS.xs, color: COLORS.infoText, fontWeight: FONTS.bold },
  pricingResult: {
    backgroundColor: COLORS.surfaceSunken, borderRadius: RADIUS.md,
    padding: SPACING.sm, marginTop: SPACING.xs,
  },
  pricingResultText: { fontSize: FONTS.xs, color: COLORS.textSecondary, fontWeight: FONTS.semiBold },
  pricingResultSuggestion: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 4, lineHeight: 16 },
  pricingResultEmpty: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 6, fontStyle: 'italic' },

  // Key Features
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, padding: SPACING.sm, marginBottom: 6 },
  featureBullet: { fontSize: FONTS.base, color: COLORS.primary, fontWeight: FONTS.bold },
  featureText: { flex: 1, fontSize: FONTS.sm, color: COLORS.textPrimary },
  featureRemove: { fontSize: FONTS.sm, color: COLORS.danger, fontWeight: FONTS.bold },
  featureAddRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.base },
  featureInput: { flex: 1, backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm, fontSize: FONTS.sm, color: COLORS.textPrimary },
  featureAddBtn: { backgroundColor: COLORS.primaryFade, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.base, alignItems: 'center', justifyContent: 'center' },
  featureAddBtnText: { fontSize: FONTS.sm, color: COLORS.primaryDark, fontWeight: FONTS.bold },

  // Video
  videoPickBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed', borderRadius: RADIUS.lg, paddingVertical: SPACING.base, backgroundColor: COLORS.surfaceAlt, marginBottom: SPACING.base },
  videoPickIcon: { fontSize: 18 },
  videoPickText: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  videoPreview: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primaryFade, borderRadius: RADIUS.lg, padding: SPACING.sm, marginBottom: SPACING.base },
  videoPreviewIcon: { fontSize: 18 },
  videoPreviewText: { flex: 1, fontSize: FONTS.sm, color: COLORS.textPrimary, fontWeight: FONTS.medium },
  videoRemove: { fontSize: FONTS.xs, color: COLORS.danger, fontWeight: FONTS.bold },
});