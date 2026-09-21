import { app, BrowserWindow, screen } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

export interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
  isMinimized: boolean;
}

export interface WindowStateOptions {
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  minHeight?: number;
}

const STATE_FILE_NAME = 'window-state.json';

/**
 * Returns the absolute path where the window state JSON is stored.
 */
function getStateFilePath(): string {
  return path.join(app.getPath('userData'), STATE_FILE_NAME);
}

/**
 * Verifies whether the specified window bounds intersect with any active display.
 * Prevents the window from launching off-screen if an external monitor was disconnected.
 */
function isBoundsVisibleOnAnyDisplay(bounds: { x: number; y: number; width: number; height: number }): boolean {
  try {
    const displays = screen.getAllDisplays();
    return displays.some((display) => {
      const db = display.bounds;
      // Ensure at least a usable portion of the window title bar is on screen
      const minVisibleX = 100;
      const minVisibleY = 40;
      return (
        bounds.x + bounds.width >= db.x + minVisibleX &&
        bounds.x <= db.x + db.width - minVisibleX &&
        bounds.y >= db.y - 10 &&
        bounds.y <= db.y + db.height - minVisibleY
      );
    });
  } catch {
    return true;
  }
}

/**
 * Loads the persisted window state from disk, applying fallbacks when absent or corrupted.
 */
export function loadWindowState(options: WindowStateOptions = {}): WindowState {
  const minWidth = options.minWidth ?? 960;
  const minHeight = options.minHeight ?? 600;
  const defaultWidth = Math.max(options.defaultWidth ?? 1200, minWidth);
  const defaultHeight = Math.max(options.defaultHeight ?? 760, minHeight);

  const defaultState: WindowState = {
    width: defaultWidth,
    height: defaultHeight,
    isMaximized: false,
    isMinimized: false,
  };

  try {
    const filePath = getStateFilePath();
    if (!fs.existsSync(filePath)) {
      return defaultState;
    }

    const rawData = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(rawData);

    const width = typeof parsed.width === 'number' && parsed.width >= minWidth ? parsed.width : defaultWidth;
    const height = typeof parsed.height === 'number' && parsed.height >= minHeight ? parsed.height : defaultHeight;

    const candidateState: WindowState = {
      width,
      height,
      isMaximized: Boolean(parsed.isMaximized),
      isMinimized: Boolean(parsed.isMinimized),
    };

    if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
      if (isBoundsVisibleOnAnyDisplay({ x: parsed.x, y: parsed.y, width, height })) {
        candidateState.x = parsed.x;
        candidateState.y = parsed.y;
      }
    }

    return candidateState;
  } catch (error) {
    console.warn('[WindowState] Failed to load previous window state, using defaults:', error);
    return defaultState;
  }
}

/**
 * Attaches event listeners to the BrowserWindow to track and persist size, position,
 * maximized, and minimized states.
 */
export function manageWindowState(window: BrowserWindow, state: WindowState): () => void {
  let saveTimer: NodeJS.Timeout | null = null;

  const saveStateToDisk = () => {
    if (window.isDestroyed()) return;

    try {
      const filePath = getStateFilePath();
      const dir = path.dirname(filePath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf-8');
    } catch (error) {
      console.warn('[WindowState] Failed to save window state:', error);
    }
  };

  const scheduleSave = () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
    }
    saveTimer = setTimeout(saveStateToDisk, 400);
  };

  const updateNormalBounds = () => {
    if (window.isDestroyed()) return;

    // When the window is normal (not maximized and not minimized), capture bounds
    if (!window.isMaximized() && !window.isMinimized()) {
      const bounds = window.getBounds();
      state.x = bounds.x;
      state.y = bounds.y;
      state.width = bounds.width;
      state.height = bounds.height;
      state.isMaximized = false;
      state.isMinimized = false;
      scheduleSave();
    }
  };

  const onMaximize = () => {
    state.isMaximized = true;
    state.isMinimized = false;
    scheduleSave();
  };

  const onUnmaximize = () => {
    state.isMaximized = false;
    updateNormalBounds();
  };

  const onMinimize = () => {
    state.isMinimized = true;
    scheduleSave();
  };

  const onRestore = () => {
    state.isMinimized = false;
    if (window.isMaximized()) {
      state.isMaximized = true;
    } else {
      updateNormalBounds();
    }
  };

  const onClose = () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    // Update state flags before saving
    if (!window.isDestroyed()) {
      state.isMaximized = window.isMaximized();
      state.isMinimized = window.isMinimized();
      if (!state.isMaximized && !state.isMinimized) {
        const bounds = window.getBounds();
        state.x = bounds.x;
        state.y = bounds.y;
        state.width = bounds.width;
        state.height = bounds.height;
      }
    }
    saveStateToDisk();
  };

  window.on('resize', updateNormalBounds);
  window.on('move', updateNormalBounds);
  window.on('maximize', onMaximize);
  window.on('unmaximize', onUnmaximize);
  window.on('minimize', onMinimize);
  window.on('restore', onRestore);
  window.on('close', onClose);

  return () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
    }
    if (!window.isDestroyed()) {
      window.removeListener('resize', updateNormalBounds);
      window.removeListener('move', updateNormalBounds);
      window.removeListener('maximize', onMaximize);
      window.removeListener('unmaximize', onUnmaximize);
      window.removeListener('minimize', onMinimize);
      window.removeListener('restore', onRestore);
      window.removeListener('close', onClose);
    }
  };
}
