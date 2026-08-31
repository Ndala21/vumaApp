/**
 * VUMA Store — Cart Screen (Coupang-style)
 * Fixed: uses item.product.* structure, real vendor names, real images
 */

import React, { useState, useCallback, useMemo, useEffect, memo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  StatusBar, Platform, Alert, Image, ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectCartItems, removeFromCart, updateQuantity, clearCart,
} from '../../store/cartSlice';
import { selectIsAuthenticated } from '../../store/authSlice';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../utils/constants';
import ProductCard from '../../components/ProductCard';
import { productsAPI } from '../../api/products';

const DELIVERY_FEE = 0;

// TabNavigator renders a floating tab bar (position: absolute) that overlays
// screen content instead of pushing it up — so any bottom-pinned element in
// this screen must add this offset or it renders underneath the tab bar.
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 80 : 64;

// ── Get product image URL ──────────────────────────────
function getProductImage(product) {
  if (!product) return null;
  // Try all common image field patterns from Django serializer
  if (product.primary_image) return product.primary_image;
  if (product.image) return product.image;
  if (product.image_url) return product.image_url;
  if (product.thumbnail) return product.thumbnail;
  if (Array.isArray(product.images) && product.images.length > 0) {
    const img = product.images[0];
    return typeof img === 'string' ? img : img?.image || img?.url || img?.file || null;
  }
  return null;
}

// ── Get vendor/seller name ─────────────────────────────
function getVendorName(product) {
  if (!product) return 'VUMA Store';
  return (
    product.vendor_name ||
    product.shop_name ||
    product.vendor?.shop_name ||
    product.vendor?.username ||
    product.seller_name ||
    'VUMA Store'
  );
}

// ── Checkbox ──────────────────────────────────────────
const Checkbox = memo(({ checked, onPress, size = 22, indeterminate = false }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.checkbox, checked && styles.checkboxChecked,
      { width: size, height: size, borderRadius: size * 0.2 }]}
    activeOpacity={0.7}
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
  >
    {indeterminate && !checked
      ? <View style={styles.checkboxIndeterminate} />
      : checked ? <Text style={styles.checkboxTick}>✓</Text> : null}
  </TouchableOpacity>
));

// ── Quantity Stepper ───────────────────────────────────
const QuantityStepper = memo(({ quantity, onDecrease, onIncrease }) => (
  <View style={styles.stepper}>
    <TouchableOpacity style={[styles.stepperBtn, quantity <= 1 && styles.stepperBtnDisabled]}
      onPress={onDecrease} disabled={quantity <= 1}>
      <Text style={styles.stepperBtnText}>−</Text>
    </TouchableOpacity>
    <Text style={styles.stepperValue}>{quantity}</Text>
    <TouchableOpacity style={styles.stepperBtn} onPress={onIncrease}>
      <Text style={styles.stepperBtnText}>+</Text>
    </TouchableOpacity>
  </View>
));

// ── Cart Item ─────────────────────────────────────────
const CartItem = memo(({ item, selected, onToggle, onQuantityChange, onDelete }) => {
  const product = item.product;
  const price = Number(product.discounted_price || product.price || 0);
  const originalPrice = Number(product.price || 0);
  const imageUrl = getProductImage(product);
  const itemTotal = price * item.quantity;

  return (
    <View style={[styles.cartItem, selected && styles.cartItemSelected]}>
      <Checkbox checked={selected} onPress={onToggle} />

      <View style={styles.cartItemImageWrap}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.cartItemImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.cartItemImage, styles.cartItemImagePlaceholder]}>
            <Text style={styles.cartItemImageIcon}>🛍️</Text>
          </View>
        )}
        {product.discount_percent > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountBadgeText}>-{product.discount_percent}%</Text>
          </View>
        )}
      </View>

      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName} numberOfLines={2}>
          {product.name || 'Product'}
        </Text>

        {item.selectedSize && (
          <Text style={styles.cartItemVariant}>Size: {item.selectedSize}</Text>
        )}
        {item.selectedColor && (
          <Text style={styles.cartItemVariant}>Color: {item.selectedColor}</Text>
        )}
        {item.selectedVariant && (
          <Text style={styles.cartItemVariant}>{item.selectedVariant.display_name}</Text>
        )}

        <View style={styles.cartItemPriceRow}>
          <Text style={styles.cartItemPrice}>TZS {itemTotal.toLocaleString()}</Text>
          {originalPrice > price && (
            <Text style={styles.cartItemOriginal}>
              TZS {(originalPrice * item.quantity).toLocaleString()}
            </Text>
          )}
        </View>

        <View style={styles.cartItemActions}>
          <QuantityStepper
            quantity={item.quantity}
            onDecrease={() => onQuantityChange(product.id, item.quantity - 1)}
            onIncrease={() => onQuantityChange(product.id, item.quantity + 1)}
          />
          <TouchableOpacity onPress={() => onDelete(product.id)} style={styles.deleteBtn}>
            <Text style={styles.deleteBtnText}>🗑 Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

// ── Seller Group Header ───────────────────────────────
const SellerGroupHeader = memo(({ seller, allSelected, someSelected, onToggleAll }) => (
  <View style={styles.sellerHeader}>
    <Checkbox checked={allSelected} indeterminate={someSelected && !allSelected}
      onPress={onToggleAll} size={20} />
    <Text style={styles.sellerHeaderIcon}>🏪</Text>
    <Text style={styles.sellerHeaderName}>{seller}</Text>
    <View style={styles.sellerFreeDelivery}>
      <Text style={styles.sellerFreeDeliveryText}>🚚 Free Delivery</Text>
    </View>
  </View>
));

// ── Continue Shopping row — a real horizontal product carousel,
// reused across "You May Also Like" / "Recommended for You" /
// "Continue Shopping" so the cart never dead-ends the shopping flow. ──
const SuggestionRow = memo(({ title, products, onProductPress }) => {
  if (!products?.length) return null;
  return (
    <View style={styles.suggestionSection}>
      <Text style={styles.suggestionTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionList}>
        {products.slice(0, 10).map((p) => (
          <ProductCard key={p.id} product={p} variant="featured" onPress={() => onProductPress(p)} style={styles.suggestionCard} />
        ))}
      </ScrollView>
    </View>
  );
});

export default function CartScreen({ navigation }) {
  const dispatch = useDispatch();
  const cartItems = useSelector(selectCartItems);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // Select all by default
  const [selectedIds, setSelectedIds] = useState(() =>
    new Set(cartItems.map(i => i.product?.id))
  );

  // Group by vendor name
  const groupedBySeller = useMemo(() => {
    const groups = {};
    cartItems.forEach(item => {
      const seller = getVendorName(item.product);
      if (!groups[seller]) groups[seller] = [];
      groups[seller].push(item);
    });
    return groups;
  }, [cartItems]);

  const sellers = Object.keys(groupedBySeller);

  const selectedItems = useMemo(
    () => cartItems.filter(i => selectedIds.has(i.product?.id)),
    [cartItems, selectedIds]
  );

  const subtotal = useMemo(
    () => selectedItems.reduce((sum, i) => {
      const price = Number(i.product?.discounted_price || i.product?.price || 0);
      return sum + price * i.quantity;
    }, 0),
    [selectedItems]
  );

  const discount = useMemo(
    () => selectedItems.reduce((sum, i) => {
      const price = Number(i.product?.discounted_price || i.product?.price || 0);
      const original = Number(i.product?.price || 0);
      return sum + Math.max(0, original - price) * i.quantity;
    }, 0),
    [selectedItems]
  );

  const total = subtotal + DELIVERY_FEE;
  const allSelected = cartItems.length > 0 && selectedIds.size === cartItems.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < cartItems.length;

  const toggleItem = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(cartItems.map(i => i.product?.id)));
  }, [allSelected, cartItems]);

  const toggleSeller = useCallback((seller) => {
    const sellerItems = groupedBySeller[seller];
    const sellerIds = sellerItems.map(i => i.product?.id);
    const allSellerSelected = sellerIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSellerSelected) sellerIds.forEach(id => next.delete(id));
      else sellerIds.forEach(id => next.add(id));
      return next;
    });
  }, [groupedBySeller, selectedIds]);

  const handleQuantityChange = useCallback((productId, qty) => {
    if (qty < 1) return;
    dispatch(updateQuantity({ productId, quantity: qty }));
  }, [dispatch]);

  const handleDelete = useCallback((productId) => {
    Alert.alert('Remove Item', 'Remove this item from cart?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: () => {
          dispatch(removeFromCart(productId));
          setSelectedIds(prev => { const next = new Set(prev); next.delete(productId); return next; });
        },
      },
    ]);
  }, [dispatch]);

  const handleDeleteSelected = useCallback(() => {
    Alert.alert('Remove Selected', `Remove ${selectedIds.size} items?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: () => {
          selectedIds.forEach(id => dispatch(removeFromCart(id)));
          setSelectedIds(new Set());
        },
      },
    ]);
  }, [dispatch, selectedIds]);

  const handleCheckout = useCallback(() => {
    if (!isAuthenticated) {
      Alert.alert('Sign In Required', 'Please sign in to checkout.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => navigation.navigate('Auth') },
      ]);
      return;
    }
    if (selectedItems.length === 0) return;
    navigation.navigate('Checkout', { items: selectedItems, total, source: 'cart' });
  }, [isAuthenticated, selectedItems, total, navigation]);

  // ── Continue Shopping — real product suggestions below the cart,
  // so the customer never has to leave this screen to keep browsing. ──
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const firstCartProductId = cartItems[0]?.product?.id;

  useEffect(() => {
    productsAPI.getTrending().then((d) => setTrendingProducts(d?.results || d || [])).catch(() => {});
    if (isAuthenticated) {
      productsAPI.getRecommendations().then((d) => setRecommendedProducts(d?.results || d || [])).catch(() => {});
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!firstCartProductId) return;
    productsAPI.getRelatedProducts(firstCartProductId).then((d) => setRelatedProducts(d?.results || d || [])).catch(() => {});
  }, [firstCartProductId]);

  const handleSuggestionPress = useCallback((product) => {
    navigation.navigate('ProductDetail', { productId: product.id, product });
  }, [navigation]);

  const isEmpty = cartItems.length === 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>{isEmpty ? 'My Cart' : `My Cart (${cartItems.length})`}</Text>
        {selectedIds.size > 0 && (
          <TouchableOpacity onPress={handleDeleteSelected}>
            <Text style={styles.headerDelete}>🗑 Delete ({selectedIds.size})</Text>
          </TouchableOpacity>
        )}
      </View>

      {!isEmpty && (
        <View style={styles.selectAllBar}>
          <Checkbox checked={allSelected} indeterminate={someSelected} onPress={toggleAll} size={22} />
          <Text style={styles.selectAllText}>
            {allSelected ? 'Deselect All' : 'Select All'} ({cartItems.length})
          </Text>
          {selectedIds.size > 0 && (
            <Text style={styles.selectedCount}>{selectedIds.size} selected</Text>
          )}
        </View>
      )}

      <FlatList
        data={sellers}
        keyExtractor={seller => seller}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          isEmpty ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>🛒</Text>
              <Text style={styles.emptyTitle}>Your cart is empty</Text>
              <Text style={styles.emptySub}>Here's what's trending right now</Text>
            </View>
          ) : null
        }
        renderItem={({ item: seller }) => {
          const sellerItems = groupedBySeller[seller];
          const sellerIds = sellerItems.map(i => i.product?.id);
          const allSellerSelected = sellerIds.every(id => selectedIds.has(id));
          const someSellerSelected = sellerIds.some(id => selectedIds.has(id));
          return (
            <View style={styles.sellerGroup}>
              <SellerGroupHeader
                seller={seller}
                allSelected={allSellerSelected}
                someSelected={someSellerSelected}
                onToggleAll={() => toggleSeller(seller)}
              />
              {sellerItems.map(item => (
                <CartItem
                  key={item.id}
                  item={item}
                  selected={selectedIds.has(item.product?.id)}
                  onToggle={() => toggleItem(item.product?.id)}
                  onQuantityChange={handleQuantityChange}
                  onDelete={handleDelete}
                />
              ))}
            </View>
          );
        }}
        ListFooterComponent={
          <View>
            <SuggestionRow title="You May Also Like" products={relatedProducts} onProductPress={handleSuggestionPress} />
            {isAuthenticated && (
              <SuggestionRow title="Recommended for You" products={recommendedProducts} onProductPress={handleSuggestionPress} />
            )}
            <SuggestionRow title="Continue Shopping" products={trendingProducts} onProductPress={handleSuggestionPress} />
            <View style={{ height: 280 }} />
          </View>
        }
      />

      {!isEmpty && (
      <View style={styles.summary}>
        <View style={styles.summaryBreakdown}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Subtotal ({selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''})
            </Text>
            <Text style={styles.summaryValue}>TZS {subtotal.toLocaleString()}</Text>
          </View>
          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount</Text>
              <Text style={styles.summaryDiscount}>- TZS {discount.toLocaleString()}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryFree}>🚚 Free</Text>
          </View>
        </View>

        <View style={styles.summaryTotalRow}>
          <Text style={styles.summaryTotalLabel}>Total</Text>
          <Text style={styles.summaryTotalValue}>TZS {total.toLocaleString()}</Text>
        </View>

        <TouchableOpacity
          style={[styles.checkoutBtn, selectedItems.length === 0 && styles.checkoutBtnDisabled]}
          onPress={handleCheckout}
          disabled={selectedItems.length === 0}
          activeOpacity={0.85}
        >
          <Text style={styles.checkoutBtnText}>
            {selectedItems.length === 0
              ? 'Select Items to Checkout'
              : `Proceed to Checkout (${selectedItems.length} item${selectedItems.length !== 1 ? 's' : ''})`}
          </Text>
          {selectedItems.length > 0 && (
            <Text style={styles.checkoutBtnAmount}>TZS {total.toLocaleString()}</Text>
          )}
        </TouchableOpacity>
      </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, paddingHorizontal: SPACING.base, paddingTop: Platform.OS === 'ios' ? 50 : SPACING.base, paddingBottom: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.divider, ...SHADOWS.sm },
  headerTitle: { fontSize: FONTS.xl, fontWeight: FONTS.black, color: COLORS.textPrimary },
  headerDelete: { fontSize: FONTS.sm, color: COLORS.danger, fontWeight: FONTS.semiBold },
  selectAllBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 2, gap: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  selectAllText: { flex: 1, fontSize: FONTS.base, color: COLORS.textPrimary, fontWeight: FONTS.semiBold },
  selectedCount: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.bold },
  listContent: { padding: SPACING.sm, paddingBottom: 180 + TAB_BAR_HEIGHT, gap: SPACING.sm },
  sellerGroup: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, overflow: 'hidden', ...SHADOWS.sm },
  sellerHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 2, borderBottomWidth: 1, borderBottomColor: COLORS.divider, gap: SPACING.sm },
  sellerHeaderIcon: { fontSize: 16 },
  sellerHeaderName: { flex: 1, fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  sellerFreeDelivery: { backgroundColor: COLORS.successLight, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 2 },
  sellerFreeDeliveryText: { fontSize: FONTS.xs, color: COLORS.success, fontWeight: FONTS.semiBold },
  cartItem: { flexDirection: 'row', padding: SPACING.base, gap: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.divider, backgroundColor: COLORS.surface },
  cartItemSelected: { backgroundColor: COLORS.primaryFade },
  cartItemImageWrap: { position: 'relative' },
  cartItemImage: { width: 90, height: 90, borderRadius: RADIUS.lg, backgroundColor: COLORS.surfaceAlt },
  cartItemImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cartItemImageIcon: { fontSize: 32 },
  discountBadge: { position: 'absolute', top: 4, left: 4, backgroundColor: COLORS.danger, borderRadius: RADIUS.sm, paddingHorizontal: 4, paddingVertical: 1 },
  discountBadgeText: { fontSize: FONTS.xs - 1, color: 'white', fontWeight: FONTS.bold },
  cartItemInfo: { flex: 1, gap: SPACING.xs },
  cartItemName: { fontSize: FONTS.sm, fontWeight: FONTS.medium, color: COLORS.textPrimary, lineHeight: 18 },
  cartItemVariant: { fontSize: FONTS.xs, color: COLORS.textMuted, backgroundColor: COLORS.surfaceAlt, paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.sm, alignSelf: 'flex-start' },
  cartItemPriceRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  cartItemPrice: { fontSize: FONTS.base, fontWeight: FONTS.black, color: COLORS.primary },
  cartItemOriginal: { fontSize: FONTS.xs, color: COLORS.textMuted, textDecorationLine: 'line-through' },
  cartItemActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.xs },
  deleteBtn: { padding: SPACING.xs },
  deleteBtnText: { fontSize: FONTS.xs, color: COLORS.danger, fontWeight: FONTS.medium },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, overflow: 'hidden' },
  stepperBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceAlt },
  stepperBtnDisabled: { opacity: 0.4 },
  stepperBtnText: { fontSize: FONTS.lg, color: COLORS.textPrimary, fontWeight: FONTS.bold, lineHeight: 22 },
  stepperValue: { width: 36, textAlign: 'center', fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  checkbox: { borderWidth: 2, borderColor: COLORS.border, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkboxTick: { color: 'white', fontSize: 13, fontWeight: FONTS.black },
  checkboxIndeterminate: { width: 10, height: 2, backgroundColor: COLORS.primary, borderRadius: 1 },
  summary: { position: 'absolute', bottom: TAB_BAR_HEIGHT, left: 0, right: 0, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.divider, paddingHorizontal: SPACING.base, paddingTop: SPACING.sm, paddingBottom: Platform.OS === 'ios' ? 24 : 16, ...SHADOWS.lg },
  summaryBreakdown: { gap: SPACING.xs, marginBottom: SPACING.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: FONTS.sm, color: COLORS.textMuted },
  summaryValue: { fontSize: FONTS.sm, color: COLORS.textPrimary, fontWeight: FONTS.semiBold },
  summaryDiscount: { fontSize: FONTS.sm, color: COLORS.success, fontWeight: FONTS.semiBold },
  summaryFree: { fontSize: FONTS.sm, color: COLORS.success, fontWeight: FONTS.semiBold },
  summaryTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.divider, marginBottom: SPACING.sm },
  summaryTotalLabel: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  summaryTotalValue: { fontSize: FONTS.xl, fontWeight: FONTS.black, color: COLORS.primary },
  checkoutBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, paddingVertical: SPACING.base, alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: SPACING.xl },
  checkoutBtnDisabled: { backgroundColor: COLORS.textLight },
  checkoutBtnText: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: 'white' },
  checkoutBtnAmount: { fontSize: FONTS.sm, color: 'rgba(255,255,255,0.85)', fontWeight: FONTS.semiBold },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING['3xl'], paddingHorizontal: SPACING.xl },
  emptyIcon: { fontSize: 72, marginBottom: SPACING.base },
  emptyTitle: { fontSize: FONTS.xl, fontWeight: FONTS.black, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  emptySub: { fontSize: FONTS.sm, color: COLORS.textMuted, marginBottom: SPACING.xl },
  shopNowBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, paddingHorizontal: SPACING['2xl'], paddingVertical: SPACING.base },
  shopNowBtnText: { color: 'white', fontSize: FONTS.base, fontWeight: FONTS.bold },

  // ── Continue Shopping suggestion rows ──
  suggestionSection: { marginTop: SPACING.base, paddingTop: SPACING.sm },
  suggestionTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm, paddingHorizontal: SPACING.sm },
  suggestionList: { paddingHorizontal: SPACING.sm, gap: SPACING.sm },
  suggestionCard: { width: 150, height: 200 },
});