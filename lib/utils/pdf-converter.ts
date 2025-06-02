import { pdfToPng } from 'pdf-to-png-converter';

export interface PdfConversionResult {
  success: boolean;
  images?: string[];
  error?: string;
  pageCount?: number;
}

/**
 * Converts a PDF buffer to base64-encoded PNG images
 * Optimized for academic documents with high resolution
 */
export async function convertPdfToBase64Image(pdfBuffer: Buffer): Promise<PdfConversionResult> {
  try {
    // Convert PDF to PNG with high resolution for academic content
    const pngPages = await pdfToPng(pdfBuffer, {
      viewportScale: 2.0, // High resolution for academic content clarity
      outputType: 'base64'
    });

    if (!pngPages || pngPages.length === 0) {
      return {
        success: false,
        error: 'PDF conversion resulted in no pages'
      };
    }

    // Extract base64 strings from the conversion result
    const base64Images = pngPages.map((page) => {
      if (typeof page === 'string') {
        return page;
      }
      // Handle different possible return types from the library
      if (page && typeof page === 'object' && 'content' in page) {
        return (page as { content: string }).content;
      }
      throw new Error('Unexpected page format from PDF conversion');
    });

    return {
      success: true,
      images: base64Images,
      pageCount: base64Images.length
    };

  } catch (error) {
    // Handle various types of PDF conversion errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown PDF conversion error';
    
    // Provide more specific error messages for common issues
    if (errorMessage.includes('Invalid PDF')) {
      return {
        success: false,
        error: 'Invalid PDF file format'
      };
    }
    
    if (errorMessage.includes('Empty') || errorMessage.includes('size')) {
      return {
        success: false,
        error: 'PDF file is empty or corrupted'
      };
    }

    return {
      success: false,
      error: `PDF conversion failed: ${errorMessage}`
    };
  }
}

/**
 * Validates PDF buffer before conversion
 */
export function validatePdfBuffer(buffer: Buffer): { valid: boolean; error?: string } {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'PDF buffer is empty' };
  }

  // Check for PDF magic number at start of file
  const pdfHeader = buffer.subarray(0, 4).toString();
  if (!pdfHeader.startsWith('%PDF')) {
    return { valid: false, error: 'File is not a valid PDF' };
  }

  // Check for reasonable file size limits (2MB max for single-page constraint)
  const maxSize = 2 * 1024 * 1024; // 2MB
  if (buffer.length > maxSize) {
    return { valid: false, error: 'PDF file too large (max 2MB for single-page PDFs)' };
  }

  return { valid: true };
}