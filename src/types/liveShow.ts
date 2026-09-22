import { Slide, RundownItem, TransitionType, BackgroundTheme } from '../store/features/presentation/types';

export interface LiveShowState {
  isLive: boolean;
  isBlackout: boolean;
  isTextCleared: boolean;
  isLogoActive: boolean;
  selectedRundownId: string;
  previewSlideId: string | null;
  liveSlideId: string | null;
  liveRundownId: string | null;
  transitionType: TransitionType;
  fadeDuration: number;
  rundown: RundownItem[];
  backgroundThemes: BackgroundTheme[];
  activeBackgroundId: string;
}

export interface LiveShowActions {
  toggleLive: () => void;
  setLive: (isLive: boolean) => void;
  toggleBlackout: () => void;
  setBlackout: (isBlackout: boolean) => void;
  toggleClearText: () => void;
  setClearText: (isTextCleared: boolean) => void;
  toggleLogo: () => void;
  setLogo: (isLogoActive: boolean) => void;
  clearAllOverrides: () => void;
  setSelectedRundownId: (id: string) => void;
  setPreviewSlide: (data: { rundownId?: string; slideId: string }) => void;
  takeLive: () => void;
  takeSlideDirectlyLive: (data: { rundownId: string; slideId: string }) => void;
  advanceSlide: () => void;
  previousSlide: () => void;
  setTransitionType: (type: TransitionType) => void;
  setFadeDuration: (duration: number) => void;
  setActiveBackground: (id: string) => void;
  updateSlide: (data: {
    rundownId: string;
    slideId: string;
    section: string;
    lines: string[];
    imageUrl?: string;
    imageFit?: 'cover' | 'contain';
  }) => void;
  addSlide: (data: { rundownId: string; slide: Omit<Slide, 'id'> }) => void;
  deleteSlide: (data: { rundownId: string; slideId: string }) => void;
  addRundownItem: (item: Omit<RundownItem, 'id'>) => void;
  reorderRundown: (data: { sourceIndex: number; targetIndex: number }) => void;
  reorderSlides: (data: {
    rundownId: string;
    sourceIndex: number;
    targetIndex: number;
  }) => void;
  setLoadedRundown: (rundown: RundownItem[]) => void;
}

export interface DragState {
  draggedIndex: number | null;
  dragOverIndex: number | null;
  dropPosition: 'above' | 'below' | null;
}

export interface ResizableColumn {
  width: number;
  minWidth: number;
  maxWidth: number;
  defaultWidth: number;
}

export interface LiveShowLayout {
  rundownColumn: ResizableColumn;
  monitorColumn: ResizableColumn;
}

export interface ProjectorState {
  slide: Slide | null;
  backgroundGradient: string;
  isBlackout: boolean;
  isTextCleared: boolean;
  isLogoActive: boolean;
  transitionType: TransitionType;
  fadeDuration: number;
  source: 'LIVE' | 'PREVIEW';
}

export interface SlideValidation {
  valid: boolean;
  errors: string[];
}

export interface RundownValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ServiceStats {
  totalItems: number;
  totalSlides: number;
  estimatedDuration: number; // in minutes
  byType: Record<string, number>;
}