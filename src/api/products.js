/**
 * VUMA Store — Products API
 * Complete with banners, trending, deals, recently viewed, recommendations, coupons, related products
 */

import { get, post, patch, del, upload } from './client';
import { API } from '../utils/constants';

export const productsAPI = {

  getProducts: ({ page = 1, category = '', q = '', ordering = '-created_at', min_price = '', max_price = '', featured = false, flash_sale = false, free_delivery = false } = {}) => {
    const params = { page };
    if (category) params.category = category;
    if (q) params.q = q;
    if (ordering) params.ordering = ordering;
    if (min_price) params.min_price = min_price;
    if (max_price) params.max_price = max_price;
    if (featured) params.featured = 'true';
    if (flash_sale) params.flash_sale = 'true';
    if (free_delivery) params.free_delivery = 'true';
    return get(API.PRODUCTS, params);
  },

  getProductDetail: (productId) => get(API.PRODUCT_DETAIL(productId)),

  createProduct: (data) => post(API.PRODUCTS, data),

  updateProduct: (productId, data) => patch(API.PRODUCT_DETAIL(productId), data),

  deleteProduct: (productId) => del(API.PRODUCT_DETAIL(productId)),

  uploadProductImage: (productId, imageData, isPrimary = false, onProgress = null) => {
    const formData = new FormData();
    formData.append('image', {
      uri: imageData.uri,
      name: imageData.fileName || imageData.name || 'product.jpg',
      type: imageData.type || 'image/jpeg',
    });
    formData.append('is_primary', isPrimary ? 'true' : 'false');
    return upload(API.PRODUCT_IMAGES(productId), formData, onProgress);
  },

  deleteProductImage: (productId, imageId) => del(`/products/${productId}/images/${imageId}/`),

  uploadMultipleImages: async (productId, images) => {
    const results = [];
    for (let i = 0; i < images.length; i++) {
      try {
        const result = await productsAPI.uploadProductImage(productId, images[i], i === 0);
        results.push(result);
      } catch (e) {
        results.push(null);
      }
    }
    return results;
  },

  submitReview: (productId, data) => post(API.PRODUCT_REVIEWS(productId), { rating: data.rating, comment: data.comment || '' }),

  getMyProducts: () => get(API.PRODUCT_MY),

  // The server may send the category list in pages of 20. The seller's "Choose category"
  // list needs every category, so collect the other pages too (a failed page keeps what we have).
  getCategories: async () => {
    const first = await get(API.CATEGORIES);
    if (!first || Array.isArray(first) || !first.next || !Array.isArray(first.results)) return first;
    let results = first.results.slice();
    try {
      for (let page = 2; page <= 6; page += 1) {
        const more = await get(API.CATEGORIES, { page });
        if (!more || !Array.isArray(more.results)) break;
        results = results.concat(more.results);
        if (!more.next) break;
      }
    } catch (e) { /* keep the pages we already have */ }
    return Object.assign({}, first, { results, next: null });
  },

  getCategoryDetail: (slug) => get(API.CATEGORY_DETAIL(slug)),

  searchProducts: (query, page = 1) => get(API.PRODUCTS, { q: query, page }),

  getFeaturedProducts: () => get(API.PRODUCTS, { featured: 'true', page: 1 }),

  getFlashSaleProducts: () => get(API.PRODUCTS, { flash_sale: 'true', page: 1 }),

  getProductsByCategory: (slug, page = 1) => get(API.PRODUCTS, { category: slug, page }),

  // ── Banners ──────────────────────────────────────────
  getBanners: () => get('/products/banners/'),
  // Home screen: every position (top slider, offer cards, strips, feed) in one call
  getHomeBanners: () => get('/products/banners/', { v: 2 }),

  // ── Promotions ───────────────────────────────────────
  getTrending: () => get('/promotions/trending/'),

  getDailyDeals: () => get('/promotions/daily-deals/'),

  getRecentlyViewed: () => get('/promotions/recently-viewed/'),

  getRecommendations: () => get('/promotions/recommendations/'),

  // ── Related Products (Product Detail page) ────────────
  getRelatedProducts: (productId, limit = 12) => get(`/products/${productId}/related/`, { limit }),

  trackView: (productId) => post('/promotions/track-view/', { product_id: productId }),

  validateCoupon: (code, orderAmount) => post('/promotions/validate-coupon/', { code, order_amount: orderAmount }),

  // ── Vendor Activity ───────────────────────────────────
  getVendorActivity: () => get('/products/vendor-activity/'),

  // ── Product Variants ──────────────────────────────────
  getVariants: (productId) => get(`/products/${productId}/variants/`),
  bulkSaveVariants: (productId, variants) => post(`/products/${productId}/variants/bulk/`, { variants }),
  updateVariant: (productId, variantId, data) => patch(`/products/${productId}/variants/${variantId}/`, data),
  deleteVariant: (productId, variantId) => del(`/products/${productId}/variants/${variantId}/`),
};