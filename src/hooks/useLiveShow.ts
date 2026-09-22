import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  selectRundown,
  selectSelectedRundownId,
  selectLiveRundownId,
  selectPreviewSlideId,
  selectLiveSlideId,
  selectCurrentRundownItem,
  selectLiveSlide,
  selectPreviewSlide,
  selectTransitionType,
  selectFadeDuration,
  selectActiveBackground,
  selectBackgroundThemes,
  selectIsBlackout,
  selectIsTextCleared,
  selectIsLogoActive,
  setSelectedRundownId,
  setPreviewSlide,
  takeLive,
  takeSlideDirectlyLive,
  advanceSlide,
  previousSlide,
  setTransitionType,
  setActiveBackground,
  toggleBlackout,
  toggleClearText,
  toggleLogo,
  clearAllOverrides,
  addRundownItem,
  reorderRundown,
  updateSlide,
  addSlide,
  deleteSlide,
  reorderSlides,
} from '../store/features/presentation';
import { RundownItem, Slide } from '../store/features/presentation/types';
import { bunsenDb } from '../db';

export interface UseLiveShowReturn {
  // State
  rundown: ReturnType<typeof selectRundown>;
  selectedRundownId: ReturnType<typeof selectSelectedRundownId>;
  liveRundownId: ReturnType<typeof selectLiveRundownId>;
  previewSlideId: ReturnType<typeof selectPreviewSlideId>;
  liveSlideId: ReturnType<typeof selectLiveSlideId>;
  currentItem: ReturnType<typeof selectCurrentRundownItem>;
  liveSlide: ReturnType<typeof selectLiveSlide>;
  previewSlide: ReturnType<typeof selectPreviewSlide>;
  transitionType: ReturnType<typeof selectTransitionType>;
  fadeDuration: ReturnType<typeof selectFadeDuration>;
  activeBackground: ReturnType<typeof selectActiveBackground>;
  backgroundThemes: ReturnType<typeof selectBackgroundThemes>;
  isBlackout: ReturnType<typeof selectIsBlackout>;
  isTextCleared: ReturnType<typeof selectIsTextCleared>;
  isLogoActive: ReturnType<typeof selectIsLogoActive>;
  
  // Actions
  selectRundownItem: (id: string) => void;
  selectPreviewSlideAction: (rundownId: string, slideId: string) => void;
  goLive: () => void;
  takeSlideLive: (rundownId: string, slideId: string) => void;
  nextSlide: () => void;
  prevSlide: () => void;
  setTransition: (type: 'CUT' | 'FADE') => void;
  setBackground: (id: string) => void;
  toggleBlackoutMode: () => void;
  toggleClearTextMode: () => void;
  toggleLogoMode: () => void;
  clearOverrides: () => void;
  addRundownItemAction: (item: Omit<RundownItem, 'id'>) => void;
  reorderRundownItems: (sourceIndex: number, targetIndex: number) => void;
  updateSlideContent: (rundownId: string, slideId: string, section: string, lines: string[]) => void;
  addNewSlide: (rundownId: string, slide: Omit<Slide, 'id'>) => void;
  removeSlide: (rundownId: string, slideId: string) => void;
  reorderSlideItems: (rundownId: string, sourceIndex: number, targetIndex: number) => void;
  
  // Persistence
  saveCurrentService: () => Promise<void>;
  loadCurrentService: () => Promise<void>;
}

export const useLiveShow = (): UseLiveShowReturn => {
  const dispatch = useAppDispatch();
  
  // Selectors
  const rundown = useAppSelector(selectRundown);
  const selectedRundownId = useAppSelector(selectSelectedRundownId);
  const liveRundownId = useAppSelector(selectLiveRundownId);
  const previewSlideId = useAppSelector(selectPreviewSlideId);
  const liveSlideId = useAppSelector(selectLiveSlideId);
  const currentItem = useAppSelector(selectCurrentRundownItem);
  const liveSlide = useAppSelector(selectLiveSlide);
  const previewSlide = useAppSelector(selectPreviewSlide);
  const transitionType = useAppSelector(selectTransitionType);
  const fadeDuration = useAppSelector(selectFadeDuration);
  const activeBackground = useAppSelector(selectActiveBackground);
  const backgroundThemes = useAppSelector(selectBackgroundThemes);
  const isBlackout = useAppSelector(selectIsBlackout);
  const isTextCleared = useAppSelector(selectIsTextCleared);
  const isLogoActive = useAppSelector(selectIsLogoActive);

  // Actions
  const selectRundownItem = useCallback((id: string) => {
    dispatch(setSelectedRundownId(id));
  }, [dispatch]);

  const selectPreviewSlideAction = useCallback((rundownId: string, slideId: string) => {
    dispatch(setPreviewSlide({ rundownId, slideId }));
  }, [dispatch]);

  const goLive = useCallback(() => {
    dispatch(takeLive());
  }, [dispatch]);

  const takeSlideLive = useCallback((rundownId: string, slideId: string) => {
    dispatch(takeSlideDirectlyLive({ rundownId, slideId }));
  }, [dispatch]);

  const nextSlide = useCallback(() => {
    dispatch(advanceSlide());
  }, [dispatch]);

  const prevSlide = useCallback(() => {
    dispatch(previousSlide());
  }, [dispatch]);

  const setTransition = useCallback((type: 'CUT' | 'FADE') => {
    dispatch(setTransitionType(type));
  }, [dispatch]);

  const setBackground = useCallback((id: string) => {
    dispatch(setActiveBackground(id));
  }, [dispatch]);

  const toggleBlackoutMode = useCallback(() => {
    dispatch(toggleBlackout());
  }, [dispatch]);

  const toggleClearTextMode = useCallback(() => {
    dispatch(toggleClearText());
  }, [dispatch]);

  const toggleLogoMode = useCallback(() => {
    dispatch(toggleLogo());
  }, [dispatch]);

  const clearOverrides = useCallback(() => {
    dispatch(clearAllOverrides());
  }, [dispatch]);

  const addRundownItemAction = useCallback((item: Omit<RundownItem, 'id'>) => {
    dispatch(addRundownItem(item));
  }, [dispatch]);

  const reorderRundownItems = useCallback((sourceIndex: number, targetIndex: number) => {
    dispatch(reorderRundown({ sourceIndex, targetIndex }));
  }, [dispatch]);

  const updateSlideContent = useCallback((rundownId: string, slideId: string, section: string, lines: string[]) => {
    dispatch(updateSlide({ rundownId, slideId, section, lines }));
  }, [dispatch]);

  const addNewSlide = useCallback((rundownId: string, slide: Omit<Slide, 'id'>) => {
    dispatch(addSlide({ rundownId, slide }));
  }, [dispatch]);

  const removeSlide = useCallback((rundownId: string, slideId: string) => {
    dispatch(deleteSlide({ rundownId, slideId }));
  }, [dispatch]);

  const reorderSlideItems = useCallback((rundownId: string, sourceIndex: number, targetIndex: number) => {
    dispatch(reorderSlides({ rundownId, sourceIndex, targetIndex }));
  }, [dispatch]);

  // Persistence
  const saveCurrentService = useCallback(async () => {
    try {
      await bunsenDb.saveService({
        id: 'service-current',
        title: 'Sunday Morning Worship',
        date: new Date().toISOString().split('T')[0],
        isCurrent: true,
        items: rundown,
        createdAt: 1710000000000,
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.error('Failed to save service:', err);
      throw err;
    }
  }, [rundown]);

  const loadCurrentService = useCallback(async () => {
    try {
      const savedService = await bunsenDb.getCurrentService();
      if (savedService && savedService.items && savedService.items.length > 0) {
        // We need to dispatch the loaded rundown
        // This would require importing setLoadedRundown action
        console.log('Service loaded:', savedService);
      }
    } catch (err) {
      console.error('Failed to load service:', err);
      throw err;
    }
  }, []);

  return {
    // State
    rundown,
    selectedRundownId,
    liveRundownId,
    previewSlideId,
    liveSlideId,
    currentItem,
    liveSlide,
    previewSlide,
    transitionType,
    fadeDuration,
    activeBackground,
    backgroundThemes,
    isBlackout,
    isTextCleared,
    isLogoActive,
    
    // Actions
    selectRundownItem,
    selectPreviewSlideAction,
    goLive,
    takeSlideLive,
    nextSlide,
    prevSlide,
    setTransition,
    setBackground,
    toggleBlackoutMode,
    toggleClearTextMode,
    toggleLogoMode,
    clearOverrides,
    addRundownItemAction,
    reorderRundownItems,
    updateSlideContent,
    addNewSlide,
    removeSlide,
    reorderSlideItems,
    
    // Persistence
    saveCurrentService,
    loadCurrentService,
  };
};