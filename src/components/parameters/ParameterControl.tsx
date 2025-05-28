import React, { useState } from 'react';
import type { TransformationParameter } from '../../utils/types';
import NumberParameterControl from './NumberParameterControl';
import SelectParameterControl from './SelectParameterControl';
import BooleanParameterControl from './BooleanParameterControl';
import KernelParameterControl from './KernelParameterControl';
import ColorParameterControl from './ColorParameterControl';
import MatrixParameterControl from './MatrixParameterControl';
import RangeParameterControl from './RangeParameterControl';
import PointParameterControl from './PointParameterControl';
import VectorParameterControl from './VectorParameterControl';

interface ParameterControlProps {
  parameter: TransformationParameter;
  onChange: (name: string, value: any) => void;
  allParameters?: Record<string, any>;
  themeColor?: {
    accentColor: string;
    accentLight: string;
    textAccent: string;
  };
  disabled?: boolean;
}

export default function ParameterControl({
  parameter,
  onChange,
  allParameters = {},
  themeColor = {
    accentColor: 'rgb(79, 70, 229)',
    accentLight: 'bg-indigo-100',
    textAccent: 'text-indigo-600'
  },
  disabled = false
}: ParameterControlProps) {
  // Check if this parameter should be shown based on its dependencies
  const shouldShow = !parameter.showIf || parameter.showIf(allParameters);
  if (!shouldShow) return null;

  // Check if dependent parameter is satisfied
  if (parameter.dependsOn) {
    const dependencyValue = allParameters[parameter.dependsOn];
    if (dependencyValue === undefined || dependencyValue === false) {
      return null;
    }
  }

  // Choose the correct control based on parameter type
  const renderControl = () => {
    const { type } = parameter;

    switch (type) {
      case 'number':
        return (
          <NumberParameterControl
            parameter={parameter}
            onChange={onChange}
            themeColor={themeColor}
            disabled={disabled}
          />
        );
      case 'select':
        return (
          <SelectParameterControl
            parameter={parameter}
            onChange={onChange}
            themeColor={themeColor}
            disabled={disabled}
          />
        );
      case 'boolean':
        return (
          <BooleanParameterControl
            parameter={parameter}
            onChange={onChange}
            themeColor={themeColor}
            disabled={disabled}
          />
        );
      case 'kernel':
        return (
          <KernelParameterControl
            parameter={parameter}
            onChange={onChange}
            themeColor={themeColor}
            disabled={disabled}
          />
        );
      case 'color':
        return (
          <ColorParameterControl
            parameter={parameter}
            onChange={onChange}
            themeColor={themeColor}
            disabled={disabled}
          />
        );
      case 'matrix':
        return (
          <MatrixParameterControl
            parameter={parameter}
            onChange={onChange}
            themeColor={themeColor}
            disabled={disabled}
          />
        );
      case 'range':
        return (
          <RangeParameterControl
            parameter={parameter}
            onChange={onChange}
            themeColor={themeColor}
            disabled={disabled}
          />
        );
      case 'point':
        return (
          <PointParameterControl
            parameter={parameter}
            onChange={onChange}
            themeColor={themeColor}
            disabled={disabled}
          />
        );
      case 'vector':
        return (
          <VectorParameterControl
            parameter={parameter}
            onChange={onChange}
            themeColor={themeColor}
            disabled={disabled}
          />
        );
      case 'string':
      default:
        return (
          <input
            type="text"
            value={parameter.value as string}
            onChange={(e) => onChange(parameter.name, e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={disabled}
          />
        );
    }
  };

  const displayName = parameter.label || parameter.name;

  return (
    <div className={`mb-3 ${parameter.advanced ? 'opacity-80' : ''}`}>
      <div className="flex justify-between items-center mb-1">
        <label className="block text-sm font-medium text-gray-800">
          {displayName}
          {parameter.description && (
            <span
              className="ml-1 inline-block text-gray-500 hover:text-gray-700 cursor-help"
              title={parameter.description}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </span>
          )}
        </label>
        {parameter.advanced && (
          <span className="text-xs text-gray-600">Advanced</span>
        )}
      </div>
      {renderControl()}
    </div>
  );
} 