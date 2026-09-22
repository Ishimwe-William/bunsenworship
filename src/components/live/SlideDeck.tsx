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
import { PencilIcon, GripVerticalIcon, PlusIcon, TrashIcon } from '../common/Icons';
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

  // Auto-save slide changes to DB
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      console.log('Auto-saving rundown after slide changes');
      bunsenDb.saveService({
        id: 'service-current',
        title: 'Sunday Morning Worship',
        date: new Date().toISOString().split('T')[0],
        isCurrent: true,
        items: rundown,
        createdAt: 1710000000000,
        updatedAt: Date.now(),
      }).catch((err) => console.error('Auto-save after slide changes failed:', err));
    }, 700);

    return () => clearTimeout(timer);
  }, [rundown]);

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
                  <span className="slide-section-label">{slide.section}</span>
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
