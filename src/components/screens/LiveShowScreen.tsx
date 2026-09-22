import React from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  clearAllOverrides,
  selectIsBlackout,
  selectIsLogoActive,
  selectIsTextCleared,
} from '../../store/features/presentation';
import { useLanguage } from '../language';
import { BlackoutIcon, ClearTextIcon, LogoDisplayIcon } from '../common/Icons';
import { ServiceRundown, SlideDeck, ProgramPreviewMonitor } from '../live';
import '../live/LiveConsole.css';

export const LiveShowScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const isBlackout = useAppSelector(selectIsBlackout);
  const isTextCleared = useAppSelector(selectIsTextCleared);
  const isLogoActive = useAppSelector(selectIsLogoActive);
  const { language } = useLanguage();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        height: '100%',
        flex: 1,
        minHeight: 0,
      }}
    >
      {/* Active Global Override Banner */}
      {(isBlackout || isTextCleared || isLogoActive) && (
        <div
          className={`broadcast-override-banner ${
            isBlackout ? 'blackout' : isLogoActive ? 'logo-active' : 'clear-text'
          }`}
          style={{ margin: 0 }}
        >
          <div className="broadcast-override-info">
            {isBlackout && <BlackoutIcon size={18} />}
            {isLogoActive && !isBlackout && <LogoDisplayIcon size={18} />}
            {isTextCleared && !isBlackout && !isLogoActive && <ClearTextIcon size={18} />}
            <span>
              {isBlackout
                ? language === 'rw'
                  ? 'Ekrani yose irabura kuri ubu ku byerekanirwaho byose (Kanda F1 cyangwa Umukara hejuru).'
                  : 'Blackout is active on sanctuary outputs (Press F1 or Black in topbar to resume).'
                : isLogoActive
                ? language === 'rw'
                  ? 'Ikimenyetso cy’itorero kiri kwerekanwa (Kanda F3 cyangwa Ikimenyetso hejuru).'
                  : 'Church emblem is currently projected on all screens (Press F3 or Logo in topbar).'
                : language === 'rw'
                ? 'Amagambo yakuweho, amashusho gusa niyo ari kugaragara (Kanda F2 hejuru).'
                : 'Lyrics cleared, ambient motion background only (Press F2 or Clear in topbar).'}
            </span>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => dispatch(clearAllOverrides())}
            style={{ padding: '3px 10px', fontSize: '0.75rem' }}
          >
            {language === 'rw' ? 'Subiza Bisanzwe' : 'Resume Presentation'}
          </button>
        </div>
      )}

      {/* 3-Column Professional Live Presentation Console */}
      <div className="live-console-container">
        {/* Column 1: Service Rundown Playlist */}
        <ServiceRundown />

        {/* Column 2: Selected Item Slide Deck */}
        <SlideDeck />

        {/* Column 3: Live Program, Next Preview, Transitions & Action Controls */}
        <ProgramPreviewMonitor />
      </div>
    </div>
  );
};
