import React, { useState } from 'react';
import { useAppDispatch } from '../../store/hooks';
import {
  RundownItem,
  Slide,
  updateSlide,
  addSlide,
  deleteSlide,
} from '../../store/features/presentation';
import { TrashIcon, PlusIcon, CheckIcon } from '../common/Icons';

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
          {slides.map((s, idx) => (
            <div
              key={s.id}
              style={{
                background: 'var(--bg-subtle)',
                padding: '0.875rem',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)',
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
                <button
                  type="button"
                  onClick={() => handleDelete(s.id)}
                  className="notification-dismiss-btn"
                  title="Delete slide"
                >
                  <TrashIcon size={14} />
                </button>
              </div>

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
              />
            </div>
          ))}

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
