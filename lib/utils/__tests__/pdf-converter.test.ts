// Tests for PDF conversion utility functions (V1 Legacy - image-based conversion)
// NOTE: V2 implementation uses direct PDF processing via Claude API
// This utility is maintained for compatibility but not used in current implementation

import { convertPdfToBase64Image, validatePdfBuffer } from '../pdf-converter'
import fs from 'fs'
import path from 'path'

// Mock pdf2pic to avoid system dependencies in tests
jest.mock('pdf2pic', () => {
  return {
    __esModule: true,
    default: {
      fromPath: jest.fn(() => ({
        bulk: jest.fn()
      }))
    }
  }
})

describe('PDF Converter (V1 Legacy - Image-based)', () => {
  const mockPdf2pic = require('pdf2pic').default
  
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock file system operations
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {})
    jest.spyOn(fs, 'mkdirSync').mockImplementation(() => '')
    jest.spyOn(fs, 'readFileSync').mockImplementation(() => Buffer.from('mock-image-data'))
    jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('validatePdfBuffer (still used in V2)', () => {
    it('should validate a proper PDF buffer', () => {
      const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog')
      const result = validatePdfBuffer(validPdfBuffer)
      
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject empty buffer', () => {
      const emptyBuffer = Buffer.alloc(0)
      const result = validatePdfBuffer(emptyBuffer)
      
      expect(result.valid).toBe(false)
      expect(result.error).toBe('PDF buffer is empty')
    })

    it('should reject non-PDF buffer', () => {
      const nonPdfBuffer = Buffer.from('This is not a PDF file')
      const result = validatePdfBuffer(nonPdfBuffer)
      
      expect(result.valid).toBe(false)
      expect(result.error).toBe('File is not a valid PDF')
    })

    it('should reject oversized PDF buffer (legacy 2MB limit)', () => {
      // NOTE: V2 uses 32MB limit, but this function keeps 2MB for backward compatibility
      const largePdfBuffer = Buffer.alloc(3 * 1024 * 1024) // 3MB
      largePdfBuffer.write('%PDF-1.4')
      const result = validatePdfBuffer(largePdfBuffer)
      
      expect(result.valid).toBe(false)
      expect(result.error).toBe('PDF file too large (max 2MB for single-page PDFs)')
    })
  })

  describe('convertPdfToBase64Image (V1 legacy - not used in V2)', () => {
    it('should successfully convert PDF to base64 images', async () => {
      const mockResults = [
        { path: '/tmp/test-page-1.png', pageNumber: 1 }
      ]
      
      mockPdf2pic.fromPath.mockReturnValue({
        bulk: jest.fn().mockResolvedValue(mockResults)
      })

      const testPdfBuffer = Buffer.from('%PDF-1.4\ntest content')
      const result = await convertPdfToBase64Image(testPdfBuffer)

      expect(result.success).toBe(true)
      expect(result.images).toHaveLength(1)
      expect(result.pageCount).toBe(1)
      expect(typeof result.images![0]).toBe('string')
    })

    it('should handle conversion failure with no pages', async () => {
      mockPdf2pic.fromPath.mockReturnValue({
        bulk: jest.fn().mockResolvedValue([])
      })

      const testPdfBuffer = Buffer.from('%PDF-1.4\ntest content')
      const result = await convertPdfToBase64Image(testPdfBuffer)

      expect(result.success).toBe(false)
      expect(result.error).toBe('PDF conversion resulted in no pages')
    })

    it('should handle pdf2pic library errors', async () => {
      mockPdf2pic.fromPath.mockReturnValue({
        bulk: jest.fn().mockRejectedValue(new Error('GraphicsMagick not found'))
      })

      const testPdfBuffer = Buffer.from('%PDF-1.4\ntest content')
      const result = await convertPdfToBase64Image(testPdfBuffer)

      expect(result.success).toBe(false)
      expect(result.error).toContain('PDF conversion failed: GraphicsMagick not found')
    })

    it('should handle invalid PDF errors specifically', async () => {
      mockPdf2pic.fromPath.mockReturnValue({
        bulk: jest.fn().mockRejectedValue(new Error('Invalid PDF'))
      })

      const testPdfBuffer = Buffer.from('%PDF-1.4\ntest content')
      const result = await convertPdfToBase64Image(testPdfBuffer)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid PDF file format')
    })

    it('should clean up temporary files after conversion', async () => {
      const mockResults = [
        { path: '/tmp/test-page-1.png', pageNumber: 1 }
      ]
      
      mockPdf2pic.fromPath.mockReturnValue({
        bulk: jest.fn().mockResolvedValue(mockResults)
      })

      const testPdfBuffer = Buffer.from('%PDF-1.4\ntest content')
      await convertPdfToBase64Image(testPdfBuffer)

      // Verify cleanup was attempted (temp PDF, image file, temp dir)
      expect(fs.unlinkSync).toHaveBeenCalledTimes(3)
    })

    it('should configure pdf2pic with high resolution settings', async () => {
      const mockResults = [
        { path: '/tmp/test-page-1.png', pageNumber: 1 }
      ]
      
      const mockBulk = jest.fn().mockResolvedValue(mockResults)
      mockPdf2pic.fromPath.mockReturnValue({ bulk: mockBulk })

      const testPdfBuffer = Buffer.from('%PDF-1.4\ntest content')
      await convertPdfToBase64Image(testPdfBuffer)

      // Verify pdf2pic was configured with academic content settings
      expect(mockPdf2pic.fromPath).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          density: 200,
          format: 'png',
          width: 1600,
          height: 2400
        })
      )
    })
  })

  describe('Integration with real files', () => {
    it('should handle real PDF file if available', async () => {
      const testPdfPath = 'static/examples/2105.10461v2_cropped.pdf'
      
      // Only run this test if the file exists (optional integration test)
      if (fs.existsSync(testPdfPath)) {
        // Restore real fs for this test
        jest.restoreAllMocks()
        
        const realPdfBuffer = fs.readFileSync(testPdfPath)
        const validation = validatePdfBuffer(realPdfBuffer)
        
        expect(validation.valid).toBe(true)
        expect(realPdfBuffer.length).toBeGreaterThan(0)
        expect(realPdfBuffer.length).toBeLessThan(2 * 1024 * 1024) // Under 2MB
      } else {
        // Skip test gracefully if test PDF not available
        console.log('Skipping real PDF test - test file not available')
        expect(true).toBe(true) // Ensure test passes
      }
    })
  })
})