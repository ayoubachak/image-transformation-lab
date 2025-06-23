/**
 * Fill Holes Processor
 * Implements hole filling in binary images using flood fill algorithms
 */

export interface FillHolesOptions {
  connectivity: '4' | '8';
  minHoleSize: number;
  maxHoleSize: number;
}

export class FillHolesProcessor {
  /**
   * Fill holes in a binary image
   */
  static process(imageData: ImageData, options: FillHolesOptions): ImageData {
    const { data, width, height } = imageData;
    const connectivity = parseInt(options.connectivity) as 4 | 8;
    
    // Create working copy
    const result = new ImageData(new Uint8ClampedArray(data), width, height);
    const pixels = result.data;
    
    // Convert to binary if not already
    const binaryData = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      binaryData[i / 4] = gray > 128 ? 1 : 0;
    }
    
    // Create a copy for processing holes (inverted)
    const processData = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      processData[i] = binaryData[i] === 0 ? 1 : 0; // Invert: holes become foreground
    }
    
    // Find and fill holes
    const visited = new Set<number>();
    const holes: number[][] = [];
    
    // Find all hole regions (connected components in inverted image)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        
        if (processData[idx] === 1 && !visited.has(idx)) {
          const hole = this.floodFill(processData, width, height, x, y, connectivity, visited);
          
          // Check if this is a boundary component (touches edges)
          const isBoundary = hole.some(pixelIdx => {
            const px = pixelIdx % width;
            const py = Math.floor(pixelIdx / width);
            return px === 0 || px === width - 1 || py === 0 || py === height - 1;
          });
          
          // Only consider internal holes (not touching boundaries)
          if (!isBoundary) {
            holes.push(hole);
          }
        }
      }
    }
    
    // Filter holes by size and fill them
    for (const hole of holes) {
      const holeSize = hole.length;
      
      // Check size constraints
      if (options.minHoleSize > 0 && holeSize < options.minHoleSize) continue;
      if (options.maxHoleSize > 0 && holeSize > options.maxHoleSize) continue;
      
      // Fill the hole in the binary data
      for (const idx of hole) {
        binaryData[idx] = 1; // Fill with foreground
      }
    }
    
    // Convert back to RGBA
    for (let i = 0; i < binaryData.length; i++) {
      const value = binaryData[i] * 255;
      const rgbaIdx = i * 4;
      pixels[rgbaIdx] = value;     // R
      pixels[rgbaIdx + 1] = value; // G
      pixels[rgbaIdx + 2] = value; // B
      pixels[rgbaIdx + 3] = 255;   // A
    }
    
    return result;
  }
  
  /**
   * Flood fill algorithm to find connected components
   */
  private static floodFill(
    data: Uint8Array, 
    width: number, 
    height: number, 
    startX: number, 
    startY: number, 
    connectivity: 4 | 8,
    visited: Set<number>
  ): number[] {
    const component: number[] = [];
    const stack: [number, number][] = [[startX, startY]];
    const startIdx = startY * width + startX;
    
    if (visited.has(startIdx)) return component;
    
    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const idx = y * width + x;
      
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (visited.has(idx) || data[idx] === 0) continue;
      
      visited.add(idx);
      component.push(idx);
      
      // Add neighbors based on connectivity
      if (connectivity === 4) {
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      } else {
        stack.push(
          [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1],
          [x + 1, y + 1], [x + 1, y - 1], [x - 1, y + 1], [x - 1, y - 1]
        );
      }
    }
    
    return component;
  }
} 