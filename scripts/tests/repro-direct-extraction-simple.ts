#!/usr/bin/env tsx
/**
 * Simple test for direct PDF image extraction
 * 
 * This script tests the core extraction logic without dependencies
 * 
 * Usage:
 *   npx tsx scripts/tests/repro-direct-extraction-simple.ts
 */

import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { PDFDocument, PDFName, PDFRawStream, PDFDict } from 'pdf-lib'

interface ExtractedImage {
  data: Uint8Array
  format: 'jpeg' | 'png' | 'unknown'
  pageIndex: number
  objectName: string
  width?: number
  height?: number
}

async function extractEmbeddedImages(pdfBuffer: Buffer): Promise<ExtractedImage[]> {
  const images: ExtractedImage[] = []
  
  // Load PDF
  const pdfBytes = new Uint8Array(pdfBuffer)
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const pages = pdfDoc.getPages()
  
  console.log(`PDF has ${pages.length} pages\n`)
  
  // Check each page
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const page = pages[pageIndex]
    const { width, height } = page.getSize()
    console.log(`Page ${pageIndex + 1}: ${width.toFixed(0)}×${height.toFixed(0)} pts`)
    
    const resources = page.node.Resources()
    if (!resources) {
      console.log('  No resources found')
      continue
    }
    
    const xObjects = resources.lookup(PDFName.of('XObject'))
    if (!xObjects || !(xObjects instanceof PDFDict)) {
      console.log('  No XObjects found')
      continue
    }
    
    // Count XObjects
    const entries = xObjects.entries()
    console.log(`  Found ${entries.length} XObjects`)
    
    // Process each XObject
    for (const [nameObj, ref] of entries) {
      try {
        const xObject = page.node.context.lookup(ref)
        if (xObject instanceof PDFRawStream) {
          const subtype = xObject.dict.lookup(PDFName.of('Subtype'))
          console.log(`    ${nameObj.asString()}: ${subtype?.toString() || 'unknown'}`)
          
          if (subtype === PDFName.of('Image')) {
            // Extract image details
            const filter = xObject.dict.lookup(PDFName.of('Filter'))
            const width = xObject.dict.lookup(PDFName.of('Width'))
            const height = xObject.dict.lookup(PDFName.of('Height'))
            const colorSpace = xObject.dict.lookup(PDFName.of('ColorSpace'))
            const bitsPerComponent = xObject.dict.lookup(PDFName.of('BitsPerComponent'))
            
            let format: ExtractedImage['format'] = 'unknown'
            if (filter === PDFName.of('DCTDecode')) {
              format = 'jpeg'
            } else if (filter === PDFName.of('FlateDecode')) {
              format = 'png' // Simplified - could be other formats
            }
            
            console.log(`      Type: ${format}`)
            console.log(`      Dimensions: ${width}×${height}`)
            console.log(`      Filter: ${filter?.toString() || 'none'}`)
            console.log(`      ColorSpace: ${colorSpace?.toString() || 'unknown'}`)
            console.log(`      BitsPerComponent: ${bitsPerComponent || 'unknown'}`)
            console.log(`      Data size: ${xObject.contents.length} bytes`)
            
            images.push({
              data: xObject.contents,
              format,
              pageIndex,
              objectName: nameObj.asString(),
              width: typeof width === 'number' ? width : undefined,
              height: typeof height === 'number' ? height : undefined
            })
          }
        }
      } catch (err) {
        console.log(`    Error processing ${nameObj.asString()}: ${err}`)
      }
    }
  }
  
  return images
}

async function testPdfAnalysis() {
  console.log('🔍 Direct PDF Image Extraction Test\n')
  
  // Create a simple test PDF with an embedded image
  console.log('Creating test PDF with embedded image...\n')
  
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([612, 792]) // Letter size
  
  // Try to embed a simple test image (1x1 red pixel JPEG)
  const redPixelJpeg = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
    0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
    0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
    0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
    0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0xFF, 0xC4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00,
    0x7F, 0x20, 0xFF, 0xD9
  ])
  
  try {
    const jpegImage = await pdfDoc.embedJpg(redPixelJpeg)
    page.drawImage(jpegImage, {
      x: 100,
      y: 500,
      width: 200,
      height: 200,
    })
    console.log('✓ Successfully embedded test JPEG image\n')
  } catch (err) {
    console.log('⚠️  Could not embed test image:', err)
  }
  
  // Add some text
  page.drawText('Test PDF with embedded image', {
    x: 100,
    y: 450,
    size: 20,
  })
  
  // Save the test PDF
  const testPdfBytes = await pdfDoc.save()
  const testPdfPath = join(process.cwd(), 'test-direct-extraction.pdf')
  await writeFile(testPdfPath, testPdfBytes)
  console.log(`Saved test PDF to: ${testPdfPath}\n`)
  
  // Now analyze it
  console.log('Analyzing test PDF for embedded images...\n')
  const extractedImages = await extractEmbeddedImages(Buffer.from(testPdfBytes))
  
  console.log(`\n📊 Extraction Results:`)
  console.log(`Total embedded images found: ${extractedImages.length}`)
  
  if (extractedImages.length > 0) {
    console.log('\n✅ Direct extraction is possible for this PDF!')
    
    // Save extracted images
    for (let i = 0; i < extractedImages.length; i++) {
      const img = extractedImages[i]
      const filename = `extracted-${i}-${img.objectName}.${img.format}`
      await writeFile(filename, img.data)
      console.log(`  Saved: ${filename} (${img.data.length} bytes)`)
    }
  } else {
    console.log('\n❌ No embedded images found - would need WASM rendering')
  }
  
  // Test with a real PDF if available
  console.log('\n\nLooking for real PDFs to test...\n')
  
  const testPaths = [
    'scripts/tests/fixtures/sample-with-figures.pdf',
    'docs/fixtures/sample-academic-paper.pdf',
    'test.pdf'
  ]
  
  for (const path of testPaths) {
    try {
      const fullPath = join(process.cwd(), path)
      const pdfBuffer = await readFile(fullPath)
      console.log(`\nAnalyzing: ${path}`)
      console.log('='.repeat(50))
      
      const images = await extractEmbeddedImages(pdfBuffer)
      console.log(`\nTotal embedded images: ${images.length}`)
      
      if (images.length > 0) {
        console.log('✅ This PDF has embedded images - suitable for direct extraction!')
        
        // Show formats
        const formats = images.reduce((acc, img) => {
          acc[img.format] = (acc[img.format] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        
        console.log('\nImage formats:')
        Object.entries(formats).forEach(([format, count]) => {
          console.log(`  ${format}: ${count}`)
        })
        
        // Show sizes
        const totalSize = images.reduce((sum, img) => sum + img.data.length, 0)
        console.log(`\nTotal image data: ${(totalSize / 1024 / 1024).toFixed(2)} MB`)
      } else {
        console.log('❌ No embedded images - needs rendering')
      }
      
    } catch (err) {
      // File not found, continue
    }
  }
}

// Run the test
testPdfAnalysis().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})