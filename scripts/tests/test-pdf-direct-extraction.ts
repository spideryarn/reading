#!/usr/bin/env tsx

/**
 * Test script for direct PDF image extraction
 * 
 * Run with: npx tsx scripts/tests/test-pdf-direct-extraction.ts [pdf-file]
 */

import { readFile } from 'fs/promises'
import { resolve } from 'path'
import { assessDirectExtractionViability, extractEmbeddedImages } from '@/lib/services/pdf-direct-image-extractor'

async function main() {
  const pdfPath = process.argv[2] || 'static/examples/2009_Book_TheElementsOfStatisticalLearning_single_page_image.pdf'
  const fullPath = resolve(pdfPath)
  
  console.log('Testing PDF direct extraction on:', fullPath)
  console.log('=' .repeat(60))
  
  try {
    const pdfBuffer = await readFile(fullPath)
    console.log('PDF size:', (pdfBuffer.length / 1024 / 1024).toFixed(2), 'MB')
    
    // First, assess viability
    console.log('\n1. Assessing direct extraction viability...')
    const viability = await assessDirectExtractionViability(pdfBuffer)
    
    console.log('\nViability Assessment:')
    console.log(`- Score: ${viability.viabilityScore}% (${viability.pagesWithImages}/${viability.totalPages} pages have images)`)
    console.log(`- Total embedded images found: ${viability.totalImages}`)
    console.log('- Image formats:', viability.imageFormats)
    
    if (viability.viabilityScore === 0) {
      console.log('\n❌ This PDF has no embedded images. Direct extraction not possible.')
      console.log('   Would need to use WASM rendering fallback.')
      return
    }
    
    // Extract images
    console.log('\n2. Extracting embedded images...')
    const result = await extractEmbeddedImages(pdfBuffer, {
      includePositions: true
    })
    
    console.log('\nExtraction Results:')
    console.log(`- Success: ${result.success}`)
    console.log(`- Method: ${result.method}`)
    console.log(`- Images extracted: ${result.extractedCount}/${result.totalImagesFound}`)
    
    if (result.errors.length > 0) {
      console.log('- Errors:', result.errors)
    }
    
    // Show details for each extracted image
    console.log('\nExtracted Images:')
    result.images.forEach((img, idx) => {
      console.log(`\n  Image ${idx + 1}:`)
      console.log(`  - Page: ${img.pageNumber}`)
      console.log(`  - Format: ${img.format}`)
      console.log(`  - Dimensions: ${img.width}x${img.height}`)
      console.log(`  - Data size: ${(img.data.length / 1024).toFixed(2)} KB`)
      
      if (img.normalizedBbox) {
        console.log(`  - Position: (${img.normalizedBbox.x1.toFixed(3)}, ${img.normalizedBbox.y1.toFixed(3)}) to (${img.normalizedBbox.x2.toFixed(3)}, ${img.normalizedBbox.y2.toFixed(3)})`)
      }
    })
    
    // Save first image as example (if any)
    if (result.images.length > 0) {
      const firstImage = result.images[0]
      if (firstImage.format === 'jpeg') {
        const outputPath = 'test-extracted-image.jpg'
        const { writeFile } = await import('fs/promises')
        await writeFile(outputPath, firstImage.data)
        console.log(`\n✅ First image saved to: ${outputPath}`)
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  }
}

main().catch(console.error)