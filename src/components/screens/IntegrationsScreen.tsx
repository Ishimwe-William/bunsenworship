import React from 'react';

export const IntegrationsScreen: React.FC = () => {
  return (
    <div className="screen-content">
      <div className="screen-header">
        <div>
          <h2 className="screen-title">Integrations & Protocols</h2>
          <p className="screen-description">
            Connect hardware switchers, MIDI pedals, CCLI SongSelect, and streaming software.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="status-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>MIDI Controller</strong>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              USB Foot Pedal or Keyboard for hands-free slide triggering
            </p>
          </div>
          <span className="status-pill" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: 'var(--color-success)' }}>
            Connected
          </span>
        </div>

        <div className="status-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>CCLI SongSelect</strong>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Direct lyrics download and copyright reporting sync
            </p>
          </div>
          <button type="button" className="btn-secondary">
            Connect Account
          </button>
        </div>

        <div className="status-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>OBS / NDI Network Output</strong>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Broadcast transparent lower thirds directly to your livestream encoder
            </p>
          </div>
          <span className="status-pill">Ready</span>
        </div>
      </div>
    </div>
  );
};
