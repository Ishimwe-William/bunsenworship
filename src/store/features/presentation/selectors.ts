import { PresentationState, RundownItem, Slide, BackgroundTheme } from './types';

export interface HasPresentationState {
  presentation: PresentationState;
}

export const selectPresentationState = (state: HasPresentationState): PresentationState =>
  state.presentation;

export const selectIsLive = (state: HasPresentationState): boolean =>
  state.presentation.isLive;

export const selectIsBlackout = (state: HasPresentationState): boolean =>
  state.presentation.isBlackout;

export const selectIsTextCleared = (state: HasPresentationState): boolean =>
  state.presentation.isTextCleared;

export const selectIsLogoActive = (state: HasPresentationState): boolean =>
  state.presentation.isLogoActive;

export const selectHasActiveOverride = (state: HasPresentationState): boolean =>
  state.presentation.isBlackout ||
  state.presentation.isTextCleared ||
  state.presentation.isLogoActive;

export const selectRundown = (state: HasPresentationState): RundownItem[] =>
  state.presentation.rundown;

export const selectSelectedRundownId = (state: HasPresentationState): string =>
  state.presentation.selectedRundownId;

export const selectCurrentRundownItem = (state: HasPresentationState): RundownItem | undefined => {
  return state.presentation.rundown.find((r) => r.id === state.presentation.selectedRundownId);
};

export const selectPreviewSlideId = (state: HasPresentationState): string | null =>
  state.presentation.previewSlideId;

export const selectLiveSlideId = (state: HasPresentationState): string | null =>
  state.presentation.liveSlideId;

export const selectLiveRundownId = (state: HasPresentationState): string | null =>
  state.presentation.liveRundownId;

export const selectPreviewSlide = (state: HasPresentationState): Slide | null => {
  const currentItem = selectCurrentRundownItem(state);
  if (!currentItem) return null;
  return currentItem.slides.find((s) => s.id === state.presentation.previewSlideId) || null;
};

export const selectLiveSlide = (state: HasPresentationState): { slide: Slide | null; rundownItem: RundownItem | null } => {
  const { liveRundownId, liveSlideId, rundown } = state.presentation;
  const item = rundown.find((r) => r.id === liveRundownId) || null;
  const slide = item ? item.slides.find((s) => s.id === liveSlideId) || null : null;
  return { slide, rundownItem: item };
};

export const selectTransitionType = (state: HasPresentationState) =>
  state.presentation.transitionType;

export const selectFadeDuration = (state: HasPresentationState) =>
  state.presentation.fadeDuration;

export const selectBackgroundThemes = (state: HasPresentationState): BackgroundTheme[] =>
  state.presentation.backgroundThemes;

export const selectActiveBackground = (state: HasPresentationState): BackgroundTheme => {
  const themes = state.presentation.backgroundThemes;
  return (
    themes.find((t) => t.id === state.presentation.activeBackgroundId) ||
    themes[0]
  );
};
