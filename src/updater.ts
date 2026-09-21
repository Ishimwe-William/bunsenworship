import { app, autoUpdater } from 'electron';
import { updateElectronApp, UpdateSourceType } from 'update-electron-app';

/**
 * Initializes automatic background updates for BunsenWorship.
 * When a new release is detected and downloaded, the application automatically
 * installs and restarts with no user confirmation required.
 */
export function setupAutoUpdater(): void {
  // In development mode, autoUpdater will fail or throw because there are no code-signed packages or feed URLs.
  if (!app.isPackaged) {
    console.log('[AutoUpdater] Development mode detected; skipping background update service.');
    return;
  }

  // Only macOS (darwin) and Windows (win32) support Electron native autoUpdater
  if (process.platform !== 'win32' && process.platform !== 'darwin') {
    console.log(`[AutoUpdater] Native auto-updates are not supported on ${process.platform}.`);
    return;
  }

  try {
    console.log('[AutoUpdater] Initializing background update service for Ishimwe-William/bunsenworship...');

    updateElectronApp({
      updateSource: {
        type: UpdateSourceType.ElectronPublicUpdateService,
        repo: 'Ishimwe-William/bunsenworship',
        host: 'https://update.electronjs.org',
      },
      updateInterval: '10 minutes',
      notifyUser: true,
      // Handle the downloaded update automatically without prompting the user
      onNotifyUser: (info) => {
        console.log(
          `[AutoUpdater] Update ${info.releaseName || 'new version'} successfully downloaded. Applying update immediately (no confirmation needed)...`,
        );
        autoUpdater.quitAndInstall();
      },
      logger: {
        log: (msg: string) => console.log(`[AutoUpdater] ${msg}`),
        info: (msg: string) => console.info(`[AutoUpdater] ${msg}`),
        error: (msg: string) => console.error(`[AutoUpdater] ${msg}`),
        warn: (msg: string) => console.warn(`[AutoUpdater] ${msg}`),
      },
    });

    console.log('[AutoUpdater] Auto-updater configured successfully (no-confirmation auto-install active).');
  } catch (error) {
    console.error('[AutoUpdater] Error initializing autoUpdater:', error);
  }
}
