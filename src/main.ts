// Suppress dev-only security warnings in console (e.g. unsafe-eval CSP required for YouTube embed)
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

import { app, BrowserWindow, Menu, nativeImage, Tray, ipcMain, dialog, protocol, net, powerSaveBlocker } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadWindowState, manageWindowState } from './windowState';
import { createSplashScreen } from './splash';
import { setupAutoUpdater } from './updater';

// Prevent Chromium from throttling timers, media, and video decoding when window is minimized or occluded
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// Register custom bunsen-media scheme before app ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'bunsen-media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
      corsEnabled: true,
    },
  },
]);

let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;
let projectorWindow: BrowserWindow | null = null;

// Helper to resolve asset paths across dev mode and packaged distribution
const getAssetPath = (filename: string): string => {
  const packagedPath = path.join(app.getAppPath(), 'src/assets', filename);
  if (fs.existsSync(packagedPath)) {
    return packagedPath;
  }
  const extraResourcePath = path.join(process.resourcesPath, 'assets', filename);
  if (fs.existsSync(extraResourcePath)) {
    return extraResourcePath;
  }
  const devPath = path.join(__dirname, '../../src/assets', filename);
  if (fs.existsSync(devPath)) {
    return devPath;
  }
  return devPath;
};

const createSystemTray = (mainWindow: BrowserWindow) => {
  if (tray) return;

  const trayIconPath = getAssetPath('SystemTray-32.png');
  const trayIcon = nativeImage.createFromPath(trayIconPath);

  if (trayIcon.isEmpty()) {
    return;
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('BunsenWorship - Live Worship Presentation');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open BunsenWorship',
      click: () => {
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        mainWindow.show();
        mainWindow.focus();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit BunsenWorship',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      if (mainWindow.isFocused()) {
        mainWindow.minimize();
      } else {
        mainWindow.focus();
      }
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
};

const createWindow = () => {
  // Launch instant branded splash screen
  const splashWindow = createSplashScreen();
  const splashStartTime = Date.now();

  // Load previous window dimensions and state
  const windowState = loadWindowState({
    defaultWidth: 1200,
    defaultHeight: 760,
    minWidth: 960,
    minHeight: 600,
  });

  const appIconPath = getAssetPath('AppIcon-256.png');
  const appIcon = nativeImage.createFromPath(appIconPath);

  // Create the browser window with enforced minimum dimensions and restored coordinates
  mainWindow = new BrowserWindow({
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    minWidth: 960,
    minHeight: 600,
    icon: appIcon.isEmpty() ? undefined : appIcon,
    show: false, // Keep hidden while splash screen is displaying
    backgroundColor: '#0b0f19',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      backgroundThrottling: false,
    },
  });

  // Attach state tracker to persist size, position, and maximized/minimized states
  manageWindowState(mainWindow, windowState);

  // Initialize System Tray
  createSystemTray(mainWindow);

  // Restore maximized state before showing
  if (windowState.isMaximized) {
    mainWindow.maximize();
  }

  // Once renderer is ready, gracefully transition from splash to main window
  mainWindow.once('ready-to-show', () => {
    const elapsed = Date.now() - splashStartTime;
    const minSplashDuration = 1400; // Optimal duration for branded presentation feedback
    const remainingDelay = Math.max(0, minSplashDuration - elapsed);

    setTimeout(() => {
      // Destroy splash window
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.destroy();
      }

      // Display main window according to previous state
      if (windowState.isMinimized) {
        mainWindow.show();
        mainWindow.minimize();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }, remainingDelay);
  });

  // Clean up splash if main window closes prematurely
  mainWindow.on('closed', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.destroy();
    }
  });

  // Allow child windows with preload
  mainWindow.webContents.setWindowOpenHandler(() => {
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        webPreferences: {
          preload: path.join(__dirname, '../preload/preload.js'),
        },
      },
    };
  });

  // Load the web app
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
};

const createProjectorWindow = () => {
  if (projectorWindow && !projectorWindow.isDestroyed()) {
    if (projectorWindow.isMinimized()) {
      projectorWindow.restore();
    }
    projectorWindow.show();
    projectorWindow.focus();
    mainWindow?.webContents.send('projector:status-changed', true);
    return;
  }

  const appIconPath = getAssetPath('AppIcon-256.png');
  const appIcon = nativeImage.createFromPath(appIconPath);

  projectorWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 450,
    title: 'BunsenWorship - Sanctuary Projection Output',
    backgroundColor: '#000000',
    icon: appIcon.isEmpty() ? undefined : appIcon,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      backgroundThrottling: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    projectorWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}?mode=projector`);
  } else {
    projectorWindow.loadFile(path.join(__dirname, '../renderer/index.html'), {
      query: { mode: 'projector' },
    });
  }

  mainWindow?.webContents.send('projector:status-changed', true);

  projectorWindow.on('closed', () => {
    projectorWindow = null;
    mainWindow?.webContents.send('projector:status-changed', false);
  });
};

ipcMain.handle('projector:open', () => {
  createProjectorWindow();
});

ipcMain.handle('projector:is-open', () => {
  return Boolean(projectorWindow && !projectorWindow.isDestroyed());
});

ipcMain.handle('dialog:open-video', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Select Video File for Worship Presentation',
    properties: ['openFile'],
    filters: [
      {
        name: 'Video Files',
        extensions: ['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v', 'mpg', 'mpeg'],
      },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.handle('video:resolve-path', async (_event, filename: string) => {
  if (!filename || typeof filename !== 'string') return null;
  const clean = filename.trim();
  if (!clean) return null;

  if (/^[a-zA-Z]:[/\\]/.test(clean) && fs.existsSync(clean)) {
    return clean;
  }

  const baseName = path.basename(clean);
  const searchDirs: string[] = [];
  const addSearchDir = (name: 'videos' | 'downloads' | 'desktop' | 'documents') => {
    try {
      searchDirs.push(app.getPath(name));
    } catch (err) {
      console.debug('Path unavailable:', name, err);
    }
  };
  addSearchDir('videos');
  addSearchDir('downloads');
  addSearchDir('desktop');
  addSearchDir('documents');
  searchDirs.push(process.cwd());

  for (const dir of searchDirs) {
    const candidate = path.join(dir, baseName);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  for (const dir of searchDirs) {
    try {
      if (!fs.existsSync(dir)) continue;
      const entries = fs.readdirSync(dir);
      const match = entries.find((e) => e.toLowerCase() === baseName.toLowerCase());
      if (match) {
        return path.join(dir, match);
      }
    } catch {
      // ignore
    }
  }

  return null;
});

// This method will be called when Electron has finished initialization
app.on('ready', () => {
  // Register custom bunsen-media protocol handler for secure streaming
  protocol.handle('bunsen-media', async (request) => {
    try {
      let rawPath = decodeURIComponent(request.url.replace(/^bunsen-media:\/\//i, ''));
      if (process.platform === 'win32' && /^\/[a-zA-Z]:[/\\]/.test(rawPath)) {
        rawPath = rawPath.slice(1);
      }
      let resolvedPath = path.normalize(rawPath);

      if (!fs.existsSync(resolvedPath)) {
        const baseName = path.basename(resolvedPath);
        const searchDirs: string[] = [];
        const addSearchDir = (name: 'videos' | 'downloads' | 'desktop' | 'documents') => {
          try {
            searchDirs.push(app.getPath(name));
          } catch (err) {
            console.debug('Path unavailable:', name, err);
          }
        };
        addSearchDir('videos');
        addSearchDir('downloads');
        addSearchDir('desktop');
        addSearchDir('documents');
        searchDirs.push(process.cwd());

        for (const dir of searchDirs) {
          const candidate = path.join(dir, baseName);
          if (fs.existsSync(candidate)) {
            resolvedPath = candidate;
            break;
          }
        }

        if (!fs.existsSync(resolvedPath)) {
          for (const dir of searchDirs) {
            try {
              if (!fs.existsSync(dir)) continue;
              const entries = fs.readdirSync(dir);
              const match = entries.find((e) => e.toLowerCase() === baseName.toLowerCase());
              if (match) {
                resolvedPath = path.join(dir, match);
                break;
              }
            } catch {
              // ignore
            }
          }
        }
      }

      if (!fs.existsSync(resolvedPath)) {
        return new Response('Media file not found: ' + rawPath, { status: 404 });
      }

      const fileUrl = pathToFileURL(resolvedPath).toString();
      return net.fetch(fileUrl, {
        headers: request.headers,
        method: request.method,
      });
    } catch (err) {
      console.error('Failed to handle bunsen-media request:', request.url, err);
      return new Response('File not accessible', { status: 404 });
    }
  });

  createWindow();
  powerSaveBlocker.start('prevent-app-suspension');
  setupAutoUpdater();
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (tray) {
    tray.destroy();
    tray = null;
  }
});
