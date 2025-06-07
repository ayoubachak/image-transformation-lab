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
  }
}; 