/**
 * VUMA Store — Cart Slice
 * Multi-vendor cart with persistence
 */
import { createSelector } from '@reduxjs/toolkit';
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { storage } from '../utils/storage';
import {
  calculateCartTotals,
  getEffectivePrice,
  getErrorMessage,
} from '../utils/helpers';

// ══════════════════════════════════════════════════════
// ASYNC THUNKS
// ══════════════════════════════════════════════════════

/**
 * Load cart from storage on app start
 */
export const loadCart = createAsyncThunk(
  'cart/loadCart',
  async () => {
    const items = await storage.getCart();
    return items || [];
  }
);

/**
 * Save cart to storage
 */
export const saveCart = createAsyncThunk(
  'cart/saveCart',
  async (_, { getState }) => {
    const { items } = getState().cart;
    await storage.setCart(items);
    return true;
  }
);

/**
 * Load wishlist from storage
 */
export const loadWishlist = createAsyncThunk(
  'cart/loadWishlist',
  async () => {
    const items = await storage.getWishlist();
    return items || [];
  }
);

// ══════════════════════════════════════════════════════
// INITIAL STATE
// ══════════════════════════════════════════════════════

const initialState = {
  // Cart items
  // Each item: { id, product, quantity, addedAt }
  items: [],

  // Wishlist — array of product IDs
  wishlist: [],

  // Totals
  subtotal: 0,
  shipping: 0,
  total: 0,
  itemCount: 0,
  isfreeDelivery: false,

  // UI states
  loading: {
    load: false,
    save: false,
    wishlist: false,
  },

  // Last added item (for toast notification)
  lastAdded: null,
};

// ══════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════

const recalculate = (state) => {
  const totals = calculateCartTotals(state.items);
  state.subtotal = totals.subtotal;
  state.shipping = totals.shipping;
  state.total = totals.total;
  state.itemCount = totals.itemCount;
  state.isfreeDelivery = totals.isfreeDelivery;
};

// ══════════════════════════════════════════════════════
// SLICE
// ══════════════════════════════════════════════════════

const cartSlice = createSlice({
  name: 'cart',
  initialState,

  reducers: {
    /**
     * Add product to cart
     * If already exists → increment quantity
     */
    addToCart: (state, action) => {
      const { product, quantity = 1 } = action.payload;

      if (!product || !product.id) return;

      const existingIndex = state.items.findIndex(
        (item) => item.product.id === product.id
      );

      if (existingIndex >= 0) {
        const existing = state.items[existingIndex];
        const newQty = existing.quantity + quantity;
        // Cap at stock
        state.items[existingIndex].quantity = Math.min(
          newQty,
          product.stock || 99
        );
      } else {
        state.items.push({
          id: `${product.id}_${Date.now()}`,
          product,
          quantity: Math.min(quantity, product.stock || 99),
          addedAt: new Date().toISOString(),
        });
      }

      state.lastAdded = product;
      recalculate(state);
    },

    /**
     * Remove item from cart by product ID
     */
    removeFromCart: (state, action) => {
      const productId = action.payload;
      state.items = state.items.filter(
        (item) => item.product.id !== productId
      );
      state.lastAdded = null;
      recalculate(state);
    },

    /**
     * Update quantity of a cart item
     */
    updateQuantity: (state, action) => {
      const { productId, quantity } = action.payload;

      if (quantity <= 0) {
        state.items = state.items.filter(
          (item) => item.product.id !== productId
        );
        recalculate(state);
        return;
      }

      const index = state.items.findIndex(
        (item) => item.product.id === productId
      );

      if (index >= 0) {
        const stock = state.items[index].product.stock || 99;
        state.items[index].quantity = Math.min(quantity, stock);
        recalculate(state);
      }
    },

    /**
     * Increment item quantity by 1
     */
    incrementQuantity: (state, action) => {
      const productId = action.payload;
      const index = state.items.findIndex(
        (item) => item.product.id === productId
      );
      if (index >= 0) {
        const stock = state.items[index].product.stock || 99;
        if (state.items[index].quantity < stock) {
          state.items[index].quantity += 1;
          recalculate(state);
        }
      }
    },

    /**
     * Decrement item quantity by 1
     * Removes item if quantity reaches 0
     */
    decrementQuantity: (state, action) => {
      const productId = action.payload;
      const index = state.items.findIndex(
        (item) => item.product.id === productId
      );
      if (index >= 0) {
        if (state.items[index].quantity <= 1) {
          state.items.splice(index, 1);
        } else {
          state.items[index].quantity -= 1;
        }
        recalculate(state);
      }
    },

    /**
     * Clear entire cart
     */
    clearCart: (state) => {
      state.items = [];
      state.lastAdded = null;
      recalculate(state);
    },

    /**
     * Clear last added (dismiss toast)
     */
    clearLastAdded: (state) => {
      state.lastAdded = null;
    },

    /**
     * Toggle wishlist item
     */
    toggleWishlist: (state, action) => {
      const productId = action.payload;
      const index = state.wishlist.indexOf(productId);
      if (index >= 0) {
        state.wishlist.splice(index, 1);
      } else {
        state.wishlist.push(productId);
      }
    },

    /**
     * Set wishlist (loaded from storage)
     */
    setWishlist: (state, action) => {
      state.wishlist = action.payload || [];
    },

    /**
     * Add to wishlist
     */
    addToWishlist: (state, action) => {
      const productId = action.payload;
      if (!state.wishlist.includes(productId)) {
        state.wishlist.push(productId);
      }
    },

    /**
     * Remove from wishlist
     */
    removeFromWishlist: (state, action) => {
      const productId = action.payload;
      state.wishlist = state.wishlist.filter(
        (id) => id !== productId
      );
    },

    /**
     * Sync product prices/stock in cart
     * Call when returning to cart screen
     */
    syncCartProducts: (state, action) => {
      const updatedProducts = action.payload;
      if (!updatedProducts || !Array.isArray(updatedProducts)) {
        return;
      }
      state.items = state.items.filter((item) => {
        const updated = updatedProducts.find(
          (p) => p.id === item.product.id
        );
        if (!updated) return false;
        if (updated.status !== 'active') return false;
        item.product = updated;
        if (item.quantity > updated.stock) {
          item.quantity = updated.stock;
        }
        return item.quantity > 0;
      });
      recalculate(state);
    },
  },

  extraReducers: (builder) => {
    // ── Load Cart ─────────────────────────────────────
    builder
      .addCase(loadCart.pending, (state) => {
        state.loading.load = true;
      })
      .addCase(loadCart.fulfilled, (state, action) => {
        state.loading.load = false;
        state.items = action.payload;
        recalculate(state);
      })
      .addCase(loadCart.rejected, (state) => {
        state.loading.load = false;
        state.items = [];
      });

    // ── Save Cart ─────────────────────────────────────
    builder
      .addCase(saveCart.pending, (state) => {
        state.loading.save = true;
      })
      .addCase(saveCart.fulfilled, (state) => {
        state.loading.save = false;
      })
      .addCase(saveCart.rejected, (state) => {
        state.loading.save = false;
      });

    // ── Load Wishlist ─────────────────────────────────
    builder
      .addCase(loadWishlist.pending, (state) => {
        state.loading.wishlist = true;
      })
      .addCase(loadWishlist.fulfilled, (state, action) => {
        state.loading.wishlist = false;
        state.wishlist = action.payload;
      })
      .addCase(loadWishlist.rejected, (state) => {
        state.loading.wishlist = false;
      });
  },
});

// ══════════════════════════════════════════════════════
// ACTIONS
// ══════════════════════════════════════════════════════

export const {
  addToCart,
  removeFromCart,
  updateQuantity,
  incrementQuantity,
  decrementQuantity,
  clearCart,
  clearLastAdded,
  toggleWishlist,
  setWishlist,
  addToWishlist,
  removeFromWishlist,
  syncCartProducts,
} = cartSlice.actions;

// ══════════════════════════════════════════════════════
// THUNKS WITH SIDE EFFECTS
// ══════════════════════════════════════════════════════

/**
 * Add to cart and persist to storage
 */
export const addToCartAndSave = (product, quantity = 1) =>
  async (dispatch) => {
    dispatch(addToCart({ product, quantity }));
    dispatch(saveCart());
  };

/**
 * Remove from cart and persist
 */
export const removeFromCartAndSave = (productId) =>
  async (dispatch) => {
    dispatch(removeFromCart(productId));
    dispatch(saveCart());
  };

/**
 * Update quantity and persist
 */
export const updateQuantityAndSave = (productId, quantity) =>
  async (dispatch) => {
    dispatch(updateQuantity({ productId, quantity }));
    dispatch(saveCart());
  };

/**
 * Clear cart and persist
 */
export const clearCartAndSave = () => async (dispatch) => {
  dispatch(clearCart());
  await storage.clearCart();
};

/**
 * Toggle wishlist and persist
 */
export const toggleWishlistAndSave = (productId) =>
  async (dispatch, getState) => {
    dispatch(toggleWishlist(productId));
    const { wishlist } = getState().cart;
    await storage.setWishlist(wishlist);
  };

// ══════════════════════════════════════════════════════
// SELECTORS
// ══════════════════════════════════════════════════════

export const selectCartItems = (state) => state.cart.items;
export const selectCartItemCount = (state) => state.cart.itemCount;
export const selectCartSubtotal = (state) => state.cart.subtotal;
export const selectCartShipping = (state) => state.cart.shipping;
export const selectCartTotal = (state) => state.cart.total;
export const selectIsfreeDelivery = (state) =>
  state.cart.isfreeDelivery;
export const selectCartLoading = (state) => state.cart.loading;
export const selectLastAdded = (state) => state.cart.lastAdded;
export const selectWishlist = (state) => state.cart.wishlist;

export const selectIsInCart = (productId) => (state) =>
  state.cart.items.some((item) => item.product.id === productId);

export const selectIsInWishlist = (productId) => (state) =>
  state.cart.wishlist.includes(productId);

export const selectCartItemByProductId = (productId) => (state) =>
  state.cart.items.find((item) => item.product.id === productId);

// Replace with memoized selector:
export const selectCartByVendor = createSelector(
  (state) => state.cart.items,
  (items) => {
    const groups = {};
    items.forEach((item) => {
      const vendorName =
        item.product?.vendor_name || 'VUMA Store';
      if (!groups[vendorName]) groups[vendorName] = [];
      groups[vendorName].push(item);
    });
    return groups;
  }
);
export default cartSlice.reducer;
