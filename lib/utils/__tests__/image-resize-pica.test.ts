/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom'
import { resizeImage, calculateBase64SizeBytes, batchResizeImages, estimateReductionNeeded } from '../image-resize-pica'

// Mock Pica library
jest.mock('pica', () => {
  return jest.fn().mockImplementation(() => ({
    resize: jest.fn().mockImplementation(async (source, dest) => {
      // Mock resize by just copying source dimensions to dest
      const ctx = dest.getContext('2d')
      if (ctx && source instanceof HTMLCanvasElement) {
        ctx.drawImage(source, 0, 0, dest.width, dest.height)
      }
      return dest
    })
  }))
})

// Mock OffscreenCanvas for Node environment
global.OffscreenCanvas = class OffscreenCanvas {
  width: number
  height: number
  
  constructor(width: number, height: number) {
    this.width = width
    this.height = height
  }
  
  getContext() {
    return {
      drawImage: jest.fn()
    }
  }
  
  convertToBlob() {
    return Promise.resolve(new Blob(['mock'], { type: 'image/jpeg' }))
  }
} as any

describe('image-resize-pica', () => {
  // Mock canvas context
  const mockContext = {
    drawImage: jest.fn(),
    fillStyle: '',
    fillRect: jest.fn()
  }

  beforeAll(() => {
    // Mock getContext
    HTMLCanvasElement.prototype.getContext = jest.fn(() => mockContext) as any
  })

  // Create a small test image
  const createTestImage = (_width: number, _height: number): string => {
    // Return a minimal valid data URL
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  }

  // Mock FileReader for blob to base64 conversion
  const mockFileReader = {
    readAsDataURL: jest.fn(),
    onload: jest.fn(),
    onerror: jest.fn(),
    result: 'data:image/jpeg;base64,mockdata'
  }
  
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock FileReader
    global.FileReader = jest.fn(() => mockFileReader) as any
    mockFileReader.readAsDataURL.mockImplementation(function(this: any) {
      setTimeout(() => {
        if (this.onload) {
          this.result = 'data:image/jpeg;base64,mockdata'
          this.onload({ target: { result: this.result } })
        }
      }, 0)
    })
    
    // Mock Image loading
    global.Image = class {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      src = ''
      width = 100
      height = 100
      
      set src(value: string) {
        this.src = value
        // Parse dimensions from data URL if possible
        if (value.includes('canvas')) {
          this.width = 800
          this.height = 600
        }
        setTimeout(() => {
          if (this.onload) this.onload()
        }, 0)
      }
    } as any

    // Mock canvas.toBlob
    HTMLCanvasElement.prototype.toBlob = jest.fn(function(callback, type, _quality) {
      callback(new Blob(['mock'], { type: type || 'image/png' }))
    })
  })

  describe('calculateBase64SizeBytes', () => {
    it('should calculate size correctly for base64 string without data URL prefix', () => {
      const base64 = 'SGVsbG8gV29ybGQ=' // "Hello World"
      const size = calculateBase64SizeBytes(base64)
      expect(size).toBe(11) // "Hello World" is 11 bytes
    })

    it('should calculate size correctly for base64 string with data URL prefix', () => {
      const base64 = 'data:image/png;base64,SGVsbG8gV29ybGQ='
      const size = calculateBase64SizeBytes(base64)
      expect(size).toBe(11)
    })

    it('should handle padding correctly', () => {
      const base64 = 'SGVsbG8=' // "Hello" with padding
      const size = calculateBase64SizeBytes(base64)
      expect(size).toBe(5) // "Hello" is 5 bytes
    })
  })

  describe('resizeImage', () => {
    it('should return original image if already under size limit', async () => {
      const testImage = createTestImage(100, 100)
      const result = await resizeImage(testImage, {
        maxSizeBytes: 1024 * 1024 // 1MB, much larger than test image
      })

      expect(result.wasResized).toBe(false)
      expect(result.base64Image).toBe(testImage)
      expect(result.width).toBe(100)
      expect(result.height).toBe(100)
    })

    it('should resize image when over size limit', async () => {
      const testImage = createTestImage(800, 600)
      const result = await resizeImage(testImage, {
        maxSizeBytes: 100, // Very small to force resize
        format: 'jpeg',
        quality: 0.8
      })

      expect(result.wasResized).toBe(true)
      expect(result.base64Image).toContain('data:image/jpeg')
      expect(result.originalWidth).toBe(800)
      expect(result.originalHeight).toBe(600)
    })

    it('should respect maxDimension constraint', async () => {
      const testImage = createTestImage(800, 600)
      const result = await resizeImage(testImage, {
        maxDimension: 400,
        maxSizeBytes: 1024 * 1024 // Large enough to not trigger size constraint
      })

      expect(result.wasResized).toBe(true)
      // Should scale to fit within 400px
      expect(result.width).toBeLessThanOrEqual(400)
      expect(result.height).toBeLessThanOrEqual(400)
      // Should maintain aspect ratio
      expect(result.width / result.height).toBeCloseTo(800 / 600, 1)
    })

    it('should throw error if unable to resize within constraints', async () => {
      const testImage = createTestImage(800, 600)
      
      // Mock toBlob to always return large size
      HTMLCanvasElement.prototype.toBlob = jest.fn(function(callback) {
        callback(new Blob(['x'.repeat(1000)], { type: 'image/jpeg' }))
      })
      
      await expect(resizeImage(testImage, {
        maxSizeBytes: 10, // Impossibly small
        maxDimension: 1  // Minimum dimension
      })).rejects.toThrow('Unable to resize image to meet size constraints')
    })
  })

  describe('batchResizeImages', () => {
    it('should process multiple images', async () => {
      const images = [
        createTestImage(100, 100),
        createTestImage(200, 200),
        createTestImage(300, 300)
      ]

      let progressCalls = 0
      const onProgress = jest.fn((current, total) => {
        progressCalls++
        expect(current).toBe(progressCalls)
        expect(total).toBe(3)
      })

      const results = await batchResizeImages(images, {
        maxDimension: 150
      }, onProgress)

      expect(results).toHaveLength(3)
      expect(onProgress).toHaveBeenCalledTimes(3)
    })

    it('should throw error with context on failure', async () => {
      const images = [
        createTestImage(100, 100),
        'invalid-image-data'
      ]

      await expect(batchResizeImages(images)).rejects.toThrow('Failed to resize image 2:')
    })
  })

  describe('estimateReductionNeeded', () => {
    it('should estimate reduction correctly', () => {
      const result = estimateReductionNeeded(1000000, 500000) // 1MB to 500KB
      
      expect(result.percentReduction).toBe(50)
      expect(result.estimatedQuality).toBeGreaterThan(0.5)
      expect(result.estimatedQuality).toBeLessThan(1)
      expect(result.estimatedScaleFactor).toBeCloseTo(0.707, 2) // sqrt(0.5)
    })

    it('should handle edge cases', () => {
      const result = estimateReductionNeeded(1000000, 100) // 1MB to 100 bytes
      
      expect(result.percentReduction).toBeGreaterThan(99)
      expect(result.estimatedQuality).toBe(0.5) // Minimum quality
      expect(result.estimatedScaleFactor).toBe(0.5) // Minimum scale
    })
  })

  describe('Web Worker support', () => {
    it('should use OffscreenCanvas when available and useWebWorker is true', async () => {
      const testImage = createTestImage(200, 200)
      const result = await resizeImage(testImage, {
        maxDimension: 100,
        useWebWorker: true
      })

      expect(result.wasResized).toBe(true)
      expect(global.OffscreenCanvas).toHaveBeenCalled()
    })

    it('should fall back to regular canvas when useWebWorker is false', async () => {
      const testImage = createTestImage(200, 200)
      const createElementSpy = jest.spyOn(document, 'createElement')
      
      await resizeImage(testImage, {
        maxDimension: 100,
        useWebWorker: false
      })

      expect(createElementSpy).toHaveBeenCalledWith('canvas')
    })
  })
})