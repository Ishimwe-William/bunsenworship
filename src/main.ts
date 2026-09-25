// Suppress dev-only security warnings in console (e.g. unsafe-eval CSP required for YouTube embed)
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

import {
    app,
    BrowserWindow,
    Menu,
    nativeImage,
    Tray,
    ipcMain,
    dialog,
    protocol,
    net,
    powerSaveBlocker,
    session,
    shell,
    screen
} from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadWindowState, manageWindowState} from './windowState';
import {createSplashScreen} from './splash';
import {setupAutoUpdater} from './updater';
import {registerPresentationIpc} from './presentationExport';

// Prevent Chromium from throttling timers, media, and video decoding when window is minimized or occluded
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

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
    {
        scheme: 'app',
        privileges: {
            standard: true,
            secure: true,
            supportFetchAPI: true,
            corsEnabled: true,
            stream: true,
        },
    },
]);

let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;
let projectorWindow: BrowserWindow | null = null;

const rendererRoot = path.join(__dirname, '../renderer');

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

const buildAppUrl = (queryString?: string): string => {
    if (process.env.VITE_DEV_SERVER_URL) {
        return queryString
            ? `${process.env.VITE_DEV_SERVER_URL}?${queryString}`
            : process.env.VITE_DEV_SERVER_URL;
    }
    return queryString ? `app://bundle/index.html?${queryString}` : 'app://bundle/index.html';
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
        {type: 'separator'},
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
                mainWindow!.show();
                mainWindow!.minimize();
            } else {
                mainWindow!.show();
                mainWindow!.focus();
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

    mainWindow.loadURL(buildAppUrl());
};

const getTargetDisplay = (requestedDisplayId?: number): { display: Electron.Display; isExternal: boolean } => {
    const allDisplays = screen.getAllDisplays();
    let operatorDisplay = screen.getPrimaryDisplay();
    if (mainWindow && !mainWindow.isDestroyed()) {
        try {
            operatorDisplay = screen.getDisplayMatching(mainWindow.getBounds());
        } catch {
            operatorDisplay = screen.getPrimaryDisplay();
        }
    }

    if (typeof requestedDisplayId === 'number') {
        const requested = allDisplays.find((d) => d.id === requestedDisplayId);
        if (requested) {
            return { display: requested, isExternal: requested.id !== operatorDisplay.id };
        }
    }

    // PowerPoint-style: If a secondary monitor / projector is detected, automatically select it
    const secondaryDisplays = allDisplays.filter((d) => d.id !== operatorDisplay.id);
    if (secondaryDisplays.length > 0) {
        return { display: secondaryDisplays[0], isExternal: true };
    }

    // Single monitor setup: Fall back to operator display in windowed preview
    return { display: operatorDisplay, isExternal: false };
};

const createProjectorWindow = (requestedDisplayId?: number) => {
    const { display: targetDisplay } = getTargetDisplay(requestedDisplayId);

    if (projectorWindow && !projectorWindow.isDestroyed()) {
        projectorWindow.setFullScreen(false);
        projectorWindow.setBounds(targetDisplay.bounds);
        projectorWindow.setFullScreen(true);
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

    // PowerPoint presentation mode: Borderless full screen over the taskbar
    // Uses secondary monitor if connected; otherwise covers the primary monitor
    const windowOptions: Electron.BrowserWindowConstructorOptions = {
        x: targetDisplay.bounds.x,
        y: targetDisplay.bounds.y,
        width: targetDisplay.bounds.width,
        height: targetDisplay.bounds.height,
        title: 'BunsenWorship - Sanctuary Projection Output',
        backgroundColor: '#000000',
        icon: appIcon.isEmpty() ? undefined : appIcon,
        autoHideMenuBar: true,
        frame: false,
        fullscreen: true,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, '../preload/preload.js'),
            backgroundThrottling: false,
        },
    };

    projectorWindow = new BrowserWindow(windowOptions);
    projectorWindow.setBounds(targetDisplay.bounds);
    projectorWindow.setFullScreen(true);

    projectorWindow.loadURL(buildAppUrl('mode=projector'));

    projectorWindow.once('ready-to-show', () => {
        projectorWindow?.show();
        projectorWindow?.setFullScreen(true);
        projectorWindow?.focus();
    });

    mainWindow?.webContents.send('projector:status-changed', true);

    projectorWindow.on('closed', () => {
        projectorWindow = null;
        mainWindow?.webContents.send('projector:status-changed', false);
    });
};

ipcMain.handle('projector:open', (_event, displayId?: number) => {
    createProjectorWindow(displayId);
});

ipcMain.handle('projector:close', () => {
    if (projectorWindow && !projectorWindow.isDestroyed()) {
        projectorWindow.close();
    }
});

ipcMain.handle('projector:is-open', () => {
    return Boolean(projectorWindow && !projectorWindow.isDestroyed());
});

ipcMain.handle('screen:get-displays', () => {
    const allDisplays = screen.getAllDisplays();
    let operatorDisplay = screen.getPrimaryDisplay();
    if (mainWindow && !mainWindow.isDestroyed()) {
        try {
            operatorDisplay = screen.getDisplayMatching(mainWindow.getBounds());
        } catch {
            operatorDisplay = screen.getPrimaryDisplay();
        }
    }
    return allDisplays.map((d, index) => ({
        id: d.id,
        name: `Display ${index + 1} (${d.bounds.width}×${d.bounds.height})`,
        isPrimary: d.id === screen.getPrimaryDisplay().id,
        isOperator: d.id === operatorDisplay.id,
        bounds: d.bounds,
    }));
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
            {name: 'All Files', extensions: ['*']},
        ],
    });
    if (result.canceled || result.filePaths.length === 0) {
        return null;
    }
    return result.filePaths[0];
});

ipcMain.handle('dialog:open-presentation', async () => {
    const result = await dialog.showOpenDialog({
        title: 'Select PowerPoint Presentation',
        properties: ['openFile'],
        filters: [
            {
                name: 'PowerPoint Presentations',
                extensions: ['pptx', 'ppt'],
            },
            {name: 'All Files', extensions: ['*']},
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

// Register presentation import IPC (PowerPoint COM export, etc.)
registerPresentationIpc();

// Open http(s) links in the system browser rather than an Electron child window
ipcMain.handle('app:open-external', (_event, url: string) => {
    if (typeof url === 'string' && /^https?:\/\//i.test(url.trim())) {
        shell.openExternal(url.trim()).catch((err) => console.warn('Failed to open external URL:', err));
    }
});

// This method will be called when Electron has finished initialization
app.on('ready', () => {
    // Register custom bunsen-media protocol handler for secure streaming
    protocol.handle('bunsen-media', async (request) => {
        try {
            let rawPath = decodeURIComponent(request.url.replace(/^bunsen-media:\/\//i, ''));
            rawPath = rawPath.replace(/^(media|local)\//i, '');
            if (process.platform === 'win32') {
                if (/^\/[a-zA-Z]:[/\\]/.test(rawPath)) {
                    rawPath = rawPath.slice(1);
                } else if (/^[a-zA-Z][/\\]/.test(rawPath)) {
                    rawPath = rawPath[0].toUpperCase() + ':' + rawPath.slice(1);
                }
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
                try {
                    searchDirs.push(path.join(app.getPath('userData'), 'presentation-exports'));
                } catch {
                    // ignore
                }
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
                return new Response('Media file not found: ' + rawPath, {status: 404});
            }

            const fileUrl = pathToFileURL(resolvedPath).toString();
            return net.fetch(fileUrl, {
                headers: request.headers,
                method: request.method,
            });
        } catch (err) {
            console.error('Failed to handle bunsen-media request:', request.url, err);
            return new Response('File not accessible', {status: 404});
        }
    });

    // Register custom app protocol handler: serves the packaged renderer bundle
    // as a real origin (app://bundle) instead of file://, so cross-window
    // postMessage (YouTube IFrame Player API) works in packaged builds.
    protocol.handle('app', async (request) => {
        try {
            const url = new URL(request.url);
            // url.hostname === 'bundle'; url.pathname is e.g. '/index.html' or '/assets/index-xyz.js'
            let relativePath = decodeURIComponent(url.pathname);
            if (relativePath === '' || relativePath === '/') {
                relativePath = '/index.html';
            }

            let resolvedPath = path.normalize(path.join(rendererRoot, relativePath));

            // Guard against path traversal outside the renderer directory
            if (!resolvedPath.startsWith(path.normalize(rendererRoot))) {
                return new Response('Forbidden', {status: 403});
            }

            // SPA fallback: if the exact file doesn't exist (e.g. a client-side route),
            // serve index.html so react-router (BrowserRouter) can handle it.
            if (!fs.existsSync(resolvedPath) || fs.statSync(resolvedPath).isDirectory()) {
                resolvedPath = path.join(rendererRoot, 'index.html');
            }

            const fileUrl = pathToFileURL(resolvedPath).toString();
            return net.fetch(fileUrl);
        } catch (err) {
            console.error('Failed to handle app:// request:', request.url, err);
            return new Response('Not found', {status: 404});
        }
    });

    // Configure clean Chrome User-Agent without Electron token so Google/YouTube does not block embedded playback
    const defaultUa = session.defaultSession.getUserAgent();
    const cleanUa = defaultUa.replace(/Electron\/[^\s]+\s*/g, '');
    session.defaultSession.setUserAgent(cleanUa);
    app.userAgentFallback = cleanUa;

    // Intercept requests to YouTube and Google Video to provide clean User-Agent and Referer
    session.defaultSession.webRequest.onBeforeSendHeaders(
        {
            urls: [
                '*://*.youtube.com/*',
                '*://*.youtube-nocookie.com/*',
                '*://*.googlevideo.com/*',
                '*://*.ytimg.com/*',
            ],
        },
        (details, callback) => {
            const requestHeaders = {...details.requestHeaders};

            // Set clean User-Agent
            requestHeaders['User-Agent'] = cleanUa;

            // Provide standard privacy-enhanced Referer to satisfy YouTube embedding restrictions without origin mismatch
            requestHeaders['Referer'] = 'https://www.youtube-nocookie.com/';

            callback({cancel: false, requestHeaders});
        }
    );

    // Strip x-frame-options and frame-ancestors CSP so embedded YouTube videos can play in packaged and dev environments
    session.defaultSession.webRequest.onHeadersReceived(
        {
            urls: [
                '*://*.youtube.com/*',
                '*://*.youtube-nocookie.com/*',
                '*://*.googlevideo.com/*',
                '*://*.ytimg.com/*',
            ],
        },
        (details, callback) => {
            const responseHeaders = {...details.responseHeaders};
            delete responseHeaders['x-frame-options'];
            delete responseHeaders['X-Frame-Options'];

            const stripFrameAncestors = (csp: string) =>
                csp.replace(/frame-ancestors [^;]+;?/gi, '');

            if (responseHeaders['content-security-policy']) {
                responseHeaders['content-security-policy'] = responseHeaders['content-security-policy'].map(stripFrameAncestors);
            }
            if (responseHeaders['Content-Security-Policy']) {
                responseHeaders['Content-Security-Policy'] = responseHeaders['Content-Security-Policy'].map(stripFrameAncestors);
            }

            if (!responseHeaders['access-control-allow-origin'] && !responseHeaders['Access-Control-Allow-Origin']) {
                responseHeaders['Access-Control-Allow-Origin'] = ['*'];
            }

            callback({cancel: false, responseHeaders});
        }
    );

    createWindow();
    powerSaveBlocker.start('prevent-app-suspension');
    setupAutoUpdater();

    // Guard against disconnected monitors while projector is open (safe after app is ready)
    screen.on('display-removed', () => {
        if (projectorWindow && !projectorWindow.isDestroyed()) {
            const allDisplays = screen.getAllDisplays();
            const winBounds = projectorWindow.getBounds();
            const isVisible = allDisplays.some((d) => {
                const b = d.bounds;
                return (
                    winBounds.x < b.x + b.width &&
                    winBounds.x + winBounds.width > b.x &&
                    winBounds.y < b.y + b.height &&
                    winBounds.y + winBounds.height > b.y
                );
            });
            if (!isVisible) {
                const primary = screen.getPrimaryDisplay();
                projectorWindow.setFullScreen(false);
                projectorWindow.setBounds({
                    x: primary.bounds.x + 50,
                    y: primary.bounds.y + 50,
                    width: 1280,
                    height: 720,
                });
            }
        }
    });
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