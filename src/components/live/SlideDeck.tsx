import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectCurrentRundownItem,
  selectPreviewSlideId,
  selectLiveSlideId,
  selectLiveRundownId,
  setPreviewSlide,
  takeSlideDirectlyLive,
} from '../../store/features/presentation';
import { PencilIcon } from '../common/Icons';
import { QuickEditModal } from './QuickEditModal';

export const SlideDeck: React.FC = () => {
  const dispatch = useAppDispatch();
  const currentItem = useAppSelector(selectCurrentRundownItem);
  const previewSlideId = useAppSelector(selectPreviewSlideId);
  const liveSlideId = useAppSelector(selectLiveSlideId);
  const liveRundownId = useAppSelector(selectLiveRundownId);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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

  return (
    <section className="slide-deck-col">
      <div className="deck-header">
        <h3 className="deck-header-title">
          <span>{currentItem.title} - LYRICS SLIDE DECK</span>
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
        {currentItem.slides.map((slide) => {
          const isPreview = slide.id === previewSlideId;
          const isLive =
            slide.id === liveSlideId && currentItem.id === liveRundownId;

          return (
            <div
              key={slide.id}
              className={`slide-item-card ${isPreview ? 'is-preview' : ''} ${
                isLive ? 'is-live' : ''
              }`}
              onClick={() => handleSlideClick(slide.id)}
              onDoubleClick={() => handleSlideDoubleClick(slide.id)}
              title="Click to Preview &bull; Double-click to Take Live"
            >
              <div className="slide-item-top">
                <span className="slide-section-label">{slide.section}</span>
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
