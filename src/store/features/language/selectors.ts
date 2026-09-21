import { LanguageCode, LanguageState, TranslationDictionary } from './types';
import { TRANSLATION_MAP } from './languageService';

export interface HasLanguageState {
  language: LanguageState;
}

export const selectLanguageState = (state: HasLanguageState): LanguageState =>
  state.language;

export const selectCurrentLanguage = (state: HasLanguageState): LanguageCode =>
  state.language.currentLanguage;

export const selectTranslations = (state: HasLanguageState): TranslationDictionary =>
  TRANSLATION_MAP[state.language.currentLanguage];

export const selectIsKinyarwanda = (state: HasLanguageState): boolean =>
  state.language.currentLanguage === 'rw';
