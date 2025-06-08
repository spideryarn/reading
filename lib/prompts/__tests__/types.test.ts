// Tests for prompt execution with multi-provider support and usage tracking

import { z } from 'zod'
import { 
  executePrompt, 
  executePromptWithUsage,
  executeMultimodalPrompt,
  executeMultimodalPromptWithUsage,
  loadPromptTemplate, 
  loadMultimodalPromptTemplate,
  PromptTemplate,
  MultimodalPromptTemplate,
  PromptExecutionResult,
  PromptUsage
} from '../types'
import { AI_CONFIG } from '@/lib/config'
import * as llmProvider from '@/lib/services/llm-provider'
import { generateText } from 'ai'

// Mock the AI SDK and provider
jest.mock('ai', () => ({
  generateText: jest.fn(),
}))

jest.mock('@/lib/services/llm-provider', () => ({
  getModel: jest.fn(),
}))

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}))

jest.mock('nunjucks', () => ({
  configure: jest.fn(() => ({
    renderString: jest.fn((template, vars) => `Rendered: ${template} with ${JSON.stringify(vars)}`),
  })),
}))

describe('Prompt Execution with Multi-Provider Support and Usage Tracking', () => {
  const mockFs = require('fs')
  const mockGenerateText = generateText as jest.MockedFunction<typeof generateText>
  const mockGetModel = llmProvider.getModel as jest.MockedFunction<typeof llmProvider.getModel>
  
  // Sample schema and template
  const testSchema = z.object({
    name: z.string(),
    value: z.number(),
  })
  
  const testTemplate: PromptTemplate<typeof testSchema> = {
    name: 'test-template',
    description: 'Test template',
    schema: testSchema,
    templatePath: '/path/to/template.njk',
    modelConfig: {
      model: 'test-model',
      temperature: 0.5,
      maxTokens: 100,
    },
  }
  
  // Sample multimodal template with flexible schema
  const multimodalSchema = z.object({
    messages: z.array(z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.union([z.string(), z.array(z.any())])
    })).optional(),
    pdfBuffer: z.instanceof(Buffer).optional(),
    prompt: z.string().optional(),
    textContent: z.string().optional()
  })
  
  const testMultimodalTemplate: MultimodalPromptTemplate<typeof multimodalSchema> = {
    name: 'test-multimodal',
    description: 'Test multimodal template',
    schema: multimodalSchema,
    templatePath: '/path/to/multimodal.njk',
    modelConfig: {
      model: 'test-model',
      temperature: 0.3,
      maxTokens: 150,
    },
  }
  
  // Mock usage data for testing
  const mockUsage: PromptUsage = {
    promptTokens: 50,
    completionTokens: 75,
    totalTokens: 125,
    reasoningTokens: 10
  }
  
  const mockExecutionResult: PromptExecutionResult = {
    text: 'Generated response with usage',
    usage: mockUsage,
    finishReason: 'stop'
  }
  
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock file system
    mockFs.readFileSync.mockReturnValue('Hello {{name}}, value is {{value}}')
    
    // Mock model provider
    mockGetModel.mockReturnValue({ provider: 'test', model: 'test-model' })
    
    // Mock AI SDK response with comprehensive usage data
    mockGenerateText.mockResolvedValue({
      text: 'Generated response',
      finishReason: 'stop',
      usage: { 
        promptTokens: 50, 
        completionTokens: 75, 
        totalTokens: 125,
        reasoningTokens: 10
      },
    } as any)
  })
  
  describe('executePrompt', () => {
    it('should execute with new signature (no Anthropic client)', async () => {
      const variables = { name: 'Test', value: 42 }
      
      const result = await executePrompt(testTemplate, variables)
      
      expect(result).toBe('Generated response')
      expect(mockGetModel).toHaveBeenCalledWith('test-model')
      expect(mockGenerateText).toHaveBeenCalledWith({
        model: { provider: 'test', model: 'test-model' },
        prompt: expect.stringContaining('Rendered:'),
        maxTokens: 100,
        temperature: 0.5,
      })
    })
    
    
    it('should use default model configuration when not specified', async () => {
      const templateNoConfig: PromptTemplate<typeof testSchema> = {
        ...testTemplate,
        modelConfig: undefined,
      }
      
      const result = await executePrompt(templateNoConfig, { name: 'Default', value: 1 })
      
      expect(result).toBe('Generated response')
      expect(mockGetModel).toHaveBeenCalledWith(AI_CONFIG.DEFAULT_MODEL)
      expect(mockGenerateText).toHaveBeenCalledWith({
        model: { provider: 'test', model: 'test-model' },
        prompt: expect.any(String),
        maxTokens: AI_CONFIG.DEFAULT_MAX_TOKENS,
        temperature: AI_CONFIG.DEFAULT_TEMPERATURE,
      })
    })
    
    it('should validate variables against schema', async () => {
      const invalidVariables = { name: 'Test', value: 'not-a-number' as any }
      
      await expect(executePrompt(testTemplate, invalidVariables)).rejects.toThrow()
    })
    
    it('should handle provider switching', async () => {
      // Test with Anthropic provider
      mockGetModel.mockReturnValueOnce({ provider: 'anthropic', model: 'claude-3-haiku' })
      
      await executePrompt(testTemplate, { name: 'Anthropic', value: 1 })
      
      expect(mockGenerateText).toHaveBeenCalledWith({
        model: { provider: 'anthropic', model: 'claude-3-haiku' },
        prompt: expect.any(String),
        maxTokens: 100,
        temperature: 0.5,
      })
      
      // Test with Google provider
      mockGetModel.mockReturnValueOnce({ provider: 'google', model: 'gemini-1.5-flash' })
      
      await executePrompt(testTemplate, { name: 'Google', value: 2 })
      
      expect(mockGenerateText).toHaveBeenCalledWith({
        model: { provider: 'google', model: 'gemini-1.5-flash' },
        prompt: expect.any(String),
        maxTokens: 100,
        temperature: 0.5,
      })
    })
  })
  
  describe('loadPromptTemplate', () => {
    it('should load template with proper configuration', () => {
      mockFs.readFileSync.mockReturnValue('Template content')
      
      const template = loadPromptTemplate(
        '/path/to/template.njk',
        testSchema,
        { model: 'custom-model', temperature: 0.7, maxTokens: 200 }
      )
      
      expect(template).toEqual({
        name: 'template',
        description: 'Prompt template from /path/to/template.njk',
        schema: testSchema,
        templatePath: '/path/to/template.njk',
        modelConfig: {
          model: 'custom-model',
          temperature: 0.7,
          maxTokens: 200,
        },
      })
    })
  })
  
  describe('Error Handling', () => {
    it('should handle AI SDK errors gracefully', async () => {
      mockGenerateText.mockRejectedValueOnce(new Error('Provider API error'))
      
      await expect(executePrompt(testTemplate, { name: 'Error', value: 1 }))
        .rejects.toThrow('Provider API error')
    })
    
    it('should handle missing model configuration', async () => {
      mockGetModel.mockImplementationOnce(() => {
        throw new Error('Model not found')
      })
      
      await expect(executePrompt(testTemplate, { name: 'Missing', value: 1 }))
        .rejects.toThrow('Model not found')
    })
  })
  
  describe('executePromptWithUsage', () => {
    it('should return both text and usage metadata', async () => {
      const variables = { name: 'Test', value: 42 }
      
      const result = await executePromptWithUsage(testTemplate, variables)
      
      expect(result).toEqual({
        text: 'Generated response',
        usage: {
          promptTokens: 50,
          completionTokens: 75,
          totalTokens: 125,
          reasoningTokens: 10
        },
        finishReason: 'stop'
      })
      expect(mockGetModel).toHaveBeenCalledWith('test-model')
      expect(mockGenerateText).toHaveBeenCalledWith({
        model: { provider: 'test', model: 'test-model' },
        prompt: expect.stringContaining('Rendered:'),
        maxTokens: 100,
        temperature: 0.5,
      })
    })
    
    it('should handle missing usage data gracefully', async () => {
      // Mock response without usage data
      mockGenerateText.mockResolvedValueOnce({
        text: 'Response without usage',
        finishReason: 'stop',
        usage: undefined,
      } as any)
      
      const variables = { name: 'Test', value: 42 }
      const result = await executePromptWithUsage(testTemplate, variables)
      
      expect(result).toEqual({
        text: 'Response without usage',
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          reasoningTokens: undefined
        },
        finishReason: 'stop'
      })
    })
    
    it('should handle partial usage data', async () => {
      // Mock response with partial usage data
      mockGenerateText.mockResolvedValueOnce({
        text: 'Response with partial usage',
        finishReason: 'length',
        usage: {
          promptTokens: 25,
          totalTokens: 100
          // Missing completionTokens and reasoningTokens
        },
      } as any)
      
      const variables = { name: 'Test', value: 42 }
      const result = await executePromptWithUsage(testTemplate, variables)
      
      expect(result).toEqual({
        text: 'Response with partial usage',
        usage: {
          promptTokens: 25,
          completionTokens: 0,
          totalTokens: 100,
          reasoningTokens: undefined
        },
        finishReason: 'length'
      })
    })
    
    it('should handle missing finishReason', async () => {
      // Mock response without finishReason
      mockGenerateText.mockResolvedValueOnce({
        text: 'Response without finish reason',
        usage: mockUsage,
        // Missing finishReason
      } as any)
      
      const variables = { name: 'Test', value: 42 }
      const result = await executePromptWithUsage(testTemplate, variables)
      
      expect(result.finishReason).toBe('unknown')
    })
    
    it('should validate variables against schema', async () => {
      const invalidVariables = { name: 'Test', value: 'not-a-number' as any }
      
      await expect(executePromptWithUsage(testTemplate, invalidVariables))
        .rejects.toThrow()
    })
    
    it('should use thinking model when thinking config is enabled', async () => {
      const thinkingTemplate = {
        ...testTemplate,
        modelConfig: {
          ...testTemplate.modelConfig,
          model: 'anthropic-balanced' as any,
          thinking: true
        }
      }
      
      const variables = { name: 'Thinking', value: 1 }
      await executePromptWithUsage(thinkingTemplate, variables)
      
      expect(mockGetModel).toHaveBeenCalledWith('anthropic-balanced-thinking')
    })
  })
  
  describe('executeMultimodalPromptWithUsage', () => {
    it('should handle multimodal messages and return usage metadata', async () => {
      const variables = {
        messages: [
          {
            role: 'user' as const,
            content: [
              { type: 'text', text: 'Analyze this content' },
              { type: 'image', image: 'base64-encoded-image' }
            ]
          }
        ]
      }
      
      const result = await executeMultimodalPromptWithUsage(testMultimodalTemplate, variables)
      
      expect(result).toEqual({
        text: 'Generated response',
        usage: {
          promptTokens: 50,
          completionTokens: 75,
          totalTokens: 125,
          reasoningTokens: 10
        },
        finishReason: 'stop'
      })
      
      expect(mockGenerateText).toHaveBeenCalledWith({
        model: { provider: 'test', model: 'test-model' },
        messages: variables.messages,
        maxTokens: 150,
        temperature: 0.3,
      })
    })
    
    it('should handle PDF buffer input', async () => {
      const pdfBuffer = Buffer.from('mock pdf content')
      const variables = {
        pdfBuffer,
        prompt: 'Analyze this PDF'
      }
      
      await executeMultimodalPromptWithUsage(testMultimodalTemplate, variables)
      
      expect(mockGenerateText).toHaveBeenCalledWith({
        model: { provider: 'test', model: 'test-model' },
        messages: [{
          role: 'user',
          content: [
            {
              type: 'file',
              data: pdfBuffer,
              mimeType: 'application/pdf'
            },
            {
              type: 'text',
              text: expect.stringContaining('Rendered:')
            }
          ]
        }],
        maxTokens: 150,
        temperature: 0.3,
      })
    })
    
    it('should fall back to text-only message for other inputs', async () => {
      const variables = {
        textContent: 'Simple text input'
      }
      
      await executeMultimodalPromptWithUsage(testMultimodalTemplate, variables)
      
      expect(mockGenerateText).toHaveBeenCalledWith({
        model: { provider: 'test', model: 'test-model' },
        messages: [{
          role: 'user',
          content: expect.stringContaining('Rendered:')
        }],
        maxTokens: 150,
        temperature: 0.3,
      })
    })
  })
  
  describe('Backward Compatibility', () => {
    it('should maintain executePrompt compatibility (returns only text)', async () => {
      const variables = { name: 'Compatibility', value: 1 }
      
      const result = await executePrompt(testTemplate, variables)
      
      expect(typeof result).toBe('string')
      expect(result).toBe('Generated response')
    })
    
    it('should maintain executeMultimodalPrompt compatibility (returns only text)', async () => {
      const variables = {
        messages: [{
          role: 'user' as const,
          content: 'Test message'
        }]
      }
      
      const result = await executeMultimodalPrompt(testMultimodalTemplate, variables)
      
      expect(typeof result).toBe('string')
      expect(result).toBe('Generated response')
    })
  })
  
  describe('Error Handling for Usage Functions', () => {
    it('should handle AI SDK errors in usage function', async () => {
      mockGenerateText.mockRejectedValueOnce(new Error('Provider API error'))
      
      await expect(executePromptWithUsage(testTemplate, { name: 'Error', value: 1 }))
        .rejects.toThrow('Provider API error')
    })
    
    it('should handle multimodal errors', async () => {
      mockGenerateText.mockRejectedValueOnce(new Error('Multimodal API error'))
      
      const variables = {
        messages: [{ role: 'user' as const, content: 'Test' }]
      }
      
      await expect(executeMultimodalPromptWithUsage(testMultimodalTemplate, variables))
        .rejects.toThrow('Multimodal API error')
    })
  })
  
})