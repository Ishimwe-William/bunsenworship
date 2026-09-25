import React, { useState, useEffect, useRef } from 'react';
import { ServiceRundown, SlideDeck, ProgramPreviewMonitor } from '../live';
import '../live/LiveConsole.css';

const DEFAULT_RUNDOWN_WIDTH = 290;
const MIN_RUNDOWN_WIDTH = 200;
const MAX_RUNDOWN_WIDTH = 480;

const DEFAULT_MONITOR_WIDTH = 360;
const MIN_MONITOR_WIDTH = 280;
const MAX_MONITOR_WIDTH = 600;

const persistColumnWidth = (key: string, width: number) => {
  try {
    localStorage.setItem(key, String(width));
  } catch {
    return;
  }
};

export const LiveShowScreen: React.FC = () => {
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
          persistColumnWidth('bunsenworship_rundown_width', current);
          return current;
        });
      } else if (active === 'right') {
        setMonitorWidth((current) => {
          persistColumnWidth('bunsenworship_monitor_width', current);
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
    persistColumnWidth('bunsenworship_rundown_width', DEFAULT_RUNDOWN_WIDTH);
  };

  const handleResetRight = () => {
    setMonitorWidth(DEFAULT_MONITOR_WIDTH);
    persistColumnWidth('bunsenworship_monitor_width', DEFAULT_MONITOR_WIDTH);
  };

  const handleResizerKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement>,
    side: 'left' | 'right'
  ) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

    e.preventDefault();
    const direction = e.key === 'ArrowRight' ? 1 : -1;

    if (side === 'left') {
      const nextWidth = Math.min(
        MAX_RUNDOWN_WIDTH,
        Math.max(MIN_RUNDOWN_WIDTH, rundownWidth + direction * 16)
      );
      setRundownWidth(nextWidth);
      persistColumnWidth('bunsenworship_rundown_width', nextWidth);
    } else {
      const nextWidth = Math.min(
        MAX_MONITOR_WIDTH,
        Math.max(MIN_MONITOR_WIDTH, monitorWidth - direction * 16)
      );
      setMonitorWidth(nextWidth);
      persistColumnWidth('bunsenworship_monitor_width', nextWidth);
    }
  };

  return (
    <div className="live-show-screen">
      <div
        className={`live-console-container ${activeResizer ? 'is-resizing' : ''}`}
        aria-label="Live presentation workspace"
      >
        <div
          className="live-console-section rundown-section"
          style={{ width: `${rundownWidth}px`, flexShrink: 0 }}
        >
          <ServiceRundown />
        </div>

        <div
          className={`console-resizer-gutter ${activeResizer === 'left' ? 'is-active' : ''}`}
          onMouseDown={startDraggingLeft}
          onDoubleClick={handleResetLeft}
          onKeyDown={(e) => handleResizerKeyDown(e, 'left')}
          title="Drag to resize Service Rundown • Double-click to reset"
          role="separator"
          tabIndex={0}
          aria-label="Resize Service Rundown"
          aria-orientation="vertical"
          aria-valuenow={rundownWidth}
          aria-valuemin={MIN_RUNDOWN_WIDTH}
          aria-valuemax={MAX_RUNDOWN_WIDTH}
        >
          <div className="resizer-pill-grip" />
        </div>

        <div
          className="live-console-section deck-section"
          style={{ flex: 1, minWidth: '260px' }}
        >
          <SlideDeck />
        </div>

        <div
          className={`console-resizer-gutter ${activeResizer === 'right' ? 'is-active' : ''}`}
          onMouseDown={startDraggingRight}
          onDoubleClick={handleResetRight}
          onKeyDown={(e) => handleResizerKeyDown(e, 'right')}
          title="Drag to resize Program/Preview Monitors • Double-click to reset"
          role="separator"
          tabIndex={0}
          aria-label="Resize Program and Preview monitors"
          aria-orientation="vertical"
          aria-valuenow={monitorWidth}
          aria-valuemin={MIN_MONITOR_WIDTH}
          aria-valuemax={MAX_MONITOR_WIDTH}
        >
          <div className="resizer-pill-grip" />
        </div>

        <div
          className="live-console-section output-section"
          style={{ width: `${monitorWidth}px`, flexShrink: 0 }}
        >
          <ProgramPreviewMonitor />
        </div>
      </div>
    </div>
  );
};
