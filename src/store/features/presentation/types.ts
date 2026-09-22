export type RundownItemType = 'LOOP' | 'VIDEO' | 'SONG' | 'SERMON';
export type TransitionType = 'CUT' | 'FADE';

export interface Slide {
  id: string;
  section: string;
  lines: string[];
  background?: string;
}

export interface RundownItem {
  id: string;
  time: string;
  title: string;
  subtitle: string;
  type: RundownItemType;
  slides: Slide[];
}

export interface BackgroundTheme {
  id: string;
  name: string;
  gradient: string;
  accent: string;
}

export interface PresentationState {
  isLive: boolean;
  isBlackout: boolean;
  isTextCleared: boolean;
  isLogoActive: boolean;
  selectedRundownId: string;
  previewSlideId: string | null;
  liveSlideId: string | null;
  liveRundownId: string | null;
  transitionType: TransitionType;
  fadeDuration: number; // in seconds (e.g. 1.0)
  rundown: RundownItem[];
  backgroundThemes: BackgroundTheme[];
  activeBackgroundId: string;
}
