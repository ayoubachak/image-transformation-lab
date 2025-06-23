import { getOpenCV } from '../utils/imageProcessing';

export interface ColorFilterOptions {
  method: 'hsv-range' | 'rgb-distance' | 'color-channel' | 'preset-colors';
  presetColor?: 'yellow' | 'blue' | 'red' | 'green' | 'white' | 'black' | 'custom';
  
  // HSV range filtering
  hueMin?: number;
  hueMax?: number;
  saturationMin?: number;
  saturationMax?: number;
  valueMin?: number;
  valueMax?: number;
  
  // RGB distance filtering
  colorDistance?: number;
  targetR?: number;
  targetG?: number;
  targetB?: number;
  
  // Channel-based filtering
  targetChannel?: 'red' | 'green' | 'blue' | 'best';
  
  // Output options
  replacementAction: 'black' | 'white' | 'transparent' | 'blur';
  smoothing: number;
  tolerance: number;
}

export class ColorFilterProcessor {
  /**
   * Main color filtering function
   */
  static processColorFilter(imageData: ImageData, options: ColorFilterOptions): ImageData {
    const opencv = getOpenCV();
    if (!opencv) {
      return this.fallbackColorFilter(imageData, options);
    }

    try {
      // Convert ImageData to cv.Mat
      const src = new opencv.Mat(imageData.height, imageData.width, opencv.CV_8UC4);
      src.data.set(imageData.data);
      
      // Convert RGBA to RGB for processing
      const rgb = new opencv.Mat();
      opencv.cvtColor(src, rgb, opencv.COLOR_RGBA2RGB);
      
      let mask: any;
      
      switch (options.method) {
        case 'preset-colors':
          mask = this.createPresetColorMask(opencv, rgb, options.presetColor || 'yellow', options.tolerance);
          break;
        case 'hsv-range':
          mask = this.createHSVRangeMask(opencv, rgb, options);
          break;
        case 'rgb-distance':
          mask = this.createRGBDistanceMask(opencv, rgb, options);
          break;
        case 'color-channel':
          mask = this.createChannelMask(opencv, rgb, options);
          break;
        default:
          mask = this.createPresetColorMask(opencv, rgb, 'yellow', options.tolerance);
      }
      
      // Apply smoothing if requested
      if (options.smoothing > 0) {
        const kernel = opencv.getStructuringElement(opencv.MORPH_ELLIPSE, 
          new opencv.Size(options.smoothing * 2 + 1, options.smoothing * 2 + 1));
        opencv.morphologyEx(mask, mask, opencv.MORPH_CLOSE, kernel);
        opencv.morphologyEx(mask, mask, opencv.MORPH_OPEN, kernel);
        kernel.delete();
      }
      
      // Apply the mask
      const result = this.applyMask(opencv, src, mask, options.replacementAction);
      
      // Convert back to ImageData
      const resultData = new ImageData(
        new Uint8ClampedArray(result.data),
        result.cols,
        result.rows
      );
      
      // Cleanup
      src.delete();
      rgb.delete();
      mask.delete();
      result.delete();
      
      return resultData;
      
    } catch (error) {
      console.warn('OpenCV color filtering failed, using fallback:', error);
      return this.fallbackColorFilter(imageData, options);
    }
  }
  
  /**
   * Create mask for preset colors (optimized for license plates)
   */
  private static createPresetColorMask(opencv: any, rgb: any, presetColor: string, tolerance: number): any {
    const hsv = new opencv.Mat();
    opencv.cvtColor(rgb, hsv, opencv.COLOR_RGB2HSV);
    
    let lower: number[], upper: number[];
    
    switch (presetColor) {
      case 'yellow':
        // Yellow license plate range in HSV
        lower = [20 - tolerance/2, 100, 100];
        upper = [30 + tolerance/2, 255, 255];
        break;
      case 'blue':
        lower = [100 - tolerance/2, 50, 50];
        upper = [130 + tolerance/2, 255, 255];
        break;
      case 'red':
        // Red has wrap-around in HSV
        const mask1 = new opencv.Mat();
        const mask2 = new opencv.Mat();
        opencv.inRange(hsv, new opencv.Mat(1, 1, opencv.CV_8UC3, [0, 50, 50]), 
                      new opencv.Mat(1, 1, opencv.CV_8UC3, [10 + tolerance/2, 255, 255]), mask1);
        opencv.inRange(hsv, new opencv.Mat(1, 1, opencv.CV_8UC3, [170 - tolerance/2, 50, 50]), 
                      new opencv.Mat(1, 1, opencv.CV_8UC3, [179, 255, 255]), mask2);
        const redMask = new opencv.Mat();
        opencv.add(mask1, mask2, redMask);
        hsv.delete();
        mask1.delete();
        mask2.delete();
        return redMask;
      case 'green':
        lower = [40 - tolerance/2, 50, 50];
        upper = [80 + tolerance/2, 255, 255];
        break;
      case 'white':
        lower = [0, 0, 200];
        upper = [179, 30, 255];
        break;
      case 'black':
        lower = [0, 0, 0];
        upper = [179, 255, 50];
        break;
      default:
        // Default to yellow
        lower = [20, 100, 100];
        upper = [30, 255, 255];
    }
    
    const mask = new opencv.Mat();
    opencv.inRange(hsv, new opencv.Mat(1, 1, opencv.CV_8UC3, lower), 
                   new opencv.Mat(1, 1, opencv.CV_8UC3, upper), mask);
    
    hsv.delete();
    return mask;
  }
  
  /**
   * Create mask using HSV range
   */
  private static createHSVRangeMask(opencv: any, rgb: any, options: ColorFilterOptions): any {
    const hsv = new opencv.Mat();
    opencv.cvtColor(rgb, hsv, opencv.COLOR_RGB2HSV);
    
    const lower = [
      options.hueMin || 0,
      options.saturationMin || 0,
      options.valueMin || 0
    ];
    const upper = [
      options.hueMax || 179,
      options.saturationMax || 255,
      options.valueMax || 255
    ];
    
    const mask = new opencv.Mat();
    opencv.inRange(hsv, new opencv.Mat(1, 1, opencv.CV_8UC3, lower),
                   new opencv.Mat(1, 1, opencv.CV_8UC3, upper), mask);
    
    hsv.delete();
    return mask;
  }
  
  /**
   * Create mask using RGB color distance
   */
  private static createRGBDistanceMask(opencv: any, rgb: any, options: ColorFilterOptions): any {
    const channels = new opencv.MatVector();
    opencv.split(rgb, channels);
    
    const targetR = options.targetR || 255;  // Default yellow
    const targetG = options.targetG || 255;
    const targetB = options.targetB || 0;
    const maxDistance = options.colorDistance || 80;
    
    const mask = new opencv.Mat.zeros(rgb.rows, rgb.cols, opencv.CV_8UC1);
    
    // Calculate color distance for each pixel
    for (let i = 0; i < rgb.rows; i++) {
      for (let j = 0; j < rgb.cols; j++) {
        const r = channels.get(0).ucharAt(i, j);
        const g = channels.get(1).ucharAt(i, j);
        const b = channels.get(2).ucharAt(i, j);
        
        const distance = Math.sqrt(
          Math.pow(r - targetR, 2) + 
          Math.pow(g - targetG, 2) + 
          Math.pow(b - targetB, 2)
        );
        
        if (distance <= maxDistance) {
          mask.ucharPtr(i, j)[0] = 255;
        }
      }
    }
    
    channels.delete();
    return mask;
  }
  
  /**
   * Create mask using specific color channel
   */
  private static createChannelMask(opencv: any, rgb: any, options: ColorFilterOptions): any {
    const channels = new opencv.MatVector();
    opencv.split(rgb, channels);
    
    let channelIndex = 2; // Default to blue channel (good for yellow filtering)
    
    switch (options.targetChannel) {
      case 'red': channelIndex = 0; break;
      case 'green': channelIndex = 1; break;
      case 'blue': channelIndex = 2; break;
      case 'best':
        // For yellow removal, blue channel is best
        channelIndex = 2;
        break;
    }
    
    const channelMat = channels.get(channelIndex);
    const mask = new opencv.Mat();
    
    // Threshold on the selected channel (lower values in blue channel indicate yellow)
    opencv.threshold(channelMat, mask, 100, 255, opencv.THRESH_BINARY_INV);
    
    channels.delete();
    return mask;
  }
  
  /**
   * Apply the mask to the image
   */
  private static applyMask(opencv: any, src: any, mask: any, replacementAction: string): any {
    const result = src.clone();
    
    switch (replacementAction) {
      case 'black':
        result.setTo(new opencv.Scalar(0, 0, 0, 255), mask);
        break;
      case 'white':
        result.setTo(new opencv.Scalar(255, 255, 255, 255), mask);
        break;
      case 'transparent':
        // Set alpha channel to 0 for transparency
        const channels = new opencv.MatVector();
        opencv.split(result, channels);
        channels.get(3).setTo(new opencv.Scalar(0), mask);
        opencv.merge(channels, result);
        channels.delete();
        break;
      case 'blur':
        const blurred = new opencv.Mat();
        opencv.GaussianBlur(result, blurred, new opencv.Size(15, 15), 0);
        blurred.copyTo(result, mask);
        blurred.delete();
        break;
      default:
        result.setTo(new opencv.Scalar(0, 0, 0, 255), mask);
    }
    
    return result;
  }
  
  /**
   * Fallback implementation without OpenCV
   */
  private static fallbackColorFilter(imageData: ImageData, options: ColorFilterOptions): ImageData {
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      let shouldFilter = false;
      
      if (options.method === 'preset-colors' && options.presetColor === 'yellow') {
        // Simple yellow detection in RGB
        const isYellow = (r > 180 && g > 180 && b < 100) || 
                        (r > 200 && g > 200 && b < 150);
        shouldFilter = isYellow;
      } else if (options.method === 'color-channel' && options.targetChannel === 'blue') {
        // Use blue channel for yellow filtering
        shouldFilter = b < 100 && (r > 150 || g > 150);
      } else {
        // Default fallback
        const isYellowish = r > 150 && g > 150 && b < 120;
        shouldFilter = isYellowish;
      }
      
      if (shouldFilter) {
        switch (options.replacementAction) {
          case 'black':
            data[i] = 0; data[i + 1] = 0; data[i + 2] = 0;
            break;
          case 'white':
            data[i] = 255; data[i + 1] = 255; data[i + 2] = 255;
            break;
          case 'transparent':
            data[i + 3] = 0;
            break;
          default:
            data[i] = 0; data[i + 1] = 0; data[i + 2] = 0;
        }
      }
    }
    
    return new ImageData(data, width, height);
  }
} 