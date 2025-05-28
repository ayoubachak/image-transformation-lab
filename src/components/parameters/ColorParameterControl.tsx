import React, { useState } from 'react';
import type { TransformationParameter } from '../../utils/types';

interface ColorParameterControlProps {
  parameter: TransformationParameter;
  onChange: (name: string, value: any) => void;
  themeColor: {
    accentColor: string;
    accentLight: string;
    textAccent: string;
  };
  disabled?: boolean;
}

export default function ColorParameterControl({
  parameter,
  onChange,
  themeColor,
  disabled = false
}: ColorParameterControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const colorValue = parameter.value as string;
  
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parameter.name, e.target.value);
  };

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <label className="text-xs font-medium text-gray-700">
          {parameter.label || parameter.name}
        </label>
        <div className="flex items-center">
          <div 
            className="w-6 h-6 rounded-md border border-gray-300 mr-2" 
            style={{ backgroundColor: colorValue }}
          />
          <span className="text-xs text-gray-500">{colorValue}</span>
        </div>
      </div>
      
      <div className="relative">
        <input
          type="color"
          value={colorValue}
          onChange={handleColorChange}
          disabled={disabled}
          className="w-full h-8 p-0 rounded-md cursor-pointer"
        />
      </div>
      
      {parameter.description && (
        <p className="mt-1 text-xs text-gray-500">{parameter.description}</p>
      )}
    </div>
  );
} 