import React from 'react';
import { ThemeToggle, useTheme } from '../theme';
import { LanguageToggle, useLanguage } from '../language';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout, selectAuthUser } from '../../store/features/auth';
import { LogoutIcon, GlobeAltIcon, SunIcon, MoonIcon, LaptopIcon } from '../common/Icons';
import { BunsenWorshipLogo } from '../sidebar/NavIcons';

export const SettingsScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const { mode, effectiveTheme, systemPreference, isDark } = useTheme();
  const { language, t } = useLanguage();

  return (
    <div className="screen-content">
      <div className="screen-header">
        <div>
          <h2 className="screen-title">{t.settings.title}</h2>
          <p className="screen-description">{t.settings.description}</p>
        </div>
      </div>

      {/* User Account Card */}
      {user && (
        <section className="theme-status-card">
          <div className="status-card-header">
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Console Operator Account</h3>
              <p className="section-description">
                Active logged-in session credentials and ministry affiliation
              </p>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => dispatch(logout())}
              style={{
                color: 'var(--color-danger)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <LogoutIcon size={15} />
              <span>{t.auth.signOut}</span>
            </button>
          </div>

          <div className="status-grid">
            <div className="status-item">
              <div className="status-label">User Name</div>
              <div className="status-value">{user.name}</div>
            </div>

            <div className="status-item">
              <div className="status-label">Email Address</div>
              <div className="status-value" style={{ fontSize: '0.9375rem' }}>{user.email}</div>
            </div>

            <div className="status-item">
              <div className="status-label">Ministry / Church</div>
              <div className="status-value" style={{ fontSize: '0.9375rem' }}>
                {user.churchName || 'Bunsen Sanctuary'}
              </div>
            </div>

            <div className="status-item">
              <div className="status-label">Auth Provider</div>
              <div className="status-value">
                <span className="status-pill">
                  {user.authProvider === 'google' ? 'Google Account' : 'Standard Email'}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Language Settings Panel */}
      <section className="theme-status-card">
        <div className="status-card-header">
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>
              {t.settings.languageSectionTitle}
            </h3>
            <p className="section-description">{t.settings.languageSectionDesc}</p>
          </div>
          <LanguageToggle variant="segmented" />
        </div>

        <div className="status-grid">
          <div className="status-item">
            <div className="status-label">Active Language</div>
            <div className="status-value">
              <span className="status-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <GlobeAltIcon size={14} />
                <span>{language === 'en' ? 'English (EN)' : 'Ikinyarwanda (RW)'}</span>
              </span>
            </div>
          </div>

          <div className="status-item">
            <div className="status-label">Language Code</div>
            <div className="status-value">
              <code>{language.toUpperCase()}</code>
            </div>
          </div>

          <div className="status-item">
            <div className="status-label">HTML document.lang</div>
            <div className="status-value">
              <code>{language}</code>
            </div>
          </div>

          <div className="status-item">
            <div className="status-label">Regional Target</div>
            <div className="status-value">
              <span>{language === 'rw' ? 'Rwanda (Kigali)' : 'Global / English'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Theme Settings Panel */}
      <section className="theme-status-card">
        <div className="status-card-header">
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{t.theme.title}</h3>
            <p className="section-description">{t.theme.description}</p>
          </div>
          <ThemeToggle variant="segmented" />
        </div>

        <div className="status-grid">
          <div className="status-item">
            <div className="status-label">{t.theme.configuredMode}</div>
            <div className="status-value">
              <span className="status-pill">{mode.toUpperCase()}</span>
            </div>
          </div>

          <div className="status-item">
            <div className="status-label">{t.theme.effectiveTheme}</div>
            <div className="status-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {effectiveTheme === 'dark' ? <MoonIcon size={16} /> : <SunIcon size={16} />}
              <span>{effectiveTheme === 'dark' ? t.theme.dark : t.theme.light}</span>
            </div>
          </div>

          <div className="status-item">
            <div className="status-label">{t.theme.osDetected}</div>
            <div className="status-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <LaptopIcon size={16} />
              <span>{systemPreference === 'dark' ? t.theme.dark : t.theme.light}</span>
            </div>
          </div>

          <div className="status-item">
            <div className="status-label">{t.theme.darkModeActive}</div>
            <div className="status-value">
              <code>{isDark ? 'true' : 'false'}</code>
            </div>
          </div>
        </div>
      </section>

      {/* Console Preferences */}
      <section className="theme-status-card">
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          {t.settings.performanceTitle}
        </h3>
        <p className="section-description" style={{ marginBottom: '1.25rem' }}>
          {t.settings.performanceDesc}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <input type="checkbox" defaultChecked />
            <span>{t.settings.gpuAcceleration}</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <input type="checkbox" defaultChecked />
            <span>{t.settings.smoothTransitions}</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <input type="checkbox" />
            <span>{t.settings.autoBlank}</span>
          </label>
        </div>
      </section>

      {/* About Application & Icon Branding */}
      <section className="theme-status-card" style={{ marginTop: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <BunsenWorshipLogo size={52} />
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{t.common.appName}</h3>
            <p className="section-description" style={{ margin: '2px 0 0 0' }}>
              Version 1.0.1 &bull; {language === 'rw' ? 'Porogaramu yo Kwerekana Indirimbo muri Gahunda zo Kuramya' : 'Professional Live Worship Presentation Platform'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
