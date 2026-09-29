import { desktopCapturer, ipcMain, screen } from 'electron';

/**
 * Registers IPC handlers for window capture operations.
 * This allows the renderer to discover and capture PowerPoint slideshow windows.
 */
export function registerWindowCaptureIpc(): void {
  /**
   * Gets available window capture sources.
   * Filters for PowerPoint slideshow windows.
   */
  ipcMain.handle('capture:get-sources', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: screen.getPrimaryDisplay().workAreaSize,
      });

      // Filter for PowerPoint windows
      const pptSources = sources.filter((source) => {
        const name = source.name.toLowerCase();
        return (
          name.includes('powerpoint') ||
          name.includes('slideshow') ||
          name.includes('presentation') ||
          name.includes('ppt')
        );
      });

      return {
        success: true,
        sources: pptSources.map((source) => ({
          id: source.id,
          name: source.name,
          thumbnail: source.thumbnail?.toDataURL(),
        })),
      };
    } catch (error) {
      console.error('[WindowCapture] Failed to get sources:', error);
      return {
        success: false,
        error: (error as Error).message,
        sources: [],
      };
    }
  });

  /**
   * Gets all window sources (not filtered).
   * Useful for debugging or if the filter is too restrictive.
   */
  ipcMain.handle('capture:get-all-sources', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: screen.getPrimaryDisplay().workAreaSize,
      });

      return {
        success: true,
        sources: sources.map((source) => ({
          id: source.id,
          name: source.name,
          thumbnail: source.thumbnail?.toDataURL(),
        })),
      };
    } catch (error) {
      console.error('[WindowCapture] Failed to get all sources:', error);
      return {
        success: false,
        error: (error as Error).message,
        sources: [],
      };
    }
  });

  /**
   * Requests a refresh of capture sources.
   * Useful when a slideshow window is created/destroyed.
   */
  ipcMain.handle('capture:refresh-sources', async () => {
    // DesktopCapturer doesn't have a refresh method, but we can trigger a new request
    return { success: true };
  });
}
