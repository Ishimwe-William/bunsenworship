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
  const [modalTab, setModalTab] = useState<ModalTab>('VIDEO');

  // Edit Modal states (Update CRUD)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<ProMediaAsset | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<MediaSourceCategory>('VIDEO');
  const [editResolution, setEditResolution] = useState('4K');
  const [editDuration, setEditDuration] = useState('0:30');
  const [editFilePath, setEditFilePath] = useState('');
  const [editCanvaUrl, setEditCanvaUrl] = useState('');
  const [editSlideCount, setEditSlideCount] = useState<number>(10);
  const [editArtist, setEditArtist] = useState('');
  const [editKey, setEditKey] = useState('G');
  const [editLyrics, setEditLyrics] = useState('');

  // Form states - Video / Motion Loop
  const [videoTitle, setVideoTitle] = useState('');
  const [videoFormat, setVideoFormat] = useState<'MOV' | 'MP4'>('MOV');
  const [videoRes, setVideoRes] = useState('4K');
  const [videoDuration, setVideoDuration] = useState('0:30');
  const [videoCategory, setVideoCategory] = useState<MediaSourceCategory>('VIDEO');
  const [videoDataUrl, setVideoDataUrl] = useState('');
  const [videoFilePath, setVideoFilePath] = useState('');
  const [videoYoutubeUrl, setVideoYoutubeUrl] = useState('');
  const [videoSourceType, setVideoSourceType] = useState<'file' | 'youtube'>('file');

  // Form states - PPT
  const [pptTitle, setPptTitle] = useState('');
  const [pptFilePath, setPptFilePath] = useState('');
  const [pptSlideCount, setPptSlideCount] = useState(16);
  const [pptCategory, setPptCategory] = useState<MediaSourceCategory>('SPEAKER_DECK');
  const [pptSourceType, setPptSourceType] = useState<'file' | 'url'>('file');
  const [pptUrl, setPptUrl] = useState('');

  // Form states - Image
  const [imgTitle, setImgTitle] = useState('');
  const [imgDataUrl, setImgDataUrl] = useState('');
  const [imgCategory, setImgCategory] = useState<MediaSourceCategory>('ANNOUNCEMENTS');
  const [imgSourceType, setImgSourceType] = useState<'file' | 'url'>('file');
  const [imgUrl, setImgUrl] = useState('');

  // Form states - Canva
  const [canvaTitle, setCanvaTitle] = useState('');
  const [canvaUrl, setCanvaUrl] = useState('');
  const [canvaSlideCount, setCanvaSlideCount] = useState(8);

  // Form states - Song
  const [songTitle, setSongTitle] = useState('');
  const [songArtist, setSongArtist] = useState('');
  const [songKey, setSongKey] = useState('G');
  const [songLyrics, setSongLyrics] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const pptFileInputRef = useRef<HTMLInputElement>(null);
  const imgFileInputRef = useRef<HTMLInputElement>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  const handleBrowseVideoFile = async () => {
    if (window.electronAPI?.openVideoDialog) {
      try {
        const selectedPath = await window.electronAPI.openVideoDialog();
        if (selectedPath) {
          setVideoFilePath(selectedPath);
          const filename = selectedPath.split(/[/\\]/).pop() || '';
          if (!videoTitle) {
            setVideoTitle(filename.replace(/\.[^/.]+$/, ''));
          }
          return;
        }
      } catch (err) {
        console.warn('Native openVideoDialog failed, falling back to input:', err);
      }
    }
    videoFileInputRef.current?.click();
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
        list.push({
          id: `song-${song.id}`,
          title: song.title,
          format: 'SONG',
          resolution: song.key ? `Key of ${song.key}` : 'Worship',
          durationOrSlides: `${song.slides.length} Slides`,
          sourceCategory: 'SONGS',
          thumbnailUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" width="960" height="540">
              <defs>
                <linearGradient id="sGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stop-color="#1e1b4b"/>
                  <stop offset="60%" stop-color="#312e81"/>
                  <stop offset="100%" stop-color="#0f172a"/>
                </linearGradient>
              </defs>
              <rect width="960" height="540" fill="url(#sGrad)"/>
              <circle cx="480" cy="220" r="70" fill="none" stroke="#818cf8" stroke-width="3" opacity="0.6"/>
              <g stroke="#a5b4fc" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none" transform="translate(456, 192) scale(2)">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" fill="#a5b4fc"/>
                <circle cx="18" cy="16" r="3" fill="#a5b4fc"/>
              </g>
              <text x="480" y="340" font-family="-apple-system, sans-serif" font-size="34" font-weight="800" fill="#ffffff" text-anchor="middle">${song.title}</text>
              <text x="480" y="385" font-family="-apple-system, sans-serif" font-size="18" fill="#cbd5e1" text-anchor="middle">${song.artist || 'Worship Track'}</text>
            </svg>
          `.trim())}`,
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
          resolution: deck.type === 'PPT' ? '16:9' : 'Cloud',
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
          resolution: '4K',
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
        subtitle: `${asset.resolution || 'Lyrics'} • ${asset.durationOrSlides || 'Hymn'}`,
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
      const count = asset.slidesCount || 12;
      itemToCreate = {
        title: asset.title,
        subtitle: `PowerPoint Deck • ${asset.durationOrSlides}`,
        time: '09:45',
        type: 'PPT',
        externalMeta: {
          type: 'PPT',
          filePath: asset.filePath,
          slideCount: count,
        },
        slides: Array.from({ length: count }, (_, i) => ({
          id: `s-ppt-${Date.now()}-${i + 1}`,
          section: i === 0 ? 'Title Slide' : `Slide ${i + 1}`,
          lines: [i === 0 ? asset.title : `Key Point ${i}`, 'Presentation Point'],
          imageUrl: asset.thumbnailUrl,
          imageFit: 'contain',
        })),
      };
    } else if (asset.format === 'CANVA') {
      const count = asset.slidesCount || 8;
      itemToCreate = {
        title: asset.title,
        subtitle: 'Canva Cloud Visual Presentation',
        time: '10:00',
        type: 'CANVA',
        externalMeta: {
          type: 'CANVA',
          canvaUrl: asset.canvaUrl,
        },
        slides: Array.from({ length: count }, (_, i) => ({
          id: `s-canva-${Date.now()}-${i + 1}`,
          section: `Page ${i + 1}`,
          lines: [`Canva Slide ${i + 1}`, 'Visual Content'],
          imageUrl: asset.thumbnailUrl,
          imageFit: 'contain',
        })),
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
        subtitle: `${asset.format} ${asset.resolution || 'Media'} • ${asset.durationOrSlides}`,
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
    setEditResolution(item.resolution || '4K');
    setEditDuration(item.durationOrSlides || '0:30');
    setEditFilePath(item.filePath || '');
    setEditCanvaUrl(item.canvaUrl || '');
    setEditSlideCount(item.slidesCount || 10);

    if (item.format === 'SONG') {
      const rawSongId = item.id.replace('song-', '');
      const foundSong = songs.find((s) => s.id === rawSongId || `song-${s.id}` === item.id);
      setEditArtist(foundSong?.artist || '');
      setEditKey(foundSong?.key || 'G');
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
            key: editKey.trim() || undefined,
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
          const updatedDeck: ExternalPresentationRecord = {
            ...foundDeck,
            title,
            filePath: editFilePath.trim() || foundDeck.filePath,
            canvaUrl: editCanvaUrl.trim() || foundDeck.canvaUrl,
            slideCount: Number(editSlideCount) || foundDeck.slideCount,
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
                resolution: editResolution,
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
          resolution: editResolution,
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
        resolution: videoRes,
        durationOrSlides: videoDuration || '0:30',
        sourceCategory: videoCategory,
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

      const count = Number(pptSlideCount) || 12;
      const pptRecord: ExternalPresentationRecord = {
        id: `ppt-${Date.now()}`,
        title: pptTitle.trim(),
        type: 'PPT',
        filePath: pptSourceType === 'file' ? pptFilePath.trim() : pptUrl.trim(),
        slideCount: count,
        slides: Array.from({ length: count }, (_, i) => ({
          id: `s-${Date.now()}-${i + 1}`,
          section: i === 0 ? 'Title Slide' : `Slide ${i + 1}`,
          lines: [i === 0 ? pptTitle.trim() : `Point ${i}`, 'Presentation Note'],
        })),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await bunsenDb.saveExternalPresentation(pptRecord);
      await loadDatabaseRecords();
      setShowUploadModal(false);
      setPptTitle('');
      setPptFilePath('');
      setPptUrl('');
      setPptSourceType('file');
      showFeedback(`PowerPoint "${pptRecord.title}" linked successfully!`);
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
        category: imgCategory === 'ANNOUNCEMENTS' ? 'ANNOUNCEMENT' : imgCategory === 'SPEAKER_DECK' ? 'SERMON' : 'BACKGROUND',
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
      const count = Number(canvaSlideCount) || 8;
      const canvaRecord: ExternalPresentationRecord = {
        id: `canva-${Date.now()}`,
        title: canvaTitle.trim(),
        type: 'CANVA',
        canvaUrl: canvaUrl.trim(),
        slideCount: count,
        slides: Array.from({ length: count }, (_, i) => ({
          id: `s-canva-${Date.now()}-${i + 1}`,
          section: `Page ${i + 1}`,
          lines: [`Canva Slide ${i + 1}`, 'Visual Slide Content'],
        })),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await bunsenDb.saveExternalPresentation(canvaRecord);
      await loadDatabaseRecords();
      setShowUploadModal(false);
      setCanvaTitle('');
      setCanvaUrl('');
      showFeedback(`Canva presentation "${canvaRecord.title}" linked!`);
    } else if (modalTab === 'SONG') {
      if (!songTitle.trim()) return;
      const rawBlocks = songLyrics.split(/\n\s*\n/).filter((b) => b.trim().length > 0);
      const generatedSlides =
        rawBlocks.length > 0
          ? rawBlocks.map((block, idx) => ({
              id: `s-${Date.now()}-${idx + 1}`,
              section: idx === 0 ? 'Verse 1' : idx === 1 ? 'Chorus' : `Slide ${idx + 1}`,
              lines: block.split('\n').map((l) => l.trim()).filter(Boolean),
            }))
          : [
              {
                id: `s-${Date.now()}-1`,
                section: 'Verse 1',
                lines: [songTitle.trim(), 'Worship lyric line'],
              },
            ];

      const newSong: SongRecord = {
        id: `song-${Date.now()}`,
        title: songTitle.trim(),
        artist: songArtist.trim() || undefined,
        key: songKey.trim() || undefined,
        tags: ['Worship', 'Praise'],
        slides: generatedSlides,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await bunsenDb.saveSong(newSong);
      await loadDatabaseRecords();
      setShowUploadModal(false);
      setSongTitle('');
      setSongArtist('');
      setSongLyrics('');
      showFeedback(`Worship Song "${newSong.title}" added to library!`);
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

        <button
          type="button"
          className="medialib-upload-btn"
          onClick={() => setShowUploadModal(true)}
        >
          <UploadIcon size={16} />
          <span>{t.mediaLibrary.uploadButton}</span>
        </button>
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
                          {item.resolution && (
                            <span className="medialib-res-pill">{item.resolution}</span>
                          )}
                        </div>
                        <span className="medialib-duration-pill">{item.durationOrSlides}</span>
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
          Upload Presentation / Video Modal
          ----------------------------------------------------------------- */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div
            className="quick-edit-modal-card"
            style={{ maxWidth: '640px' }}
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

            {/* Modal Navigation Tabs */}
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
              <button
                type="button"
                className={`medialib-modal-tab-btn ${modalTab === 'SONG' ? 'active' : ''}`}
                onClick={() => setModalTab('SONG')}
              >
                {t.mediaLibrary.tabSong}
              </button>
              <button
                type="button"
                className={`medialib-modal-tab-btn ${modalTab === 'BACKUP' ? 'active' : ''}`}
                onClick={() => setModalTab('BACKUP')}
              >
                {t.mediaLibrary.tabBackup}
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
                          if (file) {
                            let resolvedPath: string | undefined;
                            if (window.electronAPI?.getPathForFile) {
                              try {
                                resolvedPath = window.electronAPI.getPathForFile(file);
                              } catch {
                                // ignore
                              }
                            }
                            const rawPath = resolvedPath || (file as unknown as { path?: string }).path;
                            const objectUrl = URL.createObjectURL(file);
                            setVideoFilePath(rawPath || objectUrl);
                            setVideoDataUrl(objectUrl);
                            if (!videoTitle) {
                              setVideoTitle(file.name.replace(/\.[^/.]+$/, ''));
                            }
                          }
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
                    {getYouTubeThumbnailUrl(videoYoutubeUrl) && (
                      <div
                        style={{
                          marginTop: '8px',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          border: '1px solid var(--border-subtle)',
                          position: 'relative',
                        }}
                      >
                        <img
                          src={getYouTubeThumbnailUrl(videoYoutubeUrl)!}
                          alt="YouTube Preview"
                          style={{
                            width: '100%',
                            height: '140px',
                            objectFit: 'cover',
                            display: 'block',
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '6px',
                            left: '8px',
                            background: 'rgba(0,0,0,0.75)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.65rem',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span style={{ color: '#ef4444' }}>●</span> YouTube Thumbnail Detected
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div className="medialib-form-group">
                    <label className="medialib-form-label">Format</label>
                    <select
                      className="auth-input"
                      value={videoFormat}
                      onChange={(e) => setVideoFormat(e.target.value as 'MOV' | 'MP4')}
                    >
                      <option value="MOV">MOV (ProRes)</option>
                      <option value="MP4">MP4 (H.264)</option>
                    </select>
                  </div>

                  <div className="medialib-form-group">
                    <label className="medialib-form-label">Resolution</label>
                    <select
                      className="auth-input"
                      value={videoRes}
                      onChange={(e) => setVideoRes(e.target.value)}
                    >
                      <option value="4K">4K UHD</option>
                      <option value="1080p">1080p FHD</option>
                      <option value="720p">720p HD</option>
                    </select>
                  </div>

                  <div className="medialib-form-group">
                    <label className="medialib-form-label">Duration</label>
                    <input
                      type="text"
                      className="auth-input"
                      placeholder="0:30"
                      value={videoDuration}
                      onChange={(e) => setVideoDuration(e.target.value)}
                    />
                  </div>
                </div>

                <div className="medialib-form-group">
                  <label className="medialib-form-label">Media Source Category</label>
                  <select
                    className="auth-input"
                    value={videoCategory}
                    onChange={(e) => setVideoCategory(e.target.value as MediaSourceCategory)}
                  >
                    <option value="VIDEO">Video Backgrounds</option>
                    <option value="ANNOUNCEMENTS">Announcements Loops</option>
                    <option value="SPEAKER_DECK">Speaker Slide Decks</option>
                  </select>
                </div>

                <div className="medialib-form-group">
                  <label className="medialib-form-label">Preview Image / Poster (Optional)</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
                    >
                      {videoDataUrl ? 'Change Thumbnail...' : 'Choose Thumbnail...'}
                    </button>
                    {videoDataUrl && (
                      <span style={{ fontSize: '0.75rem', color: '#10b981' }}>Preview loaded</span>
                    )}
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
                    placeholder="e.g. Sermon Outline Oct 24"
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
                        placeholder="Select file or paste file path..."
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
                            const path = (file as unknown as { path?: string }).path || file.name;
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
                        onClick={() => pptFileInputRef.current?.click()}
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="medialib-form-group">
                    <label className="medialib-form-label">Category</label>
                    <select
                      className="auth-input"
                      value={pptCategory}
                      onChange={(e) => setPptCategory(e.target.value as MediaSourceCategory)}
                    >
                      <option value="SPEAKER_DECK">Speaker Slide Decks</option>
                      <option value="POWERPOINT">PowerPoint Uploads</option>
                      <option value="ANNOUNCEMENTS">Announcements Loops</option>
                    </select>
                  </div>

                  <div className="medialib-form-group">
                    <label className="medialib-form-label">Slide Count</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      className="auth-input"
                      value={pptSlideCount}
                      onChange={(e) => setPptSlideCount(Number(e.target.value))}
                    />
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
                    {t.mediaLibrary.savePowerPoint}
                  </button>
                </div>
              </form>
            )}

            {/* TAB: Image */}
            {modalTab === 'IMAGE' && (
              <form onSubmit={handleSaveUpload} className="modal-body">
                <div className="medialib-form-group">
                  <label className="medialib-form-label">Image Title *</label>
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="e.g. Church Building Photo"
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
                          Supports PNG, JPG, JPEG, WEBP, SVG (Offline stored)
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

                <div className="medialib-form-group">
                  <label className="medialib-form-label">Category</label>
                  <select
                    className="auth-input"
                    value={imgCategory}
                    onChange={(e) => setImgCategory(e.target.value as MediaSourceCategory)}
                  >
                    <option value="VIDEO">Video Backgrounds / Stills</option>
                    <option value="ANNOUNCEMENTS">Announcements Loops</option>
                    <option value="SPEAKER_DECK">Speaker Slide Decks</option>
                  </select>
                </div>

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

                <div className="medialib-form-group">
                  <label className="medialib-form-label">Canva Presentation Link *</label>
                  <input
                    type="url"
                    className="auth-input"
                    placeholder="https://www.canva.com/design/.../view"
                    value={canvaUrl}
                    onChange={(e) => setCanvaUrl(e.target.value)}
                    required
                  />
                </div>

                <div className="medialib-form-group">
                  <label className="medialib-form-label">Estimated Slide Count</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    className="auth-input"
                    value={canvaSlideCount}
                    onChange={(e) => setCanvaSlideCount(Number(e.target.value))}
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

            {/* TAB: Song */}
            {modalTab === 'SONG' && (
              <form onSubmit={handleSaveUpload} className="modal-body">
                <div className="medialib-form-group">
                  <label className="medialib-form-label">Song Title *</label>
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="e.g. Way Maker / Living Hope"
                    value={songTitle}
                    onChange={(e) => setSongTitle(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="medialib-form-group">
                    <label className="medialib-form-label">Artist</label>
                    <input
                      type="text"
                      className="auth-input"
                      placeholder="e.g. Sinach / Phil Wickham"
                      value={songArtist}
                      onChange={(e) => setSongArtist(e.target.value)}
                    />
                  </div>

                  <div className="medialib-form-group">
                    <label className="medialib-form-label">Key</label>
                    <select
                      className="auth-input"
                      value={songKey}
                      onChange={(e) => setSongKey(e.target.value)}
                    >
                      {['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'].map((k) => (
                        <option key={k} value={k}>
                          Key of {k}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="medialib-form-group">
                  <label className="medialib-form-label">Lyrics (Separate slides with a blank line)</label>
                  <textarea
                    className="auth-input"
                    rows={6}
                    placeholder={`[Verse 1]\nYou are here, moving in our midst\nI worship You, I worship You\n\n[Chorus]\nWay maker, miracle worker\nPromise keeper, light in the darkness`}
                    value={songLyrics}
                    onChange={(e) => setSongLyrics(e.target.value)}
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
                    {t.mediaLibrary.saveSong}
                  </button>
                </div>
              </form>
            )}

            {/* TAB: Backup & Sync */}
            {modalTab === 'BACKUP' && (
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                  All media records and configurations are persisted in local IndexedDB (<code>BunsenWorshipDB</code> v2).
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleExportBackup}
                    style={{ justifyContent: 'center' }}
                  >
                    <DownloadIcon size={16} />
                    <span>Export JSON Backup</span>
                  </button>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => backupFileInputRef.current?.click()}
                    style={{ justifyContent: 'center' }}
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

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleRestoreSeedData}
                  style={{ justifyContent: 'center', marginTop: '0.5rem' }}
                >
                  <RefreshCwIcon size={14} />
                  <span>Reset to Default Worship Assets</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* -----------------------------------------------------------------
          Edit Media Asset Modal (UPDATE CRUD)
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

              {/* Category */}
              <div className="medialib-form-group">
                <label className="medialib-form-label">{t.mediaLibrary.categoryLabel}</label>
                <select
                  className="medialib-form-select"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as MediaSourceCategory)}
                >
                  <option value="VIDEO">{t.mediaLibrary.videoBackgrounds}</option>
                  <option value="POWERPOINT">{t.mediaLibrary.powerPointUploads}</option>
                  <option value="ANNOUNCEMENTS">{t.mediaLibrary.announcementsLoops}</option>
                  <option value="SPEAKER_DECK">{t.mediaLibrary.speakerDecks}</option>
                  <option value="SONGS">{t.mediaLibrary.worshipSongs}</option>
                  <option value="CANVA">{t.mediaLibrary.canvaPresentations}</option>
                </select>
              </div>

              {/* Video Specific Fields */}
              {(editingAsset.format === 'MOV' || editingAsset.format === 'MP4') && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div className="medialib-form-group">
                    <label className="medialib-form-label">Resolution</label>
                    <select
                      className="medialib-form-select"
                      value={editResolution}
                      onChange={(e) => setEditResolution(e.target.value)}
                    >
                      <option value="4K">4K UHD (3840x2160)</option>
                      <option value="1080p">1080p Full HD (1920x1080)</option>
                      <option value="720p">720p HD (1280x720)</option>
                    </select>
                  </div>
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
                </div>
              )}

              {/* PowerPoint Specific Fields */}
              {editingAsset.format === 'PPTX' && (
                <>
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
                  <div className="medialib-form-group">
                    <label className="medialib-form-label">Slide Count</label>
                    <input
                      type="number"
                      min="1"
                      max="200"
                      className="medialib-form-input"
                      value={editSlideCount}
                      onChange={(e) => setEditSlideCount(Number(e.target.value))}
                    />
                  </div>
                </>
              )}

              {/* Canva Specific Fields */}
              {editingAsset.format === 'CANVA' && (
                <>
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
                  <div className="medialib-form-group">
                    <label className="medialib-form-label">Slide Count</label>
                    <input
                      type="number"
                      min="1"
                      max="200"
                      className="medialib-form-input"
                      value={editSlideCount}
                      onChange={(e) => setEditSlideCount(Number(e.target.value))}
                    />
                  </div>
                </>
              )}

              {/* Worship Song Specific Fields */}
              {editingAsset.format === 'SONG' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.85rem' }}>
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
                      <label className="medialib-form-label">Key</label>
                      <select
                        className="medialib-form-select"
                        value={editKey}
                        onChange={(e) => setEditKey(e.target.value)}
                      >
                        {['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'].map((k) => (
                          <option key={k} value={k}>
                            Key of {k}
                          </option>
                        ))}
                      </select>
                    </div>
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
