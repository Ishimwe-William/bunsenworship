import React from 'react';
import { useLanguage } from '../language';

export const LiveShowScreen: React.FC = () => {
  const { language, t } = useLanguage();

  return (
    <div className="screen-content">
      <div className="screen-header">
        <div>
          <h2 className="screen-title">{t.liveShow.title}</h2>
          <p className="screen-description">{t.liveShow.description}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" className="btn-secondary">
            {t.liveShow.blackScreen}
          </button>
          <button type="button" className="btn-secondary">
            {t.liveShow.clearText}
          </button>
          <button type="button" className="btn-primary">
            {t.liveShow.logo}
          </button>
        </div>
      </div>

      <div className="slide-cards-grid">
        <article className="slide-card">
          <div className="slide-card-header">
            <strong>Slide 1 &bull; {t.liveShow.verse} 1</strong>
            <span
              className="slide-badge"
              style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', color: 'var(--color-success)' }}
            >
              {t.common.live}
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
