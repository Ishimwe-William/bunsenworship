import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Slide,
  selectVideoPlayback,
  setVideoDuration,
  setVideoCurrentTime,
  setVideoPlaying,
} from '../../store/features/presentation';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { BunsenWorshipLogo } from '../sidebar/NavIcons';
import { buildYouTubeEmbedUrl } from '../../utils/videoHelpers';

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
}

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
}) => {
  const dispatch = useAppDispatch();
  const videoPlayback = useAppSelector(selectVideoPlayback);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scale, setScale] = useState<number>(0.1875);
  const lastDispatchedTimeRef = useRef<number>(0);

  // Responsive scale factor to fit 1920x1080 stage inside container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateScale = () => {
      const width = el.clientWidth || el.getBoundingClientRect().width;
      if (width > 0) {
        setScale(width / 1920);
      }
    };

    updateScale();
    const resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(el);

    return () => resizeObserver.disconnect();
  }, []);

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

  const localVideoSrc = slide?.videoPath || slide?.videoUrl || '';

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
    v.muted = videoPlayback.isMuted;

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
    videoPlayback.isMuted,
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
    if (slide?.autoPlay !== false) {
      v.play().catch((err) => console.log('Autoplay deferred:', err));
      dispatch(setVideoPlaying(true));
    }
  }, [slide?.id, isLive, isLocalVideo, slide?.videoStartTime, slide?.autoPlay, dispatch]);

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

  // Build YouTube embed URL if applicable
  const youtubeUrl = isYouTubeVideo
    ? buildYouTubeEmbedUrl(slide?.youtubeUrl || '', {
        autoplay: isLive && slide?.autoPlay !== false,
        loop: Boolean(slide?.loop ?? slide?.videoLoop),
        mute: !isLive || Boolean(slide?.videoMuted),
        startTime: slide?.videoStartTime,
        controls: true,
      })
    : null;

  return (
    <div
      ref={containerRef}
      className={`monitor-screen-frame ${isLive ? 'is-live-frame' : 'is-preview-frame'}`}
    >
      <div
        className="sanctuary-virtual-stage"
        style={{
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
                autoPlay={isLive && slide?.autoPlay !== false}
                loop={Boolean(slide?.loop ?? slide?.videoLoop ?? videoPlayback.isLooping)}
                muted={!isLive || videoPlayback.isMuted}
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: slide?.videoFit || 'contain',
                }}
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                onPlay={() => {
                  if (isLive) dispatch(setVideoPlaying(true));
                }}
                onPause={() => {
                  if (isLive) dispatch(setVideoPlaying(false));
                }}
              />
            )}

            {isYouTubeVideo && youtubeUrl && (
              <iframe
                src={youtubeUrl}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
                title={slide?.videoTitle || slide?.section || 'YouTube Video'}
              />
            )}
          </div>
        )}

        {/* Slide Image Layer */}
        {slide?.imageUrl && !isBlackout && !isLogoActive && !hasVideo && (
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
              animationDuration: `${fadeDuration}s`,
              zIndex: 10,
              position: 'relative',
            }}
          >
            <div
              className="stage-lyrics-text"
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: lineHeight,
              }}
            >
              {lines.map((line, idx) => (
                <div key={idx} className="stage-lyric-line">
                  {line}
                </div>
              ))}
            </div>
          </div>
        ) : slide?.imageUrl || hasVideo ? null : (
          <div className="stage-empty-state">
            <span>{emptyLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
};
