#!/usr/bin/env tsx
/**
 * Test direct PDF image extraction with real PDFs
 * 
 * This script tests the new pure JavaScript direct image extraction approach
 * and compares it with the current skia-canvas implementation.
 * 
 * Usage:
 *   npx tsx scripts/tests/repro-direct-extraction-test.ts [pdf-file]
 */

import { readFile } from 'fs/promises'
import { join } from 'path'
import { PdfImageDirectExtractor } from '@/lib/services/pdf-image-direct-extractor'
import type { BoundingBox } from '@/lib/services/html-fragment-processor'

// Mock the storage functions for testing
const mockUploads: Array<{ filename: string; size: number; format: string }> = []

// Override the storage functions
jest.mock('@/lib/services/storage', () => ({
  uploadImageAsset: jest.fn(async (blob: Blob, docId: string, filename: string, mimeType: string) => {
    const size = blob.size
    mockUploads.push({ filename, size, format: mimeType })
    console.log(`  📤 Mock upload: ${filename} (${size} bytes, ${mimeType})`)
    
    return {
      path: `documents/${docId}/${filename}`,
      size,
      id: 'mock-id'
    }
  }),
  getSignedDocumentUrl: jest.fn(async (path: string) => {
    return `https://mock-storage.com/${path}?signed=true`
  })
}))

async function testDirectExtraction(pdfPath: string) {
  console.log('🔍 Testing Direct PDF Image Extraction\n')
  console.log(`PDF file: ${pdfPath}\n`)
  
  try {
    // Read PDF file
    const pdfBuffer = await readFile(pdfPath)
    console.log(`✓ Loaded PDF (${(pdfBuffer.length / 1024).toFixed(1)} KB)\n`)
    
    // Create extractor instance
    const extractor = new PdfImageDirectExtractor()
    
    // Test extraction with various bounding boxes
    const testCases = [
      {
        name: 'Full page extraction',
        bbox: { x1: 0, y1: 0, x2: 1, y2: 1 } as BoundingBox,
        elementId: 'full-page'
      },
      {
        name: 'Top half extraction',
        bbox: { x1: 0, y1: 0, x2: 1, y2: 0.5 } as BoundingBox,
        elementId: 'top-half'
      },
      {
        name: 'Center region',
        bbox: { x1: 0.25, y1: 0.25, x2: 0.75, y2: 0.75 } as BoundingBox,
        elementId: 'center'
      },
      {
        name: 'Bottom third',
        bbox: { x1: 0, y1: 0.67, x2: 1, y2: 1 } as BoundingBox,
        elementId: 'bottom-third'
      }
    ]
    
    console.log('📊 Testing different extraction regions:\n')
    
    let successCount = 0
    let failureCount = 0
    
    for (const testCase of testCases) {
      console.log(`Test: ${testCase.name}`)
      console.log(`  Bounding box: [${testCase.bbox.x1}, ${testCase.bbox.y1}] → [${testCase.bbox.x2}, ${testCase.bbox.y2}]`)
      
      try {
        const result = await extractor.extractPdfRegionAndUpload({
          pdfBuffer,
          documentId: 'test-doc-id',
          pageNumber: 1,
          elementId: testCase.elementId,
          bbox: testCase.bbox,
          outputFormat: 'png',
          quality: 0.95,
          scale: 2
        })
        
        console.log(`  ✅ Success!`)
        console.log(`     Dimensions: ${result.width}×${result.height}`)
        console.log(`     Size: ${(result.size / 1024).toFixed(1)} KB`)
        console.log(`     Path: ${result.storagePath}`)
        successCount++
        
      } catch (error) {
        console.log(`  ❌ Failed: ${error instanceof Error ? error.message : String(error)}`)
        failureCount++
      }
      
      console.log()
    }
    
    // Summary
    console.log('📈 Summary:')
    console.log(`  Total tests: ${testCases.length}`)
    console.log(`  Successful: ${successCount}`)
    console.log(`  Failed: ${failureCount}`)
    console.log(`  Success rate: ${((successCount / testCases.length) * 100).toFixed(0)}%`)
    
    if (mockUploads.length > 0) {
      console.log('\n📦 Extracted images:')
      mockUploads.forEach(upload => {
        console.log(`  - ${upload.filename}: ${(upload.size / 1024).toFixed(1)} KB (${upload.format})`)
      })
    }
    
    // Analyze if direct extraction is suitable for this PDF
    console.log('\n🎯 Direct Extraction Suitability:')
    if (successCount === testCases.length) {
      console.log('  ✅ This PDF is IDEAL for direct extraction')
      console.log('  All regions were successfully extracted from embedded images')
    } else if (successCount > 0) {
      console.log('  ⚠️  This PDF is PARTIALLY suitable for direct extraction')
      console.log('  Some regions could be extracted, others may need rendering')
    } else {
      console.log('  ❌ This PDF is NOT suitable for direct extraction')
      console.log('  No embedded images found - requires WASM rendering fallback')
    }
    
  } catch (error) {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  }
}

// Run the test
async function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    // Try to find a test PDF
    const testPdfs = [
      'docs/fixtures/sample-academic-paper.pdf',
      'test-fixtures/pdf-with-images.pdf',
      'uploads/test.pdf'
    ]
    
    console.log('No PDF file specified. Looking for test PDFs...\n')
    
    for (const testPdf of testPdfs) {
      try {
        const fullPath = join(process.cwd(), testPdf)
        await readFile(fullPath)
        console.log(`Found test PDF: ${testPdf}\n`)
        await testDirectExtraction(fullPath)
        return
      } catch {
        // Continue looking
      }
    }
    
    console.log('Usage: npx tsx scripts/tests/repro-direct-extraction-test.ts <pdf-file>')
    console.log('\nNo test PDFs found. Please specify a PDF file.')
    process.exit(1)
  }
  
  await testDirectExtraction(args[0])
}

main().catch(err => {
  console.error('Unhandled error:', err)
  process.exit(1)
})