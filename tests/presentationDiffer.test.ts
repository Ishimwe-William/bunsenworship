import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import AdmZip from 'adm-zip';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { presentationDiffer, DeckStructure } from '../src/presentationDiffer';
import { PresentationCacheManager, PresentationDeckCache } from '../src/presentationCache';

interface MockSlide {
  sldId: string;
  title: string;
  lines?: string[];
  layoutName?: string;
  imageName?: string;
}

function buildMockPptx(options: {
  slides: MockSlide[];
  layouts?: Record<string, { masterName?: string; xml?: string }>;
  masters?: Record<string, { themeName?: string; xml?: string }>;
  themes?: Record<string, string>;
  media?: Record<string, Buffer | string>;
}): Buffer {
  const zip = new AdmZip();

  // 1. presentation.xml
  const sldIdLstXml = options.slides
    .map((s, idx) => `<p:sldId id="${s.sldId}" r:id="rId${idx + 1}"/>`)
    .join('');

  const presXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldSz cx="12192000" cy="6858000"/>
  <p:sldIdLst>
    ${sldIdLstXml}
  </p:sldIdLst>
</p:presentation>`;
  zip.addFile('ppt/presentation.xml', Buffer.from(presXml, 'utf8'));

  // 2. presentation.xml.rels
  const presRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${options.slides
    .map(
      (s, idx) =>
        `<Relationship Id="rId${idx + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${idx + 1}.xml"/>`
    )
    .join('\n  ')}
</Relationships>`;
  zip.addFile('ppt/_rels/presentation.xml.rels', Buffer.from(presRelsXml, 'utf8'));

  const layouts = options.layouts || {
    'slideLayout1.xml': { masterName: 'slideMaster1.xml' },
  };
  const masters = options.masters || {
    'slideMaster1.xml': { themeName: 'theme1.xml' },
  };
  const themes = options.themes || {
    'theme1.xml': '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme"/>',
  };

  // 3. Slides and slide rels
  options.slides.forEach((s, idx) => {
    const slideNumber = idx + 1;
    const layout = s.layoutName || 'slideLayout1.xml';
    const lines = s.lines || [s.title];
    const paras = lines
      .map((line) => `<a:p><a:r><a:t>${line}</a:t></a:r></a:p>`)
      .join('');

    const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:txBody>
          ${paras}
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`;
    zip.addFile(`ppt/slides/slide${slideNumber}.xml`, Buffer.from(slideXml, 'utf8'));

    let relsContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/${layout}"/>`;

    if (s.imageName) {
      relsContent += `\n  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${s.imageName}"/>`;
    }
    relsContent += '\n</Relationships>';
    zip.addFile(`ppt/slides/_rels/slide${slideNumber}.xml.rels`, Buffer.from(relsContent, 'utf8'));
  });

  // 4. Layouts and layout rels
  for (const [layoutName, layoutData] of Object.entries(layouts)) {
    const lXml =
      layoutData.xml ||
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>`;
    zip.addFile(`ppt/slideLayouts/${layoutName}`, Buffer.from(lXml, 'utf8'));

    const masterTarget = layoutData.masterName || 'slideMaster1.xml';
    const lRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/${masterTarget}"/>
</Relationships>`;
    zip.addFile(`ppt/slideLayouts/_rels/${layoutName}.rels`, Buffer.from(lRels, 'utf8'));
  }

  // 5. Masters and master rels
  for (const [masterName, masterData] of Object.entries(masters)) {
    const mXml =
      masterData.xml ||
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>`;
    zip.addFile(`ppt/slideMasters/${masterName}`, Buffer.from(mXml, 'utf8'));

    const themeTarget = masterData.themeName || 'theme1.xml';
    const mRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/${themeTarget}"/>
</Relationships>`;
    zip.addFile(`ppt/slideMasters/_rels/${masterName}.rels`, Buffer.from(mRels, 'utf8'));
  }

  // 6. Themes
  for (const [themeName, themeXml] of Object.entries(themes)) {
    zip.addFile(`ppt/theme/${themeName}`, Buffer.from(themeXml, 'utf8'));
  }

  // 7. Media
  if (options.media) {
    for (const [mediaName, content] of Object.entries(options.media)) {
      const data = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
      zip.addFile(`ppt/media/${mediaName}`, data);
    }
  }

  return zip.toBuffer();
}

/**
 * Creates a synthetic disk cache reflecting a parsed deck structure.
 */
function createMockCache(cacheManager: PresentationCacheManager, filePath: string, deck: DeckStructure): PresentationDeckCache {
  const slides: Record<string, any> = {};
  for (const s of deck.slides) {
    const imgPath = cacheManager.getSlideImagePath(filePath, s.sldId);
    fs.mkdirSync(path.dirname(imgPath), { recursive: true });
    fs.writeFileSync(imgPath, 'synthetic-png-bytes');
    slides[s.sldId] = {
      sldId: s.sldId,
      slideIndex: s.slideIndex,
      contentHash: s.contentHash,
      imagePath: imgPath,
      title: s.title,
      lines: s.lines,
      width: deck.width,
      height: deck.height,
    };
  }

  const cache: PresentationDeckCache = {
    filePath,
    lastUpdated: Date.now(),
    width: deck.width,
    height: deck.height,
    aspectRatio: deck.aspectRatio,
    slides,
    orderedSldIds: deck.slides.map((s) => s.sldId),
  };

  cacheManager.saveCache(cache);
  return cache;
}

describe('PresentationDiffer & Cache Unit Tests', () => {
  let tmpDir: string;
  let cacheManager: PresentationCacheManager;
  const mockFilePath = 'C:\\Simulated\\TestDeck.pptx';

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bunsen-differ-test-'));
    cacheManager = new PresentationCacheManager(tmpDir);
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  describe('Requirement 1: Slide diffing and content hashing', () => {
    it('1. Edit one line: marks only the modified slide as changed', () => {
      const initialDeckBuffer = buildMockPptx({
        slides: [
          { sldId: '256', title: 'Slide 1 Initial', lines: ['Line 1', 'Line 2'] },
          { sldId: '257', title: 'Slide 2 Unchanged', lines: ['Keep me'] },
        ],
      });

      const initialStructure = presentationDiffer.parseDeckStructure(initialDeckBuffer, mockFilePath);
      const cache = createMockCache(cacheManager, mockFilePath, initialStructure);

      // Mutate only Slide 1 line
      const modifiedDeckBuffer = buildMockPptx({
        slides: [
          { sldId: '256', title: 'Slide 1 Initial', lines: ['Line 1 EDITED', 'Line 2'] },
          { sldId: '257', title: 'Slide 2 Unchanged', lines: ['Keep me'] },
        ],
      });
      const modifiedStructure = presentationDiffer.parseDeckStructure(modifiedDeckBuffer, mockFilePath);
      const diff = presentationDiffer.diffDeckAgainstCache(modifiedStructure, cache);

      expect(diff.hasChanges).toBe(true);
      expect(diff.needsExport).toBe(true);
      expect(diff.changedCount).toBe(1);
      expect(diff.unchangedCount).toBe(1);
      expect(diff.addedCount).toBe(0);
      expect(diff.removedCount).toBe(0);

      const slide1 = diff.slides.find((s) => s.sldId === '256');
      const slide2 = diff.slides.find((s) => s.sldId === '257');

      expect(slide1?.status).toBe('changed');
      expect(slide2?.status).toBe('unchanged');
    });

    it('2. Add a slide: marks new slide as added and keeps existing unchanged', () => {
      const initialDeckBuffer = buildMockPptx({
        slides: [
          { sldId: '256', title: 'Slide 1' },
          { sldId: '257', title: 'Slide 2' },
        ],
      });

      const initialStructure = presentationDiffer.parseDeckStructure(initialDeckBuffer, mockFilePath);
      const cache = createMockCache(cacheManager, mockFilePath, initialStructure);

      // Add a third slide
      const addedDeckBuffer = buildMockPptx({
        slides: [
          { sldId: '256', title: 'Slide 1' },
          { sldId: '257', title: 'Slide 2' },
          { sldId: '258', title: 'Brand New Slide 3' },
        ],
      });
      const addedStructure = presentationDiffer.parseDeckStructure(addedDeckBuffer, mockFilePath);
      const diff = presentationDiffer.diffDeckAgainstCache(addedStructure, cache);

      expect(diff.hasChanges).toBe(true);
      expect(diff.needsExport).toBe(true);
      expect(diff.addedCount).toBe(1);
      expect(diff.unchangedCount).toBe(2);
      expect(diff.changedCount).toBe(0);

      const slide3 = diff.slides.find((s) => s.sldId === '258');
      expect(slide3?.status).toBe('added');
      expect(slide3?.slideIndex).toBe(2);
    });

    it('3. Delete a slide: marks removed slide id without needing export for remaining', () => {
      const initialDeckBuffer = buildMockPptx({
        slides: [
          { sldId: '256', title: 'Slide 1' },
          { sldId: '257', title: 'Slide 2 To Be Removed' },
        ],
      });

      const initialStructure = presentationDiffer.parseDeckStructure(initialDeckBuffer, mockFilePath);
      const cache = createMockCache(cacheManager, mockFilePath, initialStructure);

      // Remove slide 2
      const deletedDeckBuffer = buildMockPptx({
        slides: [{ sldId: '256', title: 'Slide 1' }],
      });
      const deletedStructure = presentationDiffer.parseDeckStructure(deletedDeckBuffer, mockFilePath);
      const diff = presentationDiffer.diffDeckAgainstCache(deletedStructure, cache);

      expect(diff.hasChanges).toBe(true);
      expect(diff.needsExport).toBe(false); // No export needed when only deleting!
      expect(diff.removedCount).toBe(1);
      expect(diff.removedSldIds).toEqual(['257']);
      expect(diff.unchangedCount).toBe(1);
    });

    it('4. Reorder slides: does NOT trigger export (needsExport === false)', () => {
      const initialDeckBuffer = buildMockPptx({
        slides: [
          { sldId: '256', title: 'Original First' },
          { sldId: '257', title: 'Original Second' },
        ],
      });

      const initialStructure = presentationDiffer.parseDeckStructure(initialDeckBuffer, mockFilePath);
      const cache = createMockCache(cacheManager, mockFilePath, initialStructure);

      // Swap slide positions
      const reorderedDeckBuffer = buildMockPptx({
        slides: [
          { sldId: '257', title: 'Original Second' },
          { sldId: '256', title: 'Original First' },
        ],
      });
      const reorderedStructure = presentationDiffer.parseDeckStructure(reorderedDeckBuffer, mockFilePath);
      const diff = presentationDiffer.diffDeckAgainstCache(reorderedStructure, cache);

      expect(diff.hasChanges).toBe(true);
      expect(diff.needsExport).toBe(false); // CRITICAL: Reordering alone must not trigger any export
      expect(diff.reorderedCount).toBe(2);
      expect(diff.changedCount).toBe(0);
      expect(diff.addedCount).toBe(0);
      expect(diff.removedCount).toBe(0);

      const sld257 = diff.slides.find((s) => s.sldId === '257');
      const sld256 = diff.slides.find((s) => s.sldId === '256');

      expect(sld257?.status).toBe('reordered');
      expect(sld257?.slideIndex).toBe(0);
      expect(sld257?.previousSlideIndex).toBe(1);

      expect(sld256?.status).toBe('reordered');
      expect(sld256?.slideIndex).toBe(1);
      expect(sld256?.previousSlideIndex).toBe(0);
    });

    it('5a. Change layout: re-exports every slide that depends on it', () => {
      const initialDeckBuffer = buildMockPptx({
        slides: [
          { sldId: '256', title: 'Slide 1 on Layout 1', layoutName: 'slideLayout1.xml' },
          { sldId: '257', title: 'Slide 2 on Layout 1', layoutName: 'slideLayout1.xml' },
        ],
        layouts: {
          'slideLayout1.xml': { xml: '<p:sldLayout type="title"/>' },
        },
      });

      const initialStructure = presentationDiffer.parseDeckStructure(initialDeckBuffer, mockFilePath);
      const cache = createMockCache(cacheManager, mockFilePath, initialStructure);

      // Update layout XML
      const changedLayoutDeckBuffer = buildMockPptx({
        slides: [
          { sldId: '256', title: 'Slide 1 on Layout 1', layoutName: 'slideLayout1.xml' },
          { sldId: '257', title: 'Slide 2 on Layout 1', layoutName: 'slideLayout1.xml' },
        ],
        layouts: {
          'slideLayout1.xml': { xml: '<p:sldLayout type="title"><p:cSld/></p:sldLayout>' },
        },
      });
      const changedLayoutStructure = presentationDiffer.parseDeckStructure(changedLayoutDeckBuffer, mockFilePath);
      const diff = presentationDiffer.diffDeckAgainstCache(changedLayoutStructure, cache);

      expect(diff.needsExport).toBe(true);
      expect(diff.changedCount).toBe(2); // Both slides depend on slideLayout1.xml
    });

    it('5b. Change master: invalidates slides depending on that master hierarchy', () => {
      const initialDeckBuffer = buildMockPptx({
        slides: [
          { sldId: '256', title: 'Slide 1', layoutName: 'slideLayout1.xml' },
          { sldId: '257', title: 'Slide 2', layoutName: 'slideLayout1.xml' },
        ],
        layouts: {
          'slideLayout1.xml': { masterName: 'slideMaster1.xml' },
        },
        masters: {
          'slideMaster1.xml': { xml: '<p:sldMaster type="masterA"/>' },
        },
      });

      const initialStructure = presentationDiffer.parseDeckStructure(initialDeckBuffer, mockFilePath);
      const cache = createMockCache(cacheManager, mockFilePath, initialStructure);

      const changedMasterDeckBuffer = buildMockPptx({
        slides: [
          { sldId: '256', title: 'Slide 1', layoutName: 'slideLayout1.xml' },
          { sldId: '257', title: 'Slide 2', layoutName: 'slideLayout1.xml' },
        ],
        layouts: {
          'slideLayout1.xml': { masterName: 'slideMaster1.xml' },
        },
        masters: {
          'slideMaster1.xml': { xml: '<p:sldMaster type="masterB_MODIFIED"/>' },
        },
      });
      const changedMasterStructure = presentationDiffer.parseDeckStructure(changedMasterDeckBuffer, mockFilePath);
      const diff = presentationDiffer.diffDeckAgainstCache(changedMasterStructure, cache);

      expect(diff.needsExport).toBe(true);
      expect(diff.changedCount).toBe(2);
    });

    it('5c. Change theme: invalidates slides depending on that theme hierarchy', () => {
      const initialDeckBuffer = buildMockPptx({
        slides: [{ sldId: '256', title: 'Slide 1' }],
        themes: {
          'theme1.xml': '<a:theme name="Light Theme"/>',
        },
      });

      const initialStructure = presentationDiffer.parseDeckStructure(initialDeckBuffer, mockFilePath);
      const cache = createMockCache(cacheManager, mockFilePath, initialStructure);

      const changedThemeDeckBuffer = buildMockPptx({
        slides: [{ sldId: '256', title: 'Slide 1' }],
        themes: {
          'theme1.xml': '<a:theme name="Dark Theme MODIFIED"/>',
        },
      });
      const changedThemeStructure = presentationDiffer.parseDeckStructure(changedThemeDeckBuffer, mockFilePath);
      const diff = presentationDiffer.diffDeckAgainstCache(changedThemeStructure, cache);

      expect(diff.needsExport).toBe(true);
      expect(diff.changedCount).toBe(1);
    });

    it('6. Change an embedded image: invalidates only the slide referencing that image', () => {
      const initialDeckBuffer = buildMockPptx({
        slides: [
          { sldId: '256', title: 'Slide With Image', imageName: 'banner.png' },
          { sldId: '257', title: 'Slide Text Only' },
        ],
        media: {
          'banner.png': Buffer.from('initial-image-bytes-v1'),
        },
      });

      const initialStructure = presentationDiffer.parseDeckStructure(initialDeckBuffer, mockFilePath);
      const cache = createMockCache(cacheManager, mockFilePath, initialStructure);

      // Modify banner.png content
      const changedImageDeckBuffer = buildMockPptx({
        slides: [
          { sldId: '256', title: 'Slide With Image', imageName: 'banner.png' },
          { sldId: '257', title: 'Slide Text Only' },
        ],
        media: {
          'banner.png': Buffer.from('different-modified-image-bytes-v2'),
        },
      });
      const changedImageStructure = presentationDiffer.parseDeckStructure(changedImageDeckBuffer, mockFilePath);
      const diff = presentationDiffer.diffDeckAgainstCache(changedImageStructure, cache);

      expect(diff.needsExport).toBe(true);
      expect(diff.changedCount).toBe(1);
      expect(diff.unchangedCount).toBe(1);

      const slideWithImage = diff.slides.find((s) => s.sldId === '256');
      const slideWithoutImage = diff.slides.find((s) => s.sldId === '257');

      expect(slideWithImage?.status).toBe('changed');
      expect(slideWithoutImage?.status).toBe('unchanged');
    });
  });

  describe('Requirement 7: Safety fallback and error handling', () => {
    it('throws on corrupted or invalid zip data', () => {
      const corruptedBuffer = Buffer.from('not a zip file at all');
      expect(() => {
        presentationDiffer.parseDeckStructure(corruptedBuffer, 'corrupt.pptx');
      }).toThrow();
    });

    it('throws when ppt/presentation.xml is missing from zip archive', () => {
      const zip = new AdmZip();
      zip.addFile('ppt/slides/slide1.xml', Buffer.from('<p:sld/>', 'utf8'));
      const missingPresBuffer = zip.toBuffer();

      expect(() => {
        presentationDiffer.parseDeckStructure(missingPresBuffer, 'incomplete.pptx');
      }).toThrow('ppt/presentation.xml is missing');
    });

    it('treats cached slide as changed if cached image file is missing on disk', () => {
      const deckBuffer = buildMockPptx({
        slides: [{ sldId: '256', title: 'Slide 1' }],
      });
      const structure = presentationDiffer.parseDeckStructure(deckBuffer, mockFilePath);
      const cache = createMockCache(cacheManager, mockFilePath, structure);

      // Intentionally delete the cached image from disk
      const imgPath = cache.slides['256'].imagePath;
      fs.unlinkSync(imgPath);

      const diff = presentationDiffer.diffDeckAgainstCache(structure, cache);
      expect(diff.needsExport).toBe(true);
      expect(diff.changedCount).toBe(1);
      expect(diff.slides[0].status).toBe('changed');
    });
  });

  describe('Cache Manager persistence', () => {
    it('persists manifest to disk and loads correctly', () => {
      const deckBuffer = buildMockPptx({
        slides: [
          { sldId: '256', title: 'Slide 1' },
          { sldId: '257', title: 'Slide 2' },
        ],
      });
      const structure = presentationDiffer.parseDeckStructure(deckBuffer, mockFilePath);
      createMockCache(cacheManager, mockFilePath, structure);

      const loaded = cacheManager.loadCache(mockFilePath);
      expect(loaded).not.toBeNull();
      expect(loaded?.filePath).toBe(mockFilePath);
      expect(Object.keys(loaded?.slides || {})).toEqual(['256', '257']);
      expect(loaded?.slides['256'].title).toBe('Slide 1');
    });

    it('cleans up removed slide images from disk', () => {
      const deckBuffer = buildMockPptx({
        slides: [
          { sldId: '256', title: 'Slide 1' },
          { sldId: '257', title: 'Slide 2' },
        ],
      });
      const structure = presentationDiffer.parseDeckStructure(deckBuffer, mockFilePath);
      createMockCache(cacheManager, mockFilePath, structure);

      const slide2ImgPath = cacheManager.getSlideImagePath(mockFilePath, '257');
      expect(fs.existsSync(slide2ImgPath)).toBe(true);

      // Purge removed slides keeping only slide 256
      cacheManager.purgeRemovedSlides(mockFilePath, ['256']);
      expect(fs.existsSync(slide2ImgPath)).toBe(false);
      const updatedCache = cacheManager.loadCache(mockFilePath);
      expect(updatedCache?.slides['257']).toBeUndefined();
      expect(updatedCache?.slides['256']).toBeDefined();
    });
  });

  describe('Benchmark: 200-slide deck differ performance', () => {
    it('parses and diffs a 200-slide deck in under 150ms without PowerPoint', () => {
      const slides: MockSlide[] = Array.from({ length: 200 }, (_, i) => ({
        sldId: String(256 + i),
        title: `Worship Song Slide ${i + 1}`,
        lines: [`Verse line 1 for slide ${i + 1}`, `Chorus line 2 for slide ${i + 1}`],
      }));
      const deckBuffer = buildMockPptx({ slides });

      const t0 = performance.now();
      const structure = presentationDiffer.parseDeckStructure(deckBuffer, mockFilePath);
      const parseTimeMs = performance.now() - t0;

      expect(structure.slideCount).toBe(200);

      const cache = createMockCache(cacheManager, mockFilePath, structure);

      // Mutate 1 slide (e.g. slide 42)
      slides[41] = {
        sldId: '297',
        title: 'Worship Song Slide 42 - EDITED LIVE',
        lines: ['Edited verse 1', 'Chorus line 2'],
      };
      const modifiedDeckBuffer = buildMockPptx({ slides });

      const t1 = performance.now();
      const modStructure = presentationDiffer.parseDeckStructure(modifiedDeckBuffer, mockFilePath);
      const diff = presentationDiffer.diffDeckAgainstCache(modStructure, cache);
      const diffTimeMs = performance.now() - t1;

      expect(diff.changedCount).toBe(1);
      expect(diff.unchangedCount).toBe(199);
      expect(diff.needsExport).toBe(true);

      // Verify that parsing and diffing 200 slides without PowerPoint completes in milliseconds
      expect(parseTimeMs).toBeLessThan(300);
      expect(diffTimeMs).toBeLessThan(300);
    });
  });
});
