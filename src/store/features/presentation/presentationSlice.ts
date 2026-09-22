import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { PresentationState, RundownItem, Slide, TransitionType } from './types';

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

const initialRundown: RundownItem[] = [
  {
    id: 'rd-loop',
    time: '09:00',
    title: 'Pre-service Loop',
    subtitle: 'Announcements v2.pptx',
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
    id: 'rd-video',
    time: '09:05',
    title: 'Call to Worship',
    subtitle: 'Opener_Cinematic.mp4',
    type: 'VIDEO',
    slides: [
      {
        id: 's-vid-1',
        section: 'Video Intro',
        lines: ['Call to Worship Video', 'Press Play to trigger NDI SDI stream'],
      },
    ],
  },
  {
    id: 'rd-glorious-day',
    time: '09:07',
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
        id: 's-gd-v1-cont',
        section: 'Verse 1 (cont)',
        lines: [
          'Jesus came forth to be born of a virgin',
          'Dwelt among men, He was my exemplar He',
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
      {
        id: 's-gd-chorus-cont',
        section: 'Chorus (cont)',
        lines: [
          'Rising He justified, freely forever',
          "One day He's coming, oh glorious day!",
        ],
      },
      {
        id: 's-gd-v2',
        section: 'Verse 2',
        lines: [
          "One day they led Him up Calvary's mountain",
          'One day they nailed Him to die on the tree',
        ],
      },
    ],
  },
  {
    id: 'rd-living-hope',
    time: '09:13',
    title: 'Living Hope',
    subtitle: 'Verse/Chorus set',
    type: 'SONG',
    slides: [
      {
        id: 's-lh-v1',
        section: 'Verse 1',
        lines: [
          'How great the chasm that lay between us',
          'How high the mountain I could not climb',
        ],
      },
      {
        id: 's-lh-ch',
        section: 'Chorus',
        lines: [
          'Hallelujah, praise the One who set me free',
          'Hallelujah, death has lost its grip on me',
        ],
      },
    ],
  },
  {
    id: 'rd-scripture',
    time: '09:19',
    title: 'Scripture Reading',
    subtitle: 'Matthew 6:19-24',
    type: 'SERMON',
    slides: [
      {
        id: 's-sc-1',
        section: 'Matthew 6:19-20',
        lines: [
          'Do not store up for yourselves treasures on earth,',
          'where moths and vermin destroy, and where thieves break in and steal.',
        ],
      },
      {
        id: 's-sc-2',
        section: 'Matthew 6:21',
        lines: [
          'For where your treasure is,',
          'there your heart will be also.',
        ],
      },
    ],
  },
  {
    id: 'rd-generosity',
    time: '09:21',
    title: 'Generosity Unlocked',
    subtitle: 'Sermon_Slides.pptx',
    type: 'SERMON',
    slides: [
      {
        id: 's-gen-1',
        section: 'Title Slide',
        lines: ['Generosity Unlocked: Kingdom Stewards', 'Senior Pastor Jean-Claude'],
      },
    ],
  },
];

const initialState: PresentationState = {
  isLive: true,
  isBlackout: false,
  isTextCleared: false,
  isLogoActive: false,
  selectedRundownId: 'rd-glorious-day',
  liveRundownId: 'rd-glorious-day',
  liveSlideId: 's-gd-v1',
  previewSlideId: 's-gd-chorus',
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
    updateSlide: (
      state,
      action: PayloadAction<{
        rundownId: string;
        slideId: string;
        section: string;
        lines: string[];
      }>
    ) => {
      const item = state.rundown.find((r) => r.id === action.payload.rundownId);
      if (item) {
        const slide = item.slides.find((s) => s.id === action.payload.slideId);
        if (slide) {
          slide.section = action.payload.section;
          slide.lines = action.payload.lines;
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
  updateSlide,
  addSlide,
  deleteSlide,
  addRundownItem,
  reorderRundown,
  reorderSlides,
} = presentationSlice.actions;

export const presentationReducer = presentationSlice.reducer;
export default presentationReducer;
