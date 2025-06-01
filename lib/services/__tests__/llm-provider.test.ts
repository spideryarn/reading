// Tests for LLM provider configuration and factory with provider-tier model system

import { getProvider, getModel, getLLMConfig } from '../llm-provider'
import { getModelConfig, getProviderFromKey } from '@/lib/config'

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
    it('should return model instance with default provider-tier key', () => {
      const model = getModel()
      expect(model).toBeDefined()
      expect(model).toHaveProperty('model')
      expect(model).toHaveProperty('provider')
    })
    
    it('should return anthropic model with anthropic-cheap key', () => {
      const model = getModel('anthropic-cheap')
      expect(model).toEqual({
        provider: 'anthropic',
        model: 'claude-3-5-haiku-20241022',
      })
    })
    
    it('should return google model with google-cheap key', () => {
      const model = getModel('google-cheap')
      expect(model).toEqual({
        provider: 'google',
        model: 'gemini-2.5-flash',
      })
    })
    
    it('should return balanced tier models', () => {
      const anthropicModel = getModel('anthropic-balanced')
      expect(anthropicModel.model).toBe('claude-sonnet-4-20250514')
      
      const googleModel = getModel('google-balanced')
      expect(googleModel.model).toBe('gemini-2.5-pro')
    })
    
    it('should throw error for invalid provider-tier key', () => {
      expect(() => getModel('invalid-key' as any)).toThrow('Unknown provider-tier key: invalid-key')
    })
  })
  
  describe('getLLMConfig', () => {
    it('should return complete LLM configuration with default key', () => {
      const config = getLLMConfig()
      expect(config).toHaveProperty('providerTierKey')
      expect(config).toHaveProperty('provider')
      expect(config).toHaveProperty('modelId')
      expect(config).toHaveProperty('description')
      expect(config).toHaveProperty('contextWindow')
      expect(config).toHaveProperty('outputTokens')
      expect(config).toHaveProperty('providerInstance')
      expect(config).toHaveProperty('modelInstance')
    })
    
    it('should return configuration for specific provider-tier key', () => {
      const config = getLLMConfig('anthropic-balanced')
      expect(config.providerTierKey).toBe('anthropic-balanced')
      expect(config.provider).toBe('anthropic')
      expect(config.modelId).toBe('claude-sonnet-4-20250514')
      expect(config.description).toContain('Claude Sonnet 4')
      expect(config.contextWindow).toBe(200000)
    })
    
    it('should return configuration for google models', () => {
      const config = getLLMConfig('google-cheap')
      expect(config.providerTierKey).toBe('google-cheap')
      expect(config.provider).toBe('google')
      expect(config.modelId).toBe('gemini-2.5-flash')
      expect(config.description).toContain('Gemini 2.5 Flash')
      expect(config.contextWindow).toBe(1000000)
    })
    
    it('should use environment model configuration', () => {
      process.env.LLM_MODEL = 'anthropic-expensive'
      // Re-import to pick up new env var
      jest.resetModules()
      const { getLLMConfig: getLLMConfigFresh } = await import('../llm-provider')
      
      const config = getLLMConfigFresh()
      expect(config.providerTierKey).toBe('anthropic-expensive')
      expect(config.provider).toBe('anthropic')
      expect(config.modelId).toBe('claude-opus-4-20250514')
    })
  })
})

describe('Model Configuration', () => {
  describe('getModelConfig', () => {
    it('should return configuration for anthropic models', () => {
      const config = getModelConfig('anthropic-cheap')
      expect(config.provider).toBe('anthropic')
      expect(config.modelId).toBe('claude-3-5-haiku-20241022')
      expect(config.contextWindow).toBe(200000)
      expect(config.outputTokens).toBe(8192)
    })
    
    it('should return configuration for google models', () => {
      const config = getModelConfig('google-balanced')
      expect(config.provider).toBe('google')
      expect(config.modelId).toBe('gemini-2.5-pro')
      expect(config.contextWindow).toBe(1000000)
      expect(config.outputTokens).toBe(8192)
    })
    
    it('should use default key if not specified', () => {
      const config = getModelConfig()
      expect(config).toBeDefined()
      expect(config.provider).toBe('google') // Default is google-cheap
      expect(config.modelId).toBe('gemini-2.5-flash')
    })
    
    it('should throw error for invalid key', () => {
      expect(() => getModelConfig('invalid-key' as any))
        .toThrow('Unknown provider-tier key: invalid-key')
    })
  })
  
  describe('getProviderFromKey', () => {
    it('should extract provider from anthropic keys', () => {
      expect(getProviderFromKey('anthropic-cheap')).toBe('anthropic')
      expect(getProviderFromKey('anthropic-balanced')).toBe('anthropic')
      expect(getProviderFromKey('anthropic-expensive')).toBe('anthropic')
    })
    
    it('should extract provider from google keys', () => {
      expect(getProviderFromKey('google-cheap')).toBe('google')
      expect(getProviderFromKey('google-balanced')).toBe('google')
      expect(getProviderFromKey('google-expensive')).toBe('google')
    })
  })
})

describe('Provider-Tier Model System', () => {
  it('should have consistent model information', () => {
    // All anthropic models should have same context window
    const anthropicCheap = getModelConfig('anthropic-cheap')
    const anthropicBalanced = getModelConfig('anthropic-balanced')
    const anthropicExpensive = getModelConfig('anthropic-expensive')
    
    expect(anthropicCheap.contextWindow).toBe(200000)
    expect(anthropicBalanced.contextWindow).toBe(200000)
    expect(anthropicExpensive.contextWindow).toBe(200000)
    
    // All google models should have same context window
    const googleCheap = getModelConfig('google-cheap')
    const googleBalanced = getModelConfig('google-balanced')
    const googleExpensive = getModelConfig('google-expensive')
    
    expect(googleCheap.contextWindow).toBe(1000000)
    expect(googleBalanced.contextWindow).toBe(1000000)
    expect(googleExpensive.contextWindow).toBe(1000000)
  })
  
  it('should have different model IDs for different tiers', () => {
    const anthropicCheap = getModelConfig('anthropic-cheap')
    const anthropicBalanced = getModelConfig('anthropic-balanced')
    const anthropicExpensive = getModelConfig('anthropic-expensive')
    
    expect(anthropicCheap.modelId).not.toBe(anthropicBalanced.modelId)
    expect(anthropicBalanced.modelId).not.toBe(anthropicExpensive.modelId)
    
    // Google balanced and expensive are currently the same
    const googleCheap = getModelConfig('google-cheap')
    const googleBalanced = getModelConfig('google-balanced')
    
    expect(googleCheap.modelId).not.toBe(googleBalanced.modelId)
  })
  
  it('should have descriptive model descriptions', () => {
    const configs = [
      'anthropic-cheap', 'anthropic-balanced', 'anthropic-expensive',
      'google-cheap', 'google-balanced', 'google-expensive'
    ]
    
    configs.forEach(key => {
      const config = getModelConfig(key as any)
      expect(config.description).toBeDefined()
      expect(config.description.length).toBeGreaterThan(10)
      expect(config.description).toContain(config.provider === 'anthropic' ? 'Claude' : 'Gemini')
    })
  })
})