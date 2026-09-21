import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { LanguageCode, LanguageState } from './types';
import {
  applyLanguageToDOM,
  getPersistedLanguage,
  persistLanguage,
} from './languageService';

const initialLang = getPersistedLanguage();
applyLanguageToDOM(initialLang);

const initialState: LanguageState = {
  currentLanguage: initialLang,
};

export const languageSlice = createSlice({
  name: 'language',
  initialState,
  reducers: {
    setLanguage: (state, action: PayloadAction<LanguageCode>) => {
      const newLang = action.payload;
      state.currentLanguage = newLang;
      persistLanguage(newLang);
      applyLanguageToDOM(newLang);
    },
    toggleLanguage: (state) => {
      const nextLang: LanguageCode = state.currentLanguage === 'en' ? 'rw' : 'en';
      state.currentLanguage = nextLang;
      persistLanguage(nextLang);
      applyLanguageToDOM(nextLang);
    },
    syncLanguageWithDOM: (state) => {
      applyLanguageToDOM(state.currentLanguage);
    },
  },
});

export const { setLanguage, toggleLanguage, syncLanguageWithDOM } = languageSlice.actions;

export const languageReducer = languageSlice.reducer;
export default languageReducer;
