/**
 * HistogramProcessor - Histogram equalization for contrast enhancement
 * 
 * Provides both global and adaptive histogram equalization:
 * - Global: Traditional histogram equalization for entire image
 * - Adaptive (CLAHE): Contrast Limited Adaptive Histogram Equalization for local contrast
 */

export interface HistogramEqualizationOptions {
  method: 'global' | 'adaptive';
  clipLimit: number;          // For CLAHE - limits contrast amplification
  tileGridSize: number;       // For CLAHE - size of local tiles
  channels: 'grayscale' | 'rgb' | 'hsv' | 'lab';
  preserveColors: boolean;    // For color images - equalize luminance only
  normalize: boolean;         // Normalize output to full range
}

export interface HistogramStats {
  histogram: number[];
  mean: number;
  std: number;
  entropy: number;
  dynamicRange: number;
}

export class HistogramProcessor {
  
  /**
   * Apply histogram equalization with the specified options
   */
  static process(imageData: ImageData, options: HistogramEqualizationOptions): ImageData {
    if (options.channels === 'grayscale') {
      return this.processGrayscale(imageData, options);
    } else if (options.channels === 'rgb') {
      return this.processRGB(imageData, options);
    } else if (options.channels === 'hsv') {
      return this.processHSV(imageData, options);
    } else if (options.channels === 'lab') {
      return this.processLAB(imageData, options);
    }
    
    // Default to grayscale
    return this.processGrayscale(imageData, options);
  }
  
  /**
   * Process grayscale image
   */
  private static processGrayscale(imageData: ImageData, options: HistogramEqualizationOptions): ImageData {
    const { data, width, height } = imageData;
    const result = new ImageData(width, height);
    const resultData = result.data;
    
    // Convert to grayscale
    const grayData = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      grayData[i / 4] = gray;
    }
    
    let equalizedGray: Uint8Array;
    
    if (options.method === 'global') {
      equalizedGray = this.globalHistogramEqualization(grayData);
    } else {
      equalizedGray = this.adaptiveHistogramEqualization(grayData, width, height, options);
    }
    
    // Convert back to RGBA
    for (let i = 0; i < equalizedGray.length; i++) {
      const rgbaIndex = i * 4;
      const equalizedValue = equalizedGray[i];
      
      resultData[rgbaIndex] = equalizedValue;     // R
      resultData[rgbaIndex + 1] = equalizedValue; // G
      resultData[rgbaIndex + 2] = equalizedValue; // B
      resultData[rgbaIndex + 3] = data[rgbaIndex + 3]; // A (preserve alpha)
    }
    
    return result;
  }
  
  /**
   * Process RGB image
   */
  private static processRGB(imageData: ImageData, options: HistogramEqualizationOptions): ImageData {
    const { data, width, height } = imageData;
    const result = new ImageData(width, height);
    const resultData = result.data;
    
    if (options.preserveColors) {
      // Convert to HSV, equalize V channel only, convert back
      return this.processHSV(imageData, options);
    } else {
      // Equalize each RGB channel independently
      const rChannel = new Uint8Array(width * height);
      const gChannel = new Uint8Array(width * height);
      const bChannel = new Uint8Array(width * height);
      
      // Extract channels
      for (let i = 0; i < data.length; i += 4) {
        const pixelIndex = i / 4;
        rChannel[pixelIndex] = data[i];
        gChannel[pixelIndex] = data[i + 1];
        bChannel[pixelIndex] = data[i + 2];
      }
      
      // Equalize each channel
      let rEqualized: Uint8Array, gEqualized: Uint8Array, bEqualized: Uint8Array;
      
      if (options.method === 'global') {
        rEqualized = this.globalHistogramEqualization(rChannel);
        gEqualized = this.globalHistogramEqualization(gChannel);
        bEqualized = this.globalHistogramEqualization(bChannel);
      } else {
        rEqualized = this.adaptiveHistogramEqualization(rChannel, width, height, options);
        gEqualized = this.adaptiveHistogramEqualization(gChannel, width, height, options);
        bEqualized = this.adaptiveHistogramEqualization(bChannel, width, height, options);
      }
      
      // Combine channels
      for (let i = 0; i < rEqualized.length; i++) {
        const rgbaIndex = i * 4;
        resultData[rgbaIndex] = rEqualized[i];
        resultData[rgbaIndex + 1] = gEqualized[i];
        resultData[rgbaIndex + 2] = bEqualized[i];
        resultData[rgbaIndex + 3] = data[rgbaIndex + 3];
      }
    }
    
    return result;
  }
  
  /**
   * Process HSV image (equalize V channel to preserve colors)
   */
  private static processHSV(imageData: ImageData, options: HistogramEqualizationOptions): ImageData {
    const { data, width, height } = imageData;
    const result = new ImageData(width, height);
    const resultData = result.data;
    
    const hsvData = new Array(width * height);
    
    // Convert RGB to HSV
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const delta = max - min;
      
      let h = 0, s = 0, v = max;
      
      if (delta > 0) {
        s = delta / max;
        
        if (max === r) h = ((g - b) / delta) % 6;
        else if (max === g) h = (b - r) / delta + 2;
        else h = (r - g) / delta + 4;
        
        h *= 60;
        if (h < 0) h += 360;
      }
      
      hsvData[i / 4] = { h, s, v };
    }
    
    // Extract V channel
    const vChannel = new Uint8Array(width * height);
    for (let i = 0; i < hsvData.length; i++) {
      vChannel[i] = Math.round(hsvData[i].v * 255);
    }
    
    // Equalize V channel
    let vEqualized: Uint8Array;
    if (options.method === 'global') {
      vEqualized = this.globalHistogramEqualization(vChannel);
    } else {
      vEqualized = this.adaptiveHistogramEqualization(vChannel, width, height, options);
    }
    
    // Convert back to RGB
    for (let i = 0; i < hsvData.length; i++) {
      const { h, s } = hsvData[i];
      const v = vEqualized[i] / 255;
      
      const c = v * s;
      const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
      const m = v - c;
      
      let r = 0, g = 0, b = 0;
      
      if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
      else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
      else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
      else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
      else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
      else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }
      
      const rgbaIndex = i * 4;
      resultData[rgbaIndex] = Math.round((r + m) * 255);
      resultData[rgbaIndex + 1] = Math.round((g + m) * 255);
      resultData[rgbaIndex + 2] = Math.round((b + m) * 255);
      resultData[rgbaIndex + 3] = data[rgbaIndex + 3];
    }
    
    return result;
  }
  
  /**
   * Process LAB image (equalize L channel)
   */
  private static processLAB(imageData: ImageData, options: HistogramEqualizationOptions): ImageData {
    // Simplified LAB conversion - equalize luminance channel
    // For full implementation, we'd need proper RGB->LAB conversion
    return this.processHSV(imageData, options); // Use HSV as approximation
  }
  
  /**
   * Global histogram equalization
   */
  private static globalHistogramEqualization(data: Uint8Array): Uint8Array {
    const result = new Uint8Array(data.length);
    
    // Calculate histogram
    const histogram = new Array(256).fill(0);
    for (let i = 0; i < data.length; i++) {
      histogram[data[i]]++;
    }
    
    // Calculate cumulative distribution function (CDF)
    const cdf = new Array(256);
    cdf[0] = histogram[0];
    for (let i = 1; i < 256; i++) {
      cdf[i] = cdf[i - 1] + histogram[i];
    }
    
    // Find first non-zero CDF value
    let cdfMin = 0;
    for (let i = 0; i < 256; i++) {
      if (cdf[i] > 0) {
        cdfMin = cdf[i];
        break;
      }
    }
    
    // Apply equalization formula
    const totalPixels = data.length;
    for (let i = 0; i < data.length; i++) {
      const oldValue = data[i];
      const newValue = Math.round(((cdf[oldValue] - cdfMin) / (totalPixels - cdfMin)) * 255);
      result[i] = Math.max(0, Math.min(255, newValue));
    }
    
    return result;
  }
  
  /**
   * Adaptive histogram equalization (CLAHE)
   */
  private static adaptiveHistogramEqualization(
    data: Uint8Array, 
    width: number, 
    height: number, 
    options: HistogramEqualizationOptions
  ): Uint8Array {
    const { clipLimit, tileGridSize } = options;
    const result = new Uint8Array(data.length);
    
    const tileWidth = Math.floor(width / tileGridSize);
    const tileHeight = Math.floor(height / tileGridSize);
    
    // Process each tile
    for (let tileY = 0; tileY < tileGridSize; tileY++) {
      for (let tileX = 0; tileX < tileGridSize; tileX++) {
        const startX = tileX * tileWidth;
        const startY = tileY * tileHeight;
        const endX = Math.min(startX + tileWidth, width);
        const endY = Math.min(startY + tileHeight, height);
        
        // Extract tile data
        const tileData: number[] = [];
        for (let y = startY; y < endY; y++) {
          for (let x = startX; x < endX; x++) {
            tileData.push(data[y * width + x]);
          }
        }
        
        // Calculate histogram for this tile
        const histogram = new Array(256).fill(0);
        for (const value of tileData) {
          histogram[value]++;
        }
        
        // Apply contrast limiting
        const totalPixels = tileData.length;
        const clipThreshold = (clipLimit * totalPixels) / 256;
        
        let redistributedCount = 0;
        for (let i = 0; i < 256; i++) {
          if (histogram[i] > clipThreshold) {
            redistributedCount += histogram[i] - clipThreshold;
            histogram[i] = clipThreshold;
          }
        }
        
        // Redistribute clipped pixels uniformly
        const redistributePerBin = redistributedCount / 256;
        for (let i = 0; i < 256; i++) {
          histogram[i] += redistributePerBin;
        }
        
        // Calculate CDF for this tile
        const cdf = new Array(256);
        cdf[0] = histogram[0];
        for (let i = 1; i < 256; i++) {
          cdf[i] = cdf[i - 1] + histogram[i];
        }
        
        // Apply equalization to tile
        let tileIndex = 0;
        for (let y = startY; y < endY; y++) {
          for (let x = startX; x < endX; x++) {
            const dataIndex = y * width + x;
            const oldValue = data[dataIndex];
            const newValue = Math.round((cdf[oldValue] / totalPixels) * 255);
            result[dataIndex] = Math.max(0, Math.min(255, newValue));
            tileIndex++;
          }
        }
      }
    }
    
    return result;
  }
  
  /**
   * Analyze histogram statistics
   */
  static analyzeHistogram(imageData: ImageData): HistogramStats {
    const { data } = imageData;
    const histogram = new Array(256).fill(0);
    let sum = 0;
    let pixelCount = 0;
    
    // Calculate histogram and sum
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      histogram[gray]++;
      sum += gray;
      pixelCount++;
    }
    
    // Calculate mean
    const mean = sum / pixelCount;
    
    // Calculate standard deviation
    let variance = 0;
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      variance += Math.pow(gray - mean, 2);
    }
    const std = Math.sqrt(variance / pixelCount);
    
    // Calculate entropy
    let entropy = 0;
    for (let i = 0; i < 256; i++) {
      if (histogram[i] > 0) {
        const probability = histogram[i] / pixelCount;
        entropy -= probability * Math.log2(probability);
      }
    }
    
    // Calculate dynamic range
    let minValue = 255, maxValue = 0;
    for (let i = 0; i < 256; i++) {
      if (histogram[i] > 0) {
        minValue = Math.min(minValue, i);
        maxValue = Math.max(maxValue, i);
      }
    }
    const dynamicRange = maxValue - minValue;
    
    return {
      histogram,
      mean,
      std,
      entropy,
      dynamicRange
    };
  }
  
  /**
   * Recommend optimal histogram equalization parameters
   */
  static recommendParameters(imageData: ImageData): {
    method: 'global' | 'adaptive';
    clipLimit: number;
    tileGridSize: number;
    channels: 'grayscale' | 'hsv';
  } {
    const stats = this.analyzeHistogram(imageData);
    
    // Determine if image needs adaptive vs global equalization
    const needsAdaptive = stats.std > 60 || stats.dynamicRange < 200;
    
    return {
      method: needsAdaptive ? 'adaptive' : 'global',
      clipLimit: stats.std > 80 ? 4.0 : 2.0,
      tileGridSize: imageData.width > 512 ? 16 : 8,
      channels: 'hsv' // Preserve colors by default
    };
  }
} 