import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { ExclamationTriangleIcon, XMarkIcon, DocumentTextIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import type { Transformation, TransformationParameter } from '../../utils/types';

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
  // Create a deep copy of the transformation to work with
  const [localTransformation, setLocalTransformation] = useState<Transformation>({
    ...transformation,
    parameters: [...(transformation.parameters || [])].map(param => ({ ...param }))
  });

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
    setLocalTransformation({
      ...transformation,
      parameters: [...(transformation.parameters || [])].map(param => ({ ...param }))
    });
    
    // Initialize advanced parameters based on transformation type
    if (transformation.type === 'blur') {
      setAdvancedParameters({
        sigmaX: 0, // Standard deviation in X direction
        sigmaY: 0, // Standard deviation in Y direction (0 means same as sigmaX)
        borderType: 'BORDER_DEFAULT', // Border handling method
        kernelType: 'gaussian', // Type of kernel (gaussian, box, etc.)
        customKernel: null, // For custom kernel values
        useCustomKernel: false // Whether to use a custom kernel
      });
    }
    
    setHasChanges(false);
  }, [transformation]);

  // Handle parameter changes
  const handleParameterChange = (name: string, value: number | string | boolean) => {
    const updatedParams = localTransformation.parameters.map(param => 
      param.name === name ? validateParameter({ ...param, value }) : param
    );
    
    setLocalTransformation({
      ...localTransformation,
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

  // Save changes
  const handleSave = () => {
    // Create updated transformation with both basic and advanced parameters
    const updatedTransformation = {
      ...localTransformation,
      // Store advanced parameters in a special metadata field
      metadata: {
        ...localTransformation.metadata,
        advancedParameters: advancedParameters
      }
    };
    
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
      case 'blur':
        return renderGaussianBlurConfig();
      case 'sobel':
        return <div className="p-4 text-gray-500 italic">Advanced configuration for Sobel not yet implemented</div>;
      case 'laplacian':
        return <div className="p-4 text-gray-500 italic">Advanced configuration for Laplacian not yet implemented</div>;
      default:
        return <div className="p-4 text-gray-500 italic">No advanced configuration available for this transformation type</div>;
    }
  };

  // Render Gaussian blur specific configuration
  const renderGaussianBlurConfig = () => {
    const kernelSizeParam = localTransformation.parameters.find(p => p.name === 'kernelSize');
    
    return (
      <div className="space-y-6">
        {/* Basic parameters section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900">Basic Parameters</h3>
          <div className="mt-2 bg-gray-50 p-4 rounded-md">
            {kernelSizeParam && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Kernel Size
                  </label>
                  <span className="text-sm font-medium text-gray-600">{kernelSizeParam.value}</span>
                </div>
                <div className="mt-1">
                  <input
                    type="range"
                    min={kernelSizeParam.min || 1}
                    max={kernelSizeParam.max || 31}
                    step={kernelSizeParam.step || 2}
                    value={kernelSizeParam.value as number}
                    onChange={(e) => handleParameterChange(kernelSizeParam.name, Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
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
                <label className="block text-sm font-medium text-gray-700">
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
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
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
                <label className="block text-sm font-medium text-gray-700">
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
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Border Type
              </label>
              <select
                value={advancedParameters.borderType}
                onChange={(e) => handleAdvancedParamChange('borderType', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="BORDER_DEFAULT">Default (BORDER_DEFAULT)</option>
                <option value="BORDER_CONSTANT">Constant</option>
                <option value="BORDER_REPLICATE">Replicate</option>
                <option value="BORDER_REFLECT">Reflect</option>
                <option value="BORDER_WRAP">Wrap</option>
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
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="useCustomKernel" className="ml-2 block text-sm text-gray-900">
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
                        className="w-full p-1 text-center border border-gray-300 rounded text-xs"
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
          <div className="bg-blue-50 p-4 rounded-md text-sm text-gray-700">
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
                      className={`inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        hasChanges 
                          ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' 
                          : 'bg-blue-400 cursor-not-allowed'
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