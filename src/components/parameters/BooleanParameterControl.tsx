import React from 'react';
import type { TransformationParameter } from '../../utils/types';

interface BooleanParameterControlProps {
  parameter: TransformationParameter;
  onChange: (name: string, value: any) => void;
  themeColor: {
    accentColor: string;
    accentLight: string;
    textAccent: string;
  };
  disabled?: boolean;
}

export default function BooleanParameterControl({
  parameter,
  onChange,
  themeColor,
  disabled = false
}: BooleanParameterControlProps) {
  const value = parameter.value as boolean;
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parameter.name, e.target.checked);
  };
  
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <input
          type="checkbox"
          id={`toggle-${parameter.name}`}
          checked={value}
          onChange={handleChange}
          className="sr-only"
          disabled={disabled}
        />
        <label
          htmlFor={`toggle-${parameter.name}`}
          className={`relative inline-block w-10 h-6 rounded-full cursor-pointer transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{ backgroundColor: value ? themeColor.accentColor : '#cbd5e1' }}
        >
          <span
            className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform ${
              value ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </label>
      </div>
      <span className="text-sm text-gray-600">{value ? 'On' : 'Off'}</span>
    </div>
  );
} 