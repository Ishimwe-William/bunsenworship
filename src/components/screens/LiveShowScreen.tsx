import React, { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  ServiceRundown,
  PreviewColumn,
  LiveColumn,
  useProjectorOutput,
} from '../live';
import {
  selectLiveSlideId,
  selectIsLive,
  selectIsBlackout,
  selectIsTextCleared,
  selectIsLogoActive,
  selectFadeDuration,
  selectRundown,
  selectSelectedRundownId,
  setSelectedRundownId,
  setPreviewSlide,
  takeLive,
  advanceSlide,
  previousSlide,
  advanceLiveSlide,
  previousLiveSlide,
  setTransitionType,
  setFadeDuration,
  toggleBlackout,
  toggleClearText,
  toggleLogo,
  toggleVideoMute,
  clearAllOverrides,
} from '../../store/features/presentation';
import '../live/LiveConsole.css';

const DEFAULT_RUNDOWN_WIDTH = 260;
const MIN_RUNDOWN_WIDTH = 180;
const MAX_RUNDOWN_WIDTH = 440;

const DEFAULT_PREVIEW_SPLIT = 50; // 50% Preview, 50% Live
const MIN_PREVIEW_SPLIT = 30;
const MAX_PREVIEW_SPLIT = 70;

const DEFAULT_MONITOR_HEIGHT = 190;
const MIN_MONITOR_HEIGHT = 100;
const MAX_MONITOR_HEIGHT = 440;

const persistValue = (key: string, val: number) => {
  try {
    localStorage.setItem(key, String(val));
  } catch {
    // ignore
  }
};

export const LiveShowScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const liveSlideId = useAppSelector(selectLiveSlideId);
  const isLive = useAppSelector(selectIsLive);
  const isBlackout = useAppSelector(selectIsBlackout);
  const isTextCleared = useAppSelector(selectIsTextCleared);
  const isLogoActive = useAppSelector(selectIsLogoActive);
  const fadeDuration = useAppSelector(selectFadeDuration);
  const rundown = useAppSelector(selectRundown);
  const selectedRundownId = useAppSelector(selectSelectedRundownId);
  const hasActiveOverride = isBlackout || isTextCleared || isLogoActive;

  const {
    isProjectorActive,
    outputDimensions,
    handleToggleOnAir,
  } = useProjectorOutput();

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
      // ignore
    }
    return DEFAULT_RUNDOWN_WIDTH;
  });

  const [previewSplit, setPreviewSplit] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('bunsenworship_preview_split');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= MIN_PREVIEW_SPLIT && val <= MAX_PREVIEW_SPLIT) {
          return val;
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_PREVIEW_SPLIT;
  });

  // Monitor dock height states with localStorage persistence
  const [previewMonitorHeight, setPreviewMonitorHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('bunsenworship_preview_monitor_height');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= MIN_MONITOR_HEIGHT && val <= MAX_MONITOR_HEIGHT) {
          return val;
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_MONITOR_HEIGHT;
  });

  const [liveMonitorHeight, setLiveMonitorHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('bunsenworship_live_monitor_height');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= MIN_MONITOR_HEIGHT && val <= MAX_MONITOR_HEIGHT) {
          return val;
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_MONITOR_HEIGHT;
  });

  const [activeResizer, setActiveResizer] = useState<
    'left' | 'center' | 'preview-monitor' | 'live-monitor' | null
  >(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    active: 'left' | 'center' | 'preview-monitor' | 'live-monitor' | null;
    startX: number;
    startY: number;
    startWidth: number;
    startSplit: number;
    startPreviewHeight: number;
    startLiveHeight: number;
    isIndividual: boolean;
    totalWidth: number;
  }>({
    active: null,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startSplit: 0,
    startPreviewHeight: 0,
    startLiveHeight: 0,
    isIndividual: false,
    totalWidth: 0,
  });

  // Global mouse move and up listeners for fluid column and monitor resizing
  useEffect(() => {
    if (!activeResizer) return;

    let rafId: number | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      const clientX = e.clientX;
      const clientY = e.clientY;
      const isAltKey = e.altKey;

      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        const {
          active,
          startX,
          startY,
          startWidth,
          startSplit,
          startPreviewHeight,
          startLiveHeight,
          isIndividual,
          totalWidth,
        } = dragRef.current;

        if (active === 'left') {
          const delta = clientX - startX;
          const nextWidth = Math.min(
            MAX_RUNDOWN_WIDTH,
            Math.max(MIN_RUNDOWN_WIDTH, startWidth + delta)
          );
          setRundownWidth(nextWidth);
        } else if (active === 'center') {
          const delta = clientX - startX;
          const remainingWidth = Math.max(200, totalWidth - rundownWidth);
          const splitDelta = (delta / remainingWidth) * 100;
          const nextSplit = Math.min(
            MAX_PREVIEW_SPLIT,
            Math.max(MIN_PREVIEW_SPLIT, Math.round(startSplit + splitDelta))
          );
          setPreviewSplit(nextSplit);
        } else if (active === 'preview-monitor') {
          const deltaY = clientY - startY;
          const nextHeight = Math.min(
            MAX_MONITOR_HEIGHT,
            Math.max(MIN_MONITOR_HEIGHT, startPreviewHeight - deltaY)
          );
          setPreviewMonitorHeight(nextHeight);
          if (!isIndividual && !isAltKey) {
            setLiveMonitorHeight(nextHeight);
          }
        } else if (active === 'live-monitor') {
          const deltaY = clientY - startY;
          const nextHeight = Math.min(
            MAX_MONITOR_HEIGHT,
            Math.max(MIN_MONITOR_HEIGHT, startLiveHeight - deltaY)
          );
          setLiveMonitorHeight(nextHeight);
          if (!isIndividual && !isAltKey) {
            setPreviewMonitorHeight(nextHeight);
          }
        }
      });
    };

    const handleMouseUp = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }

      const { active } = dragRef.current;
      if (active === 'left') {
        setRundownWidth((current) => {
          persistValue('bunsenworship_rundown_width', current);
          return current;
        });
      } else if (active === 'center') {
        setPreviewSplit((current) => {
          persistValue('bunsenworship_preview_split', current);
          return current;
        });
      } else if (active === 'preview-monitor' || active === 'live-monitor') {
        setPreviewMonitorHeight((currentPreview) => {
          persistValue('bunsenworship_preview_monitor_height', currentPreview);
          return currentPreview;
        });
        setLiveMonitorHeight((currentLive) => {
          persistValue('bunsenworship_live_monitor_height', currentLive);
          return currentLive;
        });
      }

      dragRef.current.active = null;
      setActiveResizer(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeResizer, rundownWidth]);

  const startDraggingLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = {
      active: 'left',
      startX: e.clientX,
      startY: e.clientY,
      startWidth: rundownWidth,
      startSplit: previewSplit,
      startPreviewHeight: previewMonitorHeight,
      startLiveHeight: liveMonitorHeight,
      isIndividual: false,
      totalWidth: containerRef.current?.clientWidth || window.innerWidth,
    };
    setActiveResizer('left');
  };

  const startDraggingCenter = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = {
      active: 'center',
      startX: e.clientX,
      startY: e.clientY,
      startWidth: rundownWidth,
      startSplit: previewSplit,
      startPreviewHeight: previewMonitorHeight,
      startLiveHeight: liveMonitorHeight,
      isIndividual: false,
      totalWidth: containerRef.current?.clientWidth || window.innerWidth,
    };
    setActiveResizer('center');
  };

  const startDraggingPreviewMonitor = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = {
      active: 'preview-monitor',
      startX: e.clientX,
      startY: e.clientY,
      startWidth: rundownWidth,
      startSplit: previewSplit,
      startPreviewHeight: previewMonitorHeight,
      startLiveHeight: liveMonitorHeight,
      isIndividual: e.altKey || e.ctrlKey,
      totalWidth: containerRef.current?.clientWidth || window.innerWidth,
    };
    setActiveResizer('preview-monitor');
  };

  const startDraggingLiveMonitor = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = {
      active: 'live-monitor',
      startX: e.clientX,
      startY: e.clientY,
      startWidth: rundownWidth,
      startSplit: previewSplit,
      startPreviewHeight: previewMonitorHeight,
      startLiveHeight: liveMonitorHeight,
      isIndividual: e.altKey || e.ctrlKey,
      totalWidth: containerRef.current?.clientWidth || window.innerWidth,
    };
    setActiveResizer('live-monitor');
  };

  const handleResetLeft = () => {
    setRundownWidth(DEFAULT_RUNDOWN_WIDTH);
    persistValue('bunsenworship_rundown_width', DEFAULT_RUNDOWN_WIDTH);
  };

  const handleResetCenter = () => {
    setPreviewSplit(DEFAULT_PREVIEW_SPLIT);
    persistValue('bunsenworship_preview_split', DEFAULT_PREVIEW_SPLIT);
  };

  const handleResetPreviewMonitor = () => {
    setPreviewMonitorHeight(DEFAULT_MONITOR_HEIGHT);
    setLiveMonitorHeight(DEFAULT_MONITOR_HEIGHT);
    persistValue('bunsenworship_preview_monitor_height', DEFAULT_MONITOR_HEIGHT);
    persistValue('bunsenworship_live_monitor_height', DEFAULT_MONITOR_HEIGHT);
  };

  const handleResetLiveMonitor = () => {
    setPreviewMonitorHeight(DEFAULT_MONITOR_HEIGHT);
    setLiveMonitorHeight(DEFAULT_MONITOR_HEIGHT);
    persistValue('bunsenworship_preview_monitor_height', DEFAULT_MONITOR_HEIGHT);
    persistValue('bunsenworship_live_monitor_height', DEFAULT_MONITOR_HEIGHT);
  };

  // Global hotkeys for worship console operator
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

      if (
        (e.key === 'Enter' || e.key === ' ') &&
        target?.closest('button, summary, [role="button"]')
      ) {
        return;
      }

      if (e.key === 'Enter' || e.key === 'F4' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        if (hasActiveOverride) {
          dispatch(clearAllOverrides());
        }
        dispatch(takeLive());
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        dispatch(advanceSlide());
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        dispatch(previousSlide());
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        dispatch(previousLiveSlide());
      } else if (e.key === 'Home') {
        e.preventDefault();
        const currentItem = rundown.find((r) => r.id === selectedRundownId);
        if (currentItem && currentItem.slides.length > 0) {
          dispatch(setPreviewSlide({ rundownId: currentItem.id, slideId: currentItem.slides[0].id }));
        }
      } else if (e.key === 'End') {
        e.preventDefault();
        const currentItem = rundown.find((r) => r.id === selectedRundownId);
        if (currentItem && currentItem.slides.length > 0) {
          dispatch(setPreviewSlide({ rundownId: currentItem.id, slideId: currentItem.slides[currentItem.slides.length - 1].id }));
        }
      } else if (e.key === 'F5' || e.key === 'F6') {
        e.preventDefault();
        handleToggleOnAir();
      } else if (e.key === '1') {
        e.preventDefault();
        dispatch(setTransitionType('CUT'));
      } else if (e.key === '2') {
        e.preventDefault();
        dispatch(setTransitionType('FADE'));
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        const newDuration = fadeDuration >= 2.0 ? 0.5 : Number((fadeDuration + 0.5).toFixed(1));
        dispatch(setFadeDuration(newDuration));
      } else if (e.key === 'b' || e.key === 'B' || e.key === 'F1') {
        e.preventDefault();
        dispatch(toggleBlackout());
      } else if (e.key === 'c' || e.key === 'C' || e.key === 'F2') {
        e.preventDefault();
        dispatch(toggleClearText());
      } else if (e.key === 'l' || e.key === 'L' || e.key === 'F3') {
        e.preventDefault();
        dispatch(toggleLogo());
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        dispatch(toggleVideoMute());
      } else if (e.key === 'Escape' && hasActiveOverride) {
        e.preventDefault();
        dispatch(clearAllOverrides());
      } else if (e.key === '[') {
        e.preventDefault();
        const currentIndex = rundown.findIndex((r) => r.id === selectedRundownId);
        if (currentIndex > 0) {
          dispatch(setSelectedRundownId(rundown[currentIndex - 1].id));
        }
      } else if (e.key === ']') {
        e.preventDefault();
        const currentIndex = rundown.findIndex((r) => r.id === selectedRundownId);
        if (currentIndex >= 0 && currentIndex < rundown.length - 1) {
          dispatch(setSelectedRundownId(rundown[currentIndex + 1].id));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    dispatch,
    fadeDuration,
    handleToggleOnAir,
    hasActiveOverride,
    isLive,
    liveSlideId,
    rundown,
    selectedRundownId,
  ]);

  const isResizingVertical =
    activeResizer === 'preview-monitor' || activeResizer === 'live-monitor';

  return (
    <div className="live-show-screen">
      <div
        ref={containerRef}
        className={`live-console-container easyworship-layout ${
          activeResizer ? 'is-resizing' : ''
        } ${isResizingVertical ? 'is-resizing-vertical' : ''}`}
        aria-label="Live presentation console"
      >
        {/* Column 1: Schedule (Service Rundown) */}
        <div
          className="live-console-section rundown-section"
          style={{ width: `${rundownWidth}px`, flexShrink: 0 }}
        >
          <ServiceRundown />
        </div>

        {/* Resizer 1 (Left: Schedule <-> Preview) */}
        <div
          className={`console-resizer-gutter ${activeResizer === 'left' ? 'is-active' : ''}`}
          onMouseDown={startDraggingLeft}
          onDoubleClick={handleResetLeft}
          title="Drag to resize Schedule • Double-click to reset"
          role="separator"
          tabIndex={0}
          aria-label="Resize Schedule Column"
          aria-orientation="vertical"
        >
          <div className="resizer-pill-grip" />
        </div>

        {/* Column 2: Preview Column */}
        <div
          className="live-console-section preview-section"
          style={{ flex: `${previewSplit} 1 0%`, minWidth: '220px' }}
        >
          <PreviewColumn
            outputDimensions={outputDimensions}
            monitorHeight={previewMonitorHeight}
            onStartResizeMonitor={startDraggingPreviewMonitor}
            onResetMonitorHeight={handleResetPreviewMonitor}
            isResizingMonitor={activeResizer === 'preview-monitor'}
          />
        </div>

        {/* Resizer 2 (Center: Preview <-> Live) */}
        <div
          className={`console-resizer-gutter ${activeResizer === 'center' ? 'is-active' : ''}`}
          onMouseDown={startDraggingCenter}
          onDoubleClick={handleResetCenter}
          title="Drag to resize Preview / Live balance • Double-click to reset 50/50"
          role="separator"
          tabIndex={0}
          aria-label="Resize Preview and Live Columns"
          aria-orientation="vertical"
        >
          <div className="resizer-pill-grip" />
        </div>

        {/* Column 3: Live Program Column */}
        <div
          className="live-console-section live-section"
          style={{ flex: `${100 - previewSplit} 1 0%`, minWidth: '220px' }}
        >
          <LiveColumn
            isProjectorActive={isProjectorActive}
            outputDimensions={outputDimensions}
            monitorHeight={liveMonitorHeight}
            onStartResizeMonitor={startDraggingLiveMonitor}
            onResetMonitorHeight={handleResetLiveMonitor}
            isResizingMonitor={activeResizer === 'live-monitor'}
          />
        </div>
      </div>
    </div>
  );
};

export default LiveShowScreen;
