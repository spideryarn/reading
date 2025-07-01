/**
 * PDF to Images Conversion using PDF.js
 * 
 * This module provides utilities for converting PDF pages to images using PDF.js.
 * It handles browser-only operations and provides base64-encoded images suitable
 * for vision-based AI processing.
 * 
 * Key features:
 * - PDF to page images conversion
 * - Configurable DPI/quality settings for token cost optimization
 * - Base64 output for immediate use in AI prompts
 * - Progress callback support for UI updates
 * - Memory management for large documents
 */

// This file must only be imported in browser environments
if (typeof window === 'undefined') {
  throw new Error('pdf-to-images.ts can only be used in browser environments')
}

import { pdfjsLib } from '@/lib/pdf-config';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

/**
 * Error thrown when PDF to image conversion fails
 */
export class PDFToImagesError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message)
    this.name = 'PDFToImagesError'
  }
}

/**
 * Configuration options for PDF to image conversion
 */
export interface PDFToImagesOptions {
  /** Scale factor for image quality (1.0 = 72 DPI, 2.0 = 144 DPI) */
  scale?: number
  /** Output format: 'png' for lossless, 'jpeg' for smaller size */
  format?: 'png' | 'jpeg'
  /** JPEG quality (0-1, only used when format is 'jpeg') */
  quality?: number
  /** Rotation in degrees (0, 90, 180, 270) */
  rotation?: number
  /** Pages to convert ('all' or array of page numbers) */
  pages?: 'all' | number[]
  /** Progress callback function (pageIndex, totalPages) => void */
  onProgress?: (pageIndex: number, totalPages: number) => void
}

/**
 * Result of single page conversion
 */
export interface PageImageResult {
  /** Zero-based page index */
  pageIndex: number
  /** Base64-encoded image data (includes data: prefix) */
  base64Image: string
  /** Image format used */
  format: 'png' | 'jpeg'
  /** Image dimensions */
  width: number
  height: number
}

/**
 * Result of PDF to images conversion
 */
export interface PDFToImagesResult {
  /** Array of page image results */
  pages: PageImageResult[]
  /** Total number of pages converted */
  totalPages: number
  /** Processing time in milliseconds */
  processingTime: number
  /** Conversion summary */
  summary: {
    format: 'png' | 'jpeg'
    scale: number
    totalSizeBytes: number
    averageSizeBytes: number
  }
}

/**
 * Interface for render options
 */
interface RenderOptions {
  scale: number;
  rotation?: number;
  outputScale?: number;
}

/**
 * Interface for page render result
 */
interface PageRenderResult {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  viewport: {
    width: number;
    height: number;
    scale: number;
    rotation: number;
  };
}

/**
 * Load PDF from various sources
 */
async function loadPDF(
  source: string | ArrayBuffer | Uint8Array
): Promise<{ pdf: PDFDocumentProxy; pageCount: number; metadata?: Record<string, unknown> }> {
  try {
    const loadingTask = pdfjsLib.getDocument(source);
    
    const pdf = await loadingTask.promise;
    const metadata = await pdf.getMetadata().catch(() => null);
    
    return {
      pdf,
      pageCount: pdf.numPages,
      metadata: metadata?.info as Record<string, unknown> | undefined
    };
  } catch (error: unknown) {
    const errorObj = error as any;
    if (errorObj?.name === 'InvalidPDFException') {
      throw new PDFToImagesError('Invalid PDF file format');
    } else if (errorObj?.name === 'MissingPDFException') {
      throw new PDFToImagesError('PDF file not found');
    } else if (errorObj?.name === 'UnexpectedResponseException') {
      throw new PDFToImagesError('Network error loading PDF');
    }
    const message = errorObj?.message || String(error);
    throw new PDFToImagesError(`PDF loading failed: ${message}`);
  }
}

/**
 * Render a PDF page to canvas
 */
async function renderPageToCanvas(
  page: PDFPageProxy,
  options: RenderOptions = { scale: 1.5 }
): Promise<PageRenderResult> {
  // Calculate viewport with scale
  const viewport = page.getViewport({ 
    scale: options.scale,
    rotation: options.rotation || 0
  });
  
  // Create canvas with proper sizing
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  
  // Handle high-DPI displays
  const outputScale = options.outputScale || window.devicePixelRatio || 1;
  
  canvas.width = Math.floor(viewport.width * outputScale);
  canvas.height = Math.floor(viewport.height * outputScale);
  canvas.style.width = Math.floor(viewport.width) + 'px';
  canvas.style.height = Math.floor(viewport.height) + 'px';
  
  // Render page to canvas
  const renderContext = {
    canvasContext: context,
    viewport: viewport,
    ...(outputScale !== 1 && { transform: [outputScale, 0, 0, outputScale, 0, 0] })
  };
  
  await page.render(renderContext).promise;
  
  return { canvas, context, viewport };
}

/**
 * Extract image from canvas
 */
async function extractImageFromCanvas(
  canvas: HTMLCanvasElement,
  format: 'png' | 'jpeg',
  quality: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const dataUrl = canvas.toDataURL(mimeType, quality);
      resolve(dataUrl);
    } catch (error: unknown) {
      const message = (error as any)?.message || String(error);
      reject(new PDFToImagesError(`Image extraction failed: ${message}`));
    }
  });
}

/**
 * Clean up canvas to free memory
 */
function cleanupCanvas(canvas: HTMLCanvasElement): void {
  const context = canvas.getContext('2d');
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
  }
  canvas.width = 0;
  canvas.height = 0;
}

/**
 * Convert PDF file to page images using PDF.js (browser-only)
 * 
 * @param file - PDF file object from browser file input
 * @param options - Conversion options
 * @returns Promise resolving to conversion result
 * @throws PDFToImagesError if conversion fails
 * 
 * @example
 * ```typescript
 * if (typeof window !== 'undefined') {
 *   const { convertPDFToImages } = await import('./pdf-to-images')
 *   
 *   try {
 *     const result = await convertPDFToImages(file, {
 *       scale: 2.0,
 *       format: 'jpeg',
 *       quality: 0.85,
 *       onProgress: (page, total) => {
 *         console.log(`Processing page ${page + 1} of ${total}`)
 *       }
 *     })
 *     
 *     console.log(`Converted ${result.totalPages} pages`)
 *     result.pages.forEach(page => {
 *       console.log(`Page ${page.pageIndex}: ${page.width}x${page.height}`)
 *     })
 *   } catch (error) {
 *     console.error('PDF conversion failed:', error.message)
 *   }
 * }
 * ```
 */
export async function convertPDFToImages(
  file: File,
  options: PDFToImagesOptions = {}
): Promise<PDFToImagesResult> {
  const startTime = Date.now();
  
  // Validate browser environment
  if (typeof window === 'undefined') {
    throw new PDFToImagesError('PDF conversion must happen in browser environment');
  }
  
  const {
    scale = 1.5,
    format = 'png',
    quality = 0.95,
    rotation = 0,
    pages = 'all',
    onProgress
  } = options;
  
  try {
    // Load PDF
    const arrayBuffer = await file.arrayBuffer();
    const { pdf, pageCount } = await loadPDF(arrayBuffer);
    
    // Determine pages to process
    const pageIndices = pages === 'all' 
      ? Array.from({ length: pageCount }, (_, i) => i + 1)
      : pages;
    
    const results: PageImageResult[] = [];
    let totalSizeBytes = 0;
    
    // Process pages sequentially to manage memory
    for (let i = 0; i < pageIndices.length; i++) {
      const pageNumber = pageIndices[i];
      if (typeof pageNumber !== 'number') {
        throw new PDFToImagesError(`Invalid page number: ${pageNumber}`);
      }
      
      try {
        // Load page
        const page = await pdf.getPage(pageNumber);
        
        // Render to canvas
        const { canvas, viewport } = await renderPageToCanvas(page, { scale, rotation });
        
        // Extract image with proper cleanup
        const imageData = await extractImageFromCanvas(canvas, format, quality);
        
        results.push({
          pageIndex: pageNumber - 1, // Zero-indexed for consistency
          base64Image: imageData,
          format,
          width: Math.floor(viewport.width),
          height: Math.floor(viewport.height)
        });
        
        // Track total size (rough estimate from base64 length)
        totalSizeBytes += Math.round(imageData.length * 0.75); // base64 is ~33% larger
        
        // Cleanup canvas immediately
        cleanupCanvas(canvas);
        
        // Report progress
        onProgress?.(i, pageIndices.length);
        
      } catch (error: unknown) {
        console.error(`Failed to process page ${pageNumber}:`, error);
        const message = (error as any)?.message || String(error);
        throw new PDFToImagesError(`Page ${pageNumber} processing failed: ${message}`);
      }
    }
    
    // Cleanup PDF document
    pdf.cleanup();
    pdf.destroy();
    
    return {
      pages: results,
      totalPages: pageCount,
      processingTime: Date.now() - startTime,
      summary: {
        format,
        scale,
        totalSizeBytes,
        averageSizeBytes: Math.round(totalSizeBytes / results.length)
      }
    };
    
  } catch (error: unknown) {
    if (error instanceof PDFToImagesError) {
      throw error;
    }
    const message = (error as any)?.message || String(error);
    throw new PDFToImagesError(`PDF conversion failed: ${message}`);
  }
}

/**
 * Convert PDF ArrayBuffer to page images using PDF.js (browser-only)
 * 
 * @param arrayBuffer - PDF data as ArrayBuffer
 * @param options - Conversion options
 * @returns Promise resolving to conversion result
 * @throws PDFToImagesError if conversion fails
 */
export async function convertPDFBufferToImages(
  arrayBuffer: ArrayBuffer,
  options: PDFToImagesOptions = {}
): Promise<PDFToImagesResult> {
  const startTime = Date.now();
  
  // Validate browser environment
  if (typeof window === 'undefined') {
    throw new PDFToImagesError('PDF conversion must happen in browser environment');
  }
  
  const {
    scale = 1.5,
    format = 'png',
    quality = 0.95,
    rotation = 0,
    pages = 'all',
    onProgress
  } = options;
  
  try {
    // Load PDF
    const { pdf, pageCount } = await loadPDF(arrayBuffer);
    
    // Determine pages to process
    const pageIndices = pages === 'all' 
      ? Array.from({ length: pageCount }, (_, i) => i + 1)
      : pages;
    
    const results: PageImageResult[] = [];
    let totalSizeBytes = 0;
    
    // Process pages sequentially to manage memory
    for (let i = 0; i < pageIndices.length; i++) {
      const pageNumber = pageIndices[i];
      if (typeof pageNumber !== 'number') {
        throw new PDFToImagesError(`Invalid page number: ${pageNumber}`);
      }
      
      try {
        // Load page
        const page = await pdf.getPage(pageNumber);
        
        // Render to canvas
        const { canvas, viewport } = await renderPageToCanvas(page, { scale, rotation });
        
        // Extract image with proper cleanup
        const imageData = await extractImageFromCanvas(canvas, format, quality);
        
        results.push({
          pageIndex: pageNumber - 1, // Zero-indexed for consistency
          base64Image: imageData,
          format,
          width: Math.floor(viewport.width),
          height: Math.floor(viewport.height)
        });
        
        // Track total size (rough estimate from base64 length)
        totalSizeBytes += Math.round(imageData.length * 0.75); // base64 is ~33% larger
        
        // Cleanup canvas immediately
        cleanupCanvas(canvas);
        
        // Report progress
        onProgress?.(i, pageIndices.length);
        
      } catch (error: unknown) {
        console.error(`Failed to process page ${pageNumber}:`, error);
        const message = (error as any)?.message || String(error);
        throw new PDFToImagesError(`Page ${pageNumber} processing failed: ${message}`);
      }
    }
    
    // Cleanup PDF document
    pdf.cleanup();
    pdf.destroy();
    
    return {
      pages: results,
      totalPages: pageCount,
      processingTime: Date.now() - startTime,
      summary: {
        format,
        scale,
        totalSizeBytes,
        averageSizeBytes: Math.round(totalSizeBytes / results.length)
      }
    };
    
  } catch (error: unknown) {
    if (error instanceof PDFToImagesError) {
      throw error;
    }
    const message = (error as any)?.message || String(error);
    throw new PDFToImagesError(`PDF buffer conversion failed: ${message}`);
  }
}

/**
 * Get recommended conversion settings based on use case
 */
export function getRecommendedSettings(useCase: 'speed' | 'quality' | 'balanced'): PDFToImagesOptions {
  switch (useCase) {
    case 'speed':
      return {
        scale: 1.5,
        format: 'jpeg',
        quality: 0.7
      }
    case 'quality':
      return {
        scale: 2.5,
        format: 'png'
      }
    case 'balanced':
    default:
      return {
        scale: 2.0,
        format: 'jpeg',
        quality: 0.85
      }
  }
}

/**
 * Estimate memory usage for PDF conversion
 * 
 * @param pageCount - Number of pages in PDF
 * @param options - Conversion options
 * @returns Estimated memory usage in bytes
 */
export function estimateMemoryUsage(
  pageCount: number, 
  options: PDFToImagesOptions = {}
): number {
  const scale = options.scale ?? 2.0
  const format = options.format ?? 'png'
  
  // Rough estimates for typical page sizes (8.5" x 11" at given scale)
  const widthPixels = Math.round(612 * scale) // 612pt = 8.5" at 72 DPI
  const heightPixels = Math.round(792 * scale) // 792pt = 11" at 72 DPI
  
  // Estimate bytes per page
  let bytesPerPage: number
  if (format === 'png') {
    // PNG: roughly 4 bytes per pixel (RGBA) with compression
    bytesPerPage = widthPixels * heightPixels * 2 // Compressed estimate
  } else {
    // JPEG: much smaller due to compression
    bytesPerPage = widthPixels * heightPixels * 0.5 // Compressed estimate
  }
  
  return Math.round(pageCount * bytesPerPage)
}