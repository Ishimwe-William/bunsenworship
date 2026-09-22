import { app, BrowserWindow, Menu, nativeImage, Tray, ipcMain } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { loadWindowState, manageWindowState } from './windowState';
import { createSplashScreen } from './splash';
import { setupAutoUpdater } from './updater';

let tray: Tray | null = null;
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
  const mainWindow = new BrowserWindow({
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
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    projectorWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}?mode=projector`);
  } else {
    projectorWindow.loadFile(path.join(__dirname, '../renderer/index.html'), {
      query: { mode: 'projector' },
    });
  }

  projectorWindow.on('closed', () => {
    projectorWindow = null;
  });
};

ipcMain.handle('projector:open', () => {
  createProjectorWindow();
});

// This method will be called when Electron has finished initialization
app.on('ready', () => {
  createWindow();
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
