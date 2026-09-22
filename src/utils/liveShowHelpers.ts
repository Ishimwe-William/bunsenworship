import { Slide, RundownItem, TransitionType } from '../store/features/presentation/types';

export const getNextSlideIndex = (slides: Slide[], currentIndex: number): number => {
  if (currentIndex < 0 || currentIndex >= slides.length - 1) {
    return -1; // No next slide
  }
  return currentIndex + 1;
};

export const getPreviousSlideIndex = (slides: Slide[], currentIndex: number): number => {
  if (currentIndex <= 0) {
    return -1; // No previous slide
  }
  return currentIndex - 1;
};

export const getNextRundownIndex = (rundown: RundownItem[], currentIndex: number): number => {
  if (currentIndex < 0 || currentIndex >= rundown.length - 1) {
    return -1; // No next item
  }
  return currentIndex + 1;
};

export const getPreviousRundownIndex = (rundown: RundownItem[], currentIndex: number): number => {
  if (currentIndex <= 0) {
    return -1; // No previous item
  }
  return currentIndex - 1;
};

export const findSlideById = (slides: Slide[], slideId: string): Slide | null => {
  return slides.find(slide => slide.id === slideId) || null;
};

export const findRundownItemById = (rundown: RundownItem[], itemId: string): RundownItem | null => {
  return rundown.find(item => item.id === itemId) || null;
};

export const createNewSlide = (section: string = 'New Slide', lines: string[] = ['New content']): Slide => {
  return {
    id: `s-${Date.now()}`,
    section,
    lines,
  };
};

export const createNewRundownItem = (
  title: string,
  type: RundownItem['type'],
  time: string = '09:30'
): Omit<RundownItem, 'id'> => {
  return {
    title,
    subtitle: 'Custom item',
    time,
    type,
    slides: [createNewSlide(type === 'PPT' ? 'Slide 1' : type === 'CANVA' ? 'Page 1' : 'Verse 1')],
  };
};

export const duplicateSlide = (slide: Slide): Slide => {
  return {
    ...slide,
    id: `s-${Date.now()}`,
    section: `${slide.section} (Copy)`,
  };
};

export const formatTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  }
  return `${mins}m`;
};

export const parseTimeToMinutes = (timeString: string): number => {
  const parts = timeString.split(':');
  if (parts.length === 2) {
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    return hours * 60 + minutes;
  }
  return parseInt(timeString, 10) || 0;
};

export const isSlideEmpty = (slide: Slide): boolean => {
  return !slide.lines || slide.lines.length === 0 || slide.lines.every(line => !line.trim());
};

export const filterEmptySlides = (slides: Slide[]): Slide[] => {
  return slides.filter(slide => !isSlideEmpty(slide));
};

export const mergeAdjacentSlides = (slides: Slide[]): Slide[] => {
  if (slides.length === 0) return [];
  
  const merged: Slide[] = [slides[0]];
  
  for (let i = 1; i < slides.length; i++) {
    const current = slides[i];
    const previous = merged[merged.length - 1];
    
    if (current.section === previous.section) {
      // Merge lines
      previous.lines = [...previous.lines, ...current.lines];
    } else {
      merged.push(current);
    }
  }
  
  return merged;
};

export const calculateTransitionDuration = (type: TransitionType, customDuration?: number): number => {
  if (type === 'CUT') return 0;
  return customDuration || 1.0;
};

export const generateThumbnailFromSlide = (slide: Slide): string => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" width="960" height="540">
      <rect width="960" height="540" fill="#1e293b"/>
      <text x="480" y="240" font-family="-apple-system, sans-serif" font-size="32" font-weight="700" fill="#ffffff" text-anchor="middle">${slide.section}</text>
      <text x="480" y="290" font-family="-apple-system, sans-serif" font-size="18" fill="#cbd5e1" text-anchor="middle">${slide.lines.slice(0, 2).join(' / ')}</text>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
};

export const validateSlideContent = (slide: Slide): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!slide.section || slide.section.trim() === '') {
    errors.push('Slide section is required');
  }
  
  if (!slide.lines || slide.lines.length === 0) {
    errors.push('Slide must have at least one line');
  }
  
  if (slide.lines.some(line => line.length > 200)) {
    errors.push('Some lines are too long (max 200 characters)');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};