/**
 * VUMA Store — Products API
 * All product and category endpoints
 */

import { get, post, patch, del, upload } from './client';
import { API } from '../utils/constants';

export const productsAPI = {

  // ══════════════════════════════════════════════════
  // PRODUCTS
  // ══════════════════════════════════════════════════

  /**
   * Get products list with filters
   */
  getProducts: ({
    page = 1,
    category = '',
    q = '',
    ordering = '-created_at',
    min_price = '',
    max_price = '',
    featured = false,
    flash_sale = false,
  } = {}) => {
    const params = { page };
    if (category) params.category = category;
    if (q) params.q = q;
    if (ordering) params.ordering = ordering;
    if (min_price) params.min_price = min_price;
    if (max_price) params.max_price = max_price;
    if (featured) params.featured = 'true';
    if (flash_sale) params.flash_sale = 'true';
    return get(API.PRODUCTS, params);
  },

  /**
   * Get single product detail
   */
  getProductDetail: (productId) =>
    get(API.PRODUCT_DETAIL(productId)),

  /**
   * Create product (vendor only)
   */
  createProduct: (data) => {
    // Has images — use multipart
    if (data.images && data.images.length > 0) {
      const formData = new FormData();
      Object.keys(data).forEach((key) => {
        if (key === 'images') return;
        if (key === 'tags') {
          formData.append(key, JSON.stringify(data[key]));
        } else if (
          data[key] !== undefined &&
          data[key] !== null
        ) {
          formData.append(key, String(data[key]));
        }
      });
      return upload(API.PRODUCTS, formData);
    }
    return post(API.PRODUCTS, data);
  },

  /**
   * Update product (vendor only)
   */
  updateProduct: (productId, data) => {
    if (data.images && data.images.length > 0) {
      const formData = new FormData();
      Object.keys(data).forEach((key) => {
        if (key === 'images') return;
        if (key === 'tags') {
          formData.append(key, JSON.stringify(data[key]));
        } else if (
          data[key] !== undefined &&
          data[key] !== null
        ) {
          formData.append(key, String(data[key]));
        }
      });
      return upload(API.PRODUCT_DETAIL(productId), formData);
    }
    return patch(API.PRODUCT_DETAIL(productId), data);
  },

  /**
   * Delete product (vendor only)
   */
  deleteProduct: (productId) =>
    del(API.PRODUCT_DETAIL(productId)),

  /**
   * Upload product image
   */
  uploadProductImage: (
    productId,
    imageData,
    isPrimary = false,
    onProgress = null
  ) => {
    const formData = new FormData();
    formData.append('image', {
      uri: imageData.uri,
      name:
        imageData.fileName || imageData.name || 'product.jpg',
      type: imageData.type || 'image/jpeg',
    });
    formData.append('is_primary', isPrimary ? 'true' : 'false');
    return upload(
      API.PRODUCT_IMAGES(productId),
      formData,
      onProgress
    );
  },

  /**
   * Submit product review
   */
  submitReview: (productId, data) =>
    post(API.PRODUCT_REVIEWS(productId), {
      rating: data.rating,
      comment: data.comment || '',
    }),

  /**
   * Get vendor's own products
   */
  getMyProducts: () => get(API.PRODUCT_MY),

  // ══════════════════════════════════════════════════
  // CATEGORIES
  // ══════════════════════════════════════════════════

  /**
   * Get all categories
   */
  getCategories: () => get(API.CATEGORIES),

  /**
   * Get category by slug
   */
  getCategoryDetail: (slug) =>
    get(API.CATEGORY_DETAIL(slug)),

  // ══════════════════════════════════════════════════
  // SEARCH
  // ══════════════════════════════════════════════════

  /**
   * Search products
   */
  searchProducts: (query, page = 1) =>
    get(API.PRODUCTS, { q: query, page }),

  /**
   * Get featured products
   */
  getFeaturedProducts: () =>
    get(API.PRODUCTS, { featured: 'true', page: 1 }),

  /**
   * Get flash sale products
   */
  getFlashSaleProducts: () =>
    get(API.PRODUCTS, { flash_sale: 'true', page: 1 }),

  /**
   * Get products by category slug
   */
  getProductsByCategory: (slug, page = 1) =>
    get(API.PRODUCTS, { category: slug, page }),

  /**
   * Get related products
   */
  getRelatedProducts: (categorySlug, excludeId) =>
    get(API.PRODUCTS, {
      category: categorySlug,
      page: 1,
    }),
};