import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  clearAllOverrides,
  selectIsBlackout,
  selectIsLive,
  selectIsLogoActive,
  selectIsTextCleared,
  toggleBlackout,
  toggleClearText,
  toggleLive,
  toggleLogo,
} from '../../store/features/presentation';
import { useLanguage } from '../language';
import { BlackoutIcon, ClearTextIcon, GoLiveIcon, LogoDisplayIcon } from '../common/Icons';
import './BroadcastControls.css';

export const BroadcastControls: React.FC = () => {
  const dispatch = useAppDispatch();
  const isLive = useAppSelector(selectIsLive);
  const isBlackout = useAppSelector(selectIsBlackout);
  const isTextCleared = useAppSelector(selectIsTextCleared);
  const isLogoActive = useAppSelector(selectIsLogoActive);
  const { t } = useLanguage();

  // Global hotkeys for broadcast controls:
  // F4: Toggle Go Live, F1: Blackout, F2: Clear Text, F3: Logo, Escape: Clear Overrides
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      if (
        target?.closest('input, textarea, select') ||
        target?.isContentEditable
      ) {
        return;
      }

      if (e.key === 'F4') {
        e.preventDefault();
        dispatch(toggleLive());
      } else if (e.key === 'F1') {
        e.preventDefault();
        dispatch(toggleBlackout());
      } else if (e.key === 'F2') {
        e.preventDefault();
        dispatch(toggleClearText());
      } else if (e.key === 'F3') {
        e.preventDefault();
        dispatch(toggleLogo());
      } else if (e.key === 'Escape' && (isBlackout || isTextCleared || isLogoActive)) {
        e.preventDefault();
        dispatch(clearAllOverrides());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dispatch, isBlackout, isTextCleared, isLogoActive]);

  return (
    <nav
      className="broadcast-controls-bar"
      aria-label="Master Broadcast Controls"
      role="toolbar"
    >
      {/* Go Live / Live Master Output Button */}
      <button
        type="button"
        className={`broadcast-btn broadcast-live ${isLive ? 'is-live' : 'is-standby'}`}
        onClick={() => dispatch(toggleLive())}
        title={isLive ? `${t.common.onAir} (F4)` : t.liveShow.goLive}
        aria-label={isLive ? `${t.common.onAir} (F4)` : t.liveShow.goLive}
        aria-keyshortcuts="F4"
        aria-pressed={isLive}
      >
        <kbd className="broadcast-hotkey-tag">F4</kbd>
        <GoLiveIcon size={18} className="broadcast-btn-icon" />
        <span className="broadcast-btn-label">
          {isLive ? t.common.onAir : t.liveShow.goLiveShort}
        </span>
      </button>

      {/* Visual Separator between Live Control & Screen Overrides */}
      <div className="broadcast-divider" role="separator" />

      {/* Blackout Button */}
      <button
        type="button"
        className={`broadcast-btn broadcast-black ${isBlackout ? 'is-active' : ''}`}
        onClick={() => dispatch(toggleBlackout())}
        title={t.liveShow.blackScreen}
        aria-label={t.liveShow.blackScreen}
        aria-keyshortcuts="F1"
        aria-pressed={isBlackout}
      >
        <kbd className="broadcast-hotkey-tag">F1</kbd>
        <BlackoutIcon size={18} className="broadcast-btn-icon" />
        <span className="broadcast-btn-label">{t.liveShow.blackShort}</span>
      </button>

      {/* Clear Text Button */}
      <button
        type="button"
        className={`broadcast-btn broadcast-clear ${isTextCleared ? 'is-active' : ''}`}
        onClick={() => dispatch(toggleClearText())}
        title={t.liveShow.clearText}
        aria-label={t.liveShow.clearText}
        aria-keyshortcuts="F2"
        aria-pressed={isTextCleared}
      >
        <kbd className="broadcast-hotkey-tag">F2</kbd>
        <ClearTextIcon size={18} className="broadcast-btn-icon" />
        <span className="broadcast-btn-label">{t.liveShow.clearShort}</span>
      </button>

      {/* Logo Display Button */}
      <button
        type="button"
        className={`broadcast-btn broadcast-logo ${isLogoActive ? 'is-active' : ''}`}
        onClick={() => dispatch(toggleLogo())}
        title={t.liveShow.logo}
        aria-label={t.liveShow.logo}
        aria-keyshortcuts="F3"
        aria-pressed={isLogoActive}
      >
        <kbd className="broadcast-hotkey-tag">F3</kbd>
        <LogoDisplayIcon size={18} className="broadcast-btn-icon" />
        <span className="broadcast-btn-label">{t.liveShow.logoShort}</span>
      </button>
    </nav>
  );
};
