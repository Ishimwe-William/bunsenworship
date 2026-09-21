import React from 'react';

export const RemotesScreen: React.FC = () => {
  return (
    <div className="screen-content">
      <div className="screen-header">
        <div>
          <h2 className="screen-title">Remote Control & Mobile Access</h2>
          <p className="screen-description">
            Allow worship leaders, pastors, or tech staff to control presentations wirelessly from phone, tablet, or web browser.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        <article className="slide-card">
          <div className="slide-card-header">
            <strong>Local Wi-Fi Remote Server</strong>
            <span className="slide-badge" style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', color: 'var(--color-success)' }}>
              Port 8080 Active
            </span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Open <code>http://192.168.1.120:8080</code> on your mobile device to control slides.
          </p>
          <div className="slide-actions">
            <button type="button" className="btn-secondary">
              Show QR Code
            </button>
            <button type="button" className="btn-primary">
              Manage Permissions
            </button>
          </div>
        </article>
      </div>
    </div>
  );
};
