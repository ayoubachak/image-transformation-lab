import type { InspectionResult } from '../utils/types';

export interface ModuleData {
  magnitudeMap: Float32Array;
  width: number;
  height: number;
  maxMagnitude: number;
  minMagnitude: number;
  averageMagnitude: number;
  statistics: {
    histogram: number[];
    bins: number[];
    percentiles: Record<string, number>;
  };
}

export interface GradientResult {
  gx: Float32Array;
  gy: Float32Array;
  magnitude: Float32Array;
  width: number;
  height: number;
}

/**
 * Strategy interface for different gradient calculation methods
 */
export interface GradientStrategy {
  calculateGradients(imageData: ImageData): GradientResult;
  getName(): string;
}

/**
 * Sobel gradient calculation strategy
 */
export class SobelGradientStrategy implements GradientStrategy {
  private kernelSize: number;

  constructor(kernelSize: number = 3) {
    this.kernelSize = kernelSize;
  }

  calculateGradients(imageData: ImageData): GradientResult {
    const { width, height, data } = imageData;
    const gx = new Float32Array(width * height);
    const gy = new Float32Array(width * height);
    const magnitude = new Float32Array(width * height);

    // Convert to grayscale if needed
    const gray = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    }

    // Sobel kernels
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    // Apply Sobel operator
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let sumX = 0;
        let sumY = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixelIdx = (y + ky) * width + (x + kx);
            const kernelIdx = (ky + 1) * 3 + (kx + 1);
            
            sumX += gray[pixelIdx] * sobelX[kernelIdx];
            sumY += gray[pixelIdx] * sobelY[kernelIdx];
          }
        }

        const idx = y * width + x;
        gx[idx] = sumX;
        gy[idx] = sumY;
        magnitude[idx] = Math.sqrt(sumX * sumX + sumY * sumY);
      }
    }

    return { gx, gy, magnitude, width, height };
  }

  getName(): string {
    return 'Sobel';
  }
}

/**
 * Scharr gradient calculation strategy
 */
export class ScharrGradientStrategy implements GradientStrategy {
  calculateGradients(imageData: ImageData): GradientResult {
    const { width, height, data } = imageData;
    const gx = new Float32Array(width * height);
    const gy = new Float32Array(width * height);
    const magnitude = new Float32Array(width * height);

    // Convert to grayscale
    const gray = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    }

    // Scharr kernels (more accurate than Sobel)
    const scharrX = [-3, 0, 3, -10, 0, 10, -3, 0, 3];
    const scharrY = [-3, -10, -3, 0, 0, 0, 3, 10, 3];

    // Apply Scharr operator
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let sumX = 0;
        let sumY = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixelIdx = (y + ky) * width + (x + kx);
            const kernelIdx = (ky + 1) * 3 + (kx + 1);
            
            sumX += gray[pixelIdx] * scharrX[kernelIdx];
            sumY += gray[pixelIdx] * scharrY[kernelIdx];
          }
        }

        const idx = y * width + x;
        gx[idx] = sumX / 32; // Normalize
        gy[idx] = sumY / 32;
        magnitude[idx] = Math.sqrt(sumX * sumX + sumY * sumY) / 32;
      }
    }

    return { gx, gy, magnitude, width, height };
  }

  getName(): string {
    return 'Scharr';
  }
}

/**
 * Laplacian magnitude calculation strategy
 */
export class LaplacianGradientStrategy implements GradientStrategy {
  calculateGradients(imageData: ImageData): GradientResult {
    const { width, height, data } = imageData;
    const gx = new Float32Array(width * height);
    const gy = new Float32Array(width * height);
    const magnitude = new Float32Array(width * height);

    // Convert to grayscale
    const gray = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    }

    // Laplacian kernel
    const laplacian = [0, -1, 0, -1, 4, -1, 0, -1, 0];

    // Apply Laplacian operator
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let sum = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixelIdx = (y + ky) * width + (x + kx);
            const kernelIdx = (ky + 1) * 3 + (kx + 1);
            
            sum += gray[pixelIdx] * laplacian[kernelIdx];
          }
        }

        const idx = y * width + x;
        magnitude[idx] = Math.abs(sum);
        // For Laplacian, we don't have separate X and Y components
        gx[idx] = 0;
        gy[idx] = 0;
      }
    }

    return { gx, gy, magnitude, width, height };
  }

  getName(): string {
    return 'Laplacian';
  }
}

/**
 * Factory for creating gradient strategies
 */
export class GradientStrategyFactory {
  static create(method: string, kernelSize: number = 3): GradientStrategy {
    switch (method.toLowerCase()) {
      case 'sobel':
        return new SobelGradientStrategy(kernelSize);
      case 'scharr':
        return new ScharrGradientStrategy();
      case 'laplacian':
        return new LaplacianGradientStrategy();
      default:
        return new SobelGradientStrategy(kernelSize);
    }
  }
}

/**
 * Module Calculator for analyzing gradient magnitudes
 */
export class ModuleCalculator {
  private strategy: GradientStrategy;

  constructor(strategy: GradientStrategy) {
    this.strategy = strategy;
  }

  /**
   * Calculate magnitude/module analysis
   */
  public calculateModule(
    imageData: ImageData,
    options: {
      threshold?: number;
      normalize?: boolean;
      generateHistogram?: boolean;
    } = {}
  ): ModuleData {
    const {
      threshold = 0,
      normalize = true,
      generateHistogram = true
    } = options;

    // Calculate gradients
    const gradientResult = this.strategy.calculateGradients(imageData);
    const { magnitude, width, height } = gradientResult;

    // Apply threshold
    const thresholdedMagnitude = new Float32Array(magnitude.length);
    for (let i = 0; i < magnitude.length; i++) {
      thresholdedMagnitude[i] = magnitude[i] >= threshold ? magnitude[i] : 0;
    }

    // Calculate statistics
    let minMagnitude = Infinity;
    let maxMagnitude = -Infinity;
    let sum = 0;
    let nonZeroCount = 0;

    for (let i = 0; i < thresholdedMagnitude.length; i++) {
      const value = thresholdedMagnitude[i];
      if (value > 0) {
        minMagnitude = Math.min(minMagnitude, value);
        maxMagnitude = Math.max(maxMagnitude, value);
        sum += value;
        nonZeroCount++;
      }
    }

    if (nonZeroCount === 0) {
      minMagnitude = 0;
      maxMagnitude = 0;
    }

    const averageMagnitude = nonZeroCount > 0 ? sum / nonZeroCount : 0;

    // Normalize if requested
    let finalMagnitude = thresholdedMagnitude;
    if (normalize && maxMagnitude > 0) {
      finalMagnitude = new Float32Array(thresholdedMagnitude.length);
      for (let i = 0; i < thresholdedMagnitude.length; i++) {
        finalMagnitude[i] = (thresholdedMagnitude[i] / maxMagnitude) * 255;
      }
    }

    // Generate histogram and statistics
    let statistics = {
      histogram: [] as number[],
      bins: [] as number[],
      percentiles: {} as Record<string, number>
    };

    if (generateHistogram) {
      statistics = this.generateStatistics(finalMagnitude);
    }

    return {
      magnitudeMap: finalMagnitude,
      width,
      height,
      maxMagnitude,
      minMagnitude,
      averageMagnitude,
      statistics
    };
  }

  /**
   * Generate statistical analysis
   */
  private generateStatistics(magnitude: Float32Array): {
    histogram: number[];
    bins: number[];
    percentiles: Record<string, number>;
  } {
    const numBins = 256;
    const histogram = new Array(numBins).fill(0);
    const bins = new Array(numBins);
    
    // Create bins
    for (let i = 0; i < numBins; i++) {
      bins[i] = i;
    }

    // Build histogram
    const nonZeroValues: number[] = [];
    for (let i = 0; i < magnitude.length; i++) {
      const value = magnitude[i];
      if (value > 0) {
        const bin = Math.min(Math.floor(value), numBins - 1);
        histogram[bin]++;
        nonZeroValues.push(value);
      }
    }

    // Calculate percentiles
    nonZeroValues.sort((a, b) => a - b);
    const percentiles: Record<string, number> = {};
    
    if (nonZeroValues.length > 0) {
      const getPercentile = (p: number) => {
        const index = Math.floor((p / 100) * (nonZeroValues.length - 1));
        return nonZeroValues[index];
      };

      percentiles['5th'] = getPercentile(5);
      percentiles['25th'] = getPercentile(25);
      percentiles['50th'] = getPercentile(50);
      percentiles['75th'] = getPercentile(75);
      percentiles['95th'] = getPercentile(95);
    }

    return { histogram, bins, percentiles };
  }

  /**
   * Create visualization canvas
   */
  public createVisualization(
    moduleData: ModuleData,
    options: {
      colormap?: string;
      showOriginal?: boolean;
      blendRatio?: number;
    } = {}
  ): HTMLCanvasElement {
    const {
      colormap = 'jet',
      showOriginal = false,
      blendRatio = 0.7
    } = options;

    const { magnitudeMap, width, height } = moduleData;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    // Apply colormap
    for (let i = 0; i < magnitudeMap.length; i++) {
      const value = magnitudeMap[i];
      const color = this.applyColormap(value / 255, colormap);
      
      const idx = i * 4;
      data[idx] = color.r;
      data[idx + 1] = color.g;
      data[idx + 2] = color.b;
      data[idx + 3] = value > 0 ? 255 : 0; // Transparent for zero values
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  /**
   * Apply colormap to value (0-1 range)
   */
  private applyColormap(value: number, colormap: string): { r: number, g: number, b: number } {
    value = Math.max(0, Math.min(1, value)); // Clamp to [0,1]

    switch (colormap) {
      case 'jet':
        return this.jetColormap(value);
      case 'hot':
        return this.hotColormap(value);
      case 'cool':
        return this.coolColormap(value);
      default:
        return this.jetColormap(value);
    }
  }

  private jetColormap(value: number): { r: number, g: number, b: number } {
    const r = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * value - 3)));
    const g = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * value - 2)));
    const b = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * value - 1)));
    
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  private hotColormap(value: number): { r: number, g: number, b: number } {
    const r = value < 0.33 ? value * 3 : 1;
    const g = value < 0.33 ? 0 : value < 0.66 ? (value - 0.33) * 3 : 1;
    const b = value < 0.66 ? 0 : (value - 0.66) * 3;
    
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  private coolColormap(value: number): { r: number, g: number, b: number } {
    return {
      r: Math.round((1 - value) * 255),
      g: Math.round(value * 255),
      b: 255
    };
  }
} 