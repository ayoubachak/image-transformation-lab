/**
 * Otsu Threshold Processor
 * Implements automatic threshold selection using Otsu's method for optimal binary segmentation
 */

export interface OtsuThresholdOptions {
  channels: 'grayscale' | 'red' | 'green' | 'blue' | 'max' | 'min';
  invert: boolean;
}

export interface OtsuResult {
  imageData: ImageData;
  threshold: number;
  variance: number;
}

export class OtsuThresholdProcessor {
  /**
   * Apply Otsu's automatic thresholding
   */
  static process(imageData: ImageData, options: OtsuThresholdOptions): ImageData {
    const { data, width, height } = imageData;
    
    // Extract the specified channel
    const channelData = this.extractChannel(data, options.channels);
    
    // Calculate Otsu threshold
    const result = this.calculateOtsuThreshold(channelData);
    
    // Apply threshold
    const thresholdedData = this.applyThreshold(channelData, result.threshold, options.invert);
    
    // Create result image
    const resultImageData = new ImageData(width, height);
    const pixels = resultImageData.data;
    
    for (let i = 0; i < thresholdedData.length; i++) {
      const value = thresholdedData[i];
      const rgbaIdx = i * 4;
      pixels[rgbaIdx] = value;
      pixels[rgbaIdx + 1] = value;
      pixels[rgbaIdx + 2] = value;
      pixels[rgbaIdx + 3] = 255;
    }
    
    return resultImageData;
  }
  
  /**
   * Extract specified channel from image data
   */
  private static extractChannel(data: Uint8ClampedArray, channel: string): Uint8Array {
    const channelData = new Uint8Array(data.length / 4);
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      let value: number;
      switch (channel) {
        case 'red':
          value = r;
          break;
        case 'green':
          value = g;
          break;
        case 'blue':
          value = b;
          break;
        case 'max':
          value = Math.max(r, g, b);
          break;
        case 'min':
          value = Math.min(r, g, b);
          break;
        case 'grayscale':
        default:
          value = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
          break;
      }
      
      channelData[i / 4] = value;
    }
    
    return channelData;
  }
  
  /**
   * Calculate optimal threshold using Otsu's method
   */
  private static calculateOtsuThreshold(data: Uint8Array): { threshold: number; variance: number } {
    // Calculate histogram
    const histogram = new Array(256).fill(0);
    for (const value of data) {
      histogram[value]++;
    }
    
    // Normalize histogram to probabilities
    const total = data.length;
    const probabilities = histogram.map(count => count / total);
    
    let maxVariance = 0;
    let optimalThreshold = 0;
    
    // Try all possible thresholds
    for (let t = 0; t < 256; t++) {
      // Calculate class probabilities
      let w0 = 0, w1 = 0;
      let sum0 = 0, sum1 = 0;
      
      for (let i = 0; i <= t; i++) {
        w0 += probabilities[i];
        sum0 += i * probabilities[i];
      }
      
      for (let i = t + 1; i < 256; i++) {
        w1 += probabilities[i];
        sum1 += i * probabilities[i];
      }
      
      // Avoid division by zero
      if (w0 === 0 || w1 === 0) continue;
      
      // Calculate class means
      const mu0 = sum0 / w0;
      const mu1 = sum1 / w1;
      
      // Calculate between-class variance
      const variance = w0 * w1 * (mu0 - mu1) * (mu0 - mu1);
      
      if (variance > maxVariance) {
        maxVariance = variance;
        optimalThreshold = t;
      }
    }
    
    return { threshold: optimalThreshold, variance: maxVariance };
  }
  
  /**
   * Apply threshold to image data
   */
  private static applyThreshold(data: Uint8Array, threshold: number, invert: boolean): Uint8Array {
    const result = new Uint8Array(data.length);
    
    for (let i = 0; i < data.length; i++) {
      const isAboveThreshold = data[i] > threshold;
      const binaryValue = invert ? !isAboveThreshold : isAboveThreshold;
      result[i] = binaryValue ? 255 : 0;
    }
    
    return result;
  }
  
  /**
   * Calculate image statistics for debugging
   */
  static calculateStats(data: Uint8Array): {
    mean: number;
    variance: number;
    histogram: number[];
  } {
    const histogram = new Array(256).fill(0);
    let sum = 0;
    
    // Calculate histogram and sum
    for (const value of data) {
      histogram[value]++;
      sum += value;
    }
    
    // Calculate mean
    const mean = sum / data.length;
    
    // Calculate variance
    let varianceSum = 0;
    for (const value of data) {
      varianceSum += (value - mean) * (value - mean);
    }
    const variance = varianceSum / data.length;
    
    return { mean, variance, histogram };
  }
} 