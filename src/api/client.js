/**
 * VUMA Store — API Client
 *
 * Updated: a request that dies without ANY reply from the server (the
 * "Network Error" case) now carries `detail`, the phone's own error text
 * (a missing file, a DNS or TLS problem, ...), so screens can show what
 * actually went wrong. And upload() retries once with the phone's own
 * fetch when the axios multipart upload fails that way, because fetch is
 * the standard, best-supported way to send files from React Native. The
 * fallback only runs after axios has already failed with no response, so
 * uploads that work today behave exactly as before.
 */

import { TIMEOUTS, API } from '../utils/constants';
import { storage } from '../utils/storage';

// What the phone's network layer said when a request failed without a
// reply from the server. React Native keeps the native error text on the
// request object; fall back to the plain error message.
const _networkDetail = (error) => {
  try {
    const raw = error && error.request && error.request._response;
    const text = (typeof raw === 'string' && raw) ? raw : ((error && error.message) || '');
    return String(text).slice(0, 200);
  } catch {
    return '';
  }
};

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
            detail: _networkDetail(error),
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

// ─── Upload fallback: the phone's own fetch ───────────
// Used only after the axios multipart upload failed without any reply.
// Rejects with the same { type, message, status, errors } shapes as the
// axios client, so callers cannot tell the two paths apart.
const _joinUrl = (base, path) => {
  if (/^https?:\/\//i.test(path)) return path;
  return `${String(base).replace(/\/+$/, '')}/${String(path).replace(/^\/+/, '')}`;
};

const _readBody = async (res) => {
  const text = await res.text().catch(() => '');
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
};

const _rejectionFor = (status, data) => {
  if (status === 400) return { type: 'VALIDATION_ERROR', message: _extractMessage(data) || 'Invalid request.', errors: data, status };
  if (status === 403) return { type: 'FORBIDDEN', message: 'Access denied.', errors: data, status };
  if (status === 404) return { type: 'NOT_FOUND', message: 'Not found.', errors: data, status };
  if (status === 429) return { type: 'RATE_LIMITED', message: 'Too many requests.', errors: data, status };
  if (status >= 500) return { type: 'SERVER_ERROR', message: 'Server error. Try again later.', status };
  return { type: 'API_ERROR', message: _extractMessage(data) || 'Something went wrong.', status };
};

const _uploadWithFetch = async (url, formData, onProgress) => {
  const fullUrl = _joinUrl(API.BASE_URL, url);

  const attempt = async (token) => {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), TIMEOUTS.upload || 120000) : null;
    try {
      const headers = { Accept: 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      // No Content-Type here: the phone sets the multipart header, with
      // its boundary, itself.
      return await fetch(fullUrl, {
        method: 'POST',
        headers,
        body: formData,
        signal: controller ? controller.signal : undefined,
      });
    } catch (err) {
      const aborted = !!err && err.name === 'AbortError';
      throw {
        type: aborted ? 'TIMEOUT' : 'NETWORK_ERROR',
        message: aborted ? 'Request timed out.' : 'No internet connection.',
        detail: String((err && err.message) || err || '').slice(0, 200),
      };
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  let res = await attempt(await storage.getAccessToken());

  if (res.status === 401) {
    let newAccess = null;
    try {
      const refreshToken = await storage.getRefreshToken();
      if (!refreshToken) throw new Error('No refresh token');
      const r = await fetch(`${API.BASE_URL}${API.TOKEN_REFRESH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
      });
      if (!r.ok) throw new Error('Refresh failed');
      newAccess = (await r.json()).access;
      if (!newAccess) throw new Error('No access token returned');
      await storage.setAccessToken(newAccess);
      setAuthToken(newAccess);
    } catch {
      await storage.clearAll();
      clearAuthToken();
      throw { type: 'SESSION_EXPIRED', message: 'Session expired. Please login again.' };
    }
    res = await attempt(newAccess);
  }

  const data = await _readBody(res);
  if (!res.ok) throw _rejectionFor(res.status, data);
  if (onProgress) onProgress(100);
  return data;
};

export const upload = async (url, formData, onProgress = null) => {
  const client = await getClient();
  try {
    const response = await client.post(url, formData, {
      // IMPORTANT: Content-Type must be explicitly cleared (undefined),
      // not set to 'multipart/form-data' and not simply omitted.
      // Manually setting that string omits the required `boundary`
      // parameter, which the server needs to split the request into its
      // separate fields - without it, Django's MultiPartParser cannot
      // extract the uploaded file at all, even though the request often
      // still looks like it "succeeds". Omitting the key entirely isn't
      // enough either, since axios would otherwise fall back to this
      // client's own default 'application/json' header. Setting it to
      // undefined here clears that default and lets the device generate
      // the correct multipart header (with boundary) itself from the
      // FormData body - the only way this actually works correctly.
      headers: { 'Content-Type': undefined },
      timeout: TIMEOUTS.upload,
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    });
    return response.data;
  } catch (e) {
    // axios could not complete the request at all (no reply from the
    // server): try once more with the phone's own fetch.
    if (e && e.type === 'NETWORK_ERROR') {
      try {
        return await _uploadWithFetch(url, formData, onProgress);
      } catch (e2) {
        // Keep the phone's native error text from the first attempt if
        // the second one has nothing more specific.
        if (e2 && e2.type === 'NETWORK_ERROR' && e.detail) e2.detail = e.detail;
        throw e2;
      }
    }
    throw e;
  }
};

export default getClient;