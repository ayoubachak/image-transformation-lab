import React, { useState, useEffect } from 'react';
import { Position } from 'reactflow';
import { usePipeline } from '../../contexts/PipelineContext';
import { 
  WrenchScrewdriverIcon, 
  ChartBarIcon, 
  ExclamationTriangleIcon,
  ArrowsPointingOutIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import BaseNode from './BaseNode';
import HistogramChart from '../charts/HistogramChart';
import InspectionConfigModal from '../modals/InspectionConfigModal';
import { histogramAnalyzer } from '../../services/HistogramAnalyzer';
import { ModuleCalculator, GradientStrategyFactory } from '../../services/ModuleCalculator';
import { PhaseCalculator } from '../../services/PhaseCalculator';
import { EdgeDensityAnalyzer, EdgeDetectionStrategyFactory } from '../../services/EdgeDensityAnalyzer';
import { fourierTransformAnalyzer } from '../../services/FourierTransformAnalyzer';
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
        case 'fourierTransform':
          await processFourierTransform(imageData);
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
    // Simplified color distribution analysis
    const { data, width, height } = imageData;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    
    // Show original image with color analysis overlay
    ctx.putImageData(imageData, 0, 0);
    
    // Simple color sampling and analysis
    const colorSamples: { r: number; g: number; b: number; count: number }[] = [];
    const sampleStep = 20; // Sample every 20th pixel
    
    for (let i = 0; i < data.length; i += 4 * sampleStep) {
      const r = Math.floor(data[i] / 32) * 32; // Quantize colors
      const g = Math.floor(data[i + 1] / 32) * 32;
      const b = Math.floor(data[i + 2] / 32) * 32;
      
      const existing = colorSamples.find(c => c.r === r && c.g === g && c.b === b);
      if (existing) {
        existing.count++;
      } else {
        colorSamples.push({ r, g, b, count: 1 });
      }
    }
    
    // Sort by frequency and get top colors
    colorSamples.sort((a, b) => b.count - a.count);
    const topColors = colorSamples.slice(0, 8);
    
    // Draw color analysis overlay
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, height - 60, width, 60);
    
    // Show dominant colors
    const colorWidth = Math.min(width / topColors.length, 80);
    topColors.forEach((color, index) => {
      ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
      ctx.fillRect(index * colorWidth, height - 50, colorWidth - 2, 40);
      
      ctx.fillStyle = 'white';
      ctx.font = '10px Arial';
      ctx.fillText(`${color.count}`, index * colorWidth + 5, height - 15);
    });
    
    ctx.globalAlpha = 1.0;
    
    const statistics: Record<string, string | number> = {
      'Total Colors Found': colorSamples.length,
      'Samples Analyzed': Math.floor(data.length / (4 * sampleStep)),
      'Most Frequent Color': `RGB(${topColors[0]?.r || 0}, ${topColors[0]?.g || 0}, ${topColors[0]?.b || 0})`,
      'Dominant Color Count': topColors[0]?.count || 0
    };
    
    topColors.slice(0, 5).forEach((color, index) => {
      statistics[`Color ${index + 1}`] = `RGB(${color.r}, ${color.g}, ${color.b})`;
      statistics[`Color ${index + 1} Frequency`] = color.count;
    });
    
    setInspectionData({
      type: 'colorDistribution',
      canvas,
      data: { topColors, allColors: colorSamples },
      statistics,
      timestamp: Date.now()
    });
  };

  const processTextureAnalysis = async (imageData: ImageData) => {
    // Simplified texture analysis using edge detection
    const { data, width, height } = imageData;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    
    // Convert to grayscale
    const grayData = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      grayData[i / 4] = gray;
    }
    
    // Simple texture analysis using local variance
    const textureMap = new Uint8Array(width * height);
    const windowSize = 5;
    let totalTexture = 0;
    let textureCount = 0;
    
    for (let y = windowSize; y < height - windowSize; y++) {
      for (let x = windowSize; x < width - windowSize; x++) {
        let sum = 0;
        let sumSq = 0;
        let count = 0;
        
        // Calculate local variance in window
        for (let dy = -windowSize; dy <= windowSize; dy++) {
          for (let dx = -windowSize; dx <= windowSize; dx++) {
            const idx = (y + dy) * width + (x + dx);
            const val = grayData[idx];
            sum += val;
            sumSq += val * val;
            count++;
          }
        }
        
        const mean = sum / count;
        const variance = (sumSq / count) - (mean * mean);
        const texture = Math.sqrt(variance);
        
        textureMap[y * width + x] = Math.min(255, texture * 2);
        totalTexture += texture;
        textureCount++;
      }
    }
    
    // Create visualization
    const imageDataOut = ctx.createImageData(width, height);
    for (let i = 0; i < textureMap.length; i++) {
      const value = textureMap[i];
      imageDataOut.data[i * 4] = value;     // R
      imageDataOut.data[i * 4 + 1] = value; // G  
      imageDataOut.data[i * 4 + 2] = value; // B
      imageDataOut.data[i * 4 + 3] = 255;   // A
    }
    ctx.putImageData(imageDataOut, 0, 0);
    
    // Add heat map overlay for high texture areas
    ctx.globalAlpha = 0.4;
    const avgTexture = totalTexture / textureCount;
    for (let i = 0; i < textureMap.length; i++) {
      if (textureMap[i] > avgTexture * 1.5) {
        const x = i % width;
        const y = Math.floor(i / width);
        ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
        ctx.fillRect(x, y, 2, 2);
      }
    }
    ctx.globalAlpha = 1.0;
    
    const statistics: Record<string, string | number> = {
      'Analysis Method': 'Local Variance',
      'Window Size': windowSize,
      'Average Texture': avgTexture.toFixed(2),
      'High Texture Pixels': textureMap.filter(v => v > avgTexture * 1.5).length,
      'Texture Coverage': ((textureMap.filter(v => v > avgTexture * 1.5).length / textureMap.length) * 100).toFixed(1) + '%'
    };
    
    setInspectionData({
      type: 'textureAnalysis',
      canvas,
      data: { textureMap, avgTexture, windowSize },
      statistics,
      timestamp: Date.now()
    });
  };

  const processFourierTransform = async (imageData: ImageData) => {
    console.log('🔍 FFT Processing started for inspection:', inspection.type);
    console.log('📊 FFT ImageData received:', { width: imageData.width, height: imageData.height });
    
    try {
      // Get parameters from inspection config
      const visualizationMode = inspection.parameters.find(p => p.name === 'visualizationMode')?.value as 'magnitude' | 'phase' | 'both' | 'spectrum' || 'magnitude';
      const logScale = inspection.parameters.find(p => p.name === 'logScale')?.value as boolean || false;
      const centerDC = inspection.parameters.find(p => p.name === 'centerDC')?.value as boolean || false;
      const normalize = inspection.parameters.find(p => p.name === 'normalize')?.value as boolean || true;
      const colormap = inspection.parameters.find(p => p.name === 'colormap')?.value as 'jet' | 'hot' | 'cool' | 'gray' | 'hsv' || 'jet';
      const filterType = inspection.parameters.find(p => p.name === 'filterType')?.value as string || 'none';
      const cutoffFrequency = inspection.parameters.find(p => p.name === 'cutoffFrequency')?.value as number || 0;
      const filterOrder = inspection.parameters.find(p => p.name === 'filterOrder')?.value as number || 0;
      const windowFunction = inspection.parameters.find(p => p.name === 'windowFunction')?.value as string || 'none';
      const showStatistics = inspection.parameters.find(p => p.name === 'showStatistics')?.value as boolean || false;
      const showRadialProfile = inspection.parameters.find(p => p.name === 'showRadialProfile')?.value as boolean || false;
      
      // Perform FFT analysis using singleton instance - following same pattern as histogram
      const fftResult = fourierTransformAnalyzer.analyze(imageData, {
        visualizationMode,
        logScale,
        centerDC,
        normalize,
        colormap,
        filterType: filterType !== 'none' ? filterType as any : undefined,
        cutoffFrequency,
        filterOrder,
        windowFunction: windowFunction !== 'none' ? windowFunction as any : undefined,
        showRadialProfile
      });
      
      // Create visualization
      const canvas = fourierTransformAnalyzer.createVisualization(fftResult, {
        visualizationMode,
        logScale,
        centerDC,
        normalize,
        colormap,
        filterType: filterType !== 'none' ? filterType as any : 'none',
        cutoffFrequency,
        filterOrder,
        windowFunction: windowFunction !== 'none' ? windowFunction as any : 'none',
        showRadialProfile
      });
      
      // Prepare statistics
      const statistics: Record<string, string | number> = {
        'DC Component (Real)': fftResult.dcComponent.real.toFixed(2),
        'DC Component (Imaginary)': fftResult.dcComponent.imaginary.toFixed(2),
        'Max Magnitude': fftResult.statistics.maxMagnitude.toFixed(2),
        'Min Magnitude': fftResult.statistics.minMagnitude.toFixed(2),
        'Mean Magnitude': fftResult.statistics.meanMagnitude.toFixed(2),
        'Low Freq Energy': fftResult.statistics.energyDistribution.lowFreq.toFixed(2),
        'Mid Freq Energy': fftResult.statistics.energyDistribution.midFreq.toFixed(2),
        'High Freq Energy': fftResult.statistics.energyDistribution.highFreq.toFixed(2),
        'Dominant Frequencies': fftResult.statistics.dominantFrequencies.length
      };
      
      // Add dominant frequency details with proper typing
      fftResult.statistics.dominantFrequencies.slice(0, 5).forEach((freq, index) => {
        const peakNum = index + 1;
        statistics[`Peak ${peakNum} Position`] = `(${freq.x}, ${freq.y})`;
        statistics[`Peak ${peakNum} Magnitude`] = freq.magnitude.toFixed(2);
        statistics[`Peak ${peakNum} Frequency`] = freq.frequency.toFixed(4);
      });
      
      setInspectionData({
        type: 'fourierTransform',
        canvas,
        data: {
          fftResult,
          visualizationMode,
          parameters: {
            logScale,
            centerDC,
            normalize,
            colormap,
            filterType,
            cutoffFrequency,
            filterOrder,
            windowFunction,
            showRadialProfile
          }
        },
        statistics: showStatistics ? statistics : undefined,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Fourier Transform analysis error:', error);
      setInspectionData({
        type: 'fourierTransform',
        data: { error: 'Failed to analyze Fourier Transform' },
        timestamp: Date.now()
      });
    }
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

  // Helper function to format values for display
  const formatStatValue = (key: string, value: any): string => {
    if (Array.isArray(value)) {
      if (value.length > 5) {
        return `[${value.slice(0, 3).map(v => typeof v === 'number' ? v.toFixed(2) : v).join(', ')}, ... +${value.length - 3} more]`;
      }
      return `[${value.map(v => typeof v === 'number' ? v.toFixed(2) : v).join(', ')}]`;
    }
    
    if (typeof value === 'number') {
      return value.toFixed(3);
    }
    
    if (typeof value === 'object' && value !== null) {
      return `{${Object.keys(value).length} properties}`;
    }
    
    return String(value);
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
      case 'fourierTransform':
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
                        <span className="font-medium truncate ml-2">
                          {formatStatValue(key, value)}
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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const toggleSection = (sectionKey: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionKey)) {
      newExpanded.delete(sectionKey);
    } else {
      newExpanded.add(sectionKey);
    }
    setExpandedSections(newExpanded);
  };

  const formatFullValue = (key: string, value: any): React.ReactNode => {
    if (Array.isArray(value)) {
      const isExpanded = expandedSections.has(key);
      
      if (value.length > 10 && !isExpanded) {
        return (
          <div>
            <div className="flex items-center">
              <span className="font-mono text-sm">
                [{value.slice(0, 5).map(v => typeof v === 'number' ? v.toFixed(3) : v).join(', ')}, ...]
              </span>
              <button
                onClick={() => toggleSection(key)}
                className="ml-2 text-blue-600 hover:text-blue-800 text-sm flex items-center"
              >
                <ChevronRightIcon className="h-4 w-4 mr-1" />
                Show all {value.length} items
              </button>
            </div>
          </div>
        );
      }
      
      if (isExpanded && value.length > 10) {
        return (
          <div>
            <button
              onClick={() => toggleSection(key)}
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center mb-2"
            >
              <ChevronDownIcon className="h-4 w-4 mr-1" />
              Collapse array
            </button>
            <div className="font-mono text-sm bg-gray-100 p-2 rounded max-h-48 overflow-y-auto">
              [{value.map((v, i) => (
                <div key={i} className="inline">
                  {typeof v === 'number' ? v.toFixed(3) : String(v)}
                  {i < value.length - 1 ? ', ' : ''}
                  {i % 10 === 9 && i < value.length - 1 ? <br /> : ''}
                </div>
              ))}]
            </div>
          </div>
        );
      }
      
      return (
        <span className="font-mono text-sm">
          [{value.map(v => typeof v === 'number' ? v.toFixed(3) : String(v)).join(', ')}]
        </span>
      );
    }
    
    if (typeof value === 'number') {
      return <span className="font-mono">{value.toFixed(6)}</span>;
    }
    
    if (typeof value === 'object' && value !== null) {
      const isExpanded = expandedSections.has(key);
      
      if (!isExpanded) {
        return (
          <button
            onClick={() => toggleSection(key)}
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
          >
            <ChevronRightIcon className="h-4 w-4 mr-1" />
            Expand object ({Object.keys(value).length} properties)
          </button>
        );
      }
      
      return (
        <div>
          <button
            onClick={() => toggleSection(key)}
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center mb-2"
          >
            <ChevronDownIcon className="h-4 w-4 mr-1" />
            Collapse object
          </button>
          <div className="bg-gray-100 p-2 rounded text-sm">
            {Object.entries(value).map(([subKey, subValue]) => (
              <div key={subKey} className="flex justify-between mb-1">
                <span className="text-gray-600">{subKey}:</span>
                <span className="font-medium">
                  {Array.isArray(subValue) 
                    ? `Array(${subValue.length})`
                    : typeof subValue === 'number' 
                      ? subValue.toFixed(3)
                      : String(subValue)
                  }
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    return <span>{String(value)}</span>;
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50">
            <h3 className="text-xl font-semibold text-gray-900">
              {inspection.name} - Full Analysis View
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6 max-h-[calc(95vh-5rem)] overflow-y-auto">
            {inspectionData.type === 'histogram' && inspectionData.data && (
              <div className="flex flex-col items-center">
                <HistogramChart 
                  data={inspectionData.data} 
                  width={900} 
                  height={600}
                  interactive={true}
                />
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-3">Image Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Type:</span>
                        <span className="font-medium">{inspectionData.data.imageType.toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Dimensions:</span>
                        <span className="font-medium">{inspectionData.data.width}×{inspectionData.data.height}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Pixels:</span>
                        <span className="font-medium">{inspectionData.data.totalPixels.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {inspectionData.canvas && inspectionData.type !== 'histogram' && (
              <div className="flex flex-col items-center">
                <img 
                  src={inspectionData.canvas.toDataURL()} 
                  alt={`${inspection.type} visualization`}
                  className="max-w-full max-h-[70vh] object-contain rounded border shadow-lg mb-6"
                />
                
                {inspectionData.statistics && (
                  <div className="w-full max-w-4xl bg-gray-50 p-6 rounded-lg">
                    <h4 className="font-semibold mb-4 text-lg">Analysis Statistics</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(inspectionData.statistics).map(([key, value]) => (
                        <div key={key} className="bg-white p-3 rounded border">
                          <div className="font-medium text-gray-700 capitalize mb-2">
                            {key.replace(/([A-Z])/g, ' $1')}:
                          </div>
                          <div className="text-sm">
                            {formatFullValue(key, value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {inspectionData.type === 'statistics' && (
              <div className="space-y-8">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="font-semibold mb-4 text-lg">Image Dimensions</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded border">
                      <div className="text-sm text-gray-600">Width</div>
                      <div className="text-2xl font-bold">{inspectionData.data.dimensions.width}px</div>
                    </div>
                    <div className="bg-white p-4 rounded border">
                      <div className="text-sm text-gray-600">Height</div>
                      <div className="text-2xl font-bold">{inspectionData.data.dimensions.height}px</div>
                    </div>
                    <div className="bg-white p-4 rounded border">
                      <div className="text-sm text-gray-600">Total Pixels</div>
                      <div className="text-2xl font-bold">{inspectionData.data.pixelCount.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="font-semibold mb-4 text-lg">Channel Statistics</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(inspectionData.data.channels).map(([channel, stats]: [string, any]) => (
                      <div key={channel} className="bg-white p-4 rounded border">
                        <h5 className="font-medium capitalize mb-3 text-center">{channel}</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Mean:</span>
                            <span className="font-mono font-medium">{stats.mean.toFixed(3)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Min:</span>
                            <span className="font-mono font-medium">{stats.min}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Max:</span>
                            <span className="font-mono font-medium">{stats.max}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Range:</span>
                            <span className="font-mono font-medium">{stats.max - stats.min}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {inspectionData.data?.message && (
              <div className="text-center p-12 bg-gray-50 rounded-lg">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-lg text-gray-600">{inspectionData.data.message}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 