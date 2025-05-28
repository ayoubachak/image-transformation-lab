// Import OpenCV
import cv from 'opencv-ts';
import type { Transformation } from './types';

// Ensure OpenCV is initialized
let isOpenCVInitialized = false;
let initializationPromise: Promise<void> | null = null;
let initializationAttempted = false;
let openCVInitializationError: Error | null = null;

// Intermediate processing results for visualization
export interface IntermediateResult {
  stage: string;
  imageData: ImageData;
  description: string;
}

/**
 * Verify if local OpenCV is available and ready
 */
const verifyOpenCV = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const opencv = (window as any).cv;
  if (!opencv) {
    console.warn('OpenCV not found in window.cv');
    return false;
  }
  
  // Check critical functions to ensure it's fully loaded
  if (typeof opencv.Mat !== 'function') {
    console.warn('OpenCV.Mat constructor not available');
    return false;
  }
  
  if (typeof opencv.imread !== 'function') {
    console.warn('OpenCV.imread function not available');
    return false;
  }

  console.log('OpenCV verified as properly loaded and ready to use');
  return true;
};

/**
 * Access the OpenCV instance (prioritizing the window.cv global)
 */
const getOpenCV = (): any => {
  // First try to get direct OpenCV.js from window (loaded via script tag)
  if (typeof window !== 'undefined' && (window as any).cv) {
    return (window as any).cv;
  }
  
  // Fall back to the npm package
  return cv;
};

/**
 * Verify local OpenCV file exists
 */
const checkOpenCVFileExists = async (): Promise<boolean> => {
  try {
    const response = await fetch('/lib/opencv.js', { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Error checking OpenCV file:', error);
    return false;
  }
};

export const initOpenCV = (): Promise<void> => {
  if (isOpenCVInitialized) {
    return Promise.resolve();
  }
  
  if (initializationPromise) {
    return initializationPromise;
  }
  
  initializationPromise = new Promise<void>(async (resolve, reject) => {
    console.log('Starting OpenCV initialization');
    
    // If OpenCV is already available, resolve immediately
    if (verifyOpenCV()) {
      console.log('OpenCV was already loaded and ready');
      isOpenCVInitialized = true;
      return resolve();
    }
    
    // First check if the file exists
    const fileExists = await checkOpenCVFileExists();
    if (!fileExists) {
      console.warn('OpenCV.js file not found at /lib/opencv.js');
    } else {
      console.log('OpenCV.js file found, proceeding with initialization');
    }
    
    // Add timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      if (!isOpenCVInitialized && initializationAttempted) {
        const error = new Error('OpenCV initialization timed out, continuing with fallback implementation');
        openCVInitializationError = error;
        console.warn(error.message);
        console.warn('OpenCV timeout - fallback mode will be used for image processing');
        isOpenCVInitialized = true; // Force initialization to prevent further attempts
        resolve();
      }
    }, 10000); // 10 second timeout
    
    initializationAttempted = true;
    
    try {
      // Set up event listener for OpenCV (the custom event we added to the script tag)
      if (typeof window !== 'undefined') {
        // Listen for the custom event from our script tag
        window.addEventListener('opencv-loaded', () => {
          console.log('Received opencv-loaded event');
          if (verifyOpenCV()) {
            console.log('OpenCV verified after opencv-loaded event');
            isOpenCVInitialized = true;
            clearTimeout(timeoutId);
            resolve();
          } else {
            console.warn('OpenCV not properly initialized after opencv-loaded event');
          }
        }, { once: true });
        
        // If OpenCV is already in the global namespace, set up the callback
        if ((window as any).cv) {
          const opencv = (window as any).cv;
          
          // Try to set onRuntimeInitialized
          try {
            console.log('Setting up onRuntimeInitialized callback');
            const originalCallback = opencv.onRuntimeInitialized;
            
            opencv.onRuntimeInitialized = () => {
              console.log('OpenCV runtime initialized through callback');
              isOpenCVInitialized = true;
              clearTimeout(timeoutId);
              
              // Call original callback if it was set
              if (typeof originalCallback === 'function') {
                originalCallback();
              }
              
              resolve();
            };
          } catch (error) {
            console.warn('Could not set OpenCV onRuntimeInitialized:', error);
          }
        }
        
        // Also set up a polling mechanism as a fallback (shorter interval)
        console.log('Setting up polling mechanism for OpenCV readiness');
        let pollCount = 0;
        const maxPolls = 40; // 10 seconds total (250ms * 40)
        const pollInterval = setInterval(() => {
          pollCount++;
          if (verifyOpenCV()) {
            console.log(`OpenCV detected after ${pollCount} polling attempts`);
            isOpenCVInitialized = true;
            clearInterval(pollInterval);
            clearTimeout(timeoutId);
            resolve();
            return;
          }
          
          if (pollCount >= maxPolls) {
            console.warn(`OpenCV not detected after ${maxPolls} polling attempts, stopping poll`);
            clearInterval(pollInterval);
            // Don't resolve here, let the timeout handle it
          }
        }, 250);
      } else {
        // OpenCV not available at all (no window object)
        const error = new Error('OpenCV is not available (no window object)');
        openCVInitializationError = error;
        console.error(error.message);
        clearTimeout(timeoutId);
        resolve(); // Resolve anyway to prevent hanging
      }
    } catch (error) {
      console.error('Error during OpenCV initialization:', error);
      if (error instanceof Error) {
        openCVInitializationError = error;
      }
      clearTimeout(timeoutId);
      isOpenCVInitialized = true; // Force initialization to prevent further attempts
      resolve(); // Resolve anyway to prevent hanging
    }
  });
  
  return initializationPromise;
};

export const getOpenCVInitStatus = (): { 
  initialized: boolean; 
  error: Error | null;
  attempted: boolean; 
} => {
  return {
    initialized: isOpenCVInitialized,
    error: openCVInitializationError,
    attempted: initializationAttempted
  };
};

// Helper function to convert ImageData to cv.Mat
export const imageDataToMat = (imageData: ImageData): any => {
  if (!isOpenCVInitialized) {
    throw new Error('OpenCV is not initialized. Call initOpenCV() first.');
  }
  
  const opencv = getOpenCV();
  
  try {
    // Verify that opencv.Mat exists and is a constructor
    if (!opencv || typeof opencv.Mat !== 'function') {
      console.warn('OpenCV.Mat is not available or not a constructor, using fallback approach');
      return createFallbackMat(imageData);
    }
    
    // Use direct OpenCV.js approach - create temporary canvas
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.putImageData(imageData, 0, 0);
    
    // Use imread with the canvas
    return opencv.imread(canvas);
  } catch (error) {
    console.error('Error converting ImageData to Mat:', error);
    return createFallbackMat(imageData);
  }
};

// Create a fallback "Mat-like" object when OpenCV.Mat is not available
// This allows processing to continue with the JavaScript fallback implementations
const createFallbackMat = (imageData: ImageData): any => {
  // Create a JavaScript object that mimics the minimal Mat interface needed
  return {
    rows: imageData.height,
    cols: imageData.width,
    type: () => 24, // CV_8UC4
    channels: () => 4,
    data: new Uint8ClampedArray(imageData.data),
    delete: () => {}, // Empty function as fallback
    clone: () => createFallbackMat(imageData), // Clone implementation
    isFallback: true, // Mark as fallback for conditionals
    
    // Simulate ucharPtr method for compatibility
    ucharPtr: (i: number, j: number) => {
      const offset = (i * imageData.width + j) * 4;
      return {
        0: imageData.data[offset],
        1: imageData.data[offset + 1],
        2: imageData.data[offset + 2],
        3: imageData.data[offset + 3]
      };
    }
  };
};

// Helper function to convert cv.Mat to ImageData
export const matToImageData = (mat: any): ImageData => {
  if (!isOpenCVInitialized) {
    throw new Error('OpenCV is not initialized. Call initOpenCV() first.');
  }
  
  const opencv = getOpenCV();
  
  try {
    if (!mat) {
      throw new Error('Invalid Mat object provided');
    }
    
    // If we're dealing with a fallback Mat, shortcut the conversion
    if (mat.isFallback) {
      return new ImageData(
        new Uint8ClampedArray(mat.data),
        mat.cols,
        mat.rows
      );
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = mat.cols;
    canvas.height = mat.rows;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    const imgData = ctx.createImageData(mat.cols, mat.rows);
    
    // Method 1: Direct OpenCV.js approach
    if (typeof opencv.imshow === 'function') {
      try {
        // Try to use imshow to render the Mat to canvas
        opencv.imshow(canvas, mat);
        return ctx.getImageData(0, 0, mat.cols, mat.rows);
      } catch (e) {
        console.warn('Error using imshow, falling back to manual conversion', e);
        // Fall through to manual conversion
      }
    }
    
    // Method 2: Check if we can use type() method to determine format
    if (typeof mat.type === 'function') {
      // Try to determine if it's grayscale
      const type = mat.type();
      if (type === opencv.CV_8UC1) {
        // Grayscale image
        const data = new Uint8ClampedArray(mat.rows * mat.cols * 4);
        for (let i = 0; i < mat.rows; i++) {
          for (let j = 0; j < mat.cols; j++) {
            const grayValue = mat.ucharPtr(i, j)[0];
            const offset = (i * mat.cols + j) * 4;
            data[offset] = grayValue;
            data[offset + 1] = grayValue;
            data[offset + 2] = grayValue;
            data[offset + 3] = 255;
          }
        }
        imgData.data.set(data);
        return imgData;
      }
    }
    
    // Method 3: If the Mat has data that can be accessed directly
    if (mat.data && (mat.data instanceof Uint8Array || mat.data instanceof Uint8ClampedArray)) {
      try {
        // For color images (assume RGBA or BGRA format)
        const channels = mat.channels ? mat.channels() : 4;
        
        // OpenCV may store as BGRA while Canvas uses RGBA
        const needBGRConversion = true;
        
        for (let i = 0; i < mat.rows; i++) {
          for (let j = 0; j < mat.cols; j++) {
            const offset = (i * mat.cols + j) * 4;
            const matOffset = (i * mat.cols + j) * channels;
            
            if (needBGRConversion && channels >= 3) {
              imgData.data[offset] = mat.data[matOffset + 2]; // R (from B)
              imgData.data[offset + 1] = mat.data[matOffset + 1]; // G
              imgData.data[offset + 2] = mat.data[matOffset]; // B (from R)
            } else {
              // Direct copy for each available channel
              for (let c = 0; c < Math.min(channels, 4); c++) {
                imgData.data[offset + c] = mat.data[matOffset + c];
              }
            }
            
            // Always set alpha to 255 if not provided
            if (channels < 4) {
              imgData.data[offset + 3] = 255;
            }
          }
        }
        return imgData;
      } catch (e) {
        console.warn('Error accessing mat.data directly, using fallback', e);
      }
    }
    
    // Method 4: Last resort - create a black image if nothing else works
    console.warn('Using fallback method to convert Mat to ImageData - this may not show the correct image');
    const blackData = new Uint8ClampedArray(mat.rows * mat.cols * 4);
    for (let i = 0; i < blackData.length; i += 4) {
      blackData[i + 3] = 255; // Full alpha
    }
    imgData.data.set(blackData);
    return imgData;
  } catch (error) {
    console.error('Error converting Mat to ImageData:', error);
    throw new Error('Failed to convert OpenCV format to image data');
  }
};

// Apply grayscale transformation
export const applyGrayscale = (src: any): any => {
  const opencv = getOpenCV();
  
  // Handle fallback Mat
  if (src.isFallback) {
    const result = createFallbackMat(new ImageData(
      new Uint8ClampedArray(src.data), 
      src.cols, 
      src.rows
    ));
    
    // Apply grayscale manually
    for (let i = 0; i < result.rows; i++) {
      for (let j = 0; j < result.cols; j++) {
        const offset = (i * result.cols + j) * 4;
        const r = result.data[offset];
        const g = result.data[offset + 1];
        const b = result.data[offset + 2];
        // Standard grayscale conversion
        const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        result.data[offset] = gray;
        result.data[offset + 1] = gray;
        result.data[offset + 2] = gray;
      }
    }
    return result;
  }
  
  // Use OpenCV if available
  const dst = new opencv.Mat();
  try {
    opencv.cvtColor(src, dst, opencv.COLOR_RGBA2GRAY);
    return dst;
  } catch (error) {
    dst.delete();
    throw new Error(`Grayscale transformation failed: ${error}`);
  }
};

// Apply blur transformation
export const applyBlur = (src: any, ksize: number, advancedParams?: Record<string, any>): any => {
  const opencv = getOpenCV();
  
  // Handle fallback Mat
  if (src.isFallback) {
    const result = createFallbackMat(new ImageData(
      new Uint8ClampedArray(src.data), 
      src.cols, 
      src.rows
    ));
    
    // Ensure ksize is odd
    ksize = ksize % 2 === 0 ? ksize + 1 : ksize;
    const halfK = Math.floor(ksize / 2);
    
    // Simple box blur implementation
    const tempData = new Uint8ClampedArray(result.data);
    for (let i = 0; i < result.rows; i++) {
      for (let j = 0; j < result.cols; j++) {
        let rSum = 0, gSum = 0, bSum = 0, count = 0;
        
        // Apply kernel
        for (let ki = -halfK; ki <= halfK; ki++) {
          for (let kj = -halfK; kj <= halfK; kj++) {
            const ni = i + ki;
            const nj = j + kj;
            
            if (ni >= 0 && ni < result.rows && nj >= 0 && nj < result.cols) {
              const offset = (ni * result.cols + nj) * 4;
              rSum += tempData[offset];
              gSum += tempData[offset + 1];
              bSum += tempData[offset + 2];
              count++;
            }
          }
        }
        
        // Write blurred result
        const offset = (i * result.cols + j) * 4;
        result.data[offset] = Math.round(rSum / count);
        result.data[offset + 1] = Math.round(gSum / count);
        result.data[offset + 2] = Math.round(bSum / count);
      }
    }
    
    return result;
  }
  
  // Use OpenCV if available
  const dst = new opencv.Mat();
  try {
    // Ensure ksize is odd
    ksize = ksize % 2 === 0 ? ksize + 1 : ksize;
    const ksize_obj = new opencv.Size(ksize, ksize);
    
    // Extract advanced parameters if provided
    const sigmaX = advancedParams?.sigmaX ?? 0;
    const sigmaY = advancedParams?.sigmaY ?? 0;
    
    // Determine border type
    let borderType = opencv.BORDER_DEFAULT;
    if (advancedParams?.borderType) {
      switch (advancedParams.borderType) {
        case 'BORDER_CONSTANT':
          borderType = opencv.BORDER_CONSTANT;
          break;
        case 'BORDER_REPLICATE':
          borderType = opencv.BORDER_REPLICATE;
          break;
        case 'BORDER_REFLECT':
          borderType = opencv.BORDER_REFLECT;
          break;
        case 'BORDER_WRAP':
          borderType = opencv.BORDER_WRAP;
          break;
        default:
          borderType = opencv.BORDER_DEFAULT;
      }
    }
    
    // Handle custom kernel if provided
    if (advancedParams?.useCustomKernel && advancedParams?.customKernel) {
      try {
        // Create a custom kernel from the provided values
        const kernelSize = Math.sqrt(advancedParams.customKernel.length);
        if (kernelSize === Math.floor(kernelSize)) { // Check if it's a perfect square
          const kernel = opencv.matFromArray(kernelSize, kernelSize, opencv.CV_32F, advancedParams.customKernel);
          opencv.filter2D(src, dst, -1, kernel, new opencv.Point(-1, -1), 0, borderType);
          kernel.delete();
          return dst;
        }
      } catch (error) {
        console.warn('Error applying custom kernel, falling back to GaussianBlur:', error);
        // Fall through to default GaussianBlur
      }
    }
    
    // Apply standard Gaussian blur with the provided parameters
    opencv.GaussianBlur(src, dst, ksize_obj, sigmaX, sigmaY, borderType);
    return dst;
  } catch (error) {
    dst.delete();
    throw new Error(`Blur transformation failed: ${error}`);
  }
};

// Apply threshold transformation
export const applyThreshold = (src: any, threshold: number): any => {
  const opencv = getOpenCV();
  
  // Handle fallback Mat
  if (src.isFallback) {
    const result = createFallbackMat(new ImageData(
      new Uint8ClampedArray(src.data), 
      src.cols, 
      src.rows
    ));
    
    // Convert to grayscale first if needed
    if (src.channels() > 1) {
      for (let i = 0; i < result.rows; i++) {
        for (let j = 0; j < result.cols; j++) {
          const offset = (i * result.cols + j) * 4;
          const r = result.data[offset];
          const g = result.data[offset + 1];
          const b = result.data[offset + 2];
          // Standard grayscale conversion
          const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
          result.data[offset] = gray;
          result.data[offset + 1] = gray;
          result.data[offset + 2] = gray;
        }
      }
    }
    
    // Apply threshold
    for (let i = 0; i < result.rows; i++) {
      for (let j = 0; j < result.cols; j++) {
        const offset = (i * result.cols + j) * 4;
        const value = result.data[offset] > threshold ? 255 : 0;
        result.data[offset] = value;
        result.data[offset + 1] = value;
        result.data[offset + 2] = value;
      }
    }
    
    return result;
  }
  
  // Use OpenCV if available
  const dst = new opencv.Mat();
  try {
    // Convert to grayscale if needed
    const gray = new opencv.Mat();
    if (src.channels() > 1) {
      opencv.cvtColor(src, gray, opencv.COLOR_RGBA2GRAY);
    } else {
      src.copyTo(gray);
    }
    
    opencv.threshold(gray, dst, threshold, 255, opencv.THRESH_BINARY);
    
    gray.delete();
    return dst;
  } catch (error) {
    dst.delete();
    throw new Error(`Threshold transformation failed: ${error}`);
  }
};

// Apply Laplacian edge detection
export const applyLaplacian = (src: any, ksize: number): any => {
  const opencv = getOpenCV();
  
  // Handle fallback Mat
  if (src.isFallback) {
    const result = createFallbackMat(new ImageData(
      new Uint8ClampedArray(src.data), 
      src.cols, 
      src.rows
    ));
    
    // Convert to grayscale first
    let gray = new Uint8ClampedArray(result.data.length);
    for (let i = 0; i < result.rows; i++) {
      for (let j = 0; j < result.cols; j++) {
        const offset = (i * result.cols + j) * 4;
        const r = result.data[offset];
        const g = result.data[offset + 1];
        const b = result.data[offset + 2];
        // Standard grayscale conversion
        const grayValue = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        gray[offset] = gray[offset + 1] = gray[offset + 2] = grayValue;
        gray[offset + 3] = 255;
      }
    }
    
    // Simple Laplacian kernel approximation
    for (let i = 1; i < result.rows - 1; i++) {
      for (let j = 1; j < result.cols - 1; j++) {
        const offset = (i * result.cols + j) * 4;
        const center = gray[offset];
        const top = gray[((i-1) * result.cols + j) * 4];
        const bottom = gray[((i+1) * result.cols + j) * 4];
        const left = gray[(i * result.cols + (j-1)) * 4];
        const right = gray[(i * result.cols + (j+1)) * 4];
        
        // Apply 3x3 Laplacian filter: [0,1,0; 1,-4,1; 0,1,0]
        const laplacian = Math.abs(-4 * center + top + bottom + left + right);
        const clampedValue = Math.min(255, Math.max(0, laplacian));
        
        result.data[offset] = clampedValue;
        result.data[offset + 1] = clampedValue;
        result.data[offset + 2] = clampedValue;
      }
    }
    
    return result;
  }
  
  // Use OpenCV if available
  const dst = new opencv.Mat();
  const gray = new opencv.Mat();
  const blurred = new opencv.Mat();
  
  try {
    // Convert to grayscale if needed
    if (src.channels() > 1) {
      opencv.cvtColor(src, gray, opencv.COLOR_RGBA2GRAY);
    } else {
      src.copyTo(gray);
    }
    
    // Apply Gaussian blur to reduce noise
    const ksize_blur = new opencv.Size(3, 3);
    opencv.GaussianBlur(gray, blurred, ksize_blur, 0, 0, opencv.BORDER_DEFAULT);
    
    // Apply Laplacian with required parameters
    opencv.Laplacian(blurred, dst, opencv.CV_8U, ksize, 1, 0, opencv.BORDER_DEFAULT);
    
    // Free memory
    gray.delete();
    blurred.delete();
    
    return dst;
  } catch (error) {
    dst.delete();
    gray.delete();
    blurred.delete();
    throw new Error(`Laplacian transformation failed: ${error}`);
  }
};

// Apply Sobel edge detection
export const applySobel = (src: any, ksize: number): any => {
  const opencv = getOpenCV();
  
  // Handle fallback Mat
  if (src.isFallback) {
    const result = createFallbackMat(new ImageData(
      new Uint8ClampedArray(src.data), 
      src.cols, 
      src.rows
    ));
    
    // Convert to grayscale first
    let gray = new Uint8ClampedArray(result.data.length);
    for (let i = 0; i < result.rows; i++) {
      for (let j = 0; j < result.cols; j++) {
        const offset = (i * result.cols + j) * 4;
        const r = result.data[offset];
        const g = result.data[offset + 1];
        const b = result.data[offset + 2];
        // Standard grayscale conversion
        const grayValue = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        gray[offset] = gray[offset + 1] = gray[offset + 2] = grayValue;
        gray[offset + 3] = 255;
      }
    }
    
    // Simple Sobel approximation
    for (let i = 1; i < result.rows - 1; i++) {
      for (let j = 1; j < result.cols - 1; j++) {
        const offset = (i * result.cols + j) * 4;
        
        // Horizontal gradient (simple 3x3 Sobel)
        const gx = 
          gray[((i-1) * result.cols + (j+1)) * 4] - gray[((i-1) * result.cols + (j-1)) * 4] +
          2 * gray[(i * result.cols + (j+1)) * 4] - 2 * gray[(i * result.cols + (j-1)) * 4] +
          gray[((i+1) * result.cols + (j+1)) * 4] - gray[((i+1) * result.cols + (j-1)) * 4];
        
        // Vertical gradient (simple 3x3 Sobel)
        const gy = 
          gray[((i-1) * result.cols + (j-1)) * 4] + 2 * gray[((i-1) * result.cols + j) * 4] + gray[((i-1) * result.cols + (j+1)) * 4] -
          gray[((i+1) * result.cols + (j-1)) * 4] - 2 * gray[((i+1) * result.cols + j) * 4] - gray[((i+1) * result.cols + (j+1)) * 4];
        
        // Gradient magnitude
        const mag = Math.min(255, Math.sqrt(gx*gx + gy*gy));
        
        result.data[offset] = mag;
        result.data[offset + 1] = mag;
        result.data[offset + 2] = mag;
      }
    }
    
    return result;
  }
  
  // Use OpenCV if available
  const dst = new opencv.Mat();
  const gray = new opencv.Mat();
  const gradX = new opencv.Mat();
  const gradY = new opencv.Mat();
  
  try {
    // Convert to grayscale if needed
    if (src.channels() > 1) {
      opencv.cvtColor(src, gray, opencv.COLOR_RGBA2GRAY);
    } else {
      src.copyTo(gray);
    }
    
    // Apply Sobel with all required parameters
    opencv.Sobel(gray, gradX, opencv.CV_8U, 1, 0, ksize, 1, 0, opencv.BORDER_DEFAULT);
    opencv.Sobel(gray, gradY, opencv.CV_8U, 0, 1, ksize, 1, 0, opencv.BORDER_DEFAULT);
    
    // Combine gradients
    opencv.addWeighted(gradX, 0.5, gradY, 0.5, 0, dst);
    
    // Free memory
    gray.delete();
    gradX.delete();
    gradY.delete();
    
    return dst;
  } catch (error) {
    dst.delete();
    gray.delete();
    gradX.delete();
    gradY.delete();
    throw new Error(`Sobel transformation failed: ${error}`);
  }
};

// Apply Canny edge detection
export const applyCanny = (src: any, threshold1: number, threshold2: number): any => {
  const opencv = getOpenCV();
  
  // Handle fallback Mat
  if (src.isFallback) {
    const result = createFallbackMat(new ImageData(
      new Uint8ClampedArray(src.data), 
      src.cols, 
      src.rows
    ));
    
    // Convert to grayscale first
    let gray = new Uint8ClampedArray(result.data.length);
    for (let i = 0; i < result.rows; i++) {
      for (let j = 0; j < result.cols; j++) {
        const offset = (i * result.cols + j) * 4;
        const r = result.data[offset];
        const g = result.data[offset + 1];
        const b = result.data[offset + 2];
        // Standard grayscale conversion
        const grayValue = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        gray[offset] = gray[offset + 1] = gray[offset + 2] = grayValue;
        gray[offset + 3] = 255;
      }
    }
    
    // Very simple edge detection as Canny fallback
    // Apply Sobel-like operator and threshold
    for (let i = 1; i < result.rows - 1; i++) {
      for (let j = 1; j < result.cols - 1; j++) {
        const offset = (i * result.cols + j) * 4;
        
        // Simple gradient calculation
        const gx = 
          gray[((i-1) * result.cols + (j+1)) * 4] - gray[((i-1) * result.cols + (j-1)) * 4] +
          2 * gray[(i * result.cols + (j+1)) * 4] - 2 * gray[(i * result.cols + (j-1)) * 4] +
          gray[((i+1) * result.cols + (j+1)) * 4] - gray[((i+1) * result.cols + (j-1)) * 4];
        
        const gy = 
          gray[((i-1) * result.cols + (j-1)) * 4] + 2 * gray[((i-1) * result.cols + j) * 4] + gray[((i-1) * result.cols + (j+1)) * 4] -
          gray[((i+1) * result.cols + (j-1)) * 4] - 2 * gray[((i+1) * result.cols + j) * 4] - gray[((i+1) * result.cols + (j+1)) * 4];
        
        // Gradient magnitude
        const mag = Math.sqrt(gx*gx + gy*gy);
        
        // Simple thresholding (not true Canny, but a reasonable fallback)
        const edge = mag > threshold1 ? 255 : 0;
        
        result.data[offset] = edge;
        result.data[offset + 1] = edge;
        result.data[offset + 2] = edge;
      }
    }
    
    return result;
  }
  
  // Use OpenCV if available
  const dst = new opencv.Mat();
  const gray = new opencv.Mat();
  
  try {
    // Convert to grayscale if needed
    if (src.channels() > 1) {
      opencv.cvtColor(src, gray, opencv.COLOR_RGBA2GRAY);
    } else {
      src.copyTo(gray);
    }
    
    // Apply Canny
    opencv.Canny(gray, dst, threshold1, threshold2);
    
    // Free memory
    gray.delete();
    
    return dst;
  } catch (error) {
    dst.delete();
    gray.delete();
    throw new Error(`Canny transformation failed: ${error}`);
  }
};

// Process an image with a transformation and optionally return intermediate results
export const processImage = async (
  imageData: ImageData,
  transformation: Transformation,
  includeIntermediateResults: boolean = false
): Promise<{
  result: ImageData;
  intermediates?: IntermediateResult[];
  diagnosticInfo?: any;
}> => {
  const intermediates: IntermediateResult[] = [];
  const diagnosticInfo: any = {
    startTime: Date.now(),
    transformationType: transformation.type,
    inputDimensions: { width: imageData.width, height: imageData.height },
    parameters: transformation.parameters,
    steps: []
  };
  
  // Initialize OpenCV if needed
  let initSuccess = true;
  try {
    diagnosticInfo.steps.push({ name: 'opencv_init', startTime: Date.now() });
    await Promise.race([
      initOpenCV(),
      // Add a timeout promise to avoid hanging
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('OpenCV initialization timed out')), 5000)
      )
    ]);
    diagnosticInfo.steps[diagnosticInfo.steps.length - 1].endTime = Date.now();
    diagnosticInfo.steps[diagnosticInfo.steps.length - 1].success = true;
  } catch (error) {
    console.warn('Proceeding with limited OpenCV functionality:', error);
    diagnosticInfo.steps[diagnosticInfo.steps.length - 1].endTime = Date.now();
    diagnosticInfo.steps[diagnosticInfo.steps.length - 1].success = false;
    diagnosticInfo.steps[diagnosticInfo.steps.length - 1].error = error instanceof Error ? error.message : String(error);
    initSuccess = false;
  }
  
  // Create a fallback in case OpenCV processing fails
  const createFallbackImageData = () => {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      const imgData = ctx.createImageData(imageData.width, imageData.height);
      imgData.data.set(imageData.data);
      
      // For fallback, apply a simple grayscale effect
      if (transformation.type === 'grayscale') {
        diagnosticInfo.steps.push({ name: 'fallback_grayscale', startTime: Date.now() });
        for (let i = 0; i < imgData.data.length; i += 4) {
          const avg = (imgData.data[i] + imgData.data[i + 1] + imgData.data[i + 2]) / 3;
          imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] = avg;
        }
        diagnosticInfo.steps[diagnosticInfo.steps.length - 1].endTime = Date.now();
        
        if (includeIntermediateResults) {
          intermediates.push({
            stage: 'fallback_grayscale',
            imageData: new ImageData(
              new Uint8ClampedArray(imgData.data), 
              imgData.width, 
              imgData.height
            ),
            description: 'Fallback JavaScript grayscale (OpenCV unavailable)'
          });
        }
      }
      
      // For edge detection, apply a simple edge detection effect
      if (transformation.type === 'laplacian' || transformation.type === 'sobel' || transformation.type === 'canny') {
        diagnosticInfo.steps.push({ name: 'fallback_edge_detection', startTime: Date.now() });
        
        // First convert to grayscale
        for (let i = 0; i < imgData.data.length; i += 4) {
          const avg = (imgData.data[i] + imgData.data[i + 1] + imgData.data[i + 2]) / 3;
          imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] = avg;
        }
        
        // Create a copy of the grayscale image for edge detection
        const grayData = new Uint8ClampedArray(imgData.data);
        
        // Simple edge detection filter (approximating Laplacian)
        for (let y = 1; y < imgData.height - 1; y++) {
          for (let x = 1; x < imgData.width - 1; x++) {
            const idx = (y * imgData.width + x) * 4;
            
            // Simple 3x3 Laplacian-like kernel
            const center = grayData[idx];
            const top = grayData[idx - (imgData.width * 4)];
            const bottom = grayData[idx + (imgData.width * 4)];
            const left = grayData[idx - 4];
            const right = grayData[idx + 4];
            
            // Apply basic Laplacian filter
            const edge = Math.abs(4 * center - top - bottom - left - right);
            
            // Threshold the result
            imgData.data[idx] = imgData.data[idx + 1] = imgData.data[idx + 2] = 
              edge > 30 ? 255 : 0;
          }
        }
        
        diagnosticInfo.steps[diagnosticInfo.steps.length - 1].endTime = Date.now();
        
        if (includeIntermediateResults) {
          intermediates.push({
            stage: 'fallback_edge_detection',
            imageData: new ImageData(
              new Uint8ClampedArray(imgData.data), 
              imgData.width, 
              imgData.height
            ),
            description: 'Fallback JavaScript edge detection (OpenCV unavailable)'
          });
        }
      }
      
      return imgData;
    }
    return imageData;
  };
  
  // Determine timeout based on image size and complexity
  const calculateTimeout = () => {
    const pixelCount = imageData.width * imageData.height;
    // Use longer timeout for larger images or complex operations
    const baseTimeout = 5000; // 5s base
    const sizeMultiplier = Math.max(1, pixelCount / (640 * 480) * 2); // Adjust for size
    
    // Add extra time for complex operations
    let complexityFactor = 1;
    switch (transformation.type) {
      case 'laplacian':
      case 'canny':
      case 'sobel':
        complexityFactor = 2; // Edge detection is more complex
        break;
      case 'blur':
        const kernelSize = transformation.parameters.find(p => p.name === 'kernelSize')?.value as number || 3;
        complexityFactor = Math.max(1, kernelSize / 10); // Larger kernel = more time
        break;
    }
    
    return Math.min(15000, baseTimeout * sizeMultiplier * complexityFactor); // Cap at 15 seconds
  };
  
  // Calculate appropriate timeout
  const processingTimeout = calculateTimeout();
  
  // Set up processing timeout
  const timeoutPromise = new Promise<{
    result: ImageData;
    intermediates: IntermediateResult[];
    diagnosticInfo: any;
  }>((resolve) => {
    setTimeout(() => {
      // Only log timeout warning if it hasn't been handled yet
      if (!diagnosticInfo.completed) {
        console.warn('Image processing timed out, using fallback');
        diagnosticInfo.timedOut = true;
        diagnosticInfo.success = false;
        diagnosticInfo.error = 'Processing timed out';
        diagnosticInfo.totalTime = Date.now() - diagnosticInfo.startTime;
        resolve({
          result: createFallbackImageData(),
          intermediates,
          diagnosticInfo
        });
      }
    }, processingTimeout);
  });
  
  try {
    // Try to process with OpenCV with timeout protection
    const processingPromise = (async () => {
      if (!initSuccess) {
        throw new Error('OpenCV initialization failed');
      }
      
      // Convert ImageData to cv.Mat
      let src: any = null;
      let result: any = null;
      const opencv = getOpenCV();
      
      try {
        diagnosticInfo.steps.push({ name: 'convert_to_mat', startTime: Date.now() });
        src = imageDataToMat(imageData);
        diagnosticInfo.steps[diagnosticInfo.steps.length - 1].endTime = Date.now();
        diagnosticInfo.steps[diagnosticInfo.steps.length - 1].success = true;
        
        // Apply transformation based on type
        switch (transformation.type) {
          case 'grayscale': {
            diagnosticInfo.steps.push({ name: 'apply_grayscale', startTime: Date.now() });
            result = applyGrayscale(src);
            diagnosticInfo.steps[diagnosticInfo.steps.length - 1].endTime = Date.now();
            diagnosticInfo.steps[diagnosticInfo.steps.length - 1].success = true;
            
            if (includeIntermediateResults) {
              const grayImageData = matToImageData(result);
              intermediates.push({
                stage: 'grayscale',
                imageData: grayImageData,
                description: 'Image converted to grayscale'
              });
            }
            break;
          }
            
          case 'blur': {
            diagnosticInfo.steps.push({ name: 'apply_grayscale', startTime: Date.now() });
            const gray = applyGrayscale(src);
            diagnosticInfo.steps[diagnosticInfo.steps.length - 1].endTime = Date.now();
            
            if (includeIntermediateResults) {
              intermediates.push({
                stage: 'grayscale_pre',
                imageData: matToImageData(gray),
                description: 'Image converted to grayscale'
              });
            }
            
            diagnosticInfo.steps.push({ name: 'apply_blur', startTime: Date.now() });
            const blurSize = transformation.parameters.find(p => p.name === 'kernelSize')?.value as number || 3;
            // Get advanced parameters from metadata if available
            const advancedParams = transformation.metadata?.advancedParameters;
            result = applyBlur(gray, blurSize, advancedParams);
            diagnosticInfo.steps[diagnosticInfo.steps.length - 1].endTime = Date.now();
            
            // Free memory from intermediate step
            gray.delete();
            
            if (includeIntermediateResults) {
              intermediates.push({
                stage: 'blur',
                imageData: matToImageData(result),
                description: `Gaussian blur applied with kernel size ${blurSize}x${blurSize}`
              });
            }
            break;
          }
            
          case 'threshold': {
            diagnosticInfo.steps.push({ name: 'apply_threshold', startTime: Date.now() });
            const thresholdValue = transformation.parameters.find(p => p.name === 'threshold')?.value as number || 128;
            result = applyThreshold(src, thresholdValue);
            diagnosticInfo.steps[diagnosticInfo.steps.length - 1].endTime = Date.now();
            
            if (includeIntermediateResults) {
              intermediates.push({
                stage: 'threshold',
                imageData: matToImageData(result),
                description: `Threshold applied with value ${thresholdValue}`
              });
            }
            break;
          }
            
          case 'laplacian': {
            // Perform step-by-step Laplacian edge detection to show intermediate results
            diagnosticInfo.steps.push({ name: 'apply_grayscale', startTime: Date.now() });
            const gray = applyGrayscale(src);
            diagnosticInfo.steps[diagnosticInfo.steps.length - 1].endTime = Date.now();
            
            if (includeIntermediateResults) {
              intermediates.push({
                stage: 'grayscale',
                imageData: matToImageData(gray),
                description: 'Image converted to grayscale'
              });
            }
            
            diagnosticInfo.steps.push({ name: 'apply_blur', startTime: Date.now() });
            let blurred;
            
            // Check if we have real OpenCV or fallback
            if (gray.isFallback) {
              // Use our own blur implementation for fallback
              blurred = applyBlur(gray, 3);
            } else {
              // Use real OpenCV
              blurred = new opencv.Mat();
              const ksize_blur = new opencv.Size(3, 3);
              opencv.GaussianBlur(gray, blurred, ksize_blur, 0, 0, opencv.BORDER_DEFAULT);
            }
            diagnosticInfo.steps[diagnosticInfo.steps.length - 1].endTime = Date.now();
            
            if (includeIntermediateResults) {
              intermediates.push({
                stage: 'blur',
                imageData: matToImageData(blurred),
                description: 'Gaussian blur applied to reduce noise'
              });
            }
            
            diagnosticInfo.steps.push({ name: 'apply_laplacian', startTime: Date.now() });
            const laplacianSize = transformation.parameters.find(p => p.name === 'kernelSize')?.value as number || 3;
            
            // Check if we have real OpenCV or fallback
            if (blurred.isFallback) {
              // Use our own Laplacian implementation for fallback
              result = applyLaplacian(blurred, laplacianSize);
            } else {
              // Use real OpenCV
              result = new opencv.Mat();
              opencv.Laplacian(blurred, result, opencv.CV_8U, laplacianSize, 1, 0, opencv.BORDER_DEFAULT);
            }
            diagnosticInfo.steps[diagnosticInfo.steps.length - 1].endTime = Date.now();
            
            // Free memory from intermediate steps
            if (!gray.isFallback && typeof gray.delete === 'function') {
              gray.delete();
            }
            if (!blurred.isFallback && typeof blurred.delete === 'function') {
              blurred.delete();
            }
            
            if (includeIntermediateResults) {
              intermediates.push({
                stage: 'laplacian',
                imageData: matToImageData(result),
                description: `Laplacian edge detection with kernel size ${laplacianSize}`
              });
            }
            break;
          }
            
          case 'sobel': {
            diagnosticInfo.steps.push({ name: 'apply_sobel', startTime: Date.now() });
            const sobelSize = transformation.parameters.find(p => p.name === 'kernelSize')?.value as number || 3;
            result = applySobel(src, sobelSize);
            diagnosticInfo.steps[diagnosticInfo.steps.length - 1].endTime = Date.now();
            
            if (includeIntermediateResults) {
              intermediates.push({
                stage: 'sobel',
                imageData: matToImageData(result),
                description: `Sobel edge detection with kernel size ${sobelSize}`
              });
            }
            break;
          }
            
          case 'canny': {
            diagnosticInfo.steps.push({ name: 'apply_canny', startTime: Date.now() });
            const threshold1 = transformation.parameters.find(p => p.name === 'threshold1')?.value as number || 50;
            const threshold2 = transformation.parameters.find(p => p.name === 'threshold2')?.value as number || 150;
            result = applyCanny(src, threshold1, threshold2);
            diagnosticInfo.steps[diagnosticInfo.steps.length - 1].endTime = Date.now();
            
            if (includeIntermediateResults) {
              intermediates.push({
                stage: 'canny',
                imageData: matToImageData(result),
                description: `Canny edge detection with thresholds ${threshold1} and ${threshold2}`
              });
            }
            break;
          }
            
          default: {
            // For custom or unsupported transformations, return the original image
            if (src) {
              result = src.clone();
            } else {
              // Handle the case where src might be null
              throw new Error('Source image is null or undefined');
            }
          }
        }
        
        // Convert result back to ImageData
        diagnosticInfo.steps.push({ name: 'convert_to_imagedata', startTime: Date.now() });
        const outputImageData = matToImageData(result);
        diagnosticInfo.steps[diagnosticInfo.steps.length - 1].endTime = Date.now();
        
        // Calculate total processing time
        diagnosticInfo.totalTime = Date.now() - diagnosticInfo.startTime;
        diagnosticInfo.success = true;
        diagnosticInfo.completed = true;
        
        // Free memory
        if (src && typeof src.delete === 'function') {
          src.delete();
        }
        if (result && typeof result.delete === 'function') {
          result.delete();
        }
        
        return {
          result: outputImageData,
          intermediates,
          diagnosticInfo
        };
      } catch (error) {
        // Free memory in case of error
        if (src && typeof src.delete === 'function') {
          src.delete();
        }
        if (result && typeof result.delete === 'function') {
          result.delete();
        }
        
        // Record the error in diagnostics
        diagnosticInfo.error = error instanceof Error ? error.message : String(error);
        diagnosticInfo.success = false;
        diagnosticInfo.completed = true;
        
        throw error;
      }
    })();
    
    // Race between processing and timeout
    return Promise.race([processingPromise, timeoutPromise]);
    
  } catch (error) {
    console.error('Error during image processing, using fallback:', error);
    
    return {
      result: createFallbackImageData(),
      intermediates,
      diagnosticInfo: { 
        ...diagnosticInfo,
        error: error instanceof Error ? error.message : String(error),
        success: false,
        completed: true,
        totalTime: Date.now() - diagnosticInfo.startTime
      }
    };
  }
}; 