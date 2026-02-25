import React, { useState, useRef } from 'react';
import { isValidSHA256, validateSHA256 } from '../utils/validation';

interface ManifestAttachmentProps {
  onHashSubmit: (hash: string) => void;
  className?: string;
  label?: string;
}

export const ManifestAttachment: React.FC<ManifestAttachmentProps> = ({
  onHashSubmit,
  className = '',
  label = 'Manifest Hash Attachment'
}) => {
  const [hashInput, setHashInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleHashChange = (value: string) => {
    setHashInput(value);
    
    if (value === '') {
      setError(null);
      setIsValid(false);
    } else {
      const validationError = validateSHA256(value);
      setError(validationError);
      setIsValid(!validationError);
    }
  };

  const handleSubmit = () => {
    if (isValidSHA256(hashInput)) {
      onHashSubmit(hashInput);
      // Reset form
      setHashInput('');
      setError(null);
      setIsValid(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // In a real implementation, you would compute the SHA256 hash of the file
      // For now, we'll simulate with a placeholder
      const simulatedHash = 'a'.repeat(64); // Placeholder hash
      handleHashChange(simulatedHash);
    }
  };

  return (
    <div className={`space-y-4 p-4 border rounded-lg ${className}`}>
      <h3 className="text-lg font-medium text-gray-900">{label}</h3>
      
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          SHA256 Hash
        </label>
        <input
          type="text"
          value={hashInput}
          onChange={(e) => handleHashChange(e.target.value)}
          placeholder="Enter or upload SHA256 hash..."
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

      <div className="flex space-x-2">
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className={`px-4 py-2 rounded-md text-white font-medium ${
            isValid
              ? 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          Submit Hash
        </button>
        
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 font-medium"
        >
          Upload File
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        className="hidden"
        accept="*/*"
      />

      <div className="text-xs text-gray-500">
        <p>• Enter a 64-character hexadecimal SHA256 hash</p>
        <p>• Upload a file to auto-generate hash (simulated)</p>
        <p>• Hash will be validated before submission</p>
      </div>
    </div>
  );
};
