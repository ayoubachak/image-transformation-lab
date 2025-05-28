import React, { useState } from 'react';
import type { TransformationParameter, MatrixValue } from '../../utils/types';

interface MatrixParameterControlProps {
  parameter: TransformationParameter;
  onChange: (name: string, value: any) => void;
  themeColor: {
    accentColor: string;
    accentLight: string;
    textAccent: string;
  };
  disabled?: boolean;
}

export default function MatrixParameterControl({
  parameter,
  onChange,
  themeColor,
  disabled = false
}: MatrixParameterControlProps) {
  const matrixValue = parameter.value as MatrixValue;
  const [editingMatrix, setEditingMatrix] = useState<MatrixValue>(matrixValue);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const handleCellChange = (rowIdx: number, colIdx: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newMatrix = { ...editingMatrix };
    newMatrix.values[rowIdx][colIdx] = numValue;
    
    setEditingMatrix(newMatrix);
    onChange(parameter.name, newMatrix);
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
          <div className="mb-2 text-xs text-gray-500">
            {matrixValue.width}×{matrixValue.height} Matrix
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <tbody className="bg-white divide-y divide-gray-200">
                {editingMatrix.values.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {row.map((cell, colIdx) => (
                      <td key={`${rowIdx}-${colIdx}`} className="px-1 py-1">
                        <input
                          type="number"
                          value={cell}
                          onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                          className="w-12 p-1 text-xs text-center border border-gray-300 rounded-sm"
                          disabled={disabled}
                          step="any"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div 
          className="p-2 border border-gray-200 rounded-md bg-gray-50 text-xs cursor-pointer"
          onClick={() => setIsExpanded(true)}
        >
          <div className="text-center text-gray-500">
            {matrixValue.width}×{matrixValue.height} Matrix (click to edit)
          </div>
        </div>
      )}
      
      {parameter.description && (
        <p className="mt-1 text-xs text-gray-500">{parameter.description}</p>
      )}
    </div>
  );
} 