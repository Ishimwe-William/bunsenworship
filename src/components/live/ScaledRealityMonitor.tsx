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
  const [scale, setScale] = useState<number>(0.1875);

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
            background: isBlackout ? '#000000' : backgroundGradient,
          }}
        />

        {/* Cinematic Atmospheric Lighting */}
        <div className="stage-atmosphere-layer" />

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
        ) : slide && lines.length > 0 ? (
          <div
            key={slide.id}
            className={`stage-lyrics-wrap ${
              transitionType === 'FADE' ? 'is-fade' : 'is-cut'
            }`}
            style={{
              animationDuration: `${fadeDuration}s`,
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
        ) : (
          <div className="stage-empty-state">
            <span>{emptyLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
};
