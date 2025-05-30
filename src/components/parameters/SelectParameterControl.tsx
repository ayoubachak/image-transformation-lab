import React from 'react';
import type { TransformationParameter } from '../../utils/types';

interface SelectParameterControlProps {
  parameter: TransformationParameter;
  onChange: (name: string, value: any) => void;
  themeColor: {
    accentColor: string;
    accentLight: string;
    textAccent: string;
  };
  disabled?: boolean;
}

export default function SelectParameterControl({
  parameter,
  onChange,
  themeColor,
  disabled = false
}: SelectParameterControlProps) {
  const value = parameter.value as string;
  const options = parameter.options || [];
  
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(parameter.name, e.target.value);
  };
  
  return (
    <div className="mb-2">
      <select
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className="w-full p-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-100"
      >
        {options.map(option => (
          <option key={option} value={option} className="text-gray-900 bg-white">
            {typeof option === 'string' 
              ? option.charAt(0).toUpperCase() + option.slice(1) 
              : option}
          </option>
        ))}
      </select>
    </div>
  );
} 