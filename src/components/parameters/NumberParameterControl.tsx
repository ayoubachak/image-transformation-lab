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
    const inputValue = e.target.value.trim();
    if (inputValue === '') return;
    
    const numValue = Number(inputValue);
    if (isNaN(numValue)) return;
    
    // Clamp value to min/max
    const clampedValue = Math.min(Math.max(numValue, min), max);
    onChange(parameter.name, clampedValue);
  };
  
  // Calculate percentage for background gradient
  const percentage = ((value - min) / (max - min)) * 100;
  
  return (
    <div>
      <div className="flex justify-between items-center">
        <div className="flex-grow mr-2">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleSliderChange}
            className="w-full h-2 appearance-none rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-gray-300 [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-gray-200"
            style={{
              background: `linear-gradient(to right, ${themeColor.accentColor}, ${themeColor.accentColor} ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb)`
            }}
            disabled={disabled}
          />
        </div>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleInputChange}
          className="w-16 p-1 text-right border border-gray-300 rounded-md text-sm"
          disabled={disabled}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
} 