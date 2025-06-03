import { pdfToPng } from 'pdf-to-png-converter';
import { readFileSync } from 'fs';

export interface ComparisonResult {
  pdfToPngConverter: {
    success: boolean;
    images?: string[];
    error?: string;
    pageCount?: number;
    config?: string;
  };
}

/**
 * Test conversion with pdf-to-png-converter for quality comparison
 * This is temporary code for migration assessment
 */
export async function testPdfToPngConverter(pdfPath: string): Promise<ComparisonResult> {
  try {
    const pdfBuffer = readFileSync(pdfPath);
    
    // Convert using pdf-to-png-converter with multiple configuration attempts
    let pngPages;
    let config = 'default';
    
    try {
      // First attempt with default high-quality settings
      pngPages = await pdfToPng(pdfBuffer, {
        outputType: 'base64',
        strictPagination: false,
        viewportScale: 2.0, // High resolution equivalent to pdf2pic density: 200
        outputFolderPath: undefined // In-memory conversion
      });
    } catch (highResError) {
      console.warn('High-resolution conversion failed, trying lower resolution:', highResError.message);
      
      try {
        // Fallback to lower resolution
        pngPages = await pdfToPng(pdfBuffer, {
          outputType: 'base64',
          strictPagination: false,
          viewportScale: 1.0, // Lower resolution fallback
          outputFolderPath: undefined
        });
        config = 'lowres-fallback';
      } catch (lowResError) {
        console.warn('Low-resolution conversion also failed, trying minimal settings:', lowResError.message);
        
        // Last fallback with minimal options
        pngPages = await pdfToPng(pdfBuffer, {
          outputType: 'base64'
        });
        config = 'minimal-fallback';
      }
    }

    const base64Images = pngPages.map(page => page.content);

    return {
      pdfToPngConverter: {
        success: true,
        images: base64Images,
        pageCount: base64Images.length,
        config: config
      }
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown conversion error';
    
    // Check for specific error types to provide better feedback
    let detailedError = errorMessage;
    if (errorMessage.includes('paintChar') || errorMessage.includes('String`, `Path`')) {
      detailedError = `Font rendering error: ${errorMessage}. This academic PDF may use fonts/glyphs that pdf-to-png-converter cannot handle properly.`;
    } else if (errorMessage.includes('canvas') || errorMessage.includes('Canvas')) {
      detailedError = `Canvas rendering error: ${errorMessage}. This may indicate compatibility issues with the native canvas dependency.`;
    }
    
    return {
      pdfToPngConverter: {
        success: false,
        error: `pdf-to-png-converter failed: ${detailedError}`
      }
    };
  }
}