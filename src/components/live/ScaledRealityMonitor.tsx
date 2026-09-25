import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Slide,
  selectVideoPlayback,
  selectIsProjectorActive,
  setVideoDuration,
  setVideoCurrentTime,
  setVideoPlaying,
  relinkSlideVideo,
  setVideoError,
  clearVideoError,
} from '../../store/features/presentation';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { BunsenWorshipLogo } from '../sidebar/NavIcons';
import { VideoIcon } from '../common/Icons';
import {
  normalizeVideoSource,
  isBareFilename,
  extractYouTubeId,
  getSlideThumbnail,
} from '../../utils/videoHelpers';
import { YouTubePlayer } from './YouTubePlayer';
import { EmbeddedDeckView } from './EmbeddedDeckView';

export const getRealityStageScale = (
  width: number,
  height: number,
  stageWidth = 1920,
  stageHeight = 1080
) => {
  if (width <= 0 || height <= 0 || stageWidth <= 0 || stageHeight <= 0) return 0;
  return Math.min(width / stageWidth, height / stageHeight);
};

export interface ScaledRealityMonitorProps {
  slide: Slide | null;
  backgroundGradient: string;
  isBlackout?: boolean;
  isTextCleared?: boolean;
  isLogoActive?: boolean;
  transitionType?: 'CUT' | 'FADE';
  fadeDuration?: number;
  emptyLabel?: string;
  isLive?: boolean;
  outputDimensions?: { width: number; height: number };
}

export const getStageTypographicMetrics = (lines: string[]) => {
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

  return { fontSize, lineHeight };
};

export const ScaledRealityMonitor: React.FC<ScaledRealityMonitorProps> = ({
  slide,
  backgroundGradient,
  isBlackout = false,
  isTextCleared = false,
  isLogoActive = false,
  transitionType = 'CUT',
  fadeDuration = 1.0,
  emptyLabel = '[No Content]',
  isLive = false,
  outputDimensions,
}) => {
  const dispatch = useAppDispatch();
  const videoPlayback = useAppSelector(selectVideoPlayback);
  const isProjectorActive = useAppSelector(selectIsProjectorActive);

  const outW = outputDimensions?.width || 1920;
  const outH = outputDimensions?.height || 1080;
  const stageWidth = 1920;
  const stageHeight = Math.round(1920 * (outH / outW));
  const stageAspectRatio = `${outW} / ${outH}`;

  // When projector is active, mute operator preview to prevent dual sound / echo.
  // When projector is closed, operator preview plays audio for rehearsal / preview.
  const shouldMuteOperatorAudio = !isLive || videoPlayback.isMuted || isProjectorActive;

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const relinkInputRef = useRef<HTMLInputElement>(null);
  const [scale, setScale] = useState<number>(0.1875);
  const [localVideoError, setLocalVideoError] = useState<boolean>(false);
  const lastDispatchedTimeRef = useRef<number>(0);

  // Responsive scale factor to fit output stage inside container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateScale = () => {
      const bounds = el.getBoundingClientRect();
      const nextScale = getRealityStageScale(
        el.clientWidth || bounds.width,
        el.clientHeight || bounds.height,
        stageWidth,
        stageHeight
      );
      if (nextScale > 0) {
        setScale(nextScale);
      }
    };

    updateScale();
    const resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(el);

    return () => resizeObserver.disconnect();
  }, [stageWidth, stageHeight]);

  const youtubeVideoId = extractYouTubeId(slide);
  const isYouTubeVideo = Boolean(youtubeVideoId);
  const hasVideo = Boolean(
    slide &&
      (isYouTubeVideo ||
        slide.videoType === 'local' ||
        slide.videoUrl ||
        slide.videoPath) &&
      slide.videoType !== 'none'
  );

  const isLocalVideo = Boolean(
    hasVideo && !isYouTubeVideo && (slide?.videoPath || slide?.videoUrl)
  );

  const localVideoSrc = isLocalVideo
    ? normalizeVideoSource(slide?.videoPath || slide?.videoUrl || '')
    : '';

  // Auto-resolve bare filenames from local user folders
  useEffect(() => {
    const rawPath = slide?.videoPath || slide?.videoUrl;
    if (!rawPath || isYouTubeVideo || !isBareFilename(rawPath)) return;

    if (window.electronAPI?.resolveVideoPath) {
      window.electronAPI
        .resolveVideoPath(rawPath)
        .then((resolved) => {
          if (resolved && slide?.id) {
            dispatch(
              relinkSlideVideo({
                slideId: slide.id,
                filePath: resolved,
              })
            );
            setLocalVideoError(false);
            if (isLive) dispatch(clearVideoError());
          }
        })
        .catch((err) => {
          console.warn('Auto resolve video path failed:', err);
        });
    }
  }, [slide?.id, slide?.videoPath, slide?.videoUrl, isYouTubeVideo, isLive, dispatch]);

  // Reset video error when slide or video source updates
  useEffect(() => {
    setLocalVideoError(false);
    if (isLive) {
      dispatch(clearVideoError());
    }
  }, [slide?.id, localVideoSrc, isLive, dispatch]);

  const handleRelinkVideo = async () => {
    if (window.electronAPI?.openVideoDialog) {
      try {
        const chosen = await window.electronAPI.openVideoDialog();
        if (chosen) {
          dispatch(
            relinkSlideVideo({
              slideId: slide?.id,
              filePath: chosen,
            })
          );
          setLocalVideoError(false);
          if (isLive) dispatch(clearVideoError());
        }
      } catch (err) {
        console.error('Failed to open video dialog:', err);
      }
    } else {
      relinkInputRef.current?.click();
    }
  };

  // Synchronize local video element with Redux playback state when Live
  useEffect(() => {
    if (!isLive || !videoRef.current || !isLocalVideo) return;
    const v = videoRef.current;

    // Play / Pause
    if (videoPlayback.isPlaying && !isBlackout && !isLogoActive && v.paused) {
      v.play().catch((err) => console.log('Video play deferred:', err));
    } else if ((!videoPlayback.isPlaying || isBlackout || isLogoActive) && !v.paused) {
      v.pause();
    }

    // Volume & Mute
    v.volume = videoPlayback.volume;
    v.muted = shouldMuteOperatorAudio;

    // Playback rate
    if (v.playbackRate !== videoPlayback.playbackRate) {
      v.playbackRate = videoPlayback.playbackRate;
    }

    // Loop
    const shouldLoop = Boolean(slide?.loop ?? slide?.videoLoop ?? videoPlayback.isLooping);
    if (v.loop !== shouldLoop) {
      v.loop = shouldLoop;
    }
  }, [
    isLive,
    isLocalVideo,
    isBlackout,
    isLogoActive,
    videoPlayback.isPlaying,
    videoPlayback.volume,
    shouldMuteOperatorAudio,
    videoPlayback.playbackRate,
    videoPlayback.isLooping,
    slide?.loop,
    slide?.videoLoop,
  ]);

  // Synchronize external seeks (when user drags timeline seekbar)
  useEffect(() => {
    if (!isLive || !videoRef.current || !isLocalVideo) return;
    const v = videoRef.current;
    if (Math.abs(v.currentTime - videoPlayback.currentTime) > 1.0) {
      v.currentTime = videoPlayback.currentTime;
    }
  }, [isLive, isLocalVideo, videoPlayback.currentTime]);

  // When live slide changes, reset video time if configured
  useEffect(() => {
    if (!isLive || !videoRef.current || !isLocalVideo) return;
    const v = videoRef.current;
    const startTime = slide?.videoStartTime || 0;
    v.currentTime = startTime;
    if (slide?.autoPlay !== false && !isBlackout && !isLogoActive) {
      v.play().catch((err) => console.log('Autoplay deferred:', err));
      dispatch(setVideoPlaying(true));
    }
  }, [slide?.id, isLive, isLocalVideo, slide?.videoStartTime, slide?.autoPlay, isBlackout, isLogoActive, dispatch]);

  const handleLoadedMetadata = useCallback(() => {
    if (!videoRef.current) return;
    const dur = videoRef.current.duration;
    if (isLive && !isNaN(dur) && dur > 0) {
      dispatch(setVideoDuration(dur));
    }
  }, [isLive, dispatch]);

  const handleTimeUpdate = useCallback(() => {
    if (!isLive || !videoRef.current) return;
    const cur = videoRef.current.currentTime;
    // Throttle dispatch to every 0.25 seconds
    if (Math.abs(cur - lastDispatchedTimeRef.current) >= 0.25) {
      lastDispatchedTimeRef.current = cur;
      dispatch(setVideoCurrentTime(cur));
    }
  }, [isLive, dispatch]);

  const handleEnded = useCallback(() => {
    if (isLive) {
      const isLoop = Boolean(slide?.loop ?? slide?.videoLoop ?? videoPlayback.isLooping);
      if (!isLoop) {
        dispatch(setVideoPlaying(false));
      }
    }
  }, [isLive, slide?.loop, slide?.videoLoop, videoPlayback.isLooping, dispatch]);

  // Compute responsive typographic scale for 1920x1080 canvas
  const lines = slide?.lines || [];
  const { fontSize, lineHeight } = getStageTypographicMetrics(lines);

  // Compute reliable video poster thumbnail
  const videoPoster = getSlideThumbnail(slide);

  return (
    <div
      ref={containerRef}
      className={`monitor-screen-frame ${isLive ? 'is-live-frame' : 'is-preview-frame'}`}
      style={{ aspectRatio: stageAspectRatio }}
    >
      <div className="monitor-dimension-tag">
        {outW}×{outH}
      </div>
      <input
        type="file"
        ref={relinkInputRef}
        accept="video/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const fullPath = window.electronAPI?.getPathForFile?.(file) || URL.createObjectURL(file);
            dispatch(
              relinkSlideVideo({
                slideId: slide?.id,
                filePath: fullPath,
              })
            );
            setVideoError(false);
          }
        }}
      />
      <div
        className="sanctuary-virtual-stage"
        style={{
          width: stageWidth,
          height: stageHeight,
          marginLeft: -stageWidth / 2,
          marginTop: -stageHeight / 2,
          transform: `scale(${scale})`,
        }}
      >
        {/* Sanctuary Motion Background Canvas */}
        <div
          className="stage-bg-layer"
          style={{
            background: isBlackout
              ? '#000000'
              : backgroundGradient.startsWith('data:image') ||
                backgroundGradient.startsWith('http') ||
                backgroundGradient.startsWith('blob:')
              ? backgroundGradient.startsWith('url(')
                ? backgroundGradient
                : `url("${backgroundGradient}") center center / cover no-repeat`
              : backgroundGradient,
          }}
        />

        {/* Cinematic Atmospheric Lighting */}
        <div className="stage-atmosphere-layer" />

        {/* Video Layer */}
        {hasVideo && !isBlackout && !isLogoActive && (
          <div
            className={`stage-video-layer ${
              transitionType === 'FADE' ? 'is-video-fade' : ''
            }`}
            style={{
              animation:
                transitionType === 'FADE'
                  ? `stageVideoFadeIn ${fadeDuration}s ease-out`
                  : 'none',
              zIndex: 5,
            }}
          >
            {isLocalVideo && localVideoSrc && (
              <video
                ref={videoRef}
                src={localVideoSrc}
                poster={videoPoster}
                preload="auto"
                autoPlay={isLive && slide?.autoPlay !== false && !isBlackout && !isLogoActive}
                loop={Boolean(slide?.loop ?? slide?.videoLoop ?? videoPlayback.isLooping)}
                muted={shouldMuteOperatorAudio}
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: slide?.videoFit || 'contain',
                }}
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                onError={() => {
                  console.warn('Video failed to load source:', localVideoSrc);
                  setLocalVideoError(true);
                  if (isLive) {
                    dispatch(setVideoError(true));
                  }
                }}
                onPlay={() => {
                  if (isLive) dispatch(setVideoPlaying(true));
                }}
                onPause={() => {
                  if (isLive && videoPlayback.isPlaying && !isBlackout && !isLogoActive) {
                    videoRef.current?.play().catch((err) => console.log('Resume deferred:', err));
                  }
                }}
              />
            )}

            {isYouTubeVideo && youtubeVideoId && (
              <YouTubePlayer
                videoId={youtubeVideoId}
                poster={videoPoster}
                isPlaying={isLive ? videoPlayback.isPlaying : false}
                currentTime={videoPlayback.currentTime}
                volume={videoPlayback.volume}
                isMuted={shouldMuteOperatorAudio}
                loop={Boolean(slide?.loop ?? slide?.videoLoop ?? videoPlayback.isLooping)}
                startTime={slide?.videoStartTime || 0}
                isLive={isLive}
                isBlackout={isBlackout}
                isLogoActive={isLogoActive}
                onDurationChange={(dur) => {
                  if (isLive) dispatch(setVideoDuration(dur));
                }}
                onTimeUpdate={(t) => {
                  if (isLive) dispatch(setVideoCurrentTime(t));
                }}
                onPlay={() => {
                  if (isLive) dispatch(setVideoPlaying(true));
                }}
                onPause={() => {
                  // Unintentional pause (e.g. minimize or window focus loss) is handled by YouTubePlayer auto-resume
                }}
                onEnded={() => {
                  if (isLive) {
                    const isLoop = Boolean(slide?.loop ?? slide?.videoLoop ?? videoPlayback.isLooping);
                    if (!isLoop) dispatch(setVideoPlaying(false));
                  }
                }}
                onError={(errCode) => {
                  console.warn('YouTube Player error code:', errCode);
                  if (errCode === 100 || errCode === 101 || errCode === 150) {
                    setLocalVideoError(true);
                    if (isLive) dispatch(setVideoError(true));
                  }
                }}
              />
            )}
          </div>
        )}

        {/* Slide Image Layer */}
        {slide?.imageUrl && !slide?.embedUrl && !isBlackout && !isLogoActive && !hasVideo && (
          <div
            className="stage-image-layer"
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
                objectFit: slide.imageFit || (lines.length > 0 ? 'cover' : 'contain'),
                filter: lines.length > 0 ? 'brightness(0.72)' : 'none',
              }}
            />
          </div>
        )}

        {/* Embedded Deck Layer (Canva / live presentations) */}
        {slide?.embedUrl && !isBlackout && !isLogoActive && (
          <EmbeddedDeckView slide={slide} />
        )}

        {/* Reality Content State (Lyrics or Overrides) */}
        {isBlackout ? (
          <div className="stage-blackout-state">
            <span className="stage-badge-blackout">&bull; BLACKOUT ACTIVE &bull;</span>
          </div>
        ) : isLogoActive ? (
          <div className="stage-logo-state">
            <BunsenWorshipLogo size={240} />
          </div>
        ) : isTextCleared ? (
          <div className="stage-cleared-state">
            <span>[ Text Cleared &bull; Background Only ]</span>
          </div>
        ) : slide && lines.length > 0 ? (
          <div
            key={slide.id}
            className={`stage-lyrics-wrap ${
              transitionType === 'FADE' ? 'is-fade' : 'is-cut'
            }`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              padding: '40px 72px',
              boxSizing: 'border-box',
              animationDuration: `${fadeDuration}s`,
              zIndex: 10,
              position: 'relative',
            }}
          >
            <div
              className="stage-lyrics-text"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                maxWidth: '1780px',
                fontSize: `${fontSize}px`,
                lineHeight: lineHeight,
                textAlign: 'center',
              }}
            >
              {lines.map((line, idx) => (
                <div
                  key={idx}
                  className="stage-lyric-line"
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'center',
                    marginBottom: idx < lines.length - 1 ? '24px' : 0,
                  }}
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        ) : slide?.imageUrl || slide?.embedUrl || hasVideo ? null : (
          <div className="stage-empty-state">
            <span>{emptyLabel}</span>
          </div>
        )}
      </div>

      {/* Operator-side error alert badge (unobtrusive, no emojis) */}
      {(localVideoError || (isLive && videoPlayback.videoError)) && (
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            zIndex: 40,
            background: 'rgba(15, 23, 42, 0.92)',
            border: '1px solid rgba(239, 68, 68, 0.6)',
            borderRadius: '6px',
            padding: '5px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5)',
          }}
        >
          <span style={{ color: '#ef4444', fontSize: '0.7rem', fontWeight: 700 }}>
            File Not Found
          </span>
          <button
            type="button"
            onClick={handleRelinkVideo}
            style={{
              background: '#ef4444',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              padding: '2px 8px',
              fontSize: '0.675rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <VideoIcon size={10} />
            <span>Relink</span>
          </button>
        </div>
      )}
    </div>
  );
};
