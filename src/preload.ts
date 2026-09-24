import { contextBridge, ipcRenderer, webUtils, IpcRendererEvent } from 'electron';
import { UpdateInfo, FcmPushMessage, PresentationExportResult } from './types/electron';

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
  openProjectorWindow: () => ipcRenderer.invoke('projector:open'),
  isProjectorOpen: () => ipcRenderer.invoke('projector:is-open'),
  onProjectorStatusChanged: (callback: (isOpen: boolean) => void) => {
    const handler = (_event: IpcRendererEvent, isOpen: boolean) => callback(isOpen);
    ipcRenderer.on('projector:status-changed', handler);
    return () => {
      ipcRenderer.removeListener('projector:status-changed', handler);
    };
  },
  openVideoDialog: () => ipcRenderer.invoke('dialog:open-video'),
  openPresentationDialog: () => ipcRenderer.invoke('dialog:open-presentation'),
  resolveVideoPath: (filename: string) => ipcRenderer.invoke('video:resolve-path', filename),
  openExternal: (url: string) => ipcRenderer.invoke('app:open-external', url),
  exportPowerPoint: (source: string): Promise<PresentationExportResult> =>
    ipcRenderer.invoke('presentation:export-pptx', source) as Promise<PresentationExportResult>,
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
});
