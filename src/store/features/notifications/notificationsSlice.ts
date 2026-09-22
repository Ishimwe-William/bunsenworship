import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppNotification, NotificationsState } from './types';

const initialState: NotificationsState = {
  notifications: [
    {
      id: 'system-ready',
      title: 'BunsenWorship Ready',
      message: 'Presentation engine is active and background update services are listening.',
      timestamp: Date.now(),
      read: false,
      type: 'system',
    },
  ],
  isOpen: false,
};

export const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (
      state,
      action: PayloadAction<Omit<AppNotification, 'id' | 'timestamp' | 'read'> & { id?: string; timestamp?: number; read?: boolean }>
    ) => {
      const id = action.payload.id || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const timestamp = action.payload.timestamp || Date.now();
      const read = action.payload.read ?? false;

      const existingIndex = state.notifications.findIndex((n) => n.id === id);
      const notification: AppNotification = {
        ...action.payload,
        id,
        timestamp,
        read,
      };

      if (existingIndex >= 0) {
        // Update existing notification (e.g. update download progress or status update)
        state.notifications[existingIndex] = notification;
      } else {
        // Prepend new notification to top of list
        state.notifications.unshift(notification);
      }
    },
    markAsRead: (state, action: PayloadAction<string>) => {
      const notif = state.notifications.find((n) => n.id === action.payload);
      if (notif) {
        notif.read = true;
      }
    },
    markAllAsRead: (state) => {
      state.notifications.forEach((n) => {
        n.read = true;
      });
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter((n) => n.id !== action.payload);
    },
    clearAllNotifications: (state) => {
      state.notifications = [];
    },
    toggleOpen: (state) => {
      state.isOpen = !state.isOpen;
    },
    setOpen: (state, action: PayloadAction<boolean>) => {
      state.isOpen = action.payload;
    },
  },
});

export const {
  addNotification,
  markAsRead,
  markAllAsRead,
  removeNotification,
  clearAllNotifications,
  toggleOpen,
  setOpen,
} = notificationsSlice.actions;

export const notificationsReducer = notificationsSlice.reducer;
