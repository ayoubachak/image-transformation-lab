import React from 'react';
import type { TransformationParameter, RangeValue } from '../../utils/types';

interface RangeParameterControlProps {
  parameter: TransformationParameter;
  onChange: (name: string, value: any) => void;
  themeColor: {
    accentColor: string;
    accentLight: string;
    textAccent: string;
  };
  disabled?: boolean;
}

export default function RangeParameterControl({
  parameter,
  onChange,
  themeColor,
  disabled = false
}: RangeParameterControlProps) {
  const rangeValue = parameter.value as RangeValue;
  
  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = parseFloat(e.target.value);
    onChange(parameter.name, {
      ...rangeValue,
      min: newMin
    });
  };
  
  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = parseFloat(e.target.value);
    onChange(parameter.name, {
      ...rangeValue,
      max: newMax
    });
  };
  
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <label className="text-xs font-medium text-gray-700">
          {parameter.label || parameter.name}
        </label>
        <div className="text-xs text-gray-500">
          {rangeValue.min} — {rangeValue.max}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Min</label>
          <input
            type="number"
            value={rangeValue.min}
            onChange={handleMinChange}
            disabled={disabled}
            className="w-full p-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            step={parameter.step || 1}
            min={parameter.min}
            max={rangeValue.max}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Max</label>
          <input
            type="number"
            value={rangeValue.max}
            onChange={handleMaxChange}
            disabled={disabled}
            className="w-full p-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            step={parameter.step || 1}
            min={rangeValue.min}
            max={parameter.max}
          />
        </div>
      </div>
      
      {parameter.description && (
        <p className="mt-1 text-xs text-gray-500">{parameter.description}</p>
      )}
    </div>
  );
} 