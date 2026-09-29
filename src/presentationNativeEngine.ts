import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { PptxSlideData, PptxParseResult } from './types/presentation';
import { parsePowerPointFile } from './presentationParser';

export interface NativePptSlideInfo {
  slideIndex: number;
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

const POWERPOINT_EXPORT_SCRIPT = `param(
  [Parameter(Mandatory = $true)][string]$InputFile,
  [Parameter(Mandatory = $true)][string]$OutDir,
  [int]$TargetWidth = 1920
)

$ErrorActionPreference = 'Stop'
function Out-Json { param($Obj) Write-Output ($Obj | ConvertTo-Json -Compress -Depth 6) }

if (-not (Test-Path -LiteralPath $InputFile)) {
  Out-Json @{ ok = $false; error = "The PowerPoint file could not be found at: $InputFile" }
  exit 0
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

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
  for ($i = 1; $i -le $slideCount; $i++) {
    $slide = $pres.Slides.Item($i)
    $name = 'slide-{0}.png' -f $i
    $outPath = Join-Path $OutDir $name

    # Retry export up to 4 times in case of write lock / RPC busy
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
        title = $title
        lines = $lines
        imagePath = $outPath
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
    slideCount = $slidesData.Count
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
 * High-fidelity PowerPoint native exporter:
 * Uses Microsoft PowerPoint's native engine to render 100% pixel-perfect Full-HD slide frames
 * with exact typography, master layouts, shapes, gradients, and original PowerPoint fidelity.
 */
export async function exportWithNativePowerPoint(
  inputFile: string,
  targetWidth = 1920
): Promise<PptxParseResult> {
  // If not on Windows or PowerPoint is unavailable, fall back gracefully to the pure JS parser
  const pptAvailable = await isPowerPointEngineAvailable();
  if (!pptAvailable) {
    console.log('[Native PPT Engine] PowerPoint COM unavailable; using cross-platform parser fallback.');
    return parsePowerPointFile(inputFile);
  }

  const exportDir = path.join(
    app.getPath('userData'),
    'presentation-exports',
    `ppt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  );

  return new Promise<PptxParseResult>((resolve) => {
    const scriptPath = getPowerShellScriptPath();

    execFile(
      'powershell.exe',
      [
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
      ],
      {
        timeout: 120000,
        windowsHide: true,
        maxBuffer: 20 * 1024 * 1024,
        encoding: 'utf8',
      },
      async (error, stdout, stderr) => {
        const raw = (stdout || '').trim();
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        const payload = jsonMatch ? jsonMatch[0] : null;

        if (payload) {
          try {
            const parsed = JSON.parse(payload) as NativePptExportJson;
            if (parsed.ok && parsed.slides && parsed.slides.length > 0) {
              const canvasWidth = parsed.width || targetWidth;
              const canvasHeight = parsed.height || Math.round(canvasWidth * (9 / 16));
              const aspectRatio = canvasWidth / canvasHeight;

              const richSlides: PptxSlideData[] = [];
              const images: string[] = [];

              for (const s of parsed.slides) {
                let dataUrl = '';
                try {
                  const imgBuf = fs.readFileSync(s.imagePath);
                  dataUrl = `data:image/png;base64,${imgBuf.toString('base64')}`;
                } catch {
                  dataUrl = s.imagePath;
                }

                images.push(dataUrl);

                richSlides.push({
                  id: `s-pptx-${s.slideIndex + 1}`,
                  slideIndex: s.slideIndex,
                  title: s.title || `Slide ${s.slideIndex + 1}`,
                  width: canvasWidth,
                  height: canvasHeight,
                  aspectRatio,
                  background: {
                    color: '#000000',
                    imageDataUrl: dataUrl,
                  },
                  elements: [],
                  lines: s.lines || [],
                  html: `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000;display:flex;align-items:center;justify-content:center;"><img src="${dataUrl}" style="width:100%;height:100%;object-fit:contain;" /></body></html>`,
                  thumbnailDataUrl: dataUrl,
                });
              }

              console.log(
                `[Native PPT Engine] Successfully exported ${richSlides.length} exact slides for "${parsed.title}" via Microsoft PowerPoint engine.`
              );

              resolve({
                ok: true,
                title: parsed.title || path.basename(inputFile, path.extname(inputFile)),
                slideCount: richSlides.length,
                slides: richSlides,
                images,
                filePath: inputFile,
                width: canvasWidth,
                height: canvasHeight,
              });
              return;
            }
          } catch (parseErr) {
            console.warn('[Native PPT Engine] JSON parse error from PowerShell:', parseErr);
          }
        }

        console.warn(
          `[Native PPT Engine] Native COM export failed (${stderr || error?.message || 'Unknown'}). Falling back to in-memory parser.`
        );
        // Graceful fallback to pure JS parser if COM fails
        const fallbackResult = await parsePowerPointFile(inputFile);
        resolve(fallbackResult);
      }
    );
  });
}
