import React, { useEffect, useRef, useState } from 'react';
import { Slide } from '../../store/features/presentation';
import { openUrlFromEmbedUrl } from '../../utils/presentationHelpers';

export interface EmbeddedDeckViewProps {
  slide: Slide;
}

/**
 * Renders a slide that is an embedded external presentation (e.g. a live Canva design).
 * Shows the live embed iframe as the "original" slide; falls back to a saved image
 * (or an Open-in-Canva card) when the embed cannot load.
 */
export const EmbeddedDeckView: React.FC<EmbeddedDeckViewProps> = ({ slide }) => {
  const [embedFailed, setEmbedFailed] = useState(false);
  const loadedRef = useRef(false);

  const embedUrl = slide.embedUrl;

  useEffect(() => {
    loadedRef.current = false;
    setEmbedFailed(false);
    if (!embedUrl) return;

    const timer = window.setTimeout(() => {
      if (!loadedRef.current) {
        setEmbedFailed(true);
      }
    }, 15000);

    return () => window.clearTimeout(timer);
  }, [embedUrl]);

  const handleLoad = () => {
    loadedRef.current = true;
    setEmbedFailed(false);
  };

  if (!embedUrl) return null;

  if (embedFailed) {
    const openUrl = openUrlFromEmbedUrl(embedUrl);
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          background:
            'linear-gradient(135deg, #083344 0%, #0f172a 60%, #155e75 100%)',
        }}
      >
        {slide.imageUrl && (
          <img
            src={slide.imageUrl}
            alt={slide.section || 'Embedded Presentation'}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
        )}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            textAlign: 'center',
            padding: '24px',
            background: 'rgba(0, 0, 0, 0.55)',
            borderRadius: '12px',
          }}
        >
          <div
            style={{
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '28px',
              marginBottom: '10px',
            }}
          >
            Live presentation unavailable
          </div>
          {openUrl ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (window.electronAPI?.openExternal) {
                  window.electronAPI.openExternal(openUrl).catch((err) => {
                    console.warn('Failed to open Canva externally:', err);
                  });
                } else {
                  window.open(openUrl, '_blank', 'noopener,noreferrer');
                }
              }}
              style={{
                display: 'inline-block',
                background: '#06b6d4',
                color: '#ffffff',
                border: 'none',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '20px',
                padding: '12px 26px',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Open in Canva
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 5,
        overflow: 'hidden',
      }}
    >
      <iframe
        src={embedUrl}
        title={slide.section || 'Embedded Presentation'}
        onLoad={handleLoad}
        allow="fullscreen; autoplay"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
          background: '#ffffff',
        }}
      />
    </div>
  );
};

export default EmbeddedDeckView;