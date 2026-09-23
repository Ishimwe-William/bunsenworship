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
    /^[a-zA-Z]:[/\\]/.test(src) ||
    /\.(mp4|webm|mov|m4v|mkv|ogg)$/i.test(src.split('?')[0])
  );
}

/**
 * Normalizes any video path, URL, or local drive file path into a format
 * that HTML5 <video> can reliably stream without CORS or protocol issues.
 * Uses custom bunsen-media:// scheme for safe, sandboxed streaming in Electron.
 */
export function normalizeVideoSource(src?: string): string {
  if (!src || typeof src !== 'string') return '';
  const trimmed = src.trim();
  if (!trimmed) return '';

  // Already standard web or data protocols
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }

  // Already custom bunsen-media protocol
  if (trimmed.startsWith('bunsen-media://')) {
    return trimmed;
  }

  // Convert old file:// URI to bunsen-media://
  if (trimmed.startsWith('file:///')) {
    return `bunsen-media:///${trimmed.slice(8)}`;
  }
  if (trimmed.startsWith('file://')) {
    return `bunsen-media:///${trimmed.slice(7)}`;
  }

  // Windows absolute path: e.g. C:\Videos\worship.mp4 or C:/Videos/worship.mp4
  if (/^[a-zA-Z]:[/\\]/.test(trimmed)) {
    const forwardSlashed = trimmed.replace(/\\/g, '/');
    return `bunsen-media:///${forwardSlashed}`;
  }

  // Unix-style absolute path
  if (trimmed.startsWith('/')) {
    return `bunsen-media://${trimmed}`;
  }

  // Bare video filename: route via bunsen-media so Electron can resolve from user media folders
  if (isVideoFile(trimmed)) {
    return `bunsen-media:///${encodeURIComponent(trimmed)}`;
  }

  return trimmed;
}

/**
 * Checks if a string has a video file extension
 */
export function isVideoFile(src?: string): boolean {
  if (!src || typeof src !== 'string') return false;
  const clean = src.split('?')[0].split('#')[0].trim();
  return /\.(mp4|webm|mov|m4v|mkv|ogg)$/i.test(clean);
}

/**
 * Checks if a video source string is just a bare filename without an absolute path or URL.
 */
export function isBareFilename(src?: string): boolean {
  if (!src || typeof src !== 'string') return false;
  const trimmed = src.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('file://') ||
    trimmed.startsWith('bunsen-media://') ||
    trimmed.startsWith('/') ||
    /^[a-zA-Z]:[/\\]/.test(trimmed)
  ) {
    return false;
  }
  return isVideoFile(trimmed);
}

/**
 * Extracts clean file display name from a file path or URL
 */
export function getFileNameFromPath(pathOrUrl?: string): string {
  if (!pathOrUrl) return '';
  const clean = pathOrUrl.split('?')[0].split('#')[0];
  const lastPart = clean.split(/[/\\]/).pop() || clean;
  return decodeURIComponent(lastPart);
}

const thumbnailCache = new Map<string, string>();

/**
 * Generates an SVG poster thumbnail data URL for a video title (memoized)
 */
export function generateVideoThumbnail(title: string): string {
  const safeTitle = (title || 'Video Media').trim();
  const cached = thumbnailCache.get(safeTitle);
  if (cached !== undefined) {
    return cached;
  }

  const escapedTitle = safeTitle
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" width="960" height="540">
  <defs>
    <linearGradient id="vbg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#090d16"/>
      <stop offset="50%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e1b4b"/>
    </linearGradient>
  </defs>
  <rect width="960" height="540" fill="url(#vbg)"/>
  <circle cx="480" cy="230" r="70" fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" stroke-width="3"/>
  <polygon points="465,200 465,260 515,230" fill="#3b82f6"/>
  <text x="480" y="350" font-family="-apple-system, sans-serif" font-size="32" font-weight="700" fill="#ffffff" text-anchor="middle">${escapedTitle}</text>
  <text x="480" y="390" font-family="-apple-system, sans-serif" font-size="18" fill="#94a3b8" text-anchor="middle">Video Media Asset</text>
</svg>`.trim();

  const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  thumbnailCache.set(safeTitle, dataUrl);
  return dataUrl;
}

