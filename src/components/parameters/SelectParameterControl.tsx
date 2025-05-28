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
    <select
      value={value}
      onChange={handleChange}
      className={`w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:${themeColor.textAccent} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      disabled={disabled}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
} 