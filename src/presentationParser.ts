import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';
import {
  PptxSlideData,
  PptxSlideElement,
  PptxParagraph,
  PptxTextRun,
  PptxParseResult,
} from './types/presentation';

// 1 inch = 914,400 EMUs (English Metric Units)
const DEFAULT_SLIDE_EMU_WIDTH = 12192000; // 16:9 aspect ratio (13.333 inches)
const DEFAULT_SLIDE_EMU_HEIGHT = 6858000; // 7.5 inches
const CANVAS_WIDTH = 1920;

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  trimValues: false,
});

/**
 * Attempts to read a file with retries to gracefully handle temporary file write locks
 * while Microsoft PowerPoint is actively saving.
 */
async function readFileWithRetry(filePath: string, maxRetries = 5, delayMs = 120): Promise<Buffer> {
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
 * Maps common image file extensions to their MIME types.
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.svg':
      return 'image/svg+xml';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    default:
      return 'image/png';
  }
}

/**
 * Formats a 6-digit hex color into '#RRGGBB'.
 */
function formatHexColor(raw?: string): string | undefined {
  if (!raw || typeof raw !== 'string') return undefined;
  const clean = raw.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return `#${clean}`;
  }
  if (/^[0-9a-fA-F]{8}$/.test(clean)) {
    // 8-character hex includes alpha or RGBX; take the first 6
    return `#${clean.slice(0, 6)}`;
  }
  return undefined;
}

/**
 * Resolves color from DrawingML solidFill / schemeClr structures.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractColor(solidFill: any): string | undefined {
  if (!solidFill) return undefined;
  if (solidFill.srgbClr?.['@_val']) {
    return formatHexColor(solidFill.srgbClr['@_val']);
  }
  if (solidFill.schemeClr?.['@_val']) {
    // Provide attractive dark worship defaults for common PowerPoint scheme colors
    const scheme = String(solidFill.schemeClr['@_val']).toLowerCase();
    switch (scheme) {
      case 'accent1':
        return '#3b82f6';
      case 'accent2':
        return '#06b6d4';
      case 'accent3':
        return '#10b981';
      case 'accent4':
        return '#f59e0b';
      case 'accent5':
        return '#8b5cf6';
      case 'accent6':
        return '#ec4899';
      case 'tx1':
      case 'dk1':
        return '#0f172a';
      case 'tx2':
      case 'dk2':
        return '#334155';
      case 'bg1':
      case 'lt1':
        return '#ffffff';
      case 'bg2':
      case 'lt2':
        return '#f8fafc';
      default:
        return '#ffffff';
    }
  }
  return undefined;
}

/**
 * Extracts and generates clean JSON and HTML5 structures from a PPTX file.
 * Completely cross-platform: operates purely in memory using Node.js without COM automation.
 */
export async function parsePowerPointFile(filePath: string): Promise<PptxParseResult> {
  try {
    if (!filePath || typeof filePath !== 'string') {
      return { ok: false, error: 'No presentation file path provided.' };
    }

    if (!fs.existsSync(filePath)) {
      return { ok: false, error: `Presentation file not found at: ${filePath}` };
    }

    const buffer = await readFileWithRetry(filePath);

    // Validate ZIP magic bytes (PK\x03\x04)
    if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      // Check for legacy binary .ppt (CFB magic: 0xD0 0xCF 0x11 0xE0)
      if (buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0) {
        return {
          ok: false,
          error:
            'The selected file is in legacy binary format (.ppt). Please open and re-save it as modern .pptx in PowerPoint.',
        };
      }
      return { ok: false, error: 'The specified file is not a valid PowerPoint (.pptx) presentation.' };
    }

    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    const entryMap = new Map<string, AdmZip.IZipEntry>();
    for (const entry of entries) {
      entryMap.set(entry.entryName.replace(/\\/g, '/'), entry);
    }

    // 1. Read presentation.xml to determine dimensions and slide ordering
    const presEntry = entryMap.get('ppt/presentation.xml');
    if (!presEntry) {
      return { ok: false, error: 'Corrupt PPTX archive: ppt/presentation.xml is missing.' };
    }

    const presXml = xmlParser.parse(presEntry.getData().toString('utf8'));
    let slideEmuWidth = DEFAULT_SLIDE_EMU_WIDTH;
    let slideEmuHeight = DEFAULT_SLIDE_EMU_HEIGHT;

    const sldSz = presXml.presentation?.sldSz;
    if (sldSz) {
      const cx = parseInt(sldSz['@_cx'], 10);
      const cy = parseInt(sldSz['@_cy'], 10);
      if (!isNaN(cx) && cx > 0) slideEmuWidth = cx;
      if (!isNaN(cy) && cy > 0) slideEmuHeight = cy;
    }

    const aspectRatio = slideEmuWidth / slideEmuHeight;
    const canvasHeight = Math.max(300, Math.round(CANVAS_WIDTH / aspectRatio));

    // 2. Read presentation relationship mappings: ppt/_rels/presentation.xml.rels
    const presRelsEntry = entryMap.get('ppt/_rels/presentation.xml.rels');
    const slideRelMap = new Map<string, string>();
    if (presRelsEntry) {
      const relsXml = xmlParser.parse(presRelsEntry.getData().toString('utf8'));
      const rawRels = relsXml.Relationships?.Relationship;
      const relsArray = Array.isArray(rawRels) ? rawRels : rawRels ? [rawRels] : [];
      for (const rel of relsArray) {
        if (rel['@_Id'] && rel['@_Target']) {
          slideRelMap.set(rel['@_Id'], rel['@_Target'].replace(/^\/ppt\//, '').replace(/^ppt\//, ''));
        }
      }
    }

    // Determine slide paths in sequential presentation order
    const orderedSlidePaths: string[] = [];
    const sldIdLst = presXml.presentation?.sldIdLst?.sldId;
    const sldIds = Array.isArray(sldIdLst) ? sldIdLst : sldIdLst ? [sldIdLst] : [];
    for (const item of sldIds) {
      const rId = item['@_r:id'] || item['@_id'];
      if (rId && slideRelMap.has(rId)) {
        const target = slideRelMap.get(rId)!;
        const normalized = target.startsWith('slides/') ? `ppt/${target}` : `ppt/slides/${target}`;
        orderedSlidePaths.push(normalized);
      }
    }

    // Fallback if relationships were empty: naturally sort all slides found in ppt/slides/
    if (orderedSlidePaths.length === 0) {
      const detected = Array.from(entryMap.keys())
        .filter((k) => /^ppt\/slides\/slide\d+\.xml$/i.test(k))
        .sort((a, b) => {
          const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
          const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
          return numA - numB;
        });
      orderedSlidePaths.push(...detected);
    }

    if (orderedSlidePaths.length === 0) {
      return { ok: false, error: 'The presentation contains no slides.' };
    }

    const presentationTitle = path.basename(filePath, path.extname(filePath));
    const parsedSlides: PptxSlideData[] = [];

    // 3. Process each slide
    for (let i = 0; i < orderedSlidePaths.length; i++) {
      const slidePath = orderedSlidePaths[i];
      const slideEntry = entryMap.get(slidePath);
      if (!slideEntry) continue;

      const slideXml = xmlParser.parse(slideEntry.getData().toString('utf8'));

      // Read slide-specific relationships for embedded images
      const slideDir = path.dirname(slidePath);
      const slideBase = path.basename(slidePath);
      const slideRelsPath = `${slideDir}/_rels/${slideBase}.rels`;
      const slideRelsEntry = entryMap.get(slideRelsPath);
      const slideMediaRelMap = new Map<string, string>();

      if (slideRelsEntry) {
        const relsXml = xmlParser.parse(slideRelsEntry.getData().toString('utf8'));
        const rawRels = relsXml.Relationships?.Relationship;
        const relList = Array.isArray(rawRels) ? rawRels : rawRels ? [rawRels] : [];
        for (const rel of relList) {
          if (rel['@_Id'] && rel['@_Target']) {
            let target = rel['@_Target'].replace(/\\/g, '/');
            if (target.startsWith('../')) {
              target = 'ppt/' + target.replace(/^(\.\.\/)+/, '');
            } else if (!target.startsWith('ppt/')) {
              target = `ppt/slides/${target}`;
            }
            slideMediaRelMap.set(rel['@_Id'], target);
          }
        }
      }

      // Extract slide background
      let backgroundColor: string | undefined = undefined;
      let backgroundImageDataUrl: string | undefined = undefined;

      const bg = slideXml.sld?.cSld?.bg;
      if (bg) {
        const bgPr = bg.bgPr;
        if (bgPr?.solidFill) {
          backgroundColor = extractColor(bgPr.solidFill);
        } else if (bgPr?.blipFill?.blip) {
          const rId = bgPr.blipFill.blip['@_r:embed'] || bgPr.blipFill.blip['@_embed'];
          if (rId && slideMediaRelMap.has(rId)) {
            const mediaEntry = entryMap.get(slideMediaRelMap.get(rId)!);
            if (mediaEntry) {
              const mime = getMimeType(mediaEntry.entryName);
              backgroundImageDataUrl = `data:${mime};base64,${mediaEntry.getData().toString('base64')}`;
            }
          }
        }
      }

      // Default dark theme background for worship presentation clarity
      if (!backgroundColor && !backgroundImageDataUrl) {
        backgroundColor = '#0b0f19';
      }

      const elements: PptxSlideElement[] = [];
      const lines: string[] = [];
      let detectedTitle = '';

      // Traverse Shape Tree: spTree
      const spTree = slideXml.sld?.cSld?.spTree;
      if (spTree) {
        // Collect shapes: <sp>, pictures: <pic>, groups: <grpSp>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const processShape = (sp: any, parentOffset = { x: 0, y: 0 }) => {
          if (!sp) return;

          // Bounding box from transform: xfrm
          const xfrm = sp.spPr?.xfrm;
          const offX = parseInt(xfrm?.off?.['@_x'] || '0', 10) + parentOffset.x;
          const offY = parseInt(xfrm?.off?.['@_y'] || '0', 10) + parentOffset.y;
          const extCx = parseInt(xfrm?.ext?.['@_cx'] || '0', 10);
          const extCy = parseInt(xfrm?.ext?.['@_cy'] || '0', 10);

          if (extCx <= 0 || extCy <= 0) return;

          const leftPct = Math.max(0, Math.min(100, (offX / slideEmuWidth) * 100));
          const topPct = Math.max(0, Math.min(100, (offY / slideEmuHeight) * 100));
          const widthPct = Math.max(1, Math.min(100, (extCx / slideEmuWidth) * 100));
          const heightPct = Math.max(1, Math.min(100, (extCy / slideEmuHeight) * 100));

          // Shape styling
          const solidFill = sp.spPr?.solidFill;
          const fillColor = extractColor(solidFill);

          const strokeColor = extractColor(sp.spPr?.ln?.solidFill);
          const strokeWidth = sp.spPr?.ln?.['@_w']
            ? Math.round(parseInt(sp.spPr.ln['@_w'], 10) / 12700)
            : undefined;

          // Placeholder type (title, subtitle, body)
          const phType = sp.nvSpPr?.nvPr?.ph?.['@_type'] || '';
          const isTitlePh = phType === 'title' || phType === 'ctrTitle';

          // Text content
          const txBody = sp.txBody;
          const paragraphs: PptxParagraph[] = [];

          if (txBody) {
            const rawP = txBody.p;
            const pArray = Array.isArray(rawP) ? rawP : rawP ? [rawP] : [];

            for (const p of pArray) {
              const align = (p.pPr?.['@_algn'] || 'left') as 'left' | 'center' | 'right' | 'justify';
              const mappedAlign =
                align === 'ctr' ? 'center' : align === 'r' ? 'right' : align === 'just' ? 'justify' : 'left';

              const runs: PptxTextRun[] = [];
              const rawR = p.r;
              const rArray = Array.isArray(rawR) ? rawR : rawR ? [rawR] : [];

              let paragraphText = '';
              for (const r of rArray) {
                const text = r.t !== undefined ? String(r.t) : '';
                if (!text) continue;

                paragraphText += text;
                const rPr = r.rPr;
                const sz = rPr?.['@_sz'] ? parseInt(rPr['@_sz'], 10) / 100 : undefined;
                const bold = rPr?.['@_b'] === '1' || rPr?.['@_b'] === true || rPr?.['@_b'] === 'true';
                const italic = rPr?.['@_i'] === '1' || rPr?.['@_i'] === true || rPr?.['@_i'] === 'true';
                const underline = Boolean(rPr?.['@_u'] && rPr['@_u'] !== 'none');
                const fontColor = extractColor(rPr?.solidFill) || (isTitlePh ? '#ffffff' : '#e2e8f0');
                const fontFamily = rPr?.latin?.['@_typeface'] || undefined;

                runs.push({
                  text,
                  fontSize: sz,
                  fontFamily,
                  bold,
                  italic,
                  underline,
                  color: fontColor,
                });
              }

              if (paragraphText.trim()) {
                paragraphs.push({ align: mappedAlign, runs });
                lines.push(paragraphText.trim());

                if (isTitlePh && !detectedTitle) {
                  detectedTitle = paragraphText.trim();
                }
              }
            }
          }

          if (paragraphs.length > 0 || fillColor || strokeColor) {
            elements.push({
              id: `elem-${i + 1}-${elements.length + 1}`,
              type: paragraphs.length > 0 ? 'text' : 'shape',
              bounds: {
                leftPct,
                topPct,
                widthPct,
                heightPct,
                x: Math.round((offX / slideEmuWidth) * CANVAS_WIDTH),
                y: Math.round((offY / slideEmuHeight) * canvasHeight),
                width: Math.round((extCx / slideEmuWidth) * CANVAS_WIDTH),
                height: Math.round((extCy / slideEmuHeight) * canvasHeight),
              },
              shape: {
                fillColor,
                strokeColor,
                strokeWidth,
                borderRadius: sp.spPr?.prstGeom?.['@_prst'] === 'roundRect' ? 8 : 0,
              },
              paragraphs: paragraphs.length > 0 ? paragraphs : undefined,
              text: paragraphs.map((p) => p.runs.map((r) => r.text).join('')).join('\n'),
            });
          }
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const processPicture = (pic: any, parentOffset = { x: 0, y: 0 }) => {
          if (!pic) return;

          const xfrm = pic.spPr?.xfrm;
          const offX = parseInt(xfrm?.off?.['@_x'] || '0', 10) + parentOffset.x;
          const offY = parseInt(xfrm?.off?.['@_y'] || '0', 10) + parentOffset.y;
          const extCx = parseInt(xfrm?.ext?.['@_cx'] || '0', 10);
          const extCy = parseInt(xfrm?.ext?.['@_cy'] || '0', 10);

          if (extCx <= 0 || extCy <= 0) return;

          const rId = pic.blipFill?.blip?.['@_r:embed'] || pic.blipFill?.blip?.['@_embed'];
          let imageDataUrl: string | undefined = undefined;

          if (rId && slideMediaRelMap.has(rId)) {
            const mediaEntry = entryMap.get(slideMediaRelMap.get(rId)!);
            if (mediaEntry) {
              const mime = getMimeType(mediaEntry.entryName);
              imageDataUrl = `data:${mime};base64,${mediaEntry.getData().toString('base64')}`;
            }
          }

          if (imageDataUrl) {
            elements.push({
              id: `elem-${i + 1}-${elements.length + 1}`,
              type: 'image',
              bounds: {
                leftPct: Math.max(0, Math.min(100, (offX / slideEmuWidth) * 100)),
                topPct: Math.max(0, Math.min(100, (offY / slideEmuHeight) * 100)),
                widthPct: Math.max(1, Math.min(100, (extCx / slideEmuWidth) * 100)),
                heightPct: Math.max(1, Math.min(100, (extCy / slideEmuHeight) * 100)),
                x: Math.round((offX / slideEmuWidth) * CANVAS_WIDTH),
                y: Math.round((offY / slideEmuHeight) * canvasHeight),
                width: Math.round((extCx / slideEmuWidth) * CANVAS_WIDTH),
                height: Math.round((extCy / slideEmuHeight) * canvasHeight),
              },
              imageDataUrl,
            });
          }
        };

        // 1. Shapes
        const rawSp = spTree.sp;
        const spList = Array.isArray(rawSp) ? rawSp : rawSp ? [rawSp] : [];
        for (const sp of spList) processShape(sp);

        // 2. Pictures
        const rawPic = spTree.pic;
        const picList = Array.isArray(rawPic) ? rawPic : rawPic ? [rawPic] : [];
        for (const pic of picList) processPicture(pic);

        // 3. Group Shapes: grpSp
        const rawGrp = spTree.grpSp;
        const grpList = Array.isArray(rawGrp) ? rawGrp : rawGrp ? [rawGrp] : [];
        for (const grp of grpList) {
          const offX = parseInt(grp.grpSpPr?.xfrm?.off?.['@_x'] || '0', 10);
          const offY = parseInt(grp.grpSpPr?.xfrm?.off?.['@_y'] || '0', 10);
          const offset = { x: offX, y: offY };

          const subSp = grp.sp ? (Array.isArray(grp.sp) ? grp.sp : [grp.sp]) : [];
          for (const s of subSp) processShape(s, offset);

          const subPic = grp.pic ? (Array.isArray(grp.pic) ? grp.pic : [grp.pic]) : [];
          for (const p of subPic) processPicture(p, offset);
        }
      }

      if (!detectedTitle && lines.length > 0) {
        detectedTitle = lines[0].slice(0, 50);
      }
      const slideTitle = detectedTitle || `Slide ${i + 1}`;

      // 4. Generate Localized HTML5 Structure
      const html = generateSlideHtml({
        title: slideTitle,
        width: CANVAS_WIDTH,
        height: canvasHeight,
        background: { color: backgroundColor, imageDataUrl: backgroundImageDataUrl },
        elements,
      });

      // 5. Generate Vector SVG representation and data URL thumbnail
      const svg = generateSlideSvg({
        width: CANVAS_WIDTH,
        height: canvasHeight,
        background: { color: backgroundColor, imageDataUrl: backgroundImageDataUrl },
        elements,
      });

      const thumbnailDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

      parsedSlides.push({
        id: `s-pptx-${i + 1}`,
        slideIndex: i,
        title: slideTitle,
        width: CANVAS_WIDTH,
        height: canvasHeight,
        aspectRatio,
        background: {
          color: backgroundColor,
          imageDataUrl: backgroundImageDataUrl,
        },
        elements,
        lines,
        html,
        svg,
        thumbnailDataUrl,
      });
    }

    return {
      ok: true,
      title: presentationTitle,
      slideCount: parsedSlides.length,
      slides: parsedSlides,
      filePath,
      width: CANVAS_WIDTH,
      height: canvasHeight,
      // For backwards compatibility with components that read exportResult.images
      images: parsedSlides.map((s) => s.thumbnailDataUrl || ''),
    };
  } catch (error: unknown) {
    console.error('[PPTX Parser] Error decoding presentation:', error);
    return {
      ok: false,
      error: (error as Error)?.message || 'Failed to decode PowerPoint presentation.',
    };
  }
}

/**
 * Generates clean, responsive HTML5 markup for a slide.
 */
function generateSlideHtml(params: {
  title: string;
  width: number;
  height: number;
  background?: { color?: string; imageDataUrl?: string };
  elements: PptxSlideElement[];
}): string {
  const { title, width, height, background, elements } = params;

  let bgCss = background?.color || '#0b0f19';
  if (background?.imageDataUrl) {
    bgCss = `url("${background.imageDataUrl}") center / cover no-repeat`;
  }

  const elementsHtml = elements
    .map((elem) => {
      const b = elem.bounds;
      const posStyle = `left: ${b.leftPct.toFixed(2)}%; top: ${b.topPct.toFixed(2)}%; width: ${b.widthPct.toFixed(2)}%; height: ${b.heightPct.toFixed(2)}%;`;

      if (elem.type === 'image' && elem.imageDataUrl) {
        return `<div class="pptx-element pptx-image-box" style="position: absolute; ${posStyle} overflow: hidden;">
  <img src="${elem.imageDataUrl}" style="width: 100%; height: 100%; object-fit: contain; display: block;" alt="Slide graphic" />
</div>`;
      }

      const shapeStyleParts: string[] = [];
      if (elem.shape?.fillColor) {
        shapeStyleParts.push(`background-color: ${elem.shape.fillColor};`);
      }
      if (elem.shape?.strokeColor) {
        shapeStyleParts.push(`border: ${elem.shape.strokeWidth || 1}px solid ${elem.shape.strokeColor};`);
      }
      if (elem.shape?.borderRadius) {
        shapeStyleParts.push(`border-radius: ${elem.shape.borderRadius}px;`);
      }

      if (elem.paragraphs && elem.paragraphs.length > 0) {
        const textContent = elem.paragraphs
          .map((p) => {
            const alignStyle = p.align ? `text-align: ${p.align};` : '';
            const runsContent = p.runs
              .map((r) => {
                const styles: string[] = [];
                if (r.fontSize) {
                  // Scale font size proportionally to 1080p canvas
                  styles.push(`font-size: ${Math.round(r.fontSize * 1.5)}px;`);
                }
                if (r.color) styles.push(`color: ${r.color};`);
                if (r.bold) styles.push('font-weight: 700;');
                if (r.italic) styles.push('font-style: italic;');
                if (r.underline) styles.push('text-decoration: underline;');
                if (r.fontFamily) styles.push(`font-family: "${r.fontFamily}", sans-serif;`);

                const escapedText = r.text
                  .replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;');
                return `<span style="${styles.join(' ')}">${escapedText}</span>`;
              })
              .join('');
            return `<div class="pptx-p" style="margin: 0 0 0.35em 0; line-height: 1.25; ${alignStyle}">${runsContent}</div>`;
          })
          .join('');

        return `<div class="pptx-element pptx-text-box" style="position: absolute; ${posStyle} ${shapeStyleParts.join(' ')} display: flex; flex-direction: column; justify-content: center; box-sizing: border-box; padding: 8px 12px; overflow: hidden; word-break: break-word;">
  ${textContent}
</div>`;
      }

      return `<div class="pptx-element pptx-shape-box" style="position: absolute; ${posStyle} ${shapeStyleParts.join(' ')} box-sizing: border-box;"></div>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #000000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      user-select: none;
    }
    .pptx-canvas-stage {
      position: relative;
      width: 100%;
      height: 100%;
      aspect-ratio: ${width} / ${height};
      background: ${bgCss};
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div class="pptx-canvas-stage">
    ${elementsHtml}
  </div>
</body>
</html>`;
}

/**
 * Generates clean vector SVG markup for a slide.
 */
function generateSlideSvg(params: {
  width: number;
  height: number;
  background?: { color?: string; imageDataUrl?: string };
  elements: PptxSlideElement[];
}): string {
  const { width, height, background, elements } = params;

  let bgSnippet = `<rect width="${width}" height="${height}" fill="${background?.color || '#0b0f19'}"/>`;
  if (background?.imageDataUrl) {
    bgSnippet = `<image href="${background.imageDataUrl}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>`;
  }

  const elementsSvg = elements
    .map((elem) => {
      const x = elem.bounds.x || Math.round((elem.bounds.leftPct / 100) * width);
      const y = elem.bounds.y || Math.round((elem.bounds.topPct / 100) * height);
      const w = elem.bounds.width || Math.round((elem.bounds.widthPct / 100) * width);
      const h = elem.bounds.height || Math.round((elem.bounds.heightPct / 100) * height);

      if (elem.type === 'image' && elem.imageDataUrl) {
        return `<image href="${elem.imageDataUrl}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`;
      }

      const shapeFill = elem.shape?.fillColor || 'none';
      const shapeStroke = elem.shape?.strokeColor || 'none';
      const strokeW = elem.shape?.strokeWidth || 1;
      const rx = elem.shape?.borderRadius || 0;

      let shapeSvg = '';
      if (shapeFill !== 'none' || shapeStroke !== 'none') {
        shapeSvg = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${shapeFill}" stroke="${shapeStroke}" stroke-width="${strokeW}"/>`;
      }

      if (elem.paragraphs && elem.paragraphs.length > 0) {
        const textLines = elem.paragraphs
          .map((p) => {
            const align = p.align || 'left';
            const runs = p.runs
              .map((r) => {
                const fs = Math.round((r.fontSize || 24) * 1.5);
                const col = r.color || '#ffffff';
                const fw = r.bold ? 'font-weight: 700;' : '';
                const fi = r.italic ? 'font-style: italic;' : '';
                const esc = r.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                return `<span style="font-size: ${fs}px; color: ${col}; ${fw} ${fi}">${esc}</span>`;
              })
              .join('');
            return `<div style="text-align: ${align}; margin-bottom: 4px; line-height: 1.25;">${runs}</div>`;
          })
          .join('');

        const fo = `<foreignObject x="${x}" y="${y}" width="${w}" height="${h}">
  <div xmlns="http://www.w3.org/1999/xhtml" style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; padding: 8px 12px; box-sizing: border-box; overflow: hidden; word-break: break-word; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    ${textLines}
  </div>
</foreignObject>`;
        return `${shapeSvg}\n${fo}`;
      }

      return shapeSvg;
    })
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  ${bgSnippet}
  ${elementsSvg}
</svg>`;
}
