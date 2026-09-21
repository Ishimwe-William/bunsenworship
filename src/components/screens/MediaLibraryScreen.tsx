import React from 'react';

export const MediaLibraryScreen: React.FC = () => {
  return (
    <div className="screen-content">
      <div className="screen-header">
        <div>
          <h2 className="screen-title">Media Library</h2>
          <p className="screen-description">
            Manage motion backgrounds, song arrangements, scripture passages, and video assets.
          </p>
        </div>
        <button type="button" className="btn-primary">
          + Import Media
        </button>
      </div>

      <div className="media-categories-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="status-item" style={{ cursor: 'pointer' }}>
          <div className="status-label">Worship Songs</div>
          <div className="status-value">128 Tracks</div>
        </div>
        <div className="status-item" style={{ cursor: 'pointer' }}>
          <div className="status-label">Motion Loops</div>
          <div className="status-value">45 Videos</div>
        </div>
        <div className="status-item" style={{ cursor: 'pointer' }}>
          <div className="status-label">Scripture Versions</div>
          <div className="status-value">6 Translations</div>
        </div>
        <div className="status-item" style={{ cursor: 'pointer' }}>
          <div className="status-label">Stills & Graphics</div>
          <div className="status-value">84 Images</div>
        </div>
      </div>
    </div>
  );
};
