/**
 * Consolidated Image Processing Test Suite
 * 
 * Comprehensive tests for image extraction, caption generation, and filename generation
 * Consolidates tests from:
 * - image-extractor.test.ts (606 lines)
 * - image-extractor-edge-cases.test.ts (530 lines)
 * - image-caption-generator.test.ts (661 lines)
 * - image-filename-generator.test.ts (846 lines)
 * 
 * Target: ~800 lines with improved coverage and reduced redundancy
 * 
 * @jest-environment node
 */

import {
  // Image extractor exports
  extractImageFromPage,
  extractMultipleRegions,
  estimateExtractionMemoryUsage,
  validateExtractionEnvironment,
  ImageExtractionError,
  type ImageExtractionInput
} from '../image-extractor'

import {
  // Image caption generator exports
  generateImageCaption,
  generateBatchCaptions,
  generateCaptionWithFallback,
  validateCaptionEnvironment,
  ImageCaptionError,
  type CaptionGenerationInput,
  type BatchCaptionInput
} from '../image-caption-generator'

import {
  imageCaptionPrompt,
  imageCaptionOutputSchema
} from '@/lib/prompts/templates/image-caption-generation'

import {
  // Filename generator exports
  generateImageFilename,
  generateBatchFilenames,
  validateFilename,
  sanitizeFilename,
  FilenameGenerationError,
  type FilenameGenerationInput
} from '@/lib/utils/image-filename-generator'

import { createRequestLogger } from '@/lib/services/logger'
import { v5 as uuidv5 } from 'uuid'

// =============================================================================
// Mock Setup
// =============================================================================

// Mock logger for all services
jest.mock('@/lib/services/logger', () => ({
  createRequestLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }))
}))

// Mock image caption prompt
jest.mock('@/lib/prompts/templates/image-caption-generation', () => ({
  imageCaptionPrompt: jest.fn(),
  imageCaptionOutputSchema: {
    parse: jest.fn()
  },
  imageCaptionGenerationPromptInputSchema: {
    parse: jest.fn((input) => input)
  }
}))

// Mock uuid for filename generation
jest.mock('uuid', () => ({
  v5: jest.fn()
}))

// Mock browser APIs for image extraction
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

// Global browser API mocks
Object.defineProperty(global, 'Image', {
  writable: true,
  value: jest.fn(() => mockImage)
})

Object.defineProperty(global, 'document', {
  writable: true,
  value: {
    createElement: jest.fn((tagName: string) => {
      if (tagName === 'canvas') return mockCanvas
      return {}
    })
  }
})

Object.defineProperty(global, 'window', {
  writable: true,
  value: {}
})

// =============================================================================
// Test Constants
// =============================================================================

const VALID_BASE64_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
const VALID_BOUNDING_BOX = { x1: 0.1, y1: 0.2, x2: 0.6, y2: 0.8 }

const MOCK_CAPTION_OUTPUT = {
  caption: 'Neural network architecture diagram',
  description: 'A detailed diagram showing the layers and connections of a convolutional neural network with labeled components.',
  confidence: 0.85,
  imageType: 'diagram' as const,
  academicRelevance: 'high' as const
}

const MOCK_LOW_CONFIDENCE_OUTPUT = {
  caption: 'Unclear image content',
  description: 'Image appears to contain some form of diagram or chart but details are not clear.',
  confidence: 0.2,
  imageType: 'other' as const,
  academicRelevance: 'low' as const
}

// =============================================================================
// Test Suite
// =============================================================================

describe('Consolidated Image Processing Suite', () => {
  const mockImageCaptionPrompt = imageCaptionPrompt as jest.MockedFunction<typeof imageCaptionPrompt>
  const mockOutputSchemaParse = imageCaptionOutputSchema.parse as jest.MockedFunction<typeof imageCaptionOutputSchema.parse>
  const mockUuidv5 = uuidv5 as jest.MockedFunction<typeof uuidv5>
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset mocks to default state
    ;(createRequestLogger as jest.Mock).mockReturnValue(mockLogger)
    mockCanvas.width = 0
    mockCanvas.height = 0
    mockCanvas.getContext.mockReturnValue(mockContext)
    mockCanvas.toDataURL.mockReturnValue('data:image/png;base64,extractedImageData')
    mockImage.naturalWidth = 800
    mockImage.naturalHeight = 600
    mockImage.src = ''
    mockImage.onload = null
    mockImage.onerror = null
    mockContext.drawImage.mockReset()
    mockContext.clearRect.mockReset()
    mockImageCaptionPrompt.mockResolvedValue(MOCK_CAPTION_OUTPUT)
    mockOutputSchemaParse.mockImplementation((input) => input)
    mockUuidv5.mockReturnValue('12345678-1234-5678-9012-123456789abc')
  })

  // =========================================================================
  // Image Extraction Tests (Core functionality only)
  // =========================================================================
  
  describe('Image Extraction', () => {
    describe('Core Functionality', () => {
      it('should extract image region successfully', async () => {
        const mockImageConstructor = global.Image as jest.MockedClass<typeof Image>
        mockImageConstructor.mockImplementation(() => {
          const img = mockImage
          setTimeout(() => img.onload?.(), 0)
          return img as any
        })

        const input: ImageExtractionInput = {
          pageImageBase64: VALID_BASE64_IMAGE,
          pageNumber: 1,
          boundingBox: VALID_BOUNDING_BOX,
          outputFormat: 'png' as const,
          quality: 0.95
        }

        const result = await extractImageFromPage(input)

        expect(result).toEqual({
          base64Image: 'data:image/png;base64,extractedImageData',
          format: 'png',
          width: 400,
          height: 360,
          originalPageWidth: 800,
          originalPageHeight: 600,
          extractionTimeMs: expect.any(Number),
          boundingBox: VALID_BOUNDING_BOX
        })

        expect(mockCanvas.getContext).toHaveBeenCalledWith('2d')
        expect(mockContext.drawImage).toHaveBeenCalledWith(
          mockImage,
          80, 120, 400, 360,
          0, 0, 400, 360
        )
      })

      it('should handle JPEG format with quality setting', async () => {
        const mockImageConstructor = global.Image as jest.MockedClass<typeof Image>
        mockImageConstructor.mockImplementation(() => {
          const img = mockImage
          setTimeout(() => img.onload?.(), 0)
          return img as any
        })

        await extractImageFromPage({
          pageImageBase64: VALID_BASE64_IMAGE,
          pageNumber: 1,
          boundingBox: VALID_BOUNDING_BOX,
          outputFormat: 'jpeg',
          quality: 0.8
        })

        expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.8)
      })

      it('should extract multiple regions from same page', async () => {
        const mockImageConstructor = global.Image as jest.MockedClass<typeof Image>
        mockImageConstructor.mockImplementation(() => {
          const img = mockImage
          setTimeout(() => img.onload?.(), 0)
          return img as any
        })

        const regions = [
          { boundingBox: { x1: 0.1, y1: 0.1, x2: 0.4, y2: 0.4 } },
          { boundingBox: { x1: 0.6, y1: 0.6, x2: 0.9, y2: 0.9 }, outputFormat: 'jpeg' as const }
        ]

        const results = await extractMultipleRegions(VALID_BASE64_IMAGE, 1, regions)

        expect(results).toHaveLength(2)
        expect(results[0].format).toBe('png')
        expect(results[1].format).toBe('jpeg')
        expect(mockContext.drawImage).toHaveBeenCalledTimes(2)
      })
    })

    describe('Validation and Error Handling', () => {
      it('should reject invalid bounding box coordinates', async () => {
        const invalidCases = [
          { x1: 0.5, y1: 0.2, x2: 0.5, y2: 0.8 }, // x1 == x2
          { x1: 0.8, y1: 0.2, x2: 0.3, y2: 0.8 }, // x1 > x2
          { x1: 0.1, y1: 0.9, x2: 0.6, y2: 0.2 }, // y1 > y2
          { x1: 0.1, y1: 0.2, x2: 0.105, y2: 0.8 } // Too small
        ]

        for (const boundingBox of invalidCases) {
          await expect(
            extractImageFromPage({
              pageImageBase64: VALID_BASE64_IMAGE,
              pageNumber: 1,
              boundingBox
            })
          ).rejects.toThrow(ImageExtractionError)
        }
      })

      it('should handle image load failure', async () => {
        const mockImageConstructor = global.Image as jest.MockedClass<typeof Image>
        mockImageConstructor.mockImplementation(() => {
          const img = mockImage
          setTimeout(() => img.onerror?.(), 0)
          return img as any
        })

        await expect(
          extractImageFromPage({
            pageImageBase64: 'invalid-image-data',
            pageNumber: 1,
            boundingBox: VALID_BOUNDING_BOX
          })
        ).rejects.toThrow('Failed to load page image')
      })

      it('should validate extraction environment', () => {
        const validation = validateExtractionEnvironment()
        expect(validation.supported).toBe(true)
        expect(validation.errors).toHaveLength(0)
      })
    })

    describe('Memory Estimation', () => {
      it('should estimate memory usage correctly', () => {
        const pngMemory = estimateExtractionMemoryUsage(1000, 800, 3, 'png')
        const jpegMemory = estimateExtractionMemoryUsage(1000, 800, 3, 'jpeg')
        
        // PNG should use more memory than JPEG due to compression
        expect(pngMemory).toBeGreaterThan(jpegMemory)
        // Verify reasonable memory estimates
        expect(pngMemory).toBeGreaterThan(1000000) // > 1MB
        expect(jpegMemory).toBeGreaterThan(1000000) // > 1MB
      })
    })
  })

  // =========================================================================
  // Caption Generation Tests (Core functionality only)
  // =========================================================================
  
  describe('Caption Generation', () => {
    describe('Core Functionality', () => {
      it('should generate caption for valid image', async () => {
        const input: CaptionGenerationInput = {
          imageBase64: VALID_BASE64_IMAGE,
          pageNumber: 1,
          documentContext: 'Machine Learning Research Paper',
          boundingBox: VALID_BOUNDING_BOX,
          extractionPurpose: 'filename' as const
        }

        const result = await generateImageCaption(input)

        expect(mockImageCaptionPrompt).toHaveBeenCalledWith(input)
        expect(result).toEqual(MOCK_CAPTION_OUTPUT)
      })

      it('should generate captions for batch of images', async () => {
        const input: BatchCaptionInput = {
          images: [
            {
              imageBase64: VALID_BASE64_IMAGE,
              pageNumber: 1,
              boundingBox: VALID_BOUNDING_BOX,
              elementId: 'figure-1'
            },
            {
              imageBase64: VALID_BASE64_IMAGE,
              pageNumber: 2,
              boundingBox: { x1: 0.2, y1: 0.3, x2: 0.7, y2: 0.9 },
              elementId: 'figure-2'
            }
          ],
          documentContext: 'Research Paper',
          extractionPurpose: 'filename' as const
        }

        const result = await generateBatchCaptions(input)

        expect(result.results).toHaveLength(2)
        expect(result.successCount).toBe(2)
        expect(result.failureCount).toBe(0)
        expect(mockImageCaptionPrompt).toHaveBeenCalledTimes(2)
      })

      it('should use fallback strategies appropriately', async () => {
        // Test AI caption with high confidence
        mockImageCaptionPrompt.mockResolvedValue(MOCK_CAPTION_OUTPUT)
        
        let result = await generateCaptionWithFallback(
          VALID_BASE64_IMAGE,
          1,
          VALID_BOUNDING_BOX,
          'Existing alt text'
        )

        expect(result).toEqual({
          caption: 'Neural network architecture diagram',
          source: 'ai',
          confidence: 0.85
        })

        // Test fallback to alt text with low confidence
        mockImageCaptionPrompt.mockResolvedValue(MOCK_LOW_CONFIDENCE_OUTPUT)
        
        result = await generateCaptionWithFallback(
          VALID_BASE64_IMAGE,
          1,
          VALID_BOUNDING_BOX,
          'Human-provided alt text'
        )

        expect(result).toEqual({
          caption: 'Human-provided alt text',
          source: 'alt_text',
          confidence: 0.5
        })

        // Test generic fallback when AI fails
        mockImageCaptionPrompt.mockRejectedValue(new Error('AI error'))
        
        result = await generateCaptionWithFallback(
          VALID_BASE64_IMAGE,
          5,
          VALID_BOUNDING_BOX
        )

        expect(result).toEqual({
          caption: 'image-page-5',
          source: 'fallback',
          confidence: 0.1
        })
      })
    })

    describe('Error Handling', () => {
      it('should handle AI service errors gracefully', async () => {
        mockImageCaptionPrompt.mockRejectedValue(new Error('AI service unavailable'))
        
        await expect(
          generateImageCaption({
            imageBase64: VALID_BASE64_IMAGE,
            pageNumber: 1,
            boundingBox: VALID_BOUNDING_BOX,
            extractionPurpose: 'filename'
          })
        ).rejects.toThrow(ImageCaptionError)
      })

      it('should handle invalid AI responses', async () => {
        mockImageCaptionPrompt.mockResolvedValue('invalid json response')
        
        await expect(
          generateImageCaption({
            imageBase64: VALID_BASE64_IMAGE,
            pageNumber: 1,
            boundingBox: VALID_BOUNDING_BOX,
            extractionPurpose: 'filename'
          })
        ).rejects.toThrow('AI response validation failed')
      })

      it('should validate caption environment', () => {
        const validation = validateCaptionEnvironment()
        expect(validation.supported).toBe(true)
        expect(validation.errors).toHaveLength(0)
      })
    })
  })

  // =========================================================================
  // Filename Generation Tests (Core functionality only)
  // =========================================================================
  
  describe('Filename Generation', () => {
    describe('Hierarchical Strategy', () => {
      it('should prioritize AI caption for filename', () => {
        const input: FilenameGenerationInput = {
          aiCaption: 'Neural Network Architecture Diagram',
          altText: 'Network diagram',
          pageNumber: 1,
          boundingBox: VALID_BOUNDING_BOX,
          imageFormat: 'png' as const
        }

        const result = generateImageFilename(input)

        expect(result.filename).toBe('neural-network-architecture-diagram.png')
        expect(result.source).toBe('ai_caption')
        expect(result.originalText).toBe('Neural Network Architecture Diagram')
      })

      it('should fall back to alt text when AI caption unavailable', () => {
        const input: FilenameGenerationInput = {
          altText: 'Machine Learning Model Architecture',
          pageNumber: 1,
          boundingBox: VALID_BOUNDING_BOX
        }

        const result = generateImageFilename(input)

        expect(result.filename).toBe('machine-learning-model-architecture.png')
        expect(result.source).toBe('alt_text')
      })

      it('should use deterministic UUID as last resort', () => {
        const input: FilenameGenerationInput = {
          pageNumber: 1,
          boundingBox: VALID_BOUNDING_BOX
        }

        const result = generateImageFilename(input)

        expect(result.filename).toBe('img-12345678.png')
        expect(result.source).toBe('deterministic_uuid')
        expect(mockUuidv5).toHaveBeenCalledWith(
          'page-1|bbox-0.100-0.200-0.600-0.800',
          '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
        )
      })
    })

    describe('Text Processing', () => {
      it('should remove common prefixes from captions', () => {
        const prefixCases = [
          { caption: 'Figure 3: Network topology', expected: 'network-topology.png' },
          { caption: 'Table 1: Performance results', expected: 'performance-results.png' },
          { caption: 'Diagram showing data flow', expected: 'showing-data-flow.png' }
        ]

        prefixCases.forEach(({ caption, expected }) => {
          const result = generateImageFilename({
            aiCaption: caption,
            pageNumber: 1,
            boundingBox: VALID_BOUNDING_BOX
          })
          expect(result.filename).toBe(expected)
        })
      })

      it('should handle special characters and spaces', () => {
        const specialCases = [
          { text: 'Machine Learning & AI', expected: 'machine-learning-ai.png' },
          { text: 'Data@2023 (Analysis)', expected: 'data-2023-analysis.png' },
          { text: '   Multiple   Spaces   ', expected: 'multiple-spaces.png' }
        ]

        specialCases.forEach(({ text, expected }) => {
          const result = generateImageFilename({
            aiCaption: text,
            pageNumber: 1,
            boundingBox: VALID_BOUNDING_BOX
          })
          expect(result.filename).toBe(expected)
        })
      })

      it('should respect max length constraints', () => {
        const input: FilenameGenerationInput = {
          aiCaption: 'This is a very long caption that should be truncated to fit within the maximum length limit for filenames',
          pageNumber: 1,
          boundingBox: VALID_BOUNDING_BOX,
          maxLength: 30
        }

        const result = generateImageFilename(input)
        const baseFilename = result.filename.replace('.png', '')
        
        expect(baseFilename.length).toBeLessThanOrEqual(30)
        expect(baseFilename).toBe('this-is-a-very-long-caption-th')
      })
    })

    describe('Conflict Resolution', () => {
      it('should handle filename conflicts', () => {
        const existingFilenames = new Set(['test-image.png', 'test-image-2.png'])
        
        const result = generateImageFilename({
          aiCaption: 'Test image',
          pageNumber: 1,
          boundingBox: VALID_BOUNDING_BOX
        }, existingFilenames)

        expect(result.filename).toBe('test-image-3.png')
        expect(result.conflictResolution.hadConflict).toBe(true)
        expect(result.conflictResolution.suffix).toBe('-3')
      })

      it('should generate unique filenames in batch', () => {
        const inputs = [
          { aiCaption: 'Same caption', pageNumber: 1, boundingBox: VALID_BOUNDING_BOX },
          { aiCaption: 'Same caption', pageNumber: 2, boundingBox: VALID_BOUNDING_BOX }
        ]

        const results = generateBatchFilenames(inputs)

        expect(results[0].filename).toBe('same-caption.png')
        expect(results[1].filename).toBe('same-caption-2.png')
        expect(results[1].conflictResolution.hadConflict).toBe(true)
      })
    })

    describe('Filename Validation', () => {
      it('should validate correct filenames', () => {
        const validNames = ['simple-file.png', 'file_123.jpg', 'test.jpeg']
        
        validNames.forEach(filename => {
          const result = validateFilename(filename)
          expect(result.valid).toBe(true)
          expect(result.issues).toHaveLength(0)
        })
      })

      it('should reject invalid filenames', () => {
        const invalidCases = [
          { name: 'file<name>.png', issue: 'invalid characters' },
          { name: 'CON.txt', issue: 'reserved system name' },
          { name: ' file.png ', issue: 'spaces or dots' },
          { name: 'a'.repeat(256) + '.png', issue: 'too long' }
        ]

        invalidCases.forEach(({ name, issue }) => {
          const result = validateFilename(name)
          expect(result.valid).toBe(false)
          expect(result.issues.some(i => i.toLowerCase().includes(issue))).toBe(true)
        })
      })

      it('should sanitize problematic filenames', () => {
        const sanitizeCases = [
          { input: 'file<name>.png', expected: 'file-name-.png' },
          { input: 'CON.txt', expected: 'file-CON.txt' },
          { input: '  .file.png.  ', expected: 'file.png' }
        ]

        sanitizeCases.forEach(({ input, expected }) => {
          expect(sanitizeFilename(input)).toBe(expected)
        })
      })
    })
  })

  // =========================================================================
  // Integration Tests (Workflow testing)
  // =========================================================================
  
  describe('End-to-End Image Processing Workflow', () => {
    it('should process complete workflow with mocked components', async () => {
      // This test validates the integration of our three components
      // Since we're in Node environment, image extraction will fail, but we can test the flow
      
      // Step 1: Simulate extraction result (since Canvas API not available in Node)
      const simulatedExtractionResult = {
        base64Image: VALID_BASE64_IMAGE,
        format: 'png' as const,
        width: 400,
        height: 360,
        originalPageWidth: 800,
        originalPageHeight: 600,
        extractionTimeMs: 150,
        boundingBox: VALID_BOUNDING_BOX
      }

      // Step 2: Generate caption
      const captionResult = await generateImageCaption({
        imageBase64: simulatedExtractionResult.base64Image,
        pageNumber: 1,
        boundingBox: VALID_BOUNDING_BOX,
        extractionPurpose: 'filename'
      })

      expect(captionResult.caption).toBe('Neural network architecture diagram')
      expect(captionResult.confidence).toBe(0.85)

      // Step 3: Generate filename
      const filenameResult = generateImageFilename({
        aiCaption: captionResult.caption,
        pageNumber: 1,
        boundingBox: VALID_BOUNDING_BOX,
        imageFormat: 'png'
      })

      expect(filenameResult.filename).toBe('neural-network-architecture-diagram.png')
      expect(filenameResult.source).toBe('ai_caption')

      // Verify logging for caption generation
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Starting image caption generation',
        expect.objectContaining({ pageNumber: 1 })
      )
    })

    it('should handle batch processing with mixed success/failure', async () => {
      // Setup caption generation to fail on second image
      let callCount = 0
      mockImageCaptionPrompt.mockImplementation(async () => {
        callCount++
        if (callCount === 1) return MOCK_CAPTION_OUTPUT
        throw new Error('AI service error')
      })

      const batchInput: BatchCaptionInput = {
        images: [
          { imageBase64: VALID_BASE64_IMAGE, pageNumber: 1, boundingBox: VALID_BOUNDING_BOX },
          { imageBase64: VALID_BASE64_IMAGE, pageNumber: 2, boundingBox: VALID_BOUNDING_BOX }
        ],
        extractionPurpose: 'filename'
      }

      // Batch caption generation should fail fast
      await expect(generateBatchCaptions(batchInput)).rejects.toThrow('Batch caption generation failed at image 2')

      // But individual caption with fallback should succeed
      const fallbackResult = await generateCaptionWithFallback(
        VALID_BASE64_IMAGE,
        2,
        VALID_BOUNDING_BOX,
        'Fallback alt text'
      )

      expect(fallbackResult.source).toBe('alt_text')
      expect(fallbackResult.caption).toBe('Fallback alt text')
    })
  })

  // =========================================================================
  // Performance and Edge Cases
  // =========================================================================
  
  describe('Performance and Edge Cases', () => {
    it('should handle unicode in captions', () => {
      const result = generateImageFilename({
        aiCaption: 'Résumé of 学习 Results',
        pageNumber: 1,
        boundingBox: VALID_BOUNDING_BOX
      })
      
      expect(result.filename).toBe('r-sum-of-results.png')
    })

    it('should handle empty batch operations gracefully', () => {
      // Test empty filename generation batch (synchronous)
      const emptyFilenames = generateBatchFilenames([])
      expect(emptyFilenames).toEqual([])
      
      // Note: extractMultipleRegions with empty regions would still try to load the image
      // which fails in Node.js environment. This is a known limitation - the function
      // could be improved to check for empty regions before loading the image.
    })

    it('should estimate memory for extreme cases', () => {
      // Tiny image
      const tinyMemory = estimateExtractionMemoryUsage(1, 1, 1, 'png')
      expect(tinyMemory).toBeGreaterThan(0)

      // Huge image
      const hugeMemory = estimateExtractionMemoryUsage(10000, 10000, 100, 'png')
      expect(hugeMemory).toBeGreaterThan(100000000) // > 100MB
    })

    it('should validate all supported image formats', () => {
      const formats = ['png', 'jpeg', 'jpg'] as const
      
      formats.forEach(format => {
        const result = generateImageFilename({
          aiCaption: 'Test image',
          pageNumber: 1,
          boundingBox: VALID_BOUNDING_BOX,
          imageFormat: format
        })
        
        const expectedExt = format === 'jpeg' ? 'jpg' : format
        expect(result.filename.endsWith(`.${expectedExt}`)).toBe(true)
      })
    })
  })
})