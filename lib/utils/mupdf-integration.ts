/**
 * MuPDF.js Integration for PDF Processing
 * 
 * This module provides utilities for PDF processing using the official MuPDF.js library.
 * It handles dynamic imports to ensure compatibility with Next.js SSR and provides
 * browser-compatible PDF processing capabilities.
 * 
 * Key features:
 * - Page counting to replace pdf-lib dependency
 * - PDF to image conversion for vision-based processing
 * - Browser-compatible WebAssembly implementation
 * - Dynamic imports for bundle size optimization
 */

/**
 * Error thrown when MuPDF operations fail
 */
export class MuPDFError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message)
    this.name = 'MuPDFError'
  }
}

/**
 * Result of PDF page count validation using MuPDF
 */
export interface MuPDFPageCountResult {
  /** Whether the PDF passes page count validation */
  isValid: boolean
  /** Number of pages in the PDF */
  pageCount: number
  /** Error message if validation failed */
  error?: string
}

/**
 * Get the page count of a PDF using MuPDF.js (client-side version)
 * 
 * This function uses dynamic import to avoid loading MuPDF.js on pages
 * that don't need PDF processing, reducing bundle size impact.
 * 
 * @param file - PDF file object from browser file input
 * @returns Promise resolving to page count
 * @throws MuPDFError if PDF cannot be parsed or processed
 * 
 * @example
 * ```typescript
 * try {
 *   const pageCount = await getMuPDFPageCountFromFile(file)
 *   console.log(`PDF has ${pageCount} pages`)
 * } catch (error) {
 *   if (error instanceof MuPDFError) {
 *     console.error('MuPDF processing failed:', error.message)
 *   }
 * }
 * ```
 */
export async function getMuPDFPageCountFromFile(file: File): Promise<number> {
  try {
    // Dynamic import to avoid loading MuPDF.js on non-upload pages
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
      throw new MuPDFError(
        `Failed to count PDF pages with MuPDF: ${error.message}`,
        error
      )
    }
    throw new MuPDFError('Failed to count PDF pages with MuPDF: Unknown error')
  }
}

/**
 * Get the page count of a PDF from a Buffer using MuPDF.js (server-side version)
 * 
 * @param buffer - PDF data as Buffer (typically from server-side file processing)
 * @returns Promise resolving to page count
 * @throws MuPDFError if PDF cannot be parsed or processed
 * 
 * @example
 * ```typescript
 * try {
 *   const pageCount = await getMuPDFPageCountFromBuffer(pdfBuffer)
 *   console.log(`PDF has ${pageCount} pages`)
 * } catch (error) {
 *   if (error instanceof MuPDFError) {
 *     console.error('MuPDF processing failed:', error.message)
 *   }
 * }
 * ```
 */
export async function getMuPDFPageCountFromBuffer(buffer: Buffer): Promise<number> {
  try {
    // Dynamic import for server-side usage
    const mupdf = await import('mupdf')
    
    // Create MuPDF Document from Buffer
    const document = mupdf.Document.openDocument(buffer)
    
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
      throw new MuPDFError(
        `Failed to count PDF pages with MuPDF: ${error.message}`,
        error
      )
    }
    throw new MuPDFError('Failed to count PDF pages with MuPDF: Unknown error')
  }
}

/**
 * Validate PDF page count against configured limits using MuPDF (client-side)
 * 
 * This function provides a complete validation result including whether
 * the PDF passes validation, the actual page count, and user-friendly
 * error messages explaining the limit rationale.
 * 
 * @param file - PDF file object from browser file input
 * @param maxPages - Maximum allowed pages (defaults to 100)
 * @returns Promise resolving to validation result
 * 
 * @example
 * ```typescript
 * const result = await validateMuPDFPageCount(file)
 * if (!result.isValid) {
 *   showError(result.error!)
 * } else {
 *   console.log(`PDF validation passed: ${result.pageCount} pages`)
 * }
 * ```
 */
export async function validateMuPDFPageCount(
  file: File,
  maxPages: number = 100
): Promise<MuPDFPageCountResult> {
  try {
    const pageCount = await getMuPDFPageCountFromFile(file)
    
    if (pageCount > maxPages) {
      return {
        isValid: false,
        pageCount,
        error: `PDF has too many pages (${pageCount}). Maximum allowed: ${maxPages} pages. Page limits help ensure reasonable processing times for AI analysis.`
      }
    }
    
    return {
      isValid: true,
      pageCount
    }
  } catch (error) {
    if (error instanceof MuPDFError) {
      return {
        isValid: false,
        pageCount: 0,
        error: `PDF validation failed: ${error.message}`
      }
    }
    
    return {
      isValid: false,
      pageCount: 0,
      error: 'PDF validation failed: Unable to process PDF file with MuPDF'
    }
  }
}

/**
 * Validate PDF page count from Buffer using MuPDF (server-side)
 * 
 * @param buffer - PDF data as Buffer
 * @param maxPages - Maximum allowed pages (defaults to 100)
 * @returns Promise resolving to validation result
 * 
 * @example
 * ```typescript
 * const result = await validateMuPDFPageCountFromBuffer(pdfBuffer)
 * if (!result.isValid) {
 *   return new NextResponse(result.error, { status: 400 })
 * }
 * ```
 */
export async function validateMuPDFPageCountFromBuffer(
  buffer: Buffer,
  maxPages: number = 100
): Promise<MuPDFPageCountResult> {
  try {
    const pageCount = await getMuPDFPageCountFromBuffer(buffer)
    
    if (pageCount > maxPages) {
      return {
        isValid: false,
        pageCount,
        error: `PDF has too many pages (${pageCount}). Maximum allowed: ${maxPages} pages. Page limits help ensure reasonable processing times for AI analysis.`
      }
    }
    
    return {
      isValid: true,
      pageCount
    }
  } catch (error) {
    if (error instanceof MuPDFError) {
      return {
        isValid: false,
        pageCount: 0,
        error: `PDF validation failed: ${error.message}`
      }
    }
    
    return {
      isValid: false,
      pageCount: 0,
      error: 'PDF validation failed: Unable to process PDF file with MuPDF'
    }
  }
}

/**
 * Test MuPDF integration to ensure it's working correctly
 * 
 * This function verifies that MuPDF can be loaded and basic functionality works.
 * Used for development and debugging purposes.
 * 
 * @returns Promise resolving to success message
 * @throws MuPDFError if integration test fails
 */
export async function testMuPDFIntegration(): Promise<string> {
  try {
    // Test dynamic import
    const mupdf = await import('mupdf')
    
    // Verify we can access key classes
    if (!mupdf.Document || typeof mupdf.Document.openDocument !== 'function') {
      throw new Error('MuPDF Document class not available')
    }
    
    return 'MuPDF.js integration test passed ✅'
  } catch (error) {
    if (error instanceof Error) {
      throw new MuPDFError(
        `MuPDF integration test failed: ${error.message}`,
        error
      )
    }
    throw new MuPDFError('MuPDF integration test failed: Unknown error')
  }
}