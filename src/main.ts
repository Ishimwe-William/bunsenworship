import { app, BrowserWindow, Menu, nativeImage, Tray } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { loadWindowState, manageWindowState } from './windowState';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let tray: Tray | null = null;

// Helper to resolve asset paths across dev mode and packaged distribution
const getAssetPath = (filename: string): string => {
  const devPath = path.join(__dirname, '../../src/assets', filename);
  if (fs.existsSync(devPath)) {
    return devPath;
  }
  const packagedPath = path.join(app.getAppPath(), 'src/assets', filename);
  if (fs.existsSync(packagedPath)) {
    return packagedPath;
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
    show: false, // Prevent flicker before restoring maximized/minimized state
    backgroundColor: '#0b0f19',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
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

  // Once renderer is ready, display window according to previous state
  mainWindow.once('ready-to-show', () => {
    if (windowState.isMinimized) {
      mainWindow.show();
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
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

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
