import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectLiveSlide,
  selectTransitionType,
  selectFadeDuration,
  selectActiveBackground,
  selectIsBlackout,
  selectIsTextCleared,
  selectIsLogoActive,
  takeSlideDirectlyLive,
  toggleBlackout,
  toggleClearText,
  toggleLogo,
  clearAllOverrides,
} from '../../store/features/presentation';
import {
  VideoIcon,
  YoutubeIcon,
  PresentationIcon,
  GoLiveIcon,
  RadioIcon,
  PlayIcon,
  HelpCircleIcon,
} from '../common/Icons';
import { ScaledRealityMonitor } from './ScaledRealityMonitor';
import { VideoControlDeck } from './VideoControlDeck';
import {
  extractYouTubeId,
  getSlideThumbnail,
  generateVideoThumbnail,
  getFileNameFromPath,
  isVideoFile,
} from '../../utils/videoHelpers';

interface LiveColumnProps {
  isProjectorActive: boolean;
  onToggleOnAir: () => void;
  outputDimensions: { width: number; height: number };
}

export const LiveColumn: React.FC<LiveColumnProps> = ({
  isProjectorActive,
  onToggleOnAir,
  outputDimensions,
}) => {
  const dispatch = useAppDispatch();
  const { slide: liveSlide, rundownItem: liveItem } = useAppSelector(selectLiveSlide);
  const transitionType = useAppSelector(selectTransitionType);
  const fadeDuration = useAppSelector(selectFadeDuration);
  const activeBackground = useAppSelector(selectActiveBackground);
  const isBlackout = useAppSelector(selectIsBlackout);
  const isTextCleared = useAppSelector(selectIsTextCleared);
  const isLogoActive = useAppSelector(selectIsLogoActive);

  const [brokenThumbs, setBrokenThumbs] = useState<Record<string, boolean>>({});
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  const handleLiveSlideClick = (slideId: string) => {
    if (!liveItem) return;
    if (isBlackout || isLogoActive) {
      dispatch(clearAllOverrides());
    }
    dispatch(takeSlideDirectlyLive({ rundownId: liveItem.id, slideId }));
  };

  const hasLiveVideo = Boolean(
    liveSlide &&
      (extractYouTubeId(liveSlide) ||
        liveSlide.videoType === 'local' ||
        liveSlide.videoUrl ||
        liveSlide.videoPath) &&
      liveSlide.videoType !== 'none'
  );

  return (
    <section className="live-column-card" aria-label="Live Program Column">
      {/* Column Header */}
      <div className="column-top-header live-header">
        <div className="console-section-heading">
          <span className={`console-section-index live-index ${isProjectorActive ? 'is-active-pulse' : ''}`}>
            LIVE
          </span>
          <div className="console-section-heading-copy">
            <h3 className="column-title" title={liveItem?.title || 'Standby (No Item Live)'}>
              {liveItem ? liveItem.title : 'Standby'}
            </h3>
          </div>
        </div>

        {/* Quick Broadcast Overrides & ON AIR */}
        <div className="live-controls-group">
          <div className="live-override-btns" role="group" aria-label="Broadcast overrides">
            <button
              type="button"
              className={`override-pill-btn is-logo ${isLogoActive ? 'is-active' : ''}`}
              onClick={() => dispatch(toggleLogo())}
              title="Toggle Church Logo (L or F3)"
              aria-keyshortcuts="L F3"
              aria-pressed={isLogoActive}
            >
              Logo
            </button>
            <button
              type="button"
              className={`override-pill-btn is-blackout ${isBlackout ? 'is-active' : ''}`}
              onClick={() => dispatch(toggleBlackout())}
              title="Toggle Black Screen (B or F1)"
              aria-keyshortcuts="B F1"
              aria-pressed={isBlackout}
            >
              Black
            </button>
            <button
              type="button"
              className={`override-pill-btn is-clear ${isTextCleared ? 'is-active' : ''}`}
              onClick={() => dispatch(toggleClearText())}
              title="Clear Lyrics / Background Only (C or F2)"
              aria-keyshortcuts="C F2"
              aria-pressed={isTextCleared}
            >
              Clear
            </button>
          </div>

          <button
            type="button"
            className={`master-onair-btn ${isProjectorActive ? 'is-live' : 'is-standby'}`}
            onClick={onToggleOnAir}
            title={
              isProjectorActive
                ? `Sanctuary output is ON AIR (${outputDimensions.width}×${outputDimensions.height}). Click or press F5 to take Off Air`
                : 'Take Sanctuary Output ON AIR (F5 or F6)'
            }
            aria-keyshortcuts="F5 F6"
            aria-pressed={isProjectorActive}
          >
            <span className={`onair-dot ${isProjectorActive ? 'is-pulsing' : ''}`} />
            <RadioIcon size={13} />
            <span>ON AIR</span>
          </button>
        </div>
      </div>

      {/* Middle: Scrollable Live Slide Deck */}
      <div className="column-slide-list live-slide-list">
        {!liveItem ? (
          <div className="deck-empty-state">
            <div className="deck-empty-icon is-live-empty">
              <GoLiveIcon size={24} />
            </div>
            <strong>Output on Standby</strong>
            <span>Cue an item in Preview and press <strong>Go Live</strong> (Enter).</span>
          </div>
        ) : (
          liveItem.slides.map((slide, index) => {
            const isLive = slide.id === liveSlide?.id;
            const isYouTube = Boolean(extractYouTubeId(slide));
            const hasVideo = Boolean(
              (isYouTube ||
                slide.videoType === 'local' ||
                slide.videoUrl ||
                slide.videoPath) &&
                slide.videoType !== 'none'
            );
            const hasMedia = Boolean(
              hasVideo ||
                (slide.imageUrl && !isVideoFile(slide.imageUrl)) ||
                slide.embedUrl
            );
            const videoTitleText =
              slide.videoTitle ||
              (isYouTube ? 'YouTube Stream' : slide.videoUrl || slide.videoPath ? 'Video Playback' : '');
            const slideThumb = getSlideThumbnail(slide);

            return (
              <div
                key={slide.id}
                className={`slide-item-card live-item-card ${isLive ? 'is-live is-active-live' : ''}`}
                onClick={() => handleLiveSlideClick(slide.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleLiveSlideClick(slide.id);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`${slide.section}, slide ${index + 1}${isLive ? ', currently live' : ''}`}
                title="Click this verse to present it LIVE immediately on screen"
              >
                <div className="slide-item-top">
                  <div className="slide-item-info">
                    <span className="slide-number">{index + 1}</span>
                    <span className="slide-section-label">
                      {hasVideo && (
                        <span
                          className={`slide-media-icon ${isYouTube ? 'is-youtube' : 'is-local'}`}
                          title={isYouTube ? 'YouTube Video' : 'Local Video'}
                        >
                          {isYouTube ? <YoutubeIcon size={12} /> : <VideoIcon size={12} />}
                        </span>
                      )}
                      <span>{slide.section}</span>
                    </span>
                  </div>

                  <div className="slide-item-status">
                    {isLive ? (
                      <span className="slide-status-tag tag-live">
                        <span className="live-indicator" />
                        LIVE NOW
                      </span>
                    ) : (
                      <span className="slide-status-hint">Click to Air</span>
                    )}
                  </div>
                </div>

                {hasVideo && (
                  <div className="slide-media-banner">
                    <div className="slide-media-copy">
                      <span className={`slide-media-kind ${isYouTube ? 'is-youtube' : 'is-local'}`}>
                        {isYouTube ? <YoutubeIcon size={11} /> : <VideoIcon size={11} />}
                        <span>{isYouTube ? 'YOUTUBE' : 'VIDEO'}</span>
                      </span>
                      <span
                        className="slide-media-title"
                        title={videoTitleText || slide.videoUrl || slide.youtubeUrl || ''}
                      >
                        {videoTitleText || (isYouTube ? 'YouTube Stream' : 'Local Video File')}
                      </span>
                    </div>
                  </div>
                )}

                {hasMedia && (slideThumb || hasVideo || slide.embedUrl) && (
                  <div className="slide-thumbnail-wrap">
                    <img
                      src={
                        !brokenThumbs[slide.id] && slideThumb
                          ? slideThumb
                          : generateVideoThumbnail(
                              slide.videoTitle ||
                                slide.section ||
                                getFileNameFromPath(slide.videoPath || slide.videoUrl || 'Video')
                            )
                      }
                      alt={slide.section || 'Slide Thumbnail'}
                      className="slide-thumbnail-img"
                      onError={() => setBrokenThumbs((prev) => ({ ...prev, [slide.id]: true }))}
                    />
                    {hasVideo && (
                      <div className="slide-thumbnail-overlay">
                        <div className={`slide-thumbnail-play ${isYouTube ? 'is-youtube' : ''}`}>
                          {isYouTube ? <YoutubeIcon size={13} /> : <PlayIcon size={11} />}
                        </div>
                      </div>
                    )}
                    {slide.embedUrl && <div className="slide-embed-badge">Live Deck</div>}
                  </div>
                )}

                {slide.lines && slide.lines.length > 0 && (
                  <div className={`slide-content-preview ${!hasMedia ? 'is-text-slide' : ''}`}>
                    {slide.lines.map((line, lineIndex) => (
                      <p key={lineIndex} className="slide-line">
                        {line}
                      </p>
                    ))}
                  </div>
                )}

                {(!slide.lines || slide.lines.length === 0) && !slide.imageUrl && !hasVideo && (
                  <div className="slide-empty-content">Empty slide content</div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Dock: Sanctuary Live Reality Monitor & Video Controls */}
      <div className="column-bottom-dock live-bottom-dock">
        <div className="column-monitor-container live-monitor-container">
          <div className="monitor-subheading">
            <span className="monitor-subheading-tag live-tag">
              <span className={`live-pulse-dot ${isProjectorActive ? 'is-pulsing' : ''}`} />
              SANCTUARY LIVE
            </span>
            <div className="monitor-subheading-actions">
              <span
                className={`resolution-badge ${isProjectorActive ? 'is-active' : ''}`}
                title="Output Resolution"
              >
                {outputDimensions.width}×{outputDimensions.height}
              </span>
              <button
                type="button"
                className="shortcut-help-trigger"
                onClick={() => setShowShortcutsModal(true)}
                title="View Keyboard Shortcuts & Clicker Guide"
                aria-label="View Keyboard Shortcuts"
              >
                <HelpCircleIcon size={13} />
              </button>
            </div>
          </div>

          <div className="monitor-frame-box">
            <ScaledRealityMonitor
              slide={liveSlide}
              backgroundGradient={activeBackground.gradient}
              isBlackout={isBlackout}
              isTextCleared={isTextCleared}
              isLogoActive={isLogoActive}
              transitionType={transitionType}
              fadeDuration={fadeDuration}
              emptyLabel="No Live Output"
              isLive={true}
              outputDimensions={outputDimensions}
            />
          </div>

          {hasLiveVideo && (
            <div className="live-video-dock">
              <VideoControlDeck slide={liveSlide} isLive={true} />
            </div>
          )}
        </div>
      </div>

      {/* Shortcuts modal dialog */}
      {showShortcutsModal && (
        <div className="modal-overlay" onClick={() => setShowShortcutsModal(false)}>
          <div className="shortcuts-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="shortcuts-modal-header">
              <h4>Keyboard & Clicker Shortcuts</h4>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowShortcutsModal(false)}
              >
                ×
              </button>
            </div>
            <div className="shortcuts-modal-grid">
              <div><kbd>Enter / F4</kbd><span>Go Live (take preview to live)</span></div>
              <div><kbd>Space / Down / PgDn</kbd><span>Next slide on screen</span></div>
              <div><kbd>Up / PgUp</kbd><span>Previous slide</span></div>
              <div><kbd>Home / End</kbd><span>First / Last slide of song</span></div>
              <div><kbd>F5 / F6</kbd><span>Toggle Sanctuary ON AIR output</span></div>
              <div><kbd>1 / 2</kbd><span>Cut / Fade transition</span></div>
              <div><kbd>F</kbd><span>Cycle fade time (0.5s - 2.0s)</span></div>
              <div><kbd>B / F1</kbd><span>Blackout screen</span></div>
              <div><kbd>C / F2</kbd><span>Clear text (show background)</span></div>
              <div><kbd>L / F3</kbd><span>Show Church Logo</span></div>
              <div><kbd>M</kbd><span>Mute / Unmute video</span></div>
              <div><kbd>[ / ]</kbd><span>Previous / Next Schedule item</span></div>
              <div><kbd>Esc</kbd><span>Clear active overrides</span></div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
