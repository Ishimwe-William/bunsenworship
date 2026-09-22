/**
 * Video playback helper utilities for BunsenWorship
 * Supports local video paths/URLs and YouTube embeds
 */

/**
 * Extracts a YouTube 11-character video ID from any standard YouTube URL
 * Handles watch?v=, youtu.be/, embed/, shorts/, live/, and timestamp parameters
 */
export function parseYouTubeId(url?: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // If already an 11-character ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  const patterns = [
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|live\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
    /^[a-zA-Z0-9_-]{11}$/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Parses start time (in seconds) from a YouTube URL (e.g. &t=90s or &t=90)
 */
export function parseYouTubeStartTime(url?: string): number | undefined {
  if (!url || typeof url !== 'string') return undefined;
  const match = url.match(/[?&]t=(\d+)(?:s)?/);
  if (match && match[1]) {
    const secs = parseInt(match[1], 10);
    return isNaN(secs) ? undefined : secs;
  }
  return undefined;
}

export interface YouTubeEmbedOptions {
  autoplay?: boolean;
  loop?: boolean;
  mute?: boolean;
  startTime?: number;
  controls?: boolean;
}

/**
 * Builds a privacy-friendly and reliable YouTube embed URL
 */
export function buildYouTubeEmbedUrl(
  urlOrId?: string,
  options: YouTubeEmbedOptions = {}
): string | null {
  const videoId = parseYouTubeId(urlOrId);
  if (!videoId) return null;

  const {
    autoplay = true,
    loop = false,
    mute = false,
    startTime,
    controls = true,
  } = options;

  const params = new URLSearchParams();
  params.set('autoplay', autoplay ? '1' : '0');
  params.set('controls', controls ? '1' : '0');
  params.set('mute', mute ? '1' : '0');
  params.set('rel', '0');
  params.set('modestbranding', '1');
  params.set('enablejsapi', '1');
  params.set('playsinline', '1');

  if (loop) {
    params.set('loop', '1');
    params.set('playlist', videoId);
  }

  const parsedStart = startTime ?? parseYouTubeStartTime(urlOrId);
  if (parsedStart && parsedStart > 0) {
    params.set('start', String(Math.floor(parsedStart)));
  }

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

/**
 * Formats a time in seconds to mm:ss or hh:mm:ss
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  const formattedMins = hrs > 0 ? String(mins).padStart(2, '0') : String(mins);
  const formattedSecs = String(secs).padStart(2, '0');

  if (hrs > 0) {
    return `${hrs}:${formattedMins}:${formattedSecs}`;
  }
  return `${formattedMins}:${formattedSecs}`;
}

/**
 * Checks if a string looks like a local video path or data/blob URL
 */
export function isLocalVideoSource(src?: string): boolean {
  if (!src) return false;
  return (
    src.startsWith('file://') ||
    src.startsWith('blob:') ||
    src.startsWith('data:video') ||
    src.startsWith('/') ||
    src.startsWith('./') ||
    src.startsWith('../') ||
    /^[a-zA-Z]:\\/.test(src) ||
    /\.(mp4|webm|mov|m4v|mkv|ogg)$/i.test(src.split('?')[0])
  );
}
