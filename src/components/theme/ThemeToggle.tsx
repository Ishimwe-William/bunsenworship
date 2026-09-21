import React from 'react';
import { useTheme } from './useTheme';
import { ThemeMode } from '../../store/features/theme';
import './ThemeToggle.css';

// Crisp inline SVGs for zero extra icon package dependencies
const SunIcon: React.FC = () => (
  <svg className="theme-icon" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon: React.FC = () => (
  <svg className="theme-icon" viewBox="0 0 24 24">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const SystemIcon: React.FC = () => (
  <svg className="theme-icon" viewBox="0 0 24 24">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

export interface ThemeToggleProps {
  /** 'segmented' renders 3 pill buttons (Light/Dark/System), 'compact' renders a single toggle button */
  variant?: 'segmented' | 'compact';
  className?: string;
}

/**
 * A modular, accessible Theme Toggle component hooked into Redux.
 */
export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'segmented',
  className = '',
}) => {
  const { mode, effectiveTheme, setMode, toggleTheme } = useTheme();

  if (variant === 'compact') {
    return (
      <button
        type="button"
        className={`theme-toggle-compact ${className}`}
        onClick={toggleTheme}
        title={`Current: ${mode} (${effectiveTheme} active). Click to cycle theme.`}
        aria-label="Toggle color theme"
      >
        {effectiveTheme === 'dark' ? <MoonIcon /> : <SunIcon />}
      </button>
    );
  }

  const options: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'light', label: 'Light', icon: <SunIcon /> },
    { mode: 'dark', label: 'Dark', icon: <MoonIcon /> },
    { mode: 'system', label: 'System', icon: <SystemIcon /> },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Theme selector"
      className={`theme-toggle-segmented ${className}`}
    >
      {options.map((opt) => {
        const isActive = mode === opt.mode;
        return (
          <button
            key={opt.mode}
            type="button"
            role="radio"
            aria-checked={isActive}
            className={`theme-toggle-option ${isActive ? 'active' : ''}`}
            onClick={() => setMode(opt.mode)}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};
