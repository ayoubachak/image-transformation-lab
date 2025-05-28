import React from 'react';
import type { TransformationParameter, PointValue } from '../../utils/types';

interface PointParameterControlProps {
  parameter: TransformationParameter;
  onChange: (name: string, value: any) => void;
  themeColor: {
    accentColor: string;
    accentLight: string;
    textAccent: string;
  };
  disabled?: boolean;
}

export default function PointParameterControl({
  parameter,
  onChange,
  themeColor,
  disabled = false
}: PointParameterControlProps) {
  const pointValue = parameter.value as PointValue;
  
  const handleXChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newX = parseFloat(e.target.value);
    onChange(parameter.name, {
      ...pointValue,
      x: newX
    });
  };
  
  const handleYChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newY = parseFloat(e.target.value);
    onChange(parameter.name, {
      ...pointValue,
      y: newY
    });
  };
  
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <label className="text-xs font-medium text-gray-700">
          {parameter.label || parameter.name}
        </label>
        <div className="text-xs text-gray-500">
          ({pointValue.x}, {pointValue.y})
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">X</label>
          <input
            type="number"
            value={pointValue.x}
            onChange={handleXChange}
            disabled={disabled}
            className="w-full p-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            step={parameter.step || 1}
            min={parameter.min}
            max={parameter.max}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Y</label>
          <input
            type="number"
            value={pointValue.y}
            onChange={handleYChange}
            disabled={disabled}
            className="w-full p-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            step={parameter.step || 1}
            min={parameter.min}
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