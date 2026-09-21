import { EffectiveTheme, ThemeMode } from './types';

const THEME_STORAGE_KEY = 'bunsenworship_theme_mode';

/**
 * Detects the current operating system color scheme preference.
 */
export const getSystemThemePreference = (): EffectiveTheme => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'dark'; // Worship apps generally default to dark if undetected
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/**
 * Reads persisted theme mode from localStorage, defaulting to 'system'.
 */
export const getPersistedThemeMode = (): ThemeMode => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 'system';
  }
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
  } catch (error) {
    console.warn('Failed to read theme mode from localStorage:', error);
  }
  return 'system';
};

/**
 * Persists selected theme mode into localStorage.
 */
export const persistThemeMode = (mode: ThemeMode): void => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch (error) {
    console.warn('Failed to persist theme mode to localStorage:', error);
  }
};

/**
 * Resolves effective theme (light/dark) from user mode and system preference.
 */
export const resolveEffectiveTheme = (
  mode: ThemeMode,
  systemPreference: EffectiveTheme,
): EffectiveTheme => {
  if (mode === 'system') {
    return systemPreference;
  }
  return mode;
};

/**
 * Applies the effective theme to the DOM root element (html)
 * Sets:
 * 1. data-theme="light" | "dark"
 * 2. class "dark" / "light"
 * 3. style.colorScheme
 */
export const applyThemeToDOM = (effectiveTheme: EffectiveTheme): void => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.setAttribute('data-theme', effectiveTheme);
  root.classList.remove('light', 'dark');
  root.classList.add(effectiveTheme);
  root.style.colorScheme = effectiveTheme;
};

/**
 * Attaches a listener to OS color scheme changes and returns an unsubscribe function.
 */
export const subscribeToSystemThemeChanges = (
  onPreferenceChange: (pref: EffectiveTheme) => void,
): (() => void) => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {
      /* noop */
    };
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handler = (event: MediaQueryListEvent) => {
    const newPref: EffectiveTheme = event.matches ? 'dark' : 'light';
    onPreferenceChange(newPref);
  };

  // Modern browsers support addEventListener, fallback to addListener if needed
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  } else {
    // Deprecated MediaQueryList listener for older runtimes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mediaQuery as any).addListener(handler);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return () => (mediaQuery as any).removeListener(handler);
  }
};
