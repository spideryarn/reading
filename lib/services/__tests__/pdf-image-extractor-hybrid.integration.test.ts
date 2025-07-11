import { readFile } from 'fs/promises'
import { join } from 'path'
import { PdfImageExtractorHybrid } from '@/lib/services/pdf-image-extractor-hybrid'
import { PdfRegionExtractionOptions } from '@/lib/services/pdf-image-extractor-types'

// Stub storage-server functions to avoid external Supabase dependency.
// These simple stubs return deterministic fake responses but do not mock core extraction logic.
jest.mock('@/lib/services/storage-server', () => {
  return {
    uploadImageAssetServerSide: jest.fn(async (_data: Blob | Buffer, _docId: string, filename: string) => {
      return {
        path: `stub/${filename}`,
        fullPath: `stub/${filename}`,
        size: (_data as Buffer).length ?? 1024,
        mimeType: 'image/png',
      }
    }),
    getSignedUrlServerSide: jest.fn(async (path: string) => `https://example.com/${path}`),
  }
})

describe('PdfImageExtractorHybrid – real-world integration (storage stubbed)', () => {
  const pdfPath = join(process.cwd(), 'test-data/Bounding Box Test Document.pdf')
  let pdfBuffer: Buffer

  beforeAll(async () => {
    pdfBuffer = await readFile(pdfPath)
  })

  it('extracts a region using the auto strategy and returns sane metadata', async () => {
    const extractor = new PdfImageExtractorHybrid()

    const extractionOpts: PdfRegionExtractionOptions = {
      pdfBuffer,
      documentId: 'test-doc-123',
      pageNumber: 1,
      elementId: 'test-elem',
      bbox: { x1: 0.1, y1: 0.1, x2: 0.4, y2: 0.4 },
      outputFormat: 'png',
      quality: 0.9,
      scale: 1.5,
    }

    const res = await extractor.extractPdfRegionAndUpload(extractionOpts)

    expect(res.width).toBeGreaterThan(0)
    expect(res.height).toBeGreaterThan(0)
    expect(res.size).toBeGreaterThan(0)
    expect(res.storagePath).toMatch(/stub\//)
    expect(res.signedUrl).toMatch(/^https:\/\/example.com\//)
  })
}) 