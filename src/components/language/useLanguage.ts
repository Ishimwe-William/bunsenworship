import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  LanguageCode,
  selectCurrentLanguage,
  selectIsKinyarwanda,
  selectTranslations,
  setLanguage,
  toggleLanguage,
  TranslationDictionary,
} from '../../store/features/language';

export interface UseLanguageReturn {
  /** The current active language code ('en' | 'rw') */
  language: LanguageCode;
  /** True if Kinyarwanda is active */
  isKinyarwanda: boolean;
  /** Active localized translation dictionary */
  t: TranslationDictionary;
  /** Sets the language explicitly */
  setLang: (code: LanguageCode) => void;
  /** Toggles between EN and RW */
  toggleLang: () => void;
}

/**
 * Hook providing reactive access to current language, translations, and actions.
 */
export const useLanguage = (): UseLanguageReturn => {
  const dispatch = useAppDispatch();
  const language = useAppSelector(selectCurrentLanguage);
  const isKinyarwanda = useAppSelector(selectIsKinyarwanda);
  const t = useAppSelector(selectTranslations);

  const setLang = useCallback(
    (code: LanguageCode) => {
      dispatch(setLanguage(code));
    },
    [dispatch],
  );

  const toggleLang = useCallback(() => {
    dispatch(toggleLanguage());
  }, [dispatch]);

  return {
    language,
    isKinyarwanda,
    t,
    setLang,
    toggleLang,
  };
};
