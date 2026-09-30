import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import AdmZip from 'adm-zip';
import { parsePowerPointFile } from '../src/presentationParser';

describe('Presentation Parser & Visual Layer Ordering', () => {
  it('parses PPTX slides and ensures text shapes render on top of images in SVG and HTML', async () => {
    // Build a mock PPTX with a background picture and foreground text shape
    const zip = new AdmZip();

    // 1. presentation.xml
    zip.addFile(
      'ppt/presentation.xml',
      Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldSz cx="12192000" cy="6858000"/>
  <p:sldIdLst>
    <p:sldId id="256" r:id="rId1"/>
  </p:sldIdLst>
</p:presentation>`,
        'utf8'
      )
    );

    // 2. presentation.xml.rels
    zip.addFile(
      'ppt/_rels/presentation.xml.rels',
      Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
</Relationships>`,
        'utf8'
      )
    );

    // 3. slide1.xml with background image (pic) and foreground text (sp)
    const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr/>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Title 1"/><p:cNvSpPr/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="1000000" y="1000000"/><a:ext cx="8000000" cy="2000000"/></a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:p>
            <a:r>
              <a:rPr sz="3600" b="1"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:rPr>
              <a:t>Worship Presentation Title</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:pic>
        <p:nvPicPr><p:cNvPr id="3" name="Background"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr>
        <p:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>
        <p:spPr>
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="12192000" cy="6858000"/></a:xfrm>
        </p:spPr>
      </p:pic>
    </p:spTree>
  </p:cSld>
</p:sld>`;
    zip.addFile('ppt/slides/slide1.xml', Buffer.from(slideXml, 'utf8'));

    // 4. slide1.xml.rels mapping rIdImg1 to media
    const slideRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdImg1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>
</Relationships>`;
    zip.addFile('ppt/slides/_rels/slide1.xml.rels', Buffer.from(slideRelsXml, 'utf8'));

    // 5. Tiny 1x1 PNG dummy image
    const dummyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    zip.addFile('ppt/media/image1.png', dummyPng);

    const tempFilePath = path.join(os.tmpdir(), `test_deck_${Date.now()}.pptx`);
    fs.writeFileSync(tempFilePath, zip.toBuffer());

    try {
      const res = await parsePowerPointFile(tempFilePath);
      expect(res.ok).toBe(true);
      expect(res.slideCount).toBe(1);

      const slide = res.slides![0];
      expect(slide.lines).toContain('Worship Presentation Title');

      // Assert SVG layer order: <image must be rendered BEFORE <text so text is on top
      const imgIdx = slide.svg.indexOf('<image');
      const textIdx = slide.svg.indexOf('<text');
      expect(imgIdx).toBeGreaterThan(-1);
      expect(textIdx).toBeGreaterThan(-1);
      expect(imgIdx).toBeLessThan(textIdx);

      // Assert HTML has z-index layering
      expect(slide.html).toContain('z-index: 10');
      expect(slide.html).toContain('z-index: 2');
      expect(slide.html).toContain('Worship Presentation Title');
    } finally {
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    }
  });

  const localTemplatePath = 'I:\\Other computers\\My Laptop\\Kab Presentations\\Template.pptx';
  const localAutosavedPath = 'I:\\Other computers\\My Laptop\\Kab Presentations\\Template [Autosaved].pptx';

  if (fs.existsSync(localTemplatePath)) {
    it('renders text on top of background image in Template.pptx Slide 3', async () => {
      const res = await parsePowerPointFile(localTemplatePath);
      expect(res.ok).toBe(true);
      expect(res.slides && res.slides.length).toBeGreaterThanOrEqual(3);

      const s3 = res.slides![2];
      expect(s3.lines.some((l) => l.includes('MIFEM'))).toBe(true);

      const imgIndex = s3.svg.indexOf('<image');
      const textIndex = s3.svg.indexOf('<text');
      expect(imgIndex).toBeGreaterThan(-1);
      expect(textIndex).toBeGreaterThan(-1);
      expect(imgIndex).toBeLessThan(textIndex);

      expect(s3.html).toContain('z-index: 10');
      expect(s3.html).toContain('MIFEM');
    });
  }

  it('serves lightweight bunsen-media URLs without giant Base64 payload when loading from cache', async () => {
    const { presentationCache } = await import('../src/presentationCache');
    const { exportWithNativePowerPoint } = await import('../src/presentationNativeEngine');
    const { presentationDiffer } = await import('../src/presentationDiffer');

    // Create a mock presentation with 1 slide and seed the cache
    const testDeckPath = path.join(os.tmpdir(), `cache_test_deck_${Date.now()}.pptx`);
    const zip = new AdmZip();
    zip.addFile(
      'ppt/presentation.xml',
      Buffer.from(
        `<?xml version="1.0" encoding="UTF-8"?><p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldSz cx="12192000" cy="6858000"/><p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst></p:presentation>`,
        'utf8'
      )
    );
    zip.addFile(
      'ppt/_rels/presentation.xml.rels',
      Buffer.from(
        `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/></Relationships>`,
        'utf8'
      )
    );
    zip.addFile(
      'ppt/slides/slide1.xml',
      Buffer.from(
        `<?xml version="1.0" encoding="UTF-8"?><p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld></p:sld>`,
        'utf8'
      )
    );
    fs.writeFileSync(testDeckPath, zip.toBuffer());

    const fakeImagePath = path.join(os.tmpdir(), `mock_slide_${Date.now()}.png`);
    fs.writeFileSync(fakeImagePath, Buffer.from('fake-png-bytes'));

    try {
      const struct = presentationDiffer.parseDeckStructure(testDeckPath);

      presentationCache.saveCache({
        filePath: testDeckPath,
        lastUpdated: Date.now(),
        width: 1920,
        height: 1080,
        aspectRatio: 16 / 9,
        slides: {
          '256': {
            sldId: '256',
            slideIndex: 0,
            contentHash: struct.slides[0].contentHash,
            imagePath: fakeImagePath,
            title: 'Mock Slide 1',
            lines: ['Line 1'],
            width: 1920,
            height: 1080,
          },
        },
        orderedSldIds: ['256'],
      });

      const res = await exportWithNativePowerPoint(testDeckPath);
      expect(res.ok).toBe(true);
      expect(res.fromCache).toBe(true);

      const firstSlide = res.slides![0];
      const imgUrl = firstSlide.thumbnailDataUrl || firstSlide.background?.imageDataUrl || '';
      expect(imgUrl).toMatch(/^bunsen-media:\/\//);
      expect(imgUrl.length).toBeLessThan(300);

      const jsonSize = JSON.stringify(res).length;
      expect(jsonSize).toBeLessThan(1024 * 1024);
    } finally {
      if (fs.existsSync(fakeImagePath)) fs.unlinkSync(fakeImagePath);
      if (fs.existsSync(testDeckPath)) fs.unlinkSync(testDeckPath);
    }
  });

  if (fs.existsSync(localAutosavedPath)) {
    it('renders all title and speaker text on top of background image in Template [Autosaved].pptx Slide 3', async () => {
      const res = await parsePowerPointFile(localAutosavedPath);
      expect(res.ok).toBe(true);
      expect(res.slides && res.slides.length).toBeGreaterThanOrEqual(3);

      const s3 = res.slides![2];
      expect(s3.lines.some((l) => l.includes('MATERANIRO'))).toBe(true);
      expect(s3.lines.some((l) => l.includes('MUSONI'))).toBe(true);

      const imgIndex = s3.svg.lastIndexOf('<image');
      const textIndex = s3.svg.indexOf('<text');
      expect(imgIndex).toBeGreaterThan(-1);
      expect(textIndex).toBeGreaterThan(-1);
      expect(imgIndex).toBeLessThan(textIndex);

      expect(s3.svg).toContain('MATERANIRO');
      expect(s3.svg).toContain('MUSONI');
      expect(s3.svg).toContain('Humura');
    });
  }
});
