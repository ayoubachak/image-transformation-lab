import React, { useState, useEffect } from 'react';
import { Position } from 'reactflow';
import { usePipeline } from '../../contexts/PipelineContext';
import { WrenchScrewdriverIcon, ChartBarIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import BaseNode from './BaseNode';
import HistogramChart from '../charts/HistogramChart';
import InspectionConfigModal from '../modals/InspectionConfigModal';
import { histogramAnalyzer } from '../../services/HistogramAnalyzer';
import type { Inspection, HistogramData, InspectionResult } from '../../utils/types';

interface InspectionNodeProps {
  id: string;
  data: { 
    node: {
      id: string;
      inspection: Inspection;
    } 
  };
  selected: boolean;
}

export default function InspectionNode({ id, data, selected }: InspectionNodeProps) {
  const { 
    edges, 
    results, 
    updateNode, 
    updateParameter,
    getProcessedCanvas
  } = usePipeline();
  
  const [histogramData, setHistogramData] = useState<HistogramData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [lastProcessedInput, setLastProcessedInput] = useState<string | null>(null);

  const inspection = data.node.inspection;

  // Monitor for input changes and reprocess
  useEffect(() => {
    processInspection();
  }, [id, edges, results]);

  const processInspection = async () => {
    // Find connected input nodes
    const inputEdges = edges.filter(edge => edge.target === id);
    
    if (inputEdges.length === 0) {
      setHistogramData(null);
      setError(null);
      return;
    }

    const sourceNodeId = inputEdges[0].source;
    const sourceResult = results.get(sourceNodeId);

    // Skip if no source result or same input as last processed
    if (!sourceResult || sourceResult.status !== 'success' || !sourceResult.canvas) {
      return;
    }

    // Check if we already processed this input
    const inputSignature = `${sourceNodeId}-${sourceResult.canvas.toDataURL()}`;
    if (inputSignature === lastProcessedInput) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 10)); // Allow UI to update

      // Get image data from canvas
      const canvas = sourceResult.canvas;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Process based on inspection type
      switch (inspection.type) {
        case 'histogram':
          await processHistogram(imageData);
          break;
        default:
          throw new Error(`Unsupported inspection type: ${inspection.type}`);
      }

      setLastProcessedInput(inputSignature);
    } catch (err) {
      console.error('Inspection processing error:', err);
      setError(err instanceof Error ? err.message : 'Processing failed');
    } finally {
      setProcessing(false);
    }
  };

  const processHistogram = async (imageData: ImageData) => {
    // Get histogram type from parameters or auto-detect
    const histogramType = inspection.parameters.find(p => p.name === 'type')?.value as string || 'auto';
    
    let detectedType: 'rgb' | 'grayscale' | 'binary';
    
    if (histogramType === 'auto') {
      detectedType = histogramAnalyzer.autoDetectType(imageData);
    } else {
      detectedType = histogramType as 'rgb' | 'grayscale' | 'binary';
    }

    // Set the strategy and analyze
    histogramAnalyzer.setStrategy(detectedType);
    const data = histogramAnalyzer.analyze(imageData);
    
    setHistogramData(data);
  };

  const handleParameterChange = (name: string, value: any) => {
    updateParameter(id, name, value);
    // Trigger reprocessing when parameters change
    setTimeout(() => processInspection(), 100);
  };

  const handleSaveConfig = (updatedInspection: Inspection) => {
    updateNode(id, { inspection: updatedInspection });
    setShowConfig(false);
  };

  const getInspectionColors = () => {
    switch (inspection.type) {
      case 'histogram':
        return {
          border: 'border-cyan-200',
          background: 'bg-gradient-to-br from-cyan-50 to-white',
          header: 'bg-cyan-600',
          headerText: 'text-white'
        };
      default:
        return {
          border: 'border-gray-200',
          background: 'bg-gradient-to-br from-gray-50 to-white',
          header: 'bg-gray-600',
          headerText: 'text-white'
        };
    }
  };

  const renderContent = () => {
    if (processing) {
      return (
        <div className="flex flex-col items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-600 mb-2"></div>
          <p className="text-sm text-gray-600">Analyzing...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-4">
          <div className="flex items-center text-red-600 mb-2">
            <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
            <span className="text-sm font-medium">Analysis Error</span>
          </div>
          <p className="text-xs text-red-500">{error}</p>
          <button
            onClick={processInspection}
            className="mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      );
    }

    if (!histogramData) {
      return (
        <div className="p-4 text-center">
          <ChartBarIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Connect an input to analyze</p>
        </div>
      );
    }

    // Render based on inspection type
    switch (inspection.type) {
      case 'histogram':
        return (
          <div className="p-2">
            <HistogramChart 
              data={histogramData} 
              width={280} 
              height={200}
              interactive={true}
            />
            <div className="mt-2 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Type: {histogramData.imageType.toUpperCase()}</span>
                <span>Size: {histogramData.width}×{histogramData.height}</span>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="p-4 text-center">
            <p className="text-sm text-gray-500">Inspection type not implemented</p>
          </div>
        );
    }
  };

  return (
    <>
      <BaseNode
        id={id}
        type="inspection"
        selected={selected}
        title={inspection.name}
        color={getInspectionColors()}
        handles={{
          input: true,
          output: false,
          inputPosition: Position.Left
        }}
        width="w-80"
      >
        <div className="flex flex-col">
          {/* Configuration button */}
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-500">{inspection.description}</span>
            <button
              onClick={() => setShowConfig(true)}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              title="Configure inspection"
            >
              <WrenchScrewdriverIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Main content */}
          {renderContent()}

          {/* Parameters display for quick reference */}
          {inspection.parameters.length > 0 && histogramData && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <div className="text-xs text-gray-500">
                {inspection.parameters.map(param => (
                  <div key={param.name} className="flex justify-between">
                    <span>{param.label || param.name}:</span>
                    <span className="font-medium">{String(param.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </BaseNode>

      {/* Configuration Modal */}
      <InspectionConfigModal
        isOpen={showConfig}
        onClose={() => setShowConfig(false)}
        inspection={inspection}
        onSave={handleSaveConfig}
      />
    </>
  );
} 