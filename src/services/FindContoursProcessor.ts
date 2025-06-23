/**
 * Find Contours Processor
 * Detects and visualizes object contours in binary images
 */

export interface FindContoursOptions {
  mode: 'external' | 'all' | 'tree' | 'ccomp';
  method: 'chain' | 'simple' | 'accurate';
  thickness: number;
  color: 'auto' | 'white' | 'colored';
  minArea: number;
  maxArea: number;
}

export interface Contour {
  points: { x: number; y: number }[];
  area: number;
  perimeter: number;
  boundingBox: { x: number; y: number; width: number; height: number };
  centroid: { x: number; y: number };
  isHole: boolean;
}

export class FindContoursProcessor {
  /**
   * Find and draw contours in binary image
   */
  static process(imageData: ImageData, options: FindContoursOptions): ImageData {
    const { data, width, height } = imageData;
    
    // Convert to binary
    const binaryData = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      binaryData[i / 4] = gray > 128 ? 1 : 0;
    }
    
    // Find contours
    const contours = this.findContours(binaryData, width, height, options);
    
    // Filter contours by area
    const filteredContours = contours.filter(contour => {
      if (options.minArea > 0 && contour.area < options.minArea) return false;
      if (options.maxArea > 0 && contour.area > options.maxArea) return false;
      return true;
    });
    
    // Create output image
    return this.drawContours(imageData, filteredContours, options);
  }
  
  /**
   * Find contours using boundary following algorithm
   */
  private static findContours(
    binaryData: Uint8Array,
    width: number,
    height: number,
    options: FindContoursOptions
  ): Contour[] {
    const contours: Contour[] = [];
    const visited = new Set<number>();
    
    // Scan for contour starting points
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        
        if (binaryData[idx] === 1 && !visited.has(idx)) {
          // Check if this is a boundary pixel
          if (this.isBoundaryPixel(binaryData, x, y, width, height)) {
            const contour = this.traceContour(binaryData, width, height, x, y, visited, options.method);
            
            if (contour.points.length > 2) {
              contours.push(contour);
            }
          }
        }
      }
    }
    
    // Find holes if needed
    if (options.mode === 'all' || options.mode === 'tree') {
      const holes = this.findHoles(binaryData, width, height, options);
      contours.push(...holes);
    }
    
    return contours;
  }
  
  /**
   * Check if pixel is on object boundary
   */
  private static isBoundaryPixel(
    data: Uint8Array,
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean {
    if (data[y * width + x] === 0) return false;
    
    // Check 4-connected neighbors
    const neighbors = [
      [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]
    ];
    
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
        return true; // Border pixel
      }
      if (data[ny * width + nx] === 0) {
        return true; // Adjacent to background
      }
    }
    
    return false;
  }
  
  /**
   * Trace contour using Moore neighborhood tracing
   */
  private static traceContour(
    data: Uint8Array,
    width: number,
    height: number,
    startX: number,
    startY: number,
    visited: Set<number>,
    method: string
  ): Contour {
    const points: { x: number; y: number }[] = [];
    
    // 8-connected neighborhood directions (clockwise from right)
    const directions = [
      [1, 0],   // 0: right
      [1, 1],   // 1: bottom-right
      [0, 1],   // 2: bottom
      [-1, 1],  // 3: bottom-left
      [-1, 0],  // 4: left
      [-1, -1], // 5: top-left
      [0, -1],  // 6: top
      [1, -1]   // 7: top-right
    ];
    
    let currentX = startX;
    let currentY = startY;
    let currentDir = 6; // Start looking up
    
    const startIdx = startY * width + startX;
    
    do {
      points.push({ x: currentX, y: currentY });
      visited.add(currentY * width + currentX);
      
      // Find next boundary pixel
      let found = false;
      let searchDir = (currentDir + 6) % 8; // Start searching from previous direction - 2
      
      for (let i = 0; i < 8; i++) {
        const checkDir = (searchDir + i) % 8;
        const [dx, dy] = directions[checkDir];
        const nextX = currentX + dx;
        const nextY = currentY + dy;
        
        if (nextX >= 0 && nextX < width && nextY >= 0 && nextY < height) {
          const nextIdx = nextY * width + nextX;
          
          if (data[nextIdx] === 1) {
            currentX = nextX;
            currentY = nextY;
            currentDir = checkDir;
            found = true;
            break;
          }
        }
      }
      
      if (!found) break;
      
    } while (!(currentX === startX && currentY === startY) && points.length < width * height);
    
    // Simplify contour based on method
    const simplifiedPoints = method === 'simple' 
      ? this.simplifyContour(points)
      : points;
    
    return this.createContourObject(simplifiedPoints, false);
  }
  
  /**
   * Find holes in the image
   */
  private static findHoles(
    binaryData: Uint8Array,
    width: number,
    height: number,
    options: FindContoursOptions
  ): Contour[] {
    const holes: Contour[] = [];
    
    // Create inverted image
    const invertedData = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      invertedData[i] = binaryData[i] === 0 ? 1 : 0;
    }
    
    const visited = new Set<number>();
    
    // Find hole contours (internal boundaries in inverted image)
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        
        if (invertedData[idx] === 1 && !visited.has(idx)) {
          // Check if this hole is internal (doesn't touch border)
          const component = this.floodFill(invertedData, width, height, x, y, visited);
          
          const isBorder = component.some(pixelIdx => {
            const px = pixelIdx % width;
            const py = Math.floor(pixelIdx / width);
            return px === 0 || px === width - 1 || py === 0 || py === height - 1;
          });
          
          if (!isBorder && component.length > 3) {
            // Convert component to contour
            const points = component.map(idx => ({
              x: idx % width,
              y: Math.floor(idx / width)
            }));
            
            const contour = this.createContourObject(points, true);
            holes.push(contour);
          }
        }
      }
    }
    
    return holes;
  }
  
  /**
   * Flood fill for finding connected components
   */
  private static floodFill(
    data: Uint8Array,
    width: number,
    height: number,
    startX: number,
    startY: number,
    visited: Set<number>
  ): number[] {
    const component: number[] = [];
    const stack: [number, number][] = [[startX, startY]];
    
    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const idx = y * width + x;
      
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (visited.has(idx) || data[idx] === 0) continue;
      
      visited.add(idx);
      component.push(idx);
      
      // 4-connected neighbors
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    
    return component;
  }
  
  /**
   * Simplify contour using Douglas-Peucker algorithm (simplified version)
   */
  private static simplifyContour(points: { x: number; y: number }[]): { x: number; y: number }[] {
    if (points.length <= 2) return points;
    
    const simplified: { x: number; y: number }[] = [points[0]];
    
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];
      
      // Check if current point is on the line between prev and next
      const crossProduct = (next.x - prev.x) * (curr.y - prev.y) - (next.y - prev.y) * (curr.x - prev.x);
      
      if (Math.abs(crossProduct) > 1) { // Tolerance of 1 pixel
        simplified.push(curr);
      }
    }
    
    simplified.push(points[points.length - 1]);
    return simplified;
  }
  
  /**
   * Create contour object with calculated properties
   */
  private static createContourObject(points: { x: number; y: number }[], isHole: boolean): Contour {
    // Calculate area using shoelace formula
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    area = Math.abs(area) / 2;
    
    // Calculate perimeter
    let perimeter = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      const dx = points[j].x - points[i].x;
      const dy = points[j].y - points[i].y;
      perimeter += Math.sqrt(dx * dx + dy * dy);
    }
    
    // Calculate bounding box
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    // Calculate centroid
    const centroid = {
      x: xs.reduce((sum, x) => sum + x, 0) / points.length,
      y: ys.reduce((sum, y) => sum + y, 0) / points.length
    };
    
    return {
      points,
      area,
      perimeter,
      boundingBox: {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1
      },
      centroid,
      isHole
    };
  }
  
  /**
   * Draw contours on image
   */
  private static drawContours(
    sourceImage: ImageData,
    contours: Contour[],
    options: FindContoursOptions
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
    
    // Generate colors for contours
    const colors = this.generateContourColors(contours.length, options.color);
    
    // Draw each contour
    contours.forEach((contour, index) => {
      const color = colors[index];
      
      ctx.strokeStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
      ctx.lineWidth = options.thickness;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (contour.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(contour.points[0].x, contour.points[0].y);
        
        for (let i = 1; i < contour.points.length; i++) {
          ctx.lineTo(contour.points[i].x, contour.points[i].y);
        }
        
        ctx.closePath();
        ctx.stroke();
      }
    });
    
    // Get the final image
    const finalImageData = ctx.getImageData(0, 0, width, height);
    result.data.set(finalImageData.data);
    
    return result;
  }
  
  /**
   * Generate colors for contour visualization
   */
  private static generateContourColors(count: number, colorMode: string): number[][] {
    const colors: number[][] = [];
    
    switch (colorMode) {
      case 'white':
        for (let i = 0; i < count; i++) {
          colors.push([255, 255, 255]);
        }
        break;
        
      case 'colored':
        for (let i = 0; i < count; i++) {
          const hue = (i * 137.5) % 360; // Golden angle
          colors.push(this.hslToRgb(hue, 80, 60));
        }
        break;
        
      case 'auto':
      default:
        // Use different colors for objects vs holes
        for (let i = 0; i < count; i++) {
          if (i % 2 === 0) {
            colors.push([0, 255, 0]); // Green for objects
          } else {
            colors.push([255, 0, 0]); // Red for holes
          }
        }
        break;
    }
    
    return colors;
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
} 