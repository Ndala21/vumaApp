/**
 * Replace only the `login` thunk in authSlice.js
 * Find: export const login = createAsyncThunk(
 * Replace the entire login thunk with this:
 */

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password, rememberMe = true, fcmToken = '' }, { rejectWithValue }) => {
    try {
      const { authAPI } = await import('../api/auth');

      // Add 15 second timeout
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