import React, { useState } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import type { Transformation, TransformationParameter, StructuringElement } from '../../utils/types';
import StructuringElementEditor from './StructuringElementEditor';

interface MorphologyConfigPanelProps {
  transformation: Transformation;
  parameters: TransformationParameter[];
  advancedParameters: Record<string, any>;
  onParameterChange: (name: string, value: any) => void;
  onAdvancedParamChange: (name: string, value: any) => void;
  renderParameterControl: (param: TransformationParameter) => React.ReactNode;
}

export default function MorphologyConfigPanel({
  transformation,
  parameters,
  advancedParameters,
  onParameterChange,
  onAdvancedParamChange,
  renderParameterControl
}: MorphologyConfigPanelProps) {
  const [useCustomElement, setUseCustomElement] = useState(
    advancedParameters.useCustomElement || false
  );
  
  // Initialize structuring element
  const [structuringElement, setStructuringElement] = useState<StructuringElement>(
    advancedParameters.structuringElement || {
      shape: 'rect',
      width: 3,
      height: 3
    }
  );

  // Handle toggling between basic and custom mode
  const handleToggleCustomElement = (e: React.ChangeEvent<HTMLInputElement>) => {
    const useCustom = e.target.checked;
    setUseCustomElement(useCustom);
    onAdvancedParamChange('useCustomElement', useCustom);
  };

  // Handle structuring element changes
  const handleStructuringElementChange = (element: StructuringElement) => {
    setStructuringElement(element);
    onAdvancedParamChange('structuringElement', element);
  };

  // Get the current operation type
  const operationParam = parameters.find(p => p.name === 'operation');
  const currentOperation = operationParam?.value as string || 'open';

  // Define operation descriptions
  const getOperationDescription = (operation: string) => {
    switch (operation) {
      case 'open':
        return {
          name: 'Opening',
          description: 'Erosion followed by dilation. Removes small noise and separates connected objects while preserving the overall shape.',
          effect: 'Smooths object contours, breaks narrow connections, and eliminates small bright spots.'
        };
      case 'close':
        return {
          name: 'Closing',
          description: 'Dilation followed by erosion. Fills small holes and gaps while preserving the overall shape.',
          effect: 'Smooths object contours, fuses narrow breaks, and fills small dark holes.'
        };
      case 'gradient':
        return {
          name: 'Morphological Gradient',
          description: 'Difference between dilation and erosion. Highlights the edges and boundaries of objects.',
          effect: 'Creates an outline effect showing the boundaries of objects with varying thickness.'
        };
      case 'tophat':
        return {
          name: 'Top-Hat Transform',
          description: 'Difference between the original image and its opening. Extracts small bright details.',
          effect: 'Isolates bright features that are smaller than the structuring element.'
        };
      case 'blackhat':
        return {
          name: 'Black-Hat Transform',
          description: 'Difference between the closing and the original image. Extracts small dark details.',
          effect: 'Isolates dark features that are smaller than the structuring element.'
        };
      default:
        return {
          name: 'Morphological Operation',
          description: 'A morphological transformation using the specified structuring element.',
          effect: 'Modifies the structure of objects in the image.'
        };
    }
  };

  const operationInfo = getOperationDescription(currentOperation);

  return (
    <div className="space-y-6">
      {/* Basic parameters section */}
      <div>
        <h3 className="text-lg font-medium text-gray-900">Basic Parameters</h3>
        <div className="mt-2 bg-gray-50 p-4 rounded-md">
          {parameters
            .filter(param => !param.advanced)
            .map(param => (
              <div key={param.name}>{renderParameterControl(param)}</div>
            ))}
          
          {/* Toggle for custom structuring element */}
          <div className="flex items-center justify-between mt-4">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={useCustomElement}
                onChange={handleToggleCustomElement}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Use Custom Structuring Element</span>
            </label>
            <span className="text-xs text-gray-500">
              {useCustomElement ? 'On' : 'Off'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 flex items-center">
            <InformationCircleIcon className="h-3 w-3 mr-1" />
            Use the advanced editor to create a custom structuring element
          </p>
        </div>
      </div>
      
      {/* Custom structuring element editor */}
      {useCustomElement && (
        <div>
          <h3 className="text-lg font-medium text-gray-900">Structuring Element Editor</h3>
          <div className="mt-2 bg-gray-50 p-4 rounded-md">
            <StructuringElementEditor
              value={structuringElement}
              onChange={handleStructuringElementChange}
            />
          </div>
        </div>
      )}
      
      {/* Advanced parameters section */}
      <div>
        <h3 className="text-lg font-medium text-gray-900">Advanced Parameters</h3>
        <div className="mt-2 bg-gray-50 p-4 rounded-md space-y-4">
          {/* Structuring Element Shape (when not using custom) */}
          {!useCustomElement && (
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Structuring Element Shape
              </label>
              <select
                value={advancedParameters.shape || 'rect'}
                onChange={(e) => onAdvancedParamChange('shape', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="rect" className="text-gray-900 bg-white">Rectangle</option>
                <option value="ellipse" className="text-gray-900 bg-white">Ellipse</option>
                <option value="cross" className="text-gray-900 bg-white">Cross</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 flex items-center">
                <InformationCircleIcon className="h-3 w-3 mr-1" />
                Shape of the structuring element affects the morphological operation
              </p>
            </div>
          )}
          
          {/* Border Type */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              Border Type
            </label>
            <select
              value={advancedParameters.borderType || 'BORDER_DEFAULT'}
              onChange={(e) => onAdvancedParamChange('borderType', e.target.value)}
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
          
          {/* Show advanced parameters that aren't handled by the custom editor */}
          {parameters
            .filter(param => param.advanced)
            .map(param => (
              <div key={param.name}>{renderParameterControl(param)}</div>
            ))}
        </div>
      </div>
      
      {/* Operation-specific explanation section */}
      <div>
        <h3 className="text-lg font-medium text-blue-600 flex items-center">
          <InformationCircleIcon className="h-5 w-5 mr-1" />
          {operationInfo.name} Explanation
        </h3>
        <div className="mt-2 bg-blue-50 p-4 rounded-md text-sm text-gray-800">
          <p className="mb-2">
            <strong>{operationInfo.name}</strong>: {operationInfo.description}
          </p>
          <p className="mb-3">
            <strong>Effect:</strong> {operationInfo.effect}
          </p>
          
          {/* General morphology information */}
          <div className="border-t border-blue-200 pt-3">
            <p className="mb-2">
              <strong>Structuring Element:</strong> The structuring element defines the neighborhood pattern used for the operation. Its size and shape determine how the morphological operation affects the image structure.
            </p>
            <p className="mb-2">
              <strong>Iterations:</strong> Multiple iterations apply the operation repeatedly, amplifying its effects. Higher iterations produce more pronounced results.
            </p>
            <p>
              <strong>Kernel Size:</strong> Larger kernels affect broader areas and can bridge larger gaps or remove larger features.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 