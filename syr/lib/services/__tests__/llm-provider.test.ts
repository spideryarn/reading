// Tests for LLM provider configuration and factory

import { getProvider, getModel, getLLMConfig } from '../llm-provider'
import { AI_CONFIG, getModelForProvider } from '@/lib/config'

// Mock the provider modules
jest.mock('@ai-sdk/anthropic', () => ({
  anthropic: jest.fn((model: string) => ({ provider: 'anthropic', model })),
}))

jest.mock('@ai-sdk/google', () => ({
  google: jest.fn((model: string) => ({ provider: 'google', model })),
}))

describe('LLM Provider Factory', () => {
  // Save original env vars
  const originalEnv = process.env
  
  beforeEach(() => {
    // Reset modules to clear any cached values
    jest.resetModules()
    // Set up clean environment
    process.env = {
      ...originalEnv,
      ANTHROPIC_API_KEY: 'test-anthropic-key',
      GOOGLE_GENERATIVE_AI_API_KEY: 'test-google-key',
    }
  })
  
  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
  })
  
  describe('getProvider', () => {
    it('should return anthropic provider by default', () => {
      const provider = getProvider()
      expect(provider).toBeDefined()
      expect(typeof provider).toBe('function')
    })
    
    it('should return anthropic provider when explicitly specified', () => {
      const provider = getProvider('anthropic')
      expect(provider).toBeDefined()
    })
    
    it('should return google provider when specified', () => {
      const provider = getProvider('google')
      expect(provider).toBeDefined()
    })
    
    it('should throw error for unknown provider', () => {
      expect(() => getProvider('unknown' as any)).toThrow('Unknown provider: unknown')
    })
    
    it('should throw error if anthropic API key is missing', () => {
      delete process.env.ANTHROPIC_API_KEY
      expect(() => getProvider('anthropic')).toThrow('ANTHROPIC_API_KEY environment variable is required')
    })
    
    it('should throw error if google API key is missing', () => {
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY
      expect(() => getProvider('google')).toThrow('GOOGLE_GENERATIVE_AI_API_KEY environment variable is required')
    })
  })
  
  describe('getModel', () => {
    it('should return model instance with default model', () => {
      const model = getModel()
      expect(model).toBeDefined()
      expect(model).toHaveProperty('model')
    })
    
    it('should return model instance with specific model', () => {
      const model = getModel('claude-3-haiku-20240307')
      expect(model).toEqual({
        provider: 'anthropic',
        model: 'claude-3-haiku-20240307',
      })
    })
    
    it('should return google model when provider is google', () => {
      const model = getModel('gemini-1.5-flash', 'google')
      expect(model).toEqual({
        provider: 'google',
        model: 'gemini-1.5-flash',
      })
    })
  })
  
  describe('getLLMConfig', () => {
    it('should return complete LLM configuration', () => {
      const config = getLLMConfig()
      expect(config).toHaveProperty('provider')
      expect(config).toHaveProperty('model')
      expect(config).toHaveProperty('providerInstance')
      expect(config).toHaveProperty('modelInstance')
    })
    
    it('should use environment provider configuration', () => {
      process.env.LLM_PROVIDER = 'google'
      // Re-import to pick up new env var
      jest.resetModules()
      const { getLLMConfig: getLLMConfigFresh } = require('../llm-provider')
      
      const config = getLLMConfigFresh()
      expect(config.provider).toBe('google')
    })
  })
})

describe('Model Configuration', () => {
  describe('getModelForProvider', () => {
    it('should return anthropic model for anthropic provider', () => {
      const model = getModelForProvider('anthropic')
      expect(model).toBeDefined()
      expect(typeof model).toBe('string')
    })
    
    it('should return google model for google provider', () => {
      const model = getModelForProvider('google')
      expect(model).toBe('gemini-1.5-flash') // Default fallback
    })
    
    it('should use default provider if not specified', () => {
      const model = getModelForProvider()
      expect(model).toBeDefined()
    })
  })
})