
/**
 * VUMA Store — Vendor Products Screen
 * Fixed: keyboard with KeyboardAwareScrollView, image upload, category dropdown
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, StatusBar,
  Platform, Alert, RefreshControl, Modal, TextInput, Image, ScrollView,
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

const PRODUCT_STATUS = [
  { label: 'Active', value: 'active' },
  { label: 'Draft', value: 'draft' },
  { label: 'Out of Stock', value: 'out_of_stock' },
];

const EMPTY_FORM = {
  name: '', description: '', price: '', stock: '',
  category: '', sku: '', weight: '', status: 'active',
};

// ── Category Picker Modal ─────────────────────────────
const CategoryPickerModal = memo(({ visible, categories, onSelect, onClose, loading }) => {
  const [search, setSearch] = useState('');
  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

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
              value={search}
              onChangeText={setSearch}
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
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => { onSelect(item); setSearch(''); }}
                >
                  <Text style={styles.pickerItemText}>{item.name}</Text>
                  <Text style={styles.pickerItemCount}>{item.product_count || 0} products</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.pickerEmpty}>
                  {search ? `No category matching "${search}"` : 'No categories available'}
                </Text>
              }
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

// ── Product Modal with KeyboardAwareScrollView ────────
const ProductModal = memo(({
  visible, onClose, editingProduct,
  form, setField, formErrors,
  productImage, onPickImage, onRemoveImage,
  onSubmit, loading, uploading,
  onOpenCategoryPicker,
}) => (
  <Modal
    visible={visible}
    animationType="slide"
    onRequestClose={onClose}
    statusBarTranslucent={false}
  >
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
        {/* Image Upload */}
        <Text style={styles.fieldLabel}>Product Image</Text>
        <TouchableOpacity style={styles.imageUploadBox} onPress={onPickImage}>
          {productImage ? (
            <Image source={{ uri: productImage.uri }} style={styles.imagePreview} resizeMode="cover" />
          ) : (
            <View style={styles.imageUploadEmpty}>
              <Text style={styles.imageUploadIcon}>📷</Text>
              <Text style={styles.imageUploadText}>Tap to upload image</Text>
              <Text style={styles.imageUploadHint}>JPG, PNG — Max 10MB</Text>
            </View>
          )}
        </TouchableOpacity>
        {productImage && (
          <TouchableOpacity onPress={onRemoveImage} style={styles.removeImageBtn}>
            <Text style={styles.removeImageText}>✕ Remove image</Text>
          </TouchableOpacity>
        )}
        {uploading && (
          <View style={styles.uploadingBar}>
            <Text style={styles.uploadingText}>📤 Uploading image...</Text>
          </View>
        )}

        {/* Product Name */}
        <Text style={styles.fieldLabel}>Product Name *</Text>
        <TextInput
          style={[styles.fieldInput, formErrors.name && styles.fieldInputError]}
          value={form.name} onChangeText={(v) => setField('name', v)}
          placeholder="Product name" placeholderTextColor={COLORS.textLight}
          returnKeyType="next" blurOnSubmit={false}
        />
        {formErrors.name && <Text style={styles.fieldError}>⚠️ {formErrors.name}</Text>}

        {/* Description */}
        <Text style={styles.fieldLabel}>Description</Text>
        <TextInput
          style={[styles.fieldInput, styles.textArea]}
          value={form.description} onChangeText={(v) => setField('description', v)}
          placeholder="Product description..." multiline numberOfLines={4}
          textAlignVertical="top" placeholderTextColor={COLORS.textLight}
          blurOnSubmit={false}
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
              placeholderTextColor={COLORS.textLight} returnKeyType="next"
              blurOnSubmit={false}
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>Weight (kg)</Text>
            <TextInput
              style={styles.fieldInput} value={form.weight}
              onChangeText={(v) => setField('weight', v)}
              placeholder="0.5" keyboardType="decimal-pad"
              placeholderTextColor={COLORS.textLight} returnKeyType="next"
              blurOnSubmit={false}
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
  return (
    <View style={styles.productItem}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />
      ) : (
        <View style={styles.productImagePlaceholder}>
          <Text style={{ fontSize: 24 }}>📦</Text>
        </View>
      )}
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.productPrice}>{formatPrice(item.price)}</Text>
        <View style={styles.productMeta}>
          <View style={[styles.statusBadge, item.status === 'active' ? styles.statusActive : styles.statusInactive]}>
            <Text style={[styles.statusText, item.status === 'active' ? styles.statusTextActive : styles.statusTextInactive]}>
              {item.status}
            </Text>
          </View>
          <Text style={[styles.stockText, isOutOfStock && styles.stockDanger, isLowStock && styles.stockWarning]}>
            {isOutOfStock ? '❌ Out of stock' : isLowStock ? `⚠️ Low: ${item.stock}` : `📦 ${item.stock}`}
          </Text>
        </View>
        <Text style={styles.productStats}>⭐ {Number(item.rating_avg || 0).toFixed(1)} · {item.sales_count || 0} sold</Text>
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
  const [filterStatus, setFilterStatus] = useState('');
  const [productImage, setProductImage] = useState(null);
  const [uploading, setUploading] = useState(false);

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
    setProductImage(null);
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((product) => {
    setEditingProduct(product);
    setFormState({
      name: product.name || '',
      description: product.description || '',
      price: String(product.price || ''),
      stock: String(product.stock || ''),
      category: product.category_name || product.category || '',
      categoryId: product.category || '',
      sku: product.sku || '',
      weight: String(product.weight || ''),
      status: product.status || 'active',
    });
    setFormErrors({});
    setProductImage(null);
    setShowModal(true);
  }, []);

  const setField = useCallback((key, value) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: null }));
  }, []);

  const pickImage = useCallback(async () => {
    try {
      const ImagePicker = await import('expo-image-picker');
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow access to your photos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
        setProductImage(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open image picker.');
    }
  }, []);

  const validateForm = useCallback(() => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Product name required.';
    if (!form.price || isNaN(form.price) || Number(form.price) <= 0) errs.price = 'Valid price required.';
    if (!form.stock || isNaN(form.stock) || Number(form.stock) < 0) errs.stock = 'Valid stock quantity required.';
    if (!form.categoryId && !form.category) errs.category = 'Please select a category.';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    const productData = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      stock: Number(form.stock),
      category: form.categoryId,
      sku: form.sku.trim(),
      status: form.status,
    };
    if (form.weight) productData.weight = Number(form.weight);

    let result;
    let savedProduct;

    if (editingProduct) {
      result = await dispatch(updateProduct({ productId: editingProduct.id, data: productData }));
      if (updateProduct.fulfilled.match(result)) {
        savedProduct = result.payload;
      } else {
        Alert.alert('Error', errors.updateProduct || 'Failed to update product.');
        return;
      }
    } else {
      result = await dispatch(createProduct(productData));
      if (createProduct.fulfilled.match(result)) {
        savedProduct = result.payload;
      } else {
        Alert.alert('Error', errors.createProduct || 'Failed to create product.');
        return;
      }
    }

    if (productImage && savedProduct?.id) {
      setUploading(true);
      try {
        const { productsAPI } = await import('../../api/products');
        await productsAPI.uploadProductImage(
          savedProduct.id,
          {
            uri: productImage.uri,
            name: productImage.fileName || 'product_image.jpg',
            type: productImage.mimeType || 'image/jpeg',
          },
          true
        );
      } catch (imgError) {
        Alert.alert('Product Saved', 'Product saved but image upload failed. Edit product to retry.', [{ text: 'OK' }]);
      } finally {
        setUploading(false);
      }
    }

    setShowModal(false);
    setFormState(EMPTY_FORM);
    setEditingProduct(null);
    setProductImage(null);
    dispatch(fetchMyProducts());
  }, [form, productImage, editingProduct, validateForm, errors]);

  const handleDelete = useCallback((product) => {
    Alert.alert('Delete Product', `Delete "${product.name}"? This cannot be undone.`, [
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
    }));
    setFormErrors((prev) => ({ ...prev, category: null }));
    setShowCategoryPicker(false);
  }, []);

  const filteredProducts = products.filter((p) => {
    const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = !filterStatus || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Products</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.browseBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.browseBtnText}>🛍 Browse</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
            <Text style={styles.addBtnText}>+ Add</Text>
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
        {[{ label: 'All', value: '' }, ...PRODUCT_STATUS].map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.filterChip, filterStatus === opt.value && styles.filterChipActive]}
            onPress={() => setFilterStatus(opt.value)}
          >
            <Text style={[styles.filterChipText, filterStatus === opt.value && styles.filterChipTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.countBar}>
        <Text style={styles.countText}>{filteredProducts.length} products</Text>
      </View>

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={({ item }) => (
          <ProductItem item={item} onEdit={openEditModal} onDelete={handleDelete} />
        )}
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
        form={form}
        setField={setField}
        formErrors={formErrors}
        productImage={productImage}
        onPickImage={pickImage}
        onRemoveImage={() => setProductImage(null)}
        onSubmit={handleSubmit}
        loading={loading.createProduct || loading.updateProduct}
        uploading={uploading}
        onOpenCategoryPicker={() => setShowCategoryPicker(true)}
      />

      <CategoryPickerModal
        visible={showCategoryPicker}
        categories={categories}
        onSelect={handleCategorySelect}
        onClose={() => setShowCategoryPicker(false)}
        loading={loading.categories}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, paddingHorizontal: SPACING.base, paddingTop: Platform.OS === 'ios' ? SPACING['3xl'] : SPACING.base, paddingBottom: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider, ...SHADOWS.sm },
  headerTitle: { fontSize: FONTS['2xl'], fontWeight: FONTS.bold, color: COLORS.textPrimary },
  headerRight: { flexDirection: 'row', gap: SPACING.sm },
  browseBtn: { backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  browseBtnText: { color: COLORS.textSecondary, fontSize: FONTS.sm, fontWeight: FONTS.semiBold },
  addBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm },
  addBtnText: { color: COLORS.textWhite, fontSize: FONTS.sm, fontWeight: FONTS.bold },
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
  countBar: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.xs + 2, backgroundColor: COLORS.surfaceAlt, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  countText: { fontSize: FONTS.xs, color: COLORS.textMuted },
  listContent: { padding: SPACING.sm, paddingBottom: 100 },
  productItem: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, marginBottom: SPACING.sm, overflow: 'hidden', ...SHADOWS.sm },
  productImage: { width: 100, height: 100 },
  productImagePlaceholder: { width: 100, height: 100, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  productInfo: { flex: 1, padding: SPACING.sm, gap: SPACING.xs },
  productName: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textPrimary, lineHeight: 18 },
  productPrice: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.primary },
  productMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' },
  statusBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full },
  statusActive: { backgroundColor: COLORS.successLight },
  statusInactive: { backgroundColor: COLORS.warningLight },
  statusText: { fontSize: FONTS.xs, fontWeight: FONTS.semiBold, textTransform: 'capitalize' },
  statusTextActive: { color: COLORS.successText },
  statusTextInactive: { color: COLORS.warningText },
  stockText: { fontSize: FONTS.xs, color: COLORS.textMuted },
  stockDanger: { color: COLORS.danger, fontWeight: FONTS.semiBold },
  stockWarning: { color: COLORS.warning, fontWeight: FONTS.semiBold },
  productStats: { fontSize: FONTS.xs, color: COLORS.textMuted },
  productActions: { flexDirection: 'column', justifyContent: 'center', padding: SPACING.sm, gap: SPACING.sm },
  editBtn: { width: 36, height: 36, borderRadius: RADIUS.full, backgroundColor: COLORS.primaryFade, alignItems: 'center', justifyContent: 'center' },
  editBtnText: { fontSize: 16 },
  deleteBtn: { width: 36, height: 36, borderRadius: RADIUS.full, backgroundColor: COLORS.dangerLight, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontSize: 16 },
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, paddingHorizontal: SPACING.base, paddingTop: Platform.OS === 'ios' ? SPACING['3xl'] : SPACING.base, paddingBottom: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  modalClose: { fontSize: FONTS.xl, color: COLORS.textMuted, fontWeight: FONTS.bold },
  modalTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  modalScroll: { padding: SPACING.base },
  imageUploadBox: { borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed', borderRadius: RADIUS.xl, marginBottom: SPACING.sm, overflow: 'hidden', height: 180, backgroundColor: COLORS.surfaceAlt },
  imagePreview: { width: '100%', height: '100%' },
  imageUploadEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.xs },
  imageUploadIcon: { fontSize: 40 },
  imageUploadText: { fontSize: FONTS.base, fontWeight: FONTS.semiBold, color: COLORS.primary },
  imageUploadHint: { fontSize: FONTS.xs, color: COLORS.textMuted },
  removeImageBtn: { alignSelf: 'flex-start', marginBottom: SPACING.base },
  removeImageText: { fontSize: FONTS.sm, color: COLORS.danger, fontWeight: FONTS.semiBold },
  uploadingBar: { backgroundColor: COLORS.primaryFade, borderRadius: RADIUS.lg, padding: SPACING.sm, marginBottom: SPACING.base, alignItems: 'center' },
  uploadingText: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.semiBold },
  fieldLabel: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary, marginBottom: SPACING.xs },
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
});
ENDOFFILE
