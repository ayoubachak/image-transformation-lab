import type { Inspection, InspectionType } from './types';

// Inspection templates for different types of analysis
export const inspectionTemplates: Record<InspectionType, Omit<Inspection, 'id' | 'inputNodes'>> = {
  histogram: {
    type: 'histogram',
    name: 'Histogram Analysis',
    description: 'Analyze the distribution of pixel intensities',
    visualizationType: 'chart',
    isRealTime: true,
    parameters: [
      {
        name: 'type',
        type: 'select',
        value: 'auto',
        options: ['auto', 'rgb', 'grayscale', 'binary'],
        label: 'Histogram Type',
        description: 'Type of histogram to generate'
      },
      {
        name: 'binCount',
        type: 'number',
        value: 256,
        min: 16,
        max: 512,
        step: 16,
        label: 'Bin Count',
        description: 'Number of bins for histogram calculation',
        advanced: true
      },
      {
        name: 'normalize',
        type: 'boolean',
        value: false,
        label: 'Normalize',
        description: 'Normalize histogram values',
        advanced: true
      }
    ],
    metadata: {
      advancedParameters: {
        showPercentages: false,
        showStatistics: true,
        smoothing: false
      },
      displayOptions: {
        chartSize: 'medium',
        showStats: false,
        interactive: true
      },
      chartConfig: {
        backgroundColor: '#ffffff',
        gridColor: '#e2e8f0',
        axisColor: '#6b7280'
      }
    }
  },

  statistics: {
    type: 'statistics',
    name: 'Image Statistics',
    description: 'Calculate statistical properties of the image',
    visualizationType: 'table',
    isRealTime: true,
    parameters: [
      {
        name: 'includeChannels',
        type: 'boolean',
        value: true,
        label: 'Include Channels',
        description: 'Calculate statistics for individual RGB channels'
      },
      {
        name: 'calculatePercentiles',
        type: 'boolean',
        value: false,
        label: 'Calculate Percentiles',
        description: 'Include percentile calculations',
        advanced: true
      }
    ],
    metadata: {
      advancedParameters: {
        percentiles: [25, 50, 75, 90, 95, 99],
        precision: 2
      },
      displayOptions: {
        format: 'table',
        showGraphs: false
      }
    }
  },

  colorProfile: {
    type: 'colorProfile',
    name: 'Color Profile',
    description: 'Analyze color distribution and dominant colors',
    visualizationType: 'chart',
    isRealTime: true,
    parameters: [
      {
        name: 'dominantColors',
        type: 'number',
        value: 5,
        min: 3,
        max: 16,
        step: 1,
        label: 'Dominant Colors',
        description: 'Number of dominant colors to extract'
      },
      {
        name: 'colorSpace',
        type: 'select',
        value: 'rgb',
        options: ['rgb', 'hsv', 'lab'],
        label: 'Color Space',
        description: 'Color space for analysis',
        advanced: true
      }
    ],
    metadata: {
      advancedParameters: {
        clusteringMethod: 'kmeans',
        iterations: 20
      },
      displayOptions: {
        showPalette: true,
        showPercentages: true
      }
    }
  },

  dimensionInfo: {
    type: 'dimensionInfo',
    name: 'Dimension Info',
    description: 'Display image dimensions and properties',
    visualizationType: 'info',
    isRealTime: true,
    parameters: [
      {
        name: 'showFileSize',
        type: 'boolean',
        value: true,
        label: 'Show File Size',
        description: 'Display estimated file size'
      },
      {
        name: 'showColorDepth',
        type: 'boolean',
        value: true,
        label: 'Show Color Depth',
        description: 'Display color depth information'
      }
    ],
    metadata: {
      advancedParameters: {
        calculateMemoryUsage: true,
        showAspectRatio: true
      },
      displayOptions: {
        format: 'compact',
        showIcons: true
      }
    }
  },

  moduleCalculator: {
    type: 'moduleCalculator',
    name: 'Module Calculator',
    description: 'Calculate magnitude/module of image gradients',
    visualizationType: 'overlay',
    isRealTime: true,
    parameters: [
      {
        name: 'gradientMethod',
        type: 'select',
        value: 'sobel',
        options: ['sobel', 'scharr', 'laplacian'],
        label: 'Gradient Method',
        description: 'Method for calculating gradients'
      },
      {
        name: 'kernelSize',
        type: 'number',
        value: 3,
        min: 1,
        max: 31,
        step: 2,
        label: 'Kernel Size',
        description: 'Size of the gradient kernel (odd numbers only)'
      },
      {
        name: 'threshold',
        type: 'number',
        value: 10,
        min: 0,
        max: 255,
        step: 1,
        label: 'Magnitude Threshold',
        description: 'Minimum magnitude to consider'
      },
      {
        name: 'colormap',
        type: 'select',
        value: 'jet',
        options: ['jet', 'hot', 'cool', 'viridis'],
        label: 'Color Map',
        description: 'Color scheme for visualization'
      },
      {
        name: 'normalize',
        type: 'boolean',
        value: true,
        label: 'Normalize',
        description: 'Normalize magnitude values'
      }
    ],
    metadata: {
      category: 'gradient',
      complexity: 'intermediate',
      computationalCost: 'medium'
    }
  },

  phaseCalculator: {
    type: 'phaseCalculator',
    name: 'Phase Calculator',
    description: 'Calculate phase/direction of image gradients',
    visualizationType: 'overlay',
    isRealTime: true,
    parameters: [
      {
        name: 'gradientMethod',
        type: 'select',
        value: 'sobel',
        options: ['sobel', 'scharr'],
        label: 'Gradient Method',
        description: 'Method for calculating gradients'
      },
      {
        name: 'angleUnit',
        type: 'select',
        value: 'degrees',
        options: ['degrees', 'radians'],
        label: 'Angle Unit',
        description: 'Unit for angle measurements'
      },
      {
        name: 'magnitudeThreshold',
        type: 'number',
        value: 10,
        min: 0,
        max: 100,
        step: 1,
        label: 'Magnitude Threshold',
        description: 'Minimum gradient magnitude to consider'
      },
      {
        name: 'visualizationMode',
        type: 'select',
        value: 'color',
        options: ['color', 'arrows', 'both'],
        label: 'Visualization Mode',
        description: 'How to display phase information'
      },
      {
        name: 'arrowDensity',
        type: 'number',
        value: 20,
        min: 5,
        max: 50,
        step: 5,
        label: 'Arrow Density',
        description: 'Density of direction arrows (if enabled)'
      },
      {
        name: 'smoothing',
        type: 'boolean',
        value: false,
        label: 'Phase Smoothing',
        description: 'Apply smoothing to phase map'
      }
    ],
    metadata: {
      category: 'gradient',
      complexity: 'advanced',
      computationalCost: 'medium'
    }
  },

  edgeDensity: {
    type: 'edgeDensity',
    name: 'Edge Density Analyzer',
    description: 'Analyze edge density in image regions',
    visualizationType: 'heatmap',
    isRealTime: true,
    parameters: [
      {
        name: 'edgeDetector',
        type: 'select',
        value: 'canny',
        options: ['canny', 'sobel', 'laplacian', 'roberts'],
        label: 'Edge Detector',
        description: 'Method for edge detection'
      },
      {
        name: 'lowThreshold',
        type: 'number',
        value: 50,
        min: 0,
        max: 255,
        step: 1,
        label: 'Low Threshold',
        description: 'Lower threshold for edge detection'
      },
      {
        name: 'highThreshold',
        type: 'number',
        value: 150,
        min: 0,
        max: 255,
        step: 1,
        label: 'High Threshold',
        description: 'Upper threshold for edge detection'
      },
      {
        name: 'regionSize',
        type: 'number',
        value: 32,
        min: 8,
        max: 128,
        step: 8,
        label: 'Region Size',
        description: 'Size of analysis regions (pixels)'
      },
      {
        name: 'overlapRatio',
        type: 'number',
        value: 0.5,
        min: 0,
        max: 0.9,
        step: 0.1,
        label: 'Overlap Ratio',
        description: 'Overlap between adjacent regions'
      },
      {
        name: 'heatmapMode',
        type: 'select',
        value: 'density',
        options: ['density', 'strength', 'direction'],
        label: 'Heatmap Mode',
        description: 'What to visualize in the heatmap'
      }
    ],
    metadata: {
      category: 'structure',
      complexity: 'advanced',
      computationalCost: 'high'
    }
  },

  colorDistribution: {
    type: 'colorDistribution',
    name: 'Color Distribution Analyzer',
    description: 'Advanced analysis of color distribution and clustering',
    visualizationType: 'chart',
    isRealTime: false,
    parameters: [
      {
        name: 'colorSpace',
        type: 'select',
        value: 'rgb',
        options: ['rgb', 'hsv', 'lab', 'xyz'],
        label: 'Color Space',
        description: 'Color space for analysis'
      },
      {
        name: 'clusterCount',
        type: 'number',
        value: 8,
        min: 2,
        max: 32,
        step: 1,
        label: 'Cluster Count',
        description: 'Number of color clusters to identify'
      },
      {
        name: 'samplingRate',
        type: 'number',
        value: 0.1,
        min: 0.01,
        max: 1.0,
        step: 0.01,
        label: 'Sampling Rate',
        description: 'Fraction of pixels to sample for analysis'
      },
      {
        name: 'binSize',
        type: 'number',
        value: 8,
        min: 1,
        max: 32,
        step: 1,
        label: 'Histogram Bin Size',
        description: 'Size of histogram bins per channel'
      },
      {
        name: 'showClusters',
        type: 'boolean',
        value: true,
        label: 'Show Color Clusters',
        description: 'Display dominant color clusters'
      },
      {
        name: 'showDistribution',
        type: 'boolean',
        value: true,
        label: 'Show Distribution',
        description: 'Display color distribution charts'
      }
    ],
    metadata: {
      category: 'color',
      complexity: 'advanced',
      computationalCost: 'high'
    }
  },

  textureAnalysis: {
    type: 'textureAnalysis',
    name: 'Texture Analyzer',
    description: 'Analyze texture patterns using multiple descriptors',
    visualizationType: 'composite',
    isRealTime: false,
    parameters: [
      {
        name: 'method',
        type: 'select',
        value: 'glcm',
        options: ['glcm', 'lbp', 'gabor', 'wavelet'],
        label: 'Analysis Method',
        description: 'Texture analysis method'
      },
      {
        name: 'windowSize',
        type: 'number',
        value: 32,
        min: 8,
        max: 128,
        step: 8,
        label: 'Window Size',
        description: 'Size of analysis window'
      },
      {
        name: 'direction',
        type: 'select',
        value: 'all',
        options: ['horizontal', 'vertical', 'diagonal', 'all'],
        label: 'Analysis Direction',
        description: 'Direction for texture analysis'
      },
      {
        name: 'distance',
        type: 'number',
        value: 1,
        min: 1,
        max: 10,
        step: 1,
        label: 'Pixel Distance',
        description: 'Distance between pixel pairs for GLCM'
      },
      {
        name: 'radius',
        type: 'number',
        value: 3,
        min: 1,
        max: 8,
        step: 1,
        label: 'LBP Radius',
        description: 'Radius for Local Binary Pattern'
      },
      {
        name: 'gaborFrequency',
        type: 'number',
        value: 0.1,
        min: 0.01,
        max: 0.5,
        step: 0.01,
        label: 'Gabor Frequency',
        description: 'Frequency for Gabor filters'
      },
      {
        name: 'showFeatures',
        type: 'boolean',
        value: true,
        label: 'Show Feature Maps',
        description: 'Display individual texture features'
      }
    ],
    metadata: {
      category: 'texture',
      complexity: 'expert',
      computationalCost: 'very_high'
    }
  },

  fourierTransform: {
    type: 'fourierTransform',
    name: 'Fourier Transform Analyzer',
    description: 'Frequency domain analysis using Fast Fourier Transform',
    visualizationType: 'composite',
    isRealTime: false,
    parameters: [
      {
        name: 'visualizationMode',
        type: 'select',
        value: 'magnitude',
        options: ['magnitude', 'phase', 'both', 'spectrum'],
        label: 'Visualization Mode',
        description: 'What to display from the FFT'
      },
      {
        name: 'logScale',
        type: 'boolean',
        value: true,
        label: 'Logarithmic Scale',
        description: 'Use logarithmic scale for magnitude display'
      },
      {
        name: 'centerDC',
        type: 'boolean',
        value: true,
        label: 'Center DC Component',
        description: 'Shift zero frequency to center of spectrum'
      },
      {
        name: 'normalize',
        type: 'boolean',
        value: true,
        label: 'Normalize Values',
        description: 'Normalize spectrum values to 0-255 range'
      },
      {
        name: 'colormap',
        type: 'select',
        value: 'jet',
        options: ['jet', 'hot', 'cool', 'gray', 'hsv'],
        label: 'Color Map',
        description: 'Color mapping for magnitude visualization'
      },
      {
        name: 'filterType',
        type: 'select',
        value: 'none',
        options: ['none', 'lowpass', 'highpass', 'bandpass', 'notch'],
        label: 'Frequency Filter',
        description: 'Apply frequency domain filter'
      },
      {
        name: 'cutoffFrequency',
        type: 'number',
        value: 0.3,
        min: 0.01,
        max: 0.5,
        step: 0.01,
        label: 'Cutoff Frequency',
        description: 'Filter cutoff frequency (normalized)',
        dependsOn: 'filterType',
        showIf: (params) => params.filterType !== 'none'
      },
      {
        name: 'filterOrder',
        type: 'number',
        value: 2,
        min: 1,
        max: 10,
        step: 1,
        label: 'Filter Order',
        description: 'Order/sharpness of the frequency filter',
        dependsOn: 'filterType',
        showIf: (params) => params.filterType !== 'none',
        advanced: true
      },
      {
        name: 'showStatistics',
        type: 'boolean',
        value: true,
        label: 'Show Statistics',
        description: 'Display frequency domain statistics'
      },
      {
        name: 'showRadialProfile',
        type: 'boolean',
        value: false,
        label: 'Show Radial Profile',
        description: 'Display radial frequency profile',
        advanced: true
      },
      {
        name: 'windowFunction',
        type: 'select',
        value: 'none',
        options: ['none', 'hanning', 'hamming', 'blackman', 'kaiser'],
        label: 'Window Function',
        description: 'Apply windowing to reduce spectral leakage',
        advanced: true
      }
    ],
    metadata: {
      category: 'frequency',
      complexity: 'advanced',
      computationalCost: 'high'
    }
  }
}; 