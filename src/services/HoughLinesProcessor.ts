/**
 * Hough Lines Processor
 * Detects straight lines in images using the Hough transform
 */

export interface HoughLinesOptions {
  rho: number;
  theta: number;
  threshold: number;
  minLineLength: number;
  maxLineGap: number;
  lineColor: 'red' | 'green' | 'blue' | 'white' | 'auto';
  lineThickness: number;
}

export interface Line {
  rho: number;
  theta: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  length: number;
  votes: number;
}

export class HoughLinesProcessor {
  /**
   * Detect lines using Hough transform
   */
  static process(imageData: ImageData, options: HoughLinesOptions): ImageData {
    const { data, width, height } = imageData;
    
    // Convert to grayscale and apply edge detection
    const edgeData = this.detectEdges(data, width, height);
    
    // Apply Hough transform
    const lines = this.houghTransform(edgeData, width, height, options);
    
    // Filter lines by length and gap
    const filteredLines = this.filterLines(lines, options);
    
    // Draw lines on image
    return this.drawLines(imageData, filteredLines, options);
  }
  
  /**
   * Simple edge detection using Sobel operator
   */
  private static detectEdges(data: Uint8ClampedArray, width: number, height: number): Uint8Array {
    // Convert to grayscale
    const grayscale = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
      grayscale[i / 4] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }
    
    // Sobel kernels
    const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
    
    const edges = new Uint8Array(width * height);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0;
        
        // Apply Sobel operators
        for (let ky = 0; ky < 3; ky++) {
          for (let kx = 0; kx < 3; kx++) {
            const pixelY = y + ky - 1;
            const pixelX = x + kx - 1;
            const pixel = grayscale[pixelY * width + pixelX];
            
            gx += pixel * sobelX[ky][kx];
            gy += pixel * sobelY[ky][kx];
          }
        }
        
        // Calculate gradient magnitude
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        edges[y * width + x] = magnitude > 50 ? 255 : 0; // Threshold edges
      }
    }
    
    return edges;
  }
  
  /**
   * Hough transform implementation
   */
  private static houghTransform(
    edgeData: Uint8Array,
    width: number,
    height: number,
    options: HoughLinesOptions
  ): Line[] {
    // Calculate parameter space dimensions
    const maxRho = Math.sqrt(width * width + height * height);
    const rhoRange = Math.ceil(2 * maxRho / options.rho);
    const thetaRange = Math.ceil(Math.PI / options.theta);
    
    // Initialize accumulator
    const accumulator = Array(rhoRange).fill(0).map(() => Array(thetaRange).fill(0));
    
    // Vote for each edge pixel
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (edgeData[y * width + x] > 0) {
          // For each possible theta
          for (let t = 0; t < thetaRange; t++) {
            const theta = t * options.theta;
            const rho = x * Math.cos(theta) + y * Math.sin(theta);
            const rhoIndex = Math.round((rho + maxRho) / options.rho);
            
            if (rhoIndex >= 0 && rhoIndex < rhoRange) {
              accumulator[rhoIndex][t]++;
            }
          }
        }
      }
    }
    
    // Find peaks in accumulator (lines)
    const lines: Line[] = [];
    
    for (let rhoIdx = 0; rhoIdx < rhoRange; rhoIdx++) {
      for (let thetaIdx = 0; thetaIdx < thetaRange; thetaIdx++) {
        const votes = accumulator[rhoIdx][thetaIdx];
        
        if (votes >= options.threshold) {
          // Check if this is a local maximum
          if (this.isLocalMaximum(accumulator, rhoIdx, thetaIdx, rhoRange, thetaRange)) {
            const rho = (rhoIdx * options.rho) - maxRho;
            const theta = thetaIdx * options.theta;
            
            // Convert polar to Cartesian coordinates
            const line = this.polarToCartesian(rho, theta, width, height);
            if (line) {
              lines.push({
                rho,
                theta,
                x1: line.x1,
                y1: line.y1,
                x2: line.x2,
                y2: line.y2,
                length: line.length,
                votes
              });
            }
          }
        }
      }
    }
    
    // Sort by votes (strongest lines first)
    return lines.sort((a, b) => b.votes - a.votes);
  }
  
  /**
   * Check if point is local maximum in accumulator
   */
  private static isLocalMaximum(
    accumulator: number[][],
    rhoIdx: number,
    thetaIdx: number,
    rhoRange: number,
    thetaRange: number
  ): boolean {
    const current = accumulator[rhoIdx][thetaIdx];
    
    // Check 3x3 neighborhood
    for (let dr = -1; dr <= 1; dr++) {
      for (let dt = -1; dt <= 1; dt++) {
        if (dr === 0 && dt === 0) continue;
        
        const r = rhoIdx + dr;
        const t = thetaIdx + dt;
        
        if (r >= 0 && r < rhoRange && t >= 0 && t < thetaRange) {
          if (accumulator[r][t] > current) {
            return false;
          }
        }
      }
    }
    
    return true;
  }
  
  /**
   * Convert polar line coordinates to Cartesian
   */
  private static polarToCartesian(
    rho: number,
    theta: number,
    width: number,
    height: number
  ): { x1: number; y1: number; x2: number; y2: number; length: number } | null {
    const cos_t = Math.cos(theta);
    const sin_t = Math.sin(theta);
    
    let x1, y1, x2, y2;
    
    // Find intersection with image boundaries
    if (Math.abs(cos_t) > Math.abs(sin_t)) {
      // Line is more horizontal
      x1 = 0;
      y1 = (rho - x1 * cos_t) / sin_t;
      x2 = width - 1;
      y2 = (rho - x2 * cos_t) / sin_t;
    } else {
      // Line is more vertical
      y1 = 0;
      x1 = (rho - y1 * sin_t) / cos_t;
      y2 = height - 1;
      x2 = (rho - y2 * sin_t) / cos_t;
    }
    
    // Clip to image boundaries
    const clipped = this.clipLineToImage(x1, y1, x2, y2, width, height);
    if (!clipped) return null;
    
    const length = Math.sqrt(
      (clipped.x2 - clipped.x1) ** 2 + (clipped.y2 - clipped.y1) ** 2
    );
    
    return {
      x1: clipped.x1,
      y1: clipped.y1,
      x2: clipped.x2,
      y2: clipped.y2,
      length
    };
  }
  
  /**
   * Clip line to image boundaries using Cohen-Sutherland algorithm
   */
  private static clipLineToImage(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    width: number,
    height: number
  ): { x1: number; y1: number; x2: number; y2: number } | null {
    const INSIDE = 0;
    const LEFT = 1;
    const RIGHT = 2;
    const BOTTOM = 4;
    const TOP = 8;
    
    const computeOutCode = (x: number, y: number): number => {
      let code = INSIDE;
      if (x < 0) code |= LEFT;
      else if (x >= width) code |= RIGHT;
      if (y < 0) code |= TOP;
      else if (y >= height) code |= BOTTOM;
      return code;
    };
    
    let outcode1 = computeOutCode(x1, y1);
    let outcode2 = computeOutCode(x2, y2);
    
    while (true) {
      if (!(outcode1 | outcode2)) {
        // Both points inside
        return { x1, y1, x2, y2 };
      } else if (outcode1 & outcode2) {
        // Both points outside same region
        return null;
      } else {
        // At least one point outside
        const outcodeOut = outcode1 ? outcode1 : outcode2;
        let x, y;
        
        if (outcodeOut & TOP) {
          x = x1 + (x2 - x1) * (0 - y1) / (y2 - y1);
          y = 0;
        } else if (outcodeOut & BOTTOM) {
          x = x1 + (x2 - x1) * (height - 1 - y1) / (y2 - y1);
          y = height - 1;
        } else if (outcodeOut & RIGHT) {
          y = y1 + (y2 - y1) * (width - 1 - x1) / (x2 - x1);
          x = width - 1;
        } else if (outcodeOut & LEFT) {
          y = y1 + (y2 - y1) * (0 - x1) / (x2 - x1);
          x = 0;
        }
        
        if (outcodeOut === outcode1) {
          x1 = x!;
          y1 = y!;
          outcode1 = computeOutCode(x1, y1);
        } else {
          x2 = x!;
          y2 = y!;
          outcode2 = computeOutCode(x2, y2);
        }
      }
    }
  }
  
  /**
   * Filter lines based on length and gap criteria
   */
  private static filterLines(lines: Line[], options: HoughLinesOptions): Line[] {
    return lines.filter(line => {
      // Filter by minimum length
      if (options.minLineLength > 0 && line.length < options.minLineLength) {
        return false;
      }
      
      // Additional filtering could be implemented here for line gaps
      // This would require more complex line segment detection
      
      return true;
    });
  }
  
  /**
   * Draw detected lines on the image
   */
  private static drawLines(
    sourceImage: ImageData,
    lines: Line[],
    options: HoughLinesOptions
  ): ImageData {
    const { width, height } = sourceImage;
    const result = new ImageData(new Uint8ClampedArray(sourceImage.data), width, height);
    
    // Create canvas for drawing
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    
    // Draw source image
    ctx.putImageData(result, 0, 0);
    
    // Set line drawing properties
    ctx.lineWidth = options.lineThickness;
    ctx.lineCap = 'round';
    
    // Draw each line
    lines.forEach((line, index) => {
      // Set line color
      const color = this.getLineColor(options.lineColor, index, lines.length);
      ctx.strokeStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
      
      // Draw line
      ctx.beginPath();
      ctx.moveTo(line.x1, line.y1);
      ctx.lineTo(line.x2, line.y2);
      ctx.stroke();
    });
    
    // Get the final image
    const finalImageData = ctx.getImageData(0, 0, width, height);
    result.data.set(finalImageData.data);
    
    return result;
  }
  
  /**
   * Get color for line based on mode
   */
  private static getLineColor(colorMode: string, index: number, totalLines: number): number[] {
    switch (colorMode) {
      case 'red':
        return [255, 0, 0];
      case 'green':
        return [0, 255, 0];
      case 'blue':
        return [0, 0, 255];
      case 'white':
        return [255, 255, 255];
      case 'auto':
      default:
        // Generate distinct colors using HSL
        const hue = (index * 137.5) % 360; // Golden angle for good distribution
        return this.hslToRgb(hue, 80, 60);
    }
  }
  
  /**
   * Convert HSL to RGB
   */
  private static hslToRgb(h: number, s: number, l: number): number[] {
    h /= 360;
    s /= 100;
    l /= 100;
    
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h * 12) % 12;
      return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    };
    
    return [
      Math.round(f(0) * 255),
      Math.round(f(8) * 255),
      Math.round(f(4) * 255)
    ];
  }
  
  /**
   * Get line statistics for debugging
   */
  static analyzeLines(lines: Line[]): {
    totalLines: number;
    averageLength: number;
    averageVotes: number;
    angleDistribution: { [key: string]: number };
  } {
    if (lines.length === 0) {
      return {
        totalLines: 0,
        averageLength: 0,
        averageVotes: 0,
        angleDistribution: {}
      };
    }
    
    const totalLength = lines.reduce((sum, line) => sum + line.length, 0);
    const totalVotes = lines.reduce((sum, line) => sum + line.votes, 0);
    
    // Group angles into bins
    const angleDistribution: { [key: string]: number } = {};
    const binSize = 10; // degrees
    
    lines.forEach(line => {
      const angleDeg = (line.theta * 180 / Math.PI) % 180;
      const bin = Math.floor(angleDeg / binSize) * binSize;
      const binKey = `${bin}-${bin + binSize}°`;
      angleDistribution[binKey] = (angleDistribution[binKey] || 0) + 1;
    });
    
    return {
      totalLines: lines.length,
      averageLength: totalLength / lines.length,
      averageVotes: totalVotes / lines.length,
      angleDistribution
    };
  }
} 