import { AuthUser } from './types';

const AUTH_USER_KEY = 'bunsenworship_auth_user';

export const getPersistedUser = (): AuthUser | null => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(AUTH_USER_KEY);
    if (raw) {
      return JSON.parse(raw) as AuthUser;
    }
  } catch (error) {
    console.warn('Failed to read auth user from storage:', error);
  }
  return null;
};

export const persistUser = (user: AuthUser | null): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    if (user) {
      window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(AUTH_USER_KEY);
    }
  } catch (error) {
    console.warn('Failed to persist auth user to storage:', error);
  }
};

/**
 * Validates any RFC-compliant email address (gmail.com, outlook.com, yahoo.com, custom domains).
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Masks an email for privacy display in PIN verification (e.g. w***@gmail.com).
 */
export const maskEmail = (email: string): string => {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  return `${local[0]}${'*'.repeat(Math.min(local.length - 2, 4))}${local[local.length - 1]}@${domain}`;
};
