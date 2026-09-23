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

export interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  getUpdateStatus: () => Promise<{ cachedUpdateInfo: UpdateInfo | null; isUpdateDownloaded: boolean }>;
  checkForUpdates: () => void;
  restartAndInstall: () => void;
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void;
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => () => void;
  onFcmMessage: (callback: (msg: FcmPushMessage) => void) => () => void;
  openProjectorWindow: () => Promise<void>;
  isProjectorOpen?: () => Promise<boolean>;
  onProjectorStatusChanged?: (callback: (isOpen: boolean) => void) => () => void;
  openVideoDialog: () => Promise<string | null>;
  resolveVideoPath: (filename: string) => Promise<string | null>;
  getPathForFile: (file: File) => string;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
