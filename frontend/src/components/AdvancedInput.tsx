import React, { useState, ChangeEvent } from 'react';
import { isValidSHA256, validateSHA256 } from '../utils/validation';

interface AdvancedInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
}

export const AdvancedInput: React.FC<AdvancedInputProps> = ({
  value,
  onChange,
  placeholder = 'Enter SHA256 hash...',
  className = '',
  label = 'SHA256 Hash'
}) => {
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // Validate the input
    if (newValue === '') {
      setError(null); // Clear error for empty input
    } else {
      const validationError = validateSHA256(newValue);
      setError(validationError);
    }
  };

  const isValid = value && isValidSHA256(value);

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          error
            ? 'border-red-500'
            : isValid
            ? 'border-green-500'
            : 'border-gray-300'
        }`}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {isValid && (
        <p className="text-sm text-green-600">✓ Valid SHA256 hash</p>
      )}
    </div>
  );
};
