import React from 'react';
import { BunsenWorshipLogo } from '../sidebar/NavIcons';
import { useLanguage } from '../language';
import { useTheme } from '../theme';

export const AuthHero: React.FC = () => {
  const { language, t } = useLanguage();
  const { isDark } = useTheme();

  return (
    <div className={`auth-hero-panel ${isDark ? 'dark' : 'light'}`}>
      {/* Background Stage Light Atmosphere */}
      <div className="auth-hero-backdrop">
        <svg
          className="auth-hero-stage-svg"
          viewBox="0 0 600 800"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <radialGradient id="beam1" cx="0.3" cy="0" r="0.9">
              <stop offset="0%" stopColor={isDark ? '#6366f1' : '#818cf8'} stopOpacity={isDark ? 0.5 : 0.35} />
              <stop offset="55%" stopColor="#3b82f6" stopOpacity={isDark ? 0.18 : 0.12} />
              <stop offset="100%" stopColor={isDark ? '#090d16' : '#e2e8f0'} stopOpacity="0" />
            </radialGradient>
            <radialGradient id="beam2" cx="0.8" cy="0.1" r="0.8">
              <stop offset="0%" stopColor={isDark ? '#06b6d4' : '#0284c7'} stopOpacity={isDark ? 0.4 : 0.28} />
              <stop offset="60%" stopColor="#3b82f6" stopOpacity={isDark ? 0.12 : 0.08} />
              <stop offset="100%" stopColor={isDark ? '#090d16' : '#e2e8f0'} stopOpacity="0" />
            </radialGradient>
            <radialGradient id="glowCenter" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor={isDark ? '#4f46e5' : '#818cf8'} stopOpacity={isDark ? 0.2 : 0.15} />
              <stop offset="100%" stopColor={isDark ? '#090d16' : '#e2e8f0'} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Atmospheric Beams */}
          <ellipse cx="180" cy="80" rx="320" ry="460" fill="url(#beam1)" />
          <ellipse cx="460" cy="100" rx="280" ry="420" fill="url(#beam2)" />
          <circle cx="300" cy="400" r="220" fill="url(#glowCenter)" />
        </svg>
      </div>

      {/* Hero Foreground Content */}
      <div className="auth-hero-content">
        {/* Dominant Hero Brand Showcase */}
        <div className="auth-hero-dominant-brand">
          <div className="dominant-logo-frame">
            <div className="dominant-logo-glow" />
            <BunsenWorshipLogo size={96} className="dominant-logo-icon" />
          </div>
          <div className="dominant-brand-details">
            <h1 className="dominant-brand-title">
              Bunsen<span>Worship</span>
            </h1>
            <div className="dominant-badge-strip">
              <span className="dominant-pro-badge">{t.common.consoleSubtitle}</span>
              <span className="dominant-dot-separator">&bull;</span>
              <span className="dominant-version-tag">PRO PRESENTER v1.0.0</span>
            </div>
            <p className="dominant-brand-lead">
              {language === 'rw'
                ? "Sisitemu y'inzobere yo kwerekana indirimbo, amashusho na Bibiliya muri gahunda zo kuramya."
                : 'Advanced multi-screen worship presentation and live broadcast control platform.'}
            </p>
          </div>
        </div>

        {/* Realistic Live Screen Projection Card with Subtle Logo Watermark */}
        <div className="auth-hero-screen-card">
          <div className="screen-card-topbar">
            {/* Prominent & Clearly Visible Output Target Badge */}
            <div className="output-target-badge">
              <span className="live-dot" />
              <span className="output-target-text">OUTPUT 1: 4K AUDIENCE SANCTUARY</span>
            </div>
            <span className="screen-card-tag">{t.common.onAir} &bull; 60 FPS</span>
          </div>

          <div className="screen-card-body">
            <div className="screen-card-watermark" aria-hidden="true">
              <BunsenWorshipLogo size={88} />
            </div>
            <span className="screen-card-song-title">
              {language === 'rw' ? 'INDIRIMBO YA 124' : 'AMAZING GRACE'}
            </span>
            <p className="screen-card-lyrics">
              {language === 'rw' ? (
                <>
                  &ldquo;Ubuntu bw&apos;Imana buratangaje cyane,<br />
                  Bwancunguye ubwo nari mu mwijima;<br />
                  Nari impumyi none ubu ndareba...&rdquo;
                </>
              ) : (
                <>
                  &ldquo;My chains are gone, I&apos;ve been set free<br />
                  My God, my Savior has ransomed me<br />
                  And like a flood His mercy reigns...&rdquo;
                </>
              )}
            </p>
          </div>

          <div className="screen-card-footer">
            <span className="pill-badge">Audience Main 4K</span>
            <span className="pill-badge">Stage Foldback</span>
            <span className="pill-badge">OBS NDI Stream</span>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="auth-hero-footer-text">
          <div className="hero-feature-pills">
            <span className="hero-feature-item">&bull; Zero-Lag Projection</span>
            <span className="hero-feature-item">&bull; Multi-Screen Overrides</span>
            <span className="hero-feature-item">&bull; Dual Language Support</span>
          </div>
        </div>
      </div>
    </div>
  );
};
