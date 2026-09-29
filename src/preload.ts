import { contextBridge, ipcRenderer, webUtils, IpcRendererEvent } from 'electron';
import {
  UpdateInfo,
  FcmPushMessage,
  PresentationExportResult,
  PptxParseResult,
  PresentationSyncPayload,
  PowerPointState,
  PowerPointSlideInfo,
} from './types/electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  getUpdateStatus: () => ipcRenderer.invoke('updater:get-status'),
  checkForUpdates: () => {
    ipcRenderer.send('updater:check-for-updates');
  },
  restartAndInstall: () => {
    ipcRenderer.send('updater:restart-and-install');
  },
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => {
    const handler = (_event: IpcRendererEvent, info: UpdateInfo) => callback(info);
    ipcRenderer.on('updater:update-available', handler);
    return () => {
      ipcRenderer.removeListener('updater:update-available', handler);
    };
  },
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => {
    const handler = (_event: IpcRendererEvent, info: UpdateInfo) => callback(info);
    ipcRenderer.on('updater:update-downloaded', handler);
    return () => {
      ipcRenderer.removeListener('updater:update-downloaded', handler);
    };
  },
  // Future FCM push notification listener
  onFcmMessage: (callback: (msg: FcmPushMessage) => void) => {
    const handler = (_event: IpcRendererEvent, msg: FcmPushMessage) => callback(msg);
    ipcRenderer.on('fcm:message', handler);
    return () => {
      ipcRenderer.removeListener('fcm:message', handler);
    };
  },
  openProjectorWindow: (displayId?: number) => ipcRenderer.invoke('projector:open', displayId),
  closeProjectorWindow: () => ipcRenderer.invoke('projector:close'),
  isProjectorOpen: () => ipcRenderer.invoke('projector:is-open'),
  onProjectorStatusChanged: (callback: (isOpen: boolean) => void) => {
    const handler = (_event: IpcRendererEvent, isOpen: boolean) => callback(isOpen);
    ipcRenderer.on('projector:status-changed', handler);
    return () => {
      ipcRenderer.removeListener('projector:status-changed', handler);
    };
  },
  getDisplays: () => ipcRenderer.invoke('screen:get-displays'),
  openVideoDialog: () => ipcRenderer.invoke('dialog:open-video'),
  openPresentationDialog: () => ipcRenderer.invoke('dialog:open-presentation'),
  resolveVideoPath: (filename: string) => ipcRenderer.invoke('video:resolve-path', filename),
  openExternal: (url: string) => ipcRenderer.invoke('app:open-external', url),
  exportPowerPoint: (source: string): Promise<PresentationExportResult> =>
    ipcRenderer.invoke('presentation:export-pptx', source) as Promise<PresentationExportResult>,
  parsePowerPoint: (source: string): Promise<PptxParseResult> =>
    ipcRenderer.invoke('presentation:parse-pptx', source) as Promise<PptxParseResult>,
  watchPresentation: (filePath: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('presentation:watch-file', filePath) as Promise<{ ok: boolean }>,
  unwatchPresentation: (filePath?: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('presentation:unwatch-file', filePath) as Promise<{ ok: boolean }>,
  onPresentationSync: (callback: (payload: PresentationSyncPayload) => void) => {
    const handler = (_event: IpcRendererEvent, payload: PresentationSyncPayload) => callback(payload);
    ipcRenderer.on('presentation:sync-update', handler);
    return () => {
      ipcRenderer.removeListener('presentation:sync-update', handler);
    };
  },
  getPathForFile: (file: File) => {
    try {
      if (webUtils && typeof webUtils.getPathForFile === 'function') {
        return webUtils.getPathForFile(file);
      }
    } catch {
      // ignore
    }
    return (file as unknown as { path?: string }).path || file.name;
  },
  // PowerPoint live control API
  isPowerPointAvailable: () => ipcRenderer.invoke('powerpoint:is-available'),
  pptOpen: (filePath: string): Promise<{ title: string; slideCount: number; path: string }> =>
    ipcRenderer.invoke('powerpoint:open', filePath) as Promise<{ title: string; slideCount: number; path: string }>,
  pptStartSlideshow: (options?: { windowed?: boolean; startSlide?: number }): Promise<{ isRunning: boolean; currentSlide: number }> =>
    ipcRenderer.invoke('powerpoint:start-slideshow', options) as Promise<{ isRunning: boolean; currentSlide: number }>,
  pptNext: (): Promise<{ currentSlide: number }> =>
    ipcRenderer.invoke('powerpoint:next') as Promise<{ currentSlide: number }>,
  pptPrev: (): Promise<{ currentSlide: number }> =>
    ipcRenderer.invoke('powerpoint:prev') as Promise<{ currentSlide: number }>,
  pptGotoSlide: (slideNumber: number): Promise<{ currentSlide: number }> =>
    ipcRenderer.invoke('powerpoint:goto-slide', slideNumber) as Promise<{ currentSlide: number }>,
  pptGetState: (): Promise<PowerPointState> =>
    ipcRenderer.invoke('powerpoint:get-state') as Promise<PowerPointState>,
  pptGetSlideInfo: (): Promise<{ title: string; slideCount: number; slides: PowerPointSlideInfo[] }> =>
    ipcRenderer.invoke('powerpoint:get-slide-info') as Promise<{ title: string; slideCount: number; slides: PowerPointSlideInfo[] }>,
  pptEndSlideshow: (): Promise<{ isRunning: boolean }> =>
    ipcRenderer.invoke('powerpoint:end-slideshow') as Promise<{ isRunning: boolean }>,
  pptClose: (): Promise<{ hasPresentation: boolean }> =>
    ipcRenderer.invoke('powerpoint:close') as Promise<{ hasPresentation: boolean }>,
  pptQuit: (): Promise<{ status: string }> =>
    ipcRenderer.invoke('powerpoint:quit') as Promise<{ status: string }>,
  onPowerPointEvent: (callback: (event: { type: string; data?: unknown }) => void) => {
    const handler = (_event: IpcRendererEvent, eventData: { type: string; data?: unknown }) => callback(eventData);
    ipcRenderer.on('powerpoint:event', handler);
    return () => {
      ipcRenderer.removeListener('powerpoint:event', handler);
    };
  },
  // Window capture API
  getCaptureSources: () => ipcRenderer.invoke('capture:get-sources'),
  getAllCaptureSources: () => ipcRenderer.invoke('capture:get-all-sources'),
  refreshCaptureSources: () => ipcRenderer.invoke('capture:refresh-sources'),
});
