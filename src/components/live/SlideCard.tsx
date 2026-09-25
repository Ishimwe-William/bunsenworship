import React, { useState } from 'react';
import { Slide } from '../../store/features/presentation/types';
import { GripVerticalIcon, PlayIcon, YoutubeIcon } from '../common/Icons';
import { getSlideThumbnail, extractYouTubeId, generateVideoThumbnail, isVideoFile } from '../../utils/videoHelpers';

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
  const [imgError, setImgError] = useState(false);

  const youtubeVideoId = extractYouTubeId(slide);
  const isYouTube = Boolean(youtubeVideoId);
  const hasVideo = Boolean(
    isYouTube ||
    slide.videoType === 'local' ||
    slide.videoUrl ||
    slide.videoPath
  ) && slide.videoType !== 'none';

  const hasMedia = Boolean(
    hasVideo ||
    (slide.imageUrl && !isVideoFile(slide.imageUrl))
  );

  const thumbUrl = getSlideThumbnail(slide);
  const displayThumb = imgError
    ? generateVideoThumbnail(slide.videoTitle || slide.section || 'Video')
    : thumbUrl;

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

      {hasMedia && (thumbUrl || hasVideo) && (
        <div className="slide-thumbnail-wrap" style={{ position: 'relative', overflow: 'hidden' }}>
          <img
            src={displayThumb}
            alt={slide.section || 'Slide Thumbnail'}
            className="slide-thumbnail-img"
            onError={() => setImgError(true)}
          />
          {hasVideo && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0, 0, 0, 0.28)',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: isYouTube ? 'rgba(239, 68, 68, 0.9)' : 'rgba(59, 130, 246, 0.9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                }}
              >
                {isYouTube ? <YoutubeIcon size={14} /> : <PlayIcon size={14} />}
              </div>
            </div>
          )}
        </div>
      )}

      {slide.lines && slide.lines.length > 0 && (
        <div className={`slide-content-preview ${!hasMedia ? 'is-text-slide' : ''}`}>
          {slide.lines.map((line, idx) => (
            <p key={idx} className="slide-line">
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};