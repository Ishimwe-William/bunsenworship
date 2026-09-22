export type NotificationType = 'update' | 'system' | 'info' | 'fcm';

export interface NotificationAction {
  type: 'restart_and_install' | 'check_for_updates' | 'open_external';
  label: string;
  payload?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  type: NotificationType;
  action?: NotificationAction;
  fcmData?: Record<string, unknown>; // Extensible payload for future Firebase Cloud Messaging
}

export interface NotificationsState {
  notifications: AppNotification[];
  isOpen: boolean;
}
