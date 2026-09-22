import React, { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  clearAllOverrides,
  selectIsBlackout,
  selectIsLogoActive,
  selectIsTextCleared,
} from '../../store/features/presentation';
import { useLanguage } from '../language';
import { BlackoutIcon, ClearTextIcon, LogoDisplayIcon } from '../common/Icons';
import { ServiceRundown, SlideDeck, ProgramPreviewMonitor } from '../live';
import '../live/LiveConsole.css';

const DEFAULT_RUNDOWN_WIDTH = 290;
const MIN_RUNDOWN_WIDTH = 200;
const MAX_RUNDOWN_WIDTH = 480;

const DEFAULT_MONITOR_WIDTH = 360;
const MIN_MONITOR_WIDTH = 280;
const MAX_MONITOR_WIDTH = 600;

export const LiveShowScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const isBlackout = useAppSelector(selectIsBlackout);
  const isTextCleared = useAppSelector(selectIsTextCleared);
  const isLogoActive = useAppSelector(selectIsLogoActive);
  const { language } = useLanguage();

  // Column width states with localStorage persistence
  const [rundownWidth, setRundownWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('bunsenworship_rundown_width');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= MIN_RUNDOWN_WIDTH && val <= MAX_RUNDOWN_WIDTH) {
          return val;
        }
      }
    } catch {
      // ignore storage access errors
    }
    return DEFAULT_RUNDOWN_WIDTH;
  });

  const [monitorWidth, setMonitorWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('bunsenworship_monitor_width');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= MIN_MONITOR_WIDTH && val <= MAX_MONITOR_WIDTH) {
          return val;
        }
      }
    } catch {
      // ignore storage access errors
    }
    return DEFAULT_MONITOR_WIDTH;
  });

  const [activeResizer, setActiveResizer] = useState<'left' | 'right' | null>(null);

  // References for drag tracking
  const dragRef = useRef<{
    active: 'left' | 'right' | null;
    startX: number;
    startWidth: number;
  }>({
    active: null,
    startX: 0,
    startWidth: 0,
  });

  // Global mouse move and up listeners for fluid resizing
  useEffect(() => {
    if (!activeResizer) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { active, startX, startWidth } = dragRef.current;
      if (active === 'left') {
        const delta = e.clientX - startX;
        const nextWidth = Math.min(
          MAX_RUNDOWN_WIDTH,
          Math.max(MIN_RUNDOWN_WIDTH, startWidth + delta)
        );
        setRundownWidth(nextWidth);
      } else if (active === 'right') {
        const delta = startX - e.clientX;
        const nextWidth = Math.min(
          MAX_MONITOR_WIDTH,
          Math.max(MIN_MONITOR_WIDTH, startWidth + delta)
        );
        setMonitorWidth(nextWidth);
      }
    };

    const handleMouseUp = () => {
      const { active } = dragRef.current;
      if (active === 'left') {
        setRundownWidth((current) => {
          try {
            localStorage.setItem('bunsenworship_rundown_width', String(current));
          } catch {
            // ignore
          }
          return current;
        });
      } else if (active === 'right') {
        setMonitorWidth((current) => {
          try {
            localStorage.setItem('bunsenworship_monitor_width', String(current));
          } catch {
            // ignore
          }
          return current;
        });
      }

      dragRef.current.active = null;
      setActiveResizer(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeResizer]);

  const startDraggingLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = {
      active: 'left',
      startX: e.clientX,
      startWidth: rundownWidth,
    };
    setActiveResizer('left');
  };

  const startDraggingRight = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = {
      active: 'right',
      startX: e.clientX,
      startWidth: monitorWidth,
    };
    setActiveResizer('right');
  };

  const handleResetLeft = () => {
    setRundownWidth(DEFAULT_RUNDOWN_WIDTH);
    try {
      localStorage.setItem('bunsenworship_rundown_width', String(DEFAULT_RUNDOWN_WIDTH));
    } catch {
      // ignore
    }
  };

  const handleResetRight = () => {
    setMonitorWidth(DEFAULT_MONITOR_WIDTH);
    try {
      localStorage.setItem('bunsenworship_monitor_width', String(DEFAULT_MONITOR_WIDTH));
    } catch {
      // ignore
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        height: '100%',
        flex: 1,
        minHeight: 0,
      }}
    >
      {/* Active Global Override Banner */}
      {(isBlackout || isTextCleared || isLogoActive) && (
        <div
          className={`broadcast-override-banner ${
            isBlackout ? 'blackout' : isLogoActive ? 'logo-active' : 'clear-text'
          }`}
          style={{ margin: 0 }}
        >
          <div className="broadcast-override-info">
            {isBlackout && <BlackoutIcon size={18} />}
            {isLogoActive && !isBlackout && <LogoDisplayIcon size={18} />}
            {isTextCleared && !isBlackout && !isLogoActive && <ClearTextIcon size={18} />}
            <span>
              {isBlackout
                ? language === 'rw'
                  ? 'Ekrani yose irabura kuri ubu ku byerekanirwaho byose (Kanda F1 cyangwa Umukara hejuru).'
                  : 'Blackout is active on sanctuary outputs (Press F1 or Black in topbar to resume).'
                : isLogoActive
                ? language === 'rw'
                  ? 'Ikimenyetso cy’itorero kiri kwerekanwa (Kanda F3 cyangwa Ikimenyetso hejuru).'
                  : 'Church emblem is currently projected on all screens (Press F3 or Logo in topbar).'
                : language === 'rw'
                ? 'Amagambo yakuweho, amashusho gusa niyo ari kugaragara (Kanda F2 hejuru).'
                : 'Lyrics cleared, ambient motion background only (Press F2 or Clear in topbar).'}
            </span>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => dispatch(clearAllOverrides())}
            style={{ padding: '3px 10px', fontSize: '0.75rem' }}
          >
            {language === 'rw' ? 'Subiza Bisanzwe' : 'Resume Presentation'}
          </button>
        </div>
      )}

      {/* 3-Column Professional Live Presentation Console with Resizable Sections */}
      <div
        className={`live-console-container ${activeResizer ? 'is-resizing' : ''}`}
      >
        {/* Column 1: Service Rundown Playlist */}
        <div
          className="live-console-section"
          style={{ width: `${rundownWidth}px`, flexShrink: 0 }}
        >
          <ServiceRundown />
        </div>

        {/* Resizer Splitter 1: Left */}
        <div
          className={`console-resizer-gutter ${activeResizer === 'left' ? 'is-active' : ''}`}
          onMouseDown={startDraggingLeft}
          onDoubleClick={handleResetLeft}
          title="Drag to resize Service Rundown • Double-click to reset"
          role="separator"
          aria-orientation="vertical"
          aria-valuenow={rundownWidth}
          aria-valuemin={MIN_RUNDOWN_WIDTH}
          aria-valuemax={MAX_RUNDOWN_WIDTH}
        >
          <div className="resizer-pill-grip" />
        </div>

        {/* Column 2: Selected Item Slide Deck */}
        <div
          className="live-console-section"
          style={{ flex: 1, minWidth: '260px' }}
        >
          <SlideDeck />
        </div>

        {/* Resizer Splitter 2: Right */}
        <div
          className={`console-resizer-gutter ${activeResizer === 'right' ? 'is-active' : ''}`}
          onMouseDown={startDraggingRight}
          onDoubleClick={handleResetRight}
          title="Drag to resize Program/Preview Monitors • Double-click to reset"
          role="separator"
          aria-orientation="vertical"
          aria-valuenow={monitorWidth}
          aria-valuemin={MIN_MONITOR_WIDTH}
          aria-valuemax={MAX_MONITOR_WIDTH}
        >
          <div className="resizer-pill-grip" />
        </div>

        {/* Column 3: Live Program, Next Preview, Transitions & Action Controls */}
        <div
          className="live-console-section"
          style={{ width: `${monitorWidth}px`, flexShrink: 0 }}
        >
          <ProgramPreviewMonitor />
        </div>
      </div>
    </div>
  );
};
