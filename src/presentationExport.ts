import { app, ipcMain, net } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';

export interface PresentationExportResult {
  ok: boolean;
  title?: string;
  slideCount?: number;
  images?: string[];
  width?: number;
  height?: number;
  error?: string;
}

const EXPORT_SUB_DIR = 'presentation-exports';
const EXPORT_TIMEOUT_MS = 600000;

const POWERPOINT_SCRIPT = `param(
  [Parameter(Mandatory = $true)][string]$InputFile,
  [Parameter(Mandatory = $true)][string]$OutDir,
  [int]$TargetWidth = 1920
)
$ErrorActionPreference = 'Stop'
function Out-Json { param($Obj) Write-Output ($Obj | ConvertTo-Json -Compress -Depth 6) }

if (-not (Test-Path -LiteralPath $InputFile)) {
  Out-Json @{ ok = $false; error = "The PowerPoint file could not be found at: $InputFile" }
  exit 1
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

try {
  $ppt = New-Object -ComObject PowerPoint.Application
  $ppt.DisplayAlerts = 1
} catch {
  Out-Json @{ ok = $false; error = 'Microsoft PowerPoint is not installed on this computer. Install PowerPoint (or Office) to import decks as original-looking slides.' }
  exit 1
}

$pres = $null
try {
  $pres = $ppt.Presentations.Open($InputFile, $true, $false, $false)
  $slideCount = $pres.Slides.Count
  $ptWidth = $pres.PageSetup.SlideWidth
  $ptHeight = $pres.PageSetup.SlideHeight
  if ($ptHeight -le 0) { $ptHeight = $ptWidth * 9 / 16 }
  $scaleFactor = $TargetWidth / [double]$ptWidth
  $pxWidth = [int][Math]::Max(1, [Math]::Round($ptWidth * $scaleFactor))
  $pxHeight = [int][Math]::Max(1, [Math]::Round($ptHeight * $scaleFactor))

  $imagePaths = @()
  for ($i = 1; $i -le $slideCount; $i++) {
    $name = 'slide-{0}.png' -f $i
    $outPath = Join-Path $OutDir $name
    $pres.Slides.Item($i).Export($outPath, 'PNG', $pxWidth, $pxHeight)
    if (Test-Path -LiteralPath $outPath) {
      $imagePaths += $outPath
    }
  }

  $presTitle = $pres.Name

  try { $pres.Close() } catch { }
  try { $ppt.Quit() } catch { }
  if ($pres) { try { [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($pres) | Out-Null } catch { } }
  if ($ppt) { try { [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($ppt) | Out-Null } catch { } }

  $errorMsg = $null
  if ($imagePaths.Count -eq 0) { $errorMsg = 'PowerPoint returned no slide images.' }
  Out-Json @{ ok = ($imagePaths.Count -gt 0); title = $presTitle; slideCount = $slideCount; images = @($imagePaths); width = $pxWidth; height = $pxHeight; error = $errorMsg }
} catch {
  try { $pres.Close() } catch { }
  try { $ppt.Quit() } catch { }
  Out-Json @{ ok = $false; error = $_.Exception.Message }
}
exit 0
`;

function buildPowerShellScript(): string {
  const scriptPath = path.join(os.tmpdir(), `bunsen-pptx-export-${Date.now()}.ps1`);
  fs.writeFileSync(scriptPath, POWERPOINT_SCRIPT, 'utf8');
  return scriptPath;
}

/**
 * Runs the PowerPoint COM export and resolves with structured results.
 */
function runPowerPointExport(inputFile: string, outDir: string): Promise<PresentationExportResult> {
  return new Promise<PresentationExportResult>((resolve) => {
    const scriptPath = buildPowerShellScript();

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
        outDir,
      ],
      {
        timeout: EXPORT_TIMEOUT_MS,
        windowsHide: true,
        maxBuffer: 10 * 1024 * 1024,
        encoding: 'utf8',
      },
      (error, stdout, stderr) => {
        try {
          fs.unlinkSync(scriptPath);
        } catch {
          // ignore
        }

        const raw = (stdout || '').trim();
        const jsonMatch = raw.match(/\{[^{}]*\}/);
        const payload = jsonMatch ? jsonMatch[0] : null;

        if (payload) {
          try {
            const parsed = JSON.parse(payload) as PresentationExportResult;
            resolve({ ok: Boolean(parsed.ok), ...parsed });
            return;
          } catch {
            // fall through to error path
          }
        }

        // PowerShell unavailable entirely (e.g. stripped Windows images)
        if (error && !stdout && !stderr) {
          resolve({
            ok: false,
            error: 'PowerShell could not be launched. PowerPoint export is unavailable on this system.',
          });
          return;
        }

        resolve({
          ok: false,
          error: (stderr || error?.message || 'Unknown PowerPoint export failure.').trim(),
        });
      }
    );
  });
}

/**
 * Downloads a remote presentation file (http/https URL) to a temp location.
 */
async function downloadRemoteFile(url: string): Promise<string> {
  const cleanUrl = url.trim();
  const name = `bunsen-ppt-${Date.now()}${/\.(pptx?|pdf)$/i.test(cleanUrl) ? cleanUrl.match(/\.(pptx?|pdf)$/i)?.[0].toLowerCase() : '.pptx'}`;
  const dest = path.join(os.tmpdir(), name);

  const res = await net.fetch(cleanUrl);
  if (!res.ok) {
    throw new Error(`Failed to download PowerPoint file (HTTP ${res.status}).`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buffer);
  return dest;
}

/**
 * Normalizes a user-supplied local presentation path into an absolute path that
 * `Test-Path`/PowerShell can find: strips wrapping quotes, converts file:// and
 * bunsen-media:// URLs back to plain paths, and resolves relative paths against
 * the user's home directory.
 */
function normalizeLocalPresentationPath(raw: string): string {
  let p = raw.trim();
  if (
    (p.startsWith('"') && p.endsWith('"')) ||
    (p.startsWith("'") && p.endsWith("'"))
  ) {
    p = p.slice(1, -1).trim();
  }

  if (/^bunsen-media:/i.test(p)) {
    let clean = p.replace(/^bunsen-media:\/+/i, '').replace(/^(media|local)\//i, '');
    if (process.platform === 'win32') {
      if (/^\/[a-zA-Z]:[/\\]/.test(clean)) {
        clean = clean.slice(1);
      } else if (/^[a-zA-Z][/\\]/.test(clean)) {
        clean = clean[0].toUpperCase() + ':' + clean.slice(1);
      }
    }
    return clean;
  }

  if (/^file:\/\//i.test(p)) {
    try {
      return decodeURI(p.replace(/^file:\/+\/?/i, ''));
    } catch {
      return p.replace(/^file:\/+\/?/i, '');
    }
  }

  const isAbsoluteWindows = /^[a-zA-Z]:[\\/]/.test(p);
  const isUnc = /^\\\\/.test(p);
  if (!isAbsoluteWindows && !isUnc && !/^\/\//.test(p)) {
    const home = os.homedir();
    p = path.join(home, p.replace(/^[\\/]+/, ''));
  }

  return p;
}

function getCandidateFolders(): string[] {
  const dirs = new Set<string>();
  const add = (d?: string) => {
    if (d && typeof d === 'string') {
      try {
        if (fs.existsSync(d) && fs.statSync(d).isDirectory()) {
          dirs.add(path.normalize(d));
        }
      } catch {
        // ignore
      }
    }
  };

  const appFolderKeys = ['downloads', 'desktop', 'documents', 'videos', 'pictures', 'home'] as const;
  for (const k of appFolderKeys) {
    try {
      add(app.getPath(k));
    } catch {
      // ignore
    }
  }

  const home = os.homedir();
  add(home);
  add(path.join(home, 'Downloads'));
  add(path.join(home, 'Desktop'));
  add(path.join(home, 'Documents'));
  add(path.join(home, 'Videos'));
  add(path.join(home, 'Pictures'));

  const oneDriveRoot = process.env.OneDrive || path.join(home, 'OneDrive');
  add(oneDriveRoot);
  add(path.join(oneDriveRoot, 'Downloads'));
  add(path.join(oneDriveRoot, 'Desktop'));
  add(path.join(oneDriveRoot, 'Documents'));

  add(process.cwd());

  return Array.from(dirs);
}

/**
 * Searches common user folders (Downloads, Desktop, Documents, Videos, Pictures,
 * plus OneDrive equivalents) for a file matching the given name. Used when a
 * bare filename is supplied with no directory.
 */
function findFileInCandidateFolders(filename: string): string | null {
  const base = path.basename(filename);
  const hasExtension = /\.[^./\\]+$/.test(base);
  const variants = hasExtension
    ? [base]
    : [base, `${base}.pptx`, `${base}.ppt`, `${base}.pdf`];

  // Normalize curly/smart quotes (’ vs ') and Unicode so typed names match disk names
  const normalizeName = (s: string) =>
    s
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/\s+/g, ' ')
      .trim()
      .normalize('NFC')
      .toLowerCase();
  const normalizedVariants = variants.map(normalizeName);
  const candidateDirs = getCandidateFolders();

  // 1. Direct check in candidate dirs
  for (const dir of candidateDirs) {
    let entries: string[];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (normalizedVariants.includes(normalizeName(entry))) {
        const full = path.join(dir, entry);
        try {
          if (fs.existsSync(full) && !fs.statSync(full).isDirectory()) {
            return full;
          }
        } catch {
          // ignore
        }
      }
    }
  }

  // 2. One level deep in candidate dirs (skipping heavy system/cache folders)
  for (const dir of candidateDirs) {
    let dirents: fs.Dirent[];
    try {
      dirents = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const d of dirents) {
      if (d.isDirectory()) {
        const subName = d.name.toLowerCase();
        if (subName.startsWith('.') || subName === 'node_modules' || subName === 'appdata' || subName === 'program files') {
          continue;
        }
        const subDir = path.join(dir, d.name);
        let subEntries: string[];
        try {
          subEntries = fs.readdirSync(subDir);
        } catch {
          continue;
        }
        for (const entry of subEntries) {
          if (normalizedVariants.includes(normalizeName(entry))) {
            const full = path.join(subDir, entry);
            try {
              if (fs.existsSync(full) && !fs.statSync(full).isDirectory()) {
                return full;
              }
            } catch {
              // ignore
            }
          }
        }
      }
    }
  }

  return null;
}

export function registerPresentationIpc(): void {
  ipcMain.handle('presentation:export-pptx', async (_event, source: string): Promise<PresentationExportResult> => {
    if (!source || typeof source !== 'string') {
      return { ok: false, error: 'No PowerPoint source provided.' };
    }

    const trimmed = source.trim();
    const isRemote = /^https?:\/\//i.test(trimmed);
    const tempDownload = isRemote ? await downloadRemoteFile(trimmed).catch((err) => err) : null;

    if (tempDownload instanceof Error) {
      return { ok: false, error: tempDownload.message };
    }

    let inputFile = (tempDownload as string | null) || normalizeLocalPresentationPath(trimmed);
    console.log('[PPTX export] received source:', JSON.stringify(source), '=> normalized input:', inputFile);

    if (!tempDownload && !fs.existsSync(inputFile)) {
      const found = findFileInCandidateFolders(inputFile) || findFileInCandidateFolders(trimmed);
      if (found) {
        inputFile = found;
        console.log('[PPTX export] resolved bare filename to:', inputFile);
      }
    }

    if (!tempDownload && !fs.existsSync(inputFile)) {
      const hasPathSep = /[/\\]/.test(trimmed);
      return {
        ok: false,
        error: hasPathSep
          ? `The PowerPoint file could not be found at: ${inputFile}`
          : `The PowerPoint file "${trimmed}" could not be found. Please check that the file exists or select it using the Browse button.`,
      };
    }

    const outDir = path.join(
      app.getPath('userData'),
      EXPORT_SUB_DIR,
      `ppt-${Date.now()}${Math.random().toString(36).slice(2, 8)}`
    );

    const result = await runPowerPointExport(inputFile, outDir);

    // Clean up downloaded temp file only (exported images live in userData)
    if (tempDownload) {
      try {
        fs.unlinkSync(tempDownload as string);
      } catch {
        // ignore
      }
    }

    return result;
  });
}