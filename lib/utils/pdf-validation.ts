/**
 * PDF Validation Utilities using pdf-lib
 * 
 * This module provides utilities for PDF validation, specifically page counting,
 * using the pdf-lib library. It supports both client-side File objects and 
 * server-side Buffer objects for maximum flexibility.
 * 
 * Key features:
 * - Page count validation against configurable limits
 * - Support for both File (client) and Buffer (server) inputs
 * - Comprehensive error handling for corrupted PDFs
 * - Type-safe validation with clear error messages
 */

import { UPLOAD_LIMITS } from '@/lib/config/upload-limits'

/**
 * Result of PDF page count validation
 */
export interface PdfPageCountResult {
  /** Whether the PDF passes page count validation */
  isValid: boolean
  /** Number of pages in the PDF */
  pageCount: number
  /** Error message if validation failed */
  error?: string
}

/**
 * Error thrown when PDF cannot be processed
 */
export class PdfValidationError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message)
    this.name = 'PdfValidationError'
  }
}

/**
 * Get the page count of a PDF file using pdf-lib (client-side version)
 * 
 * This function uses dynamic import to avoid loading pdf-lib on pages
 * that don't need PDF processing, reducing bundle size.
 * 
 * @param file - PDF file object from browser file input
 * @returns Promise resolving to page count
 * @throws PdfValidationError if PDF cannot be parsed or processed
 * 
 * @example
 * ```typescript
 * try {
 *   const pageCount = await getPdfPageCountFromFile(file)
 *   console.log(`PDF has ${pageCount} pages`)
 * } catch (error) {
 *   if (error instanceof PdfValidationError) {
 *     console.error('PDF validation failed:', error.message)
 *   }
 * }
 * ```
 */
export async function getPdfPageCountFromFile(file: File): Promise<number> {
  try {
    // Dynamic import to avoid loading pdf-lib on non-upload pages
    const { PDFDocument } = await import('pdf-lib')
    
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    
    // Load and parse PDF document
    const pdfDoc = await PDFDocument.load(arrayBuffer)
    
    // Return page count
    return pdfDoc.getPageCount()
  } catch (error) {
    if (error instanceof Error) {
      throw new PdfValidationError(
        `Failed to count PDF pages: ${error.message}`,
        error
      )
    }
    throw new PdfValidationError('Failed to count PDF pages: Unknown error')
  }
}

/**
 * Get the page count of a PDF from a Buffer (server-side version)
 * 
 * @param buffer - PDF data as Buffer (typically from server-side file processing)
 * @returns Promise resolving to page count
 * @throws PdfValidationError if PDF cannot be parsed or processed
 * 
 * @example
 * ```typescript
 * try {
 *   const pageCount = await getPdfPageCountFromBuffer(pdfBuffer)
 *   console.log(`PDF has ${pageCount} pages`)
 * } catch (error) {
 *   if (error instanceof PdfValidationError) {
 *     console.error('PDF validation failed:', error.message)
 *   }
 * }
 * ```
 */
export async function getPdfPageCountFromBuffer(buffer: Buffer): Promise<number> {
  try {
    // Direct import for server-side usage
    const { PDFDocument } = await import('pdf-lib')
    
    // Convert Buffer to Uint8Array for pdf-lib
    const uint8Array = new Uint8Array(buffer)
    
    // Load and parse PDF document
    const pdfDoc = await PDFDocument.load(uint8Array)
    
    // Return page count
    return pdfDoc.getPageCount()
  } catch (error) {
    if (error instanceof Error) {
      throw new PdfValidationError(
        `Failed to count PDF pages: ${error.message}`,
        error
      )
    }
    throw new PdfValidationError('Failed to count PDF pages: Unknown error')
  }
}

/**
 * Validate PDF page count against configured limits (client-side)
 * 
 * This function provides a complete validation result including whether
 * the PDF passes validation, the actual page count, and user-friendly
 * error messages explaining the limit rationale.
 * 
 * @param file - PDF file object from browser file input
 * @param maxPages - Maximum allowed pages (defaults to configured limit)
 * @returns Promise resolving to validation result
 * 
 * @example
 * ```typescript
 * const result = await validatePdfPageCount(file)
 * if (!result.isValid) {
 *   showError(result.error!)
 * } else {
 *   console.log(`PDF validation passed: ${result.pageCount} pages`)
 * }
 * ```
 */
export async function validatePdfPageCount(
  file: File,
  maxPages: number = UPLOAD_LIMITS.PDF_MAX_PAGES
): Promise<PdfPageCountResult> {
  try {
    const pageCount = await getPdfPageCountFromFile(file)
    
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
    if (error instanceof PdfValidationError) {
      return {
        isValid: false,
        pageCount: 0,
        error: `PDF validation failed: ${error.message}`
      }
    }
    
    return {
      isValid: false,
      pageCount: 0,
      error: 'PDF validation failed: Unable to process PDF file'
    }
  }
}

/**
 * Validate PDF page count from Buffer (server-side)
 * 
 * @param buffer - PDF data as Buffer
 * @param maxPages - Maximum allowed pages (defaults to configured limit)
 * @returns Promise resolving to validation result
 * 
 * @example
 * ```typescript
 * const result = await validatePdfPageCountFromBuffer(pdfBuffer)
 * if (!result.isValid) {
 *   return new NextResponse(result.error, { status: 400 })
 * }
 * ```
 */
export async function validatePdfPageCountFromBuffer(
  buffer: Buffer,
  maxPages: number = UPLOAD_LIMITS.PDF_MAX_PAGES
): Promise<PdfPageCountResult> {
  try {
    const pageCount = await getPdfPageCountFromBuffer(buffer)
    
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
    if (error instanceof PdfValidationError) {
      return {
        isValid: false,
        pageCount: 0,
        error: `PDF validation failed: ${error.message}`
      }
    }
    
    return {
      isValid: false,
      pageCount: 0,
      error: 'PDF validation failed: Unable to process PDF file'
    }
  }
}

/**
 * Utility function to create user-friendly page count validation error messages
 * 
 * This ensures consistent error messaging across the application.
 * 
 * @param actualPages - Actual number of pages in the PDF
 * @param maxPages - Maximum allowed pages
 * @returns Formatted error message
 */
export function createPageCountErrorMessage(
  actualPages: number,
  maxPages: number = UPLOAD_LIMITS.PDF_MAX_PAGES
): string {
  return `PDF has too many pages (${actualPages}). Maximum allowed: ${maxPages} pages. Page limits help ensure reasonable processing times for AI analysis.`
}

// Note: The current implementation uses pdf-lib for page counting and validation.
// MuPDF alternatives were evaluated but not implemented due to deployment constraints.