import { ipcMain, BrowserWindow } from 'electron';
import { getPowerPointController, isPowerPointAvailable } from './PowerPointController';

/**
 * Registers IPC handlers for PowerPoint live control.
 * This should be called during app initialization in main.ts.
 */
export function registerPowerPointIpc(): void {
  const controller = getPowerPointController();

  // Initialize controller on app ready
  ipcMain.handle('powerpoint:is-available', async () => {
    return isPowerPointAvailable();
  });

  // Start the helper process when first called
  ipcMain.handle('powerpoint:open', async (_event, filePath: string) => {
    if (!controller.isReady()) {
      await controller.start();
    }
    return controller.open(filePath);
  });

  ipcMain.handle('powerpoint:start-slideshow', async (_event, options?: { windowed?: boolean; startSlide?: number }) => {
    if (!controller.isReady()) {
      throw new Error('PowerPoint helper is not ready. Please open a presentation first.');
    }
    return controller.startSlideshow(options);
  });

  ipcMain.handle('powerpoint:next', async () => {
    if (!controller.isReady()) {
      throw new Error('PowerPoint helper is not ready.');
    }
    return controller.next();
  });

  ipcMain.handle('powerpoint:prev', async () => {
    if (!controller.isReady()) {
      throw new Error('PowerPoint helper is not ready.');
    }
    return controller.prev();
  });

  ipcMain.handle('powerpoint:goto-slide', async (_event, slideNumber: number) => {
    if (!controller.isReady()) {
      throw new Error('PowerPoint helper is not ready.');
    }
    return controller.gotoSlide(slideNumber);
  });

  ipcMain.handle('powerpoint:get-state', async () => {
    if (!controller.isReady()) {
      throw new Error('PowerPoint helper is not ready.');
    }
    return controller.getState();
  });

  ipcMain.handle('powerpoint:get-slide-info', async () => {
    if (!controller.isReady()) {
      throw new Error('PowerPoint helper is not ready.');
    }
    return controller.getSlideInfo();
  });

  ipcMain.handle('powerpoint:end-slideshow', async () => {
    if (!controller.isReady()) {
      throw new Error('PowerPoint helper is not ready.');
    }
    return controller.endSlideshow();
  });

  ipcMain.handle('powerpoint:close', async () => {
    if (!controller.isReady()) {
      throw new Error('PowerPoint helper is not ready.');
    }
    return controller.close();
  });

  ipcMain.handle('powerpoint:quit', async () => {
    if (!controller.isReady()) {
      throw new Error('PowerPoint helper is not ready.');
    }
    return controller.quit();
  });

  // Forward controller events to renderer processes
  controller.on('slideChanged', (state) => {
    broadcastEvent('slideChanged', state);
  });

  controller.on('slideshowEnded', () => {
    broadcastEvent('slideshowEnded');
  });

  controller.on('presentationSaved', () => {
    broadcastEvent('presentationSaved');
  });

  controller.on('presentationClosed', () => {
    broadcastEvent('presentationClosed');
  });

  controller.on('powerpointCrashed', (error) => {
    broadcastEvent('powerpointCrashed', { error: error.message });
  });

  controller.on('helperConnected', () => {
    broadcastEvent('helperConnected');
  });

  controller.on('helperDisconnected', () => {
    broadcastEvent('helperDisconnected');
  });

  // Cleanup on app quit
  ipcMain.on('powerpoint:cleanup', async () => {
    await controller.stop();
  });
}

/**
 * Broadcasts an event to all renderer processes.
 */
function broadcastEvent(type: string, data?: unknown): void {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    if (!win.isDestroyed() && win.webContents) {
      try {
        win.webContents.send('powerpoint:event', { type, data });
      } catch (error) {
        console.warn('[PowerPointIpc] Failed to send event to window:', error);
      }
    }
  }
}
