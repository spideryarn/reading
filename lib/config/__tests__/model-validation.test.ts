import { validateModelStringStrict, parseModelString } from '../models'

describe('validateModelStringStrict', () => {
  describe('basic format validation', () => {
    it('should reject null or undefined', () => {
      expect(validateModelStringStrict(null as any).valid).toBe(false)
      expect(validateModelStringStrict(undefined as any).valid).toBe(false)
    })

    it('should reject non-string values', () => {
      expect(validateModelStringStrict(123 as any).valid).toBe(false)
      expect(validateModelStringStrict({} as any).valid).toBe(false)
      expect(validateModelStringStrict([] as any).valid).toBe(false)
    })

    it('should reject empty strings', () => {
      const result = validateModelStringStrict('')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('non-empty string')
    })

    it('should detect whitespace issues', () => {
      const result = validateModelStringStrict(' anthropic:claude-3-5-haiku:20241022 ')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('whitespace')
      expect(result.error).toContain('anthropic:claude-3-5-haiku:20241022')
    })
  })

  describe('format validation', () => {
    it('should reject invalid format', () => {
      const result = validateModelStringStrict('invalid-format')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid model string format')
    })

    it('should reject unknown providers', () => {
      const result = validateModelStringStrict('unknown:model:version')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Unknown provider')
    })
  })

  describe('availability validation', () => {
    it('should reject models not in configuration', () => {
      const result = validateModelStringStrict('anthropic:claude-unknown:20241022')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('not available in configuration')
      expect(result.error).toContain('Available anthropic models')
    })

    it('should accept valid models from configuration', () => {
      const result = validateModelStringStrict('anthropic:claude-3-5-haiku:20241022')
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should accept valid thinking mode models', () => {
      const result = validateModelStringStrict('anthropic:claude-sonnet-4:20250514:thinking')
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })
  })

  describe('provider-specific validation', () => {
    describe('Anthropic models', () => {
      it('should reject non-claude models', () => {
        const result = validateModelStringStrict('anthropic:gpt-4:20241022')
        expect(result.valid).toBe(false)
        expect(result.error).toContain('Anthropic model names must start with "claude-"')
      })

      it('should reject invalid version format', () => {
        const result = validateModelStringStrict('anthropic:claude-test:latest')
        expect(result.valid).toBe(false)
        expect(result.error).toContain('8-digit dates (YYYYMMDD)')
      })
    })

    describe('Google models', () => {
      it('should reject non-gemini models', () => {
        const result = validateModelStringStrict('google:claude-4:latest')
        expect(result.valid).toBe(false)
        expect(result.error).toContain('Google model names must start with "gemini-"')
      })

      it('should accept latest version', () => {
        const result = validateModelStringStrict('google:gemini-2.0-flash:latest')
        expect(result.valid).toBe(true)
      })

      it('should accept preview version for format validation', () => {
        // Test that preview format is valid even if not in configuration
        const result = validateModelStringStrict('google:gemini-2.0-flash:preview')
        expect(result.valid).toBe(false)
        // Should fail on availability, not format
        expect(result.error).toContain('not available in configuration')
      })

      it('should reject invalid version format', () => {
        const result = validateModelStringStrict('google:gemini-test:20241022')
        expect(result.valid).toBe(false)
        expect(result.error).toContain('should be "latest", "preview", or version numbers')
      })
    })

    describe('OpenAI models', () => {
      it('should accept latest version', () => {
        // Note: This will fail availability check since OpenAI models are commented out
        const result = validateModelStringStrict('openai:o3:latest')
        expect(result.valid).toBe(false)
        expect(result.error).toContain('not available in configuration')
      })
    })
  })

  describe('edge cases', () => {
    it('should provide helpful suggestions for wrong provider', () => {
      const result = validateModelStringStrict('claude:claude-3-5-haiku:20241022')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Unknown provider: claude')
    })

    it('should provide helpful suggestions for wrong model within provider', () => {
      const result = validateModelStringStrict('anthropic:claude-unknown:20241022')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Available anthropic models')
    })
  })
})

describe('parseModelString integration', () => {
  it('should work with valid model strings', () => {
    const parsed = parseModelString('anthropic:claude-3-5-haiku:20241022')
    expect(parsed.provider).toBe('anthropic')
    expect(parsed.modelName).toBe('claude-3-5-haiku')
    expect(parsed.version).toBe('20241022')
    expect(parsed.thinking).toBe(false)
  })

  it('should work with thinking mode', () => {
    const parsed = parseModelString('anthropic:claude-sonnet-4:20250514:thinking')
    expect(parsed.provider).toBe('anthropic')
    expect(parsed.modelName).toBe('claude-sonnet-4')
    expect(parsed.version).toBe('20250514')
    expect(parsed.thinking).toBe(true)
  })
})