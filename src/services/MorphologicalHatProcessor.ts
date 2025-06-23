/**
 * Morphological Hat Processor
 * Implements Top Hat and Bottom Hat transforms for illumination correction and object detection
 */

export interface HatTransformOptions {
  type: 'topHat' | 'bottomHat';
  kernelSize: number;
  kernelShape: 'rect' | 'ellipse' | 'cross';
  enhanceContrast: boolean;
}

export class MorphologicalHatProcessor {
  /**
   * Process Hat transform
   */
  static process(imageData: ImageData, options: HatTransformOptions): ImageData {
    const { width, height } = imageData;
    const data = new Uint8ClampedArray(imageData.data);

    // Convert to grayscale for morphological operations
    const gray = this.toGrayscale(data, width, height);
    
    // Create structuring element
    const structuringElement = this.createStructuringElement(options.kernelSize, options.kernelShape);
    
    // Apply morphological operations
    let result: Uint8Array;
    if (options.type === 'topHat') {
      result = this.topHatTransform(gray, width, height, structuringElement);
    } else {
      result = this.bottomHatTransform(gray, width, height, structuringElement);
    }
    
    // Enhance contrast if requested
    if (options.enhanceContrast) {
      result = this.enhanceContrast(result);
    }
    
    // Convert back to RGBA
    const outputData = this.grayToRGBA(result, width, height);
    
    return new ImageData(outputData, width, height);
  }

  /**
   * Top Hat transform: Original - Opening
   * Detects bright objects on dark background
   */
  private static topHatTransform(
    gray: Uint8Array,
    width: number,
    height: number,
    structuringElement: boolean[][]
  ): Uint8Array {
    // Perform morphological opening (erosion followed by dilation)
    const eroded = this.erode(gray, width, height, structuringElement);
    const opened = this.dilate(eroded, width, height, structuringElement);
    
    // Top Hat = Original - Opening
    const result = new Uint8Array(gray.length);
    for (let i = 0; i < gray.length; i++) {
      result[i] = Math.max(0, gray[i] - opened[i]);
    }
    
    return result;
  }

  /**
   * Bottom Hat transform: Closing - Original
   * Detects dark objects on bright background
   */
  private static bottomHatTransform(
    gray: Uint8Array,
    width: number,
    height: number,
    structuringElement: boolean[][]
  ): Uint8Array {
    // Perform morphological closing (dilation followed by erosion)
    const dilated = this.dilate(gray, width, height, structuringElement);
    const closed = this.erode(dilated, width, height, structuringElement);
    
    // Bottom Hat = Closing - Original
    const result = new Uint8Array(gray.length);
    for (let i = 0; i < gray.length; i++) {
      result[i] = Math.max(0, closed[i] - gray[i]);
    }
    
    return result;
  }

  /**
   * Morphological erosion
   */
  private static erode(
    data: Uint8Array,
    width: number,
    height: number,
    structuringElement: boolean[][]
  ): Uint8Array {
    const result = new Uint8Array(data.length);
    const seSize = structuringElement.length;
    const seRadius = Math.floor(seSize / 2);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let minVal = 255;

        for (let sy = 0; sy < seSize; sy++) {
          for (let sx = 0; sx < seSize; sx++) {
            if (structuringElement[sy][sx]) {
              const ny = y + sy - seRadius;
              const nx = x + sx - seRadius;

              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                minVal = Math.min(minVal, data[ny * width + nx]);
              }
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
  private static dilate(
    data: Uint8Array,
    width: number,
    height: number,
    structuringElement: boolean[][]
  ): Uint8Array {
    const result = new Uint8Array(data.length);
    const seSize = structuringElement.length;
    const seRadius = Math.floor(seSize / 2);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let maxVal = 0;

        for (let sy = 0; sy < seSize; sy++) {
          for (let sx = 0; sx < seSize; sx++) {
            if (structuringElement[sy][sx]) {
              const ny = y + sy - seRadius;
              const nx = x + sx - seRadius;

              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                maxVal = Math.max(maxVal, data[ny * width + nx]);
              }
            }
          }
        }

        result[y * width + x] = maxVal;
      }
    }

    return result;
  }

  /**
   * Create structuring element
   */
  private static createStructuringElement(size: number, shape: 'rect' | 'ellipse' | 'cross'): boolean[][] {
    const element: boolean[][] = Array(size).fill(false).map(() => Array(size).fill(false));
    const center = Math.floor(size / 2);

    switch (shape) {
      case 'rect':
        for (let i = 0; i < size; i++) {
          for (let j = 0; j < size; j++) {
            element[i][j] = true;
          }
        }
        break;

      case 'ellipse':
        const radiusX = size / 2;
        const radiusY = size / 2;
        for (let i = 0; i < size; i++) {
          for (let j = 0; j < size; j++) {
            const dx = (j - center) / radiusX;
            const dy = (i - center) / radiusY;
            element[i][j] = (dx * dx + dy * dy) <= 1;
          }
        }
        break;

      case 'cross':
        // Horizontal line
        for (let j = 0; j < size; j++) {
          element[center][j] = true;
        }
        // Vertical line
        for (let i = 0; i < size; i++) {
          element[i][center] = true;
        }
        break;
    }

    return element;
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
   * Convert grayscale back to RGBA
   */
  private static grayToRGBA(gray: Uint8Array, width: number, height: number): Uint8ClampedArray {
    const rgba = new Uint8ClampedArray(width * height * 4);
    
    for (let i = 0; i < gray.length; i++) {
      const pixelIdx = i * 4;
      const value = gray[i];
      
      rgba[pixelIdx] = value;     // R
      rgba[pixelIdx + 1] = value; // G
      rgba[pixelIdx + 2] = value; // B
      rgba[pixelIdx + 3] = 255;   // A
    }
    
    return rgba;
  }

  /**
   * Enhance contrast of the result
   */
  private static enhanceContrast(data: Uint8Array): Uint8Array {
    // Find min and max values
    let min = 255;
    let max = 0;
    
    for (let i = 0; i < data.length; i++) {
      min = Math.min(min, data[i]);
      max = Math.max(max, data[i]);
    }
    
    // Stretch histogram to full range
    const range = max - min;
    if (range > 0) {
      const result = new Uint8Array(data.length);
      for (let i = 0; i < data.length; i++) {
        result[i] = Math.round(((data[i] - min) / range) * 255);
      }
      return result;
    }
    
    return data;
  }
} 