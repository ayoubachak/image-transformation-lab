// Import OpenCV
import cv from 'opencv-ts';
import type { Transformation } from './types';
import { createStructuringElementMat } from './morphologyUtils';

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
      customKernelData: advancedParams?.customKernelData ? 'available' : 'not available',
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
      console.log('Using custom kernel:', advancedParams.customKernel);
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
        console.log(`Creating kernel matrix: ${width}x${height}, values:`, flatValues);
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
    else if (advancedParams?.kernelType === 'custom') {
      let kernel;
      let customKernelData = null;
      
      // First try to get from customKernel parameter
      if (advancedParams.customKernel && advancedParams.customKernel.values) {
        customKernelData = advancedParams.customKernel;
        console.log('Using customKernel parameter for custom kernel');
      } 
      // Then try to get from customKernelData in advanced parameters
      else if (advancedParams.customKernelData && advancedParams.customKernelData.values) {
        customKernelData = advancedParams.customKernelData;
        console.log('Using customKernelData from advanced parameters for custom kernel');
      }
      
      if (customKernelData) {
        const { width, height, values } = customKernelData;
        // Flatten 2D array to 1D
        const flatValues = values.flat();
        console.log(`Creating kernel matrix: ${width}x${height}, values:`, flatValues);
        kernel = cv.matFromArray(height, width, cv.CV_32FC1, flatValues);
      
      // Apply custom kernel filter
      cv.filter2D(src, dst, -1, kernel, new cv.Point(-1, -1), 0, borderType);
      
      // Clean up kernel matrix
      kernel.delete();
      } else {
        console.warn('No valid custom kernel data found, falling back to box blur');
        // Fallback to box blur
        const boxSize = new cv.Size(ksize, ksize);
        cv.boxFilter(src, dst, -1, boxSize, new cv.Point(-1, -1), true, borderType);
      }
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
  const timeoutPromise = new Promise<any>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Processing timed out after ${processingTimeout}ms`));
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
      let dst: any = null;
      let result: any = null;
      const opencv = getOpenCV();
      
      try {
        diagnosticInfo.steps.push({ name: 'convert_to_mat', startTime: Date.now() });
        src = imageDataToMat(imageData);
        diagnosticInfo.steps[diagnosticInfo.steps.length - 1].endTime = Date.now();
        diagnosticInfo.steps[diagnosticInfo.steps.length - 1].success = true;
        
        // Apply transformation based on type
        switch (transformation.type) {
          case 'grayscale':
            dst = applyGrayscale(src);
            break;
            
          case 'blur':
            const blurKernelSize = transformation.parameters?.find(p => p.name === 'kernelSize')?.value as number;
            // Pass advanced parameters from metadata if available
            dst = applyBlur(src, blurKernelSize, transformation.metadata?.advancedParameters);
            break;
            
          case 'customBlur': {
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
              console.log('Using custom kernel in processing:', customKernel);
              advancedParams.useCustomKernel = true;
              advancedParams.customKernel = customKernel;
            }
            // Or if it's configured to use a custom kernel override from advanced parameters
            else if (advancedParams.customKernelData) {
              console.log('Using custom kernel data from advanced parameters:', advancedParams.customKernelData);
              advancedParams.useCustomKernel = true;
              advancedParams.customKernel = advancedParams.customKernelData;
            }
            
            // Apply blur with properly configured options
            dst = applyBlur(src, kernelSize, advancedParams);
            break;
          }
            
          case 'threshold':
            const thresholdValue = transformation.parameters?.find(p => p.name === 'threshold')?.value as number;
            dst = applyThreshold(src, thresholdValue);
            break;
            
          case 'laplacian':
            const laplaceKernelSize = transformation.parameters?.find(p => p.name === 'kernelSize')?.value as number;
            dst = applyLaplacian(src, laplaceKernelSize);
            break;
            
          case 'sobel':
            const sobelKernelSize = transformation.parameters?.find(p => p.name === 'kernelSize')?.value as number;
            dst = applySobel(src, sobelKernelSize);
            break;
            
          case 'canny':
            const threshold1 = transformation.parameters?.find(p => p.name === 'threshold1')?.value as number;
            const threshold2 = transformation.parameters?.find(p => p.name === 'threshold2')?.value as number;
            dst = applyCanny(src, threshold1, threshold2);
            break;
            
          case 'dilate':
            const dilateKernelSizeParam = transformation.parameters.find(p => p.name === 'kernelSize');
            const dilateKernelSize = dilateKernelSizeParam ? dilateKernelSizeParam.value as number : 3;
            
            const dilateIterationsParam = transformation.parameters.find(p => p.name === 'iterations');
            const dilateIterations = dilateIterationsParam ? dilateIterationsParam.value as number : 1;
            
            // Get advanced parameters
            const dilateAdvancedParams = transformation.metadata?.advancedParameters || {};
            
            // Apply dilation
            dst = applyDilate(src, dilateKernelSize, dilateIterations, dilateAdvancedParams);
            
              intermediates.push({
              stage: 'dilate',
              imageData: matToImageData(dst),
              description: `Dilated with ${dilateKernelSize}×${dilateKernelSize} kernel, iterations: ${dilateIterations}`
            });
            break;
            
          case 'erode':
            const erodeKernelSizeParam = transformation.parameters.find(p => p.name === 'kernelSize');
            const erodeKernelSize = erodeKernelSizeParam ? erodeKernelSizeParam.value as number : 3;
            
            const erodeIterationsParam = transformation.parameters.find(p => p.name === 'iterations');
            const erodeIterations = erodeIterationsParam ? erodeIterationsParam.value as number : 1;
            
            // Get advanced parameters
            const erodeAdvancedParams = transformation.metadata?.advancedParameters || {};
            
            // Apply erosion
            dst = applyErode(src, erodeKernelSize, erodeIterations, erodeAdvancedParams);
            
              intermediates.push({
              stage: 'erode',
              imageData: matToImageData(dst),
              description: `Eroded with ${erodeKernelSize}×${erodeKernelSize} kernel, iterations: ${erodeIterations}`
            });
            break;
            
          case 'morphology':
            const morphologyOperationParam = transformation.parameters.find(p => p.name === 'operation');
            const morphologyOperation = morphologyOperationParam ? morphologyOperationParam.value as string : 'open';
            
            const morphologyKernelSizeParam = transformation.parameters.find(p => p.name === 'kernelSize');
            const morphologyKernelSize = morphologyKernelSizeParam ? morphologyKernelSizeParam.value as number : 5;
            
            const morphologyIterationsParam = transformation.parameters.find(p => p.name === 'iterations');
            const morphologyIterations = morphologyIterationsParam ? morphologyIterationsParam.value as number : 1;
            
            // Get advanced parameters
            const morphologyAdvancedParams = transformation.metadata?.advancedParameters || {};
            
            // Apply morphological operation
            dst = applyMorphology(src, morphologyOperation, morphologyKernelSize, morphologyIterations, morphologyAdvancedParams);
            
            intermediates.push({
              stage: 'morphology',
              imageData: matToImageData(dst),
              description: `Applied ${morphologyOperation} with ${morphologyKernelSize}×${morphologyKernelSize} kernel, iterations: ${morphologyIterations}`
            });
            break;
            
          case 'rotate':
            const angle = transformation.parameters?.find(p => p.name === 'angle')?.value as number || 0;
            const scale = transformation.parameters?.find(p => p.name === 'scale')?.value as number || 1.0;
            const borderMode = transformation.parameters?.find(p => p.name === 'borderMode')?.value as string || 'constant';
            dst = applyRotate(src, angle, scale, borderMode);
            break;
            
          case 'resize':
            const method = transformation.parameters?.find(p => p.name === 'method')?.value as string || 'scale';
            const scaleX = transformation.parameters?.find(p => p.name === 'scaleX')?.value as number || 100;
            const scaleY = transformation.parameters?.find(p => p.name === 'scaleY')?.value as number || 100;
            const resizeWidth = transformation.parameters?.find(p => p.name === 'width')?.value as number || 320;
            const resizeHeight = transformation.parameters?.find(p => p.name === 'height')?.value as number || 240;
            const interpolation = transformation.parameters?.find(p => p.name === 'interpolation')?.value as string || 'linear';
            dst = applyResize(src, method, scaleX, scaleY, resizeWidth, resizeHeight, interpolation);
            break;
            
          case 'flip':
            const direction = transformation.parameters?.find(p => p.name === 'direction')?.value as string || 'horizontal';
            dst = applyFlip(src, direction);
            break;
            
          case 'crop':
            const cropMethod = transformation.parameters?.find(p => p.name === 'method')?.value as string || 'manual';
            const cropX = transformation.parameters?.find(p => p.name === 'x')?.value as number || 0;
            const cropY = transformation.parameters?.find(p => p.name === 'y')?.value as number || 0;
            const cropWidth = transformation.parameters?.find(p => p.name === 'width')?.value as number || 320;
            const cropHeight = transformation.parameters?.find(p => p.name === 'height')?.value as number || 240;
            const aspectRatio = transformation.parameters?.find(p => p.name === 'aspectRatio')?.value as string || 'free';
            dst = applyCrop(src, cropMethod, cropX, cropY, cropWidth, cropHeight, aspectRatio);
            break;
            
          default:
            throw new Error(`Transformation type ${transformation.type} not implemented`);
        }
        
        // Convert result back to ImageData
        diagnosticInfo.steps.push({ name: 'convert_to_imagedata', startTime: Date.now() });
        const outputImageData = matToImageData(dst);
        diagnosticInfo.steps[diagnosticInfo.steps.length - 1].endTime = Date.now();
        
        // Calculate total processing time
        diagnosticInfo.totalTime = Date.now() - diagnosticInfo.startTime;
        diagnosticInfo.success = true;
        diagnosticInfo.completed = true;
        
        // Free memory
        if (src && typeof src.delete === 'function') {
          src.delete();
        }
        if (dst && typeof dst.delete === 'function') {
          dst.delete();
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
        if (dst && typeof dst.delete === 'function') {
          dst.delete();
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
      
    case 'flip':
      // Apply flip using canvas API - this is one we can implement without OpenCV
      const direction = transformation.parameters?.find(p => p.name === 'direction')?.value as string || 'horizontal';
      const width = outputCanvas.width;
      const height = outputCanvas.height;
      
      // Create a temporary canvas to hold the original image
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) break;
      
      // Copy the current image to temp canvas
      tempCtx.drawImage(outputCanvas, 0, 0);
      
      // Clear the output canvas
      ctx.clearRect(0, 0, width, height);
      
      // Apply flip transformation
      if (direction === 'horizontal') {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
      } else if (direction === 'vertical') {
        ctx.translate(0, height);
        ctx.scale(1, -1);
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
      } else if (direction === 'both') {
        ctx.translate(width, height);
        ctx.scale(-1, -1);
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
      }
      break;
      
    case 'rotate':
      // Apply rotation using canvas API
      const angle = transformation.parameters?.find(p => p.name === 'angle')?.value as number || 0;
      const scale = transformation.parameters?.find(p => p.name === 'scale')?.value as number || 1.0;
      
      // Create a temporary canvas to hold the original image
      const rotTempCanvas = document.createElement('canvas');
      rotTempCanvas.width = outputCanvas.width;
      rotTempCanvas.height = outputCanvas.height;
      const rotTempCtx = rotTempCanvas.getContext('2d');
      if (!rotTempCtx) break;
      
      // Copy the current image to temp canvas
      rotTempCtx.drawImage(outputCanvas, 0, 0);
      
      // Clear the output canvas
      ctx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
      
      // Set the transform for rotation and scaling
      ctx.translate(outputCanvas.width / 2, outputCanvas.height / 2);
      ctx.rotate(angle * Math.PI / 180);
      ctx.scale(scale, scale);
      ctx.translate(-outputCanvas.width / 2, -outputCanvas.height / 2);
      
      // Draw the image with the new transform
      ctx.drawImage(rotTempCanvas, 0, 0);
      
      // Reset transform
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      break;
      
    case 'resize':
      // We can do a basic resize with the canvas API
      const resizeMethod = transformation.parameters?.find(p => p.name === 'method')?.value as string || 'scale';
      const scaleX = transformation.parameters?.find(p => p.name === 'scaleX')?.value as number || 100;
      const scaleY = transformation.parameters?.find(p => p.name === 'scaleY')?.value as number || 100;
      const targetWidth = transformation.parameters?.find(p => p.name === 'width')?.value as number || 320;
      const targetHeight = transformation.parameters?.find(p => p.name === 'height')?.value as number || 240;
      
      // Create a temporary canvas
      const resTempCanvas = document.createElement('canvas');
      resTempCanvas.width = outputCanvas.width;
      resTempCanvas.height = outputCanvas.height;
      const resTempCtx = resTempCanvas.getContext('2d');
      if (!resTempCtx) break;
      
      // Copy the current image to temp canvas
      resTempCtx.drawImage(outputCanvas, 0, 0);
      
      // Calculate new dimensions
      let newWidth, newHeight;
      if (resizeMethod === 'scale') {
        newWidth = Math.round(outputCanvas.width * scaleX / 100);
        newHeight = Math.round(outputCanvas.height * scaleY / 100);
      } else {
        newWidth = targetWidth;
        newHeight = targetHeight;
      }
      
      // Resize canvas to new dimensions
      outputCanvas.width = newWidth;
      outputCanvas.height = newHeight;
      
      // Re-get context (it gets lost when canvas is resized)
      const newCtx = outputCanvas.getContext('2d');
      if (!newCtx) break;
      
      // Draw resized image
      newCtx.drawImage(resTempCanvas, 0, 0, resTempCanvas.width, resTempCanvas.height, 0, 0, newWidth, newHeight);
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
          console.log('Using custom kernel in processing:', customKernel);
          advancedParams.useCustomKernel = true;
          advancedParams.customKernel = customKernel;
        }
        // Or if it's configured to use a custom kernel override from advanced parameters
        else if (advancedParams.customKernelData) {
          console.log('Using custom kernel data from advanced parameters:', advancedParams.customKernelData);
          advancedParams.useCustomKernel = true;
          advancedParams.customKernel = advancedParams.customKernelData;
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
        
      case 'dilate':
        const dilateKernelSizeParam = transformation.parameters.find(p => p.name === 'kernelSize');
        const dilateKernelSize = dilateKernelSizeParam ? dilateKernelSizeParam.value as number : 3;
        
        const dilateIterationsParam = transformation.parameters.find(p => p.name === 'iterations');
        const dilateIterations = dilateIterationsParam ? dilateIterationsParam.value as number : 1;
        
        // Get advanced parameters
        const dilateAdvancedParams = transformation.metadata?.advancedParameters || {};
        
        // Apply dilation
        dst = applyDilate(src, dilateKernelSize, dilateIterations, dilateAdvancedParams);
        
        intermediates.push({
          stage: 'dilate',
          imageData: matToImageData(dst),
          description: `Dilated with ${dilateKernelSize}×${dilateKernelSize} kernel, iterations: ${dilateIterations}`
        });
        break;
        
      case 'erode':
        const erodeKernelSizeParam = transformation.parameters.find(p => p.name === 'kernelSize');
        const erodeKernelSize = erodeKernelSizeParam ? erodeKernelSizeParam.value as number : 3;
        
        const erodeIterationsParam = transformation.parameters.find(p => p.name === 'iterations');
        const erodeIterations = erodeIterationsParam ? erodeIterationsParam.value as number : 1;
        
        // Get advanced parameters
        const erodeAdvancedParams = transformation.metadata?.advancedParameters || {};
        
        // Apply erosion
        dst = applyErode(src, erodeKernelSize, erodeIterations, erodeAdvancedParams);
        
        intermediates.push({
          stage: 'erode',
          imageData: matToImageData(dst),
          description: `Eroded with ${erodeKernelSize}×${erodeKernelSize} kernel, iterations: ${erodeIterations}`
        });
        break;
        
      case 'morphology':
        const morphologyOperationParam = transformation.parameters.find(p => p.name === 'operation');
        const morphologyOperation = morphologyOperationParam ? morphologyOperationParam.value as string : 'open';
        
        const morphologyKernelSizeParam = transformation.parameters.find(p => p.name === 'kernelSize');
        const morphologyKernelSize = morphologyKernelSizeParam ? morphologyKernelSizeParam.value as number : 5;
        
        const morphologyIterationsParam = transformation.parameters.find(p => p.name === 'iterations');
        const morphologyIterations = morphologyIterationsParam ? morphologyIterationsParam.value as number : 1;
        
        // Get advanced parameters
        const morphologyAdvancedParams = transformation.metadata?.advancedParameters || {};
        
        // Apply morphological operation
        dst = applyMorphology(src, morphologyOperation, morphologyKernelSize, morphologyIterations, morphologyAdvancedParams);
        
        intermediates.push({
          stage: 'morphology',
          imageData: matToImageData(dst),
          description: `Applied ${morphologyOperation} with ${morphologyKernelSize}×${morphologyKernelSize} kernel, iterations: ${morphologyIterations}`
        });
        break;
        
      case 'rotate':
        const angle = paramMap.angle as number || 0;
        const scale = paramMap.scale as number || 1.0;
        const borderMode = paramMap.borderMode as string || 'constant';
        dst = applyRotate(src, angle, scale, borderMode);
        break;
        
      case 'resize':
        const method = paramMap.method as string || 'scale';
        const scaleX = paramMap.scaleX as number || 100;
        const scaleY = paramMap.scaleY as number || 100;
        const resizeWidth = paramMap.width as number || 320;
        const resizeHeight = paramMap.height as number || 240;
        const interpolation = paramMap.interpolation as string || 'linear';
        dst = applyResize(src, method, scaleX, scaleY, resizeWidth, resizeHeight, interpolation);
        break;
        
      case 'flip':
        const direction = paramMap.direction as string || 'horizontal';
        dst = applyFlip(src, direction);
        break;
        
      case 'crop':
        const cropMethod = paramMap.method as string || 'manual';
        const cropX = paramMap.x as number || 0;
        const cropY = paramMap.y as number || 0;
        const cropWidth = paramMap.width as number || 320;
        const cropHeight = paramMap.height as number || 240;
        const aspectRatio = paramMap.aspectRatio as string || 'free';
        dst = applyCrop(src, cropMethod, cropX, cropY, cropWidth, cropHeight, aspectRatio);
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

// Apply dilation to an image
export const applyDilate = (src: any, kernelSize: number, iterations: number = 1, advancedParams?: Record<string, any>): any => {
  try {
    const cv = getOpenCV();
    if (!cv) throw new Error('OpenCV not available');
    
    console.log('Applying dilation with params:', { kernelSize, iterations, advancedParams });
    
    // Create destination matrix
    const dst = new cv.Mat();
    
    // Determine border type
    const borderType = advancedParams?.borderType ? cv[advancedParams.borderType] : cv.BORDER_DEFAULT;
    
    // Check if using custom structuring element
    if (advancedParams?.useCustomElement && advancedParams?.structuringElement) {
      // Use the custom structuring element
      const kernel = createStructuringElementMat(cv, advancedParams.structuringElement);
      
      // Apply dilation
      const anchor = new cv.Point(-1, -1); // Default anchor point (center)
      cv.dilate(
        src,
        dst,
        kernel,
        anchor,
        iterations,
        borderType
      );
      
      // Clean up
      kernel.delete();
    } else {
      // Use standard OpenCV structuring element
      const shape = advancedParams?.shape === 'ellipse' ? cv.MORPH_ELLIPSE :
                    advancedParams?.shape === 'cross' ? cv.MORPH_CROSS :
                    cv.MORPH_RECT;
      
      const kernel = cv.getStructuringElement(
        shape,
        new cv.Size(kernelSize, kernelSize)
      );
      
      // Apply dilation
      const anchor = new cv.Point(-1, -1); // Default anchor point (center)
      cv.dilate(
        src,
        dst,
        kernel,
        anchor,
        iterations,
        borderType
      );
      
      // Clean up
      kernel.delete();
    }
    
    return dst;
  } catch (error) {
    console.error('Error in applyDilate:', error);
    throw error;
  }
};

// Apply erosion to an image
export const applyErode = (src: any, kernelSize: number, iterations: number = 1, advancedParams?: Record<string, any>): any => {
  try {
    const cv = getOpenCV();
    if (!cv) throw new Error('OpenCV not available');
    
    console.log('Applying erosion with params:', { kernelSize, iterations, advancedParams });
    
    // Create destination matrix
    const dst = new cv.Mat();
    
    // Determine border type
    const borderType = advancedParams?.borderType ? cv[advancedParams.borderType] : cv.BORDER_DEFAULT;
    
    // Check if using custom structuring element
    if (advancedParams?.useCustomElement && advancedParams?.structuringElement) {
      // Use the custom structuring element
      const kernel = createStructuringElementMat(cv, advancedParams.structuringElement);
      
      // Apply erosion
      const anchor = new cv.Point(-1, -1); // Default anchor point (center)
      cv.erode(
        src,
        dst,
        kernel,
        anchor,
        iterations,
        borderType
      );
      
      // Clean up
      kernel.delete();
    } else {
      // Use standard OpenCV structuring element
      const shape = advancedParams?.shape === 'ellipse' ? cv.MORPH_ELLIPSE :
                    advancedParams?.shape === 'cross' ? cv.MORPH_CROSS :
                    cv.MORPH_RECT;
      
      const kernel = cv.getStructuringElement(
        shape,
        new cv.Size(kernelSize, kernelSize)
      );
      
      // Apply erosion
      const anchor = new cv.Point(-1, -1); // Default anchor point (center)
      cv.erode(
        src,
        dst,
        kernel,
        anchor,
        iterations,
        borderType
      );
      
      // Clean up
      kernel.delete();
    }
    
    return dst;
  } catch (error) {
    console.error('Error in applyErode:', error);
    throw error;
  }
};

// Rotate an image
export const applyRotate = (src: any, angle: number, scale: number = 1.0, borderMode: string = 'constant'): any => {
  const cv = getOpenCV();
  try {
    // Create destination matrix
    const dst = new cv.Mat();
    
    // Get image dimensions
    const height = src.rows;
    const width = src.cols;
    
    // Calculate center of rotation
    const center = new cv.Point(width / 2, height / 2);
    
    // Get rotation matrix
    const rotationMatrix = cv.getRotationMatrix2D(center, angle, scale);
    
    // Map border mode string to OpenCV constant
    let borderType: number;
    switch (borderMode) {
      case 'constant': borderType = cv.BORDER_CONSTANT; break;
      case 'reflect': borderType = cv.BORDER_REFLECT; break;
      case 'replicate': borderType = cv.BORDER_REPLICATE; break;
      case 'wrap': borderType = cv.BORDER_WRAP; break;
      default: borderType = cv.BORDER_CONSTANT;
    }
    
    // Apply affine transformation (rotation)
    const borderValue = new cv.Scalar(0, 0, 0, 255);
    cv.warpAffine(src, dst, rotationMatrix, new cv.Size(width, height), cv.INTER_LINEAR, borderType, borderValue);
    
    // Clean up
    rotationMatrix.delete();
    
    return dst;
  } catch (error) {
    console.error('Error in applyRotate:', error);
    return src.clone();
  }
};

// Resize an image
export const applyResize = (src: any, method: string, scaleX: number, scaleY: number, width: number, height: number, interpolation: string = 'linear'): any => {
  const cv = getOpenCV();
  try {
    // Create destination matrix
    const dst = new cv.Mat();
    
    // Map interpolation method to OpenCV constant
    let interpMode: number;
    switch (interpolation) {
      case 'nearest': interpMode = cv.INTER_NEAREST; break;
      case 'linear': interpMode = cv.INTER_LINEAR; break;
      case 'cubic': interpMode = cv.INTER_CUBIC; break;
      case 'lanczos': interpMode = cv.INTER_LANCZOS4; break;
      default: interpMode = cv.INTER_LINEAR;
    }
    
    // Calculate dimensions based on method
    let newWidth: number, newHeight: number;
    if (method === 'scale') {
      newWidth = Math.round(src.cols * (scaleX / 100));
      newHeight = Math.round(src.rows * (scaleY / 100));
    } else { // dimensions
      newWidth = width;
      newHeight = height;
    }
    
    // Ensure we have valid dimensions (at least 1x1)
    newWidth = Math.max(1, newWidth);
    newHeight = Math.max(1, newHeight);
    
    // Apply resize
    cv.resize(src, dst, new cv.Size(newWidth, newHeight), 0, 0, interpMode);
    
    return dst;
  } catch (error) {
    console.error('Error in applyResize:', error);
    return src.clone();
  }
};

// Flip an image
export const applyFlip = (src: any, direction: string): any => {
  const cv = getOpenCV();
  try {
    // Create destination matrix
    const dst = new cv.Mat();
    
    // Determine flip code based on direction
    let flipCode: number;
    switch (direction) {
      case 'horizontal': flipCode = 1; break; // Flip around y-axis
      case 'vertical': flipCode = 0; break;   // Flip around x-axis
      case 'both': flipCode = -1; break;      // Flip around both axes
      default: flipCode = 1; // Default to horizontal
    }
    
    // Apply flip
    cv.flip(src, dst, flipCode);
    
    return dst;
  } catch (error) {
    console.error('Error in applyFlip:', error);
    return src.clone();
  }
};

// Crop an image
export const applyCrop = (src: any, method: string, x: number, y: number, width: number, height: number, aspectRatio: string = 'free'): any => {
  const cv = getOpenCV();
  try {
    // Create destination matrix
    let dst: any;
    
    // Get source dimensions
    const srcWidth = src.cols;
    const srcHeight = src.rows;
    
    // Calculate crop parameters based on method
    let cropX: number, cropY: number, cropWidth: number, cropHeight: number;
    
    if (method === 'manual') {
      // Manual crop with explicit coordinates
      cropX = Math.min(Math.max(0, x), srcWidth - 1);
      cropY = Math.min(Math.max(0, y), srcHeight - 1);
      cropWidth = Math.min(width, srcWidth - cropX);
      cropHeight = Math.min(height, srcHeight - cropY);
      
    } else if (method === 'center') {
      // Center crop
      // Apply aspect ratio if specified
      if (aspectRatio !== 'free') {
        const ratio = parseAspectRatio(aspectRatio);
        
        // Determine if width or height should be fixed
        if (width / height > ratio) {
          // Width is relatively larger, adjust it
          cropWidth = Math.round(height * ratio);
          cropHeight = height;
        } else {
          // Height is relatively larger, adjust it
          cropWidth = width;
          cropHeight = Math.round(width / ratio);
        }
      } else {
        cropWidth = width;
        cropHeight = height;
      }
      
      // Center the crop region
      cropX = Math.max(0, Math.floor((srcWidth - cropWidth) / 2));
      cropY = Math.max(0, Math.floor((srcHeight - cropHeight) / 2));
      
      // Ensure dimensions don't exceed image bounds
      cropWidth = Math.min(cropWidth, srcWidth - cropX);
      cropHeight = Math.min(cropHeight, srcHeight - cropY);
      
    } else { // Auto crop (detect content)
      // For auto crop, we'd implement content-aware cropping
      // This is complex and beyond this implementation, so we'll just crop center
      cropWidth = Math.min(width, srcWidth);
      cropHeight = Math.min(height, srcHeight);
      cropX = Math.floor((srcWidth - cropWidth) / 2);
      cropY = Math.floor((srcHeight - cropHeight) / 2);
    }
    
    // Ensure valid crop dimensions (at least 1x1)
    cropWidth = Math.max(1, cropWidth);
    cropHeight = Math.max(1, cropHeight);
    
    // Create a region of interest (ROI) for cropping
    const rect = new cv.Rect(cropX, cropY, cropWidth, cropHeight);
    dst = src.roi(rect);
    
    return dst;
  } catch (error) {
    console.error('Error in applyCrop:', error);
    return src.clone();
  }
};

// Helper function to parse aspect ratio string (e.g., "16:9") to a number
function parseAspectRatio(aspectRatio: string): number {
  if (aspectRatio === 'free') return 1; // Default to 1:1
  
  const parts = aspectRatio.split(':');
  if (parts.length !== 2) return 1;
  
  const width = parseFloat(parts[0]);
  const height = parseFloat(parts[1]);
  
  if (isNaN(width) || isNaN(height) || height === 0) return 1;
  
  return width / height;
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

// Apply morphological operations (opening, closing, gradient, tophat, blackhat)
export const applyMorphology = (src: any, operation: string, kernelSize: number, iterations: number = 1, advancedParams?: Record<string, any>): any => {
  const cv = getOpenCV();
  try {
    // Create destination matrix
    const dst = new cv.Mat();
    
    // Map border type
    const borderType = advancedParams?.borderType === 'reflect' ? cv.BORDER_REFLECT :
                      advancedParams?.borderType === 'replicate' ? cv.BORDER_REPLICATE :
                      advancedParams?.borderType === 'wrap' ? cv.BORDER_WRAP :
                      cv.BORDER_DEFAULT; // Default border handling
    
    // Create structuring element
    let kernel: any;
    
    if (advancedParams?.useCustomElement && advancedParams?.structuringElement) {
      // Use the custom structuring element
      kernel = createStructuringElementMat(cv, advancedParams.structuringElement);
    } else {
      // Use standard OpenCV structuring element
      const shape = advancedParams?.shape === 'ellipse' ? cv.MORPH_ELLIPSE :
                    advancedParams?.shape === 'cross' ? cv.MORPH_CROSS :
                    cv.MORPH_RECT;
      
      kernel = cv.getStructuringElement(
        shape,
        new cv.Size(kernelSize, kernelSize)
      );
    }
    
    // Map morphological operation to OpenCV constant
    let morphOp: number;
    switch (operation) {
      case 'open':
        morphOp = cv.MORPH_OPEN;
        break;
      case 'close':
        morphOp = cv.MORPH_CLOSE;
        break;
      case 'gradient':
        morphOp = cv.MORPH_GRADIENT;
        break;
      case 'tophat':
        morphOp = cv.MORPH_TOPHAT;
        break;
      case 'blackhat':
        morphOp = cv.MORPH_BLACKHAT;
        break;
      default:
        morphOp = cv.MORPH_OPEN; // Default to opening
    }
    
    // Set up anchor point (center of kernel by default)
    const anchor = new cv.Point(-1, -1);
    
    // Apply morphological operation
    cv.morphologyEx(
      src,
      dst,
      morphOp,
      kernel,
      anchor,
      iterations,
      borderType
    );
    
    // Clean up
    kernel.delete();
    
    return dst;
  } catch (error) {
    console.error('Error in applyMorphology:', error);
    throw error;
  }
};