import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectLiveSlide,
  selectPreviewSlide,
  selectTransitionType,
  selectFadeDuration,
  selectActiveBackground,
  selectBackgroundThemes,
  selectIsBlackout,
  selectIsTextCleared,
  selectIsLogoActive,
  takeLive,
  advanceSlide,
  previousSlide,
  setTransitionType,
  setActiveBackground,
} from '../../store/features/presentation';
import { PlayIcon, SlidersIcon, MonitorIcon } from '../common/Icons';
import { ScaledRealityMonitor } from './ScaledRealityMonitor';

export const ProgramPreviewMonitor: React.FC = () => {
  const dispatch = useAppDispatch();
  const { slide: liveSlide, rundownItem: liveItem } = useAppSelector(selectLiveSlide);
  const previewSlide = useAppSelector(selectPreviewSlide);
  const transitionType = useAppSelector(selectTransitionType);
  const fadeDuration = useAppSelector(selectFadeDuration);
  const activeBackground = useAppSelector(selectActiveBackground);
  const backgroundThemes = useAppSelector(selectBackgroundThemes);
  const isBlackout = useAppSelector(selectIsBlackout);
  const isTextCleared = useAppSelector(selectIsTextCleared);
  const isLogoActive = useAppSelector(selectIsLogoActive);

  const [showBgPicker, setShowBgPicker] = useState(false);
  const outputWindowRef = useRef<Window | null>(null);

  // Synchronize secondary projector output window with live state
  const updateOutputWindow = useCallback(() => {
    const win = outputWindowRef.current;
    if (!win || win.closed) return;

    const bg = isBlackout ? '#000000' : activeBackground.gradient;
    let contentHtml = '';

    if (isBlackout) {
      contentHtml = '';
    } else if (isLogoActive) {
      contentHtml = `
        <div style="filter: drop-shadow(0 14px 40px rgba(0,0,0,0.85));">
          <svg width="240" height="240" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="46" stroke="#ffffff" stroke-width="4" opacity="0.9"/>
            <path d="M50 20 L50 80 M30 40 L70 40" stroke="#ffffff" stroke-width="6" stroke-linecap="round"/>
          </svg>
        </div>
      `;
    } else if (isTextCleared) {
      contentHtml = '';
    } else if (liveSlide && liveSlide.lines.length > 0) {
      const lineCount = liveSlide.lines.length;
      const maxLen = Math.max(...liveSlide.lines.map((l) => l.length));
      let fontSize = '4.25rem';
      if (lineCount > 5 || maxLen > 55) {
        fontSize = '3rem';
      } else if (lineCount > 3 || maxLen > 42) {
        fontSize = '3.5rem';
      }

      const linesHtml = liveSlide.lines
        .map((l) => `<div style="margin-bottom:20px;">${l}</div>`)
        .join('');

      contentHtml = `
        <div style="max-width:1640px; width:100%; padding:80px 140px; font-size:${fontSize}; font-weight:800; line-height:1.35; text-shadow:0 8px 32px rgba(0,0,0,0.95), 0 2px 10px rgba(0,0,0,0.9); letter-spacing:-0.015em; box-sizing:border-box;">
          ${linesHtml}
        </div>
      `;
    } else {
      contentHtml = `<div style="font-size:3rem; font-weight:800; opacity:0.35; letter-spacing:0.08em;">BUNSENWORSHIP</div>`;
    }

    win.document.body.style.margin = '0';
    win.document.body.style.backgroundColor = '#000000';
    win.document.body.style.overflow = 'hidden';
    win.document.body.innerHTML = `
      <div style="width:100vw; height:100vh; display:flex; align-items:center; justify-content:center; background:${bg}; color:#ffffff; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align:center; box-sizing:border-box;">
        ${contentHtml}
      </div>
    `;
  }, [isBlackout, isLogoActive, isTextCleared, liveSlide, activeBackground]);

  useEffect(() => {
    updateOutputWindow();
  }, [updateOutputWindow]);

  // Global hotkeys for worship console operator: Enter (Go Live), Space/ArrowDown (Next), ArrowUp (Prev)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid hotkeys when typing in inputs or textareas
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        dispatch(takeLive());
      } else if (e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        dispatch(advanceSlide());
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        dispatch(previousSlide());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch]);

  const handleGoLive = () => {
    dispatch(takeLive());
  };

  const handleOpenOutput = () => {
    const outputWindow = window.open(
      '',
      'BunsenWorship_Sanctuary_Output',
      'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
    );
    if (outputWindow) {
      outputWindowRef.current = outputWindow;
      outputWindow.document.title = 'BunsenWorship - Sanctuary Projection Output';
      updateOutputWindow();
    }
  };

  return (
    <div className="program-preview-col">
      {/* 1. LIVE PROGRAM MONITOR */}
      <div className="monitor-card">
        <div className="monitor-header">
          <h4 className="monitor-title">Live Program</h4>
          {liveItem && (
            <span
              style={{
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '120px',
              }}
              title={liveItem.title}
            >
              {liveItem.title}
            </span>
          )}
          <span className="monitor-badge badge-live">Live</span>
        </div>

        <ScaledRealityMonitor
          slide={liveSlide}
          backgroundGradient={activeBackground.gradient}
          isBlackout={isBlackout}
          isTextCleared={isTextCleared}
          isLogoActive={isLogoActive}
          transitionType={transitionType}
          fadeDuration={fadeDuration}
          emptyLabel="[No Active Live Slide]"
          isLive={true}
        />
      </div>

      {/* 2. NEXT PREVIEW MONITOR */}
      <div className="monitor-card">
        <div className="monitor-header">
          <h4 className="monitor-title">Next Preview</h4>
          <span className="monitor-badge badge-preview">Preview</span>
        </div>

        <ScaledRealityMonitor
          slide={previewSlide}
          backgroundGradient={activeBackground.gradient}
          transitionType="CUT"
          emptyLabel="[No Slide Queued]"
          isLive={false}
        />
      </div>

      {/* 3. TRANSITIONS & GO LIVE CONTROLS */}
      <div className="transitions-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h4 className="transitions-title">Transitions</h4>
          <button
            type="button"
            className="console-mini-btn"
            onClick={() => setShowBgPicker(!showBgPicker)}
            title="Change sanctuary motion background"
          >
            <SlidersIcon size={12} />
            <span>Theme</span>
          </button>
        </div>

        {/* Background Theme Selector Popover */}
        {showBgPicker && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              padding: '8px',
              background: 'var(--bg-subtle)',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)', fontWeight: 700 }}>
              SANCTUARY BACKGROUND
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {backgroundThemes.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => {
                    dispatch(setActiveBackground(theme.id));
                    setShowBgPicker(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 6px',
                    borderRadius: '6px',
                    border: theme.id === activeBackground.id ? '1.5px solid var(--color-primary)' : '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface)',
                    cursor: 'pointer',
                    fontSize: '0.7rem',
                    color: 'var(--text-primary)',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: theme.accent }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {theme.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Transition Mode Selector (CUT vs FADE) */}
        <div className="transitions-button-row">
          <button
            type="button"
            className={`transition-toggle-btn ${transitionType === 'CUT' ? 'active' : ''}`}
            onClick={() => dispatch(setTransitionType('CUT'))}
          >
            CUT
          </button>
          <button
            type="button"
            className={`transition-toggle-btn ${transitionType === 'FADE' ? 'active' : ''}`}
            onClick={() => dispatch(setTransitionType('FADE'))}
          >
            FADE ({fadeDuration.toFixed(1)}s)
          </button>
        </div>

        {/* Big Coral Red GO LIVE Button */}
        <button
          type="button"
          className="go-live-big-btn"
          onClick={handleGoLive}
          title="Take Preview directly to Live Program (Press Enter)"
        >
          <PlayIcon size={16} />
          <span>GO LIVE (ENTER)</span>
        </button>

        {/* Slide navigation shortcuts */}
        <div className="console-quick-actions-row">
          <button
            type="button"
            className="console-mini-btn"
            onClick={() => dispatch(previousSlide())}
            title="Go to previous slide (Up Arrow)"
          >
            &uarr; Prev Slide
          </button>
          <button
            type="button"
            className="console-mini-btn"
            onClick={() => dispatch(advanceSlide())}
            title="Advance to next slide (Down Arrow / Space)"
          >
            Next Slide &darr;
          </button>
        </div>

        {/* Pop-out Sanctuary Projector Display */}
        <button
          type="button"
          className="console-mini-btn"
          onClick={handleOpenOutput}
          style={{ width: '100%', marginTop: '2px' }}
          title="Open dedicated output window for projector or secondary screen"
        >
          <MonitorIcon size={13} />
          <span>Open Projector Window</span>
        </button>
      </div>
    </div>
  );
};
