import React, { useState, useEffect } from 'react';
import { Position } from 'reactflow';
import { usePipeline } from '../../contexts/PipelineContext';
import { 
  WrenchScrewdriverIcon, 
  ChartBarIcon, 
  ExclamationTriangleIcon,
  ArrowsPointingOutIcon 
} from '@heroicons/react/24/outline';
import BaseNode from './BaseNode';
import HistogramChart from '../charts/HistogramChart';
import InspectionConfigModal from '../modals/InspectionConfigModal';
import { histogramAnalyzer } from '../../services/HistogramAnalyzer';
import { ModuleCalculator, GradientStrategyFactory } from '../../services/ModuleCalculator';
import { PhaseCalculator } from '../../services/PhaseCalculator';
import { EdgeDensityAnalyzer, EdgeDetectionStrategyFactory } from '../../services/EdgeDensityAnalyzer';
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

interface InspectionData {
  type: string;
  canvas?: HTMLCanvasElement;
  data?: any;
  statistics?: any;
  timestamp: number;
}

export default function InspectionNode({ id, data, selected }: InspectionNodeProps) {
  const { 
    edges, 
    results, 
    updateNode, 
    updateParameter,
    getProcessedCanvas
  } = usePipeline();
  
  const [inspectionData, setInspectionData] = useState<InspectionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showFullSize, setShowFullSize] = useState(false);
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
      setInspectionData(null);
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
        case 'moduleCalculator':
          await processModuleCalculator(imageData);
          break;
        case 'phaseCalculator':
          await processPhaseCalculator(imageData);
          break;
        case 'edgeDensity':
          await processEdgeDensity(imageData);
          break;
        case 'colorDistribution':
          await processColorDistribution(imageData);
          break;
        case 'textureAnalysis':
          await processTextureAnalysis(imageData);
          break;
        case 'statistics':
          await processStatistics(imageData);
          break;
        case 'colorProfile':
          await processColorProfile(imageData);
          break;
        case 'dimensionInfo':
          await processDimensionInfo(imageData);
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
    
    setInspectionData({
      type: 'histogram',
      data,
      timestamp: Date.now()
    });
  };

  const processModuleCalculator = async (imageData: ImageData) => {
    const gradientMethod = inspection.parameters.find(p => p.name === 'gradientMethod')?.value as string || 'sobel';
    const kernelSize = inspection.parameters.find(p => p.name === 'kernelSize')?.value as number || 3;
    const threshold = inspection.parameters.find(p => p.name === 'threshold')?.value as number || 10;
    const colormap = inspection.parameters.find(p => p.name === 'colormap')?.value as string || 'jet';
    const normalize = inspection.parameters.find(p => p.name === 'normalize')?.value as boolean ?? true;

    const strategy = GradientStrategyFactory.create(gradientMethod, kernelSize);
    const calculator = new ModuleCalculator(strategy);
    
    const moduleData = calculator.calculateModule(imageData, {
      threshold,
      normalize,
      generateHistogram: true
    });
    
    const visualizationCanvas = calculator.createVisualization(moduleData, {
      colormap,
      showOriginal: false
    });
    
    setInspectionData({
      type: 'moduleCalculator',
      canvas: visualizationCanvas,
      data: moduleData,
      statistics: moduleData.statistics,
      timestamp: Date.now()
    });
  };

  const processPhaseCalculator = async (imageData: ImageData) => {
    const gradientMethod = inspection.parameters.find(p => p.name === 'gradientMethod')?.value as string || 'sobel';
    const angleUnit = inspection.parameters.find(p => p.name === 'angleUnit')?.value as 'degrees' | 'radians' || 'degrees';
    const magnitudeThreshold = inspection.parameters.find(p => p.name === 'magnitudeThreshold')?.value as number || 10;
    const visualizationMode = inspection.parameters.find(p => p.name === 'visualizationMode')?.value as string || 'color';
    const arrowDensity = inspection.parameters.find(p => p.name === 'arrowDensity')?.value as number || 20;
    const smoothing = inspection.parameters.find(p => p.name === 'smoothing')?.value as boolean || false;

    const strategy = GradientStrategyFactory.create(gradientMethod);
    const calculator = new PhaseCalculator(strategy);
    
    const phaseData = calculator.calculatePhase(imageData, {
      angleUnit,
      magnitudeThreshold,
      smoothing,
      generateStatistics: true
    });
    
    const visualizationCanvas = calculator.createVisualization(phaseData, {
      overlayMode: visualizationMode as 'color' | 'arrows' | 'both',
      arrowDensity,
      showColorwheel: true
    });
    
    setInspectionData({
      type: 'phaseCalculator',
      canvas: visualizationCanvas,
      data: phaseData,
      statistics: phaseData.statistics,
      timestamp: Date.now()
    });
  };

  const processEdgeDensity = async (imageData: ImageData) => {
    const edgeDetector = inspection.parameters.find(p => p.name === 'edgeDetector')?.value as string || 'canny';
    const lowThreshold = inspection.parameters.find(p => p.name === 'lowThreshold')?.value as number || 50;
    const highThreshold = inspection.parameters.find(p => p.name === 'highThreshold')?.value as number || 150;
    const regionSize = inspection.parameters.find(p => p.name === 'regionSize')?.value as number || 32;
    const overlapRatio = inspection.parameters.find(p => p.name === 'overlapRatio')?.value as number || 0.5;
    const heatmapMode = inspection.parameters.find(p => p.name === 'heatmapMode')?.value as string || 'density';

    const strategy = EdgeDetectionStrategyFactory.create(edgeDetector);
    const analyzer = new EdgeDensityAnalyzer(strategy);
    
    const densityData = analyzer.analyzeEdgeDensity(imageData, {
      regionSize,
      overlapRatio,
      edgeParams: { lowThreshold, highThreshold },
      heatmapMode: heatmapMode as 'density' | 'strength' | 'direction'
    });
    
    const visualizationCanvas = analyzer.createVisualization(densityData, {
      colormap: 'hot',
      interpolation: true,
      showHotspots: true
    });
    
    setInspectionData({
      type: 'edgeDensity',
      canvas: visualizationCanvas,
      data: densityData,
      statistics: densityData.statistics,
      timestamp: Date.now()
    });
  };

  const processColorDistribution = async (imageData: ImageData) => {
    // Placeholder implementation for color distribution analysis
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.putImageData(imageData, 0, 0);
      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    setInspectionData({
      type: 'colorDistribution',
      canvas,
      data: { message: 'Color distribution analysis - implementation in progress' },
      timestamp: Date.now()
    });
  };

  const processTextureAnalysis = async (imageData: ImageData) => {
    // Placeholder implementation for texture analysis
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.putImageData(imageData, 0, 0);
      ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    setInspectionData({
      type: 'textureAnalysis',
      canvas,
      data: { message: 'Texture analysis - implementation in progress' },
      timestamp: Date.now()
    });
  };

  const processStatistics = async (imageData: ImageData) => {
    // Calculate basic image statistics
    const { data: pixels, width, height } = imageData;
    let totalR = 0, totalG = 0, totalB = 0, totalGray = 0;
    let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
    let minGray = 255, maxGray = 0;
    
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      
      totalR += r; totalG += g; totalB += b; totalGray += gray;
      minR = Math.min(minR, r); maxR = Math.max(maxR, r);
      minG = Math.min(minG, g); maxG = Math.max(maxG, g);
      minB = Math.min(minB, b); maxB = Math.max(maxB, b);
      minGray = Math.min(minGray, gray); maxGray = Math.max(maxGray, gray);
    }
    
    const pixelCount = pixels.length / 4;
    const stats = {
      dimensions: { width, height },
      pixelCount,
      channels: {
        red: { mean: totalR / pixelCount, min: minR, max: maxR },
        green: { mean: totalG / pixelCount, min: minG, max: maxG },
        blue: { mean: totalB / pixelCount, min: minB, max: maxB },
        grayscale: { mean: totalGray / pixelCount, min: minGray, max: maxGray }
      }
    };
    
    setInspectionData({
      type: 'statistics',
      data: stats,
      timestamp: Date.now()
    });
  };

  const processColorProfile = async (imageData: ImageData) => {
    // Placeholder for color profile analysis
    setInspectionData({
      type: 'colorProfile',
      data: { message: 'Color profile analysis - implementation in progress' },
      timestamp: Date.now()
    });
  };

  const processDimensionInfo = async (imageData: ImageData) => {
    const { width, height } = imageData;
    const aspectRatio = width / height;
    const megapixels = (width * height) / 1000000;
    
    setInspectionData({
      type: 'dimensionInfo',
      data: {
        width,
        height,
        aspectRatio: aspectRatio.toFixed(3),
        megapixels: megapixels.toFixed(2),
        totalPixels: width * height
      },
      timestamp: Date.now()
    });
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
      case 'moduleCalculator':
        return {
          border: 'border-orange-200',
          background: 'bg-gradient-to-br from-orange-50 to-white',
          header: 'bg-orange-600',
          headerText: 'text-white'
        };
      case 'phaseCalculator':
        return {
          border: 'border-purple-200',
          background: 'bg-gradient-to-br from-purple-50 to-white',
          header: 'bg-purple-600',
          headerText: 'text-white'
        };
      case 'edgeDensity':
        return {
          border: 'border-red-200',
          background: 'bg-gradient-to-br from-red-50 to-white',
          header: 'bg-red-600',
          headerText: 'text-white'
        };
      case 'colorDistribution':
        return {
          border: 'border-pink-200',
          background: 'bg-gradient-to-br from-pink-50 to-white',
          header: 'bg-pink-600',
          headerText: 'text-white'
        };
      case 'textureAnalysis':
        return {
          border: 'border-green-200',
          background: 'bg-gradient-to-br from-green-50 to-white',
          header: 'bg-green-600',
          headerText: 'text-white'
        };
      case 'statistics':
        return {
          border: 'border-blue-200',
          background: 'bg-gradient-to-br from-blue-50 to-white',
          header: 'bg-blue-600',
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

    if (!inspectionData) {
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
              data={inspectionData.data} 
              width={280} 
              height={200}
              interactive={true}
            />
            <div className="mt-2 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Type: {inspectionData.data.imageType.toUpperCase()}</span>
                <span>Size: {inspectionData.data.width}×{inspectionData.data.height}</span>
              </div>
            </div>
          </div>
        );
      
      case 'moduleCalculator':
      case 'phaseCalculator':
      case 'edgeDensity':
      case 'colorDistribution':
      case 'textureAnalysis':
        return (
          <div className="p-2">
            {inspectionData.canvas ? (
              <div className="relative">
                <img 
                  src={inspectionData.canvas.toDataURL()} 
                  alt={`${inspection.type} visualization`}
                  className="max-h-52 w-full object-contain mx-auto rounded border"
                />
                {inspectionData.statistics && (
                  <div className="mt-2 text-xs text-gray-600">
                    {Object.entries(inspectionData.statistics).slice(0, 2).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span>{key}:</span>
                        <span className="font-medium">
                          {typeof value === 'number' ? value.toFixed(2) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">
                <p className="text-sm">{inspectionData.data?.message || 'Processing...'}</p>
              </div>
            )}
          </div>
        );
      
      case 'statistics':
        return (
          <div className="p-2">
            <div className="text-xs text-gray-700 space-y-1">
              <div className="flex justify-between">
                <span>Dimensions:</span>
                <span className="font-medium">
                  {inspectionData.data.dimensions.width}×{inspectionData.data.dimensions.height}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Pixels:</span>
                <span className="font-medium">{inspectionData.data.pixelCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Mean R:</span>
                <span className="font-medium">{inspectionData.data.channels.red.mean.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span>Mean G:</span>
                <span className="font-medium">{inspectionData.data.channels.green.mean.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span>Mean B:</span>
                <span className="font-medium">{inspectionData.data.channels.blue.mean.toFixed(1)}</span>
              </div>
            </div>
          </div>
        );
      
      case 'dimensionInfo':
        return (
          <div className="p-2">
            <div className="text-xs text-gray-700 space-y-1">
              {Object.entries(inspectionData.data).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                  <span className="font-medium">{String(value)}</span>
                </div>
              ))}
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
          {/* Configuration and Full Size buttons */}
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-500 flex-1 pr-2">{inspection.description}</span>
            <div className="flex space-x-1">
              {/* Full Size View button */}
              {inspectionData && (
                <button
                  onClick={() => setShowFullSize(true)}
                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                  title="View full size"
                >
                  <ArrowsPointingOutIcon className="h-4 w-4" />
                </button>
              )}
              
              {/* Configuration button */}
              <button
                onClick={() => setShowConfig(true)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                title="Configure inspection"
              >
                <WrenchScrewdriverIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Main content */}
          {renderContent()}

          {/* Parameters display for quick reference */}
          {inspection.parameters.length > 0 && inspectionData && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <div className="text-xs text-gray-500">
                {inspection.parameters.slice(0, 2).map(param => (
                  <div key={param.name} className="flex justify-between">
                    <span>{param.label || param.name}:</span>
                    <span className="font-medium">{String(param.value)}</span>
                  </div>
                ))}
                {inspection.parameters.length > 2 && (
                  <div className="text-center text-gray-400 mt-1">
                    +{inspection.parameters.length - 2} more parameters
                  </div>
                )}
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

      {/* Full Size View Modal */}
      {inspectionData && (
        <FullSizeInspectionModal
          isOpen={showFullSize}
          onClose={() => setShowFullSize(false)}
          inspectionData={inspectionData}
          inspection={inspection}
        />
      )}
    </>
  );
}

// Full Size Inspection Modal Component
interface FullSizeInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  inspectionData: InspectionData;
  inspection: Inspection;
}

function FullSizeInspectionModal({ 
  isOpen, 
  onClose, 
  inspectionData, 
  inspection 
}: FullSizeInspectionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-6xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {inspection.name} - Full View
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 rounded"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6 max-h-[calc(90vh-8rem)] overflow-y-auto">
            {inspectionData.type === 'histogram' && inspectionData.data && (
              <div className="flex flex-col items-center">
                <HistogramChart 
                  data={inspectionData.data} 
                  width={800} 
                  height={600}
                  interactive={true}
                />
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-semibold mb-2">Image Info</h4>
                    <p>Type: {inspectionData.data.imageType.toUpperCase()}</p>
                    <p>Size: {inspectionData.data.width}×{inspectionData.data.height}</p>
                    <p>Total Pixels: {inspectionData.data.totalPixels.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}
            
            {inspectionData.canvas && inspectionData.type !== 'histogram' && (
              <div className="flex flex-col items-center">
                <img 
                  src={inspectionData.canvas.toDataURL()} 
                  alt={`${inspection.type} visualization`}
                  className="max-w-full max-h-[60vh] object-contain rounded border shadow-sm"
                />
                
                {inspectionData.statistics && (
                  <div className="mt-6 bg-gray-50 p-4 rounded-md">
                    <h4 className="font-semibold mb-3">Analysis Statistics</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      {Object.entries(inspectionData.statistics).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-gray-600 capitalize">
                            {key.replace(/([A-Z])/g, ' $1')}:
                          </span>
                          <span className="font-medium">
                            {typeof value === 'number' 
                              ? value.toFixed(3) 
                              : typeof value === 'object' 
                                ? JSON.stringify(value).slice(0, 50) + '...'
                                : String(value)
                            }
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {inspectionData.type === 'statistics' && (
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3">Image Dimensions</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span>Width:</span>
                      <span className="font-medium">{inspectionData.data.dimensions.width}px</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Height:</span>
                      <span className="font-medium">{inspectionData.data.dimensions.height}px</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Pixels:</span>
                      <span className="font-medium">{inspectionData.data.pixelCount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3">Channel Statistics</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(inspectionData.data.channels).map(([channel, stats]: [string, any]) => (
                      <div key={channel} className="bg-gray-50 p-3 rounded">
                        <h5 className="font-medium capitalize mb-2">{channel}</h5>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Mean:</span>
                            <span className="font-medium">{stats.mean.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Min:</span>
                            <span className="font-medium">{stats.min}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Max:</span>
                            <span className="font-medium">{stats.max}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {inspectionData.data?.message && (
              <div className="text-center p-8">
                <p className="text-gray-600">{inspectionData.data.message}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 