import {
  PptxSlideData,
  PptxParseResult,
  PresentationSyncPayload,
} from './presentation';

export * from './presentation';

export interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
}

export interface FcmPushMessage {
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}

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

export interface DisplayInfo {
  id: number;
  name: string;
  isPrimary: boolean;
  isOperator: boolean;
  bounds: { x: number; y: number; width: number; height: number };
}

export interface PowerPointState {
  isRunning: boolean;
  currentSlide: number;
  slideCount: number;
  title?: string;
  hasPresentation: boolean;
}

export interface PowerPointSlideInfo {
  index: number;
  title: string;
  notes: string;
}

export interface CaptureSource {
  id: string;
  name: string;
  thumbnail?: string;
}

export interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  getUpdateStatus: () => Promise<{ cachedUpdateInfo: UpdateInfo | null; isUpdateDownloaded: boolean }>;
  checkForUpdates: () => void;
  restartAndInstall: () => void;
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void;
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => () => void;
  onFcmMessage: (callback: (msg: FcmPushMessage) => void) => () => void;
  openProjectorWindow: (displayId?: number) => Promise<void>;
  closeProjectorWindow?: () => Promise<void>;
  isProjectorOpen?: () => Promise<boolean>;
  onProjectorStatusChanged?: (callback: (isOpen: boolean) => void) => () => void;
  getDisplays?: () => Promise<DisplayInfo[]>;
  openVideoDialog: () => Promise<string | null>;
  openPresentationDialog: () => Promise<string | null>;
  resolveVideoPath: (filename: string) => Promise<string | null>;
  openExternal: (url: string) => Promise<void>;
  exportPowerPoint: (source: string) => Promise<PresentationExportResult>;
  parsePowerPoint?: (source: string) => Promise<PptxParseResult>;
  watchPresentation?: (filePath: string) => Promise<{ ok: boolean }>;
  unwatchPresentation?: (filePath?: string) => Promise<{ ok: boolean }>;
  onPresentationSync?: (callback: (payload: PresentationSyncPayload) => void) => () => void;
  getPathForFile: (file: File) => string;
  // PowerPoint live control API
  isPowerPointAvailable?: () => Promise<boolean>;
  pptOpen?: (filePath: string) => Promise<{ title: string; slideCount: number; path: string }>;
  pptStartSlideshow?: (options?: { windowed?: boolean; startSlide?: number }) => Promise<{ isRunning: boolean; currentSlide: number }>;
  pptNext?: () => Promise<{ currentSlide: number }>;
  pptPrev?: () => Promise<{ currentSlide: number }>;
  pptGotoSlide?: (slideNumber: number) => Promise<{ currentSlide: number }>;
  pptGetState?: () => Promise<PowerPointState>;
  pptGetSlideInfo?: () => Promise<{ title: string; slideCount: number; slides: PowerPointSlideInfo[] }>;
  pptEndSlideshow?: () => Promise<{ isRunning: boolean }>;
  pptClose?: () => Promise<{ hasPresentation: boolean }>;
  pptQuit?: () => Promise<{ status: string }>;
  onPowerPointEvent?: (callback: (event: { type: string; data?: unknown }) => void) => () => void;
  // Window capture API
  getCaptureSources?: () => Promise<{ success: boolean; sources: CaptureSource[]; error?: string }>;
  getAllCaptureSources?: () => Promise<{ success: boolean; sources: CaptureSource[]; error?: string }>;
  refreshCaptureSources?: () => Promise<{ success: boolean }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
