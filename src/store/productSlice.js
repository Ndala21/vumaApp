/**
 * VUMA Store — Product Slice
 * Products, categories, search, wishlist state
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getErrorMessage } from '../utils/helpers';
import { PAGINATION } from '../utils/constants';

// ══════════════════════════════════════════════════════
// ASYNC THUNKS
// ══════════════════════════════════════════════════════

/**
 * Fetch products with filters and pagination
 */
export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (
    {
      page = 1,
      category = '',
      q = '',
      ordering = '-created_at',
      min_price = '',
      max_price = '',
      featured = false,
      flash_sale = false,
      refresh = false,
    } = {},
    { rejectWithValue }
  ) => {
    try {
      const { productsAPI } = await import('../api/products');
      const data = await productsAPI.getProducts({
        page,
        category,
        q,
        ordering,
        min_price,
        max_price,
        featured,
        flash_sale,
      });
      return { data, page, refresh };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

/**
 * Fetch single product detail
 */
export const fetchProductDetail = createAsyncThunk(
  'products/fetchProductDetail',
  async (productId, { rejectWithValue }) => {
    try {
      const { productsAPI } = await import('../api/products');
      const data = await productsAPI.getProductDetail(productId);
      return data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

/**
 * Fetch all categories
 */
export const fetchCategories = createAsyncThunk(
  'products/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const { productsAPI } = await import('../api/products');
      const data = await productsAPI.getCategories();
      return data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

/**
 * Fetch featured products
 */
export const fetchFeaturedProducts = createAsyncThunk(
  'products/fetchFeatured',
  async (_, { rejectWithValue }) => {
    try {
      const { productsAPI } = await import('../api/products');
      const data = await productsAPI.getProducts({
        featured: true,
        page: 1,
      });
      return data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

/**
 * Fetch flash sale products
 */
export const fetchFlashSaleProducts = createAsyncThunk(
  'products/fetchFlashSale',
  async (_, { rejectWithValue }) => {
    try {
      const { productsAPI } = await import('../api/products');
      const data = await productsAPI.getProducts({
        flash_sale: true,
        page: 1,
      });
      return data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

/**
 * Search products
 */
export const searchProducts = createAsyncThunk(
  'products/search',
  async ({ q, page = 1 }, { rejectWithValue }) => {
    try {
      const { productsAPI } = await import('../api/products');
      const data = await productsAPI.getProducts({ q, page });
      return { data, page, query: q };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

/**
 * Submit product review
 */
export const submitReview = createAsyncThunk(
  'products/submitReview',
  async ({ productId, rating, comment }, { rejectWithValue }) => {
    try {
      const { productsAPI } = await import('../api/products');
      const data = await productsAPI.submitReview(productId, {
        rating,
        comment,
      });
      return { productId, review: data };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

/**
 * Fetch vendor products
 */
export const fetchMyProducts = createAsyncThunk(
  'products/fetchMyProducts',
  async (_, { rejectWithValue }) => {
    try {
      const { productsAPI } = await import('../api/products');
      const data = await productsAPI.getMyProducts();
      return data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

/**
 * Create product (vendor)
 */
export const createProduct = createAsyncThunk(
  'products/createProduct',
  async (productData, { rejectWithValue }) => {
    try {
      const { productsAPI } = await import('../api/products');
      const data = await productsAPI.createProduct(productData);
      return data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

/**
 * Update product (vendor)
 */
export const updateProduct = createAsyncThunk(
  'products/updateProduct',
  async ({ productId, data }, { rejectWithValue }) => {
    try {
      const { productsAPI } = await import('../api/products');
      const result = await productsAPI.updateProduct(
        productId,
        data
      );
      return result;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

/**
 * Delete product (vendor)
 */
export const deleteProduct = createAsyncThunk(
  'products/deleteProduct',
  async (productId, { rejectWithValue }) => {
    try {
      const { productsAPI } = await import('../api/products');
      await productsAPI.deleteProduct(productId);
      return productId;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// ══════════════════════════════════════════════════════
// INITIAL STATE
// ══════════════════════════════════════════════════════

const initialState = {
  // Product list
  items: [],
  currentPage: 1,
  totalPages: 1,
  totalCount: 0,
  hasNextPage: false,

  // Selected product detail
  selectedProduct: null,

  // Categories
  categories: [],

  // Featured
  featuredProducts: [],

  // Flash sale
  flashSaleProducts: [],

  // Search
  searchResults: [],
  searchQuery: '',
  searchPage: 1,
  searchHasMore: false,

  // Vendor products
  myProducts: [],

  // Active filters
  filters: {
    category: '',
    minPrice: '',
    maxPrice: '',
    ordering: '-created_at',
    q: '',
  },

  // Loading states
  loading: {
    products: false,
    detail: false,
    categories: false,
    featured: false,
    flashSale: false,
    search: false,
    review: false,
    myProducts: false,
    createProduct: false,
    updateProduct: false,
    deleteProduct: false,
    loadingMore: false,
  },

  // Errors
  errors: {
    products: null,
    detail: null,
    categories: null,
    search: null,
    review: null,
    myProducts: null,
    createProduct: null,
    updateProduct: null,
    deleteProduct: null,
  },
};

// ══════════════════════════════════════════════════════
// SLICE
// ══════════════════════════════════════════════════════

const productSlice = createSlice({
  name: 'products',
  initialState,

  reducers: {
    // Set active filters
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },

    // Reset filters to default
    resetFilters: (state) => {
      state.filters = {
        category: '',
        minPrice: '',
        maxPrice: '',
        ordering: '-created_at',
        q: '',
      };
    },

    // Clear selected product
    clearSelectedProduct: (state) => {
      state.selectedProduct = null;
    },

    // Clear search
    clearSearch: (state) => {
      state.searchResults = [];
      state.searchQuery = '';
      state.searchPage = 1;
      state.searchHasMore = false;
    },

    // Clear errors
    clearProductError: (state, action) => {
      const field = action.payload;
      if (field && state.errors[field] !== undefined) {
        state.errors[field] = null;
      } else {
        Object.keys(state.errors).forEach((k) => {
          state.errors[k] = null;
        });
      }
    },

    // Reset product list (for pull-to-refresh)
    resetProducts: (state) => {
      state.items = [];
      state.currentPage = 1;
      state.totalPages = 1;
      state.hasNextPage = false;
    },

    // Update single product in list
    updateProductInList: (state, action) => {
      const updated = action.payload;
      const index = state.items.findIndex(
        (p) => p.id === updated.id
      );
      if (index >= 0) {
        state.items[index] = updated;
      }
      if (state.selectedProduct?.id === updated.id) {
        state.selectedProduct = updated;
      }
    },

    // Remove product from list
    removeProductFromList: (state, action) => {
      const productId = action.payload;
      state.items = state.items.filter(
        (p) => p.id !== productId
      );
      state.myProducts = state.myProducts.filter(
        (p) => p.id !== productId
      );
    },
  },

  extraReducers: (builder) => {
    // ── Fetch Products ────────────────────────────────
    builder
      .addCase(fetchProducts.pending, (state, action) => {
        const isLoadMore = action.meta.arg?.page > 1;
        if (isLoadMore) {
          state.loading.loadingMore = true;
        } else {
          state.loading.products = true;
        }
        state.errors.products = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading.products = false;
        state.loading.loadingMore = false;
        const { data, page, refresh } = action.payload;
        const results = data.results || data;
        if (page === 1 || refresh) {
          state.items = results;
        } else {
          // Append for infinite scroll
          const existingIds = new Set(
            state.items.map((p) => p.id)
          );
          const newItems = results.filter(
            (p) => !existingIds.has(p.id)
          );
          state.items = [...state.items, ...newItems];
        }
        state.currentPage = page;
        state.totalCount = data.count || results.length;
        state.totalPages = Math.ceil(
          (data.count || results.length) / PAGINATION.pageSize
        );
        state.hasNextPage = !!data.next;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading.products = false;
        state.loading.loadingMore = false;
        state.errors.products = action.payload;
      });

    // ── Fetch Product Detail ──────────────────────────
    builder
      .addCase(fetchProductDetail.pending, (state) => {
        state.loading.detail = true;
        state.errors.detail = null;
        state.selectedProduct = null;
      })
      .addCase(fetchProductDetail.fulfilled, (state, action) => {
        state.loading.detail = false;
        state.selectedProduct = action.payload;
      })
      .addCase(fetchProductDetail.rejected, (state, action) => {
        state.loading.detail = false;
        state.errors.detail = action.payload;
      });

    // ── Fetch Categories ──────────────────────────────
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.loading.categories = true;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading.categories = false;
        const results =
          action.payload.results || action.payload;
        state.categories = Array.isArray(results) ? results : [];
      })
      .addCase(fetchCategories.rejected, (state) => {
        state.loading.categories = false;
      });

    // ── Fetch Featured ────────────────────────────────
    builder
      .addCase(fetchFeaturedProducts.pending, (state) => {
        state.loading.featured = true;
      })
      .addCase(
        fetchFeaturedProducts.fulfilled,
        (state, action) => {
          state.loading.featured = false;
          const results =
            action.payload.results || action.payload;
          state.featuredProducts = Array.isArray(results)
            ? results
            : [];
        }
      )
      .addCase(fetchFeaturedProducts.rejected, (state) => {
        state.loading.featured = false;
      });

    // ── Fetch Flash Sale ──────────────────────────────
    builder
      .addCase(fetchFlashSaleProducts.pending, (state) => {
        state.loading.flashSale = true;
      })
      .addCase(
        fetchFlashSaleProducts.fulfilled,
        (state, action) => {
          state.loading.flashSale = false;
          const results =
            action.payload.results || action.payload;
          state.flashSaleProducts = Array.isArray(results)
            ? results
            : [];
        }
      )
      .addCase(fetchFlashSaleProducts.rejected, (state) => {
        state.loading.flashSale = false;
      });

    // ── Search Products ───────────────────────────────
    builder
      .addCase(searchProducts.pending, (state, action) => {
        const isLoadMore = action.meta.arg?.page > 1;
        if (!isLoadMore) {
          state.loading.search = true;
          state.searchResults = [];
        }
        state.errors.search = null;
      })
      .addCase(searchProducts.fulfilled, (state, action) => {
        state.loading.search = false;
        const { data, page, query } = action.payload;
        const results = data.results || data;
        state.searchQuery = query;
        state.searchPage = page;
        state.searchHasMore = !!data.next;
        if (page === 1) {
          state.searchResults = results;
        } else {
          const existingIds = new Set(
            state.searchResults.map((p) => p.id)
          );
          const newItems = results.filter(
            (p) => !existingIds.has(p.id)
          );
          state.searchResults = [
            ...state.searchResults,
            ...newItems,
          ];
        }
      })
      .addCase(searchProducts.rejected, (state, action) => {
        state.loading.search = false;
        state.errors.search = action.payload;
      });

    // ── Submit Review ─────────────────────────────────
    builder
      .addCase(submitReview.pending, (state) => {
        state.loading.review = true;
        state.errors.review = null;
      })
      .addCase(submitReview.fulfilled, (state, action) => {
        state.loading.review = false;
        const { review } = action.payload;
        if (
          state.selectedProduct &&
          state.selectedProduct.reviews
        ) {
          state.selectedProduct.reviews.unshift(review);
        }
      })
      .addCase(submitReview.rejected, (state, action) => {
        state.loading.review = false;
        state.errors.review = action.payload;
      });

    // ── Fetch My Products ─────────────────────────────
    builder
      .addCase(fetchMyProducts.pending, (state) => {
        state.loading.myProducts = true;
        state.errors.myProducts = null;
      })
      .addCase(fetchMyProducts.fulfilled, (state, action) => {
        state.loading.myProducts = false;
        const results =
          action.payload.results || action.payload;
        state.myProducts = Array.isArray(results) ? results : [];
      })
      .addCase(fetchMyProducts.rejected, (state, action) => {
        state.loading.myProducts = false;
        state.errors.myProducts = action.payload;
      });

    // ── Create Product ────────────────────────────────
    builder
      .addCase(createProduct.pending, (state) => {
        state.loading.createProduct = true;
        state.errors.createProduct = null;
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.loading.createProduct = false;
        state.myProducts.unshift(action.payload);
      })
      .addCase(createProduct.rejected, (state, action) => {
        state.loading.createProduct = false;
        state.errors.createProduct = action.payload;
      });

    // ── Update Product ────────────────────────────────
    builder
      .addCase(updateProduct.pending, (state) => {
        state.loading.updateProduct = true;
        state.errors.updateProduct = null;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.loading.updateProduct = false;
        const updated = action.payload;
        const index = state.myProducts.findIndex(
          (p) => p.id === updated.id
        );
        if (index >= 0) {
          state.myProducts[index] = updated;
        }
        if (state.selectedProduct?.id === updated.id) {
          state.selectedProduct = updated;
        }
      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.loading.updateProduct = false;
        state.errors.updateProduct = action.payload;
      });

    // ── Delete Product ────────────────────────────────
    builder
      .addCase(deleteProduct.pending, (state) => {
        state.loading.deleteProduct = true;
        state.errors.deleteProduct = null;
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.loading.deleteProduct = false;
        const productId = action.payload;
        state.myProducts = state.myProducts.filter(
          (p) => p.id !== productId
        );
        state.items = state.items.filter(
          (p) => p.id !== productId
        );
      })
      .addCase(deleteProduct.rejected, (state, action) => {
        state.loading.deleteProduct = false;
        state.errors.deleteProduct = action.payload;
      });
  },
});

// ══════════════════════════════════════════════════════
// ACTIONS
// ══════════════════════════════════════════════════════

export const {
  setFilters,
  resetFilters,
  clearSelectedProduct,
  clearSearch,
  clearProductError,
  resetProducts,
  updateProductInList,
  removeProductFromList,
} = productSlice.actions;

// ══════════════════════════════════════════════════════
// SELECTORS
// ══════════════════════════════════════════════════════

export const selectProducts = (state) => state.products.items;
export const selectSelectedProduct = (state) =>
  state.products.selectedProduct;
export const selectCategories = (state) =>
  state.products.categories;
export const selectFeaturedProducts = (state) =>
  state.products.featuredProducts;
export const selectFlashSaleProducts = (state) =>
  state.products.flashSaleProducts;
export const selectSearchResults = (state) =>
  state.products.searchResults;
export const selectSearchQuery = (state) =>
  state.products.searchQuery;
export const selectSearchHasMore = (state) =>
  state.products.searchHasMore;
export const selectProductsLoading = (state) =>
  state.products.loading;
export const selectProductsErrors = (state) =>
  state.products.errors;
export const selectHasNextPage = (state) =>
  state.products.hasNextPage;
export const selectCurrentPage = (state) =>
  state.products.currentPage;
export const selectTotalCount = (state) =>
  state.products.totalCount;
export const selectFilters = (state) => state.products.filters;
export const selectMyProducts = (state) =>
  state.products.myProducts;

export default productSlice.reducer;