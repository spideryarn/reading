// Tests for LLM provider configuration and factory

import { getProvider, getModel, getLLMConfig } from '../llm-provider'
import { getModelConfig } from '@/lib/config/models'

// Mock the provider modules
jest.mock('@ai-sdk/anthropic', () => ({
  anthropic: jest.fn(() => ({ createModel: jest.fn() })),
}))

jest.mock('@ai-sdk/google', () => ({
  google: jest.fn(() => ({ createModel: jest.fn() })),
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
    it('should return anthropic provider when specified', () => {
      const provider = getProvider('anthropic')
      expect(provider).toBeDefined()
      expect(typeof provider).toBe('function')
    })
    
    it('should return google provider when specified', () => {
      const provider = getProvider('google')
      expect(provider).toBeDefined()
      expect(typeof provider).toBe('function')
    })
    
    it('should throw error for unknown provider', () => {
      expect(() => getProvider('unknown' as any)).toThrow('Unknown provider: unknown')
    })
    
    it('should throw error if API keys are missing', () => {
      delete process.env.ANTHROPIC_API_KEY
      expect(() => getProvider('anthropic')).toThrow('ANTHROPIC_API_KEY environment variable is required')
      
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY  
      expect(() => getProvider('google')).toThrow('GOOGLE_GENERATIVE_AI_API_KEY environment variable is required')
    })
  })
  
  describe('getModel', () => {
    it('should return model instance with provider-tier keys', () => {
      const anthropicModel = getModel('anthropic-cheap')
      expect(anthropicModel).toBeDefined()
      
      const googleModel = getModel('google-cheap')
      expect(googleModel).toBeDefined()
    })
    
    it('should throw error for invalid provider-tier key', () => {
      expect(() => getModel('invalid-key' as any)).toThrow('Unknown provider-tier key: invalid-key')
    })
  })
  
  describe('getLLMConfig', () => {
    it('should return complete LLM configuration', () => {
      const config = getLLMConfig('anthropic-balanced')
      expect(config).toHaveProperty('providerTierKey', 'anthropic-balanced')
      expect(config).toHaveProperty('provider', 'anthropic')
      expect(config).toHaveProperty('modelId', 'claude-sonnet-4-20250514')
      expect(config).toHaveProperty('description')
      expect(config).toHaveProperty('contextWindow', 200000)
      expect(config).toHaveProperty('outputTokens')
      expect(config).toHaveProperty('providerInstance')
      expect(config).toHaveProperty('modelInstance')
    })
  })
})

describe('Model Configuration', () => {
  it('should have consistent provider configuration', () => {
    const anthropicConfig = getModelConfig('anthropic:claude-3-5-haiku:20241022')
    expect(anthropicConfig.provider).toBe('anthropic')
    expect(anthropicConfig.contextWindow).toBe(200_000)
    
    const googleConfig = getModelConfig('google:gemini-2.0-flash:latest')
    expect(googleConfig.provider).toBe('google')
    expect(googleConfig.contextWindow).toBe(1_000_000)
  })
})