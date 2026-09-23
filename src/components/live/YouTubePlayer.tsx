import React, { useEffect, useRef, useState } from 'react';

interface YTPlayerInstance {
  playVideo?: () => void;
  pauseVideo?: () => void;
  seekTo?: (seconds: number, allowSeekAhead?: boolean) => void;
  getDuration?: () => number;
  getCurrentTime?: () => number;
  getPlayerState?: () => number;
  setVolume?: (volume: number) => void;
  mute?: () => void;
  unMute?: () => void;
  unloadModule?: (moduleName: string) => void;
  getIframe?: () => HTMLIFrameElement;
  destroy?: () => void;
}

interface YTEvent {
  target: YTPlayerInstance;
  data?: number;
}

interface YTNamespace {
  Player: new (element: HTMLElement | string, options: Record<string, unknown>) => YTPlayerInstance;
  PlayerState: {
    UNSTARTED: number;
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
  };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.YT && window.YT.Player) {
    return Promise.resolve();
  }
  if (!ytApiPromise) {
    ytApiPromise = new Promise<void>((resolve) => {
      let isDone = false;
      const finish = () => {
        if (!isDone) {
          isDone = true;
          resolve();
        }
      };

      const checkInterval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkInterval);
          finish();
        }
      }, 50);

      const existingTag = document.getElementById('yt-iframe-api');
      if (!existingTag) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      }

      const prevReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevReady) prevReady();
        clearInterval(checkInterval);
        finish();
      };
    });
  }
  return ytApiPromise;
}

export interface YouTubePlayerProps {
  videoId: string;
  poster?: string;
  isPlaying: boolean;
  currentTime?: number;
  volume?: number; // 0.0 to 1.0
  isMuted?: boolean;
  loop?: boolean;
  startTime?: number;
  isLive?: boolean;
  isBlackout?: boolean;
  isLogoActive?: boolean;
  onDurationChange?: (duration: number) => void;
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
  onError?: (errorCode: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoId,
  poster,
  isPlaying,
  currentTime = 0,
  volume = 1.0,
  isMuted = true,
  loop = false,
  startTime = 0,
  isLive = false,
  isBlackout = false,
  isLogoActive = false,
  onDurationChange,
  onTimeUpdate,
  onEnded,
  onError,
  onPlay,
  onPause,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountSlotRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const isReadyRef = useRef<boolean>(false);
  const timerRef = useRef<number | null>(null);
  const lastReportedTimeRef = useRef<number>(0);
  const [isActuallyPlaying, setIsActuallyPlaying] = useState<boolean>(false);

  // Reset when videoId changes
  useEffect(() => {
    setIsActuallyPlaying(false);
  }, [videoId]);

  // Initialize YT.Player
  useEffect(() => {
    let isCancelled = false;

    loadYouTubeApi().then(() => {
      if (isCancelled || !mountSlotRef.current || !window.YT) return;

      mountSlotRef.current.innerHTML = '';
      const playerElement = document.createElement('div');
      playerElement.style.width = '100%';
      playerElement.style.height = '100%';
      mountSlotRef.current.appendChild(playerElement);

      const effectiveOrigin =
        typeof window !== 'undefined' &&
        window.location.origin &&
        !window.location.origin.startsWith('file:') &&
        window.location.origin !== 'null'
          ? window.location.origin
          : undefined;

      playerRef.current = new window.YT.Player(playerElement, {
        width: '100%',
        height: '100%',
        videoId,
        host: 'https://www.youtube.com',
        playerVars: {
          autoplay: isPlaying && !isBlackout && !isLogoActive ? 1 : 0,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          fs: 0,
          disablekb: 1,
          iv_load_policy: 3,
          cc_load_policy: 0,
          enablejsapi: 1,
          mute: !isLive || isMuted ? 1 : 0,
          origin: effectiveOrigin,
          start: startTime > 0 ? Math.floor(startTime) : undefined,
        },
        events: {
          onReady: (event: YTEvent) => {
            isReadyRef.current = true;
            const p = event.target;
            // Disable captions/subtitles
            if (typeof p.unloadModule === 'function') {
              try {
                p.unloadModule('captions');
                p.unloadModule('cc');
              } catch {
                // ignore
              }
            }
            const iframe = p.getIframe?.();
            if (iframe) {
              iframe.style.position = 'absolute';
              iframe.style.top = '-6%';
              iframe.style.left = '-6%';
              iframe.style.width = '112%';
              iframe.style.height = '112%';
              iframe.style.border = 'none';
            }
            const dur = p.getDuration?.();
            if (dur && dur > 0 && onDurationChange) {
              onDurationChange(dur);
            }
            p.setVolume?.(Math.round(volume * 100));
            if (!isLive || isMuted) {
              p.mute?.();
            } else {
              p.unMute?.();
            }
            if (isPlaying && !isBlackout && !isLogoActive) {
              p.playVideo?.();
            }
          },
          onStateChange: (event: YTEvent) => {
            const state = event.data;
            if (state === window.YT?.PlayerState?.PLAYING) {
              setIsActuallyPlaying(true);
              if (typeof event.target.unloadModule === 'function') {
                try {
                  event.target.unloadModule('captions');
                  event.target.unloadModule('cc');
                } catch {
                  // ignore
                }
              }
              onPlay?.();
              const dur = event.target.getDuration?.();
              if (dur && dur > 0 && onDurationChange) {
                onDurationChange(dur);
              }
            } else if (state === window.YT?.PlayerState?.PAUSED) {
              if (isPlaying && !isBlackout && !isLogoActive) {
                event.target.playVideo?.();
              } else {
                onPause?.();
              }
            } else if (state === window.YT?.PlayerState?.ENDED) {
              if (loop) {
                event.target.seekTo?.(0, true);
                event.target.playVideo?.();
              } else {
                setIsActuallyPlaying(false);
                onEnded?.();
              }
            }
          },
          onError: (event: YTEvent) => {
            console.warn('YouTube Player error code:', event.data);
            if (typeof event.data === 'number') {
              onError?.(event.data);
            }
          },
        },
      });
    });

    return () => {
      isCancelled = true;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (playerRef.current) {
        try {
          playerRef.current.destroy?.();
        } catch {
          // ignore
        }
        playerRef.current = null;
      }
      if (mountSlotRef.current) {
        mountSlotRef.current.innerHTML = '';
      }
      isReadyRef.current = false;
    };
  }, [videoId]);

  // Sync play / pause state
  useEffect(() => {
    if (!isReadyRef.current || !playerRef.current) return;
    const p = playerRef.current;
    const shouldPlay = isPlaying && !isBlackout && !isLogoActive;

    try {
      if (shouldPlay) {
        p.playVideo?.();
      } else {
        p.pauseVideo?.();
      }
    } catch {
      // ignore
    }
  }, [isPlaying, isBlackout, isLogoActive]);

  // Sync volume and mute
  useEffect(() => {
    if (!isReadyRef.current || !playerRef.current) return;
    const p = playerRef.current;
    try {
      p.setVolume?.(Math.round(volume * 100));
      if (!isLive || isMuted) {
        p.mute?.();
      } else {
        p.unMute?.();
      }
    } catch {
      // ignore
    }
  }, [volume, isMuted, isLive]);

  // Sync external seek (user scrubbing)
  useEffect(() => {
    if (!isReadyRef.current || !playerRef.current) return;
    const p = playerRef.current;
    try {
      const cur = p.getCurrentTime?.() || 0;
      if (Math.abs(cur - currentTime) > 1.5) {
        p.seekTo?.(currentTime, true);
      }
    } catch {
      // ignore
    }
  }, [currentTime]);

  // Interval timer for currentTime sync
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!isLive) return;

    timerRef.current = window.setInterval(() => {
      if (!isReadyRef.current || !playerRef.current) return;
      try {
        const shouldPlay = isPlaying && !isBlackout && !isLogoActive;
        if (shouldPlay) {
          const pState = playerRef.current.getPlayerState?.();
          if (pState === 2 /* PAUSED */) {
            playerRef.current.playVideo?.();
          }
        }

        const cur = playerRef.current.getCurrentTime?.();
        if (typeof cur === 'number' && !isNaN(cur)) {
          if (Math.abs(cur - lastReportedTimeRef.current) >= 0.25) {
            lastReportedTimeRef.current = cur;
            onTimeUpdate?.(cur);
          }
        }
      } catch {
        // ignore
      }
    }, 250);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isLive, isPlaying, isBlackout, isLogoActive, onTimeUpdate]);

  return (
    <div
      ref={containerRef}
      className="bunsen-yt-player-container"
    >
      {/* Dedicated untouched container for YouTube iframe - React never manages children inside */}
      <div
        ref={mountSlotRef}
        className="bunsen-yt-iframe-slot"
      />

      {/* Clean cover overlay before/between playback: hides YouTube initial play button, top title bar, and suggested videos */}
      <div
        className="bunsen-yt-cover-overlay"
        style={{
          backgroundImage: poster ? `url("${poster}")` : undefined,
          opacity: isActuallyPlaying ? 0 : 1,
        }}
      />
    </div>
  );
};
