import { app } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';

/**
 * Initializes automatic background updates for BunsenWorship via electron-updater.
 * Directly communicates with GitHub Releases (Ishimwe-William/bunsenworship).
 * When a new release is detected and downloaded, the update is applied cleanly.
 */
export function setupAutoUpdater(): void {
  // In development mode, skip autoUpdater
  if (!app.isPackaged) {
    console.log('[AutoUpdater] Development mode detected; skipping background update service.');
    return;
  }

  try {
    console.log('[AutoUpdater] Initializing background update service for Ishimwe-William/bunsenworship...');

    autoUpdater.logger = log;
    if (log && log.transports && log.transports.file) {
      log.transports.file.level = 'info';
    }

    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowDowngrade = false;

    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'Ishimwe-William',
      repo: 'bunsenworship',
      releaseType: 'release',
    });

    autoUpdater.on('checking-for-update', () => {
      console.log('[AutoUpdater] Checking for updates on GitHub Releases...');
    });

    autoUpdater.on('update-available', (info) => {
      console.log(`[AutoUpdater] Update available: v${info.version}`);
    });

    autoUpdater.on('update-not-available', () => {
      console.log('[AutoUpdater] Application is up to date.');
    });

    autoUpdater.on('error', (err) => {
      console.error('[AutoUpdater] Auto-updater error:', err == null ? 'unknown' : (err.stack || err).toString());
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log(`[AutoUpdater] Update v${info.version} downloaded successfully.`);
      // Silently installs update without blocking user
      autoUpdater.quitAndInstall(true, true);
    });

    // Check on startup
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.error('[AutoUpdater] Initial check error:', err);
    });

    // Periodically check every 15 minutes
    setInterval(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        console.error('[AutoUpdater] Background check error:', err);
      });
    }, 15 * 60 * 1000);

    console.log('[AutoUpdater] Background update service active (direct GitHub Releases integration).');
  } catch (error) {
    console.error('[AutoUpdater] Error initializing autoUpdater:', error);
  }
}
