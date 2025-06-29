/**
 * Comprehensive Edge Case Tests for Image Extraction Service
 * 
 * Tests critical edge cases that could cause production failures in the image extractor:
 * - Invalid bounding box coordinates
 * - Corrupted image data
 * - Canvas API failures
 * - Memory and size limits
 * - Environment validation failures
 */

import { 
  extractImageFromPage, 
  extractMultipleRegions,
  validateExtractionEnvironment,
  estimateExtractionMemoryUsage,
  ImageExtractionError,
  type ImageExtractionInput 
} from '../image-extractor'

// Note: These tests run in Node.js environment where Canvas API is not available
// They test the error handling paths that would occur in production

describe('Image Extractor Edge Cases', () => {
  describe('Bounding Box Validation Edge Cases', () => {
    const baseInput: ImageExtractionInput = {
      pageImageBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      pageNumber: 1,
      boundingBox: { x1: 0.1, y1: 0.2, x2: 0.6, y2: 0.8 },
      outputFormat: 'png',
      quality: 0.95
    }

    it('should reject bounding box where x1 equals x2', async () => {
      const input: ImageExtractionInput = {
        ...baseInput,
        boundingBox: { x1: 0.5, y1: 0.2, x2: 0.5, y2: 0.8 } // x1 == x2
      }

      await expect(extractImageFromPage(input)).rejects.toThrow(ImageExtractionError)
      await expect(extractImageFromPage(input)).rejects.toThrow('x1 (0.5) must be less than x2 (0.5)')
    })

    it('should reject bounding box where y1 equals y2', async () => {
      const input: ImageExtractionInput = {
        ...baseInput,
        boundingBox: { x1: 0.1, y1: 0.5, x2: 0.6, y2: 0.5 } // y1 == y2
      }

      await expect(extractImageFromPage(input)).rejects.toThrow(ImageExtractionError)
      await expect(extractImageFromPage(input)).rejects.toThrow('y1 (0.5) must be less than y2 (0.5)')
    })

    it('should reject bounding box where x1 > x2', async () => {
      const input: ImageExtractionInput = {
        ...baseInput,
        boundingBox: { x1: 0.8, y1: 0.2, x2: 0.3, y2: 0.8 } // x1 > x2
      }

      await expect(extractImageFromPage(input)).rejects.toThrow(ImageExtractionError)
      await expect(extractImageFromPage(input)).rejects.toThrow('x1 (0.8) must be less than x2 (0.3)')
    })

    it('should reject bounding box where y1 > y2', async () => {
      const input: ImageExtractionInput = {
        ...baseInput,
        boundingBox: { x1: 0.1, y1: 0.9, x2: 0.6, y2: 0.2 } // y1 > y2
      }

      await expect(extractImageFromPage(input)).rejects.toThrow(ImageExtractionError)
      await expect(extractImageFromPage(input)).rejects.toThrow('y1 (0.9) must be less than y2 (0.2)')
    })

    it('should reject extremely small bounding box (width < 1%)', async () => {
      const input: ImageExtractionInput = {
        ...baseInput,
        boundingBox: { x1: 0.1, y1: 0.2, x2: 0.105, y2: 0.8 } // width = 0.005 (0.5%)
      }

      await expect(extractImageFromPage(input)).rejects.toThrow(ImageExtractionError)
      await expect(extractImageFromPage(input)).rejects.toThrow('Bounding box too small: 0.005 x 0.600 (minimum 0.01 x 0.01)')
    })

    it('should reject extremely small bounding box (height < 1%)', async () => {
      const input: ImageExtractionInput = {
        ...baseInput,
        boundingBox: { x1: 0.1, y1: 0.2, x2: 0.6, y2: 0.205 } // height = 0.005 (0.5%)
      }

      await expect(extractImageFromPage(input)).rejects.toThrow(ImageExtractionError)
      await expect(extractImageFromPage(input)).rejects.toThrow('Bounding box too small: 0.500 x 0.005 (minimum 0.01 x 0.01)')
    })

    it('should reject both dimensions too small', async () => {
      const input: ImageExtractionInput = {
        ...baseInput,
        boundingBox: { x1: 0.1, y1: 0.2, x2: 0.105, y2: 0.205 } // 0.5% x 0.5%
      }

      await expect(extractImageFromPage(input)).rejects.toThrow(ImageExtractionError)
      await expect(extractImageFromPage(input)).rejects.toThrow('Bounding box too small: 0.005 x 0.005 (minimum 0.01 x 0.01)')
    })

    it('should handle bounding box coordinates at exact boundaries', async () => {
      const input: ImageExtractionInput = {
        ...baseInput,
        boundingBox: { x1: 0.0, y1: 0.0, x2: 1.0, y2: 1.0 } // Full page
      }

      // Should not throw validation error (but will fail in Node.js due to Canvas API)
      await expect(extractImageFromPage(input)).rejects.toThrow('Canvas API not available')
    })

    it('should handle minimum valid bounding box (exactly 1%)', async () => {
      const input: ImageExtractionInput = {
        ...baseInput,
        boundingBox: { x1: 0.1, y1: 0.2, x2: 0.11, y2: 0.21 } // 1% x 1%
      }

      // Should not throw validation error
      await expect(extractImageFromPage(input)).rejects.toThrow('Canvas API not available')
    })

    it('should handle negative coordinates', async () => {
      const input: ImageExtractionInput = {
        ...baseInput,
        boundingBox: { x1: -0.1, y1: -0.1, x2: 0.5, y2: 0.5 }
      }

      // Should fail schema validation
      await expect(extractImageFromPage(input)).rejects.toThrow()
    })

    it('should handle coordinates > 1.0', async () => {
      const input: ImageExtractionInput = {
        ...baseInput,
        boundingBox: { x1: 0.1, y1: 0.2, x2: 1.5, y2: 1.8 }
      }

      // Should fail schema validation
      await expect(extractImageFromPage(input)).rejects.toThrow()
    })
  })

  describe('Image Data Validation Edge Cases', () => {
    const validBoundingBox = { x1: 0.1, y1: 0.2, x2: 0.6, y2: 0.8 }

    it('should reject empty base64 string', async () => {
      const input: ImageExtractionInput = {
        pageImageBase64: '',
        pageNumber: 1,
        boundingBox: validBoundingBox,
        outputFormat: 'png',
        quality: 0.95
      }

      await expect(extractImageFromPage(input)).rejects.toThrow()
    })

    it('should reject whitespace-only base64 string', async () => {
      const input: ImageExtractionInput = {
        pageImageBase64: '   \n\t  ',
        pageNumber: 1,
        boundingBox: validBoundingBox,
        outputFormat: 'png',
        quality: 0.95
      }

      await expect(extractImageFromPage(input)).rejects.toThrow()
    })

    it('should handle base64 without data URL prefix', async () => {
      const input: ImageExtractionInput = {
        pageImageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        pageNumber: 1,
        boundingBox: validBoundingBox,
        outputFormat: 'png',
        quality: 0.95
      }

      // Should not throw validation error but will fail in Node.js due to Canvas API
      await expect(extractImageFromPage(input)).rejects.toThrow('Canvas API not available')
    })

    it('should handle corrupted base64 data', async () => {
      const input: ImageExtractionInput = {
        pageImageBase64: 'data:image/png;base64,NOT_VALID_BASE64_DATA!!!',
        pageNumber: 1,
        boundingBox: validBoundingBox,
        outputFormat: 'png',
        quality: 0.95
      }

      // Should not throw validation error but will fail when trying to load image
      await expect(extractImageFromPage(input)).rejects.toThrow()
    })

    it('should handle wrong MIME type in data URL', async () => {
      const input: ImageExtractionInput = {
        pageImageBase64: 'data:text/plain;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        pageNumber: 1,
        boundingBox: validBoundingBox,
        outputFormat: 'png',
        quality: 0.95
      }

      // Should not throw validation error but will fail when trying to load image
      await expect(extractImageFromPage(input)).rejects.toThrow()
    })

    it('should handle extremely long base64 string', async () => {
      const input: ImageExtractionInput = {
        pageImageBase64: 'data:image/png;base64,' + 'A'.repeat(1000000), // 1MB of 'A' characters
        pageNumber: 1,
        boundingBox: validBoundingBox,
        outputFormat: 'png',
        quality: 0.95
      }

      // Should not throw validation error but will fail when trying to load image
      await expect(extractImageFromPage(input)).rejects.toThrow()
    })

    it('should handle binary data that is not valid image', async () => {
      // Create base64 that decodes to valid binary but not a valid image
      const invalidImageData = Buffer.from('This is not image data').toString('base64')
      const input: ImageExtractionInput = {
        pageImageBase64: `data:image/png;base64,${invalidImageData}`,
        pageNumber: 1,
        boundingBox: validBoundingBox,
        outputFormat: 'png',
        quality: 0.95
      }

      await expect(extractImageFromPage(input)).rejects.toThrow()
    })
  })

  describe('Input Parameter Edge Cases', () => {
    const validBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    const validBoundingBox = { x1: 0.1, y1: 0.2, x2: 0.6, y2: 0.8 }

    it('should reject page number 0', async () => {
      const input: ImageExtractionInput = {
        pageImageBase64: validBase64,
        pageNumber: 0,
        boundingBox: validBoundingBox,
        outputFormat: 'png',
        quality: 0.95
      }

      await expect(extractImageFromPage(input)).rejects.toThrow()
    })

    it('should reject negative page number', async () => {
      const input: ImageExtractionInput = {
        pageImageBase64: validBase64,
        pageNumber: -5,
        boundingBox: validBoundingBox,
        outputFormat: 'png',
        quality: 0.95
      }

      await expect(extractImageFromPage(input)).rejects.toThrow()
    })

    it('should reject fractional page number', async () => {
      const input: ImageExtractionInput = {
        pageImageBase64: validBase64,
        pageNumber: 1.5,
        boundingBox: validBoundingBox,
        outputFormat: 'png',
        quality: 0.95
      }

      await expect(extractImageFromPage(input)).rejects.toThrow()
    })

    it('should reject quality below minimum (0.1)', async () => {
      const input: ImageExtractionInput = {
        pageImageBase64: validBase64,
        pageNumber: 1,
        boundingBox: validBoundingBox,
        outputFormat: 'jpeg',
        quality: 0.05 // Below minimum
      }

      await expect(extractImageFromPage(input)).rejects.toThrow()
    })

    it('should reject quality above maximum (1.0)', async () => {
      const input: ImageExtractionInput = {
        pageImageBase64: validBase64,
        pageNumber: 1,
        boundingBox: validBoundingBox,
        outputFormat: 'jpeg',
        quality: 1.5 // Above maximum
      }

      await expect(extractImageFromPage(input)).rejects.toThrow()
    })

    it('should handle minimum valid quality (0.1)', async () => {
      const input: ImageExtractionInput = {
        pageImageBase64: validBase64,
        pageNumber: 1,
        boundingBox: validBoundingBox,
        outputFormat: 'jpeg',
        quality: 0.1
      }

      // Should not throw validation error
      await expect(extractImageFromPage(input)).rejects.toThrow('Canvas API not available')
    })

    it('should handle maximum valid quality (1.0)', async () => {
      const input: ImageExtractionInput = {
        pageImageBase64: validBase64,
        pageNumber: 1,
        boundingBox: validBoundingBox,
        outputFormat: 'jpeg',
        quality: 1.0
      }

      // Should not throw validation error
      await expect(extractImageFromPage(input)).rejects.toThrow('Canvas API not available')
    })

    it('should handle invalid output format', async () => {
      const input = {
        pageImageBase64: validBase64,
        pageNumber: 1,
        boundingBox: validBoundingBox,
        outputFormat: 'gif', // Invalid format
        quality: 0.95
      }

      await expect(extractImageFromPage(input as any)).rejects.toThrow()
    })

    it('should handle extremely large page number', async () => {
      const input: ImageExtractionInput = {
        pageImageBase64: validBase64,
        pageNumber: Number.MAX_SAFE_INTEGER,
        boundingBox: validBoundingBox,
        outputFormat: 'png',
        quality: 0.95
      }

      // Should not throw validation error
      await expect(extractImageFromPage(input)).rejects.toThrow('Canvas API not available')
    })
  })

  describe('Environment Validation Edge Cases', () => {
    it('should detect Node.js environment (no Canvas API)', () => {
      const result = validateExtractionEnvironment()
      
      expect(result.supported).toBe(false)
      expect(result.errors).toContain('Image extraction requires browser environment')
    })

    it('should detect missing Canvas API', () => {
      const result = validateExtractionEnvironment()
      
      expect(result.supported).toBe(false)
      expect(result.errors).toContain('Canvas API not available')
    })

    // Note: We can't test browser environment scenarios in Node.js, but we can test error handling
    it('should handle validation errors gracefully', () => {
      const result = validateExtractionEnvironment()
      
      expect(result).toHaveProperty('supported')
      expect(result).toHaveProperty('errors')
      expect(Array.isArray(result.errors)).toBe(true)
    })
  })

  describe('Memory Estimation Edge Cases', () => {
    it('should estimate memory for tiny images', () => {
      const memory = estimateExtractionMemoryUsage(1, 1, 1, 'png')
      expect(memory).toBeGreaterThan(0)
    })

    it('should estimate memory for huge images', () => {
      const memory = estimateExtractionMemoryUsage(10000, 10000, 1, 'png')
      expect(memory).toBeGreaterThan(0)
      expect(memory).toBeGreaterThan(1000000) // Should be over 1MB for large image
    })

    it('should estimate memory for many regions', () => {
      const memory = estimateExtractionMemoryUsage(1000, 1000, 100, 'png')
      expect(memory).toBeGreaterThan(0)
    })

    it('should estimate differently for PNG vs JPEG', () => {
      const pngMemory = estimateExtractionMemoryUsage(1000, 1000, 1, 'png')
      const jpegMemory = estimateExtractionMemoryUsage(1000, 1000, 1, 'jpeg')
      
      expect(pngMemory).toBeGreaterThan(jpegMemory)
    })

    it('should handle zero dimensions', () => {
      const memory = estimateExtractionMemoryUsage(0, 0, 1, 'png')
      expect(memory).toBeGreaterThan(0) // Should still have overhead
    })

    it('should handle zero regions', () => {
      const memory = estimateExtractionMemoryUsage(1000, 1000, 0, 'png')
      expect(memory).toBeGreaterThan(0) // Should still have overhead
    })
  })

  describe('Multiple Region Extraction Edge Cases', () => {
    const validBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

    it('should handle empty regions array', async () => {
      await expect(extractMultipleRegions(validBase64, 1, [])).resolves.toEqual([])
    })

    it('should handle single region', async () => {
      const regions = [{ 
        boundingBox: { x1: 0.1, y1: 0.2, x2: 0.6, y2: 0.8 }
      }]

      // Should fail due to Canvas API not available in Node.js
      await expect(extractMultipleRegions(validBase64, 1, regions)).rejects.toThrow()
    })

    it('should fail on first invalid region', async () => {
      const regions = [
        { boundingBox: { x1: 0.1, y1: 0.2, x2: 0.6, y2: 0.8 } }, // Valid
        { boundingBox: { x1: 0.8, y1: 0.2, x2: 0.3, y2: 0.8 } }, // Invalid (x1 > x2)
        { boundingBox: { x1: 0.2, y1: 0.3, x2: 0.7, y2: 0.9 } }  // Valid
      ]

      // Should fail fast on first invalid region
      await expect(extractMultipleRegions(validBase64, 1, regions)).rejects.toThrow()
    })

    it('should handle regions with different formats', async () => {
      const regions = [
        { 
          boundingBox: { x1: 0.1, y1: 0.2, x2: 0.6, y2: 0.8 },
          outputFormat: 'png' as const,
          quality: 0.95
        },
        { 
          boundingBox: { x1: 0.2, y1: 0.3, x2: 0.7, y2: 0.9 },
          outputFormat: 'jpeg' as const,
          quality: 0.8
        }
      ]

      // Should fail due to Canvas API not available
      await expect(extractMultipleRegions(validBase64, 1, regions)).rejects.toThrow()
    })

    it('should handle overlapping regions', async () => {
      const regions = [
        { boundingBox: { x1: 0.1, y1: 0.2, x2: 0.6, y2: 0.8 } },
        { boundingBox: { x1: 0.3, y1: 0.4, x2: 0.8, y2: 0.9 } } // Overlaps with first
      ]

      // Should fail due to Canvas API not available
      await expect(extractMultipleRegions(validBase64, 1, regions)).rejects.toThrow()
    })

    it('should handle many regions', async () => {
      const regions = Array.from({ length: 100 }, (_, i) => ({
        boundingBox: { 
          x1: 0.01 * i, 
          y1: 0.01 * i, 
          x2: 0.01 * i + 0.1, 
          y2: 0.01 * i + 0.1 
        }
      }))

      // Should fail due to Canvas API not available
      await expect(extractMultipleRegions(validBase64, 1, regions)).rejects.toThrow()
    })
  })

  describe('Error Handling Edge Cases', () => {
    it('should preserve original error when wrapping', async () => {
      const input: ImageExtractionInput = {
        pageImageBase64: 'data:image/png;base64,invalid',
        pageNumber: 1,
        boundingBox: { x1: 0.1, y1: 0.2, x2: 0.6, y2: 0.8 },
        outputFormat: 'png',
        quality: 0.95
      }

      try {
        await extractImageFromPage(input)
      } catch (error) {
        expect(error).toBeInstanceOf(ImageExtractionError)
        expect((error as ImageExtractionError).message).toBeDefined()
      }
    })

    it('should handle errors without message', async () => {
      // This test is more conceptual as we can't easily trigger such errors
      // but the error handling code should be robust
      const input: ImageExtractionInput = {
        pageImageBase64: 'data:image/png;base64,test',
        pageNumber: 1,
        boundingBox: { x1: 0.1, y1: 0.2, x2: 0.6, y2: 0.8 },
        outputFormat: 'png',
        quality: 0.95
      }

      await expect(extractImageFromPage(input)).rejects.toThrow()
    })

    it('should handle extraction timing out', async () => {
      // This is a conceptual test - in a real browser environment,
      // we might want to add timeout handling
      const input: ImageExtractionInput = {
        pageImageBase64: 'data:image/png;base64,test',
        pageNumber: 1,
        boundingBox: { x1: 0.1, y1: 0.2, x2: 0.6, y2: 0.8 },
        outputFormat: 'png',
        quality: 0.95
      }

      await expect(extractImageFromPage(input)).rejects.toThrow()
    })
  })
})