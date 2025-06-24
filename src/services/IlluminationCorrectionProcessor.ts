/**
 * Illumination Correction Processor
 * Corrects uneven lighting and illumination gradients using various techniques
 */

export interface IlluminationCorrectionOptions {
  method: 'homomorphic' | 'retinex' | 'clahe' | 'gamma-correction';
  gammaHigh?: number;
  gammaLow?: number;
  sigma?: number;
  clipLimit?: number;
  tileGridSize?: number;
  gamma?: number;
}

export class IlluminationCorrectionProcessor {
  /**
   * Process illumination correction
   */
  static process(imageData: ImageData, options: IlluminationCorrectionOptions): ImageData {
    const { width, height } = imageData;
    const data = new Uint8ClampedArray(imageData.data);

    let result: Uint8ClampedArray;

    switch (options.method) {
      case 'homomorphic':
        result = this.homomorphicFiltering(data, width, height, options.gammaLow || 0.5, options.gammaHigh || 2.0);
        break;
      case 'retinex':
        result = this.singleScaleRetinex(data, width, height, options.sigma || 80);
        break;
      case 'clahe':
        result = this.claheCorrection(data, width, height, options.clipLimit || 2.0, options.tileGridSize || 8);
        break;
      case 'gamma-correction':
        result = this.gammaCorrection(data, width, height, options.gamma || 1.2);
        break;
      default:
        result = this.homomorphicFiltering(data, width, height, 0.5, 2.0);
    }

    return new ImageData(result, width, height);
  }

  /**
   * Homomorphic filtering for illumination correction
   */
  private static homomorphicFiltering(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    gammaLow: number,
    gammaHigh: number
  ): Uint8ClampedArray {
    const result = new Uint8ClampedArray(data.length);
    
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const value = data[i + c];
        
        // Add small constant to avoid log(0)
        const logValue = Math.log(value + 1);
        
        // Apply frequency domain filtering (simplified)
        // In practice, this would involve FFT, but we'll use a spatial approximation
        const lowFreq = this.estimateLowFrequency(data, width, height, i / 4, c);
        const highFreq = logValue - Math.log(lowFreq + 1);
        
        // Apply different gamma values to low and high frequencies
        const enhancedLow = Math.pow(lowFreq, gammaLow);
        const enhancedHigh = Math.pow(Math.exp(highFreq), gammaHigh);
        
        // Combine and convert back
        const finalValue = enhancedLow * enhancedHigh;
        result[i + c] = Math.max(0, Math.min(255, finalValue));
      }
      result[i + 3] = data[i + 3]; // Alpha channel
    }

    return result;
  }

  /**
   * Single Scale Retinex for illumination correction
   */
  private static singleScaleRetinex(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    sigma: number
  ): Uint8ClampedArray {
    const result = new Uint8ClampedArray(data.length);
    
    // Create Gaussian kernel for surround estimation
    const kernelSize = Math.max(3, Math.ceil(6 * sigma) | 1);
    const kernel = this.createGaussianKernel2D(kernelSize, sigma);
    
    for (let c = 0; c < 3; c++) {
      // Extract single channel
      const channel = this.extractChannel(data, width, height, c);
      
      // Apply Gaussian filter to estimate illumination
      const illumination = this.convolve2D(channel, width, height, kernel);
      
      // Apply Retinex formula: log(I) - log(I * G)
      for (let i = 0; i < channel.length; i++) {
        const original = channel[i] + 1; // Add 1 to avoid log(0)
        const illum = illumination[i] + 1;
        
        const retinex = Math.log(original) - Math.log(illum);
        
        // Normalize and scale back to [0, 255]
        const normalized = (retinex + 5) * 255 / 10; // Heuristic scaling
        
        const pixelIdx = i * 4 + c;
        result[pixelIdx] = Math.max(0, Math.min(255, normalized));
      }
    }
    
    // Copy alpha channel
    for (let i = 3; i < data.length; i += 4) {
      result[i] = data[i];
    }

    return result;
  }

  /**
   * CLAHE (Contrast Limited Adaptive Histogram Equalization)
   */
  private static claheCorrection(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    clipLimit: number,
    tileGridSize: number
  ): Uint8ClampedArray {
    const result = new Uint8ClampedArray(data.length);
    
    // Convert to grayscale for processing
    const gray = this.toGrayscale(data, width, height);
    
    // Calculate tile dimensions
    const tileWidth = Math.floor(width / tileGridSize);
    const tileHeight = Math.floor(height / tileGridSize);
    
    // Process each tile
    const enhancedGray = new Uint8Array(gray.length);
    
    for (let tileY = 0; tileY < tileGridSize; tileY++) {
      for (let tileX = 0; tileX < tileGridSize; tileX++) {
        const startX = tileX * tileWidth;
        const startY = tileY * tileHeight;
        const endX = Math.min(startX + tileWidth, width);
        const endY = Math.min(startY + tileHeight, height);
        
        // Calculate histogram for this tile
        const histogram = new Array(256).fill(0);
        let pixelCount = 0;
        
        for (let y = startY; y < endY; y++) {
          for (let x = startX; x < endX; x++) {
            const value = gray[y * width + x];
            histogram[value]++;
            pixelCount++;
          }
        }
        
        // Apply contrast limiting
        const clipCount = Math.floor(clipLimit * pixelCount / 256);
        this.applyContrastLimiting(histogram, clipCount);
        
        // Calculate CDF (Cumulative Distribution Function)
        const cdf = this.calculateCDF(histogram);
        
        // Apply equalization to tile pixels
        for (let y = startY; y < endY; y++) {
          for (let x = startX; x < endX; x++) {
            const idx = y * width + x;
            const value = gray[idx];
            enhancedGray[idx] = Math.round((cdf[value] / pixelCount) * 255);
          }
        }
      }
    }
    
    // Apply enhancement to all color channels proportionally
    for (let i = 0; i < data.length; i += 4) {
      const idx = Math.floor(i / 4);
      const originalGray = gray[idx];
      const enhancedGrayValue = enhancedGray[idx];
      
      if (originalGray > 0) {
        const enhancementFactor = enhancedGrayValue / originalGray;
        
        for (let c = 0; c < 3; c++) {
          const enhanced = data[i + c] * enhancementFactor;
          result[i + c] = Math.max(0, Math.min(255, enhanced));
        }
      } else {
        for (let c = 0; c < 3; c++) {
          result[i + c] = data[i + c];
        }
      }
      
      result[i + 3] = data[i + 3]; // Alpha channel
    }

    return result;
  }

  /**
   * Gamma correction
   */
  private static gammaCorrection(
    data: Uint8ClampedArray,
    _width: number,
    _height: number,
    gamma: number
  ): Uint8ClampedArray {
    const result = new Uint8ClampedArray(data.length);
    
    // Create lookup table for efficiency
    const lut = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      lut[i] = Math.round(255 * Math.pow(i / 255, 1 / gamma));
    }
    
    // Apply gamma correction
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        result[i + c] = lut[data[i + c]];
      }
      result[i + 3] = data[i + 3]; // Alpha channel
    }

    return result;
  }

  /**
   * Estimate low frequency component for homomorphic filtering
   */
  private static estimateLowFrequency(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    pixelIndex: number,
    channel: number
  ): number {
    const y = Math.floor(pixelIndex / width);
    const x = pixelIndex % width;
    const radius = 5; // Neighborhood radius
    
    let sum = 0;
    let count = 0;
    
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const ny = y + dy;
        const nx = x + dx;
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const idx = (ny * width + nx) * 4 + channel;
          sum += data[idx];
          count++;
        }
      }
    }
    
    return sum / count;
  }

  /**
   * Extract single color channel
   */
  private static extractChannel(data: Uint8ClampedArray, width: number, height: number, channel: number): Uint8Array {
    const result = new Uint8Array(width * height);
    
    for (let i = 0; i < result.length; i++) {
      result[i] = data[i * 4 + channel];
    }
    
    return result;
  }

  /**
   * Convert to grayscale
   */
  private static toGrayscale(data: Uint8ClampedArray, width: number, height: number): Uint8Array {
    const gray = new Uint8Array(width * height);
    
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const pixelIdx = (i * width + j) * 4;
        const grayIdx = i * width + j;
        
        const r = data[pixelIdx];
        const g = data[pixelIdx + 1];
        const b = data[pixelIdx + 2];
        
        gray[grayIdx] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      }
    }
    
    return gray;
  }

  /**
   * Create 2D Gaussian kernel
   */
  private static createGaussianKernel2D(size: number, sigma: number): number[][] {
    const kernel: number[][] = Array(size).fill(0).map(() => Array(size).fill(0));
    const center = Math.floor(size / 2);
    let sum = 0;

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const x = i - center;
        const y = j - center;
        kernel[i][j] = Math.exp(-(x * x + y * y) / (2 * sigma * sigma));
        sum += kernel[i][j];
      }
    }

    // Normalize
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        kernel[i][j] /= sum;
      }
    }

    return kernel;
  }

  /**
   * 2D convolution
   */
  private static convolve2D(data: Uint8Array, width: number, height: number, kernel: number[][]): Uint8Array {
    const result = new Uint8Array(data.length);
    const kernelSize = kernel.length;
    const radius = Math.floor(kernelSize / 2);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;

        for (let ky = 0; ky < kernelSize; ky++) {
          for (let kx = 0; kx < kernelSize; kx++) {
            const ny = y + ky - radius;
            const nx = x + kx - radius;

            // Handle boundaries by clamping
            const clampedY = Math.max(0, Math.min(height - 1, ny));
            const clampedX = Math.max(0, Math.min(width - 1, nx));

            sum += data[clampedY * width + clampedX] * kernel[ky][kx];
          }
        }

        result[y * width + x] = Math.round(sum);
      }
    }

    return result;
  }

  /**
   * Apply contrast limiting to histogram
   */
  private static applyContrastLimiting(histogram: number[], clipLimit: number): void {
    let redistributed = 0;
    
    // Clip histogram bins that exceed the limit
    for (let i = 0; i < histogram.length; i++) {
      if (histogram[i] > clipLimit) {
        redistributed += histogram[i] - clipLimit;
        histogram[i] = clipLimit;
      }
    }
    
    // Redistribute clipped pixels evenly
    const redistributePerBin = Math.floor(redistributed / histogram.length);
    const remainder = redistributed % histogram.length;
    
    for (let i = 0; i < histogram.length; i++) {
      histogram[i] += redistributePerBin;
      if (i < remainder) {
        histogram[i]++;
      }
    }
  }

  /**
   * Calculate cumulative distribution function
   */
  private static calculateCDF(histogram: number[]): number[] {
    const cdf = new Array(histogram.length);
    cdf[0] = histogram[0];
    
    for (let i = 1; i < histogram.length; i++) {
      cdf[i] = cdf[i - 1] + histogram[i];
    }
    
    return cdf;
  }
} 