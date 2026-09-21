import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectEffectiveTheme,
  selectIsDark,
  selectIsSystem,
  selectSystemPreference,
  selectThemeMode,
  setThemeMode,
  toggleThemeMode,
  ThemeMode,
  EffectiveTheme,
} from '../../store/features/theme';

export interface UseThemeReturn {
  /** The currently configured theme mode ('light' | 'dark' | 'system') */
  mode: ThemeMode;
  /** The actively rendered theme ('light' | 'dark') */
  effectiveTheme: EffectiveTheme;
  /** The OS color scheme detected ('light' | 'dark') */
  systemPreference: EffectiveTheme;
  /** Convenience flag: true when effectiveTheme is dark */
  isDark: boolean;
  /** Convenience flag: true when mode is 'system' */
  isSystem: boolean;
  /** Explicitly changes the theme mode */
  setMode: (mode: ThemeMode) => void;
  /** Cycles to the next theme mode (light -> dark -> system -> light) */
  toggleTheme: () => void;
}

/**
 * Custom hook providing access to Redux theme state and action dispatchers.
 */
export const useTheme = (): UseThemeReturn => {
  const dispatch = useAppDispatch();
  const mode = useAppSelector(selectThemeMode);
  const effectiveTheme = useAppSelector(selectEffectiveTheme);
  const systemPreference = useAppSelector(selectSystemPreference);
  const isDark = useAppSelector(selectIsDark);
  const isSystem = useAppSelector(selectIsSystem);

  const setMode = useCallback(
    (newMode: ThemeMode) => {
      dispatch(setThemeMode(newMode));
    },
    [dispatch],
  );

  const toggleTheme = useCallback(() => {
    dispatch(toggleThemeMode());
  }, [dispatch]);

  return {
    mode,
    effectiveTheme,
    systemPreference,
    isDark,
    isSystem,
    setMode,
    toggleTheme,
  };
};
