/**
 * MuPDF.js Browser-Only Integration
 * 
 * This module provides MuPDF.js functionality that only works in browser environments.
 * It must be imported dynamically to avoid SSR issues with WebAssembly and Node.js modules.
 * 
 * Usage:
 * ```typescript
 * // Only import this in browser/client-side code
 * if (typeof window !== 'undefined') {
 *   const { getMuPDFPageCount } = await import('./mupdf-browser')
 *   const pageCount = await getMuPDFPageCount(file)
 * }
 * ```
 */

// This file must only be imported in browser environments
if (typeof window === 'undefined') {
  throw new Error('mupdf-browser.ts can only be used in browser environments')
}

/**
 * Error thrown when MuPDF operations fail
 */
export class MuPDFBrowserError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message)
    this.name = 'MuPDFBrowserError'
  }
}

/**
 * Get the page count of a PDF using MuPDF.js (browser-only)
 * 
 * @param file - PDF file object from browser file input
 * @returns Promise resolving to page count
 * @throws MuPDFBrowserError if PDF cannot be parsed or processed
 * 
 * @example
 * ```typescript
 * if (typeof window !== 'undefined') {
 *   const { getMuPDFPageCount } = await import('./mupdf-browser')
 *   try {
 *     const pageCount = await getMuPDFPageCount(file)
 *     console.log(`PDF has ${pageCount} pages`)
 *   } catch (error) {
 *     console.error('MuPDF processing failed:', error.message)
 *   }
 * }
 * ```
 */
export async function getMuPDFPageCount(file: File): Promise<number> {
  try {
    // Dynamic import of MuPDF.js - this will only work in browser
    const mupdf = await import('mupdf')
    
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    
    // Create MuPDF Document from ArrayBuffer
    const document = mupdf.Document.openDocument(arrayBuffer)
    
    try {
      // Get page count
      const pageCount = document.countPages()
      return pageCount
    } finally {
      // Clean up document to free memory
      document.destroy()
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new MuPDFBrowserError(
        `Failed to count PDF pages with MuPDF: ${error.message}`,
        error
      )
    }
    throw new MuPDFBrowserError('Failed to count PDF pages with MuPDF: Unknown error')
  }
}

/**
 * Get the page count of a PDF from an ArrayBuffer using MuPDF.js (browser-only)
 * 
 * @param arrayBuffer - PDF data as ArrayBuffer
 * @returns Promise resolving to page count
 * @throws MuPDFBrowserError if PDF cannot be parsed or processed
 */
export async function getMuPDFPageCountFromArrayBuffer(arrayBuffer: ArrayBuffer): Promise<number> {
  try {
    // Dynamic import of MuPDF.js - this will only work in browser
    const mupdf = await import('mupdf')
    
    // Create MuPDF Document from ArrayBuffer
    const document = mupdf.Document.openDocument(arrayBuffer)
    
    try {
      // Get page count
      const pageCount = document.countPages()
      return pageCount
    } finally {
      // Clean up document to free memory
      document.destroy()
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new MuPDFBrowserError(
        `Failed to count PDF pages with MuPDF: ${error.message}`,
        error
      )
    }
    throw new MuPDFBrowserError('Failed to count PDF pages with MuPDF: Unknown error')
  }
}

/**
 * Validate PDF page count against limit using MuPDF.js (browser-only)
 * 
 * @param file - PDF file object from browser file input
 * @param maxPages - Maximum allowed pages (defaults to 100)
 * @returns Promise resolving to validation result
 */
export async function validateMuPDFPageCount(
  file: File,
  maxPages: number = 100
): Promise<{ isValid: boolean; pageCount: number; error?: string }> {
  try {
    const pageCount = await getMuPDFPageCount(file)
    
    if (pageCount > maxPages) {
      return {
        isValid: false,
        pageCount,
        error: `PDF has too many pages (${pageCount}). Maximum allowed: ${maxPages} pages.`
      }
    }
    
    return {
      isValid: true,
      pageCount
    }
  } catch (error) {
    return {
      isValid: false,
      pageCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Test MuPDF integration in browser environment
 * 
 * @returns Promise resolving to success message
 * @throws MuPDFBrowserError if integration test fails
 */
export async function testMuPDFBrowserIntegration(): Promise<string> {
  try {
    // Test dynamic import
    const mupdf = await import('mupdf')
    
    // Verify we can access key classes
    if (!mupdf.Document || typeof mupdf.Document.openDocument !== 'function') {
      throw new Error('MuPDF Document class not available')
    }
    
    return 'MuPDF.js browser integration test passed ✅'
  } catch (error) {
    if (error instanceof Error) {
      throw new MuPDFBrowserError(
        `MuPDF browser integration test failed: ${error.message}`,
        error
      )
    }
    throw new MuPDFBrowserError('MuPDF browser integration test failed: Unknown error')
  }
}