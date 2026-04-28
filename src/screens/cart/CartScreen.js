/**
 * VUMA Store — Cart Screen
 */

import React, { useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Image, Alert, StatusBar, Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectCartItems, selectCartTotal, selectCartSubtotal,
  selectCartShipping, selectCartItemCount, selectIsFreeShipping,
  selectCartByVendor, incrementQuantity, decrementQuantity,
  removeFromCart, clearCartAndSave, saveCart,
} from '../../store/cartSlice';
import { selectIsAuthenticated } from '../../store/authSlice';
import {
  COLORS, FONTS, SPACING, RADIUS, SHADOWS, SCREENS, APP,
} from '../../utils/constants';
import { formatPrice, getEffectivePrice } from '../../utils/helpers';
import { t } from '../../i18n';
import Button from '../../components/common/Button';
import { EmptyState } from '../../components/common/ErrorMessage';

export default function CartScreen({ navigation }) {
  const dispatch = useDispatch();
  const items = useSelector(selectCartItems);
  const total = useSelector(selectCartTotal);
  const subtotal = useSelector(selectCartSubtotal);
  const shipping = useSelector(selectCartShipping);
  const itemCount = useSelector(selectCartItemCount);
  const isFreeShipping = useSelector(selectIsFreeShipping);
  const cartByVendor = useSelector(selectCartByVendor);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const freeShipProgress = Math.min(
    subtotal / APP.freeShippingThreshold, 1
  );
  const remaining = Math.max(APP.freeShippingThreshold - subtotal, 0);

  const handleIncrement = useCallback((productId) => {
    dispatch(incrementQuantity(productId));
    dispatch(saveCart());
  }, []);

  const handleDecrement = useCallback((productId) => {
    dispatch(decrementQuantity(productId));
    dispatch(saveCart());
  }, []);

  const handleRemove = useCallback((productId, name) => {
    Alert.alert(
      t('cart.removeItem'),
      `Remove "${name}"?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            dispatch(removeFromCart(productId));
            dispatch(saveCart());
          },
        },
      ]
    );
  }, []);

  const handleClearCart = useCallback(() => {
    Alert.alert(
      t('cart.myCart'),
      t('cart.clearCartMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => dispatch(clearCartAndSave()),
        },
      ]
    );
  }, []);

  const handleCheckout = () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Login Required',
        'Please login to checkout.',
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('auth.login'),
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
      return;
    }
    navigation.navigate('Checkout');
  };

  const CartItem = useCallback(({ item }) => {
    if (!item?.product) return null;
    const { product, quantity } = item;
    const price = getEffectivePrice(product);
    const imageUrl = product.primary_image
      || product.images?.[0]?.image_url;
    return (
      <View style={styles.cartItem}>
        <TouchableOpacity
          onPress={() => navigation.navigate('ProductDetail', {
            productId: product.id, product,
          })}
        >
          {imageUrl ? (
            <Image source={{ uri: imageUrl }}
              style={styles.itemImage} resizeMode="cover" />
          ) : (
            <View style={styles.itemImagePlaceholder}>
              <Text style={styles.itemImageEmoji}>📦</Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={2}>
            {product.name}
          </Text>
          <Text style={styles.itemPrice}>
            {formatPrice(price)}
          </Text>
          <Text style={styles.itemTotal}>
            Total: {formatPrice(price * quantity)}
          </Text>
          <View style={styles.qtyRow}>
            <TouchableOpacity
              style={[styles.qtyBtn,
                quantity <= 1 && styles.qtyBtnDanger]}
              onPress={() => {
                if (quantity <= 1) handleRemove(product.id, product.name);
                else handleDecrement(product.id);
              }}
            >
              <Text style={[styles.qtyBtnText,
                quantity <= 1 && styles.qtyBtnTextDanger]}>
                {quantity <= 1 ? '🗑' : '−'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.qtyValue}>{quantity}</Text>
            <TouchableOpacity
              style={[styles.qtyBtn,
                quantity >= product.stock && styles.qtyBtnDisabled]}
              onPress={() => handleIncrement(product.id)}
              disabled={quantity >= product.stock}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
            <Text style={styles.stockInfo}>
              {product.stock} left
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => handleRemove(product.id, product.name)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.removeIcon}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  }, []);

  const VendorGroup = useCallback(({ vendorName, vendorItems }) => (
    <View style={styles.vendorGroup}>
      <View style={styles.vendorHeader}>
        <Text style={styles.vendorIcon}>🏪</Text>
        <Text style={styles.vendorName}>{vendorName}</Text>
      </View>
      {vendorItems.map((item) => (
        <CartItem key={item.id} item={item} />
      ))}
    </View>
  ), [CartItem]);

  const OrderSummary = () => (
    <View style={styles.summary}>
      <Text style={styles.summaryTitle}>
        {t('cart.orderSummary')}
      </Text>
      {!isFreeShipping && (
        <View style={styles.freeShipWrap}>
          <View style={styles.freeShipBar}>
            <View style={[styles.freeShipFill,
              { width: `${freeShipProgress * 100}%` }]} />
          </View>
          <Text style={styles.freeShipText}>
            Add {formatPrice(remaining)} more for{' '}
            <Text style={styles.freeShipBold}>
              Free Shipping!
            </Text>
          </Text>
        </View>
      )}
      {isFreeShipping && (
        <View style={styles.freeShipEarned}>
          <Text style={styles.freeShipEarnedText}>
            🎉 {t('cart.freeShippingEarned')}
          </Text>
        </View>
      )}
      {[
        [t('cart.subtotal'), formatPrice(subtotal)],
        [t('cart.shipping'), isFreeShipping
          ? t('cart.free') : formatPrice(shipping)],
      ].map(([label, value]) => (
        <View key={label} style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{label}</Text>
          <Text style={[styles.summaryValue,
            label === t('cart.shipping')
              && isFreeShipping && styles.freeShipValue]}>
            {value}
          </Text>
        </View>
      ))}
      <View style={styles.summaryDivider} />
      <View style={styles.summaryRow}>
        <Text style={styles.totalLabel}>{t('cart.total')}</Text>
        <Text style={styles.totalValue}>
          {formatPrice(total)}
        </Text>
      </View>
    </View>
  );

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content"
          backgroundColor={COLORS.surface} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t('cart.myCart')}
          </Text>
          <View style={{ width: 32 }} />
        </View>
        <EmptyState
          icon="🛒"
          title={t('cart.emptyCart')}
          message={t('cart.emptyCartMessage')}
          actionLabel={t('cart.startShopping')}
          onAction={() => navigation.navigate('Home')}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content"
        backgroundColor={COLORS.surface} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('cart.myCart')} ({itemCount})
        </Text>
        <TouchableOpacity onPress={handleClearCart}>
          <Text style={styles.clearBtn}>
            {t('common.delete')}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={Object.entries(cartByVendor)}
        keyExtractor={([vendorName]) => vendorName}
        renderItem={({ item: [vendorName, vendorItems] }) => (
          <VendorGroup
            vendorName={vendorName}
            vendorItems={vendorItems}
          />
        )}
        ListFooterComponent={<OrderSummary />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.checkoutBar}>
        <View style={styles.checkoutTotal}>
          <Text style={styles.checkoutTotalLabel}>
            {t('cart.total')}
          </Text>
          <Text style={styles.checkoutTotalValue}>
            {formatPrice(total)}
          </Text>
        </View>
        <Button
          title={`${t('cart.checkout')} (${itemCount})`}
          onPress={handleCheckout}
          style={styles.checkoutBtn}
          size="lg"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.base,
    paddingTop: Platform.OS === 'ios' ? SPACING['3xl'] : SPACING.base,
    paddingBottom: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    ...SHADOWS.sm,
  },
  backIcon: {
    fontSize: FONTS.xl, color: COLORS.textPrimary, fontWeight: FONTS.bold,
  },
  headerTitle: {
    fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary,
  },
  clearBtn: {
    fontSize: FONTS.sm, color: COLORS.danger, fontWeight: FONTS.semiBold,
  },
  listContent: { paddingBottom: 120 },
  vendorGroup: {
    backgroundColor: COLORS.surface, marginBottom: SPACING.sm,
  },
  vendorHeader: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.divider,
    backgroundColor: COLORS.surfaceAlt,
  },
  vendorIcon: { fontSize: FONTS.base },
  vendorName: {
    fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.textSecondary,
  },
  cartItem: {
    flexDirection: 'row',
    padding: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: SPACING.sm,
  },
  itemImage: {
    width: 90, height: 90, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.skeleton,
  },
  itemImagePlaceholder: {
    width: 90, height: 90, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  itemImageEmoji: { fontSize: 36 },
  itemInfo: { flex: 1, gap: SPACING.xs },
  itemName: {
    fontSize: FONTS.sm, fontWeight: FONTS.semiBold,
    color: COLORS.textPrimary, lineHeight: 18,
  },
  itemPrice: {
    fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.primary,
  },
  itemTotal: { fontSize: FONTS.xs, color: COLORS.textMuted },
  qtyRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: SPACING.sm, marginTop: SPACING.xs,
  },
  qtyBtn: {
    width: 30, height: 30, borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryFade,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: COLORS.primary,
  },
  qtyBtnDanger: {
    backgroundColor: COLORS.dangerLight, borderColor: COLORS.danger,
  },
  qtyBtnDisabled: {
    backgroundColor: COLORS.skeleton,
    borderColor: COLORS.border, opacity: 0.5,
  },
  qtyBtnText: {
    fontSize: FONTS.base, fontWeight: FONTS.bold,
    color: COLORS.primary, lineHeight: 18,
  },
  qtyBtnTextDanger: { color: COLORS.danger },
  qtyValue: {
    fontSize: FONTS.base, fontWeight: FONTS.bold,
    color: COLORS.textPrimary, minWidth: 24, textAlign: 'center',
  },
  stockInfo: { fontSize: FONTS.xs, color: COLORS.textMuted },
  removeBtn: { padding: SPACING.xs },
  removeIcon: {
    fontSize: FONTS.base, color: COLORS.textMuted, fontWeight: FONTS.bold,
  },
  summary: {
    backgroundColor: COLORS.surface,
    margin: SPACING.sm,
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
    ...SHADOWS.sm,
  },
  summaryTitle: {
    fontSize: FONTS.lg, fontWeight: FONTS.bold,
    color: COLORS.textPrimary, marginBottom: SPACING.base,
  },
  freeShipWrap: { marginBottom: SPACING.base },
  freeShipBar: {
    height: 6, backgroundColor: COLORS.skeleton,
    borderRadius: RADIUS.full, overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  freeShipFill: {
    height: '100%', backgroundColor: COLORS.success,
    borderRadius: RADIUS.full,
  },
  freeShipText: { fontSize: FONTS.xs, color: COLORS.textMuted },
  freeShipBold: { fontWeight: FONTS.bold, color: COLORS.success },
  freeShipEarned: {
    backgroundColor: COLORS.successLight,
    borderRadius: RADIUS.lg, padding: SPACING.sm,
    marginBottom: SPACING.base, alignItems: 'center',
  },
  freeShipEarnedText: {
    fontSize: FONTS.sm, color: COLORS.successText, fontWeight: FONTS.semiBold,
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  summaryLabel: { fontSize: FONTS.base, color: COLORS.textSecondary },
  summaryValue: {
    fontSize: FONTS.base, fontWeight: FONTS.semiBold, color: COLORS.textPrimary,
  },
  freeShipValue: { color: COLORS.success, fontWeight: FONTS.bold },
  summaryDivider: {
    height: 1, backgroundColor: COLORS.divider, marginVertical: SPACING.sm,
  },
  totalLabel: {
    fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary,
  },
  totalValue: {
    fontSize: FONTS.xl, fontWeight: FONTS.black, color: COLORS.primary,
  },
  checkoutBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: SPACING.base,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm,
    paddingBottom: Platform.OS === 'ios' ? SPACING.xl : SPACING.base,
    borderTopWidth: 1, borderTopColor: COLORS.divider,
    ...SHADOWS.md,
  },
  checkoutTotal: { flex: 1 },
  checkoutTotalLabel: { fontSize: FONTS.xs, color: COLORS.textMuted },
  checkoutTotalValue: {
    fontSize: FONTS.xl, fontWeight: FONTS.black, color: COLORS.primary,
  },
  checkoutBtn: { flex: 2 },
});