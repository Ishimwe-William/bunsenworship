import React, { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectCurrentRundownItem,
  selectPreviewSlideId,
  selectLiveSlideId,
  selectLiveRundownId,
  selectRundown,
  setPreviewSlide,
  takeSlideDirectlyLive,
  reorderSlides,
  addSlide,
  deleteSlide,
} from '../../store/features/presentation';
import { PencilIcon, GripVerticalIcon, PlusIcon, TrashIcon, VideoIcon, YoutubeIcon } from '../common/Icons';
import { QuickEditModal } from './QuickEditModal';
import { createNewSlide } from '../../utils/liveShowHelpers';
import { bunsenDb } from '../../db';

export const SlideDeck: React.FC = () => {
  const dispatch = useAppDispatch();
  const currentItem = useAppSelector(selectCurrentRundownItem);
  const previewSlideId = useAppSelector(selectPreviewSlideId);
  const liveSlideId = useAppSelector(selectLiveSlideId);
  const liveRundownId = useAppSelector(selectLiveRundownId);
  const rundown = useAppSelector(selectRundown);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showAddSlide, setShowAddSlide] = useState(false);



  // Drag and drop state for slides
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<'above' | 'below' | null>(null);

  if (!currentItem) {
    return (
      <section className="slide-deck-col">
        <div className="deck-header">
          <h3 className="deck-header-title">No Item Selected</h3>
        </div>
        <div className="deck-scroll-list" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Select an item from the Service Rundown to view its slide deck.
          </p>
        </div>
      </section>
    );
  }

  const handleSlideClick = (slideId: string) => {
    dispatch(setPreviewSlide({ rundownId: currentItem.id, slideId }));
  };

  const handleSlideDoubleClick = (slideId: string) => {
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
      <div className="deck-header">
        <div className="deck-header-left">
          <h3 className="deck-header-title">
            {currentItem.title} - {getDeckTypeLabel()}
          </h3>
          <span className="deck-slide-count">
            {currentItem.slides.length} {currentItem.slides.length === 1 ? 'slide' : 'slides'}
          </span>
        </div>
        <div className="deck-header-actions">
          <button
            type="button"
            className="deck-action-btn"
            onClick={() => setShowAddSlide(true)}
            title="Add new slide"
          >
            <PlusIcon size={13} />
          </button>
          <button
            type="button"
            className="deck-action-btn"
            onClick={() => setIsEditModalOpen(true)}
            title="Edit slides in this deck"
          >
            <PencilIcon size={13} />
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

          const hasVideo = Boolean(
            (slide.videoType === 'local' ||
              slide.videoType === 'youtube' ||
              slide.videoUrl ||
              slide.videoPath ||
              slide.youtubeUrl) &&
              slide.videoType !== 'none'
          );
          const isYouTube = Boolean(
            slide.videoType === 'youtube' ||
              (slide.youtubeUrl && !slide.videoPath && !slide.videoUrl)
          );
          const videoTitleText =
            slide.videoTitle ||
            (isYouTube ? 'YouTube Stream' : slide.videoUrl ? 'Video Playback' : '');

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
              title="Click to Preview • Double-click to Take Live • Drag to rearrange"
            >
              <div className="slide-item-top">
                <div className="slide-item-info">
                  <span className="card-drag-handle" title="Drag to rearrange slide">
                    <GripVerticalIcon size={13} />
                  </span>
                  <span className="slide-number">{index + 1}</span>
                  <span
                    className="slide-section-label"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  >
                    {hasVideo && (
                      <span
                        style={{
                          color: isYouTube ? '#ef4444' : '#3b82f6',
                          display: 'inline-flex',
                          alignItems: 'center',
                        }}
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
                    title="Delete slide"
                  >
                    <TrashIcon size={11} />
                  </button>
                </div>
              </div>

              {/* Video Media Banner */}
              {hasVideo && (
                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    margin: '4px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span
                    style={{
                      background: isYouTube ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                      color: isYouTube ? '#ef4444' : '#3b82f6',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                    }}
                  >
                    {isYouTube ? <YoutubeIcon size={11} /> : <VideoIcon size={11} />}
                    <span>{isYouTube ? 'YOUTUBE' : 'VIDEO'}</span>
                  </span>
                  <span
                    style={{
                      fontSize: '0.725rem',
                      color: 'var(--text-secondary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}
                    title={videoTitleText || slide.videoUrl || slide.youtubeUrl || ''}
                  >
                    {videoTitleText || (isYouTube ? 'YouTube Stream' : 'Local Video File')}
                  </span>
                </div>
              )}

              {slide.imageUrl && (
                <div className="slide-thumbnail-wrap">
                  <img
                    src={slide.imageUrl}
                    alt={slide.section || 'Slide Thumbnail'}
                    className="slide-thumbnail-img"
                  />
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

              {(!slide.lines || slide.lines.length === 0) && !slide.imageUrl && (
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                    fontStyle: 'italic',
                    padding: '4px 0',
                  }}
                >
                  {hasVideo ? 'Video active • No lyric text overlay' : 'Empty slide content'}
                </div>
              )}
            </div>
          );
        })}
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
