/**
 * VUMA Store — Vendor Products Screen
 * Fixed: keyboard stays up on Android using windowSoftInputMode pan
 */

import { t } from '../../i18n';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, StatusBar,
  Platform, Alert, RefreshControl, Modal, ScrollView, TextInput, Image,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchMyProducts, createProduct, updateProduct, deleteProduct,
  selectMyProducts, selectProductsLoading, selectProductsErrors,
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

export default function VendorProducts({ navigation, route }) {
  const dispatch = useDispatch();
  const products = useSelector(selectMyProducts);
  const loading = useSelector(selectProductsLoading);
  const errors = useSelector(selectProductsErrors);

  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [productImage, setProductImage] = useState(null);

  useEffect(() => {
    dispatch(fetchMyProducts());
    if (route?.params?.action === 'add') setShowModal(true);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchMyProducts());
    setRefreshing(false);
  }, []);

  const openAddModal = () => {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setProductImage(null);
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setForm({
      name: product.name || '',
      description: product.description || '',
      price: String(product.price || ''),
      stock: String(product.stock || ''),
      category: product.category || '',
      sku: product.sku || '',
      weight: String(product.weight || ''),
      status: product.status || 'active',
    });
    setFormErrors({});
    setProductImage(null);
    setShowModal(true);
  };

  const pickImage = async () => {
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
  };

  const validateForm = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Product name required.';
    if (!form.price || isNaN(form.price) || Number(form.price) <= 0) errs.price = 'Valid price required.';
    if (!form.stock || isNaN(form.stock) || Number(form.stock) < 0) errs.stock = 'Valid stock quantity required.';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    const formData = new FormData();
    formData.append('name', form.name.trim());
    formData.append('description', form.description.trim());
    formData.append('price', Number(form.price));
    formData.append('stock', Number(form.stock));
    formData.append('category', form.category.trim());
    formData.append('sku', form.sku.trim());
    formData.append('status', form.status);
    if (form.weight) formData.append('weight', Number(form.weight));
    if (productImage) {
      formData.append('image', {
        uri: productImage.uri,
        name: 'product_image.jpg',
        type: 'image/jpeg',
      });
    }
    let result;
    if (editingProduct) {
      result = await dispatch(updateProduct({ productId: editingProduct.id, data: formData }));
    } else {
      result = await dispatch(createProduct(formData));
    }
    if (createProduct.fulfilled.match(result) || updateProduct.fulfilled.match(result)) {
      setShowModal(false);
      setForm(EMPTY_FORM);
      setEditingProduct(null);
      setProductImage(null);
    } else {
      Alert.alert('Error', errors.createProduct || errors.updateProduct || 'Failed to save product.');
    }
  };

  const handleDelete = (product) => {
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
  };

  const setField = (key, value) => {
    setForm((p) => ({ ...p, [key]: value }));
    if (formErrors[key]) setFormErrors((p) => ({ ...p, [key]: null }));
  };

  const filteredProducts = products.filter((p) => {
    const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = !filterStatus || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const ProductItem = ({ item }) => {
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
              <Text style={[styles.statusText, item.status === 'active' ? styles.statusTextActive : styles.statusTextInactive]}>{item.status}</Text>
            </View>
            <Text style={[styles.stockText, isOutOfStock && styles.stockDanger, isLowStock && styles.stockWarning]}>
              {isOutOfStock ? '❌ Out of stock' : isLowStock ? `⚠️ Low: ${item.stock}` : `📦 ${item.stock}`}
            </Text>
          </View>
          <Text style={styles.productStats}>⭐ {Number(item.rating_avg || 0).toFixed(1)} · {item.sales_count || 0} sold</Text>
        </View>
        <View style={styles.productActions}>
          <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
            <Text style={styles.editBtnText}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
            <Text style={styles.deleteBtnText}>🗑</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // No KeyboardAvoidingView - using windowSoftInputMode pan in app.json
  const ProductModal = () => (
    <Modal
      visible={showModal}
      animationType="slide"
      onRequestClose={() => setShowModal(false)}
      statusBarTranslucent={false}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.modalClose}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{editingProduct ? '✏️ Edit Product' : '➕ Add Product'}</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.modalScroll}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
        >
          {/* Image Upload */}
          <Text style={styles.fieldLabel}>Product Image</Text>
          <TouchableOpacity style={styles.imageUploadBox} onPress={pickImage}>
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
            <TouchableOpacity onPress={() => setProductImage(null)} style={styles.removeImageBtn}>
              <Text style={styles.removeImageText}>✕ Remove image</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.fieldLabel}>Product Name *</Text>
          <TextInput
            style={[styles.fieldInput, formErrors.name && styles.fieldInputError]}
            value={form.name} onChangeText={(v) => setField('name', v)}
            placeholder="Product name" placeholderTextColor={COLORS.textLight}
            returnKeyType="next"
          />
          {formErrors.name && <Text style={styles.fieldError}>⚠️ {formErrors.name}</Text>}

          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput
            style={[styles.fieldInput, styles.textArea]}
            value={form.description} onChangeText={(v) => setField('description', v)}
            placeholder="Product description..." multiline numberOfLines={4}
            textAlignVertical="top" placeholderTextColor={COLORS.textLight}
          />

          <View style={styles.rowFields}>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Price (TZS) *</Text>
              <TextInput
                style={[styles.fieldInput, formErrors.price && styles.fieldInputError]}
                value={form.price} onChangeText={(v) => setField('price', v)}
                placeholder="0" keyboardType="numeric" placeholderTextColor={COLORS.textLight}
                returnKeyType="next"
              />
              {formErrors.price && <Text style={styles.fieldError}>⚠️ {formErrors.price}</Text>}
            </View>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Stock *</Text>
              <TextInput
                style={[styles.fieldInput, formErrors.stock && styles.fieldInputError]}
                value={form.stock} onChangeText={(v) => setField('stock', v)}
                placeholder="0" keyboardType="numeric" placeholderTextColor={COLORS.textLight}
                returnKeyType="next"
              />
              {formErrors.stock && <Text style={styles.fieldError}>⚠️ {formErrors.stock}</Text>}
            </View>
          </View>

          <View style={styles.rowFields}>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>SKU</Text>
              <TextInput
                style={styles.fieldInput} value={form.sku}
                onChangeText={(v) => setField('sku', v)}
                placeholder="SKU-001" autoCapitalize="characters"
                placeholderTextColor={COLORS.textLight} returnKeyType="next"
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Weight (kg)</Text>
              <TextInput
                style={styles.fieldInput} value={form.weight}
                onChangeText={(v) => setField('weight', v)}
                placeholder="0.5" keyboardType="decimal-pad"
                placeholderTextColor={COLORS.textLight} returnKeyType="next"
              />
            </View>
          </View>

          <Text style={styles.fieldLabel}>Category</Text>
          <TextInput
            style={styles.fieldInput} value={form.category}
            onChangeText={(v) => setField('category', v)}
            placeholder="electronics, fashion..." autoCapitalize="none"
            placeholderTextColor={COLORS.textLight} returnKeyType="done"
          />

          <Text style={styles.fieldLabel}>Status</Text>
          <View style={styles.statusOptions}>
            {PRODUCT_STATUS.map((opt) => (
              <TouchableOpacity key={opt.value}
                style={[styles.statusOption, form.status === opt.value && styles.statusOptionActive]}
                onPress={() => setField('status', opt.value)}
              >
                <Text style={[styles.statusOptionText, form.status === opt.value && styles.statusOptionTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Button
            title={editingProduct ? 'Update Product' : 'Add Product'}
            onPress={handleSubmit}
            loading={loading.createProduct || loading.updateProduct}
            fullWidth style={styles.submitBtn}
          />
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    </Modal>
  );

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
          <TouchableOpacity key={opt.value}
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
        renderItem={({ item }) => <ProductItem item={item} />}
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
      />
      <ProductModal />
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
  fieldLabel: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  fieldInput: { backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 2, fontSize: FONTS.base, color: COLORS.textPrimary, marginBottom: SPACING.base },
  fieldInputError: { borderColor: COLORS.danger, backgroundColor: COLORS.dangerLight },
  textArea: { minHeight: 100, textAlignVertical: 'top', paddingTop: SPACING.sm },
  fieldError: { fontSize: FONTS.xs, color: COLORS.danger, marginTop: -SPACING.sm, marginBottom: SPACING.sm },
  rowFields: { flexDirection: 'row', gap: SPACING.sm },
  halfField: { flex: 1 },
  statusOptions: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.base, flexWrap: 'wrap' },
  statusOption: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surfaceAlt },
  statusOptionActive: { backgroundColor: COLORS.primaryFade, borderColor: COLORS.primary },
  statusOptionText: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  statusOptionTextActive: { color: COLORS.primary, fontWeight: FONTS.bold },
  submitBtn: { marginTop: SPACING.base, borderRadius: RADIUS.xl },
});