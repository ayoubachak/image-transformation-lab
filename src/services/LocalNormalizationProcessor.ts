/**
 * Local Normalization Processor
 * Normalizes intensity locally to handle uneven illumination
 */

export interface LocalNormalizationOptions {
  method: 'mean-std' | 'min-max' | 'percentile';
  windowSize: number;
  targetMean?: number;
  targetStd?: number;
  lowPercentile?: number;
  highPercentile?: number;
}

export class LocalNormalizationProcessor {
  /**
   * Process local normalization
   */
  static process(imageData: ImageData, options: LocalNormalizationOptions): ImageData {
    const { width, height } = imageData;
    const data = new Uint8ClampedArray(imageData.data);

    let result: Uint8ClampedArray;

    switch (options.method) {
      case 'mean-std':
        result = this.meanStdNormalization(
          data, 
          width, 
          height, 
          options.windowSize,
          options.targetMean || 128,
          options.targetStd || 50
        );
        break;
      case 'min-max':
        result = this.minMaxNormalization(data, width, height, options.windowSize);
        break;
      case 'percentile':
        result = this.percentileNormalization(
          data,
          width,
          height,
          options.windowSize,
          options.lowPercentile || 2,
          options.highPercentile || 98
        );
        break;
      default:
        result = this.meanStdNormalization(data, width, height, options.windowSize, 128, 50);
    }

    return new ImageData(result, width, height);
  }

  /**
   * Mean-Standard Deviation normalization
   */
  private static meanStdNormalization(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    windowSize: number,
    targetMean: number,
    targetStd: number
  ): Uint8ClampedArray {
    const result = new Uint8ClampedArray(data.length);
    const radius = Math.floor(windowSize / 2);
    
    for (let c = 0; c < 3; c++) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          // Calculate local statistics
          const stats = this.calculateLocalStats(data, width, height, x, y, radius, c);
          
          if (stats.std > 0) {
            // Normalize: (value - localMean) / localStd * targetStd + targetMean
            const pixelIdx = (y * width + x) * 4 + c;
            const originalValue = data[pixelIdx];
            const normalized = ((originalValue - stats.mean) / stats.std) * targetStd + targetMean;
            result[pixelIdx] = Math.max(0, Math.min(255, Math.round(normalized)));
          } else {
            // If std is 0, use target mean
            const pixelIdx = (y * width + x) * 4 + c;
            result[pixelIdx] = targetMean;
          }
        }
      }
    }
    
    // Copy alpha channel
    for (let i = 3; i < data.length; i += 4) {
      result[i] = data[i];
    }

    return result;
  }

  /**
   * Min-Max normalization
   */
  private static minMaxNormalization(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    windowSize: number
  ): Uint8ClampedArray {
    const result = new Uint8ClampedArray(data.length);
    const radius = Math.floor(windowSize / 2);
    
    for (let c = 0; c < 3; c++) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          // Calculate local min and max
          const minMax = this.calculateLocalMinMax(data, width, height, x, y, radius, c);
          
          const range = minMax.max - minMax.min;
          if (range > 0) {
            // Normalize: (value - localMin) / (localMax - localMin) * 255
            const pixelIdx = (y * width + x) * 4 + c;
            const originalValue = data[pixelIdx];
            const normalized = ((originalValue - minMax.min) / range) * 255;
            result[pixelIdx] = Math.max(0, Math.min(255, Math.round(normalized)));
          } else {
            // If range is 0, use the original value
            const pixelIdx = (y * width + x) * 4 + c;
            result[pixelIdx] = data[pixelIdx];
          }
        }
      }
    }
    
    // Copy alpha channel
    for (let i = 3; i < data.length; i += 4) {
      result[i] = data[i];
    }

    return result;
  }

  /**
   * Percentile normalization
   */
  private static percentileNormalization(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    windowSize: number,
    lowPercentile: number,
    highPercentile: number
  ): Uint8ClampedArray {
    const result = new Uint8ClampedArray(data.length);
    const radius = Math.floor(windowSize / 2);
    
    for (let c = 0; c < 3; c++) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          // Calculate local percentiles
          const percentiles = this.calculateLocalPercentiles(
            data, width, height, x, y, radius, c, lowPercentile, highPercentile
          );
          
          const range = percentiles.high - percentiles.low;
          if (range > 0) {
            // Normalize using percentiles
            const pixelIdx = (y * width + x) * 4 + c;
            const originalValue = data[pixelIdx];
            
            // Clamp to percentile range
            const clampedValue = Math.max(percentiles.low, Math.min(percentiles.high, originalValue));
            const normalized = ((clampedValue - percentiles.low) / range) * 255;
            result[pixelIdx] = Math.max(0, Math.min(255, Math.round(normalized)));
          } else {
            // If range is 0, use the original value
            const pixelIdx = (y * width + x) * 4 + c;
            result[pixelIdx] = data[pixelIdx];
          }
        }
      }
    }
    
    // Copy alpha channel
    for (let i = 3; i < data.length; i += 4) {
      result[i] = data[i];
    }

    return result;
  }

  /**
   * Calculate local statistics (mean and standard deviation)
   */
  private static calculateLocalStats(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    centerX: number,
    centerY: number,
    radius: number,
    channel: number
  ): { mean: number; std: number } {
    let sum = 0;
    let sumSquares = 0;
    let count = 0;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;

        if (x >= 0 && x < width && y >= 0 && y < height) {
          const pixelIdx = (y * width + x) * 4 + channel;
          const value = data[pixelIdx];
          sum += value;
          sumSquares += value * value;
          count++;
        }
      }
    }

    const mean = sum / count;
    const variance = (sumSquares / count) - (mean * mean);
    const std = Math.sqrt(Math.max(0, variance));

    return { mean, std };
  }

  /**
   * Calculate local min and max
   */
  private static calculateLocalMinMax(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    centerX: number,
    centerY: number,
    radius: number,
    channel: number
  ): { min: number; max: number } {
    let min = 255;
    let max = 0;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;

        if (x >= 0 && x < width && y >= 0 && y < height) {
          const pixelIdx = (y * width + x) * 4 + channel;
          const value = data[pixelIdx];
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
      }
    }

    return { min, max };
  }

  /**
   * Calculate local percentiles
   */
  private static calculateLocalPercentiles(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    centerX: number,
    centerY: number,
    radius: number,
    channel: number,
    lowPercentile: number,
    highPercentile: number
  ): { low: number; high: number } {
    const values: number[] = [];

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;

        if (x >= 0 && x < width && y >= 0 && y < height) {
          const pixelIdx = (y * width + x) * 4 + channel;
          values.push(data[pixelIdx]);
        }
      }
    }

    // Sort values
    values.sort((a, b) => a - b);

    // Calculate percentile indices
    const lowIndex = Math.floor((lowPercentile / 100) * (values.length - 1));
    const highIndex = Math.floor((highPercentile / 100) * (values.length - 1));

    return {
      low: values[lowIndex],
      high: values[highIndex]
    };
  }
} 