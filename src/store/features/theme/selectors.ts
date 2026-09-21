import { ThemeState, ThemeMode, EffectiveTheme } from './types';

export interface HasThemeState {
  theme: ThemeState;
}

/**
 * Returns the entire theme state slice.
 */
export const selectThemeState = (state: HasThemeState): ThemeState => state.theme;

/**
 * Returns the user-selected theme mode ('light' | 'dark' | 'system').
 */
export const selectThemeMode = (state: HasThemeState): ThemeMode => state.theme.mode;

/**
 * Returns the currently active effective theme ('light' | 'dark').
 */
export const selectEffectiveTheme = (state: HasThemeState): EffectiveTheme =>
  state.theme.effectiveTheme;

/**
 * Returns the OS system color-scheme preference ('light' | 'dark').
 */
export const selectSystemPreference = (state: HasThemeState): EffectiveTheme =>
  state.theme.systemPreference;

/**
 * Boolean helper indicating if dark mode is currently active.
 */
export const selectIsDark = (state: HasThemeState): boolean =>
  state.theme.effectiveTheme === 'dark';

/**
 * Boolean helper indicating if the theme is currently following system preference.
 */
export const selectIsSystem = (state: HasThemeState): boolean =>
  state.theme.mode === 'system';
