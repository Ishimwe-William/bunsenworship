import { watch, FSWatcher } from 'chokidar';
import fs from 'node:fs';
import path from 'node:path';
import { BrowserWindow } from 'electron';
import { exportWithNativePowerPoint } from './presentationNativeEngine';
import { PresentationSyncPayload } from './types/presentation';
import { createHash } from 'node:crypto';

interface WatcherEntry {
  watcher: FSWatcher;
  debounceTimer: NodeJS.Timeout | null;
  lastParsedTimestamp: number;
  lastMtime: number;
  lastSize: number;
  lastHash: string;
  isRunning: boolean;
  currentSlideIndex: number;
  hasPendingChanges: boolean;
}

interface FileMetadata {
  mtime: number;
  size: number;
  hash: string;
}

export class PresentationWatcherManager {
  private watchers = new Map<string, WatcherEntry>();
  private onUpdateCallbacks = new Set<(payload: PresentationSyncPayload) => void>();
  private onPendingChangesCallbacks = new Set<(filePath: string) => void>();

  /**
   * Registers a global listener for presentation update payloads.
   */
  public onUpdate(callback: (payload: PresentationSyncPayload) => void): () => void {
    this.onUpdateCallbacks.add(callback);
    return () => {
      this.onUpdateCallbacks.delete(callback);
    };
  }

  /**
   * Registers a callback for pending changes notification.
   */
  public onPendingChanges(callback: (filePath: string) => void): () => void {
    this.onPendingChangesCallbacks.add(callback);
    return () => {
      this.onPendingChangesCallbacks.delete(callback);
    };
  }

  /**
   * Normalizes a file path to canonical lowercase on Windows.
   */
  private normalizePath(rawPath: string): string {
    const resolved = path.resolve(rawPath);
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
  }

  /**
   * Checks if a file is a PowerPoint lock file or temp file.
   */
  private isLockOrTempFile(filePath: string): boolean {
    const baseName = path.basename(filePath).toLowerCase();
    return baseName.startsWith('~$') || // PowerPoint lock file
           baseName.includes('~') || // Temp file
           baseName.startsWith('.tmp') ||
           baseName.endsWith('.tmp');
  }

  /**
   * Calculates a hash of file content for change detection.
   */
  private async calculateFileHash(filePath: string): Promise<string> {
    try {
      const buffer = fs.readFileSync(filePath);
      return createHash('md5').update(buffer).digest('hex');
    } catch (error) {
      console.warn('[Presentation Watcher] Failed to calculate file hash:', error);
      return '';
    }
  }

  /**
   * Gets file metadata for change detection.
   */
  private getFileMetadata(filePath: string): FileMetadata {
    try {
      const stats = fs.statSync(filePath);
      return {
        mtime: stats.mtimeMs,
        size: stats.size,
        hash: '', // Hash calculated separately for performance
      };
    } catch (error) {
      console.warn('[Presentation Watcher] Failed to get file metadata:', error);
      return { mtime: 0, size: 0, hash: '' };
    }
  }

  /**
   * Checks if a file has actually changed based on metadata and content hash.
   */
  private async hasFileChanged(filePath: string, metadata: FileMetadata, lastMetadata: FileMetadata): Promise<boolean> {
    // Quick check: mtime or size changed
    if (metadata.mtime !== lastMetadata.mtime || metadata.size !== lastMetadata.size) {
      return true;
    }

    // Deep check: content hash
    const currentHash = await this.calculateFileHash(filePath);
    return currentHash !== lastMetadata.hash;
  }

  /**
   * Reads a file with retries to handle temporary locks.
   */
  private async readFileWithRetry(filePath: string, maxRetries = 5, delayMs = 120): Promise<Buffer> {
    let lastError: unknown;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return fs.readFileSync(filePath);
      } catch (err: unknown) {
        lastError = err;
        const code = (err as { code?: string })?.code;
        if (code === 'EBUSY' || code === 'EPERM' || code === 'EACCES') {
          await new Promise((resolve) => setTimeout(resolve, delayMs * (i + 1)));
        } else {
          throw err;
        }
      }
    }
    throw lastError;
  }

  /**
   * Sets the running state for a watched file.
   */
  public setRunningState(filePath: string, isRunning: boolean, currentSlideIndex = 0): void {
    const normalized = this.normalizePath(filePath);
    const entry = this.watchers.get(normalized);
    if (entry) {
      entry.isRunning = isRunning;
      entry.currentSlideIndex = currentSlideIndex;
      console.log(`[Presentation Watcher] Set running state for ${filePath}: ${isRunning}, slide ${currentSlideIndex}`);
    }
  }

  /**
   * Gets the running state for a watched file.
   */
  public getRunningState(filePath: string): { isRunning: boolean; currentSlideIndex: number } {
    const normalized = this.normalizePath(filePath);
    const entry = this.watchers.get(normalized);
    if (entry) {
      return { isRunning: entry.isRunning, currentSlideIndex: entry.currentSlideIndex };
    }
    return { isRunning: false, currentSlideIndex: 0 };
  }

  /**
   * Applies pending changes for a file.
   */
  public async applyPendingChanges(filePath: string): Promise<void> {
    const normalized = this.normalizePath(filePath);
    const entry = this.watchers.get(normalized);
    if (entry && entry.hasPendingChanges) {
      console.log(`[Presentation Watcher] Applying pending changes for ${filePath}`);
      entry.hasPendingChanges = false;
      await this.triggerParse(filePath, entry);
    }
  }

  /**
   * Starts watching a PPTX presentation file.
   * Debounces change events by 500-1000ms to avoid partial file write locks while PowerPoint is saving.
   */
  public async watch(targetFilePath: string): Promise<void> {
    if (!targetFilePath || typeof targetFilePath !== 'string') return;

    const normalized = this.normalizePath(targetFilePath);
    if (!fs.existsSync(normalized)) {
      console.warn(`[Presentation Watcher] File does not exist: ${targetFilePath}`);
      return;
    }

    if (this.watchers.has(normalized)) {
      console.log(`[Presentation Watcher] Already watching: ${targetFilePath}`);
      return;
    }

    console.log(`[Presentation Watcher] Initializing watcher for: ${targetFilePath}`);

    // Configure chokidar with write-stability protection
    const watcher = watch(normalized, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 800,
        pollInterval: 150,
      },
      ignorePermissionErrors: true,
    });

    const initialMetadata = this.getFileMetadata(targetFilePath);
    const initialHash = await this.calculateFileHash(targetFilePath);

    const entry: WatcherEntry = {
      watcher,
      debounceTimer: null,
      lastParsedTimestamp: 0,
      lastMtime: initialMetadata.mtime,
      lastSize: initialMetadata.size,
      lastHash: initialHash,
      isRunning: false,
      currentSlideIndex: 0,
      hasPendingChanges: false,
    };

    const triggerParse = async () => {
      await this.triggerParse(targetFilePath, entry);
    };

    const debouncedOnChange = () => {
      if (entry.debounceTimer) {
        clearTimeout(entry.debounceTimer);
      }
      entry.debounceTimer = setTimeout(() => {
        entry.debounceTimer = null;
        triggerParse();
      }, 800); // Increased debounce for better PowerPoint save handling
    };

    watcher.on('change', debouncedOnChange);
    watcher.on('add', debouncedOnChange);

    watcher.on('error', (err) => {
      console.warn(`[Presentation Watcher] Watcher error for ${targetFilePath}:`, err);
    });

    watcher.on('unlink', () => {
      console.log(`[Presentation Watcher] Target file removed: ${targetFilePath}`);
      this.notifyFileMissing(targetFilePath);
    });

    this.watchers.set(normalized, entry);
  }

  /**
   * Triggers parsing of a presentation file.
   */
  private async triggerParse(filePath: string, entry: WatcherEntry): Promise<void> {
    console.log(`[Presentation Watcher] Change detected on ${filePath}. Checking for actual changes...`);

    try {
      // Check if file still exists
      if (!fs.existsSync(filePath)) {
        console.warn(`[Presentation Watcher] File no longer exists: ${filePath}`);
        this.notifyFileMissing(filePath);
        return;
      }

      // Check if it's a lock file or temp file
      if (this.isLockOrTempFile(filePath)) {
        console.log(`[Presentation Watcher] Ignoring lock/temp file: ${filePath}`);
        return;
      }

      // Check if file has actually changed
      const currentMetadata = this.getFileMetadata(filePath);
      const currentHash = await this.calculateFileHash(filePath);
      const hasChanged = await this.hasFileChanged(filePath, currentMetadata, {
        mtime: entry.lastMtime,
        size: entry.lastSize,
        hash: entry.lastHash,
      });

      if (!hasChanged) {
        console.log(`[Presentation Watcher] File content unchanged, skipping parse: ${filePath}`);
        return;
      }

      console.log(`[Presentation Watcher] File has changed, re-parsing presentation: ${filePath}`);

      // Try to read file with retries (PowerPoint may have it locked)
      await this.readFileWithRetry(filePath);

      const result = await exportWithNativePowerPoint(filePath);
      if (!result.ok || !result.slides) {
        console.warn(`[Presentation Watcher] Background re-parse failed: ${result.error}`);
        return;
      }

      // Update metadata
      entry.lastParsedTimestamp = Date.now();
      entry.lastMtime = currentMetadata.mtime;
      entry.lastSize = currentMetadata.size;
      entry.lastHash = currentHash;

      // Handle based on running state
      if (entry.isRunning) {
        console.log(`[Presentation Watcher] Presentation is running, marking as pending changes: ${filePath}`);
        entry.hasPendingChanges = true;
        this.notifyPendingChanges(filePath);
      } else {
        console.log(`[Presentation Watcher] Presentation is idle, applying changes immediately: ${filePath}`);
        entry.hasPendingChanges = false;

        const payload: PresentationSyncPayload = {
          filePath,
          title: result.title || path.basename(filePath, path.extname(filePath)),
          slideCount: result.slideCount || result.slides.length,
          slides: result.slides,
          timestamp: entry.lastParsedTimestamp,
        };

        console.log(
          `[Presentation Watcher] Successfully re-parsed ${payload.slideCount} slides for "${payload.title}". Broadcasting to renderer...`
        );

        // Notify registered callbacks
        for (const cb of this.onUpdateCallbacks) {
          try {
            cb(payload);
          } catch (err) {
            console.error('[Presentation Watcher] Error in update callback:', err);
          }
        }

        // Broadcast to all open Electron BrowserWindow instances
        this.broadcastToWindows(payload);
      }
    } catch (err) {
      console.error('[Presentation Watcher] Unexpected error during background re-parse:', err);
    }
  }

  /**
   * Notifies listeners that a file has pending changes.
   */
  private notifyPendingChanges(filePath: string): void {
    for (const cb of this.onPendingChangesCallbacks) {
      try {
        cb(filePath);
      } catch (err) {
        console.error('[Presentation Watcher] Error in pending changes callback:', err);
      }
    }
  }

  /**
   * Notifies listeners that a file is missing.
   */
  private notifyFileMissing(filePath: string): void {
    console.warn(`[Presentation Watcher] File missing: ${filePath}`);
    // Could emit a special event for missing files
  }

  /**
   * Broadcasts the updated slide payload dynamically to all active Renderer process windows.
   */
  private broadcastToWindows(payload: PresentationSyncPayload): void {
    if (!BrowserWindow || typeof BrowserWindow.getAllWindows !== 'function') {
      return;
    }
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      if (!win.isDestroyed() && win.webContents) {
        try {
          win.webContents.send('presentation:sync-update', payload);
        } catch (err) {
          console.warn('[Presentation Watcher] Failed to dispatch sync payload to window:', err);
        }
      }
    }
  }

  /**
   * Stops watching a specific PPTX file.
   */
  public unwatch(targetFilePath: string): void {
    const normalized = this.normalizePath(targetFilePath);
    const entry = this.watchers.get(normalized);
    if (entry) {
      if (entry.debounceTimer) {
        clearTimeout(entry.debounceTimer);
      }
      entry.watcher.close().catch((err) => {
        console.warn(`[Presentation Watcher] Error closing watcher for ${targetFilePath}:`, err);
      });
      this.watchers.delete(normalized);
      console.log(`[Presentation Watcher] Unwatched: ${targetFilePath}`);
    }
  }

  /**
   * Stops watching all presentations (e.g. on application exit).
   */
  public unwatchAll(): void {
    for (const [key, entry] of this.watchers.entries()) {
      if (entry.debounceTimer) {
        clearTimeout(entry.debounceTimer);
      }
      entry.watcher.close().catch((err) => {
        console.debug('Error closing watcher during unwatchAll:', err);
      });
      this.watchers.delete(key);
    }
  }

  /**
   * Returns list of currently watched file paths.
   */
  public getWatchedPaths(): string[] {
    return Array.from(this.watchers.keys());
  }

  /**
   * Returns the watcher entry for a specific file.
   */
  public getWatcherEntry(filePath: string): WatcherEntry | undefined {
    const normalized = this.normalizePath(filePath);
    return this.watchers.get(normalized);
  }
}

export const presentationWatcher = new PresentationWatcherManager();
