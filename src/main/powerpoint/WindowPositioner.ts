import { screen, BrowserWindow } from 'electron';

/**
 * Utility functions for positioning PowerPoint slideshow windows
 * for optimal capture by the projector window.
 */
export class WindowPositioner {
  /**
   * Positions a window off-screen or in a specific location for capture.
   * PowerPoint windows should not be minimized (stops rendering) but can be
   * positioned off-screen or behind the projector window.
   */
  static positionForCapture(
    targetDisplayId?: number,
    options?: {
      offscreen?: boolean;
      behindProjector?: boolean;
    }
  ): { x: number; y: number; width: number; height: number } {
    const allDisplays = screen.getAllDisplays();
    let targetDisplay = screen.getPrimaryDisplay();

    if (typeof targetDisplayId === 'number') {
      const requested = allDisplays.find((d) => d.id === targetDisplayId);
      if (requested) {
        targetDisplay = requested;
      }
    }

    const bounds = targetDisplay.bounds;

    if (options?.offscreen) {
      // Position off-screen to the right
      return {
        x: bounds.x + bounds.width + 100,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      };
    }

    if (options?.behindProjector) {
      // Position at the same location but behind (z-order)
      return {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      };
    }

    // Default: position at the target display location
    return {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    };
  }

  /**
   * Gets the bounds for the projector window on a specific display.
   */
  static getProjectorBounds(displayId?: number): { x: number; y: number; width: number; height: number } {
    const allDisplays = screen.getAllDisplays();
    let targetDisplay = screen.getPrimaryDisplay();

    if (typeof displayId === 'number') {
      const requested = allDisplays.find((d) => d.id === displayId);
      if (requested) {
        targetDisplay = requested;
      }
    }

    return targetDisplay.bounds;
  }

  /**
   * Finds windows matching a title pattern.
   * This is used to locate PowerPoint slideshow windows.
   */
  static findWindowsByTitle(pattern: RegExp): Array<{ title: string; bounds: { x: number; y: number; width: number; height: number } }> {
    // Note: Electron doesn't provide direct access to enumerate all windows
    // This would need to be implemented via native modules or the helper process
    // For now, this is a placeholder for future implementation
    return [];
  }
}
