import React, { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectRundown,
  selectSelectedRundownId,
  selectLiveRundownId,
  setSelectedRundownId,
  addRundownItem,
  deleteRundownItem,
  reorderRundown,
  setLoadedRundown,
  RundownItemType,
} from '../../store/features/presentation';
import { RundownItem } from '../../store/features/presentation/types';
import { PlusIcon, GripVerticalIcon, ClockIcon, TrashIcon } from '../common/Icons';
import { bunsenDb } from '../../db';
import { createNewRundownItem } from '../../utils/liveShowHelpers';

// Default seed data for first-time users
const DEFAULT_RUNDOWN: RundownItem[] = [
  {
    id: 'rd-loop',
    time: '09:00',
    title: 'Pre-service Loop',
    subtitle: 'Announcements v2.pptx',
    type: 'LOOP',
    slides: [
      {
        id: 's-loop-1',
        section: 'Welcome',
        lines: ['Welcome to Sunday Worship Service', 'Please silence your mobile devices'],
      },
      {
        id: 's-loop-2',
        section: 'Announcements',
        lines: ['Midweek Prayer Gathering: Wednesday 7:00 PM', 'Youth Ministry: Saturday 4:00 PM'],
      },
    ],
  },
  {
    id: 'rd-glorious-day',
    time: '09:07',
    title: 'Glorious Day',
    subtitle: '4 Verses / 2 Chorus',
    type: 'SONG',
    slides: [
      {
        id: 's-gd-v1',
        section: 'Verse 1',
        lines: [
          'One day when heaven was filled with His praises',
          'One day when sin was as black as could be',
        ],
      },
      {
        id: 's-gd-chorus',
        section: 'Chorus',
        lines: [
          'Living He loved me, dying He saved me',
          'Buried He carried my sins far away',
        ],
      },
    ],
  },
];

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
    console.log('Attempting to load service from DB...');
    bunsenDb
      .getCurrentService()
      .then((savedService) => {
        if (isMounted) {
          if (savedService && savedService.items && savedService.items.length > 0) {
            console.log('✓ Loaded saved service from DB:', savedService.items.length, 'items');
            dispatch(setLoadedRundown(savedService.items));
          } else {
            console.log('No saved service found, loading default rundown');
            dispatch(setLoadedRundown(DEFAULT_RUNDOWN));
          }
        }
      })
      .catch((err) => {
        console.error('✗ Failed to load service from DB:', err);
        console.log('Loading default rundown as fallback');
        dispatch(setLoadedRundown(DEFAULT_RUNDOWN));
      });

    return () => {
      isMounted = false;
    };
  }, [dispatch]);

  // 2. Automatically persist rundown changes to local DB (debounced)
  const isInitialMount = useRef(true);
  
  useEffect(() => {
    // Skip saving during initial load
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      console.log('Auto-saving service to DB:', rundown.length, 'items');
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
        .then(() => console.log('Service saved successfully'))
        .catch((err) => console.error('Auto-save to local DB failed:', err));
    }, 700);

    return () => clearTimeout(timer);
  }, [rundown]);

  // Keyboard shortcuts for rundown navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const currentIndex = rundown.findIndex(item => item.id === selectedRundownId);
      
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault();
        dispatch(setSelectedRundownId(rundown[currentIndex - 1].id));
      } else if (e.key === 'ArrowRight' && currentIndex < rundown.length - 1) {
        e.preventDefault();
        dispatch(setSelectedRundownId(rundown[currentIndex + 1].id));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rundown, selectedRundownId, dispatch]);

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

    const newItem = createNewRundownItem(newTitle.trim(), newType, newTime || '09:30');
    newItem.subtitle = newSubtitle.trim() || 'Custom worship item';

    dispatch(addRundownItem(newItem));

    setNewTitle('');
    setNewSubtitle('');
    setShowAddModal(false);
  };

  const handleDeleteItem = (itemId: string) => {
    if (rundown.length <= 1) {
      alert('Cannot delete the last item. Add a new item first.');
      return;
    }
    if (confirm('Are you sure you want to delete this item from the service rundown?')) {
      dispatch(deleteRundownItem(itemId));
    }
  };

  const calculateTotalSlides = () => {
    return rundown.reduce((total, item) => total + item.slides.length, 0);
  };

  const calculateEstimatedDuration = () => {
    return rundown.reduce((minutes, item) => {
      switch (item.type) {
        case 'SONG':
          return minutes + 4;
        case 'SERMON':
          return minutes + 15;
        default:
          return minutes + 2;
      }
    }, 0);
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
        <div className="rundown-header-left">
          <h3 className="rundown-header-title">Service Rundown</h3>
          <div className="rundown-stats">
            <span className="rundown-stat">
              <ClockIcon size={12} />
              {calculateEstimatedDuration()}min
            </span>
            <span className="rundown-stat">
              {calculateTotalSlides()} slides
            </span>
          </div>
        </div>
        <button
          type="button"
          className="rundown-add-btn"
          onClick={() => setShowAddModal(true)}
          title="Add Item to Rundown"
        >
          <PlusIcon size={13} />
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
                <div className="rundown-card-left">
                  <span className="card-drag-handle" title="Drag to rearrange order">
                    <GripVerticalIcon size={13} />
                  </span>
                  <span className="rundown-time">{item.time}</span>
                  <span className="rundown-slide-count">
                    {item.slides.length} {item.slides.length === 1 ? 'slide' : 'slides'}
                  </span>
                </div>
                <div className="rundown-card-right">
                  <span className={`rundown-type-pill ${getTypeClass(item.type)}`}>
                    {item.type}
                  </span>
                  <button
                    type="button"
                    className="rundown-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteItem(item.id);
                    }}
                    title="Delete item"
                  >
                    <TrashIcon size={11} />
                  </button>
                </div>
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
