import React, { useEffect, useState } from 'react';
import { Slide } from '../../store/features/presentation';
import { BunsenWorshipLogo } from '../sidebar/NavIcons';

export interface ProjectorPayload {
  slide: Slide | null;
  backgroundGradient: string;
  isBlackout: boolean;
  isTextCleared: boolean;
  isLogoActive: boolean;
  transitionType: 'CUT' | 'FADE';
  fadeDuration: number;
  source: 'LIVE' | 'PREVIEW';
}

const DEFAULT_GRADIENT =
  'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%)';

export const ProjectorWindowView: React.FC = () => {
  const [state, setState] = useState<ProjectorPayload>(() => {
    try {
      const saved = localStorage.getItem('bunsenworship_projector_state');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return {
      slide: null,
      backgroundGradient: DEFAULT_GRADIENT,
      isBlackout: false,
      isTextCleared: false,
      isLogoActive: false,
      transitionType: 'FADE',
      fadeDuration: 1.0,
      source: 'LIVE',
    };
  });

  const [showHud, setShowHud] = useState(false);

  useEffect(() => {
    document.title = 'BunsenWorship - Sanctuary Projection Output';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    document.body.style.backgroundColor = '#000000';

    const channel = new BroadcastChannel('bunsenworship_projector_channel');

    channel.onmessage = (event) => {
      if (event.data?.type === 'UPDATE_PROJECTOR_STATE') {
        setState(event.data.payload);
      }
    };

    // Request latest state from main window
    channel.postMessage({ type: 'REQUEST_PROJECTOR_STATE' });

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
      channel.close();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const lines = state.slide?.lines || [];
  const lineCount = lines.length;
  const maxLineLength = lines.reduce((max, line) => Math.max(max, line.length), 0);

  let fontSize = '4.5rem';
  let lineHeight = 1.35;

  if (lineCount > 5 || maxLineLength > 55) {
    fontSize = '2.8rem';
    lineHeight = 1.3;
  } else if (lineCount > 3 || maxLineLength > 42) {
    fontSize = '3.5rem';
    lineHeight = 1.32;
  } else if (lineCount === 1 && maxLineLength <= 25) {
    fontSize = '5.5rem';
    lineHeight = 1.25;
  }

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
      {/* Background Layer */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: state.isBlackout ? '#000000' : state.backgroundGradient,
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

      {/* Content Rendering */}
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
          <BunsenWorshipLogo size={280} />
        </div>
      ) : state.isTextCleared ? (
        <div style={{ position: 'relative', zIndex: 10 }} />
      ) : state.slide && lines.length > 0 ? (
        <div
          key={state.slide.id}
          style={{
            position: 'relative',
            zIndex: 10,
            maxWidth: '1680px',
            width: '100%',
            padding: '3rem 5rem',
            color: '#ffffff',
            fontWeight: 800,
            textAlign: 'center',
            fontSize: fontSize,
            lineHeight: lineHeight,
            letterSpacing: '-0.015em',
            textShadow: '0 8px 32px rgba(0, 0, 0, 0.95), 0 2px 10px rgba(0, 0, 0, 0.9)',
            boxSizing: 'border-box',
            animation:
              state.transitionType === 'FADE'
                ? `stageFadeIn ${state.fadeDuration}s ease-out`
                : 'none',
          }}
        >
          {lines.map((line, idx) => (
            <div key={idx} style={{ marginBottom: idx < lines.length - 1 ? '1.5rem' : 0 }}>
              {line}
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            color: '#ffffff',
            opacity: 0.3,
            fontSize: '3rem',
            fontWeight: 800,
            letterSpacing: '0.1em',
          }}
        >
          BUNSENWORSHIP
        </div>
      )}

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
