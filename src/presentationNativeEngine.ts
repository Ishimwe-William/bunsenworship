import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile, ChildProcess } from 'node:child_process';
import { PptxSlideData, PptxParseResult, PresentationSyncPayload } from './types/presentation';
import { parsePowerPointFile } from './presentationParser';
import { presentationCache, PresentationDeckCache, CachedSlide } from './presentationCache';
import { presentationDiffer, DeckStructure, DeckDiffResult } from './presentationDiffer';

export interface NativePptSlideInfo {
  slideIndex: number;
  sldId?: string;
  title: string;
  lines: string[];
  imagePath: string;
}

export interface NativePptExportJson {
  ok: boolean;
  title?: string;
  slideCount?: number;
  width?: number;
  height?: number;
  slides?: NativePptSlideInfo[];
  error?: string;
  elapsedMs?: number;
}

export interface ExportSlideTarget {
  slideIndex: number; // 1-based presentation index
  sldId: string;      // Slide identity
  outPath: string;    // Target file path for slide image
}

export interface IncrementalExportResult extends PptxParseResult {
  diffResult?: DeckDiffResult;
  isIncremental?: boolean;
  exportedCount?: number;
  reusedCount?: number;
  fromCache?: boolean;
}

const POWERPOINT_EXPORT_SCRIPT = `param(
  [Parameter(Mandatory = $true)][string]$InputFile,
  [Parameter(Mandatory = $true)][string]$OutDir,
  [int]$TargetWidth = 1920,
  [string]$TargetsFile = "",
  [string]$TargetsJson = ""
)

$ErrorActionPreference = 'Stop'
function Out-Json { param($Obj) Write-Output ($Obj | ConvertTo-Json -Compress -Depth 6) }

if (-not (Test-Path -LiteralPath $InputFile)) {
  Out-Json @{ ok = $false; error = "The PowerPoint file could not be found at: $InputFile" }
  exit 0
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

# Resolve selective targets if provided
$targetList = $null
if ($TargetsFile -and (Test-Path -LiteralPath $TargetsFile)) {
  try {
    $rawContent = Get-Content -LiteralPath $TargetsFile -Raw -Encoding UTF8
    $targetList = $rawContent | ConvertFrom-Json
  } catch {}
} elseif ($TargetsJson) {
  try {
    $targetList = $TargetsJson | ConvertFrom-Json
  } catch {}
}

$ppt = $null
$pres = $null
$shouldQuit = $false
$shouldClosePres = $false

try {
  try {
    $ppt = [System.Runtime.InteropServices.Marshal]::GetActiveObject("PowerPoint.Application")
  } catch {
    $ppt = New-Object -ComObject PowerPoint.Application
    $shouldQuit = $true
  }

  $ppt.DisplayAlerts = 1

  # Check if presentation is already open in PowerPoint, retry if busy
  for ($openRetry = 0; $openRetry -lt 5; $openRetry++) {
    try {
      $normInput = (Resolve-Path -LiteralPath $InputFile).Path.ToLowerInvariant()
      foreach ($p in $ppt.Presentations) {
        try {
          if ((Resolve-Path -LiteralPath $p.FullName).Path.ToLowerInvariant() -eq $normInput) {
            $pres = $p
            break
          }
        } catch {}
      }

      if ($null -eq $pres) {
        # Open read-only (-1), untitled=false (0), withwindow=false (0)
        $pres = $ppt.Presentations.Open($InputFile, -1, 0, 0)
        $shouldClosePres = $true
      }
      if ($null -ne $pres) { break }
    } catch {
      Start-Sleep -Milliseconds 350
    }
  }

  if ($null -eq $pres) {
    throw "Failed to open presentation: $InputFile"
  }

  $slideCount = $pres.Slides.Count
  $ptWidth = $pres.PageSetup.SlideWidth
  $ptHeight = $pres.PageSetup.SlideHeight
  if ($null -eq $ptWidth -or $ptWidth -le 0) { $ptWidth = 960 }
  if ($null -eq $ptHeight -or $ptHeight -le 0) { $ptHeight = $ptWidth * 9 / 16 }
  $scaleFactor = $TargetWidth / [double]$ptWidth
  $pxWidth = [int][Math]::Max(1, [Math]::Round($ptWidth * $scaleFactor))
  $pxHeight = [int][Math]::Max(1, [Math]::Round($ptHeight * $scaleFactor))

  $slidesData = @()

  if ($null -ne $targetList -and $targetList.Count -gt 0) {
    # Selective slide export
    foreach ($tgt in $targetList) {
      $slide = $null
      if ($tgt.sldId) {
        try {
          $slide = $pres.Slides.FindBySlideID([int]$tgt.sldId)
        } catch {}
      }
      if ($null -eq $slide -and $tgt.slideIndex -gt 0 -and $tgt.slideIndex -le $slideCount) {
        try {
          $slide = $pres.Slides.Item($tgt.slideIndex)
        } catch {}
      }
      if ($null -eq $slide) { continue }

      $outPath = $tgt.outPath
      if (-not $outPath) {
        $outPath = Join-Path $OutDir ("slide-{0}.png" -f $tgt.sldId)
      }

      # Retry export up to 4 times
      for ($retry = 0; $retry -lt 4; $retry++) {
        try {
          $slide.Export($outPath, 'PNG', $pxWidth, $pxHeight)
          if (Test-Path -LiteralPath $outPath) { break }
        } catch {
          Start-Sleep -Milliseconds 250
        }
      }

      $lines = @()
      foreach ($sh in $slide.Shapes) {
        try {
          if ($sh.HasTextFrame -and $sh.TextFrame.HasText) {
            $txt = $sh.TextFrame.TextRange.Text.Trim()
            if ($txt) {
              $lines += ($txt -split "[\\r\\n]+" | Where-Object { $_.Trim() })
            }
          }
        } catch {}
      }

      $title = $null
      try {
        if ($slide.Shapes.HasTitle -ne 0) {
          $title = $slide.Shapes.Title.TextFrame.TextRange.Text.Trim()
        }
      } catch {}
      if (-not $title -and $lines.Count -gt 0) { $title = $lines[0] }
      $actualIdx = [int]$slide.SlideIndex - 1
      if (-not $title) { $title = "Slide $($actualIdx + 1)" }

      if (Test-Path -LiteralPath $outPath) {
        $slidesData += @{
          slideIndex = $actualIdx
          sldId = [string]$slide.SlideID
          title = $title
          lines = $lines
          imagePath = $outPath
        }
      }
    }
  } else {
    # Full export mode
    for ($i = 1; $i -le $slideCount; $i++) {
      $slide = $pres.Slides.Item($i)
      $name = 'slide-{0}.png' -f $i
      $outPath = Join-Path $OutDir $name

      for ($retry = 0; $retry -lt 4; $retry++) {
        try {
          $slide.Export($outPath, 'PNG', $pxWidth, $pxHeight)
          if (Test-Path -LiteralPath $outPath) { break }
        } catch {
          Start-Sleep -Milliseconds 250
        }
      }

      $lines = @()
      foreach ($sh in $slide.Shapes) {
        try {
          if ($sh.HasTextFrame -and $sh.TextFrame.HasText) {
            $txt = $sh.TextFrame.TextRange.Text.Trim()
            if ($txt) {
              $lines += ($txt -split "[\\r\\n]+" | Where-Object { $_.Trim() })
            }
          }
        } catch {}
      }

      $title = $null
      try {
        if ($slide.Shapes.HasTitle -ne 0) {
          $title = $slide.Shapes.Title.TextFrame.TextRange.Text.Trim()
        }
      } catch {}
      if (-not $title -and $lines.Count -gt 0) { $title = $lines[0] }
      if (-not $title) { $title = "Slide $i" }

      if (Test-Path -LiteralPath $outPath) {
        $slidesData += @{
          slideIndex = $i - 1
          sldId = [string]$slide.SlideID
          title = $title
          lines = $lines
          imagePath = $outPath
        }
      }
    }
  }

  $presTitle = $pres.Name

  if ($shouldClosePres -and $null -ne $pres) {
    try { $pres.Close() } catch {}
  }
  if ($shouldQuit -and $null -ne $ppt) {
    try { $ppt.Quit() } catch {}
  }

  Out-Json @{
    ok = $true
    title = $presTitle
    slideCount = $slideCount
    width = $pxWidth
    height = $pxHeight
    slides = $slidesData
  }
} catch {
  if ($shouldClosePres -and $null -ne $pres) { try { $pres.Close() } catch {} }
  if ($shouldQuit -and $null -ne $ppt) { try { $ppt.Quit() } catch {} }
  Out-Json @{ ok = $false; error = $_.Exception.Message }
}
exit 0
`;

function getPowerShellScriptPath(): string {
  const scriptPath = path.join(os.tmpdir(), 'bunsen-pptx-native-export.ps1');
  try {
    fs.writeFileSync(scriptPath, POWERPOINT_EXPORT_SCRIPT, 'utf8');
  } catch (err) {
    console.warn('[Native PPT Engine] Could not write export script to tmpdir:', err);
  }
  return scriptPath;
}

let isPptAvailableCached: boolean | null = null;

/**
 * Checks if Microsoft PowerPoint COM engine is available on this system.
 */
export async function isPowerPointEngineAvailable(): Promise<boolean> {
  if (process.platform !== 'win32') return false;
  if (isPptAvailableCached !== null) return isPptAvailableCached;

  return new Promise<boolean>((resolve) => {
    execFile(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        "if ([Type]::GetTypeFromProgID('PowerPoint.Application')) { exit 0 } else { exit 1 }",
      ],
      { timeout: 5000, windowsHide: true },
      (error) => {
        isPptAvailableCached = !error;
        resolve(isPptAvailableCached);
      }
    );
  });
}

/**
 * Executes PowerShell PowerPoint COM export with optional selective targets and cancellation support.
 */
function runPowerShellExport(
  inputFile: string,
  exportDir: string,
  targetWidth = 1920,
  targets?: ExportSlideTarget[],
  signal?: AbortSignal
): { promise: Promise<NativePptExportJson>; processRef?: ChildProcess } {
  const scriptPath = getPowerShellScriptPath();
  let tempTargetsFile: string | null = null;

  const args = [
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    scriptPath,
    '-InputFile',
    inputFile,
    '-OutDir',
    exportDir,
    '-TargetWidth',
    String(targetWidth),
  ];

  if (targets && targets.length > 0) {
    tempTargetsFile = path.join(exportDir, `targets-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.json`);
    try {
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }
      fs.writeFileSync(tempTargetsFile, JSON.stringify(targets), 'utf8');
      args.push('-TargetsFile', tempTargetsFile);
    } catch {
      args.push('-TargetsJson', JSON.stringify(targets));
    }
  }

  let child: ChildProcess | undefined;

  const promise = new Promise<NativePptExportJson>((resolve) => {
    child = execFile(
      'powershell.exe',
      args,
      {
        timeout: 180000,
        windowsHide: true,
        maxBuffer: 30 * 1024 * 1024,
        encoding: 'utf8',
      },
      (error, stdout, stderr) => {
        if (tempTargetsFile && fs.existsSync(tempTargetsFile)) {
          try {
            fs.unlinkSync(tempTargetsFile);
          } catch {}
        }

        if (signal?.aborted) {
          resolve({ ok: false, error: 'Export aborted by user or superseded by newer save.' });
          return;
        }

        const raw = (stdout || '').trim();
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        const payload = jsonMatch ? jsonMatch[0] : null;

        if (payload) {
          try {
            const parsed = JSON.parse(payload) as NativePptExportJson;
            resolve(parsed);
            return;
          } catch (parseErr) {
            console.warn('[Native PPT Engine] JSON parse error from PowerShell:', parseErr);
          }
        }

        resolve({
          ok: false,
          error: stderr || error?.message || 'Unknown PowerShell export error',
        });
      }
    );

    if (signal) {
      signal.addEventListener(
        'abort',
        () => {
          if (child && !child.killed) {
            console.log('[Native PPT Engine] Aborting PowerShell export process...');
            child.kill();
          }
          if (tempTargetsFile && fs.existsSync(tempTargetsFile)) {
            try {
              fs.unlinkSync(tempTargetsFile);
            } catch {}
          }
          resolve({ ok: false, error: 'Export aborted.' });
        },
        { once: true }
      );
    }
  });

  return { promise, processRef: child };
}

/**
 * Builds standard PptxSlideData from slide parameters and image.
 */
function buildSlideData(
  sldId: string,
  slideIndex: number,
  title: string,
  lines: string[],
  imagePath: string,
  canvasWidth: number,
  canvasHeight: number,
  aspectRatio: number,
  exportStatus: 'ready' | 'updating' | 'error' = 'ready'
): { slide: PptxSlideData; dataUrl: string } {
  let dataUrl = '';
  if (exportStatus === 'ready' && imagePath && fs.existsSync(imagePath)) {
    try {
      const imgBuf = fs.readFileSync(imagePath);
      dataUrl = `data:image/png;base64,${imgBuf.toString('base64')}`;
    } catch {
      dataUrl = imagePath;
    }
  }

  const slide: PptxSlideData = {
    id: `s-pptx-${sldId}`,
    sldId,
    slideIndex,
    title: title || `Slide ${slideIndex + 1}`,
    width: canvasWidth,
    height: canvasHeight,
    aspectRatio,
    background: {
      color: '#000000',
      imageDataUrl: dataUrl || undefined,
    },
    elements: [],
    lines: lines || [],
    html: dataUrl
      ? `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000;display:flex;align-items:center;justify-content:center;"><img src="${dataUrl}" style="width:100%;height:100%;object-fit:contain;" /></body></html>`
      : `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#18181b;color:#fff;font-family:sans-serif;display:flex;flex-direction:column;justify-content:center;"><h2>${title}</h2>${lines.map((l) => `<p>${l}</p>`).join('')}</body></html>`,
    thumbnailDataUrl: dataUrl || undefined,
    exportStatus,
  };

  return { slide, dataUrl };
}

/**
 * Performs a complete full export of all slides.
 */
export async function exportFullWithNativePowerPoint(
  inputFile: string,
  targetWidth = 1920,
  signal?: AbortSignal
): Promise<PptxParseResult> {
  const pptAvailable = await isPowerPointEngineAvailable();
  if (!pptAvailable) {
    console.log('[Native PPT Engine] PowerPoint COM unavailable; using cross-platform parser fallback.');
    return parsePowerPointFile(inputFile);
  }

  const deckCacheDir = presentationCache.getDeckCacheDir(inputFile);
  if (!fs.existsSync(deckCacheDir)) {
    fs.mkdirSync(deckCacheDir, { recursive: true });
  }

  const { promise } = runPowerShellExport(inputFile, deckCacheDir, targetWidth, undefined, signal);
  const parsed = await promise;

  if (parsed.ok && parsed.slides && parsed.slides.length > 0) {
    const canvasWidth = parsed.width || targetWidth;
    const canvasHeight = parsed.height || Math.round(canvasWidth * (9 / 16));
    const aspectRatio = canvasWidth / canvasHeight;

    const richSlides: PptxSlideData[] = [];
    const images: string[] = [];
    const cachedSlidesRecord: Record<string, CachedSlide> = {};
    const orderedSldIds: string[] = [];

    let deckStruct: DeckStructure | null = null;
    try {
      deckStruct = presentationDiffer.parseDeckStructure(inputFile);
    } catch {
      // Fallback
    }

    for (let i = 0; i < parsed.slides.length; i++) {
      const s = parsed.slides[i];
      const sldId = s.sldId || deckStruct?.slides[i]?.sldId || String(256 + i);
      const permImagePath = presentationCache.getSlideImagePath(inputFile, sldId);

      if (s.imagePath !== permImagePath && fs.existsSync(s.imagePath)) {
        try {
          fs.copyFileSync(s.imagePath, permImagePath);
        } catch {
          // Keep existing imagePath
        }
      }

      const finalImagePath = fs.existsSync(permImagePath) ? permImagePath : s.imagePath;
      const { slide, dataUrl } = buildSlideData(
        sldId,
        s.slideIndex,
        s.title,
        s.lines,
        finalImagePath,
        canvasWidth,
        canvasHeight,
        aspectRatio,
        'ready'
      );

      richSlides.push(slide);
      images.push(dataUrl);
      orderedSldIds.push(sldId);

      const contentHash = deckStruct?.slides[i]?.contentHash || '';
      cachedSlidesRecord[sldId] = {
        sldId,
        slideIndex: s.slideIndex,
        contentHash,
        imagePath: finalImagePath,
        title: s.title,
        lines: s.lines,
        width: canvasWidth,
        height: canvasHeight,
      };
    }

    // Save manifest
    const newCache: PresentationDeckCache = {
      filePath: inputFile,
      lastUpdated: Date.now(),
      width: canvasWidth,
      height: canvasHeight,
      aspectRatio,
      slides: cachedSlidesRecord,
      orderedSldIds,
    };
    presentationCache.saveCache(newCache);

    console.log(
      `[Native PPT Engine] Successfully exported ${richSlides.length} exact slides for "${parsed.title}" via Microsoft PowerPoint engine.`
    );

    return {
      ok: true,
      title: parsed.title || path.basename(inputFile, path.extname(inputFile)),
      slideCount: richSlides.length,
      slides: richSlides,
      images,
      filePath: inputFile,
      width: canvasWidth,
      height: canvasHeight,
    };
  }

  console.warn(
    `[Native PPT Engine] Native COM export failed (${parsed.error || 'Unknown'}). Falling back to in-memory parser.`
  );
  return parsePowerPointFile(inputFile);
}

/**
 * Selective, prioritized, and lazy PowerPoint exporter:
 * 1. Diffs the presentation without PowerPoint.
 * 2. On first open (no cache), prioritizes first visible slides and exports rest in background.
 * 3. On update, exports ONLY changed and added slides through PowerPoint COM.
 * 4. Reuses cached images and metadata for unchanged and reordered slides.
 * 5. Supports cancellation via AbortSignal to coalesce rapid save events.
 */
export async function exportWithNativePowerPoint(
  inputFile: string,
  targetWidth = 1920,
  signal?: AbortSignal,
  onProgressBatch?: (payload: PresentationSyncPayload) => void
): Promise<IncrementalExportResult> {
  const pptAvailable = await isPowerPointEngineAvailable();
  if (!pptAvailable) {
    console.log('[Native PPT Engine] PowerPoint COM unavailable; using cross-platform parser fallback.');
    return parsePowerPointFile(inputFile);
  }

  // 1. Slide diffing without PowerPoint
  let deckStructure: DeckStructure;
  try {
    deckStructure = presentationDiffer.parseDeckStructure(inputFile);
  } catch (diffErr) {
    console.warn(
      `[Native PPT Engine] Slide diffing failed (${(diffErr as Error)?.message || diffErr}); falling back to full export.`
    );
    return exportFullWithNativePowerPoint(inputFile, targetWidth, signal);
  }

  const cachedDeck = presentationCache.loadCache(inputFile);
  const deckCacheDir = presentationCache.getDeckCacheDir(inputFile);
  if (!fs.existsSync(deckCacheDir)) {
    fs.mkdirSync(deckCacheDir, { recursive: true });
  }

  // 2. Initial Open (No cache exists yet): Prioritized lazy export
  if (!cachedDeck) {
    console.log(`[Native PPT Engine] Initial open detected for ${inputFile} (${deckStructure.slideCount} slides).`);

    // If deck has more than 5 slides and progress callback provided, export first visible batch first
    if (deckStructure.slideCount > 5 && onProgressBatch) {
      const priorityCount = Math.min(5, deckStructure.slideCount);
      console.log(`[Native PPT Engine] Prioritized lazy export: exporting first ${priorityCount} visible slides first...`);

      const priorityTargets: ExportSlideTarget[] = deckStructure.slides.slice(0, priorityCount).map((s) => ({
        slideIndex: s.slideIndex + 1,
        sldId: s.sldId,
        outPath: presentationCache.getSlideImagePath(inputFile, s.sldId),
      }));

      const { promise: priorityPromise } = runPowerShellExport(inputFile, deckCacheDir, targetWidth, priorityTargets, signal);
      const priorityResult = await priorityPromise;

      if (signal?.aborted) {
        return { ok: false, error: 'Export aborted.' };
      }

      if (priorityResult.ok && priorityResult.slides && priorityResult.slides.length > 0) {
        const priorityExportedMap = new Map<string, NativePptSlideInfo>();
        for (const s of priorityResult.slides) {
          if (s.sldId) priorityExportedMap.set(s.sldId, s);
        }

        const initialSlides: PptxSlideData[] = [];
        const initialImages: string[] = [];

        for (let i = 0; i < deckStructure.slides.length; i++) {
          const s = deckStructure.slides[i];
          const isPriority = i < priorityCount;
          const exported = priorityExportedMap.get(s.sldId);
          const permImagePath = presentationCache.getSlideImagePath(inputFile, s.sldId);
          const finalImg = exported?.imagePath || permImagePath;

          const { slide, dataUrl } = buildSlideData(
            s.sldId,
            s.slideIndex,
            exported?.title || s.title || `Slide ${i + 1}`,
            exported?.lines || s.lines || [],
            finalImg,
            deckStructure.width,
            deckStructure.height,
            deckStructure.aspectRatio,
            isPriority ? 'ready' : 'updating'
          );
          initialSlides.push(slide);
          initialImages.push(dataUrl);
        }

        // Broadcast initial priority batch immediately so operator UI displays without delay
        onProgressBatch({
          filePath: inputFile,
          title: deckStructure.title,
          slideCount: deckStructure.slideCount,
          slides: initialSlides,
          timestamp: Date.now(),
          isIncremental: false,
        });

        // Background batch: export remaining slides
        console.log(`[Native PPT Engine] Background export starting for remaining ${deckStructure.slideCount - priorityCount} slides...`);
        const remainingTargets: ExportSlideTarget[] = deckStructure.slides.slice(priorityCount).map((s) => ({
          slideIndex: s.slideIndex + 1,
          sldId: s.sldId,
          outPath: presentationCache.getSlideImagePath(inputFile, s.sldId),
        }));

        const { promise: remainingPromise } = runPowerShellExport(inputFile, deckCacheDir, targetWidth, remainingTargets, signal);
        const remainingResult = await remainingPromise;

        if (signal?.aborted) {
          return { ok: false, error: 'Export aborted.' };
        }

        if (remainingResult.ok && remainingResult.slides) {
          const remainingExportedMap = new Map<string, NativePptSlideInfo>();
          for (const s of remainingResult.slides) {
            if (s.sldId) remainingExportedMap.set(s.sldId, s);
          }

          const completeSlides: PptxSlideData[] = [];
          const completeImages: string[] = [];
          const completeCacheRecords: Record<string, CachedSlide> = {};

          for (let i = 0; i < deckStructure.slides.length; i++) {
            const s = deckStructure.slides[i];
            const exported = priorityExportedMap.get(s.sldId) || remainingExportedMap.get(s.sldId);
            const permImagePath = presentationCache.getSlideImagePath(inputFile, s.sldId);
            const finalImg = exported?.imagePath || permImagePath;
            const title = exported?.title || s.title || `Slide ${i + 1}`;
            const lines = exported?.lines || s.lines || [];

            const { slide, dataUrl } = buildSlideData(
              s.sldId,
              s.slideIndex,
              title,
              lines,
              finalImg,
              deckStructure.width,
              deckStructure.height,
              deckStructure.aspectRatio,
              'ready'
            );
            completeSlides.push(slide);
            completeImages.push(dataUrl);

            completeCacheRecords[s.sldId] = {
              sldId: s.sldId,
              slideIndex: s.slideIndex,
              contentHash: s.contentHash,
              imagePath: finalImg,
              title,
              lines,
              width: deckStructure.width,
              height: deckStructure.height,
            };
          }

          // Save complete cache
          presentationCache.saveCache({
            filePath: inputFile,
            lastUpdated: Date.now(),
            width: deckStructure.width,
            height: deckStructure.height,
            aspectRatio: deckStructure.aspectRatio,
            slides: completeCacheRecords,
            orderedSldIds: deckStructure.slides.map((s) => s.sldId),
          });

          const completePayload: PresentationSyncPayload = {
            filePath: inputFile,
            title: deckStructure.title,
            slideCount: completeSlides.length,
            slides: completeSlides,
            timestamp: Date.now(),
            isIncremental: true,
          };

          onProgressBatch(completePayload);

          return {
            ok: true,
            title: deckStructure.title,
            slideCount: completeSlides.length,
            slides: completeSlides,
            images: completeImages,
            filePath: inputFile,
            width: deckStructure.width,
            height: deckStructure.height,
            isIncremental: true,
            exportedCount: deckStructure.slideCount,
            reusedCount: 0,
          };
        }
      }
    }

    // Default full export for small decks or when progress callback not supplied
    return exportFullWithNativePowerPoint(inputFile, targetWidth, signal);
  }

  // 3. Classify slides against cache
  const diff = presentationDiffer.diffDeckAgainstCache(deckStructure, cachedDeck);

  const canvasWidth = cachedDeck.width || targetWidth;
  const canvasHeight = cachedDeck.height || Math.round(canvasWidth * (9 / 16));
  const aspectRatio = cachedDeck.aspectRatio || canvasWidth / canvasHeight;

  // Case A: Nothing changed at all
  if (!diff.hasChanges) {
    console.log(`[Native PPT Engine] 0 changes detected in ${deckStructure.slideCount} slides for ${inputFile}. Serving from cache.`);
    const richSlides: PptxSlideData[] = [];
    const images: string[] = [];

    for (const item of diff.slides) {
      const cached = item.cachedSlide!;
      const { slide, dataUrl } = buildSlideData(
        item.sldId,
        item.slideIndex,
        cached.title || `Slide ${item.slideIndex + 1}`,
        cached.lines || [],
        cached.imagePath,
        canvasWidth,
        canvasHeight,
        aspectRatio,
        'ready'
      );
      richSlides.push(slide);
      images.push(dataUrl);
    }

    return {
      ok: true,
      title: deckStructure.title,
      slideCount: richSlides.length,
      slides: richSlides,
      images,
      filePath: inputFile,
      width: canvasWidth,
      height: canvasHeight,
      diffResult: diff,
      isIncremental: true,
      exportedCount: 0,
      reusedCount: richSlides.length,
      fromCache: true,
    };
  }

  // Case B: Reordering or deletion only (no content modified or added)
  // Reordering alone must not trigger any export!
  if (!diff.needsExport) {
    console.log(
      `[Native PPT Engine] Reorder/deletion detected (${diff.reorderedCount} reordered, ${diff.removedCount} removed). 0 slides require export.`
    );

    presentationCache.purgeRemovedSlides(inputFile, deckStructure.slides.map((s) => s.sldId));

    const richSlides: PptxSlideData[] = [];
    const images: string[] = [];
    const updatedCacheSlides: Record<string, CachedSlide> = { ...cachedDeck.slides };

    for (const item of diff.slides) {
      const cached = item.cachedSlide!;
      cached.slideIndex = item.slideIndex;
      updatedCacheSlides[item.sldId] = cached;

      const { slide, dataUrl } = buildSlideData(
        item.sldId,
        item.slideIndex,
        cached.title || `Slide ${item.slideIndex + 1}`,
        cached.lines || [],
        cached.imagePath,
        canvasWidth,
        canvasHeight,
        aspectRatio,
        'ready'
      );
      richSlides.push(slide);
      images.push(dataUrl);
    }

    cachedDeck.slides = updatedCacheSlides;
    cachedDeck.orderedSldIds = deckStructure.slides.map((s) => s.sldId);
    cachedDeck.lastUpdated = Date.now();
    presentationCache.saveCache(cachedDeck);

    return {
      ok: true,
      title: deckStructure.title,
      slideCount: richSlides.length,
      slides: richSlides,
      images,
      filePath: inputFile,
      width: canvasWidth,
      height: canvasHeight,
      diffResult: diff,
      isIncremental: true,
      exportedCount: 0,
      reusedCount: richSlides.length,
    };
  }

  // Case C: Selective export for changed and added slides
  const changedAndAdded = diff.slides.filter((s) => s.status === 'changed' || s.status === 'added');
  console.log(
    `[Native PPT Engine] Incremental sync: ${changedAndAdded.length} of ${diff.totalSlides} slides need export (${diff.changedCount} changed, ${diff.addedCount} added, ${diff.unchangedCount} unchanged, ${diff.reorderedCount} reordered).`
  );

  const exportTargets: ExportSlideTarget[] = changedAndAdded.map((s) => ({
    slideIndex: s.slideIndex + 1, // 1-based index in presentation
    sldId: s.sldId,
    outPath: presentationCache.getSlideImagePath(inputFile, s.sldId),
  }));

  const { promise } = runPowerShellExport(inputFile, deckCacheDir, targetWidth, exportTargets, signal);
  const selectiveResult = await promise;

  if (signal?.aborted) {
    return { ok: false, error: 'Export aborted.' };
  }

  if (!selectiveResult.ok || !selectiveResult.slides || selectiveResult.slides.length === 0) {
    console.warn(
      `[Native PPT Engine] Selective COM export failed (${selectiveResult.error || 'No slides returned'}). Falling back to full export.`
    );
    return exportFullWithNativePowerPoint(inputFile, targetWidth, signal);
  }

  // Map newly exported slides by sldId and slideIndex
  const newlyExportedBySldId = new Map<string, NativePptSlideInfo>();
  const newlyExportedByIndex = new Map<number, NativePptSlideInfo>();
  for (const s of selectiveResult.slides) {
    if (s.sldId) {
      newlyExportedBySldId.set(s.sldId, s);
    }
    newlyExportedByIndex.set(s.slideIndex, s);
  }

  // Update cache and assemble all slides in order
  presentationCache.purgeRemovedSlides(inputFile, deckStructure.slides.map((s) => s.sldId));
  const updatedCacheSlides: Record<string, CachedSlide> = { ...cachedDeck.slides };
  const richSlides: PptxSlideData[] = [];
  const images: string[] = [];

  for (const item of diff.slides) {
    const sldId = item.sldId;
    const targetInfo = exportTargets.find((t) => t.sldId === sldId);
    const permImagePath = presentationCache.getSlideImagePath(inputFile, sldId);

    if (item.status === 'changed' || item.status === 'added') {
      const exported = newlyExportedBySldId.get(sldId) || (targetInfo ? newlyExportedByIndex.get(targetInfo.slideIndex - 1) : undefined);
      const title = exported?.title || item.cachedSlide?.title || item.title || `Slide ${item.slideIndex + 1}`;
      const lines = exported?.lines || item.cachedSlide?.lines || item.lines || [];
      const imagePath = exported?.imagePath || permImagePath;

      updatedCacheSlides[sldId] = {
        sldId,
        slideIndex: item.slideIndex,
        contentHash: item.contentHash,
        imagePath,
        title,
        lines,
        width: canvasWidth,
        height: canvasHeight,
      };

      const { slide, dataUrl } = buildSlideData(
        sldId,
        item.slideIndex,
        title,
        lines,
        imagePath,
        canvasWidth,
        canvasHeight,
        aspectRatio,
        'ready'
      );
      richSlides.push(slide);
      images.push(dataUrl);
    } else {
      // Unchanged or reordered: reuse from cache
      const cached = item.cachedSlide!;
      cached.slideIndex = item.slideIndex;
      updatedCacheSlides[sldId] = cached;

      const { slide, dataUrl } = buildSlideData(
        sldId,
        item.slideIndex,
        cached.title || `Slide ${item.slideIndex + 1}`,
        cached.lines || [],
        cached.imagePath,
        canvasWidth,
        canvasHeight,
        aspectRatio,
        'ready'
      );
      richSlides.push(slide);
      images.push(dataUrl);
    }
  }

  // Persist updated manifest
  cachedDeck.slides = updatedCacheSlides;
  cachedDeck.orderedSldIds = deckStructure.slides.map((s) => s.sldId);
  cachedDeck.lastUpdated = Date.now();
  presentationCache.saveCache(cachedDeck);

  console.log(
    `[Native PPT Engine] Incremental sync complete for "${deckStructure.title}": ${changedAndAdded.length} exported, ${diff.unchangedCount + diff.reorderedCount} reused from cache.`
  );

  return {
    ok: true,
    title: deckStructure.title,
    slideCount: richSlides.length,
    slides: richSlides,
    images,
    filePath: inputFile,
    width: canvasWidth,
    height: canvasHeight,
    diffResult: diff,
    isIncremental: true,
    exportedCount: changedAndAdded.length,
    reusedCount: diff.unchangedCount + diff.reorderedCount,
  };
}
