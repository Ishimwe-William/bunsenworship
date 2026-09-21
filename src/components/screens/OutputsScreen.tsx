import React from 'react';

export const OutputsScreen: React.FC = () => {
  return (
    <div className="screen-content">
      <div className="screen-header">
        <div>
          <h2 className="screen-title">Display Outputs</h2>
          <p className="screen-description">
            Configure multiscreen routing for sanctuary projectors, confidence monitors, and stage foldbacks.
          </p>
        </div>
        <button type="button" className="btn-primary">
          Identify Displays
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        <article className="slide-card">
          <div className="slide-card-header">
            <strong>Main Sanctuary Projector</strong>
            <span className="slide-badge" style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', color: 'var(--color-success)' }}>
              1920x1080 @ 60Hz
            </span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Primary audience display showing formatted lyric slides with motion background.
          </p>
          <div className="slide-actions">
            <button type="button" className="btn-secondary">
              Configure Target
            </button>
          </div>
        </article>

        <article className="slide-card">
          <div className="slide-card-header">
            <strong>Stage Foldback (Confidence)</strong>
            <span className="slide-badge">1920x1080 @ 60Hz</span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            High-contrast stage monitor for worship leaders, choir, and musicians with clock & next slide preview.
          </p>
          <div className="slide-actions">
            <button type="button" className="btn-secondary">
              Configure Target
            </button>
          </div>
        </article>
      </div>
    </div>
  );
};
