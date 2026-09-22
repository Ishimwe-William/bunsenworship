import { ProMediaAsset } from '../components/screens/mediaLibraryData';

export type MediaSourceCategory =
  | 'ALL'
  | 'POWERPOINT'
  | 'VIDEO'
  | 'SPEAKER_DECK'
  | 'ANNOUNCEMENTS'
  | 'SONGS'
  | 'CANVA';

export type FormatFilter = 'ALL' | 'VIDEOS' | 'POWERPOINTS' | 'IMAGES' | 'CANVA' | 'SONGS';

export type ModalTab = 'VIDEO' | 'PPT' | 'IMAGE' | 'CANVA' | 'SONG' | 'BACKUP';

export type VideoSourceType = 'file' | 'youtube';
export type ImageSourceType = 'file' | 'url';
export type PptSourceType = 'file' | 'url';

export interface MediaLibraryState {
  selectedSource: MediaSourceCategory;
  activeFilter: FormatFilter;
  searchQuery: string;
  showUploadModal: boolean;
  modalTab: ModalTab;
  showEditModal: boolean;
  editingAsset: ProMediaAsset | null;
  feedbackMessage: { text: string; type: 'success' | 'error' } | null;
  addedItemIds: Record<string, boolean>;
}

export interface VideoFormState {
  title: string;
  format: 'MOV' | 'MP4';
  resolution: string;
  duration: string;
  category: MediaSourceCategory;
  dataUrl: string;
  filePath: string;
  youtubeUrl: string;
  sourceType: VideoSourceType;
}

export interface ImageFormState {
  title: string;
  dataUrl: string;
  category: MediaSourceCategory;
  sourceType: ImageSourceType;
  url: string;
}

export interface PptFormState {
  title: string;
  filePath: string;
  slideCount: number;
  category: MediaSourceCategory;
  sourceType: PptSourceType;
  url: string;
}

export interface CanvaFormState {
  title: string;
  url: string;
  slideCount: number;
}

export interface SongFormState {
  title: string;
  artist: string;
  key: string;
  lyrics: string;
}

export interface EditFormState {
  title: string;
  category: MediaSourceCategory;
  resolution: string;
  duration: string;
  filePath: string;
  canvaUrl: string;
  slideCount: number;
  artist: string;
  key: string;
  lyrics: string;
}

export interface MediaLibraryActions {
  setSelectedSource: (source: MediaSourceCategory) => void;
  setActiveFilter: (filter: FormatFilter) => void;
  setSearchQuery: (query: string) => void;
  setShowUploadModal: (show: boolean) => void;
  setModalTab: (tab: ModalTab) => void;
  setShowEditModal: (show: boolean) => void;
  setEditingAsset: (asset: ProMediaAsset | null) => void;
  setFeedbackMessage: (message: { text: string; type: 'success' | 'error' } | null) => void;
  setAddedItemIds: (ids: Record<string, boolean>) => void;
}

export interface MediaLibraryFilters {
  selectedSource: MediaSourceCategory;
  activeFilter: FormatFilter;
  searchQuery: string;
}

export interface MediaUploadData {
  type: ModalTab;
  videoData?: VideoFormState;
  imageData?: ImageFormState;
  pptData?: PptFormState;
  canvaData?: CanvaFormState;
  songData?: SongFormState;
}

export interface AssetActionResult {
  success: boolean;
  message: string;
  asset?: ProMediaAsset;
}

export interface MediaLibraryStats {
  total: number;
  byCategory: Record<MediaSourceCategory, number>;
  byFormat: Record<FormatFilter, number>;
}