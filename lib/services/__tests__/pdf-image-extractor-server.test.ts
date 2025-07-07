import { extractPdfRegionAndUpload } from '../pdf-image-extractor-server'
import { boundingBoxSchema } from '../html-fragment-processor'

jest.mock('unpdf', () => ({
  renderPageAsImage: jest.fn(async () => {
    // Return dummy ArrayBuffer (pretend PNG)
    return new Uint8Array([1, 2, 3]).buffer
  })
}))

jest.mock('imagescript', () => {
  class MockImage {
    static async decode() {
      return new MockImage()
    }
    width = 100
    height = 100
    crop() {
      return this
    }
    async encode() {
      return new Uint8Array([4, 5, 6])
    }
    async encodeJPG() {
      return new Uint8Array([7, 8, 9])
    }
  }
  return { Image: MockImage }
})

// Mock storage helpers
jest.mock('../storage', () => ({
  uploadImageAsset: jest.fn(async () => ({
    path: '123/assets/000_fig-1.png',
    fullPath: 'documents/123/assets/000_fig-1.png',
    size: 3,
    mimeType: 'image/png'
  })),
  getPublicDocumentUrl: jest.fn(() => 'https://cdn.example.com/123/assets/000_fig-1.png')
}))

// Silence logger output
jest.mock('../logger', () => ({
  createRequestLogger: () => ({ info: jest.fn(), error: jest.fn() })
}))

const pdfBuffer = Buffer.from('%PDF dummy')

describe('PdfImageExtractorServer', () => {
  it('extracts region, uploads, and returns public URL', async () => {
    const result = await extractPdfRegionAndUpload({
      pdfBuffer,
      documentId: '00000000-0000-0000-0000-000000000123',
      pageNumber: 1,
      elementId: 'fig-1',
      bbox: boundingBoxSchema.parse({ x1: 0, y1: 0, x2: 1, y2: 1 }),
      outputFormat: 'png',
      quality: 0.95,
      scale: 2
    })

    expect(result.publicUrl).toBe('https://cdn.example.com/123/assets/000_fig-1.png')
    expect(result.width).toBe(100)
    expect(result.height).toBe(100)
  })
}) 