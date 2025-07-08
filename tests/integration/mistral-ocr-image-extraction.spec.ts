import fs from 'fs'
import path from 'path'

import { processWithMistralOcr } from '../../lib/services/mistral-ocr-pdf-processor'
import { FEATURE_FLAGS } from '../../lib/config'

// Mutable mock for extractor behaviour
const extractMock = jest.fn()

jest.mock('../../lib/services/pdf-image-extractor-server', () => {
  return {
    extractPdfRegionAndUpload: (...args: any[]) => extractMock(...args),
  }
})

// Mock Mistral SDK – minimal behaviour
jest.mock('@mistralai/mistralai', () => {
  return {
    // eslint-disable-next-line @typescript-eslint/class-methods-use-this
    Mistral: class {
      public ocr = {
        process: async () => {
          return {
            pages: [
              {
                index: 0,
                markdown: '![Figure](img-0.jpeg)',
                dimensions: { width: 1000, height: 1000 },
                images: [
                  {
                    id: 'img-0.jpeg',
                    topLeftX: 100,
                    topLeftY: 200,
                    bottomRightX: 500,
                    bottomRightY: 600,
                  },
                ],
              },
            ],
          }
        },
      }
    },
  }
})

// Mock `marked` (ESM) to avoid Jest transforming ESM build from node_modules
jest.mock('marked', () => {
  return {
    marked: {
      setOptions: () => {},
      parse: (md: string) => `<img src="img-0.jpeg" alt="Figure">`
    },
    setOptions: () => {},
    parse: (md: string) => `<img src="img-0.jpeg" alt="Figure">`
  }
})

// Helper to load test PDF buffer
function getTestPdfBuffer(): Buffer {
  const pdfPath = path.resolve(__dirname, '../../static/examples/2009_Book_TheElementsOfStatisticalLearning_single_page_image.pdf')
  return fs.readFileSync(pdfPath)
}

describe('Mistral OCR – image extraction behaviour', () => {
  beforeEach(() => {
    extractMock.mockReset()
    process.env.MISTRAL_API_KEY = 'dummy-key'
  })

  it('fails fatally when extraction throws', async () => {
    expect(FEATURE_FLAGS.IMAGE_EXTRACTION_ENABLED).toBe(true)
    extractMock.mockImplementation(() => {
      throw new Error('mock extraction failure')
    })

    await expect(
      processWithMistralOcr({
        pdfBuffer: getTestPdfBuffer(),
        fileName: 'single.pdf',
        correlationId: 'test-fail',
        singlePageOnly: true,
        documentId: '11111111-1111-1111-1111-111111111111',
        imageExtractionEnabled: true,
      })
    ).rejects.toThrow(/mock extraction failure/)
  })

  it('injects signed URL on success', async () => {
    extractMock.mockImplementation(() => {
      return {
        storagePath: 'documents/abc/img-0.png',
        signedUrl: 'https://signed.example.com/img-0.png',
        width: 400,
        height: 300,
        size: 12345,
      }
    })

    const res = await processWithMistralOcr({
      pdfBuffer: getTestPdfBuffer(),
      fileName: 'single.pdf',
      correlationId: 'test-pass',
      singlePageOnly: true,
      documentId: '00000000-0000-4000-8000-000000000000',
      imageExtractionEnabled: true,
    })

    expect(res.extractedImages.length).toBe(1)
    expect(res.html).toContain('https://signed.example.com/img-0.png')
    expect(res.html).not.toContain('src="img-0.jpeg"')
  })
}) 