/**
 * Test endpoint for WASM PDF rendering on Vercel
 * 
 * Tests the pure JS PDF processing implementation to verify:
 * - No NODE_MODULE_VERSION errors
 * - WASM loading and execution
 * - Bundle size and cold start performance
 * - Memory usage within Vercel limits
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRequestLogger } from '@/lib/services/logger'
import { PdfImageExtractorHybrid } from '@/lib/services/pdf-image-extractor-hybrid'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

const logger = createRequestLogger('/api/test-pdf-wasm')

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const correlationId = `test-wasm-${Date.now()}`
  
  logger.info('Starting WASM PDF test', { correlationId })
  
  try {
    // For testing, we need to ensure a document exists that we can upload assets to
    // In a real scenario, this would be handled by the upload flow creating the document first
    
    // Get test configuration from request
    const body = await request.json()
    const { 
      testType = 'simple', // 'simple' | 'bbox' | 'performance'
      method = 'auto', // 'direct' | 'napi' | 'wasm' | 'auto'
      documentId = randomUUID() // Allow passing a documentId for testing
    } = body
    
    // Configure extraction methods without mutating process.env
    const extractionConfig = {
      useDirectExtraction: method === 'direct' || method === 'auto',
      useNapiCanvas: method === 'napi' || method === 'auto',
      useWasmFallback: method === 'wasm' || method === 'auto'
    }
    
    // Create extractor with specific configuration
    const extractor = new PdfImageExtractorHybrid(extractionConfig)
    
    // Load test PDF
    const testPdfPath = join(process.cwd(), 'test-data/Bounding Box Test Document.pdf')
    const pdfBuffer = await readFile(testPdfPath)
    
    logger.info('Loaded test PDF', { 
      size: pdfBuffer.length,
      method,
      testType 
    })
    
    // Test bounding box
    const testBbox = {
      x1: 0.1,
      y1: 0.1,
      x2: 0.4,
      y2: 0.4
    }
    
    // Extract region
    const extractStart = Date.now()
    const result = await extractor.extractPdfRegionAndUpload({
      pdfBuffer,
      pageNumber: 1,
      bbox: testBbox,
      documentId,
      elementId: 'test-element',
      outputFormat: 'png',
      quality: 0.95,
      scale: 2
    })
    const extractDuration = Date.now() - extractStart
    
    // Get memory usage
    const memoryUsage = process.memoryUsage()
    const memoryMB = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024)
    }
    
    // Calculate cold start time (approximate)
    const totalDuration = Date.now() - startTime
    const coldStartApprox = totalDuration - extractDuration
    
    const response = {
      success: true,
      correlationId,
      method,
      testType,
      result: {
        storagePath: result.storagePath,
        width: result.width,
        height: result.height,
        size: result.size,
        method: result.method,
        fallbackReason: result.fallbackReason
      },
      performance: {
        totalDuration,
        extractDuration,
        coldStartApprox,
        memoryMB
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        isVercel: !!process.env.VERCEL
      }
    }
    
    logger.info('WASM PDF test completed', response)
    
    return NextResponse.json(response)
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    
    logger.error('WASM PDF test failed', { 
      error: errorMessage,
      stack: errorStack,
      correlationId 
    })
    
    // Check for specific error types
    const isNodeModuleError = errorMessage.includes('NODE_MODULE_VERSION')
    const isWasmError = errorMessage.includes('WebAssembly') || errorMessage.includes('wasm')
    const isMemoryError = errorMessage.includes('memory') || errorMessage.includes('heap')
    
    return NextResponse.json({
      success: false,
      correlationId,
      error: errorMessage,
      errorType: {
        isNodeModuleError,
        isWasmError,
        isMemoryError
      },
      duration: Date.now() - startTime
    }, { status: 500 })
  }
}

// GET endpoint for basic health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/test-pdf-wasm',
    methods: ['direct', 'napi', 'wasm', 'auto'],
    testTypes: ['simple', 'bbox', 'performance']
  })
}