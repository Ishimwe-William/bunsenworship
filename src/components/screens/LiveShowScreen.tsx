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

const DEFAULT_RUNDOWN_WIDTH = 280;
const MIN_RUNDOWN_WIDTH = 200;
const MAX_RUNDOWN_WIDTH = 440;

const DEFAULT_PREVIEW_SPLIT = 50; // 50% Preview, 50% Live
const MIN_PREVIEW_SPLIT = 30;
const MAX_PREVIEW_SPLIT = 70;

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

  const [activeResizer, setActiveResizer] = useState<'left' | 'center' | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    active: 'left' | 'center' | null;
    startX: number;
    startWidth: number;
    startSplit: number;
    totalWidth: number;
  }>({
    active: null,
    startX: 0,
    startWidth: 0,
    startSplit: 0,
    totalWidth: 0,
  });

  // Global mouse move and up listeners for fluid column resizing
  useEffect(() => {
    if (!activeResizer) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { active, startX, startWidth, startSplit, totalWidth } = dragRef.current;
      if (active === 'left') {
        const delta = e.clientX - startX;
        const nextWidth = Math.min(
          MAX_RUNDOWN_WIDTH,
          Math.max(MIN_RUNDOWN_WIDTH, startWidth + delta)
        );
        setRundownWidth(nextWidth);
      } else if (active === 'center') {
        const delta = e.clientX - startX;
        const remainingWidth = Math.max(200, totalWidth - rundownWidth);
        const splitDelta = (delta / remainingWidth) * 100;
        const nextSplit = Math.min(
          MAX_PREVIEW_SPLIT,
          Math.max(MIN_PREVIEW_SPLIT, Math.round(startSplit + splitDelta))
        );
        setPreviewSplit(nextSplit);
      }
    };

    const handleMouseUp = () => {
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
  }, [activeResizer, rundownWidth]);

  const startDraggingLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = {
      active: 'left',
      startX: e.clientX,
      startWidth: rundownWidth,
      startSplit: previewSplit,
      totalWidth: containerRef.current?.clientWidth || window.innerWidth,
    };
    setActiveResizer('left');
  };

  const startDraggingCenter = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = {
      active: 'center',
      startX: e.clientX,
      startWidth: rundownWidth,
      startSplit: previewSplit,
      totalWidth: containerRef.current?.clientWidth || window.innerWidth,
    };
    setActiveResizer('center');
  };

  const handleResetLeft = () => {
    setRundownWidth(DEFAULT_RUNDOWN_WIDTH);
    persistValue('bunsenworship_rundown_width', DEFAULT_RUNDOWN_WIDTH);
  };

  const handleResetCenter = () => {
    setPreviewSplit(DEFAULT_PREVIEW_SPLIT);
    persistValue('bunsenworship_preview_split', DEFAULT_PREVIEW_SPLIT);
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

      if (e.key === 'Enter' || e.key === 'F4') {
        e.preventDefault();
        if (hasActiveOverride) {
          dispatch(clearAllOverrides());
        }
        dispatch(takeLive());
      } else if (e.key === ' ' || e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        if (isLive && liveSlideId) {
          dispatch(advanceLiveSlide());
        } else {
          dispatch(advanceSlide());
        }
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        if (isLive && liveSlideId) {
          dispatch(previousLiveSlide());
        } else {
          dispatch(previousSlide());
        }
      } else if (e.key === 'Home') {
        e.preventDefault();
        const currentItem = rundown.find((r) => r.id === selectedRundownId);
        if (currentItem && currentItem.slides.length > 0) {
          dispatch(setPreviewSlide({ slideId: currentItem.slides[0].id }));
        }
      } else if (e.key === 'End') {
        e.preventDefault();
        const currentItem = rundown.find((r) => r.id === selectedRundownId);
        if (currentItem && currentItem.slides.length > 0) {
          dispatch(setPreviewSlide({ slideId: currentItem.slides[currentItem.slides.length - 1].id }));
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

  return (
    <div className="live-show-screen">
      <div
        ref={containerRef}
        className={`live-console-container easyworship-layout ${activeResizer ? 'is-resizing' : ''}`}
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
          style={{ flex: `${previewSplit} 1 0%`, minWidth: '320px' }}
        >
          <PreviewColumn outputDimensions={outputDimensions} />
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
          style={{ flex: `${100 - previewSplit} 1 0%`, minWidth: '320px' }}
        >
          <LiveColumn
            isProjectorActive={isProjectorActive}
            onToggleOnAir={handleToggleOnAir}
            outputDimensions={outputDimensions}
          />
        </div>
      </div>
    </div>
  );
};

export default LiveShowScreen;
