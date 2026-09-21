export type NavTabId =
  | 'live-show'
  | 'media-library'
  | 'integrations'
  | 'outputs'
  | 'remotes'
  | 'settings';

export interface NavItemConfig {
  id: NavTabId;
  label: string;
  badge?: string;
}

export interface NavigationState {
  activeTab: NavTabId;
  isSidebarExpanded: boolean;
}
