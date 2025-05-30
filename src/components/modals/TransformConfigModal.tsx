import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { ExclamationTriangleIcon, XMarkIcon, DocumentTextIcon, InformationCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import type { Transformation, TransformationParameter, KernelValue } from '../../utils/types';
import CustomBlurConfigPanel from '../configPanels/CustomBlurConfigPanel';

interface TransformConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  transformation: Transformation;
  onSave: (updatedTransformation: Transformation) => void;
  onReset: () => void;
}

// Add a function to initialize kernel values from either transformation or advanced parameters
const initializeKernelValues = (transformation: Transformation) => {
  // Check for custom kernel in parameters
  const customKernelParam = transformation.parameters?.find(p => p.name === 'customKernel');
  
  // If we have a custom kernel parameter, use it
  if (customKernelParam?.value) {
    const kernel = customKernelParam.value as KernelValue;
    return {
      values: kernel.values.map(row => [...row]), // Deep clone
      width: kernel.width || 3,
      height: kernel.height || 3,
      normalize: kernel.normalize !== false
    };
  }
  
  // Check for custom kernel in advanced parameters
  const advancedKernel = transformation.metadata?.advancedParameters?.customKernelData;
  if (advancedKernel) {
    return {
      values: advancedKernel.values.map((row: number[]) => [...row]), // Deep clone
      width: advancedKernel.width || 3, 
      height: advancedKernel.height || 3,
      normalize: advancedKernel.normalize !== false
    };
  }
  
  // Default values if no custom kernel is found
  return {
    values: [
      [1/9, 1/9, 1/9],
      [1/9, 1/9, 1/9],
      [1/9, 1/9, 1/9]
    ],
    width: 3,
    height: 3,
    normalize: true
  };
};

export default function TransformConfigModal({
  isOpen,
  onClose,
  transformation,
  onSave,
  onReset
}: TransformConfigModalProps) {
  const [editedTransformation, setEditedTransformation] = useState<Transformation>(
    JSON.parse(JSON.stringify(transformation))
  );
  
  // Initialize kernel state from transformation or advanced parameters
  const [kernelState, setKernelState] = useState(() => initializeKernelValues(transformation));
  
  // Extract values for convenience
  const [kernelValues, setKernelValues] = useState<number[][]>(kernelState.values);
  const [kernelSize, setKernelSize] = useState({
    width: kernelState.width,
    height: kernelState.height
  });
  const [normalize, setNormalize] = useState(kernelState.normalize);
  
  // Additional advanced parameters for different transformation types
  const [advancedParameters, setAdvancedParameters] = useState<Record<string, any>>({});
  
  // Keep track of changes to show save/discard warnings
  const [hasChanges, setHasChanges] = useState(false);
  const [showDiscardWarning, setShowDiscardWarning] = useState(false);

  // Common validation for parameters (e.g., ensuring odd values for kernels)
  const validateParameter = (param: TransformationParameter): TransformationParameter => {
    // Ensure kernel sizes are odd numbers for certain operations
    if ((param.name === 'kernelSize' || param.name.includes('kernel')) && 
        typeof param.value === 'number' && 
        param.value % 2 === 0) {
      
      return { ...param, value: param.value + 1 };
    }
    return param;
  };

  // Update kernel state when any kernel value changes
  useEffect(() => {
    setKernelState({
      values: kernelValues,
      width: kernelSize.width,
      height: kernelSize.height,
      normalize
    });
  }, [kernelValues, kernelSize, normalize]);

  // Update when the source transformation changes
  useEffect(() => {
    // Create a deep copy of the transformation to prevent reference issues
    const deepCopy = {
      ...transformation,
      parameters: [...(transformation.parameters || [])].map(param => {
        // Handle deep copying for complex objects like kernels
        if (param.name === 'customKernel' && param.type === 'kernel') {
          const kernelValue = param.value as KernelValue;
          return {
            ...param,
            value: {
              ...kernelValue,
              // Make sure to deep clone the values array
              values: kernelValue.values?.map(row => [...row]) || []
            }
          };
        }
        return { ...param };
      })
    };
    
    setEditedTransformation(deepCopy);
    
    // Update kernel state from the transformation
    const newKernelState = initializeKernelValues(transformation);
    setKernelState(newKernelState);
    setKernelValues(newKernelState.values);
    setKernelSize({
      width: newKernelState.width,
      height: newKernelState.height
    });
    setNormalize(newKernelState.normalize);
    
    // Initialize default advanced parameters based on transformation type
    let defaultAdvancedParams = {};
    
    if (transformation.type === 'blur') {
      defaultAdvancedParams = {
        sigmaX: 0,
        sigmaY: 0,
        borderType: 'BORDER_DEFAULT',
        kernelType: 'gaussian',
        customKernel: null,
        useCustomKernel: false
      };
    } else if (transformation.type === 'canny') {
      defaultAdvancedParams = {
        apertureSize: 3,
        l2gradient: false
      };
    } else if (transformation.type === 'sobel' || transformation.type === 'laplacian') {
      defaultAdvancedParams = {
        scale: 1,
        delta: 0,
        borderType: 'BORDER_DEFAULT'
      };
    } else if (transformation.type === 'histogram') {
      defaultAdvancedParams = {
        clipLimit: 2.0,
        tileGridSize: { width: 8, height: 8 }
      };
    } else if (transformation.type === 'rotate' || transformation.type === 'perspective') {
      defaultAdvancedParams = {
        interpolation: 'linear',
        borderMode: 'constant',
        borderValue: [0, 0, 0]
      };
    } else if (transformation.type === 'colorAdjust') {
      defaultAdvancedParams = {
        method: 'hsv',
        preserveLuminance: true
      };
    } else if (transformation.type === 'morphology' || transformation.type === 'dilate' || transformation.type === 'erode') {
      defaultAdvancedParams = {
        shape: 'rect',
        borderType: 'BORDER_DEFAULT'
      };
    } else if (transformation.type === 'customBlur') {
      defaultAdvancedParams = {
        borderType: 'reflect',
      };
    }
    
    // If there are existing advanced parameters in the metadata, use those instead
    if (transformation.metadata?.advancedParameters) {
      // For backward compatibility, check if advancedParameters is just a boolean flag
      if (typeof transformation.metadata.advancedParameters === 'boolean') {
        setAdvancedParameters(defaultAdvancedParams);
      } else {
        // Use the stored advanced parameters, with defaults as fallback
        setAdvancedParameters({
          ...defaultAdvancedParams,
          ...transformation.metadata.advancedParameters
        });
      }
    } else {
      // No existing advanced parameters, use defaults
      setAdvancedParameters(defaultAdvancedParams);
    }
    
    setHasChanges(false);
  }, [transformation]);

  // Handle parameter changes
  const handleParameterChange = (name: string, value: number | string | boolean) => {
    const updatedParams = editedTransformation.parameters.map(param => 
      param.name === name ? validateParameter({ ...param, value }) : param
    );
    
    setEditedTransformation({
      ...editedTransformation,
      parameters: updatedParams
    });
    
    setHasChanges(true);
  };

  // Handle advanced parameter changes
  const handleAdvancedParamChange = (name: string, value: any) => {
    setAdvancedParameters(prev => ({
      ...prev,
      [name]: value
    }));
    
    setHasChanges(true);
  };

  // Update kernel values (from CustomBlurConfigPanel)
  const handleKernelChange = (
    values: number[][],
    size: { width: number, height: number },
    shouldNormalize: boolean
  ) => {
    // Update local kernel state
    setKernelValues(values.map(row => [...row])); // Deep clone
    setKernelSize(size);
    setNormalize(shouldNormalize);
    setHasChanges(true);
    
    console.log("TransformConfigModal: Kernel updated", {
      width: size.width,
      height: size.height,
      normalize: shouldNormalize,
      values: values[0]
    });
  };

  // Handle saving the configuration
  const handleSave = () => {
    console.log("TransformConfigModal - Starting save operation with:", {
      type: transformation.type,
      id: transformation.id,
      kernelState
    });
    
    // Create a deep copy of the transformation to avoid reference issues
    const updatedTransformation = { 
      ...editedTransformation,
      // Ensure we properly clone all parameters
      parameters: [...editedTransformation.parameters].map(param => {
        // Special handling for complex object types like kernels
        if (param.type === 'kernel' && param.name === 'customKernel' && param.value) {
          // Deep clone kernel values
          const kernelValue = param.value as KernelValue;
          return {
            ...param,
            value: {
              ...kernelValue,
              values: kernelValue.values.map(row => [...row])
            }
          };
        }
        return {...param};
      })
    };
    
    // Handle specific parameter updates based on transformation type
    if (transformation.type === 'customBlur') {
      // Find the customKernel parameter or create one if it doesn't exist
      const kernelParamIndex = updatedTransformation.parameters.findIndex(p => p.name === 'customKernel');
      const kernelTypeParam = updatedTransformation.parameters.find(p => p.name === 'kernelType');
      
      // IMPORTANT: Always ensure we have the latest kernel values from kernelState
      const kernelData = {
        width: kernelState.width,
        height: kernelState.height,
        // Make sure to create a new deep copy of the values
        values: kernelState.values.map(row => [...row]),
        normalize: kernelState.normalize
      };
      
      console.log("Saving kernel data:", kernelData);
      
      // Store in parameters if kernel type is 'custom'
      if (kernelTypeParam?.value === 'custom') {
        if (kernelParamIndex >= 0) {
          // Update existing parameter (create a new object to ensure reference changes)
          updatedTransformation.parameters[kernelParamIndex] = {
            ...updatedTransformation.parameters[kernelParamIndex],
            type: 'kernel',
            name: 'customKernel',
            value: kernelData
          };
        } else {
          // Add new parameter
          updatedTransformation.parameters.push({
            name: 'customKernel',
            type: 'kernel',
            value: kernelData
          });
        }
      }
      
      // For all kernel types, store custom kernel in advanced parameters
      // This ensures we keep the values even when switching between kernel types
      const advancedParamsCopy = {...advancedParameters};
      advancedParamsCopy.customKernelData = {
        width: kernelState.width,
        height: kernelState.height,
        values: kernelState.values.map(row => [...row]),
        normalize: kernelState.normalize
      };
      
      // Add advanced parameters metadata for all transformation types that have them
      if (Object.keys(advancedParamsCopy).length > 0) {
        // Create or update metadata (with deep copying for any array values)
        updatedTransformation.metadata = updatedTransformation.metadata || {};
        updatedTransformation.metadata.advancedParameters = JSON.parse(JSON.stringify(advancedParamsCopy));
      }
    } else {
      // Add advanced parameters metadata for all transformation types that have them
      if (Object.keys(advancedParameters).length > 0) {
        // Create or update metadata (with deep copying for any array values)
        updatedTransformation.metadata = updatedTransformation.metadata || {};
        updatedTransformation.metadata.advancedParameters = JSON.parse(JSON.stringify(advancedParameters));
      }
    }
    
    // Preserve the original ID from the transformation we're editing
    updatedTransformation.id = transformation.id;
    
    // Preserve inputNodes (important for node connections)
    updatedTransformation.inputNodes = transformation.inputNodes;
    
    // Debug: Check if the transformation ID is being preserved
    console.log('Original transformation ID:', transformation.id);
    console.log('Updated transformation ID:', updatedTransformation.id);
    console.log('Updated transformation:', updatedTransformation);
    
    // Save the updated transformation
    onSave(updatedTransformation);
    setHasChanges(false);
    onClose();
  };

  // Handle closing the modal
  const handleClose = () => {
    if (hasChanges) {
      setShowDiscardWarning(true);
    } else {
      // Restore original kernel type if needed
      if (transformation.type === 'customBlur' && 
          advancedParameters?.originalKernelType && 
          transformation.parameters.find(p => p.name === 'kernelType')?.value === 'custom') {
        
        // Create a copy with the original kernel type restored
        const restoredTransformation = {
          ...transformation,
          parameters: transformation.parameters.map(param => 
            param.name === 'kernelType' 
              ? { ...param, value: advancedParameters.originalKernelType } 
              : { ...param }
          )
        };
        
        // Apply the change
        onSave(restoredTransformation);
      }
      
      onClose();
    }
  };

  // Handle discarding changes
  const handleDiscard = () => {
    // Restore original kernel type if needed
    if (transformation.type === 'customBlur' && 
        advancedParameters?.originalKernelType && 
        transformation.parameters.find(p => p.name === 'kernelType')?.value === 'custom') {
      
      // Create a copy with the original kernel type restored
      const restoredTransformation = {
        ...transformation,
        parameters: transformation.parameters.map(param => 
          param.name === 'kernelType' 
            ? { ...param, value: advancedParameters.originalKernelType } 
            : { ...param }
        )
      };
      
      // Apply the change
      onSave(restoredTransformation);
    }
    
    setShowDiscardWarning(false);
    setHasChanges(false);
    onClose();
  };

  // Cancel discard changes
  const cancelDiscard = () => {
    setShowDiscardWarning(false);
  };

  // Render configuration UI based on transformation type
  const renderConfigurationUI = () => {
    switch (editedTransformation.type) {
      case 'grayscale':
        return <div className="text-gray-700">No additional configuration needed for grayscale conversion.</div>;
        
      case 'blur':
        return renderGaussianBlurConfig();
        
      case 'customBlur':
        return renderCustomBlurConfig();
        
      case 'threshold':
        return renderThresholdConfig();
        
      case 'adaptiveThreshold':
        return <div>Advanced threshold configuration (coming soon)</div>;
        
      case 'laplacian':
      case 'sobel':
        return renderEdgeDetectionConfig();
        
      case 'canny':
        return renderCannyConfig();
        
      case 'dilate':
      case 'erode':
      case 'morphology':
        return renderMorphologyConfig();
        
      case 'colorAdjust':
        return renderColorAdjustConfig();
        
      case 'histogram':
        return renderHistogramConfig();
        
      case 'rotate':
      case 'resize':
      case 'flip':
      case 'crop':
      case 'perspective':
        return renderGeometryConfig();
        
      default:
        return <div className="text-gray-700">Configuration not implemented for this transformation type.</div>;
    }
  };

  // Render a parameter control based on type
  const renderParameterControl = (param: TransformationParameter) => {
    const { name, type, value, min, max, step, options, label } = param;
    const displayLabel = label || name;
    
    switch (type) {
      case 'number':
        return (
          <div className="mb-4" key={name}>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-800">
                {displayLabel}
              </label>
              <span className="text-sm font-medium text-gray-600">
                {typeof value === 'object' ? JSON.stringify(value).substring(0, 20) + '...' : value}
              </span>
            </div>
            <div className="mt-1">
              <input
                type="range"
                min={min || 0}
                max={max || 100}
                step={step || 1}
                value={value as number}
                onChange={(e) => handleParameterChange(name, Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-blue-300"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{min}</span>
                <span>{max}</span>
              </div>
            </div>
          </div>
        );
        
      case 'select':
        return (
          <div className="mb-4" key={name}>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              {displayLabel}
            </label>
            <select
              value={value as string}
              onChange={(e) => handleParameterChange(name, e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {options?.map((option) => (
                <option key={option} value={option} className="text-gray-900 bg-white">
                  {option}
                </option>
              ))}
            </select>
          </div>
        );
        
      case 'boolean':
        return (
          <div className="mb-4 flex items-center" key={name}>
            <input
              type="checkbox"
              id={name}
              checked={value as boolean}
              onChange={(e) => handleParameterChange(name, e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor={name} className="ml-2 block text-sm font-medium text-gray-800">
              {displayLabel}
            </label>
          </div>
        );
        
      default:
        return <div key={name}>Unsupported parameter type: {type}</div>;
    }
  };

  // Render edge detection configuration (for Laplacian and Sobel)
  const renderEdgeDetectionConfig = () => {
    return (
      <div className="space-y-6">
        {/* Basic parameters section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900">Basic Parameters</h3>
          <div className="mt-2 bg-gray-50 p-4 rounded-md">
            {editedTransformation.parameters.map(param => renderParameterControl(param))}
          </div>
        </div>
        
        {/* Advanced parameters section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900">Advanced Parameters</h3>
          <div className="mt-2 bg-gray-50 p-4 rounded-md space-y-4">
            {/* Scale factor */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-800">
                  Scale Factor
                </label>
                <span className="text-sm font-medium text-gray-600">{advancedParameters.scale || 1}</span>
              </div>
              <div className="mt-1">
                <input
                  type="range"
                  min={0.1}
                  max={10}
                  step={0.1}
                  value={advancedParameters.scale || 1}
                  onChange={(e) => handleAdvancedParamChange('scale', Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-blue-300"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0.1</span>
                  <span>10.0</span>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500 flex items-center">
                <InformationCircleIcon className="h-3 w-3 mr-1" />
                Adjusts the intensity of detected edges
              </p>
            </div>
            
            {/* Delta value */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-800">
                  Delta Value
                </label>
                <span className="text-sm font-medium text-gray-600">{advancedParameters.delta || 0}</span>
              </div>
              <div className="mt-1">
                <input
                  type="range"
                  min={-128}
                  max={128}
                  step={1}
                  value={advancedParameters.delta || 0}
                  onChange={(e) => handleAdvancedParamChange('delta', Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-blue-300"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>-128</span>
                  <span>128</span>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500 flex items-center">
                <InformationCircleIcon className="h-3 w-3 mr-1" />
                Value added to each pixel after edge detection
              </p>
            </div>
            
            {/* Border Type */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Border Type
              </label>
              <select
                value={advancedParameters.borderType || 'BORDER_DEFAULT'}
                onChange={(e) => handleAdvancedParamChange('borderType', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="BORDER_CONSTANT" className="text-gray-900 bg-white">Constant</option>
                <option value="BORDER_REPLICATE" className="text-gray-900 bg-white">Replicate</option>
                <option value="BORDER_REFLECT" className="text-gray-900 bg-white">Reflect</option>
                <option value="BORDER_WRAP" className="text-gray-900 bg-white">Wrap</option>
                <option value="BORDER_DEFAULT" className="text-gray-900 bg-white">Default</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 flex items-center">
                <InformationCircleIcon className="h-3 w-3 mr-1" />
                Method for handling pixels at the border of the image
              </p>
            </div>
          </div>
        </div>
        
        {/* Mathematical explanation */}
        <div>
          <div className="flex items-center text-blue-600 mb-2">
            <DocumentTextIcon className="h-5 w-5 mr-1" />
            <h3 className="text-lg font-medium">Mathematical Explanation</h3>
          </div>
          <div className="bg-blue-50 p-4 rounded-md text-sm text-gray-800">
            {editedTransformation.type === 'laplacian' ? (
              <>
                <p className="mb-3">
                  <strong>Laplacian</strong> is a second-order derivative operator that finds areas of rapid change in an image. 
                  It's often used for edge detection and is defined as:
                </p>
                <div className="bg-white p-2 rounded text-center mb-3">
                  <code>Laplacian(f) = ∂²f/∂x² + ∂²f/∂y²</code>
                </div>
                <p>
                  In digital image processing, the Laplacian is approximated using a kernel such as:
                </p>
                <div className="bg-white p-2 rounded text-center mt-2">
                  <code>
                    [ 0  1  0 ]<br />
                    [ 1 -4  1 ]<br />
                    [ 0  1  0 ]
                  </code>
                </div>
              </>
            ) : (
              <>
                <p className="mb-3">
                  <strong>Sobel</strong> is a first-order derivative operator that calculates the gradient of image intensity.
                  It consists of two kernels for horizontal (Gx) and vertical (Gy) gradients:
                </p>
                <div className="grid grid-cols-2 gap-4 bg-white p-2 rounded text-center mb-3">
                  <div>
                    <p className="font-medium mb-1">Horizontal (Gx)</p>
                    <code>
                      [ -1  0  1 ]<br />
                      [ -2  0  2 ]<br />
                      [ -1  0  1 ]
                    </code>
                  </div>
                  <div>
                    <p className="font-medium mb-1">Vertical (Gy)</p>
                    <code>
                      [ -1 -2 -1 ]<br />
                      [  0  0  0 ]<br />
                      [  1  2  1 ]
                    </code>
                  </div>
                </div>
                <p>
                  The gradient magnitude is calculated as:
                </p>
                <div className="bg-white p-2 rounded text-center mt-2">
                  <code>G = √(Gx² + Gy²)</code>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render Gaussian Blur configuration
  const renderGaussianBlurConfig = () => {
    return (
      <div className="text-gray-700">
        <p>Please use Custom Blur for all blur operations.</p>
      </div>
    );
  };

  // Render Threshold configuration
  const renderThresholdConfig = () => {
    return (
      <div className="space-y-6">
        {/* Basic parameters section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900">Basic Parameters</h3>
          <div className="mt-2 bg-gray-50 p-4 rounded-md">
            {editedTransformation.parameters.map(param => 
              <div key={param.name}>{renderParameterControl(param)}</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render Color Adjustment configuration
  const renderColorAdjustConfig = () => {
    return (
      <div className="space-y-6">
        {/* Basic parameters section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900">Color Adjustment Parameters</h3>
          <div className="mt-2 bg-gray-50 p-4 rounded-md">
            {editedTransformation.parameters
              .filter(param => param.name !== 'kernelSize' && param.name !== 'kernelType')
              .map(param => 
                <div key={param.name}>{renderParameterControl(param)}</div>
              )
            }
          </div>
        </div>
        
        {/* Advanced parameters section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900">Advanced Parameters</h3>
          <div className="mt-2 bg-gray-50 p-4 rounded-md space-y-4">
            {/* Method Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Color Adjustment Method
              </label>
              <select
                value={advancedParameters.method || 'hsv'}
                onChange={(e) => handleAdvancedParamChange('method', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="hsv" className="text-gray-900 bg-white">HSV (Hue-Saturation-Value)</option>
                <option value="hsl" className="text-gray-900 bg-white">HSL (Hue-Saturation-Lightness)</option>
                <option value="rgb" className="text-gray-900 bg-white">RGB (Direct)</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 flex items-center">
                <InformationCircleIcon className="h-3 w-3 mr-1" />
                Color space used for adjustment calculations
              </p>
            </div>
            
            {/* Preserve Luminance */}
            <div className="flex items-center justify-between">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={advancedParameters.preserveLuminance !== false}
                  onChange={(e) => handleAdvancedParamChange('preserveLuminance', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Preserve Luminance</span>
              </label>
              <span className="text-xs text-gray-500">
                {advancedParameters.preserveLuminance !== false ? 'On' : 'Off'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0">
              <InformationCircleIcon className="h-3 w-3 inline-block mr-1" />
              Maintains the perceived brightness when adjusting colors
            </p>
          </div>
        </div>
        
        {/* Color theory explanation */}
        <div>
          <div className="flex items-center text-blue-600 mb-2">
            <DocumentTextIcon className="h-5 w-5 mr-1" />
            <h3 className="text-lg font-medium">Color Models Explanation</h3>
          </div>
          <div className="bg-blue-50 p-4 rounded-md text-sm text-gray-800">
            <p className="mb-3">
              <strong>HSV</strong> (Hue, Saturation, Value) and <strong>HSL</strong> (Hue, Saturation, Lightness) 
              are alternative representations of the RGB color model, designed to be more intuitive:
            </p>
            <ul className="list-disc pl-5 mb-3 space-y-1">
              <li><strong>Hue</strong>: The color type (red, green, blue, etc.) represented as an angle (0-360°)</li>
              <li><strong>Saturation</strong>: The intensity or purity of the color (0-100%)</li>
              <li><strong>Value/Lightness</strong>: The brightness of the color (0-100%)</li>
            </ul>
            <p>
              Adjusting colors in these spaces often produces more natural-looking results than 
              directly manipulating RGB values.
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Render Histogram configuration
  const renderHistogramConfig = () => {
    return (
      <div className="space-y-6">
        {/* Basic parameters section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900">Basic Parameters</h3>
          <div className="mt-2 bg-gray-50 p-4 rounded-md">
            {editedTransformation.parameters.map(param => 
              <div key={param.name}>{renderParameterControl(param)}</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render Geometry configuration
  const renderGeometryConfig = () => {
    return (
      <div className="space-y-6">
        {/* Basic parameters section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900">Basic Parameters</h3>
          <div className="mt-2 bg-gray-50 p-4 rounded-md">
            {editedTransformation.parameters.map(param => 
              <div key={param.name}>{renderParameterControl(param)}</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render Morphology configuration
  const renderMorphologyConfig = () => {
    return (
      <div className="space-y-6">
        {/* Basic parameters section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900">Basic Parameters</h3>
          <div className="mt-2 bg-gray-50 p-4 rounded-md">
            {editedTransformation.parameters.map(param => 
              <div key={param.name}>{renderParameterControl(param)}</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render Canny configuration
  const renderCannyConfig = () => {
    return (
      <div className="space-y-6">
        {/* Basic parameters section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900">Basic Parameters</h3>
          <div className="mt-2 bg-gray-50 p-4 rounded-md">
            {editedTransformation.parameters.map(param => 
              <div key={param.name}>{renderParameterControl(param)}</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Pass the kernel state and updater function to CustomBlurConfigPanel
  const renderCustomBlurConfig = () => {
    return (
      <CustomBlurConfigPanel
        transformation={editedTransformation}
        parameters={editedTransformation.parameters}
        advancedParameters={advancedParameters}
        onParameterChange={handleParameterChange}
        onAdvancedParamChange={handleAdvancedParamChange}
        onKernelChange={handleKernelChange}
        kernelState={kernelState}
        renderParameterControl={renderParameterControl}
      />
    );
  };

  return (
    <>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={handleClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-200">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900"
                    >
                      Configure {editedTransformation.name}
                    </Dialog.Title>
                    <div className="flex space-x-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      onClick={onReset}
                    >
                      <ArrowPathIcon className="h-5 w-5 mr-1" />
                      Reset to Default
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      onClick={handleClose}
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="mt-2 text-gray-800">
                    <p className="text-sm text-gray-600 mb-4">
                      {editedTransformation.description}
                    </p>
                    
                    {renderConfigurationUI()}
                  </div>

                  {/* Footer */}
                  <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      onClick={handleClose}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      onClick={handleSave}
                    >
                      Save Configuration
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Discard Changes Warning */}
      <Transition appear show={showDiscardWarning} as={Fragment}>
        <Dialog as="div" className="relative z-20" onClose={cancelDiscard}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <div className="flex items-center mb-4">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                      <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" aria-hidden="true" />
                    </div>
                    <h3 className="ml-3 text-lg font-medium leading-6 text-gray-900">
                      Discard Changes?
                    </h3>
                  </div>
                  
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      You have unsaved changes. Are you sure you want to discard them?
                    </p>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      onClick={cancelDiscard}
                    >
                      Keep Editing
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      onClick={handleDiscard}
                    >
                      Discard Changes
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
} 