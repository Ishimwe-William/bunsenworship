import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { UpdateInfo, FcmPushMessage } from './types/electron';

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
});
