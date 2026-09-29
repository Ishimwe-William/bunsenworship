import AdmZip from 'adm-zip';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { PresentationDeckCache, CachedSlide } from './presentationCache';

export interface SlidePartInfo {
  sldId: string;
  rId: string;
  slidePath: string; // e.g. "ppt/slides/slide1.xml"
  slideIndex: number; // 0-based presentation order
  contentHash: string; // Composite hash including XML, media, layout, master, theme
  title?: string;
  lines?: string[];
}

export interface DeckStructure {
  filePath: string;
  slideCount: number;
  slides: SlidePartInfo[];
  width: number;
  height: number;
  aspectRatio: number;
  title: string;
}

export type SlideDiffStatus = 'unchanged' | 'changed' | 'added' | 'removed' | 'reordered';

export interface SlideDiffItem {
  sldId: string;
  status: SlideDiffStatus;
  slideIndex: number; // Current 0-based index
  previousSlideIndex?: number;
  contentHash: string;
  previousContentHash?: string;
  cachedImagePath?: string;
  slidePath: string;
  cachedSlide?: CachedSlide;
  title?: string;
  lines?: string[];
}

export interface DeckDiffResult {
  hasChanges: boolean;
  needsExport: boolean;
  slides: SlideDiffItem[];
  removedSldIds: string[];
  addedCount: number;
  changedCount: number;
  removedCount: number;
  reorderedCount: number;
  unchangedCount: number;
  totalSlides: number;
}

/**
 * Normalizes entry paths inside a zip to lowercase and forward slashes.
 */
function normalizeEntryPath(p: string): string {
  return p.replace(/\\/g, '/').toLowerCase();
}

/**
 * Resolves a relative relationship target against a base directory inside the zip.
 */
function resolveZipTarget(baseDir: string, target: string): string {
  const cleanTarget = target.replace(/\\/g, '/');
  if (cleanTarget.startsWith('/')) {
    return cleanTarget.slice(1);
  }
  const joined = path.posix.join(baseDir, cleanTarget);
  return path.posix.normalize(joined);
}

/**
 * Extracts relationships from a .rels XML string.
 */
function extractRelationships(relsXml: string, baseDir: string): Map<string, { type: string; target: string; fullTarget: string }> {
  const result = new Map<string, { type: string; target: string; fullTarget: string }>();
  const relMatches = relsXml.matchAll(/<Relationship\s+([^>]+)\/?>/gi);
  for (const m of relMatches) {
    const attrs = m[1];
    const idMatch = attrs.match(/\bId=[\"']([^\"']+)[\"']/i);
    const typeMatch = attrs.match(/\bType=[\"']([^\"']+)[\"']/i);
    const targetMatch = attrs.match(/\bTarget=[\"']([^\"']+)[\"']/i);
    if (idMatch && targetMatch) {
      const id = idMatch[1];
      const type = typeMatch ? typeMatch[1] : '';
      const rawTarget = targetMatch[1];
      const fullTarget = resolveZipTarget(baseDir, rawTarget);
      result.set(id, { type, target: rawTarget, fullTarget });
    }
  }
  return result;
}

/**
 * Slide differ that parses .pptx zip structures without Microsoft PowerPoint,
 * mapping sldId to content hashes including layouts, masters, themes, and media.
 */
export class PresentationDiffer {
  /**
   * Parses the deck structure and calculates per-slide composite hashes.
   */
  public parseDeckStructure(source: string | Buffer, filePath = ''): DeckStructure {
    let zip: AdmZip;
    if (Buffer.isBuffer(source)) {
      zip = new AdmZip(source);
    } else {
      filePath = source;
      zip = new AdmZip(source);
    }

    const entries = zip.getEntries();
    const entryMap = new Map<string, AdmZip.IZipEntry>();
    for (const e of entries) {
      entryMap.set(normalizeEntryPath(e.entryName), e);
    }

    const getEntry = (p: string): AdmZip.IZipEntry | undefined => {
      return entryMap.get(normalizeEntryPath(p));
    };

    const getEntryText = (p: string): string | null => {
      const entry = getEntry(p);
      return entry ? entry.getData().toString('utf8') : null;
    };

    const hashEntryData = (p: string): string => {
      const entry = getEntry(p);
      if (!entry) return 'missing';
      return createHash('sha256').update(entry.getData()).digest('hex');
    };

    // Fast media hash using zip header CRC32 and uncompressed size
    const hashMediaEntry = (p: string): string => {
      const entry = getEntry(p);
      if (!entry) return 'missing';
      return `${entry.header.crc.toString(16)}:${entry.header.size}`;
    };

    // 1. Read presentation.xml
    const presText = getEntryText('ppt/presentation.xml');
    if (!presText) {
      throw new Error('Invalid PPTX archive: ppt/presentation.xml is missing');
    }

    // Determine dimensions (default 16:9 = 1920x1080)
    let width = 1920;
    let height = 1080;
    const sldSzMatch = presText.match(/<[a-zA-Z0-9:]*sldSz\s+([^>]+)\/?>/i);
    if (sldSzMatch) {
      const cxMatch = sldSzMatch[1].match(/\bcx=[\"'](\d+)[\"']/i);
      const cyMatch = sldSzMatch[1].match(/\bcy=[\"'](\d+)[\"']/i);
      if (cxMatch && cyMatch) {
        const cx = parseInt(cxMatch[1], 10);
        const cy = parseInt(cyMatch[1], 10);
        if (cx > 0 && cy > 0) {
          const ratio = cx / cy;
          width = 1920;
          height = Math.max(300, Math.round(width / ratio));
        }
      }
    }
    const aspectRatio = width / height;

    // 2. Read presentation.xml.rels
    const presRelsText = getEntryText('ppt/_rels/presentation.xml.rels');
    if (!presRelsText) {
      throw new Error('Invalid PPTX archive: ppt/_rels/presentation.xml.rels is missing');
    }
    const presRels = extractRelationships(presRelsText, 'ppt');

    // 3. Extract ordered sldId list
    interface RawSlideId {
      sldId: string;
      rId: string;
    }
    const orderedSldIds: RawSlideId[] = [];
    const sldIdMatches = presText.matchAll(/<[a-zA-Z0-9:]*sldId\s+([^>]+)\/?>/gi);
    for (const m of sldIdMatches) {
      const attrs = m[1];
      const idMatch = attrs.match(/\bid=[\"']([^\"']+)[\"']/i);
      const rIdMatch = attrs.match(/\b(?:r:)?id=[\"'](rId[^\"']+)[\"']/i) || attrs.match(/\br:id=[\"']([^\"']+)[\"']/i);
      if (idMatch && rIdMatch) {
        orderedSldIds.push({
          sldId: idMatch[1],
          rId: rIdMatch[1],
        });
      }
    }

    // Memoization caches for layout, master, and theme parts across the deck
    const themeCache = new Map<string, string>();
    const getThemeHash = (themePath: string): string => {
      const norm = normalizeEntryPath(themePath);
      if (themeCache.has(norm)) return themeCache.get(norm)!;
      const h = hashEntryData(norm);
      themeCache.set(norm, h);
      return h;
    };

    const masterCache = new Map<string, string>();
    const getMasterHash = (masterPath: string): string => {
      const norm = normalizeEntryPath(masterPath);
      if (masterCache.has(norm)) return masterCache.get(norm)!;
      let h = hashEntryData(norm);

      // Check master rels for theme and media
      const masterDir = path.posix.dirname(norm);
      const masterBase = path.posix.basename(norm);
      const masterRelsPath = `${masterDir}/_rels/${masterBase}.rels`;
      const masterRelsText = getEntryText(masterRelsPath);
      if (masterRelsText) {
        h += `:${createHash('sha256').update(masterRelsText).digest('hex')}`;
        const masterRels = extractRelationships(masterRelsText, masterDir);
        for (const rel of masterRels.values()) {
          if (rel.type.includes('theme')) {
            h += `:theme=${getThemeHash(rel.fullTarget)}`;
          } else if (rel.type.includes('image') || rel.type.includes('media')) {
            h += `:media=${hashMediaEntry(rel.fullTarget)}`;
          }
        }
      }
      masterCache.set(norm, h);
      return h;
    };

    const layoutCache = new Map<string, string>();
    const getLayoutHash = (layoutPath: string): string => {
      const norm = normalizeEntryPath(layoutPath);
      if (layoutCache.has(norm)) return layoutCache.get(norm)!;
      let h = hashEntryData(norm);

      // Check layout rels for master and media
      const layoutDir = path.posix.dirname(norm);
      const layoutBase = path.posix.basename(norm);
      const layoutRelsPath = `${layoutDir}/_rels/${layoutBase}.rels`;
      const layoutRelsText = getEntryText(layoutRelsPath);
      if (layoutRelsText) {
        h += `:${createHash('sha256').update(layoutRelsText).digest('hex')}`;
        const layoutRels = extractRelationships(layoutRelsText, layoutDir);
        for (const rel of layoutRels.values()) {
          if (rel.type.includes('slideMaster')) {
            h += `:master=${getMasterHash(rel.fullTarget)}`;
          } else if (rel.type.includes('image') || rel.type.includes('media')) {
            h += `:media=${hashMediaEntry(rel.fullTarget)}`;
          }
        }
      }
      layoutCache.set(norm, h);
      return h;
    };

    // 4. Map each slide and compute composite hash + extracted text lines
    const slides: SlidePartInfo[] = [];

    for (let index = 0; index < orderedSldIds.length; index++) {
      const { sldId, rId } = orderedSldIds[index];
      const rel = presRels.get(rId);
      if (!rel) continue;

      const slidePath = rel.fullTarget;
      const hasher = createHash('sha256');

      // 4a. Slide XML
      const slideEntry = getEntry(slidePath);
      const slideXmlString = slideEntry ? slideEntry.getData().toString('utf8') : '';
      if (slideXmlString) {
        hasher.update(slideXmlString);
      } else {
        hasher.update('slide-missing');
      }

      // Fast extraction of slide text lines for lightweight rendering before full render
      const slideLines: string[] = [];
      let slideTitle = `Slide ${index + 1}`;
      if (slideXmlString) {
        const pMatches = slideXmlString.matchAll(/<[a-zA-Z0-9:]*p\b[^>]*>([\s\S]*?)<\/[a-zA-Z0-9:]*p>/gi);
        for (const pm of pMatches) {
          const tMatches = Array.from(pm[1].matchAll(/<[a-zA-Z0-9:]*t\b[^>]*>([^<]+)<\/[a-zA-Z0-9:]*t>/gi)).map((m) => m[1]);
          const line = tMatches.join('').trim();
          if (line) {
            slideLines.push(line);
          }
        }
        if (slideLines.length > 0) {
          slideTitle = slideLines[0];
        }
      }

      // 4b. Slide rels + referenced media + layout
      const slideDir = path.posix.dirname(slidePath);
      const slideBase = path.posix.basename(slidePath);
      const slideRelsPath = `${slideDir}/_rels/${slideBase}.rels`;
      const slideRelsText = getEntryText(slideRelsPath);

      if (slideRelsText) {
        hasher.update(slideRelsText);
        const slideRels = extractRelationships(slideRelsText, slideDir);
        for (const r of slideRels.values()) {
          if (r.type.includes('slideLayout')) {
            hasher.update(`:layout=${getLayoutHash(r.fullTarget)}`);
          } else if (r.type.includes('image') || r.type.includes('media') || r.type.includes('video') || r.type.includes('audio')) {
            hasher.update(`:media=${hashMediaEntry(r.fullTarget)}`);
          }
        }
      }

      const contentHash = hasher.digest('hex');
      slides.push({
        sldId,
        rId,
        slidePath,
        slideIndex: index,
        contentHash,
        title: slideTitle,
        lines: slideLines,
      });
    }

    const title = filePath ? path.basename(filePath, path.extname(filePath)) : 'Presentation';

    return {
      filePath,
      slideCount: slides.length,
      slides,
      width,
      height,
      aspectRatio,
      title,
    };
  }

  /**
   * Compares the current deck structure against the persisted cache.
   * Classifies slides into unchanged, changed, added, removed, or reordered.
   * Note: Reordering alone does NOT trigger export!
   */
  public diffDeckAgainstCache(current: DeckStructure, cache: PresentationDeckCache | null): DeckDiffResult {
    const cachedSlides = cache?.slides || {};
    const resultSlides: SlideDiffItem[] = [];
    const currentSldIdSet = new Set<string>();

    let addedCount = 0;
    let changedCount = 0;
    let unchangedCount = 0;
    let reorderedCount = 0;

    for (const slide of current.slides) {
      currentSldIdSet.add(slide.sldId);
      const cached = cachedSlides[slide.sldId];

      if (!cached) {
        // Not in cache: newly added slide
        addedCount++;
        resultSlides.push({
          sldId: slide.sldId,
          status: 'added',
          slideIndex: slide.slideIndex,
          contentHash: slide.contentHash,
          slidePath: slide.slidePath,
          title: slide.title,
          lines: slide.lines,
        });
      } else {
        // Exists in cache: check content hash and cached image file
        const imageExists = Boolean(cached.imagePath && fs.existsSync(cached.imagePath));
        const hashMatch = cached.contentHash === slide.contentHash;

        if (!hashMatch || !imageExists) {
          // Content or image changed
          changedCount++;
          resultSlides.push({
            sldId: slide.sldId,
            status: 'changed',
            slideIndex: slide.slideIndex,
            previousSlideIndex: cached.slideIndex,
            contentHash: slide.contentHash,
            previousContentHash: cached.contentHash,
            cachedImagePath: cached.imagePath,
            slidePath: slide.slidePath,
            cachedSlide: cached,
            title: slide.title,
            lines: slide.lines,
          });
        } else if (cached.slideIndex !== slide.slideIndex) {
          // Content matches, but position in deck changed: reordered
          reorderedCount++;
          resultSlides.push({
            sldId: slide.sldId,
            status: 'reordered',
            slideIndex: slide.slideIndex,
            previousSlideIndex: cached.slideIndex,
            contentHash: slide.contentHash,
            cachedImagePath: cached.imagePath,
            slidePath: slide.slidePath,
            cachedSlide: cached,
            title: cached.title || slide.title,
            lines: cached.lines || slide.lines,
          });
        } else {
          // Exact same content and exact same position
          unchangedCount++;
          resultSlides.push({
            sldId: slide.sldId,
            status: 'unchanged',
            slideIndex: slide.slideIndex,
            previousSlideIndex: cached.slideIndex,
            contentHash: slide.contentHash,
            cachedImagePath: cached.imagePath,
            slidePath: slide.slidePath,
            cachedSlide: cached,
            title: cached.title || slide.title,
            lines: cached.lines || slide.lines,
          });
        }
      }
    }

    // Detect removed slides (slides in cache that no longer exist in presentation)
    const removedSldIds: string[] = [];
    for (const sldId of Object.keys(cachedSlides)) {
      if (!currentSldIdSet.has(sldId)) {
        removedSldIds.push(sldId);
      }
    }
    const removedCount = removedSldIds.length;

    const needsExport = addedCount > 0 || changedCount > 0;
    const hasChanges = needsExport || reorderedCount > 0 || removedCount > 0;

    return {
      hasChanges,
      needsExport,
      slides: resultSlides,
      removedSldIds,
      addedCount,
      changedCount,
      removedCount,
      reorderedCount,
      unchangedCount,
      totalSlides: current.slides.length,
    };
  }
}

export const presentationDiffer = new PresentationDiffer();
