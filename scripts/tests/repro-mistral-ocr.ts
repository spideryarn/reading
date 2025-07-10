import path from 'node:path'
import fs from 'node:fs/promises'
import dotenv from 'dotenv'

// Load local env vars so MISTRAL_API_KEY is available when running standalone
dotenv.config({ path: '.env.local' })
import { processWithMistralOcr } from '../../lib/services/mistral-ocr-pdf-processor'

/**
 * Run Mistral OCR processor against a local PDF to reproduce hang/timeout issues.
 * Usage:
 *   dotenv -e .env.local -- npx tsx scripts/tests/repro-mistral-ocr.ts [PDF_PATH]
 */

async function main () {
  const pdfPath = process.argv[2] || 'static/examples/2009_Book_TheElementsOfStatisticalLearning_single_page_image.pdf'
  const abs = path.resolve(pdfPath)
  console.log('Loading', abs)
  const buf = await fs.readFile(abs)
  const correlationId = `repro-${Date.now().toString(36)}`

  const start = Date.now()
  const res = await processWithMistralOcr({
    pdfBuffer: buf,
    fileName: path.basename(abs),
    correlationId,
    singlePageOnly: true,
    documentId: '00000000-0000-0000-0000-000000000000',
    imageExtractionEnabled: false
  })
  const ms = Date.now() - start
  console.log(`✅ Completed in ${ms} ms, estimated tokens ${res.usage.totalTokens}`)
  console.log('HTML length', res.html.length)
  console.log('Images extracted', res.extractedImages.length)
}

main().catch((err) => {
  console.error('❌ failed:', err)
  process.exit(1)
}) 