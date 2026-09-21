import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from './rootReducer';

export const store = configureStore({
  reducer: rootReducer,
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;

// Export all features for easy import from '@/store'
export * from './features/theme';
export * from './features/navigation';
export * from './features/language';
export * from './features/auth';
export * from './rootReducer';
export * from './hooks';
