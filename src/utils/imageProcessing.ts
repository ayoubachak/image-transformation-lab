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
  try {
    const cv = getOpenCV();
    if (!cv) throw new Error('OpenCV not available');
    
    // Log debugging information for kernel size and advanced parameters
    console.log(`Applying blur with kernel size: ${ksize}`, {
      kernelType: advancedParams?.kernelType,
      useCustomKernel: advancedParams?.useCustomKernel,
      hasCustomKernel: advancedParams?.customKernel ? 'yes' : 'no',
      sigmaX: advancedParams?.sigmaX,
      sigmaY: advancedParams?.sigmaY,
      borderType: advancedParams?.borderType
    });
    
    // Create output matrix
    const dst = new cv.Mat();
    
    // Get border type constant
    let borderType = cv.BORDER_DEFAULT;
    if (advancedParams?.borderType) {
      switch (advancedParams.borderType) {
        case 'constant': borderType = cv.BORDER_CONSTANT; break;
        case 'replicate': borderType = cv.BORDER_REPLICATE; break;
        case 'reflect': borderType = cv.BORDER_REFLECT; break;
        case 'wrap': borderType = cv.BORDER_WRAP; break;
        default: borderType = cv.BORDER_DEFAULT;
      }
    }
    
    // Check if we're using a custom kernel
    if (advancedParams?.useCustomKernel && advancedParams?.customKernel) {
      // Create custom kernel matrix
      let kernel;
      
      // Handle different formats of custom kernel data
      if (Array.isArray(advancedParams.customKernel)) {
        // Handle 1D array (3x3 flattened)
        const size = Math.sqrt(advancedParams.customKernel.length);
        kernel = cv.matFromArray(size, size, cv.CV_32FC1, advancedParams.customKernel);
      } else if (advancedParams.customKernel.values) {
        // Handle kernel value object with width, height, values
        const { width, height, values } = advancedParams.customKernel;
        // Flatten 2D array to 1D
        const flatValues = values.flat();
        kernel = cv.matFromArray(height, width, cv.CV_32FC1, flatValues);
      } else {
        throw new Error('Invalid custom kernel format');
      }
      
      // Apply custom kernel filter
      cv.filter2D(src, dst, -1, kernel, new cv.Point(-1, -1), 0, borderType);
      
      // Clean up kernel matrix
      kernel.delete();
    } 
    // If the kernel type is 'custom', we should use a provided custom kernel directly
    else if (advancedParams?.kernelType === 'custom' && advancedParams?.customKernel) {
      // Create custom kernel matrix
      let kernel;
      
      // Handle different formats of custom kernel data
      if (Array.isArray(advancedParams.customKernel)) {
        // Handle 1D array (3x3 flattened)
        const size = Math.sqrt(advancedParams.customKernel.length);
        kernel = cv.matFromArray(size, size, cv.CV_32FC1, advancedParams.customKernel);
      } else if (advancedParams.customKernel.values) {
        // Handle kernel value object with width, height, values
        const { width, height, values } = advancedParams.customKernel;
        // Flatten 2D array to 1D
        const flatValues = values.flat();
        kernel = cv.matFromArray(height, width, cv.CV_32FC1, flatValues);
      } else {
        throw new Error('Invalid custom kernel format');
      }
      
      // Apply custom kernel filter
      cv.filter2D(src, dst, -1, kernel, new cv.Point(-1, -1), 0, borderType);
      
      // Clean up kernel matrix
      kernel.delete();
    }
    // Use specific kernel types
    else if (advancedParams?.kernelType === 'box') {
      // Box blur uses a simple averaging kernel
      const kernelSize = new cv.Size(ksize, ksize);
      cv.boxFilter(src, dst, -1, kernelSize, new cv.Point(-1, -1), true, borderType);
    }
    // Default to Gaussian blur with optional sigma parameters
    else {
      // Create kernel size
      const kernelSize = new cv.Size(ksize, ksize);
      
      // Get sigma values
      const sigmaX = advancedParams?.sigmaX !== undefined ? advancedParams.sigmaX : 0;
      const sigmaY = advancedParams?.sigmaY !== undefined ? advancedParams.sigmaY : 0;
      
      // Apply Gaussian blur
      cv.GaussianBlur(src, dst, kernelSize, sigmaX, sigmaY, borderType);
    }
    
    // Return result
    return dst;
    
  } catch (error) {
    console.error('Error in applyBlur:', error);
    throw error;
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
        const kernelSize = transformation.parameters?.find(p => p.name === 'kernelSize')?.value as number || 3;
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
            const blurSize = transformation.parameters?.find(p => p.name === 'kernelSize')?.value as number || 3;
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
            const thresholdValue = transformation.parameters?.find(p => p.name === 'threshold')?.value as number || 128;
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
            const laplacianSize = transformation.parameters?.find(p => p.name === 'kernelSize')?.value as number || 3;
            
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
            const sobelSize = transformation.parameters?.find(p => p.name === 'kernelSize')?.value as number || 3;
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
            const threshold1 = transformation.parameters?.find(p => p.name === 'threshold1')?.value as number || 50;
            const threshold2 = transformation.parameters?.find(p => p.name === 'threshold2')?.value as number || 150;
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
            
          case 'customBlur': {
            diagnosticInfo.steps.push({ name: 'apply_custom_blur', startTime: Date.now() });
            const kernelType = transformation.parameters?.find(p => p.name === 'kernelType')?.value as string;
            const kernelSize = transformation.parameters?.find(p => p.name === 'kernelSize')?.value as number || 3;
            const customKernel = transformation.parameters?.find(p => p.name === 'customKernel')?.value as any;
            
            // Set up advanced parameters
            const advancedParams: Record<string, any> = {
              ...(transformation.metadata?.advancedParameters || {}),
              kernelType: kernelType
            };
            
            // If it's custom kernel type, pass the custom kernel parameter
            if (kernelType === 'custom' && customKernel) {
              advancedParams.useCustomKernel = true;
              advancedParams.customKernel = customKernel;
            }
            // Or if it's configured to use a custom kernel override
            else if (advancedParams.useCustomKernel && advancedParams.customKernel) {
              // Make sure we keep the custom kernel data
            }
            
            // Apply blur with properly configured options
            result = applyBlur(src, kernelSize, advancedParams);
            diagnosticInfo.steps[diagnosticInfo.steps.length - 1].endTime = Date.now();
            
            if (includeIntermediateResults) {
              intermediates.push({
                stage: 'customBlur',
                imageData: matToImageData(result),
                description: `Custom blur with ${kernelType} kernel (size: ${kernelSize})`
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

// Define a fallback function for when OpenCV isn't available
function applyTransformationWithoutOpenCV(
  transformation: Transformation,
  inputCanvas: HTMLCanvasElement
): { canvas: HTMLCanvasElement | null; intermediates: IntermediateResult[] } {
  // Create a new canvas for output
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = inputCanvas.width;
  outputCanvas.height = inputCanvas.height;
  const ctx = outputCanvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }
  
  // Draw the input image to the output canvas
  ctx.drawImage(inputCanvas, 0, 0);
  
  // Apply basic transformations using canvas API
  switch (transformation.type) {
    case 'grayscale':
      // Apply grayscale using canvas API
      const imageData = ctx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = avg;     // R
        data[i + 1] = avg; // G
        data[i + 2] = avg; // B
      }
      
      ctx.putImageData(imageData, 0, 0);
      break;
      
    case 'threshold':
      // Apply threshold using canvas API
      const thresholdValue = transformation.parameters?.find(p => p.name === 'threshold')?.value as number || 128;
      const thresholdImageData = ctx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
      const thresholdData = thresholdImageData.data;
      
      for (let i = 0; i < thresholdData.length; i += 4) {
        const avg = (thresholdData[i] + thresholdData[i + 1] + thresholdData[i + 2]) / 3;
        const val = avg > thresholdValue ? 255 : 0;
        thresholdData[i] = val;     // R
        thresholdData[i + 1] = val; // G
        thresholdData[i + 2] = val; // B
      }
      
      ctx.putImageData(thresholdImageData, 0, 0);
      break;
      
    // For other transformations, we'll just return the original image
    // with a message that OpenCV is required
    default:
      // Draw a message on the canvas
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
      
      ctx.font = '16px sans-serif';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.fillText('OpenCV is required for this transformation.', outputCanvas.width / 2, outputCanvas.height / 2);
      break;
  }
  
  return { canvas: outputCanvas, intermediates: [] };
}

// Fix the custom blur handler function to avoid normalize variable issue
function handleCustomBlur(
  cv: any,
  src: any,
  dst: any,
  transformation: Transformation,
  intermediates: IntermediateResult[]
) {
  const kernelType = transformation.parameters?.find(p => p.name === 'kernelType')?.value as string || 'gaussian';
  const borderType = transformation.parameters?.find(p => p.name === 'borderType')?.value as string || 'reflect';
  
  // Map border type string to OpenCV border code
  let borderMode: number;
  switch (borderType) {
    case 'constant': borderMode = cv.BORDER_CONSTANT; break;
    case 'reflect': borderMode = cv.BORDER_REFLECT; break;
    case 'replicate': borderMode = cv.BORDER_REPLICATE; break;
    case 'wrap': borderMode = cv.BORDER_WRAP; break;
    default: borderMode = cv.BORDER_REFLECT;
  }
  
  if (kernelType === 'custom') {
    // Use custom kernel
    const kernelParam = transformation.parameters?.find(p => p.name === 'customKernel')?.value as any;
    
    if (kernelParam && kernelParam.values && kernelParam.width && kernelParam.height) {
      // Create kernel from values
      const kernelWidth = kernelParam.width;
      const kernelHeight = kernelParam.height;
      const kernelValues = kernelParam.values;
      const shouldNormalize = kernelParam.normalize !== false; // Default to true if not specified
      
      // Create kernel Mat
      const kernel = cv.matFromArray(kernelHeight, kernelWidth, cv.CV_32FC1, 
        kernelValues.flat());
      
      // Apply filter2D (convolution)
      cv.filter2D(src, dst, -1, kernel, new cv.Point(-1, -1), 0, borderMode);
      
      // Clean up
      kernel.delete();
    } else {
      // Fallback to box filter if custom kernel is invalid
      const boxKernelSize = new cv.Size(3, 3);
      const shouldNormalize = true; // Default for box filter
      cv.boxFilter(src, dst, -1, boxKernelSize, new cv.Point(-1, -1), shouldNormalize, borderMode);
    }
  } else if (kernelType === 'gaussian') {
    // Use Gaussian blur
    const kernelSize = transformation.parameters?.find(p => p.name === 'kernelSize')?.value as number || 3;
    const sigmaX = transformation.parameters?.find(p => p.name === 'sigmaX')?.value as number || 0;
    const sigmaY = transformation.parameters?.find(p => p.name === 'sigmaY')?.value as number || 0;
    
    const gaussKernelSize = new cv.Size(kernelSize, kernelSize);
    cv.GaussianBlur(src, dst, gaussKernelSize, sigmaX, sigmaY, borderMode);
  } else {
    // Use box blur
    const kernelSize = transformation.parameters?.find(p => p.name === 'kernelSize')?.value as number || 3;
    const boxSize = new cv.Size(kernelSize, kernelSize);
    cv.boxFilter(src, dst, -1, boxSize, new cv.Point(-1, -1), true, borderMode);
  }
}

// Rename duplicate ksize variable in applyTransformation function
export function applyTransformation(
  transformation: Transformation,
  inputCanvas: HTMLCanvasElement | null,
  cv: any
): { canvas: HTMLCanvasElement | null; intermediates: IntermediateResult[] } {
  if (!inputCanvas) return { canvas: null, intermediates: [] };
  
  const intermediates: IntermediateResult[] = [];
  let outputCanvas = document.createElement('canvas');
  outputCanvas.width = inputCanvas.width;
  outputCanvas.height = inputCanvas.height;
  
  try {
    // Get parameters for the transformation
    const params = transformation.parameters || [];
    const paramMap: Record<string, any> = {};
    params.forEach(p => paramMap[p.name] = p.value);
    
    // Get image data from input canvas
    const ctx = inputCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Could not get 2D context');
    const imgData = ctx.getImageData(0, 0, inputCanvas.width, inputCanvas.height);
    
    // Convert to OpenCV matrix
    const src = imageDataToMat(imgData);
    let dst: any;
    
    // Apply the transformation based on type
    switch (transformation.type) {
      case 'grayscale':
        dst = applyGrayscale(src);
        break;
        
      case 'blur':
        const blurKernelSize = paramMap.kernelSize as number;
        // Pass advanced parameters from metadata if available
        dst = applyBlur(src, blurKernelSize, transformation.metadata?.advancedParameters);
        break;
        
      case 'customBlur': {
        const kernelType = paramMap.kernelType as string;
        const kernelSize = paramMap.kernelSize as number || 3;
        const customKernel = paramMap.customKernel;
        
        // Set up advanced parameters
        const advancedParams: Record<string, any> = {
          ...(transformation.metadata?.advancedParameters || {}),
          kernelType: kernelType
        };
        
        // If it's custom kernel type, pass the custom kernel parameter
        if (kernelType === 'custom' && customKernel) {
          advancedParams.useCustomKernel = true;
          advancedParams.customKernel = customKernel;
        }
        // Or if it's configured to use a custom kernel override
        else if (advancedParams.useCustomKernel && advancedParams.customKernel) {
          // Make sure we keep the custom kernel data
        }
        
        // Apply blur with properly configured options
        dst = applyBlur(src, kernelSize, advancedParams);
        break;
      }
        
      case 'threshold':
        const thresholdValue = paramMap.threshold as number;
        dst = applyThreshold(src, thresholdValue);
        break;
        
      case 'laplacian':
        const laplaceKernelSize = paramMap.kernelSize as number;
        dst = applyLaplacian(src, laplaceKernelSize);
        break;
        
      case 'sobel':
        const sobelKernelSize = paramMap.kernelSize as number;
        dst = applySobel(src, sobelKernelSize);
        break;
        
      case 'canny':
        const threshold1 = paramMap.threshold1 as number;
        const threshold2 = paramMap.threshold2 as number;
        dst = applyCanny(src, threshold1, threshold2);
        break;
        
      default:
        throw new Error(`Transformation type ${transformation.type} not implemented`);
    }
    
    // Convert result back to canvas
    const outputCtx = outputCanvas.getContext('2d', { willReadFrequently: true });
    if (!outputCtx) throw new Error('Could not get 2D context for output');
    
    // Convert the OpenCV matrix to ImageData and draw it on the output canvas
    if (dst) {
      const imgData = matToImageData(dst);
      outputCtx.putImageData(imgData, 0, 0);
      
      // Clean up OpenCV matrices
      src.delete();
      dst.delete();
    } else {
      throw new Error('Transformation did not produce a result');
    }
    
    return { canvas: outputCanvas, intermediates };
    
  } catch (error) {
    console.error('Error in applyTransformation:', error);
    return { canvas: null, intermediates: [] };
  }
}

// Helper function to adjust an image channel for color adjustments
function adjustChannel(channel: any, adjustment: number, maxValue: number, cv: any) {
  const factor = adjustment / 100;
  
  if (factor > 0) {
    // Increase value (make brighter)
    cv.addWeighted(channel, 1, channel, 0, maxValue * factor, channel);
  } else if (factor < 0) {
    // Decrease value (make darker)
    cv.addWeighted(channel, 1 + factor, channel, 0, 0, channel);
  }
} 