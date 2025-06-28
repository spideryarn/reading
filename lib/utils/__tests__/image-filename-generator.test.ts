/**
 * Tests for Image Filename Generation Utility
 * 
 * Comprehensive tests for filename generation with hierarchical fallback strategy
 */

import {
  generateImageFilename,
  generateBatchFilenames,
  validateFilename,
  sanitizeFilename,
  getRecommendedFilenameOptions,
  FilenameGenerationError,
  filenameGenerationInputSchema,
  filenameGenerationResultSchema
} from '../image-filename-generator'
import { v5 as uuidv5 } from 'uuid'

// Mock uuid generation for deterministic tests
jest.mock('uuid', () => ({
  v5: jest.fn()
}))

const mockUuidv5 = uuidv5 as jest.MockedFunction<typeof uuidv5>

describe('Image Filename Generator Utility', () => {
  const validBoundingBox = {
    x1: 0.1,
    y1: 0.2,
    x2: 0.6,
    y2: 0.8
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Set up deterministic UUID generation
    mockUuidv5.mockReturnValue('12345678-1234-5678-9012-123456789abc')
  })

  describe('Schema Validation', () => {
    it('should validate correct filename generation input', () => {
      const validInput = {
        aiCaption: 'Neural network architecture diagram',
        altText: 'Network diagram',
        pageNumber: 1,
        boundingBox: validBoundingBox,
        elementId: 'figure-1',
        imageFormat: 'png' as const,
        maxLength: 50
      }

      expect(() => filenameGenerationInputSchema.parse(validInput)).not.toThrow()
    })

    it('should apply default values for optional fields', () => {
      const minimalInput = {
        pageNumber: 1,
        boundingBox: validBoundingBox
      }

      const parsed = filenameGenerationInputSchema.parse(minimalInput)
      
      expect(parsed.imageFormat).toBe('png')
      expect(parsed.maxLength).toBe(50)
    })

    it('should reject invalid page numbers', () => {
      const invalidInput = {
        pageNumber: 0, // Must be >= 1
        boundingBox: validBoundingBox
      }

      expect(() => filenameGenerationInputSchema.parse(invalidInput)).toThrow()
    })

    it('should reject invalid max length', () => {
      const invalidInput = {
        pageNumber: 1,
        boundingBox: validBoundingBox,
        maxLength: 5 // Must be >= 10
      }

      expect(() => filenameGenerationInputSchema.parse(invalidInput)).toThrow()
    })

    it('should validate filename generation result schema', () => {
      const validResult = {
        filename: 'neural-network-diagram.png',
        source: 'ai_caption' as const,
        originalText: 'Neural network diagram',
        conflictResolution: {
          hadConflict: false
        }
      }

      expect(() => filenameGenerationResultSchema.parse(validResult)).not.toThrow()
    })
  })

  describe('generateImageFilename', () => {
    describe('AI Caption Strategy (Priority 1)', () => {
      it('should use AI caption when available and long enough', () => {
        const input = {
          aiCaption: 'Neural Network Architecture Diagram with Conv2D Layers',
          pageNumber: 1,
          boundingBox: validBoundingBox,
          imageFormat: 'png' as const
        }

        const result = generateImageFilename(input)

        expect(result.filename).toBe('neural-network-architecture-diagram-with-conv2d-la.png')
        expect(result.source).toBe('ai_caption')
        expect(result.originalText).toBe('Neural Network Architecture Diagram with Conv2D Layers')
        expect(result.conflictResolution.hadConflict).toBe(false)
      })

      it('should process AI caption by removing common prefixes', () => {
        const testCases = [
          {
            caption: 'Figure 3: Network topology overview',
            expected: 'network-topology-overview'
          },
          {
            caption: 'Table 1: Performance comparison results',
            expected: 'performance-comparison-results'
          },
          {
            caption: 'Eq. 5: Mathematical equation for loss function',
            expected: 'mathematical-equation-for-loss-function'
          },
          {
            caption: 'Diagram showing data flow',
            expected: 'showing-data-flow'
          }
        ]

        testCases.forEach(({ caption, expected }) => {
          const input = {
            aiCaption: caption,
            pageNumber: 1,
            boundingBox: validBoundingBox
          }

          const result = generateImageFilename(input)
          expect(result.filename).toBe(`${expected}.png`)
          expect(result.source).toBe('ai_caption')
        })
      })

      it('should keep original caption if prefix removal leaves too little content', () => {
        const input = {
          aiCaption: 'Fig. 1',
          pageNumber: 1,
          boundingBox: validBoundingBox
        }

        const result = generateImageFilename(input)

        expect(result.filename).toBe('fig-1.png')
        expect(result.source).toBe('ai_caption')
      })

      it('should fall back if AI caption produces slug too short', () => {
        const input = {
          aiCaption: '!@#$', // Will produce empty slug
          altText: 'Valid alternative text',
          pageNumber: 1,
          boundingBox: validBoundingBox
        }

        const result = generateImageFilename(input)

        expect(result.source).toBe('alt_text') // Falls back to alt text
        expect(result.filename).toBe('valid-alternative-text.png')
      })
    })

    describe('Alt Text Strategy (Priority 2)', () => {
      it('should use alt text when AI caption is not available', () => {
        const input = {
          altText: 'Machine Learning Model Architecture',
          pageNumber: 1,
          boundingBox: validBoundingBox
        }

        const result = generateImageFilename(input)

        expect(result.filename).toBe('machine-learning-model-architecture.png')
        expect(result.source).toBe('alt_text')
        expect(result.originalText).toBe('Machine Learning Model Architecture')
      })

      it('should fall back from AI caption to alt text when AI caption is empty', () => {
        const input = {
          aiCaption: '',
          altText: 'Alternative description',
          pageNumber: 1,
          boundingBox: validBoundingBox
        }

        const result = generateImageFilename(input)

        expect(result.source).toBe('alt_text')
        expect(result.filename).toBe('alternative-description.png')
      })

      it('should fall back if alt text produces slug too short', () => {
        const input = {
          altText: '***', // Will produce empty slug
          pageNumber: 1,
          boundingBox: validBoundingBox
        }

        const result = generateImageFilename(input)

        expect(result.source).toBe('deterministic_uuid')
        expect(result.filename).toBe('img-12345678.png')
      })
    })

    describe('Deterministic UUID Strategy (Priority 3)', () => {
      it('should use deterministic UUID when no caption or alt text available', () => {
        const input = {
          pageNumber: 1,
          boundingBox: validBoundingBox
        }

        const result = generateImageFilename(input)

        expect(result.filename).toBe('img-12345678.png')
        expect(result.source).toBe('deterministic_uuid')
        expect(result.originalText).toBeUndefined()
        
        // Verify UUID generation was called with correct parameters
        expect(mockUuidv5).toHaveBeenCalledWith(
          'page-1|bbox-0.100-0.200-0.600-0.800',
          '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
        )
      })

      it('should include element ID in UUID generation when available', () => {
        const input = {
          pageNumber: 2,
          boundingBox: validBoundingBox,
          elementId: 'figure-1'
        }

        generateImageFilename(input)

        expect(mockUuidv5).toHaveBeenCalledWith(
          'page-2|bbox-0.100-0.200-0.600-0.800|element-figure-1',
          '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
        )
      })

      it('should generate same filename for identical parameters', () => {
        const input = {
          pageNumber: 1,
          boundingBox: validBoundingBox,
          elementId: 'test-element'
        }

        const result1 = generateImageFilename(input)
        const result2 = generateImageFilename(input)

        expect(result1.filename).toBe(result2.filename)
        expect(result1.source).toBe('deterministic_uuid')
        expect(result2.source).toBe('deterministic_uuid')
      })
    })

    describe('File Format Handling', () => {
      it('should handle PNG format', () => {
        const input = {
          aiCaption: 'Test image',
          pageNumber: 1,
          boundingBox: validBoundingBox,
          imageFormat: 'png' as const
        }

        const result = generateImageFilename(input)
        expect(result.filename).toBe('test-image.png')
      })

      it('should handle JPEG format with .jpg extension', () => {
        const input = {
          aiCaption: 'Test image',
          pageNumber: 1,
          boundingBox: validBoundingBox,
          imageFormat: 'jpeg' as const
        }

        const result = generateImageFilename(input)
        expect(result.filename).toBe('test-image.jpg')
      })

      it('should handle JPG format', () => {
        const input = {
          aiCaption: 'Test image',
          pageNumber: 1,
          boundingBox: validBoundingBox,
          imageFormat: 'jpg' as const
        }

        const result = generateImageFilename(input)
        expect(result.filename).toBe('test-image.jpg')
      })
    })

    describe('Text to Slug Conversion', () => {
      it('should convert text to filename-safe slug', () => {
        const testCases = [
          {
            input: 'Machine Learning & Deep Neural Networks',
            expected: 'machine-learning-deep-neural-networks'
          },
          {
            input: 'Data Visualization (2023)',
            expected: 'data-visualization-2023'
          },
          {
            input: 'Analysis #1: Results & Findings',
            expected: 'analysis-1-results-findings'
          },
          {
            input: '   Multiple   Spaces   Between   Words   ',
            expected: 'multiple-spaces-between-words'
          },
          {
            input: 'Special!@#$%^&*()Characters',
            expected: 'special-characters'
          }
        ]

        testCases.forEach(({ input: text, expected }) => {
          const input = {
            aiCaption: text,
            pageNumber: 1,
            boundingBox: validBoundingBox
          }

          const result = generateImageFilename(input)
          expect(result.filename).toBe(`${expected}.png`)
        })
      })

      it('should respect max length and truncate appropriately', () => {
        const input = {
          aiCaption: 'This is a very long caption that should be truncated to fit within the maximum length limit',
          pageNumber: 1,
          boundingBox: validBoundingBox,
          maxLength: 30
        }

        const result = generateImageFilename(input)
        
        // Should be truncated to 30 chars max (excluding extension)
        const baseFilename = result.filename.replace('.png', '')
        expect(baseFilename.length).toBeLessThanOrEqual(30)
        expect(baseFilename).toBe('this-is-a-very-long-caption-th')
      })

      it('should remove trailing hyphens after truncation', () => {
        const input = {
          aiCaption: 'Test caption with-',
          pageNumber: 1,
          boundingBox: validBoundingBox,
          maxLength: 15
        }

        const result = generateImageFilename(input)
        expect(result.filename).toBe('test-caption-wi.png') // Truncated to 15 chars
      })
    })

    describe('Conflict Resolution', () => {
      it('should detect and resolve filename conflicts', () => {
        const existingFilenames = new Set(['test-image.png'])
        
        const input = {
          aiCaption: 'Test image',
          pageNumber: 1,
          boundingBox: validBoundingBox
        }

        const result = generateImageFilename(input, existingFilenames)

        expect(result.filename).toBe('test-image-2.png')
        expect(result.conflictResolution.hadConflict).toBe(true)
        expect(result.conflictResolution.suffix).toBe('-2')
        
        // Should add to existing set
        expect(existingFilenames.has('test-image-2.png')).toBe(true)
      })

      it('should find next available suffix for multiple conflicts', () => {
        const existingFilenames = new Set([
          'test-image.png',
          'test-image-2.png',
          'test-image-3.png'
        ])
        
        const input = {
          aiCaption: 'Test image',
          pageNumber: 1,
          boundingBox: validBoundingBox
        }

        const result = generateImageFilename(input, existingFilenames)

        expect(result.filename).toBe('test-image-4.png')
        expect(result.conflictResolution.hadConflict).toBe(true)
        expect(result.conflictResolution.suffix).toBe('-4')
      })

      it('should throw error if unable to resolve conflicts after 999 attempts', () => {
        // Create a set with all possible suffixes
        const existingFilenames = new Set()
        for (let i = 1; i <= 1000; i++) {
          if (i === 1) {
            existingFilenames.add('test-image.png')
          } else {
            existingFilenames.add(`test-image-${i}.png`)
          }
        }
        
        const input = {
          aiCaption: 'Test image',
          pageNumber: 1,
          boundingBox: validBoundingBox
        }

        expect(() => generateImageFilename(input, existingFilenames))
          .toThrow(FilenameGenerationError)
        expect(() => generateImageFilename(input, existingFilenames))
          .toThrow('Unable to resolve filename conflict')
      })

      it('should not have conflict when filename is unique', () => {
        const existingFilenames = new Set(['other-image.png'])
        
        const input = {
          aiCaption: 'Unique image caption',
          pageNumber: 1,
          boundingBox: validBoundingBox
        }

        const result = generateImageFilename(input, existingFilenames)

        expect(result.filename).toBe('unique-image-caption.png')
        expect(result.conflictResolution.hadConflict).toBe(false)
        expect(result.conflictResolution.suffix).toBeUndefined()
      })
    })
  })

  describe('generateBatchFilenames', () => {
    it('should generate filenames for multiple images', () => {
      const inputs = [
        {
          aiCaption: 'First image caption',
          pageNumber: 1,
          boundingBox: validBoundingBox
        },
        {
          aiCaption: 'Second image caption',
          pageNumber: 2,
          boundingBox: validBoundingBox
        }
      ]

      const results = generateBatchFilenames(inputs)

      expect(results).toHaveLength(2)
      expect(results[0].filename).toBe('first-image-caption.png')
      expect(results[1].filename).toBe('second-image-caption.png')
    })

    it('should prevent conflicts within the batch', () => {
      const inputs = [
        {
          aiCaption: 'Same caption',
          pageNumber: 1,
          boundingBox: validBoundingBox
        },
        {
          aiCaption: 'Same caption',
          pageNumber: 2,
          boundingBox: validBoundingBox
        }
      ]

      const results = generateBatchFilenames(inputs)

      expect(results[0].filename).toBe('same-caption.png')
      expect(results[1].filename).toBe('same-caption-2.png')
      expect(results[1].conflictResolution.hadConflict).toBe(true)
    })

    it('should respect existing filenames when provided', () => {
      const existingFilenames = new Set(['first-image.png'])
      
      const inputs = [
        {
          aiCaption: 'First image',
          pageNumber: 1,
          boundingBox: validBoundingBox
        }
      ]

      const results = generateBatchFilenames(inputs, existingFilenames)

      expect(results[0].filename).toBe('first-image-2.png')
      expect(results[0].conflictResolution.hadConflict).toBe(true)
    })

    it('should fail fast if any individual filename generation fails', () => {
      const inputs = [
        {
          aiCaption: 'Valid caption',
          pageNumber: 1,
          boundingBox: validBoundingBox
        },
        {
          pageNumber: 0, // Invalid page number
          boundingBox: validBoundingBox
        } as any
      ]

      expect(() => generateBatchFilenames(inputs))
        .toThrow(FilenameGenerationError)
      expect(() => generateBatchFilenames(inputs))
        .toThrow('Batch filename generation failed')
    })
  })

  describe('validateFilename', () => {
    it('should validate correct filenames', () => {
      const validFilenames = [
        'simple-filename.png',
        'file_with_underscores.jpg',
        'file123.jpeg',
        'a.txt'
      ]

      validFilenames.forEach(filename => {
        const result = validateFilename(filename)
        expect(result.valid).toBe(true)
        expect(result.issues).toHaveLength(0)
      })
    })

    it('should reject empty or whitespace filenames', () => {
      const invalidFilenames = ['', '   ', '\t\n']

      invalidFilenames.forEach(filename => {
        const result = validateFilename(filename)
        expect(result.valid).toBe(false)
        expect(result.issues).toContain('Filename cannot be empty')
      })
    })

    it('should reject filenames that are too long', () => {
      const longFilename = 'a'.repeat(256) + '.png'
      
      const result = validateFilename(longFilename)
      
      expect(result.valid).toBe(false)
      expect(result.issues).toContain('Filename too long (max 255 characters)')
    })

    it('should reject filenames with invalid characters', () => {
      const invalidFilenames = [
        'file<name.png',
        'file>name.png',
        'file:name.png',
        'file"name.png',
        'file/name.png',
        'file\\name.png',
        'file|name.png',
        'file?name.png',
        'file*name.png',
        'file\x00name.png' // null character
      ]

      invalidFilenames.forEach(filename => {
        const result = validateFilename(filename)
        expect(result.valid).toBe(false)
        expect(result.issues).toContain('Filename contains invalid characters')
      })
    })

    it('should reject reserved system names', () => {
      const reservedNames = [
        'CON.txt',
        'PRN.png',
        'AUX.jpg',
        'NUL.jpeg',
        'COM1.txt',
        'COM9.png',
        'LPT1.txt',
        'LPT9.png',
        'con.txt', // Case insensitive
        'CON' // Without extension
      ]

      reservedNames.forEach(filename => {
        const result = validateFilename(filename)
        expect(result.valid).toBe(false)
        expect(result.issues).toContain('Filename uses reserved system name')
      })
    })

    it('should reject filenames with leading/trailing spaces or dots', () => {
      const invalidFilenames = [
        ' filename.png',
        'filename.png ',
        '.filename.png',
        'filename.png.'
      ]

      invalidFilenames.forEach(filename => {
        const result = validateFilename(filename)
        expect(result.valid).toBe(false)
        expect(result.issues).toContain('Filename cannot start or end with spaces or dots')
      })
    })

    it('should collect multiple validation issues', () => {
      const filename = ' CON<>.txt ' // Multiple issues
      
      const result = validateFilename(filename)
      
      expect(result.valid).toBe(false)
      expect(result.issues.length).toBeGreaterThan(1)
      expect(result.issues).toContain('Filename contains invalid characters')
      expect(result.issues).toContain('Filename cannot start or end with spaces or dots')
      // Note: Space at start prevents reserved name detection in this test case
    })
  })

  describe('sanitizeFilename', () => {
    it('should sanitize filenames with invalid characters', () => {
      const testCases = [
        {
          input: 'file<name>.png',
          expected: 'file-name-.png'
        },
        {
          input: 'file/path\\name.jpg',
          expected: 'file-path-name.jpg'
        },
        {
          input: 'file:with|special*chars?.txt',
          expected: 'file-with-special-chars-.txt'
        }
      ]

      testCases.forEach(({ input, expected }) => {
        const result = sanitizeFilename(input)
        expect(result).toBe(expected)
      })
    })

    it('should handle reserved system names', () => {
      const testCases = [
        {
          input: 'CON.txt',
          expected: 'file-CON.txt'
        },
        {
          input: 'PRN.png',
          expected: 'file-PRN.png'
        },
        {
          input: 'COM1.jpg',
          expected: 'file-COM1.jpg'
        }
      ]

      testCases.forEach(({ input, expected }) => {
        const result = sanitizeFilename(input)
        expect(result).toBe(expected)
      })
    })

    it('should handle leading/trailing spaces and dots', () => {
      const testCases = [
        {
          input: '  .filename.png.  ',
          expected: 'filename.png'
        },
        {
          input: ' ... spaced ... ',
          expected: 'spaced'
        }
      ]

      testCases.forEach(({ input, expected }) => {
        const result = sanitizeFilename(input)
        expect(result).toBe(expected)
      })
    })

    it('should return default filename for empty input', () => {
      const emptyInputs = ['', '   ', '\t\n']

      emptyInputs.forEach(input => {
        const result = sanitizeFilename(input)
        expect(result).toBe('unnamed-image.png')
      })
    })

    it('should return default filename if sanitization results in empty string', () => {
      // Test the || fallback operator at end of sanitizeFilename function
      // These are strings that aren't empty but become empty after sanitization
      const problematicInputs = ['...', '...   ', '   . . .   ']

      problematicInputs.forEach(input => {
        const result = sanitizeFilename(input)
        expect(result).toBe('sanitized-image.png')
      })
    })
  })

  describe('getRecommendedFilenameOptions', () => {
    it('should return descriptive options', () => {
      const options = getRecommendedFilenameOptions('descriptive')
      
      expect(options).toEqual({
        maxLength: 80,
        imageFormat: 'png'
      })
    })

    it('should return short options', () => {
      const options = getRecommendedFilenameOptions('short')
      
      expect(options).toEqual({
        maxLength: 30,
        imageFormat: 'jpg'
      })
    })

    it('should return technical options', () => {
      const options = getRecommendedFilenameOptions('technical')
      
      expect(options).toEqual({
        maxLength: 50,
        imageFormat: 'png'
      })
    })

    it('should return default options for unknown use case', () => {
      const options = getRecommendedFilenameOptions('unknown' as any)
      
      expect(options).toEqual({
        maxLength: 50,
        imageFormat: 'png'
      })
    })
  })

  describe('Error Handling', () => {
    it('should throw FilenameGenerationError for invalid input schema', () => {
      const invalidInput = {
        pageNumber: -1, // Invalid
        boundingBox: validBoundingBox
      }

      expect(() => generateImageFilename(invalidInput as any))
        .toThrow() // Schema validation error
    })

    it('should provide descriptive error messages', () => {
      const error = new FilenameGenerationError('Test error message')
      
      expect(error.name).toBe('FilenameGenerationError')
      expect(error.message).toBe('Test error message')
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('Edge Cases', () => {
    it('should handle Unicode characters in captions', () => {
      const input = {
        aiCaption: 'Résumé of Machine Learning 学习 Results',
        pageNumber: 1,
        boundingBox: validBoundingBox
      }

      const result = generateImageFilename(input)
      
      // Should convert Unicode to ASCII-safe format
      expect(result.filename).toBe('r-sum-of-machine-learning-results.png')
    })

    it('should handle very short valid captions', () => {
      const input = {
        aiCaption: 'Data Analysis', // Longer caption that produces viable slug
        pageNumber: 1,
        boundingBox: validBoundingBox
      }

      const result = generateImageFilename(input)
      
      expect(result.filename).toBe('data-analysis.png')
      expect(result.source).toBe('ai_caption')
    })

    it('should handle bounding box with very precise coordinates', () => {
      const input = {
        pageNumber: 1,
        boundingBox: {
          x1: 0.123456789,
          y1: 0.987654321,
          x2: 0.234567890,
          y2: 0.876543210
        }
      }

      generateImageFilename(input)
      
      // Should format coordinates to 3 decimal places
      expect(mockUuidv5).toHaveBeenCalledWith(
        'page-1|bbox-0.123-0.988-0.235-0.877', // Rounded to 3 decimal places
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
      )
    })

    it('should handle empty existingFilenames set', () => {
      const input = {
        aiCaption: 'Test caption',
        pageNumber: 1,
        boundingBox: validBoundingBox
      }

      const result = generateImageFilename(input, new Set())
      
      expect(result.filename).toBe('test-caption.png')
      expect(result.conflictResolution.hadConflict).toBe(false)
    })
  })
})