import React from 'react';

interface FormGroupProps {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}

export const FormGroup: React.FC<FormGroupProps> = ({
  label,
  children,
  required = false,
  hint,
}) => {
  return (
    <div className="form-group">
      <label className="form-label">
        {label}
        {required && <span className="form-required">*</span>}
      </label>
      {children}
      {hint && <p className="form-hint">{hint}</p>}
    </div>
  );
};

interface SourceTypeToggleProps {
  sourceType: 'file' | 'youtube' | 'url';
  onSourceTypeChange: (type: 'file' | 'youtube' | 'url') => void;
  options: { value: 'file' | 'youtube' | 'url'; label: string }[];
}

export const SourceTypeToggle: React.FC<SourceTypeToggleProps> = ({
  sourceType,
  onSourceTypeChange,
  options,
}) => {
  return (
    <div className="source-type-toggle">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`source-type-btn ${sourceType === option.value ? 'active' : ''}`}
          onClick={() => onSourceTypeChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

interface FileInputProps {
  value: string;
  onChange: (value: string) => void;
  accept?: string;
  placeholder?: string;
  label?: string;
}

export const FileInput: React.FC<FileInputProps> = ({
  value,
  onChange,
  accept,
  placeholder = 'Select file or paste file path...',
  label = 'Browse...',
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      let resolvedPath: string | undefined;
      if (window.electronAPI?.getPathForFile) {
        try {
          resolvedPath = window.electronAPI.getPathForFile(file);
        } catch {
          // ignore
        }
      }
      const path = resolvedPath || (file as unknown as { path?: string }).path || file.name;
      onChange(path);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <input
        type="text"
        className="form-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ flex: 1 }}
        readOnly
      />
      <input
        type="file"
        ref={inputRef}
        accept={accept}
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      <button
        type="button"
        className="btn-secondary"
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </button>
    </div>
  );
};