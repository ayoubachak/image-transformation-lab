/**
 * Distance Transform Processor
 * Computes distance to nearest background pixel for shape analysis
 */

import { getOpenCV } from '../utils/imageProcessing';

export interface DistanceTransformOptions {
  distanceType: 'euclidean' | 'manhattan' | 'chessboard' | 'l1' | 'l2';
  maskSize: 3 | 5;
  normalize: boolean;
  threshold: number;
  outputMode: 'distance' | 'skeleton' | 'peaks' | 'ridges';
  minDistance: number;
  invertInput: boolean;
}

export class DistanceTransformProcessor {
  /**
   * Apply distance transform to binary image
   */
  static process(imageData: ImageData, options: DistanceTransformOptions): ImageData {
    const opencv = getOpenCV();
    if (!opencv) {
      return this.fallbackDistanceTransform(imageData, options);
    }

    try {
      // Convert ImageData to cv.Mat
      const src = new opencv.Mat(imageData.height, imageData.width, opencv.CV_8UC4);
      src.data.set(imageData.data);
      
      // Convert to grayscale
      const gray = new opencv.Mat();
      opencv.cvtColor(src, gray, opencv.COLOR_RGBA2GRAY);
      
      // Apply threshold to ensure binary image
      const binary = new opencv.Mat();
      opencv.threshold(gray, binary, options.threshold, 255, 
        options.invertInput ? opencv.THRESH_BINARY_INV : opencv.THRESH_BINARY);
      
      // Compute distance transform
      const distTransform = new opencv.Mat();
      const distanceType = this.getOpenCVDistanceType(opencv, options.distanceType);
      opencv.distanceTransform(binary, distTransform, distanceType, options.maskSize);
      
      // Process based on output mode
      let result: any;
      switch (options.outputMode) {
        case 'distance':
          result = this.processDistanceOutput(opencv, distTransform, options);
          break;
        case 'skeleton':
          result = this.processSkeletonOutput(opencv, distTransform, binary, options);
          break;
        case 'peaks':
          result = this.processPeaksOutput(opencv, distTransform, options);
          break;
        case 'ridges':
          result = this.processRidgesOutput(opencv, distTransform, options);
          break;
        default:
          result = this.processDistanceOutput(opencv, distTransform, options);
      }
      
      // Convert back to RGBA
      const output = new opencv.Mat();
      if (result.channels() === 1) {
        opencv.cvtColor(result, output, opencv.COLOR_GRAY2RGBA);
      } else {
        result.copyTo(output);
      }
      
      const resultData = new ImageData(
        new Uint8ClampedArray(output.data),
        output.cols,
        output.rows
      );
      
      // Cleanup
      src.delete();
      gray.delete();
      binary.delete();
      distTransform.delete();
      result.delete();
      output.delete();
      
      return resultData;
      
    } catch (error) {
      console.warn('OpenCV distance transform failed, using fallback:', error);
      return this.fallbackDistanceTransform(imageData, options);
    }
  }
  
  /**
   * Get OpenCV distance type constant
   */
  private static getOpenCVDistanceType(opencv: any, distanceType: string): number {
    switch (distanceType) {
      case 'euclidean':
      case 'l2':
        return opencv.DIST_L2;
      case 'manhattan':
      case 'l1':
        return opencv.DIST_L1;
      case 'chessboard':
        return opencv.DIST_C;
      default:
        return opencv.DIST_L2;
    }
  }
  
  /**
   * Process distance transform output (normalized grayscale)
   */
  private static processDistanceOutput(opencv: any, distTransform: any, options: DistanceTransformOptions): any {
    const result = new opencv.Mat();
    
    if (options.normalize) {
      // Normalize to 0-255 range
      opencv.normalize(distTransform, result, 0, 255, opencv.NORM_MINMAX, opencv.CV_8UC1);
    } else {
      // Convert to 8-bit, clipping values > 255
      distTransform.convertTo(result, opencv.CV_8UC1);
    }
    
    return result;
  }
  
  /**
   * Process skeleton output (medial axis)
   */
  private static processSkeletonOutput(opencv: any, distTransform: any, binary: any, options: DistanceTransformOptions): any {
    // Find local maxima in distance transform
    const kernel = opencv.getStructuringElement(opencv.MORPH_ELLIPSE, 
      new opencv.Size(options.minDistance, options.minDistance));
    
    const dilated = new opencv.Mat();
    opencv.dilate(distTransform, dilated, kernel);
    
    const localMaxima = new opencv.Mat();
    opencv.compare(distTransform, dilated, localMaxima, opencv.CMP_EQ);
    
    // Apply to binary image to get skeleton
    const skeleton = new opencv.Mat();
    opencv.bitwise_and(binary, localMaxima, skeleton);
    
    // Cleanup
    kernel.delete();
    dilated.delete();
    localMaxima.delete();
    
    return skeleton;
  }
  
  /**
   * Process peaks output (local maxima)
   */
  private static processPeaksOutput(opencv: any, distTransform: any, options: DistanceTransformOptions): any {
    // Find local maxima
    const kernel = opencv.getStructuringElement(opencv.MORPH_ELLIPSE, 
      new opencv.Size(options.minDistance, options.minDistance));
    
    const dilated = new opencv.Mat();
    opencv.dilate(distTransform, dilated, kernel);
    
    const peaks = new opencv.Mat();
    opencv.compare(distTransform, dilated, peaks, opencv.CMP_EQ);
    
    // Apply minimum distance threshold
    const thresholded = new opencv.Mat();
    opencv.threshold(distTransform, thresholded, options.minDistance, 255, opencv.THRESH_BINARY);
    
    const result = new opencv.Mat();
    opencv.bitwise_and(peaks, thresholded, result);
    
    // Cleanup
    kernel.delete();
    dilated.delete();
    peaks.delete();
    thresholded.delete();
    
    return result;
  }
  
  /**
   * Process ridges output (watershed ridges)
   */
  private static processRidgesOutput(opencv: any, distTransform: any, options: DistanceTransformOptions): any {
    // Invert distance transform to find ridges
    const inverted = new opencv.Mat();
    opencv.bitwise_not(distTransform, inverted);
    
    // Apply threshold
    const result = new opencv.Mat();
    opencv.threshold(inverted, result, 255 - options.minDistance, 255, opencv.THRESH_BINARY);
    
    // Apply morphological operations to clean up ridges
    const kernel = opencv.getStructuringElement(opencv.MORPH_ELLIPSE, new opencv.Size(3, 3));
    opencv.morphologyEx(result, result, opencv.MORPH_CLOSE, kernel);
    
    // Cleanup
    inverted.delete();
    kernel.delete();
    
    return result;
  }
  
  /**
   * Fallback implementation without OpenCV
   */
  private static fallbackDistanceTransform(imageData: ImageData, options: DistanceTransformOptions): ImageData {
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;
    
    // Create binary array
    const binary = new Array(height).fill(0).map(() => new Array(width).fill(0));
    
    // Convert to binary
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const gray = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
        binary[y][x] = options.invertInput ? (gray < options.threshold ? 1 : 0) : (gray > options.threshold ? 1 : 0);
      }
    }
    
    // Compute distance transform using simple Euclidean distance
    const distances = new Array(height).fill(0).map(() => new Array(width).fill(0));
    let maxDistance = 0;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (binary[y][x] === 1) {
          let minDist = Infinity;
          
          // Find distance to nearest background pixel
          for (let dy = 0; dy < height; dy++) {
            for (let dx = 0; dx < width; dx++) {
              if (binary[dy][dx] === 0) {
                const dist = Math.sqrt((x - dx) ** 2 + (y - dy) ** 2);
                minDist = Math.min(minDist, dist);
              }
            }
          }
          
          distances[y][x] = minDist === Infinity ? 0 : minDist;
          maxDistance = Math.max(maxDistance, distances[y][x]);
        }
      }
    }
    
    // Convert back to ImageData
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        let value = 0;
        
        if (options.normalize && maxDistance > 0) {
          value = Math.round((distances[y][x] / maxDistance) * 255);
        } else {
          value = Math.min(255, Math.round(distances[y][x]));
        }
        
        data[idx] = value;
        data[idx + 1] = value;
        data[idx + 2] = value;
        data[idx + 3] = 255;
      }
    }
    
    return new ImageData(data, width, height);
  }
  
  /**
   * Analyze distance transform statistics
   */
  static analyzeDistance(imageData: ImageData): {
    maxDistance: number;
    meanDistance: number;
    medianDistance: number;
    peakCount: number;
    ridgeLength: number;
  } {
    const data = imageData.data;
    const distances: number[] = [];
    
    for (let i = 0; i < data.length; i += 4) {
      const value = data[i]; // Use red channel
      if (value > 0) {
        distances.push(value);
      }
    }
    
    distances.sort((a, b) => a - b);
    
    const maxDistance = distances.length > 0 ? Math.max(...distances) : 0;
    const meanDistance = distances.length > 0 ? distances.reduce((a, b) => a + b, 0) / distances.length : 0;
    const medianDistance = distances.length > 0 ? distances[Math.floor(distances.length / 2)] : 0;
    
    // Count peaks (local maxima)
    let peakCount = 0;
    const threshold = maxDistance * 0.5;
    
    for (let i = 0; i < distances.length; i++) {
      if (distances[i] > threshold) {
        peakCount++;
      }
    }
    
    return {
      maxDistance,
      meanDistance,
      medianDistance,
      peakCount,
      ridgeLength: distances.length
    };
  }
} 