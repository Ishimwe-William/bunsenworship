import React, { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectCurrentRundownItem,
  selectPreviewSlideId,
  selectLiveSlideId,
  selectLiveRundownId,
  selectPreviewSlide,
  selectTransitionType,
  selectFadeDuration,
  selectActiveBackground,
  selectBackgroundThemes,
  selectIsBlackout,
  selectIsLogoActive,
  clearAllOverrides,
  setPreviewSlide,
  takeSlideDirectlyLive,
  takeLive,
  setTransitionType,
  setFadeDuration,
  setActiveBackground,
  reorderSlides,
  addSlide,
  deleteSlide,
  relinkSlideVideo,
} from '../../store/features/presentation';
import {
  PencilIcon,
  GripVerticalIcon,
  PlusIcon,
  TrashIcon,
  VideoIcon,
  YoutubeIcon,
  PresentationIcon,
  MusicIcon,
  LayersIcon,
  SlidersIcon,
  PlayIcon,
} from '../common/Icons';
import { QuickEditModal } from './QuickEditModal';
import { ScaledRealityMonitor } from './ScaledRealityMonitor';
import { createNewSlide } from '../../utils/liveShowHelpers';
import {
  isBareFilename,
  generateVideoThumbnail,
  getFileNameFromPath,
  extractYouTubeId,
  getSlideThumbnail,
  isVideoFile,
} from '../../utils/videoHelpers';

interface PreviewColumnProps {
  outputDimensions?: { width: number; height: number };
  monitorHeight: number;
  onStartResizeMonitor: (e: React.MouseEvent) => void;
  onResetMonitorHeight: () => void;
  isResizingMonitor?: boolean;
}

export const PreviewColumn: React.FC<PreviewColumnProps> = ({
  outputDimensions,
  monitorHeight,
  onStartResizeMonitor,
  onResetMonitorHeight,
  isResizingMonitor = false,
}) => {
  const dispatch = useAppDispatch();
  const currentItem = useAppSelector(selectCurrentRundownItem);
  const previewSlideId = useAppSelector(selectPreviewSlideId);
  const previewSlide = useAppSelector(selectPreviewSlide);
  const liveSlideId = useAppSelector(selectLiveSlideId);
  const liveRundownId = useAppSelector(selectLiveRundownId);
  const transitionType = useAppSelector(selectTransitionType);
  const fadeDuration = useAppSelector(selectFadeDuration);
  const activeBackground = useAppSelector(selectActiveBackground);
  const backgroundThemes = useAppSelector(selectBackgroundThemes);
  const isBlackout = useAppSelector(selectIsBlackout);
  const isLogoActive = useAppSelector(selectIsLogoActive);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showAddSlide, setShowAddSlide] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [brokenThumbs, setBrokenThumbs] = useState<Record<string, boolean>>({});
  const slideRelinkInputRef = useRef<HTMLInputElement>(null);
  const pendingRelinkSlideIdRef = useRef<string | null>(null);

  // Drag and drop state for slides
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<'above' | 'below' | null>(null);

  const handleRelinkSlide = async (slideId: string) => {
    if (!currentItem) return;
    if (window.electronAPI?.openVideoDialog) {
      try {
        const chosen = await window.electronAPI.openVideoDialog();
        if (chosen) {
          dispatch(
            relinkSlideVideo({
              rundownId: currentItem.id,
              slideId,
              filePath: chosen,
            })
          );
        }
      } catch (err) {
        console.error('Failed to relink slide video:', err);
      }
    } else {
      pendingRelinkSlideIdRef.current = slideId;
      slideRelinkInputRef.current?.click();
    }
  };

  // Auto-resolve bare video filenames from user media folders for slides in current item
  useEffect(() => {
    if (!currentItem || !window.electronAPI?.resolveVideoPath) return;

    for (const slide of currentItem.slides) {
      const rawPath = slide.videoPath || slide.videoUrl;
      const isYT = Boolean(extractYouTubeId(slide));
      if (rawPath && !isYT && isBareFilename(rawPath)) {
        window.electronAPI
          .resolveVideoPath(rawPath)
          .then((resolved) => {
            if (resolved) {
              dispatch(
                relinkSlideVideo({
                  rundownId: currentItem.id,
                  slideId: slide.id,
                  filePath: resolved,
                })
              );
            }
          })
          .catch((err) => {
            console.warn('Auto resolve slide video path failed:', err);
          });
      }
    }
  }, [currentItem?.id, dispatch]);

  const handleSlideClick = (slideId: string) => {
    if (!currentItem) return;
    dispatch(setPreviewSlide({ rundownId: currentItem.id, slideId }));
  };

  const handleSlideDoubleClick = (slideId: string) => {
    if (!currentItem) return;
    if (isBlackout || isLogoActive) {
      dispatch(clearAllOverrides());
    }
    dispatch(setPreviewSlide({ rundownId: currentItem.id, slideId }));
    dispatch(takeLive());
  };

  const handleGoLive = () => {
    if (isBlackout || isLogoActive) {
      dispatch(clearAllOverrides());
    }
    dispatch(takeLive());
  };

  const handleFadeClick = () => {
    if (transitionType === 'FADE') {
      const nextDuration = fadeDuration >= 2.0 ? 0.5 : Number((fadeDuration + 0.5).toFixed(1));
      dispatch(setFadeDuration(nextDuration));
    } else {
      dispatch(setTransitionType('FADE'));
    }
  };

  const handleAddSlide = () => {
    if (!currentItem) return;
    const newSlide = createNewSlide('New Slide', ['New content']);
    dispatch(addSlide({ rundownId: currentItem.id, slide: newSlide }));
    setShowAddSlide(false);
  };

  const handleDeleteSlide = (slideId: string) => {
    if (!currentItem) return;
    if (currentItem.slides.length <= 1) {
      alert('Cannot delete the last slide. Add a new slide first.');
      return;
    }
    if (confirm('Are you sure you want to delete this slide?')) {
      dispatch(deleteSlide({ rundownId: currentItem.id, slideId }));
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const targetElement = e.currentTarget as HTMLElement;
    const rect = targetElement.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const isAbove = e.clientY < midY;
    setDropPosition(isAbove ? 'above' : 'below');
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const related = e.relatedTarget as Node | null;
    if (!e.currentTarget.contains(related)) {
      setDragOverIndex(null);
      setDropPosition(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!currentItem || draggedIndex === null || draggedIndex === targetIndex) return;

    let finalTarget = targetIndex;
    if (dropPosition === 'below' && draggedIndex < targetIndex) {
      finalTarget = targetIndex;
    } else if (dropPosition === 'above' && draggedIndex > targetIndex) {
      finalTarget = targetIndex;
    }
    dispatch(
      reorderSlides({
        rundownId: currentItem.id,
        sourceIndex: draggedIndex,
        targetIndex: finalTarget,
      })
    );
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDropPosition(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDropPosition(null);
  };

  const getDeckTypeLabel = () => {
    if (!currentItem) return 'QUEUED ITEM';
    switch (currentItem.type) {
      case 'PPT':
        return 'POWERPOINT DECK';
      case 'CANVA':
        return 'CANVA PRESENTATION';
      case 'IMAGE':
        return 'IMAGE SLIDESHOW';
      case 'SERMON':
        return 'SERMON SLIDES';
      default:
        return 'LYRICS SLIDE DECK';
    }
  };

  return (
    <section className="preview-column-card" aria-label="Preview Column">
      <input
        type="file"
        ref={slideRelinkInputRef}
        accept="video/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          const targetSlideId = pendingRelinkSlideIdRef.current;
          if (file && targetSlideId && currentItem) {
            const fullPath = window.electronAPI?.getPathForFile?.(file) || URL.createObjectURL(file);
            dispatch(
              relinkSlideVideo({
                rundownId: currentItem.id,
                slideId: targetSlideId,
                filePath: fullPath,
              })
            );
            pendingRelinkSlideIdRef.current = null;
          }
        }}
      />

      {/* Column Header */}
      <div className="column-top-header preview-header">
        <div className="console-section-heading">
          <span className="console-section-index preview-index">PREVIEW</span>
          <div className="console-section-heading-copy">
            <h3 className="column-title" title={currentItem?.title || 'Nothing Queued'}>
              {currentItem ? currentItem.title : 'Nothing Queued'}
            </h3>
          </div>
        </div>

        {currentItem && (
          <div className="column-header-actions">
            <span className="deck-type-badge" title={getDeckTypeLabel()}>
              {currentItem.type === 'SONG' ? (
                <MusicIcon size={12} />
              ) : currentItem.type === 'VIDEO' ? (
                <VideoIcon size={12} />
              ) : currentItem.type === 'PPT' || currentItem.type === 'CANVA' ? (
                <PresentationIcon size={12} />
              ) : (
                <LayersIcon size={12} />
              )}
              <span className="deck-type-label">{currentItem.type}</span>
            </span>
            <span className="deck-slide-count" title={`${currentItem.slides.length} slides`}>
              <LayersIcon size={12} /> {currentItem.slides.length}
            </span>
            <button
              type="button"
              className="deck-action-btn"
              onClick={() => setShowAddSlide(true)}
              title="Add new slide"
              aria-label="Add new slide"
            >
              <PlusIcon size={14} />
            </button>
            <button
              type="button"
              className="deck-action-btn"
              onClick={() => setIsEditModalOpen(true)}
              title="Edit slides in this deck"
              aria-label="Edit slides in this deck"
            >
              <PencilIcon size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Middle: Scrollable Slide List */}
      <div className="column-slide-list preview-slide-list">
        {!currentItem ? (
          <div className="deck-empty-state">
            <div className="deck-empty-icon">
              <PresentationIcon size={24} />
            </div>
            <strong>No Item Selected</strong>
            <span>Click any item in the Schedule to cue its slides.</span>
          </div>
        ) : (
          currentItem.slides.map((slide, index) => {
            const isPreview = slide.id === previewSlideId;
            const isLive = slide.id === liveSlideId && currentItem.id === liveRundownId;
            const isDragging = draggedIndex === index;
            const isOver = dragOverIndex === index;

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
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`slide-item-card ${isPreview ? 'is-preview' : ''} ${
                  isLive ? 'is-live' : ''
                } ${isDragging ? 'is-dragging' : ''} ${
                  isOver && dropPosition ? `drop-target-${dropPosition}` : ''
                }`}
                onClick={() => handleSlideClick(slide.id)}
                onDoubleClick={() => handleSlideDoubleClick(slide.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSlideClick(slide.id);
                  } else if (e.key === ' ') {
                    e.preventDefault();
                    handleSlideDoubleClick(slide.id);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`${slide.section}, slide ${index + 1}${
                  isPreview ? ', next preview' : ''
                }`}
                title="Click to Preview • Double-click to Take Live"
              >
                <div className="slide-item-top">
                  <div className="slide-item-info">
                    <span className="card-drag-handle" title="Drag to reorder slide">
                      <GripVerticalIcon size={12} />
                    </span>
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
                    {isPreview && (
                      <span className="slide-status-tag tag-next">NEXT UP</span>
                    )}
                    <button
                      type="button"
                      className="slide-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSlide(slide.id);
                      }}
                      title={`Delete ${slide.section}`}
                      aria-label={`Delete ${slide.section}`}
                    >
                      <TrashIcon size={11} />
                    </button>
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

                    {!isYouTube && isBareFilename(slide.videoPath || slide.videoUrl) && (
                      <button
                        type="button"
                        className="slide-relink-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRelinkSlide(slide.id);
                        }}
                        title="Locate video file on your computer"
                        aria-label="Locate video file on your computer"
                      >
                        <VideoIcon size={13} />
                      </button>
                    )}
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

      {/* Horizontal Resizer between Slide List and Preview Monitor Dock */}
      <div
        className={`horizontal-monitor-resizer ${isResizingMonitor ? 'is-active' : ''}`}
        onMouseDown={onStartResizeMonitor}
        onDoubleClick={onResetMonitorHeight}
        title="Drag up/down to resize Preview Monitor • Double-click to reset"
        role="separator"
        tabIndex={0}
        aria-label="Resize Preview Monitor Height"
        aria-orientation="horizontal"
      >
        <div className="horizontal-resizer-grip" />
      </div>

      {/* Bottom Dock: Controls & Preview Reality Monitor */}
      <div className="column-bottom-dock preview-bottom-dock">
        <div className="preview-action-row">
          <div className="preview-transition-group">
            <button
              type="button"
              className={`preview-switch-btn ${transitionType === 'CUT' ? 'is-active' : ''}`}
              onClick={() => dispatch(setTransitionType('CUT'))}
              title="Cut transition (1)"
              aria-keyshortcuts="1"
            >
              Cut
            </button>
            <button
              type="button"
              className={`preview-switch-btn ${transitionType === 'FADE' ? 'is-active' : ''}`}
              onClick={handleFadeClick}
              title={`Fade transition ${fadeDuration.toFixed(1)}s (2, F to cycle)`}
              aria-keyshortcuts="2 F"
            >
              Fade {fadeDuration.toFixed(1)}s
            </button>

            <button
              type="button"
              className={`preview-icon-btn ${showBgPicker ? 'is-active' : ''}`}
              onClick={() => setShowBgPicker(!showBgPicker)}
              title="Change Background Theme"
              aria-label="Change Background Theme"
            >
              <SlidersIcon size={14} />
            </button>

            {showBgPicker && (
              <div className="background-picker-flyout">
                <span className="background-picker-title">Background Theme</span>
                <div className="background-picker-grid">
                  {backgroundThemes.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      className={`background-theme-btn ${
                        theme.id === activeBackground.id ? 'is-active' : ''
                      }`}
                      onClick={() => {
                        dispatch(setActiveBackground(theme.id));
                        setShowBgPicker(false);
                      }}
                    >
                      <span style={{ background: theme.accent }} />
                      <span>{theme.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            className="go-live-master-btn"
            onClick={handleGoLive}
            title="Take preview slide to Live Program (Enter or F4)"
            aria-keyshortcuts="Enter F4"
          >
            <PlayIcon size={14} />
            <span>Go Live</span>
            <kbd>Enter</kbd>
          </button>
        </div>

        <div className="column-monitor-container preview-monitor-container">
          <div className="monitor-subheading">
            <span className="monitor-subheading-tag preview-tag">PREVIEW MONITOR</span>
            <span className="monitor-subheading-item" title={previewSlide?.section || ''}>
              {previewSlide?.section || 'No slide cued'}
            </span>
          </div>

          <div className="monitor-frame-box" style={{ height: `${monitorHeight}px` }}>
            <ScaledRealityMonitor
              slide={previewSlide}
              backgroundGradient={activeBackground.gradient}
              transitionType="CUT"
              emptyLabel="Nothing Queued"
              isLive={false}
              outputDimensions={outputDimensions}
            />
          </div>
        </div>
      </div>

      {showAddSlide && (
        <div className="deck-add-slide-overlay" onClick={() => setShowAddSlide(false)}>
          <div className="deck-add-slide-modal" onClick={(e) => e.stopPropagation()}>
            <h4>Add New Slide</h4>
            <p className="deck-add-slide-hint">
              This will add a new slide to "{currentItem?.title}"
            </p>
            <div className="deck-add-slide-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowAddSlide(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleAddSlide}
              >
                Add Slide
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && currentItem && (
        <QuickEditModal
          currentItem={currentItem}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}
    </section>
  );
};
