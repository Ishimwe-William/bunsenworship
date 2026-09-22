import { RundownItem, Slide } from '../store/features/presentation/types';

export interface ServiceRecord {
  id: string;
  title: string;
  date: string;
  isCurrent: boolean;
  items: RundownItem[];
  createdAt: number;
  updatedAt: number;
}

export interface SongRecord {
  id: string;
  title: string;
  artist?: string;
  author?: string;
  ccli?: string;
  key?: string;
  tempo?: string;
  tags: string[];
  slides: Slide[];
  createdAt: number;
  updatedAt: number;
}

export interface ExternalPresentationRecord {
  id: string;
  title: string;
  type: 'PPT' | 'CANVA';
  // PPT specific fields
  filePath?: string;
  fileSize?: number;
  slideCount?: number;
  // Canva specific fields
  canvaUrl?: string;
  embedUrl?: string;
  designId?: string;
  thumbnailUrl?: string;
  // Extracted slides for presentation console
  slides: Slide[];
  createdAt: number;
  updatedAt: number;
}

export interface ImageMediaRecord {
  id: string;
  title: string;
  category: 'BACKGROUND' | 'SERMON' | 'ANNOUNCEMENT' | 'PHOTO' | 'SCRIPTURE';
  dataUrl: string; // Base64 data URL, image path, or web URL
  thumbnailUrl?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  overlayLines?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface MediaRecord {
  id: string;
  name: string;
  category: 'BACKGROUND' | 'VIDEO_LOOP' | 'IMAGE' | 'AUDIO';
  urlOrGradient: string;
  createdAt: number;
}

export interface SettingRecord {
  key: string;
  value: unknown;
  updatedAt: number;
}

export interface DatabaseBackup {
  version: number;
  exportedAt: string;
  services: ServiceRecord[];
  songs: SongRecord[];
  externalPresentations: ExternalPresentationRecord[];
  images?: ImageMediaRecord[];
  settings: SettingRecord[];
}

