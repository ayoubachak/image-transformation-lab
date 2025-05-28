declare module 'opencv-ts' {
  export class Mat {
    rows: number;
    cols: number;
    data: Uint8Array;
    type(): number;
    size(): Size;
    delete(): void;
    copyTo(dst: Mat): void;
    clone(): Mat;
    ucharPtr(row: number, col: number): Uint8Array;
    channels(): number;
  }

  export class Size {
    constructor(width: number, height: number);
    width: number;
    height: number;
  }

  export function matFromImageData(imageData: ImageData): Mat;
  export function imshow(canvas: HTMLCanvasElement, mat: Mat): void;
  export function cvtColor(src: Mat, dst: Mat, code: number): void;
  export function GaussianBlur(src: Mat, dst: Mat, ksize: Size, sigmaX: number, sigmaY: number, borderType?: number): void;
  export function threshold(src: Mat, dst: Mat, thresh: number, maxval: number, type: number): void;
  export function Laplacian(src: Mat, dst: Mat, ddepth: number, ksize: number, scale: number, delta: number, borderType: number): void;
  export function Sobel(src: Mat, dst: Mat, ddepth: number, dx: number, dy: number, ksize: number, scale: number, delta: number, borderType: number): void;
  export function Canny(src: Mat, dst: Mat, threshold1: number, threshold2: number): void;
  export function addWeighted(src1: Mat, alpha: number, src2: Mat, beta: number, gamma: number, dst: Mat): void;

  export const CV_8UC1: number;
  export const CV_8U: number;
  export const COLOR_RGBA2GRAY: number;
  export const COLOR_RGB2GRAY: number;
  export const THRESH_BINARY: number;
  export const BORDER_DEFAULT: number;
  
  // Allow assignment to onRuntimeInitialized
  export let onRuntimeInitialized: (() => void) | undefined;
} 