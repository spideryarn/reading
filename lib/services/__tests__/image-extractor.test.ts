/**
 * Tests for Image Region Extraction Service
 * 
 * Comprehensive tests for Canvas-based image extraction with mocked browser APIs
 */

import {
  extractImageFromPage,
  extractMultipleRegions,
  estimateExtractionMemoryUsage,
  validateExtractionEnvironment,
  ImageExtractionError,
  imageExtractionInputSchema,
  imageExtractionResultSchema
} from '../image-extractor'
import { createRequestLogger } from '@/lib/services/logger'

// Mock logger to avoid actual logging during tests
jest.mock('@/lib/services/logger', () => ({
  createRequestLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }))
}))

// Mock HTMLImageElement and Canvas API
const mockImage = {
  naturalWidth: 800,
  naturalHeight: 600,
  onload: null as (() => void) | null,
  onerror: null as (() => void) | null,
  src: '',
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}

const mockCanvas = {
  width: 0,
  height: 0,
  getContext: jest.fn(),
  toDataURL: jest.fn(() => 'data:image/png;base64,extractedImageData')
}

const mockContext = {
  drawImage: jest.fn(),
  clearRect: jest.fn()
}

// Global mocks for browser environment
Object.defineProperty(global, 'Image', {
  writable: true,
  value: jest.fn(() => mockImage)
})

Object.defineProperty(global, 'document', {
  writable: true,
  value: {
    createElement: jest.fn((tagName: string) => {
      if (tagName === 'canvas') {
        return mockCanvas
      }
      return {}
    })
  }
})

Object.defineProperty(global, 'window', {
  writable: true,
  value: {}
})

describe('Image Extractor Service', () => {
  const validBase64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  const validBoundingBox = {
    x1: 0.1,
    y1: 0.2,
    x2: 0.6,
    y2: 0.8
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset mock canvas/context state
    mockCanvas.width = 0
    mockCanvas.height = 0
    mockCanvas.getContext.mockReturnValue(mockContext)
    
    // Reset mock image state
    mockImage.naturalWidth = 800
    mockImage.naturalHeight = 600
    mockImage.src = ''
    mockImage.onload = null
    mockImage.onerror = null
    
    // Reset context mock
    mockContext.drawImage.mockReset()
    mockContext.clearRect.mockReset()
    
    // Reset canvas mock
    mockCanvas.toDataURL.mockReturnValue('data:image/png;base64,extractedImageData')
  })

  describe('Schema Validation', () => {
    it('should validate correct input schema', () => {
      const validInput = {
        pageImageBase64: validBase64Image,
        pageNumber: 1,
        boundingBox: validBoundingBox,
        outputFormat: 'png' as const,
        quality: 0.95
      }

      expect(() => imageExtractionInputSchema.parse(validInput)).not.toThrow()
    })

    it('should validate bounding box coordinates within 0-1 range', () => {
      const invalidInput = {
        pageImageBase64: validBase64Image,
        pageNumber: 1,
        boundingBox: {
          x1: -0.1, // Outside 0-1 range
          y1: 0.2,
          x2: 0.6,
          y2: 0.8
        }
      }

      expect(() => imageExtractionInputSchema.parse(invalidInput)).toThrow()
    })

    it('should reject invalid page numbers', () => {
      const invalidInput = {
        pageImageBase64: validBase64Image,
        pageNumber: 0, // Must be >= 1
        boundingBox: validBoundingBox
      }

      expect(() => imageExtractionInputSchema.parse(invalidInput)).toThrow()
    })

    it('should validate extraction result schema', () => {
      const validResult = {
        base64Image: 'data:image/png;base64,extractedImageData',
        format: 'png' as const,
        width: 400,
        height: 360,
        originalPageWidth: 800,
        originalPageHeight: 600,
        extractionTimeMs: 150,
        boundingBox: validBoundingBox
      }

      expect(() => imageExtractionResultSchema.parse(validResult)).not.toThrow()
    })
  })

  describe('extractImageFromPage', () => {
    it('should extract image region successfully', async () => {
      // Mock successful image loading
      const mockImageConstructor = global.Image as jest.MockedClass<typeof Image>
      mockImageConstructor.mockImplementation(() => {
        const img = mockImage
        // Simulate successful image load
        setTimeout(() => {
          if (img.onload) img.onload()
        }, 0)
        return img as any
      })

      const input = {
        pageImageBase64: validBase64Image,
        pageNumber: 1,
        boundingBox: validBoundingBox,
        outputFormat: 'png' as const,
        quality: 0.95
      }

      const result = await extractImageFromPage(input)

      expect(result).toEqual({
        base64Image: 'data:image/png;base64,extractedImageData',
        format: 'png',
        width: 400, // (0.6 - 0.1) * 800 = 400
        height: 360, // (0.8 - 0.2) * 600 = 360
        originalPageWidth: 800,
        originalPageHeight: 600,
        extractionTimeMs: expect.any(Number),
        boundingBox: validBoundingBox
      })

      // Verify Canvas operations
      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d')
      expect(mockContext.drawImage).toHaveBeenCalledWith(
        mockImage,
        80, 120, 400, 360, // Source coordinates (x1*800, y1*600, width, height)
        0, 0, 400, 360     // Destination coordinates
      )
      expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/png', 0.95)
      expect(mockContext.clearRect).toHaveBeenCalledWith(0, 0, 400, 360)
    })

    it('should handle JPEG format with quality setting', async () => {
      const mockImageConstructor = global.Image as jest.MockedClass<typeof Image>
      mockImageConstructor.mockImplementation(() => {
        const img = mockImage
        setTimeout(() => {
          if (img.onload) img.onload()
        }, 0)
        return img as any
      })

      const input = {
        pageImageBase64: validBase64Image,
        pageNumber: 1,
        boundingBox: validBoundingBox,
        outputFormat: 'jpeg' as const,
        quality: 0.8
      }

      await extractImageFromPage(input)

      expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.8)
    })

    it('should handle base64 data without data URL prefix', async () => {
      const mockImageConstructor = global.Image as jest.MockedClass<typeof Image>
      mockImageConstructor.mockImplementation(() => {
        const img = mockImage
        setTimeout(() => {
          if (img.onload) img.onload()
        }, 0)
        return img as any
      })

      const input = {
        pageImageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', // No data: prefix
        pageNumber: 1,
        boundingBox: validBoundingBox
      }

      await extractImageFromPage(input)

      // Should add data URL prefix
      expect(mockImage.src).toBe('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
    })

    it('should throw error for invalid bounding box (x1 >= x2)', async () => {
      const input = {
        pageImageBase64: validBase64Image,
        pageNumber: 1,
        boundingBox: {
          x1: 0.5,
          y1: 0.2,
          x2: 0.5, // x1 === x2 - invalid
          y2: 0.8
        }
      }

      await expect(extractImageFromPage(input)).rejects.toThrow(ImageExtractionError)
      await expect(extractImageFromPage(input)).rejects.toThrow('Invalid bounding box: x1 (0.5) must be less than x2 (0.5)')
    })

    it('should throw error for invalid bounding box (y1 >= y2)', async () => {
      const input = {
        pageImageBase64: validBase64Image,
        pageNumber: 1,
        boundingBox: {
          x1: 0.1,
          y1: 0.8,
          x2: 0.6,
          y2: 0.7 // y1 > y2 - invalid
        }
      }

      await expect(extractImageFromPage(input)).rejects.toThrow(ImageExtractionError)
      await expect(extractImageFromPage(input)).rejects.toThrow('Invalid bounding box: y1 (0.8) must be less than y2 (0.7)')
    })

    it('should throw error for too small bounding box', async () => {
      const input = {
        pageImageBase64: validBase64Image,
        pageNumber: 1,
        boundingBox: {
          x1: 0.1,
          y1: 0.2,
          x2: 0.105, // Width = 0.005 < 0.01 minimum
          y2: 0.8
        }
      }

      await expect(extractImageFromPage(input)).rejects.toThrow(ImageExtractionError)
      await expect(extractImageFromPage(input)).rejects.toThrow('Bounding box too small')
    })

    it('should throw error when image fails to load', async () => {
      const mockImageConstructor = global.Image as jest.MockedClass<typeof Image>
      mockImageConstructor.mockImplementation(() => {
        const img = mockImage
        // Simulate image load error
        setTimeout(() => {
          if (img.onerror) img.onerror()
        }, 0)
        return img as any
      })

      const input = {
        pageImageBase64: 'invalid-image-data',
        pageNumber: 1,
        boundingBox: validBoundingBox
      }

      await expect(extractImageFromPage(input)).rejects.toThrow(ImageExtractionError)
      await expect(extractImageFromPage(input)).rejects.toThrow('Failed to load page image from base64 data')
    })

    it('should throw error when canvas context is not available', async () => {
      const mockImageConstructor = global.Image as jest.MockedClass<typeof Image>
      mockImageConstructor.mockImplementation(() => {
        const img = mockImage
        setTimeout(() => {
          if (img.onload) img.onload()
        }, 0)
        return img as any
      })

      // Mock canvas without 2D context
      mockCanvas.getContext.mockReturnValue(null)

      const input = {
        pageImageBase64: validBase64Image,
        pageNumber: 1,
        boundingBox: validBoundingBox
      }

      await expect(extractImageFromPage(input)).rejects.toThrow(ImageExtractionError)
      await expect(extractImageFromPage(input)).rejects.toThrow('Failed to create canvas 2D context')
    })

    it('should throw error for invalid extraction dimensions', async () => {
      const mockImageConstructor = global.Image as jest.MockedClass<typeof Image>
      mockImageConstructor.mockImplementation(() => {
        // Set natural dimensions to 0 to trigger invalid dimensions
        const img = { ...mockImage, naturalWidth: 0, naturalHeight: 0 }
        setTimeout(() => {
          if (img.onload) img.onload()
        }, 0)
        return img as any
      })

      const input = {
        pageImageBase64: validBase64Image,
        pageNumber: 1,
        boundingBox: validBoundingBox
      }

      await expect(extractImageFromPage(input)).rejects.toThrow(ImageExtractionError)
      await expect(extractImageFromPage(input)).rejects.toThrow('Invalid extraction dimensions')
    })
  })

  describe('extractMultipleRegions', () => {
    it('should extract multiple regions from same page image', async () => {
      const mockImageConstructor = global.Image as jest.MockedClass<typeof Image>
      mockImageConstructor.mockImplementation(() => {
        const img = mockImage
        setTimeout(() => {
          if (img.onload) img.onload()
        }, 0)
        return img as any
      })

      const regions = [
        { boundingBox: { x1: 0.1, y1: 0.1, x2: 0.4, y2: 0.4 } },
        { boundingBox: { x1: 0.6, y1: 0.6, x2: 0.9, y2: 0.9 }, outputFormat: 'jpeg' as const, quality: 0.8 }
      ]

      const results = await extractMultipleRegions(validBase64Image, 1, regions)

      expect(results).toHaveLength(2)
      expect(results[0].format).toBe('png') // Default format
      expect(results[1].format).toBe('jpeg') // Custom format
      expect(mockContext.drawImage).toHaveBeenCalledTimes(2)
    })

    it('should fail fast if any region extraction fails', async () => {
      const mockImageConstructor = global.Image as jest.MockedClass<typeof Image>
      mockImageConstructor.mockImplementation(() => {
        const img = mockImage
        setTimeout(() => {
          if (img.onload) img.onload()
        }, 0)
        return img as any
      })

      const regions = [
        { boundingBox: { x1: 0.1, y1: 0.1, x2: 0.4, y2: 0.4 } },
        { boundingBox: { x1: 0.6, y1: 0.9, x2: 0.9, y2: 0.6 } } // Invalid: y1 > y2
      ]

      await expect(extractMultipleRegions(validBase64Image, 1, regions))
        .rejects.toThrow(ImageExtractionError)
    })
  })

  describe('estimateExtractionMemoryUsage', () => {
    it('should calculate memory usage for PNG format', () => {
      const memoryUsage = estimateExtractionMemoryUsage(1000, 800, 3, 'png')
      
      // Expected calculation:
      // avgRegionArea = 1000 * 800 * 0.1 = 80,000
      // memoryPerRegion = 80,000 * 4 (PNG RGBA) = 320,000
      // totalMemory = 320,000 * 3 = 960,000
      // overhead = 1000 * 800 * 4 * 1.5 = 4,800,000
      // total = 960,000 + 4,800,000 = 5,760,000
      
      expect(memoryUsage).toBe(5760000)
    })

    it('should calculate memory usage for JPEG format', () => {
      const memoryUsage = estimateExtractionMemoryUsage(1000, 800, 2, 'jpeg')
      
      // Expected calculation:
      // avgRegionArea = 1000 * 800 * 0.1 = 80,000
      // memoryPerRegion = 80,000 * 1.5 (JPEG compressed) = 120,000
      // totalMemory = 120,000 * 2 = 240,000
      // overhead = 1000 * 800 * 4 * 1.5 = 4,800,000
      // total = 240,000 + 4,800,000 = 5,040,000
      
      expect(memoryUsage).toBe(5040000)
    })
  })

  describe('validateExtractionEnvironment', () => {
    it('should return supported when all APIs are available', () => {
      const validation = validateExtractionEnvironment()
      
      expect(validation.supported).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should detect missing browser environment', () => {
      const originalWindow = global.window
      delete (global as any).window
      
      const validation = validateExtractionEnvironment()
      
      expect(validation.supported).toBe(false)
      expect(validation.errors).toContain('Image extraction requires browser environment')
      
      // Restore window
      global.window = originalWindow
    })

    it('should detect missing Canvas API', () => {
      const originalDocument = global.document
      delete (global as any).document
      
      const validation = validateExtractionEnvironment()
      
      expect(validation.supported).toBe(false)
      expect(validation.errors).toContain('Canvas API not available')
      
      // Restore document
      global.document = originalDocument
    })

    it('should detect Canvas 2D context unavailability', () => {
      mockCanvas.getContext.mockReturnValue(null)
      
      const validation = validateExtractionEnvironment()
      
      expect(validation.supported).toBe(false)
      expect(validation.errors).toContain('Canvas 2D context not available')
      
      // Restore context
      mockCanvas.getContext.mockReturnValue(mockContext)
    })

    it('should detect missing Image constructor', () => {
      const originalImage = global.Image
      delete (global as any).Image
      
      const validation = validateExtractionEnvironment()
      
      expect(validation.supported).toBe(false)
      expect(validation.errors).toContain('Image constructor not available')
      
      // Restore Image
      global.Image = originalImage
    })
  })

  describe('Error Handling', () => {
    it('should wrap unexpected errors in ImageExtractionError', async () => {
      const mockImageConstructor = global.Image as jest.MockedClass<typeof Image>
      mockImageConstructor.mockImplementation(() => {
        throw new Error('Unexpected system error')
      })

      const input = {
        pageImageBase64: validBase64Image,
        pageNumber: 1,
        boundingBox: validBoundingBox
      }

      await expect(extractImageFromPage(input)).rejects.toThrow(ImageExtractionError)
      await expect(extractImageFromPage(input)).rejects.toThrow('Image extraction failed: Unexpected system error')
    })

    it('should preserve original ImageExtractionError', async () => {
      const input = {
        pageImageBase64: validBase64Image,
        pageNumber: 1,
        boundingBox: {
          x1: 0.6,
          y1: 0.2,
          x2: 0.5, // Invalid: x1 > x2
          y2: 0.8
        }
      }

      await expect(extractImageFromPage(input)).rejects.toThrow(ImageExtractionError)
      await expect(extractImageFromPage(input)).rejects.toThrow('Invalid bounding box')
    })
  })

  describe('Logging', () => {
    it('should log extraction progress and results', async () => {
      const mockLogger = {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
      }
      
      ;(createRequestLogger as jest.Mock).mockReturnValue(mockLogger)

      const mockImageConstructor = global.Image as jest.MockedClass<typeof Image>
      mockImageConstructor.mockImplementation(() => {
        const img = mockImage
        setTimeout(() => {
          if (img.onload) img.onload()
        }, 0)
        return img as any
      })

      const input = {
        pageImageBase64: validBase64Image,
        pageNumber: 1,
        boundingBox: validBoundingBox
      }

      await extractImageFromPage(input)

      expect(mockLogger.info).toHaveBeenCalledWith('Starting image extraction', expect.objectContaining({
        pageNumber: 1,
        boundingBox: validBoundingBox
      }))

      expect(mockLogger.info).toHaveBeenCalledWith('Page image loaded', expect.objectContaining({
        pageNumber: 1,
        originalWidth: 800,
        originalHeight: 600
      }))

      expect(mockLogger.info).toHaveBeenCalledWith('Image extraction completed', expect.objectContaining({
        pageNumber: 1,
        extractionTimeMs: expect.any(Number)
      }))
    })

    it('should log errors with context', async () => {
      const mockLogger = {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
      }
      
      ;(createRequestLogger as jest.Mock).mockReturnValue(mockLogger)

      const input = {
        pageImageBase64: validBase64Image,
        pageNumber: 1,
        boundingBox: {
          x1: 0.5,
          y1: 0.2,
          x2: 0.4, // Invalid
          y2: 0.8
        }
      }

      await expect(extractImageFromPage(input)).rejects.toThrow()

      expect(mockLogger.error).toHaveBeenCalledWith('Image extraction failed', expect.objectContaining({
        pageNumber: 1,
        extractionTimeMs: expect.any(Number),
        error: expect.stringContaining('Invalid bounding box')
      }))
    })
  })
})