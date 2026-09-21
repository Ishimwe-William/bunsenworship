/**
 * Supported user-selectable theme modes:
 * - 'light': Forces light theme
 * - 'dark': Forces dark theme
 * - 'system': Automatically mirrors the operating system theme
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Resolved active theme applied to the document (light or dark).
 */
export type EffectiveTheme = 'light' | 'dark';

/**
 * State contract for the theme module.
 */
export interface ThemeState {
  /** The theme setting explicitly chosen by the user or defaulted */
  mode: ThemeMode;
  /** The currently active theme rendered on screen */
  effectiveTheme: EffectiveTheme;
  /** The current detected system OS theme */
  systemPreference: EffectiveTheme;
}
