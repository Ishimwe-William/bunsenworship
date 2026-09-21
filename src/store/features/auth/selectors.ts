import { AuthScreenType, AuthState, AuthUser } from './types';

export interface HasAuthState {
  auth: AuthState;
}

export const selectAuthState = (state: HasAuthState): AuthState => state.auth;

export const selectIsAuthenticated = (state: HasAuthState): boolean =>
  state.auth.isAuthenticated;

export const selectAuthUser = (state: HasAuthState): AuthUser | null =>
  state.auth.user;

export const selectAuthScreen = (state: HasAuthState): AuthScreenType =>
  state.auth.currentScreen;

export const selectPendingEmail = (state: HasAuthState): string | null =>
  state.auth.pendingEmail;

export const selectPinPurpose = (
  state: HasAuthState,
): 'registration' | 'password-reset' | 'two-factor' => state.auth.pinPurpose;

export const selectAuthLoading = (state: HasAuthState): boolean =>
  state.auth.isLoading;

export const selectAuthError = (state: HasAuthState): string | null =>
  state.auth.error;
