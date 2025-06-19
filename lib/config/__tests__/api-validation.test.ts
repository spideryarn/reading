import { validateApiModelString } from '../../config'

describe('validateApiModelString', () => {
  describe('basic validation', () => {
    it('should reject missing model string', () => {
      const result = validateApiModelString(undefined)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Model string is required')
    })

    it('should reject null model string', () => {
      const result = validateApiModelString(null)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Model string is required')
    })

    it('should reject non-string types', () => {
      const result = validateApiModelString(123)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Model string must be a string, got number')
    })

    it('should reject object types', () => {
      const result = validateApiModelString({ model: 'test' })
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Model string must be a string, got object')
    })

    it('should reject array types', () => {
      const result = validateApiModelString(['test'])
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Model string must be a string, got object')
    })
  })

  describe('valid model strings', () => {
    it('should accept valid anthropic model', () => {
      const result = validateApiModelString('anthropic:claude-3-5-haiku:20241022')
      expect(result.valid).toBe(true)
      if (result.valid) {
        expect(result.modelString).toBe('anthropic:claude-3-5-haiku:20241022')
      }
    })

    it('should accept valid google model', () => {
      const result = validateApiModelString('google:gemini-2.0-flash:latest')
      expect(result.valid).toBe(true)
      if (result.valid) {
        expect(result.modelString).toBe('google:gemini-2.0-flash:latest')
      }
    })

    it('should accept thinking mode models', () => {
      const result = validateApiModelString('anthropic:claude-sonnet-4:20250514:thinking')
      expect(result.valid).toBe(true)
      if (result.valid) {
        expect(result.modelString).toBe('anthropic:claude-sonnet-4:20250514:thinking')
      }
    })
  })

  describe('invalid model strings', () => {
    it('should reject invalid format', () => {
      const result = validateApiModelString('invalid-format')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid model string')
    })

    it('should reject unknown models', () => {
      const result = validateApiModelString('anthropic:claude-unknown:20241022')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid model string')
      expect(result.error).toContain('not available in configuration')
    })

    it('should reject models with whitespace', () => {
      const result = validateApiModelString(' anthropic:claude-3-5-haiku:20241022 ')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid model string')
      expect(result.error).toContain('whitespace')
    })

    it('should reject empty string', () => {
      const result = validateApiModelString('')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Model string is required')
    })
  })

  describe('error message quality', () => {
    it('should provide detailed error for wrong provider', () => {
      const result = validateApiModelString('unknown:model:version')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid model string')
      expect(result.error).toContain('Unknown provider')
    })

    it('should provide suggestions for available models', () => {
      const result = validateApiModelString('anthropic:claude-unknown:20241022')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Available anthropic models')
    })
  })
})