/**
 * VUMA Store — Cart Screen (Coupang-style)
 * Checkboxes, Select All, grouped by seller, sticky summary
 */

import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  StatusBar, Platform, Alert, Animated, ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectCartItems, removeFromCart, updateQuantity,
  clearCart, selectCartTotal,
} from '../../store/cartSlice';
import { selectIsAuthenticated } from '../../store/authSlice';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../utils/constants';
import { formatPrice } from '../../utils/helpers';
import { Image } from 'react-native';

const DELIVERY_FEE = 0; // Free Delivery

// ── Checkbox ──────────────────────────────────────────
const Checkbox = memo(({ checked, onPress, size = 22, indeterminate = false }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.checkbox, checked && styles.checkboxChecked, { width: size, height: size, borderRadius: size * 0.2 }]}
    activeOpacity={0.7}
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
  >
    {indeterminate && !checked
      ? <View style={styles.checkboxIndeterminate} />
      : checked
      ? <Text style={styles.checkboxTick}>✓</Text>
      : null
    }
  </TouchableOpacity>
));

// ── Quantity Stepper ───────────────────────────────────
const QuantityStepper = memo(({ quantity, onDecrease, onIncrease, minQty = 1 }) => (
  <View style={styles.stepper}>
    <TouchableOpacity
      style={[styles.stepperBtn, quantity <= minQty && styles.stepperBtnDisabled]}
      onPress={onDecrease}
      disabled={quantity <= minQty}
    >
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
  const itemTotal = item.price * item.quantity;

  return (
    <View style={[styles.cartItem, selected && styles.cartItemSelected]}>
      <Checkbox checked={selected} onPress={onToggle} />

      <TouchableOpacity activeOpacity={0.9} style={styles.cartItemImageWrap}>
        <Image
          uri={item.image}
          style={styles.cartItemImage}
          fallbackIcon="🛍️"
        />
        {item.discount_percent > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountBadgeText}>-{item.discount_percent}%</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName} numberOfLines={2}>{item.name}</Text>

        {item.selected_size && (
          <Text style={styles.cartItemVariant}>Size: {item.selected_size}</Text>
        )}
        {item.selected_color && (
          <Text style={styles.cartItemVariant}>Color: {item.selected_color}</Text>
        )}

        <View style={styles.cartItemPriceRow}>
          <Text style={styles.cartItemPrice}>TZS {itemTotal.toLocaleString()}</Text>
          {item.original_price && item.original_price > item.price && (
            <Text style={styles.cartItemOriginal}>TZS {(item.original_price * item.quantity).toLocaleString()}</Text>
          )}
        </View>

        <View style={styles.cartItemActions}>
          <QuantityStepper
            quantity={item.quantity}
            onDecrease={() => onQuantityChange(item.id, item.quantity - 1)}
            onIncrease={() => onQuantityChange(item.id, item.quantity + 1)}
          />
          <TouchableOpacity onPress={() => onDelete(item.id)} style={styles.deleteBtn}>
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
    <Checkbox
      checked={allSelected}
      indeterminate={someSelected && !allSelected}
      onPress={onToggleAll}
      size={20}
    />
    <Text style={styles.sellerHeaderIcon}>🏪</Text>
    <Text style={styles.sellerHeaderName}>{seller}</Text>
    <View style={styles.sellerFreeDelivery}>
      <Text style={styles.sellerFreeDeliveryText}>🚚 Free Delivery</Text>
    </View>
  </View>
));

export default function CartScreen({ navigation }) {
  const dispatch = useDispatch();
  const cartItems = useSelector(selectCartItems);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // Selected item IDs
  const [selectedIds, setSelectedIds] = useState(new Set(cartItems.map(i => i.id)));

  // Group items by seller
  const groupedBySeller = useMemo(() => {
    const groups = {};
    cartItems.forEach(item => {
      const seller = item.shop_name || item.vendor_name || 'VUMA Store';
      if (!groups[seller]) groups[seller] = [];
      groups[seller].push(item);
    });
    return groups;
  }, [cartItems]);

  const sellers = Object.keys(groupedBySeller);

  // Selected items
  const selectedItems = useMemo(
    () => cartItems.filter(i => selectedIds.has(i.id)),
    [cartItems, selectedIds]
  );

  // Totals
  const subtotal = useMemo(
    () => selectedItems.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [selectedItems]
  );
  const discount = useMemo(
    () => selectedItems.reduce((sum, i) => {
      if (i.original_price && i.original_price > i.price) {
        return sum + (i.original_price - i.price) * i.quantity;
      }
      return sum;
    }, 0),
    [selectedItems]
  );
  const total = subtotal + DELIVERY_FEE;

  const allSelected = cartItems.length > 0 && selectedIds.size === cartItems.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < cartItems.length;

  const toggleItem = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(cartItems.map(i => i.id)));
  }, [allSelected, cartItems]);

  const toggleSeller = useCallback((seller) => {
    const sellerItems = groupedBySeller[seller];
    const sellerIds = sellerItems.map(i => i.id);
    const allSellerSelected = sellerIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSellerSelected) sellerIds.forEach(id => next.delete(id));
      else sellerIds.forEach(id => next.add(id));
      return next;
    });
  }, [groupedBySeller, selectedIds]);

  const handleQuantityChange = useCallback((id, qty) => {
    if (qty < 1) return;
    dispatch(updateQuantity({ id, quantity: qty }));
  }, [dispatch]);

  const handleDelete = useCallback((id) => {
    Alert.alert('Remove Item', 'Remove this item from cart?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: () => {
          dispatch(removeFromCart({ id }));
          setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
        },
      },
    ]);
  }, [dispatch]);

  const handleDeleteSelected = useCallback(() => {
    Alert.alert('Remove Selected', `Remove ${selectedIds.size} items from cart?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: () => {
          selectedIds.forEach(id => dispatch(removeFromCart({ id })));
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
    navigation.navigate('Checkout', { items: selectedItems, total });
  }, [isAuthenticated, selectedItems, total, navigation]);

  // Empty cart
  if (cartItems.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Cart</Text>
        </View>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySub}>Add products to start shopping</Text>
          <TouchableOpacity style={styles.shopNowBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.shopNowBtnText}>Browse Products</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Cart ({cartItems.length})</Text>
        {selectedIds.size > 0 && (
          <TouchableOpacity onPress={handleDeleteSelected}>
            <Text style={styles.headerDelete}>🗑 Delete ({selectedIds.size})</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Select All Bar */}
      <View style={styles.selectAllBar}>
        <Checkbox
          checked={allSelected}
          indeterminate={someSelected}
          onPress={toggleAll}
          size={22}
        />
        <Text style={styles.selectAllText}>
          {allSelected ? 'Deselect All' : 'Select All'} ({cartItems.length} items)
        </Text>
        {selectedIds.size > 0 && (
          <Text style={styles.selectedCount}>{selectedIds.size} selected</Text>
        )}
      </View>

      {/* Cart Items grouped by seller */}
      <FlatList
        data={sellers}
        keyExtractor={seller => seller}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: seller }) => {
          const sellerItems = groupedBySeller[seller];
          const sellerIds = sellerItems.map(i => i.id);
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
                  selected={selectedIds.has(item.id)}
                  onToggle={() => toggleItem(item.id)}
                  onQuantityChange={handleQuantityChange}
                  onDelete={handleDelete}
                />
              ))}
            </View>
          );
        }}
        ListFooterComponent={<View style={{ height: 200 }} />}
      />

      {/* Sticky Bottom Summary */}
      <View style={styles.summary}>
        {/* Breakdown */}
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

        {/* Total */}
        <View style={styles.summaryTotalRow}>
          <Text style={styles.summaryTotalLabel}>Total</Text>
          <Text style={styles.summaryTotalValue}>TZS {total.toLocaleString()}</Text>
        </View>

        {/* Checkout Button */}
        <TouchableOpacity
          style={[styles.checkoutBtn, selectedItems.length === 0 && styles.checkoutBtnDisabled]}
          onPress={handleCheckout}
          disabled={selectedItems.length === 0}
          activeOpacity={0.85}
        >
          <Text style={styles.checkoutBtnText}>
            {selectedItems.length === 0
              ? 'Select Items to Checkout'
              : `Proceed to Checkout (${selectedItems.length} item${selectedItems.length !== 1 ? 's' : ''})`
            }
          </Text>
          {selectedItems.length > 0 && (
            <Text style={styles.checkoutBtnAmount}>TZS {total.toLocaleString()}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F3F5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, paddingHorizontal: SPACING.base, paddingTop: Platform.OS === 'ios' ? 50 : SPACING.base, paddingBottom: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.divider, ...SHADOWS.sm },
  headerTitle: { fontSize: FONTS.xl, fontWeight: FONTS.black, color: COLORS.textPrimary },
  headerDelete: { fontSize: FONTS.sm, color: COLORS.danger, fontWeight: FONTS.semiBold },
  selectAllBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 2, gap: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  selectAllText: { flex: 1, fontSize: FONTS.base, color: COLORS.textPrimary, fontWeight: FONTS.semiBold },
  selectedCount: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.bold },
  listContent: { padding: SPACING.sm, gap: SPACING.sm },
  sellerGroup: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, overflow: 'hidden', ...SHADOWS.sm },
  sellerHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 2, borderBottomWidth: 1, borderBottomColor: COLORS.divider, gap: SPACING.sm, backgroundColor: COLORS.surface },
  sellerHeaderIcon: { fontSize: 16 },
  sellerHeaderName: { flex: 1, fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  sellerFreeDelivery: { backgroundColor: '#E8F5E9', borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 2 },
  sellerFreeDeliveryText: { fontSize: FONTS.xs, color: COLORS.success, fontWeight: FONTS.semiBold },
  cartItem: { flexDirection: 'row', padding: SPACING.base, gap: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.divider, backgroundColor: COLORS.surface },
  cartItemSelected: { backgroundColor: '#FFFBF7' },
  cartItemImageWrap: { position: 'relative' },
  cartItemImage: { width: 90, height: 90, borderRadius: RADIUS.lg, backgroundColor: COLORS.surfaceAlt },
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
  // Stepper
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, overflow: 'hidden' },
  stepperBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceAlt },
  stepperBtnDisabled: { opacity: 0.4 },
  stepperBtnText: { fontSize: FONTS.lg, color: COLORS.textPrimary, fontWeight: FONTS.bold, lineHeight: 22 },
  stepperValue: { width: 36, textAlign: 'center', fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  // Checkbox
  checkbox: { width: 22, height: 22, borderWidth: 2, borderColor: COLORS.border, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkboxTick: { color: 'white', fontSize: 13, fontWeight: FONTS.black },
  checkboxIndeterminate: { width: 10, height: 2, backgroundColor: COLORS.primary, borderRadius: 1 },
  // Summary
  summary: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.divider, paddingHorizontal: SPACING.base, paddingTop: SPACING.sm, paddingBottom: Platform.OS === 'ios' ? 34 : SPACING.base, ...SHADOWS.lg },
  summaryBreakdown: { gap: SPACING.xs, marginBottom: SPACING.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: FONTS.sm, color: COLORS.textMuted },
  summaryValue: { fontSize: FONTS.sm, color: COLORS.textPrimary, fontWeight: FONTS.semiBold },
  summaryDiscount: { fontSize: FONTS.sm, color: COLORS.success, fontWeight: FONTS.semiBold },
  summaryFree: { fontSize: FONTS.sm, color: COLORS.success, fontWeight: FONTS.semiBold },
  summaryTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.divider, marginBottom: SPACING.sm },
  summaryTotalLabel: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  summaryTotalValue: { fontSize: FONTS.xl, fontWeight: FONTS.black, color: COLORS.primary },
  checkoutBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, paddingVertical: SPACING.base, alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, ...SHADOWS.primary },
  checkoutBtnDisabled: { backgroundColor: COLORS.textLight, shadowOpacity: 0 },
  checkoutBtnText: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: 'white' },
  checkoutBtnAmount: { fontSize: FONTS.sm, color: 'rgba(255,255,255,0.85)', fontWeight: FONTS.semiBold },
  // Empty
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  emptyIcon: { fontSize: 72, marginBottom: SPACING.base },
  emptyTitle: { fontSize: FONTS.xl, fontWeight: FONTS.black, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  emptySub: { fontSize: FONTS.sm, color: COLORS.textMuted, marginBottom: SPACING.xl },
  shopNowBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, paddingHorizontal: SPACING['2xl'], paddingVertical: SPACING.base },
  shopNowBtnText: { color: 'white', fontSize: FONTS.base, fontWeight: FONTS.bold },
});
