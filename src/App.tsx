import React from 'react';
import { useAppSelector } from './store/hooks';
import { selectActiveTab, NavTabId } from './store/features/navigation';
import { selectIsAuthenticated } from './store/features/auth';
import { Sidebar } from './components/sidebar';
import { ThemeToggle } from './components/theme';
import { LanguageToggle, useLanguage } from './components/language';
import { AuthContainer } from './components/auth';
import { BroadcastControls } from './components/broadcast';
import { NotificationBell } from './components/notifications';
import {
  LiveShowScreen,
  MediaLibraryScreen,
  IntegrationsScreen,
  OutputsScreen,
  RemotesScreen,
  SettingsScreen,
} from './components/screens';
import './App.css';

export const App: React.FC = () => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const activeTab = useAppSelector(selectActiveTab);
  const { t } = useLanguage();

  if (!isAuthenticated) {
    return <AuthContainer />;
  }

  const tabTitles: Record<NavTabId, string> = {
    'live-show': t.nav.liveShow,
    'media-library': t.nav.mediaLibrary,
    integrations: t.nav.integrations,
    outputs: t.nav.outputs,
    remotes: t.nav.remotes,
    settings: t.nav.settings,
  };

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'live-show':
        return <LiveShowScreen />;
      case 'media-library':
        return <MediaLibraryScreen />;
      case 'integrations':
        return <IntegrationsScreen />;
      case 'outputs':
        return <OutputsScreen />;
      case 'remotes':
        return <RemotesScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <LiveShowScreen />;
    }
  };

  return (
    <div className="app-layout">
      {/* Expandable / Collapsible Navigation Sidebar */}
      <Sidebar />

      {/* Main Workspace Viewport */}
      <div className="app-main-viewport">
        {/* Top Console Bar */}
        <header className="app-topbar">
          <div className="topbar-breadcrumb">
            <span className="breadcrumb-root">{t.common.appName}</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-active">{tabTitles[activeTab]}</span>
          </div>

          {/* Master Global Broadcast Controls (Black, Clear, Logo) */}
          <div className="topbar-broadcast-center">
            <BroadcastControls />
          </div>

          <div className="topbar-actions">
            {/* Notification Bell (Release updates, alerts, future FCM) */}
            <NotificationBell />

            {/* Language Switcher (EN / RW) */}
            <LanguageToggle variant="segmented" />

            {/* Quick theme switcher in topbar */}
            <ThemeToggle variant="compact" />
          </div>
        </header>

        {/* Dynamic Screen View */}
        <main
          className={`screen-scroll-container ${
            activeTab === 'live-show' ? 'is-live-console' : ''
          }`}
        >
          {renderActiveScreen()}
        </main>
      </div>
    </div>
  );
};

export default App;
