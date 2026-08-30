/**
 * VUMA Store — Cart Slice
 * Multi-vendor cart with persistence
 *
 * Wishlist section updated: previously toggleWishlistAndSave only
 * wrote to local AsyncStorage (storage.setWishlist) and never called
 * any API — wishlisted items were lost on reinstall and never synced
 * across devices. Now backed by the real
 * apps.products.promotions.WishlistItem backend (GET/POST
 * /promotions/wishlist/...). Local storage is kept as an offline-first
 * cache, not the source of truth anymore. Wishlist now stores full
 * product objects (not just IDs) since a real Wishlist screen needs
 * image/name/price to render, matching how cart.items already works.
 * Every existing export name is unchanged so other screens that
 * already import these keep working.
 */
import { createSelector } from '@reduxjs/toolkit';
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { storage } from '../utils/storage';
import { get, post } from '../api/client';
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
 * Load wishlist — real backend is now the source of truth. Falls
 * back to the local cache if the request fails (e.g. offline), so the
 * screen still shows something rather than going blank.
 */
export const loadWishlist = createAsyncThunk(
  'cart/loadWishlist',
  async () => {
    try {
      const products = await get('/promotions/wishlist/');
      await storage.setWishlist(products);
      return products || [];
    } catch (e) {
      const cached = await storage.getWishlist();
      return cached || [];
    }
  }
);

// ══════════════════════════════════════════════════════
// INITIAL STATE
// ══════════════════════════════════════════════════════

const initialState = {
  // Cart items
  // Each item: { id, product, quantity, addedAt }
  items: [],

  // Wishlist — array of full product objects (real backend data)
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
          selectedSize: product.selectedSize || null,
          selectedVariant: product.selectedVariant || null,
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
     * Toggle wishlist item — now takes the full product object (not
     * just an ID) since the wishlist stores full objects for real
     * screen rendering. Purely local/optimistic; the real add/remove
     * against the backend happens in toggleWishlistAndSave below.
     */
    toggleWishlist: (state, action) => {
      const product = action.payload;
      const index = state.wishlist.findIndex((p) => p.id === product.id);
      if (index >= 0) {
        state.wishlist.splice(index, 1);
      } else {
        state.wishlist.push(product);
      }
    },

    /**
     * Set wishlist (loaded from server or storage) — full product objects.
     */
    setWishlist: (state, action) => {
      state.wishlist = action.payload || [];
    },

    /**
     * Add to wishlist — takes a full product object.
     */
    addToWishlist: (state, action) => {
      const product = action.payload;
      if (!state.wishlist.some((p) => p.id === product.id)) {
        state.wishlist.push(product);
      }
    },

    /**
     * Remove from wishlist by product ID.
     */
    removeFromWishlist: (state, action) => {
      const productId = action.payload;
      state.wishlist = state.wishlist.filter(
        (p) => p.id !== productId
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
 * Toggle wishlist — real backend call. `product` must be the full
 * product object (needed for the optimistic local update and for
 * rendering if the item is being added). Optimistically updates local
 * state immediately, then confirms/corrects against the real server
 * response; reverts on failure so local state never drifts from the
 * real backend.
 */
export const toggleWishlistAndSave = (product) =>
  async (dispatch, getState) => {
    if (!product || !product.id) return;

    const wasWishlisted = getState().cart.wishlist.some((p) => p.id === product.id);
    dispatch(toggleWishlist(product));

    try {
      const result = await post(`/promotions/wishlist/${product.id}/toggle/`);
      // Reconcile: if the real server state disagrees with our
      // optimistic guess (e.g. another device toggled it in between),
      // correct local state to match the real result.
      const nowWishlisted = getState().cart.wishlist.some((p) => p.id === product.id);
      if (result.is_wishlisted !== nowWishlisted) {
        if (result.is_wishlisted) dispatch(addToWishlist(product));
        else dispatch(removeFromWishlist(product.id));
      }
    } catch (e) {
      // Revert the optimistic change — the real backend call failed.
      if (wasWishlisted) dispatch(addToWishlist(product));
      else dispatch(removeFromWishlist(product.id));
    }

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
  state.cart.wishlist.some((p) => p.id === productId);

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