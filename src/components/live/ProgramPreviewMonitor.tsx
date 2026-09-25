import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  selectRundown,
  selectSelectedRundownId,
  setSelectedRundownId,
  setPreviewSlide,
  takeLive,
  advanceSlide,
  previousSlide,
  setTransitionType,
  setFadeDuration,
  setActiveBackground,
  clearAllOverrides,
  toggleBlackout,
  toggleClearText,
  toggleLogo,
  toggleVideoMute,
  setVideoError,
  setProjectorActive,
  selectIsProjectorActive,
} from '../../store/features/presentation';
import { extractYouTubeId } from '../../utils/videoHelpers';
import { DisplayInfo } from '../../types/electron';
import { ArrowDownIcon, ArrowUpIcon, MonitorIcon, PlayIcon, SlidersIcon, GoLiveIcon, RadioIcon } from '../common/Icons';
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
  const hasActiveOverride = isBlackout || isTextCleared || isLogoActive;
  const videoPlayback = useAppSelector(selectVideoPlayback);
  const isProjectorActive = useAppSelector(selectIsProjectorActive);
  const rundown = useAppSelector(selectRundown);
  const selectedRundownId = useAppSelector(selectSelectedRundownId);

  const [showBgPicker, setShowBgPicker] = useState(false);
  const [projectorSource, setProjectorSource] = useState<'LIVE' | 'PREVIEW'>('LIVE');
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);
  const [projectorDimensions, setProjectorDimensions] = useState<{
    width: number;
    height: number;
    screenWidth?: number;
    screenHeight?: number;
  } | null>(null);
  const projectorWindowRef = useRef<Window | null>(null);

  const secondaryDisplay = displays.find((d) => !d.isOperator);
  const outWidth = projectorDimensions?.width || secondaryDisplay?.bounds.width || 1920;
  const outHeight = projectorDimensions?.height || secondaryDisplay?.bounds.height || 1080;
  const outputDimensions = { width: outWidth, height: outHeight };

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

    const isMuted = Boolean(
      videoPlayback.isMuted ||
      (targetSlide?.videoMuted !== undefined ? targetSlide.videoMuted : false)
    );

    const payload = {
      slide: targetSlide,
      backgroundGradient: activeBackground.gradient,
      isBlackout: isLiveSource ? isBlackout : false,
      isTextCleared: isLiveSource ? isTextCleared : false,
      isLogoActive: isLiveSource ? isLogoActive : false,
      transitionType,
      fadeDuration,
      source: projectorSource,
      videoPlayback: {
        ...videoPlayback,
        isMuted,
      },
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
        event.data?.type === 'PROJECTOR_HEARTBEAT' ||
        event.data?.type === 'PROJECTOR_DIMENSIONS'
      ) {
        if (event.data?.payload?.width && event.data?.payload?.height) {
          setProjectorDimensions(event.data.payload);
        }
        markProjectorActive();
      } else if (event.data?.type === 'PROJECTOR_DISCONNECTED') {
        if (disconnectTimer) clearTimeout(disconnectTimer);
        dispatch(setProjectorActive(false));
        setProjectorDimensions(null);
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

  const handleCloseOutput = useCallback(() => {
    if (window.electronAPI?.closeProjectorWindow) {
      window.electronAPI.closeProjectorWindow();
    } else if (projectorWindowRef.current && !projectorWindowRef.current.closed) {
      projectorWindowRef.current.close();
      projectorWindowRef.current = null;
      dispatch(setProjectorActive(false));
    } else {
      dispatch(setProjectorActive(false));
    }
  }, [dispatch]);

  const handleOpenOutput = useCallback(async () => {
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
    const win = window.open(
      projectorUrl,
      'BunsenWorship_Projector',
      'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
    );
    projectorWindowRef.current = win;
  }, [broadcastProjectorState]);

  const handleToggleOnAir = useCallback(() => {
    if (isProjectorActive) {
      handleCloseOutput();
    } else {
      handleOpenOutput();
    }
  }, [isProjectorActive, handleCloseOutput, handleOpenOutput]);

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
        dispatch(advanceSlide());
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        dispatch(previousSlide());
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
        const newDuration = fadeDuration >= 2.0 ? 0.5 : fadeDuration + 0.5;
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
  }, [dispatch, fadeDuration, handleToggleOnAir, hasActiveOverride, rundown, selectedRundownId]);

  const handleGoLive = () => {
    if (hasActiveOverride) {
      dispatch(clearAllOverrides());
    }
    dispatch(takeLive());
  };

  const handleFadeClick = () => {
    if (transitionType === 'FADE') {
      const nextDuration = fadeDuration >= 2.0 ? 0.5 : Number((fadeDuration + 0.5).toFixed(1));
      dispatch(setFadeDuration(nextDuration));
    } else {
      dispatch(setTransitionType('FADE'));
    }
  };

  return (
    <div className="program-preview-col">
      <div className="output-section-header">
        <div className="console-section-heading">
          <span className="console-section-index">03</span>
          <div className="console-section-heading-copy">
            <span>Program & preview</span>
            <h3>Sanctuary Output</h3>
          </div>
        </div>
        <span
          className={`output-connection-badge ${
            isProjectorActive ? 'is-connected' : 'is-ready'
          }`}
          title={
            isProjectorActive
              ? `Sanctuary Output Active: ${
                  projectorDimensions
                    ? `${projectorDimensions.width}×${projectorDimensions.height}`
                    : displays.find((d) => !d.isOperator)
                    ? `${displays.find((d) => !d.isOperator)?.bounds.width}×${displays.find((d) => !d.isOperator)?.bounds.height}`
                    : '1920×1080 synced'
                } (${
                  displays.find((display) => !display.isOperator)?.name || 'Projector'
                })`
              : displays.length > 1
              ? displays.find((display) => !display.isOperator)?.name || 'Secondary display'
              : 'Primary display'
          }
        >
          <span />
          {isProjectorActive
            ? projectorDimensions
              ? `${projectorDimensions.width}×${projectorDimensions.height}`
              : 'Connected'
            : 'Ready'}
        </span>
      </div>

      <section className="program-command-deck" aria-label="Program controls">
        <div className="program-command-topline">
          <div className="program-transition-switch" role="group" aria-label="Transition style">
            <button
              type="button"
              className={`program-transition-btn ${
                transitionType === 'CUT' ? 'is-active' : ''
              }`}
              onClick={() => dispatch(setTransitionType('CUT'))}
              title="Cut transition (1)"
              aria-keyshortcuts="1"
              aria-pressed={transitionType === 'CUT'}
            >
              Cut
            </button>
            <button
              type="button"
              className={`program-transition-btn ${
                transitionType === 'FADE' ? 'is-active' : ''
              }`}
              onClick={handleFadeClick}
              title={
                transitionType === 'FADE'
                  ? `Fade transition: ${fadeDuration.toFixed(1)}s (click to change duration, or press F)`
                  : 'Fade transition (2)'
              }
              aria-keyshortcuts="2 F"
              aria-pressed={transitionType === 'FADE'}
            >
              Fade {fadeDuration.toFixed(1)}s
            </button>
          </div>

          <div className="program-display-actions">
            <button
              type="button"
              className={`program-icon-btn ${showBgPicker ? 'is-active' : ''}`}
              onClick={() => setShowBgPicker(!showBgPicker)}
              title="Change background"
              aria-label="Change background"
              aria-expanded={showBgPicker}
            >
              <SlidersIcon size={16} />
            </button>
          </div>
        </div>

        {showBgPicker && (
          <div className="background-picker">
            <span className="background-picker-title">Background</span>
            <div className="background-picker-grid">
              {backgroundThemes.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className={`background-theme-btn ${
                    theme.id === activeBackground.id ? 'is-active' : ''
                  }`}
                  onClick={() => {
                    dispatch(setActiveBackground(theme.id));
                    setShowBgPicker(false);
                  }}
                  aria-pressed={theme.id === activeBackground.id}
                >
                  <span style={{ background: theme.accent }} />
                  <span>{theme.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="program-primary-actions">
          <button
            type="button"
            className="program-nav-btn"
            onClick={() => dispatch(previousSlide())}
            title="Previous slide (Arrow Up)"
            aria-label="Previous slide"
            aria-keyshortcuts="ArrowUp"
          >
            <ArrowUpIcon size={18} />
          </button>
          <button
            type="button"
            className="go-live-big-btn"
            onClick={handleGoLive}
            title="Take Preview to Live Program (Enter)"
            aria-keyshortcuts="Enter"
          >
            <PlayIcon size={17} />
            <span>Go live</span>
          </button>
          <button
            type="button"
            className="program-nav-btn"
            onClick={() => dispatch(advanceSlide())}
            title="Next slide (Arrow Down or Space)"
            aria-label="Next slide"
            aria-keyshortcuts="ArrowDown Space"
          >
            <ArrowDownIcon size={18} />
          </button>
        </div>

        <div className="program-output-actions">
          <div
            className="output-source-switch"
            role="group"
            aria-label="Projector source"
          >
            <button
              type="button"
              className={`output-source-btn is-live ${
                projectorSource === 'LIVE' ? 'is-active' : ''
              }`}
              onClick={() => setProjectorSource('LIVE')}
              title="Send Live Program to output"
              aria-pressed={projectorSource === 'LIVE'}
            >
              <span /> Live
            </button>
            <button
              type="button"
              className={`output-source-btn is-preview ${
                projectorSource === 'PREVIEW' ? 'is-active' : ''
              }`}
              onClick={() => setProjectorSource('PREVIEW')}
              title="Send Next Preview to output"
              aria-pressed={projectorSource === 'PREVIEW'}
            >
              <span /> Next
            </button>
          </div>
          <button
            type="button"
            className={`output-onair-btn ${isProjectorActive ? 'is-active' : 'is-standby'}`}
            onClick={handleToggleOnAir}
            title={
              isProjectorActive
                ? `Sanctuary output is ON AIR (${
                    outputDimensions ? `${outputDimensions.width}×${outputDimensions.height}` : 'Active'
                  }). Click or press F5 to take Off Air`
                : `Take sanctuary output ON AIR (F5) - Project to ${
                    displays.find((display) => !display.isOperator)?.name || 'secondary display'
                  }`
            }
            aria-pressed={isProjectorActive}
          >
            <span className={`onair-pulse-dot ${isProjectorActive ? 'is-pulsing' : ''}`} />
            <GoLiveIcon size={15} />
            <span>{isProjectorActive ? 'ON AIR' : 'ON AIR'}</span>
          </button>
        </div>
      </section>

      <div className="monitor-pair">
        <section className="monitor-card program-monitor-card">
          <div className="monitor-header">
            <div className="monitor-heading-copy">
              <h4 className="monitor-title">
                <span className="monitor-title-dot" />
                Live
              </h4>
              <span className="monitor-context" title={liveItem?.title || 'No active item'}>
                {liveItem?.title || 'No active item'}
              </span>
            </div>
            <button
              type="button"
              className={`monitor-badge badge-live ${isProjectorActive ? 'is-active' : 'is-standby'}`}
              onClick={handleToggleOnAir}
              title={
                isProjectorActive
                  ? 'Sanctuary output is ON AIR. Click or press F5 to take Off Air'
                  : 'Sanctuary output is standby. Click or press F5 to take ON AIR'
              }
              aria-label="Toggle sanctuary output on air"
            >
              <span className={`onair-pulse-dot ${isProjectorActive ? 'is-pulsing' : ''}`} />
              <span>ON AIR</span>
            </button>
          </div>
          <ScaledRealityMonitor
            slide={liveSlide}
            backgroundGradient={activeBackground.gradient}
            isBlackout={isBlackout}
            isTextCleared={isTextCleared}
            isLogoActive={isLogoActive}
            transitionType={transitionType}
            fadeDuration={fadeDuration}
            emptyLabel="No live slide"
            isLive={true}
            outputDimensions={outputDimensions}
          />
        </section>

        <section className="monitor-card preview-monitor-card">
          <div className="monitor-header">
            <div className="monitor-heading-copy">
              <h4 className="monitor-title">
                <span className="monitor-title-dot" />
                Next
              </h4>
              <span className="monitor-context" title={previewSlide?.section || 'Nothing queued'}>
                {previewSlide?.section || 'Nothing queued'}
              </span>
            </div>
            <span className="monitor-badge badge-preview" title="Cued in operator preview">
              Preview
            </span>
          </div>
          <ScaledRealityMonitor
            slide={previewSlide}
            backgroundGradient={activeBackground.gradient}
            transitionType="CUT"
            emptyLabel="Nothing queued"
            isLive={false}
            outputDimensions={outputDimensions}
          />
        </section>
      </div>

      {(() => {
        const hasLiveVideo = Boolean(
          liveSlide &&
            (extractYouTubeId(liveSlide) ||
              liveSlide.videoType === 'local' ||
              liveSlide.videoUrl ||
              liveSlide.videoPath) &&
            liveSlide.videoType !== 'none'
        );
        const hasPreviewVideo = Boolean(
          previewSlide &&
            (extractYouTubeId(previewSlide) ||
              previewSlide.videoType === 'local' ||
              previewSlide.videoUrl ||
              previewSlide.videoPath) &&
            previewSlide.videoType !== 'none'
        );
        const activeMediaSlide = hasLiveVideo ? liveSlide : hasPreviewVideo ? previewSlide : liveSlide;
        return <VideoControlDeck slide={activeMediaSlide} isLive={hasLiveVideo} />;
      })()}

      <details className="shortcut-details">
        <summary>
          <span>Keyboard shortcuts & clicker</span>
          <span>16 commands</span>
        </summary>
        <div className="shortcut-grid">
          <div><kbd>Enter / F4</kbd><span>Go live</span></div>
          <div><kbd>Space / Down / PgDn</kbd><span>Next slide</span></div>
          <div><kbd>Up / PgUp</kbd><span>Previous slide</span></div>
          <div><kbd>Home / End</kbd><span>First / Last slide</span></div>
          <div><kbd>F5 / F6</kbd><span>Toggle ON AIR output</span></div>
          <div><kbd>1 / 2</kbd><span>Cut / Fade</span></div>
          <div><kbd>F</kbd><span>Fade time</span></div>
          <div><kbd>B / F1</kbd><span>Black screen</span></div>
          <div><kbd>C / F2</kbd><span>Clear text</span></div>
          <div><kbd>L / F3</kbd><span>Logo screen</span></div>
          <div><kbd>M</kbd><span>Video mute</span></div>
          <div><kbd>[ / ]</kbd><span>Prev / Next item</span></div>
          <div><kbd>Esc</kbd><span>Clear override</span></div>
        </div>
      </details>
    </div>
  );
};
