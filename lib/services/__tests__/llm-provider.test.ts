/**
 * Real LLM Provider Integration Tests
 * 
 * Tests LLM provider configuration and factory with actual provider instances
 * to ensure the provider system works correctly end-to-end.
 * Uses test environment to avoid expensive API calls.
 * 
 * @jest-environment node
 */

// Load test environment
require('dotenv').config({ path: '.env.test' })

// Unmock provider modules for real testing
jest.unmock('@ai-sdk/anthropic')
jest.unmock('@ai-sdk/google')
jest.unmock('@/lib/services/llm-provider')
jest.unmock('@/lib/config/models')

import { getProvider, getModel, getLLMConfig } from '../llm-provider'
import { getModelConfig } from '@/lib/config/models'

// Test guard - only run real provider tests when API keys available
const SHOULD_RUN_REAL_PROVIDER = process.env.NODE_ENV === 'test' && 
  (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.ANTHROPIC_API_KEY)

const testSuite = SHOULD_RUN_REAL_PROVIDER ? describe : describe.skip

testSuite('LLM Provider Factory - Real Provider Integration', () => {
  // Test timeout for provider initialization
  const PROVIDER_TIMEOUT = 30000
  
  describe('getProvider - Real Provider Testing', () => {
    it('should return google provider when API key available', () => {
      if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        console.log('Skipping Google provider test - no API key available')
        return
      }
      
      const provider = getProvider('google')
      expect(provider).toBeDefined()
      expect(typeof provider).toBe('function')
      
      console.log('✅ Google provider initialized successfully')
    }, PROVIDER_TIMEOUT)
    
    it('should return anthropic provider when API key available', () => {
      if (!process.env.ANTHROPIC_API_KEY) {
        console.log('Skipping Anthropic provider test - no API key available')
        return
      }
      
      const provider = getProvider('anthropic')
      expect(provider).toBeDefined()
      expect(typeof provider).toBe('function')
      
      console.log('✅ Anthropic provider initialized successfully')
    }, PROVIDER_TIMEOUT)
    
    it('should throw error for unknown provider', () => {
      expect(() => getProvider('unknown' as any)).toThrow('Unknown provider: unknown')
    })
    
    it('should handle missing API keys gracefully', () => {
      // Save original env vars
      const originalAnthropicKey = process.env.ANTHROPIC_API_KEY
      const originalGoogleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
      
      try {
        // Test with missing Anthropic key
        delete process.env.ANTHROPIC_API_KEY
        expect(() => getProvider('anthropic')).toThrow('ANTHROPIC_API_KEY environment variable is required')
        
        // Test with missing Google key
        delete process.env.GOOGLE_GENERATIVE_AI_API_KEY  
        expect(() => getProvider('google')).toThrow('GOOGLE_GENERATIVE_AI_API_KEY environment variable is required')
      } finally {
        // Restore original env vars
        if (originalAnthropicKey) process.env.ANTHROPIC_API_KEY = originalAnthropicKey
        if (originalGoogleKey) process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalGoogleKey
      }
    })
  })
  
  describe('getModel - Real Model Testing', () => {
    it('should return model instance based on environment configuration', () => {
      // Save original env vars
      const originalModel = process.env.LLM_MODEL
      
      try {
        // Test with Google model
        if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
          process.env.LLM_MODEL = 'google:gemini-2.5-flash:latest'
          
          const googleModel = getModel()
          expect(googleModel).toBeDefined()
          expect(googleModel).toHaveProperty('config')
          expect(googleModel.config.provider).toContain('google')
          
          console.log('✅ Google model instance created successfully')
        }
        
        // Test with Anthropic model if available
        if (process.env.ANTHROPIC_API_KEY) {
          process.env.LLM_MODEL = 'anthropic:claude-sonnet-4:20250514'
          
          const anthropicModel = getModel()
          expect(anthropicModel).toBeDefined()
          expect(anthropicModel).toHaveProperty('config')
          expect(anthropicModel.config.provider).toContain('anthropic')
          
          console.log('✅ Anthropic model instance created successfully')
        }
      } finally {
        // Restore original env var
        if (originalModel) {
          process.env.LLM_MODEL = originalModel
        } else {
          delete process.env.LLM_MODEL
        }
      }
    }, PROVIDER_TIMEOUT)
    
    it('should handle missing API keys when creating models', () => {
      // Save original env vars
      const originalAnthropicKey = process.env.ANTHROPIC_API_KEY
      const originalGoogleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
      const originalModel = process.env.LLM_MODEL
      
      try {
        // Test with missing Anthropic key
        delete process.env.ANTHROPIC_API_KEY
        delete process.env.GOOGLE_GENERATIVE_AI_API_KEY
        process.env.LLM_MODEL = 'anthropic:claude-sonnet-4:20250514'
        
        expect(() => getModel()).toThrow()
      } finally {
        // Restore original env vars
        if (originalAnthropicKey) process.env.ANTHROPIC_API_KEY = originalAnthropicKey
        if (originalGoogleKey) process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalGoogleKey
        if (originalModel) process.env.LLM_MODEL = originalModel
      }
    }, PROVIDER_TIMEOUT)
  })
  
  describe('getLLMConfig - Real Configuration Testing', () => {
    it('should return complete LLM configuration from environment', () => {
      // Save original env vars
      const originalModel = process.env.LLM_MODEL
      
      try {
        if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
          process.env.LLM_MODEL = 'google:gemini-2.5-flash:latest'
          
          const config = getLLMConfig()
          expect(config).toHaveProperty('modelString')
          expect(config).toHaveProperty('provider', 'google')
          expect(config).toHaveProperty('modelName')
          expect(config).toHaveProperty('description')
          expect(config).toHaveProperty('contextWindow')
          expect(config).toHaveProperty('outputTokens')
          expect(config).toHaveProperty('providerInstance')
          expect(config).toHaveProperty('modelInstance')
          
          expect(config.contextWindow).toBeGreaterThan(0)
          expect(config.outputTokens).toBeGreaterThan(0)
          expect(config.modelString).toBe('google:gemini-2.5-flash:latest')
          
          console.log(`✅ Google LLM config complete: ${config.modelName} (${config.contextWindow} context window)`)
        }
        
        if (process.env.ANTHROPIC_API_KEY) {
          process.env.LLM_MODEL = 'anthropic:claude-sonnet-4:20250514'
          
          const config = getLLMConfig()
          expect(config).toHaveProperty('modelString')
          expect(config).toHaveProperty('provider', 'anthropic')
          expect(config).toHaveProperty('modelName')
          expect(config).toHaveProperty('description')
          expect(config).toHaveProperty('contextWindow', 200000)
          expect(config).toHaveProperty('outputTokens')
          expect(config).toHaveProperty('providerInstance')
          expect(config).toHaveProperty('modelInstance')
          
          expect(config.modelString).toBe('anthropic:claude-sonnet-4:20250514')
          
          console.log(`✅ Anthropic LLM config complete: ${config.modelName} (${config.contextWindow} context window)`)
        }
      } finally {
        // Restore original env var
        if (originalModel) {
          process.env.LLM_MODEL = originalModel
        } else {
          delete process.env.LLM_MODEL
        }
      }
    }, PROVIDER_TIMEOUT)
    
    it('should handle configuration with missing API keys', () => {
      // Save original env vars
      const originalAnthropicKey = process.env.ANTHROPIC_API_KEY
      const originalGoogleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
      const originalModel = process.env.LLM_MODEL
      
      try {
        // Test with missing keys
        delete process.env.ANTHROPIC_API_KEY
        delete process.env.GOOGLE_GENERATIVE_AI_API_KEY
        process.env.LLM_MODEL = 'anthropic:claude-sonnet-4:20250514'
        
        expect(() => getLLMConfig()).toThrow()
      } finally {
        // Restore original env vars
        if (originalAnthropicKey) process.env.ANTHROPIC_API_KEY = originalAnthropicKey
        if (originalGoogleKey) process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalGoogleKey
        if (originalModel) process.env.LLM_MODEL = originalModel
      }
    })
  })
})

describe('Model Configuration Validation', () => {
  it('should have consistent provider configuration for Anthropic', () => {
    const anthropicConfig = getModelConfig('anthropic:claude-sonnet-4:20250514')
    expect(anthropicConfig.provider).toBe('anthropic')
    expect(anthropicConfig.contextWindow).toBe(200_000)
    expect(anthropicConfig.modelName).toBe('claude-sonnet-4')
    
    console.log(`✅ Anthropic config validated: ${anthropicConfig.modelName}`)
  })
  
  it('should have consistent provider configuration for Google', () => {
    const googleConfig = getModelConfig('google:gemini-2.5-flash:latest')
    expect(googleConfig.provider).toBe('google')
    expect(googleConfig.contextWindow).toBe(1_000_000)
    expect(googleConfig.modelName).toContain('gemini')
    
    console.log(`✅ Google config validated: ${googleConfig.modelName}`)
  })
  
  it('should handle invalid model strings', () => {
    expect(() => getModelConfig('invalid:model:string')).toThrow()
  })
  
  it('should provide cost tier information', () => {
    const cheapConfig = getModelConfig('google:gemini-2.5-flash:latest')
    const balancedConfig = getModelConfig('anthropic:claude-sonnet-4:20250514')
    
    expect(cheapConfig).toBeDefined()
    expect(balancedConfig).toBeDefined()
    
    // Cheap models should have larger context windows (for efficiency)
    expect(cheapConfig.contextWindow).toBeGreaterThanOrEqual(balancedConfig.contextWindow)
    
    console.log(`✅ Cost tier validation: Cheap=${cheapConfig.contextWindow}, Balanced=${balancedConfig.contextWindow}`)
  })
})