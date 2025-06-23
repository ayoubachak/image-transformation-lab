/**
 * Background Subtraction Processor
 * Removes uneven background illumination from images using various methods
 */

export interface BackgroundSubtractionOptions {
  method: 'morphological' | 'gaussian' | 'rolling-ball' | 'polynomial';
  kernelSize?: number;
  sigmaX?: number;
  sigmaY?: number;
  ballRadius?: number;
  polynomialOrder?: number;
  normalize: boolean;
}

export class BackgroundSubtractionProcessor {
  /**
   * Process background subtraction
   */
  static process(imageData: ImageData, options: BackgroundSubtractionOptions): ImageData {
    const { width, height } = imageData;
    const data = new Uint8ClampedArray(imageData.data);

    // Convert to grayscale for background estimation
    const gray = this.toGrayscale(data, width, height);
    
    let background: Uint8Array;

    switch (options.method) {
      case 'morphological':
        background = this.morphologicalBackground(gray, width, height, options.kernelSize || 51);
        break;
      case 'gaussian':
        background = this.gaussianBackground(gray, width, height, options.sigmaX || 50, options.sigmaY || 50);
        break;
      case 'rolling-ball':
        background = this.rollingBallBackground(gray, width, height, options.ballRadius || 25);
        break;
      case 'polynomial':
        background = this.polynomialBackground(gray, width, height, options.polynomialOrder || 3);
        break;
      default:
        background = this.morphologicalBackground(gray, width, height, 51);
    }

    // Subtract background
    const result = this.subtractBackground(data, background, width, height, options.normalize);

    return new ImageData(result, width, height);
  }

  /**
   * Morphological background estimation using opening
   */
  private static morphologicalBackground(
    data: Uint8Array,
    width: number,
    height: number,
    kernelSize: number
  ): Uint8Array {
    // Apply morphological opening (erosion followed by dilation)
    const eroded = this.erode(data, width, height, kernelSize);
    const opened = this.dilate(eroded, width, height, kernelSize);
    
    return opened;
  }

  /**
   * Gaussian blur background estimation
   */
  private static gaussianBackground(
    data: Uint8Array,
    width: number,
    height: number,
    sigmaX: number,
    sigmaY: number
  ): Uint8Array {
    return this.gaussianBlur(data, width, height, sigmaX, sigmaY);
  }

  /**
   * Rolling ball background estimation (simplified version)
   */
  private static rollingBallBackground(
    data: Uint8Array,
    width: number,
    height: number,
    radius: number
  ): Uint8Array {
    const background = new Uint8Array(data.length);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let maxVal = 0;

        // Simple rolling ball approximation using max filter
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance <= radius) {
                maxVal = Math.max(maxVal, data[ny * width + nx]);
              }
            }
          }
        }

        background[y * width + x] = maxVal;
      }
    }

    return background;
  }

  /**
   * Polynomial background estimation (simplified)
   */
  private static polynomialBackground(
    data: Uint8Array,
    width: number,
    height: number,
    order: number
  ): Uint8Array {
    // Use Gaussian blur as a simple polynomial approximation
    const sigma = Math.min(width, height) / 8;
    return this.gaussianBlur(data, width, height, sigma, sigma);
  }

  /**
   * Subtract background from original image
   */
  private static subtractBackground(
    original: Uint8ClampedArray,
    background: Uint8Array,
    width: number,
    height: number,
    normalize: boolean
  ): Uint8ClampedArray {
    const result = new Uint8ClampedArray(original.length);
    
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const idx = i * width + j;
        const pixelIdx = idx * 4;

        // Process each color channel
        for (let c = 0; c < 3; c++) {
          const originalValue = original[pixelIdx + c];
          const backgroundValue = background[idx];
          
          // Subtract background and add offset
          let corrected = originalValue - backgroundValue + 128;
          corrected = Math.max(0, Math.min(255, corrected));
          
          result[pixelIdx + c] = corrected;
        }
        
        result[pixelIdx + 3] = original[pixelIdx + 3]; // Alpha channel
      }
    }

    if (normalize) {
      this.normalizeImage(result, width, height);
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
   * Morphological erosion
   */
  private static erode(data: Uint8Array, width: number, height: number, kernelSize: number): Uint8Array {
    const result = new Uint8Array(data.length);
    const radius = Math.floor(kernelSize / 2);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let minVal = 255;

        for (let ky = -radius; ky <= radius; ky++) {
          for (let kx = -radius; kx <= radius; kx++) {
            const ny = y + ky;
            const nx = x + kx;

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              minVal = Math.min(minVal, data[ny * width + nx]);
            }
          }
        }

        result[y * width + x] = minVal;
      }
    }

    return result;
  }

  /**
   * Morphological dilation
   */
  private static dilate(data: Uint8Array, width: number, height: number, kernelSize: number): Uint8Array {
    const result = new Uint8Array(data.length);
    const radius = Math.floor(kernelSize / 2);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let maxVal = 0;

        for (let ky = -radius; ky <= radius; ky++) {
          for (let kx = -radius; kx <= radius; kx++) {
            const ny = y + ky;
            const nx = x + kx;

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              maxVal = Math.max(maxVal, data[ny * width + nx]);
            }
          }
        }

        result[y * width + x] = maxVal;
      }
    }

    return result;
  }

  /**
   * Gaussian blur
   */
  private static gaussianBlur(data: Uint8Array, width: number, height: number, sigmaX: number, sigmaY: number): Uint8Array {
    // Create Gaussian kernels
    const kernelSizeX = Math.max(3, Math.ceil(6 * sigmaX) | 1);
    const kernelSizeY = Math.max(3, Math.ceil(6 * sigmaY) | 1);
    
    const kernelX = this.createGaussianKernel(kernelSizeX, sigmaX);
    const kernelY = this.createGaussianKernel(kernelSizeY, sigmaY);

    // Separate horizontal and vertical passes
    const temp = this.convolveHorizontal(data, width, height, kernelX);
    return this.convolveVertical(temp, width, height, kernelY);
  }

  /**
   * Create 1D Gaussian kernel
   */
  private static createGaussianKernel(size: number, sigma: number): number[] {
    const kernel = new Array(size);
    const center = Math.floor(size / 2);
    let sum = 0;

    for (let i = 0; i < size; i++) {
      const x = i - center;
      kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
      sum += kernel[i];
    }

    // Normalize
    for (let i = 0; i < size; i++) {
      kernel[i] /= sum;
    }

    return kernel;
  }

  /**
   * Horizontal convolution
   */
  private static convolveHorizontal(data: Uint8Array, width: number, height: number, kernel: number[]): Uint8Array {
    const result = new Uint8Array(data.length);
    const radius = Math.floor(kernel.length / 2);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;

        for (let k = 0; k < kernel.length; k++) {
          const nx = x + k - radius;
          const clampedX = Math.max(0, Math.min(width - 1, nx));
          sum += data[y * width + clampedX] * kernel[k];
        }

        result[y * width + x] = Math.round(sum);
      }
    }

    return result;
  }

  /**
   * Vertical convolution
   */
  private static convolveVertical(data: Uint8Array, width: number, height: number, kernel: number[]): Uint8Array {
    const result = new Uint8Array(data.length);
    const radius = Math.floor(kernel.length / 2);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;

        for (let k = 0; k < kernel.length; k++) {
          const ny = y + k - radius;
          const clampedY = Math.max(0, Math.min(height - 1, ny));
          sum += data[clampedY * width + x] * kernel[k];
        }

        result[y * width + x] = Math.round(sum);
      }
    }

    return result;
  }

  /**
   * Normalize image to full intensity range
   */
  private static normalizeImage(data: Uint8ClampedArray, width: number, height: number): void {
    let min = 255;
    let max = 0;

    // Find min and max values (excluding alpha channel)
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        min = Math.min(min, data[i + c]);
        max = Math.max(max, data[i + c]);
      }
    }

    // Normalize
    const range = max - min;
    if (range > 0) {
      for (let i = 0; i < data.length; i += 4) {
        for (let c = 0; c < 3; c++) {
          data[i + c] = Math.round(((data[i + c] - min) / range) * 255);
        }
      }
    }
  }
} 