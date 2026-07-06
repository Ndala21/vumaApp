/**
 * VUMA Store — Auth Slice
 * Handles authentication, JWT, biometrics, roles
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { storage } from '../utils/storage';
import { getErrorMessage, getFieldErrors } from '../utils/helpers';
import { setAuthToken, clearAuthToken } from '../api/client';
import { USER_ROLES } from '../utils/constants';

export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { rejectWithValue }) => {
    try {
      const [accessToken, refreshToken, user, rememberMe] = await Promise.all([
        storage.getAccessToken(),
        storage.getRefreshToken(),
        storage.getUser(),
        storage.getRememberMe(),
      ]);

      if (!accessToken || !user) return { isAuthenticated: false };

      setAuthToken(accessToken);

      try {
        const { authAPI } = await import('../api/auth');
        const freshUser = await authAPI.me();
        await storage.setUser(freshUser);
        return { isAuthenticated: true, user: freshUser, accessToken, refreshToken, rememberMe };
      } catch {
        if (refreshToken) {
          try {
            const { authAPI } = await import('../api/auth');
            const refreshData = await authAPI.refreshToken(refreshToken);
            await storage.setAccessToken(refreshData.access);
            if (refreshData.refresh) await storage.setRefreshToken(refreshData.refresh);
            setAuthToken(refreshData.access);
            const freshUser = await authAPI.me();
            await storage.setUser(freshUser);
            return {
              isAuthenticated: true, user: freshUser,
              accessToken: refreshData.access,
              refreshToken: refreshData.refresh || refreshToken,
              rememberMe,
            };
          } catch {
            await storage.clearAll();
            clearAuthToken();
            return { isAuthenticated: false };
          }
        }
        return { isAuthenticated: true, user, accessToken, refreshToken, rememberMe };
      }
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (credentials, { rejectWithValue }) => {
    try {
      const { authAPI } = await import('../api/auth');
      const data = await authAPI.register(credentials);
      await storage.saveAuthData({ accessToken: data.access, refreshToken: data.refresh, user: data.user, rememberMe: true });
      setAuthToken(data.access);
      return data;
    } catch (error) {
      return rejectWithValue(getFieldErrors(error) || getErrorMessage(error));
    }
  }
);

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password, rememberMe = true, fcmToken = '' }, { rejectWithValue }) => {
    try {
      const { authAPI } = await import('../api/auth');

      const loginPromise = authAPI.login({
        email: email.toLowerCase().trim(),
        password,
        fcm_token: fcmToken,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Login timed out. Check your internet connection.')), 15000)
      );

      const data = await Promise.race([loginPromise, timeoutPromise]);

      if (!data || !data.access) {
        return rejectWithValue('Login failed. Please try again.');
      }

      await storage.saveAuthData({
        accessToken: data.access,
        refreshToken: data.refresh,
        user: data.user,
        rememberMe,
      });

      setAuthToken(data.access);

      if (rememberMe) {
        await storage.setBiometricCredentials({ email, password }).catch(() => {});
      }

      return { ...data, rememberMe };
    } catch (error) {
      const msg =
        error?.message ||
        error?.payload ||
        (typeof error === 'string' ? error : null) ||
        'Login failed. Please check your credentials and try again.';
      return rejectWithValue(msg);
    }
  }
);

export const biometricLogin = createAsyncThunk(
  'auth/biometricLogin',
  async (_, { rejectWithValue }) => {
    try {
      const LocalAuthentication = await import('expo-local-authentication');
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) return rejectWithValue('Biometric authentication not available.');

      const credentials = await storage.getBiometricCredentials();
      if (!credentials) return rejectWithValue('No saved credentials. Please login with password first.');

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Login to VUMA',
        fallbackLabel: 'Use Password',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (!result.success) return rejectWithValue('Biometric authentication failed.');

      const { authAPI } = await import('../api/auth');
      const data = await authAPI.login({ email: credentials.email, password: credentials.password });

      await storage.saveAuthData({ accessToken: data.access, refreshToken: data.refresh, user: data.user, rememberMe: true });
      setAuthToken(data.access);
      return { ...data, rememberMe: true };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { getState }) => {
    try {
      const { refreshToken } = getState().auth;
      if (refreshToken) {
        const { authAPI } = await import('../api/auth');
        await authAPI.logout(refreshToken).catch(() => {});
      }
    } finally {
      await storage.clearAll();
      clearAuthToken();
    }
    return true;
  }
);

export const getProfile = createAsyncThunk(
  'auth/getProfile',
  async (_, { rejectWithValue }) => {
    try {
      const { authAPI } = await import('../api/auth');
      const user = await authAPI.getProfile();
      await storage.setUser(user);
      return user;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (data, { rejectWithValue }) => {
    try {
      const { authAPI } = await import('../api/auth');
      const result = await authAPI.updateProfile(data);
      const updatedUser = result.user || result;
      await storage.setUser(updatedUser);
      return updatedUser;
    } catch (error) {
      return rejectWithValue(getFieldErrors(error) || getErrorMessage(error));
    }
  }
);

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async (passwords, { rejectWithValue }) => {
    try {
      const { authAPI } = await import('../api/auth');
      await authAPI.changePassword(passwords);
      return true;
    } catch (error) {
      return rejectWithValue(getFieldErrors(error) || getErrorMessage(error));
    }
  }
);

export const checkBiometrics = createAsyncThunk(
  'auth/checkBiometrics',
  async () => {
    try {
      const LocalAuthentication = await import('expo-local-authentication');
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const hasFaceID = supportedTypes.includes(2);
      const hasFingerprint = supportedTypes.includes(1);
      const hasCredentials = !!(await storage.getBiometricCredentials());
      return {
        available: hasHardware && isEnrolled,
        hasFaceID, hasFingerprint, hasCredentials,
        canUseBiometric: hasHardware && isEnrolled && hasCredentials,
      };
    } catch {
      return { available: false, hasFaceID: false, hasFingerprint: false, hasCredentials: false, canUseBiometric: false };
    }
  }
);

const initialState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isInitialized: false,
  rememberMe: true,
  biometrics: {
    available: false, hasFaceID: false, hasFingerprint: false,
    hasCredentials: false, canUseBiometric: false,
  },
  loading: {
    initialize: false, login: false, register: false, logout: false,
    profile: false, updateProfile: false, changePassword: false, biometric: false,
  },
  errors: {
    login: null, register: null, profile: null, updateProfile: null,
    changePassword: null, biometric: null, general: null,
  },
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state, action) => {
      const field = action.payload;
      if (field && state.errors[field] !== undefined) {
        state.errors[field] = null;
      } else {
        Object.keys(state.errors).forEach((k) => { state.errors[k] = null; });
      }
    },
    forceLogout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      Object.keys(state.errors).forEach((k) => { state.errors[k] = null; });
    },
    updateUserState: (state, action) => {
      if (state.user) state.user = { ...state.user, ...action.payload };
    },
    updateTokens: (state, action) => {
      const { accessToken, refreshToken } = action.payload;
      if (accessToken) state.accessToken = accessToken;
      if (refreshToken) state.refreshToken = refreshToken;
    },
  },
  extraReducers: (builder) => {
    // Initialize
    builder
      .addCase(initializeAuth.pending, (state) => { state.loading.initialize = true; })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.loading.initialize = false;
        state.isInitialized = true;
        const { isAuthenticated, user, accessToken, refreshToken, rememberMe } = action.payload;
        state.isAuthenticated = isAuthenticated || false;
        state.user = user || null;
        state.accessToken = accessToken || null;
        state.refreshToken = refreshToken || null;
        state.rememberMe = rememberMe ?? true;
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.loading.initialize = false;
        state.isInitialized = true;
        state.isAuthenticated = false;
      });

    // Register
    builder
      .addCase(register.pending, (state) => { state.loading.register = true; state.errors.register = null; })
      .addCase(register.fulfilled, (state, action) => {
        state.loading.register = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.accessToken = action.payload.access;
        state.refreshToken = action.payload.refresh;
        state.errors.register = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading.register = false;
        state.errors.register = action.payload;
      });

    // Login
    builder
      .addCase(login.pending, (state) => { state.loading.login = true; state.errors.login = null; })
      .addCase(login.fulfilled, (state, action) => {
        state.loading.login = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.accessToken = action.payload.access;
        state.refreshToken = action.payload.refresh;
        state.rememberMe = action.payload.rememberMe;
        state.errors.login = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading.login = false;
        state.errors.login = action.payload;
        state.isAuthenticated = false;
      });

    // Biometric Login
    builder
      .addCase(biometricLogin.pending, (state) => { state.loading.biometric = true; state.errors.biometric = null; })
      .addCase(biometricLogin.fulfilled, (state, action) => {
        state.loading.biometric = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.accessToken = action.payload.access;
        state.refreshToken = action.payload.refresh;
        state.errors.biometric = null;
      })
      .addCase(biometricLogin.rejected, (state, action) => {
        state.loading.biometric = false;
        state.errors.biometric = action.payload;
      });

    // Logout
    builder
      .addCase(logout.pending, (state) => { state.loading.logout = true; })
      .addCase(logout.fulfilled, () => ({ ...initialState, isInitialized: true }))
      .addCase(logout.rejected, () => ({ ...initialState, isInitialized: true }));

    // Get Profile
    builder
      .addCase(getProfile.pending, (state) => { state.loading.profile = true; state.errors.profile = null; })
      .addCase(getProfile.fulfilled, (state, action) => { state.loading.profile = false; state.user = action.payload; })
      .addCase(getProfile.rejected, (state, action) => { state.loading.profile = false; state.errors.profile = action.payload; });

    // Update Profile
    builder
      .addCase(updateProfile.pending, (state) => { state.loading.updateProfile = true; state.errors.updateProfile = null; })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading.updateProfile = false;
        state.user = { ...state.user, ...action.payload };
        state.errors.updateProfile = null;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading.updateProfile = false;
        state.errors.updateProfile = action.payload;
      });

    // Change Password
    builder
      .addCase(changePassword.pending, (state) => { state.loading.changePassword = true; state.errors.changePassword = null; })
      .addCase(changePassword.fulfilled, (state) => { state.loading.changePassword = false; state.errors.changePassword = null; })
      .addCase(changePassword.rejected, (state, action) => {
        state.loading.changePassword = false;
        state.errors.changePassword = action.payload;
      });

    // Check Biometrics
    builder.addCase(checkBiometrics.fulfilled, (state, action) => { state.biometrics = action.payload; });
  },
});

export const { clearError, forceLogout, updateUserState, updateTokens } = authSlice.actions;

export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectIsInitialized = (state) => state.auth.isInitialized;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthErrors = (state) => state.auth.errors;
export const selectBiometrics = (state) => state.auth.biometrics;
export const selectUserRole = (state) => state.auth.user?.role;
export const selectIsVendor = (state) => state.auth.user?.role === USER_ROLES.VENDOR;
export const selectIsAdmin = (state) => state.auth.user?.role === USER_ROLES.ADMIN;
export const selectIsCustomer = (state) => state.auth.user?.role === USER_ROLES.CUSTOMER;
export const selectRememberMe = (state) => state.auth.rememberMe;
export const selectAccessToken = (state) => state.auth.accessToken;
export const selectVendorStatus = (state) => state.auth.user?.vendor_status;
export const selectIsApprovedVendor = (state) =>
  state.auth.user?.role === USER_ROLES.VENDOR && state.auth.user?.vendor_status === 'approved';

export default authSlice.reducer;
