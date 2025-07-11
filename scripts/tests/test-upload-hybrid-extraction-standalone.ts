#!/usr/bin/env npx tsx
/**
 * Standalone test script for hybrid PDF extraction
 * 
 * This version uses a service role Supabase client to bypass the need for
 * Next.js request context (cookies). It simulates the PDF processing directly
 * without going through the upload API endpoint.
 */

import { readFile } from 'fs/promises'
import { join } from 'path'
import { processWithMistralOcr } from '@/lib/services/mistral-ocr-pdf-processor'
import { generateCorrelationId, createRequestLogger } from '@/lib/services/logger'
import { randomUUID } from 'crypto'
import { createClient } from '@supabase/supabase-js'

// Mock the createClient import to use service role
const originalModule = await import('@/lib/supabase/server')
const mockCreateClient = async () => {
  // Create a service role client that doesn't need cookies
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration in environment')
  }
  
  return createClient(supabaseUrl, serviceRoleKey)
}

// Override the module
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Module = require('module')
const originalRequire = Module.prototype.require
Module.prototype.require = function(id: string, ...args: any[]) {
  if (id === '@/lib/supabase/server') {
    return { createClient: mockCreateClient }
  }
  return originalRequire.apply(this, [id, ...args])
}

// Also override the storage service to bypass cookies
const storageModule = await import('@/lib/services/storage')
const originalUploadImageAsset = storageModule.uploadImageAsset

// Mock uploadImageAsset to skip actual upload
const mockUploadImageAsset = async (
  buffer: Buffer,
  documentId: string,
  elementId: string,
  format: 'png' | 'jpeg'
) => {
  const logger = createRequestLogger('/test/mock-storage')
  logger.info('Mock upload called', { 
    documentId, 
    elementId, 
    size: buffer.length,
    format 
  })
  
  // Return mock result
  return {
    path: `${documentId}/extracted-images/${elementId}.${format}`,
    fullPath: `documents/${documentId}/extracted-images/${elementId}.${format}`,
    size: buffer.length,
    mimeType: `image/${format}`
  }
}

// Patch the storage module
Object.defineProperty(storageModule, 'uploadImageAsset', {
  value: mockUploadImageAsset,
  writable: true,
  enumerable: true,
  configurable: true
})

async function main() {
  console.log('=== Standalone Hybrid Extraction Test ===\n')
  
  const testPdfPath = join(process.cwd(), 'static/examples/2009_Book_TheElementsOfStatisticalLearning_single_page_image.pdf')
  const correlationId = generateCorrelationId()
  
  console.log('Test configuration:')
  console.log('- PDF:', testPdfPath)
  console.log('- Pipeline: v3 (Mistral OCR)')
  console.log('- Extraction method: auto (Hybrid)')
  console.log('- Correlation ID:', correlationId)
  console.log('- Storage: Mocked (no actual upload)')
  console.log('')
  
  try {
    // Load the test PDF
    console.log('Loading PDF...')
    const pdfBuffer = await readFile(testPdfPath)
    console.log(`PDF loaded: ${pdfBuffer.length} bytes`)
    console.log('')
    
    // Test direct hybrid extraction
    console.log('Testing hybrid extractor directly...')
    const { extractPdfRegionAndUpload } = await import('@/lib/services/pdf-image-extractor-hybrid')
    
    const testBbox = {
      x1: 0.1,
      y1: 0.1,
      x2: 0.4,
      y2: 0.4
    }
    
    try {
      const result = await extractPdfRegionAndUpload({
        pdfBuffer,
        pageNumber: 1,
        bbox: testBbox,
        documentId: randomUUID(),
        elementId: 'test-element',
        outputFormat: 'png',
        quality: 0.95,
        scale: 2
      })
      
      console.log('\n✅ Direct extraction succeeded!')
      console.log('Result:', result)
    } catch (error) {
      console.error('\n❌ Direct extraction failed:')
      console.error('Message:', error instanceof Error ? error.message : String(error))
      
      if (error instanceof Error && error.stack) {
        console.error('\nStack trace:')
        console.error(error.stack)
      }
      
      // Check if it's the native binding error
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('native binding') || errorMessage.includes('NODE_MODULE_VERSION')) {
        console.error('\n⚠️  This is the expected native binding error!')
        console.error('The hybrid extractor is attempting to load a native module.')
      }
    }
    
  } catch (error) {
    console.error('\n❌ Test setup failed:')
    console.error('Message:', error instanceof Error ? error.message : String(error))
    
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:')
      console.error(error.stack)
    }
    
    process.exit(1)
  }
}

// Run the test
main().catch(console.error)