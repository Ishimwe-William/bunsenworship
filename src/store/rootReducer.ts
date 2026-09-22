import { combineReducers } from '@reduxjs/toolkit';
import { themeReducer } from './features/theme';
import { navigationReducer } from './features/navigation';
import { languageReducer } from './features/language';
import { authReducer } from './features/auth';
import { presentationReducer } from './features/presentation';
import { notificationsReducer } from './features/notifications';

/**
 * Root reducer combining all modular feature reducers.
 * Additional feature slices (e.g. lyrics, presentations, media) can be added here.
 */
export const rootReducer = combineReducers({
  theme: themeReducer,
  navigation: navigationReducer,
  language: languageReducer,
  auth: authReducer,
  presentation: presentationReducer,
  notifications: notificationsReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
