/**
 * Hybrid PDF Image Extractor Service
 * 
 * Implements a two-stage approach for PDF image extraction:
 * 1. Direct extraction of embedded images (fast, works for 40-60% of PDFs)
 * 2. WASM-based rendering fallback (slower but works for all PDFs)
 * 
 * This service is Vercel-compatible and avoids native dependencies.
 */

import { z } from 'zod'
import { createRequestLogger } from '@/lib/services/logger'
import { 
  pdfRegionExtractionOptionsSchema, 
  PdfRegionExtractionOptions,
  PdfRegionExtractionResult 
} from '@/lib/services/pdf-image-extractor-types'
import { PdfImageDirectExtractor } from '@/lib/services/pdf-image-direct-extractor'
import { PdfRendererWasm } from '@/lib/services/pdf-renderer-wasm'
import { extractPdfRegionAndUploadVercel } from '@/lib/services/pdf-image-extractor-vercel'

/**
 * Extraction method used
 */
export type ExtractionMethod = 'direct' | 'wasm' | 'napi-canvas'

/**
 * Extended result with method information
 */
export interface HybridExtractionResult extends PdfRegionExtractionResult {
  method: ExtractionMethod
  fallbackReason?: string
}

/**
 * Configuration for extraction methods
 */
export interface ExtractionConfig {
  useDirectExtraction?: boolean
  useNapiCanvas?: boolean
  useWasmFallback?: boolean
}

/**
 * Hybrid PDF image extractor that tries multiple methods
 */
export class PdfImageExtractorHybrid {
  private logger = createRequestLogger('/services/pdf-image-extractor-hybrid')
  private directExtractor = new PdfImageDirectExtractor()
  private wasmRenderer = new PdfRendererWasm()
  
  // Feature flags for method selection
  private useDirectExtraction: boolean
  private useNapiCanvas: boolean
  private useWasmFallback: boolean
  
  constructor(config?: ExtractionConfig) {
    // Use configuration if provided, otherwise fall back to environment variables
    this.useDirectExtraction = config?.useDirectExtraction ?? process.env.PDF_DIRECT_EXTRACTION !== 'false'
    this.useNapiCanvas = config?.useNapiCanvas ?? process.env.PDF_USE_NAPI_CANVAS === 'true'
    this.useWasmFallback = config?.useWasmFallback ?? process.env.PDF_USE_WASM_FALLBACK !== 'false'
  }

  /**
   * Extract a PDF region using the best available method
   */
  async extractPdfRegionAndUpload(
    opts: PdfRegionExtractionOptions
  ): Promise<HybridExtractionResult> {
    const options = pdfRegionExtractionOptionsSchema.parse(opts)
    const correlationId = `${options.documentId}-page${options.pageNumber}-${options.elementId}`
    
    this.logger.info('Starting hybrid PDF extraction', { 
      pageNumber: options.pageNumber, 
      elementId: options.elementId,
      methods: {
        direct: this.useDirectExtraction,
        napiCanvas: this.useNapiCanvas,
        wasm: this.useWasmFallback
      }
    })

    // Method 1: Try direct extraction first (fastest)
    if (this.useDirectExtraction) {
      try {
        this.logger.info('Attempting direct image extraction', { correlationId })
        const result = await this.directExtractor.extractPdfRegionAndUpload(options)
        
        this.logger.info('Direct extraction successful', { 
          correlationId,
          size: result.size,
          dimensions: `${result.width}x${result.height}`
        })
        
        return {
          ...result,
          method: 'direct'
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        this.logger.warn('Direct extraction failed, trying fallback', { 
          correlationId,
          error: errorMessage
        })
        
        // Continue to fallback methods
        if (!this.useNapiCanvas && !this.useWasmFallback) {
          throw new Error(`Direct extraction failed and no fallback methods enabled: ${errorMessage}`)
        }
      }
    }

    // Method 2: Try @napi-rs/canvas (Vercel-compatible, good performance)
    if (this.useNapiCanvas) {
      try {
        this.logger.info('Attempting @napi-rs/canvas extraction', { correlationId })
        const result = await extractPdfRegionAndUploadVercel(options)
        
        this.logger.info('@napi-rs/canvas extraction successful', { 
          correlationId,
          size: result.size,
          dimensions: `${result.width}x${result.height}`
        })
        
        const hybridResult: HybridExtractionResult = {
          ...result,
          method: 'napi-canvas'
        }
        if (this.useDirectExtraction) {
          hybridResult.fallbackReason = 'No embedded images found'
        }
        return hybridResult
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        this.logger.warn('@napi-rs/canvas extraction failed', { 
          correlationId,
          error: errorMessage
        })
        
        if (!this.useWasmFallback) {
          throw new Error(`@napi-rs/canvas extraction failed and WASM fallback disabled: ${errorMessage}`)
        }
      }
    }

    // Method 3: WASM renderer fallback (slowest but most compatible)
    if (this.useWasmFallback) {
      try {
        this.logger.info('Using WASM renderer fallback', { correlationId })
        const result = await this.wasmRenderer.extractPdfRegionAndUpload(options)
        
        this.logger.info('WASM extraction successful', { 
          correlationId,
          size: result.size,
          dimensions: `${result.width}x${result.height}`
        })
        
        return {
          ...result,
          method: 'wasm',
          fallbackReason: 'Previous methods failed'
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        this.logger.error('All extraction methods failed', { 
          correlationId,
          error: errorMessage
        })
        
        throw new Error(`All PDF extraction methods failed. Last error: ${errorMessage}`)
      }
    }

    // Should not reach here
    throw new Error('No PDF extraction methods enabled')
  }

  /**
   * Get extraction statistics for monitoring
   */
  getStats() {
    return {
      methodsEnabled: {
        direct: this.useDirectExtraction,
        napiCanvas: this.useNapiCanvas,
        wasm: this.useWasmFallback
      },
      environment: {
        isVercel: process.env.VERCEL === '1',
        nodeVersion: process.version
      }
    }
  }
}

/**
 * Convenience function that matches the existing interface
 * This is the recommended entry point for PDF region extraction
 */
export async function extractPdfRegionAndUploadHybrid(
  opts: PdfRegionExtractionOptions
): Promise<HybridExtractionResult> {
  const extractor = new PdfImageExtractorHybrid()
  return extractor.extractPdfRegionAndUpload(opts)
}

/**
 * Drop-in replacement for the original function
 * Returns standard result without method information for backward compatibility
 */
export async function extractPdfRegionAndUpload(
  opts: PdfRegionExtractionOptions
): Promise<PdfRegionExtractionResult> {
  const result = await extractPdfRegionAndUploadHybrid(opts)
  // Strip the method information for backward compatibility
  const { method, fallbackReason, ...standardResult } = result
  return standardResult
}