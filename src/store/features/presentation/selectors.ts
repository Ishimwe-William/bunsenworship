import { PresentationState } from './types';

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
