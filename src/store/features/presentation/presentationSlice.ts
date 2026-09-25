import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { PresentationState, RundownItem, Slide, TransitionType, BackgroundTheme, StartupDisplayMode } from './types';
import { isVideoFile, extractYouTubeId } from '../../../utils/videoHelpers';


const defaultThemes = [
  {
    id: 'clouds-cathedral',
    name: 'Heavenly Clouds',
    gradient: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 40%, #93c5fd 80%, #ffffff 100%)',
    accent: '#60a5fa',
  },
  {
    id: 'cathedral-stained',
    name: 'Sanctuary Cathedral',
    gradient: 'linear-gradient(160deg, #091e3a 0%, #1e293b 40%, #064e3b 80%, #059669 100%)',
    accent: '#34d399',
  },
  {
    id: 'sunset-radiance',
    name: 'Golden Radiance',
    gradient: 'linear-gradient(145deg, #451a03 0%, #78350f 40%, #d97706 75%, #fef3c7 100%)',
    accent: '#fbbf24',
  },
  {
    id: 'midnight-worship',
    name: 'Deep Midnight Twilight',
    gradient: 'linear-gradient(135deg, #090d16 0%, #172554 50%, #1e1b4b 100%)',
    accent: '#818cf8',
  },
];

export const DEFAULT_RUNDOWN: RundownItem[] = [
  {
    id: 'rd-loop',
    time: '09:00',
    title: 'Pre-service Loop',
    subtitle: 'Announcements & Welcome',
    type: 'LOOP',
    slides: [
      {
        id: 's-loop-1',
        section: 'Welcome',
        lines: ['Welcome to Sunday Worship Service', 'Please silence your mobile devices'],
      },
      {
        id: 's-loop-2',
        section: 'Announcements',
        lines: ['Midweek Prayer Gathering: Wednesday 7:00 PM', 'Youth Ministry: Saturday 4:00 PM'],
      },
    ],
  },
  {
    id: 'rd-video-motion',
    time: '09:05',
    title: 'Cinematic Particles Video',
    subtitle: 'Motion loop video',
    type: 'VIDEO',
    slides: [
      {
        id: 's-vid-motion-1',
        section: 'Motion Background',
        lines: ['Lord You are Good and Your Mercy Endureth Forever'],
        imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1080&auto=format&fit=crop',
        videoType: 'local',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        videoPath: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        autoPlay: true,
        loop: true,
        videoLoop: true,
        videoFit: 'contain',
        videoTitle: 'Cinematic Particles Blue',
        videoMuted: true,
      },
    ],
  },
  {
    id: 'rd-glorious-day',
    time: '09:12',
    title: 'Glorious Day',
    subtitle: '4 Verses / 2 Chorus',
    type: 'SONG',
    slides: [
      {
        id: 's-gd-v1',
        section: 'Verse 1',
        lines: [
          'One day when heaven was filled with His praises',
          'One day when sin was as black as could be',
        ],
      },
      {
        id: 's-gd-chorus',
        section: 'Chorus',
        lines: [
          'Living He loved me, dying He saved me',
          'Buried He carried my sins far away',
        ],
      },
    ],
  },
  {
    id: 'rd-youtube-stream',
    time: '09:20',
    title: 'Hillsong Worship Stream',
    subtitle: 'YouTube Embed • What a Beautiful Name',
    type: 'VIDEO',
    slides: [
      {
        id: 's-yt-stream',
        section: 'YouTube Video',
        lines: [],
        imageUrl: 'https://img.youtube.com/vi/nQWFzMvCfLE/hqdefault.jpg',
        videoType: 'youtube',
        youtubeUrl: 'https://www.youtube.com/watch?v=nQWFzMvCfLE',
        videoUrl: 'https://www.youtube.com/watch?v=nQWFzMvCfLE',
        autoPlay: true,
        loop: false,
        videoMuted: true,
        videoFit: 'contain',
        videoTitle: 'Hillsong Worship - What a Beautiful Name',
      },
    ],
  },
];

export const STARTUP_DISPLAY_STORAGE_KEY = 'bunsenworship_startup_display';

export const getPersistedStartupDisplay = (): StartupDisplayMode => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 'black';
  }
  try {
    const saved = window.localStorage.getItem(STARTUP_DISPLAY_STORAGE_KEY);
    if (saved === 'black' || saved === 'logo') {
      return saved;
    }
  } catch (error) {
    console.warn('Failed to read startup display preference from localStorage:', error);
  }
  return 'black';
};

export const persistStartupDisplay = (mode: StartupDisplayMode): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STARTUP_DISPLAY_STORAGE_KEY, mode);
  } catch (error) {
    console.warn('Failed to save startup display preference to localStorage:', error);
  }
};

const initialStartupMode = getPersistedStartupDisplay();

const initialState: PresentationState = {
  isLive: true,
  isBlackout: initialStartupMode === 'black',
  isTextCleared: false,
  isLogoActive: initialStartupMode === 'logo',
  startupDisplayMode: initialStartupMode,
  selectedRundownId: 'rd-video-motion',
  liveRundownId: 'rd-video-motion',
  liveSlideId: 's-vid-motion-1',
  previewSlideId: 's-gd-v1',
  transitionType: 'FADE',
  fadeDuration: 1.0,
  rundown: DEFAULT_RUNDOWN,
  backgroundThemes: defaultThemes,
  activeBackgroundId: 'clouds-cathedral',
  videoPlayback: {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1.0,
    isMuted: true,
    playbackRate: 1.0,
    isLooping: true,
    videoError: false,
    videoErrorMessage: '',
  },
  isProjectorActive: false,
};

export const presentationSlice = createSlice({
  name: 'presentation',
  initialState,
  reducers: {
    toggleLive: (state) => {
      state.isLive = !state.isLive;
    },
    setLive: (state, action: PayloadAction<boolean>) => {
      state.isLive = action.payload;
    },
    toggleBlackout: (state) => {
      state.isBlackout = !state.isBlackout;
      if (state.isBlackout) {
        state.isLogoActive = false;
      }
    },
    setBlackout: (state, action: PayloadAction<boolean>) => {
      state.isBlackout = action.payload;
      if (action.payload) {
        state.isLogoActive = false;
      }
    },
    toggleClearText: (state) => {
      state.isTextCleared = !state.isTextCleared;
    },
    setClearText: (state, action: PayloadAction<boolean>) => {
      state.isTextCleared = action.payload;
    },
    toggleLogo: (state) => {
      state.isLogoActive = !state.isLogoActive;
      if (state.isLogoActive) {
        state.isBlackout = false;
      }
    },
    setLogo: (state, action: PayloadAction<boolean>) => {
      state.isLogoActive = action.payload;
      if (action.payload) {
        state.isBlackout = false;
      }
    },
    setStartupDisplayMode: (state, action: PayloadAction<StartupDisplayMode>) => {
      state.startupDisplayMode = action.payload;
      persistStartupDisplay(action.payload);
    },
    clearAllOverrides: (state) => {
      state.isBlackout = false;
      state.isTextCleared = false;
      state.isLogoActive = false;
    },
    setSelectedRundownId: (state, action: PayloadAction<string>) => {
      state.selectedRundownId = action.payload;
      const item = state.rundown.find((r) => r.id === action.payload);
      if (item && item.slides.length > 0) {
        state.previewSlideId = item.slides[0].id;
      }
    },
    setPreviewSlide: (
      state,
      action: PayloadAction<{ rundownId?: string; slideId: string }>
    ) => {
      if (action.payload.rundownId) {
        state.selectedRundownId = action.payload.rundownId;
      }
      state.previewSlideId = action.payload.slideId;
    },
    takeLive: (state) => {
      if (!state.previewSlideId && state.selectedRundownId) {
        const item = state.rundown.find((r) => r.id === state.selectedRundownId);
        if (item && item.slides.length > 0) {
          state.previewSlideId = item.slides[0].id;
        }
      }
      if (!state.previewSlideId && state.rundown.length > 0 && state.rundown[0].slides.length > 0) {
        state.selectedRundownId = state.rundown[0].id;
        state.previewSlideId = state.rundown[0].slides[0].id;
      }

      if (state.previewSlideId) {
        state.liveSlideId = state.previewSlideId;
        state.liveRundownId = state.selectedRundownId;
        state.isLive = true;

        const currentItem = state.rundown.find((r) => r.id === state.selectedRundownId);
        if (currentItem) {
          const targetSlide = currentItem.slides.find((s) => s.id === state.previewSlideId);
          const isTargetVideo = Boolean(
            targetSlide &&
              (Boolean(extractYouTubeId(targetSlide)) ||
                targetSlide.videoType === 'local' ||
                targetSlide.videoUrl ||
                targetSlide.videoPath) &&
              targetSlide.videoType !== 'none'
          );

          if (isTargetVideo && targetSlide) {
            state.videoPlayback.videoError = false;
            state.videoPlayback.videoErrorMessage = '';
            state.videoPlayback.currentTime = targetSlide.videoStartTime || 0;
            state.videoPlayback.isPlaying = targetSlide.autoPlay !== false;
            state.videoPlayback.isLooping = Boolean(targetSlide.loop || targetSlide.videoLoop);
            if (targetSlide.videoVolume !== undefined) {
              state.videoPlayback.volume = targetSlide.videoVolume;
            }
            if (targetSlide.videoMuted !== undefined) {
              state.videoPlayback.isMuted = targetSlide.videoMuted;
            }
            if (targetSlide.videoPlaybackRate !== undefined) {
              state.videoPlayback.playbackRate = targetSlide.videoPlaybackRate;
            }
          }

          // Auto-advance preview to subsequent slide in deck, or cue first slide of next rundown item
          const currentIndex = currentItem.slides.findIndex((s) => s.id === state.previewSlideId);
          if (currentIndex >= 0 && currentIndex < currentItem.slides.length - 1) {
            state.previewSlideId = currentItem.slides[currentIndex + 1].id;
          } else {
            const currentRundownIdx = state.rundown.findIndex((r) => r.id === state.selectedRundownId);
            if (currentRundownIdx >= 0 && currentRundownIdx < state.rundown.length - 1) {
              const nextRundown = state.rundown[currentRundownIdx + 1];
              state.selectedRundownId = nextRundown.id;
              if (nextRundown.slides.length > 0) {
                state.previewSlideId = nextRundown.slides[0].id;
              }
            }
          }
        }
      }
    },
    takeSlideDirectlyLive: (
      state,
      action: PayloadAction<{ rundownId: string; slideId: string }>
    ) => {
      state.selectedRundownId = action.payload.rundownId;
      state.previewSlideId = action.payload.slideId;
      state.liveRundownId = action.payload.rundownId;
      state.liveSlideId = action.payload.slideId;
      state.isLive = true;

      const currentItem = state.rundown.find((r) => r.id === action.payload.rundownId);
      if (currentItem) {
        const targetSlide = currentItem.slides.find((s) => s.id === action.payload.slideId);
        const isTargetVideo = Boolean(
          targetSlide &&
            (Boolean(extractYouTubeId(targetSlide)) ||
              targetSlide.videoType === 'local' ||
              targetSlide.videoUrl ||
              targetSlide.videoPath) &&
            targetSlide.videoType !== 'none'
        );

        if (isTargetVideo && targetSlide) {
          state.videoPlayback.videoError = false;
          state.videoPlayback.videoErrorMessage = '';
          state.videoPlayback.currentTime = targetSlide.videoStartTime || 0;
          state.videoPlayback.isPlaying = targetSlide.autoPlay !== false;
          state.videoPlayback.isLooping = Boolean(targetSlide.loop || targetSlide.videoLoop);
          if (targetSlide.videoVolume !== undefined) {
            state.videoPlayback.volume = targetSlide.videoVolume;
          }
          if (targetSlide.videoMuted !== undefined) {
            state.videoPlayback.isMuted = targetSlide.videoMuted;
          }
          if (targetSlide.videoPlaybackRate !== undefined) {
            state.videoPlayback.playbackRate = targetSlide.videoPlaybackRate;
          }
        }

        // Set preview to next slide, or cue first slide of next rundown item
        const currentIndex = currentItem.slides.findIndex((s) => s.id === action.payload.slideId);
        if (currentIndex >= 0 && currentIndex < currentItem.slides.length - 1) {
          state.previewSlideId = currentItem.slides[currentIndex + 1].id;
        } else {
          const currentRundownIdx = state.rundown.findIndex((r) => r.id === action.payload.rundownId);
          if (currentRundownIdx >= 0 && currentRundownIdx < state.rundown.length - 1) {
            const nextRundown = state.rundown[currentRundownIdx + 1];
            state.selectedRundownId = nextRundown.id;
            if (nextRundown.slides.length > 0) {
              state.previewSlideId = nextRundown.slides[0].id;
            }
          }
        }
      }
    },
    advanceSlide: (state) => {
      const currentItem = state.rundown.find((r) => r.id === state.selectedRundownId);
      if (!currentItem) return;

      const currentIdx = currentItem.slides.findIndex((s) => s.id === state.previewSlideId);
      if (currentIdx >= 0 && currentIdx < currentItem.slides.length - 1) {
        state.previewSlideId = currentItem.slides[currentIdx + 1].id;
      } else {
        // Move to next rundown item if available
        const currentRundownIdx = state.rundown.findIndex((r) => r.id === state.selectedRundownId);
        if (currentRundownIdx >= 0 && currentRundownIdx < state.rundown.length - 1) {
          const nextRundown = state.rundown[currentRundownIdx + 1];
          state.selectedRundownId = nextRundown.id;
          if (nextRundown.slides.length > 0) {
            state.previewSlideId = nextRundown.slides[0].id;
          }
        }
      }
    },
    previousSlide: (state) => {
      const currentItem = state.rundown.find((r) => r.id === state.selectedRundownId);
      if (!currentItem) return;

      const currentIdx = currentItem.slides.findIndex((s) => s.id === state.previewSlideId);
      if (currentIdx > 0) {
        state.previewSlideId = currentItem.slides[currentIdx - 1].id;
      } else {
        // Moving backwards to previous show: start from top of the slide
        const currentRundownIdx = state.rundown.findIndex((r) => r.id === state.selectedRundownId);
        if (currentRundownIdx > 0) {
          const prevRundown = state.rundown[currentRundownIdx - 1];
          state.selectedRundownId = prevRundown.id;
          if (prevRundown.slides.length > 0) {
            state.previewSlideId = prevRundown.slides[0].id;
          }
        }
      }
    },
    advanceLiveSlide: (state) => {
      const liveItem = state.rundown.find((r) => r.id === state.liveRundownId);
      if (!liveItem) {
        // Fallback: take preview live
        if (state.previewSlideId) {
          state.liveSlideId = state.previewSlideId;
          state.liveRundownId = state.selectedRundownId;
          state.isLive = true;
        } else if (state.rundown.length > 0 && state.rundown[0].slides.length > 0) {
          state.liveRundownId = state.rundown[0].id;
          state.liveSlideId = state.rundown[0].slides[0].id;
          state.selectedRundownId = state.rundown[0].id;
          state.isLive = true;
          if (state.rundown[0].slides.length > 1) {
            state.previewSlideId = state.rundown[0].slides[1].id;
          } else if (state.rundown.length > 1 && state.rundown[1].slides.length > 0) {
            state.selectedRundownId = state.rundown[1].id;
            state.previewSlideId = state.rundown[1].slides[0].id;
          }
        }
        return;
      }

      const currentIdx = liveItem.slides.findIndex((s) => s.id === state.liveSlideId);
      if (currentIdx >= 0 && currentIdx < liveItem.slides.length - 1) {
        const nextSlideIdx = currentIdx + 1;
        const nextSlide = liveItem.slides[nextSlideIdx];
        state.liveSlideId = nextSlide.id;
        state.isLive = true;

        const isTargetVideo = Boolean(
          nextSlide &&
            (Boolean(extractYouTubeId(nextSlide)) ||
              nextSlide.videoType === 'local' ||
              nextSlide.videoUrl ||
              nextSlide.videoPath) &&
            nextSlide.videoType !== 'none'
        );

        if (isTargetVideo && nextSlide) {
          state.videoPlayback.videoError = false;
          state.videoPlayback.videoErrorMessage = '';
          state.videoPlayback.currentTime = nextSlide.videoStartTime || 0;
          state.videoPlayback.isPlaying = nextSlide.autoPlay !== false;
          state.videoPlayback.isLooping = Boolean(nextSlide.loop || nextSlide.videoLoop);
          if (nextSlide.videoVolume !== undefined) {
            state.videoPlayback.volume = nextSlide.videoVolume;
          }
          if (nextSlide.videoMuted !== undefined) {
            state.videoPlayback.isMuted = nextSlide.videoMuted;
          }
          if (nextSlide.videoPlaybackRate !== undefined) {
            state.videoPlayback.playbackRate = nextSlide.videoPlaybackRate;
          }
        }

        // When reached the end of that doc/ppt, in preview bring the next item in rundown to let user know it will be next:
        if (nextSlideIdx === liveItem.slides.length - 1) {
          const currentRundownIdx = state.rundown.findIndex((r) => r.id === state.liveRundownId);
          if (currentRundownIdx >= 0 && currentRundownIdx < state.rundown.length - 1) {
            const nextRundown = state.rundown[currentRundownIdx + 1];
            state.selectedRundownId = nextRundown.id;
            if (nextRundown.slides.length > 0) {
              state.previewSlideId = nextRundown.slides[0].id;
            }
          }
        } else {
          // Keep preview showing upcoming slide
          state.selectedRundownId = liveItem.id;
          state.previewSlideId = liveItem.slides[nextSlideIdx + 1].id;
        }
      } else {
        // Next rundown item
        const currentRundownIdx = state.rundown.findIndex((r) => r.id === state.liveRundownId);
        if (currentRundownIdx >= 0 && currentRundownIdx < state.rundown.length - 1) {
          const nextRundown = state.rundown[currentRundownIdx + 1];
          state.liveRundownId = nextRundown.id;
          if (nextRundown.slides.length > 0) {
            const firstSlide = nextRundown.slides[0];
            state.liveSlideId = firstSlide.id;
            state.isLive = true;

            const isTargetVideo = Boolean(
              firstSlide &&
                (Boolean(extractYouTubeId(firstSlide)) ||
                  firstSlide.videoType === 'local' ||
                  firstSlide.videoUrl ||
                  firstSlide.videoPath) &&
                firstSlide.videoType !== 'none'
            );

            if (isTargetVideo && firstSlide) {
              state.videoPlayback.videoError = false;
              state.videoPlayback.videoErrorMessage = '';
              state.videoPlayback.currentTime = firstSlide.videoStartTime || 0;
              state.videoPlayback.isPlaying = firstSlide.autoPlay !== false;
              state.videoPlayback.isLooping = Boolean(firstSlide.loop || firstSlide.videoLoop);
              if (firstSlide.videoVolume !== undefined) {
                state.videoPlayback.volume = firstSlide.videoVolume;
              }
              if (firstSlide.videoMuted !== undefined) {
                state.videoPlayback.isMuted = firstSlide.videoMuted;
              }
              if (firstSlide.videoPlaybackRate !== undefined) {
                state.videoPlayback.playbackRate = firstSlide.videoPlaybackRate;
              }
            }

            if (nextRundown.slides.length === 1) {
              // Only 1 slide in this item, so we reached the end! Bring the next item in rundown to Preview:
              if (currentRundownIdx + 1 < state.rundown.length - 1) {
                const afterNext = state.rundown[currentRundownIdx + 2];
                state.selectedRundownId = afterNext.id;
                if (afterNext.slides.length > 0) {
                  state.previewSlideId = afterNext.slides[0].id;
                }
              }
            } else {
              state.selectedRundownId = nextRundown.id;
              state.previewSlideId = nextRundown.slides[1].id;
            }
          }
        }
      }
    },
    previousLiveSlide: (state) => {
      const liveItem = state.rundown.find((r) => r.id === state.liveRundownId);
      if (!liveItem) return;

      const currentIdx = liveItem.slides.findIndex((s) => s.id === state.liveSlideId);
      if (currentIdx > 0) {
        const prevSlide = liveItem.slides[currentIdx - 1];
        state.liveSlideId = prevSlide.id;
        state.selectedRundownId = liveItem.id;
        state.previewSlideId = liveItem.slides[currentIdx].id;
        state.isLive = true;

        const isTargetVideo = Boolean(
          prevSlide &&
            (Boolean(extractYouTubeId(prevSlide)) ||
              prevSlide.videoType === 'local' ||
              prevSlide.videoUrl ||
              prevSlide.videoPath) &&
            prevSlide.videoType !== 'none'
        );

        if (isTargetVideo && prevSlide) {
          state.videoPlayback.videoError = false;
          state.videoPlayback.videoErrorMessage = '';
          state.videoPlayback.currentTime = prevSlide.videoStartTime || 0;
          state.videoPlayback.isPlaying = prevSlide.autoPlay !== false;
          state.videoPlayback.isLooping = Boolean(prevSlide.loop || prevSlide.videoLoop);
          if (prevSlide.videoVolume !== undefined) {
            state.videoPlayback.volume = prevSlide.videoVolume;
          }
          if (prevSlide.videoMuted !== undefined) {
            state.videoPlayback.isMuted = prevSlide.videoMuted;
          }
          if (prevSlide.videoPlaybackRate !== undefined) {
            state.videoPlayback.playbackRate = prevSlide.videoPlaybackRate;
          }
        }
      } else {
        const currentRundownIdx = state.rundown.findIndex((r) => r.id === state.liveRundownId);
        if (currentRundownIdx > 0) {
          const prevRundown = state.rundown[currentRundownIdx - 1];
          state.liveRundownId = prevRundown.id;
          state.selectedRundownId = prevRundown.id;
          if (prevRundown.slides.length > 0) {
            // Moving backwards to previous show: start from top of the slide
            const topSlide = prevRundown.slides[0];
            state.liveSlideId = topSlide.id;
            state.previewSlideId =
              prevRundown.slides.length > 1 ? prevRundown.slides[1].id : topSlide.id;
            state.isLive = true;

            const isTargetVideo = Boolean(
              topSlide &&
                (Boolean(extractYouTubeId(topSlide)) ||
                  topSlide.videoType === 'local' ||
                  topSlide.videoUrl ||
                  topSlide.videoPath) &&
                topSlide.videoType !== 'none'
            );

            if (isTargetVideo && topSlide) {
              state.videoPlayback.videoError = false;
              state.videoPlayback.videoErrorMessage = '';
              state.videoPlayback.currentTime = topSlide.videoStartTime || 0;
              state.videoPlayback.isPlaying = topSlide.autoPlay !== false;
              state.videoPlayback.isLooping = Boolean(topSlide.loop || topSlide.videoLoop);
              if (topSlide.videoVolume !== undefined) {
                state.videoPlayback.volume = topSlide.videoVolume;
              }
              if (topSlide.videoMuted !== undefined) {
                state.videoPlayback.isMuted = topSlide.videoMuted;
              }
              if (topSlide.videoPlaybackRate !== undefined) {
                state.videoPlayback.playbackRate = topSlide.videoPlaybackRate;
              }
            }
          }
        }
      }
    },
    setTransitionType: (state, action: PayloadAction<TransitionType>) => {
      state.transitionType = action.payload;
    },
    setFadeDuration: (state, action: PayloadAction<number>) => {
      state.fadeDuration = action.payload;
    },
    setActiveBackground: (state, action: PayloadAction<string>) => {
      state.activeBackgroundId = action.payload;
    },
    addCustomBackgroundTheme: (state, action: PayloadAction<BackgroundTheme>) => {
      const existingIdx = state.backgroundThemes.findIndex((t) => t.id === action.payload.id);
      if (existingIdx >= 0) {
        state.backgroundThemes[existingIdx] = action.payload;
      } else {
        state.backgroundThemes.push(action.payload);
      }
      state.activeBackgroundId = action.payload.id;
    },
    updateSlide: (
      state,
      action: PayloadAction<{
        rundownId: string;
        slideId: string;
        section: string;
        lines: string[];
        imageUrl?: string;
        imageFit?: 'cover' | 'contain';
        videoUrl?: string;
        videoPath?: string;
        youtubeUrl?: string;
        videoType?: 'local' | 'youtube' | 'none';
        autoPlay?: boolean;
        loop?: boolean;
        videoLoop?: boolean;
        videoVolume?: number;
        videoMuted?: boolean;
        videoPlaybackRate?: number;
        videoStartTime?: number;
        videoEndTime?: number;
        videoFit?: 'contain' | 'cover' | 'fill';
        videoTransition?: 'CUT' | 'FADE' | 'CROSSFADE';
        videoTransitionDuration?: number;
        videoTitle?: string;
      }>
    ) => {
      const item = state.rundown.find((r) => r.id === action.payload.rundownId);
      if (item) {
        const slide = item.slides.find((s) => s.id === action.payload.slideId);
        if (slide) {
          slide.section = action.payload.section;
          slide.lines = action.payload.lines;
          if (action.payload.imageUrl !== undefined) {
            slide.imageUrl = action.payload.imageUrl;
          }
          if (action.payload.imageFit !== undefined) {
            slide.imageFit = action.payload.imageFit;
          }
          if (action.payload.videoUrl !== undefined) {
            slide.videoUrl = action.payload.videoUrl;
          }
          if (action.payload.videoPath !== undefined) {
            slide.videoPath = action.payload.videoPath;
          }
          if (action.payload.youtubeUrl !== undefined) {
            slide.youtubeUrl = action.payload.youtubeUrl;
          }
          if (action.payload.videoType !== undefined) {
            slide.videoType = action.payload.videoType;
          }
          if (action.payload.autoPlay !== undefined) {
            slide.autoPlay = action.payload.autoPlay;
          }
          if (action.payload.loop !== undefined) {
            slide.loop = action.payload.loop;
          }
          if (action.payload.videoLoop !== undefined) {
            slide.videoLoop = action.payload.videoLoop;
          }
          if (action.payload.videoVolume !== undefined) {
            slide.videoVolume = action.payload.videoVolume;
          }
          if (action.payload.videoMuted !== undefined) {
            slide.videoMuted = action.payload.videoMuted;
          }
          if (action.payload.videoPlaybackRate !== undefined) {
            slide.videoPlaybackRate = action.payload.videoPlaybackRate;
          }
          if (action.payload.videoStartTime !== undefined) {
            slide.videoStartTime = action.payload.videoStartTime;
          }
          if (action.payload.videoEndTime !== undefined) {
            slide.videoEndTime = action.payload.videoEndTime;
          }
          if (action.payload.videoFit !== undefined) {
            slide.videoFit = action.payload.videoFit;
          }
          if (action.payload.videoTransition !== undefined) {
            slide.videoTransition = action.payload.videoTransition;
          }
          if (action.payload.videoTransitionDuration !== undefined) {
            slide.videoTransitionDuration = action.payload.videoTransitionDuration;
          }
          if (action.payload.videoTitle !== undefined) {
            slide.videoTitle = action.payload.videoTitle;
          }
        }
      }
    },
    relinkSlideVideo: (
      state,
      action: PayloadAction<{
        rundownId?: string;
        slideId?: string;
        filePath: string;
      }>
    ) => {
      const { filePath } = action.payload;
      state.videoPlayback.videoError = false;
      state.videoPlayback.videoErrorMessage = '';

      let targetSlide: Slide | undefined;
      if (action.payload.rundownId) {
        const item = state.rundown.find((r) => r.id === action.payload.rundownId);
        if (item) {
          targetSlide = item.slides.find((s) => s.id === action.payload.slideId);
        }
      }
      if (!targetSlide && action.payload.slideId) {
        for (const item of state.rundown) {
          const found = item.slides.find((s) => s.id === action.payload.slideId);
          if (found) {
            targetSlide = found;
            break;
          }
        }
      }
      if (!targetSlide) {
        const currentItem = state.rundown.find((r) => r.id === state.selectedRundownId);
        if (currentItem) {
          targetSlide =
            currentItem.slides.find(
              (s) => s.id === state.previewSlideId || s.id === state.liveSlideId
            ) || currentItem.slides[0];
        }
      }

      if (targetSlide) {
        targetSlide.videoPath = filePath;
        targetSlide.videoUrl = filePath;
        targetSlide.videoType = 'local';
        const fileName = filePath.split(/[/\\]/).pop() || '';
        if (!targetSlide.videoTitle || targetSlide.videoTitle === 'Video Playback' || targetSlide.videoTitle === 'Local Video') {
          targetSlide.videoTitle = fileName.replace(/\.[^/.]+$/, '');
        }
        if (targetSlide.imageUrl && isVideoFile(targetSlide.imageUrl)) {
          targetSlide.imageUrl = undefined;
        }
        if (state.liveSlideId === targetSlide.id) {
          state.videoPlayback.currentTime = 0;
          state.videoPlayback.isPlaying = true;
          state.videoPlayback.videoError = false;
        }
      }
    },
    addSlide: (
      state,
      action: PayloadAction<{ rundownId: string; slide: Omit<Slide, 'id'> }>
    ) => {
      const item = state.rundown.find((r) => r.id === action.payload.rundownId);
      if (item) {
        const newSlide: Slide = {
          ...action.payload.slide,
          id: `s-${Date.now()}`,
        };
        item.slides.push(newSlide);
      }
    },
    deleteSlide: (
      state,
      action: PayloadAction<{ rundownId: string; slideId: string }>
    ) => {
      const item = state.rundown.find((r) => r.id === action.payload.rundownId);
      if (item) {
        item.slides = item.slides.filter((s) => s.id !== action.payload.slideId);
        if (state.previewSlideId === action.payload.slideId) {
          state.previewSlideId = item.slides[0]?.id || null;
        }
        if (state.liveSlideId === action.payload.slideId) {
          state.liveSlideId = item.slides[0]?.id || null;
        }
      }
    },
    addRundownItem: (state, action: PayloadAction<Omit<RundownItem, 'id'>>) => {
      const newItem: RundownItem = {
        ...action.payload,
        id: `rd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      };
      state.rundown.push(newItem);
      state.selectedRundownId = newItem.id;
      state.previewSlideId = newItem.slides[0]?.id || null;
    },
    reorderRundown: (
      state,
      action: PayloadAction<{ sourceIndex: number; targetIndex: number }>
    ) => {
      const { sourceIndex, targetIndex } = action.payload;
      if (
        sourceIndex < 0 ||
        sourceIndex >= state.rundown.length ||
        targetIndex < 0 ||
        targetIndex >= state.rundown.length ||
        sourceIndex === targetIndex
      ) {
        return;
      }
      const [movedItem] = state.rundown.splice(sourceIndex, 1);
      state.rundown.splice(targetIndex, 0, movedItem);
    },
    reorderSlides: (
      state,
      action: PayloadAction<{
        rundownId: string;
        sourceIndex: number;
        targetIndex: number;
      }>
    ) => {
      const item = state.rundown.find((r) => r.id === action.payload.rundownId);
      if (!item) return;
      const { sourceIndex, targetIndex } = action.payload;
      if (
        sourceIndex < 0 ||
        sourceIndex >= item.slides.length ||
        targetIndex < 0 ||
        targetIndex >= item.slides.length ||
        sourceIndex === targetIndex
      ) {
        return;
      }
      const [movedSlide] = item.slides.splice(sourceIndex, 1);
      item.slides.splice(targetIndex, 0, movedSlide);
    },
    deleteRundownItem: (state, action: PayloadAction<string>) => {
      const itemId = action.payload;
      const index = state.rundown.findIndex((r) => r.id === itemId);
      if (index >= 0) {
        state.rundown.splice(index, 1);
        if (state.selectedRundownId === itemId) {
          state.selectedRundownId = state.rundown[0]?.id || '';
          state.previewSlideId = state.rundown[0]?.slides[0]?.id || null;
        }
        if (state.liveRundownId === itemId) {
          state.liveRundownId = null;
          state.liveSlideId = null;
        }
      }
    },
    setLoadedRundown: (state, action: PayloadAction<RundownItem[]>) => {
      state.rundown = action.payload;
      if (action.payload.length > 0) {
        state.selectedRundownId = action.payload[0].id;
        state.previewSlideId = action.payload[0].slides[0]?.id || null;
      }
    },
    setVideoPlaying: (state, action: PayloadAction<boolean>) => {
      state.videoPlayback.isPlaying = action.payload;
    },
    toggleVideoPlay: (state) => {
      state.videoPlayback.isPlaying = !state.videoPlayback.isPlaying;
    },
    setVideoCurrentTime: (state, action: PayloadAction<number>) => {
      state.videoPlayback.currentTime = action.payload;
    },
    setVideoDuration: (state, action: PayloadAction<number>) => {
      state.videoPlayback.duration = action.payload;
    },
    setVideoVolume: (state, action: PayloadAction<number>) => {
      state.videoPlayback.volume = Math.max(0, Math.min(1, action.payload));
      if (action.payload > 0) {
        state.videoPlayback.isMuted = false;
      }
    },
    setVideoMuted: (state, action: PayloadAction<boolean>) => {
      state.videoPlayback.isMuted = action.payload;
      const activeSlideId = state.liveSlideId || state.previewSlideId;
      if (activeSlideId) {
        for (const item of state.rundown) {
          const s = item.slides.find((slide) => slide.id === activeSlideId);
          if (s) {
            s.videoMuted = action.payload;
            break;
          }
        }
      }
    },
    toggleVideoMute: (state) => {
      const nextMuted = !state.videoPlayback.isMuted;
      state.videoPlayback.isMuted = nextMuted;
      const activeSlideId = state.liveSlideId || state.previewSlideId;
      if (activeSlideId) {
        for (const item of state.rundown) {
          const s = item.slides.find((slide) => slide.id === activeSlideId);
          if (s) {
            s.videoMuted = nextMuted;
            break;
          }
        }
      }
    },
    setVideoPlaybackRate: (state, action: PayloadAction<number>) => {
      state.videoPlayback.playbackRate = action.payload;
    },
    setVideoLooping: (state, action: PayloadAction<boolean>) => {
      state.videoPlayback.isLooping = action.payload;
    },
    toggleVideoLoop: (state) => {
      state.videoPlayback.isLooping = !state.videoPlayback.isLooping;
    },
    restartVideo: (state) => {
      state.videoPlayback.currentTime = 0;
      state.videoPlayback.isPlaying = true;
      state.videoPlayback.videoError = false;
      state.videoPlayback.videoErrorMessage = '';
    },
    setVideoError: (
      state,
      action: PayloadAction<{ hasError: boolean; message?: string } | boolean>
    ) => {
      if (typeof action.payload === 'boolean') {
        state.videoPlayback.videoError = action.payload;
        state.videoPlayback.videoErrorMessage = '';
        if (action.payload) {
          state.videoPlayback.isPlaying = false;
        }
      } else {
        state.videoPlayback.videoError = action.payload.hasError;
        state.videoPlayback.videoErrorMessage = action.payload.message || '';
        if (action.payload.hasError) {
          state.videoPlayback.isPlaying = false;
        }
      }
    },
    clearVideoError: (state) => {
      state.videoPlayback.videoError = false;
      state.videoPlayback.videoErrorMessage = '';
    },
    setProjectorActive: (state, action: PayloadAction<boolean>) => {
      state.isProjectorActive = action.payload;
    },
  },
});

export const {
  toggleLive,
  setLive,
  toggleBlackout,
  setBlackout,
  toggleClearText,
  setClearText,
  toggleLogo,
  setLogo,
  setStartupDisplayMode,
  clearAllOverrides,
  setSelectedRundownId,
  setPreviewSlide,
  takeLive,
  takeSlideDirectlyLive,
  advanceSlide,
  previousSlide,
  advanceLiveSlide,
  previousLiveSlide,
  setTransitionType,
  setFadeDuration,
  setActiveBackground,
  addCustomBackgroundTheme,
  updateSlide,
  relinkSlideVideo,
  addSlide,
  deleteSlide,
  addRundownItem,
  deleteRundownItem,
  reorderRundown,
  reorderSlides,
  setLoadedRundown,
  setVideoPlaying,
  toggleVideoPlay,
  setVideoCurrentTime,
  setVideoDuration,
  setVideoVolume,
  setVideoMuted,
  toggleVideoMute,
  setVideoPlaybackRate,
  setVideoLooping,
  toggleVideoLoop,
  restartVideo,
  setVideoError,
  clearVideoError,
  setProjectorActive,
} = presentationSlice.actions;

export const presentationReducer = presentationSlice.reducer;
export default presentationReducer;
