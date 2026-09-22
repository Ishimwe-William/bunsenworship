import React, { useState } from 'react';
import { useAppDispatch } from '../../store/hooks';
import {
  RundownItem,
  Slide,
  updateSlide,
  addSlide,
  deleteSlide,
} from '../../store/features/presentation';
import { TrashIcon, PlusIcon, CheckIcon, VideoIcon, YoutubeIcon } from '../common/Icons';

interface QuickEditModalProps {
  currentItem: RundownItem;
  onClose: () => void;
}

export const QuickEditModal: React.FC<QuickEditModalProps> = ({ currentItem, onClose }) => {
  const dispatch = useAppDispatch();
  const [slides, setSlides] = useState<Slide[]>(currentItem.slides);
  const [isAdding, setIsAdding] = useState(false);
  const [newSection, setNewSection] = useState('Chorus');
  const [newText, setNewText] = useState('');
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  const [editVideoType, setEditVideoType] = useState<'none' | 'local' | 'youtube'>('none');
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [editYoutubeUrl, setEditYoutubeUrl] = useState('');
  const [editLoop, setEditLoop] = useState(true);
  const [editAutoPlay, setEditAutoPlay] = useState(true);

  const handleLineChange = (index: number, newContent: string) => {
    const updated = [...slides];
    updated[index] = {
      ...updated[index],
      lines: newContent.split('\n').filter((l) => l.trim().length > 0),
    };
    setSlides(updated);
  };

  const handleSectionChange = (index: number, newSec: string) => {
    const updated = [...slides];
    updated[index] = {
      ...updated[index],
      section: newSec,
    };
    setSlides(updated);
  };

  const handleSaveAll = () => {
    slides.forEach((s) => {
      dispatch(
        updateSlide({
          rundownId: currentItem.id,
          slideId: s.id,
          section: s.section,
          lines: s.lines,
          imageUrl: s.imageUrl,
          imageFit: s.imageFit,
          videoUrl: s.videoUrl,
          videoPath: s.videoPath,
          youtubeUrl: s.youtubeUrl,
          videoType: s.videoType,
          loop: s.loop,
          videoLoop: s.videoLoop,
          autoPlay: s.autoPlay,
          videoFit: s.videoFit,
        })
      );
    });
    onClose();
  };

  const handleAddNewSlide = () => {
    if (!newText.trim()) return;
    const lines = newText.split('\n').filter((l) => l.trim().length > 0);

    dispatch(
      addSlide({
        rundownId: currentItem.id,
        slide: {
          section: newSection,
          lines,
        },
      })
    );

    setNewText('');
    setIsAdding(false);
    onClose();
  };

  const handleDelete = (slideId: string) => {
    dispatch(deleteSlide({ rundownId: currentItem.id, slideId }));
    setSlides(slides.filter((s) => s.id !== slideId));
  };

  const handleOpenVideoEditor = (slideId: string) => {
    if (editingSlideId === slideId) {
      setEditingSlideId(null);
      return;
    }
    const slide = slides.find((s) => s.id === slideId);
    if (slide) {
      setEditingSlideId(slideId);
      setEditVideoType(slide.videoType || 'none');
      setEditVideoUrl(slide.videoUrl || slide.videoPath || '');
      setEditYoutubeUrl(slide.youtubeUrl || '');
      setEditLoop(slide.loop ?? slide.videoLoop ?? true);
      setEditAutoPlay(slide.autoPlay ?? true);
    }
  };

  const handleSaveVideoSettings = (slideId: string) => {
    const updated = slides.map((s) => {
      if (s.id === slideId) {
        return {
          ...s,
          videoType: editVideoType,
          videoUrl: editVideoType === 'local' ? editVideoUrl : undefined,
          videoPath: editVideoType === 'local' ? editVideoUrl : undefined,
          youtubeUrl: editVideoType === 'youtube' ? editYoutubeUrl : undefined,
          loop: editLoop,
          videoLoop: editLoop,
          autoPlay: editAutoPlay,
        };
      }
      return s;
    });
    setSlides(updated);
    setEditingSlideId(null);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="quick-edit-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Quick Edit: {currentItem.title}</h3>
          <button type="button" className="quick-edit-btn" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="modal-body">
          {slides.map((s, idx) => {
            const isEditingVideo = editingSlideId === s.id;
            const hasVideo = s.videoType && s.videoType !== 'none';

            return (
              <div
                key={s.id}
                style={{
                  background: 'var(--bg-subtle)',
                  padding: '0.875rem',
                  borderRadius: '10px',
                  border: isEditingVideo
                    ? '1.5px solid var(--color-primary)'
                    : '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <input
                    type="text"
                    value={s.section}
                    onChange={(e) => handleSectionChange(idx, e.target.value)}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      color: 'var(--color-primary)',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      padding: '3px 8px',
                      width: '140px',
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenVideoEditor(s.id)}
                      className="quick-edit-btn"
                      title={hasVideo ? 'Edit video settings' : 'Attach video to slide'}
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.72rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: hasVideo ? 'rgba(59, 130, 246, 0.15)' : undefined,
                        borderColor: hasVideo ? '#3b82f6' : undefined,
                        color: hasVideo ? '#3b82f6' : undefined,
                      }}
                    >
                      <VideoIcon size={12} />
                      <span>{hasVideo ? 'Video Attached' : 'Add Video'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(s.id)}
                      className="notification-dismiss-btn"
                      title="Delete slide"
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                </div>

                {hasVideo && !isEditingVideo && (
                  <div
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--color-primary)',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'rgba(59, 130, 246, 0.08)',
                      width: 'fit-content',
                    }}
                  >
                    {s.videoType === 'youtube' ? <YoutubeIcon size={12} /> : <VideoIcon size={12} />}
                    <span>
                      {s.videoType === 'youtube' ? 'YouTube Stream' : 'Local Video File'}
                      {s.loop ? ' (Loop)' : ''}
                    </span>
                  </div>
                )}

                {isEditingVideo && (
                  <div
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      fontSize: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Video Configuration</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {(['none', 'local', 'youtube'] as const).map((vt) => (
                          <button
                            key={vt}
                            type="button"
                            onClick={() => setEditVideoType(vt)}
                            className={`console-mini-btn ${editVideoType === vt ? 'active' : ''}`}
                            style={{
                              padding: '2px 8px',
                              fontSize: '0.65rem',
                              textTransform: 'capitalize',
                            }}
                          >
                            {vt === 'none' ? 'None' : vt === 'local' ? 'Local File' : 'YouTube'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {editVideoType === 'local' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          Local Video File Path or URL:
                        </label>
                        <input
                          type="text"
                          value={editVideoUrl}
                          onChange={(e) => setEditVideoUrl(e.target.value)}
                          placeholder="file:///path/to/video.mp4 or relative path"
                          className="auth-input"
                          style={{ fontSize: '0.75rem', padding: '6px' }}
                        />
                      </div>
                    )}

                    {editVideoType === 'youtube' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          YouTube URL or Video ID:
                        </label>
                        <input
                          type="text"
                          value={editYoutubeUrl}
                          onChange={(e) => setEditYoutubeUrl(e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=... or ID"
                          className="auth-input"
                          style={{ fontSize: '0.75rem', padding: '6px' }}
                        />
                      </div>
                    )}

                    {editVideoType !== 'none' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '2px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={editLoop}
                            onChange={(e) => setEditLoop(e.target.checked)}
                          />
                          <span>Loop Continuously</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={editAutoPlay}
                            onChange={(e) => setEditAutoPlay(e.target.checked)}
                          />
                          <span>Auto Play on Live</span>
                        </label>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setEditingSlideId(null)}
                        style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => handleSaveVideoSettings(s.id)}
                        style={{ padding: '3px 10px', fontSize: '0.7rem' }}
                      >
                        Save Video Settings
                      </button>
                    </div>
                  </div>
                )}

                <textarea
                  rows={3}
                  className="auth-input"
                  style={{
                    fontFamily: 'inherit',
                    fontSize: '0.85rem',
                    lineHeight: '1.4',
                    resize: 'vertical',
                  }}
                  value={s.lines.join('\n')}
                  onChange={(e) => handleLineChange(idx, e.target.value)}
                  placeholder="Optional lyrics / text overlay..."
                />
              </div>
            );
          })}

          {isAdding ? (
            <div
              style={{
                background: 'rgba(59, 130, 246, 0.08)',
                padding: '1rem',
                borderRadius: '10px',
                border: '1px dashed #3b82f6',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <input
                type="text"
                value={newSection}
                onChange={(e) => setNewSection(e.target.value)}
                placeholder="Section name (e.g. Chorus / Bridge)"
                className="auth-input"
                style={{ fontSize: '0.825rem' }}
              />
              <textarea
                rows={3}
                placeholder="Enter slide lyrics (one line per row)..."
                className="auth-input"
                style={{ fontSize: '0.85rem', resize: 'vertical' }}
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsAdding(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleAddNewSlide}
                >
                  Save New Slide
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsAdding(true)}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <PlusIcon size={14} />
              <span>Add New Slide</span>
            </button>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSaveAll}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <CheckIcon size={14} />
            <span>Apply Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
