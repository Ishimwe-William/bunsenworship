import React, { useEffect, useState, useRef } from 'react';
import { Slide, VideoPlaybackState, getPersistedStartupDisplay } from '../../store/features/presentation';
import { BunsenWorshipLogo } from '../sidebar/NavIcons';
import {
  normalizeVideoSource,
  isVideoFile,
  generateVideoThumbnail,
  parseYouTubeId,
} from '../../utils/videoHelpers';
import { YouTubePlayer } from './YouTubePlayer';

export interface ProjectorPayload {
  slide: Slide | null;
  backgroundGradient: string;
  isBlackout: boolean;
  isTextCleared: boolean;
  isLogoActive: boolean;
  transitionType: 'CUT' | 'FADE';
  fadeDuration: number;
  source: 'LIVE' | 'PREVIEW';
  videoPlayback?: VideoPlaybackState;
}

const DEFAULT_GRADIENT =
  'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%)';

export const ProjectorWindowView: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [state, setState] = useState<ProjectorPayload>(() => {
    try {
      const saved = localStorage.getItem('bunsenworship_projector_state');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    const initialMode = getPersistedStartupDisplay();
    return {
      slide: null,
      backgroundGradient: DEFAULT_GRADIENT,
      isBlackout: initialMode === 'black',
      isTextCleared: false,
      isLogoActive: initialMode === 'logo',
      transitionType: 'FADE',
      fadeDuration: 1.0,
      source: 'LIVE',
    };
  });

  const [showHud, setShowHud] = useState(false);
  const [viewportSize, setViewportSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
  });

  useEffect(() => {
    document.title = 'BunsenWorship - Sanctuary Projection Output';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    document.body.style.backgroundColor = '#000000';

    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    const channel = new BroadcastChannel('bunsenworship_projector_channel');

    channel.onmessage = (event) => {
      if (event.data?.type === 'UPDATE_PROJECTOR_STATE') {
        setState(event.data.payload);
      }
    };

    // Announce projector is active and request latest state from main window
    channel.postMessage({ type: 'PROJECTOR_CONNECTED' });
    channel.postMessage({ type: 'REQUEST_PROJECTOR_STATE' });

    // Send periodic heartbeat so main window knows projector window is alive
    const heartbeatTimer = window.setInterval(() => {
      try {
        channel.postMessage({ type: 'PROJECTOR_HEARTBEAT' });
      } catch {
        // ignore
      }
    }, 2000);

    const handleBeforeUnload = () => {
      try {
        channel.postMessage({ type: 'PROJECTOR_DISCONNECTED' });
      } catch {
        // ignore
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Fullscreen shortcut F11
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch((err) => {
            console.warn('Enter fullscreen request failed:', err);
          });
        } else {
          document.exitFullscreen().catch((err) => {
            console.warn('Exit fullscreen request failed:', err);
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(heartbeatTimer);
      try {
        channel.postMessage({ type: 'PROJECTOR_DISCONNECTED' });
      } catch {
        // ignore
      }
      channel.close();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const slide = state.slide;

  const hasVideo = Boolean(
    slide &&
      (slide.videoType === 'local' ||
        slide.videoType === 'youtube' ||
        slide.videoUrl ||
        slide.videoPath ||
        slide.youtubeUrl) &&
      slide.videoType !== 'none'
  );

  const isYouTubeVideo = Boolean(
    slide &&
      (slide.videoType === 'youtube' ||
        (slide.youtubeUrl && !slide.videoPath && !slide.videoUrl))
  );

  const isLocalVideo = Boolean(
    hasVideo && !isYouTubeVideo && (slide?.videoPath || slide?.videoUrl)
  );

  const localVideoSrc = normalizeVideoSource(slide?.videoPath || slide?.videoUrl || '');
  const videoPoster =
    slide?.imageUrl && !isVideoFile(slide.imageUrl)
      ? slide.imageUrl
      : generateVideoThumbnail(slide?.videoTitle || slide?.section || 'Video Playback');

  // Synchronize projector local video playback with operator console
  useEffect(() => {
    if (!videoRef.current || !isLocalVideo) return;
    const v = videoRef.current;
    const pb = state.videoPlayback;
    if (!pb) return;

    if (pb.isPlaying && !state.isBlackout && !state.isLogoActive && v.paused) {
      v.play().catch((err) => console.log('Projector video play deferred:', err));
    } else if ((!pb.isPlaying || state.isBlackout || state.isLogoActive) && !v.paused) {
      v.pause();
    }

    v.volume = pb.volume;
    v.muted = pb.isMuted;

    if (v.playbackRate !== pb.playbackRate) {
      v.playbackRate = pb.playbackRate;
    }

    const shouldLoop = Boolean(slide?.loop ?? slide?.videoLoop ?? pb.isLooping);
    if (v.loop !== shouldLoop) {
      v.loop = shouldLoop;
    }

    if (Math.abs(v.currentTime - pb.currentTime) > 1.0) {
      v.currentTime = pb.currentTime;
    }
  }, [isLocalVideo, state.videoPlayback, state.isBlackout, state.isLogoActive, slide?.loop, slide?.videoLoop]);

  // Compute responsive scale factor to fit 1920x1080 stage inside any window resolution
  const scaleX = viewportSize.width / 1920;
  const scaleY = viewportSize.height / 1080;
  const scale = Math.min(scaleX, scaleY);

  const lines = slide?.lines || [];
  const lineCount = lines.length;
  const maxLineLength = lines.reduce((max, line) => Math.max(max, line.length), 0);

  let fontSize = 104;
  let lineHeight = 1.3;

  if (lineCount > 5 || maxLineLength > 55) {
    fontSize = 68;
    lineHeight = 1.32;
  } else if (lineCount > 3 || maxLineLength > 42) {
    fontSize = 82;
    lineHeight = 1.3;
  } else if (lineCount === 3) {
    fontSize = 92;
    lineHeight = 1.28;
  } else if (lineCount === 1 && maxLineLength <= 28) {
    fontSize = 118;
    lineHeight = 1.25;
  }

  const youtubeVideoId = isYouTubeVideo
    ? parseYouTubeId(slide?.youtubeUrl || slide?.videoUrl || '')
    : null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
      onMouseEnter={() => setShowHud(true)}
      onMouseLeave={() => setShowHud(false)}
    >
      <style>{`
        @keyframes stageVideoFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes stageFadeIn {
          from { opacity: 0; transform: translateY(12px) scale(0.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* Background Layer (Fills entire screen edge-to-edge) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: state.isBlackout
            ? '#000000'
            : state.backgroundGradient.startsWith('data:image') ||
              state.backgroundGradient.startsWith('http') ||
              state.backgroundGradient.startsWith('blob:')
            ? state.backgroundGradient.startsWith('url(')
              ? state.backgroundGradient
              : `url("${state.backgroundGradient}") center center / cover no-repeat`
            : state.backgroundGradient,
          transition: 'background 0.5s ease',
        }}
      />

      {/* Atmospheric lighting */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 50% 35%, rgba(255, 255, 255, 0.16) 0%, transparent 72%)',
          pointerEvents: 'none',
        }}
      />

      {/* 1920x1080 Scaled Reality Stage (Maintains exact 1:1 fidelity with Live Monitor) */}
      <div
        className="sanctuary-virtual-stage"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          marginTop: -540,
          marginLeft: -960,
          width: 1920,
          height: 1080,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          overflow: 'hidden',
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Video Layer */}
        {hasVideo && !state.isBlackout && !state.isLogoActive && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 5,
              overflow: 'hidden',
              animation:
                state.transitionType === 'FADE'
                  ? `stageVideoFadeIn ${state.fadeDuration}s ease-out`
                  : 'none',
            }}
          >
            {isLocalVideo && localVideoSrc && (
              <video
                ref={videoRef}
                src={localVideoSrc}
                poster={videoPoster}
                preload="auto"
                autoPlay={slide?.autoPlay !== false && !state.isBlackout && !state.isLogoActive}
                loop={Boolean(slide?.loop ?? slide?.videoLoop ?? state.videoPlayback?.isLooping)}
                muted={Boolean(state.videoPlayback?.isMuted)}
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: slide?.videoFit || 'contain',
                }}
                onError={() => {
                  console.warn('Projector video failed to load source:', localVideoSrc);
                  try {
                    const channel = new BroadcastChannel('bunsenworship_projector_channel');
                    channel.postMessage({ type: 'PROJECTOR_VIDEO_ERROR' });
                    channel.close();
                  } catch {
                    // ignore
                  }
                }}
                onPause={() => {
                  if (state.videoPlayback?.isPlaying && !state.isBlackout && !state.isLogoActive) {
                    videoRef.current?.play().catch((err) => console.log('Resume deferred:', err));
                  }
                }}
              />
            )}

            {isYouTubeVideo && youtubeVideoId && (
              <YouTubePlayer
                videoId={youtubeVideoId}
                poster={videoPoster}
                isPlaying={Boolean(state.videoPlayback?.isPlaying)}
                currentTime={state.videoPlayback?.currentTime || 0}
                volume={state.videoPlayback?.volume ?? 1.0}
                isMuted={Boolean(state.videoPlayback?.isMuted)}
                loop={Boolean(slide?.loop ?? slide?.videoLoop ?? state.videoPlayback?.isLooping)}
                startTime={slide?.videoStartTime || 0}
                isLive={state.source === 'LIVE'}
                isBlackout={state.isBlackout}
                isLogoActive={state.isLogoActive}
                onError={(errCode) => {
                  console.warn('Projector YouTube error code:', errCode);
                  try {
                    const channel = new BroadcastChannel('bunsenworship_projector_channel');
                    channel.postMessage({ type: 'PROJECTOR_VIDEO_ERROR' });
                    channel.close();
                  } catch {
                    // ignore
                  }
                }}
              />
            )}
          </div>
        )}

        {/* Slide Image Layer */}
        {slide?.imageUrl && !state.isBlackout && !state.isLogoActive && !hasVideo && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 5,
              overflow: 'hidden',
            }}
          >
            <img
              src={slide.imageUrl}
              alt={slide.section || 'Slide Graphic'}
              style={{
                width: '100%',
                height: '100%',
                objectFit:
                  slide.imageFit || (lines.length > 0 ? 'cover' : 'contain'),
                filter: lines.length > 0 ? 'brightness(0.72)' : 'none',
              }}
            />
          </div>
        )}

        {/* Stage Content (Lyrics or Overrides) */}
        {state.isBlackout ? (
          <div style={{ position: 'relative', zIndex: 10 }} />
        ) : state.isLogoActive ? (
          <div
            style={{
              position: 'relative',
              zIndex: 10,
              filter: 'drop-shadow(0 16px 45px rgba(0, 0, 0, 0.9))',
            }}
          >
            <BunsenWorshipLogo size={240} />
          </div>
        ) : state.isTextCleared ? (
          <div style={{ position: 'relative', zIndex: 10 }} />
        ) : slide && lines.length > 0 ? (
          <div
            key={slide.id}
            style={{
              position: 'relative',
              zIndex: 10,
              maxWidth: '1780px',
              width: '100%',
              padding: '40px 72px',
              color: '#ffffff',
              fontWeight: 800,
              textAlign: 'center',
              fontSize: `${fontSize}px`,
              lineHeight: lineHeight,
              letterSpacing: '-0.015em',
              textShadow:
                '0 8px 32px rgba(0, 0, 0, 0.95), 0 2px 10px rgba(0, 0, 0, 0.9)',
              boxSizing: 'border-box',
              animation:
                state.transitionType === 'FADE'
                  ? `stageFadeIn ${state.fadeDuration}s ease-out`
                  : 'none',
            }}
          >
            {lines.map((line, idx) => (
              <div
                key={idx}
                style={{
                  marginBottom: idx < lines.length - 1 ? '24px' : 0,
                }}
              >
                {line}
              </div>
            ))}
          </div>
        ) : slide?.imageUrl || hasVideo ? null : (
          <div
            style={{
              position: 'relative',
              zIndex: 10,
              color: '#ffffff',
              opacity: 0.3,
              fontSize: '48px',
              fontWeight: 800,
              letterSpacing: '0.1em',
            }}
          >
            BUNSENWORSHIP
          </div>
        )}
      </div>

      {/* Floating HUD Indicator on hover */}
      {showHud && (
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '16px',
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '20px',
            padding: '6px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.75rem',
            color: '#94a3b8',
            transition: 'opacity 0.2s ease',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: state.source === 'LIVE' ? '#ef4444' : '#22c55e',
              display: 'inline-block',
            }}
          />
          <span style={{ color: '#ffffff', fontWeight: 600 }}>
            {state.source === 'LIVE' ? 'LIVE PROGRAM' : 'NEXT PREVIEW'}
          </span>
          <span style={{ opacity: 0.5 }}>&bull;</span>
          <span>Press F11 for Fullscreen</span>
        </div>
      )}
    </div>
  );
};
