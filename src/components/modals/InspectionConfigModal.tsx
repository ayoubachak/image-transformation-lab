import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon, InformationCircleIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import ParameterControl from '../parameters/ParameterControl';
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
  const [localInspection, setLocalInspection] = useState<Inspection>(inspection);
  const [hasChanges, setHasChanges] = useState(false);

  // Reset local state when modal opens with new inspection
  useEffect(() => {
    if (isOpen) {
      setLocalInspection(JSON.parse(JSON.stringify(inspection))); // Deep clone
      setHasChanges(false);
    }
  }, [isOpen, inspection]);

  const handleParameterChange = (name: string, value: any) => {
    setLocalInspection(prev => ({
      ...prev,
      parameters: prev.parameters.map(param =>
        param.name === name ? { ...param, value } : param
      )
    }));
    setHasChanges(true);
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
    setHasChanges(true);
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
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(localInspection);
    setHasChanges(false);
  };

  const handleDiscard = () => {
    setLocalInspection(JSON.parse(JSON.stringify(inspection)));
    setHasChanges(false);
    onClose();
  };

  const getParameterControlValue = (param: InspectionParameter) => {
    const currentParam = localInspection.parameters.find(p => p.name === param.name);
    return currentParam ? currentParam.value : param.value;
  };

  const renderParameterControl = (param: InspectionParameter) => {
    const currentValue = getParameterControlValue(param);
    const allParameters = localInspection.parameters.reduce((acc, p) => {
      acc[p.name] = p.value;
      return acc;
    }, {} as Record<string, any>);

    return (
      <ParameterControl
        key={param.name}
        parameter={{ ...param, value: currentValue }}
        onChange={handleParameterChange}
        allParameters={allParameters}
        themeColor={{
          accentColor: 'rgb(8, 145, 178)', // cyan-600
          accentLight: 'bg-cyan-100',
          textAccent: 'text-cyan-600'
        }}
      />
    );
  };

  const renderHistogramConfig = () => {
    return (
      <div className="space-y-6">
        {/* Basic Parameters */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Analysis Settings</h3>
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
            {/* Chart Size */}
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

            {/* Show Statistics */}
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

            {/* Interactive Mode */}
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

            {/* Real-time Updates */}
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

  const renderConfigurationUI = () => {
    switch (localInspection.type) {
      case 'histogram':
        return renderHistogramConfig();
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all">
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
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
                      onClick={hasChanges ? handleDiscard : onClose}
                    >
                      {hasChanges ? 'Discard' : 'Close'}
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-50"
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