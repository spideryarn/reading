// Tests for prompt execution with multi-provider support

import { z } from 'zod'
import { executePrompt, loadPromptTemplate, PromptTemplate } from '../types'
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

describe('Prompt Execution with Multi-Provider Support', () => {
  const mockFs = await import('fs')
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
  
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock file system
    mockFs.readFileSync.mockReturnValue('Hello {{name}}, value is {{value}}')
    
    // Mock model provider
    mockGetModel.mockReturnValue({ provider: 'test', model: 'test-model' })
    
    // Mock AI SDK response
    mockGenerateText.mockResolvedValue({
      text: 'Generated response',
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
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
  
})