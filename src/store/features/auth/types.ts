export type AuthScreenType =
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'pin-verification'
  | 'reset-password';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  churchName?: string;
  role: string;
  avatarUrl?: string;
  authProvider: 'email' | 'google';
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  currentScreen: AuthScreenType;
  /** Stores the email awaiting PIN verification */
  pendingEmail: string | null;
  /** Reason for PIN: 'registration' | 'password-reset' | 'two-factor' */
  pinPurpose: 'registration' | 'password-reset' | 'two-factor';
  isLoading: boolean;
  error: string | null;
}

export interface LoginPayload {
  email: string;
  password?: string;
  rememberMe?: boolean;
}

export interface RegisterPayload {
  name: string;
  email: string;
  churchName?: string;
  password?: string;
}

export interface PinVerifyPayload {
  email: string;
  pin: string;
}
