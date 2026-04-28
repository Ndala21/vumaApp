/**
 * VUMA Store — Order Slice
 * Orders state management
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getErrorMessage, getFieldErrors } from '../utils/helpers';

// ══════════════════════════════════════════════════════
// ASYNC THUNKS
// ══════════════════════════════════════════════════════

/**
 * Fetch all orders for current user
 */
export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async (
    { page = 1, status = '', refresh = false } = {},
    { rejectWithValue }
  ) => {
    try {
      const { ordersAPI } = await import('../api/orders');
      const data = await ordersAPI.getOrders({ page, status });
      return { data, page, refresh };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

/**
 * Fetch single order detail
 */
export const fetchOrderDetail = createAsyncThunk(
  'orders/fetchOrderDetail',
  async (orderId, { rejectWithValue }) => {
    try {
      const { ordersAPI } = await import('../api/orders');
      const data = await ordersAPI.getOrderDetail(orderId);
      return data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

/**
 * Create new order
 */
export const createOrder = createAsyncThunk(
  'orders/createOrder',
  async (orderData, { rejectWithValue }) => {
    try {
      const { ordersAPI } = await import('../api/orders');
      const data = await ordersAPI.createOrder(orderData);
      return data;
    } catch (error) {
      return rejectWithValue(
        getFieldErrors(error) || getErrorMessage(error)
      );
    }
  }
);

/**
 * Cancel order
 */
export const cancelOrder = createAsyncThunk(
  'orders/cancelOrder',
  async (orderId, { rejectWithValue }) => {
    try {
      const { ordersAPI } = await import('../api/orders');
      const data = await ordersAPI.cancelOrder(orderId);
      return data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

/**
 * Fetch shipping addresses
 */
export const fetchAddresses = createAsyncThunk(
  'orders/fetchAddresses',
  async (_, { rejectWithValue }) => {
    try {
      const { ordersAPI } = await import('../api/orders');
      const data = await ordersAPI.getAddresses();
      return data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

/**
 * Create shipping address
 */
export const createAddress = createAsyncThunk(
  'orders/createAddress',
  async (addressData, { rejectWithValue }) => {
    try {
      const { ordersAPI } = await import('../api/orders');
      const data = await ordersAPI.createAddress(addressData);
      return data;
    } catch (error) {
      return rejectWithValue(
        getFieldErrors(error) || getErrorMessage(error)
      );
    }
  }
);

/**
 * Delete shipping address
 */
export const deleteAddress = createAsyncThunk(
  'orders/deleteAddress',
  async (addressId, { rejectWithValue }) => {
    try {
      const { ordersAPI } = await import('../api/orders');
      await ordersAPI.deleteAddress(addressId);
      return addressId;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

/**
 * Set default address
 */
export const setDefaultAddress = createAsyncThunk(
  'orders/setDefaultAddress',
  async (addressId, { rejectWithValue }) => {
    try {
      const { ordersAPI } = await import('../api/orders');
      await ordersAPI.setDefaultAddress(addressId);
      return addressId;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

/**
 * Fetch vendor orders
 */
export const fetchVendorOrders = createAsyncThunk(
  'orders/fetchVendorOrders',
  async ({ page = 1, status = '' } = {}, { rejectWithValue }) => {
    try {
      const { ordersAPI } = await import('../api/orders');
      const data = await ordersAPI.getVendorOrders({
        page,
        status,
      });
      return data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

/**
 * Update order item status (vendor)
 */
export const updateOrderItemStatus = createAsyncThunk(
  'orders/updateItemStatus',
  async (
    { orderId, itemId, status, trackingNumber = '' },
    { rejectWithValue }
  ) => {
    try {
      const { ordersAPI } = await import('../api/orders');
      const data = await ordersAPI.updateItemStatus(
        orderId,
        itemId,
        {
          item_status: status,
          tracking_number: trackingNumber,
        }
      );
      return data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// ══════════════════════════════════════════════════════
// INITIAL STATE
// ══════════════════════════════════════════════════════

const initialState = {
  // Customer orders
  orders: [],
  currentPage: 1,
  hasNextPage: false,
  totalCount: 0,

  // Selected order detail
  selectedOrder: null,

  // Newly created order
  createdOrder: null,

  // Shipping addresses
  addresses: [],

  // Vendor orders
  vendorOrders: [],
  vendorOrdersPage: 1,
  vendorOrdersHasMore: false,

  // Active filter
  activeStatusFilter: '',

  // Loading states
  loading: {
    orders: false,
    detail: false,
    create: false,
    cancel: false,
    addresses: false,
    createAddress: false,
    deleteAddress: false,
    setDefault: false,
    vendorOrders: false,
    updateItemStatus: false,
    loadingMore: false,
  },

  // Errors
  errors: {
    orders: null,
    detail: null,
    create: null,
    cancel: null,
    addresses: null,
    createAddress: null,
    vendorOrders: null,
    updateItemStatus: null,
  },
};

// ══════════════════════════════════════════════════════
// SLICE
// ══════════════════════════════════════════════════════

const orderSlice = createSlice({
  name: 'orders',
  initialState,

  reducers: {
    // Clear selected order
    clearSelectedOrder: (state) => {
      state.selectedOrder = null;
    },

    // Clear created order
    clearCreatedOrder: (state) => {
      state.createdOrder = null;
    },

    // Set active status filter
    setStatusFilter: (state, action) => {
      state.activeStatusFilter = action.payload;
      state.orders = [];
      state.currentPage = 1;
    },

    // Clear errors
    clearOrderError: (state, action) => {
      const field = action.payload;
      if (field && state.errors[field] !== undefined) {
        state.errors[field] = null;
      } else {
        Object.keys(state.errors).forEach((k) => {
          state.errors[k] = null;
        });
      }
    },

    // Reset orders list
    resetOrders: (state) => {
      state.orders = [];
      state.currentPage = 1;
      state.hasNextPage = false;
    },

    // Update order in list
    updateOrderInList: (state, action) => {
      const updated = action.payload;
      const index = state.orders.findIndex(
        (o) => o.id === updated.id
      );
      if (index >= 0) {
        state.orders[index] = updated;
      }
      if (state.selectedOrder?.id === updated.id) {
        state.selectedOrder = updated;
      }
    },
  },

  extraReducers: (builder) => {
    // ── Fetch Orders ──────────────────────────────────
    builder
      .addCase(fetchOrders.pending, (state, action) => {
        const isLoadMore = action.meta.arg?.page > 1;
        if (isLoadMore) {
          state.loading.loadingMore = true;
        } else {
          state.loading.orders = true;
        }
        state.errors.orders = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading.orders = false;
        state.loading.loadingMore = false;
        const { data, page, refresh } = action.payload;
        const results = data.results || data;
        if (page === 1 || refresh) {
          state.orders = results;
        } else {
          const existingIds = new Set(
            state.orders.map((o) => o.id)
          );
          const newItems = results.filter(
            (o) => !existingIds.has(o.id)
          );
          state.orders = [...state.orders, ...newItems];
        }
        state.currentPage = page;
        state.totalCount = data.count || results.length;
        state.hasNextPage = !!data.next;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading.orders = false;
        state.loading.loadingMore = false;
        state.errors.orders = action.payload;
      });

    // ── Fetch Order Detail ────────────────────────────
    builder
      .addCase(fetchOrderDetail.pending, (state) => {
        state.loading.detail = true;
        state.errors.detail = null;
        state.selectedOrder = null;
      })
      .addCase(fetchOrderDetail.fulfilled, (state, action) => {
        state.loading.detail = false;
        state.selectedOrder = action.payload;
      })
      .addCase(fetchOrderDetail.rejected, (state, action) => {
        state.loading.detail = false;
        state.errors.detail = action.payload;
      });

    // ── Create Order ──────────────────────────────────
    builder
      .addCase(createOrder.pending, (state) => {
        state.loading.create = true;
        state.errors.create = null;
        state.createdOrder = null;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.loading.create = false;
        state.createdOrder = action.payload;
        // Prepend to orders list
        state.orders.unshift(action.payload);
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.loading.create = false;
        state.errors.create = action.payload;
      });

    // ── Cancel Order ──────────────────────────────────
    builder
      .addCase(cancelOrder.pending, (state) => {
        state.loading.cancel = true;
        state.errors.cancel = null;
      })
      .addCase(cancelOrder.fulfilled, (state, action) => {
        state.loading.cancel = false;
        const updated = action.payload;
        const index = state.orders.findIndex(
          (o) => o.id === updated.id
        );
        if (index >= 0) {
          state.orders[index] = updated;
        }
        if (state.selectedOrder?.id === updated.id) {
          state.selectedOrder = updated;
        }
      })
      .addCase(cancelOrder.rejected, (state, action) => {
        state.loading.cancel = false;
        state.errors.cancel = action.payload;
      });

    // ── Fetch Addresses ───────────────────────────────
    builder
      .addCase(fetchAddresses.pending, (state) => {
        state.loading.addresses = true;
      })
      .addCase(fetchAddresses.fulfilled, (state, action) => {
        state.loading.addresses = false;
        const results =
          action.payload.results || action.payload;
        state.addresses = Array.isArray(results) ? results : [];
      })
      .addCase(fetchAddresses.rejected, (state) => {
        state.loading.addresses = false;
      });

    // ── Create Address ────────────────────────────────
    builder
      .addCase(createAddress.pending, (state) => {
        state.loading.createAddress = true;
        state.errors.createAddress = null;
      })
      .addCase(createAddress.fulfilled, (state, action) => {
        state.loading.createAddress = false;
        state.addresses.push(action.payload);
      })
      .addCase(createAddress.rejected, (state, action) => {
        state.loading.createAddress = false;
        state.errors.createAddress = action.payload;
      });

    // ── Delete Address ────────────────────────────────
    builder
      .addCase(deleteAddress.pending, (state) => {
        state.loading.deleteAddress = true;
      })
      .addCase(deleteAddress.fulfilled, (state, action) => {
        state.loading.deleteAddress = false;
        state.addresses = state.addresses.filter(
          (a) => a.id !== action.payload
        );
      })
      .addCase(deleteAddress.rejected, (state) => {
        state.loading.deleteAddress = false;
      });

    // ── Set Default Address ───────────────────────────
    builder
      .addCase(setDefaultAddress.pending, (state) => {
        state.loading.setDefault = true;
      })
      .addCase(setDefaultAddress.fulfilled, (state, action) => {
        state.loading.setDefault = false;
        const addressId = action.payload;
        state.addresses = state.addresses.map((a) => ({
          ...a,
          is_default: a.id === addressId,
        }));
      })
      .addCase(setDefaultAddress.rejected, (state) => {
        state.loading.setDefault = false;
      });

    // ── Fetch Vendor Orders ───────────────────────────
    builder
      .addCase(fetchVendorOrders.pending, (state) => {
        state.loading.vendorOrders = true;
        state.errors.vendorOrders = null;
      })
      .addCase(fetchVendorOrders.fulfilled, (state, action) => {
        state.loading.vendorOrders = false;
        const results =
          action.payload.results || action.payload;
        state.vendorOrders = Array.isArray(results)
          ? results
          : [];
        state.vendorOrdersHasMore = !!action.payload.next;
      })
      .addCase(fetchVendorOrders.rejected, (state, action) => {
        state.loading.vendorOrders = false;
        state.errors.vendorOrders = action.payload;
      });

    // ── Update Item Status ────────────────────────────
    builder
      .addCase(updateOrderItemStatus.pending, (state) => {
        state.loading.updateItemStatus = true;
        state.errors.updateItemStatus = null;
      })
      .addCase(
        updateOrderItemStatus.fulfilled,
        (state, action) => {
          state.loading.updateItemStatus = false;
          const result = action.payload;
          // Update in vendor orders
          if (result.order_status) {
            const index = state.vendorOrders.findIndex(
              (o) => o.id === result.order_id
            );
            if (index >= 0 && result.order_status) {
              state.vendorOrders[index].status =
                result.order_status;
            }
          }
        }
      )
      .addCase(
        updateOrderItemStatus.rejected,
        (state, action) => {
          state.loading.updateItemStatus = false;
          state.errors.updateItemStatus = action.payload;
        }
      );
  },
});

// ══════════════════════════════════════════════════════
// ACTIONS
// ══════════════════════════════════════════════════════

export const {
  clearSelectedOrder,
  clearCreatedOrder,
  setStatusFilter,
  clearOrderError,
  resetOrders,
  updateOrderInList,
} = orderSlice.actions;

// ══════════════════════════════════════════════════════
// SELECTORS
// ══════════════════════════════════════════════════════

export const selectOrders = (state) => state.orders.orders;
export const selectSelectedOrder = (state) =>
  state.orders.selectedOrder;
export const selectCreatedOrder = (state) =>
  state.orders.createdOrder;
export const selectOrdersLoading = (state) =>
  state.orders.loading;
export const selectOrdersErrors = (state) =>
  state.orders.errors;
export const selectOrdersHasNextPage = (state) =>
  state.orders.hasNextPage;
export const selectOrdersTotalCount = (state) =>
  state.orders.totalCount;
export const selectAddresses = (state) =>
  state.orders.addresses;
export const selectDefaultAddress = (state) =>
  state.orders.addresses.find((a) => a.is_default) ||
  state.orders.addresses[0] ||
  null;
export const selectVendorOrders = (state) =>
  state.orders.vendorOrders;
export const selectVendorOrdersHasMore = (state) =>
  state.orders.vendorOrdersHasMore;
export const selectActiveStatusFilter = (state) =>
  state.orders.activeStatusFilter;

export default orderSlice.reducer;