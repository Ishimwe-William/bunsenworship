import { RootState } from '../../rootReducer';

export const selectNotifications = (state: RootState) =>
  state.notifications.notifications;

export const selectUnreadNotificationsCount = (state: RootState) =>
  state.notifications.notifications.filter((n) => !n.read).length;

export const selectIsNotificationsOpen = (state: RootState) =>
  state.notifications.isOpen;
