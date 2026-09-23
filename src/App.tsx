import React, { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { selectActiveTab, NavTabId } from './store/features/navigation';
import { selectIsAuthenticated } from './store/features/auth';
import {
  selectRundown,
  setLoadedRundown,
  DEFAULT_RUNDOWN,
} from './store/features/presentation';
import { bunsenDb } from './db';
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
import { ProjectorWindowView } from './components/live';
import './App.css';

export const App: React.FC = () => {
  const isProjectorMode =
    typeof window !== 'undefined' &&
    (window.location.search.includes('mode=projector') ||
      window.location.hash.includes('projector'));

  if (isProjectorMode) {
    return <ProjectorWindowView />;
  }

  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const activeTab = useAppSelector(selectActiveTab);
  const rundown = useAppSelector(selectRundown);
  const { t } = useLanguage();

  // 1. Initial hydration: Load saved rundown from DB once on application boot
  const hasHydratedRef = useRef(false);
  useEffect(() => {
    if (hasHydratedRef.current) return;
    hasHydratedRef.current = true;

    bunsenDb
      .getCurrentService()
      .then((savedService) => {
        if (savedService && savedService.items && savedService.items.length > 0) {
          dispatch(setLoadedRundown(savedService.items));
        } else {
          bunsenDb
            .saveService({
              id: 'service-current',
              title: 'Sunday Morning Worship',
              date: new Date().toISOString().split('T')[0],
              isCurrent: true,
              items: DEFAULT_RUNDOWN,
              createdAt: 1710000000000,
              updatedAt: Date.now(),
            })
            .catch((err) => console.warn('Failed to seed service in DB:', err));
        }
      })
      .catch((err) => {
        console.warn('Initial rundown hydration from DB failed:', err);
      });
  }, [dispatch]);

  // 2. Central auto-save: Persist rundown changes to IndexedDB
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      bunsenDb
        .saveService({
          id: 'service-current',
          title: 'Sunday Morning Worship',
          date: new Date().toISOString().split('T')[0],
          isCurrent: true,
          items: rundown,
          createdAt: 1710000000000,
          updatedAt: Date.now(),
        })
        .catch((err) => console.error('Failed to auto-save rundown to DB:', err));
    }, 700);

    return () => clearTimeout(timer);
  }, [rundown]);

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
            activeTab === 'live-show'
              ? 'is-live-console'
              : activeTab === 'media-library'
              ? 'is-media-console'
              : ''
          }`}
        >
          {renderActiveScreen()}
        </main>
      </div>
    </div>
  );
};

export default App;
