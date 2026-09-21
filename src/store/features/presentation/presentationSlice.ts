import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { PresentationState } from './types';

const initialState: PresentationState = {
  isLive: true,
  isBlackout: false,
  isTextCleared: false,
  isLogoActive: false,
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
} = presentationSlice.actions;

export const presentationReducer = presentationSlice.reducer;
export default presentationReducer;
