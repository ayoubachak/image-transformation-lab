import React, { useState } from 'react';
import type { TransformationParameter, VectorValue } from '../../utils/types';

interface VectorParameterControlProps {
  parameter: TransformationParameter;
  onChange: (name: string, value: any) => void;
  themeColor: {
    accentColor: string;
    accentLight: string;
    textAccent: string;
  };
  disabled?: boolean;
}

export default function VectorParameterControl({
  parameter,
  onChange,
  themeColor,
  disabled = false
}: VectorParameterControlProps) {
  const vectorValue = parameter.value as VectorValue;
  const [isExpanded, setIsExpanded] = useState(false);
  
  const handleValueChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newValues = [...vectorValue.values];
    newValues[index] = numValue;
    
    onChange(parameter.name, {
      values: newValues
    });
  };
  
  const addElement = () => {
    const newValues = [...vectorValue.values, 0];
    onChange(parameter.name, {
      values: newValues
    });
  };
  
  const removeElement = (index: number) => {
    const newValues = [...vectorValue.values];
    newValues.splice(index, 1);
    onChange(parameter.name, {
      values: newValues
    });
  };

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <label className="text-xs font-medium text-gray-700">
          {parameter.label || parameter.name}
        </label>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className={`text-xs ${themeColor.textAccent} hover:underline`}
          disabled={disabled}
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>
      
      {isExpanded ? (
        <div className="mt-2 p-2 border rounded-md border-gray-200 bg-gray-50">
          <div className="mb-2 text-xs text-gray-500 flex justify-between items-center">
            <span>Vector ({vectorValue.values.length} elements)</span>
            <button
              type="button"
              onClick={addElement}
              disabled={disabled}
              className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
            >
              + Add
            </button>
          </div>
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {vectorValue.values.map((value, index) => (
              <div key={index} className="flex items-center">
                <span className="text-xs text-gray-500 w-6">{index}:</span>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => handleValueChange(index, e.target.value)}
                  className="w-full p-1.5 text-xs border border-gray-300 rounded-md"
                  disabled={disabled}
                  step="any"
                />
                <button
                  type="button"
                  onClick={() => removeElement(index)}
                  disabled={disabled || vectorValue.values.length <= 1}
                  className="ml-2 text-red-500 hover:text-red-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div 
          className="p-2 border border-gray-200 rounded-md bg-gray-50 text-xs cursor-pointer"
          onClick={() => setIsExpanded(true)}
        >
          <div className="text-center text-gray-500">
            Vector with {vectorValue.values.length} elements (click to edit)
          </div>
        </div>
      )}
      
      {parameter.description && (
        <p className="mt-1 text-xs text-gray-500">{parameter.description}</p>
      )}
    </div>
  );
} 