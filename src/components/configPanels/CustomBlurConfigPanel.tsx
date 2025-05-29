import React, { useState, useEffect } from 'react';
import { ExclamationTriangleIcon, InformationCircleIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import type { Transformation, TransformationParameter, KernelValue } from '../../utils/types';
import KernelVisualizer from './KernelVisualizer';

interface CustomBlurConfigPanelProps {
  transformation: Transformation;
  parameters: TransformationParameter[];
  advancedParameters: Record<string, any>;
  onParameterChange: (name: string, value: any) => void;
  onAdvancedParamChange: (name: string, value: any) => void;
  renderParameterControl: (param: TransformationParameter) => React.ReactNode;
}

export default function CustomBlurConfigPanel({
  transformation,
  parameters,
  advancedParameters,
  onParameterChange,
  onAdvancedParamChange,
  renderParameterControl
}: CustomBlurConfigPanelProps) {
  // Find relevant parameters
  const kernelSizeParam = parameters.find(p => p.name === 'kernelSize');
  const customKernelParam = parameters.find(p => p.name === 'customKernel');
  
  // Local state for kernel editing
  const [kernelSize, setKernelSize] = useState({
    width: (customKernelParam?.value as KernelValue)?.width || 3,
    height: (customKernelParam?.value as KernelValue)?.height || 3
  });
  
  const [kernelValues, setKernelValues] = useState<number[][]>(() => {
    const kernel = customKernelParam?.value as KernelValue;
    return kernel?.values || [
      [1/9, 1/9, 1/9],
      [1/9, 1/9, 1/9],
      [1/9, 1/9, 1/9]
    ];
  });
  
  const [normalize, setNormalize] = useState(
    (customKernelParam?.value as KernelValue)?.normalize !== false
  );
  
  const [kernelSizeModified, setKernelSizeModified] = useState(false);
  
  // When custom kernel param changes, update local state
  useEffect(() => {
    if (customKernelParam) {
      const kernel = customKernelParam.value as KernelValue;
      if (kernel?.values) {
        setKernelValues(kernel.values);
        setKernelSize({
          width: kernel.width || 3,
          height: kernel.height || 3
        });
        setNormalize(kernel.normalize !== false);
      }
    }
  }, [customKernelParam]);
  
  // Handle kernel value changes
  const handleKernelValueChange = (row: number, col: number, value: number) => {
    const newValues = [...kernelValues];
    newValues[row][col] = value;
    setKernelValues(newValues);
    updateCustomKernel(newValues, kernelSize, normalize);
  };
  
  // Handle dimension changes
  const handleDimensionChange = (dimension: 'width' | 'height', value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 1 || numValue > 15) return;
    
    setKernelSizeModified(true);
    setKernelSize({
      ...kernelSize,
      [dimension]: numValue
    });
  };
  
  // Apply new kernel dimensions
  const applyKernelDimensions = () => {
    // Must be odd numbers for convolution kernels
    const width = kernelSize.width % 2 === 0 ? kernelSize.width + 1 : kernelSize.width;
    const height = kernelSize.height % 2 === 0 ? kernelSize.height + 1 : kernelSize.height;
    
    // Create new values array filled with zeros
    const newValues: number[][] = Array(height)
      .fill(0)
      .map(() => Array(width).fill(0));
    
    // Copy existing values where possible
    for (let r = 0; r < Math.min(height, kernelValues.length); r++) {
      for (let c = 0; c < Math.min(width, kernelValues[r].length); c++) {
        newValues[r][c] = kernelValues[r][c];
      }
    }
    
    // Set center to 1 if new kernel is empty - COMMENTED OUT DUE TO TYPE ERROR
    // if (width > 0 && height > 0 && newValues.every(row => row.every(cell => cell === 0))) {
    //   const centerRow = Math.floor(height / 2);
    //   const centerCol = Math.floor(width / 2);
    //   newValues[centerRow][centerCol] = 0.99; // Type error: TypeScript thinks this should be exactly 0
    // }
    
    setKernelValues(newValues);
    updateCustomKernel(newValues, { width, height }, !!normalize);
    setKernelSizeModified(false);
  };
  
  // Handle normalize change
  const handleNormalizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNormalize(e.target.checked);
    updateCustomKernel(kernelValues, kernelSize, e.target.checked);
  };
  
  // Update the custom kernel parameter
  const updateCustomKernel = (
    values: number[][],
    size: { width: number, height: number },
    shouldNormalize: boolean
  ) => {
    const kernelData: KernelValue = {
      width: size.width,
      height: size.height,
      values: values,
      normalize: shouldNormalize
    };
    
    onParameterChange('customKernel', kernelData);
    
    // Also set the kernel type to custom (in case it wasn't already)
    const kernelTypeParam = parameters.find(p => p.name === 'kernelType');
    if (kernelTypeParam && kernelTypeParam.value !== 'custom') {
      onParameterChange('kernelType', 'custom');
    }
  };
  
  // Apply preset kernels
  const applyPreset = (preset: string) => {
    let newValues: number[][];
    
    switch (preset) {
      case 'boxBlur':
        newValues = [
          [1/9, 1/9, 1/9],
          [1/9, 1/9, 1/9],
          [1/9, 1/9, 1/9]
        ];
        break;
      case 'gaussianBlur':
        newValues = [
          [1/16, 2/16, 1/16],
          [2/16, 4/16, 2/16],
          [1/16, 2/16, 1/16]
        ];
        break;
      case 'sharpen':
        newValues = [
          [0, -1, 0],
          [-1, 5, -1],
          [0, -1, 0]
        ];
        break;
      case 'edgeDetect':
        newValues = [
          [-1, -1, -1],
          [-1, 8, -1],
          [-1, -1, -1]
        ];
        break;
      case 'emboss':
        newValues = [
          [-2, -1, 0],
          [-1, 1, 1],
          [0, 1, 2]
        ];
        break;
      case 'motionBlur':
        newValues = [
          [1/9, 0, 0],
          [0, 1/9, 0],
          [0, 0, 1/9]
        ];
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            if (i === j) newValues[i][j] = 1/9;
          }
        }
        break;
      case 'unsharpMask':
        newValues = [
          [-1/256, -4/256, -6/256, -4/256, -1/256],
          [-4/256, -16/256, -24/256, -16/256, -4/256],
          [-6/256, -24/256, 476/256, -24/256, -6/256],
          [-4/256, -16/256, -24/256, -16/256, -4/256],
          [-1/256, -4/256, -6/256, -4/256, -1/256]
        ];
        break;
      case 'highPass':
        newValues = [
          [-1, -1, -1],
          [-1, 9, -1],
          [-1, -1, -1]
        ];
        break;
      default:
        newValues = [
          [0, 0, 0],
          [0, 1, 0],
          [0, 0, 0]
        ];
        break;
    }
    
    // Update kernel size to match the preset
    const width = newValues[0].length;
    const height = newValues.length;
    setKernelSize({ width, height });
    setKernelValues(newValues);
    updateCustomKernel(newValues, { width, height }, normalize);
  };
  
  // Calculate the sum of kernel values (for normalization)
  const getKernelSum = () => {
    return kernelValues.reduce(
      (sum, row) => sum + row.reduce((rowSum, cell) => rowSum + cell, 0),
      0
    );
  };
  
  // Normalize the kernel manually
  const normalizeKernel = () => {
    const sum = getKernelSum();
    if (sum === 0 || sum === 1) return; // No need to normalize
    
    const newValues = kernelValues.map(row => 
      row.map(value => value / sum)
    );
    
    setKernelValues(newValues);
    updateCustomKernel(newValues, kernelSize, normalize);
  };
  
  return (
    <div className="space-y-6">
      {/* Basic parameters section */}
      <div>
        <h3 className="text-lg font-medium text-gray-900">Kernel Configuration</h3>
        <div className="mt-2 bg-gray-50 p-4 rounded-md space-y-4">
          {/* Kernel dimensions */}
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kernel Width</label>
              <div className="flex items-center">
                <input
                  type="number"
                  min="1"
                  max="15"
                  step="2"
                  value={kernelSize.width}
                  onChange={(e) => handleDimensionChange('width', e.target.value)}
                  className="w-20 p-2 border border-gray-300 rounded-md text-sm text-gray-900"
                />
                <span className="ml-1 text-sm text-gray-500">px</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kernel Height</label>
              <div className="flex items-center">
                <input
                  type="number"
                  min="1"
                  max="15"
                  step="2"
                  value={kernelSize.height}
                  onChange={(e) => handleDimensionChange('height', e.target.value)}
                  className="w-20 p-2 border border-gray-300 rounded-md text-sm text-gray-900"
                />
                <span className="ml-1 text-sm text-gray-500">px</span>
              </div>
            </div>
            
            {kernelSizeModified && (
              <button
                onClick={applyKernelDimensions}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Apply Size
              </button>
            )}
          </div>
          
          {/* Note about odd dimensions */}
          <div className="text-xs text-gray-500">
            <p>For best results, kernel dimensions should be odd numbers. Even numbers will be adjusted automatically.</p>
          </div>
          
          {/* Presets */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Kernel Presets</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => applyPreset('boxBlur')}
                className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-md text-sm hover:bg-gray-200"
              >
                Box Blur
              </button>
              <button
                onClick={() => applyPreset('gaussianBlur')}
                className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-md text-sm hover:bg-gray-200"
              >
                Gaussian Blur
              </button>
              <button
                onClick={() => applyPreset('sharpen')}
                className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-md text-sm hover:bg-gray-200"
              >
                Sharpen
              </button>
              <button
                onClick={() => applyPreset('edgeDetect')}
                className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-md text-sm hover:bg-gray-200"
              >
                Edge Detect
              </button>
              <button
                onClick={() => applyPreset('emboss')}
                className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-md text-sm hover:bg-gray-200"
              >
                Emboss
              </button>
              <button
                onClick={() => applyPreset('motionBlur')}
                className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-md text-sm hover:bg-gray-200"
              >
                Motion Blur
              </button>
            </div>
          </div>
          
          {/* More presets */}
          <div className="flex flex-wrap gap-2 mt-2">
            <button
              onClick={() => applyPreset('unsharpMask')}
              className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-md text-sm hover:bg-gray-200"
            >
              Unsharp Mask
            </button>
            <button
              onClick={() => applyPreset('highPass')}
              className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-md text-sm hover:bg-gray-200"
            >
              High Pass
            </button>
          </div>
        </div>
      </div>
      
      {/* Kernel editor and visualization */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Kernel editor */}
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Kernel Matrix</h3>
          <div className="overflow-x-auto">
            <table className="border-collapse">
              <tbody>
                {kernelValues.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, colIndex) => (
                      <td key={colIndex} className="p-1">
                        <input
                          type="number"
                          value={cell}
                          step="0.1"
                          onChange={(e) => handleKernelValueChange(rowIndex, colIndex, parseFloat(e.target.value) || 0)}
                          className="w-16 p-2 border border-gray-300 rounded-md text-sm text-center text-gray-900"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="normalize-kernel"
                checked={normalize}
                onChange={handleNormalizeChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="normalize-kernel" className="ml-2 block text-sm text-gray-700">
                Normalize kernel (sum to 1)
              </label>
            </div>
            
            <button
              onClick={normalizeKernel}
              className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-md text-xs hover:bg-blue-200"
              disabled={normalize || getKernelSum() === 0 || getKernelSum() === 1}
            >
              Normalize Now
            </button>
          </div>
          
          {!normalize && getKernelSum() !== 1 && getKernelSum() !== 0 && (
            <div className="mt-2 flex items-center">
              <p className="text-sm text-amber-600 flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 mr-1" />
                Kernel sum is {getKernelSum().toFixed(2)}, which may cause brightness changes
              </p>
              <button
                onClick={normalizeKernel}
                className="ml-3 px-3 py-1 bg-amber-100 text-amber-800 rounded-md text-xs hover:bg-amber-200"
              >
                Normalize Now
              </button>
            </div>
          )}
        </div>
        
        {/* Kernel visualization */}
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="text-lg font-medium text-gray-900 mb-4">3D Visualization</h3>
          <KernelVisualizer kernelValues={kernelValues} />
          
          <div className="mt-4 text-sm text-gray-700">
            <p>The height of each point represents the weight of that kernel value.</p>
            <p>Higher values (peaks) increase pixel influence, lower values (valleys) decrease influence.</p>
          </div>
        </div>
      </div>
      
      {/* Advanced options */}
      <div>
        <h3 className="text-lg font-medium text-gray-900">Advanced Parameters</h3>
        <div className="mt-2 bg-gray-50 p-4 rounded-md space-y-4">
          {/* Border Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Border Type
            </label>
            <select
              value={advancedParameters.borderType || 'reflect'}
              onChange={(e) => onAdvancedParamChange('borderType', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white"
            >
              <option value="constant" className="text-gray-900">Constant (zero padding)</option>
              <option value="reflect" className="text-gray-900">Reflect (mirror at border)</option>
              <option value="replicate" className="text-gray-900">Replicate (repeat edge pixels)</option>
              <option value="wrap" className="text-gray-900">Wrap (tile image)</option>
            </select>
            <p className="mt-1 text-xs text-gray-500 flex items-center">
              <InformationCircleIcon className="h-3 w-3 mr-1" />
              Specifies how to handle pixels at the border of the image
            </p>
          </div>
        </div>
      </div>
      
      {/* Math explanation */}
      <div>
        <div className="flex items-center text-blue-600 mb-2">
          <DocumentTextIcon className="h-5 w-5 mr-1" />
          <h3 className="text-lg font-medium">Mathematical Explanation</h3>
        </div>
        <div className="bg-blue-50 p-4 rounded-md text-sm text-gray-800">
          <p className="mb-3">
            <strong>Convolution</strong> is the mathematical operation applied using the kernel matrix. 
            For each pixel in the image, we place the kernel over it and multiply each kernel value 
            by the corresponding pixel value, then sum the results.
          </p>
          
          <div className="mb-3">
            <p className="mb-1 font-medium">Mathematically represented as:</p>
            <div className="bg-white p-2 rounded text-center">
              <code>G(x,y) = ∑∑ K(i,j) * I(x-i, y-j)</code>
            </div>
            <p className="mt-1 text-xs">Where G is the output image, K is the kernel, and I is the input image.</p>
          </div>
          
          <p className="mb-2">
            <strong>Common Kernel Effects:</strong>
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Box Blur:</strong> All values equal, sums to 1 (averages pixels)</li>
            <li><strong>Gaussian Blur:</strong> Bell curve distribution, more weight to the center</li>
            <li><strong>Sharpen:</strong> Negative weights around center, high positive center</li>
            <li><strong>Edge Detection:</strong> Negative weights with positive center, sums to ~0</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 