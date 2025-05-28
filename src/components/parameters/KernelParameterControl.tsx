import React, { useState } from 'react';
import type { TransformationParameter, KernelValue } from '../../utils/types';

interface KernelParameterControlProps {
  parameter: TransformationParameter;
  onChange: (name: string, value: any) => void;
  themeColor: {
    accentColor: string;
    accentLight: string;
    textAccent: string;
  };
  disabled?: boolean;
}

export default function KernelParameterControl({
  parameter,
  onChange,
  themeColor,
  disabled = false
}: KernelParameterControlProps) {
  const kernelValue = parameter.value as KernelValue;
  const [showResizeControls, setShowResizeControls] = useState(false);
  const [newDimensions, setNewDimensions] = useState({ width: kernelValue.width, height: kernelValue.height });

  // Handle cell value change
  const handleCellChange = (rowIdx: number, colIdx: number, value: string) => {
    if (disabled) return;
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    
    const newValues = [...kernelValue.values];
    newValues[rowIdx][colIdx] = numValue;
    
    onChange(parameter.name, {
      ...kernelValue,
      values: newValues
    });
  };

  // Handle kernel normalization toggle
  const handleNormalizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    
    onChange(parameter.name, {
      ...kernelValue,
      normalize: e.target.checked
    });
  };

  // Handle dimension changes
  const handleDimensionChange = (dimension: 'width' | 'height', value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 1 || numValue > 15) return;
    
    setNewDimensions({
      ...newDimensions,
      [dimension]: numValue
    });
  };

  // Apply new dimensions to the kernel
  const applyNewDimensions = () => {
    if (disabled) return;
    
    // Must be odd numbers for convolution kernels
    const width = newDimensions.width % 2 === 0 ? newDimensions.width + 1 : newDimensions.width;
    const height = newDimensions.height % 2 === 0 ? newDimensions.height + 1 : newDimensions.height;
    
    // Create new values array filled with zeros
    const newValues: number[][] = Array(height)
      .fill(0)
      .map(() => Array(width).fill(0));
    
    // Copy existing values where possible
    for (let r = 0; r < Math.min(height, kernelValue.values.length); r++) {
      for (let c = 0; c < Math.min(width, kernelValue.values[r].length); c++) {
        newValues[r][c] = kernelValue.values[r][c];
      }
    }
    
    // Set center to 1 if new kernel is empty
    if (width > 0 && height > 0 && newValues.every(row => row.every(cell => cell === 0))) {
      const centerRow = Math.floor(height / 2);
      const centerCol = Math.floor(width / 2);
      newValues[centerRow][centerCol] = 1;
    }
    
    onChange(parameter.name, {
      ...kernelValue,
      width,
      height,
      values: newValues
    });
    
    setShowResizeControls(false);
  };

  // Apply common kernel presets
  const applyPreset = (preset: string) => {
    if (disabled) return;
    
    let newKernel: KernelValue;
    
    switch (preset) {
      case 'box3x3':
        newKernel = {
          width: 3,
          height: 3,
          values: [
            [1/9, 1/9, 1/9],
            [1/9, 1/9, 1/9],
            [1/9, 1/9, 1/9]
          ],
          normalize: false
        };
        break;
      case 'box5x5':
        newKernel = {
          width: 5,
          height: 5,
          values: Array(5).fill(0).map(() => Array(5).fill(1/25)),
          normalize: false
        };
        break;
      case 'gaussian3x3':
        newKernel = {
          width: 3,
          height: 3,
          values: [
            [1/16, 2/16, 1/16],
            [2/16, 4/16, 2/16],
            [1/16, 2/16, 1/16]
          ],
          normalize: false
        };
        break;
      case 'gaussian5x5':
        newKernel = {
          width: 5,
          height: 5,
          values: [
            [1/256, 4/256, 6/256, 4/256, 1/256],
            [4/256, 16/256, 24/256, 16/256, 4/256],
            [6/256, 24/256, 36/256, 24/256, 6/256],
            [4/256, 16/256, 24/256, 16/256, 4/256],
            [1/256, 4/256, 6/256, 4/256, 1/256]
          ],
          normalize: false
        };
        break;
      case 'sharpen':
        newKernel = {
          width: 3,
          height: 3,
          values: [
            [0, -1, 0],
            [-1, 5, -1],
            [0, -1, 0]
          ],
          normalize: false
        };
        break;
      case 'edgeDetect':
        newKernel = {
          width: 3,
          height: 3,
          values: [
            [-1, -1, -1],
            [-1, 8, -1],
            [-1, -1, -1]
          ],
          normalize: false
        };
        break;
      case 'identity':
      default:
        newKernel = {
          width: 3,
          height: 3,
          values: [
            [0, 0, 0],
            [0, 1, 0],
            [0, 0, 0]
          ],
          normalize: false
        };
        break;
    }
    
    onChange(parameter.name, newKernel);
  };

  // Get sum of all values in kernel (for normalization preview)
  const getKernelSum = () => {
    return kernelValue.values.reduce(
      (sum, row) => sum + row.reduce((rowSum, cell) => rowSum + cell, 0),
      0
    );
  };

  return (
    <div className="space-y-3">
      {/* Matrix editor */}
      <div className={`${themeColor.accentLight} bg-opacity-50 p-2 rounded overflow-auto max-w-full`}>
        <table className="min-w-full border-collapse">
          <tbody>
            {kernelValue.values.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {row.map((cell, colIdx) => (
                  <td key={colIdx} className="p-1">
                    <input
                      type="text"
                      value={cell}
                      onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                      className="w-12 h-8 p-1 text-center border border-gray-300 rounded-sm text-xs"
                      disabled={disabled}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShowResizeControls(!showResizeControls)}
          className={`px-2 py-1 text-xs rounded border ${
            themeColor.textAccent
          } border-current`}
          disabled={disabled}
        >
          Resize
        </button>
        
        <select
          onChange={(e) => applyPreset(e.target.value)}
          className="px-2 py-1 text-xs rounded border border-gray-300"
          value=""
          disabled={disabled}
        >
          <option value="" disabled>
            Apply Preset
          </option>
          <option value="identity">Identity</option>
          <option value="box3x3">Box Blur 3×3</option>
          <option value="box5x5">Box Blur 5×5</option>
          <option value="gaussian3x3">Gaussian 3×3</option>
          <option value="gaussian5x5">Gaussian 5×5</option>
          <option value="sharpen">Sharpen</option>
          <option value="edgeDetect">Edge Detect</option>
        </select>
        
        {/* Normalization */}
        <label className="flex items-center text-xs">
          <input
            type="checkbox"
            checked={kernelValue.normalize || false}
            onChange={handleNormalizeChange}
            className="mr-1"
            disabled={disabled}
          />
          Normalize
          {kernelValue.normalize && (
            <span className="ml-1 text-gray-500">
              (Sum: {getKernelSum().toFixed(2)})
            </span>
          )}
        </label>
      </div>
      
      {/* Resize controls */}
      {showResizeControls && (
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center">
            <label className="text-xs mr-1">Width:</label>
            <input
              type="number"
              min="1"
              max="15"
              step="2"
              value={newDimensions.width}
              onChange={(e) => handleDimensionChange('width', e.target.value)}
              className="w-12 h-7 p-1 text-center border border-gray-300 rounded-sm text-xs"
              disabled={disabled}
            />
          </div>
          
          <div className="flex items-center">
            <label className="text-xs mr-1">Height:</label>
            <input
              type="number"
              min="1"
              max="15"
              step="2"
              value={newDimensions.height}
              onChange={(e) => handleDimensionChange('height', e.target.value)}
              className="w-12 h-7 p-1 text-center border border-gray-300 rounded-sm text-xs"
              disabled={disabled}
            />
          </div>
          
          <button
            type="button"
            onClick={applyNewDimensions}
            className="px-2 py-1 text-xs bg-blue-500 text-white rounded"
            disabled={disabled}
          >
            Apply
          </button>
          
          <button
            type="button"
            onClick={() => setShowResizeControls(false)}
            className="px-2 py-1 text-xs border border-gray-300 rounded"
            disabled={disabled}
          >
            Cancel
          </button>
        </div>
      )}
      
      <div className="text-xs text-gray-500 mt-1">
        <p>Convolution kernels work best with odd dimensions.</p>
        {!kernelValue.normalize && getKernelSum() !== 1 && getKernelSum() !== 0 && (
          <p className="text-amber-600 mt-1">
            Warning: Kernel sum is {getKernelSum().toFixed(2)}, which may cause brightness changes.
            Consider normalizing the kernel.
          </p>
        )}
      </div>
    </div>
  );
} 