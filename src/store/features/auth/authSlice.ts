import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthScreenType, AuthState, AuthUser } from './types';
import { getPersistedUser, persistUser } from './authService';

const persistedUser = getPersistedUser();

const initialState: AuthState = {
  isAuthenticated: Boolean(persistedUser),
  user: persistedUser,
  currentScreen: 'login',
  pendingEmail: null,
  pinPurpose: 'registration',
  isLoading: false,
  error: null,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthScreen: (state, action: PayloadAction<AuthScreenType>) => {
      state.currentScreen = action.payload;
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
    requestPinVerification: (
      state,
      action: PayloadAction<{
        email: string;
        purpose?: 'registration' | 'password-reset' | 'two-factor';
      }>,
    ) => {
      state.pendingEmail = action.payload.email;
      state.pinPurpose = action.payload.purpose || 'registration';
      state.currentScreen = 'pin-verification';
      state.isLoading = false;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;
      persistUser(action.payload);
    },
    pinVerifiedForReset: (state) => {
      state.currentScreen = 'reset-password';
      state.isLoading = false;
      state.error = null;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.currentScreen = 'login';
      state.pendingEmail = null;
      state.error = null;
      persistUser(null);
    },
  },
});

export const {
  setAuthScreen,
  setLoading,
  setError,
  clearError,
  requestPinVerification,
  pinVerifiedForReset,
  loginSuccess,
  logout,
} = authSlice.actions;

export const authReducer = authSlice.reducer;
export default authReducer;
