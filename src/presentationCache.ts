import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';

export interface CachedSlide {
  sldId: string;
  slideIndex: number;
  contentHash: string;
  imagePath: string;
  title?: string;
  lines?: string[];
  width?: number;
  height?: number;
}

export interface PresentationDeckCache {
  filePath: string;
  lastUpdated: number;
  width: number;
  height: number;
  aspectRatio: number;
  slides: Record<string, CachedSlide>; // Keyed by sldId
  orderedSldIds: string[];
}

/**
 * Manages per-deck persistent slide cache on disk.
 * Preserves rendered slide images and content hashes keyed by sldId.
 */
export class PresentationCacheManager {
  private baseDir: string;

  constructor(customBaseDir?: string) {
    if (customBaseDir) {
      this.baseDir = customBaseDir;
    } else {
      try {
        // Attempt to load Electron app path
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { app } = require('electron');
        if (app && typeof app.getPath === 'function') {
          this.baseDir = path.join(app.getPath('userData'), 'presentation-cache');
        } else {
          this.baseDir = path.join(os.tmpdir(), 'bunsen-presentation-cache');
        }
      } catch {
        this.baseDir = path.join(os.tmpdir(), 'bunsen-presentation-cache');
      }
    }

    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
    } catch (err) {
      console.warn('[PresentationCache] Could not create cache base directory:', err);
    }
  }

  /**
   * Generates a deterministic directory name for a presentation file path.
   */
  public getDeckCacheKey(filePath: string): string {
    const normalized = path.resolve(filePath).toLowerCase();
    const hash = createHash('sha256').update(normalized).digest('hex').slice(0, 16);
    const sanitizedName = path.basename(filePath, path.extname(filePath)).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    return `${sanitizedName}-${hash}`;
  }

  /**
   * Returns the directory path for a presentation's cache.
   */
  public getDeckCacheDir(filePath: string): string {
    const key = this.getDeckCacheKey(filePath);
    return path.join(this.baseDir, key);
  }

  /**
   * Returns path for manifest.json of a presentation.
   */
  public getManifestPath(filePath: string): string {
    return path.join(this.getDeckCacheDir(filePath), 'manifest.json');
  }

  /**
   * Returns the destination path for an exported slide image.
   */
  public getSlideImagePath(filePath: string, sldId: string): string {
    const deckDir = this.getDeckCacheDir(filePath);
    return path.join(deckDir, `slide-${sldId}.png`);
  }

  /**
   * Loads the cached manifest for a presentation file.
   */
  public loadCache(filePath: string): PresentationDeckCache | null {
    try {
      const manifestPath = this.getManifestPath(filePath);
      if (!fs.existsSync(manifestPath)) {
        return null;
      }
      const raw = fs.readFileSync(manifestPath, 'utf8');
      const data = JSON.parse(raw) as PresentationDeckCache;
      if (!data || !data.slides) {
        return null;
      }
      return data;
    } catch (err) {
      console.warn(`[PresentationCache] Failed to load cache for ${filePath}:`, err);
      return null;
    }
  }

  /**
   * Saves the manifest for a presentation file atomically.
   */
  public saveCache(cache: PresentationDeckCache): void {
    try {
      const deckDir = this.getDeckCacheDir(cache.filePath);
      if (!fs.existsSync(deckDir)) {
        fs.mkdirSync(deckDir, { recursive: true });
      }
      const manifestPath = path.join(deckDir, 'manifest.json');
      const tempPath = `${manifestPath}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(cache, null, 2), 'utf8');
      fs.renameSync(tempPath, manifestPath);
    } catch (err) {
      console.warn(`[PresentationCache] Failed to save cache for ${cache.filePath}:`, err);
    }
  }

  /**
   * Updates or inserts a single slide entry into the deck cache.
   */
  public updateSlide(filePath: string, slide: CachedSlide, totalDimensions?: { width: number; height: number }): void {
    const cache = this.loadCache(filePath) || {
      filePath,
      lastUpdated: Date.now(),
      width: totalDimensions?.width || 1920,
      height: totalDimensions?.height || 1080,
      aspectRatio: (totalDimensions?.width || 1920) / (totalDimensions?.height || 1080),
      slides: {},
      orderedSldIds: [],
    };

    cache.slides[slide.sldId] = slide;
    if (!cache.orderedSldIds.includes(slide.sldId)) {
      cache.orderedSldIds.push(slide.sldId);
    }
    cache.lastUpdated = Date.now();
    this.saveCache(cache);
  }

  /**
   * Removes removed slide images and manifest entries from disk.
   */
  public purgeRemovedSlides(filePath: string, currentSldIds: string[]): void {
    const cache = this.loadCache(filePath);
    if (!cache) return;

    const currentSet = new Set(currentSldIds);
    let changed = false;

    for (const sldId of Object.keys(cache.slides)) {
      if (!currentSet.has(sldId)) {
        const slide = cache.slides[sldId];
        if (slide && slide.imagePath && fs.existsSync(slide.imagePath)) {
          try {
            fs.unlinkSync(slide.imagePath);
          } catch {
            // Ignore deletion errors
          }
        }
        delete cache.slides[sldId];
        changed = true;
      }
    }

    cache.orderedSldIds = cache.orderedSldIds.filter((id) => currentSet.has(id));
    if (changed) {
      this.saveCache(cache);
    }
  }

  /**
   * Completely clears the cache directory for a given deck.
   */
  public clearCache(filePath: string): void {
    try {
      const deckDir = this.getDeckCacheDir(filePath);
      if (fs.existsSync(deckDir)) {
        fs.rmSync(deckDir, { recursive: true, force: true });
      }
    } catch (err) {
      console.warn(`[PresentationCache] Failed to clear cache for ${filePath}:`, err);
    }
  }
}

export const presentationCache = new PresentationCacheManager();
