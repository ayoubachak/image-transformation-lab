import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { ExclamationTriangleIcon, XMarkIcon, DocumentTextIcon, InformationCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import type { Transformation, TransformationParameter, KernelValue } from '../../utils/types';

interface TransformConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  transformation: Transformation;
  onSave: (updatedTransformation: Transformation) => void;
  onReset: () => void;
}

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
  
  // Clone the current kernel for custom blur editing
  const [kernelValues, setKernelValues] = useState<number[][]>(() => {
    const kernel = transformation.parameters?.find(p => p.name === 'customKernel')?.value as KernelValue;
    return kernel?.values || [
      [1/9, 1/9, 1/9],
      [1/9, 1/9, 1/9],
      [1/9, 1/9, 1/9]
    ];
  });
  
  const [kernelSize, setKernelSize] = useState({
    width: (transformation.parameters?.find(p => p.name === 'customKernel')?.value as KernelValue)?.width || 3,
    height: (transformation.parameters?.find(p => p.name === 'customKernel')?.value as KernelValue)?.height || 3
  });
  
  const [normalize, setNormalize] = useState(
    (transformation.parameters?.find(p => p.name === 'customKernel')?.value as KernelValue)?.normalize !== false
  );

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

  // Update when the source transformation changes
  useEffect(() => {
    setEditedTransformation({
      ...transformation,
      parameters: [...(transformation.parameters || [])].map(param => ({ ...param }))
    });
    
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
    setAdvancedParameters({
      ...advancedParameters,
      [name]: value
    });
    
    setHasChanges(true);
  };

  // Handle saving the configuration
  const handleSave = () => {
    // Update kernel values in the edited transformation
    const updatedTransformation = { ...editedTransformation };
    
    // Handle specific parameter updates based on transformation type
    if (transformation.type === 'customBlur') {
      // Find the customKernel parameter or create one if it doesn't exist
      const kernelParam = updatedTransformation.parameters.find(p => p.name === 'customKernel');
      
      if (transformation.parameters.find(p => p.name === 'kernelType')?.value === 'custom') {
        // For custom kernel type, we need to save the full kernel matrix
        const kernelData = {
          width: kernelSize.width,
          height: kernelSize.height,
          values: kernelValues,
          normalize
        };
        
        if (kernelParam) {
          // Update existing parameter
          kernelParam.value = kernelData;
        } else {
          // Add new parameter
          updatedTransformation.parameters.push({
            name: 'customKernel',
            type: 'kernel',
            value: kernelData
          });
        }
      } else if (advancedParameters.useCustomKernel && advancedParameters.customKernel) {
        // For Gaussian/Box with custom override
        // Store the custom kernel in advanced parameters
        advancedParameters.customKernelData = {
          values: advancedParameters.customKernel,
          normalize: true
        };
      }
    }
    
    // Add advanced parameters metadata for all transformation types that have them
    if (Object.keys(advancedParameters).length > 0) {
      updatedTransformation.metadata = {
        ...updatedTransformation.metadata,
        advancedParameters
      };
    }
    
    onSave(updatedTransformation);
    onClose();
  };

  // Handle close with unsaved changes
  const handleClose = () => {
    if (hasChanges) {
      setShowDiscardWarning(true);
    } else {
      onClose();
    }
  };

  // Handle discard of changes
  const handleDiscard = () => {
    setShowDiscardWarning(false);
    onReset();
    onClose();
  };

  // Cancel discard warning
  const cancelDiscard = () => {
    setShowDiscardWarning(false);
  };

  // Render configuration UI based on transformation type
  const renderConfigurationUI = () => {
    switch (transformation.type) {
      case 'laplacian':
      case 'sobel':
        return renderEdgeDetectionConfig();
      case 'canny':
        return renderCannyConfig();
      case 'blur':
        return renderGaussianBlurConfig();
      case 'customBlur':
        return renderCustomBlurConfig();
      case 'threshold':
      case 'adaptiveThreshold':
        return renderThresholdConfig();
      case 'colorAdjust':
        return renderColorAdjustConfig();
      case 'histogram':
        return renderHistogramConfig();
      case 'resize':
      case 'rotate':
      case 'perspective':
        return renderGeometryConfig();
      case 'dilate':
      case 'erode':
      case 'morphology':
        return renderMorphologyConfig();
      default:
        return (
          <div className="p-4">
            <p className="text-gray-700">No advanced configuration available for this transformation.</p>
          </div>
        );
    }
  };
  
  // Generic parameter control renderer
  const renderParameterControl = (param: TransformationParameter) => {
    switch (param.type) {
      case 'number':
        return (
          <div key={param.name} className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-800">
                {param.label || param.name}
              </label>
              <span className="text-sm font-medium text-gray-600">{String(param.value)}</span>
            </div>
            <div className="mt-1">
              <input
                type="range"
                min={param.min !== undefined ? param.min : 0}
                max={param.max !== undefined ? param.max : 100}
                step={param.step || 1}
                value={param.value as number}
                onChange={(e) => handleParameterChange(param.name, Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-gray-300"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{param.min !== undefined ? param.min : 0}</span>
                <span>{param.max !== undefined ? param.max : 100}</span>
              </div>
            </div>
            {param.description && (
              <p className="mt-1 text-xs text-gray-500">{param.description}</p>
            )}
          </div>
        );
      case 'select':
        return (
          <div key={param.name} className="mb-4">
            <label className="block text-sm font-medium text-gray-800 mb-1">
              {param.label || param.name}
            </label>
            <select
              value={param.value as string}
              onChange={(e) => handleParameterChange(param.name, e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {param.options?.map(option => (
                <option key={option} value={option} className="text-gray-900 bg-white">{option}</option>
              ))}
            </select>
            {param.description && (
              <p className="mt-1 text-xs text-gray-500">{param.description}</p>
            )}
          </div>
        );
      case 'boolean':
        return (
          <div key={param.name} className="mb-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id={`param-${param.name}`}
                checked={param.value as boolean}
                onChange={(e) => handleParameterChange(param.name, e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded bg-white"
              />
              <label htmlFor={`param-${param.name}`} className="ml-2 block text-sm text-gray-800">
                {param.label || param.name}
              </label>
            </div>
            {param.description && (
              <p className="mt-1 text-xs text-gray-500 ml-6">{param.description}</p>
            )}
          </div>
        );
      default:
        return (
          <div key={param.name} className="mb-4">
            <label className="block text-sm font-medium text-gray-800 mb-1">
              {param.label || param.name}
            </label>
            <p className="text-xs text-gray-500">
              Parameter type '{param.type}' rendering not implemented
            </p>
          </div>
        );
    }
  };

  // Edge detection configuration (Sobel & Laplacian)
  const renderEdgeDetectionConfig = () => {
    const kernelSizeParam = editedTransformation.parameters.find(p => p.name === 'kernelSize');
    
    return (
      <div className="space-y-6">
        {/* Basic parameters section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900">Basic Parameters</h3>
          <div className="mt-2 bg-gray-50 p-4 rounded-md">
            {kernelSizeParam && renderParameterControl(kernelSizeParam)}
          </div>
        </div>
        
        {/* Advanced parameters section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900">Advanced Parameters</h3>
          <div className="mt-2 bg-gray-50 p-4 rounded-md space-y-4">
            {/* Scale */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-800">
                  Scale Factor
                </label>
                <span className="text-sm font-medium text-gray-600">{advancedParameters.scale}</span>
              </div>
              <div className="mt-1">
                <input
                  type="range"
                  min={0.1}
                  max={10}
                  step={0.1}
                  value={advancedParameters.scale}
                  onChange={(e) => handleAdvancedParamChange('scale', Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-gray-300"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0.1</span>
                  <span>10</span>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500 flex items-center">
                <InformationCircleIcon className="h-3 w-3 mr-1" />
                Scale factor for the computed derivatives
              </p>
            </div>
            
            {/* Delta */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-800">
                  Delta
                </label>
                <span className="text-sm font-medium text-gray-600">{advancedParameters.delta}</span>
              </div>
              <div className="mt-1">
                <input
                  type="range"
                  min={-255}
                  max={255}
                  step={1}
                  value={advancedParameters.delta}
                  onChange={(e) => handleAdvancedParamChange('delta', Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>-255</span>
                  <span>255</span>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500 flex items-center">
                <InformationCircleIcon className="h-3 w-3 mr-1" />
                Value added to the results before storing them.
              </p>
            </div>
            
            {/* Border Type */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Border Type
              </label>
              <select
                value={advancedParameters.borderType}
                onChange={(e) => handleAdvancedParamChange('borderType', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="BORDER_DEFAULT" className="text-gray-900 bg-white">Default</option>
                <option value="BORDER_CONSTANT" className="text-gray-900 bg-white">Constant</option>
                <option value="BORDER_REPLICATE" className="text-gray-900 bg-white">Replicate</option>
                <option value="BORDER_REFLECT" className="text-gray-900 bg-white">Reflect</option>
                <option value="BORDER_WRAP" className="text-gray-900 bg-white">Wrap</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 flex items-center">
                <InformationCircleIcon className="h-3 w-3 mr-1" />
                Method for handling image borders
              </p>
            </div>
          </div>
        </div>
        
        {/* Documentation section */}
        <div>
          <div className="flex items-center text-blue-600 mb-2">
            <DocumentTextIcon className="h-5 w-5 mr-1" />
            <h3 className="text-lg font-medium">Documentation</h3>
          </div>
          <div className="bg-blue-50 p-4 rounded-md text-sm text-gray-800">
            <p className="mb-2">
              <strong>{transformation.type === 'sobel' ? 'Sobel' : 'Laplacian'} Edge Detection</strong> computes {transformation.type === 'sobel' ? 'first-order' : 'second-order'} derivatives of an image to find edges.
            </p>
            <p className="mb-2">
              <strong>Kernel Size:</strong> Controls the size of the operator. Must be odd number. Larger values produce smoother results.
            </p>
            <p className="mb-2">
              <strong>Scale Factor:</strong> Value by which the computed derivatives are multiplied.
            </p>
            <p className="mb-2">
              <strong>Delta:</strong> Value added to the results before storing them.
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Canny edge detection configuration
  const renderCannyConfig = () => {
    const threshold1Param = editedTransformation.parameters.find(p => p.name === 'threshold1');
    const threshold2Param = editedTransformation.parameters.find(p => p.name === 'threshold2');
    
    return (
      <div className="space-y-6">
        {/* Basic parameters section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900">Basic Parameters</h3>
          <div className="mt-2 bg-gray-50 p-4 rounded-md">
            {threshold1Param && renderParameterControl(threshold1Param)}
            {threshold2Param && renderParameterControl(threshold2Param)}
          </div>
        </div>
        
        {/* Advanced parameters section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900">Advanced Parameters</h3>
          <div className="mt-2 bg-gray-50 p-4 rounded-md space-y-4">
            {/* Aperture Size */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-800">
                  Aperture Size
                </label>
                <span className="text-sm font-medium text-gray-600">{advancedParameters.apertureSize}</span>
              </div>
              <div className="mt-1">
                <input
                  type="range"
                  min={3}
                  max={7}
                  step={2}
                  value={advancedParameters.apertureSize}
                  onChange={(e) => handleAdvancedParamChange('apertureSize', Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>3</span>
                  <span>7</span>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500 flex items-center">
                <InformationCircleIcon className="h-3 w-3 mr-1" />
                Aperture size for the Sobel operator
              </p>
            </div>
            
            {/* L2 Gradient */}
            <div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="l2gradient"
                  checked={advancedParameters.l2gradient}
                  onChange={(e) => handleAdvancedParamChange('l2gradient', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded bg-white"
                />
                <label htmlFor="l2gradient" className="ml-2 block text-sm text-gray-800">
                  Use L2 Gradient
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-500 ml-6 flex items-center">
                <InformationCircleIcon className="h-3 w-3 mr-1" />
                Use more accurate L2 norm for gradient calculation (slower)
              </p>
            </div>
          </div>
        </div>
        
        {/* Documentation section */}
        <div>
          <div className="flex items-center text-blue-600 mb-2">
            <DocumentTextIcon className="h-5 w-5 mr-1" />
            <h3 className="text-lg font-medium">Documentation</h3>
          </div>
          <div className="bg-blue-50 p-4 rounded-md text-sm text-gray-800">
            <p className="mb-2">
              <strong>Canny Edge Detection</strong> finds edges by looking for the maximum gradient values.
            </p>
            <p className="mb-2">
              <strong>Threshold1:</strong> Lower threshold for the hysteresis procedure.
            </p>
            <p className="mb-2">
              <strong>Threshold2:</strong> Upper threshold for the hysteresis procedure.
            </p>
            <p className="mb-2">
              <strong>Aperture Size:</strong> Size of the Sobel operator used to calculate the image gradient.
            </p>
            <p className="mb-2">
              <strong>L2 Gradient:</strong> When enabled, uses more accurate L2 norm for gradient calculation (slower).
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Render Gaussian blur specific configuration
  const renderGaussianBlurConfig = () => {
    const kernelSizeParam = editedTransformation.parameters.find(p => p.name === 'kernelSize');
    
    return (
      <div className="space-y-6">
        {/* Basic parameters section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900">Basic Parameters</h3>
          <div className="mt-2 bg-gray-50 p-4 rounded-md">
            {kernelSizeParam && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-800">
                    Kernel Size
                  </label>
                  <span className="text-sm font-medium text-gray-600">{kernelSizeParam ? String(kernelSizeParam.value) : ''}</span>
                </div>
                <div className="mt-1">
                  <input
                    type="range"
                    min={kernelSizeParam.min || 1}
                    max={kernelSizeParam.max || 31}
                    step={kernelSizeParam.step || 2}
                    value={kernelSizeParam.value as number}
                    onChange={(e) => handleParameterChange(kernelSizeParam.name, Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-gray-300"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{kernelSizeParam.min}</span>
                    <span>{kernelSizeParam.max}</span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-amber-600 flex items-center">
                  <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                  Changing this value will reset advanced configuration
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Advanced parameters section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900">Advanced Parameters</h3>
          <div className="mt-2 bg-gray-50 p-4 rounded-md space-y-4">
            {/* Sigma X */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-800">
                  Sigma X
                </label>
                <span className="text-sm font-medium text-gray-600">{advancedParameters.sigmaX}</span>
              </div>
              <div className="mt-1">
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={0.1}
                  value={advancedParameters.sigmaX}
                  onChange={(e) => handleAdvancedParamChange('sigmaX', Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-gray-300"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0 (Auto)</span>
                  <span>10</span>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500 flex items-center">
                <InformationCircleIcon className="h-3 w-3 mr-1" />
                Standard deviation in X direction (0 = auto-calculated based on kernel size)
              </p>
            </div>
            
            {/* Sigma Y */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-800">
                  Sigma Y
                </label>
                <span className="text-sm font-medium text-gray-600">{advancedParameters.sigmaY}</span>
              </div>
              <div className="mt-1">
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={0.1}
                  value={advancedParameters.sigmaY}
                  onChange={(e) => handleAdvancedParamChange('sigmaY', Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-gray-300"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0 (Same as X)</span>
                  <span>10</span>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500 flex items-center">
                <InformationCircleIcon className="h-3 w-3 mr-1" />
                Standard deviation in Y direction (0 = same as sigmaX)
              </p>
            </div>
            
            {/* Border Type */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Border Type
              </label>
              <select
                value={advancedParameters.borderType}
                onChange={(e) => handleAdvancedParamChange('borderType', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="BORDER_DEFAULT" className="text-gray-900 bg-white">Default</option>
                <option value="BORDER_CONSTANT" className="text-gray-900 bg-white">Constant</option>
                <option value="BORDER_REPLICATE" className="text-gray-900 bg-white">Replicate</option>
                <option value="BORDER_REFLECT" className="text-gray-900 bg-white">Reflect</option>
                <option value="BORDER_WRAP" className="text-gray-900 bg-white">Wrap</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 flex items-center">
                <InformationCircleIcon className="h-3 w-3 mr-1" />
                Method for handling image borders
              </p>
            </div>
            
            {/* Custom Kernel options */}
            <div>
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="useCustomKernel"
                  checked={advancedParameters.useCustomKernel}
                  onChange={(e) => handleAdvancedParamChange('useCustomKernel', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded bg-white"
                />
                <label htmlFor="useCustomKernel" className="ml-2 block text-sm text-gray-800">
                  Use Custom Kernel
                </label>
              </div>
              
              {advancedParameters.useCustomKernel && (
                <div className="mt-2 p-3 border border-gray-200 rounded-md">
                  <p className="text-sm text-gray-700 mb-2">Define custom kernel matrix:</p>
                  {/* Simple 3x3 matrix editor for demo purposes */}
                  <div className="grid grid-cols-3 gap-1">
                    {[...Array(9)].map((_, i) => (
                      <input
                        key={i}
                        type="number"
                        className="w-16 p-1 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        defaultValue={(i === 4) ? 1 : 0} // Center value defaults to 1
                        onChange={(e) => {
                          const newKernel = advancedParameters.customKernel || Array(9).fill(0);
                          newKernel[i] = parseFloat(e.target.value);
                          handleAdvancedParamChange('customKernel', newKernel);
                        }}
                      />
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-500 flex items-center">
                    <InformationCircleIcon className="h-3 w-3 mr-1" />
                    Values should sum to 1 for proper normalization
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Documentation section */}
        <div>
          <div className="flex items-center text-blue-600 mb-2">
            <DocumentTextIcon className="h-5 w-5 mr-1" />
            <h3 className="text-lg font-medium">Documentation</h3>
          </div>
          <div className="bg-blue-50 p-4 rounded-md text-sm text-gray-800">
            <p className="mb-2">
              <strong>Gaussian Blur</strong> applies a blur effect by convolving the image with a Gaussian function.
            </p>
            <p className="mb-2">
              <strong>Kernel Size:</strong> Controls the blur intensity. Must be odd number. Larger values give stronger blur.
            </p>
            <p className="mb-2">
              <strong>Sigma:</strong> Standard deviation of the Gaussian kernel. Controls how weight decreases from center.
              Setting to 0 will auto-calculate based on kernel size.
            </p>
            <p>
              <strong>Border Type:</strong> Specifies how to handle pixels near the image boundaries.
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Custom Blur configuration
  const renderCustomBlurConfig = () => {
    const kernelTypeParam = editedTransformation.parameters.find(p => p.name === 'kernelType');
    const kernelSizeParam = editedTransformation.parameters.find(p => p.name === 'kernelSize');
    const customKernelParam = editedTransformation.parameters.find(p => p.name === 'customKernel');
    const isCustomKernelType = kernelTypeParam?.value === 'custom';
    
    // If kernel type changes to/from custom, update the UI state
    useEffect(() => {
      // Initialize kernel values from existing custom kernel parameter if available
      if (isCustomKernelType && customKernelParam) {
        const kernel = customKernelParam.value as KernelValue;
        if (kernel && kernel.values) {
          setKernelValues(kernel.values);
          setKernelSize({
            width: kernel.width || 3,
            height: kernel.height || 3
          });
          setNormalize(kernel.normalize !== false);
        }
      }
    }, [isCustomKernelType]);
    
    return (
      <div className="space-y-6">
        {/* Basic parameters section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900">Basic Parameters</h3>
          <div className="mt-2 bg-gray-50 p-4 rounded-md">
            {kernelTypeParam && renderParameterControl(kernelTypeParam)}
            {kernelSizeParam && !isCustomKernelType && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-800">
                    Kernel Size
                  </label>
                  <span className="text-sm font-medium text-gray-600">{kernelSizeParam ? String(kernelSizeParam.value) : ''}</span>
                </div>
                <div className="mt-1">
                  <input
                    type="range"
                    min={kernelSizeParam.min || 1}
                    max={kernelSizeParam.max || 31}
                    step={kernelSizeParam.step || 2}
                    value={kernelSizeParam.value as number}
                    onChange={(e) => handleParameterChange(kernelSizeParam.name, Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-gray-300"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{kernelSizeParam.min}</span>
                    <span>{kernelSizeParam.max}</span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-amber-600 flex items-center">
                  <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                  Changing this value will reset advanced configuration
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Advanced parameters section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900">Advanced Parameters</h3>
          <div className="mt-2 bg-gray-50 p-4 rounded-md space-y-4">
            {/* Border Type */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Border Type
              </label>
              <select
                value={advancedParameters.borderType || 'reflect'}
                onChange={(e) => handleAdvancedParamChange('borderType', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="constant" className="text-gray-900 bg-white">Constant</option>
                <option value="reflect" className="text-gray-900 bg-white">Reflect</option>
                <option value="replicate" className="text-gray-900 bg-white">Replicate</option>
                <option value="wrap" className="text-gray-900 bg-white">Wrap</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 flex items-center">
                <InformationCircleIcon className="h-3 w-3 mr-1" />
                Method for handling pixels at the border of the image
              </p>
            </div>
            
            {/* Gaussian specific parameters */}
            {kernelTypeParam?.value === 'gaussian' && (
              <>
                {/* Sigma X */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-800">
                      Sigma X
                    </label>
                    <span className="text-sm font-medium text-gray-600">{advancedParameters.sigmaX || 0}</span>
                  </div>
                  <div className="mt-1">
                    <input
                      type="range"
                      min={0}
                      max={20}
                      step={0.1}
                      value={advancedParameters.sigmaX || 0}
                      onChange={(e) => handleAdvancedParamChange('sigmaX', Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-gray-300"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0 (Auto)</span>
                      <span>20</span>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 flex items-center">
                    <InformationCircleIcon className="h-3 w-3 mr-1" />
                    Standard deviation in X direction (0 = auto-calculated based on kernel size)
                  </p>
                </div>
                
                {/* Sigma Y */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-800">
                      Sigma Y
                    </label>
                    <span className="text-sm font-medium text-gray-600">{advancedParameters.sigmaY || 0}</span>
                  </div>
                  <div className="mt-1">
                    <input
                      type="range"
                      min={0}
                      max={20}
                      step={0.1}
                      value={advancedParameters.sigmaY || 0}
                      onChange={(e) => handleAdvancedParamChange('sigmaY', Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-gray-300"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0 (Same as X)</span>
                      <span>20</span>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 flex items-center">
                    <InformationCircleIcon className="h-3 w-3 mr-1" />
                    Standard deviation in Y direction (0 = same as sigmaX)
                  </p>
                </div>
              </>
            )}
            
            {/* Custom Kernel section */}
            {isCustomKernelType && (
              <>
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center mb-2">
                    <h4 className="text-sm font-medium text-gray-800">Custom Kernel Editor</h4>
                  </div>
                  {renderKernelEditor()}
                </div>
              </>
            )}
            
            {/* Additional options for standard kernels */}
            {!isCustomKernelType && (
              <div>
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="useCustomKernel"
                    checked={advancedParameters.useCustomKernel || false}
                    onChange={(e) => handleAdvancedParamChange('useCustomKernel', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded bg-white"
                  />
                  <label htmlFor="useCustomKernel" className="ml-2 block text-sm text-gray-800">
                    Override with Custom Kernel
                  </label>
                </div>
                
                {advancedParameters.useCustomKernel && (
                  <div className="mt-2 p-3 border border-gray-200 rounded-md">
                    <p className="text-sm text-gray-700 mb-2">Define custom kernel matrix:</p>
                    {/* Simple 3x3 matrix editor for demo purposes */}
                    <div className="grid grid-cols-3 gap-1">
                      {[...Array(9)].map((_, i) => (
                        <input
                          key={i}
                          type="number"
                          className="w-16 p-1 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          defaultValue={(i === 4) ? 1 : 0} // Center value defaults to 1
                          onChange={(e) => {
                            const newKernel = advancedParameters.customKernel || Array(9).fill(0);
                            newKernel[i] = parseFloat(e.target.value);
                            handleAdvancedParamChange('customKernel', newKernel);
                          }}
                        />
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-gray-500 flex items-center">
                      <InformationCircleIcon className="h-3 w-3 mr-1" />
                      Values should sum to 1 for proper normalization
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Documentation section */}
        <div>
          <div className="flex items-center text-blue-600 mb-2">
            <DocumentTextIcon className="h-5 w-5 mr-1" />
            <h3 className="text-lg font-medium">Documentation</h3>
          </div>
          <div className="bg-blue-50 p-4 rounded-md text-sm text-gray-800">
            <p className="mb-2">
              <strong>Custom Blur</strong> provides advanced control over image blurring with different kernel types and customization options.
            </p>
            <p className="mb-2">
              <strong>Kernel Type:</strong> 
              <ul className="list-disc ml-5 mt-1">
                <li>Box - Simple averaging kernel for uniform blurring</li>
                <li>Gaussian - Bell-shaped kernel, more natural blurring</li>
                <li>Custom - Design your own convolution kernel</li>
              </ul>
            </p>
            <p className="mb-2">
              <strong>Kernel Size:</strong> Controls the blur intensity. Must be odd number. Larger values give stronger blur.
            </p>
            <p className="mb-2">
              <strong>Border Type:</strong> Specifies how to handle pixels near the image boundaries.
            </p>
            {kernelTypeParam?.value === 'gaussian' && (
              <p className="mb-2">
                <strong>Sigma:</strong> Standard deviation of the Gaussian kernel. Controls how weight decreases from center.
                Setting to 0 will auto-calculate based on kernel size.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render custom kernel editor
  const renderKernelEditor = () => {
    return (
      <div className="mt-4">
        <h3 className="text-sm font-medium text-gray-800 mb-2">Custom Kernel</h3>
        
        <div className="flex items-center space-x-4 mb-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Width</label>
            <input
              type="number"
              min="1"
              max="9"
              value={kernelSize.width}
              onChange={(e) => setKernelSize({ ...kernelSize, width: parseInt(e.target.value) || 3 })}
              className="w-16 p-1 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Height</label>
            <input
              type="number"
              min="1"
              max="9"
              value={kernelSize.height}
              onChange={(e) => setKernelSize({ ...kernelSize, height: parseInt(e.target.value) || 3 })}
              className="w-16 p-1 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => setKernelValues([
              [1/9, 1/9, 1/9],
              [1/9, 1/9, 1/9],
              [1/9, 1/9, 1/9]
            ])}
            className="px-2 py-1 bg-gray-100 text-gray-800 rounded-md text-xs hover:bg-gray-200 border border-gray-300"
          >
            Box Blur
          </button>
          <button
            onClick={() => setKernelValues([
              [0.0625, 0.125, 0.0625],
              [0.125, 0.25, 0.125],
              [0.0625, 0.125, 0.0625]
            ])}
            className="mt-4 px-2 py-1 bg-gray-100 text-gray-800 rounded-md text-xs hover:bg-gray-200 border border-gray-300"
          >
            Gaussian
          </button>
          <button
            onClick={() => setKernelValues([
              [-1, -1, -1],
              [-1, 9, -1],
              [-1, -1, -1]
            ])}
            className="mt-4 px-2 py-1 bg-gray-100 text-gray-800 rounded-md text-xs hover:bg-gray-200 border border-gray-300"
          >
            Sharpen
          </button>
          <button
            onClick={() => setKernelValues([
              [-1, -1, -1],
              [-1, 8, -1],
              [-1, -1, -1]
            ])}
            className="mt-4 px-2 py-1 bg-gray-100 text-gray-800 rounded-md text-xs hover:bg-gray-200 border border-gray-300"
          >
            Edge Detect
          </button>
        </div>
        
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
                        className="w-16 p-1 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                  ))}
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
            onChange={(e) => setNormalize(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded bg-white"
          />
          <label htmlFor="normalize-kernel" className="ml-2 text-sm text-gray-800">
            Normalize kernel (sum to 1)
          </label>
        </div>
        
        <div className="mt-4">
          <h4 className="text-xs font-medium text-gray-500 mb-1">Presets</h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setKernelValues([
                [1/9, 1/9, 1/9],
                [1/9, 1/9, 1/9],
                [1/9, 1/9, 1/9]
              ])}
              className="px-2 py-1 bg-gray-100 text-gray-800 rounded-md text-xs hover:bg-gray-200 border border-gray-300"
            >
              Box Blur
            </button>
            <button
              onClick={() => setKernelValues([
                [0.0625, 0.125, 0.0625],
                [0.125, 0.25, 0.125],
                [0.0625, 0.125, 0.0625]
              ])}
              className="px-2 py-1 bg-gray-100 text-gray-800 rounded-md text-xs hover:bg-gray-200 border border-gray-300"
            >
              Gaussian
            </button>
            <button
              onClick={() => setKernelValues([
                [-1, -1, -1],
                [-1, 9, -1],
                [-1, -1, -1]
              ])}
              className="px-2 py-1 bg-gray-100 text-gray-800 rounded-md text-xs hover:bg-gray-200 border border-gray-300"
            >
              Sharpen
            </button>
            <button
              onClick={() => setKernelValues([
                [-1, -1, -1],
                [-1, 8, -1],
                [-1, -1, -1]
              ])}
              className="px-2 py-1 bg-gray-100 text-gray-800 rounded-md text-xs hover:bg-gray-200 border border-gray-300"
            >
              Edge Detect
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Handle changing kernel value
  const handleKernelValueChange = (row: number, col: number, value: number) => {
    const newValues = [...kernelValues];
    newValues[row][col] = value;
    setKernelValues(newValues);
  };

  // Threshold configuration
  const renderThresholdConfig = () => {
    const thresholdParam = editedTransformation.parameters.find(
      p => p.name === 'threshold' || p.name === 'threshold1'
    );
    const blockSizeParam = editedTransformation.parameters.find(p => p.name === 'blockSize');
    const cParam = editedTransformation.parameters.find(p => p.name === 'c');
    const methodParam = editedTransformation.parameters.find(p => p.name === 'method');
    
    const isAdaptive = transformation.type === 'adaptiveThreshold';
    
    return (
      <div className="space-y-6">
        {/* Basic parameters section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900">Parameters</h3>
          <div className="mt-2 bg-gray-50 p-4 rounded-md">
            {thresholdParam && renderParameterControl(thresholdParam)}
            {methodParam && renderParameterControl(methodParam)}
            {blockSizeParam && renderParameterControl(blockSizeParam)}
            {cParam && renderParameterControl(cParam)}
          </div>
        </div>
        
        {/* Documentation section */}
        <div>
          <div className="flex items-center text-blue-600 mb-2">
            <DocumentTextIcon className="h-5 w-5 mr-1" />
            <h3 className="text-lg font-medium">Documentation</h3>
          </div>
          <div className="bg-blue-50 p-4 rounded-md text-sm text-gray-800">
            <p className="mb-2">
              <strong>{isAdaptive ? 'Adaptive Threshold' : 'Threshold'}</strong> separates pixels into two classes (foreground/background).
            </p>
            
            {isAdaptive ? (
              <>
                <p className="mb-2">
                  <strong>Method:</strong> The method to calculate the threshold for each pixel (mean or gaussian).
                </p>
                <p className="mb-2">
                  <strong>Block Size:</strong> Size of the pixel neighborhood used to calculate the threshold.
                </p>
                <p>
                  <strong>C:</strong> Constant subtracted from the mean or weighted mean.
                </p>
              </>
            ) : (
              <p>
                <strong>Threshold:</strong> Global threshold value. Pixels with intensity greater than the threshold become white, those less than or equal become black.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Color adjustment configuration
  const renderColorAdjustConfig = () => {
    const brightnessParam = editedTransformation.parameters.find(p => p.name === 'brightness');
    const contrastParam = editedTransformation.parameters.find(p => p.name === 'contrast');
    const saturationParam = editedTransformation.parameters.find(p => p.name === 'saturation');
    const hueParam = editedTransformation.parameters.find(p => p.name === 'hue');
    
    return (
      <div className="space-y-6">
        {/* Basic parameters section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900">Basic Parameters</h3>
          <div className="mt-2 bg-gray-50 p-4 rounded-md">
            {brightnessParam && renderParameterControl(brightnessParam)}
            {contrastParam && renderParameterControl(contrastParam)}
            {saturationParam && renderParameterControl(saturationParam)}
            {hueParam && renderParameterControl(hueParam)}
          </div>
        </div>
        
        {/* Advanced parameters section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900">Advanced Parameters</h3>
          <div className="mt-2 bg-gray-50 p-4 rounded-md space-y-4">
            {/* Color Method */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Color Adjustment Method
              </label>
              <select
                value={advancedParameters.method}
                onChange={(e) => handleAdvancedParamChange('method', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="hsv">HSV (Hue, Saturation, Value)</option>
                <option value="rgb">RGB (Red, Green, Blue)</option>
                <option value="lab">LAB (Lightness, a*, b*)</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 flex items-center">
                <InformationCircleIcon className="h-3 w-3 mr-1" />
                Color space used for adjustments
              </p>
            </div>
            
            {/* Preserve Luminance */}
            <div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="preserveLuminance"
                  checked={advancedParameters.preserveLuminance}
                  onChange={(e) => handleAdvancedParamChange('preserveLuminance', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded bg-white"
                />
                <label htmlFor="preserveLuminance" className="ml-2 block text-sm text-gray-800">
                  Preserve Luminance
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-500 ml-6 flex items-center">
                <InformationCircleIcon className="h-3 w-3 mr-1" />
                Maintain perceived brightness when adjusting colors
              </p>
            </div>
          </div>
        </div>
        
        {/* Documentation section */}
        <div>
          <div className="flex items-center text-blue-600 mb-2">
            <DocumentTextIcon className="h-5 w-5 mr-1" />
            <h3 className="text-lg font-medium">Documentation</h3>
          </div>
          <div className="bg-blue-50 p-4 rounded-md text-sm text-gray-800">
            <p className="mb-2">
              <strong>Color Adjustment</strong> modifies color properties of the image.
            </p>
            <p className="mb-2">
              <strong>Brightness:</strong> Adjusts the overall lightness or darkness.
            </p>
            <p className="mb-2">
              <strong>Contrast:</strong> Enhances or reduces the difference between light and dark areas.
            </p>
            <p className="mb-2">
              <strong>Saturation:</strong> Modifies the intensity of colors (0 = grayscale).
            </p>
            <p>
              <strong>Hue:</strong> Shifts the color spectrum, measured in degrees around the color wheel.
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Histogram equalization configuration
  const renderHistogramConfig = () => {
    const methodParam = editedTransformation.parameters.find(p => p.name === 'method');
    const clipLimitParam = editedTransformation.parameters.find(p => p.name === 'clipLimit');
    
    return (
      <div className="space-y-6">
        {/* Basic parameters section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900">Basic Parameters</h3>
          <div className="mt-2 bg-gray-50 p-4 rounded-md">
            {methodParam && renderParameterControl(methodParam)}
            {clipLimitParam && renderParameterControl(clipLimitParam)}
          </div>
        </div>
        
        {/* Advanced parameters section - CLAHE Only */}
        {methodParam?.value === 'adaptive' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900">Advanced Parameters</h3>
            <div className="mt-2 bg-gray-50 p-4 rounded-md space-y-4">
              {/* Tile Grid Size */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  Tile Grid Size
                </label>
                <div className="flex items-center space-x-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Width</label>
                    <input
                      type="number"
                      min={2}
                      max={16}
                      value={advancedParameters.tileGridSize?.width || 8}
                      onChange={(e) => handleAdvancedParamChange('tileGridSize', {
                        ...advancedParameters.tileGridSize,
                        width: parseInt(e.target.value) || 8
                      })}
                      className="w-16 p-1 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Height</label>
                    <input
                      type="number"
                      min={2}
                      max={16}
                      value={advancedParameters.tileGridSize?.height || 8}
                      onChange={(e) => handleAdvancedParamChange('tileGridSize', {
                        ...advancedParameters.tileGridSize,
                        height: parseInt(e.target.value) || 8
                      })}
                      className="w-16 p-1 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500 flex items-center">
                  <InformationCircleIcon className="h-3 w-3 mr-1" />
                  Size of grid for histogram equalization in CLAHE
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Documentation section */}
        <div>
          <div className="flex items-center text-blue-600 mb-2">
            <DocumentTextIcon className="h-5 w-5 mr-1" />
            <h3 className="text-lg font-medium">Documentation</h3>
          </div>
          <div className="bg-blue-50 p-4 rounded-md text-sm text-gray-800">
            <p className="mb-2">
              <strong>Histogram Equalization</strong> enhances image contrast by redistributing intensity values.
            </p>
            <p className="mb-2">
              <strong>Method:</strong> Global applies to entire image, Adaptive (CLAHE) processes local regions independently.
            </p>
            {methodParam?.value === 'adaptive' && (
              <>
                <p className="mb-2">
                  <strong>Clip Limit:</strong> Limits contrast enhancement in CLAHE to reduce noise amplification.
                </p>
                <p>
                  <strong>Tile Grid Size:</strong> Divides the image into tiles for local histogram equalization.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Geometry transformations configuration (rotate, resize, perspective)
  const renderGeometryConfig = () => {
    // Get common parameters
    const interpolationParam = editedTransformation.parameters.find(p => p.name === 'interpolation');
    const borderModeParam = editedTransformation.parameters.find(p => p.name === 'borderMode');
    
    // Rotation specific parameters
    const angleParam = editedTransformation.parameters.find(p => p.name === 'angle');
    const scaleParam = editedTransformation.parameters.find(p => p.name === 'scale');
    
    // Resize specific parameters
    const methodParam = editedTransformation.parameters.find(p => p.name === 'method');
    const scaleXParam = editedTransformation.parameters.find(p => p.name === 'scaleX');
    const scaleYParam = editedTransformation.parameters.find(p => p.name === 'scaleY');
    const widthParam = editedTransformation.parameters.find(p => p.name === 'width');
    const heightParam = editedTransformation.parameters.find(p => p.name === 'height');
    
    return (
      <div className="space-y-6">
        {/* Basic parameters section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900">Basic Parameters</h3>
          <div className="mt-2 bg-gray-50 p-4 rounded-md">
            {/* Common params for all geometry transforms */}
            {interpolationParam && renderParameterControl(interpolationParam)}
            {borderModeParam && renderParameterControl(borderModeParam)}
            
            {/* Rotation specific params */}
            {angleParam && renderParameterControl(angleParam)}
            {scaleParam && renderParameterControl(scaleParam)}
            
            {/* Resize specific params */}
            {methodParam && renderParameterControl(methodParam)}
            {scaleXParam && methodParam?.value === 'scale' && renderParameterControl(scaleXParam)}
            {scaleYParam && methodParam?.value === 'scale' && renderParameterControl(scaleYParam)}
            {widthParam && methodParam?.value === 'dimensions' && renderParameterControl(widthParam)}
            {heightParam && methodParam?.value === 'dimensions' && renderParameterControl(heightParam)}
          </div>
        </div>
        
        {/* Documentation section */}
        <div>
          <div className="flex items-center text-blue-600 mb-2">
            <DocumentTextIcon className="h-5 w-5 mr-1" />
            <h3 className="text-lg font-medium">Documentation</h3>
          </div>
          <div className="bg-blue-50 p-4 rounded-md text-sm text-gray-800">
            <p className="mb-2">
              <strong>{transformation.name}</strong> transforms the geometric properties of the image.
            </p>
            
            {transformation.type === 'rotate' && (
              <>
                <p className="mb-2">
                  <strong>Angle:</strong> Rotation angle in degrees (positive = counterclockwise).
                </p>
                <p className="mb-2">
                  <strong>Scale:</strong> Scale factor applied during rotation (1.0 = no scaling).
                </p>
              </>
            )}
            
            {transformation.type === 'resize' && (
              <>
                <p className="mb-2">
                  <strong>Method:</strong> Resize by scale factor or specific dimensions.
                </p>
                {methodParam?.value === 'scale' ? (
                  <p className="mb-2">
                    <strong>Scale X/Y:</strong> Percentage to scale the image (100% = no change).
                  </p>
                ) : (
                  <p className="mb-2">
                    <strong>Width/Height:</strong> Target dimensions in pixels.
                  </p>
                )}
              </>
            )}
            
            <p className="mb-2">
              <strong>Interpolation:</strong> Method for calculating pixel values (nearest = fastest, cubic = highest quality).
            </p>
            <p>
              <strong>Border Mode:</strong> How to handle pixels outside the original image boundaries.
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Morphology operations configuration
  const renderMorphologyConfig = () => {
    const kernelSizeParam = editedTransformation.parameters.find(p => p.name === 'kernelSize');
    const iterationsParam = editedTransformation.parameters.find(p => p.name === 'iterations');
    const operationParam = editedTransformation.parameters.find(p => p.name === 'operation');
    
    return (
      <div className="space-y-6">
        {/* Basic parameters section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900">Basic Parameters</h3>
          <div className="mt-2 bg-gray-50 p-4 rounded-md">
            {operationParam && renderParameterControl(operationParam)}
            {kernelSizeParam && renderParameterControl(kernelSizeParam)}
            {iterationsParam && renderParameterControl(iterationsParam)}
          </div>
        </div>
        
        {/* Advanced parameters section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900">Advanced Parameters</h3>
          <div className="mt-2 bg-gray-50 p-4 rounded-md space-y-4">
            {/* Shape */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Kernel Shape
              </label>
              <select
                value={advancedParameters.shape}
                onChange={(e) => handleAdvancedParamChange('shape', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="rect">Rectangle</option>
                <option value="cross">Cross</option>
                <option value="ellipse">Ellipse</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 flex items-center">
                <InformationCircleIcon className="h-3 w-3 mr-1" />
                Shape of the structuring element
              </p>
            </div>
            
            {/* Border Type */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Border Type
              </label>
              <select
                value={advancedParameters.borderType}
                onChange={(e) => handleAdvancedParamChange('borderType', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="BORDER_DEFAULT" className="text-gray-900 bg-white">Default</option>
                <option value="BORDER_CONSTANT" className="text-gray-900 bg-white">Constant</option>
                <option value="BORDER_REPLICATE" className="text-gray-900 bg-white">Replicate</option>
                <option value="BORDER_REFLECT" className="text-gray-900 bg-white">Reflect</option>
                <option value="BORDER_WRAP" className="text-gray-900 bg-white">Wrap</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 flex items-center">
                <InformationCircleIcon className="h-3 w-3 mr-1" />
                Method for handling image borders
              </p>
            </div>
          </div>
        </div>
        
        {/* Documentation section */}
        <div>
          <div className="flex items-center text-blue-600 mb-2">
            <DocumentTextIcon className="h-5 w-5 mr-1" />
            <h3 className="text-lg font-medium">Documentation</h3>
          </div>
          <div className="bg-blue-50 p-4 rounded-md text-sm text-gray-800">
            <p className="mb-2">
              <strong>{transformation.type === 'morphology' ? 'Morphological Operation' : (transformation.type === 'dilate' ? 'Dilation' : 'Erosion')}</strong> applies mathematical morphology to the image.
            </p>
            
            {transformation.type === 'morphology' && (
              <p className="mb-2">
                <strong>Operation:</strong> The type of morphological operation to perform.
              </p>
            )}
            
            <p className="mb-2">
              <strong>Kernel Size:</strong> Size of the structuring element (larger = more pronounced effect).
            </p>
            <p className="mb-2">
              <strong>Iterations:</strong> Number of times to apply the operation (more iterations = stronger effect).
            </p>
            <p className="mb-2">
              <strong>Kernel Shape:</strong> Shape of the structuring element that defines how the operation is applied.
            </p>
            
            {transformation.type === 'dilate' && (
              <p>Dilation expands bright regions and can be used to join broken parts or remove small dark spots.</p>
            )}
            
            {transformation.type === 'erode' && (
              <p>Erosion shrinks bright regions and can be used to remove small bright spots or separate connected objects.</p>
            )}
            
            {transformation.type === 'morphology' && (
              <div>
                <p className="mt-2"><strong>Available operations:</strong></p>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>Open: Erosion followed by dilation - removes small objects</li>
                  <li>Close: Dilation followed by erosion - fills small holes</li>
                  <li>Gradient: Dilation minus erosion - outlines objects</li>
                  <li>Tophat: Original minus opening - extracts small elements</li>
                  <li>Blackhat: Closing minus original - finds dark spots</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Main Configuration Modal */}
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={handleClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-white/30 backdrop-blur-sm" />
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
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <div className="flex justify-between items-center mb-4">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                      {transformation.name} Configuration
                    </Dialog.Title>
                    <button
                      type="button"
                      className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                      onClick={handleClose}
                    >
                      <span className="sr-only">Close</span>
                      <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>
                  
                  <div className="mt-2 max-h-[70vh] overflow-y-auto pr-2">
                    {renderConfigurationUI()}
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      onClick={handleClose}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className={`inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        hasChanges 
                          ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white' 
                          : 'bg-blue-300 text-gray-100 cursor-not-allowed'
                      }`}
                      onClick={handleSave}
                      disabled={!hasChanges}
                    >
                      Save Changes
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Discard changes warning modal */}
      <Transition appear show={showDiscardWarning} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={cancelDiscard}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-white/30 backdrop-blur-sm" />
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
                    <Dialog.Title as="h3" className="ml-3 text-lg font-medium leading-6 text-gray-900">
                      Discard changes?
                    </Dialog.Title>
                  </div>
                  
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      You have unsaved changes. Are you sure you want to discard them?
                    </p>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                      onClick={cancelDiscard}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none"
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