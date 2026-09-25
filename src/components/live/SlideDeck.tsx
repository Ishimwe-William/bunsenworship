import React, { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectCurrentRundownItem,
  selectPreviewSlideId,
  selectLiveSlideId,
  selectLiveRundownId,
  selectVideoPlayback,
  selectIsBlackout,
  selectIsLogoActive,
  clearAllOverrides,
  toggleVideoPlay,
  setPreviewSlide,
  takeSlideDirectlyLive,
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
  PlayIcon,
  PauseIcon,
  PresentationIcon,
} from '../common/Icons';
import { QuickEditModal } from './QuickEditModal';
import { createNewSlide } from '../../utils/liveShowHelpers';
import {
  formatTime,
  isBareFilename,
  generateVideoThumbnail,
  getFileNameFromPath,
  extractYouTubeId,
  getSlideThumbnail,
} from '../../utils/videoHelpers';

export const SlideDeck: React.FC = () => {
  const dispatch = useAppDispatch();
  const currentItem = useAppSelector(selectCurrentRundownItem);
  const previewSlideId = useAppSelector(selectPreviewSlideId);
  const liveSlideId = useAppSelector(selectLiveSlideId);
  const liveRundownId = useAppSelector(selectLiveRundownId);
  const videoPlayback = useAppSelector(selectVideoPlayback);
  const isBlackout = useAppSelector(selectIsBlackout);
  const isLogoActive = useAppSelector(selectIsLogoActive);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showAddSlide, setShowAddSlide] = useState(false);
  const [brokenThumbs, setBrokenThumbs] = useState<Record<string, boolean>>({});
  const slideRelinkInputRef = useRef<HTMLInputElement>(null);
  const pendingRelinkSlideIdRef = useRef<string | null>(null);

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

  // Drag and drop state for slides
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<'above' | 'below' | null>(null);

  if (!currentItem) {
    return (
      <section className="slide-deck-col">
        <div className="deck-header">
          <div className="console-section-heading">
            <span className="console-section-index">02</span>
            <div className="console-section-heading-copy">
              <span>Content library</span>
              <h3 className="deck-header-title">Slide Deck</h3>
            </div>
          </div>
        </div>
        <div className="deck-empty-state">
          <div className="deck-empty-icon">
            <PresentationIcon size={26} />
          </div>
          <strong>No item selected</strong>
          <span>Choose a service item to load its slides.</span>
        </div>
      </section>
    );
  }

  const handleSlideClick = (slideId: string) => {
    dispatch(setPreviewSlide({ rundownId: currentItem.id, slideId }));
  };

  const handleSlideDoubleClick = (slideId: string) => {
    if (isBlackout || isLogoActive) {
      dispatch(clearAllOverrides());
    }
    dispatch(takeSlideDirectlyLive({ rundownId: currentItem.id, slideId }));
  };

  const handleAddSlide = () => {
    const newSlide = createNewSlide('New Slide', ['New content']);
    dispatch(addSlide({ rundownId: currentItem.id, slide: newSlide }));
    setShowAddSlide(false);
  };

  const handleDeleteSlide = (slideId: string) => {
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
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
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
    }
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
    <section className="slide-deck-col">
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
      <div className="deck-header">
        <div className="console-section-heading deck-heading-main">
          <span className="console-section-index">02</span>
          <div className="console-section-heading-copy">
            <span>Selected content</span>
            <h3 className="deck-header-title" title={currentItem.title}>
              {currentItem.title}
            </h3>
          </div>
        </div>
        <div className="deck-header-actions">
          <span className="deck-type-badge">{getDeckTypeLabel()}</span>
          <span className="deck-slide-count">
            {currentItem.slides.length} {currentItem.slides.length === 1 ? 'slide' : 'slides'}
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
      </div>

      <div className="deck-scroll-list">
        {currentItem.slides.map((slide, index) => {
          const isPreview = slide.id === previewSlideId;
          const isLive =
            slide.id === liveSlideId && currentItem.id === liveRundownId;
          const isDragging = draggedIndex === index;
          const isOver = dragOverIndex === index;

          const isYouTube = Boolean(extractYouTubeId(slide));
          const isVideoPlaying = videoPlayback.isPlaying && !isBlackout && !isLogoActive;
          const hasVideo = Boolean(
            (isYouTube ||
              slide.videoType === 'local' ||
              slide.videoUrl ||
              slide.videoPath) &&
              slide.videoType !== 'none'
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
                isLive ? ', live' : isPreview ? ', next preview' : ''
              }`}
              title="Click to Preview • Double-click to Take Live • Drag to rearrange"
            >
              <div className="slide-item-top">
                <div className="slide-item-info">
                  <span className="card-drag-handle" title="Drag to rearrange slide">
                    <GripVerticalIcon size={13} />
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
                  {isPreview && !isLive && (
                    <span className="slide-status-tag tag-next">NEXT UP</span>
                  )}
                  {isLive && (
                    <span className="slide-status-tag tag-live">
                      <span className="live-indicator" />
                      LIVE
                    </span>
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
                    <span
                      className={`slide-media-kind ${isYouTube ? 'is-youtube' : 'is-local'}`}
                    >
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
                      <VideoIcon size={14} />
                    </button>
                  )}

                  {isLive && (
                    <div className="slide-live-media-controls">
                      <span className="slide-media-time">
                        {formatTime(videoPlayback.currentTime)}
                      </span>
                      <button
                        type="button"
                        className={`slide-media-toggle ${isVideoPlaying ? 'is-playing' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!videoPlayback.isPlaying && (isBlackout || isLogoActive)) {
                            dispatch(clearAllOverrides());
                          }
                          dispatch(toggleVideoPlay());
                        }}
                        title={isVideoPlaying ? 'Pause video' : 'Play video'}
                        aria-label={isVideoPlaying ? 'Pause video' : 'Play video'}
                      >
                        {isVideoPlaying ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {(slideThumb || hasVideo) && (
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
                        {isYouTube ? <YoutubeIcon size={14} /> : <PlayIcon size={12} />}
                      </div>
                    </div>
                  )}

                  {slide.embedUrl && <div className="slide-embed-badge">Live Deck</div>}
                </div>
              )}

              {slide.lines && slide.lines.length > 0 && (
                <div className="slide-content-preview">
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
        })}
      </div>

      <div className="deck-footer-hint">
        <span>
          <PlayIcon size={11} /> Click to preview
        </span>
        <span>Double-click to take live</span>
      </div>

      {showAddSlide && (
        <div className="deck-add-slide-overlay" onClick={() => setShowAddSlide(false)}>
          <div className="deck-add-slide-modal" onClick={(e) => e.stopPropagation()}>
            <h4>Add New Slide</h4>
            <p className="deck-add-slide-hint">
              This will add a new slide to "{currentItem.title}"
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

      {isEditModalOpen && (
        <QuickEditModal
          currentItem={currentItem}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}
    </section>
  );
};
