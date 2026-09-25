import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectLiveSlide,
  selectPreviewSlide,
  selectTransitionType,
  selectFadeDuration,
  selectActiveBackground,
  selectIsBlackout,
  selectIsTextCleared,
  selectIsLogoActive,
  selectVideoPlayback,
  selectIsProjectorActive,
  setProjectorActive,
  setVideoError,
} from '../../store/features/presentation';
import { DisplayInfo } from '../../types/electron';

export interface UseProjectorOutputReturn {
  isProjectorActive: boolean;
  projectorSource: 'LIVE' | 'PREVIEW';
  setProjectorSource: (source: 'LIVE' | 'PREVIEW') => void;
  outputDimensions: { width: number; height: number };
  displays: DisplayInfo[];
  handleToggleOnAir: () => void;
  handleOpenOutput: () => void;
  handleCloseOutput: () => void;
}

export const useProjectorOutput = (): UseProjectorOutputReturn => {
  const dispatch = useAppDispatch();
  const { slide: liveSlide } = useAppSelector(selectLiveSlide);
  const previewSlide = useAppSelector(selectPreviewSlide);
  const transitionType = useAppSelector(selectTransitionType);
  const fadeDuration = useAppSelector(selectFadeDuration);
  const activeBackground = useAppSelector(selectActiveBackground);
  const isBlackout = useAppSelector(selectIsBlackout);
  const isTextCleared = useAppSelector(selectIsTextCleared);
  const isLogoActive = useAppSelector(selectIsLogoActive);
  const videoPlayback = useAppSelector(selectVideoPlayback);
  const isProjectorActive = useAppSelector(selectIsProjectorActive);

  const [projectorSource, setProjectorSource] = useState<'LIVE' | 'PREVIEW'>('LIVE');
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);
  const [projectorDimensions, setProjectorDimensions] = useState<{
    width: number;
    height: number;
    screenWidth?: number;
    screenHeight?: number;
  } | null>(null);
  const projectorWindowRef = useRef<Window | null>(null);

  const secondaryDisplay = displays.find((d) => !d.isOperator);
  const outWidth = projectorDimensions?.width || secondaryDisplay?.bounds.width || 1920;
  const outHeight = projectorDimensions?.height || secondaryDisplay?.bounds.height || 1080;
  const outputDimensions = { width: outWidth, height: outHeight };

  useEffect(() => {
    if (window.electronAPI?.getDisplays) {
      window.electronAPI
        .getDisplays()
        .then(setDisplays)
        .catch((err) => console.warn('Could not enumerate displays:', err));
    }
  }, []);

  // Broadcast presentation state to any detached projector window
  const broadcastProjectorState = useCallback(() => {
    const isLiveSource = projectorSource === 'LIVE';
    const targetSlide = isLiveSource ? liveSlide : previewSlide;

    const isMuted = Boolean(
      videoPlayback.isMuted ||
      (targetSlide?.videoMuted !== undefined ? targetSlide.videoMuted : false)
    );

    const payload = {
      slide: targetSlide,
      backgroundGradient: activeBackground.gradient,
      isBlackout: isLiveSource ? isBlackout : false,
      isTextCleared: isLiveSource ? isTextCleared : false,
      isLogoActive: isLiveSource ? isLogoActive : false,
      transitionType,
      fadeDuration,
      source: projectorSource,
      videoPlayback: {
        ...videoPlayback,
        isMuted,
      },
    };

    // Save as persistent fallback
    try {
      localStorage.setItem('bunsenworship_projector_state', JSON.stringify(payload));
    } catch {
      // ignore
    }

    // Broadcast message
    try {
      const channel = new BroadcastChannel('bunsenworship_projector_channel');
      channel.postMessage({
        type: 'UPDATE_PROJECTOR_STATE',
        payload,
      });
      channel.close();
    } catch {
      // ignore
    }
  }, [
    projectorSource,
    liveSlide,
    previewSlide,
    activeBackground,
    isBlackout,
    isTextCleared,
    isLogoActive,
    transitionType,
    fadeDuration,
    videoPlayback,
  ]);

  // Synchronize on state changes
  useEffect(() => {
    broadcastProjectorState();
  }, [broadcastProjectorState]);

  // Respond to projector window handshake requests & track connection status
  useEffect(() => {
    const channel = new BroadcastChannel('bunsenworship_projector_channel');
    let disconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const markProjectorActive = () => {
      dispatch(setProjectorActive(true));
      if (disconnectTimer) clearTimeout(disconnectTimer);
      disconnectTimer = setTimeout(() => {
        dispatch(setProjectorActive(false));
      }, 5000);
    };

    channel.onmessage = (event) => {
      if (event.data?.type === 'REQUEST_PROJECTOR_STATE') {
        broadcastProjectorState();
        markProjectorActive();
      } else if (
        event.data?.type === 'PROJECTOR_CONNECTED' ||
        event.data?.type === 'PROJECTOR_HEARTBEAT' ||
        event.data?.type === 'PROJECTOR_DIMENSIONS'
      ) {
        if (event.data?.payload?.width && event.data?.payload?.height) {
          setProjectorDimensions(event.data.payload);
        }
        markProjectorActive();
      } else if (event.data?.type === 'PROJECTOR_DISCONNECTED') {
        if (disconnectTimer) clearTimeout(disconnectTimer);
        dispatch(setProjectorActive(false));
        setProjectorDimensions(null);
      } else if (event.data?.type === 'PROJECTOR_VIDEO_ERROR') {
        dispatch(setVideoError(true));
      }
    };

    // Native Electron IPC listener if available
    let unsubscribeIpc: (() => void) | undefined;
    if (window.electronAPI?.isProjectorOpen) {
      window.electronAPI
        .isProjectorOpen()
        .then((isOpen) => {
          if (isOpen) markProjectorActive();
        })
        .catch((err) => {
          console.warn('Could not query projector status:', err);
        });
    }
    if (window.electronAPI?.onProjectorStatusChanged) {
      unsubscribeIpc = window.electronAPI.onProjectorStatusChanged((isOpen) => {
        if (isOpen) {
          markProjectorActive();
        } else {
          clearTimeout(disconnectTimer);
          dispatch(setProjectorActive(false));
        }
      });
    }

    return () => {
      clearTimeout(disconnectTimer);
      channel.close();
      if (unsubscribeIpc) unsubscribeIpc();
    };
  }, [broadcastProjectorState, dispatch]);

  const handleCloseOutput = useCallback(() => {
    if (window.electronAPI?.closeProjectorWindow) {
      window.electronAPI.closeProjectorWindow();
    } else if (projectorWindowRef.current && !projectorWindowRef.current.closed) {
      projectorWindowRef.current.close();
      projectorWindowRef.current = null;
      dispatch(setProjectorActive(false));
    } else {
      dispatch(setProjectorActive(false));
    }
  }, [dispatch]);

  const handleOpenOutput = useCallback(async () => {
    broadcastProjectorState();

    // 1. Try native Electron IPC if running in desktop app
    if (window.electronAPI?.openProjectorWindow) {
      try {
        await window.electronAPI.openProjectorWindow();
        return;
      } catch (err) {
        console.warn('Native openProjectorWindow failed, falling back to window.open', err);
      }
    }

    // 2. Fallback: window.open with ?mode=projector
    const currentBase = window.location.href.split('?')[0].split('#')[0];
    const projectorUrl = `${currentBase}?mode=projector`;
    const win = window.open(
      projectorUrl,
      'BunsenWorship_Projector',
      'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
    );
    projectorWindowRef.current = win;
  }, [broadcastProjectorState]);

  const handleToggleOnAir = useCallback(() => {
    if (isProjectorActive) {
      handleCloseOutput();
    } else {
      handleOpenOutput();
    }
  }, [isProjectorActive, handleCloseOutput, handleOpenOutput]);

  useEffect(() => {
    const handleToggleEvent = () => {
      handleToggleOnAir();
    };
    window.addEventListener('bunsenworship:toggle-onair', handleToggleEvent);
    return () => {
      window.removeEventListener('bunsenworship:toggle-onair', handleToggleEvent);
    };
  }, [handleToggleOnAir]);

  return {
    isProjectorActive,
    projectorSource,
    setProjectorSource,
    outputDimensions,
    displays,
    handleToggleOnAir,
    handleOpenOutput,
    handleCloseOutput,
  };
};
