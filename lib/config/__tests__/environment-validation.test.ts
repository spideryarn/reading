import { getModelStringFromEnvironment } from '../../config'

describe('getModelStringFromEnvironment', () => {
  const originalAnthropicKey = process.env.ANTHROPIC_API_KEY
  const originalEnv = process.env.LLM_MODEL

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.LLM_MODEL = originalEnv
    } else {
      delete process.env.LLM_MODEL
    }
    if (originalAnthropicKey !== undefined) {
      process.env.ANTHROPIC_API_KEY = originalAnthropicKey
    } else {
      delete process.env.ANTHROPIC_API_KEY
    }
  })

  it('should throw descriptive error for invalid format', () => {
    process.env.LLM_MODEL = 'invalid-format'
    expect(() => getModelStringFromEnvironment()).toThrow('Invalid LLM_MODEL environment variable')
    expect(() => getModelStringFromEnvironment()).toThrow('Expected: provider:model:version[:thinking]')
  })

  it('should throw descriptive error for unknown model', () => {
    process.env.LLM_MODEL = 'anthropic:claude-unknown:20241022'
    expect(() => getModelStringFromEnvironment()).toThrow('Invalid LLM_MODEL environment variable')
    expect(() => getModelStringFromEnvironment()).toThrow('not available in configuration')
  })

  it('should throw descriptive error for wrong provider', () => {
    process.env.LLM_MODEL = 'unknown:model:version'
    expect(() => getModelStringFromEnvironment()).toThrow('Invalid LLM_MODEL environment variable')
    expect(() => getModelStringFromEnvironment()).toThrow('Unknown provider')
  })

  it('should throw descriptive error for whitespace issues', () => {
    process.env.LLM_MODEL = ' anthropic:claude-3-5-haiku:20241022 '
    expect(() => getModelStringFromEnvironment()).toThrow('Invalid LLM_MODEL environment variable')
    expect(() => getModelStringFromEnvironment()).toThrow('whitespace')
  })

  it('should accept valid model strings', () => {
    process.env.LLM_MODEL = 'anthropic:claude-sonnet-4:20250514'
    process.env.ANTHROPIC_API_KEY = 'test-key'
    expect(getModelStringFromEnvironment()).toBe('anthropic:claude-sonnet-4:20250514')
  })

  it('should use default when no environment variable set', () => {
    delete process.env.LLM_MODEL
    process.env.ANTHROPIC_API_KEY = 'test-key'
    expect(getModelStringFromEnvironment()).toBe('anthropic:claude-sonnet-4:20250514')
  })

  it('should reject provider-specific format violations', () => {
    process.env.LLM_MODEL = 'anthropic:gpt-4:20241022'
    expect(() => getModelStringFromEnvironment()).toThrow('Anthropic model names must start with "claude-"')
  })

  it('should reject version format violations', () => {
    process.env.LLM_MODEL = 'anthropic:claude-4:latest'
    expect(() => getModelStringFromEnvironment()).toThrow('8-digit dates (YYYYMMDD)')
  })
})