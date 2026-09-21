import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { EffectiveTheme, ThemeMode, ThemeState } from './types';
import {
  applyThemeToDOM,
  getPersistedThemeMode,
  getSystemThemePreference,
  persistThemeMode,
  resolveEffectiveTheme,
} from './themeService';

const initialMode = getPersistedThemeMode();
const initialSystem = getSystemThemePreference();
const initialEffective = resolveEffectiveTheme(initialMode, initialSystem);

// Immediately apply theme to avoid flash of incorrect theme
applyThemeToDOM(initialEffective);

const initialState: ThemeState = {
  mode: initialMode,
  effectiveTheme: initialEffective,
  systemPreference: initialSystem,
};

export const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    /**
     * Explicitly set the theme mode ('light' | 'dark' | 'system').
     */
    setThemeMode: (state, action: PayloadAction<ThemeMode>) => {
      const newMode = action.payload;
      state.mode = newMode;
      state.effectiveTheme = resolveEffectiveTheme(newMode, state.systemPreference);
      persistThemeMode(newMode);
      applyThemeToDOM(state.effectiveTheme);
    },

    /**
     * Cycles through theme modes: light -> dark -> system -> light.
     */
    toggleThemeMode: (state) => {
      const modeCycle: Record<ThemeMode, ThemeMode> = {
        light: 'dark',
        dark: 'system',
        system: 'light',
      };
      const nextMode = modeCycle[state.mode];
      state.mode = nextMode;
      state.effectiveTheme = resolveEffectiveTheme(nextMode, state.systemPreference);
      persistThemeMode(nextMode);
      applyThemeToDOM(state.effectiveTheme);
    },

    /**
     * Dispatched when OS color scheme changes to keep Redux in sync.
     */
    setSystemPreference: (state, action: PayloadAction<EffectiveTheme>) => {
      const newSystem = action.payload;
      state.systemPreference = newSystem;
      if (state.mode === 'system') {
        state.effectiveTheme = newSystem;
        applyThemeToDOM(newSystem);
      }
    },

    /**
     * Re-applies the active effective theme to the DOM.
     */
    syncThemeWithDOM: (state) => {
      applyThemeToDOM(state.effectiveTheme);
    },
  },
});

export const { setThemeMode, toggleThemeMode, setSystemPreference, syncThemeWithDOM } =
  themeSlice.actions;

export const themeReducer = themeSlice.reducer;
export default themeReducer;
