import { useEffect, useState, useRef, useCallback } from 'react';
import { Position } from 'reactflow';
import { useImageProcessing } from '../../contexts/ImageProcessingContext';
import { processImage } from '../../utils/imageProcessing';
import type { Transformation, TransformationParameter } from '../../utils/types';
import { AdjustmentsHorizontalIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon, ExclamationTriangleIcon, InformationCircleIcon, EyeIcon, EyeSlashIcon, SparklesIcon } from '@heroicons/react/24/outline';
import type { IntermediateResult } from '../../utils/imageProcessing';
import BaseNode from './BaseNode';

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
  const { processedImages, setProcessedImage, updateNode, invalidateDownstreamNodes, edges } = useImageProcessing();
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [parameters, setParameters] = useState<TransformationParameter[]>(
    transformation.parameters
  );
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingSucceeded, setProcessingSucceeded] = useState(false);
  const [detailedErrorShown, setDetailedErrorShown] = useState(false);
  const [intermediateResults, setIntermediateResults] = useState<IntermediateResult[]>([]);
  const [showIntermediates, setShowIntermediates] = useState(false);
  const processingAttemptRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastInputRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const processingTimeoutRef = useRef<number | null>(null);

  // Function to update parameter value
  const updateParameterValue = (name: string, value: number | string | boolean) => {
    // Update the local state
    const updatedParams = parameters.map(param => 
      param.name === name ? { ...param, value } : param
    );
    setParameters(updatedParams);
    
    // Update the transformation in the context
    const updatedTransformation = {
      ...transformation,
      parameters: updatedParams
    };
    updateNode(id, { 
      transformation: updatedTransformation 
    });
    
    // Explicitly invalidate downstream nodes to ensure they reprocess
    invalidateDownstreamNodes(id);
    
    // Reset processing state to force re-processing
    setProcessingSucceeded(false);
    processingAttemptRef.current += 1;
  };

  // Check if input has changed
  const hasInputChanged = useCallback((inputNodeId: string) => {
    // Check if the input node exists in processedImages
    const inputImage = processedImages[inputNodeId];
    
    // If the image doesn't exist, that's a change
    if (!inputImage) {
      if (lastInputRef.current !== null) {
        lastInputRef.current = null;
        return true;
      }
      return false;
    }
    
    // Generate a fingerprint of the current input (width, height, and a sample of pixels)
    try {
      const ctx = inputImage.getContext('2d', { willReadFrequently: true });
      if (!ctx) return false;
      
      // Get a small sample of pixels from the center for quick comparison
      const sampleSize = 10;
      const centerX = Math.floor(inputImage.width / 2);
      const centerY = Math.floor(inputImage.height / 2);
      
      const pixelData = ctx.getImageData(
        Math.max(0, centerX - sampleSize/2), 
        Math.max(0, centerY - sampleSize/2), 
        sampleSize, 
        sampleSize
      ).data;
      
      // Create a fingerprint using dimensions and a sample of pixel data
      const fingerprint = `${inputNodeId}_${inputImage.width}x${inputImage.height}_${
        Array.from(pixelData.slice(0, 100)).join(',')
      }`;
      
      // Check if fingerprint has changed
      const hasChanged = lastInputRef.current !== fingerprint;
      lastInputRef.current = fingerprint;
      return hasChanged;
    } catch (error) {
      console.warn('Error checking input changes:', error);
      return true; // Assume changed on error to be safe
    }
  }, [processedImages]);

  // Clear all timeouts
  const clearAllTimeouts = useCallback(() => {
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }
  }, []);

  // Toggle showing intermediates
  const toggleIntermediates = useCallback(() => {
    setShowIntermediates(prev => !prev);
  }, []);

  // Process the image whenever input changes or parameters change
  useEffect(() => {
    let isMounted = true;
    
    // Function to process the image
    const doImageProcessing = async () => {
      // Skip if we're already processing to avoid duplicate processing
      if (isProcessing) {
        return;
      }

      // Reset error state
      setError(null);
      setErrorDetails(null);
      setDetailedErrorShown(false);
      setIntermediateResults([]);
      
      if (!transformation.inputNodes || transformation.inputNodes.length === 0) {
        return; // No input nodes connected yet
      }
      
      const inputNodeId = transformation.inputNodes[0];
      
      // Get the input canvas - if it doesn't exist, don't continue
      const inputCanvas = processedImages[inputNodeId];
      if (!inputCanvas) {
        console.log(`Node ${id}: Input from ${inputNodeId} not available yet`);
        return; // Input not available yet
      }
      
      // Always check if the input has changed, regardless of processing state
      const inputChanged = hasInputChanged(inputNodeId);
      
      // Skip processing if input hasn't changed and we've already processed successfully
      if (processingSucceeded && !inputChanged) {
        console.log(`Node ${id}: Skipping processing - input hasn't changed`);
        return;
      }
      
      console.log(`Node ${id}: Processing with input from ${inputNodeId} (changed: ${inputChanged})`);
      
      if (!canvasRef.current) {
        return; // Canvas not available
      }
      
      // Clear any existing timeouts
      clearAllTimeouts();
      
      // Prevent multiple processing attempts for the same input
      processingAttemptRef.current += 1;
      const currentAttempt = processingAttemptRef.current;
      
      // Cancel any previous processing
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Create new abort controller for this attempt
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;
      
      // Set processing state OUTSIDE of render cycle
      setIsProcessing(true);
      
      // Set up processing timeout - this will abort if processing takes too long
      processingTimeoutRef.current = window.setTimeout(() => {
        if (isMounted && currentAttempt === processingAttemptRef.current) {
          console.warn(`Processing timeout for ${transformation.name} transformation`);
          setIsProcessing(false);
          setError("Processing timed out");
          setErrorDetails(`The ${transformation.name} operation took too long to complete. This may be due to the image size or complexity. Try a smaller image or simpler transformation.`);
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
        }
      }, 8000); // 8 second timeout
      
      try {
        // Check if we should abort
        if (signal.aborted) {
          clearAllTimeouts();
          setIsProcessing(false);
          return;
        }
        
        // Get canvas context with willReadFrequently flag
        const ctx = canvasRef.current?.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          throw new Error("Failed to get canvas context");
        }
        
        // Get the input context with willReadFrequently flag
        const inputCtx = inputCanvas.getContext('2d', { willReadFrequently: true });
        if (!inputCtx) {
          throw new Error("Failed to get input canvas context");
        }
        
        try {
          // Make sure the canvas has the same dimensions as the input image
          if (canvasRef.current) {
            canvasRef.current.width = inputCanvas.width;
            canvasRef.current.height = inputCanvas.height;
          }

          const imageData = inputCtx.getImageData(0, 0, inputCanvas.width, inputCanvas.height);
          
          if (!imageData) {
            throw new Error("Failed to get image data from input");
          }
          
          // Process the image with the current transformation
          const processedResult = await processImage(imageData, {
            ...transformation,
            parameters
          }, transformation.showPreprocessingSteps);
          
          // Extract the actual ImageData from the result
          const processedData = processedResult.result;
          
          // Store intermediate results if available
          if (processedResult.intermediates && processedResult.intermediates.length > 0) {
            if (isMounted) {
              setIntermediateResults(processedResult.intermediates);
              // Auto-expand if we have intermediates and the option is enabled
              if (transformation.showPreprocessingSteps && !expanded) {
                setExpanded(true);
                setShowIntermediates(true);
              }
            }
          }
          
          // If component unmounted or processing was aborted, don't continue
          if (!isMounted || signal.aborted || currentAttempt !== processingAttemptRef.current) {
            clearAllTimeouts();
            // Ensure processing state is reset
            if (isMounted) {
              setIsProcessing(false);
            }
            return;
          }
          
          // Capture and store any diagnostic information
          if (processedResult.diagnosticInfo && processedResult.diagnosticInfo.error) {
            console.warn('Processing completed with warnings:', processedResult.diagnosticInfo.error);
          }
          
          // Set canvas dimensions and draw the processed image
          if (canvasRef.current && isMounted) {
            canvasRef.current.width = processedData.width;
            canvasRef.current.height = processedData.height;
            ctx.putImageData(processedData, 0, 0);
            
            // Use requestAnimationFrame to batch updates
            window.requestAnimationFrame(() => {
              if (!isMounted || signal.aborted) return;
              
              try {
                if (canvasRef.current) {
                  const dataUrl = canvasRef.current.toDataURL();
                  
                  // Batch state updates to prevent excessive re-renders
                  if (isMounted) {
                    // We use a function to update based on previous state
                    // This prevents stale state issues
                    setProcessedImageUrl(dataUrl);
                    setProcessedImage(id, canvasRef.current);
                    setProcessingSucceeded(true);
                    setIsProcessing(false);
                  }
                }
              } catch (dataUrlError) {
                if (isMounted) {
                  console.error('Error creating data URL:', dataUrlError);
                  setError("Failed to create image preview");
                  setErrorDetails(dataUrlError instanceof Error ? dataUrlError.message : String(dataUrlError));
                  setIsProcessing(false);
                }
              } finally {
                // Always clear the processing state when done
                clearAllTimeouts();
              }
            });
          } else {
            // Ensure processing state is reset if canvas is not available
            if (isMounted) {
              clearAllTimeouts();
              setIsProcessing(false);
            }
          }
        } catch (imageDataError) {
          if (isMounted && currentAttempt === processingAttemptRef.current) {
            console.error('Error processing image data:', imageDataError);
            setError("Image processing error");
            setErrorDetails(imageDataError instanceof Error 
              ? `${imageDataError.name}: ${imageDataError.message}` 
              : String(imageDataError));
            clearAllTimeouts();
            setIsProcessing(false);
          }
        }
      } catch (error) {
        if (isMounted && currentAttempt === processingAttemptRef.current) {
          console.error('Error in transformation process:', error);
          setError("Transformation error");
          setErrorDetails(error instanceof Error 
            ? `${error.name}: ${error.message}` 
            : String(error));
          clearAllTimeouts();
          setIsProcessing(false);
        }
      }
    };
    
    // Start the image processing outside the React rendering cycle
    // to avoid unwanted re-renders during state updates
    const triggerProcessing = () => {
      if (!isProcessing) {
        doImageProcessing().catch(error => {
          console.error('Unhandled error in image processing:', error);
          if (isMounted) {
            setError("Unhandled processing error");
            setErrorDetails(String(error));
            setIsProcessing(false);
          }
        });
      }
    };
    
    console.log(`Node ${id}: Checking if processing is needed`);
    
    // Always run processing check when dependencies change
    const timeoutId = setTimeout(triggerProcessing, 0);
    
    // Cleanup function
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      // Cancel any ongoing processing
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      clearAllTimeouts();
      // Do not update state here as the component could be unmounted
    };
  }, [
    transformation,
    parameters,
    processedImages,
    id,
    setProcessedImage,
    processingSucceeded,
    hasInputChanged,
    clearAllTimeouts,
    edges,
    // Remove isProcessing from the dependency array to break potential loops
    // The processing function has its own check for isProcessing
    expanded
  ]);

  // Get transformation-specific colors
  const getTransformationColors = () => {
    switch (transformation.type) {
      case 'grayscale':
        return {
          border: 'border-gray-300',
          background: 'bg-gradient-to-br from-gray-50 to-white',
          header: 'bg-gray-700',
          headerText: 'text-white',
          accentColor: 'bg-gray-500',
          accentLight: 'bg-gray-200',
          textAccent: 'text-gray-700'
        };
      case 'blur':
        return {
          border: 'border-blue-300',
          background: 'bg-gradient-to-br from-blue-50 to-white',
          header: 'bg-blue-700',
          headerText: 'text-white',
          accentColor: 'bg-blue-500',
          accentLight: 'bg-blue-100',
          textAccent: 'text-blue-700'
        };
      case 'threshold':
        return {
          border: 'border-purple-300',
          background: 'bg-gradient-to-br from-purple-50 to-white',
          header: 'bg-purple-700',
          headerText: 'text-white',
          accentColor: 'bg-purple-500',
          accentLight: 'bg-purple-100',
          textAccent: 'text-purple-700'
        };
      case 'laplacian':
        return {
          border: 'border-emerald-300',
          background: 'bg-gradient-to-br from-emerald-50 to-white',
          header: 'bg-emerald-700',
          headerText: 'text-white',
          accentColor: 'bg-emerald-500',
          accentLight: 'bg-emerald-100',
          textAccent: 'text-emerald-700'
        };
      case 'sobel':
        return {
          border: 'border-amber-300',
          background: 'bg-gradient-to-br from-amber-50 to-white',
          header: 'bg-amber-700',
          headerText: 'text-white',
          accentColor: 'bg-amber-500',
          accentLight: 'bg-amber-100',
          textAccent: 'text-amber-700'
        };
      case 'canny':
        return {
          border: 'border-red-300',
          background: 'bg-gradient-to-br from-red-50 to-white',
          header: 'bg-red-700',
          headerText: 'text-white',
          accentColor: 'bg-red-500',
          accentLight: 'bg-red-100',
          textAccent: 'text-red-700'
        };
      default:
        return {
          border: 'border-indigo-300',
          background: 'bg-gradient-to-br from-indigo-50 to-white',
          header: 'bg-indigo-700',
          headerText: 'text-white',
          accentColor: 'bg-indigo-500',
          accentLight: 'bg-indigo-100',
          textAccent: 'text-indigo-700'
        };
    }
  };

  // Toggle detailed error display
  const toggleErrorDetails = () => {
    setDetailedErrorShown(!detailedErrorShown);
  };

  // Manually retry processing
  const handleRetryProcessing = () => {
    setProcessingSucceeded(false);
    processingAttemptRef.current += 1;
    setDetailedErrorShown(false);
  };

  // Render parameter controls based on parameter type
  const renderParameterControl = (param: TransformationParameter) => {
    const colors = getTransformationColors();
    
    switch (param.type) {
      case 'number':
        return (
          <div key={param.name} className="mb-3">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-gray-700">
                {param.name}
              </label>
              <span className="text-sm font-medium text-gray-600">{param.value}</span>
            </div>
            <div className="mt-1.5 relative">
              <input
                type="range"
                min={param.min || 0}
                max={param.max || 100}
                step={param.step || 1}
                value={param.value as number}
                onChange={(e) => updateParameterValue(param.name, Number(e.target.value))}
                className="w-full h-2 appearance-none rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-gray-300 [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-gray-200"
                style={{
                  background: `linear-gradient(to right, ${colors.accentColor}, ${colors.accentColor} ${
                    ((Number(param.value) - (param.min || 0)) / ((param.max || 100) - (param.min || 0))) * 100
                  }%, #e5e7eb ${
                    ((Number(param.value) - (param.min || 0)) / ((param.max || 100) - (param.min || 0))) * 100
                  }%, #e5e7eb)`
                }}
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{param.min}</span>
                <span>{param.max}</span>
              </div>
            </div>
          </div>
        );
      case 'select':
        return (
          <div key={param.name} className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {param.name}
            </label>
            <select
              value={param.value as string}
              onChange={(e) => updateParameterValue(param.name, e.target.value)}
              className={`w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-${colors.textAccent}`}
            >
              {param.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        );
      case 'boolean':
        return (
          <div key={param.name} className="mb-3 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">{param.name}</label>
            <div className="relative inline-block w-10 mr-2 align-middle select-none">
              <input
                type="checkbox"
                id={`toggle-${param.name}-${id}`}
                checked={param.value as boolean}
                onChange={(e) => updateParameterValue(param.name, e.target.checked)}
                className="sr-only"
              />
              <label
                htmlFor={`toggle-${param.name}-${id}`}
                className={`block overflow-hidden h-6 rounded-full cursor-pointer ${
                  (param.value as boolean) ? colors.accentColor : 'bg-gray-300'
                }`}
              >
                <span
                  className={`block h-6 w-6 rounded-full bg-white border border-gray-300 shadow transform transition-transform duration-200 ease-in ${
                    (param.value as boolean) ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </label>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

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

  // Get node colors based on transformation type
  const colors = getTransformationColors();

  return (
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
        {parameters.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <AdjustmentsHorizontalIcon className="h-4 w-4 mr-1.5 text-gray-500" />
                <h4 className="text-sm font-medium text-gray-700">Parameters</h4>
              </div>
              <button
                onClick={() => setExpanded(!expanded)}
                className={`p-1 rounded-full hover:bg-gray-100 transition-colors ${colors.textAccent}`}
                title={expanded ? "Collapse" : "Expand"}
              >
                {expanded ? (
                  <ArrowsPointingInIcon className="h-4 w-4" />
                ) : (
                  <ArrowsPointingOutIcon className="h-4 w-4" />
                )}
              </button>
            </div>
            <div className={`${colors.accentLight} bg-opacity-30 p-2.5 rounded-md`}>
              {parameters.map(renderParameterControl)}
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
        {error && !isProcessing && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-4 w-4 text-red-500 mr-1.5 flex-shrink-0" />
                <p className="text-xs text-red-600 font-medium">{error}</p>
              </div>
              <div className="flex space-x-2">
                {errorDetails && (
                  <button
                    onClick={toggleErrorDetails}
                    className="text-xs text-gray-500 hover:text-gray-700 p-1"
                    title="Toggle details"
                  >
                    <InformationCircleIcon className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={handleRetryProcessing}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium p-1"
                >
                  Retry
                </button>
              </div>
            </div>
            
            {detailedErrorShown && errorDetails && (
              <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200 max-h-24 overflow-auto">
                <pre className="whitespace-pre-wrap break-words">{errorDetails}</pre>
              </div>
            )}
          </div>
        )}
        
        {/* Preview Section */}
        {processedImageUrl && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700 flex items-center">
                <SparklesIcon className="h-4 w-4 mr-1.5 text-gray-500" />
                Preview
              </h4>
              {intermediateResults.length > 0 && (
                <button 
                  onClick={toggleIntermediates}
                  className={`flex items-center text-xs ${colors.textAccent} hover:underline font-medium`}
                >
                  {showIntermediates ? (
                    <>
                      <EyeSlashIcon className="h-3 w-3 mr-0.5" />
                      Hide Steps
                    </>
                  ) : (
                    <>
                      <EyeIcon className="h-3 w-3 mr-0.5" />
                      Show Steps ({intermediateResults.length})
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="bg-gray-900 rounded-md overflow-hidden mb-1">
              <img 
                src={processedImageUrl} 
                alt="Processed" 
                className="max-h-40 w-full object-contain mx-auto"
              />
            </div>
            
            {/* Show intermediate results if available and expanded */}
            {showIntermediates && intermediateResults.length > 0 && (
              <div className="mt-4 space-y-3 bg-gray-50 p-2 rounded-md border border-gray-200">
                <h5 className="text-xs font-medium text-gray-700">Processing Steps</h5>
                
                <div className="space-y-3">
                  {intermediateResults.map((result, index) => (
                    <div key={index} className="bg-white rounded-md shadow-sm overflow-hidden border border-gray-100">
                      <div className="bg-gray-100 py-1 px-2">
                        <h6 className="text-xs font-medium text-gray-700">{result.description}</h6>
                      </div>
                      <div className="p-1 bg-gray-900">
                        <img 
                          src={getIntermediateImageUrl(result.imageData)}
                          alt={`Step ${index + 1}`}
                          className="max-h-24 w-full object-contain mx-auto"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Hidden canvas for processing */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </BaseNode>
  );
} 