import { LanguageCode, LanguageOption, TranslationDictionary } from './types';
import { enTranslations } from './translations/en';
import { rwTranslations } from './translations/rw';

const LANGUAGE_STORAGE_KEY = 'bunsenworship_language';

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', flag: 'EN' },
  { code: 'rw', label: 'Kinyarwanda', nativeLabel: 'Ikinyarwanda', flag: 'RW' },
];

export const TRANSLATION_MAP: Record<LanguageCode, TranslationDictionary> = {
  en: enTranslations,
  rw: rwTranslations,
};

export const getPersistedLanguage = (): LanguageCode => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 'en';
  }
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'en' || saved === 'rw') {
      return saved;
    }
  } catch (error) {
    console.warn('Failed to read language preference from localStorage:', error);
  }
  return 'en';
};

export const persistLanguage = (code: LanguageCode): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
  } catch (error) {
    console.warn('Failed to save language preference to localStorage:', error);
  }
};

export const applyLanguageToDOM = (code: LanguageCode): void => {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = code;
};
