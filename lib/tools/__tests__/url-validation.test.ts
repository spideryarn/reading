// Tests for URL state validation functionality
// Ensures proper validation and error handling for URL parameters

import { validateUrlState, validateUrlLength, logValidationErrors } from '../url-validation'
import type { ToolUrlState } from '../url-state-types'

describe('URL State Validation', () => {
  describe('validateUrlState', () => {
    it('should validate valid state without errors', () => {
      const validState: ToolUrlState = {
        tab: 'search',
        term: 'example term',
        q: 'search query',
        type: 'text',
        case: true,
        level: 'moderate',
        expertise: 'intermediate',
        length: 'single_short_paragraph',
        conversation: '123e4567-e89b-12d3-a456-426614174000',
        highlight: 'highlight criteria',
        scroll: 'element-123'
      }

      const result = validateUrlState(validState)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.sanitized).toEqual(validState)
    })

    it('should handle empty state', () => {
      const result = validateUrlState({})
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.sanitized).toEqual({})
    })

    it('should validate tab parameter', () => {
      const invalidState: ToolUrlState = {
        tab: 'invalid-tab' as any
      }

      const result = validateUrlState(invalidState)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]!.parameter).toBe('tab')
      expect(result.errors[0]!.error).toContain('Invalid tab')
      expect(result.sanitized.tab).toBe('original')
    })

    it('should validate and trim string parameters', () => {
      const invalidState: ToolUrlState = {
        term: '  whitespace term  ',
        q: '  search query  ',
        highlight: '  highlight criteria  '
      }

      const result = validateUrlState(invalidState)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.sanitized.term).toBe('whitespace term')
      expect(result.sanitized.q).toBe('search query')
      expect(result.sanitized.highlight).toBe('highlight criteria')
    })

    it('should handle string length limits', () => {
      const longTermString = 'a'.repeat(300) // Exceeds 200 limit
      const longQueryString = 'a'.repeat(600) // Exceeds 500 limit  
      const longHighlightString = 'a'.repeat(300) // Exceeds 200 limit
      
      const invalidState: ToolUrlState = {
        term: longTermString,
        q: longQueryString,
        highlight: longHighlightString
      }

      const result = validateUrlState(invalidState)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(3)
      expect(result.sanitized.term).toBe('a'.repeat(200))
      expect(result.sanitized.q).toBe('a'.repeat(500))
      expect(result.sanitized.highlight).toBe('a'.repeat(200))
    })

    it('should validate search type parameter', () => {
      const invalidState: ToolUrlState = {
        type: 'invalid-type' as any
      }

      const result = validateUrlState(invalidState)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]!.parameter).toBe('type')
      expect(result.sanitized.type).toBe('text')
    })

    it('should validate boolean case parameter', () => {
      const invalidState: ToolUrlState = {
        case: 'not-boolean' as any
      }

      const result = validateUrlState(invalidState)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]!.parameter).toBe('case')
      expect(result.sanitized.case).toBe(false)
    })

    it('should validate conversation UUID format', () => {
      const invalidState: ToolUrlState = {
        conversation: 'not-a-uuid'
      }

      const result = validateUrlState(invalidState)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]!.parameter).toBe('conversation')
      expect(result.errors[0]!.error).toContain('valid UUID format')
      expect(result.sanitized.conversation).toBeUndefined()
    })

    it('should validate element ID format for scroll parameter', () => {
      const invalidState: ToolUrlState = {
        scroll: 'invalid!@#$%element'
      }

      const result = validateUrlState(invalidState)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]!.parameter).toBe('scroll')
      expect(result.errors[0]!.error).toContain('valid element ID')
      expect(result.sanitized.scroll).toBeUndefined()
    })

    it('should handle empty strings as clearing parameters', () => {
      const emptyState: ToolUrlState = {
        term: '',
        q: '',
        conversation: '',
        highlight: '',
        scroll: ''
      }

      const result = validateUrlState(emptyState)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.sanitized.term).toBeUndefined()
      expect(result.sanitized.q).toBeUndefined()
      expect(result.sanitized.conversation).toBeUndefined()
      expect(result.sanitized.highlight).toBeUndefined()
      expect(result.sanitized.scroll).toBeUndefined()
    })

    it('should validate multi-dimensional summary parameters', () => {
      const invalidState: ToolUrlState = {
        expertise: 'invalid-expertise' as any,
        length: 'invalid-length' as any
      }

      const result = validateUrlState(invalidState)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(2)
      expect(result.sanitized.expertise).toBe('intermediate')
      expect(result.sanitized.length).toBe('single_short_paragraph')
    })

    it('should handle non-string types for string parameters', () => {
      const invalidState: ToolUrlState = {
        term: 123 as any,
        q: true as any,
        highlight: { object: 'value' } as any
      }

      const result = validateUrlState(invalidState)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(3)
      expect(result.errors.every(e => e.error.includes('must be a string'))).toBe(true)
      expect(result.sanitized.term).toBeUndefined()
      expect(result.sanitized.q).toBeUndefined()
      expect(result.sanitized.highlight).toBeUndefined()
    })

    it('should treat null values as cleared parameters without errors', () => {
      const nullState: any = {
        term: null,
        q: null,
        conversation: null,
        highlight: null,
        scroll: null
      }

      const result = validateUrlState(nullState)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      // Sanitized object should NOT include cleared parameters
      expect(result.sanitized).not.toHaveProperty('term')
      expect(result.sanitized).not.toHaveProperty('q')
      expect(result.sanitized).not.toHaveProperty('conversation')
      expect(result.sanitized).not.toHaveProperty('highlight')
      expect(result.sanitized).not.toHaveProperty('scroll')
    })
  })

  describe('validateUrlLength', () => {
    it('should validate short URLs', () => {
      const shortUrl = 'https://example.com/?tab=search'
      const result = validateUrlLength(shortUrl)

      expect(result.isValid).toBe(true)
      expect(result.warnings).toHaveLength(0)
      expect(result.needsTruncation).toBe(false)
    })

    it('should warn when approaching length limit', () => {
      const longUrl = 'https://example.com/?' + 'a'.repeat(1900)
      const result = validateUrlLength(longUrl, 2048)

      expect(result.isValid).toBe(true)
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0]).toContain('approaching length limit')
      expect(result.needsTruncation).toBe(false)
    })

    it('should fail when exceeding length limit', () => {
      const tooLongUrl = 'https://example.com/?' + 'a'.repeat(2100)
      const result = validateUrlLength(tooLongUrl, 2048)

      expect(result.isValid).toBe(false)
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0]).toContain('exceeds maximum length')
      expect(result.needsTruncation).toBe(true)
    })

    it('should use custom length limit', () => {
      const url = 'https://example.com/?' + 'a'.repeat(920) // Will exceed 90% of 1000
      const result = validateUrlLength(url, 1000)

      expect(result.isValid).toBe(true)
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0]).toContain('approaching length limit')
    })
  })

  describe('logValidationErrors', () => {
    let consoleSpy: jest.SpyInstance

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
    })

    afterEach(() => {
      consoleSpy.mockRestore()
    })

    it('should log validation errors to console', () => {
      const errors = [
        {
          parameter: 'tab',
          value: 'invalid',
          error: 'Invalid tab value',
          fallback: 'original'
        },
        {
          parameter: 'type',
          value: 'invalid',
          error: 'Invalid search type',
          fallback: 'text'
        }
      ]

      logValidationErrors(errors, 'Test context')

      expect(consoleSpy).toHaveBeenCalledWith('[Test context] Found 2 validation error(s):')
      expect(consoleSpy).toHaveBeenCalledWith('  - tab: Invalid tab value')
      expect(consoleSpy).toHaveBeenCalledWith('    Invalid value:', 'invalid')
      expect(consoleSpy).toHaveBeenCalledWith('    Using fallback:', 'original')
    })

    it('should not log when no errors', () => {
      logValidationErrors([])

      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('should use default context when not provided', () => {
      const errors = [
        {
          parameter: 'test',
          value: 'invalid',
          error: 'Test error',
          fallback: 'default'
        }
      ]

      logValidationErrors(errors)

      expect(consoleSpy).toHaveBeenCalledWith('[URL validation] Found 1 validation error(s):')
    })
  })
})