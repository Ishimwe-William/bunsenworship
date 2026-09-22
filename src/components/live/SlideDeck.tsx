import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectCurrentRundownItem,
  selectPreviewSlideId,
  selectLiveSlideId,
  selectLiveRundownId,
  setPreviewSlide,
  takeSlideDirectlyLive,
  reorderSlides,
} from '../../store/features/presentation';
import { PencilIcon, GripVerticalIcon } from '../common/Icons';
import { QuickEditModal } from './QuickEditModal';

export const SlideDeck: React.FC = () => {
  const dispatch = useAppDispatch();
  const currentItem = useAppSelector(selectCurrentRundownItem);
  const previewSlideId = useAppSelector(selectPreviewSlideId);
  const liveSlideId = useAppSelector(selectLiveSlideId);
  const liveRundownId = useAppSelector(selectLiveRundownId);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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

  return (
    <section className="slide-deck-col">
      <div className="deck-header">
        <h3 className="deck-header-title">
          <span>
            {currentItem.title} -{' '}
            {currentItem.type === 'PPT'
              ? 'POWERPOINT DECK'
              : currentItem.type === 'CANVA'
              ? 'CANVA PRESENTATION'
              : currentItem.type === 'SERMON'
              ? 'SERMON SLIDES'
              : 'LYRICS SLIDE DECK'}
          </span>
        </h3>
        <div className="deck-header-actions">
          <button
            type="button"
            className="quick-edit-btn"
            onClick={() => setIsEditModalOpen(true)}
            title="Edit slides in this deck"
          >
            <PencilIcon size={13} />
            <span>Quick Edit</span>
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
              title="Click to Preview &bull; Double-click to Take Live &bull; Drag to rearrange"
            >
              <div className="slide-item-top">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="card-drag-handle" title="Drag to rearrange slide">
                    <GripVerticalIcon size={13} />
                  </span>
                  <span className="slide-section-label">{slide.section}</span>
                </div>
                {isPreview && !isLive && (
                  <span className="slide-status-tag tag-next">NEXT UP</span>
                )}
                {isLive && (
                  <span className="slide-status-tag tag-live">
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffffff', display: 'inline-block' }} />
                    LIVE
                  </span>
                )}
              </div>

              <p className="slide-lyrics-body">
                {slide.lines.join(' / ')}
              </p>
            </div>
          );
        })}
      </div>

      {isEditModalOpen && (
        <QuickEditModal
          currentItem={currentItem}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}
    </section>
  );
};
