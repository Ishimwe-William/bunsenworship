import React from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  clearAllOverrides,
  selectIsBlackout,
  selectIsLive,
  selectIsLogoActive,
  selectIsTextCleared,
} from '../../store/features/presentation';
import { useLanguage } from '../language';
import { BlackoutIcon, ClearTextIcon, LogoDisplayIcon } from '../common/Icons';
import { BunsenWorshipLogo } from '../sidebar/NavIcons';

export const LiveShowScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const isLive = useAppSelector(selectIsLive);
  const isBlackout = useAppSelector(selectIsBlackout);
  const isTextCleared = useAppSelector(selectIsTextCleared);
  const isLogoActive = useAppSelector(selectIsLogoActive);
  const { language, t } = useLanguage();

  return (
    <div className="screen-content">
      <div className="screen-header">
        <div className="screen-header-brand-group">
          <div className="screen-header-logo-badge">
            <BunsenWorshipLogo size={48} />
          </div>
          <div>
            <h2 className="screen-title">{t.liveShow.title}</h2>
            <p className="screen-description">{t.liveShow.description}</p>
          </div>
        </div>
      </div>

      {/* Active Override Notification Banner */}
      {(isBlackout || isTextCleared || isLogoActive) && (
        <div
          className={`broadcast-override-banner ${
            isBlackout ? 'blackout' : isLogoActive ? 'logo-active' : 'clear-text'
          }`}
        >
          <div className="broadcast-override-info">
            {isBlackout && <BlackoutIcon size={18} />}
            {isLogoActive && !isBlackout && <LogoDisplayIcon size={18} />}
            {isTextCleared && !isBlackout && !isLogoActive && <ClearTextIcon size={18} />}
            <span>
              {isBlackout
                ? language === 'rw'
                  ? 'Ekrani yose irabura kuri ubu ku byerekanirwaho byose (Kanda F1 cyangwa Umukara hejuru ngo ukomeze).'
                  : 'Blackout is active on all audience outputs (Click Black in header or press F1 to resume).'
                : isLogoActive
                ? language === 'rw'
                  ? 'Ikimenyetso cy’itorero kiri kwerekanwa ku byerekanirwaho (Kanda F3 cyangwa Ikimenyetso hejuru).'
                  : 'Church logo is currently displayed on all projection screens (Click Logo in header or press F3).'
                : language === 'rw'
                ? 'Amagambo yakuweho, amavidewo niyo ari kugaragara gusa (Kanda F2 cyangwa Kuraho hejuru).'
                : 'Lyric text is cleared, video loop background only (Click Clear in header or press F2).'}
            </span>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => dispatch(clearAllOverrides())}
            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
          >
            {language === 'rw' ? 'Subiza Bisanzwe' : 'Resume Normal'}
          </button>
        </div>
      )}

      <div className="slide-cards-grid">
        <article className="slide-card">
          <div className="slide-card-header">
            <strong>Slide 1 &bull; {t.liveShow.verse} 1</strong>
            <span
              className="slide-badge"
              style={{
                backgroundColor: isLive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(148, 163, 184, 0.15)',
                color: isLive ? 'var(--color-success)' : 'var(--text-muted)',
              }}
            >
              {isLive ? t.common.live : t.common.standby}
            </span>
          </div>
          <p className="slide-lyrics">
            {language === 'rw' ? (
              <>
                &ldquo;Ni wowe niringiye Mwami, nta wundi mfite mu ijuru,<br />
                Gukomera kwawe n&apos;imbabazi zawe zihoraho iteka ryose...&rdquo;
              </>
            ) : (
              <>
                &ldquo;Great is Thy faithfulness, O God my Father,<br />
                There is no shadow of turning with Thee...&rdquo;
              </>
            )}
          </p>
          <div className="slide-actions">
            <button type="button" className="btn-secondary">
              {t.common.edit}
            </button>
            <button type="button" className="btn-primary">
              {t.liveShow.nextSlide} &rarr;
            </button>
          </div>
        </article>

        <article className="slide-card">
          <div className="slide-card-header">
            <strong>Slide 2 &bull; {t.liveShow.chorus}</strong>
            <span className="slide-badge">{t.common.standby}</span>
          </div>
          <p className="slide-lyrics">
            {language === 'rw' ? (
              <>
                &ldquo;Guhimbaza n&apos;ishimwe bibe ibyawe Nyagasani Yesu,<br />
                Muri byose wamaze gutsinda, uri Umwami w&apos;abami!&rdquo;
              </>
            ) : (
              <>
                &ldquo;Great is Thy faithfulness! Great is Thy faithfulness!<br />
                Morning by morning new mercies I see...&rdquo;
              </>
            )}
          </p>
          <div className="slide-actions">
            <button type="button" className="btn-secondary">
              {t.common.edit}
            </button>
            <button type="button" className="btn-primary">
              {t.liveShow.takeLive}
            </button>
          </div>
        </article>

        <article className="slide-card">
          <div className="slide-card-header">
            <strong>Slide 3 &bull; {t.liveShow.verse} 2</strong>
            <span className="slide-badge">{t.common.standby}</span>
          </div>
          <p className="slide-lyrics">
            {language === 'rw' ? (
              <>
                &ldquo;Ubutsinzi bwawe bwatugejeje ku buzima bushya,<br />
                Nzakwamamaza mu mahanga yose igihe nkihumeka...&rdquo;
              </>
            ) : (
              <>
                &ldquo;Summer and winter, and springtime and harvest,<br />
                Sun, moon and stars in their courses above...&rdquo;
              </>
            )}
          </p>
          <div className="slide-actions">
            <button type="button" className="btn-secondary">
              {t.common.edit}
            </button>
            <button type="button" className="btn-primary">
              {t.liveShow.takeLive}
            </button>
          </div>
        </article>
      </div>
    </div>
  );
};
