/**
 * Tests for Gemini Native PDF Processor
 */

// eslint-disable-next-line import/no-unresolved -- path aliases are resolved via ts-jest config in test env
import { processWithGeminiNative, canProcessWithGeminiNative } from '../gemini-native-pdf-processor'
// eslint-disable-next-line import/no-unresolved -- path aliases are resolved via ts-jest config in test env
// @ts-expect-error -- path aliases are resolved via ts-jest config in test env
import { executeMultimodalPromptWithUsage } from '@/lib/prompts/types'
// eslint-disable-next-line import/no-unresolved -- path aliases are resolved via ts-jest config in test env
// @ts-expect-error -- path aliases are resolved via ts-jest config in test env
import { UPLOAD_LIMITS } from '@/lib/config/upload-limits'

// Mock dependencies
jest.mock('@/lib/prompts/types')
jest.mock('@/lib/services/logger', () => ({
  createRequestLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }),
  createTimer: () => ({
    end: jest.fn()
  })
}))

const mockExecuteMultimodalPromptWithUsage = executeMultimodalPromptWithUsage as jest.MockedFunction<typeof executeMultimodalPromptWithUsage>

describe('GeminiNativePdfProcessor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('canProcessWithGeminiNative', () => {
    it('should return true for valid PDF within size limits', () => {
      const validPdf = Buffer.from('%PDF-1.4\ntest content')
      const result = canProcessWithGeminiNative(validPdf)
      
      expect(result.canProcess).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it('should return false for PDF exceeding size limit', () => {
      const largePdf = Buffer.alloc(UPLOAD_LIMITS.PDF_GEMINI_API_PROCESSING_LIMIT + 1)
      largePdf.write('%PDF')
      
      const result = canProcessWithGeminiNative(largePdf)
      
      expect(result.canProcess).toBe(false)
      expect(result.reason).toContain('exceeds Gemini processing limit')
    })

    it('should return false for invalid PDF format', () => {
      const invalidPdf = Buffer.from('Not a PDF file')
      const result = canProcessWithGeminiNative(invalidPdf)
      
      expect(result.canProcess).toBe(false)
      expect(result.reason).toBe('Invalid PDF file format')
    })
  })

  describe('processWithGeminiNative', () => {
    const mockOptions = {
      pdfBuffer: Buffer.from('%PDF-1.4\ntest content'),
      fileName: 'test.pdf',
      correlationId: 'test-correlation-id',
      singlePageOnly: false
    }

    it('should process PDF and normalize bounding boxes', async () => {
      const mockHtml = `
        <html>
          <body>
            <figure data-bbox="100,200,900,800" id="fig1">
              <figcaption>Figure 1: Test figure</figcaption>
            </figure>
            <table data-bbox="50,850,950,950">
              <caption>Table 1: Test table</caption>
            </table>
          </body>
        </html>
      `

      mockExecuteMultimodalPromptWithUsage.mockResolvedValue({
        text: mockHtml,
        usage: {
          promptTokens: 1000,
          completionTokens: 500,
          totalTokens: 1500
        },
        finishReason: 'stop'
      })

      const result = await processWithGeminiNative(mockOptions)

      // Check normalized coordinates
      expect(result.html).toContain('data-bbox="0.1,0.2,0.9,0.8"')
      expect(result.html).toContain('data-bbox="0.05,0.85,0.95,0.95"')
      
      // Check extracted images
      expect(result.extractedImages).toHaveLength(2)
      expect(result.extractedImages[0]).toMatchObject({
        elementId: 'fig1',
        bbox: { x1: 0.1, y1: 0.2, x2: 0.9, y2: 0.8 },
        figureNumber: '1',
        caption: 'Figure 1: Test figure',
        elementType: 'figure'
      })
      expect(result.extractedImages[1]).toMatchObject({
        elementId: expect.stringMatching(/^chart-/),
        bbox: { x1: 0.05, y1: 0.85, x2: 0.95, y2: 0.95 },
        caption: 'Table 1: Test table',
        elementType: 'chart'
      })

      // Check usage and metadata
      expect(result.usage).toEqual({
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500
      })
      expect(result.finishReason).toBe('stop')
      expect(result.warnings).toEqual([])
    })

    it('should handle invalid bounding box formats gracefully', async () => {
      const mockHtml = `
        <html>
          <body>
            <figure data-bbox="invalid-coords">Invalid bbox</figure>
            <figure data-bbox="100,200">Too few coords</figure>
            <figure data-bbox="100,200,300,400,500">Too many coords</figure>
            <figure data-bbox="100,200,300,abc">Non-numeric coord</figure>
          </body>
        </html>
      `

      mockExecuteMultimodalPromptWithUsage.mockResolvedValue({
        text: mockHtml,
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        finishReason: 'stop'
      })

      const result = await processWithGeminiNative(mockOptions)

      // Should not extract any images due to invalid bounding boxes
      expect(result.extractedImages).toHaveLength(0)
      
      // Should have warnings for each invalid bbox
      expect(result.warnings).toHaveLength(4)
      expect(result.warnings[0]).toContain('Invalid bounding box format')
    })

    it('should handle coordinates out of range', async () => {
      const mockHtml = `
        <html>
          <body>
            <figure data-bbox="-100,200,900,800">Negative coord</figure>
            <figure data-bbox="100,200,1500,800">Coord > 1000</figure>
          </body>
        </html>
      `

      mockExecuteMultimodalPromptWithUsage.mockResolvedValue({
        text: mockHtml,
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        finishReason: 'stop'
      })

      const result = await processWithGeminiNative(mockOptions)

      expect(result.extractedImages).toHaveLength(0)
      expect(result.warnings).toHaveLength(2)
      expect(result.warnings[0]).toContain('out of range')
      expect(result.warnings[1]).toContain('out of range')
    })

    it('should throw error when PDF exceeds size limit', async () => {
      const largePdf = Buffer.alloc(UPLOAD_LIMITS.PDF_GEMINI_API_PROCESSING_LIMIT + 1)
      largePdf.write('%PDF')

      await expect(
        processWithGeminiNative({
          ...mockOptions,
          pdfBuffer: largePdf
        })
      ).rejects.toThrow('PDF file too large for Gemini processing')
    })

    it('should throw error when finish reason is length', async () => {
      mockExecuteMultimodalPromptWithUsage.mockResolvedValue({
        text: '<html>Truncated...</html>',
        usage: { promptTokens: 50000, completionTokens: 14000, totalTokens: 64000 },
        finishReason: 'length'
      })

      await expect(
        processWithGeminiNative(mockOptions)
      ).rejects.toThrow('Document too large for processing')
    })

    it('should handle empty HTML gracefully', async () => {
      mockExecuteMultimodalPromptWithUsage.mockResolvedValue({
        text: '',
        usage: { promptTokens: 100, completionTokens: 0, totalTokens: 100 },
        finishReason: 'stop'
      })

      const result = await processWithGeminiNative(mockOptions)

      expect(result.html).toBe('<html><head></head><body></body></html>')
      expect(result.extractedImages).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('should generate element IDs when missing', async () => {
      const mockHtml = `
        <html>
          <body>
            <figure data-bbox="100,200,300,400">No ID</figure>
            <div data-bbox="500,600,700,800" class="diagram">Diagram</div>
          </body>
        </html>
      `

      mockExecuteMultimodalPromptWithUsage.mockResolvedValue({
        text: mockHtml,
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        finishReason: 'stop'
      })

      const result = await processWithGeminiNative(mockOptions)

      expect(result.extractedImages).toHaveLength(2)
      expect(result.extractedImages[0].elementId).toBe('figure-1')
      expect(result.extractedImages[1].elementId).toBe('diagram-2')
      
      // Check that IDs were added to HTML
      expect(result.html).toContain('id="figure-1"')
      expect(result.html).toContain('id="diagram-2"')
    })

    it('should extract figure numbers from captions', async () => {
      const mockHtml = `
        <html>
          <body>
            <figure data-bbox="100,200,300,400">
              <figcaption>Figure 3.2: Complex diagram</figcaption>
            </figure>
            <figure data-bbox="500,600,700,800">
              <figcaption>Fig. 5: Simple chart</figcaption>
            </figure>
            <table data-bbox="100,100,200,200">
              <caption>Table 2.1: Data results</caption>
            </table>
          </body>
        </html>
      `

      mockExecuteMultimodalPromptWithUsage.mockResolvedValue({
        text: mockHtml,
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        finishReason: 'stop'
      })

      const result = await processWithGeminiNative(mockOptions)

      expect(result.extractedImages[0].figureNumber).toBe('3.2')
      expect(result.extractedImages[1].figureNumber).toBe('5')
      expect(result.extractedImages[2].figureNumber).toBe('2.1')
    })

    it('should handle single page processing', async () => {
      const mockHtml = '<html><body>Single page content</body></html>'
      
      mockExecuteMultimodalPromptWithUsage.mockResolvedValue({
        text: mockHtml,
        usage: { promptTokens: 50, completionTokens: 25, totalTokens: 75 },
        finishReason: 'stop'
      })

      const result = await processWithGeminiNative({
        ...mockOptions,
        singlePageOnly: true
      })

      expect(mockExecuteMultimodalPromptWithUsage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          singlePageOnly: true
        })
      )
      
      expect(result.html).toBe('<html><head></head><body>Single page content</body></html>')
    })

    it('should correctly interpret y,x coordinate order from Gemini', async () => {
      const mockHtml = `
        <html>
          <body>
            <!-- Gemini sometimes returns y,x,y,x -->
            <figure data-bbox="200,100,800,900" id="figYX">
              <figcaption>Figure 7: YX order</figcaption>
            </figure>
          </body>
        </html>
      `
      mockExecuteMultimodalPromptWithUsage.mockResolvedValue({
        text: mockHtml,
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        finishReason: 'stop'
      })
      const result = await processWithGeminiNative(mockOptions)
      // Expect coords normalised and swapped
      expect(result.html).toContain('data-bbox="0.2,0.1,0.8,0.9"')
      expect(result.extractedImages[0].bbox).toEqual({ x1: 0.2, y1: 0.1, x2: 0.8, y2: 0.9 })
    })

    it('should skip bounding boxes below minimum size', async () => {
      const mockHtml = `
        <html><body>
          <figure data-bbox="10,10,20,20">Tiny Box</figure>
        </body></html>
      `
      mockExecuteMultimodalPromptWithUsage.mockResolvedValue({
        text: mockHtml,
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        finishReason: 'stop'
      })
      const result = await processWithGeminiNative(mockOptions)
      expect(result.extractedImages).toHaveLength(0)
      expect(result.warnings.some(w => w.includes('too small'))).toBe(true)
    })
  })
})