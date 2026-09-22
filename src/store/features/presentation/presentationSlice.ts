import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { PresentationState, RundownItem, Slide, TransitionType, BackgroundTheme } from './types';

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

const initialRundown: RundownItem[] = [];

const initialState: PresentationState = {
  isLive: true,
  isBlackout: false,
  isTextCleared: false,
  isLogoActive: false,
  selectedRundownId: '',
  liveRundownId: null,
  liveSlideId: null,
  previewSlideId: null,
  transitionType: 'FADE',
  fadeDuration: 1.0,
  rundown: initialRundown,
  backgroundThemes: defaultThemes,
  activeBackgroundId: 'clouds-cathedral',
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
    },
    setBlackout: (state, action: PayloadAction<boolean>) => {
      state.isBlackout = action.payload;
    },
    toggleClearText: (state) => {
      state.isTextCleared = !state.isTextCleared;
    },
    setClearText: (state, action: PayloadAction<boolean>) => {
      state.isTextCleared = action.payload;
    },
    toggleLogo: (state) => {
      state.isLogoActive = !state.isLogoActive;
    },
    setLogo: (state, action: PayloadAction<boolean>) => {
      state.isLogoActive = action.payload;
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
      if (state.previewSlideId) {
        state.liveSlideId = state.previewSlideId;
        state.liveRundownId = state.selectedRundownId;
        state.isLive = true;

        // Auto-advance preview to the subsequent slide in the deck
        const currentItem = state.rundown.find((r) => r.id === state.selectedRundownId);
        if (currentItem) {
          const currentIndex = currentItem.slides.findIndex((s) => s.id === state.previewSlideId);
          if (currentIndex >= 0 && currentIndex < currentItem.slides.length - 1) {
            state.previewSlideId = currentItem.slides[currentIndex + 1].id;
          }
        }
      }
    },
    takeSlideDirectlyLive: (
      state,
      action: PayloadAction<{ rundownId: string; slideId: string }>
    ) => {
      state.selectedRundownId = action.payload.rundownId;
      state.liveRundownId = action.payload.rundownId;
      state.liveSlideId = action.payload.slideId;
      state.isLive = true;

      // Set preview to next slide
      const currentItem = state.rundown.find((r) => r.id === action.payload.rundownId);
      if (currentItem) {
        const currentIndex = currentItem.slides.findIndex((s) => s.id === action.payload.slideId);
        if (currentIndex >= 0 && currentIndex < currentItem.slides.length - 1) {
          state.previewSlideId = currentItem.slides[currentIndex + 1].id;
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
        id: `rd-${Date.now()}`,
      };
      state.rundown.push(newItem);
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
  clearAllOverrides,
  setSelectedRundownId,
  setPreviewSlide,
  takeLive,
  takeSlideDirectlyLive,
  advanceSlide,
  previousSlide,
  setTransitionType,
  setFadeDuration,
  setActiveBackground,
  addCustomBackgroundTheme,
  updateSlide,
  addSlide,
  deleteSlide,
  addRundownItem,
  deleteRundownItem,
  reorderRundown,
  reorderSlides,
  setLoadedRundown,
} = presentationSlice.actions;

export const presentationReducer = presentationSlice.reducer;
export default presentationReducer;
