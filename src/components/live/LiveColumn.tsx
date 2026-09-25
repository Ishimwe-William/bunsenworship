import React, { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectLiveSlide,
  selectPreviewSlideId,
  selectSelectedRundownId,
  selectTransitionType,
  selectFadeDuration,
  selectActiveBackground,
  selectIsBlackout,
  selectIsTextCleared,
  selectIsLogoActive,
  setPreviewSlide,
  takeSlideDirectlyLive,
  takeLive,
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
  MusicIcon,
  LayersIcon,
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
  outputDimensions: { width: number; height: number };
  monitorHeight: number;
  onStartResizeMonitor: (e: React.MouseEvent) => void;
  onResetMonitorHeight: () => void;
  isResizingMonitor?: boolean;
}

export const LiveColumn: React.FC<LiveColumnProps> = ({
  isProjectorActive,
  outputDimensions,
  monitorHeight,
  onStartResizeMonitor,
  onResetMonitorHeight,
  isResizingMonitor = false,
}) => {
  const dispatch = useAppDispatch();
  const { slide: liveSlide, rundownItem: liveItem } = useAppSelector(selectLiveSlide);
  const previewSlideId = useAppSelector(selectPreviewSlideId);
  const selectedRundownId = useAppSelector(selectSelectedRundownId);
  const transitionType = useAppSelector(selectTransitionType);
  const fadeDuration = useAppSelector(selectFadeDuration);
  const activeBackground = useAppSelector(selectActiveBackground);
  const isBlackout = useAppSelector(selectIsBlackout);
  const isTextCleared = useAppSelector(selectIsTextCleared);
  const isLogoActive = useAppSelector(selectIsLogoActive);

  const [brokenThumbs, setBrokenThumbs] = useState<Record<string, boolean>>({});
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const liveSlideListRef = useRef<HTMLDivElement>(null);

  // When moving to a different show, reset live slide list scroll to top
  useEffect(() => {
    if (liveSlideListRef.current) {
      liveSlideListRef.current.scrollTop = 0;
    }
  }, [liveItem?.id]);

  // When on top live slide, ensure view is scrolled to top
  useEffect(() => {
    if (liveSlide && liveItem && liveItem.slides[0]?.id === liveSlide.id) {
      if (liveSlideListRef.current) {
        liveSlideListRef.current.scrollTop = 0;
      }
    }
  }, [liveSlide?.id]);

  const lastLiveClickRef = useRef<{ slideId: string; time: number }>({ slideId: '', time: 0 });
  const lastLiveDoubleDispatchedRef = useRef<{ slideId: string; time: number }>({ slideId: '', time: 0 });

  // Double-clicking cues it in preview and takes it directly live
  const handleLiveSlideDoubleClick = (slideId: string) => {
    if (!liveItem) return;
    const now = Date.now();
    if (
      lastLiveDoubleDispatchedRef.current.slideId === slideId &&
      now - lastLiveDoubleDispatchedRef.current.time < 350
    ) {
      return;
    }
    lastLiveDoubleDispatchedRef.current = { slideId, time: now };
    dispatch(clearAllOverrides());
    dispatch(takeSlideDirectlyLive({ rundownId: liveItem.id, slideId }));
  };

  // Single-clicking any slide cues it into the Preview Section first
  const handleLiveSlideClick = (slideId: string) => {
    if (!liveItem) return;
    const now = Date.now();
    if (lastLiveClickRef.current.slideId === slideId && now - lastLiveClickRef.current.time < 350) {
      lastLiveClickRef.current = { slideId: '', time: 0 };
      handleLiveSlideDoubleClick(slideId);
      return;
    }
    lastLiveClickRef.current = { slideId, time: now };
    dispatch(setPreviewSlide({ rundownId: liveItem.id, slideId }));
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
      {/* Column Header: Clean title, type badge, count, and shortcuts guide */}
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

        <div className="column-header-actions">
          {liveItem && (
            <>
              <span className="deck-type-badge">
                {liveItem.type === 'SONG' ? (
                  <MusicIcon size={12} />
                ) : liveItem.type === 'VIDEO' ? (
                  <VideoIcon size={12} />
                ) : liveItem.type === 'PPT' || liveItem.type === 'CANVA' ? (
                  <PresentationIcon size={12} />
                ) : (
                  <LayersIcon size={12} />
                )}
                <span className="deck-type-label">{liveItem.type}</span>
              </span>
              <span className="deck-slide-count" title={`${liveItem.slides.length} slides`}>
                <LayersIcon size={12} /> {liveItem.slides.length}
              </span>
            </>
          )}
          <button
            type="button"
            className="shortcut-help-trigger"
            onClick={() => setShowShortcutsModal(true)}
            title="Keyboard Shortcuts & Clicker Guide"
            aria-label="View Keyboard Shortcuts"
          >
            <HelpCircleIcon size={14} />
          </button>
        </div>
      </div>

      {/* Middle: Scrollable Live Slide Deck */}
      <div ref={liveSlideListRef} className="column-slide-list live-slide-list">
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
            const isCuedInPreview = previewSlideId === slide.id && selectedRundownId === liveItem.id;
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
                className={`slide-item-card live-item-card ${isLive ? 'is-live is-active-live' : ''} ${
                  isCuedInPreview && !isLive ? 'is-preview' : ''
                }`}
                onClick={() => handleLiveSlideClick(slide.id)}
                onDoubleClick={() => handleLiveSlideDoubleClick(slide.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLiveSlideClick(slide.id);
                  } else if (e.key === ' ') {
                    e.preventDefault();
                    handleLiveSlideDoubleClick(slide.id);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`${slide.section}, slide ${index + 1}${
                  isLive ? ', currently live' : isCuedInPreview ? ', cued in preview' : ''
                }`}
                title="Click to Cue in Preview • Double-click or press Enter to Go Live"
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
                    ) : isCuedInPreview ? (
                      <span className="slide-status-tag tag-cued-preview">
                        CUED IN PREVIEW
                      </span>
                    ) : (
                      <span className="slide-status-hint">Click to Preview</span>
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

      {/* Horizontal Resizer between Slide List and Live Monitor Dock */}
      <div
        className={`horizontal-monitor-resizer ${isResizingMonitor ? 'is-active' : ''}`}
        onMouseDown={onStartResizeMonitor}
        onDoubleClick={onResetMonitorHeight}
        title="Drag up/down to resize Sanctuary Live Monitor • Double-click to reset"
        role="separator"
        tabIndex={0}
        aria-label="Resize Sanctuary Live Monitor Height"
        aria-orientation="horizontal"
      >
        <div className="horizontal-resizer-grip" />
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
            </div>
          </div>

          <div className="monitor-frame-box" style={{ height: `${monitorHeight}px` }}>
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
              <div><kbd>Enter / F4</kbd><span>Go Live (take preview slide to sanctuary output)</span></div>
              <div><kbd>Space / PgDn</kbd><span>Presenter Clicker: Take preview live & cue next slide</span></div>
              <div><kbd>Down / Up</kbd><span>Operator: Cue next / previous slide in Preview only</span></div>
              <div><kbd>PgUp</kbd><span>Presenter Clicker: Previous slide</span></div>
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
