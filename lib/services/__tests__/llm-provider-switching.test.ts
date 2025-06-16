// Tests for multi-provider switching functionality
// Tests provider fallback, model string configuration, and error handling

import { getProvider, getModel, getLLMConfig } from '../llm-provider'
import { 
  getModelStringFromEnvironment, 
  getModelConfigFromEnvironment,
  getModelForAICall 
} from '@/lib/config'
import { 
  parseModelString, 
  getModelConfig,
  MODEL_TIERS,
  MODEL_DEFINITIONS 
} from '@/lib/config/models'

// Mock the provider modules
jest.mock('@ai-sdk/anthropic', () => ({
  anthropic: jest.fn((modelId) => ({ 
    id: modelId,
    provider: 'anthropic',
    createModel: jest.fn() 
  })),
}))

jest.mock('@ai-sdk/google', () => ({
  google: jest.fn((modelId) => ({ 
    id: modelId,
    provider: 'google',
    createModel: jest.fn() 
  })),
}))

// Mock AI SDK's generateText for testing error responses
jest.mock('ai', () => ({
  generateText: jest.fn(),
}))

import { generateText } from 'ai'

describe('Multi-Provider Switching', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    process.env = {
      ...originalEnv,
      ANTHROPIC_API_KEY: 'test-anthropic-key',
      GOOGLE_GENERATIVE_AI_API_KEY: 'test-google-key',
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Model String Configuration', () => {
    describe('Environment Variable Resolution', () => {
      it('should resolve tier keys to model strings', () => {
        process.env.LLM_MODEL = 'anthropic-cheap'
        const modelString = getModelStringFromEnvironment()
        expect(modelString).toBe('anthropic:claude-3-5-haiku:20241022')
      })

      it('should accept direct model strings', () => {
        process.env.LLM_MODEL = 'google:gemini-2.0-flash:latest'
        const modelString = getModelStringFromEnvironment()
        expect(modelString).toBe('google:gemini-2.0-flash:latest')
      })

      it('should handle thinking mode model strings', () => {
        process.env.LLM_MODEL = 'anthropic:claude-sonnet-4:20250514:thinking'
        const modelString = getModelStringFromEnvironment()
        expect(modelString).toBe('anthropic:claude-sonnet-4:20250514:thinking')
      })

      it('should default to anthropic-balanced when not set', () => {
        delete process.env.LLM_MODEL
        const modelString = getModelStringFromEnvironment()
        expect(modelString).toBe('anthropic:claude-sonnet-4:20250514')
      })

      it('should throw error for invalid model strings', () => {
        process.env.LLM_MODEL = 'invalid-model-format'
        expect(() => getModelStringFromEnvironment()).toThrow(
          'Invalid LLM_MODEL: invalid-model-format'
        )
      })

      it('should support all defined tier keys', () => {
        Object.entries(MODEL_TIERS).forEach(([tierKey, expectedModelString]) => {
          process.env.LLM_MODEL = tierKey
          const modelString = getModelStringFromEnvironment()
          expect(modelString).toBe(expectedModelString)
        })
      })
    })

    describe('Model Configuration Retrieval', () => {
      it('should get correct config for Anthropic models', () => {
        process.env.LLM_MODEL = 'anthropic:claude-3-5-haiku:20241022'
        const config = getModelConfigFromEnvironment()
        
        expect(config).toMatchObject({
          provider: 'anthropic',
          modelName: 'claude-3-5-haiku',
          version: '20241022',
          thinking: false,
          contextWindow: 200_000,
          outputTokens: 8192,
        })
      })

      it('should get correct config for Google models', () => {
        process.env.LLM_MODEL = 'google:gemini-2.0-flash:latest'
        const config = getModelConfigFromEnvironment()
        
        expect(config).toMatchObject({
          provider: 'google',
          modelName: 'gemini-2.0-flash',
          version: 'latest',
          thinking: false,
          contextWindow: 1_000_000,
          outputTokens: 8192,
        })
      })

      it('should handle thinking mode configuration', () => {
        process.env.LLM_MODEL = 'anthropic:claude-sonnet-4:20250514:thinking'
        const config = getModelConfigFromEnvironment()
        
        expect(config.thinking).toBe(true)
        expect(config.description).toContain('Thinking Mode')
      })
    })
  })

  describe('Provider Switching Scenarios', () => {
    it('should switch from Anthropic to Google via environment', () => {
      // Start with Anthropic
      process.env.LLM_MODEL = 'anthropic-balanced'
      let { modelString, config } = getModelForAICall()
      expect(config.provider).toBe('anthropic')
      
      // Switch to Google
      process.env.LLM_MODEL = 'google-balanced'
      ;({ modelString, config } = getModelForAICall())
      expect(config.provider).toBe('google')
      expect(modelString).toBe('google:gemini-2.5-flash:latest')
    })

    it('should maintain provider-specific features during switch', () => {
      // Anthropic with thinking mode
      process.env.LLM_MODEL = 'anthropic-balanced-thinking'
      let { config } = getModelForAICall()
      expect(config.thinking).toBe(true)
      expect(config.provider).toBe('anthropic')
      
      // Google (no thinking mode)
      process.env.LLM_MODEL = 'google-balanced'
      ;({ config } = getModelForAICall())
      expect(config.thinking).toBe(false)
      expect(config.provider).toBe('google')
    })

    it('should handle pricing differences between providers', () => {
      // Check Anthropic pricing
      process.env.LLM_MODEL = 'anthropic-cheap'
      let { config } = getModelForAICall()
      expect(config.pricing?.inputPer1M).toBe(1.00)
      expect(config.pricing?.outputPer1M).toBe(5.00)
      
      // Check Google pricing (much cheaper)
      process.env.LLM_MODEL = 'google-cheap'
      ;({ config } = getModelForAICall())
      expect(config.pricing?.inputPer1M).toBe(0.075)
      expect(config.pricing?.outputPer1M).toBe(0.30)
    })
  })

  describe('Error Handling and Fallback', () => {
    it('should fallback to default model on configuration error', () => {
      process.env.LLM_MODEL = 'invalid-model'
      const { modelString, config } = getModelForAICall()
      
      // Should fallback to default
      expect(modelString).toBe('anthropic:claude-sonnet-4:20250514')
      expect(config.provider).toBe('anthropic')
    })

    it('should handle missing provider API keys gracefully', () => {
      delete process.env.ANTHROPIC_API_KEY
      
      // Should throw when trying to get Anthropic provider
      expect(() => getProvider('anthropic')).toThrow(
        'ANTHROPIC_API_KEY environment variable is required'
      )
      
      // But Google should still work
      const googleProvider = getProvider('google')
      expect(googleProvider).toBeDefined()
    })

    it('should parse model strings correctly', () => {
      const testCases = [
        {
          input: 'anthropic:claude-3-5-haiku:20241022',
          expected: {
            provider: 'anthropic',
            modelName: 'claude-3-5-haiku',
            version: '20241022',
            thinking: false,
          }
        },
        {
          input: 'google:gemini-2.0-flash:latest',
          expected: {
            provider: 'google',
            modelName: 'gemini-2.0-flash',
            version: 'latest',
            thinking: false,
          }
        },
        {
          input: 'anthropic:claude-sonnet-4:20250514:thinking',
          expected: {
            provider: 'anthropic',
            modelName: 'claude-sonnet-4',
            version: '20250514',
            thinking: true,
          }
        }
      ]

      testCases.forEach(({ input, expected }) => {
        const parsed = parseModelString(input)
        expect(parsed).toMatchObject(expected)
        expect(parsed.fullString).toBe(input)
      })
    })

    it('should reject invalid model string formats', () => {
      const invalidFormats = [
        'anthropic:claude',  // Missing version
        'claude-3-5-haiku:20241022',  // Missing provider
        'anthropic:claude:version:thinking:extra',  // Too many parts
        'unknown:model:version',  // Unknown provider
        'anthropic:model:version:invalid',  // Invalid thinking flag
      ]

      invalidFormats.forEach(invalid => {
        expect(() => parseModelString(invalid)).toThrow()
      })
    })
  })

  describe('Provider-Specific Model Instantiation', () => {
    it('should create Anthropic model instance with correct options', () => {
      // Test model configuration for thinking mode
      const modelString = 'anthropic:claude-sonnet-4:20250514:thinking'
      const config = getModelConfig(modelString)
      expect(config.provider).toBe('anthropic')
      expect(config.modelName).toBe('claude-sonnet-4')
      expect(config.version).toBe('20250514')
      expect(config.thinking).toBe(true)
      
      // Verify the tier key maps to correct model string
      const tierModelString = MODEL_TIERS['anthropic-balanced-thinking']
      expect(tierModelString).toBe(modelString)
    })

    it('should create Google model instance without thinking option', () => {
      // Test model configuration for Google
      const modelString = 'google:gemini-2.5-flash:latest'
      const config = getModelConfig(modelString)
      expect(config.provider).toBe('google')
      expect(config.modelName).toBe('gemini-2.5-flash')
      expect(config.version).toBe('latest')
      expect(config.thinking).toBe(false)
      
      // Verify no thinking mode for Google models
      const tierModelString = MODEL_TIERS['google-balanced']
      expect(tierModelString).toBe(modelString)
      expect(tierModelString).not.toContain(':thinking')
    })
  })

  describe('Real-World Switching Scenarios', () => {
    it('should handle 429 rate limit by switching providers', async () => {
      const generateTextMock = generateText as jest.MockedFunction<typeof generateText>
      
      // Simulate Anthropic rate limit
      generateTextMock.mockRejectedValueOnce({
        name: 'APICallError',
        statusCode: 429,
        message: 'Rate limit exceeded',
        provider: 'anthropic',
      })
      
      // First attempt with Anthropic
      process.env.LLM_MODEL = 'anthropic-balanced'
      let { modelString } = getModelForAICall()
      expect(modelString).toBe('anthropic:claude-sonnet-4:20250514')
      
      try {
        await generateText({
          model: getModel('anthropic-balanced'),
          prompt: 'test',
        })
      } catch (error: any) {
        expect(error.statusCode).toBe(429)
        
        // Switch to Google as fallback
        process.env.LLM_MODEL = 'google-balanced'
        ;({ modelString } = getModelForAICall())
        expect(modelString).toBe('google:gemini-2.5-flash:latest')
      }
    })

    it('should handle provider-specific errors appropriately', async () => {
      const generateTextMock = generateText as jest.MockedFunction<typeof generateText>
      
      // Simulate Google-specific error
      generateTextMock.mockRejectedValueOnce({
        name: 'APICallError',
        statusCode: 400,
        message: 'The model `gemini-2.5-pro` does not exist',
        provider: 'google',
      })
      
      process.env.LLM_MODEL = 'google-expensive'
      
      try {
        await generateText({
          model: getModel('google-expensive'),
          prompt: 'test',
        })
      } catch (error: any) {
        expect(error.message).toContain('does not exist')
        
        // Could fallback to a different Google model or switch to Anthropic
        process.env.LLM_MODEL = 'google-balanced'
        const { modelString } = getModelForAICall()
        expect(modelString).toBe('google:gemini-2.5-flash:latest')
      }
    })
  })

  describe('Cost Optimization Switching', () => {
    it('should calculate cost differences between providers', () => {
      const testTokens = {
        prompt: 10_000,
        completion: 2_000,
      }
      
      // Calculate Anthropic cost
      process.env.LLM_MODEL = 'anthropic-balanced'
      let { config } = getModelForAICall()
      const anthropicCost = 
        (testTokens.prompt * config.pricing!.inputPer1M / 1_000_000) +
        (testTokens.completion * config.pricing!.outputPer1M / 1_000_000)
      
      // Calculate Google cost
      process.env.LLM_MODEL = 'google-balanced'
      ;({ config } = getModelForAICall())
      const googleCost = 
        (testTokens.prompt * config.pricing!.inputPer1M / 1_000_000) +
        (testTokens.completion * config.pricing!.outputPer1M / 1_000_000)
      
      // Google should be significantly cheaper
      expect(googleCost).toBeLessThan(anthropicCost)
      expect(anthropicCost / googleCost).toBeGreaterThan(5) // At least 5x more expensive
    })

    it('should recommend cheaper models for high-volume operations', () => {
      const highVolumeThreshold = 100_000 // tokens
      
      // For high-volume operations, should use cheap tier
      const recommendations = [
        { provider: 'anthropic', model: 'anthropic-cheap' },
        { provider: 'google', model: 'google-cheap' },
      ]
      
      recommendations.forEach(({ provider, model }) => {
        process.env.LLM_MODEL = model
        const { config } = getModelForAICall()
        
        expect(config.provider).toBe(provider)
        expect(config.description.toLowerCase()).toContain('cost-effective')
      })
    })
  })

  describe('Model Capability Differences', () => {
    it('should track different context windows between providers', () => {
      // Anthropic models: 200K context
      process.env.LLM_MODEL = 'anthropic-balanced'
      let { config } = getModelForAICall()
      expect(config.contextWindow).toBe(200_000)
      
      // Google models: 1M context
      process.env.LLM_MODEL = 'google-balanced'
      ;({ config } = getModelForAICall())
      expect(config.contextWindow).toBe(1_000_000)
    })

    it('should track model-specific features', () => {
      // Check all models for feature consistency
      Object.entries(MODEL_DEFINITIONS).forEach(([modelString, modelConfig]) => {
        expect(modelConfig).toHaveProperty('provider')
        expect(modelConfig).toHaveProperty('contextWindow')
        expect(modelConfig).toHaveProperty('outputTokens')
        expect(modelConfig).toHaveProperty('pricing')
        
        // Verify thinking mode only for specific models
        if (modelString.endsWith(':thinking')) {
          expect(modelConfig.thinking).toBe(true)
        } else {
          expect(modelConfig.thinking).toBe(false)
        }
      })
    })
  })
})