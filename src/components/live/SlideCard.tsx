import React from 'react';
import { Slide } from '../../store/features/presentation/types';
import { GripVerticalIcon } from '../common/Icons';

interface SlideCardProps {
  slide: Slide;
  isPreview: boolean;
  isLive: boolean;
  isDragging: boolean;
  isOver: boolean;
  dropPosition: 'above' | 'below' | null;
  onClick: () => void;
  onDoubleClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

export const SlideCard: React.FC<SlideCardProps> = ({
  slide,
  isPreview,
  isLive,
  isDragging,
  isOver,
  dropPosition,
  onClick,
  onDoubleClick,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}) => {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`slide-item-card ${isPreview ? 'is-preview' : ''} ${
        isLive ? 'is-live' : ''
      } ${isDragging ? 'is-dragging' : ''} ${
        isOver && dropPosition ? `drop-target-${dropPosition}` : ''
      }`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      title="Click to Preview • Double-click to Take Live • Drag to rearrange"
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
        <p className="slide-lyrics-body">
          {slide.lines.join(' / ')}
        </p>
      )}
    </div>
  );
};