import path from 'node:path'
import fs from 'node:fs/promises'
import { renderPageAsImage } from 'unpdf'

/**
 * Minimal CLI script to reproduce the pdf→image rendering path that currently
 * fails during the Upload PDF API route.  Run with:
 *   npx tsx scripts/tests/repro-page-render.ts
 */

async function main () {
  // Sample PDF bundled with the repo – small single-page academic excerpt
  const samplePdf = path.resolve(
    'static/examples/2009_Book_TheElementsOfStatisticalLearning_single_page_image.pdf'
  )

  const pdfBuf = await fs.readFile(samplePdf)

  // Attempt to render page 1 exactly the same way as the server-side extractor
  const imageBuf = await renderPageAsImage(new Uint8Array(pdfBuf), 1, {
    scale: 1,
    // Use @napi-rs/canvas which provides Path2D implementation required by pdf.js
    canvasImport: (() => import('@napi-rs/canvas')) as any
  })

  console.log('✅ page rendered – bytes:', imageBuf.byteLength)
}

main().catch((err) => {
  console.error('❌ repro failed:', err)
  process.exit(1)
}) 