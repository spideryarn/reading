import pdf2pic from 'pdf2pic';
import { writeFileSync, unlinkSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

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
  let tempPdfPath: string | null = null;
  let tempOutputDir: string | null = null;

  try {
    // Create temporary file for PDF input
    const tempDir = tmpdir();
    const timestamp = Date.now();
    tempPdfPath = join(tempDir, `temp-pdf-${timestamp}.pdf`);
    tempOutputDir = join(tempDir, `temp-output-${timestamp}`);
    
    // Write PDF buffer to temporary file
    writeFileSync(tempPdfPath, pdfBuffer);
    mkdirSync(tempOutputDir, { recursive: true });

    // Configure pdf2pic with high resolution for academic content
    const convert = pdf2pic.fromPath(tempPdfPath, {
      density: 200, // High resolution (DPI)
      saveFilename: 'page',
      savePath: tempOutputDir,
      format: 'png',
      width: 1600, // High width for academic content clarity
      height: 2400 // Proportional height for A4-like documents
    });

    // Convert all pages
    const results = await convert.bulk(-1, { responseType: 'image' });

    if (!results || results.length === 0) {
      return {
        success: false,
        error: 'PDF conversion resulted in no pages'
      };
    }

    // Convert image files to base64
    const base64Images: string[] = [];
    for (const result of results) {
      if (result && result.path) {
        const imageBuffer = readFileSync(result.path);
        const base64String = imageBuffer.toString('base64');
        base64Images.push(base64String);
        
        // Clean up individual image file
        try {
          unlinkSync(result.path);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }

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
  } finally {
    // Clean up temporary files
    if (tempPdfPath) {
      try {
        unlinkSync(tempPdfPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    if (tempOutputDir) {
      try {
        unlinkSync(tempOutputDir);
      } catch (e) {
        // Ignore cleanup errors (directory might not be empty)
      }
    }
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