#!/usr/bin/env tsx
/**
 * Quick script to check whether Mistral OCR returns bounding-box coordinates
 * for a supplied PDF.
 *
 * Usage:
 *   npx tsx scripts/tests/test-mistral-bounding-boxes.ts <pdf-file>
 *
 * The script prints page-by-page summaries plus per-image coordinates (if any).
 */

// Load env vars so MISTRAL_API_KEY is available when running locally.
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import fs from 'fs/promises'
import path from 'path'
// eslint-disable-next-line import/no-relative-parent-imports
import { processWithMistralOcr } from '../../lib/services/mistral-ocr-pdf-processor'

interface ImageInfo {
  pageIndex: number
  imageId: string
  coords: string | 'missing'
}

async function testMistralBoundingBoxes(pdfPath: string) {
  console.log(`\n🚀 Testing Mistral OCR bounding-box extraction`)
  console.log(`PDF: ${pdfPath}\n`)

  const pdfBuffer = await fs.readFile(pdfPath)
  const fileName = path.basename(pdfPath)
  console.log(`📄 PDF size: ${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB`) // MiB

  const start = Date.now()
  const result = await processWithMistralOcr({
    pdfBuffer,
    fileName,
    correlationId: 'bbox-debug',
    singlePageOnly: false,
    documentId: 'debug-doc',
    imageExtractionEnabled: false // we only need coords
  })
  const ms = Date.now() - start

  console.log(`\n✅ Mistral response received in ${(ms / 1000).toFixed(1)}s`)

  const images: ImageInfo[] = []
  // rawResponse is untyped; cast to any to extract pages safely
  const pages = (result.rawResponse as any).pages ?? []

  ;(pages as any[]).forEach((page: any) => {
    page.images?.forEach((img: any) => {
      // Accept snake_case, camelCase, or annotation.bbox object
      const tlx = img.top_left_x ?? img.topLeftX ?? img.annotation?.bbox?.x1 ?? img.annotation?.bbox?.topLeftX
      const tly = img.top_left_y ?? img.topLeftY ?? img.annotation?.bbox?.y1 ?? img.annotation?.bbox?.topLeftY
      const brx = img.bottom_right_x ?? img.bottomRightX ?? img.annotation?.bbox?.x2 ?? img.annotation?.bbox?.bottomRightX
      const bry = img.bottom_right_y ?? img.annotation?.bbox?.y2 ?? img.annotation?.bbox?.bottomRightY ?? img.bottomRightY

      const hasAll = [tlx, tly, brx, bry].every(c => c != null)
      images.push({
        pageIndex: page.index,
        imageId: img.id,
        coords: hasAll ? `${tlx},${tly},${brx},${bry}` : 'missing'
      })
    })
  })

  const withBBox = images.filter(i => i.coords !== 'missing').length
  console.log(`\n📊 Pages: ${pages.length}`)
  console.log(`Images found: ${images.length}  |  with bbox: ${withBBox}`)

  images.forEach(info => {
    console.log(
      `  page ${info.pageIndex}  image ${info.imageId}  ` +
        (info.coords === 'missing' ? '⚠️  no bbox' : `bbox(${info.coords})`)
    )
  })

  if (withBBox === 0) {
    console.log('\n❌ No bounding boxes detected.')
    process.exitCode = 1
  } else {
    console.log('\n✅ Bounding boxes present.')
  }
}

async function main() {
  const fileArg = process.argv[2]
  if (!fileArg) {
    console.error('Usage: npx tsx scripts/tests/test-mistral-bounding-boxes.ts <pdf-file>')
    process.exit(1)
  }
  try {
    await fs.access(fileArg)
  } catch {
    console.error(`File not found: ${fileArg}`)
    process.exit(1)
  }
  await testMistralBoundingBoxes(fileArg)
}

if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main()
} 