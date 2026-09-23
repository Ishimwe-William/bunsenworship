export type RundownItemType = 'LOOP' | 'VIDEO' | 'SONG' | 'SERMON' | 'PPT' | 'CANVA' | 'IMAGE';
export type TransitionType = 'CUT' | 'FADE';

export interface Slide {
  id: string;
  section: string;
  lines: string[];
  background?: string;
  imageUrl?: string;
  imageFit?: 'cover' | 'contain';
  // Video fields
  videoUrl?: string;
  videoPath?: string;
  youtubeUrl?: string;
  videoType?: 'local' | 'youtube' | 'none';
  autoPlay?: boolean;
  loop?: boolean;
  videoLoop?: boolean;
  videoVolume?: number; // 0.0 to 1.0, default 1.0
  videoMuted?: boolean;
  videoPlaybackRate?: number; // 0.5, 0.75, 1.0, 1.25, 1.5, 2.0
  videoStartTime?: number; // in seconds
  videoEndTime?: number; // in seconds
  videoFit?: 'contain' | 'cover' | 'fill';
  videoTransition?: 'CUT' | 'FADE' | 'CROSSFADE';
  videoTransitionDuration?: number; // in seconds
  videoTitle?: string;
}

export interface RundownItem {
  id: string;
  time: string;
  title: string;
  subtitle: string;
  type: RundownItemType;
  slides: Slide[];
  externalMeta?: {
    type: 'PPT' | 'CANVA';
    sourceUrl?: string;
    canvaUrl?: string;
    filePath?: string;
    slideCount?: number;
    embedUrl?: string;
  };
}

export interface BackgroundTheme {
  id: string;
  name: string;
  gradient: string;
  accent: string;
  imageUrl?: string;
}

export interface VideoPlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number; // 0.0 to 1.0
  isMuted: boolean;
  playbackRate: number; // 0.5 to 2.0
  isLooping: boolean;
}

export type StartupDisplayMode = 'black' | 'logo';

export interface PresentationState {
  isLive: boolean;
  isBlackout: boolean;
  isTextCleared: boolean;
  isLogoActive: boolean;
  startupDisplayMode: StartupDisplayMode;
  selectedRundownId: string;
  previewSlideId: string | null;
  liveSlideId: string | null;
  liveRundownId: string | null;
  transitionType: TransitionType;
  fadeDuration: number; // in seconds (e.g. 1.0)
  rundown: RundownItem[];
  backgroundThemes: BackgroundTheme[];
  activeBackgroundId: string;
  videoPlayback: VideoPlaybackState;
}

