import React from 'react';
import { useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import { usePipeline } from '../../contexts/PipelineContext';

export interface BaseNodeProps {
  id: string;
  type: 'input' | 'transformation' | 'output' | 'inspection';
  selected: boolean;
  children: React.ReactNode;
  title: string;
  color?: {
    border: string;
    background: string;
    header: string;
    headerText: string;
  };
  handles?: {
    input?: boolean;
    output?: boolean;
    inputPosition?: Position;
    outputPosition?: Position;
  };
  width?: string;
}

/**
 * BaseNode component that provides consistent styling and handles for all node types
 * This creates a foundation for reusable node components with consistent styling
 */
export default function BaseNode({
  id,
  type,
  selected,
  children,
  title,
  color = {
    border: 'border-gray-200',
    background: 'bg-white',
    header: 'bg-gray-800',
    headerText: 'text-white',
  },
  handles = {
    input: true,
    output: true,
    inputPosition: Position.Left,
    outputPosition: Position.Right,
  },
  width = 'w-72',
}: BaseNodeProps) {
  return (
    <div className={`rounded-lg shadow-lg ${color.background} ${width} overflow-hidden 
        ${selected ? 'ring-2 ring-blue-400' : `border ${color.border}`}`}>
      {handles.input && (
        <Handle
          type="target"
          position={handles.inputPosition || Position.Left}
          id="input"
          className="!w-3 !h-3 !bg-gray-700 !border-2 !border-white !z-10 connectablestart connectableend"
          style={{ top: '50%', transform: 'translateY(-50%)' }}
        />
      )}

      {handles.output && (
        <Handle
          type="source"
          position={handles.outputPosition || Position.Right}
          id="output"
          className="!w-3 !h-3 !bg-gray-700 !border-2 !border-white !z-10 source connectablestart connectableend connectionindicator"
          style={{ top: '50%', transform: 'translateY(-50%)' }}
        />
      )}

      <div className={`${color.header} ${color.headerText} py-2 px-3 flex justify-between items-center`}>
        <h3 className="text-sm font-semibold">{title}</h3>
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${
            type === 'input' ? 'bg-blue-400' : 
            type === 'output' ? 'bg-green-400' : 
            type === 'inspection' ? 'bg-teal-400' :
            'bg-purple-400'
          }`}></div>
        </div>
      </div>

      <div className="p-3">{children}</div>
    </div>
  );
} 