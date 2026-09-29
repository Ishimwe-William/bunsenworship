export interface PptxTextRun {
  text: string;
  fontSize?: number; // in points (e.g. 24, 36)
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string; // Hex color e.g. '#ffffff'
}

export interface PptxParagraph {
  align?: 'left' | 'center' | 'right' | 'justify';
  runs: PptxTextRun[];
}

export interface PptxSlideElement {
  id: string;
  type: 'text' | 'shape' | 'image';
  bounds: {
    leftPct: number;
    topPct: number;
    widthPct: number;
    heightPct: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
  shape?: {
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    shapeType?: string;
    borderRadius?: number;
  };
  paragraphs?: PptxParagraph[];
  text?: string;
  imageDataUrl?: string;
}

export interface PptxSlideData {
  id: string;
  sldId?: string;
  slideIndex: number;
  title: string;
  width: number;
  height: number;
  aspectRatio: number;
  background?: {
    color?: string;
    gradient?: string;
    imageDataUrl?: string;
  };
  elements: PptxSlideElement[];
  lines: string[];
  html: string;
  svg?: string;
  thumbnailDataUrl?: string;
  exportStatus?: 'ready' | 'updating' | 'error';
}

export interface PptxParseResult {
  ok: boolean;
  title?: string;
  slideCount?: number;
  slides?: PptxSlideData[];
  filePath?: string;
  width?: number;
  height?: number;
  images?: string[]; // Backwards compatibility with previous image array consumers
  error?: string;
}

export interface SlidePatch {
  sldId: string;
  slideIndex: number;
  status: 'unchanged' | 'changed' | 'added' | 'removed' | 'reordered';
  slide?: PptxSlideData;
}

export interface PresentationSyncPayload {
  filePath: string;
  title: string;
  slideCount: number;
  slides: PptxSlideData[];
  timestamp: number;
  isIncremental?: boolean;
  patches?: SlidePatch[];
  orderedSldIds?: string[];
}
