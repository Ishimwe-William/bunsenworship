/**
 * Presentation helper utilities for BunsenWorship.
 * Handles Canva design URL parsing/embed building and deck imagery.
 */

/**
 * Extracts the Canva design ID from any common Canva design URL.
 * Handles: /design/DAA.../view, /edit, /present, querystring params, etc.
 */
export function parseCanvaDesignId(url?: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    if (!parsed.hostname.toLowerCase().includes('canva.com')) return null;

    const parts = parsed.pathname.split('/').filter(Boolean);
    const designIndex = parts.findIndex((p) => p.toLowerCase() === 'design');
    if (designIndex >= 0 && parts[designIndex + 1]) {
      return parts[designIndex + 1].split('?')[0].split('#')[0] || null;
    }
  } catch {
    // ignore and fall through to regex
  }

  const match = trimmed.match(/canva\.com\/design\/([^/?#]+)/i);
  return match ? match[1] : null;
}

/**
 * Builds an embeddable Canva presentation URL for a design ID.
 * Uses the official embed mode so the design renders exactly as designed.
 */
export function buildCanvaEmbedUrl(designId: string): string {
  const cleanId = designId.trim();
  if (!cleanId) return '';
  return `https://www.canva.com/design/${cleanId}/view?embed`;
}

/**
 * Reconstructs a human-openable Canva URL from an embed URL.
 */
export function openUrlFromEmbedUrl(embedUrl?: string): string {
  if (!embedUrl) return '';
  return embedUrl.replace(/\/view\?embed/, '/view');
}

const canvaThumbnailCache = new Map<string, string>();

/**
 * Generates a branded SVG thumbnail data URL for a Canva presentation (memoized).
 * Used in the media library grid and as the offline fallback for embeds.
 */
export function generateCanvaThumbnail(title: string): string {
  const safeTitle = (title || 'Canva Presentation').trim();
  const cached = canvaThumbnailCache.get(safeTitle);
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
    <linearGradient id="cbg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#083344"/>
      <stop offset="50%" stop-color="#155e75"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>
  </defs>
  <rect width="960" height="540" fill="url(#cbg)"/>
  <rect x="40" y="40" width="880" height="460" rx="10" fill="none" stroke="#67e8f9" stroke-width="3" opacity="0.5"/>
  <text x="480" y="245" font-family="-apple-system, sans-serif" font-size="30" font-weight="700" fill="#cffafe" text-anchor="middle">${escapedTitle}</text>
  <text x="480" y="290" font-family="-apple-system, sans-serif" font-size="20" fill="#67e8f9" text-anchor="middle">Canva Design</text>
</svg>`.trim();

  const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  canvaThumbnailCache.set(safeTitle, dataUrl);
  return dataUrl;
}