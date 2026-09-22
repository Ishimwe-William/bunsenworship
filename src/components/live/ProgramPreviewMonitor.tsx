import React, { useEffect, useState } from 'react';
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
import { BunsenWorshipLogo } from '../sidebar/NavIcons';

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
    // Open detached projection window for second monitor / projector
    const outputWindow = window.open(
      '',
      'BunsenWorship_Sanctuary_Output',
      'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
    );
    if (outputWindow) {
      outputWindow.document.title = 'BunsenWorship - Sanctuary Projection Output';
      outputWindow.document.body.style.margin = '0';
      outputWindow.document.body.style.backgroundColor = '#000000';
      outputWindow.document.body.style.overflow = 'hidden';
      outputWindow.document.body.innerHTML = `
        <div id="output-root" style="width:100vw; height:100vh; display:flex; align-items:center; justify-content:center; background:${activeBackground.gradient}; color:#ffffff; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align:center; padding:3rem; box-sizing:border-box;">
          <h1 style="font-size:3.5rem; font-weight:800; text-shadow:0 4px 20px rgba(0,0,0,0.9); line-height:1.35;">
            ${liveSlide ? liveSlide.lines.join('<br/>') : 'BunsenWorship'}
          </h1>
        </div>
      `;
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

        <div className="monitor-screen-frame is-live-frame">
          {/* Active Background */}
          <div
            className="monitor-bg-canvas"
            style={{
              background: isBlackout ? '#000000' : activeBackground.gradient,
            }}
          />
          <div className="monitor-atmosphere" />

          {/* Foreground Visual / Text Layer */}
          {isBlackout ? (
            <div className="monitor-text-content" style={{ color: '#ef4444', opacity: 0.8, fontSize: '0.8rem', letterSpacing: '0.1em' }}>
              &bull; BLACKOUT ACTIVE &bull;
            </div>
          ) : isLogoActive ? (
            <div style={{ position: 'relative', zIndex: 2, filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.7))' }}>
              <BunsenWorshipLogo size={64} />
            </div>
          ) : isTextCleared ? (
            <div className="monitor-text-content" style={{ opacity: 0.5, fontSize: '0.75rem' }}>
              [Background Only &bull; Text Cleared]
            </div>
          ) : (
            <div className="monitor-text-content">
              {liveSlide ? (
                liveSlide.lines.map((line, idx) => (
                  <div key={idx} style={{ marginBottom: idx < liveSlide.lines.length - 1 ? '4px' : 0 }}>
                    {line}
                  </div>
                ))
              ) : (
                <div style={{ opacity: 0.5 }}>[No Active Live Slide]</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. NEXT PREVIEW MONITOR */}
      <div className="monitor-card">
        <div className="monitor-header">
          <h4 className="monitor-title">Next Preview</h4>
          <span className="monitor-badge badge-preview">Preview</span>
        </div>

        <div className="monitor-screen-frame is-preview-frame">
          {/* Next Preview Background */}
          <div
            className="monitor-bg-canvas"
            style={{
              background: 'linear-gradient(160deg, #091e3a 0%, #1e293b 40%, #064e3b 80%, #059669 100%)',
            }}
          />
          <div className="monitor-atmosphere" />

          {/* Preview Text Layer */}
          <div className="monitor-text-content">
            {previewSlide ? (
              previewSlide.lines.map((line, idx) => (
                <div key={idx} style={{ marginBottom: idx < previewSlide.lines.length - 1 ? '4px' : 0 }}>
                  {line}
                </div>
              ))
            ) : (
              <div style={{ opacity: 0.5 }}>[No Slide Queued]</div>
            )}
          </div>
        </div>
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
