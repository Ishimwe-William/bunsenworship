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
  RundownItemType,
} from '../../store/features/presentation';
import { RundownItem } from '../../store/features/presentation/types';
import {
  PlusIcon,
  GripVerticalIcon,
  ClockIcon,
  TrashIcon,
  VideoIcon,
  YoutubeIcon,
  MusicIcon,
  PresentationIcon,
  RepeatIcon,
  FileTextIcon,
  ImageIcon,
  LayersIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '../common/Icons';
import { createNewRundownItem } from '../../utils/liveShowHelpers';
import {
  normalizeVideoSource,
  generateVideoThumbnail,
  getYouTubeThumbnailUrl,
  extractYouTubeId,
  parseYouTubeId,
} from '../../utils/videoHelpers';

export interface ServiceRundownProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const ServiceRundown: React.FC<ServiceRundownProps> = ({
  isCollapsed = false,
  onToggleCollapse,
}) => {
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
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      if (
        target?.closest('input, textarea, select, button, summary, [role="button"], [role="separator"]') ||
        target?.isContentEditable
      ) {
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
      const isYtSelected = newVideoSource === 'youtube';
      const sampleUrl = isYtSelected
        ? 'https://www.youtube.com/watch?v=nQWFzMvCfLE'
        : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
      const rawUrl = newVideoUrl.trim() || sampleUrl;
      const ytId = parseYouTubeId(rawUrl);
      const isYt = isYtSelected || Boolean(ytId);
      const finalUrl = isYt ? rawUrl : normalizeVideoSource(rawUrl);
      const ytThumb = isYt ? getYouTubeThumbnailUrl(rawUrl) : null;

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
            imageUrl: ytThumb || (isYt ? undefined : generateVideoThumbnail(newTitle.trim())),
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
    dispatch(deleteRundownItem(itemId));
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

  const renderAddModal = () => (
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
  );

  if (isCollapsed) {
    return (
      <aside className="service-rundown-col is-collapsed" aria-label="Service Schedule Rail">
        <div className="rundown-rail-header">
          {onToggleCollapse && (
            <button
              type="button"
              className="rundown-rail-btn expand-btn"
              onClick={onToggleCollapse}
              title="Expand Schedule (Show full rundown)"
              aria-label="Expand Schedule"
            >
              <ChevronRightIcon size={14} />
            </button>
          )}
          <button
            type="button"
            className="rundown-rail-btn add-btn"
            onClick={() => setShowAddModal(true)}
            title="Add item to rundown"
            aria-label="Add item to rundown"
          >
            <PlusIcon size={13} />
          </button>
        </div>

        <div className="rundown-rail-list">
          {rundown.map((item, index) => {
            const isSelected = item.id === selectedRundownId;
            const hasLive = item.id === liveRundownId;
            const itemNum = String(index + 1).padStart(2, '0');

            return (
              <button
                key={item.id}
                type="button"
                className={`rundown-rail-item ${isSelected ? 'selected' : ''} ${
                  hasLive ? 'has-live' : ''
                }`}
                onClick={() => dispatch(setSelectedRundownId(item.id))}
                title={`${itemNum}. ${item.title} (${item.type} • ${item.slides.length} slides) • Click to cue in Preview`}
                aria-label={`${item.title}, ${item.type}`}
                aria-pressed={isSelected}
              >
                <span className="rail-item-num">{itemNum}</span>
                <span className="rail-item-icon">
                  {item.type === 'VIDEO' || item.type === 'LOOP' ? (
                    <VideoIcon size={13} />
                  ) : item.type === 'IMAGE' ? (
                    <ImageIcon size={13} />
                  ) : item.type === 'PPT' || item.type === 'CANVA' ? (
                    <PresentationIcon size={13} />
                  ) : item.type === 'SERMON' ? (
                    <FileTextIcon size={13} />
                  ) : (
                    <MusicIcon size={13} />
                  )}
                </span>
                {hasLive && <span className="rail-live-indicator" title="Currently Live / On Air" />}
              </button>
            );
          })}
        </div>

        <div className="rundown-rail-footer" title={`${rundown.length} schedule items`}>
          <span className="rail-stat-badge">{rundown.length}</span>
        </div>

        {showAddModal && renderAddModal()}
      </aside>
    );
  }

  return (
    <aside className="service-rundown-col">
      <div className="rundown-header">
        <div className="console-section-heading">
          <span className="console-section-index">01</span>
          <div className="console-section-heading-copy">
            <span>Run of show</span>
            <h3 className="rundown-header-title">Service Rundown</h3>
          </div>
        </div>
        <div className="rundown-header-controls">
          <div className="rundown-stats">
            <span className="rundown-stat" title={`Estimated service duration: ${calculateEstimatedDuration()} minutes`}>
              <ClockIcon size={12} />
              {calculateEstimatedDuration()}m
            </span>
            <span className="rundown-stat" title={`Total slides in this service: ${calculateTotalSlides()}`}>
              <LayersIcon size={12} />
              {calculateTotalSlides()}
            </span>
          </div>
          <button
            type="button"
            className="rundown-add-btn"
            onClick={() => setShowAddModal(true)}
            title="Add item to rundown"
            aria-label="Add item to rundown"
          >
            <PlusIcon size={14} />
          </button>
          {onToggleCollapse && (
            <button
              type="button"
              className="rundown-collapse-btn"
              onClick={onToggleCollapse}
              title="Collapse Schedule to maximize Preview & Live"
              aria-label="Collapse Schedule"
            >
              <ChevronLeftIcon size={13} />
            </button>
          )}
        </div>
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
          const isYouTubeItem = item.slides.some((s) => Boolean(extractYouTubeId(s)));
          const cleanSubtitle = item.subtitle
            ? item.subtitle
                .replace(/\(Key\s+[A-Ga-g][b#]?\)/gi, '')
                .replace(/Key\s+of\s+[A-Ga-g][b#]?\s*•?\s*/gi, '')
                .replace(/\b(4K|1080p|720p|16:9|UHD)\b\s*•?\s*/gi, '')
                .replace(/\b\d+:\d+\b\s*•?\s*/gi, '')
                .replace(/\b\d+\s*Min\b\s*/gi, '')
                .replace(/\s*•\s*(Hymn|Lyrics|Media|Static)\b/gi, '')
                .replace(/^\s*[•\-–]\s*|\s*[•\-–]\s*$/g, '')
                .trim()
            : '';

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
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  dispatch(setSelectedRundownId(item.id));
                }
              }}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              aria-label={`${item.title}, ${item.time}, ${item.slides.length} slides${
                hasLive ? ', on air' : ''
              }`}
              title="Click to select • Drag to rearrange order"
            >
              <div className="rundown-accent-bar" />
              <div className="rundown-card-top">
                <div className="rundown-card-left">
                  <span className="card-drag-handle" title="Drag to rearrange order">
                    <GripVerticalIcon size={13} />
                  </span>
                  <span className="rundown-sequence">{String(index + 1).padStart(2, '0')}</span>
                  <span className="rundown-time">{item.time}</span>
                </div>
                <div className="rundown-card-right">
                  <span className={`rundown-type-pill ${getTypeClass(item.type)}`} title={`Type: ${item.type}`}>
                    <span className="rundown-type-content">
                      {item.type === 'VIDEO' ? (
                        isYouTubeItem ? <YoutubeIcon size={10} /> : <VideoIcon size={10} />
                      ) : item.type === 'SONG' ? (
                        <MusicIcon size={10} />
                      ) : item.type === 'PPT' || item.type === 'CANVA' ? (
                        <PresentationIcon size={10} />
                      ) : item.type === 'LOOP' ? (
                        <RepeatIcon size={10} />
                      ) : item.type === 'SERMON' ? (
                        <FileTextIcon size={10} />
                      ) : (
                        <ImageIcon size={10} />
                      )}
                      <span>{item.type}</span>
                    </span>
                  </span>
                  <button
                    type="button"
                    className="rundown-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteItem(item.id);
                    }}
                    title={`Delete ${item.title}`}
                    aria-label={`Delete ${item.title}`}
                  >
                    <TrashIcon size={11} />
                  </button>
                </div>
              </div>
              <h4 className="rundown-item-title" title={item.title}>
                {item.title}
              </h4>
              {cleanSubtitle && (
                <p className="rundown-item-subtitle" title={cleanSubtitle}>
                  {cleanSubtitle}
                </p>
              )}
              <div className="rundown-card-footer">
                <span className="rundown-slide-count" title={`${item.slides.length} slides`}>
                  <LayersIcon size={11} /> {item.slides.length}
                </span>
                {hasLive && (
                  <span className="rundown-live-badge" title="Currently on air on sanctuary output">
                    <span />
                    On air
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rundown-footer-hint">
        <GripVerticalIcon size={12} />
        <span>Click to preview · Drag to reorder</span>
      </div>

      {showAddModal && renderAddModal()}
    </aside>
  );
};
