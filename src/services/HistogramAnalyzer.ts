import type { HistogramData } from '../utils/types';

/**
 * Strategy interface for histogram calculation
 */
interface HistogramStrategy {
  calculateHistogram(imageData: ImageData): HistogramData;
}

/**
 * RGB Histogram Strategy
 */
class RGBHistogramStrategy implements HistogramStrategy {
  calculateHistogram(imageData: ImageData): HistogramData {
    const red = new Array(256).fill(0);
    const green = new Array(256).fill(0);
    const blue = new Array(256).fill(0);
    
    const data = imageData.data;
    const totalPixels = imageData.width * imageData.height;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      red[r]++;
      green[g]++;
      blue[b]++;
    }
    
    return {
      red,
      green,
      blue,
      imageType: 'rgb',
      totalPixels,
      width: imageData.width,
      height: imageData.height
    };
  }
}

/**
 * Grayscale Histogram Strategy
 */
class GrayscaleHistogramStrategy implements HistogramStrategy {
  calculateHistogram(imageData: ImageData): HistogramData {
    const gray = new Array(256).fill(0);
    
    const data = imageData.data;
    const totalPixels = imageData.width * imageData.height;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Convert to grayscale using luminance formula
      const grayValue = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      gray[grayValue]++;
    }
    
    return {
      gray,
      imageType: 'grayscale',
      totalPixels,
      width: imageData.width,
      height: imageData.height
    };
  }
}

/**
 * Binary Histogram Strategy
 */
class BinaryHistogramStrategy implements HistogramStrategy {
  calculateHistogram(imageData: ImageData): HistogramData {
    const binary = new Array(2).fill(0); // Only 0 and 1 for binary
    
    const data = imageData.data;
    const totalPixels = imageData.width * imageData.height;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Convert to grayscale first, then to binary
      const grayValue = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      const binaryValue = grayValue > 127 ? 1 : 0; // Simple thresholding
      binary[binaryValue]++;
    }
    
    return {
      binary,
      imageType: 'binary',
      totalPixels,
      width: imageData.width,
      height: imageData.height
    };
  }
}

/**
 * Factory for creating histogram strategies
 */
class HistogramStrategyFactory {
  static createStrategy(type: 'rgb' | 'grayscale' | 'binary'): HistogramStrategy {
    switch (type) {
      case 'rgb':
        return new RGBHistogramStrategy();
      case 'grayscale':
        return new GrayscaleHistogramStrategy();
      case 'binary':
        return new BinaryHistogramStrategy();
      default:
        throw new Error(`Unsupported histogram type: ${type}`);
    }
  }
}

/**
 * Main Histogram Analyzer Service
 * Uses Strategy pattern to handle different types of histogram calculations
 */
export class HistogramAnalyzer {
  private strategy: HistogramStrategy;
  
  constructor(type: 'rgb' | 'grayscale' | 'binary' = 'rgb') {
    this.strategy = HistogramStrategyFactory.createStrategy(type);
  }
  
  /**
   * Change the histogram calculation strategy
   */
  setStrategy(type: 'rgb' | 'grayscale' | 'binary'): void {
    this.strategy = HistogramStrategyFactory.createStrategy(type);
  }
  
  /**
   * Calculate histogram for the given image data
   */
  analyze(imageData: ImageData): HistogramData {
    return this.strategy.calculateHistogram(imageData);
  }
  
  /**
   * Auto-detect the most appropriate histogram type based on image content
   */
  autoDetectType(imageData: ImageData): 'rgb' | 'grayscale' | 'binary' {
    const data = imageData.data;
    let isGrayscale = true;
    let isBinary = true;
    const colorValues = new Set<number>();
    
    // Sample some pixels to determine type
    const sampleRate = Math.max(1, Math.floor(data.length / (4 * 1000))); // Sample ~1000 pixels max
    
    for (let i = 0; i < data.length; i += 4 * sampleRate) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Check if it's grayscale
      if (r !== g || g !== b) {
        isGrayscale = false;
      }
      
      // For binary detection, convert to grayscale first
      const grayValue = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      colorValues.add(grayValue);
      
      // If we have more than 2 distinct gray values, it's not binary
      if (colorValues.size > 2) {
        isBinary = false;
      }
      
      // Early exit if we know it's RGB
      if (!isGrayscale && !isBinary) {
        break;
      }
    }
    
    if (isBinary) return 'binary';
    if (isGrayscale) return 'grayscale';
    return 'rgb';
  }
  
  /**
   * Get statistics from histogram data
   */
  getStatistics(histogramData: HistogramData): Record<string, any> {
    const stats: Record<string, any> = {
      totalPixels: histogramData.totalPixels,
      width: histogramData.width,
      height: histogramData.height,
      imageType: histogramData.imageType
    };
    
    switch (histogramData.imageType) {
      case 'rgb':
        if (histogramData.red && histogramData.green && histogramData.blue) {
          stats.channels = {
            red: this.calculateChannelStats(histogramData.red),
            green: this.calculateChannelStats(histogramData.green),
            blue: this.calculateChannelStats(histogramData.blue)
          };
        }
        break;
        
      case 'grayscale':
        if (histogramData.gray) {
          stats.intensity = this.calculateChannelStats(histogramData.gray);
        }
        break;
        
      case 'binary':
        if (histogramData.binary) {
          const total = histogramData.binary[0] + histogramData.binary[1];
          stats.distribution = {
            black: histogramData.binary[0],
            white: histogramData.binary[1],
            blackPercentage: ((histogramData.binary[0] / total) * 100).toFixed(2),
            whitePercentage: ((histogramData.binary[1] / total) * 100).toFixed(2)
          };
        }
        break;
    }
    
    return stats;
  }
  
  /**
   * Calculate statistics for a single channel
   */
  private calculateChannelStats(channel: number[]): Record<string, number> {
    let sum = 0;
    let count = 0;
    let min = 255;
    let max = 0;
    
    for (let i = 0; i < channel.length; i++) {
      const pixelCount = channel[i];
      if (pixelCount > 0) {
        sum += i * pixelCount;
        count += pixelCount;
        min = Math.min(min, i);
        max = Math.max(max, i);
      }
    }
    
    const mean = count > 0 ? sum / count : 0;
    
    // Calculate standard deviation
    let variance = 0;
    for (let i = 0; i < channel.length; i++) {
      const pixelCount = channel[i];
      if (pixelCount > 0) {
        variance += pixelCount * Math.pow(i - mean, 2);
      }
    }
    variance = count > 1 ? variance / (count - 1) : 0;
    const stdDev = Math.sqrt(variance);
    
    return {
      mean: parseFloat(mean.toFixed(2)),
      stdDev: parseFloat(stdDev.toFixed(2)),
      min,
      max,
      range: max - min
    };
  }
}

// Export singleton instance
export const histogramAnalyzer = new HistogramAnalyzer(); 