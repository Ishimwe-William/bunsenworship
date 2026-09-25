import React, { useEffect, useState, useCallback } from 'react';
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
  selectVideoPlayback,
  takeLive,
  advanceSlide,
  previousSlide,
  setTransitionType,
  setFadeDuration,
  setActiveBackground,
  toggleBlackout,
  toggleClearText,
  toggleLogo,
  clearAllOverrides,
  setVideoError,
  setProjectorActive,
  selectIsProjectorActive,
} from '../../store/features/presentation';
import { DisplayInfo } from '../../types/electron';
import { PlayIcon, SlidersIcon, MonitorIcon } from '../common/Icons';
import { ScaledRealityMonitor } from './ScaledRealityMonitor';
import { VideoControlDeck } from './VideoControlDeck';

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
  const videoPlayback = useAppSelector(selectVideoPlayback);
  const isProjectorActive = useAppSelector(selectIsProjectorActive);

  const [showBgPicker, setShowBgPicker] = useState(false);
  const [projectorSource, setProjectorSource] = useState<'LIVE' | 'PREVIEW'>('LIVE');
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);

  useEffect(() => {
    if (window.electronAPI?.getDisplays) {
      window.electronAPI
        .getDisplays()
        .then(setDisplays)
        .catch((err) => console.warn('Could not enumerate displays:', err));
    }
  }, []);

  // Broadcast presentation state to any detached projector window
  const broadcastProjectorState = useCallback(() => {
    const isLiveSource = projectorSource === 'LIVE';
    const targetSlide = isLiveSource ? liveSlide : previewSlide;

    const payload = {
      slide: targetSlide,
      backgroundGradient: activeBackground.gradient,
      isBlackout: isLiveSource ? isBlackout : false,
      isTextCleared: isLiveSource ? isTextCleared : false,
      isLogoActive: isLiveSource ? isLogoActive : false,
      transitionType,
      fadeDuration,
      source: projectorSource,
      videoPlayback,
    };

    // Save as persistent fallback
    try {
      localStorage.setItem('bunsenworship_projector_state', JSON.stringify(payload));
    } catch {
      // ignore
    }

    // Broadcast message
    try {
      const channel = new BroadcastChannel('bunsenworship_projector_channel');
      channel.postMessage({
        type: 'UPDATE_PROJECTOR_STATE',
        payload,
      });
      channel.close();
    } catch {
      // ignore
    }
  }, [
    projectorSource,
    liveSlide,
    previewSlide,
    activeBackground,
    isBlackout,
    isTextCleared,
    isLogoActive,
    transitionType,
    fadeDuration,
    videoPlayback,
  ]);

  // Synchronize on state changes
  useEffect(() => {
    broadcastProjectorState();
  }, [broadcastProjectorState]);

  // Respond to projector window handshake requests & track connection status
  useEffect(() => {
    const channel = new BroadcastChannel('bunsenworship_projector_channel');
    let disconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const markProjectorActive = () => {
      dispatch(setProjectorActive(true));
      if (disconnectTimer) clearTimeout(disconnectTimer);
      disconnectTimer = setTimeout(() => {
        dispatch(setProjectorActive(false));
      }, 5000);
    };

    channel.onmessage = (event) => {
      if (event.data?.type === 'REQUEST_PROJECTOR_STATE') {
        broadcastProjectorState();
        markProjectorActive();
      } else if (
        event.data?.type === 'PROJECTOR_CONNECTED' ||
        event.data?.type === 'PROJECTOR_HEARTBEAT'
      ) {
        markProjectorActive();
      } else if (event.data?.type === 'PROJECTOR_DISCONNECTED') {
        if (disconnectTimer) clearTimeout(disconnectTimer);
        dispatch(setProjectorActive(false));
      } else if (event.data?.type === 'PROJECTOR_VIDEO_ERROR') {
        dispatch(setVideoError(true));
      }
    };

    // Native Electron IPC listener if available
    let unsubscribeIpc: (() => void) | undefined;
    if (window.electronAPI?.isProjectorOpen) {
      window.electronAPI
        .isProjectorOpen()
        .then((isOpen) => {
          if (isOpen) markProjectorActive();
        })
        .catch((err) => {
          console.warn('Could not query projector status:', err);
        });
    }
    if (window.electronAPI?.onProjectorStatusChanged) {
      unsubscribeIpc = window.electronAPI.onProjectorStatusChanged((isOpen) => {
        if (isOpen) {
          markProjectorActive();
        } else {
          clearTimeout(disconnectTimer);
          dispatch(setProjectorActive(false));
        }
      });
    }

    return () => {
      clearTimeout(disconnectTimer);
      channel.close();
      if (unsubscribeIpc) unsubscribeIpc();
    };
  }, [broadcastProjectorState, dispatch]);

  // Global hotkeys for worship console operator
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid hotkeys when typing in inputs or textareas
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Live control shortcuts
      if (e.key === 'Enter') {
        e.preventDefault();
        if (isBlackout || isLogoActive) {
          dispatch(clearAllOverrides());
        }
        dispatch(takeLive());
      } else if (e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        dispatch(advanceSlide());
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        dispatch(previousSlide());
      } else if (e.key === 'Escape') {
        e.preventDefault();
        dispatch(clearAllOverrides());
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        dispatch(toggleBlackout());
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        dispatch(toggleClearText());
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        dispatch(toggleLogo());
      } else if (e.key === '1') {
        e.preventDefault();
        dispatch(setTransitionType('CUT'));
      } else if (e.key === '2') {
        e.preventDefault();
        dispatch(setTransitionType('FADE'));
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        const newDuration = fadeDuration >= 2.0 ? 0.5 : fadeDuration + 0.5;
        dispatch(setFadeDuration(newDuration));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, fadeDuration, isBlackout, isLogoActive]);

  const handleGoLive = () => {
    if (isBlackout || isLogoActive) {
      dispatch(clearAllOverrides());
    }
    dispatch(takeLive());
  };

  const handleOpenOutput = async () => {
    broadcastProjectorState();

    // 1. Try native Electron IPC if running in desktop app
    if (window.electronAPI?.openProjectorWindow) {
      try {
        await window.electronAPI.openProjectorWindow();
        return;
      } catch (err) {
        console.warn('Native openProjectorWindow failed, falling back to window.open', err);
      }
    }

    // 2. Fallback: window.open with ?mode=projector
    const currentBase = window.location.href.split('?')[0].split('#')[0];
    const projectorUrl = `${currentBase}?mode=projector`;
    window.open(
      projectorUrl,
      'BunsenWorship_Projector',
      'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
    );
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

        <VideoControlDeck slide={liveSlide} isLive={true} />
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

        {/* Keyboard shortcuts reference */}
        <div
          style={{
            marginTop: '8px',
            padding: '8px',
            background: 'var(--bg-subtle)',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              fontSize: '0.65rem',
              color: 'var(--text-secondary)',
              fontWeight: 700,
              marginBottom: '4px',
            }}
          >
            KEYBOARD SHORTCUTS
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '4px',
              fontSize: '0.625rem',
              color: 'var(--text-secondary)',
            }}
          >
            <div><span style={{ fontFamily: 'monospace', background: 'var(--bg-surface)', padding: '1px 4px', borderRadius: '3px' }}>Enter</span> Go Live</div>
            <div><span style={{ fontFamily: 'monospace', background: 'var(--bg-surface)', padding: '1px 4px', borderRadius: '3px' }}>Space</span> Next</div>
            <div><span style={{ fontFamily: 'monospace', background: 'var(--bg-surface)', padding: '1px 4px', borderRadius: '3px' }}>&uarr;</span> Prev</div>
            <div><span style={{ fontFamily: 'monospace', background: 'var(--bg-surface)', padding: '1px 4px', borderRadius: '3px' }}>Esc</span> Clear</div>
            <div><span style={{ fontFamily: 'monospace', background: 'var(--bg-surface)', padding: '1px 4px', borderRadius: '3px' }}>B</span> Blackout</div>
            <div><span style={{ fontFamily: 'monospace', background: 'var(--bg-surface)', padding: '1px 4px', borderRadius: '3px' }}>C</span> Clear Text</div>
            <div><span style={{ fontFamily: 'monospace', background: 'var(--bg-surface)', padding: '1px 4px', borderRadius: '3px' }}>L</span> Logo</div>
            <div><span style={{ fontFamily: 'monospace', background: 'var(--bg-surface)', padding: '1px 4px', borderRadius: '3px' }}>F</span> Fade Time</div>
          </div>
        </div>

        {/* Pop-out Sanctuary Projector Display with Live/Preview Source Selector */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            marginTop: '4px',
            paddingTop: '6px',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              fontWeight: 600,
            }}
          >
            <span>Projector Target:</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                className={`console-mini-btn ${projectorSource === 'LIVE' ? 'active' : ''}`}
                style={{
                  padding: '2px 8px',
                  fontSize: '0.65rem',
                  borderColor: projectorSource === 'LIVE' ? '#ef4444' : undefined,
                  color: projectorSource === 'LIVE' ? '#ef4444' : undefined,
                }}
                onClick={() => setProjectorSource('LIVE')}
                title="Send Live Program to Projector Output"
              >
                ● Live
              </button>
              <button
                type="button"
                className={`console-mini-btn ${projectorSource === 'PREVIEW' ? 'active' : ''}`}
                style={{
                  padding: '2px 8px',
                  fontSize: '0.65rem',
                  borderColor: projectorSource === 'PREVIEW' ? '#22c55e' : undefined,
                  color: projectorSource === 'PREVIEW' ? '#22c55e' : undefined,
                }}
                onClick={() => setProjectorSource('PREVIEW')}
                title="Send Preview to Projector Output"
              >
                Next Preview
              </button>
            </div>
          </div>

          {/* Multi-monitor Display Status Badge */}
          {displays.length > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.65rem',
                color: '#22c55e',
                background: 'rgba(34, 197, 94, 0.08)',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(34, 197, 94, 0.25)',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#22c55e',
                  display: 'inline-block',
                }}
              />
              <span>
                Secondary Display: {displays.find((d) => !d.isOperator)?.name || 'Monitor 2'} (Auto Fullscreen)
              </span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className="console-mini-btn"
              onClick={handleOpenOutput}
              style={{
                flex: 1,
                justifyContent: 'center',
                gap: '8px',
                borderColor: isProjectorActive ? '#22c55e' : undefined,
                color: isProjectorActive ? '#22c55e' : undefined,
              }}
              title={
                displays.length > 1
                  ? 'Present directly to secondary monitor/projector in borderless full screen'
                  : 'Present to primary screen in borderless full screen over taskbar (Esc to exit)'
              }
            >
              <MonitorIcon size={13} />
              <span>
                {isProjectorActive
                  ? `Projector Live (${displays.length > 1 ? 'Monitor 2' : 'Fullscreen'})`
                  : displays.length > 1
                  ? `Present to Monitor 2 (Fullscreen)`
                  : `Present Fullscreen (${projectorSource === 'LIVE' ? 'Live' : 'Preview'} - Esc to Exit)`}
              </span>
            </button>

            {isProjectorActive && (
              <button
                type="button"
                className="console-mini-btn"
                onClick={() => {
                  if (window.electronAPI?.closeProjectorWindow) {
                    window.electronAPI.closeProjectorWindow();
                  }
                }}
                style={{
                  padding: '4px 10px',
                  borderColor: '#ef4444',
                  color: '#ef4444',
                }}
                title="Close Projector Output (Esc)"
              >
                Close Output
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
