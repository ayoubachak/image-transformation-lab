/**
 * Watershed Segmentation Processor
 * Advanced segmentation technique for separating touching objects
 */

import { getOpenCV } from '../utils/imageProcessing';

export interface WatershedOptions {
  method: 'distance' | 'gradient' | 'markers';
  preprocessing: 'gaussian' | 'median' | 'bilateral' | 'none';
  blurKernelSize: number;
  distanceType: 'euclidean' | 'manhattan' | 'chessboard';
  minDistance: number;
  threshold: number;
  connectivityType: 4 | 8;
  removeSmallObjects: boolean;
  minObjectSize: number;
}

export class WatershedProcessor {
  /**
   * Apply watershed segmentation to separate touching objects
   */
  static process(imageData: ImageData, options: WatershedOptions): ImageData {
    const opencv = getOpenCV();
    if (!opencv) {
      return this.fallbackWatershed(imageData, options);
    }

    try {
      // Convert ImageData to cv.Mat
      const src = new opencv.Mat(imageData.height, imageData.width, opencv.CV_8UC4);
      src.data.set(imageData.data);
      
      // Convert to grayscale
      const gray = new opencv.Mat();
      opencv.cvtColor(src, gray, opencv.COLOR_RGBA2GRAY);
      
      // Apply preprocessing
      const preprocessed = this.applyPreprocessing(opencv, gray, options);
      
      // Apply thresholding to get binary image
      const binary = new opencv.Mat();
      opencv.threshold(preprocessed, binary, options.threshold, 255, opencv.THRESH_BINARY);
      
      // Apply watershed based on method
      let result: any;
      switch (options.method) {
        case 'distance':
          result = this.distanceWatershed(opencv, binary, options);
          break;
        case 'gradient':
          result = this.gradientWatershed(opencv, preprocessed, options);
          break;
        case 'markers':
          result = this.markerWatershed(opencv, binary, preprocessed, options);
          break;
        default:
          result = this.distanceWatershed(opencv, binary, options);
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
      preprocessed.delete();
      binary.delete();
      result.delete();
      output.delete();
      
      return resultData;
      
    } catch (error) {
      console.warn('OpenCV watershed failed, using fallback:', error);
      return this.fallbackWatershed(imageData, options);
    }
  }
  
  /**
   * Apply preprocessing filters
   */
  private static applyPreprocessing(opencv: any, src: any, options: WatershedOptions): any {
    const dst = new opencv.Mat();
    
    switch (options.preprocessing) {
      case 'gaussian':
        const gaussianKernel = new opencv.Size(options.blurKernelSize, options.blurKernelSize);
        opencv.GaussianBlur(src, dst, gaussianKernel, 0);
        break;
      case 'median':
        opencv.medianBlur(src, dst, options.blurKernelSize);
        break;
      case 'bilateral':
        opencv.bilateralFilter(src, dst, options.blurKernelSize, 80, 80);
        break;
      default:
        src.copyTo(dst);
    }
    
    return dst;
  }
  
  /**
   * Distance-based watershed
   */
  private static distanceWatershed(opencv: any, binary: any, options: WatershedOptions): any {
    // Compute distance transform
    const distTransform = new opencv.Mat();
    opencv.distanceTransform(binary, distTransform, opencv.DIST_L2, 5);
    
    // Find local maxima as markers
    const localMaxima = new opencv.Mat();
    opencv.dilate(distTransform, localMaxima, opencv.getStructuringElement(opencv.MORPH_ELLIPSE, new opencv.Size(options.minDistance, options.minDistance)));
    
    const peaks = new opencv.Mat();
    opencv.compare(distTransform, localMaxima, peaks, opencv.CMP_EQ);
    
    // Apply minimum distance constraint
    const kernel = opencv.getStructuringElement(opencv.MORPH_ELLIPSE, new opencv.Size(options.minDistance, options.minDistance));
    opencv.morphologyEx(peaks, peaks, opencv.MORPH_OPEN, kernel);
    
    // Create markers
    const markers = new opencv.Mat();
    opencv.connectedComponents(peaks, markers);
    
    // Apply watershed
    const result = new opencv.Mat();
    binary.copyTo(result);
    opencv.cvtColor(result, result, opencv.COLOR_GRAY2RGB);
    opencv.watershed(result, markers);
    
    // Convert markers back to binary
    const output = new opencv.Mat();
    opencv.threshold(markers, output, 0, 255, opencv.THRESH_BINARY);
    output.convertTo(output, opencv.CV_8UC1);
    
    // Cleanup
    distTransform.delete();
    localMaxima.delete();
    peaks.delete();
    markers.delete();
    kernel.delete();
    result.delete();
    
    return output;
  }
  
  /**
   * Gradient-based watershed
   */
  private static gradientWatershed(opencv: any, gray: any, options: WatershedOptions): any {
    // Compute gradient magnitude
    const gradX = new opencv.Mat();
    const gradY = new opencv.Mat();
    opencv.Sobel(gray, gradX, opencv.CV_32F, 1, 0, 3);
    opencv.Sobel(gray, gradY, opencv.CV_32F, 0, 1, 3);
    
    const gradient = new opencv.Mat();
    opencv.magnitude(gradX, gradY, gradient);
    gradient.convertTo(gradient, opencv.CV_8UC1);
    
    // Apply threshold to gradient
    const binary = new opencv.Mat();
    opencv.threshold(gradient, binary, options.threshold, 255, opencv.THRESH_BINARY_INV);
    
    // Find markers using morphological operations
    const markers = new opencv.Mat();
    const kernel = opencv.getStructuringElement(opencv.MORPH_ELLIPSE, new opencv.Size(5, 5));
    opencv.morphologyEx(binary, markers, opencv.MORPH_OPEN, kernel);
    
    opencv.connectedComponents(markers, markers);
    
    // Apply watershed
    const result = new opencv.Mat();
    opencv.cvtColor(gray, result, opencv.COLOR_GRAY2RGB);
    opencv.watershed(result, markers);
    
    // Convert to binary output
    const output = new opencv.Mat();
    opencv.threshold(markers, output, 0, 255, opencv.THRESH_BINARY);
    output.convertTo(output, opencv.CV_8UC1);
    
    // Cleanup
    gradX.delete();
    gradY.delete();
    gradient.delete();
    binary.delete();
    markers.delete();
    kernel.delete();
    result.delete();
    
    return output;
  }
  
  /**
   * Marker-controlled watershed
   */
  private static markerWatershed(opencv: any, binary: any, gray: any, _options: WatershedOptions): any {
    // Create sure background (dilated binary)
    const kernel = opencv.getStructuringElement(opencv.MORPH_ELLIPSE, new opencv.Size(3, 3));
    const sureBackground = new opencv.Mat();
    opencv.dilate(binary, sureBackground, kernel, new opencv.Point(-1, -1), 3);
    
    // Create sure foreground (eroded binary)
    const sureForeground = new opencv.Mat();
    opencv.erode(binary, sureForeground, kernel, new opencv.Point(-1, -1), 3);
    
    // Find unknown region
    const unknown = new opencv.Mat();
    opencv.subtract(sureBackground, sureForeground, unknown);
    
    // Create markers
    const markers = new opencv.Mat();
    opencv.connectedComponents(sureForeground, markers);
    
    // Add 1 to all markers to ensure background is not 0
    opencv.add(markers, opencv.Mat.ones(markers.rows, markers.cols, opencv.CV_32S), markers);
    
    // Mark unknown regions as 0
    markers.setTo(new opencv.Scalar(0), unknown);
    
    // Apply watershed
    const result = new opencv.Mat();
    opencv.cvtColor(gray, result, opencv.COLOR_GRAY2RGB);
    opencv.watershed(result, markers);
    
    // Create output (boundaries are marked as -1)
    const output = new opencv.Mat();
    opencv.threshold(markers, output, 1, 255, opencv.THRESH_BINARY);
    output.convertTo(output, opencv.CV_8UC1);
    
    // Cleanup
    kernel.delete();
    sureBackground.delete();
    sureForeground.delete();
    unknown.delete();
    markers.delete();
    result.delete();
    
    return output;
  }
  
  /**
   * Fallback implementation without OpenCV
   */
  private static fallbackWatershed(imageData: ImageData, options: WatershedOptions): ImageData {
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;
    
    // Simple binary threshold as fallback
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      const binary = gray > options.threshold ? 255 : 0;
      
      data[i] = binary;
      data[i + 1] = binary;
      data[i + 2] = binary;
      data[i + 3] = 255;
    }
    
    return new ImageData(data, width, height);
  }
} 