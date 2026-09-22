import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppDispatch } from '../../store/hooks';
import {
  addRundownItem,
  addCustomBackgroundTheme,
} from '../../store/features/presentation';
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
  const [selectedSource, setSelectedSource] = useState<MediaSourceCategory>('VIDEO');
  const [activeFilter, setActiveFilter] = useState<FormatFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});

  // Loaded database data
  const [songs, setSongs] = useState<SongRecord[]>([]);
  const [images, setImages] = useState<ImageMediaRecord[]>([]);
  const [externalDecks, setExternalDecks] = useState<ExternalPresentationRecord[]>([]);
  const [customAssets, setCustomAssets] = useState<ProMediaAsset[]>([]);

  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [modalTab, setModalTab] = useState<ModalTab>('VIDEO');

  // Form states - Video / Motion Loop
  const [videoTitle, setVideoTitle] = useState('');
  const [videoFormat, setVideoFormat] = useState<'MOV' | 'MP4'>('MOV');
  const [videoRes, setVideoRes] = useState('4K');
  const [videoDuration, setVideoDuration] = useState('0:30');
  const [videoCategory, setVideoCategory] = useState<MediaSourceCategory>('VIDEO');
  const [videoDataUrl, setVideoDataUrl] = useState('');

  // Form states - PPT
  const [pptTitle, setPptTitle] = useState('');
  const [pptFilePath, setPptFilePath] = useState('');
  const [pptSlideCount, setPptSlideCount] = useState(16);
  const [pptCategory, setPptCategory] = useState<MediaSourceCategory>('SPEAKER_DECK');

  // Form states - Image
  const [imgTitle, setImgTitle] = useState('');
  const [imgDataUrl, setImgDataUrl] = useState('');
  const [imgCategory, setImgCategory] = useState<MediaSourceCategory>('ANNOUNCEMENTS');

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
  const pptFileInputRef = useRef<HTMLInputElement>(null);
  const imgFileInputRef = useRef<HTMLInputElement>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  // Load records from local DB
  const loadDatabaseRecords = async () => {
    try {
      const [allSongs, allImages, allDecks] = await Promise.all([
        bunsenDb.getAllSongs(),
        bunsenDb.getAllImages(),
        bunsenDb.getAllExternalPresentations(),
      ]);
      setSongs(allSongs);
      setImages(allImages);
      setExternalDecks(allDecks);

      // Restore custom uploaded assets from local DB settings store
      const savedCustom = await bunsenDb.getSetting<ProMediaAsset[]>('pro_media_custom_assets', []);
      if (savedCustom) {
        setCustomAssets(savedCustom);
      }
    } catch (err) {
      console.error('Failed to load records from BunsenWorshipDB:', err);
    }
  };

  useEffect(() => {
    loadDatabaseRecords();
  }, []);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 3500);
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
    const list: ProMediaAsset[] = [...PRO_MEDIA_ASSETS, ...customAssets];

    // Add user's DB songs as assets
    songs.forEach((song) => {
      const exists = list.some((item) => item.id === `song-${song.id}`);
      if (!exists) {
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
      if (!exists) {
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
      if (!exists) {
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
  }, [songs, externalDecks, images, customAssets]);

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
    if (asset.format === 'SONG') {
      const matchedSong = songs.find((s) => `song-${s.id}` === asset.id);
      dispatch(
        addRundownItem({
          title: asset.title,
          subtitle: `${asset.resolution} • ${asset.durationOrSlides}`,
          time: '09:15',
          type: 'SONG',
          slides: matchedSong?.slides || [
            {
              id: `s-${Date.now()}-1`,
              section: 'Verse 1',
              lines: [asset.title, 'Worship Lyric line 1'],
            },
          ],
        })
      );
    } else if (asset.format === 'PPTX') {
      const count = asset.slidesCount || 12;
      dispatch(
        addRundownItem({
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
        })
      );
    } else if (asset.format === 'CANVA') {
      const count = asset.slidesCount || 8;
      dispatch(
        addRundownItem({
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
        })
      );
    } else {
      // Video / Still image
      dispatch(
        addRundownItem({
          title: asset.title,
          subtitle: `${asset.format} ${asset.resolution || 'Media'} • ${asset.durationOrSlides}`,
          time: '09:00',
          type: asset.format === 'MOV' || asset.format === 'MP4' ? 'LOOP' : 'IMAGE',
          slides: [
            {
              id: `s-media-${Date.now()}`,
              section: asset.title,
              lines: [],
              imageUrl: asset.thumbnailUrl,
              imageFit: 'cover',
            },
          ],
        })
      );
    }

    markAddedFeedback(asset.id);
    showFeedback(`"${asset.title}" added to service rundown!`);
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

  // Handle uploading and saving new assets
  const handleSaveUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (modalTab === 'VIDEO') {
      if (!videoTitle.trim()) return;
      const newAsset: ProMediaAsset = {
        id: `asset-video-${Date.now()}`,
        title: videoTitle.trim(),
        format: videoFormat,
        resolution: videoRes,
        durationOrSlides: videoDuration || '0:30',
        sourceCategory: videoCategory,
        thumbnailUrl: videoDataUrl || PRO_MEDIA_ASSETS[0].thumbnailUrl,
      };

      const updated = [newAsset, ...customAssets];
      setCustomAssets(updated);
      await bunsenDb.setSetting('pro_media_custom_assets', updated);
      setShowUploadModal(false);
      setVideoTitle('');
      setVideoDataUrl('');
      showFeedback(`Video loop "${newAsset.title}" uploaded!`);
    } else if (modalTab === 'PPT') {
      if (!pptTitle.trim()) return;
      const count = Number(pptSlideCount) || 12;
      const pptRecord: ExternalPresentationRecord = {
        id: `ppt-${Date.now()}`,
        title: pptTitle.trim(),
        type: 'PPT',
        filePath: pptFilePath.trim() || undefined,
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
      showFeedback(`PowerPoint "${pptRecord.title}" linked successfully!`);
    } else if (modalTab === 'IMAGE') {
      if (!imgTitle.trim() || !imgDataUrl) {
        showFeedback('Please provide a title and select an image', 'error');
        return;
      }
      const newImg: ImageMediaRecord = {
        id: `img-${Date.now()}`,
        title: imgTitle.trim(),
        category: 'BACKGROUND',
        dataUrl: imgDataUrl,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await bunsenDb.saveImage(newImg);
      await loadDatabaseRecords();
      setShowUploadModal(false);
      setImgTitle('');
      setImgDataUrl('');
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
          <button
            type="button"
            className="medialib-filter-link"
            onClick={() => setFeedbackMessage(null)}
          >
            &times;
          </button>
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
                      </div>
                    </div>

                    {/* Card Info Below Thumbnail */}
                    <div className="medialib-card-info">
                      <h4 className="medialib-card-title" title={item.title}>
                        {item.title}
                      </h4>
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
                <div className="medialib-form-group">
                  <label className="medialib-form-label">Video / Motion Loop Title *</label>
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

                <div className="medialib-form-group" style={{ marginTop: '0.75rem' }}>
                  <label className="medialib-form-label">Graphic Title *</label>
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="e.g. Sunday Morning Opening BG"
                    value={imgTitle}
                    onChange={(e) => setImgTitle(e.target.value)}
                    required
                  />
                </div>

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
                  <button type="submit" className="btn-primary" disabled={!imgDataUrl}>
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
    </div>
  );
};

export default MediaLibraryScreen;
