import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppDispatch } from '../../store/hooks';
import {
  addRundownItem,
  setLoadedRundown,
  addCustomBackgroundTheme,
} from '../../store/features/presentation';
import {
  bunsenDb,
  SongRecord,
  ExternalPresentationRecord,
  ServiceRecord,
  ImageMediaRecord,
  SEED_SONGS,
  SEED_EXTERNAL_PRESENTATIONS,
  SEED_IMAGES,
} from '../../db';
import {
  SearchIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  DatabaseIcon,
  FileTextIcon,
  LinkIcon,
  DownloadIcon,
  UploadIcon,
  CheckIcon,
  RefreshCwIcon,
  PresentationIcon,
  FolderIcon,
  ImageIcon,
} from '../common/Icons';
import './MediaLibraryScreen.css';

type LibraryTab = 'songs' | 'images' | 'decks' | 'rundowns' | 'backup';
type ImageCategoryFilter = 'ALL' | 'BACKGROUND' | 'SERMON' | 'ANNOUNCEMENT' | 'PHOTO' | 'SCRIPTURE';

export const MediaLibraryScreen: React.FC = () => {
  const dispatch = useAppDispatch();

  // Active state
  const [activeTab, setActiveTab] = useState<LibraryTab>('songs');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImageCategory, setSelectedImageCategory] = useState<ImageCategoryFilter>('ALL');
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});

  // Loaded database data
  const [songs, setSongs] = useState<SongRecord[]>([]);
  const [images, setImages] = useState<ImageMediaRecord[]>([]);
  const [externalDecks, setExternalDecks] = useState<ExternalPresentationRecord[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [showAddSongModal, setShowAddSongModal] = useState(false);
  const [showAddImageModal, setShowAddImageModal] = useState(false);
  const [showLinkPptModal, setShowLinkPptModal] = useState(false);
  const [showLinkCanvaModal, setShowLinkCanvaModal] = useState(false);
  const [editingSongId, setEditingSongId] = useState<string | null>(null);

  // Form states - Song
  const [songTitle, setSongTitle] = useState('');
  const [songArtist, setSongArtist] = useState('');
  const [songKey, setSongKey] = useState('G');
  const [songTempo, setSongTempo] = useState('72 BPM');
  const [songCcli, setSongCcli] = useState('');
  const [songTags, setSongTags] = useState('Worship, Praise');
  const [songLyrics, setSongLyrics] = useState('');

  // Form states - Image Upload
  const [imageTitle, setImageTitle] = useState('');
  const [imageCategory, setImageCategory] = useState<'BACKGROUND' | 'SERMON' | 'ANNOUNCEMENT' | 'PHOTO' | 'SCRIPTURE'>('BACKGROUND');
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [imageOverlayText, setImageOverlayText] = useState('');
  const [imageFit, setImageFit] = useState<'cover' | 'contain'>('contain');
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Form states - PPT
  const [pptTitle, setPptTitle] = useState('');
  const [pptFilePath, setPptFilePath] = useState('');
  const [pptSlideCount, setPptSlideCount] = useState(12);
  const [pptNotes, setPptNotes] = useState('');

  // Form states - Canva
  const [canvaTitle, setCanvaTitle] = useState('');
  const [canvaUrl, setCanvaUrl] = useState('');
  const [canvaEmbedUrl, setCanvaEmbedUrl] = useState('');
  const [canvaSlideCount, setCanvaSlideCount] = useState(6);
  const [canvaNotes, setCanvaNotes] = useState('');

  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  // Load records from local DB
  const loadDatabaseRecords = async () => {
    try {
      setIsLoading(true);
      const [allSongs, allImages, allDecks, allServices] = await Promise.all([
        bunsenDb.getAllSongs(),
        bunsenDb.getAllImages(),
        bunsenDb.getAllExternalPresentations(),
        bunsenDb.getAllServices(),
      ]);
      setSongs(allSongs);
      setImages(allImages);
      setExternalDecks(allDecks);
      setServices(allServices);
    } catch (err) {
      console.error('Failed to load records from BunsenWorshipDB:', err);
      showFeedback('Could not read from local database', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDatabaseRecords();
  }, []);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4000);
  };

  // Trigger feedback animation for "Add to Rundown"
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

  // 1. Add song to current presentation rundown
  const handleAddSongToRundown = (song: SongRecord) => {
    dispatch(
      addRundownItem({
        title: song.title,
        subtitle: `${song.artist || 'Worship'} • Key of ${song.key || 'C'}`,
        time: '09:15',
        type: 'SONG',
        slides: song.slides,
      })
    );
    markAddedFeedback(song.id);
    showFeedback(`"${song.title}" added to service rundown!`);
  };

  // 2. Add Image to current presentation rundown
  const handleAddImageToRundown = (image: ImageMediaRecord) => {
    dispatch(
      addRundownItem({
        title: image.title,
        subtitle: `${image.category} Image Slide`,
        time: '09:00',
        type: 'IMAGE',
        slides: [
          {
            id: `s-img-${Date.now()}`,
            section: image.title,
            lines: image.overlayLines || [],
            imageUrl: image.dataUrl,
            imageFit: image.category === 'BACKGROUND' ? 'cover' : 'contain',
          },
        ],
      })
    );
    markAddedFeedback(image.id);
    showFeedback(`Image "${image.title}" added to service rundown!`);
  };

  // 3. Set image as active background theme
  const handleSetImageAsBackground = (image: ImageMediaRecord) => {
    dispatch(
      addCustomBackgroundTheme({
        id: `bg-img-${image.id}`,
        name: image.title,
        gradient: image.dataUrl,
        accent: '#f472b6',
        imageUrl: image.dataUrl,
      })
    );
    showFeedback(`"${image.title}" set as active live background!`);
  };

  // 4. Add external deck (PPT or Canva) to current presentation rundown
  const handleAddDeckToRundown = (deck: ExternalPresentationRecord) => {
    dispatch(
      addRundownItem({
        title: deck.title,
        subtitle:
          deck.type === 'PPT'
            ? `PowerPoint: ${deck.filePath ? deck.filePath.split(/[/\\]/).pop() : 'Presentation.pptx'}`
            : `Canva Design: ${deck.canvaUrl ? 'Cloud Presentation' : 'Graphics Deck'}`,
        time: deck.type === 'PPT' ? '09:45' : '09:05',
        type: deck.type,
        slides: deck.slides,
        externalMeta: {
          type: deck.type,
          filePath: deck.filePath,
          canvaUrl: deck.canvaUrl,
          embedUrl: deck.embedUrl,
        },
      })
    );
    markAddedFeedback(deck.id);
    showFeedback(`"${deck.title}" added to service rundown!`);
  };

  // Handle local image file selection
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showFeedback('Please select a valid image file (.png, .jpg, .webp, .svg)', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImageDataUrl(dataUrl);
      if (!imageTitle) {
        setImageTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    };
    reader.readAsDataURL(file);
  };

  // Save new Image into local DB
  const handleSaveImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageTitle.trim() || !imageDataUrl) {
      showFeedback('Please provide a title and select an image file', 'error');
      return;
    }

    const lines = imageOverlayText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const newImage: ImageMediaRecord = {
      id: `img-${Date.now()}`,
      title: imageTitle.trim(),
      category: imageCategory,
      dataUrl: imageDataUrl,
      width: 1920,
      height: 1080,
      overlayLines: lines.length > 0 ? lines : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      await bunsenDb.saveImage(newImage);
      await loadDatabaseRecords();
      setShowAddImageModal(false);
      resetImageForm();
      showFeedback(`Image "${newImage.title}" saved to local database!`);
    } catch (err) {
      console.error('Error saving image:', err);
      showFeedback('Could not save image to database', 'error');
    }
  };

  const handleDeleteImage = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}" from the image library?`)) {
      return;
    }
    try {
      await bunsenDb.deleteImage(id);
      await loadDatabaseRecords();
      showFeedback(`Deleted "${title}" from image library.`);
    } catch (err) {
      console.error('Failed to delete image:', err);
      showFeedback('Could not delete image', 'error');
    }
  };

  const resetImageForm = () => {
    setImageTitle('');
    setImageCategory('BACKGROUND');
    setImageDataUrl('');
    setImageOverlayText('');
    setImageFit('contain');
  };

  // Save / Update Song in local DB
  const handleSaveSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!songTitle.trim()) return;

    const rawBlocks = songLyrics.split(/\n\s*\n/).filter((b) => b.trim().length > 0);
    const generatedSlides =
      rawBlocks.length > 0
        ? rawBlocks.map((block, idx) => {
            const lines = block
              .split('\n')
              .map((l) => l.trim())
              .filter(Boolean);
            const firstLine = lines[0] || '';
            let sectionName = `Slide ${idx + 1}`;
            if (firstLine.startsWith('[') && firstLine.endsWith(']')) {
              sectionName = firstLine.slice(1, -1);
              lines.shift();
            } else if (idx === 0) {
              sectionName = 'Verse 1';
            } else if (idx === 1) {
              sectionName = 'Chorus';
            }
            return {
              id: `s-${Date.now()}-${idx + 1}`,
              section: sectionName,
              lines: lines.length > 0 ? lines : ['(Instrumental)'],
            };
          })
        : [
            {
              id: `s-${Date.now()}-1`,
              section: 'Verse 1',
              lines: [songTitle.trim(), 'Worship line 1'],
            },
          ];

    const songRecord: SongRecord = {
      id: editingSongId || `song-${Date.now()}`,
      title: songTitle.trim(),
      artist: songArtist.trim() || undefined,
      key: songKey.trim() || undefined,
      tempo: songTempo.trim() || undefined,
      ccli: songCcli.trim() || undefined,
      tags: songTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      slides: generatedSlides,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      await bunsenDb.saveSong(songRecord);
      await loadDatabaseRecords();
      setShowAddSongModal(false);
      setEditingSongId(null);
      resetSongForm();
      showFeedback(`Song "${songRecord.title}" successfully saved to local DB!`);
    } catch (err) {
      console.error('Error saving song:', err);
      showFeedback('Failed to save song to local database', 'error');
    }
  };

  const handleEditSong = (song: SongRecord) => {
    setEditingSongId(song.id);
    setSongTitle(song.title);
    setSongArtist(song.artist || '');
    setSongKey(song.key || 'G');
    setSongTempo(song.tempo || '72 BPM');
    setSongCcli(song.ccli || '');
    setSongTags(song.tags ? song.tags.join(', ') : '');
    const reconstructedLyrics = song.slides
      .map((s) => `[${s.section}]\n${s.lines.join('\n')}`)
      .join('\n\n');
    setSongLyrics(reconstructedLyrics);
    setShowAddSongModal(true);
  };

  const handleDeleteSong = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}" from the local database?`)) {
      return;
    }
    try {
      await bunsenDb.deleteSong(id);
      await loadDatabaseRecords();
      showFeedback(`Deleted "${title}" from local DB.`);
    } catch (err) {
      console.error('Failed to delete song:', err);
      showFeedback('Could not delete song', 'error');
    }
  };

  const resetSongForm = () => {
    setSongTitle('');
    setSongArtist('');
    setSongKey('G');
    setSongTempo('72 BPM');
    setSongCcli('');
    setSongTags('Worship, Praise');
    setSongLyrics('');
    setEditingSongId(null);
  };

  // Save PPT presentation link to local DB
  const handleSavePpt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pptTitle.trim()) return;

    const outlineLines = pptNotes
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const count = Math.max(1, Number(pptSlideCount) || 1);

    const slides = Array.from({ length: count }, (_, i) => {
      const pointText = outlineLines[i] || `Slide ${i + 1} Content`;
      return {
        id: `s-ppt-${Date.now()}-${i + 1}`,
        section: i === 0 ? 'Title Slide' : `Slide ${i + 1}`,
        lines: [pointText, i === 0 ? (pptFilePath ? pptFilePath.split(/[/\\]/).pop() || '' : '') : ''],
      };
    });

    const pptRecord: ExternalPresentationRecord = {
      id: `ppt-${Date.now()}`,
      title: pptTitle.trim(),
      type: 'PPT',
      filePath: pptFilePath.trim() || undefined,
      slideCount: count,
      slides,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      await bunsenDb.saveExternalPresentation(pptRecord);
      await loadDatabaseRecords();
      setShowLinkPptModal(false);
      setPptTitle('');
      setPptFilePath('');
      setPptNotes('');
      showFeedback(`Linked PowerPoint "${pptRecord.title}" in local DB!`);
    } catch (err) {
      console.error('Error saving PPT link:', err);
      showFeedback('Could not link PowerPoint file', 'error');
    }
  };

  // Save Canva presentation link to local DB
  const handleSaveCanva = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canvaTitle.trim() || !canvaUrl.trim()) return;

    const count = Math.max(1, Number(canvaSlideCount) || 1);
    const noteLines = canvaNotes
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const slides = Array.from({ length: count }, (_, i) => {
      const pageText = noteLines[i] || `Canva Page ${i + 1}`;
      return {
        id: `s-canva-${Date.now()}-${i + 1}`,
        section: `Page ${i + 1}`,
        lines: [pageText, 'Canva Cloud Deck'],
      };
    });

    let embed = canvaEmbedUrl.trim();
    if (!embed && canvaUrl.includes('canva.com/design')) {
      embed = canvaUrl.split('?')[0] + '/view?embed';
    }

    const canvaRecord: ExternalPresentationRecord = {
      id: `canva-${Date.now()}`,
      title: canvaTitle.trim(),
      type: 'CANVA',
      canvaUrl: canvaUrl.trim(),
      embedUrl: embed || undefined,
      slideCount: count,
      slides,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      await bunsenDb.saveExternalPresentation(canvaRecord);
      await loadDatabaseRecords();
      setShowLinkCanvaModal(false);
      setCanvaTitle('');
      setCanvaUrl('');
      setCanvaEmbedUrl('');
      setCanvaNotes('');
      showFeedback(`Linked Canva deck "${canvaRecord.title}" in local DB!`);
    } catch (err) {
      console.error('Error saving Canva link:', err);
      showFeedback('Could not link Canva presentation', 'error');
    }
  };

  const handleDeleteDeck = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}" from linked presentations?`)) {
      return;
    }
    try {
      await bunsenDb.deleteExternalPresentation(id);
      await loadDatabaseRecords();
      showFeedback(`Removed "${title}" from local DB.`);
    } catch (err) {
      console.error('Failed to delete deck:', err);
      showFeedback('Could not remove presentation', 'error');
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

  // Restore Seed Data
  const handleRestoreSeedData = async () => {
    if (!window.confirm('Reset local database with standard worship songs, images, and sample decks?')) {
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

  // Filtered lists
  const filteredSongs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return songs;
    return songs.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.artist && s.artist.toLowerCase().includes(q)) ||
        (s.key && s.key.toLowerCase().includes(q)) ||
        (s.tags && s.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }, [songs, searchQuery]);

  const filteredImages = useMemo(() => {
    let list = images;
    if (selectedImageCategory !== 'ALL') {
      list = list.filter((img) => img.category === selectedImageCategory);
    }
    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      (img) =>
        img.title.toLowerCase().includes(q) ||
        img.category.toLowerCase().includes(q)
    );
  }, [images, selectedImageCategory, searchQuery]);

  const filteredDecks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return externalDecks;
    return externalDecks.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        (d.filePath && d.filePath.toLowerCase().includes(q)) ||
        (d.canvaUrl && d.canvaUrl.toLowerCase().includes(q))
    );
  }, [externalDecks, searchQuery]);

  const pptCount = useMemo(
    () => externalDecks.filter((d) => d.type === 'PPT').length,
    [externalDecks]
  );
  const canvaCount = useMemo(
    () => externalDecks.filter((d) => d.type === 'CANVA').length,
    [externalDecks]
  );

  return (
    <div className="screen-content medialib-container">
      {/* Top Header */}
      <div className="medialib-header">
        <div>
          <h2 className="screen-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DatabaseIcon size={22} style={{ color: 'var(--color-primary, #6366f1)' }} />
            <span>Media Library & Presentations</span>
          </h2>
          <p className="screen-description">
            Local persistent database for worship songs, still images & graphics, PowerPoint (.pptx) slides, and Canva decks.
          </p>
        </div>

        <div className="medialib-header-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              resetSongForm();
              setShowAddSongModal(true);
            }}
          >
            <PlusIcon size={15} />
            <span>+ New Song</span>
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              resetImageForm();
              setShowAddImageModal(true);
            }}
            style={{ borderColor: 'rgba(236, 72, 153, 0.4)', color: '#f472b6' }}
          >
            <ImageIcon size={15} />
            <span>+ Upload Image</span>
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowLinkPptModal(true)}
            style={{ borderColor: 'rgba(234, 88, 12, 0.4)', color: '#fb923c' }}
          >
            <FileTextIcon size={15} />
            <span>Link PowerPoint</span>
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowLinkCanvaModal(true)}
            style={{ borderColor: 'rgba(6, 182, 212, 0.4)', color: '#22d3ee' }}
          >
            <LinkIcon size={15} />
            <span>Link Canva</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div className={`medialib-banner ${feedbackMessage.type}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckIcon size={16} />
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            type="button"
            className="medialib-icon-btn"
            onClick={() => setFeedbackMessage(null)}
            style={{ padding: '2px 6px' }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Quick Summary Grid */}
      <div className="medialib-stats-grid">
        <div
          className={`medialib-stat-card ${activeTab === 'songs' ? 'active' : ''}`}
          onClick={() => setActiveTab('songs')}
        >
          <div className="medialib-stat-icon songs">
            <FileTextIcon size={20} />
          </div>
          <div>
            <div className="medialib-stat-label">Worship Songs</div>
            <div className="medialib-stat-value">{songs.length} Tracks</div>
          </div>
        </div>

        <div
          className={`medialib-stat-card ${activeTab === 'images' ? 'active' : ''}`}
          onClick={() => setActiveTab('images')}
        >
          <div className="medialib-stat-icon images">
            <ImageIcon size={20} />
          </div>
          <div>
            <div className="medialib-stat-label">Still Images</div>
            <div className="medialib-stat-value">{images.length} Graphics</div>
          </div>
        </div>

        <div
          className={`medialib-stat-card ${activeTab === 'decks' ? 'active' : ''}`}
          onClick={() => setActiveTab('decks')}
        >
          <div className="medialib-stat-icon ppt">
            <PresentationIcon size={20} />
          </div>
          <div>
            <div className="medialib-stat-label">PowerPoint Slides</div>
            <div className="medialib-stat-value">{pptCount} Decks</div>
          </div>
        </div>

        <div
          className={`medialib-stat-card ${activeTab === 'decks' ? 'active' : ''}`}
          onClick={() => setActiveTab('decks')}
        >
          <div className="medialib-stat-icon canva">
            <LinkIcon size={20} />
          </div>
          <div>
            <div className="medialib-stat-label">Canva Presentations</div>
            <div className="medialib-stat-value">{canvaCount} Linked</div>
          </div>
        </div>

        <div
          className={`medialib-stat-card ${activeTab === 'backup' ? 'active' : ''}`}
          onClick={() => setActiveTab('backup')}
        >
          <div className="medialib-stat-icon rundown">
            <DatabaseIcon size={20} />
          </div>
          <div>
            <div className="medialib-stat-label">IndexedDB Engine</div>
            <div className="medialib-stat-value">Active &bull; Offline</div>
          </div>
        </div>
      </div>

      {/* Navigation Toolbar */}
      <div className="medialib-toolbar">
        <div className="medialib-nav-tabs">
          <button
            type="button"
            className={`medialib-nav-btn ${activeTab === 'songs' ? 'active' : ''}`}
            onClick={() => setActiveTab('songs')}
          >
            <span>Worship Songs</span>
            <span className="medialib-count-badge">{songs.length}</span>
          </button>
          <button
            type="button"
            className={`medialib-nav-btn ${activeTab === 'images' ? 'active' : ''}`}
            onClick={() => setActiveTab('images')}
          >
            <ImageIcon size={14} />
            <span>Images & Stills</span>
            <span className="medialib-count-badge">{images.length}</span>
          </button>
          <button
            type="button"
            className={`medialib-nav-btn ${activeTab === 'decks' ? 'active' : ''}`}
            onClick={() => setActiveTab('decks')}
          >
            <span>PowerPoint & Canva Decks</span>
            <span className="medialib-count-badge">{externalDecks.length}</span>
          </button>
          <button
            type="button"
            className={`medialib-nav-btn ${activeTab === 'rundowns' ? 'active' : ''}`}
            onClick={() => setActiveTab('rundowns')}
          >
            <span>Saved Services</span>
            <span className="medialib-count-badge">{services.length}</span>
          </button>
          <button
            type="button"
            className={`medialib-nav-btn ${activeTab === 'backup' ? 'active' : ''}`}
            onClick={() => setActiveTab('backup')}
          >
            <DatabaseIcon size={14} />
            <span>Backup & Sync</span>
          </button>
        </div>

        {activeTab !== 'backup' && (
          <div className="medialib-search-box">
            <span className="medialib-search-icon">
              <SearchIcon size={14} />
            </span>
            <input
              type="text"
              className="medialib-search-input"
              placeholder={`Search ${
                activeTab === 'songs'
                  ? 'songs, keys, tags...'
                  : activeTab === 'images'
                  ? 'images, titles, categories...'
                  : 'decks, paths, URLs...'
              }`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* TAB 1: Worship Songs */}
      {activeTab === 'songs' && (
        <div>
          {isLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading songs from local database...
            </div>
          ) : filteredSongs.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <p>No songs found matching your search.</p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  resetSongForm();
                  setShowAddSongModal(true);
                }}
                style={{ marginTop: '0.75rem' }}
              >
                + Add First Song
              </button>
            </div>
          ) : (
            <div className="medialib-items-grid">
              {filteredSongs.map((song) => {
                const isAdded = addedItemIds[song.id];
                return (
                  <div key={song.id} className="medialib-card">
                    <span className="medialib-card-badge badge-song">SONG</span>
                    <div className="medialib-card-top">
                      <h4 className="medialib-card-title">{song.title}</h4>
                      <p className="medialib-card-sub">{song.artist || 'Traditional Worship'}</p>
                    </div>

                    <div className="medialib-card-meta">
                      {song.key && <span className="medialib-meta-tag key">Key: {song.key}</span>}
                      {song.tempo && <span className="medialib-meta-tag">{song.tempo}</span>}
                      <span className="medialib-meta-tag">{song.slides.length} Slides</span>
                      {song.ccli && <span className="medialib-meta-tag">CCLI #{song.ccli}</span>}
                    </div>

                    {song.slides.length > 0 && song.slides[0].lines && (
                      <div className="medialib-slide-preview-box">
                        <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: '2px' }}>
                          {song.slides[0].section}:
                        </strong>
                        {song.slides[0].lines.slice(0, 2).join(' / ')}
                      </div>
                    )}

                    <div className="medialib-card-actions">
                      <button
                        type="button"
                        className={`medialib-add-btn ${isAdded ? 'success' : ''}`}
                        onClick={() => handleAddSongToRundown(song)}
                        title="Add this song to the active presentation rundown"
                      >
                        {isAdded ? <CheckIcon size={14} /> : <PlusIcon size={14} />}
                        <span>{isAdded ? 'Added to Service' : 'Add to Rundown'}</span>
                      </button>

                      <button
                        type="button"
                        className="medialib-icon-btn"
                        onClick={() => handleEditSong(song)}
                        title="Edit Song"
                      >
                        <PencilIcon size={14} />
                      </button>

                      <button
                        type="button"
                        className="medialib-icon-btn danger"
                        onClick={() => handleDeleteSong(song.id, song.title)}
                        title="Delete from local DB"
                      >
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Images & Stills */}
      {activeTab === 'images' && (
        <div>
          {/* Category Filter Pills */}
          <div className="medialib-category-pills">
            {(
              [
                ['ALL', 'All Images'],
                ['BACKGROUND', 'Worship Backgrounds'],
                ['ANNOUNCEMENT', 'Announcements'],
                ['SERMON', 'Sermon Graphics'],
                ['SCRIPTURE', 'Scripture Art'],
                ['PHOTO', 'Photography'],
              ] as const
            ).map(([catKey, catLabel]) => (
              <button
                key={catKey}
                type="button"
                className={`medialib-cat-pill ${selectedImageCategory === catKey ? 'active' : ''}`}
                onClick={() => setSelectedImageCategory(catKey as ImageCategoryFilter)}
              >
                {catLabel}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading images from local database...
            </div>
          ) : filteredImages.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <p>No images found in this category.</p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  resetImageForm();
                  setShowAddImageModal(true);
                }}
                style={{ marginTop: '0.75rem' }}
              >
                <ImageIcon size={15} />
                <span>+ Upload First Image</span>
              </button>
            </div>
          ) : (
            <div className="medialib-images-grid">
              {filteredImages.map((img) => {
                const isAdded = addedItemIds[img.id];
                return (
                  <div key={img.id} className="medialib-image-card">
                    <div className="medialib-image-thumb-box">
                      <img
                        src={img.dataUrl}
                        alt={img.title}
                        className="medialib-image-thumb-img"
                      />
                      <span className="medialib-image-cat-badge">{img.category}</span>
                    </div>

                    <div className="medialib-image-info">
                      <div>
                        <h4 className="medialib-image-title">{img.title}</h4>
                        <div className="medialib-image-meta">
                          <span>1920 &times; 1080 &bull; Offline Stored</span>
                        </div>
                      </div>

                      <div className="medialib-image-actions">
                        <button
                          type="button"
                          className={`medialib-add-btn ${isAdded ? 'success' : ''}`}
                          onClick={() => handleAddImageToRundown(img)}
                          title="Project this image as a slide in the rundown"
                        >
                          {isAdded ? <CheckIcon size={14} /> : <PlusIcon size={14} />}
                          <span>{isAdded ? 'In Rundown' : 'Add to Rundown'}</span>
                        </button>

                        <button
                          type="button"
                          className="medialib-icon-btn"
                          onClick={() => handleSetImageAsBackground(img)}
                          title="Set as live background theme behind lyrics"
                          style={{ color: '#f472b6', borderColor: 'rgba(236, 72, 153, 0.3)' }}
                        >
                          <ImageIcon size={14} />
                        </button>

                        <button
                          type="button"
                          className="medialib-icon-btn danger"
                          onClick={() => handleDeleteImage(img.id, img.title)}
                          title="Delete image from local DB"
                        >
                          <TrashIcon size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PowerPoint & Canva Decks */}
      {activeTab === 'decks' && (
        <div>
          {isLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading presentations from local database...
            </div>
          ) : filteredDecks.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <p>No linked PowerPoint or Canva presentations found.</p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowLinkPptModal(true)}
                >
                  + Link PowerPoint (.pptx)
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowLinkCanvaModal(true)}
                >
                  + Link Canva Design
                </button>
              </div>
            </div>
          ) : (
            <div className="medialib-items-grid">
              {filteredDecks.map((deck) => {
                const isPpt = deck.type === 'PPT';
                const isAdded = addedItemIds[deck.id];

                return (
                  <div key={deck.id} className="medialib-card">
                    <span
                      className={`medialib-card-badge ${
                        isPpt ? 'badge-ppt' : 'badge-canva'
                      }`}
                    >
                      {deck.type}
                    </span>

                    <div className="medialib-card-top">
                      <h4 className="medialib-card-title">{deck.title}</h4>
                      <p className="medialib-card-sub">
                        {isPpt
                          ? 'Microsoft PowerPoint Presentation'
                          : 'Canva Cloud Visual Presentation'}
                      </p>
                    </div>

                    <div className="medialib-card-meta">
                      <span className="medialib-meta-tag">
                        {deck.slideCount || deck.slides.length} Slides
                      </span>
                      {deck.filePath && (
                        <span className="medialib-meta-tag path" title={deck.filePath}>
                          <FolderIcon size={11} />
                          {deck.filePath.split(/[/\\]/).pop()}
                        </span>
                      )}
                      {deck.canvaUrl && (
                        <span className="medialib-meta-tag path" title={deck.canvaUrl}>
                          <LinkIcon size={11} />
                          canva.com/design
                        </span>
                      )}
                    </div>

                    {deck.slides.length > 0 && (
                      <div className="medialib-slide-preview-box">
                        <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: '2px' }}>
                          Slides:
                        </strong>
                        {deck.slides
                          .slice(0, 3)
                          .map((s) => s.section || s.lines[0])
                          .join(' • ')}
                      </div>
                    )}

                    <div className="medialib-card-actions">
                      <button
                        type="button"
                        className={`medialib-add-btn ${isAdded ? 'success' : ''}`}
                        onClick={() => handleAddDeckToRundown(deck)}
                        title="Send this presentation directly to the live presentation rundown"
                      >
                        {isAdded ? <CheckIcon size={14} /> : <PlusIcon size={14} />}
                        <span>{isAdded ? 'Added to Service' : 'Add to Rundown'}</span>
                      </button>

                      {deck.canvaUrl && (
                        <a
                          href={deck.canvaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="medialib-icon-btn"
                          title="Open Canva Design in Browser"
                          style={{ textDecoration: 'none' }}
                        >
                          <LinkIcon size={14} />
                        </a>
                      )}

                      <button
                        type="button"
                        className="medialib-icon-btn danger"
                        onClick={() => handleDeleteDeck(deck.id, deck.title)}
                        title="Delete presentation link"
                      >
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Saved Services */}
      {activeTab === 'rundowns' && (
        <div className="medialib-items-grid">
          {services.map((srv) => (
            <div key={srv.id} className="medialib-card">
              <span className="medialib-card-badge" style={{ background: 'rgba(16, 185, 129, 0.25)', color: '#6ee7b7' }}>
                SERVICE
              </span>

              <div className="medialib-card-top">
                <h4 className="medialib-card-title">{srv.title}</h4>
                <p className="medialib-card-sub">Date: {srv.date}</p>
              </div>

              <div className="medialib-card-meta">
                <span className="medialib-meta-tag">{srv.items.length} Rundown Items</span>
                {srv.isCurrent && (
                  <span
                    className="medialib-meta-tag"
                    style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80' }}
                  >
                    Active in Console
                  </span>
                )}
              </div>

              <div className="medialib-slide-preview-box">
                {srv.items.map((i) => i.title).join(' • ')}
              </div>

              <div className="medialib-card-actions">
                <button
                  type="button"
                  className="medialib-add-btn"
                  onClick={() => {
                    dispatch(setLoadedRundown(srv.items));
                    showFeedback(`Service "${srv.title}" loaded into Live Console!`);
                  }}
                >
                  <span>Load into Live Console</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 5: Database Backup & Sync Hub */}
      {activeTab === 'backup' && (
        <div className="medialib-backup-panel">
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 4px 0' }}>
              BunsenWorship Local Storage Hub
            </h3>
            <p className="section-description">
              All worship songs, still images, PowerPoint links, Canva attachments, and services are saved in your local
              IndexedDB database (<code>BunsenWorshipDB</code> v2). You can backup your entire church presentation library
              to JSON files and restore anytime.
            </p>
          </div>

          <div className="medialib-backup-grid">
            {/* Card 1: Export */}
            <div className="medialib-backup-card">
              <div>
                <h4 className="medialib-backup-title">
                  <DownloadIcon size={18} />
                  <span>Export Database Backup</span>
                </h4>
                <p className="medialib-backup-desc">
                  Download a complete backup JSON snapshot of all worship songs, still images ({images.length}), PowerPoint links, Canva links,
                  and rundowns to your local hard drive.
                </p>
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={handleExportBackup}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <DownloadIcon size={15} />
                <span>Export to JSON File</span>
              </button>
            </div>

            {/* Card 2: Import */}
            <div className="medialib-backup-card">
              <div>
                <h4 className="medialib-backup-title">
                  <UploadIcon size={18} />
                  <span>Restore from Backup</span>
                </h4>
                <p className="medialib-backup-desc">
                  Import a previously exported BunsenWorship JSON backup file. All songs, images, and presentation links will
                  be safely merged into your local database.
                </p>
              </div>
              <div>
                <input
                  type="file"
                  ref={backupFileInputRef}
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={handleImportBackup}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => backupFileInputRef.current?.click()}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <UploadIcon size={15} />
                  <span>Select Backup File (.json)</span>
                </button>
              </div>
            </div>

            {/* Card 3: Seed reset */}
            <div className="medialib-backup-card">
              <div>
                <h4 className="medialib-backup-title">
                  <RefreshCwIcon size={18} />
                  <span>Load Sample Worship Library</span>
                </h4>
                <p className="medialib-backup-desc">
                  Populate the local database with pre-configured worship anthems (Glorious Day, Living Hope, Way Maker,
                  10,000 Reasons), sacred graphics ({SEED_IMAGES.length} still images), and sample presentations.
                </p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleRestoreSeedData}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <RefreshCwIcon size={15} />
                <span>Reset to Seed Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Upload / Add Image */}
      {showAddImageModal && (
        <div className="modal-overlay" onClick={() => setShowAddImageModal(false)}>
          <div
            className="quick-edit-modal-card"
            style={{ maxWidth: '580px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ImageIcon size={18} />
                <span>Upload Still Image or Graphic</span>
              </h3>
              <button
                type="button"
                className="quick-edit-btn"
                onClick={() => setShowAddImageModal(false)}
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveImage} className="modal-body">
              {/* Dropzone */}
              <input
                type="file"
                ref={imageFileInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) processImageFile(file);
                }}
              />

              {imageDataUrl ? (
                <div>
                  <div className="medialib-upload-preview-box">
                    <img
                      src={imageDataUrl}
                      alt="Upload Preview"
                      className="medialib-upload-preview-img"
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => imageFileInputRef.current?.click()}
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                    >
                      Choose Different Image
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={`medialib-dropzone ${isDraggingOver ? 'dragging' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingOver(true);
                  }}
                  onDragLeave={() => setIsDraggingOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) processImageFile(file);
                  }}
                  onClick={() => imageFileInputRef.current?.click()}
                >
                  <ImageIcon size={36} />
                  <p style={{ margin: '0.5rem 0 0.25rem 0', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Click or drag image file here
                  </p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Supports PNG, JPG, JPEG, WEBP, and SVG (Saved 100% offline in Local DB)
                  </p>
                </div>
              )}

              <div className="medialib-form-group">
                <label className="medialib-form-label">Image Title *</label>
                <input
                  type="text"
                  className="auth-input"
                  placeholder="e.g. Easter Sunrise / Sunday Welcome Banner"
                  value={imageTitle}
                  onChange={(e) => setImageTitle(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="medialib-form-group">
                  <label className="medialib-form-label">Category</label>
                  <select
                    className="auth-input"
                    value={imageCategory}
                    onChange={(e) =>
                      setImageCategory(
                        e.target.value as 'BACKGROUND' | 'SERMON' | 'ANNOUNCEMENT' | 'PHOTO' | 'SCRIPTURE'
                      )
                    }
                  >
                    <option value="BACKGROUND">Worship Background</option>
                    <option value="ANNOUNCEMENT">Announcement Banner</option>
                    <option value="SERMON">Sermon Illustration</option>
                    <option value="SCRIPTURE">Scripture Wallpaper</option>
                    <option value="PHOTO">Ministry Photography</option>
                  </select>
                </div>

                <div className="medialib-form-group">
                  <label className="medialib-form-label">Projection Display Mode</label>
                  <select
                    className="auth-input"
                    value={imageFit}
                    onChange={(e) => setImageFit(e.target.value as 'cover' | 'contain')}
                  >
                    <option value="contain">Fit Canvas (Contain - No Crop)</option>
                    <option value="cover">Fill Screen (Cover - Edge to Edge)</option>
                  </select>
                </div>
              </div>

              <div className="medialib-form-group">
                <label className="medialib-form-label">Optional Text Overlay (Scripture / Caption)</label>
                <textarea
                  className="auth-input"
                  rows={3}
                  placeholder="Optional words to overlay over the graphic on the projector screen..."
                  value={imageOverlayText}
                  onChange={(e) => setImageOverlayText(e.target.value)}
                />
              </div>

              <div className="modal-footer" style={{ padding: '0.75rem 0 0 0', border: 'none' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAddImageModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={!imageDataUrl}>
                  Save Image to Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: Add / Edit Song */}
      {showAddSongModal && (
        <div className="modal-overlay" onClick={() => setShowAddSongModal(false)}>
          <div
            className="quick-edit-modal-card"
            style={{ maxWidth: '620px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">
                {editingSongId ? 'Edit Worship Song' : 'Add New Worship Song'}
              </h3>
              <button
                type="button"
                className="quick-edit-btn"
                onClick={() => setShowAddSongModal(false)}
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveSong} className="modal-body">
              <div className="medialib-form-group">
                <label className="medialib-form-label">Song Title *</label>
                <input
                  type="text"
                  className="auth-input"
                  placeholder="e.g. Living Hope / Glorious Day"
                  value={songTitle}
                  onChange={(e) => setSongTitle(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="medialib-form-group">
                  <label className="medialib-form-label">Artist / Author</label>
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="e.g. Phil Wickham"
                    value={songArtist}
                    onChange={(e) => setSongArtist(e.target.value)}
                  />
                </div>

                <div className="medialib-form-group">
                  <label className="medialib-form-label">Key Signature</label>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="medialib-form-group">
                  <label className="medialib-form-label">Tempo / BPM</label>
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="e.g. 72 BPM"
                    value={songTempo}
                    onChange={(e) => setSongTempo(e.target.value)}
                  />
                </div>

                <div className="medialib-form-group">
                  <label className="medialib-form-label">CCLI Song #</label>
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="e.g. 7106807"
                    value={songCcli}
                    onChange={(e) => setSongCcli(e.target.value)}
                  />
                </div>
              </div>

              <div className="medialib-form-group">
                <label className="medialib-form-label">Tags (comma separated)</label>
                <input
                  type="text"
                  className="auth-input"
                  placeholder="e.g. Praise, Communion, Easter"
                  value={songTags}
                  onChange={(e) => setSongTags(e.target.value)}
                />
              </div>

              <div className="medialib-form-group">
                <label className="medialib-form-label">
                  Lyrics (Separate slides with a blank line)
                </label>
                <span className="medialib-form-hint">
                  Tip: Add section headers like <code>[Verse 1]</code>, <code>[Chorus]</code>, or <code>[Bridge]</code> on the first line.
                </span>
                <textarea
                  className="auth-input"
                  rows={8}
                  style={{ fontFamily: 'inherit', resize: 'vertical' }}
                  placeholder={`[Verse 1]\nHow great the chasm that lay between us\nHow high the mountain I could not climb\n\n[Chorus]\nHallelujah, praise the One who set me free\nHallelujah, death has lost its grip on me`}
                  value={songLyrics}
                  onChange={(e) => setSongLyrics(e.target.value)}
                />
              </div>

              <div className="modal-footer" style={{ padding: '0.75rem 0 0 0', border: 'none' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAddSongModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingSongId ? 'Update Song' : 'Save Song to Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Link PowerPoint */}
      {showLinkPptModal && (
        <div className="modal-overlay" onClick={() => setShowLinkPptModal(false)}>
          <div
            className="quick-edit-modal-card"
            style={{ maxWidth: '560px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileTextIcon size={18} />
                <span>Link PowerPoint Presentation (.pptx / .ppt)</span>
              </h3>
              <button
                type="button"
                className="quick-edit-btn"
                onClick={() => setShowLinkPptModal(false)}
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSavePpt} className="modal-body">
              <div className="medialib-form-group">
                <label className="medialib-form-label">Presentation Title *</label>
                <input
                  type="text"
                  className="auth-input"
                  placeholder="e.g. Sunday Sermon: Kingdom Stewardship"
                  value={pptTitle}
                  onChange={(e) => setPptTitle(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="medialib-form-group">
                <label className="medialib-form-label">PowerPoint File Location</label>
                <div className="medialib-file-pick-row">
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="e.g. C:\Presentations\Sermon_Slides.pptx"
                    value={pptFilePath}
                    onChange={(e) => setPptFilePath(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
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
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Browse...
                  </button>
                </div>
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

              <div className="medialib-form-group">
                <label className="medialib-form-label">Slide Notes / Key Points (One per slide)</label>
                <textarea
                  className="auth-input"
                  rows={5}
                  placeholder={`Slide 1: Title & Theme Scripture\nSlide 2: Biblical Foundation - Matthew 6:19\nSlide 3: Principle 1 - Living with Open Hands\nSlide 4: Principle 2 - Trusting God in Scarcity\nSlide 5: Closing Prayer & Commitment`}
                  value={pptNotes}
                  onChange={(e) => setPptNotes(e.target.value)}
                />
              </div>

              <div className="modal-footer" style={{ padding: '0.75rem 0 0 0', border: 'none' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowLinkPptModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save PowerPoint Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Link Canva */}
      {showLinkCanvaModal && (
        <div className="modal-overlay" onClick={() => setShowLinkCanvaModal(false)}>
          <div
            className="quick-edit-modal-card"
            style={{ maxWidth: '560px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LinkIcon size={18} />
                <span>Link Canva Presentation</span>
              </h3>
              <button
                type="button"
                className="quick-edit-btn"
                onClick={() => setShowLinkCanvaModal(false)}
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveCanva} className="modal-body">
              <div className="medialib-form-group">
                <label className="medialib-form-label">Presentation Title *</label>
                <input
                  type="text"
                  className="auth-input"
                  placeholder="e.g. Sunday Service Announcements & Events"
                  value={canvaTitle}
                  onChange={(e) => setCanvaTitle(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="medialib-form-group">
                <label className="medialib-form-label">Canva Presentation URL *</label>
                <input
                  type="url"
                  className="auth-input"
                  placeholder="https://www.canva.com/design/DAF.../view"
                  value={canvaUrl}
                  onChange={(e) => setCanvaUrl(e.target.value)}
                  required
                />
                <span className="medialib-form-hint">
                  From Canva: Click <strong>Share &rarr; More &rarr; Embed</strong> or <strong>Public View Link</strong>.
                </span>
              </div>

              <div className="medialib-form-group">
                <label className="medialib-form-label">Canva Embed URL (Optional)</label>
                <input
                  type="url"
                  className="auth-input"
                  placeholder="https://www.canva.com/design/DAF.../view?embed"
                  value={canvaEmbedUrl}
                  onChange={(e) => setCanvaEmbedUrl(e.target.value)}
                />
              </div>

              <div className="medialib-form-group">
                <label className="medialib-form-label">Page / Slide Count</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  className="auth-input"
                  value={canvaSlideCount}
                  onChange={(e) => setCanvaSlideCount(Number(e.target.value))}
                />
              </div>

              <div className="medialib-form-group">
                <label className="medialib-form-label">Slide Topics / Notes (One per slide)</label>
                <textarea
                  className="auth-input"
                  rows={4}
                  placeholder={`Page 1: Welcome to Bunsen Sanctuary\nPage 2: Midweek Prayer Gathering (Wed 7PM)\nPage 3: Youth Night Fellowship (Sat 4PM)\nPage 4: Online Giving & Tithes`}
                  value={canvaNotes}
                  onChange={(e) => setCanvaNotes(e.target.value)}
                />
              </div>

              <div className="modal-footer" style={{ padding: '0.75rem 0 0 0', border: 'none' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowLinkCanvaModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Canva Link
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
