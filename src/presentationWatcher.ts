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
  activeAbortController: AbortController | null;
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
    return (
      baseName.startsWith('~$') ||
      baseName.includes('~') ||
      baseName.startsWith('.tmp') ||
      baseName.endsWith('.tmp')
    );
  }

  /**
   * Calculates a hash of file content for change detection asynchronously to prevent
   * blocking the Electron main thread during large PowerPoint file checks.
   */
  private async calculateFileHash(filePath: string): Promise<string> {
    try {
      let buffer: Buffer | undefined;
      if (fs.promises && typeof fs.promises.readFile === 'function') {
        buffer = await fs.promises.readFile(filePath);
      } else if (typeof fs.readFileSync === 'function') {
        buffer = fs.readFileSync(filePath);
      }
      if (!buffer) return '';
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
        mtime: stats?.mtimeMs || 0,
        size: stats?.size || 0,
        hash: '',
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
    if (metadata.mtime !== lastMetadata.mtime || metadata.size !== lastMetadata.size) {
      return true;
    }
    const currentHash = await this.calculateFileHash(filePath);
    return currentHash !== lastMetadata.hash;
  }

  /**
   * Reads a file asynchronously with retries to handle temporary locks without
   * blocking the Electron main thread.
   */
  private async readFileWithRetry(filePath: string, maxRetries = 5, delayMs = 120): Promise<Buffer> {
    let lastError: unknown;
    for (let i = 0; i < maxRetries; i++) {
      try {
        if (fs.promises && typeof fs.promises.readFile === 'function') {
          return await fs.promises.readFile(filePath);
        }
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
      await this.triggerParse(filePath, entry, true);
    }
  }

  /**
   * Starts watching a PPTX presentation file.
   * Debounces change events by 800ms to avoid partial file write locks while PowerPoint is saving.
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
      activeAbortController: null,
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
      }, 800);
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
   * Triggers parsing of a presentation file with cancellation, coalescing,
   * prioritized lazy export, and live show gating.
   */
  private async triggerParse(filePath: string, entry: WatcherEntry, force = false): Promise<void> {
    console.log(`[Presentation Watcher] Change detected on ${filePath}. Checking for actual changes...`);

    try {
      if (!fs.existsSync(filePath)) {
        console.warn(`[Presentation Watcher] File no longer exists: ${filePath}`);
        this.notifyFileMissing(filePath);
        return;
      }

      if (this.isLockOrTempFile(filePath)) {
        console.log(`[Presentation Watcher] Ignoring lock/temp file: ${filePath}`);
        return;
      }

      const currentMetadata = this.getFileMetadata(filePath);
      const currentHash = await this.calculateFileHash(filePath);

      if (!force) {
        const hasChanged = await this.hasFileChanged(filePath, currentMetadata, {
          mtime: entry.lastMtime,
          size: entry.lastSize,
          hash: entry.lastHash,
        });

        if (!hasChanged) {
          console.log(`[Presentation Watcher] File content unchanged, skipping parse: ${filePath}`);
          return;
        }
      }

      console.log(`[Presentation Watcher] File has changed, re-parsing presentation: ${filePath}`);

      // Wait for write lock to clear
      await this.readFileWithRetry(filePath);

      // Cancel/supersede any existing in-flight export (coalescing)
      if (entry.activeAbortController) {
        console.log(`[Presentation Watcher] Cancelling previous in-flight export for ${filePath}`);
        entry.activeAbortController.abort();
        entry.activeAbortController = null;
      }

      const abortController = new AbortController();
      entry.activeAbortController = abortController;

      // Handle intermediate batches (e.g. priority slides during initial open)
      const onProgressBatch = (batchPayload: PresentationSyncPayload) => {
        if (abortController.signal.aborted) return;
        if (!entry.isRunning) {
          this.notifyUpdate(batchPayload);
          this.broadcastToWindows(batchPayload);
        }
      };

      const result = await exportWithNativePowerPoint(filePath, 1920, abortController.signal, onProgressBatch);

      if (abortController.signal.aborted) {
        console.log(`[Presentation Watcher] Export for ${filePath} was superseded/aborted.`);
        return;
      }

      entry.activeAbortController = null;

      if (!result.ok || !result.slides) {
        console.warn(`[Presentation Watcher] Background re-parse failed: ${result.error}`);
        return;
      }

      entry.lastParsedTimestamp = Date.now();
      entry.lastMtime = currentMetadata.mtime;
      entry.lastSize = currentMetadata.size;
      entry.lastHash = currentHash;

      // Gate live show updates: if show is currently running, mark changes pending
      if (entry.isRunning) {
        console.log(`[Presentation Watcher] Presentation is running live, marking changes as pending: ${filePath}`);
        entry.hasPendingChanges = true;
        this.notifyPendingChanges(filePath);
      } else {
        console.log(`[Presentation Watcher] Presentation is idle, applying incremental changes: ${filePath}`);
        entry.hasPendingChanges = false;

        const payload: PresentationSyncPayload = {
          filePath,
          title: result.title || path.basename(filePath, path.extname(filePath)),
          slideCount: result.slideCount || result.slides.length,
          slides: result.slides,
          timestamp: entry.lastParsedTimestamp,
          isIncremental: result.isIncremental,
        };

        console.log(
          `[Presentation Watcher] Successfully updated ${payload.slideCount} slides for "${payload.title}". Broadcasting to renderer...`
        );

        this.notifyUpdate(payload);
        this.broadcastToWindows(payload);
      }
    } catch (err) {
      console.error('[Presentation Watcher] Unexpected error during background re-parse:', err);
    } finally {
      if (entry.activeAbortController?.signal.aborted) {
        entry.activeAbortController = null;
      }
    }
  }

  /**
   * Dispatches payload to in-process listeners.
   */
  private notifyUpdate(payload: PresentationSyncPayload): void {
    for (const cb of this.onUpdateCallbacks) {
      try {
        cb(payload);
      } catch (err) {
        console.error('[Presentation Watcher] Error in update callback:', err);
      }
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
   * Stops watching a specific PPTX file and cancels any in-flight export.
   */
  public unwatch(targetFilePath: string): void {
    const normalized = this.normalizePath(targetFilePath);
    const entry = this.watchers.get(normalized);
    if (entry) {
      if (entry.debounceTimer) {
        clearTimeout(entry.debounceTimer);
      }
      if (entry.activeAbortController) {
        entry.activeAbortController.abort();
        entry.activeAbortController = null;
      }
      entry.watcher.close().catch((err) => {
        console.warn(`[Presentation Watcher] Error closing watcher for ${targetFilePath}:`, err);
      });
      this.watchers.delete(normalized);
      console.log(`[Presentation Watcher] Unwatched: ${targetFilePath}`);
    }
  }

  /**
   * Stops watching all presentations and aborts any active in-flight exports.
   */
  public unwatchAll(): void {
    for (const [key, entry] of this.watchers.entries()) {
      if (entry.debounceTimer) {
        clearTimeout(entry.debounceTimer);
      }
      if (entry.activeAbortController) {
        entry.activeAbortController.abort();
        entry.activeAbortController = null;
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
