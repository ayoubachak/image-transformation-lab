import React from 'react';
import type { TransformationParameter } from '../../utils/types';

interface NumberParameterControlProps {
  parameter: TransformationParameter;
  onChange: (name: string, value: any) => void;
  themeColor: {
    accentColor: string;
    accentLight: string;
    textAccent: string;
  };
  disabled?: boolean;
}

export default function NumberParameterControl({
  parameter,
  onChange,
  themeColor,
  disabled = false
}: NumberParameterControlProps) {
  const value = parameter.value as number;
  const min = parameter.min ?? 0;
  const max = parameter.max ?? 100;
  const step = parameter.step ?? 1;
  
  // Handle slider change
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parameter.name, Number(e.target.value));
  };
  
  // Handle direct input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    if (!isNaN(newValue)) {
      onChange(parameter.name, newValue);
    }
  };
  
  return (
    <div className="mb-2">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2 w-full">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleSliderChange}
            disabled={disabled}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-blue-300"
            style={{
              backgroundImage: `linear-gradient(to right, ${themeColor.accentColor} 0%, ${themeColor.accentColor} ${((value - min) / (max - min)) * 100}%, #e5e7eb ${((value - min) / (max - min)) * 100}%, #e5e7eb 100%)`
            }}
          />
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleInputChange}
            disabled={disabled}
            className="w-16 p-1 border border-gray-300 rounded-md text-sm text-center text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-100"
          />
        </div>
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
} 