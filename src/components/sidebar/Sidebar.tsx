import React from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectActiveTab,
  selectIsSidebarExpanded,
  setActiveTab,
  toggleSidebar,
  NavTabId,
} from '../../store/features/navigation';
import { logout, selectAuthUser } from '../../store/features/auth';
import { useLanguage } from '../language';
import {
  BunsenWorshipLogo,
  LiveShowIcon,
  MediaLibraryIcon,
  IntegrationsIcon,
  OutputsIcon,
  RemotesIcon,
  SettingsIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from './NavIcons';
import { LogoutIcon } from '../common/Icons';
import './Sidebar.css';

interface NavItemDef {
  id: NavTabId;
  label: string;
  icon: React.ReactNode;
}

export const Sidebar: React.FC = () => {
  const dispatch = useAppDispatch();
  const activeTab = useAppSelector(selectActiveTab);
  const isExpanded = useAppSelector(selectIsSidebarExpanded);
  const user = useAppSelector(selectAuthUser);
  const { t } = useLanguage();

  const primaryNavItems: NavItemDef[] = [
    { id: 'live-show', label: t.nav.liveShow, icon: <LiveShowIcon /> },
    { id: 'media-library', label: t.nav.mediaLibrary, icon: <MediaLibraryIcon /> },
    { id: 'integrations', label: t.nav.integrations, icon: <IntegrationsIcon /> },
    { id: 'outputs', label: t.nav.outputs, icon: <OutputsIcon /> },
    { id: 'remotes', label: t.nav.remotes, icon: <RemotesIcon /> },
  ];

  const secondaryNavItems: NavItemDef[] = [
    { id: 'settings', label: t.nav.settings, icon: <SettingsIcon /> },
  ];

  const handleSelectTab = (tabId: NavTabId) => {
    dispatch(setActiveTab(tabId));
  };

  const handleToggleSidebar = () => {
    dispatch(toggleSidebar());
  };

  const renderNavItem = (item: NavItemDef) => {
    const isActive = activeTab === item.id;
    return (
      <button
        key={item.id}
        type="button"
        role="tab"
        aria-selected={isActive}
        className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
        onClick={() => handleSelectTab(item.id)}
        title={!isExpanded ? item.label : undefined}
      >
        <span className="sidebar-item-icon">{item.icon}</span>
        {isExpanded && <span className="sidebar-item-label">{item.label}</span>}
        {!isExpanded && <span className="sidebar-tooltip">{item.label}</span>}
      </button>
    );
  };

  return (
    <aside
      className={`sidebar-container ${isExpanded ? 'expanded' : 'collapsed'}`}
      aria-label="Application Navigation"
    >
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="sidebar-brand-icon" title={`${t.common.appName} ${t.common.consoleSubtitle}`}>
          <BunsenWorshipLogo size={34} />
        </div>
        {isExpanded && (
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-title">{t.common.appName}</span>
            <span className="sidebar-brand-subtitle">{t.common.consoleSubtitle}</span>
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="sidebar-nav" role="tablist">
        {primaryNavItems.map(renderNavItem)}

        <div className="sidebar-nav-separator" role="separator" />

        {secondaryNavItems.map(renderNavItem)}
      </nav>

      {/* Footer: User Profile & Toggle Expand/Minimize */}
      <div className="sidebar-footer">
        {user && (
          <div className="sidebar-user-profile" title={user.email}>
            <div className="sidebar-user-avatar">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
            {isExpanded && (
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">{user.name}</span>
                <span className="sidebar-user-role">{user.role}</span>
              </div>
            )}
            {isExpanded && (
              <button
                type="button"
                className="sidebar-logout-btn"
                onClick={() => dispatch(logout())}
                title={t.auth.signOut}
                aria-label={t.auth.signOut}
              >
                <LogoutIcon size={16} />
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          className="sidebar-toggle-btn"
          onClick={handleToggleSidebar}
          aria-label={isExpanded ? t.nav.collapse : t.nav.expand}
          title={isExpanded ? t.nav.collapse : t.nav.expand}
        >
          {isExpanded ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          {isExpanded && <span className="sidebar-toggle-label">{t.nav.collapse}</span>}
        </button>
      </div>
    </aside>
  );
};
