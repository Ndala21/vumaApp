/**
 * VUMA Store — Products API
 * Complete with banners, trending, deals, recently viewed, recommendations, coupons
 */

import { get, post, patch, del, upload } from './client';
import { API } from '../utils/constants';

export const productsAPI = {

  getProducts: ({ page = 1, category = '', q = '', ordering = '-created_at', min_price = '', max_price = '', featured = false, flash_sale = false } = {}) => {
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

  getCategories: () => get(API.CATEGORIES),

  getCategoryDetail: (slug) => get(API.CATEGORY_DETAIL(slug)),

  searchProducts: (query, page = 1) => get(API.PRODUCTS, { q: query, page }),

  getFeaturedProducts: () => get(API.PRODUCTS, { featured: 'true', page: 1 }),

  getFlashSaleProducts: () => get(API.PRODUCTS, { flash_sale: 'true', page: 1 }),

  getProductsByCategory: (slug, page = 1) => get(API.PRODUCTS, { category: slug, page }),

  // ── Banners ──────────────────────────────────────────
  getBanners: () => get('/products/banners/'),

  // ── Promotions ───────────────────────────────────────
  getTrending: () => get('/promotions/trending/'),

  getDailyDeals: () => get('/promotions/daily-deals/'),

  getRecentlyViewed: () => get('/promotions/recently-viewed/'),

  getRecommendations: () => get('/promotions/recommendations/'),

  trackView: (productId) => post('/promotions/track-view/', { product_id: productId }),

  validateCoupon: (code, orderAmount) => post('/promotions/validate-coupon/', { code, order_amount: orderAmount }),

  // ── Vendor Activity ───────────────────────────────────
  getVendorActivity: () => get('/products/vendor-activity/'),
};
