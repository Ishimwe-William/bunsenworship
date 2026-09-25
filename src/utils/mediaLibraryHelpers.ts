import { ProMediaAsset } from '../components/screens/mediaLibraryData';
import { SongRecord, ExternalPresentationRecord, ImageMediaRecord } from '../db';

export const convertSongToAsset = (song: SongRecord): ProMediaAsset => {
  return {
    id: `song-${song.id}`,
    title: song.title,
    format: 'SONG',
    resolution: 'Lyrics',
    durationOrSlides: `${song.slides.length} Slides`,
    sourceCategory: 'SONGS',
    thumbnailUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" width="960" height="540">
        <defs>
          <linearGradient id="sGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#1e1b4b"/>
            <stop offset="60%" stop-color="#312e81"/>
            <stop offset="100%" stop-color="#0f172a"/>
          </linearGradient>
        </defs>
        <rect width="960" height="540" fill="url(#sGrad)"/>
        <circle cx="480" cy="220" r="70" fill="none" stroke="#818cf8" stroke-width="3" opacity="0.6"/>
        <g stroke="#a5b4fc" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none" transform="translate(456, 192) scale(2)">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" fill="#a5b4fc"/>
          <circle cx="18" cy="16" r="3" fill="#a5b4fc"/>
        </g>
        <text x="480" y="340" font-family="-apple-system, sans-serif" font-size="34" font-weight="800" fill="#ffffff" text-anchor="middle">${song.title}</text>
        <text x="480" y="385" font-family="-apple-system, sans-serif" font-size="18" fill="#cbd5e1" text-anchor="middle">${song.artist || 'Worship Track'}</text>
      </svg>
    `.trim())}`,
    slidesCount: song.slides.length,
    tags: song.tags,
  };
};

export const convertDeckToAsset = (deck: ExternalPresentationRecord): ProMediaAsset => {
  return {
    id: `deck-${deck.id}`,
    title: deck.title,
    format: deck.type === 'PPT' ? 'PPTX' : 'CANVA',
    resolution: deck.type === 'PPT' ? 'PowerPoint' : 'Canva',
    durationOrSlides: `${deck.slideCount || deck.slides.length} Slides`,
    sourceCategory: deck.type === 'PPT' ? 'POWERPOINT' : 'CANVA',
    thumbnailUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" width="960" height="540">
        <rect width="960" height="540" fill="${deck.type === 'PPT' ? '#1c1917' : '#083344'}"/>
        <rect x="40" y="40" width="880" height="460" rx="8" fill="none" stroke="${deck.type === 'PPT' ? '#ea580c' : '#06b6d4'}" stroke-width="2" opacity="0.5"/>
        <text x="480" y="240" font-family="-apple-system, sans-serif" font-size="36" font-weight="800" fill="#ffffff" text-anchor="middle">${deck.title}</text>
        <text x="480" y="295" font-family="-apple-system, sans-serif" font-size="18" fill="${deck.type === 'PPT' ? '#fdba74' : '#67e8f9'}" text-anchor="middle">${deck.type === 'PPT' ? 'PowerPoint Presentation' : 'Canva Visual Deck'}</text>
      </svg>
    `.trim())}`,
    filePath: deck.filePath,
    canvaUrl: deck.canvaUrl,
    slidesCount: deck.slideCount || deck.slides.length,
  };
};

export const convertImageToAsset = (img: ImageMediaRecord): ProMediaAsset => {
  return {
    id: `img-${img.id}`,
    title: img.title,
    format: 'PNG',
    resolution: '4K',
    durationOrSlides: 'Static',
    sourceCategory:
      img.category === 'ANNOUNCEMENT'
        ? 'ANNOUNCEMENTS'
        : img.category === 'SERMON'
        ? 'SPEAKER_DECK'
        : 'VIDEO',
    thumbnailUrl: img.dataUrl,
  };
};

export { extractYouTubeId } from './videoHelpers';

export const generateAssetId = (type: string): string => {
  return `asset-${type}-${Date.now()}`;
};

export const validateMediaUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

export const getMediaCategoryFromFormat = (format: string): string => {
  const formatMap: Record<string, string> = {
    'MOV': 'VIDEO',
    'MP4': 'VIDEO',
    'PPTX': 'POWERPOINT',
    'PPT': 'POWERPOINT',
    'PNG': 'VIDEO',
    'JPG': 'VIDEO',
    'JPEG': 'VIDEO',
    'CANVA': 'CANVA',
    'SONG': 'SONGS',
  };
  return formatMap[format.toUpperCase()] || 'VIDEO';
};