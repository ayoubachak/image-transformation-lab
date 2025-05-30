import { useEffect, useState, useRef, useCallback } from 'react';
import { Position } from 'reactflow';
import { usePipeline } from '../../contexts/PipelineContext';
import { processImage } from '../../utils/imageProcessing';
import type { Transformation, TransformationParameter, ParameterType, KernelValue } from '../../utils/types';
import { AdjustmentsHorizontalIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon, ExclamationTriangleIcon, InformationCircleIcon, EyeIcon, EyeSlashIcon, SparklesIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import type { IntermediateResult } from '../../utils/imageProcessing';
import BaseNode from './BaseNode';
import TransformConfigModal from '../modals/TransformConfigModal';
import ParameterControl from '../parameters/ParameterControl';

interface TransformationNodeProps {
  id: string;
  data: { 
    node: {
      id: string;
      transformation: Transformation;
    } 
  };
  selected: boolean;
}

export default function TransformationNode({ id, data, selected }: TransformationNodeProps) {
  const { transformation } = data.node;
  const { 
    updateNode, 
    updateParameter,
    invalidateNode,
    getProcessedCanvas,
    results,
    getDirectDownstreamNodes
  } = usePipeline();
  
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [parameters, setParameters] = useState<TransformationParameter[]>(
    transformation.parameters || []
  );
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingSucceeded, setProcessingSucceeded] = useState(false);
  const [detailedErrorShown, setDetailedErrorShown] = useState(false);
  const [intermediateResults, setIntermediateResults] = useState<IntermediateResult[]>([]);
  const [showIntermediates, setShowIntermediates] = useState(false);
  const [isAdvancedConfigOpen, setIsAdvancedConfigOpen] = useState(false);
  const [isKernelSizeChanging, setIsKernelSizeChanging] = useState(false);
  const processingAttemptRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastInputRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const processingTimeoutRef = useRef<number | null>(null);

  // Function to update parameter value
  const handleUpdateParameterValue = (name: string, value: any) => {
    if (!data.node?.transformation) return;
    
    // Check if the parameter is kernel size and show warning if needed
    const isKernelSize = name === 'kernelSize';
    const isCustomBlur = data.node.transformation.type === 'customBlur';
    const kernelTypeParam = parameters.find(p => p.name === 'kernelType');
    const isCustomKernelType = kernelTypeParam?.value === 'custom';
    
    // For normal transformations (not customBlur), show warning when changing kernel size with advanced params
    if (isKernelSize && data.node.transformation.metadata?.advancedParameters && !isCustomBlur) {
      setIsKernelSizeChanging(true);
      return;
    }
    
    // For customBlur with custom kernel type, kernel size changes don't affect the custom kernel
    // So we don't need to show the warning in that case
    if (isCustomBlur && isKernelSize && isCustomKernelType) {
      // No need to show warning, kernel size doesn't apply for custom kernel type
    }
    
    // For customBlur with other kernel types (gaussian, box), show warning when changing kernel size
    // if there are advanced parameters
    if (isCustomBlur && isKernelSize && !isCustomKernelType && data.node.transformation.metadata?.advancedParameters) {
      setIsKernelSizeChanging(true);
      return;
    }
    
    // Special handling for kernel type changes in customBlur
    if (isCustomBlur && name === 'kernelType' && value === 'custom') {
      // Switching to custom kernel type, make sure we have a customKernel parameter
      const hasCustomKernelParam = parameters.some(p => p.name === 'customKernel');
      
      if (!hasCustomKernelParam) {
        // Create a default custom kernel if none exists
        const defaultKernel: KernelValue = {
          width: 3,
          height: 3,
          values: [
            [1/9, 1/9, 1/9],
            [1/9, 1/9, 1/9],
            [1/9, 1/9, 1/9]
          ],
          normalize: true
        };
        
        // Create a new custom kernel parameter
        const newKernelParam: TransformationParameter = {
          name: 'customKernel',
          type: 'kernel',
          value: defaultKernel
        };
        
        // Add the custom kernel parameter to the transformation
        const updatedParams = [
          ...parameters.map(param => param.name === name ? { ...param, value } : param),
          newKernelParam
        ];
        
        // Update the transformation with the new parameters
        const updatedTransformation: Transformation = {
          ...data.node.transformation,
          parameters: updatedParams
        };
        
        updateNode(id, { transformation: updatedTransformation });
        setParameters(updatedParams);
        setProcessingSucceeded(false);
        processingAttemptRef.current += 1;
        invalidateNode(id);
        return;
      }
    }
    
    const paramIdx = data.node.transformation.parameters.findIndex(p => p.name === name);
    
    if (paramIdx === -1) {
      console.warn(`Parameter ${name} not found in transformation`);
      return;
    }
    
    // Special handling for kernel parameters to ensure deep cloning
    if (data.node.transformation.parameters[paramIdx].type === 'kernel') {
      // Deep clone the kernel value to prevent reference issues
      if (value && typeof value === 'object' && value.values) {
        value = {
          ...value,
          values: value.values.map((row: number[]) => [...row])
        };
      }
    }
    
    // Create a copy of the parameters array
    const updatedParams = [...data.node.transformation.parameters];
    
    // Update the parameter
    updatedParams[paramIdx] = {
      ...updatedParams[paramIdx],
      value
    };
    
    // Create a copy of the transformation with updated parameters
    const updatedTransformation = {
      ...data.node.transformation,
      parameters: updatedParams
    };
    
    // Update in the context
    updateNode(id, { transformation: updatedTransformation });
    
    // Update local state
    setParameters(updatedParams);
    
    // Reset processing state to force re-processing
    setProcessingSucceeded(false);
    processingAttemptRef.current += 1;
    invalidateNode(id);
  };

  // Handle the slider change when user confirmed they want to overwrite advanced configs
  const confirmKernelSizeChange = (name: string, value: number) => {
    // Update the local state
    const updatedParams = parameters?.length
      ? parameters.map(param => param.name === name ? { ...param, value } : param)
      : [];
    setParameters(updatedParams);
    
    // Update the transformation in the context, removing any advanced config
    const updatedTransformation = {
      ...transformation,
      parameters: updatedParams,
      metadata: {
        ...transformation.metadata,
        advancedParameters: undefined // Remove advanced parameters
      }
    };
    
    updateNode(id, { transformation: updatedTransformation });
    
    // Reset kernel size changing state
    setIsKernelSizeChanging(false);
    
    // Reset processing state to force re-processing
    setProcessingSucceeded(false);
    processingAttemptRef.current += 1;
  };

  // Cancel kernel size change
  const cancelKernelSizeChange = () => {
    setIsKernelSizeChanging(false);
  };

  // Handle opening the advanced configuration modal
  const openAdvancedConfig = () => {
    setIsAdvancedConfigOpen(true);
  };

  // Handle saving advanced configuration
  const handleSaveAdvancedConfig = (updatedTransformation: Transformation) => {
    if (!data.node) return;
    
    console.log("Saving advanced configuration:", updatedTransformation);
    
    // Ensure the ID is preserved
    updatedTransformation.id = data.node.transformation.id;
    
    // Make sure inputNodes are preserved
    updatedTransformation.inputNodes = data.node.transformation.inputNodes;
    
    // Create a deep clone of the updated transformation to prevent reference issues
    const deepClonedTransformation = {
      ...updatedTransformation,
      parameters: updatedTransformation.parameters.map(param => {
        // Deep clone kernel values
        if (param.type === 'kernel' && param.name === 'customKernel' && param.value) {
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
      }),
      metadata: updatedTransformation.metadata ? {
        ...updatedTransformation.metadata,
        advancedParameters: updatedTransformation.metadata.advancedParameters ? 
          JSON.parse(JSON.stringify(updatedTransformation.metadata.advancedParameters)) : 
          undefined
      } : undefined
    };
    
    // Force immediate update and reprocessing
    setTimeout(() => {
      // Update the node transformation - this ensures we get a new reference
      updateNode(id, { transformation: deepClonedTransformation });
      
      // Update local state to match the new transformation
      setParameters(deepClonedTransformation.parameters);
      
      // Reset processing state to force re-processing
      setProcessingSucceeded(false);
      processingAttemptRef.current += 1;
      
      // Close the modal
      setIsAdvancedConfigOpen(false);
      
      // Invalidate the node to trigger reprocessing with the new configuration
      invalidateNode(id);
      
      console.log("Advanced configuration saved, node invalidated for reprocessing");
    }, 0);
  };

  // Handle resetting advanced configuration
  const handleResetAdvancedConfig = () => {
    // Get rid of advanced parameters
    const updatedTransformation = {
      ...transformation,
      metadata: {
        ...transformation.metadata,
        advancedParameters: undefined
      }
    };
    
    // Update the transformation in the context
    updateNode(id, { transformation: updatedTransformation });

    // Reset processing state to force re-processing
    setProcessingSucceeded(false);
    processingAttemptRef.current += 1;
    invalidateNode(id);
  };

  // Update the processedImageUrl whenever the result canvas changes
  useEffect(() => {
    const nodeResult = results.get(id);
    
    if (nodeResult) {
      // Update processing state
      setIsProcessing(nodeResult.status === 'pending');
      setProcessingSucceeded(nodeResult.status === 'success');
      
      // Handle error
      if (nodeResult.status === 'error' && nodeResult.error) {
        setError('Processing failed');
        setErrorDetails(nodeResult.error.message);
      } else {
      setError(null);
      setErrorDetails(null);
      }
      
      // Update image URL
      if (nodeResult.canvas) {
        setProcessedImageUrl(nodeResult.canvas.toDataURL());
      } else {
        setProcessedImageUrl(null);
      }
    }
  }, [id, results]);
  
  // Update parameters when transformation changes
  useEffect(() => {
    setParameters(transformation.parameters || []);
  }, [transformation]);

  const triggerProcessing = () => {
    processingAttemptRef.current += 1;
    setProcessingSucceeded(false);
    invalidateNode(id);
  };

  // Get node colors based on transformation type
  const getTransformationColors = () => {
    switch (transformation.type) {
      case 'grayscale':
      case 'threshold':
      case 'adaptiveThreshold':
        return {
          border: 'border-purple-200',
          background: 'bg-gradient-to-br from-purple-50 to-white',
          header: 'bg-purple-600',
          headerText: 'text-white',
          accentColor: 'rgb(147, 51, 234)',
          accentLight: 'bg-purple-100',
          textAccent: 'text-purple-600'
        };
      case 'blur':
      case 'customBlur':
      case 'median':
      case 'bilateral':
      case 'sharpen':
        return {
          border: 'border-blue-200',
          background: 'bg-gradient-to-br from-blue-50 to-white',
          header: 'bg-blue-600',
          headerText: 'text-white',
          accentColor: 'rgb(37, 99, 235)',
          accentLight: 'bg-blue-100',
          textAccent: 'text-blue-600'
        };
      case 'colorAdjust':
      case 'histogram':
        return {
          border: 'border-rose-200',
          background: 'bg-gradient-to-br from-rose-50 to-white',
          header: 'bg-rose-600',
          headerText: 'text-white',
          accentColor: 'rgb(225, 29, 72)',
          accentLight: 'bg-rose-100',
          textAccent: 'text-rose-600'
        };
      case 'laplacian':
      case 'sobel':
      case 'canny':
        return {
          border: 'border-amber-200',
          background: 'bg-gradient-to-br from-amber-50 to-white',
          header: 'bg-amber-600',
          headerText: 'text-white',
          accentColor: 'rgb(217, 119, 6)',
          accentLight: 'bg-amber-100',
          textAccent: 'text-amber-600'
        };
      case 'dilate':
      case 'erode':
      case 'morphology':
        return {
          border: 'border-fuchsia-200',
          background: 'bg-gradient-to-br from-fuchsia-50 to-white',
          header: 'bg-fuchsia-600',
          headerText: 'text-white',
          accentColor: 'rgb(192, 38, 211)',
          accentLight: 'bg-fuchsia-100',
          textAccent: 'text-fuchsia-600'
        };
      case 'resize':
      case 'rotate':
      case 'flip':
      case 'crop':
      case 'perspective':
        return {
          border: 'border-emerald-200',
          background: 'bg-gradient-to-br from-emerald-50 to-white',
          header: 'bg-emerald-600',
          headerText: 'text-white',
          accentColor: 'rgb(16, 185, 129)',
          accentLight: 'bg-emerald-100',
          textAccent: 'text-emerald-600'
        };
      default:
        return {
          border: 'border-gray-200',
          background: 'bg-gradient-to-br from-gray-50 to-white',
          header: 'bg-gray-700',
          headerText: 'text-white',
          accentColor: 'rgb(75, 85, 99)',
          accentLight: 'bg-gray-100',
          textAccent: 'text-gray-600'
        };
    }
  };

  // Toggle detailed error display
  const toggleErrorDetails = () => {
    setDetailedErrorShown(!detailedErrorShown);
  };

  // Retry processing after error
  const handleRetryProcessing = () => {
    setError(null);
    setErrorDetails(null);
    setIsProcessing(true);
    processingAttemptRef.current += 1;
    
    // Use the pipeline context to invalidate and reprocess this node
    invalidateNode(id);
    
    // Reset UI state for downstream nodes via context
    const downstream = getDirectDownstreamNodes(id);
    downstream.forEach((downstreamNodeId: string) => {
      invalidateNode(downstreamNodeId);
    });
  };

  // Get node colors based on transformation type
  const colors = getTransformationColors();

  // Get a map of all parameter values for conditional rendering
  const parameterValues: Record<string, any> = {};
  parameters.forEach(param => {
    parameterValues[param.name] = param.value;
  });

  // Filter out parameters that shouldn't be shown in the main UI
  const visibleParameters = parameters.filter(param => {
    // Hide kernel size and type for specific transformations
    if (transformation.type === 'colorAdjust' && 
        (param.name === 'kernelSize' || param.name === 'kernelType')) {
      return false;
    }
    
    // Hide deprecated or redundant parameters for other transformations
    if (['histogram', 'sharpen', 'bilateral', 'median'].includes(transformation.type) &&
        (param.name === 'kernelSize' || param.name === 'kernelType')) {
      return false;
    }
    
    // For customBlur, hide kernelType when it's set to 'custom'
    if (transformation.type === 'customBlur' && 
        param.name === 'kernelType' && 
        parameterValues.kernelType === 'custom') {
      return false;
    }
    
    // Hide customKernel parameter in the main UI as it's too complex
    if (param.name === 'customKernel') {
      return false;
    }
    
    // Hide certain parameters if they depend on another parameter's value
    if (param.dependsOn) {
      const dependentParam = parameters.find(p => p.name === param.dependsOn);
      if (dependentParam && param.showIf && !param.showIf(parameterValues)) {
        return false;
      }
    }
    
    // For customBlur with custom kernel type, kernel size changes don't affect the custom kernel
    if (transformation.type === 'customBlur' && 
        parameterValues.kernelType === 'custom' && 
        param.name === 'kernelSize') {
      return false;
    }
    
    return true;
  });

  // Add indicator when custom kernel is active
  const hasCustomKernel = transformation.type === 'customBlur' && 
                        parameterValues.kernelType === 'custom' &&
                        parameters.some(p => p.name === 'customKernel');

  return (
    <>
      <BaseNode
        id={id}
        type="transformation"
        selected={selected}
        title={transformation.name}
        color={{
          border: colors.border,
          background: colors.background,
          header: colors.header,
          headerText: colors.headerText
        }}
        width="w-72"
      >
        <div>
          {/* Parameters Section */}
          {(visibleParameters?.length > 0 || transformation.type === 'customBlur') && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <AdjustmentsHorizontalIcon className="h-4 w-4 mr-1.5 text-gray-500" />
                  <h4 className="text-sm font-medium text-gray-700">Parameters</h4>
                </div>
                <div className="flex">
                  {/* Advanced Config Button */}
                    <button
                      onClick={openAdvancedConfig}
                    className={`p-1 mr-1 rounded-full hover:bg-gray-100 transition-colors text-gray-800`}
                      title="Advanced Configuration"
                    >
                      <Cog6ToothIcon className="h-4 w-4" />
                    </button>
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className={`p-1 rounded-full hover:bg-gray-100 transition-colors text-gray-800`}
                    title={expanded ? "Collapse" : "Expand"}
                  >
                    {expanded ? (
                      <ArrowsPointingInIcon className="h-4 w-4" />
                    ) : (
                      <ArrowsPointingOutIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className={`${colors.accentLight} bg-opacity-30 p-2.5 rounded-md`}>
                {visibleParameters.map((param) => (
                  <ParameterControl
                    key={param.name}
                    parameter={param}
                    onChange={handleUpdateParameterValue}
                    allParameters={parameterValues}
                    themeColor={{
                      accentColor: colors.accentColor,
                      accentLight: colors.accentLight,
                      textAccent: colors.textAccent
                    }}
                  />
                ))}

                {/* If no parameters are visible for customBlur, show a message */}
                {visibleParameters.length === 0 && transformation.type === 'customBlur' && (
                  <div className="py-2 text-sm text-gray-600 flex items-center">
                    <InformationCircleIcon className="h-4 w-4 mr-1.5" />
                    <span>Use Advanced Configuration to edit kernel settings</span>
                  </div>
                )}

                {/* Show indicator if advanced configuration is active */}
                {transformation.metadata?.advancedParameters && (
                  <div className="mt-1 pt-2 border-t border-gray-200 flex items-center text-xs text-blue-600">
                    <SparklesIcon className="h-3 w-3 mr-1" />
                    <span>Advanced configuration is active</span>
                  </div>
                )}
                
                {/* Show indicator when custom kernel is active */}
                {hasCustomKernel && (
                  <div className="mt-1 pt-2 border-t border-gray-200 flex items-center text-xs text-blue-600">
                    <SparklesIcon className="h-3 w-3 mr-1" />
                    <span>Custom kernel active - use Advanced Config to edit</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Processing Status */}
          {isProcessing && (
            <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent mr-2"></div>
                <p className="text-xs text-blue-700 font-medium">Processing image...</p>
              </div>
            </div>
          )}
          
          {/* Error Display */}
          {error && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-4 w-4 text-red-500 mr-1.5" />
                  <p className="text-xs text-red-700 font-medium">{error}</p>
                </div>
                <div className="flex space-x-1">
                  {errorDetails && (
                    <button
                      onClick={toggleErrorDetails}
                      className="text-xs text-red-700 hover:text-red-800"
                    >
                      {detailedErrorShown ? 'Hide Details' : 'Details'}
                    </button>
                  )}
                  <button
                    onClick={handleRetryProcessing}
                    className="text-xs text-red-700 hover:text-red-800"
                  >
                    Retry
                  </button>
                </div>
              </div>
              {detailedErrorShown && errorDetails && (
                <div className="mt-2 p-2 bg-red-100 rounded overflow-auto max-h-24 text-xs text-red-800">
                  <pre className="whitespace-pre-wrap">{errorDetails}</pre>
                </div>
              )}
            </div>
          )}
          
          {/* Output Preview */}
          {processedImageUrl && (
            <div>
              <div className="mb-2 flex justify-between items-center">
                <h4 className="text-sm font-medium text-gray-700 flex items-center">
                  <EyeIcon className="h-4 w-4 mr-1.5 text-gray-500" />
                  Preview
                </h4>
                {intermediateResults.length > 0 && (
                  <button
                    onClick={() => setShowIntermediates(!showIntermediates)}
                    className={`text-xs text-gray-800 hover:underline flex items-center`}
                  >
                    {showIntermediates ? (
                      <>
                        <EyeSlashIcon className="h-3 w-3 mr-1" />
                        Hide Steps
                      </>
                    ) : (
                      <>
                        <EyeIcon className="h-3 w-3 mr-1" />
                        Show Steps
                      </>
                    )}
                  </button>
                )}
              </div>
              <div className="bg-slate-800 rounded-md overflow-hidden">
                <img
                  src={processedImageUrl}
                  alt="Processed"
                  className="max-h-40 w-full object-contain"
                />
              </div>
              
              {/* Intermediate steps display */}
              {showIntermediates && intermediateResults.length > 0 && (
                <div className="mt-3 space-y-3">
                  <h5 className="text-xs font-medium text-gray-700">Processing Steps:</h5>
                  {intermediateResults.map((result, index) => (
                    <div key={index} className="space-y-1">
                      <p className="text-xs text-gray-600">{result.description}</p>
                      <div className="bg-slate-800 rounded-md overflow-hidden">
                        <img
                          src={getIntermediateImageUrl(result.imageData)}
                          alt={`Step ${index + 1}`}
                          className="max-h-28 w-full object-contain"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </BaseNode>
      
      {/* Advanced Configuration Modal */}
      <TransformConfigModal
        isOpen={isAdvancedConfigOpen}
        onClose={() => setIsAdvancedConfigOpen(false)}
        transformation={transformation}
        onSave={handleSaveAdvancedConfig}
        onReset={handleResetAdvancedConfig}
      />

      {/* Kernel Size Change Warning Modal */}
      {isKernelSizeChanging && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 max-w-md rounded-lg shadow-lg">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" aria-hidden="true" />
              </div>
              <h3 className="ml-3 text-lg font-medium leading-6 text-gray-900">
                Reset Advanced Configuration?
              </h3>
            </div>
            
            <p className="text-sm text-gray-500 mb-4">
              Changing the kernel size will reset all advanced configuration parameters.
              Do you want to proceed?
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={cancelKernelSizeChange}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                onClick={() => {
                  // Find the kernel size parameter and get its value
                  const kernelSizeParam = parameters?.find(p => p.name === 'kernelSize');
                  if (kernelSizeParam) {
                    confirmKernelSizeChange(kernelSizeParam.name, kernelSizeParam.value as number);
                  }
                }}
              >
                Reset and Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 

// Create a function to create data URLs for intermediate results
const getIntermediateImageUrl = (imageData: ImageData): string => {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = imageData.width;
  tempCanvas.height = imageData.height;
  const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
  if (ctx) {
    ctx.putImageData(imageData, 0, 0);
    return tempCanvas.toDataURL();
  }
  return '';
}; 