import React, { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  selectNotifications,
  selectUnreadNotificationsCount,
  selectIsNotificationsOpen,
  toggleOpen,
  setOpen,
  markAsRead,
  markAllAsRead,
  removeNotification,
  clearAllNotifications,
  addNotification,
  AppNotification,
} from '../../store/features/notifications';
import {
  BellIcon,
  DownloadCloudIcon,
  SparklesIcon,
  CheckIcon,
  TrashIcon,
  XIcon,
} from '../common/Icons';
import './notifications.css';

const formatTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export const NotificationBell: React.FC = () => {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector(selectNotifications);
  const unreadCount = useAppSelector(selectUnreadNotificationsCount);
  const isOpen = useAppSelector(selectIsNotificationsOpen);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Register auto-updater & FCM listeners from Electron IPC
  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI) return;

    const unsubAvailable = window.electronAPI.onUpdateAvailable((info) => {
      dispatch(
        addNotification({
          id: `update-avail-${info.version}`,
          title: 'New Release Available',
          message: `BunsenWorship v${info.version} is available for update.`,
          type: 'update',
          timestamp: Date.now(),
          read: false,
        })
      );
    });

    const unsubDownloaded = window.electronAPI.onUpdateDownloaded((info) => {
      dispatch(
        addNotification({
          id: `update-ready-${info.version}`,
          title: 'Update Ready to Install',
          message: `BunsenWorship v${info.version} has finished downloading.`,
          type: 'update',
          timestamp: Date.now(),
          read: false,
          action: {
            type: 'restart_and_install',
            label: 'Restart & Install Now',
          },
        })
      );
    });

    // FCM push notification bridge (extensible for cloud alerts & ministry messages)
    const unsubFcm = window.electronAPI.onFcmMessage((msg) => {
      dispatch(
        addNotification({
          title: msg.title || 'Push Alert',
          message: msg.body || 'New announcement received.',
          type: 'fcm',
          timestamp: Date.now(),
          read: false,
          fcmData: msg.data,
        })
      );
    });

    // Check if an update was already detected during app launch before component mounted
    window.electronAPI.getUpdateStatus().then((status) => {
      if (status?.isUpdateDownloaded && status.cachedUpdateInfo) {
        dispatch(
          addNotification({
            id: `update-ready-${status.cachedUpdateInfo.version}`,
            title: 'Update Ready to Install',
            message: `BunsenWorship v${status.cachedUpdateInfo.version} has finished downloading.`,
            type: 'update',
            timestamp: Date.now(),
            read: false,
            action: {
              type: 'restart_and_install',
              label: 'Restart & Install Now',
            },
          })
        );
      } else if (status?.cachedUpdateInfo) {
        dispatch(
          addNotification({
            id: `update-avail-${status.cachedUpdateInfo.version}`,
            title: 'New Release Available',
            message: `BunsenWorship v${status.cachedUpdateInfo.version} is available for update.`,
            type: 'update',
            timestamp: Date.now(),
            read: false,
          })
        );
      }
    }).catch(() => {
      // Non-blocking fallback
    });

    return () => {
      unsubAvailable();
      unsubDownloaded();
      unsubFcm();
    };
  }, [dispatch]);

  // Click outside and escape key handling
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        isOpen &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        dispatch(setOpen(false));
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        dispatch(setOpen(false));
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, dispatch]);

  const handleActionClick = (notif: AppNotification) => {
    if (!notif.action) return;
    dispatch(markAsRead(notif.id));

    if (notif.action.type === 'restart_and_install') {
      window.electronAPI?.restartAndInstall();
    } else if (notif.action.type === 'check_for_updates') {
      window.electronAPI?.checkForUpdates();
    }
  };

  const handleManualCheck = () => {
    if (window.electronAPI) {
      window.electronAPI.checkForUpdates();
      dispatch(
        addNotification({
          title: 'Checking for Updates',
          message: 'BunsenWorship is contacting GitHub Releases for the latest updates...',
          type: 'info',
          timestamp: Date.now(),
          read: true,
        })
      );
    }
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'update':
        return <DownloadCloudIcon size={16} />;
      case 'fcm':
        return <SparklesIcon size={16} />;
      default:
        return <BellIcon size={16} />;
    }
  };

  return (
    <div className="notification-bell-container">
      <button
        ref={buttonRef}
        type="button"
        className={`notification-bell-btn ${isOpen ? 'active' : ''}`}
        onClick={() => dispatch(toggleOpen())}
        title="Notifications & Release Updates"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <BellIcon size={18} />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div ref={popoverRef} className="notifications-popover" role="dialog" aria-label="Notifications panel">
          {/* Popover Header */}
          <div className="notifications-header">
            <div className="notifications-header-left">
              <h3 className="notifications-title">Notifications</h3>
              {unreadCount > 0 && (
                <span className="notifications-count-pill">{unreadCount} new</span>
              )}
            </div>
            <div className="notifications-header-actions">
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="notif-action-btn"
                  onClick={() => dispatch(markAllAsRead())}
                  title="Mark all notifications as read"
                >
                  <CheckIcon size={13} />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                type="button"
                className="notif-action-btn"
                onClick={() => dispatch(setOpen(false))}
                title="Close"
              >
                <XIcon size={14} />
              </button>
            </div>
          </div>

          {/* Notifications Scroll List */}
          <div className="notifications-list">
            {notifications.length === 0 ? (
              <div className="notifications-empty">
                <BellIcon size={28} />
                <p className="notifications-empty-title">All Caught Up</p>
                <p className="notifications-empty-desc">
                  No new release alerts or system notifications.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`notification-item ${!notif.read ? 'unread' : ''} type-${notif.type}`}
                  onClick={() => {
                    if (!notif.read) dispatch(markAsRead(notif.id));
                  }}
                >
                  <div className={`notification-icon-wrapper type-${notif.type}`}>
                    {renderIcon(notif.type)}
                  </div>

                  <div className="notification-body">
                    <div className="notification-top-row">
                      <h4 className="notification-item-title">{notif.title}</h4>
                      <span className="notification-time">{formatTimeAgo(notif.timestamp)}</span>
                    </div>
                    <p className="notification-item-message">{notif.message}</p>

                    {notif.action && (
                      <button
                        type="button"
                        className={`notification-action-btn ${notif.type === 'update' ? 'btn-cyan' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActionClick(notif);
                        }}
                      >
                        {notif.type === 'update' && <DownloadCloudIcon size={13} />}
                        <span>{notif.action.label}</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    className="notification-dismiss-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch(removeNotification(notif.id));
                    }}
                    title="Dismiss notification"
                  >
                    <XIcon size={13} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="notifications-footer">
            <button
              type="button"
              className="notifications-footer-btn"
              onClick={handleManualCheck}
              title="Check GitHub for newer versions"
            >
              <DownloadCloudIcon size={13} />
              <span>Check for Updates</span>
            </button>

            {notifications.length > 0 && (
              <button
                type="button"
                className="notifications-footer-btn"
                onClick={() => dispatch(clearAllNotifications())}
                title="Clear all notification history"
              >
                <TrashIcon size={13} />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
