/**
 * Boundary/Perimeter Processor
 * Extracts object boundaries from binary images (equivalent to MATLAB's bwperim)
 */

import { getOpenCV } from '../utils/imageProcessing';

export interface BwPerimOptions {
  connectivity: 4 | 8;
  method: 'internal' | 'external' | 'both';
  thickness: number;
  smoothing: boolean;
  includeHoles: boolean;
}

export class BwPerimProcessor {
  /**
   * Extract object boundaries from binary image
   */
  static process(imageData: ImageData, options: BwPerimOptions): ImageData {
    const opencv = getOpenCV();
    if (!opencv) {
      return this.fallbackBwPerim(imageData, options);
    }

    try {
      // Convert ImageData to cv.Mat
      const src = new opencv.Mat(imageData.height, imageData.width, opencv.CV_8UC4);
      src.data.set(imageData.data);
      
      // Convert to grayscale and binary
      const gray = new opencv.Mat();
      opencv.cvtColor(src, gray, opencv.COLOR_RGBA2GRAY);
      
      const binary = new opencv.Mat();
      opencv.threshold(gray, binary, 128, 255, opencv.THRESH_BINARY);
      
      // Extract boundaries based on method
      let result: any;
      
      switch (options.method) {
        case 'internal':
          result = this.internalBoundary(opencv, binary, options);
          break;
        case 'external':
          result = this.externalBoundary(opencv, binary, options);
          break;
        case 'both':
          result = this.bothBoundaries(opencv, binary, options);
          break;
        default:
          result = this.internalBoundary(opencv, binary, options);
      }
      
      // Apply smoothing if requested
      if (options.smoothing) {
        const kernel = opencv.getStructuringElement(opencv.MORPH_ELLIPSE, new opencv.Size(3, 3));
        opencv.morphologyEx(result, result, opencv.MORPH_CLOSE, kernel);
        kernel.delete();
      }
      
      // Apply thickness
      if (options.thickness > 1) {
        const kernel = opencv.getStructuringElement(
          opencv.MORPH_ELLIPSE, 
          new opencv.Size(options.thickness, options.thickness)
        );
        opencv.dilate(result, result, kernel);
        kernel.delete();
      }
      
      // Convert back to RGBA
      const output = new opencv.Mat();
      opencv.cvtColor(result, output, opencv.COLOR_GRAY2RGBA);
      
      const resultData = new ImageData(
        new Uint8ClampedArray(output.data),
        output.cols,
        output.rows
      );
      
      // Cleanup
      src.delete();
      gray.delete();
      binary.delete();
      result.delete();
      output.delete();
      
      return resultData;
      
    } catch (error) {
      console.warn('OpenCV bwperim failed, using fallback:', error);
      return this.fallbackBwPerim(imageData, options);
    }
  }
  
  /**
   * Extract internal boundary (erosion - original)
   */
  private static internalBoundary(opencv: any, binary: any, options: BwPerimOptions): any {
    const structElement = options.connectivity === 4 
      ? opencv.getStructuringElement(opencv.MORPH_CROSS, new opencv.Size(3, 3))
      : opencv.getStructuringElement(opencv.MORPH_RECT, new opencv.Size(3, 3));
    
    const eroded = new opencv.Mat();
    opencv.erode(binary, eroded, structElement);
    
    const boundary = new opencv.Mat();
    opencv.subtract(binary, eroded, boundary);
    
    // Cleanup
    structElement.delete();
    eroded.delete();
    
    return boundary;
  }
  
  /**
   * Extract external boundary (dilation - original)
   */
  private static externalBoundary(opencv: any, binary: any, options: BwPerimOptions): any {
    const structElement = options.connectivity === 4 
      ? opencv.getStructuringElement(opencv.MORPH_CROSS, new opencv.Size(3, 3))
      : opencv.getStructuringElement(opencv.MORPH_RECT, new opencv.Size(3, 3));
    
    const dilated = new opencv.Mat();
    opencv.dilate(binary, dilated, structElement);
    
    const boundary = new opencv.Mat();
    opencv.subtract(dilated, binary, boundary);
    
    // Cleanup
    structElement.delete();
    dilated.delete();
    
    return boundary;
  }
  
  /**
   * Extract both internal and external boundaries
   */
  private static bothBoundaries(opencv: any, binary: any, options: BwPerimOptions): any {
    const internal = this.internalBoundary(opencv, binary, options);
    const external = this.externalBoundary(opencv, binary, options);
    
    const result = new opencv.Mat();
    opencv.add(internal, external, result);
    
    // Cleanup
    internal.delete();
    external.delete();
    
    return result;
  }
  
  /**
   * Fallback implementation without OpenCV
   */
  private static fallbackBwPerim(imageData: ImageData, options: BwPerimOptions): ImageData {
    const { data, width, height } = imageData;
    const result = new ImageData(width, height);
    const pixels = result.data;
    
    // Convert to binary
    const binary = new Array(height).fill(0).map(() => new Array(width).fill(0));
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const gray = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
        binary[y][x] = gray > 128 ? 1 : 0;
      }
    }
    
    // Initialize result
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 0;     // R
      pixels[i + 1] = 0; // G
      pixels[i + 2] = 0; // B
      pixels[i + 3] = 255; // A
    }
    
    // Extract boundaries
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (binary[y][x] === 1) {
          const isBoundary = this.isBoundaryPixel(binary, x, y, width, height, options);
          
          if (isBoundary) {
            const idx = (y * width + x) * 4;
            pixels[idx] = 255;     // R
            pixels[idx + 1] = 255; // G
            pixels[idx + 2] = 255; // B
          }
        }
      }
    }
    
    // Apply thickness if needed
    if (options.thickness > 1) {
      this.applyThickness(pixels, width, height, options.thickness);
    }
    
    return result;
  }
  
  /**
   * Check if pixel is on boundary
   */
  private static isBoundaryPixel(
    binary: number[][], 
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    options: BwPerimOptions
  ): boolean {
    const neighbors = options.connectivity === 4 
      ? [[x-1, y], [x+1, y], [x, y-1], [x, y+1]]
      : [[x-1, y-1], [x-1, y], [x-1, y+1], [x, y-1], [x, y+1], [x+1, y-1], [x+1, y], [x+1, y+1]];
    
    // Check method
    switch (options.method) {
      case 'internal':
        // Internal boundary: foreground pixel with at least one background neighbor
        return neighbors.some(([nx, ny]) => {
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) return true;
          return binary[ny][nx] === 0;
        });
        
      case 'external':
        // External boundary: background pixel with at least one foreground neighbor
        if (binary[y][x] === 0) {
          return neighbors.some(([nx, ny]) => {
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) return false;
            return binary[ny][nx] === 1;
          });
        }
        return false;
        
      case 'both':
        // Both boundaries
        return this.isBoundaryPixel(binary, x, y, width, height, {...options, method: 'internal'}) ||
               this.isBoundaryPixel(binary, x, y, width, height, {...options, method: 'external'});
        
      default:
        return false;
    }
  }
  
  /**
   * Apply thickness to boundary
   */
  private static applyThickness(pixels: Uint8ClampedArray, width: number, height: number, thickness: number): void {
    const original = new Uint8ClampedArray(pixels);
    const radius = Math.floor(thickness / 2);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const centerIdx = (y * width + x) * 4;
        
        if (original[centerIdx] === 255) { // If it's a boundary pixel
          // Dilate around this pixel
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const ny = y + dy;
              const nx = x + dx;
              
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                // Check if within circular/elliptical kernel
                if (dx * dx + dy * dy <= radius * radius) {
                  const idx = (ny * width + nx) * 4;
                  pixels[idx] = 255;
                  pixels[idx + 1] = 255;
                  pixels[idx + 2] = 255;
                }
              }
            }
          }
        }
      }
    }
  }
} 