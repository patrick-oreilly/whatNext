// Reusable Input component

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  helperText?: string;
  fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  fullWidth = false,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`;
  const widthClass = fullWidth ? 'w-full' : '';
  const errorClass = error ? 'border-red-600 focus:ring-red-500 border-4' : 'border-accent-black focus:ring-primary-500 border-4';

  return (
    <div className={`${widthClass} ${className}`}>
      {label && (
        <label htmlFor={inputId} className="block text-base font-black text-accent-black mb-2 uppercase tracking-wide">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`block w-full px-4 py-3 rounded-lg focus:ring-4 focus:outline-none transition-all bg-accent-white text-accent-black font-bold placeholder:text-gray-400 ${errorClass}`}
        {...props}
      />
      {error && (
        <p className="mt-2 text-sm font-bold text-red-600 uppercase">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-2 text-sm font-semibold text-accent-black">{helperText}</p>
      )}
    </div>
  );
};
