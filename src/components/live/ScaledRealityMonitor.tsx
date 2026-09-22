import React, { useRef, useState, useEffect } from 'react';
import { Slide } from '../../store/features/presentation';
import { BunsenWorshipLogo } from '../sidebar/NavIcons';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scale, setScale] = useState<number>(0.1875);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

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

  // Auto-play video when slide changes and is live
  useEffect(() => {
    if (videoRef.current && slide && isLive) {
      if (slide.videoType === 'local' && (slide.videoUrl || slide.videoPath)) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(err => console.log('Video autoplay blocked:', err));
        setIsVideoPlaying(true);
      }
    }
  }, [slide, isLive]);

  // Get YouTube video ID from URL
  const getYouTubeId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

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

  const hasVideo = slide?.videoType && slide.videoType !== 'none';
  const isLocalVideo = slide?.videoType === 'local' && (slide.videoUrl || slide.videoPath);
  const isYouTubeVideo = slide?.videoType === 'youtube' && slide.youtubeUrl;
  const youtubeId = isYouTubeVideo ? getYouTubeId(slide.youtubeUrl) : null;

  const handleVideoToggle = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause();
        setIsVideoPlaying(false);
      } else {
        videoRef.current.play();
        setIsVideoPlaying(true);
      }
    }
  };

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
        {hasVideo && !isBlackout && (
          <div className="stage-video-layer">
            {isLocalVideo && (
              <video
                ref={videoRef}
                src={slide.videoPath || slide.videoUrl}
                autoPlay={isLive}
                loop={slide.loop || false}
                muted={false}
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
                onPlay={() => setIsVideoPlaying(true)}
                onPause={() => setIsVideoPlaying(false)}
                onEnded={() => setIsVideoPlaying(false)}
              />
            )}
            {isYouTubeVideo && youtubeId && (
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=${isLive ? 1 : 0}&controls=1&mute=0&rel=0&modestbranding=1`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
                title={slide.section || 'Video'}
              />
            )}
            {/* Video Controls Overlay */}
            {isLocalVideo && (
              <div className="stage-video-controls">
                <button
                  type="button"
                  className="video-control-btn"
                  onClick={handleVideoToggle}
                  title={isVideoPlaying ? 'Pause' : 'Play'}
                >
                  {isVideoPlaying ? '⏸' : '▶'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Slide Image Layer */}
        {slide?.imageUrl && !isBlackout && !hasVideo && (
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

        {/* Reality Content State */}
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
        ) : slide && !hasVideo && lines.length > 0 ? (
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
