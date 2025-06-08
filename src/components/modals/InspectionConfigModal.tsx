import React, { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, ChartBarIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import type { Inspection, InspectionParameter } from '../../utils/types';

interface InspectionConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  inspection: Inspection;
  onSave: (updatedInspection: Inspection) => void;
}

export default function InspectionConfigModal({
  isOpen,
  onClose,
  inspection,
  onSave
}: InspectionConfigModalProps) {
  const [localInspection, setLocalInspection] = useState<Inspection>({ ...inspection });
  
  // Check if there are any unsaved changes
  const hasChanges = JSON.stringify(localInspection) !== JSON.stringify(inspection);

  const handleParameterChange = (name: string, value: any) => {
    setLocalInspection(prev => ({
      ...prev,
      parameters: prev.parameters.map(param =>
        param.name === name ? { ...param, value } : param
      )
    }));
  };

  const handleAdvancedParamChange = (name: string, value: any) => {
    setLocalInspection(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        advancedParameters: {
          ...prev.metadata?.advancedParameters,
          [name]: value
        }
      }
    }));
  };

  const handleDisplayOptionChange = (name: string, value: any) => {
    setLocalInspection(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        displayOptions: {
          ...prev.metadata?.displayOptions,
          [name]: value
        }
      }
    }));
  };

  const handleSave = () => {
    onSave(localInspection);
  };

  const handleDiscard = () => {
    setLocalInspection({ ...inspection });
    onClose();
  };

  const getParameterControlValue = (param: InspectionParameter) => {
    return param.value;
  };

  const renderParameterControl = (param: InspectionParameter) => {
    switch (param.type) {
      case 'select':
        return (
          <div key={param.name}>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              {param.label || param.name}
            </label>
            <select
              value={getParameterControlValue(param) as string}
              onChange={(e) => handleParameterChange(param.name, e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {param.options?.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {param.description && (
              <p className="mt-1 text-xs text-gray-500">{param.description}</p>
            )}
          </div>
        );
      case 'number':
        return (
          <div key={param.name}>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              {param.label || param.name}
            </label>
            <input
              type="number"
              value={getParameterControlValue(param) as number}
              onChange={(e) => handleParameterChange(param.name, parseFloat(e.target.value))}
              min={param.min}
              max={param.max}
              step={param.step}
              className="w-full p-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {param.description && (
              <p className="mt-1 text-xs text-gray-500">{param.description}</p>
            )}
          </div>
        );
      case 'boolean':
        return (
          <div key={param.name} className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-800">
              {param.label || param.name}
            </label>
            <input
              type="checkbox"
              checked={getParameterControlValue(param) as boolean}
              onChange={(e) => handleParameterChange(param.name, e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            {param.description && (
              <p className="mt-1 text-xs text-gray-500">{param.description}</p>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const renderHistogramConfig = () => {
    return (
      <div className="space-y-6">
        {/* Basic Parameters */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Basic Parameters</h3>
          <div className="bg-gray-50 p-4 rounded-md space-y-3">
            {localInspection.parameters
              .filter(param => !param.advanced)
              .map(param => renderParameterControl(param))}
          </div>
        </div>

        {/* Display Options */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Display Options</h3>
          <div className="bg-gray-50 p-4 rounded-md space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Chart Size
              </label>
              <select
                value={localInspection.metadata?.displayOptions?.chartSize || 'medium'}
                onChange={(e) => handleDisplayOptionChange('chartSize', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="small">Small (300×200)</option>
                <option value="medium">Medium (400×300)</option>
                <option value="large">Large (500×400)</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-800">
                Show Statistics
              </label>
              <input
                type="checkbox"
                checked={localInspection.metadata?.displayOptions?.showStats || false}
                onChange={(e) => handleDisplayOptionChange('showStats', e.target.checked)}
                className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-800">
                Interactive Mode
              </label>
              <input
                type="checkbox"
                checked={localInspection.metadata?.displayOptions?.interactive !== false}
                onChange={(e) => handleDisplayOptionChange('interactive', e.target.checked)}
                className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-800">
                Real-time Updates
              </label>
              <input
                type="checkbox"
                checked={localInspection.isRealTime !== false}
                onChange={(e) => setLocalInspection(prev => ({ ...prev, isRealTime: e.target.checked }))}
                className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
              />
            </div>
          </div>
        </div>

        {/* Advanced Parameters */}
        {localInspection.parameters.some(param => param.advanced) && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Advanced Settings</h3>
            <div className="bg-gray-50 p-4 rounded-md space-y-3">
              {localInspection.parameters
                .filter(param => param.advanced)
                .map(param => renderParameterControl(param))}
            </div>
          </div>
        )}

        {/* Information */}
        <div>
          <h3 className="text-lg font-medium text-cyan-600 flex items-center mb-3">
            <InformationCircleIcon className="h-5 w-5 mr-2" />
            About Histogram Analysis
          </h3>
          <div className="bg-cyan-50 p-4 rounded-md text-sm text-gray-800">
            <p className="mb-2">
              <strong>Histogram analysis</strong> provides insights into the distribution of pixel intensities in an image.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>RGB:</strong> Shows separate histograms for red, green, and blue channels</li>
              <li><strong>Grayscale:</strong> Shows intensity distribution for grayscale images</li>
              <li><strong>Binary:</strong> Shows distribution of black and white pixels</li>
              <li><strong>Auto:</strong> Automatically detects the most appropriate histogram type</li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const renderModuleCalculatorConfig = () => {
    return (
      <div className="space-y-6">
        {/* Basic Parameters */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Basic Parameters</h3>
          <div className="bg-gray-50 p-4 rounded-md space-y-3">
            {localInspection.parameters
              .filter(param => !param.advanced)
              .map(param => renderParameterControl(param))}
          </div>
        </div>

        {/* Advanced Parameters */}
        {localInspection.parameters.some(param => param.advanced) && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Advanced Settings</h3>
            <div className="bg-gray-50 p-4 rounded-md space-y-3">
              {localInspection.parameters
                .filter(param => param.advanced)
                .map(param => renderParameterControl(param))}
            </div>
          </div>
        )}

        {/* Information */}
        <div>
          <h3 className="text-lg font-medium text-orange-600 flex items-center mb-3">
            <InformationCircleIcon className="h-5 w-5 mr-2" />
            About Module Calculator
          </h3>
          <div className="bg-orange-50 p-4 rounded-md text-sm text-gray-800">
            <p className="mb-2">
              <strong>Module Calculator</strong> computes the gradient magnitude for each pixel, showing edge strength and intensity transitions.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Sobel:</strong> Robust edge detection with good noise suppression</li>
              <li><strong>Scharr:</strong> More accurate gradient computation, especially for small-scale features</li>
              <li><strong>Laplacian:</strong> Second-order derivative operator, sensitive to noise but detects fine details</li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const renderPhaseCalculatorConfig = () => {
    return (
      <div className="space-y-6">
        {/* Basic Parameters */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Basic Parameters</h3>
          <div className="bg-gray-50 p-4 rounded-md space-y-3">
            {localInspection.parameters
              .filter(param => !param.advanced)
              .map(param => renderParameterControl(param))}
          </div>
        </div>

        {/* Advanced Parameters */}
        {localInspection.parameters.some(param => param.advanced) && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Advanced Settings</h3>
            <div className="bg-gray-50 p-4 rounded-md space-y-3">
              {localInspection.parameters
                .filter(param => param.advanced)
                .map(param => renderParameterControl(param))}
            </div>
          </div>
        )}

        {/* Information */}
        <div>
          <h3 className="text-lg font-medium text-purple-600 flex items-center mb-3">
            <InformationCircleIcon className="h-5 w-5 mr-2" />
            About Phase Calculator
          </h3>
          <div className="bg-purple-50 p-4 rounded-md text-sm text-gray-800">
            <p className="mb-2">
              <strong>Phase Calculator</strong> computes gradient direction (phase) for each pixel, revealing the orientation of edges and features.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Color visualization:</strong> Maps direction to HSV color space for intuitive viewing</li>
              <li><strong>Arrow overlay:</strong> Shows direction vectors as arrows on the image</li>
              <li><strong>Statistical analysis:</strong> Computes dominant directions and coherence measures</li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const renderEdgeDensityConfig = () => {
    return (
      <div className="space-y-6">
        {/* Basic Parameters */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Basic Parameters</h3>
          <div className="bg-gray-50 p-4 rounded-md space-y-3">
            {localInspection.parameters
              .filter(param => !param.advanced)
              .map(param => renderParameterControl(param))}
          </div>
        </div>

        {/* Advanced Parameters */}
        {localInspection.parameters.some(param => param.advanced) && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Advanced Settings</h3>
            <div className="bg-gray-50 p-4 rounded-md space-y-3">
              {localInspection.parameters
                .filter(param => param.advanced)
                .map(param => renderParameterControl(param))}
            </div>
          </div>
        )}

        {/* Information */}
        <div>
          <h3 className="text-lg font-medium text-red-600 flex items-center mb-3">
            <InformationCircleIcon className="h-5 w-5 mr-2" />
            About Edge Density Analysis
          </h3>
          <div className="bg-red-50 p-4 rounded-md text-sm text-gray-800">
            <p className="mb-2">
              <strong>Edge Density Analysis</strong> divides the image into regions and computes edge density for each region, creating a heatmap of edge activity.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Canny detection:</strong> Multi-stage algorithm with hysteresis thresholding</li>
              <li><strong>Sobel detection:</strong> Faster gradient-based edge detection</li>
              <li><strong>Regional analysis:</strong> Overlapping windows for smooth density maps</li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const renderColorDistributionConfig = () => {
    return (
      <div className="space-y-6">
        {/* Basic Parameters */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Basic Parameters</h3>
          <div className="bg-gray-50 p-4 rounded-md space-y-3">
            {localInspection.parameters
              .filter(param => !param.advanced)
              .map(param => renderParameterControl(param))}
          </div>
        </div>

        {/* Advanced Parameters */}
        {localInspection.parameters.some(param => param.advanced) && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Advanced Settings</h3>
            <div className="bg-gray-50 p-4 rounded-md space-y-3">
              {localInspection.parameters
                .filter(param => param.advanced)
                .map(param => renderParameterControl(param))}
            </div>
          </div>
        )}

        {/* Information */}
        <div>
          <h3 className="text-lg font-medium text-pink-600 flex items-center mb-3">
            <InformationCircleIcon className="h-5 w-5 mr-2" />
            About Color Distribution Analysis
          </h3>
          <div className="bg-pink-50 p-4 rounded-md text-sm text-gray-800">
            <p className="mb-2">
              <strong>Color Distribution Analysis</strong> analyzes the distribution of colors in different color spaces and performs clustering to identify dominant colors.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Color space analysis:</strong> RGB, HSV, LAB color space distributions</li>
              <li><strong>K-means clustering:</strong> Groups similar colors to find dominant palette</li>
              <li><strong>Statistical metrics:</strong> Color variance, saturation analysis, and more</li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const renderTextureAnalysisConfig = () => {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {localInspection.parameters
            .filter(param => !param.advanced)
            .map(param => (
              <div key={param.name}>
                {renderParameterControl(param)}
              </div>
            ))}
        </div>
        
        {/* Advanced Parameters */}
        <details className="bg-gray-50 rounded-lg">
          <summary className="cursor-pointer p-3 font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
            Advanced Parameters
          </summary>
          <div className="p-3 space-y-3">
            {localInspection.parameters
              .filter(param => param.advanced)
              .map(param => (
                <div key={param.name}>
                  {renderParameterControl(param)}
                </div>
              ))}
          </div>
        </details>
        
        <div className="bg-blue-50 p-3 rounded-md">
          <h4 className="font-medium text-blue-800 mb-2">About Texture Analysis</h4>
          <p className="text-sm text-blue-700">
            Analyzes texture patterns using various descriptors like GLCM, LBP, Gabor filters, and wavelets.
            Different methods capture different aspects of texture - GLCM for statistical properties,
            LBP for local patterns, Gabor for oriented textures, and wavelets for multi-scale analysis.
          </p>
        </div>
      </div>
    );
  };

  const renderFourierTransformConfig = () => {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {localInspection.parameters
            .filter(param => !param.advanced)
            .map(param => (
              <div key={param.name}>
                {renderParameterControl(param)}
              </div>
            ))}
        </div>
        
        {/* Advanced Parameters */}
        <details className="bg-gray-50 rounded-lg">
          <summary className="cursor-pointer p-3 font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
            Advanced Parameters
          </summary>
          <div className="p-3 space-y-3">
            {localInspection.parameters
              .filter(param => param.advanced)
              .map(param => (
                <div key={param.name}>
                  {renderParameterControl(param)}
                </div>
              ))}
          </div>
        </details>
        
        <div className="bg-blue-50 p-3 rounded-md">
          <h4 className="font-medium text-blue-800 mb-2">About Fourier Transform</h4>
          <p className="text-sm text-blue-700">
            Converts images from spatial domain to frequency domain using Fast Fourier Transform (FFT).
            The magnitude spectrum shows the strength of different frequency components, while the phase spectrum
            shows their spatial relationships. Useful for analyzing periodic patterns, textures, noise, and
            applying frequency-domain filtering.
          </p>
          <div className="mt-2 text-xs text-blue-600">
            <strong>Visualization Modes:</strong>
            <ul className="mt-1 ml-4 list-disc">
              <li><strong>Magnitude:</strong> Shows frequency component strengths</li>
              <li><strong>Phase:</strong> Shows spatial phase relationships</li>
              <li><strong>Both:</strong> Side-by-side magnitude and phase</li>
              <li><strong>Spectrum:</strong> Full analysis with radial profile</li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const renderStatisticsConfig = () => {
    return (
      <div className="space-y-6">
        {/* Basic Parameters */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Statistics Options</h3>
          <div className="bg-gray-50 p-4 rounded-md space-y-3">
            {localInspection.parameters
              .filter(param => !param.advanced)
              .map(param => renderParameterControl(param))}
          </div>
        </div>

        {/* Advanced Parameters */}
        {localInspection.parameters.some(param => param.advanced) && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Advanced Settings</h3>
            <div className="bg-gray-50 p-4 rounded-md space-y-3">
              {localInspection.parameters
                .filter(param => param.advanced)
                .map(param => renderParameterControl(param))}
            </div>
          </div>
        )}

        {/* Information */}
        <div>
          <h3 className="text-lg font-medium text-blue-600 flex items-center mb-3">
            <InformationCircleIcon className="h-5 w-5 mr-2" />
            About Image Statistics
          </h3>
          <div className="bg-blue-50 p-4 rounded-md text-sm text-gray-800">
            <p className="mb-2">
              <strong>Image Statistics</strong> provides comprehensive numerical analysis of image properties and pixel distributions.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Channel analysis:</strong> Mean, min, max values for each color channel</li>
              <li><strong>Distribution metrics:</strong> Standard deviation, variance, skewness</li>
              <li><strong>Image properties:</strong> Dimensions, pixel count, aspect ratio</li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const renderConfigurationUI = () => {
    switch (localInspection.type) {
      case 'histogram':
        return renderHistogramConfig();
      case 'moduleCalculator':
        return renderModuleCalculatorConfig();
      case 'phaseCalculator':
        return renderPhaseCalculatorConfig();
      case 'edgeDensity':
        return renderEdgeDensityConfig();
      case 'colorDistribution':
        return renderColorDistributionConfig();
      case 'textureAnalysis':
        return renderTextureAnalysisConfig();
      case 'fourierTransform':
        return renderFourierTransformConfig();
      case 'statistics':
        return renderStatisticsConfig();
      default:
        return (
          <div className="text-center py-8">
            <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Configuration not available for this inspection type.</p>
          </div>
        );
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={() => {}}>
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
              <Dialog.Panel className="modal-content w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex justify-between items-center p-6 pb-3 border-b border-gray-200">
                  <div className="flex items-center">
                    <ChartBarIcon className="h-6 w-6 text-cyan-600 mr-2" />
                    <div>
                      <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                        Configure {localInspection.name}
                      </Dialog.Title>
                      <p className="text-sm text-gray-500 mt-1">{localInspection.description}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    onClick={hasChanges ? handleDiscard : onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                  {renderConfigurationUI()}
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center text-sm text-gray-500">
                    {hasChanges && (
                      <>
                        <div className="w-2 h-2 bg-orange-400 rounded-full mr-2"></div>
                        Unsaved changes
                      </>
                    )}
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={hasChanges ? handleDiscard : onClose}
                    >
                      {hasChanges ? 'Discard' : 'Close'}
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleSave}
                      disabled={!hasChanges}
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 