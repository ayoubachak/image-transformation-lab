import type { StructuringElement } from './types';

/**
 * Creates an OpenCV Mat for the structuring element
 * @param cv OpenCV instance
 * @param element Structuring element configuration
 * @returns OpenCV Mat containing the structuring element
 */
export const createStructuringElementMat = (cv: any, element: StructuringElement): any => {
  // For standard shapes, use OpenCV's built-in getStructuringElement
  if (['rect', 'ellipse', 'cross'].includes(element.shape)) {
    const shapeType = 
      element.shape === 'rect' ? cv.MORPH_RECT :
      element.shape === 'ellipse' ? cv.MORPH_ELLIPSE :
      cv.MORPH_CROSS;
    
    return cv.getStructuringElement(
      shapeType,
      new cv.Size(element.width, element.height)
    );
  }
  
  // For custom shapes, create a custom kernel matrix
  let kernelData: number[][] = [];
  
  switch (element.shape) {
    case 'custom':
      // Use the provided matrix directly
      if (element.matrix) {
        kernelData = element.matrix;
      } else {
        // Fallback to a single pixel if no matrix is provided
        kernelData = Array(element.height).fill(0).map(() => Array(element.width).fill(0));
        const centerY = Math.floor(element.height / 2);
        const centerX = Math.floor(element.width / 2);
        kernelData[centerY][centerX] = 1;
      }
      break;
      
    case 'circle':
      // Create a circular kernel
      kernelData = createCircleKernel(
        element.width, 
        element.height, 
        element.radius || Math.min(element.width, element.height) / 2
      );
      break;
      
    case 'square':
      // Create a square kernel
      const squareSize = Math.min(element.width, element.height);
      kernelData = createSquareKernel(
        element.width,
        element.height,
        squareSize
      );
      break;
      
    case 'stick':
      // Create a stick-shaped kernel
      kernelData = createStickKernel(
        element.width,
        element.height,
        element.angle || 0,
        element.length || Math.min(element.width, element.height)
      );
      break;
      
    case 'bipoint':
      // Create a kernel with two points and a line between them
      kernelData = createBipointKernel(
        element.width,
        element.height,
        element.point1 || { x: Math.floor(element.width / 4), y: Math.floor(element.height / 4) },
        element.point2 || { x: Math.floor(element.width * 3 / 4), y: Math.floor(element.height * 3 / 4) }
      );
      break;
      
    default:
      // Default to a single center pixel
      kernelData = Array(element.height).fill(0).map(() => Array(element.width).fill(0));
      const centerY = Math.floor(element.height / 2);
      const centerX = Math.floor(element.width / 2);
      kernelData[centerY][centerX] = 1;
  }
  
  // Convert 2D array to flattened array
  const flattenedKernel = kernelData.reduce((acc, row) => [...acc, ...row], []);
  
  // Create OpenCV Mat from kernel data
  const kernel = cv.matFromArray(element.height, element.width, cv.CV_8U, flattenedKernel);
  return kernel;
};

/**
 * Creates a circular kernel
 */
const createCircleKernel = (width: number, height: number, radius: number): number[][] => {
  const kernel = Array(height).fill(0).map(() => Array(width).fill(0));
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  
  // Fill in pixels that are within the radius
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
      if (distance <= radius) {
        kernel[y][x] = 1;
      }
    }
  }
  
  return kernel;
};

/**
 * Creates a square kernel
 */
const createSquareKernel = (width: number, height: number, squareSize: number): number[][] => {
  const kernel = Array(height).fill(0).map(() => Array(width).fill(0));
  const startX = Math.floor((width - squareSize) / 2);
  const startY = Math.floor((height - squareSize) / 2);
  
  // Fill in the square region
  for (let y = 0; y < squareSize; y++) {
    for (let x = 0; x < squareSize; x++) {
      if (startY + y < height && startX + x < width) {
        kernel[startY + y][startX + x] = 1;
      }
    }
  }
  
  return kernel;
};

/**
 * Creates a stick-shaped kernel with specified angle and length
 */
const createStickKernel = (width: number, height: number, angleDegrees: number, length: number): number[][] => {
  const kernel = Array(height).fill(0).map(() => Array(width).fill(0));
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const angleRadians = (angleDegrees * Math.PI) / 180;
  
  // Calculate half-length for endpoints
  const halfLength = length / 2;
  
  // Calculate start and end points of the stick
  const startX = centerX - Math.cos(angleRadians) * halfLength;
  const startY = centerY - Math.sin(angleRadians) * halfLength;
  const endX = centerX + Math.cos(angleRadians) * halfLength;
  const endY = centerY + Math.sin(angleRadians) * halfLength;
  
  // Draw line using Bresenham's algorithm
  drawLine(kernel, Math.round(startX), Math.round(startY), Math.round(endX), Math.round(endY));
  
  return kernel;
};

/**
 * Creates a kernel with two points and a line connecting them
 */
const createBipointKernel = (
  width: number, 
  height: number, 
  point1: { x: number, y: number }, 
  point2: { x: number, y: number }
): number[][] => {
  const kernel = Array(height).fill(0).map(() => Array(width).fill(0));
  
  // Ensure points are within bounds
  const p1x = Math.min(Math.max(0, point1.x), width - 1);
  const p1y = Math.min(Math.max(0, point1.y), height - 1);
  const p2x = Math.min(Math.max(0, point2.x), width - 1);
  const p2y = Math.min(Math.max(0, point2.y), height - 1);
  
  // Draw line between points
  drawLine(kernel, p1x, p1y, p2x, p2y);
  
  return kernel;
};

/**
 * Draws a line on the kernel using Bresenham's algorithm
 */
const drawLine = (kernel: number[][], x0: number, y0: number, x1: number, y1: number): void => {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  
  while (true) {
    // Set pixel if within bounds
    if (y0 >= 0 && y0 < kernel.length && x0 >= 0 && x0 < kernel[0].length) {
      kernel[y0][x0] = 1;
    }
    
    if (x0 === x1 && y0 === y1) break;
    
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
}; 