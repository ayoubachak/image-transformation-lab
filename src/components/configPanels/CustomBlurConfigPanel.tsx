import React, { useState, useEffect, useCallback } from 'react';
import { ExclamationTriangleIcon, InformationCircleIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import type { Transformation, TransformationParameter, KernelValue } from '../../utils/types';
import { 
  normalizeKernelValues, 
  cloneKernelValue, 
  resizeKernelMatrix, 
  getKernelPreset,
  getKernelSum,
  invertKernel,
  emphasizeKernelCenter,
  createSharpeningKernel,
  createSmoothKernel
} from '../../utils/kernelHelpers';
import KernelVisualizer from './KernelVisualizer';

interface CustomBlurConfigPanelProps {
  transformation: Transformation;
  parameters: TransformationParameter[];
  advancedParameters: Record<string, any>;
  onParameterChange: (name: string, value: any) => void;
  onAdvancedParamChange: (name: string, value: any) => void;
  renderParameterControl: (param: TransformationParameter) => React.ReactNode;
  kernelState?: {
    values: number[][];
    width: number;
    height: number;
    normalize: boolean;
  };
  onKernelChange?: (
    values: number[][], 
    size: { width: number; height: number }, 
    normalize: boolean
  ) => void;
}

export default function CustomBlurConfigPanel({
  transformation,
  parameters,
  advancedParameters,
  onParameterChange,
  onAdvancedParamChange,
  renderParameterControl,
  kernelState,
  onKernelChange
}: CustomBlurConfigPanelProps) {
  // Find relevant parameters
  const kernelSizeParam = parameters.find(p => p.name === 'kernelSize');
  const customKernelParam = parameters.find(p => p.name === 'customKernel');
  const kernelTypeParam = parameters.find(p => p.name === 'kernelType');
  
  console.log('CustomBlurConfigPanel rendered with:', {
    kernelType: kernelTypeParam?.value,
    kernelSize: kernelSizeParam?.value,
    customKernel: customKernelParam?.value,
    kernelState
  });
  
  // Use kernel state from props if provided, otherwise initialize from parameters
  const initialKernelState = kernelState || {
    values: (customKernelParam?.value as KernelValue)?.values.map((row: number[]) => [...row]) || 
      [
        [1/9, 1/9, 1/9],
        [1/9, 1/9, 1/9],
        [1/9, 1/9, 1/9]
      ],
    width: (customKernelParam?.value as KernelValue)?.width || 3,
    height: (customKernelParam?.value as KernelValue)?.height || 3,
    normalize: (customKernelParam?.value as KernelValue)?.normalize !== false
  };
  
  // Store last used custom kernel values to prevent data loss when switching types
  const [lastCustomKernelValues, setLastCustomKernelValues] = useState<{
    values: number[][];
    width: number;
    height: number;
    normalize: boolean;
  } | null>(null);
  
  // Local state for kernel editing
  const [kernelValues, setKernelValues] = useState<number[][]>(initialKernelState.values);
  const [kernelSize, setKernelSize] = useState({
    width: initialKernelState.width,
    height: initialKernelState.height
  });
  const [normalize, setNormalize] = useState(initialKernelState.normalize);
  const [kernelSizeModified, setKernelSizeModified] = useState(false);
  const [previewEffects, setPreviewEffects] = useState(false);
  const [kernelPreview, setKernelPreview] = useState<string | null>(null);
  const [currentPreset, setCurrentPreset] = useState<string>("");
  
  // Sync local state with props when kernelState changes
  useEffect(() => {
    if (kernelState) {
      setKernelValues(kernelState.values.map(row => [...row]));
      setKernelSize({
        width: kernelState.width,
        height: kernelState.height
      });
      setNormalize(kernelState.normalize);
    }
  }, [kernelState]);
  
  // Handle kernel value changes
  const handleKernelValueChange = (row: number, col: number, value: number) => {
    const newValues = kernelValues.map(r => [...r]); // Deep clone
    newValues[row][col] = value;
    
    setKernelValues(newValues);
    
    // Notify parent of changes
    if (onKernelChange) {
      onKernelChange(newValues, kernelSize, normalize);
    }
  };
  
  // Handle dimension changes
  const handleDimensionChange = (dimension: 'width' | 'height', value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 1 || numValue > 15) return;
    
    // Always use odd numbers for convolution kernels
    const adjustedValue = numValue % 2 === 0 ? numValue + 1 : numValue;
    
    setKernelSizeModified(true);
    setKernelSize(prev => ({
      ...prev,
      [dimension]: adjustedValue
    }));
  };
  
  // Apply new kernel dimensions
  const applyKernelDimensions = () => {
    console.log('Applying new kernel dimensions:', {width: kernelSize.width, height: kernelSize.height});
    
    // Use the helper function to resize the matrix
    const newValues = resizeKernelMatrix(
      kernelValues, 
      kernelSize.width, 
      kernelSize.height
    );
    
    // Update local state with the new values
    setKernelValues(newValues);
    
    // Ensure kernel size is properly set with odd dimensions
    const adjustedWidth = kernelSize.width % 2 === 0 ? kernelSize.width + 1 : kernelSize.width;
    const adjustedHeight = kernelSize.height % 2 === 0 ? kernelSize.height + 1 : kernelSize.height;
    const adjustedSize = { width: adjustedWidth, height: adjustedHeight };
    setKernelSize(adjustedSize);
    
    // Notify parent of changes
    if (onKernelChange) {
      onKernelChange(newValues, adjustedSize, normalize);
    }
    
    setKernelSizeModified(false);
  };
  
  // Handle normalize change
  const handleNormalizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newNormalize = e.target.checked;
    setNormalize(newNormalize);
    
    // Notify parent of changes
    if (onKernelChange) {
      onKernelChange(kernelValues, kernelSize, newNormalize);
    }
  };
  
  // Apply preset kernels
  const applyPreset = (preset: string) => {
    // Set the current preset for tracking
    setCurrentPreset(preset);
    
    // Get the preset values from the helper
    const presetData = getKernelPreset(preset);
    
    // Make sure we use deep copies
    const clonedValues = presetData.values.map(row => [...row]);
    
    // Update kernel size to match the preset
    const newSize = { width: presetData.width, height: presetData.height };
    setKernelSize(newSize);
    setKernelValues(clonedValues);
    
    // Notify parent of changes
    if (onKernelChange) {
      onKernelChange(clonedValues, newSize, normalize);
    }
    
    console.log(`Applied kernel preset: ${preset}`);
  };
  
  // Calculate the sum of kernel values
  const getKernelTotal = () => {
    return getKernelSum(kernelValues);
  };
  
  // Normalize the kernel manually
  const normalizeKernel = () => {
    const sum = getKernelTotal();
    if (sum === 0 || sum === 1) return; // No need to normalize
    
    const newValues = normalizeKernelValues(kernelValues);
    
    setKernelValues(newValues);
    
    // Notify parent of changes
    if (onKernelChange) {
      onKernelChange(newValues, kernelSize, normalize);
    }
  };
  
  // Adjust kernel values with common operations
  const adjustKernel = (operation: string) => {
    let newValues: number[][];
    
    switch (operation) {
      case 'invert':
        // Use the new invertKernel helper function
        newValues = invertKernel(kernelValues);
        break;
        
      case 'emphasizeCenter':
        // Use the new emphasizeKernelCenter helper function
        newValues = emphasizeKernelCenter(kernelValues, 2);
        break;
        
      case 'sharpen':
        // Use the createSharpeningKernel function with current kernel dimensions
        newValues = createSharpeningKernel(kernelSize.width);
        break;
        
      case 'smooth':
        // Use the createSmoothKernel function for gaussian-like falloff
        newValues = createSmoothKernel(kernelSize.width);
        break;
        
      case 'edgeDetect':
        // Apply an edge detection kernel based on current kernel size
        if (kernelSize.width >= 5) {
          const preset = getKernelPreset('laplacian5x5');
          newValues = preset.values;
        } else {
          const preset = getKernelPreset('edgeDetect');
          newValues = preset.values;
        }
        break;
        
      case 'boxBlur':
        // Create a uniform blur with all values equal and sum = 1
        const totalCells = kernelSize.width * kernelSize.height;
        const value = 1 / totalCells;
        
        newValues = [];
        for (let i = 0; i < kernelSize.height; i++) {
          const row = Array(kernelSize.width).fill(value);
          newValues.push(row);
        }
        break;
        
      case 'clear':
        // Create a new kernel filled with zeros
        newValues = [];
        for (let i = 0; i < kernelSize.height; i++) {
          newValues.push(Array(kernelSize.width).fill(0));
        }
        break;
        
      default:
        return;
    }
    
    setKernelValues(newValues);
    
    // Notify parent of changes
    if (onKernelChange) {
      onKernelChange(newValues, kernelSize, normalize);
    }
  };
  
  // Handler for kernel type changes
  const handleKernelTypeChange = (type: string) => {
    if (kernelTypeParam?.value === 'custom' && type !== 'custom') {
      // Switching from custom to another type - save the current custom kernel
      setLastCustomKernelValues({
        values: kernelValues.map(row => [...row]),
        width: kernelSize.width,
        height: kernelSize.height,
        normalize
      });
    } else if (type === 'custom' && lastCustomKernelValues) {
      // Switching back to custom - restore the previous custom kernel
      const restoredValues = lastCustomKernelValues.values.map(row => [...row]);
      const restoredSize = {
        width: lastCustomKernelValues.width,
        height: lastCustomKernelValues.height
      };
      
      setKernelValues(restoredValues);
      setKernelSize(restoredSize);
      setNormalize(lastCustomKernelValues.normalize);
      
      // Notify parent of changes
      if (onKernelChange) {
        onKernelChange(restoredValues, restoredSize, lastCustomKernelValues.normalize);
      }
    } else if (type === 'custom' && !lastCustomKernelValues && !customKernelParam) {
      // First time switching to custom - create a default kernel
      const defaultValues = [
        [1/9, 1/9, 1/9],
        [1/9, 1/9, 1/9],
        [1/9, 1/9, 1/9]
      ];
      setKernelValues(defaultValues);
      setKernelSize({ width: 3, height: 3 });
      setNormalize(true);
      
      // Notify parent of changes
      if (onKernelChange) {
        onKernelChange(defaultValues, { width: 3, height: 3 }, true);
      }
    }
    
    // Update the kernel type parameter
    onParameterChange('kernelType', type);
  };
  
  // Function to restore custom kernel from advanced parameters if it exists
  useEffect(() => {
    // Check if we're switching to custom type and have stored values in advanced parameters
    if (kernelTypeParam?.value === 'custom' && 
        advancedParameters?.customKernelData && 
        !customKernelParam) {
      const storedKernel = advancedParameters.customKernelData;
      if (storedKernel.values) {
        // Deep clone the values
        const values = storedKernel.values.map((row: number[]) => [...row]);
        const width = storedKernel.width || 3;
        const height = storedKernel.height || 3;
        
        setKernelValues(values);
        setKernelSize({ width, height });
        setNormalize(storedKernel.normalize !== false);
        
        // Notify parent of changes
        if (onKernelChange) {
          onKernelChange(values, { width, height }, storedKernel.normalize !== false);
        }
      }
    }
  }, [kernelTypeParam?.value, advancedParameters?.customKernelData, customKernelParam, onKernelChange]);
  
  // At the top of the component, after the state declarations
  useEffect(() => {
    // Make sure kernelType is set to 'custom' when in advanced configuration
    // This ensures the kernel editor is always accessible
    const kernelTypeParam = parameters.find(p => p.name === 'kernelType');
    if (kernelTypeParam && kernelTypeParam.value !== 'custom') {
      // Store current kernel values in advanced parameters
      if (advancedParameters) {
        onAdvancedParamChange('originalKernelType', kernelTypeParam.value);
      }
      
      // Switch to custom mode for advanced editing
      onParameterChange('kernelType', 'custom');
    }
  }, []);
  
  return (
    <div className="space-y-6">
      {/* Configuration guide */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md">
        <h3 className="text-amber-800 font-medium flex items-center">
          <InformationCircleIcon className="h-5 w-5 mr-2" />
          Custom Kernel Configuration
        </h3>
        <p className="text-sm text-amber-700 mt-1">
          You're editing advanced kernel settings. Any changes made here will be preserved even if you switch 
          between kernel types in the main view. Use the presets and tools below to fine-tune your kernel.
        </p>
      </div>
      
      {/* Basic parameters section */}
      <div>
        <h3 className="text-lg font-medium text-gray-900">Kernel Configuration</h3>
        <div className="mt-2 bg-gray-50 p-4 rounded-md space-y-4">
          {/* Kernel Type Selector */}
          {kernelTypeParam && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Kernel Type</label>
              <div className="flex flex-wrap gap-2">
                {kernelTypeParam.options?.map(option => (
                  <button
                    key={option}
                    onClick={() => handleKernelTypeChange(option)}
                    className={`px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                      kernelTypeParam.value === option
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-500 flex items-center">
                <InformationCircleIcon className="h-3 w-3 mr-1" />
                Choose 'Custom' for full control over kernel values
              </p>
            </div>
          )}
          
          {/* Show explanations for non-custom kernel types */}
          {kernelTypeParam?.value !== 'custom' && (
            <div className="py-4">
              {kernelTypeParam?.value === 'box' ? (
                <div className="flex flex-col space-y-3">
                  <p className="text-sm text-gray-700">
                    Box blur uses a simple uniform kernel where all values are equal. 
                    This creates an averaging effect across neighboring pixels.
                  </p>
                  <div className="bg-blue-50 p-3 rounded-md">
                    <p className="text-sm font-medium text-blue-700 mb-2">Default kernel:</p>
                    <div className="grid grid-cols-3 gap-1 w-max mx-auto">
                      {Array(3).fill(0).map((_, row) => (
                        <div key={`box-row-${row}`} className="flex">
                          {Array(3).fill(0).map((_, col) => (
                            <div key={`box-${row}-${col}`} className="w-12 h-8 bg-blue-100 flex items-center justify-center text-blue-800 border border-blue-200 text-sm">
                              1/9
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Use the kernel size parameter to control the blur strength. 
                    Switch to 'Custom' mode for more control over the blur effect.
                  </p>
                </div>
              ) : kernelTypeParam?.value === 'gaussian' ? (
                <div className="flex flex-col space-y-3">
                  <p className="text-sm text-gray-700">
                    Gaussian blur uses a bell-shaped distribution, giving more weight to the center pixels
                    and less to those further away. This creates a more natural blurring effect.
                  </p>
                  <div className="bg-blue-50 p-3 rounded-md">
                    <p className="text-sm font-medium text-blue-700 mb-2">Default 3×3 kernel:</p>
                    <div className="grid grid-cols-3 gap-1 w-max mx-auto">
                      <div className="w-12 h-8 bg-blue-100 flex items-center justify-center text-blue-800 border border-blue-200 text-sm">1/16</div>
                      <div className="w-12 h-8 bg-blue-100 flex items-center justify-center text-blue-800 border border-blue-200 text-sm">2/16</div>
                      <div className="w-12 h-8 bg-blue-100 flex items-center justify-center text-blue-800 border border-blue-200 text-sm">1/16</div>
                      <div className="w-12 h-8 bg-blue-100 flex items-center justify-center text-blue-800 border border-blue-200 text-sm">2/16</div>
                      <div className="w-12 h-8 bg-blue-200 flex items-center justify-center text-blue-800 border border-blue-300 text-sm font-medium">4/16</div>
                      <div className="w-12 h-8 bg-blue-100 flex items-center justify-center text-blue-800 border border-blue-200 text-sm">2/16</div>
                      <div className="w-12 h-8 bg-blue-100 flex items-center justify-center text-blue-800 border border-blue-200 text-sm">1/16</div>
                      <div className="w-12 h-8 bg-blue-100 flex items-center justify-center text-blue-800 border border-blue-200 text-sm">2/16</div>
                      <div className="w-12 h-8 bg-blue-100 flex items-center justify-center text-blue-800 border border-blue-200 text-sm">1/16</div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Adjust the kernel size for stronger or more subtle blur effects.
                    For precise control over kernel values, switch to 'Custom' mode.
                  </p>
                </div>
              ) : null}
              
              {/* Size parameter for box and gaussian */}
              {kernelSizeParam && (
                <div className="mt-4">
                  {renderParameterControl(kernelSizeParam)}
                </div>
              )}
            </div>
          )}
          
          {/* Only show the custom kernel UI if kernel type is 'custom' */}
          {kernelTypeParam?.value === 'custom' && (
            <>
              {/* Kernel dimensions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kernel Dimensions</label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <select
                      value={kernelSize.width}
                      onChange={(e) => handleDimensionChange('width', e.target.value)}
                      className="w-24 p-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white"
                    >
                      <option disabled value="">Width</option>
                      {[1, 3, 5, 7, 9, 11, 13, 15].map(size => (
                        <option key={`width-${size}`} value={size} className="text-gray-900">{size}</option>
                      ))}
                    </select>
                    <span className="text-gray-500">×</span>
                    <select
                      value={kernelSize.height}
                      onChange={(e) => handleDimensionChange('height', e.target.value)}
                      className="w-24 p-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white"
                    >
                      <option disabled value="">Height</option>
                      {[1, 3, 5, 7, 9, 11, 13, 15].map(size => (
                        <option key={`height-${size}`} value={size} className="text-gray-900">{size}</option>
                      ))}
                    </select>
                  </div>
                  
                  <button
                    onClick={applyKernelDimensions}
                    className={`px-3 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                      kernelSizeModified 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                    disabled={!kernelSizeModified}
                  >
                    Apply Size
                  </button>
                </div>
                
                <div className="mt-1 text-xs text-gray-500 flex items-center">
                  <InformationCircleIcon className="h-3 w-3 mr-1" />
                  <p>Odd-sized kernels are centered on each pixel. Even sizes will be converted to odd.</p>
                </div>
              </div>
              
              {/* Presets */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kernel Presets</label>
                <div className="flex items-center gap-2">
                  <select
                    value={currentPreset}
                    onChange={(e) => {
                      if (e.target.value) {
                        applyPreset(e.target.value);
                      }
                    }}
                    className="w-48 p-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white"
                  >
                    <option value="" className="text-gray-500">Select a preset...</option>
                    <optgroup label="Basic">
                      <option value="identity" className="text-gray-900">Identity</option>
                      <option value="boxBlur" className="text-gray-900">Box Blur 3×3</option>
                      <option value="boxBlur5x5" className="text-gray-900">Box Blur 5×5</option>
                      <option value="gaussianBlur" className="text-gray-900">Gaussian Blur 3×3</option>
                      <option value="gaussianBlur5x5" className="text-gray-900">Gaussian 5×5</option>
                    </optgroup>
                    <optgroup label="Enhancement">
                      <option value="sharpen" className="text-gray-900">Sharpen 3×3</option>
                      <option value="sharpen5x5" className="text-gray-900">Sharpen 5×5</option>
                      <option value="unsharpMask" className="text-gray-900">Unsharp Mask</option>
                    </optgroup>
                    <optgroup label="Effects">
                      <option value="emboss" className="text-gray-900">Emboss</option>
                      <option value="motionBlur" className="text-gray-900">Motion Blur</option>
                      <option value="circularBlur" className="text-gray-900">Circular Blur</option>
                      <option value="circularBlur7x7" className="text-gray-900">Circular Blur 7×7</option>
                    </optgroup>
                    <optgroup label="Edge Detection">
                      <option value="edgeDetect" className="text-gray-900">Edge Detect</option>
                      <option value="laplacian5x5" className="text-gray-900">Laplacian 5×5</option>
                      <option value="sobelHorizontal" className="text-gray-900">Sobel (Horizontal)</option>
                      <option value="sobelVertical" className="text-gray-900">Sobel (Vertical)</option>
                      <option value="highPass" className="text-gray-900">High Pass</option>
                    </optgroup>
                  </select>
                  
                  <div className="flex flex-wrap gap-1">
                    <button
                      onClick={() => applyPreset('boxBlur')}
                      className="px-2.5 py-1 bg-gray-100 text-gray-800 rounded-md text-xs hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1"
                      title="Box Blur"
                    >
                      Box
                    </button>
                    <button
                      onClick={() => applyPreset('gaussianBlur')}
                      className="px-2.5 py-1 bg-gray-100 text-gray-800 rounded-md text-xs hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1"
                      title="Gaussian Blur"
                    >
                      Gauss
                    </button>
                    <button
                      onClick={() => applyPreset('sharpen')}
                      className="px-2.5 py-1 bg-gray-100 text-gray-800 rounded-md text-xs hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1"
                      title="Sharpen"
                    >
                      Sharp
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Kernel operations - improve with more operations and better layout */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kernel Operations</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 mb-2">
                  <button
                    onClick={() => adjustKernel('invert')}
                    className="px-2 py-1.5 bg-blue-100 text-blue-800 rounded-md text-xs hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 flex items-center justify-center"
                    title="Invert all values in the kernel"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    Invert
                  </button>
                  <button
                    onClick={() => adjustKernel('emphasizeCenter')}
                    className="px-2 py-1.5 bg-blue-100 text-blue-800 rounded-md text-xs hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 flex items-center justify-center"
                    title="Double the center value"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    Emphasize
                  </button>
                  <button
                    onClick={() => adjustKernel('sharpen')}
                    className="px-2 py-1.5 bg-blue-100 text-blue-800 rounded-md text-xs hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 flex items-center justify-center"
                    title="Create a sharpening kernel"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Sharpen
                  </button>
                  <button
                    onClick={() => adjustKernel('smooth')}
                    className="px-2 py-1.5 bg-blue-100 text-blue-800 rounded-md text-xs hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 flex items-center justify-center"
                    title="Create a smooth gaussian-like kernel"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Smooth
                  </button>
                  <button
                    onClick={normalizeKernel}
                    className={`px-2 py-1.5 rounded-md text-xs flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                      normalize || getKernelTotal() === 0 || getKernelTotal() === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                    }`}
                    disabled={normalize || getKernelTotal() === 0 || getKernelTotal() === 1}
                    title="Normalize all values to sum to 1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                    </svg>
                    Normalize
                  </button>
                  <button
                    onClick={() => adjustKernel('edgeDetect')}
                    className="px-2 py-1.5 bg-blue-100 text-blue-800 rounded-md text-xs hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 flex items-center justify-center"
                    title="Create an edge detection kernel"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                    </svg>
                    Edges
                  </button>
                  <button
                    onClick={() => adjustKernel('boxBlur')}
                    className="px-2 py-1.5 bg-blue-100 text-blue-800 rounded-md text-xs hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 flex items-center justify-center"
                    title="Create a box blur (uniform) kernel"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                    </svg>
                    Box Blur
                  </button>
                  <button
                    onClick={() => adjustKernel('clear')}
                    className="px-2 py-1.5 bg-red-100 text-red-800 rounded-md text-xs hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 flex items-center justify-center"
                    title="Set all values to zero"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Clear
                  </button>
                </div>
                <div className="text-xs text-gray-600 mt-1 flex items-start">
                  <InformationCircleIcon className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
                  <span>These operations create standard kernel patterns or modify the current values. Operations will automatically adjust to the current kernel size.</span>
                </div>
              </div>
              
              {/* Kernel editor and visualization */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Kernel editor */}
                <div className="bg-gray-50 p-3 rounded-md">
                  <h3 className="text-base font-medium text-gray-900 mb-3">Kernel Matrix</h3>
                  <div className="overflow-x-auto">
                    <table className="border-collapse mx-auto">
                      <tbody>
                        {kernelValues.map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            {row.map((cell, colIndex) => {
                              // Determine if this is the center cell
                              const isCenter = 
                                rowIndex === Math.floor(kernelValues.length / 2) && 
                                colIndex === Math.floor(row.length / 2);
                              
                              return (
                                <td key={colIndex} className="p-1">
                                  <input
                                    type="number"
                                    value={cell}
                                    step="0.1"
                                    onChange={(e) => handleKernelValueChange(rowIndex, colIndex, parseFloat(e.target.value) || 0)}
                                    className={`w-14 p-1.5 border ${isCenter ? 'border-blue-500 bg-blue-50' : 'border-gray-300'} rounded-md text-xs text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-3 flex items-center">
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
                  
                  {!normalize && getKernelTotal() !== 1 && getKernelTotal() !== 0 && (
                    <div className="mt-2 flex items-center">
                      <p className="text-sm text-amber-600 flex items-center">
                        <ExclamationTriangleIcon className="h-5 w-5 mr-1" />
                        Kernel sum is {getKernelTotal().toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Kernel visualization */}
                <div className="bg-gray-50 p-3 rounded-md">
                  <h3 className="text-base font-medium text-gray-900 mb-3">3D Visualization</h3>
                  <KernelVisualizer kernelValues={kernelValues} />
                  
                  <div className="mt-3 text-xs text-gray-700">
                    <p>Higher values (peaks) increase pixel influence, lower values (valleys) decrease influence.</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Advanced options section - always visible */}
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
              className="w-full p-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
      
      {/* Math explanation - only show for custom kernel */}
      {kernelTypeParam?.value === 'custom' && (
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
      )}
    </div>
  );
} 