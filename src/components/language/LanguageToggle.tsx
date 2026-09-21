import React from 'react';
import { useLanguage } from './useLanguage';
import { LanguageCode } from '../../store/features/language';
import './LanguageToggle.css';

const GlobeIcon: React.FC = () => (
  <svg className="language-icon" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

export interface LanguageToggleProps {
  variant?: 'segmented' | 'compact';
  className?: string;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({
  variant = 'segmented',
  className = '',
}) => {
  const { language, setLang, toggleLang } = useLanguage();

  if (variant === 'compact') {
    return (
      <button
        type="button"
        className={`language-toggle-compact ${className}`}
        onClick={toggleLang}
        title={`Current: ${language.toUpperCase()}. Click to switch language (EN / RW).`}
        aria-label="Toggle language"
      >
        <GlobeIcon />
        <span>{language.toUpperCase()}</span>
      </button>
    );
  }

  const options: { code: LanguageCode; label: string; tooltip: string }[] = [
    { code: 'en', label: 'EN', tooltip: 'English' },
    { code: 'rw', label: 'RW', tooltip: 'Ikinyarwanda' },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Language selector"
      className={`language-toggle-segmented ${className}`}
    >
      <span style={{ padding: '0 4px', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
        <GlobeIcon />
      </span>
      {options.map((opt) => {
        const isActive = language === opt.code;
        return (
          <button
            key={opt.code}
            type="button"
            role="radio"
            aria-checked={isActive}
            className={`language-toggle-option ${isActive ? 'active' : ''}`}
            onClick={() => setLang(opt.code)}
            title={opt.tooltip}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};
