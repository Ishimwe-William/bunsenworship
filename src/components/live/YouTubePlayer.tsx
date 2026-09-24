import React, { useEffect, useRef, useState, useCallback } from 'react';
import { parseYouTubeId } from '../../utils/videoHelpers';

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
  [key: string]: unknown;
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

      // Timeout safety: if YouTube API fails to load within 4s (e.g. offline), resolve anyway
      const safetyTimeout = setTimeout(() => {
        finish();
      }, 4000);

      const checkInterval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkInterval);
          clearTimeout(safetyTimeout);
          finish();
        }
      }, 50);

      const existingTag = document.getElementById('yt-iframe-api');
      if (!existingTag) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.onerror = () => {
          clearInterval(checkInterval);
          clearTimeout(safetyTimeout);
          finish();
        };
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      }

      const prevReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevReady) prevReady();
        clearInterval(checkInterval);
        clearTimeout(safetyTimeout);
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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const isReadyRef = useRef<boolean>(false);
  const timerRef = useRef<number | null>(null);
  const lastReportedTimeRef = useRef<number>(0);
  const lastReportedDurationRef = useRef<number>(0);
  const [isActuallyPlaying, setIsActuallyPlaying] = useState<boolean>(false);
  const [embedError, setEmbedError] = useState<number | null>(null);

  // Extract clean 11-char ID
  const cleanVideoId = parseYouTubeId(videoId) || videoId;

  // Track latest props in a ref to avoid stale closures in event listeners & timers
  const propsRef = useRef({
    videoId: cleanVideoId,
    isPlaying,
    currentTime,
    volume,
    isMuted,
    loop,
    startTime,
    isLive,
    isBlackout,
    isLogoActive,
    onDurationChange,
    onTimeUpdate,
    onEnded,
    onError,
    onPlay,
    onPause,
  });

  propsRef.current = {
    videoId: cleanVideoId,
    isPlaying,
    currentTime,
    volume,
    isMuted,
    loop,
    startTime,
    isLive,
    isBlackout,
    isLogoActive,
    onDurationChange,
    onTimeUpdate,
    onEnded,
    onError,
    onPlay,
    onPause,
  };

  // Helper to send command both to YT API instance and via iframe postMessage
  const sendCommand = useCallback((func: string, args: unknown[] = []) => {
    // 1. Try official YT.Player instance
    if (playerRef.current && typeof playerRef.current[func] === 'function') {
      try {
        (playerRef.current[func] as (...a: unknown[]) => void)(...args);
        return;
      } catch (err) {
        console.debug('Direct YT call deferred:', func, err);
      }
    }

    // 2. Direct postMessage to YouTube iframe
    try {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func,
            args,
          }),
          '*'
        );
      }
    } catch (err) {
      console.debug('postMessage to YouTube failed:', err);
    }
  }, []);

  // Reset states when videoId changes
  useEffect(() => {
    setIsActuallyPlaying(false);
    setEmbedError(null);
    lastReportedTimeRef.current = 0;
    lastReportedDurationRef.current = 0;
  }, [cleanVideoId]);

  // Grace period timer: if isLive and isPlaying, reveal video even if onStateChange is delayed
  useEffect(() => {
    if (!isLive || !isPlaying || isBlackout || isLogoActive) return;

    const timer = setTimeout(() => {
      setIsActuallyPlaying(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, [cleanVideoId, isLive, isPlaying, isBlackout, isLogoActive]);

  // Listen for YouTube postMessage events from the embedded iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return;
      try {
        const data = JSON.parse(event.data);
        if (!data || typeof data !== 'object') return;

        // Ready / initial handshake
        if (data.event === 'onReady' || data.event === 'initialDelivery') {
          isReadyRef.current = true;
          if (
            propsRef.current.isPlaying &&
            !propsRef.current.isBlackout &&
            !propsRef.current.isLogoActive
          ) {
            sendCommand('playVideo');
          }
        }

        // Player state change events
        if (data.event === 'onStateChange') {
          const state = Number(data.info);
          if (state === 1 /* PLAYING */) {
            setIsActuallyPlaying(true);
            propsRef.current.onPlay?.();
          } else if (state === 2 /* PAUSED */) {
            propsRef.current.onPause?.();
          } else if (state === 0 /* ENDED */) {
            if (propsRef.current.loop) {
              sendCommand('seekTo', [0, true]);
              sendCommand('playVideo');
            } else {
              setIsActuallyPlaying(false);
              propsRef.current.onEnded?.();
            }
          }
        }

        // Info delivery events (currentTime, duration)
        if (data.event === 'infoDelivery' && data.info) {
          const info = data.info;
          if (typeof info.duration === 'number' && info.duration > 0) {
            if (Math.abs(info.duration - lastReportedDurationRef.current) > 0.5) {
              lastReportedDurationRef.current = info.duration;
              propsRef.current.onDurationChange?.(info.duration);
            }
          }
          if (typeof info.currentTime === 'number') {
            if (Math.abs(info.currentTime - lastReportedTimeRef.current) >= 0.25) {
              lastReportedTimeRef.current = info.currentTime;
              propsRef.current.onTimeUpdate?.(info.currentTime);
            }
          }
        }

        // Error events
        if (data.event === 'onError' && data.info != null) {
          const code = Number(data.info);
          console.warn('YouTube Player message error code:', code);
          setEmbedError(code);
          propsRef.current.onError?.(code);
        }
      } catch {
        // Not a JSON message from YouTube
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [sendCommand]);

  // Bind YT.Player to the existing iframe when API is ready
  useEffect(() => {
    let isCancelled = false;

    loadYouTubeApi().then(() => {
      if (isCancelled || !iframeRef.current || !window.YT?.Player) return;

      try {
        playerRef.current = new window.YT.Player(iframeRef.current, {
          host: 'https://www.youtube-nocookie.com',
          events: {
            onReady: (event: YTEvent) => {
              if (isCancelled) return;
              isReadyRef.current = true;
              const p = event.target;

              // Unload captions
              if (typeof p.unloadModule === 'function') {
                try {
                  p.unloadModule('captions');
                  p.unloadModule('cc');
                } catch {
                  // ignore
                }
              }

              // Check duration
              const dur = p.getDuration?.();
              if (dur && dur > 0) {
                lastReportedDurationRef.current = dur;
                propsRef.current.onDurationChange?.(dur);
              }

              // Volume & Mute
              p.setVolume?.(Math.round(propsRef.current.volume * 100));
              if (!propsRef.current.isLive || propsRef.current.isMuted) {
                p.mute?.();
              } else {
                p.unMute?.();
              }

              // Auto-play if live & active
              if (
                propsRef.current.isPlaying &&
                !propsRef.current.isBlackout &&
                !propsRef.current.isLogoActive
              ) {
                p.playVideo?.();
              }
            },
            onStateChange: (event: YTEvent) => {
              if (isCancelled) return;
              const state = event.data;
              if (state === window.YT?.PlayerState?.PLAYING) {
                setIsActuallyPlaying(true);
                propsRef.current.onPlay?.();
                const dur = event.target.getDuration?.();
                if (dur && dur > 0) {
                  lastReportedDurationRef.current = dur;
                  propsRef.current.onDurationChange?.(dur);
                }
              } else if (state === window.YT?.PlayerState?.PAUSED) {
                if (
                  propsRef.current.isPlaying &&
                  !propsRef.current.isBlackout &&
                  !propsRef.current.isLogoActive
                ) {
                  event.target.playVideo?.();
                } else {
                  propsRef.current.onPause?.();
                }
              } else if (state === window.YT?.PlayerState?.ENDED) {
                if (propsRef.current.loop) {
                  event.target.seekTo?.(0, true);
                  event.target.playVideo?.();
                } else {
                  setIsActuallyPlaying(false);
                  propsRef.current.onEnded?.();
                }
              }
            },
            onError: (event: YTEvent) => {
              if (isCancelled) return;
              const code = Number(event.data);
              console.warn('YouTube Player API error code:', code);
              setEmbedError(code);
              if (typeof event.data === 'number') {
                propsRef.current.onError?.(code);
              }
            },
          },
        });
      } catch (err) {
        console.warn('YT.Player binding error:', err);
      }
    });

    return () => {
      isCancelled = true;
      if (playerRef.current) {
        try {
          playerRef.current.destroy?.();
        } catch {
          // ignore
        }
        playerRef.current = null;
      }
      isReadyRef.current = false;
    };
  }, [cleanVideoId]);

  // Synchronize play / pause state
  useEffect(() => {
    const shouldPlay = isPlaying && !isBlackout && !isLogoActive;
    if (shouldPlay) {
      sendCommand('playVideo');
    } else {
      sendCommand('pauseVideo');
    }
  }, [isPlaying, isBlackout, isLogoActive, sendCommand]);

  // Synchronize volume and mute
  useEffect(() => {
    sendCommand('setVolume', [Math.round(volume * 100)]);
    if (!isLive || isMuted) {
      sendCommand('mute');
    } else {
      sendCommand('unMute');
    }
  }, [volume, isMuted, isLive, sendCommand]);

  // Synchronize external seek (when user scrubs seekbar)
  useEffect(() => {
    const cur = lastReportedTimeRef.current;
    if (Math.abs(cur - currentTime) > 1.2) {
      sendCommand('seekTo', [currentTime, true]);
    }
  }, [currentTime, sendCommand]);

  // Periodic interval timer to query time and duration when live
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!isLive) return;

    timerRef.current = window.setInterval(() => {
      // Query player instance if available
      if (playerRef.current) {
        try {
          const cur = playerRef.current.getCurrentTime?.();
          if (typeof cur === 'number' && !isNaN(cur)) {
            if (Math.abs(cur - lastReportedTimeRef.current) >= 0.25) {
              lastReportedTimeRef.current = cur;
              propsRef.current.onTimeUpdate?.(cur);
            }
          }

          const dur = playerRef.current.getDuration?.();
          if (typeof dur === 'number' && dur > 0) {
            if (Math.abs(dur - lastReportedDurationRef.current) > 0.5) {
              lastReportedDurationRef.current = dur;
              propsRef.current.onDurationChange?.(dur);
            }
          }
        } catch {
          // ignore
        }
      }
    }, 250);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isLive]);

  // Stable instance ID to avoid DOM collisions between preview and live monitors
  const playerIdRef = useRef(`yt-frame-${Math.random().toString(36).slice(2, 9)}`);

  // Construct stable iframe embed URL once per video/loop/start - NEVER change on play/pause/mute
  const embedUrl = React.useMemo(() => {
    if (!cleanVideoId) return '';
    const params = new URLSearchParams();
    params.set('enablejsapi', '1');
    params.set('controls', '0');
    params.set('rel', '0');
    params.set('modestbranding', '1');
    params.set('playsinline', '1');
    params.set('iv_load_policy', '3');
    params.set('fs', '0');
    params.set('disablekb', '1');

    if (loop) {
      params.set('loop', '1');
      params.set('playlist', cleanVideoId);
    }
    if (startTime > 0) {
      params.set('start', String(Math.floor(startTime)));
    }

    return `https://www.youtube-nocookie.com/embed/${cleanVideoId}?${params.toString()}`;
  }, [cleanVideoId, loop, startTime]);

  const handleIframeLoad = () => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'listening' }),
        '*'
      );
    } catch {
      // ignore
    }
  };

  const showCover = !isActuallyPlaying && (!isPlaying || isBlackout || isLogoActive);

  return (
    <div ref={containerRef} className="bunsen-yt-player-container">
      {/* Native YouTube iframe with cross-origin referrer policy and hardware acceleration */}
      <div className="bunsen-yt-iframe-slot">
        <iframe
          ref={iframeRef}
          key={`yt-iframe-${cleanVideoId}`}
          id={playerIdRef.current}
          src={embedUrl}
          onLoad={handleIframeLoad}
          title="YouTube Worship Stream"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          tabIndex={-1}
          style={{
            position: 'absolute',
            top: '-6%',
            left: '-6%',
            width: '112%',
            height: '112%',
            border: 'none',
          }}
        />
      </div>

      {/* Clean poster cover overlay before playback */}
      <div
        className="bunsen-yt-cover-overlay"
        style={{
          backgroundImage: poster ? `url("${poster}")` : undefined,
          opacity: showCover ? 1 : 0,
        }}
      />

      {/* Error notification if video embedding is restricted by owner (e.g. Error 150/101) */}
      {embedError && (embedError === 101 || embedError === 150) && (
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            right: '16px',
            padding: '10px 14px',
            background: 'rgba(15, 23, 42, 0.92)',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '8px',
            color: '#f87171',
            fontSize: '0.75rem',
            lineHeight: 1.4,
            zIndex: 20,
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <span>
            <strong>YouTube Notice:</strong> The owner of this video restricted playback in embedded players (Error {embedError}).
          </span>
          <button
            type="button"
            onClick={() => window.open(`https://www.youtube.com/watch?v=${cleanVideoId}`, '_blank')}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              border: '1px solid #ef4444',
              background: 'rgba(239, 68, 68, 0.2)',
              color: '#ffffff',
              fontSize: '0.7rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Watch on YouTube
          </button>
        </div>
      )}
    </div>
  );
};
