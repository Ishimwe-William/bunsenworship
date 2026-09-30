import { app, ipcMain, net } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { exportWithNativePowerPoint } from './presentationNativeEngine';
import { presentationWatcher } from './presentationWatcher';
import { isPowerPointAvailable } from './main/powerpoint/PowerPointController';
import { PptxSlideData, PptxParseResult } from './types/presentation';

export interface PresentationExportResult {
  ok: boolean;
  title?: string;
  slideCount?: number;
  images?: string[];
  slides?: PptxSlideData[];
  filePath?: string;
  width?: number;
  height?: number;
  error?: string;
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
 * Normalizes a user-supplied local presentation path into an absolute path:
 * strips wrapping quotes, converts file:// and bunsen-media:// URLs back to plain paths,
 * and resolves relative paths against the user's home directory.
 */
export function normalizeLocalPresentationPath(raw: string): string {
  let p = raw.trim();
  if (
    (p.startsWith('"') && p.endsWith('"')) ||
    (p.startsWith("'") && p.endsWith("'"))
  ) {
    p = p.slice(1, -1).trim();
  }

  if (/^bunsen-media:/i.test(p)) {
    let clean = p.replace(/^bunsen-media:\/+/i, '').replace(/^(media|local)\//i, '');
    clean = clean.split(/[?#]/)[0];
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
    : [base, `${base}.pptx`, `${base}.ppt`];

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

/**
 * Resolves a presentation source (path or URL) into an accessible local file path.
 */
async function resolvePresentationPath(source: string): Promise<{ resolvedPath: string | null; isRemote: boolean; error?: string }> {
  if (!source || typeof source !== 'string') {
    return { resolvedPath: null, isRemote: false, error: 'No PowerPoint source provided.' };
  }

  const trimmed = source.trim();
  const isRemote = /^https?:\/\//i.test(trimmed);

  if (isRemote) {
    try {
      const downloaded = await downloadRemoteFile(trimmed);
      return { resolvedPath: downloaded, isRemote: true };
    } catch (err) {
      return { resolvedPath: null, isRemote: true, error: (err as Error)?.message || 'Failed to download remote file.' };
    }
  }

  let inputFile = normalizeLocalPresentationPath(trimmed);
  if (!fs.existsSync(inputFile)) {
    const found = findFileInCandidateFolders(inputFile) || findFileInCandidateFolders(trimmed);
    if (found) {
      inputFile = found;
    }
  }

  if (!fs.existsSync(inputFile)) {
    const hasPathSep = /[/\\]/.test(trimmed);
    return {
      resolvedPath: null,
      isRemote: false,
      error: hasPathSep
        ? `The PowerPoint file could not be found at: ${inputFile}`
        : `The PowerPoint file "${trimmed}" could not be found. Please check that the file exists or select it using the Browse button.`,
    };
  }

  return { resolvedPath: inputFile, isRemote: false };
}

/**
 * Registers presentation IPC endpoints for the reactive PowerPoint pipeline.
 */
export function registerPresentationIpc(): void {
  // 1. Primary PPTX parsing / export endpoint
  ipcMain.handle('presentation:export-pptx', async (_event, source: string): Promise<PresentationExportResult> => {
    const resolution = await resolvePresentationPath(source);
    if (!resolution.resolvedPath) {
      return { ok: false, error: resolution.error || 'Failed to resolve presentation file.' };
    }

    const { resolvedPath, isRemote } = resolution;
    console.log('[PPTX Pipeline] Parsing presentation file:', resolvedPath);

    // Check if PowerPoint is available for high-fidelity export
    const pptAvailable = isPowerPointAvailable();
    if (!pptAvailable) {
      console.log('[PPTX Pipeline] PowerPoint not available, using fallback parser');
    }

    const parseResult = await exportWithNativePowerPoint(resolvedPath);
    if (!parseResult.ok || !parseResult.slides) {
      if (isRemote) {
        try {
          fs.unlinkSync(resolvedPath);
        } catch (err) {
          console.debug('Failed to remove temp file:', err);
        }
      }
      return {
        ok: false,
        error: parseResult.error || 'Failed to parse presentation file.',
      };
    }

    // Auto-watch local PPTX files with chokidar for real-time live sync
    if (!isRemote) {
      await presentationWatcher.watch(resolvedPath);
    }

    return {
      ok: true,
      title: parseResult.title,
      slideCount: parseResult.slideCount,
      slides: parseResult.slides,
      images: parseResult.images,
      filePath: resolvedPath,
      width: parseResult.width,
      height: parseResult.height,
    };
  });

  // 2. Direct PPTX decoding handler
  ipcMain.handle('presentation:parse-pptx', async (_event, source: string): Promise<PptxParseResult> => {
    const resolution = await resolvePresentationPath(source);
    if (!resolution.resolvedPath) {
      return { ok: false, error: resolution.error || 'Failed to resolve presentation file.' };
    }
    return exportWithNativePowerPoint(resolution.resolvedPath);
  });

  // 3. File Watcher Management
  ipcMain.handle('presentation:watch-file', async (_event, filePath: string) => {
    if (filePath && typeof filePath === 'string') {
      const normalized = normalizeLocalPresentationPath(filePath);
      if (fs.existsSync(normalized)) {
        await presentationWatcher.watch(normalized);
        return { ok: true, watching: normalized };
      }
    }
    return { ok: false, error: 'File path not found to watch.' };
  });

  ipcMain.handle('presentation:unwatch-file', (_event, filePath?: string) => {
    if (filePath && typeof filePath === 'string') {
      presentationWatcher.unwatch(filePath);
    } else {
      presentationWatcher.unwatchAll();
    }
    return { ok: true };
  });

  ipcMain.handle('presentation:get-watched-files', () => {
    return presentationWatcher.getWatchedPaths();
  });
}