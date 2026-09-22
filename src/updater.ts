import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { UpdateInfo } from './types/electron';

let cachedUpdateInfo: UpdateInfo | null = null;
let isUpdateDownloaded = false;

/**
 * Initializes automatic background updates for BunsenWorship via electron-updater.
 * Directly communicates with GitHub Releases (Ishimwe-William/bunsenworship).
 * Dispatches live IPC events to the UI so users receive notifications via the notification bell.
 */
export function setupAutoUpdater(): void {
  // Always register IPC handlers for renderer communication
  ipcMain.handle('app:get-version', () => {
    return app.getVersion();
  });

  ipcMain.handle('updater:get-status', () => {
    return {
      cachedUpdateInfo,
      isUpdateDownloaded,
    };
  });

  ipcMain.on('updater:check-for-updates', () => {
    if (!app.isPackaged) {
      console.log('[AutoUpdater] In dev mode, simulating manual update check against GitHub Releases...');
    }
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('[AutoUpdater] Manual check error:', err);
    });
  });

  ipcMain.on('updater:restart-and-install', () => {
    if (app.isPackaged) {
      console.log('[AutoUpdater] User triggered restart & install.');
      autoUpdater.quitAndInstall(false, true);
    } else {
      console.log('[AutoUpdater] Dev mode: restart & install acknowledged.');
    }
  });

  // In development mode, allow check when explicitly requested or keep service listening
  if (!app.isPackaged) {
    console.log('[AutoUpdater] Development mode detected; background polling disabled.');
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
      cachedUpdateInfo = {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined,
      };

      // Notify all open windows so the notification bell updates
      BrowserWindow.getAllWindows().forEach((win) => {
        if (!win.isDestroyed()) {
          win.webContents.send('updater:update-available', cachedUpdateInfo);
        }
      });
    });

    autoUpdater.on('update-not-available', () => {
      console.log('[AutoUpdater] Application is up to date.');
    });

    autoUpdater.on('error', (err) => {
      console.error('[AutoUpdater] Auto-updater error:', err == null ? 'unknown' : (err.stack || err).toString());
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log(`[AutoUpdater] Update v${info.version} downloaded successfully.`);
      isUpdateDownloaded = true;
      cachedUpdateInfo = {
        version: info.version,
      };

      // Notify all open windows so user can see notification and choose when to restart
      BrowserWindow.getAllWindows().forEach((win) => {
        if (!win.isDestroyed()) {
          win.webContents.send('updater:update-downloaded', cachedUpdateInfo);
        }
      });
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
