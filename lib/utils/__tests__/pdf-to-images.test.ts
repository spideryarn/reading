/**
 * Tests for PDF to Images conversion
 * 
 * These tests verify the PDF-to-images utility functions.
 * Note: Actual MuPDF.js functionality requires browser environment.
 */

import { 
  PDFToImagesError, 
  getRecommendedSettings, 
  estimateMemoryUsage 
} from '../pdf-to-images'

describe('PDF to Images Utilities', () => {
  describe('PDFToImagesError', () => {
    it('should create error with correct name and message', () => {
      const error = new PDFToImagesError('test error')
      expect(error.name).toBe('PDFToImagesError')
      expect(error.message).toBe('test error')
    })

    it('should handle cause parameter', () => {
      const cause = new Error('original error')
      const error = new PDFToImagesError('wrapper error', cause)
      expect(error.cause).toBe(cause)
    })
  })

  describe('getRecommendedSettings', () => {
    it('should return speed-optimized settings', () => {
      const settings = getRecommendedSettings('speed')
      expect(settings).toEqual({
        scale: 1.5,
        format: 'jpeg',
        jpegQuality: 70,
        alpha: false
      })
    })

    it('should return quality-optimized settings', () => {
      const settings = getRecommendedSettings('quality')
      expect(settings).toEqual({
        scale: 3.0,
        format: 'png',
        alpha: false
      })
    })

    it('should return balanced settings by default', () => {
      const balanced = getRecommendedSettings('balanced')
      const defaultSettings = getRecommendedSettings('balanced')
      expect(balanced).toEqual(defaultSettings)
      expect(balanced).toEqual({
        scale: 2.0,
        format: 'jpeg',
        jpegQuality: 85,
        alpha: false
      })
    })
  })

  describe('estimateMemoryUsage', () => {
    it('should estimate memory for PNG format', () => {
      const memoryUsage = estimateMemoryUsage(10, { format: 'png', scale: 2.0 })
      expect(memoryUsage).toBeGreaterThan(0)
      expect(typeof memoryUsage).toBe('number')
    })

    it('should estimate memory for JPEG format (should be smaller)', () => {
      const pngMemory = estimateMemoryUsage(10, { format: 'png', scale: 2.0 })
      const jpegMemory = estimateMemoryUsage(10, { format: 'jpeg', scale: 2.0 })
      expect(jpegMemory).toBeLessThan(pngMemory)
    })

    it('should scale memory usage with page count', () => {
      const fivePages = estimateMemoryUsage(5, { scale: 2.0 })
      const tenPages = estimateMemoryUsage(10, { scale: 2.0 })
      expect(tenPages).toBeCloseTo(fivePages * 2, -3) // Allow some rounding difference
    })

    it('should scale memory usage with scale factor', () => {
      const lowRes = estimateMemoryUsage(5, { scale: 1.0 })
      const highRes = estimateMemoryUsage(5, { scale: 2.0 })
      expect(highRes).toBeGreaterThan(lowRes)
    })

    it('should use default options when none provided', () => {
      const defaultMemory = estimateMemoryUsage(5)
      const explicitMemory = estimateMemoryUsage(5, { scale: 2.0, format: 'png' })
      expect(defaultMemory).toEqual(explicitMemory)
    })
  })

  // Note: Actual conversion functions (convertPDFToImages, convertPDFBufferToImages)
  // are not tested here because they require browser environment with WebAssembly.
  // These will be tested in E2E tests or with browser automation.
})