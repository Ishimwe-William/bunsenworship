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
  DEFAULT_RUNDOWN,
} from '../../store/features/presentation';
import { RundownItem } from '../../store/features/presentation/types';
import { PlusIcon, GripVerticalIcon, ClockIcon, TrashIcon, VideoIcon, YoutubeIcon } from '../common/Icons';
import { bunsenDb } from '../../db';
import { createNewRundownItem } from '../../utils/liveShowHelpers';
import { normalizeVideoSource, generateVideoThumbnail } from '../../utils/videoHelpers';

export const ServiceRundown: React.FC = () => {
  const dispatch = useAppDispatch();
  const rundown = useAppSelector(selectRundown);
  const selectedRundownId = useAppSelector(selectSelectedRundownId);
  const liveRundownId = useAppSelector(selectLiveRundownId);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newTime, setNewTime] = useState('09:30');
  const [newType, setNewType] = useState<RundownItemType>('VIDEO');
  const [newVideoSource, setNewVideoSource] = useState<'local' | 'youtube'>('local');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoLoop, setNewVideoLoop] = useState(true);
  const addVideoFileInputRef = useRef<HTMLInputElement>(null);

  const handleBrowseAddVideo = async () => {
    if (window.electronAPI?.openVideoDialog) {
      try {
        const selected = await window.electronAPI.openVideoDialog();
        if (selected) {
          setNewVideoUrl(selected);
          if (!newTitle.trim()) {
            const fileName = selected.split(/[/\\]/).pop() || '';
            const cleanName = fileName.replace(/\.[^/.]+$/, '');
            setNewTitle(cleanName);
          }
        }
      } catch (err) {
        console.error('Failed to open video file dialog:', err);
      }
    } else {
      addVideoFileInputRef.current?.click();
    }
  };

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<'above' | 'below' | null>(null);



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

    let newItem: Omit<RundownItem, 'id'>;

    if (newType === 'VIDEO') {
      const isYt = newVideoSource === 'youtube';
      const sampleUrl = isYt
        ? 'https://www.youtube.com/watch?v=nQWFzMvCfLE'
        : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
      const rawUrl = newVideoUrl.trim() || sampleUrl;
      const finalUrl = isYt ? rawUrl : normalizeVideoSource(rawUrl);

      newItem = {
        title: newTitle.trim(),
        subtitle: newSubtitle.trim() || (isYt ? 'YouTube Video Stream' : 'Local Video Playback'),
        time: newTime || '09:30',
        type: 'VIDEO',
        slides: [
          {
            id: `s-vid-${Date.now()}`,
            section: newTitle.trim() || (isYt ? 'YouTube Video' : 'Video Playback'),
            lines: [],
            imageUrl: isYt ? undefined : generateVideoThumbnail(newTitle.trim()),
            videoType: isYt ? 'youtube' : 'local',
            videoUrl: finalUrl,
            videoPath: finalUrl,
            youtubeUrl: isYt ? finalUrl : undefined,
            autoPlay: true,
            loop: newVideoLoop,
            videoLoop: newVideoLoop,
            videoFit: 'contain',
            videoTitle: newTitle.trim(),
            videoMuted: true,
          },
        ],
      };
    } else {
      newItem = createNewRundownItem(newTitle.trim(), newType, newTime || '09:30');
      newItem.subtitle = newSubtitle.trim() || 'Custom worship item';
    }

    dispatch(addRundownItem(newItem));

    setNewTitle('');
    setNewSubtitle('');
    setNewVideoUrl('');
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
        case 'VIDEO':
          return minutes + 5;
        case 'SERMON':
          return minutes + 35;
        case 'PPT':
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
          const hasVideoSlide = item.slides.some(
            (s) => (s.videoType && s.videoType !== 'none') || s.videoUrl || s.youtubeUrl
          );
          const isYouTubeItem = item.slides.some((s) => s.videoType === 'youtube' || s.youtubeUrl);

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
                    {item.type === 'VIDEO' ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        {isYouTubeItem ? <YoutubeIcon size={10} /> : <VideoIcon size={10} />}
                        VIDEO
                      </span>
                    ) : hasVideoSlide ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <VideoIcon size={10} />
                        {item.type}
                      </span>
                    ) : (
                      item.type
                    )}
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
              <input
                type="file"
                ref={addVideoFileInputRef}
                accept="video/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const fullPath = window.electronAPI?.getPathForFile?.(file) || URL.createObjectURL(file);
                    setNewVideoUrl(fullPath);
                    if (!newTitle.trim()) {
                      const cleanName = file.name.replace(/\.[^/.]+$/, '');
                      setNewTitle(cleanName);
                    }
                  }
                }}
              />
              <div>
                <label className="status-label" style={{ display: 'block', marginBottom: '4px' }}>
                  Item Title
                </label>
                <input
                  type="text"
                  className="auth-input"
                  placeholder="e.g. Way Maker / Sanctuary Video Loop"
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
                    <option value="VIDEO">VIDEO (Playback / YouTube)</option>
                    <option value="SONG">SONG (Worship)</option>
                    <option value="LOOP">LOOP (Motion)</option>
                    <option value="IMAGE">IMAGE (Graphic / Slide)</option>
                    <option value="SERMON">SERMON (Message)</option>
                    <option value="PPT">PPT (PowerPoint)</option>
                    <option value="CANVA">CANVA (Presentation)</option>
                  </select>
                </div>
              </div>

              {newType === 'VIDEO' && (
                <div
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label className="status-label" style={{ fontWeight: 700 }}>
                      Video Source
                    </label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        className={`console-mini-btn ${newVideoSource === 'local' ? 'active' : ''}`}
                        onClick={() => setNewVideoSource('local')}
                        style={{ padding: '2px 8px', fontSize: '0.675rem' }}
                      >
                        <VideoIcon size={11} />
                        <span>Local MP4</span>
                      </button>
                      <button
                        type="button"
                        className={`console-mini-btn ${newVideoSource === 'youtube' ? 'active' : ''}`}
                        onClick={() => setNewVideoSource('youtube')}
                        style={{ padding: '2px 8px', fontSize: '0.675rem' }}
                      >
                        <YoutubeIcon size={11} />
                        <span>YouTube</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      className="status-label"
                      style={{ display: 'block', marginBottom: '4px', fontSize: '0.68rem' }}
                    >
                      {newVideoSource === 'youtube'
                        ? 'YouTube URL / Stream Link:'
                        : 'Local Video File Path or URL:'}
                    </label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        className="auth-input"
                        placeholder={
                          newVideoSource === 'youtube'
                            ? 'https://www.youtube.com/watch?v=... (Leave blank for sample)'
                            : 'C:\\Videos\\video.mp4 or URL (Leave blank for sample)'
                        }
                        value={newVideoUrl}
                        onChange={(e) => setNewVideoUrl(e.target.value)}
                        style={{ fontSize: '0.75rem', padding: '6px', flex: 1 }}
                      />
                      {newVideoSource === 'local' && (
                        <button
                          type="button"
                          className="console-mini-btn"
                          onClick={handleBrowseAddVideo}
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.72rem',
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                          }}
                          title="Open native Windows file dialog to choose video"
                        >
                          <VideoIcon size={12} />
                          <span>Browse...</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={newVideoLoop}
                      onChange={(e) => setNewVideoLoop(e.target.checked)}
                    />
                    <span>Loop video playback continuously</span>
                  </label>
                </div>
              )}

              <div>
                <label className="status-label" style={{ display: 'block', marginBottom: '4px' }}>
                  Subtitle / Notes
                </label>
                <input
                  type="text"
                  className="auth-input"
                  placeholder="e.g. Cinematic Motion Loop / 4K MP4"
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
