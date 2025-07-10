#!/usr/bin/env tsx
/**
 * Test direct extraction with the bounding box test document
 */

import { readFile } from 'fs/promises'
import { join } from 'path'
import { PDFDocument, PDFName, PDFRawStream, PDFDict } from 'pdf-lib'

async function analyzeTestPdf() {
  const pdfPath = join(process.cwd(), 'test-data/Bounding Box Test Document.pdf')
  console.log('🔍 Analyzing Bounding Box Test Document\n')
  
  try {
    const pdfBuffer = await readFile(pdfPath)
    console.log(`Loaded PDF: ${(pdfBuffer.length / 1024).toFixed(1)} KB\n`)
    
    const pdfBytes = new Uint8Array(pdfBuffer)
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const pages = pdfDoc.getPages()
    
    console.log(`PDF Details:`)
    console.log(`- Pages: ${pages.length}`)
    console.log(`- Producer: ${pdfDoc.getProducer() || 'Unknown'}`)
    console.log(`- Creator: ${pdfDoc.getCreator() || 'Unknown'}\n`)
    
    let totalImages = 0
    
    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      const page = pages[pageIndex]
      const { width, height } = page.getSize()
      
      console.log(`Page ${pageIndex + 1}:`)
      console.log(`  Dimensions: ${width.toFixed(0)}×${height.toFixed(0)} pts`)
      
      const resources = page.node.Resources()
      if (!resources) {
        console.log('  No resources')
        continue
      }
      
      const xObjects = resources.lookup(PDFName.of('XObject'))
      if (!xObjects || !(xObjects instanceof PDFDict)) {
        console.log('  No XObjects')
        continue
      }
      
      const entries = xObjects.entries()
      console.log(`  XObjects: ${entries.length}`)
      
      let pageImages = 0
      
      for (const [nameObj, ref] of entries) {
        try {
          const xObject = page.node.context.lookup(ref)
          if (xObject instanceof PDFRawStream) {
            const subtype = xObject.dict.lookup(PDFName.of('Subtype'))
            
            if (subtype === PDFName.of('Image')) {
              pageImages++
              totalImages++
              
              const filter = xObject.dict.lookup(PDFName.of('Filter'))
              const width = xObject.dict.lookup(PDFName.of('Width'))
              const height = xObject.dict.lookup(PDFName.of('Height'))
              const colorSpace = xObject.dict.lookup(PDFName.of('ColorSpace'))
              
              console.log(`    ${nameObj.asString()}:`)
              console.log(`      Type: Image`)
              console.log(`      Dimensions: ${width}×${height}`)
              console.log(`      Filter: ${filter?.toString() || 'none'}`)
              console.log(`      Data size: ${(xObject.contents.length / 1024).toFixed(1)} KB`)
              
              // Determine format
              let format = 'unknown'
              if (filter === PDFName.of('DCTDecode')) {
                format = 'JPEG'
              } else if (filter === PDFName.of('FlateDecode')) {
                format = 'PNG/Flate'
              }
              console.log(`      Format: ${format}`)
            } else if (subtype === PDFName.of('Form')) {
              console.log(`    ${nameObj.asString()}: Form XObject`)
            }
          }
        } catch (err) {
          console.log(`    Error processing ${nameObj.asString()}: ${err}`)
        }
      }
      
      console.log(`  Embedded images on this page: ${pageImages}`)
      console.log()
    }
    
    console.log('📊 Summary:')
    console.log(`Total embedded images in PDF: ${totalImages}`)
    
    if (totalImages > 0) {
      console.log('\n✅ This PDF is suitable for direct extraction!')
      console.log('The embedded images can be extracted without rendering.')
    } else {
      console.log('\n❌ This PDF has no embedded images.')
      console.log('All graphics are vector-based and require rendering.')
    }
    
    // Additional analysis
    console.log('\n🔬 Additional Analysis:')
    
    // Check if it's a scanned PDF (usually has one large image per page)
    const avgImagesPerPage = totalImages / pages.length
    if (avgImagesPerPage >= 0.8 && totalImages > 0) {
      console.log('- Appears to be a scanned PDF (high image-to-page ratio)')
    }
    
    // Check content streams
    let hasContentStreams = false
    for (const page of pages) {
      const contents = page.node.Contents()
      if (contents) {
        hasContentStreams = true
        break
      }
    }
    
    if (hasContentStreams && totalImages === 0) {
      console.log('- Contains vector graphics/text (has content streams but no images)')
      console.log('- Will require WASM rendering for image extraction')
    }
    
  } catch (error) {
    console.error('Error analyzing PDF:', error)
  }
}

analyzeTestPdf().catch(console.error)