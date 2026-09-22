import React, { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectRundown,
  selectSelectedRundownId,
  selectLiveRundownId,
  setSelectedRundownId,
  addRundownItem,
  reorderRundown,
  setLoadedRundown,
  RundownItemType,
} from '../../store/features/presentation';
import { PlusIcon, GripVerticalIcon } from '../common/Icons';
import { bunsenDb } from '../../db';

export const ServiceRundown: React.FC = () => {
  const dispatch = useAppDispatch();
  const rundown = useAppSelector(selectRundown);
  const selectedRundownId = useAppSelector(selectSelectedRundownId);
  const liveRundownId = useAppSelector(selectLiveRundownId);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newTime, setNewTime] = useState('09:30');
  const [newType, setNewType] = useState<RundownItemType>('SONG');

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<'above' | 'below' | null>(null);

  // 1. Hydrate rundown from local DB on startup
  useEffect(() => {
    let isMounted = true;
    bunsenDb
      .getCurrentService()
      .then((savedService) => {
        if (isMounted && savedService && savedService.items && savedService.items.length > 0) {
          dispatch(setLoadedRundown(savedService.items));
        }
      })
      .catch((err) => {
        console.warn('Could not hydrate service from local DB:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [dispatch]);

  // 2. Automatically persist rundown changes to local DB (debounced)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      bunsenDb
        .saveService({
          id: 'service-current',
          title: 'Sunday Morning Worship',
          date: new Date().toISOString().split('T')[0],
          isCurrent: true,
          items: rundown,
          createdAt: 1710000000000,
          updatedAt: Date.now(),
        })
        .catch((err) => console.warn('Auto-save to local DB failed:', err));
    }, 700);

    return () => clearTimeout(timer);
  }, [rundown]);

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
      dispatch(reorderRundown({ sourceIndex: draggedIndex, targetIndex: finalTarget }));
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

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    dispatch(
      addRundownItem({
        title: newTitle.trim(),
        subtitle: newSubtitle.trim() || 'Custom worship item',
        time: newTime || '09:30',
        type: newType,
        slides: [
          {
            id: `s-${Date.now()}-1`,
            section: newType === 'PPT' ? 'Slide 1' : newType === 'CANVA' ? 'Page 1' : 'Verse 1',
            lines: [`${newTitle.trim()} - Line 1`, 'Lyric line 2'],
          },
        ],
      })
    );

    setNewTitle('');
    setNewSubtitle('');
    setShowAddModal(false);
  };

  const getTypeClass = (type: RundownItemType) => {
    switch (type) {
      case 'LOOP':
        return 'type-loop';
      case 'VIDEO':
        return 'type-video';
      case 'SONG':
        return 'type-song';
      case 'SERMON':
        return 'type-sermon';
      case 'PPT':
        return 'type-ppt';
      case 'CANVA':
        return 'type-canva';
      case 'IMAGE':
        return 'type-image';
      default:
        return 'type-song';
    }
  };

  return (
    <aside className="service-rundown-col">
      <div className="rundown-header">
        <h3 className="rundown-header-title">Service Rundown</h3>
        <button
          type="button"
          className="quick-edit-btn"
          onClick={() => setShowAddModal(true)}
          title="Add Item to Rundown"
          style={{ padding: '3px 8px', fontSize: '0.7rem' }}
        >
          <PlusIcon size={13} />
          <span>Add</span>
        </button>
      </div>

      <div className="rundown-scroll-list">
        {rundown.map((item, index) => {
          const isSelected = item.id === selectedRundownId;
          const hasLive = item.id === liveRundownId;
          const isDragging = draggedIndex === index;
          const isOver = dragOverIndex === index;

          return (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`rundown-item-card ${isSelected ? 'selected' : ''} ${
                hasLive ? 'has-live' : ''
              } ${isDragging ? 'is-dragging' : ''} ${
                isOver && dropPosition ? `drop-target-${dropPosition}` : ''
              }`}
              onClick={() => dispatch(setSelectedRundownId(item.id))}
              title="Click to select &bull; Drag to rearrange order"
            >
              <div className="rundown-accent-bar" />
              <div className="rundown-card-top">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="card-drag-handle" title="Drag to rearrange order">
                    <GripVerticalIcon size={13} />
                  </span>
                  <span className="rundown-time">{item.time}</span>
                </div>
                <span className={`rundown-type-pill ${getTypeClass(item.type)}`}>
                  {item.type}
                </span>
              </div>
              <h4 className="rundown-item-title">{item.title}</h4>
              <p className="rundown-item-subtitle">{item.subtitle}</p>
            </div>
          );
        })}
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="quick-edit-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add Service Item</h3>
              <button
                type="button"
                className="quick-edit-btn"
                onClick={() => setShowAddModal(false)}
              >
                Close
              </button>
            </div>
            <form onSubmit={handleAddItem} className="modal-body">
              <div>
                <label className="status-label" style={{ display: 'block', marginBottom: '4px' }}>
                  Item Title
                </label>
                <input
                  type="text"
                  className="auth-input"
                  placeholder="e.g. Way Maker / Pastoral Prayer"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="status-label" style={{ display: 'block', marginBottom: '4px' }}>
                    Scheduled Time
                  </label>
                  <input
                    type="text"
                    className="auth-input"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className="status-label" style={{ display: 'block', marginBottom: '4px' }}>
                    Item Category
                  </label>
                  <select
                    className="auth-input"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as RundownItemType)}
                  >
                    <option value="SONG">SONG (Worship)</option>
                    <option value="IMAGE">IMAGE (Graphic / Slide)</option>
                    <option value="SERMON">SERMON (Message)</option>
                    <option value="PPT">PPT (PowerPoint)</option>
                    <option value="CANVA">CANVA (Presentation)</option>
                    <option value="VIDEO">VIDEO (Playback)</option>
                    <option value="LOOP">LOOP (Motion)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="status-label" style={{ display: 'block', marginBottom: '4px' }}>
                  Subtitle / Notes
                </label>
                <input
                  type="text"
                  className="auth-input"
                  placeholder="e.g. 4 Verses / 2 Chorus"
                  value={newSubtitle}
                  onChange={(e) => setNewSubtitle(e.target.value)}
                />
              </div>

              <div className="modal-footer" style={{ padding: '0.75rem 0 0 0', border: 'none' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Add to Rundown
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};
