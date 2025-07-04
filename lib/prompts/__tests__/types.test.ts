/**
 * Real LLM Integration Tests for Prompt Execution Types
 * 
 * Tests prompt execution with multi-provider support and usage tracking using actual LLM calls
 * with test-tier models to ensure the system works correctly end-to-end.
 * Uses cheaper Gemini Flash model to stay within test budget.
 * 
 * @jest-environment node
 */

// Load test environment with cheaper model
require('dotenv').config({ path: '.env.test' })

// Unmock everything needed for real LLM calls
jest.unmock('@/lib/prompts/types')
jest.unmock('@/lib/services/llm-provider')
jest.unmock('@ai-sdk/anthropic')
jest.unmock('@ai-sdk/google')
jest.unmock('ai')
jest.unmock('fs')
jest.unmock('nunjucks')

import { z } from 'zod'
import { 
  executePrompt, 
  executePromptWithUsage,
  executeMultimodalPrompt,
  executeMultimodalPromptWithUsage,
  loadPromptTemplate, 
  PromptTemplate,
  MultimodalPromptTemplate,
  PromptUsage
} from '../types'
import { AI_CONFIG } from '@/lib/config'
import * as llmProvider from '@/lib/services/llm-provider'
import { generateText } from 'ai'
import * as fs from 'fs'

// Test guard - only run real LLM tests in test environment with proper API keys
const SHOULD_RUN_REAL_LLM = process.env.NODE_ENV === 'test' && 
  (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.ANTHROPIC_API_KEY)

const testSuite = SHOULD_RUN_REAL_LLM ? describe : describe.skip

testSuite('Prompt Execution with Multi-Provider Support and Usage Tracking - Real LLM Integration', () => {
  // Test timeout for LLM calls (45 seconds)
  const LLM_TIMEOUT = 45000
  
  // Sample schema and template for real testing
  const testSchema = z.object({
    topic: z.string(),
    number: z.number(),
  })
  
  // Create a simple test template that uses real file content
  const testTemplate: PromptTemplate<typeof testSchema> = {
    name: 'test-simple-prompt',
    description: 'Simple test template for real LLM execution',
    schema: testSchema,
    templatePath: 'simple-test.njk', // Will be created dynamically
    modelConfig: {
      model: 'google:gemini-2.5-flash:latest', // Use cheap model for testing
      temperature: 0.3,
      maxTokens: 500, // Keep small for cost efficiency
    },
  }
  
  // Sample multimodal template with simple schema for real testing
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
    name: 'test-multimodal-simple',
    description: 'Simple multimodal test template for real LLM execution',
    schema: multimodalSchema,
    templatePath: 'simple-multimodal.njk', // Will be created dynamically
    modelConfig: {
      model: 'google:gemini-2.5-flash:latest', // Use cheap model for testing
      temperature: 0.3,
      maxTokens: 300, // Keep small for cost efficiency
    },
  }
  
  // Helper to create temporary template files for testing
  const createTestTemplate = (content: string, filename: string) => {
    const path = require('path')
    const os = require('os')
    const tempDir = os.tmpdir()
    const templatePath = path.join(tempDir, filename)
    
    try {
      fs.writeFileSync(templatePath, content)
      return templatePath
    } catch (error) {
      console.warn(`Failed to create test template: ${error}`)
      return filename // Fallback to relative path
    }
  }
  
  beforeAll(() => {
    // Create simple test templates
    const simpleTemplate = 'Write a brief fact about {{topic}} using exactly {{number}} words.'
    const multimodalTemplate = 'Analyze the following: {% if textContent %}{{textContent}}{% elif prompt %}{{prompt}}{% else %}the given content{% endif %}. Be concise.'
    
    testTemplate.templatePath = createTestTemplate(simpleTemplate, 'simple-test.njk')
    testMultimodalTemplate.templatePath = createTestTemplate(multimodalTemplate, 'simple-multimodal.njk')
  })
  
  describe('executePrompt - Real LLM Integration', () => {
    it('should execute real prompt and return text response', async () => {
      const variables = { topic: 'artificial intelligence', number: 10 }
      
      const result = await executePrompt(testTemplate, variables)
      
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
      expect(result.length).toBeLessThan(200) // Should be brief due to constraint
      
      console.log(`✅ Real executePrompt test passed. Response: "${result.substring(0, 100)}..."`)
    }, LLM_TIMEOUT)
    
    it('should use default model configuration when not specified', async () => {
      const templateNoConfig: PromptTemplate<typeof testSchema> = {
        ...testTemplate,
        modelConfig: undefined,
      }
      
      const result = await executePrompt(templateNoConfig, { topic: 'science', number: 5 })
      
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
      
      console.log(`✅ Default config test passed. Response: "${result.substring(0, 50)}..."`)
    }, LLM_TIMEOUT)
    
    it('should validate variables against schema', async () => {
      const invalidVariables = { topic: 'Test', number: 'not-a-number' as unknown as number }
      
      await expect(executePrompt(testTemplate, invalidVariables)).rejects.toThrow()
    })
    
    it('should handle different model configurations', async () => {
      // Test with explicit Gemini model
      const geminiTemplate = {
        ...testTemplate,
        modelConfig: {
          model: 'google:gemini-2.5-flash:latest' as const,
          temperature: 0.1,
          maxTokens: 200,
        }
      }
      
      const result = await executePrompt(geminiTemplate, { topic: 'space', number: 8 })
      
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
      
      console.log(`✅ Gemini model test passed. Response: "${result.substring(0, 50)}..."`)
    }, LLM_TIMEOUT)
  })
  
  describe('loadPromptTemplate', () => {
    it('should load template with proper configuration', () => {
      const templatePath = createTestTemplate('Template content: {{topic}}', 'load-test.njk')
      
      const template = loadPromptTemplate(
        templatePath,
        testSchema,
        { model: 'google:gemini-2.5-flash:latest', temperature: 0.7, maxTokens: 200 }
      )
      
      expect(template.name).toBe('load-test')
      expect(template.description).toContain(templatePath)
      expect(template.schema).toBe(testSchema)
      expect(template.templatePath).toBe(templatePath)
      expect(template.modelConfig).toEqual({
        model: 'google:gemini-2.5-flash:latest',
        temperature: 0.7,
        maxTokens: 200,
      })
    })
  })
  
  describe('Error Handling', () => {
    it('should handle invalid API keys gracefully', async () => {
      // Create template with invalid model reference
      const invalidTemplate = {
        ...testTemplate,
        modelConfig: {
          model: 'invalid:model:reference' as const,
          temperature: 0.3,
          maxTokens: 100,
        }
      }
      
      await expect(executePrompt(invalidTemplate, { topic: 'test', number: 5 }))
        .rejects.toThrow()
    }, LLM_TIMEOUT)
    
    it('should handle schema validation errors', async () => {
      await expect(executePrompt(testTemplate, { invalid: 'data' } as any))
        .rejects.toThrow()
    })
  })
  
  describe('executePromptWithUsage - Real LLM Integration', () => {
    it('should return both text and usage metadata', async () => {
      const variables = { topic: 'machine learning', number: 15 }
      
      const result = await executePromptWithUsage(testTemplate, variables)
      
      expect(result).toHaveProperty('text')
      expect(result).toHaveProperty('usage')
      expect(result).toHaveProperty('finishReason')
      
      expect(typeof result.text).toBe('string')
      expect(result.text.length).toBeGreaterThan(0)
      
      expect(result.usage.totalTokens).toBeGreaterThan(0)
      expect(result.usage.totalTokens).toBeLessThan(2000) // Gemini Flash efficiency check
      expect(result.usage.promptTokens).toBeGreaterThan(0)
      expect(result.usage.completionTokens).toBeGreaterThan(0)
      
      expect(['stop', 'length', 'unknown']).toContain(result.finishReason)
      
      console.log(`✅ Real executePromptWithUsage test passed. Used ${result.usage.totalTokens} tokens. Response: "${result.text.substring(0, 100)}..."`)
    }, LLM_TIMEOUT)
    
    it('should respect token usage limits for cost efficiency', async () => {
      const variables = { topic: 'physics', number: 7 }
      
      const result = await executePromptWithUsage(testTemplate, variables)
      
      // Check cost efficiency - should use reasonable token amounts
      expect(result.usage.promptTokens).toBeLessThan(1000)
      expect(result.usage.completionTokens).toBeLessThan(300)
      expect(result.usage.totalTokens).toBeLessThan(1200)
      
      expect(result.text.length).toBeGreaterThan(0)
      
      console.log(`✅ Cost efficiency test passed. Used ${result.usage.totalTokens} tokens for response: "${result.text.substring(0, 50)}..."`)
    }, LLM_TIMEOUT)
    
    it('should validate variables against schema', async () => {
      const invalidVariables = { topic: 'Test', number: 'not-a-number' as unknown as number }
      
      await expect(executePromptWithUsage(testTemplate, invalidVariables))
        .rejects.toThrow()
    })
  })
  
  describe('executeMultimodalPromptWithUsage - Real LLM Integration', () => {
    it('should handle simple text content and return usage metadata', async () => {
      const variables = {
        textContent: 'The concept of quantum computing uses quantum bits or qubits.'
      }
      
      const result = await executeMultimodalPromptWithUsage(testMultimodalTemplate, variables)
      
      expect(result).toHaveProperty('text')
      expect(result).toHaveProperty('usage')
      expect(result).toHaveProperty('finishReason')
      
      expect(typeof result.text).toBe('string')
      expect(result.text.length).toBeGreaterThan(0)
      expect(result.usage.totalTokens).toBeGreaterThan(0)
      expect(result.usage.totalTokens).toBeLessThan(1500) // Keep costs low
      
      console.log(`✅ Real multimodal text test passed. Used ${result.usage.totalTokens} tokens. Response: "${result.text.substring(0, 80)}..."`)
    }, LLM_TIMEOUT)
    
    it('should handle prompt-based input', async () => {
      const variables = {
        prompt: 'Explain the difference between machine learning and artificial intelligence in simple terms.'
      }
      
      const result = await executeMultimodalPromptWithUsage(testMultimodalTemplate, variables)
      
      expect(result).toHaveProperty('text')
      expect(result).toHaveProperty('usage')
      expect(result.text.length).toBeGreaterThan(0)
      expect(result.usage.totalTokens).toBeGreaterThan(0)
      
      console.log(`✅ Multimodal prompt test passed. Used ${result.usage.totalTokens} tokens.`)
    }, LLM_TIMEOUT)
    
    it('should handle structured message format', async () => {
      const variables = {
        messages: [
          {
            role: 'user' as const,
            content: 'What is the capital of France?'
          }
        ]
      }
      
      const result = await executeMultimodalPromptWithUsage(testMultimodalTemplate, variables)
      
      expect(result.text.length).toBeGreaterThan(0)
      expect(result.usage.totalTokens).toBeLessThan(500) // Simple question should be efficient
      
      console.log(`✅ Structured message test passed. Used ${result.usage.totalTokens} tokens.`)
    }, LLM_TIMEOUT)
  })
  
  describe('Backward Compatibility', () => {
    it('should maintain executePrompt compatibility (returns only text)', async () => {
      const variables = { topic: 'technology', number: 12 }
      
      const result = await executePrompt(testTemplate, variables)
      
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
      
      console.log(`✅ Backward compatibility test passed. Response type: ${typeof result}`)
    }, LLM_TIMEOUT)
    
    it('should maintain executeMultimodalPrompt compatibility (returns only text)', async () => {
      const variables = {
        textContent: 'Brief analysis of renewable energy.'
      }
      
      const result = await executeMultimodalPrompt(testMultimodalTemplate, variables)
      
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
      
      console.log(`✅ Multimodal backward compatibility test passed. Response type: ${typeof result}`)
    }, LLM_TIMEOUT)
  })
  
  describe('Template Configuration Validation', () => {
    it('should validate prompt template structure', () => {
      expect(testTemplate.name).toBe('test-simple-prompt')
      expect(testTemplate.description).toContain('Simple test template')
      expect(testTemplate.schema).toBe(testSchema)
      expect(testTemplate.modelConfig?.model).toBe('google:gemini-2.5-flash:latest')
      expect(testTemplate.modelConfig?.temperature).toBe(0.3)
      expect(testTemplate.modelConfig?.maxTokens).toBe(500)
    })
    
    it('should validate multimodal template structure', () => {
      expect(testMultimodalTemplate.name).toBe('test-multimodal-simple')
      expect(testMultimodalTemplate.description).toContain('Simple multimodal test')
      expect(testMultimodalTemplate.schema).toBe(multimodalSchema)
      expect(testMultimodalTemplate.modelConfig?.model).toBe('google:gemini-2.5-flash:latest')
    })
  })
  
})