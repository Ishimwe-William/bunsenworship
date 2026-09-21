import React, { useEffect } from 'react';
import { useAppDispatch } from '../../store/hooks';
import {
  setSystemPreference,
  subscribeToSystemThemeChanges,
  syncThemeWithDOM,
} from '../../store/features/theme';

interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * ThemeProvider sets up background OS theme listeners and keeps the DOM
 * in sync with the Redux theme state.
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Ensure initial DOM state matches store
    dispatch(syncThemeWithDOM());

    // Listen for operating system theme changes (e.g. sunset/sunrise or OS settings)
    const unsubscribe = subscribeToSystemThemeChanges((newPreference) => {
      dispatch(setSystemPreference(newPreference));
    });

    return () => {
      unsubscribe();
    };
  }, [dispatch]);

  return <>{children}</>;
};
