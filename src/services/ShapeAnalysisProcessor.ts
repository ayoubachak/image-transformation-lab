/**
 * Shape Analysis Processor
 * Analyzes geometric properties of detected shapes and contours
 */

import { getOpenCV } from '../utils/imageProcessing';

export interface ShapeAnalysisOptions {
  analysisType: 'contours' | 'blobs' | 'regions' | 'geometric';
  minArea: number;
  maxArea: number;
  minPerimeter: number;
  maxPerimeter: number;
  circularityRange: [number, number];
  aspectRatioRange: [number, number];
  solidityRange: [number, number];
  convexityRange: [number, number];
  outputMode: 'filtered' | 'labeled' | 'properties' | 'overlay';
  colorCode: boolean;
  drawProperties: boolean;
}

export interface ShapeProperties {
  id: number;
  area: number;
  perimeter: number;
  centroid: { x: number; y: number };
  boundingBox: { x: number; y: number; width: number; height: number };
  circularity: number;
  aspectRatio: number;
  solidity: number;
  convexity: number;
  orientation: number;
  majorAxis: number;
  minorAxis: number;
  eccentricity: number;
  compactness: number;
  extent: number;
}

export interface ShapeAnalysisResult {
  imageData: ImageData;
  shapes: ShapeProperties[];
  statistics: {
    totalShapes: number;
    avgArea: number;
    avgCircularity: number;
    avgAspectRatio: number;
    sizeDistribution: { small: number; medium: number; large: number };
  };
}

export class ShapeAnalysisProcessor {
  /**
   * Analyze shapes in binary image
   */
  static process(imageData: ImageData, options: ShapeAnalysisOptions): ShapeAnalysisResult {
    const opencv = getOpenCV();
    if (!opencv) {
      return this.fallbackShapeAnalysis(imageData, options);
    }

    try {
      // Convert ImageData to cv.Mat
      const src = new opencv.Mat(imageData.height, imageData.width, opencv.CV_8UC4);
      src.data.set(imageData.data);
      
      // Convert to grayscale
      const gray = new opencv.Mat();
      opencv.cvtColor(src, gray, opencv.COLOR_RGBA2GRAY);
      
      // Ensure binary image
      const binary = new opencv.Mat();
      opencv.threshold(gray, binary, 128, 255, opencv.THRESH_BINARY);
      
      // Find contours
      const contours = new opencv.MatVector();
      const hierarchy = new opencv.Mat();
      opencv.findContours(binary, contours, hierarchy, opencv.RETR_EXTERNAL, opencv.CHAIN_APPROX_SIMPLE);
      
      // Analyze each contour
      const shapes: ShapeProperties[] = [];
      
      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const properties = this.analyzeContour(opencv, contour, i);
        
        // Apply filters
        if (this.passesFilters(properties, options)) {
          shapes.push(properties);
        }
      }
      
      // Create output image
      const output = this.createOutputImage(opencv, src, contours, shapes, options);
      
      // Calculate statistics
      const statistics = this.calculateStatistics(shapes);
      
      // Convert to ImageData
      const resultData = new ImageData(
        new Uint8ClampedArray(output.data),
        output.cols,
        output.rows
      );
      
      // Cleanup
      src.delete();
      gray.delete();
      binary.delete();
      contours.delete();
      hierarchy.delete();
      output.delete();
      
      return {
        imageData: resultData,
        shapes,
        statistics
      };
      
    } catch (error) {
      console.warn('OpenCV shape analysis failed, using fallback:', error);
      return this.fallbackShapeAnalysis(imageData, options);
    }
  }
  
  /**
   * Analyze properties of a single contour
   */
  private static analyzeContour(opencv: any, contour: any, id: number): ShapeProperties {
    // Basic measurements
    const area = opencv.contourArea(contour);
    const perimeter = opencv.arcLength(contour, true);
    
    // Moments for centroid and other properties
    const moments = opencv.moments(contour);
    const centroid = {
      x: moments.m10 / moments.m00,
      y: moments.m01 / moments.m00
    };
    
    // Bounding box
    const boundingRect = opencv.boundingRect(contour);
    const boundingBox = {
      x: boundingRect.x,
      y: boundingRect.y,
      width: boundingRect.width,
      height: boundingRect.height
    };
    
    // Convex hull
    const hull = new opencv.Mat();
    opencv.convexHull(contour, hull);
    const hullArea = opencv.contourArea(hull);
    
    // Fitted ellipse (if contour has enough points)
    let orientation = 0;
    let majorAxis = 0;
    let minorAxis = 0;
    let eccentricity = 0;
    
    if (contour.rows >= 5) {
      try {
        const ellipse = opencv.fitEllipse(contour);
        orientation = ellipse.angle;
        majorAxis = Math.max(ellipse.size.width, ellipse.size.height);
        minorAxis = Math.min(ellipse.size.width, ellipse.size.height);
        eccentricity = minorAxis > 0 ? Math.sqrt(1 - (minorAxis * minorAxis) / (majorAxis * majorAxis)) : 0;
      } catch (e) {
        // Ellipse fitting failed, use bounding box
        majorAxis = Math.max(boundingBox.width, boundingBox.height);
        minorAxis = Math.min(boundingBox.width, boundingBox.height);
      }
    }
    
    // Calculate derived properties
    const circularity = perimeter > 0 ? (4 * Math.PI * area) / (perimeter * perimeter) : 0;
    const aspectRatio = boundingBox.height > 0 ? boundingBox.width / boundingBox.height : 0;
    const solidity = hullArea > 0 ? area / hullArea : 0;
    const convexity = perimeter > 0 ? opencv.arcLength(hull, true) / perimeter : 0;
    const compactness = perimeter > 0 ? (perimeter * perimeter) / area : 0;
    const extent = (boundingBox.width * boundingBox.height) > 0 ? area / (boundingBox.width * boundingBox.height) : 0;
    
    // Cleanup
    hull.delete();
    
    return {
      id,
      area,
      perimeter,
      centroid,
      boundingBox,
      circularity,
      aspectRatio,
      solidity,
      convexity,
      orientation,
      majorAxis,
      minorAxis,
      eccentricity,
      compactness,
      extent
    };
  }
  
  /**
   * Check if shape passes filter criteria
   */
  private static passesFilters(properties: ShapeProperties, options: ShapeAnalysisOptions): boolean {
    if (properties.area < options.minArea || properties.area > options.maxArea) return false;
    if (properties.perimeter < options.minPerimeter || properties.perimeter > options.maxPerimeter) return false;
    if (properties.circularity < options.circularityRange[0] || properties.circularity > options.circularityRange[1]) return false;
    if (properties.aspectRatio < options.aspectRatioRange[0] || properties.aspectRatio > options.aspectRatioRange[1]) return false;
    if (properties.solidity < options.solidityRange[0] || properties.solidity > options.solidityRange[1]) return false;
    if (properties.convexity < options.convexityRange[0] || properties.convexity > options.convexityRange[1]) return false;
    
    return true;
  }
  
  /**
   * Create output image based on mode
   */
  private static createOutputImage(
    opencv: any, 
    src: any, 
    contours: any, 
    shapes: ShapeProperties[], 
    options: ShapeAnalysisOptions
  ): any {
    const output = new opencv.Mat();
    
    switch (options.outputMode) {
      case 'filtered':
        // Show only filtered shapes
        output.create(src.rows, src.cols, opencv.CV_8UC4);
        output.setTo(new opencv.Scalar(0, 0, 0, 255));
        
        shapes.forEach(shape => {
          opencv.drawContours(output, contours, shape.id, new opencv.Scalar(255, 255, 255, 255), -1);
        });
        break;
        
      case 'labeled':
        // Color-code shapes by properties
        src.copyTo(output);
        shapes.forEach(shape => {
          const color = this.getShapeColor(shape, options);
          opencv.drawContours(output, contours, shape.id, color, 2);
        });
        break;
        
      case 'overlay':
        // Overlay analysis on original image
        src.copyTo(output);
        shapes.forEach(shape => {
          const color = new opencv.Scalar(0, 255, 0, 255);
          opencv.drawContours(output, contours, shape.id, color, 2);
          
          if (options.drawProperties) {
            this.drawShapeProperties(opencv, output, shape);
          }
        });
        break;
        
      default:
        src.copyTo(output);
    }
    
    return output;
  }
  
  /**
   * Get color for shape based on properties
   */
  private static getShapeColor(shape: ShapeProperties, options: ShapeAnalysisOptions): any {
    if (!options.colorCode) {
      return { val: [0, 255, 0, 255] }; // Green
    }
    
    // Color by circularity (red = low, green = high)
    const circularity = Math.max(0, Math.min(1, shape.circularity));
    const red = Math.round(255 * (1 - circularity));
    const green = Math.round(255 * circularity);
    
    return { val: [red, green, 0, 255] };
  }
  
  /**
   * Draw shape properties on image
   */
  private static drawShapeProperties(opencv: any, image: any, shape: ShapeProperties): void {
    const centroid = new opencv.Point(Math.round(shape.centroid.x), Math.round(shape.centroid.y));
    
    // Draw centroid
    opencv.circle(image, centroid, 3, new opencv.Scalar(255, 0, 0, 255), -1);
    
    // Draw bounding box
    const rect = new opencv.Rect(
      shape.boundingBox.x,
      shape.boundingBox.y,
      shape.boundingBox.width,
      shape.boundingBox.height
    );
    opencv.rectangle(image, rect, new opencv.Scalar(0, 0, 255, 255), 1);
    
    // Draw area text
    const text = `A:${Math.round(shape.area)}`;
    const textPoint = new opencv.Point(shape.boundingBox.x, shape.boundingBox.y - 5);
    opencv.putText(image, text, textPoint, opencv.FONT_HERSHEY_SIMPLEX, 0.4, new opencv.Scalar(255, 255, 0, 255), 1);
  }
  
  /**
   * Calculate overall statistics
   */
  private static calculateStatistics(shapes: ShapeProperties[]): any {
    if (shapes.length === 0) {
      return {
        totalShapes: 0,
        avgArea: 0,
        avgCircularity: 0,
        avgAspectRatio: 0,
        sizeDistribution: { small: 0, medium: 0, large: 0 }
      };
    }
    
    const totalShapes = shapes.length;
    const avgArea = shapes.reduce((sum, shape) => sum + shape.area, 0) / totalShapes;
    const avgCircularity = shapes.reduce((sum, shape) => sum + shape.circularity, 0) / totalShapes;
    const avgAspectRatio = shapes.reduce((sum, shape) => sum + shape.aspectRatio, 0) / totalShapes;
    
    // Size distribution (based on area percentiles)
    const areas = shapes.map(s => s.area).sort((a, b) => a - b);
    const q33 = areas[Math.floor(areas.length * 0.33)];
    const q66 = areas[Math.floor(areas.length * 0.66)];
    
    const sizeDistribution = {
      small: shapes.filter(s => s.area <= q33).length,
      medium: shapes.filter(s => s.area > q33 && s.area <= q66).length,
      large: shapes.filter(s => s.area > q66).length
    };
    
    return {
      totalShapes,
      avgArea,
      avgCircularity,
      avgAspectRatio,
      sizeDistribution
    };
  }
  
  /**
   * Fallback implementation without OpenCV
   */
  private static fallbackShapeAnalysis(imageData: ImageData, options: ShapeAnalysisOptions): ShapeAnalysisResult {
    // Simple connected component analysis
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;
    
    // Convert to binary
    const binary = new Array(height).fill(0).map(() => new Array(width).fill(0));
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const gray = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
        binary[y][x] = gray > 128 ? 1 : 0;
      }
    }
    
    // Simple blob detection
    const visited = new Array(height).fill(0).map(() => new Array(width).fill(false));
    const shapes: ShapeProperties[] = [];
    let shapeId = 0;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (binary[y][x] === 1 && !visited[y][x]) {
          const blob = this.floodFill(binary, visited, x, y, width, height);
          if (blob.length >= options.minArea) {
            const properties = this.calculateBlobProperties(blob, shapeId++);
            shapes.push(properties);
          }
        }
      }
    }
    
    const statistics = this.calculateStatistics(shapes);
    
    return {
      imageData,
      shapes,
      statistics
    };
  }
  
  /**
   * Flood fill for blob detection
   */
  private static floodFill(
    binary: number[][], 
    visited: boolean[][], 
    startX: number, 
    startY: number, 
    width: number, 
    height: number
  ): Array<{x: number, y: number}> {
    const stack = [{x: startX, y: startY}];
    const blob: Array<{x: number, y: number}> = [];
    
    while (stack.length > 0) {
      const {x, y} = stack.pop()!;
      
      if (x < 0 || x >= width || y < 0 || y >= height || visited[y][x] || binary[y][x] === 0) {
        continue;
      }
      
      visited[y][x] = true;
      blob.push({x, y});
      
      // 8-connected neighbors
      stack.push({x: x-1, y: y-1}, {x: x, y: y-1}, {x: x+1, y: y-1});
      stack.push({x: x-1, y: y}, {x: x+1, y: y});
      stack.push({x: x-1, y: y+1}, {x: x, y: y+1}, {x: x+1, y: y+1});
    }
    
    return blob;
  }
  
  /**
   * Calculate properties for a blob
   */
  private static calculateBlobProperties(blob: Array<{x: number, y: number}>, id: number): ShapeProperties {
    const area = blob.length;
    
    // Centroid
    const centroid = {
      x: blob.reduce((sum, p) => sum + p.x, 0) / area,
      y: blob.reduce((sum, p) => sum + p.y, 0) / area
    };
    
    // Bounding box
    const minX = Math.min(...blob.map(p => p.x));
    const maxX = Math.max(...blob.map(p => p.x));
    const minY = Math.min(...blob.map(p => p.y));
    const maxY = Math.max(...blob.map(p => p.y));
    
    const boundingBox = {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1
    };
    
    // Approximate perimeter (boundary pixels)
    const perimeter = blob.filter(p => {
      return blob.find(other => 
        Math.abs(other.x - p.x) <= 1 && Math.abs(other.y - p.y) <= 1 && 
        (other.x !== p.x || other.y !== p.y)
      ) === undefined;
    }).length;
    
    const aspectRatio = boundingBox.height > 0 ? boundingBox.width / boundingBox.height : 0;
    const circularity = perimeter > 0 ? (4 * Math.PI * area) / (perimeter * perimeter) : 0;
    const extent = (boundingBox.width * boundingBox.height) > 0 ? area / (boundingBox.width * boundingBox.height) : 0;
    
    return {
      id,
      area,
      perimeter,
      centroid,
      boundingBox,
      circularity,
      aspectRatio,
      solidity: 1, // Approximate
      convexity: 1, // Approximate
      orientation: 0,
      majorAxis: Math.max(boundingBox.width, boundingBox.height),
      minorAxis: Math.min(boundingBox.width, boundingBox.height),
      eccentricity: 0,
      compactness: perimeter > 0 ? (perimeter * perimeter) / area : 0,
      extent
    };
  }
} 