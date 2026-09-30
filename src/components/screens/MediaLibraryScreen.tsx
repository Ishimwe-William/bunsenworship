import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppDispatch } from '../../store/hooks';
import {
  addRundownItem,
  addCustomBackgroundTheme,
  RundownItem,
} from '../../store/features/presentation';
import { setActiveTab } from '../../store/features/navigation';
import {
  bunsenDb,
  SongRecord,
  ExternalPresentationRecord,
  ImageMediaRecord,
  SEED_SONGS,
  SEED_EXTERNAL_PRESENTATIONS,
  SEED_IMAGES,
} from '../../db';
import {
  PRO_MEDIA_ASSETS,
  ProMediaAsset,
} from './mediaLibraryData';
import {
  normalizeVideoSource,
  generateVideoThumbnail,
  getYouTubeThumbnailUrl,
  extractYouTubeId,
} from '../../utils/videoHelpers';
import {
  parseCanvaDesignId,
  buildCanvaEmbedUrl,
  generateCanvaThumbnail,
} from '../../utils/presentationHelpers';
import {
  SearchIcon,
  PlusIcon,
  LinkIcon,
  DownloadIcon,
  UploadIcon,
  CheckIcon,
  RefreshCwIcon,
  FolderIcon,
  ImageIcon,
  MusicIcon,
  VideoIcon,
  PresentationIcon,
  PencilIcon,
  TrashIcon,
} from '../common/Icons';
import { useLanguage } from '../language';
import './MediaLibraryScreen.css';

type MediaSourceCategory =
  | 'ALL'
  | 'POWERPOINT'
  | 'VIDEO'
  | 'SPEAKER_DECK'
  | 'ANNOUNCEMENTS'
  | 'SONGS'
  | 'CANVA';

type FormatFilter = 'ALL' | 'VIDEOS' | 'POWERPOINTS' | 'IMAGES' | 'CANVA' | 'SONGS';

type ModalTab = 'VIDEO' | 'PPT' | 'IMAGE' | 'CANVA' | 'SONG' | 'BACKUP';

// Converts an absolute on-disk path to a bunsen-media:// URL for safe local streaming
const toMediaUrl = (absPath: string): string => {
  if (!absPath) return '';
  if (
    absPath.startsWith('data:') ||
    absPath.startsWith('http://') ||
    absPath.startsWith('https://') ||
    absPath.startsWith('blob:') ||
    absPath.startsWith('bunsen-media://')
  ) {
    return absPath;
  }
  const forward = absPath.replace(/\\/g, '/');
  if (/^[a-zA-Z]:\//.test(forward) || forward.startsWith('/')) {
    return `bunsen-media://${forward.startsWith('/') ? '' : '/'}${forward}`;
  }
  return `bunsen-media:///${forward}`;
};

export const MediaLibraryScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { t } = useLanguage();

  // Navigation & filter state
  const [selectedSource, setSelectedSource] = useState<MediaSourceCategory>('ALL');
  const [activeFilter, setActiveFilter] = useState<FormatFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<{
    text: string;
    type: 'success' | 'error';
    action?: { label: string; onClick: () => void };
  } | null>(null);
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});

  // Loaded database data
  const [songs, setSongs] = useState<SongRecord[]>([]);
  const [images, setImages] = useState<ImageMediaRecord[]>([]);
  const [externalDecks, setExternalDecks] = useState<ExternalPresentationRecord[]>([]);
  const [customAssets, setCustomAssets] = useState<ProMediaAsset[]>([]);
  const [deletedAssetIds, setDeletedAssetIds] = useState<string[]>([]);

  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSongModal, setShowSongModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [modalTab, setModalTab] = useState<'VIDEO' | 'PPT' | 'IMAGE' | 'CANVA'>('VIDEO');

  // Edit Modal states (Update CRUD)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<ProMediaAsset | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<MediaSourceCategory>('VIDEO');
  const [editDuration, setEditDuration] = useState('0:30');
  const [editFilePath, setEditFilePath] = useState('');
  const [editCanvaUrl, setEditCanvaUrl] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [editLyrics, setEditLyrics] = useState('');

  // Form states - Video / Motion Loop
  const [videoTitle, setVideoTitle] = useState('');
  const [videoFormat, setVideoFormat] = useState<'MOV' | 'MP4'>('MP4');
  const [videoDuration, setVideoDuration] = useState('0:30');
  const [videoDataUrl, setVideoDataUrl] = useState('');
  const [videoFilePath, setVideoFilePath] = useState('');
  const [videoYoutubeUrl, setVideoYoutubeUrl] = useState('');
  const [videoSourceType, setVideoSourceType] = useState<'file' | 'youtube'>('file');

  // Form states - PPT
  const [pptTitle, setPptTitle] = useState('');
  const [pptFilePath, setPptFilePath] = useState('');
  const [pptSourceType, setPptSourceType] = useState<'file' | 'url'>('file');
  const [pptUrl, setPptUrl] = useState('');

  // Form states - Image
  const [imgTitle, setImgTitle] = useState('');
  const [imgDataUrl, setImgDataUrl] = useState('');
  const [imgSourceType, setImgSourceType] = useState<'file' | 'url'>('file');
  const [imgUrl, setImgUrl] = useState('');

  // Form states - Canva
  const [canvaTitle, setCanvaTitle] = useState('');
  const [canvaUrl, setCanvaUrl] = useState('');

  // Form states - Song
  const [songTitle, setSongTitle] = useState('');
  const [songArtist, setSongArtist] = useState('');
  const [songLyrics, setSongLyrics] = useState('');
  const [songBgType, setSongBgType] = useState<'color' | 'gradient' | 'image' | 'shortvid'>('gradient');
  const [songBgValue, setSongBgValue] = useState<string>(
    'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)'
  );
  const [songCustomColor, setSongCustomColor] = useState('#1e1b4b');
  const [songCustomMediaUrl, setSongCustomMediaUrl] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const pptFileInputRef = useRef<HTMLInputElement>(null);
  const imgFileInputRef = useRef<HTMLInputElement>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  const PRESET_COLORS = [
    { name: 'Slate', color: '#0f172a' },
    { name: 'Midnight', color: '#1e1b4b' },
    { name: 'Emerald', color: '#064e3b' },
    { name: 'Crimson', color: '#4c0519' },
    { name: 'Charcoal', color: '#18181b' },
    { name: 'Royal', color: '#2e1065' },
    { name: 'Deep Teal', color: '#134e4a' },
  ];

  const PRESET_GRADIENTS = [
    { name: 'Midnight Indigo', gradient: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)' },
    { name: 'Deep Aurora', gradient: 'linear-gradient(135deg, #022c22 0%, #064e3b 50%, #0f766e 100%)' },
    { name: 'Royal Majesty', gradient: 'linear-gradient(135deg, #2e1065 0%, #4c1d95 50%, #7c3aed 100%)' },
    { name: 'Crimson Twilight', gradient: 'linear-gradient(135deg, #450a0a 0%, #7f1d1d 50%, #991b1b 100%)' },
    { name: 'Golden Sunset', gradient: 'linear-gradient(135deg, #1c1917 0%, #78350f 50%, #b45309 100%)' },
    { name: 'Ocean Deep', gradient: 'linear-gradient(135deg, #082f49 0%, #0369a1 50%, #0284c7 100%)' },
  ];

  const captureVideoThumbnail = (videoEl: HTMLVideoElement): string => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 270;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.85);
      }
    } catch {}
    return '';
  };

  const handleVideoFileChange = (file: File) => {
    const ext = file.name.split('.').pop()?.toUpperCase() || 'MP4';
    setVideoFormat(ext === 'MOV' ? 'MOV' : 'MP4');

    if (!videoTitle) {
      setVideoTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    let resolvedPath: string | undefined;
    if (window.electronAPI?.getPathForFile) {
      try {
        resolvedPath = window.electronAPI.getPathForFile(file);
      } catch {}
    }
    const rawPath = resolvedPath || (file as unknown as { path?: string }).path;
    const objectUrl = URL.createObjectURL(file);
    setVideoFilePath(rawPath || objectUrl);

    // Auto-detect duration and capture frame thumbnail
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.crossOrigin = 'anonymous';
      video.src = objectUrl;
      video.onloadedmetadata = () => {
        const totalSec = Math.floor(video.duration || 0);
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        setVideoDuration(`${mins}:${secs.toString().padStart(2, '0')}`);
        video.currentTime = Math.min(1.0, (video.duration || 0) / 2);
      };
      video.onseeked = () => {
        const thumb = captureVideoThumbnail(video);
        if (thumb) setVideoDataUrl(thumb);
      };
    } catch (e) {
      console.debug('Could not auto-process video metadata:', e);
    }
  };

  const handleBrowseVideoFile = async () => {
    if (window.electronAPI?.openVideoDialog) {
      try {
        const selectedPath = await window.electronAPI.openVideoDialog();
        if (selectedPath) {
          setVideoFilePath(selectedPath);
          const filename = selectedPath.split(/[/\\]/).pop() || '';
          const ext = filename.split('.').pop()?.toUpperCase() || 'MP4';
          setVideoFormat(ext === 'MOV' ? 'MOV' : 'MP4');
          if (!videoTitle) {
            setVideoTitle(filename.replace(/\.[^/.]+$/, ''));
          }

          // Generate frame thumbnail and detect duration via bunsen-media URL
          try {
            const mediaUrl = toMediaUrl(selectedPath);
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.muted = true;
            video.crossOrigin = 'anonymous';
            video.src = mediaUrl;
            video.onloadedmetadata = () => {
              const totalSec = Math.floor(video.duration || 0);
              const mins = Math.floor(totalSec / 60);
              const secs = totalSec % 60;
              setVideoDuration(`${mins}:${secs.toString().padStart(2, '0')}`);
              video.currentTime = Math.min(1.0, (video.duration || 0) / 2);
            };
            video.onseeked = () => {
              const thumb = captureVideoThumbnail(video);
              if (thumb) setVideoDataUrl(thumb);
            };
          } catch {}
          return;
        }
      } catch (err) {
        console.warn('Native openVideoDialog failed, falling back to input:', err);
      }
    }
    videoFileInputRef.current?.click();
  };

  const handleBrowsePptFile = async () => {
    if (window.electronAPI?.openPresentationDialog) {
      try {
        const selectedPath = await window.electronAPI.openPresentationDialog();
        if (selectedPath) {
          setPptFilePath(selectedPath);
          const filename = selectedPath.split(/[/\\]/).pop() || '';
          if (!pptTitle) {
            setPptTitle(filename.replace(/\.[^/.]+$/, ''));
          }
          return;
        }
      } catch (err) {
        console.warn('Native openPresentationDialog failed, falling back to input:', err);
      }
    }
    pptFileInputRef.current?.click();
  };

  const handleCanvaUrlChange = (url: string) => {
    setCanvaUrl(url);
    if (!canvaTitle || canvaTitle.startsWith('Canva')) {
      try {
        const parsed = new URL(url);
        const segments = parsed.pathname.split('/').filter(Boolean);
        if (segments.length >= 3 && segments[0] === 'design') {
          const potentialSlug = segments[2] !== 'view' && segments[2] !== 'edit' ? segments[2] : null;
          if (potentialSlug) {
            const formatted = potentialSlug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
            setCanvaTitle(formatted);
            return;
          }
        }
        const designId = parseCanvaDesignId(url);
        if (designId) {
          setCanvaTitle(`Canva Design ${designId}`);
        }
      } catch {}
    }
  };

  const handleBackgroundPptImport = async (targetTitle: string, source: string) => {
    const normTitle = targetTitle.trim() || 'PowerPoint Presentation';
    showFeedback(`Importing "${normTitle}" in the background...`, 'success');

    try {
      const exportResult = (await window.electronAPI?.exportPowerPoint?.(source)) ?? null;
      const hasSlides = Boolean(exportResult?.slides && exportResult.slides.length > 0);
      const hasImages = Boolean(exportResult?.images && exportResult.images.length > 0);

      if (!exportResult || !exportResult.ok || (!hasSlides && !hasImages)) {
        throw new Error(
          exportResult?.error || 'Failed to extract slides. Check that Microsoft PowerPoint is installed and opens the file.'
        );
      }

      const slideCount = exportResult.slideCount || exportResult.slides?.length || exportResult.images?.length || 0;
      const slides: ExternalPresentationRecord['slides'] = hasSlides && exportResult.slides
        ? exportResult.slides.map((s, i) => {
            const diskImagePath = exportResult.images?.[i];
            const mediaUrl = diskImagePath ? toMediaUrl(diskImagePath) : s.thumbnailDataUrl;
            return {
              id: `s-${Date.now()}-${i + 1}`,
              section: s.title || (i === 0 ? 'Title Slide' : `Slide ${i + 1}`),
              lines: s.lines || [],
              externalType: 'PPT',
              imageUrl: mediaUrl,
              imageFit: 'contain',
              slideData: s,
              slideHtml: s.html,
            };
          })
        : (exportResult.images || []).map((absPath, i) => ({
            id: `s-${Date.now()}-${i + 1}`,
            section: i === 0 ? 'Title Slide' : `Slide ${i + 1}`,
            lines: [] as string[],
            externalType: 'PPT',
            imageUrl: toMediaUrl(absPath),
            imageFit: 'contain',
          }));

      const resolvedFilePath = exportResult.filePath || source;
      const pptRecord: ExternalPresentationRecord = {
        id: `ppt-${Date.now()}`,
        title: normTitle || exportResult.title || 'PowerPoint Presentation',
        type: 'PPT',
        filePath: resolvedFilePath,
        slideCount,
        slideImages: exportResult.images || [],
        slides,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await bunsenDb.saveExternalPresentation(pptRecord);

      if (window.electronAPI?.watchPresentation && resolvedFilePath && !resolvedFilePath.startsWith('http')) {
        window.electronAPI.watchPresentation(resolvedFilePath).catch(() => {});
      }

      await loadDatabaseRecords();
      showFeedback(`PowerPoint "${pptRecord.title}" imported with ${slideCount} dynamic slide${slideCount === 1 ? '' : 's'}!`);
    } catch (err) {
      console.error('Background PPTX export failed:', err);
      showFeedback(err instanceof Error ? err.message : 'Failed to import PowerPoint file in background.', 'error');
    }
  };

  // Load records from local DB
  const loadDatabaseRecords = async () => {
    try {
      const [allSongs, allImages, allDecks, savedCustom, savedDeleted] = await Promise.all([
        bunsenDb.getAllSongs(),
        bunsenDb.getAllImages(),
        bunsenDb.getAllExternalPresentations(),
        bunsenDb.getSetting<ProMediaAsset[]>('pro_media_custom_assets', []),
        bunsenDb.getSetting<string[]>('pro_media_deleted_assets', []),
      ]);
      setSongs(allSongs);
      setImages(allImages);
      setExternalDecks(allDecks);

      if (savedCustom) {
        setCustomAssets(savedCustom);
      }
      if (savedDeleted) {
        setDeletedAssetIds(savedDeleted);
      }
    } catch (err) {
      console.error('Failed to load records from BunsenWorshipDB:', err);
    }
  };

  useEffect(() => {
    loadDatabaseRecords();
  }, []);

  const showFeedback = (
    text: string,
    type: 'success' | 'error' = 'success',
    action?: { label: string; onClick: () => void }
  ) => {
    setFeedbackMessage({ text, type, action });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4500);
  };

  const markAddedFeedback = (id: string) => {
    setAddedItemIds((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setAddedItemIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }, 1800);
  };

  // Combine baseline Pro Assets with DB items & custom assets
  const allMediaItems = useMemo<ProMediaAsset[]>(() => {
    const list: ProMediaAsset[] = [
      ...PRO_MEDIA_ASSETS.filter((item) => !deletedAssetIds.includes(item.id)),
      ...customAssets.filter((item) => !deletedAssetIds.includes(item.id)),
    ];

    // Add user's DB songs as assets
    songs.forEach((song) => {
      const exists = list.some((item) => item.id === `song-${song.id}`);
      if (!exists && !deletedAssetIds.includes(`song-${song.id}`)) {
        let safeThumbnail = '';
        if (song.bgType === 'image' && song.bgValue) {
          safeThumbnail = song.bgValue;
        } else {
          const bgFill =
            song.bgType === 'color' && song.bgValue
              ? song.bgValue
              : 'url(#sGrad)';

          safeThumbnail = `data:image/svg+xml;utf8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" width="960" height="540">
              <defs>
                <linearGradient id="sGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stop-color="#1e1b4b"/>
                  <stop offset="60%" stop-color="#312e81"/>
                  <stop offset="100%" stop-color="#0f172a"/>
                </linearGradient>
              </defs>
              <rect width="960" height="540" fill="${bgFill}"/>
              <circle cx="480" cy="220" r="70" fill="none" stroke="#818cf8" stroke-width="3" opacity="0.6"/>
              <g stroke="#a5b4fc" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none" transform="translate(456, 192) scale(2)">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" fill="#a5b4fc"/>
                <circle cx="18" cy="16" r="3" fill="#a5b4fc"/>
              </g>
              <text x="480" y="340" font-family="-apple-system, sans-serif" font-size="34" font-weight="800" fill="#ffffff" text-anchor="middle">${song.title}</text>
              <text x="480" y="385" font-family="-apple-system, sans-serif" font-size="18" fill="#cbd5e1" text-anchor="middle">${song.artist || 'Worship Track'}</text>
            </svg>
          `.trim())}`;
        }

        list.push({
          id: `song-${song.id}`,
          title: song.title,
          format: 'SONG',
          resolution: 'Lyrics',
          durationOrSlides: `${song.slides.length} Slides`,
          sourceCategory: 'SONGS',
          thumbnailUrl: safeThumbnail,
          slidesCount: song.slides.length,
          tags: song.tags,
        });
      }
    });

    // Add external presentations from DB
    externalDecks.forEach((deck) => {
      const exists = list.some((item) => item.id === `deck-${deck.id}`);
      if (!exists && !deletedAssetIds.includes(`deck-${deck.id}`)) {
        list.push({
          id: `deck-${deck.id}`,
          title: deck.title,
          format: deck.type === 'PPT' ? 'PPTX' : 'CANVA',
          resolution: deck.type === 'PPT' ? 'PowerPoint' : 'Canva',
          durationOrSlides: `${deck.slideCount || deck.slides.length} Slides`,
          sourceCategory: deck.type === 'PPT' ? 'POWERPOINT' : 'CANVA',
          thumbnailUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" width="960" height="540">
              <rect width="960" height="540" fill="${deck.type === 'PPT' ? '#1c1917' : '#083344'}"/>
              <rect x="40" y="40" width="880" height="460" rx="8" fill="none" stroke="${deck.type === 'PPT' ? '#ea580c' : '#06b6d4'}" stroke-width="2" opacity="0.5"/>
              <text x="480" y="240" font-family="-apple-system, sans-serif" font-size="36" font-weight="800" fill="#ffffff" text-anchor="middle">${deck.title}</text>
              <text x="480" y="295" font-family="-apple-system, sans-serif" font-size="18" fill="${deck.type === 'PPT' ? '#fdba74' : '#67e8f9'}" text-anchor="middle">${deck.type === 'PPT' ? 'PowerPoint Presentation' : 'Canva Visual Deck'}</text>
            </svg>
          `.trim())}`,
          filePath: deck.filePath,
          canvaUrl: deck.canvaUrl,
          slidesCount: deck.slideCount || deck.slides.length,
        });
      }
    });

    // Add user images from DB
    images.forEach((img) => {
      const exists = list.some((item) => item.id === `img-${img.id}`);
      if (!exists && !deletedAssetIds.includes(`img-${img.id}`)) {
        list.push({
          id: `img-${img.id}`,
          title: img.title,
          format: 'PNG',
          resolution: 'HD Image',
          durationOrSlides: 'Static',
          sourceCategory:
            img.category === 'ANNOUNCEMENT'
              ? 'ANNOUNCEMENTS'
              : img.category === 'SERMON'
              ? 'SPEAKER_DECK'
              : 'VIDEO',
          thumbnailUrl: img.dataUrl,
        });
      }
    });

    return list;
  }, [songs, externalDecks, images, customAssets, deletedAssetIds]);

  // Compute counts for sidebar categories
  const sourceCounts = useMemo(() => {
    return {
      ALL: allMediaItems.length,
      POWERPOINT: allMediaItems.filter((i) => i.format === 'PPTX' || i.sourceCategory === 'POWERPOINT').length,
      VIDEO: allMediaItems.filter((i) => i.format === 'MOV' || i.format === 'MP4' || i.sourceCategory === 'VIDEO').length,
      SPEAKER_DECK: allMediaItems.filter((i) => i.sourceCategory === 'SPEAKER_DECK').length,
      ANNOUNCEMENTS: allMediaItems.filter((i) => i.sourceCategory === 'ANNOUNCEMENTS').length,
      SONGS: allMediaItems.filter((i) => i.format === 'SONG' || i.sourceCategory === 'SONGS').length,
      CANVA: allMediaItems.filter((i) => i.format === 'CANVA' || i.sourceCategory === 'CANVA').length,
    };
  }, [allMediaItems]);

  // Filter cards based on selected source, search query, and format filter
  const displayedItems = useMemo(() => {
    let list = allMediaItems;

    // Filter by Media Source (left sidebar)
    if (selectedSource !== 'ALL') {
      list = list.filter((item) => {
        if (selectedSource === 'POWERPOINT') return item.format === 'PPTX' || item.sourceCategory === 'POWERPOINT';
        if (selectedSource === 'VIDEO') return item.format === 'MOV' || item.format === 'MP4' || item.sourceCategory === 'VIDEO';
        if (selectedSource === 'SPEAKER_DECK') return item.sourceCategory === 'SPEAKER_DECK';
        if (selectedSource === 'ANNOUNCEMENTS') return item.sourceCategory === 'ANNOUNCEMENTS';
        if (selectedSource === 'SONGS') return item.format === 'SONG' || item.sourceCategory === 'SONGS';
        if (selectedSource === 'CANVA') return item.format === 'CANVA' || item.sourceCategory === 'CANVA';
        return true;
      });
    }

    // Filter by format pill (top right)
    if (activeFilter !== 'ALL') {
      list = list.filter((item) => {
        if (activeFilter === 'VIDEOS') return item.format === 'MOV' || item.format === 'MP4';
        if (activeFilter === 'POWERPOINTS') return item.format === 'PPTX';
        if (activeFilter === 'IMAGES') return item.format === 'PNG' || item.format === 'JPG';
        if (activeFilter === 'CANVA') return item.format === 'CANVA';
        if (activeFilter === 'SONGS') return item.format === 'SONG';
        return true;
      });
    }

    // Search query filter
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.format.toLowerCase().includes(q) ||
          (item.resolution && item.resolution.toLowerCase().includes(q)) ||
          (item.tags && item.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    return list;
  }, [allMediaItems, selectedSource, activeFilter, searchQuery]);

  // Action: Add item to current active Presentation Rundown
  const handleAddToRundown = (asset: ProMediaAsset) => {
    let itemToCreate: Omit<RundownItem, 'id'>;

    if (asset.format === 'SONG') {
      const cleanId = asset.id.replace('song-', '');
      const matchedSong = songs.find(
        (s) =>
          s.id === asset.id ||
          s.id === cleanId ||
          `song-${s.id}` === asset.id ||
          s.title.toLowerCase().trim() === asset.title.toLowerCase().trim()
      );
      itemToCreate = {
        title: asset.title,
        subtitle: matchedSong?.artist || 'Worship',
        time: '09:15',
        type: 'SONG',
        slides:
          matchedSong && matchedSong.slides && matchedSong.slides.length > 0
            ? matchedSong.slides
            : [
                {
                  id: `s-${Date.now()}-1`,
                  section: 'Verse 1',
                  lines: [asset.title, 'Worship Lyric line 1'],
                },
              ],
      };
    } else if (asset.format === 'PPTX') {
      const rawDeckId = asset.id.replace('deck-', '');
      const deck = externalDecks.find(
        (d) => d.id === rawDeckId || `deck-${d.id}` === asset.id
      );
      const deckSlides =
        deck && deck.slides && deck.slides.length > 0
          ? deck.slides.map((s) => ({ ...s, externalType: 'PPT' as const }))
          : [];
      itemToCreate = {
        title: asset.title,
        subtitle: 'PowerPoint Deck',
        time: '09:45',
        type: 'PPT',
        externalMeta: {
          type: 'PPT',
          filePath: deck?.filePath || asset.filePath,
          slideCount: deck?.slideCount || deckSlides.length,
        },
        slides:
          deckSlides.length > 0
            ? deckSlides
            : [
                {
                  id: `s-ppt-${Date.now()}-1`,
                  section: 'Title Slide',
                  lines: [asset.title],
                  imageUrl: asset.thumbnailUrl,
                  imageFit: 'contain',
                },
              ],
      };
    } else if (asset.format === 'CANVA') {
      const rawDeckId = asset.id.replace('deck-', '');
      const deck = externalDecks.find(
        (d) => d.id === rawDeckId || `deck-${d.id}` === asset.id
      );
      const deckSlides =
        deck && deck.slides && deck.slides.length > 0
          ? deck.slides.map((s) => ({ ...s, externalType: 'CANVA' as const }))
          : [];
      itemToCreate = {
        title: asset.title,
        subtitle: 'Canva Cloud Visual Presentation',
        time: '10:00',
        type: 'CANVA',
        externalMeta: {
          type: 'CANVA',
          canvaUrl: deck?.canvaUrl || asset.canvaUrl,
          embedUrl: deck?.embedUrl,
        },
        slides:
          deckSlides.length > 0
            ? deckSlides
            : [
                {
                  id: `s-canva-${Date.now()}-1`,
                  section: 'Presentation',
                  lines: [] as string[],
                  imageUrl: asset.thumbnailUrl,
                  imageFit: 'contain',
                },
              ],
      };
    } else {
      // Video / Still image
      const ytId = extractYouTubeId(asset);
      const isYouTube = Boolean(ytId);
      const isVideoAsset =
        isYouTube ||
        asset.format === 'MOV' ||
        asset.format === 'MP4' ||
        Boolean(asset.videoUrl || asset.filePath || asset.youtubeUrl);
      const resolvedVideoSrc = isYouTube
        ? (asset.youtubeUrl || asset.videoUrl || asset.filePath || '')
        : normalizeVideoSource(asset.videoUrl || asset.filePath || '');
      const resolvedThumb =
        asset.thumbnailUrl || (isYouTube ? getYouTubeThumbnailUrl(resolvedVideoSrc) : undefined);

      itemToCreate = {
        title: asset.title,
        subtitle: isVideoAsset ? 'Video' : 'Image',
        time: '09:00',
        type: isVideoAsset ? 'VIDEO' : 'IMAGE',
        slides: [
          {
            id: `s-media-${Date.now()}`,
            section: asset.title,
            lines: [],
            imageUrl: resolvedThumb,
            imageFit: 'cover',
            videoType: isYouTube ? 'youtube' : isVideoAsset ? 'local' : 'none',
            videoUrl: resolvedVideoSrc,
            videoPath: resolvedVideoSrc,
            youtubeUrl: isYouTube ? resolvedVideoSrc : undefined,
            autoPlay: true,
            loop: true,
            videoLoop: true,
            videoFit: 'contain',
            videoTitle: asset.title,
            videoMuted: true,
          },
        ],
      };
    }

    dispatch(addRundownItem(itemToCreate));

    markAddedFeedback(asset.id);
    showFeedback(
      `"${asset.title}" added to service rundown!`,
      'success',
      {
        label: t.mediaLibrary.viewInLiveShow || 'View in Live Show →',
        onClick: () => dispatch(setActiveTab('live-show')),
      }
    );
  };

  // Action: Set as active live presentation background
  const handleSetBackground = (asset: ProMediaAsset) => {
    dispatch(
      addCustomBackgroundTheme({
        id: `bg-asset-${asset.id}`,
        name: asset.title,
        gradient: asset.thumbnailUrl,
        accent: '#38bdf8',
        imageUrl: asset.thumbnailUrl,
      })
    );
    showFeedback(`"${asset.title}" set as active live background!`);
  };

  // Open Edit Modal for any media asset
  const handleOpenEdit = (item: ProMediaAsset) => {
    setEditingAsset(item);
    setEditTitle(item.title);
    setEditCategory(item.sourceCategory);
    setEditDuration(item.durationOrSlides || '0:30');
    setEditFilePath(item.filePath || '');
    setEditCanvaUrl(item.canvaUrl || '');

    if (item.format === 'SONG') {
      const rawSongId = item.id.replace('song-', '');
      const foundSong = songs.find((s) => s.id === rawSongId || `song-${s.id}` === item.id);
      setEditArtist(foundSong?.artist || '');
      if (foundSong && foundSong.slides.length > 0) {
        setEditLyrics(foundSong.slides.map((s) => s.lines.join('\n')).join('\n\n'));
      } else {
        setEditLyrics('');
      }
    }

    setShowEditModal(true);
  };

  // Save changes to edited asset
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset || !editTitle.trim()) return;

    const title = editTitle.trim();

    try {
      if (editingAsset.format === 'SONG' || editingAsset.id.startsWith('song-')) {
        const rawSongId = editingAsset.id.replace('song-', '');
        const foundSong = songs.find((s) => s.id === rawSongId || `song-${s.id}` === editingAsset.id);
        if (foundSong) {
          let slides = foundSong.slides;
          if (editLyrics.trim()) {
            const lyricBlocks = editLyrics.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
            slides = lyricBlocks.map((block, idx) => ({
              id: `s-${Date.now()}-${idx + 1}`,
              section: idx === 0 ? 'Verse 1' : idx === 1 ? 'Chorus' : `Verse ${idx + 1}`,
              lines: block.split('\n').map((l) => l.trim()).filter(Boolean),
            }));
          }
          const updatedSong: SongRecord = {
            ...foundSong,
            title,
            artist: editArtist.trim() || undefined,
            slides: slides.length > 0 ? slides : foundSong.slides,
            updatedAt: Date.now(),
          };
          await bunsenDb.saveSong(updatedSong);
        }
      } else if (
        editingAsset.format === 'PPTX' ||
        editingAsset.format === 'CANVA' ||
        editingAsset.id.startsWith('deck-')
      ) {
        const rawDeckId = editingAsset.id.replace('deck-', '');
        const foundDeck = externalDecks.find((d) => d.id === rawDeckId || `deck-${d.id}` === editingAsset.id);
        if (foundDeck) {
          const nextCanvaUrl = editCanvaUrl.trim() || foundDeck.canvaUrl;
          const nextDesignId =
            foundDeck.type === 'CANVA' ? parseCanvaDesignId(nextCanvaUrl) || foundDeck.designId : foundDeck.designId;
          const nextEmbedUrl =
            foundDeck.type === 'CANVA' && nextDesignId
              ? buildCanvaEmbedUrl(nextDesignId)
              : foundDeck.embedUrl;
          const updatedDeck: ExternalPresentationRecord = {
            ...foundDeck,
            title,
            filePath: editFilePath.trim() || foundDeck.filePath,
            canvaUrl: nextCanvaUrl,
            designId: nextDesignId || undefined,
            embedUrl: nextEmbedUrl,
            slides:
              foundDeck.type === 'CANVA'
                ? foundDeck.slides.map((s) =>
                    s.embedUrl
                      ? {
                          ...s,
                          embedUrl: nextEmbedUrl || s.embedUrl,
                        }
                      : s
                  )
                : foundDeck.slides,
            updatedAt: Date.now(),
          };
          await bunsenDb.saveExternalPresentation(updatedDeck);
        }
      } else if (editingAsset.id.startsWith('img-')) {
        const rawImgId = editingAsset.id.replace('img-', '');
        const foundImg = images.find((i) => i.id === rawImgId || `img-${i.id}` === editingAsset.id);
        if (foundImg) {
          const updatedImg: ImageMediaRecord = {
            ...foundImg,
            title,
            category:
              editCategory === 'ANNOUNCEMENTS'
                ? 'ANNOUNCEMENT'
                : editCategory === 'SPEAKER_DECK'
                ? 'SERMON'
                : 'BACKGROUND',
            updatedAt: Date.now(),
          };
          await bunsenDb.saveImage(updatedImg);
        }
      } else if (customAssets.some((a) => a.id === editingAsset.id)) {
        const updatedCustom = customAssets.map((a) =>
          a.id === editingAsset.id
            ? {
                ...a,
                title,
                sourceCategory: editCategory,
                durationOrSlides: editDuration,
              }
            : a
        );
        setCustomAssets(updatedCustom);
        await bunsenDb.setSetting('pro_media_custom_assets', updatedCustom);
      } else {
        // Baseline asset: mark original deleted and add customized version to customAssets
        const newDeleted = [...deletedAssetIds, editingAsset.id];
        const newCustomAsset: ProMediaAsset = {
          ...editingAsset,
          id: `asset-custom-${Date.now()}`,
          title,
          sourceCategory: editCategory,
          durationOrSlides: editDuration,
        };
        const updatedCustom = [newCustomAsset, ...customAssets];
        setDeletedAssetIds(newDeleted);
        setCustomAssets(updatedCustom);
        await bunsenDb.setSetting('pro_media_deleted_assets', newDeleted);
        await bunsenDb.setSetting('pro_media_custom_assets', updatedCustom);
      }

      await loadDatabaseRecords();
      setShowEditModal(false);
      setEditingAsset(null);
      showFeedback(t.mediaLibrary.assetUpdated || `"${title}" updated successfully!`);
    } catch (err) {
      console.error('Failed to update asset:', err);
      showFeedback('Failed to update media asset', 'error');
    }
  };

  // Delete any media asset
  const handleDeleteAsset = async (item: ProMediaAsset) => {
    const confirmTemplate = t.mediaLibrary.confirmDelete || 'Are you sure you want to delete "{title}" from your library?';
    const confirmMsg = confirmTemplate.replace('{title}', item.title);
    if (!window.confirm(confirmMsg)) return;

    try {
      if (item.id.startsWith('song-')) {
        const rawSongId = item.id.replace('song-', '');
        await bunsenDb.deleteSong(rawSongId);
      } else if (item.id.startsWith('deck-')) {
        const rawDeckId = item.id.replace('deck-', '');
        await bunsenDb.deleteExternalPresentation(rawDeckId);
      } else if (item.id.startsWith('img-')) {
        const rawImgId = item.id.replace('img-', '');
        await bunsenDb.deleteImage(rawImgId);
      } else if (customAssets.some((a) => a.id === item.id)) {
        const updated = customAssets.filter((a) => a.id !== item.id);
        setCustomAssets(updated);
        await bunsenDb.setSetting('pro_media_custom_assets', updated);
      } else {
        // Baseline asset: persist ID in deleted list
        const newDeleted = [...deletedAssetIds, item.id];
        setDeletedAssetIds(newDeleted);
        await bunsenDb.setSetting('pro_media_deleted_assets', newDeleted);
      }

      await loadDatabaseRecords();
      showFeedback(t.mediaLibrary.assetDeleted || `"${item.title}" removed from library!`);
    } catch (err) {
      console.error('Failed to delete asset:', err);
      showFeedback('Failed to delete media asset', 'error');
    }
  };

  // Handle uploading and saving new assets
  const handleSaveUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (modalTab === 'VIDEO') {
      if (!videoTitle.trim()) return;
      if (videoSourceType === 'file' && !videoFilePath.trim()) {
        showFeedback('Please select a video file or provide file path', 'error');
        return;
      }
      if (videoSourceType === 'youtube' && !videoYoutubeUrl.trim()) {
        showFeedback('Please provide a YouTube URL', 'error');
        return;
      }

      const rawPath = videoSourceType === 'file' ? (videoFilePath.trim() || videoDataUrl) : undefined;
      const normalizedPath = rawPath ? normalizeVideoSource(rawPath) : undefined;

      const isYt = videoSourceType === 'youtube' || Boolean(extractYouTubeId(videoYoutubeUrl));
      const ytThumb = isYt ? getYouTubeThumbnailUrl(videoYoutubeUrl.trim()) : null;
      const safeThumbnail =
        videoDataUrl && videoDataUrl.startsWith('data:image')
          ? videoDataUrl
          : ytThumb || generateVideoThumbnail(videoTitle.trim());

      const newAsset: ProMediaAsset = {
        id: `asset-video-${Date.now()}`,
        title: videoTitle.trim(),
        format: videoFormat,
        durationOrSlides: videoDuration || '0:30',
        sourceCategory: 'VIDEO',
        thumbnailUrl: safeThumbnail,
        filePath: isYt ? videoYoutubeUrl.trim() : normalizedPath,
        videoUrl: isYt ? videoYoutubeUrl.trim() : normalizedPath,
        youtubeUrl: isYt ? videoYoutubeUrl.trim() : undefined,
      };

      const updated = [newAsset, ...customAssets];
      setCustomAssets(updated);
      await bunsenDb.setSetting('pro_media_custom_assets', updated);
      setShowUploadModal(false);
      setVideoTitle('');
      setVideoDataUrl('');
      setVideoFilePath('');
      setVideoYoutubeUrl('');
      setVideoSourceType('file');
      showFeedback(`Video loop "${newAsset.title}" uploaded!`);
    } else if (modalTab === 'PPT') {
      if (!pptTitle.trim()) return;
      if (pptSourceType === 'file' && !pptFilePath.trim()) {
        showFeedback('Please select a PowerPoint file or provide file path', 'error');
        return;
      }
      if (pptSourceType === 'url' && !pptUrl.trim()) {
        showFeedback('Please provide a PowerPoint URL', 'error');
        return;
      }

      const pptSource = pptSourceType === 'file' ? pptFilePath.trim() : pptUrl.trim();
      const currentTitle = pptTitle.trim();

      // Close modal immediately and run import in background
      setShowUploadModal(false);
      setPptTitle('');
      setPptFilePath('');
      setPptUrl('');
      setPptSourceType('file');

      handleBackgroundPptImport(currentTitle, pptSource);
    } else if (modalTab === 'IMAGE') {
      if (!imgTitle.trim()) {
        showFeedback('Please provide a title', 'error');
        return;
      }
      if (imgSourceType === 'file' && !imgDataUrl) {
        showFeedback('Please select an image file', 'error');
        return;
      }
      if (imgSourceType === 'url' && !imgUrl.trim()) {
        showFeedback('Please provide an image URL', 'error');
        return;
      }

      const newImg: ImageMediaRecord = {
        id: `img-${Date.now()}`,
        title: imgTitle.trim(),
        category: 'ANNOUNCEMENT',
        dataUrl: imgSourceType === 'file' ? imgDataUrl : imgUrl.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await bunsenDb.saveImage(newImg);
      await loadDatabaseRecords();
      setShowUploadModal(false);
      setImgTitle('');
      setImgDataUrl('');
      setImgUrl('');
      setImgSourceType('file');
      showFeedback(`Image "${newImg.title}" uploaded to library!`);
    } else if (modalTab === 'CANVA') {
      if (!canvaTitle.trim() || !canvaUrl.trim()) return;

      const designId = parseCanvaDesignId(canvaUrl.trim());
      const embedUrl = designId ? buildCanvaEmbedUrl(designId) : '';
      const thumbnail = generateCanvaThumbnail(canvaTitle.trim());

      const canvaRecord: ExternalPresentationRecord = {
        id: `canva-${Date.now()}`,
        title: canvaTitle.trim(),
        type: 'CANVA',
        canvaUrl: canvaUrl.trim(),
        embedUrl: embedUrl || undefined,
        designId: designId || undefined,
        slideCount: 1,
        slides: [
          {
            id: `s-canva-${Date.now()}-1`,
            section: 'Presentation',
            lines: [],
            externalType: 'CANVA',
            embedUrl: embedUrl || undefined,
            imageUrl: thumbnail,
            imageFit: 'contain',
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await bunsenDb.saveExternalPresentation(canvaRecord);
      await loadDatabaseRecords();
      setShowUploadModal(false);
      setCanvaTitle('');
      setCanvaUrl('');
      showFeedback(
        embedUrl
          ? `Canva presentation "${canvaRecord.title}" linked!`
          : `Canva presentation "${canvaRecord.title}" linked.`
      );
    }
  };

  // Handle saving new worship song with customized background
  const handleSaveSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!songTitle.trim()) {
      showFeedback('Please provide a song title', 'error');
      return;
    }

    const rawBlocks = songLyrics.split(/\n\s*\n/).filter((b) => b.trim().length > 0);
    const bgResolved = songBgValue;
    const isColorOrGradient = songBgType === 'color' || songBgType === 'gradient';
    const isImage = songBgType === 'image';
    const isShortVid = songBgType === 'shortvid';

    const generatedSlides =
      rawBlocks.length > 0
        ? rawBlocks.map((block, idx) => ({
            id: `s-${Date.now()}-${idx + 1}`,
            section: idx === 0 ? 'Verse 1' : idx === 1 ? 'Chorus' : `Slide ${idx + 1}`,
            lines: block.split('\n').map((l) => l.trim()).filter(Boolean),
            background: isColorOrGradient ? bgResolved : undefined,
            imageUrl: isImage ? bgResolved : undefined,
            videoUrl: isShortVid ? bgResolved : undefined,
            videoLoop: isShortVid ? true : undefined,
            videoMuted: isShortVid ? true : undefined,
          }))
        : [
            {
              id: `s-${Date.now()}-1`,
              section: 'Verse 1',
              lines: [songTitle.trim(), 'Worship lyric line'],
              background: isColorOrGradient ? bgResolved : undefined,
              imageUrl: isImage ? bgResolved : undefined,
              videoUrl: isShortVid ? bgResolved : undefined,
              videoLoop: isShortVid ? true : undefined,
              videoMuted: isShortVid ? true : undefined,
            },
          ];

    const newSong: SongRecord = {
      id: `song-${Date.now()}`,
      title: songTitle.trim(),
      artist: songArtist.trim() || undefined,
      bgType: songBgType,
      bgValue: songBgValue,
      tags: ['Worship', 'Praise'],
      slides: generatedSlides,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      await bunsenDb.saveSong(newSong);
      await loadDatabaseRecords();
      setShowSongModal(false);
      setSongTitle('');
      setSongArtist('');
      setSongLyrics('');
      setSongBgType('gradient');
      setSongBgValue(PRESET_GRADIENTS[0].gradient);
      showFeedback(`Worship Song "${newSong.title}" added to library!`);
    } catch (err) {
      console.error('Failed to save song:', err);
      showFeedback('Failed to save song to library', 'error');
    }
  };

  // Export JSON Database Backup
  const handleExportBackup = async () => {
    try {
      const jsonDump = await bunsenDb.exportDatabase();
      const blob = new Blob([jsonDump], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `bunsenworship-database-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showFeedback('Database exported successfully as JSON file!');
    } catch (err) {
      console.error('Export backup failed:', err);
      showFeedback('Failed to export database', 'error');
    }
  };

  // Import JSON Database Backup
  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = await bunsenDb.importDatabase(text);
      await loadDatabaseRecords();
      showFeedback(`Database restored successfully (${result.importedCount} records imported)!`);
    } catch (err) {
      console.error('Import database failed:', err);
      showFeedback('Invalid backup file or corrupt JSON data', 'error');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleRestoreSeedData = async () => {
    if (!window.confirm('Reset local database with standard worship songs and sample decks?')) {
      return;
    }
    try {
      for (const song of SEED_SONGS) {
        await bunsenDb.saveSong(song);
      }
      for (const img of SEED_IMAGES) {
        await bunsenDb.saveImage(img);
      }
      for (const deck of SEED_EXTERNAL_PRESENTATIONS) {
        await bunsenDb.saveExternalPresentation(deck);
      }
      await bunsenDb.setSetting('pro_media_deleted_assets', []);
      setDeletedAssetIds([]);
      await loadDatabaseRecords();
      showFeedback('Standard worship songs, sacred images, and presentations re-populated!');
    } catch (err) {
      console.error('Failed to restore seed data:', err);
      showFeedback('Could not restore sample data', 'error');
    }
  };

  return (
    <div className="medialib-screen">
      {/* -----------------------------------------------------------------
          Top Header Bar
          ----------------------------------------------------------------- */}
      <div className="medialib-top-header">
        <div className="medialib-header-left">
          <h2 className="medialib-title">{t.mediaLibrary.title}</h2>
          <p className="medialib-desc">{t.mediaLibrary.subtitle}</p>
        </div>

        <div className="medialib-header-actions">
          <button
            type="button"
            className="medialib-action-btn medialib-song-btn"
            onClick={() => setShowSongModal(true)}
          >
            <MusicIcon size={15} />
            <span>{t.mediaLibrary.addSongButton || 'Add Song'}</span>
          </button>

          <button
            type="button"
            className="medialib-action-btn medialib-upload-btn"
            onClick={() => setShowUploadModal(true)}
          >
            <UploadIcon size={15} />
            <span>{t.mediaLibrary.uploadButton}</span>
          </button>

          <button
            type="button"
            className="medialib-action-btn medialib-sync-btn"
            onClick={() => setShowBackupModal(true)}
          >
            <FolderIcon size={15} />
            <span>{t.mediaLibrary.backupSyncButton || 'Backup & Sync'}</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedbackMessage && (
        <div className={`medialib-banner ${feedbackMessage.type}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckIcon size={16} />
            <span>{feedbackMessage.text}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {feedbackMessage.action && (
              <button
                type="button"
                className="medialib-banner-action-btn"
                onClick={feedbackMessage.action.onClick}
                style={{
                  background: 'rgba(56, 189, 248, 0.2)',
                  border: '1px solid rgba(56, 189, 248, 0.5)',
                  color: '#38bdf8',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {feedbackMessage.action.label}
              </button>
            )}
            <button
              type="button"
              className="medialib-filter-link"
              onClick={() => setFeedbackMessage(null)}
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* -----------------------------------------------------------------
          Two-Column Layout: Sidebar + Media Grid
          ----------------------------------------------------------------- */}
      <div className="medialib-content-layout">
        {/* Left Column: MEDIA SOURCES */}
        <aside className="medialib-sidebar">
          <h3 className="medialib-sidebar-title">{t.mediaLibrary.mediaSources}</h3>
          <div className="medialib-sources-list">
            <button
              type="button"
              className={`medialib-source-item ${selectedSource === 'ALL' ? 'active' : ''}`}
              onClick={() => setSelectedSource('ALL')}
            >
              <div className="medialib-source-item-left">
                <FolderIcon size={16} className="medialib-source-icon" />
                <span>{t.mediaLibrary.allMedia}</span>
              </div>
              <span className="medialib-source-count">{sourceCounts.ALL}</span>
            </button>

            <button
              type="button"
              className={`medialib-source-item ${selectedSource === 'POWERPOINT' ? 'active' : ''}`}
              onClick={() => setSelectedSource('POWERPOINT')}
            >
              <div className="medialib-source-item-left">
                <PresentationIcon size={16} className="medialib-source-icon" />
                <span>{t.mediaLibrary.powerPointUploads}</span>
              </div>
              <span className="medialib-source-count">{sourceCounts.POWERPOINT}</span>
            </button>

            <button
              type="button"
              className={`medialib-source-item ${selectedSource === 'VIDEO' ? 'active' : ''}`}
              onClick={() => setSelectedSource('VIDEO')}
            >
              <div className="medialib-source-item-left">
                <VideoIcon size={16} className="medialib-source-icon" />
                <span>{t.mediaLibrary.videoBackgrounds}</span>
              </div>
              <span className="medialib-source-count">{sourceCounts.VIDEO}</span>
            </button>

            <button
              type="button"
              className={`medialib-source-item ${selectedSource === 'SPEAKER_DECK' ? 'active' : ''}`}
              onClick={() => setSelectedSource('SPEAKER_DECK')}
            >
              <div className="medialib-source-item-left">
                <PresentationIcon size={16} className="medialib-source-icon" />
                <span>{t.mediaLibrary.speakerDecks}</span>
              </div>
              <span className="medialib-source-count">{sourceCounts.SPEAKER_DECK}</span>
            </button>

            <button
              type="button"
              className={`medialib-source-item ${selectedSource === 'ANNOUNCEMENTS' ? 'active' : ''}`}
              onClick={() => setSelectedSource('ANNOUNCEMENTS')}
            >
              <div className="medialib-source-item-left">
                <ImageIcon size={16} className="medialib-source-icon" />
                <span>{t.mediaLibrary.announcementsLoops}</span>
              </div>
              <span className="medialib-source-count">{sourceCounts.ANNOUNCEMENTS}</span>
            </button>

            <button
              type="button"
              className={`medialib-source-item ${selectedSource === 'SONGS' ? 'active' : ''}`}
              onClick={() => setSelectedSource('SONGS')}
            >
              <div className="medialib-source-item-left">
                <MusicIcon size={16} className="medialib-source-icon" />
                <span>{t.mediaLibrary.worshipSongs}</span>
              </div>
              <span className="medialib-source-count">{sourceCounts.SONGS}</span>
            </button>

            <button
              type="button"
              className={`medialib-source-item ${selectedSource === 'CANVA' ? 'active' : ''}`}
              onClick={() => setSelectedSource('CANVA')}
            >
              <div className="medialib-source-item-left">
                <LinkIcon size={16} className="medialib-source-icon" />
                <span>{t.mediaLibrary.canvaPresentations}</span>
              </div>
              <span className="medialib-source-count">{sourceCounts.CANVA}</span>
            </button>
          </div>
        </aside>

        {/* Right Column: Search + Filters + Media Cards Grid */}
        <main className="medialib-main-content">
          {/* Top Search & Filter Bar */}
          <div className="medialib-search-filter-row">
            <div className="medialib-search-input-box">
              <SearchIcon size={14} style={{ color: '#64748b' }} />
              <input
                type="text"
                placeholder={t.mediaLibrary.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="medialib-filter-row">
              <span className="medialib-filter-label">{t.mediaLibrary.filterLabel}</span>
              <div className="medialib-filter-links">
                <button
                  type="button"
                  className={`medialib-filter-link ${activeFilter === 'ALL' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('ALL')}
                >
                  {t.mediaLibrary.filterAll}
                </button>
                <button
                  type="button"
                  className={`medialib-filter-link ${activeFilter === 'VIDEOS' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('VIDEOS')}
                >
                  {t.mediaLibrary.filterVideos}
                </button>
                <button
                  type="button"
                  className={`medialib-filter-link ${activeFilter === 'POWERPOINTS' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('POWERPOINTS')}
                >
                  {t.mediaLibrary.filterPowerPoints}
                </button>
                <button
                  type="button"
                  className={`medialib-filter-link ${activeFilter === 'IMAGES' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('IMAGES')}
                >
                  {t.mediaLibrary.filterImages}
                </button>
                <button
                  type="button"
                  className={`medialib-filter-link ${activeFilter === 'CANVA' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('CANVA')}
                >
                  {t.mediaLibrary.filterCanva}
                </button>
                <button
                  type="button"
                  className={`medialib-filter-link ${activeFilter === 'SONGS' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('SONGS')}
                >
                  {t.mediaLibrary.filterSongs}
                </button>
              </div>
            </div>
          </div>

          {/* Media Cards Grid (Scrolls when items are many) */}
          <div className="medialib-cards-grid">
            {displayedItems.length === 0 ? (
              <div className="medialib-empty-state">
                <FolderIcon size={42} className="medialib-empty-icon" />
                <p className="medialib-empty-text">{t.mediaLibrary.noResults}</p>
              </div>
            ) : (
              displayedItems.map((item) => {
                const isAdded = addedItemIds[item.id];

                return (
                  <div key={item.id} className="medialib-media-card">
                    {/* 16:9 Visual Thumbnail Container */}
                    <div className="medialib-thumb-container">
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="medialib-thumb-img"
                      />

                      {/* Hover Action Overlay */}
                      <div className="medialib-card-hover-actions">
                        <button
                          type="button"
                          className={`medialib-action-btn-primary ${isAdded ? 'is-added' : ''}`}
                          onClick={() => handleAddToRundown(item)}
                          title={isAdded ? t.mediaLibrary.inRundown : t.mediaLibrary.addToRundown}
                        >
                          {isAdded ? <CheckIcon size={14} /> : <PlusIcon size={14} />}
                          <span>{isAdded ? t.mediaLibrary.inRundown : t.mediaLibrary.addToRundown}</span>
                        </button>

                        {item.format !== 'SONG' && (
                          <button
                            type="button"
                            className="medialib-action-btn-icon"
                            onClick={() => handleSetBackground(item)}
                            title={t.mediaLibrary.setBackground}
                          >
                            <ImageIcon size={14} />
                          </button>
                        )}

                        {item.canvaUrl && (
                          <a
                            href={item.canvaUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="medialib-action-btn-icon"
                            title="Open in Canva"
                            style={{ textDecoration: 'none' }}
                          >
                            <LinkIcon size={14} />
                          </a>
                        )}

                        <button
                          type="button"
                          className="medialib-action-btn-icon"
                          onClick={() => handleOpenEdit(item)}
                          title={t.mediaLibrary.editAsset}
                        >
                          <PencilIcon size={14} />
                        </button>

                        <button
                          type="button"
                          className="medialib-action-btn-icon danger"
                          onClick={() => handleDeleteAsset(item)}
                          title={t.mediaLibrary.deleteAsset}
                        >
                          <TrashIcon size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Card Info Below Thumbnail */}
                    <div className="medialib-card-info">
                      <div className="medialib-card-title-row">
                        <h4 className="medialib-card-title" title={item.title}>
                          {item.title}
                        </h4>
                        <div className="medialib-card-quick-actions">
                          <button
                            type="button"
                            className={`medialib-card-quick-btn ${isAdded ? 'is-added' : ''}`}
                            onClick={() => handleAddToRundown(item)}
                            title={isAdded ? t.mediaLibrary.inRundown : t.mediaLibrary.addToRundown}
                            style={isAdded ? { color: '#22c55e' } : undefined}
                          >
                            {isAdded ? <CheckIcon size={13} /> : <PlusIcon size={13} />}
                          </button>
                          <button
                            type="button"
                            className="medialib-card-quick-btn"
                            onClick={() => handleOpenEdit(item)}
                            title={t.mediaLibrary.editAsset}
                          >
                            <PencilIcon size={13} />
                          </button>
                          <button
                            type="button"
                            className="medialib-card-quick-btn danger"
                            onClick={() => handleDeleteAsset(item)}
                            title={t.mediaLibrary.deleteAsset}
                          >
                            <TrashIcon size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="medialib-card-meta-row">
                        <div className="medialib-meta-left">
                          <span className={`medialib-format-pill ${item.format.toLowerCase()}`}>
                            {item.format}
                          </span>
                        </div>
                        {Boolean(item.durationOrSlides && item.durationOrSlides.toLowerCase() !== 'static') && (
                          <span className="medialib-duration-pill">{item.durationOrSlides}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>
      </div>

      {/* -----------------------------------------------------------------
          Upload Presentation / Video Modal (4 Tabs, Wide, Clean)
          ----------------------------------------------------------------- */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div
            className="quick-edit-modal-card"
            style={{ maxWidth: '820px', width: '92%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UploadIcon size={18} />
                <span>{t.mediaLibrary.uploadModalTitle}</span>
              </h3>
              <button
                type="button"
                className="quick-edit-btn"
                onClick={() => setShowUploadModal(false)}
              >
                {t.mediaLibrary.close}
              </button>
            </div>

            {/* Modal Navigation Tabs: 4 tabs only */}
            <div className="medialib-modal-tabs">
              <button
                type="button"
                className={`medialib-modal-tab-btn ${modalTab === 'VIDEO' ? 'active' : ''}`}
                onClick={() => setModalTab('VIDEO')}
              >
                {t.mediaLibrary.tabVideo}
              </button>
              <button
                type="button"
                className={`medialib-modal-tab-btn ${modalTab === 'PPT' ? 'active' : ''}`}
                onClick={() => setModalTab('PPT')}
              >
                {t.mediaLibrary.tabPpt}
              </button>
              <button
                type="button"
                className={`medialib-modal-tab-btn ${modalTab === 'IMAGE' ? 'active' : ''}`}
                onClick={() => setModalTab('IMAGE')}
              >
                {t.mediaLibrary.tabImage}
              </button>
              <button
                type="button"
                className={`medialib-modal-tab-btn ${modalTab === 'CANVA' ? 'active' : ''}`}
                onClick={() => setModalTab('CANVA')}
              >
                {t.mediaLibrary.tabCanva}
              </button>
            </div>

            {/* TAB: Video / Motion */}
            {modalTab === 'VIDEO' && (
              <form onSubmit={handleSaveUpload} className="modal-body">
                <div className="form-group">
                  <label className="form-label">Video / Motion Loop Title *</label>
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="e.g. Cinematic Particles Blue"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Video Source</label>
                  <div className="source-type-toggle">
                    <button
                      type="button"
                      className={`source-type-btn ${videoSourceType === 'file' ? 'active' : ''}`}
                      onClick={() => setVideoSourceType('file')}
                    >
                      Browse File
                    </button>
                    <button
                      type="button"
                      className={`source-type-btn ${videoSourceType === 'youtube' ? 'active' : ''}`}
                      onClick={() => setVideoSourceType('youtube')}
                    >
                      YouTube URL
                    </button>
                  </div>
                </div>

                {videoSourceType === 'file' ? (
                  <div className="medialib-form-group">
                    <label className="medialib-form-label">Video File (.mp4, .mov, .avi)</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        className="auth-input"
                        placeholder="Select video file or paste file path..."
                        value={videoFilePath}
                        onChange={(e) => setVideoFilePath(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <input
                        type="file"
                        ref={videoFileInputRef}
                        accept="video/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleVideoFileChange(file);
                        }}
                      />
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleBrowseVideoFile}
                      >
                        Browse...
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="medialib-form-group">
                    <label className="medialib-form-label">YouTube URL</label>
                    <input
                      type="url"
                      className="auth-input"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={videoYoutubeUrl}
                      onChange={(e) => setVideoYoutubeUrl(e.target.value)}
                    />
                  </div>
                )}

                {/* Auto-detected metadata: Format & Duration in clean 2-col grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="medialib-form-group">
                    <label className="medialib-form-label">Format (Auto-detected)</label>
                    <select
                      className="auth-input"
                      value={videoFormat}
                      onChange={(e) => setVideoFormat(e.target.value as 'MOV' | 'MP4')}
                    >
                      <option value="MOV">MOV (QuickTime / ProRes)</option>
                      <option value="MP4">MP4 (H.264 / AAC)</option>
                    </select>
                  </div>

                  <div className="medialib-form-group">
                    <label className="medialib-form-label">Duration (Auto-detected)</label>
                    <input
                      type="text"
                      className="auth-input"
                      placeholder="0:30"
                      value={videoDuration}
                      onChange={(e) => setVideoDuration(e.target.value)}
                    />
                  </div>
                </div>

                {/* Auto-generated poster / thumbnail */}
                <div className="medialib-form-group">
                  <label className="medialib-form-label">Thumbnail Preview (Auto-generated from content)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {videoDataUrl ? (
                      <div style={{ width: '160px', height: '90px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: '#000', flexShrink: 0 }}>
                        <img src={videoDataUrl} alt="Thumbnail preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ) : videoSourceType === 'youtube' && getYouTubeThumbnailUrl(videoYoutubeUrl) ? (
                      <div style={{ width: '160px', height: '90px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: '#000', flexShrink: 0 }}>
                        <img src={getYouTubeThumbnailUrl(videoYoutubeUrl)!} alt="YouTube thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ) : (
                      <div style={{ width: '160px', height: '90px', borderRadius: '6px', border: '1px dashed var(--border-subtle)', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.75rem', flexShrink: 0 }}>
                        Auto on file load
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setVideoDataUrl(ev.target?.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => fileInputRef.current?.click()}
                        style={{ fontSize: '0.8rem', padding: '5px 12px' }}
                      >
                        {videoDataUrl ? 'Change Custom Thumbnail...' : 'Upload Custom Poster...'}
                      </button>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        Captured automatically from frame 1s of selected video file.
                      </span>
                    </div>
                  </div>
                </div>

                <div className="modal-footer" style={{ padding: '0.75rem 0 0 0', border: 'none' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowUploadModal(false)}
                  >
                    {t.mediaLibrary.cancel}
                  </button>
                  <button type="submit" className="btn-primary">
                    {t.mediaLibrary.saveToLibrary}
                  </button>
                </div>
              </form>
            )}

            {/* TAB: PowerPoint */}
            {modalTab === 'PPT' && (
              <form onSubmit={handleSaveUpload} className="modal-body">
                <div className="medialib-form-group">
                  <label className="medialib-form-label">Presentation Title *</label>
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="e.g. Sunday Sermon Deck Oct 24"
                    value={pptTitle}
                    onChange={(e) => setPptTitle(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="medialib-form-group">
                  <label className="medialib-form-label">PowerPoint Source</label>
                  <div className="medialib-source-type-toggle">
                    <button
                      type="button"
                      className={`medialib-source-type-btn ${pptSourceType === 'file' ? 'active' : ''}`}
                      onClick={() => setPptSourceType('file')}
                    >
                      Browse File
                    </button>
                    <button
                      type="button"
                      className={`medialib-source-type-btn ${pptSourceType === 'url' ? 'active' : ''}`}
                      onClick={() => setPptSourceType('url')}
                    >
                      File URL
                    </button>
                  </div>
                </div>

                {pptSourceType === 'file' ? (
                  <div className="medialib-form-group">
                    <label className="medialib-form-label">PowerPoint File (.pptx / .ppt)</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        className="auth-input"
                        placeholder="Select PowerPoint presentation or paste path..."
                        value={pptFilePath}
                        onChange={(e) => setPptFilePath(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <input
                        type="file"
                        ref={pptFileInputRef}
                        accept=".ppt,.pptx"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            let resolvedPath: string | undefined;
                            if (window.electronAPI?.getPathForFile) {
                              try {
                                resolvedPath = window.electronAPI.getPathForFile(file);
                              } catch {}
                            }
                            const path = resolvedPath || (file as unknown as { path?: string }).path || file.name;
                            setPptFilePath(path);
                            if (!pptTitle) {
                              setPptTitle(file.name.replace(/\.[^/.]+$/, ''));
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleBrowsePptFile}
                      >
                        Browse...
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="medialib-form-group">
                    <label className="medialib-form-label">PowerPoint URL</label>
                    <input
                      type="url"
                      className="auth-input"
                      placeholder="https://example.com/presentation.pptx"
                      value={pptUrl}
                      onChange={(e) => setPptUrl(e.target.value)}
                    />
                  </div>
                )}

                <div
                  style={{
                    background: 'rgba(56, 189, 248, 0.08)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginTop: '0.5rem',
                  }}
                >
                  <RefreshCwIcon size={20} style={{ color: '#38bdf8', flexShrink: 0 }} />
                  <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                    <strong>Background Import & Live Sync:</strong> PowerPoint slides and high-resolution visuals are extracted in the background so you can keep working immediately.
                  </div>
                </div>

                <div className="modal-footer" style={{ padding: '0.75rem 0 0 0', border: 'none' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowUploadModal(false)}
                  >
                    {t.mediaLibrary.cancel}
                  </button>
                  <button type="submit" className="btn-primary">
                    Import in Background
                  </button>
                </div>
              </form>
            )}

            {/* TAB: Image / Still Graphic */}
            {modalTab === 'IMAGE' && (
              <form onSubmit={handleSaveUpload} className="modal-body">
                <div className="medialib-form-group">
                  <label className="medialib-form-label">Graphic / Announcement Title *</label>
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="e.g. Sunday Welcome Slide"
                    value={imgTitle}
                    onChange={(e) => setImgTitle(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="medialib-form-group">
                  <label className="medialib-form-label">Image Source</label>
                  <div className="medialib-source-type-toggle">
                    <button
                      type="button"
                      className={`medialib-source-type-btn ${imgSourceType === 'file' ? 'active' : ''}`}
                      onClick={() => setImgSourceType('file')}
                    >
                      Browse File
                    </button>
                    <button
                      type="button"
                      className={`medialib-source-type-btn ${imgSourceType === 'url' ? 'active' : ''}`}
                      onClick={() => setImgSourceType('url')}
                    >
                      Image URL
                    </button>
                  </div>
                </div>

                {imgSourceType === 'file' ? (
                  <>
                    <input
                      type="file"
                      ref={imgFileInputRef}
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setImgDataUrl(ev.target?.result as string);
                            if (!imgTitle) {
                              setImgTitle(file.name.replace(/\.[^/.]+$/, ''));
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />

                    {imgDataUrl ? (
                      <div className="medialib-upload-preview-box">
                        <img
                          src={imgDataUrl}
                          alt="Preview"
                          className="medialib-upload-preview-img"
                        />
                      </div>
                    ) : (
                      <div
                        className="medialib-dropzone"
                        onClick={() => imgFileInputRef.current?.click()}
                      >
                        <ImageIcon size={36} />
                        <p style={{ margin: '0.5rem 0 0.25rem 0', fontWeight: 600, color: '#ffffff' }}>
                          Click to choose an image
                        </p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                          Supports PNG, JPG, JPEG, WEBP, SVG (Auto thumbnail generated from content)
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="medialib-form-group">
                    <label className="medialib-form-label">Image URL</label>
                    <input
                      type="url"
                      className="auth-input"
                      placeholder="https://example.com/image.jpg"
                      value={imgUrl}
                      onChange={(e) => setImgUrl(e.target.value)}
                    />
                  </div>
                )}

                <div className="modal-footer" style={{ padding: '0.75rem 0 0 0', border: 'none' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowUploadModal(false)}
                  >
                    {t.mediaLibrary.cancel}
                  </button>
                  <button type="submit" className="btn-primary" disabled={imgSourceType === 'file' && !imgDataUrl}>
                    {t.mediaLibrary.saveGraphic}
                  </button>
                </div>
              </form>
            )}

            {/* TAB: Canva */}
            {modalTab === 'CANVA' && (
              <form onSubmit={handleSaveUpload} className="modal-body">
                <div className="medialib-form-group">
                  <label className="medialib-form-label">Canva Presentation Link *</label>
                  <input
                    type="url"
                    className="auth-input"
                    placeholder="https://www.canva.com/design/.../view"
                    value={canvaUrl}
                    onChange={(e) => handleCanvaUrlChange(e.target.value)}
                    required
                    autoFocus
                  />
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                    Title is automatically populated from your Canva presentation URL slug.
                  </p>
                </div>

                <div className="medialib-form-group">
                  <label className="medialib-form-label">Canva Presentation Title *</label>
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="e.g. Youth Night Announcements"
                    value={canvaTitle}
                    onChange={(e) => setCanvaTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="modal-footer" style={{ padding: '0.75rem 0 0 0', border: 'none' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowUploadModal(false)}
                  >
                    {t.mediaLibrary.cancel}
                  </button>
                  <button type="submit" className="btn-primary">
                    {t.mediaLibrary.linkCanvaDesign}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* -----------------------------------------------------------------
          Dedicated Add Worship Song Modal (Color/Gradient/Image/ShortVid)
          ----------------------------------------------------------------- */}
      {showSongModal && (
        <div className="modal-overlay" onClick={() => setShowSongModal(false)}>
          <div
            className="quick-edit-modal-card"
            style={{ maxWidth: '820px', width: '92%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MusicIcon size={18} />
                <span>{t.mediaLibrary.addSongModalTitle || 'Add Worship Song to Library'}</span>
              </h3>
              <button
                type="button"
                className="quick-edit-btn"
                onClick={() => setShowSongModal(false)}
              >
                {t.mediaLibrary.close}
              </button>
            </div>

            <form onSubmit={handleSaveSong} className="modal-body">
              {/* Title & Artist in 2-col row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '0.75rem' }}>
                <div className="medialib-form-group">
                  <label className="medialib-form-label">Song Title *</label>
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="e.g. Way Maker / Living Hope"
                    value={songTitle}
                    onChange={(e) => setSongTitle(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="medialib-form-group">
                  <label className="medialib-form-label">Artist / Worship Leader</label>
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="e.g. Sinach / Phil Wickham"
                    value={songArtist}
                    onChange={(e) => setSongArtist(e.target.value)}
                  />
                </div>
              </div>

              {/* Song Background Picker (Color / Gradient / Image / Short Video) */}
              <div className="medialib-form-group" style={{ marginTop: '0.25rem' }}>
                <label className="medialib-form-label">Song Slide Background</label>
                
                {/* Background Type Selector Pills */}
                <div className="song-bg-type-toggle">
                  <button
                    type="button"
                    className={`song-bg-pill ${songBgType === 'gradient' ? 'active' : ''}`}
                    onClick={() => {
                      setSongBgType('gradient');
                      setSongBgValue(PRESET_GRADIENTS[0].gradient);
                    }}
                  >
                    Worship Gradient
                  </button>
                  <button
                    type="button"
                    className={`song-bg-pill ${songBgType === 'color' ? 'active' : ''}`}
                    onClick={() => {
                      setSongBgType('color');
                      setSongBgValue(PRESET_COLORS[0].color);
                    }}
                  >
                    Solid Color
                  </button>
                  <button
                    type="button"
                    className={`song-bg-pill ${songBgType === 'image' ? 'active' : ''}`}
                    onClick={() => {
                      setSongBgType('image');
                      setSongBgValue(songCustomMediaUrl || '');
                    }}
                  >
                    Custom Image
                  </button>
                  <button
                    type="button"
                    className={`song-bg-pill ${songBgType === 'shortvid' ? 'active' : ''}`}
                    onClick={() => {
                      setSongBgType('shortvid');
                      setSongBgValue(songCustomMediaUrl || '');
                    }}
                  >
                    Motion Video Loop
                  </button>
                </div>

                {/* Sub-controls depending on bgType */}
                <div style={{ marginTop: '0.65rem' }}>
                  {songBgType === 'gradient' && (
                    <div className="song-gradient-swatches">
                      {PRESET_GRADIENTS.map((g) => (
                        <div
                          key={g.name}
                          className={`song-gradient-swatch ${songBgValue === g.gradient ? 'active' : ''}`}
                          style={{ background: g.gradient }}
                          title={g.name}
                          onClick={() => setSongBgValue(g.gradient)}
                        >
                          {g.name}
                        </div>
                      ))}
                    </div>
                  )}

                  {songBgType === 'color' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <div className="song-color-swatches">
                        {PRESET_COLORS.map((c) => (
                          <div
                            key={c.name}
                            className={`song-color-swatch ${songBgValue === c.color ? 'active' : ''}`}
                            style={{ backgroundColor: c.color }}
                            title={c.name}
                            onClick={() => {
                              setSongBgValue(c.color);
                              setSongCustomColor(c.color);
                            }}
                          />
                        ))}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <input
                          type="color"
                          value={songCustomColor}
                          onChange={(e) => {
                            setSongCustomColor(e.target.value);
                            setSongBgValue(e.target.value);
                          }}
                          style={{
                            width: '32px',
                            height: '32px',
                            border: 'none',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            background: 'transparent',
                          }}
                          title="Custom Color Picker"
                        />
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Custom Color</span>
                      </div>
                    </div>
                  )}

                  {songBgType === 'image' && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="auth-input"
                        placeholder="Paste image URL or browse image..."
                        value={songBgValue}
                        onChange={(e) => {
                          setSongBgValue(e.target.value);
                          setSongCustomMediaUrl(e.target.value);
                        }}
                        style={{ flex: 1 }}
                      />
                      <label className="btn-secondary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        Browse...
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                const data = ev.target?.result as string;
                                setSongBgValue(data);
                                setSongCustomMediaUrl(data);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                  )}

                  {songBgType === 'shortvid' && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="auth-input"
                        placeholder="Paste video URL/path or browse motion loop..."
                        value={songBgValue}
                        onChange={(e) => {
                          setSongBgValue(e.target.value);
                          setSongCustomMediaUrl(e.target.value);
                        }}
                        style={{ flex: 1 }}
                      />
                      <label className="btn-secondary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        Browse...
                        <input
                          type="file"
                          accept="video/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              let resolvedPath: string | undefined;
                              if (window.electronAPI?.getPathForFile) {
                                try {
                                  resolvedPath = window.electronAPI.getPathForFile(file);
                                } catch {}
                              }
                              const path = resolvedPath || (file as unknown as { path?: string }).path || URL.createObjectURL(file);
                              setSongBgValue(path);
                              setSongCustomMediaUrl(path);
                            }
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* Live Slide Preview Frame */}
                <div style={{ marginTop: '0.75rem' }}>
                  <div
                    className="song-preview-frame"
                    style={{
                      background:
                        songBgType === 'color' || songBgType === 'gradient'
                          ? songBgValue
                          : '#000000',
                    }}
                  >
                    {songBgType === 'image' && songBgValue && (
                      <img
                        src={songBgValue}
                        alt="Background preview"
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    )}
                    {songBgType === 'shortvid' && songBgValue && (
                      <video
                        src={normalizeVideoSource(songBgValue)}
                        autoPlay
                        loop
                        muted
                        playsInline
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    )}
                    <div className="song-preview-overlay" />
                    <div className="song-preview-content">
                      <div className="song-preview-title">{songTitle.trim() || 'Worship Slide Preview'}</div>
                      <div className="song-preview-line">
                        {songLyrics.split('\n').filter((l) => l.trim())[0] || 'Amazing grace! How sweet the sound'}
                      </div>
                      <div className="song-preview-sub">
                        {songArtist.trim() ? `— ${songArtist.trim()}` : 'Live Output Presentation Preview'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lyrics input */}
              <div className="medialib-form-group">
                <label className="medialib-form-label">Lyrics & Slides (Separate slides with a blank line)</label>
                <textarea
                  className="auth-input"
                  rows={5}
                  placeholder={`[Verse 1]\nYou are here, moving in our midst\nI worship You, I worship You\n\n[Chorus]\nWay maker, miracle worker\nPromise keeper, light in the darkness`}
                  value={songLyrics}
                  onChange={(e) => setSongLyrics(e.target.value)}
                />
              </div>

              <div className="modal-footer" style={{ padding: '0.75rem 0 0 0', border: 'none' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowSongModal(false)}
                >
                  {t.mediaLibrary.cancel}
                </button>
                <button type="submit" className="btn-primary">
                  {t.mediaLibrary.saveSong}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -----------------------------------------------------------------
          Dedicated Backup & Sync Modal
          ----------------------------------------------------------------- */}
      {showBackupModal && (
        <div className="modal-overlay" onClick={() => setShowBackupModal(false)}>
          <div
            className="quick-edit-modal-card"
            style={{ maxWidth: '580px', width: '90%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderIcon size={18} />
                <span>{t.mediaLibrary.backupModalTitle || 'Media Library Backup & Sync'}</span>
              </h3>
              <button
                type="button"
                className="quick-edit-btn"
                onClick={() => setShowBackupModal(false)}
              >
                {t.mediaLibrary.close}
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8', lineHeight: '1.5' }}>
                All your songs, PowerPoint configurations, video loops, and custom slides are securely stored in local offline IndexedDB (<code>BunsenWorshipDB</code> v2). You can export and transfer backups to other presentation computers anytime.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleExportBackup}
                  style={{ justifyContent: 'center', padding: '10px 14px' }}
                >
                  <DownloadIcon size={16} />
                  <span>Export JSON Backup</span>
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => backupFileInputRef.current?.click()}
                  style={{ justifyContent: 'center', padding: '10px 14px' }}
                >
                  <UploadIcon size={16} />
                  <span>Restore Backup (.json)</span>
                </button>
                <input
                  type="file"
                  ref={backupFileInputRef}
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={handleImportBackup}
                />
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleRestoreSeedData}
                  style={{ width: '100%', justifyContent: 'center', color: '#94a3b8' }}
                >
                  <RefreshCwIcon size={14} />
                  <span>Reset to Default Worship Assets</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -----------------------------------------------------------------
          Edit Media Asset Modal (Streamlined CRUD)
          ----------------------------------------------------------------- */}
      {showEditModal && editingAsset && (
        <div className="medialib-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div
            className="medialib-modal-dialog"
            style={{ maxWidth: '580px', width: '90%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="medialib-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PencilIcon size={18} style={{ color: 'var(--color-primary)' }} />
                <h3 className="medialib-modal-title">{t.mediaLibrary.editModalTitle}</h3>
              </div>
              <button
                type="button"
                className="medialib-modal-close"
                onClick={() => setShowEditModal(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="medialib-modal-form">
              {/* Asset Title */}
              <div className="medialib-form-group">
                <label className="medialib-form-label">{t.mediaLibrary.titleLabel}</label>
                <input
                  type="text"
                  required
                  className="medialib-form-input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>

              {/* Video Specific Fields */}
              {(editingAsset.format === 'MOV' || editingAsset.format === 'MP4') && (
                <div className="medialib-form-group">
                  <label className="medialib-form-label">Duration</label>
                  <input
                    type="text"
                    className="medialib-form-input"
                    placeholder="e.g. 0:30, 1:00"
                    value={editDuration}
                    onChange={(e) => setEditDuration(e.target.value)}
                  />
                </div>
              )}

              {/* PowerPoint Specific Fields */}
              {editingAsset.format === 'PPTX' && (
                <div className="medialib-form-group">
                  <label className="medialib-form-label">PowerPoint File Path</label>
                  <input
                    type="text"
                    className="medialib-form-input"
                    placeholder="e.g. C:\Presentations\Sermon.pptx"
                    value={editFilePath}
                    onChange={(e) => setEditFilePath(e.target.value)}
                  />
                </div>
              )}

              {/* Canva Specific Fields */}
              {editingAsset.format === 'CANVA' && (
                <div className="medialib-form-group">
                  <label className="medialib-form-label">Canva Project URL</label>
                  <input
                    type="url"
                    required
                    className="medialib-form-input"
                    placeholder="https://www.canva.com/design/..."
                    value={editCanvaUrl}
                    onChange={(e) => setEditCanvaUrl(e.target.value)}
                  />
                </div>
              )}

              {/* Worship Song Specific Fields (No Key) */}
              {editingAsset.format === 'SONG' && (
                <>
                  <div className="medialib-form-group">
                    <label className="medialib-form-label">Artist / Worship Leader</label>
                    <input
                      type="text"
                      className="medialib-form-input"
                      placeholder="e.g. Hillsong Worship"
                      value={editArtist}
                      onChange={(e) => setEditArtist(e.target.value)}
                    />
                  </div>
                  <div className="medialib-form-group">
                    <label className="medialib-form-label">Lyrics & Slides (Separate slides with blank lines)</label>
                    <textarea
                      rows={5}
                      className="medialib-form-textarea"
                      placeholder="Verse 1 lyrics here...&#10;&#10;Chorus lyrics here..."
                      value={editLyrics}
                      onChange={(e) => setEditLyrics(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* Footer Buttons */}
              <div className="medialib-modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  {t.mediaLibrary.cancel}
                </button>
                <button type="submit" className="btn-primary">
                  {t.mediaLibrary.updateButton}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaLibraryScreen;
