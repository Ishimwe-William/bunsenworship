import { NavigationState, NavTabId } from './types';

export interface HasNavigationState {
  navigation: NavigationState;
}

export const selectNavigationState = (state: HasNavigationState): NavigationState =>
  state.navigation;

export const selectActiveTab = (state: HasNavigationState): NavTabId =>
  state.navigation.activeTab;

export const selectIsSidebarExpanded = (state: HasNavigationState): boolean =>
  state.navigation.isSidebarExpanded;
