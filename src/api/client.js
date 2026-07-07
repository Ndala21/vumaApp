/**
 * VUMA Store — API Client
 */

import { TIMEOUTS, API } from '../utils/constants';
import { storage } from '../utils/storage';

// ─── Create base client ───────────────────────────────
let axiosInstance = null;

const getClient = async () => {
  if (!axiosInstance) {
    const axios = (await import('axios')).default;
    axiosInstance = axios.create({
      baseURL: API.BASE_URL,
      timeout: TIMEOUTS.api,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    // Request interceptor
    axiosInstance.interceptors.request.use(
      async (config) => {
        try {
          const token = await storage.getAccessToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
          const language = await storage.getLanguage();
          if (language) {
            config.headers['Accept-Language'] = language;
          }
        } catch {}
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (!error.response) {
          return Promise.reject({
            type: error.code === 'ECONNABORTED'
              ? 'TIMEOUT'
              : 'NETWORK_ERROR',
            message: error.code === 'ECONNABORTED'
              ? 'Request timed out.'
              : 'No internet connection.',
            original: error,
          });
        }

        const { status } = error.response;

        if (status === 401 && !error.config._retry) {
          error.config._retry = true;
          try {
            const refreshToken = await storage.getRefreshToken();
            if (!refreshToken) throw new Error('No refresh token');
            const axios = (await import('axios')).default;
            const response = await axios.post(
              `${API.BASE_URL}${API.TOKEN_REFRESH}`,
              { refresh: refreshToken },
              { timeout: TIMEOUTS.refresh }
            );
            const { access } = response.data;
            await storage.setAccessToken(access);
            axiosInstance.defaults.headers.common.Authorization =
              `Bearer ${access}`;
            error.config.headers.Authorization =
              `Bearer ${access}`;
            return axiosInstance(error.config);
          } catch {
            await storage.clearAll();
            clearAuthToken();
            return Promise.reject({
              type: 'SESSION_EXPIRED',
              message: 'Session expired. Please login again.',
            });
          }
        }

        const messages = {
          400: { type: 'VALIDATION_ERROR', message: _extractMessage(error.response.data) || 'Invalid request.' },
          403: { type: 'FORBIDDEN', message: 'Access denied.' },
          404: { type: 'NOT_FOUND', message: 'Not found.' },
          429: { type: 'RATE_LIMITED', message: 'Too many requests.' },
        };

        if (messages[status]) {
          return Promise.reject({
            ...messages[status],
            errors: error.response.data,
            status,
            original: error,
          });
        }

        if (status >= 500) {
          return Promise.reject({
            type: 'SERVER_ERROR',
            message: 'Server error. Try again later.',
            status,
          });
        }

        return Promise.reject({
          type: 'API_ERROR',
          message: _extractMessage(error.response?.data) || 'Something went wrong.',
          status,
        });
      }
    );
  }
  return axiosInstance;
};

const _extractMessage = (data) => {
  if (!data) return null;
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  if (data.message) return data.message;
  if (data.error) return data.error;
  if (data.non_field_errors?.[0]) return data.non_field_errors[0];
  const firstKey = Object.keys(data)[0];
  if (firstKey) {
    const val = data[firstKey];
    return Array.isArray(val) ? val[0] : String(val);
  }
  return null;
};

export const setAuthToken = (token) => {
  if (axiosInstance) {
    if (token) {
      axiosInstance.defaults.headers.common.Authorization =
        `Bearer ${token}`;
    } else {
      delete axiosInstance.defaults.headers.common.Authorization;
    }
  }
};

export const clearAuthToken = () => {
  if (axiosInstance) {
    delete axiosInstance.defaults.headers.common.Authorization;
  }
};

export const get = async (url, params = {}, config = {}) => {
  const client = await getClient();
  const response = await client.get(url, { params, ...config });
  return response.data;
};

export const post = async (url, data = {}, config = {}) => {
  const client = await getClient();
  const response = await client.post(url, data, config);
  return response.data;
};

export const patch = async (url, data = {}, config = {}) => {
  const client = await getClient();
  const response = await client.patch(url, data, config);
  return response.data;
};

export const put = async (url, data = {}, config = {}) => {
  const client = await getClient();
  const response = await client.put(url, data, config);
  return response.data;
};

export const del = async (url, config = {}) => {
  const client = await getClient();
  const response = await client.delete(url, config);
  return response.data;
};

export const upload = async (url, formData, onProgress = null) => {
  const client = await getClient();
  const response = await client.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: TIMEOUTS.upload,
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  });
  return response.data;
};

export default getClient;
