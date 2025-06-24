/**
 * Cell Detection Processor
 * Comprehensive cell detection and analysis pipeline combining multiple operations
 * Includes: preprocessing, segmentation, shape analysis, and post-processing
 */

import { getOpenCV } from '../utils/imageProcessing';
import { WatershedProcessor } from './WatershedProcessor';
import { DistanceTransformProcessor } from './DistanceTransformProcessor';
import { ShapeAnalysisProcessor } from './ShapeAnalysisProcessor';
import { MedianProcessor } from './MedianProcessor';
import { FillHolesProcessor } from './FillHolesProcessor';
import { ClearBorderProcessor } from './ClearBorderProcessor';
import { BwPerimProcessor } from './BwPerimProcessor';

export interface CellDetectionOptions {
  // Preprocessing
  enablePreprocessing: boolean;
  gaussianBlur: number;
  medianFilterSize: number;
  medianIterations: number;
  
  // Thresholding
  thresholdMethod: 'otsu' | 'adaptive' | 'manual';
  manualThreshold: number;
  adaptiveBlockSize: number;
  adaptiveC: number;
  invertBinary: boolean;
  
  // Morphological operations
  enableMorphology: boolean;
  openingKernel: number;
  closingKernel: number;
  fillHoles: boolean;
  clearBorder: boolean;
  borderWidth: number;
  
  // Segmentation
  segmentationMethod: 'watershed' | 'distance' | 'contours' | 'components';
  minCellSize: number;
  maxCellSize: number;
  watershedThreshold: number;
  minDistance: number;
  
  // Shape analysis
  enableShapeAnalysis: boolean;
  minCircularity: number;
  maxCircularity: number;
  minAspectRatio: number;
  maxAspectRatio: number;
  minSolidity: number;
  maxSolidity: number;
  
  // Output options
  outputMode: 'segmented' | 'labeled' | 'overlay' | 'boundaries' | 'analysis';
  colorCoding: boolean;
  showCellNumbers: boolean;
  boundaryThickness: number;
}

export interface CellDetectionResult {
  processedImage: ImageData;
  cellCount: number;
  cells: CellInfo[];
  statistics: CellStatistics;
  processingSteps: ProcessingStep[];
}

export interface CellInfo {
  id: number;
  centroid: { x: number; y: number };
  area: number;
  perimeter: number;
  circularity: number;
  aspectRatio: number;
  solidity: number;
  convexity: number;
  majorAxis: number;
  minorAxis: number;
  boundingBox: { x: number; y: number; width: number; height: number };
}

export interface CellStatistics {
  totalCells: number;
  averageArea: number;
  averageCircularity: number;
  averageAspectRatio: number;
  cellDensity: number;
  sizeDistribution: { small: number; medium: number; large: number };
}

export interface ProcessingStep {
  name: string;
  description: string;
  timestamp: number;
  parameters: Record<string, any>;
}

export class CellDetectionProcessor {
  /**
   * Complete cell detection pipeline
   */
  static process(imageData: ImageData, options: CellDetectionOptions): CellDetectionResult {
    const startTime = Date.now();
    const processingSteps: ProcessingStep[] = [];
    
    let currentImage = imageData;
    const originalImage = imageData; // Keep reference to original
    
    console.log('Cell Detection: Starting pipeline', {
      imageSize: `${imageData.width}x${imageData.height}`,
      options: {
        enablePreprocessing: options.enablePreprocessing,
        thresholdMethod: options.thresholdMethod,
        enableMorphology: options.enableMorphology,
        segmentationMethod: options.segmentationMethod,
        enableShapeAnalysis: options.enableShapeAnalysis,
        outputMode: options.outputMode
      }
    });
    
    try {
      // Step 1: Preprocessing
      if (options.enablePreprocessing) {
        console.log('Cell Detection: Applying preprocessing');
        currentImage = this.preprocessImage(currentImage, options, processingSteps);
      }
      
      // Step 2: Thresholding
      console.log('Cell Detection: Applying thresholding');
      currentImage = this.applyThresholding(currentImage, options, processingSteps);
      
      // Step 3: Morphological operations
      if (options.enableMorphology) {
        console.log('Cell Detection: Applying morphology');
        currentImage = this.applyMorphology(currentImage, options, processingSteps);
      }
      
      // Step 4: Segmentation
      console.log('Cell Detection: Applying segmentation');
      const segmentedImage = this.applySegmentation(currentImage, options, processingSteps);
      
      // Step 5: Shape analysis and filtering
      console.log('Cell Detection: Analyzing cells');
      const { cells, filteredImage } = this.analyzeCells(segmentedImage, options, processingSteps);
      
      // Step 6: Generate output (pass both original and processed images)
      console.log('Cell Detection: Generating output', {
        cellCount: cells.length,
        outputMode: options.outputMode
      });
      const finalImage = this.generateOutput(filteredImage, cells, options, processingSteps, originalImage);
      
      // Step 7: Calculate statistics
      const statistics = this.calculateStatistics(cells, imageData);
      
      processingSteps.push({
        name: 'Complete',
        description: 'Cell detection pipeline completed',
        timestamp: Date.now() - startTime,
        parameters: { totalCells: cells.length }
      });
      
      console.log('Cell Detection: Pipeline completed successfully', {
        cellCount: cells.length,
        processingTime: Date.now() - startTime,
        statistics
      });
      
      return {
        processedImage: finalImage,
        cellCount: cells.length,
        cells,
        statistics,
        processingSteps
      };
      
    } catch (error) {
      console.error('Cell detection failed:', error);
      
      return {
        processedImage: imageData,
        cellCount: 0,
        cells: [],
        statistics: this.getEmptyStatistics(),
        processingSteps
      };
    }
  }
  
  /**
   * Step 1: Image preprocessing
   */
  private static preprocessImage(
    imageData: ImageData, 
    options: CellDetectionOptions, 
    steps: ProcessingStep[]
  ): ImageData {
    const stepStart = Date.now();
    let processed = imageData;
    
    // Gaussian blur for noise reduction
    if (options.gaussianBlur > 0) {
      const opencv = getOpenCV();
      if (opencv) {
        const src = new opencv.Mat(imageData.height, imageData.width, opencv.CV_8UC4);
        src.data.set(imageData.data);
        
        const blurred = new opencv.Mat();
        const ksize = Math.max(3, options.gaussianBlur * 2 + 1);
        opencv.GaussianBlur(src, blurred, new opencv.Size(ksize, ksize), options.gaussianBlur);
        
        processed = new ImageData(new Uint8ClampedArray(blurred.data), blurred.cols, blurred.rows);
        
        src.delete();
        blurred.delete();
      }
    }
    
    // Median filtering for salt-and-pepper noise
    if (options.medianFilterSize > 1) {
      processed = MedianProcessor.process(processed, {
        kernelSize: options.medianFilterSize,
        method: 'standard',
        preserveEdges: true,
        edgeThreshold: 50,
        iterations: options.medianIterations,
        adaptiveWindowMax: 15,
        selectiveThreshold: 100
      });
    }
    
    steps.push({
      name: 'Preprocessing',
      description: 'Applied Gaussian blur and median filtering',
      timestamp: Date.now() - stepStart,
      parameters: {
        gaussianBlur: options.gaussianBlur,
        medianSize: options.medianFilterSize,
        iterations: options.medianIterations
      }
    });
    
    return processed;
  }
  
  /**
   * Step 2: Apply thresholding
   */
  private static applyThresholding(
    imageData: ImageData, 
    options: CellDetectionOptions, 
    steps: ProcessingStep[]
  ): ImageData {
    const stepStart = Date.now();
    const opencv = getOpenCV();
    
    if (!opencv) {
      return this.fallbackThresholding(imageData, options);
    }
    
    try {
      const src = new opencv.Mat(imageData.height, imageData.width, opencv.CV_8UC4);
      src.data.set(imageData.data);
      
      const gray = new opencv.Mat();
      opencv.cvtColor(src, gray, opencv.COLOR_RGBA2GRAY);
      
      const binary = new opencv.Mat();
      
      switch (options.thresholdMethod) {
        case 'otsu':
          opencv.threshold(gray, binary, 0, 255, opencv.THRESH_BINARY + opencv.THRESH_OTSU);
          break;
          
        case 'adaptive':
          opencv.adaptiveThreshold(
            gray, binary, 255, 
            opencv.ADAPTIVE_THRESH_GAUSSIAN_C, 
            opencv.THRESH_BINARY,
            options.adaptiveBlockSize,
            options.adaptiveC
          );
          break;
          
        case 'manual':
          opencv.threshold(gray, binary, options.manualThreshold, 255, opencv.THRESH_BINARY);
          break;
      }
      
      // Invert if requested
      if (options.invertBinary) {
        opencv.bitwise_not(binary, binary);
      }
      
      // Convert back to RGBA
      const result = new opencv.Mat();
      opencv.cvtColor(binary, result, opencv.COLOR_GRAY2RGBA);
      
      const resultData = new ImageData(new Uint8ClampedArray(result.data), result.cols, result.rows);
      
      steps.push({
        name: 'Thresholding',
        description: `Applied ${options.thresholdMethod} thresholding`,
        timestamp: Date.now() - stepStart,
        parameters: {
          method: options.thresholdMethod,
          threshold: options.manualThreshold,
          invert: options.invertBinary
        }
      });
      
      // Cleanup
      src.delete();
      gray.delete();
      binary.delete();
      result.delete();
      
      return resultData;
      
    } catch (error) {
      return this.fallbackThresholding(imageData, options);
    }
  }
  
  /**
   * Step 3: Apply morphological operations
   */
  private static applyMorphology(
    imageData: ImageData, 
    options: CellDetectionOptions, 
    steps: ProcessingStep[]
  ): ImageData {
    const stepStart = Date.now();
    let processed = imageData;
    
    const opencv = getOpenCV();
    if (!opencv) return processed;
    
    try {
      const src = new opencv.Mat(imageData.height, imageData.width, opencv.CV_8UC4);
      src.data.set(imageData.data);
      
      const gray = new opencv.Mat();
      opencv.cvtColor(src, gray, opencv.COLOR_RGBA2GRAY);
      
      // Opening to remove noise
      if (options.openingKernel > 0) {
        const kernel = opencv.getStructuringElement(
          opencv.MORPH_ELLIPSE, 
          new opencv.Size(options.openingKernel, options.openingKernel)
        );
        opencv.morphologyEx(gray, gray, opencv.MORPH_OPEN, kernel);
        kernel.delete();
      }
      
      // Closing to fill gaps
      if (options.closingKernel > 0) {
        const kernel = opencv.getStructuringElement(
          opencv.MORPH_ELLIPSE, 
          new opencv.Size(options.closingKernel, options.closingKernel)
        );
        opencv.morphologyEx(gray, gray, opencv.MORPH_CLOSE, kernel);
        kernel.delete();
      }
      
      // Convert back to RGBA for other processors
      const result = new opencv.Mat();
      opencv.cvtColor(gray, result, opencv.COLOR_GRAY2RGBA);
      processed = new ImageData(new Uint8ClampedArray(result.data), result.cols, result.rows);
      
      // Fill holes if requested
      if (options.fillHoles) {
        processed = FillHolesProcessor.process(processed, { 
          connectivity: '8',
          minHoleSize: 0,
          maxHoleSize: 0
        });
      }
      
      // Clear border objects if requested
      if (options.clearBorder) {
        processed = ClearBorderProcessor.process(processed, {
          connectivity: '8',
          borderWidth: options.borderWidth
        });
      }
      
      steps.push({
        name: 'Morphological Operations',
        description: 'Applied opening, closing, hole filling, and border clearing',
        timestamp: Date.now() - stepStart,
        parameters: {
          opening: options.openingKernel,
          closing: options.closingKernel,
          fillHoles: options.fillHoles,
          clearBorder: options.clearBorder
        }
      });
      
      // Cleanup
      src.delete();
      gray.delete();
      result.delete();
      
      return processed;
      
    } catch (error) {
      return processed;
    }
  }
  
  /**
   * Step 4: Apply segmentation
   */
  private static applySegmentation(
    imageData: ImageData, 
    options: CellDetectionOptions, 
    steps: ProcessingStep[]
  ): ImageData {
    const stepStart = Date.now();
    
    let segmented: ImageData;
    
    switch (options.segmentationMethod) {
      case 'watershed':
        segmented = WatershedProcessor.process(imageData, {
          method: 'distance',
          preprocessing: 'gaussian',
          blurKernelSize: 5,
          distanceType: 'euclidean',
          minDistance: options.minDistance,
          threshold: options.watershedThreshold,
          connectivityType: 8,
          removeSmallObjects: true,
          minObjectSize: options.minCellSize
        });
        break;
        
      case 'distance':
        segmented = DistanceTransformProcessor.process(imageData, {
          distanceType: 'euclidean',
          maskSize: 5,
          normalize: true,
          outputMode: 'peaks',
          threshold: options.watershedThreshold,
          minDistance: options.minDistance,
          invertInput: false
        });
        break;
        
      default:
        segmented = imageData;
    }
    
    steps.push({
      name: 'Segmentation',
      description: `Applied ${options.segmentationMethod} segmentation`,
      timestamp: Date.now() - stepStart,
      parameters: {
        method: options.segmentationMethod,
        minDistance: options.minDistance,
        threshold: options.watershedThreshold
      }
    });
    
    return segmented;
  }
  
  /**
   * Step 5: Analyze and filter cells
   */
  private static analyzeCells(
    imageData: ImageData, 
    options: CellDetectionOptions, 
    steps: ProcessingStep[]
  ): { cells: CellInfo[]; filteredImage: ImageData } {
    const stepStart = Date.now();
    
    console.log('Cell Detection: Starting cell analysis', {
      enableShapeAnalysis: options.enableShapeAnalysis,
      minCellSize: options.minCellSize,
      maxCellSize: options.maxCellSize,
      imageSize: `${imageData.width}x${imageData.height}`
    });
    
    if (!options.enableShapeAnalysis) {
      console.log('Cell Detection: Shape analysis disabled, returning empty cells but keeping processed image');
      return { cells: [], filteredImage: imageData };
    }
    
    // Perform shape analysis
    const analysisResult = ShapeAnalysisProcessor.process(imageData, {
      analysisType: 'contours',
      minArea: options.minCellSize,
      maxArea: options.maxCellSize,
      minPerimeter: 10,
      maxPerimeter: 2000,
      circularityRange: [options.minCircularity, options.maxCircularity],
      aspectRatioRange: [options.minAspectRatio, options.maxAspectRatio],
      solidityRange: [options.minSolidity, options.maxSolidity],
      convexityRange: [0.5, 1.0],
      outputMode: 'filtered',
      colorCode: false,
      drawProperties: false
    });
    
    console.log('Cell Detection: Shape analysis completed', {
      shapesFound: analysisResult.shapes.length,
      statistics: analysisResult.statistics
    });
    
    // Convert shape properties to cell info
    const cells: CellInfo[] = analysisResult.shapes.map(shape => ({
      id: shape.id,
      centroid: shape.centroid,
      area: shape.area,
      perimeter: shape.perimeter,
      circularity: shape.circularity,
      aspectRatio: shape.aspectRatio,
      solidity: shape.solidity,
      convexity: shape.convexity,
      majorAxis: shape.majorAxis,
      minorAxis: shape.minorAxis,
      boundingBox: shape.boundingBox
    }));
    
    console.log('Cell Detection: Converted to cell info', {
      cellsDetected: cells.length,
      sampleCell: cells.length > 0 ? cells[0] : null
    });
    
    steps.push({
      name: 'Cell Analysis',
      description: `Analyzed and filtered ${cells.length} cells`,
      timestamp: Date.now() - stepStart,
      parameters: {
        cellsDetected: analysisResult.shapes.length,
        cellsFiltered: cells.length,
        circularity: [options.minCircularity, options.maxCircularity],
        aspectRatio: [options.minAspectRatio, options.maxAspectRatio]
      }
    });
    
    return { cells, filteredImage: analysisResult.imageData };
  }
  
  /**
   * Step 6: Generate final output
   */
  private static generateOutput(
    imageData: ImageData, 
    cells: CellInfo[], 
    options: CellDetectionOptions, 
    steps: ProcessingStep[],
    originalImage: ImageData
  ): ImageData {
    const stepStart = Date.now();
    
    switch (options.outputMode) {
      case 'segmented':
        // Show the segmented/processed binary image as a visible output
        const { data, width, height } = imageData;
        const segmentedResult = new ImageData(width, height);
        const segmentedPixels = segmentedResult.data;
        
        // Convert binary to visible grayscale/color
        for (let i = 0; i < data.length; i += 4) {
          const gray = data[i]; // Use red channel as grayscale value
          segmentedPixels[i] = gray;       // R
          segmentedPixels[i + 1] = gray;   // G  
          segmentedPixels[i + 2] = gray;   // B
          segmentedPixels[i + 3] = 255;    // A
        }
        
        steps.push({
          name: 'Output Generation',
          description: 'Generated segmented binary visualization',
          timestamp: Date.now() - stepStart,
          parameters: { mode: 'segmented', cellsFound: cells.length }
        });
        
        return segmentedResult;
        
      case 'boundaries':
        const boundaryImage = BwPerimProcessor.process(imageData, {
          connectivity: 8,
          method: 'internal',
          thickness: options.boundaryThickness,
          smoothing: true,
          includeHoles: false
        });
        
        steps.push({
          name: 'Output Generation',
          description: 'Generated boundary visualization',
          timestamp: Date.now() - stepStart,
          parameters: { mode: 'boundaries', thickness: options.boundaryThickness }
        });
        
        return boundaryImage;
        
      case 'overlay':
      case 'labeled':
      case 'analysis':
        // Use original image for overlay visualizations
        const result = this.addVisualization(originalImage, cells, options);
        
        steps.push({
          name: 'Output Generation',
          description: `Generated ${options.outputMode} visualization`,
          timestamp: Date.now() - stepStart,
          parameters: { 
            mode: options.outputMode, 
            colorCoding: options.colorCoding, 
            showNumbers: options.showCellNumbers,
            cellsFound: cells.length
          }
        });
        
        return result;
        
      default:
        // Fallback: ensure we return a visible image
        const fallbackResult = new ImageData(imageData.width, imageData.height);
        const fallbackPixels = fallbackResult.data;
        
        // Copy and ensure visibility
        for (let i = 0; i < imageData.data.length; i += 4) {
          const gray = imageData.data[i];
          fallbackPixels[i] = gray;       // R
          fallbackPixels[i + 1] = gray;   // G  
          fallbackPixels[i + 2] = gray;   // B
          fallbackPixels[i + 3] = 255;    // A
        }
        
        steps.push({
          name: 'Output Generation',
          description: 'Generated fallback visualization',
          timestamp: Date.now() - stepStart,
          parameters: { mode: 'default', cellsFound: cells.length }
        });
        
        return fallbackResult;
    }
  }
  
  /**
   * Add visualization overlays
   */
  private static addVisualization(
    imageData: ImageData, 
    cells: CellInfo[], 
    options: CellDetectionOptions
  ): ImageData {
    const { data, width, height } = imageData;
    const result = new ImageData(new Uint8ClampedArray(data), width, height);
    const pixels = result.data;
    
    cells.forEach((cell) => {
      const color = options.colorCoding 
        ? this.getCellColor(cell) 
        : [255, 255, 0]; // Yellow default
      
      // Draw centroid (larger marker)
      const cx = Math.round(cell.centroid.x);
      const cy = Math.round(cell.centroid.y);
      const markerSize = 4;
      
      if (cx >= 0 && cx < width && cy >= 0 && cy < height) {
        // Draw cross marker at centroid
        for (let dy = -markerSize; dy <= markerSize; dy++) {
          for (let dx = -markerSize; dx <= markerSize; dx++) {
            const x = cx + dx;
            const y = cy + dy;
            
            if (x >= 0 && x < width && y >= 0 && y < height) {
              // Draw cross pattern
              if (Math.abs(dx) <= 1 || Math.abs(dy) <= 1) {
                const idx = (y * width + x) * 4;
                pixels[idx] = color[0];
                pixels[idx + 1] = color[1];
                pixels[idx + 2] = color[2];
              }
            }
          }
        }
        
        // Draw bounding box
        const bbox = cell.boundingBox;
        const boxColor = [255, 0, 0]; // Red for bounding boxes
        
        // Top and bottom lines
        for (let x = Math.max(0, bbox.x); x < Math.min(width, bbox.x + bbox.width); x++) {
          // Top line
          if (bbox.y >= 0 && bbox.y < height) {
            const topIdx = (bbox.y * width + x) * 4;
            pixels[topIdx] = boxColor[0];
            pixels[topIdx + 1] = boxColor[1];
            pixels[topIdx + 2] = boxColor[2];
          }
          // Bottom line
          const bottomY = bbox.y + bbox.height - 1;
          if (bottomY >= 0 && bottomY < height) {
            const bottomIdx = (bottomY * width + x) * 4;
            pixels[bottomIdx] = boxColor[0];
            pixels[bottomIdx + 1] = boxColor[1];
            pixels[bottomIdx + 2] = boxColor[2];
          }
        }
        
        // Left and right lines
        for (let y = Math.max(0, bbox.y); y < Math.min(height, bbox.y + bbox.height); y++) {
          // Left line
          if (bbox.x >= 0 && bbox.x < width) {
            const leftIdx = (y * width + bbox.x) * 4;
            pixels[leftIdx] = boxColor[0];
            pixels[leftIdx + 1] = boxColor[1];
            pixels[leftIdx + 2] = boxColor[2];
          }
          // Right line
          const rightX = bbox.x + bbox.width - 1;
          if (rightX >= 0 && rightX < width) {
            const rightIdx = (y * width + rightX) * 4;
            pixels[rightIdx] = boxColor[0];
            pixels[rightIdx + 1] = boxColor[1];
            pixels[rightIdx + 2] = boxColor[2];
          }
        }
        
        // Add cell number if requested
        if (options.showCellNumbers) {
          // Draw cell ID number near centroid
          const textColor = [0, 255, 255]; // Cyan for text
          const textOffset = 8;
          const textX = cx + textOffset;
          const textY = cy - textOffset;
          
          if (textX >= 0 && textX < width && textY >= 0 && textY < height) {
            // Simple number visualization - draw a small square pattern
            // This is a simplified number display
            for (let dy = 0; dy < 6; dy++) {
              for (let dx = 0; dx < 6; dx++) {
                const x = textX + dx;
                const y = textY + dy;
                
                if (x >= 0 && x < width && y >= 0 && y < height) {
                  const idx = (y * width + x) * 4;
                  pixels[idx] = textColor[0];
                  pixels[idx + 1] = textColor[1];
                  pixels[idx + 2] = textColor[2];
                }
              }
            }
          }
        }
      }
    });
    
    return result;
  }
  
  /**
   * Get color for cell based on properties
   */
  private static getCellColor(cell: CellInfo): [number, number, number] {
    // Color by circularity
    const hue = cell.circularity * 120; // 0-120 degrees (red to green)
    return this.hsvToRgb(hue, 100, 100);
  }
  
  /**
   * Convert HSV to RGB
   */
  private static hsvToRgb(h: number, s: number, v: number): [number, number, number] {
    const c = (v / 100) * (s / 100);
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = (v / 100) - c;
    
    let r = 0, g = 0, b = 0;
    
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    
    return [
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255)
    ];
  }
  
  /**
   * Calculate overall statistics
   */
  private static calculateStatistics(cells: CellInfo[], originalImage: ImageData): CellStatistics {
    if (cells.length === 0) {
      return this.getEmptyStatistics();
    }
    
    const totalArea = cells.reduce((sum, cell) => sum + cell.area, 0);
    const averageArea = totalArea / cells.length;
    const averageCircularity = cells.reduce((sum, cell) => sum + cell.circularity, 0) / cells.length;
    const averageAspectRatio = cells.reduce((sum, cell) => sum + cell.aspectRatio, 0) / cells.length;
    
    const imageArea = originalImage.width * originalImage.height;
    const cellDensity = cells.length / imageArea * 1000000; // cells per million pixels
    
    // Size distribution
    const areas = cells.map(c => c.area).sort((a, b) => a - b);
    const q33 = areas[Math.floor(areas.length * 0.33)];
    const q66 = areas[Math.floor(areas.length * 0.66)];
    
    const sizeDistribution = {
      small: cells.filter(c => c.area <= q33).length,
      medium: cells.filter(c => c.area > q33 && c.area <= q66).length,
      large: cells.filter(c => c.area > q66).length
    };
    
    return {
      totalCells: cells.length,
      averageArea,
      averageCircularity,
      averageAspectRatio,
      cellDensity,
      sizeDistribution
    };
  }
  
  /**
   * Get empty statistics
   */
  private static getEmptyStatistics(): CellStatistics {
    return {
      totalCells: 0,
      averageArea: 0,
      averageCircularity: 0,
      averageAspectRatio: 0,
      cellDensity: 0,
      sizeDistribution: { small: 0, medium: 0, large: 0 }
    };
  }
  
  /**
   * Fallback thresholding without OpenCV
   */
  private static fallbackThresholding(imageData: ImageData, options: CellDetectionOptions): ImageData {
    const { data, width, height } = imageData;
    const result = new ImageData(width, height);
    const pixels = result.data;
    
    // Simple binary thresholding
    const threshold = options.thresholdMethod === 'manual' ? options.manualThreshold : 128;
    
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      const binary = options.invertBinary ? (gray < threshold ? 255 : 0) : (gray > threshold ? 255 : 0);
      
      pixels[i] = binary;
      pixels[i + 1] = binary;
      pixels[i + 2] = binary;
      pixels[i + 3] = 255;
    }
    
    return result;
  }
} 