import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { NavigationState, NavTabId } from './types';

const SIDEBAR_EXPANDED_KEY = 'bunsenworship_sidebar_expanded';

const getPersistedSidebarState = (): boolean => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return true;
  }
  try {
    const saved = window.localStorage.getItem(SIDEBAR_EXPANDED_KEY);
    if (saved !== null) {
      return saved === 'true';
    }
  } catch (error) {
    console.warn('Failed to read sidebar state from localStorage:', error);
  }
  return true;
};

const persistSidebarState = (isExpanded: boolean): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(SIDEBAR_EXPANDED_KEY, String(isExpanded));
  } catch (error) {
    console.warn('Failed to save sidebar state to localStorage:', error);
  }
};

const initialState: NavigationState = {
  activeTab: 'live-show',
  isSidebarExpanded: getPersistedSidebarState(),
};

export const navigationSlice = createSlice({
  name: 'navigation',
  initialState,
  reducers: {
    setActiveTab: (state, action: PayloadAction<NavTabId>) => {
      state.activeTab = action.payload;
    },
    toggleSidebar: (state) => {
      state.isSidebarExpanded = !state.isSidebarExpanded;
      persistSidebarState(state.isSidebarExpanded);
    },
    setSidebarExpanded: (state, action: PayloadAction<boolean>) => {
      state.isSidebarExpanded = action.payload;
      persistSidebarState(action.payload);
    },
  },
});

export const { setActiveTab, toggleSidebar, setSidebarExpanded } = navigationSlice.actions;

export const navigationReducer = navigationSlice.reducer;
export default navigationReducer;
