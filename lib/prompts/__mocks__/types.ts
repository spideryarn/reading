// Mock for prompts/types module to use in tests
import { z } from 'zod'

// Types for enhanced prompt execution with usage metadata
export interface PromptUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  reasoningTokens?: number
}

export interface PromptExecutionResult {
  text: string
  usage: PromptUsage
  finishReason: string
}

// Base prompt template type
export interface PromptTemplate<T extends z.ZodSchema> {
  name: string
  description: string
  schema: T
  templatePath: string
  modelConfig?: {
    model?: string
    temperature?: number
    maxTokens?: number
    thinking?: boolean
  }
}

// Mock storage for tracking calls
let mockExecutions: Array<{
  template: any
  variables: any
  result: PromptExecutionResult
}> = []

// Default mock response
const createMockResult = (text?: string): PromptExecutionResult => ({
  text: text || JSON.stringify({ mocked: true }),
  usage: {
    promptTokens: 100,
    completionTokens: 200,
    totalTokens: 300,
    reasoningTokens: 0
  },
  finishReason: 'stop'
})

// Mock implementations
export const loadPromptTemplate = jest.fn(<T extends z.ZodSchema>(
  templatePath: string,
  schema: T,
  modelConfig?: any
): PromptTemplate<T> => {
  return {
    name: templatePath.split('/').pop()?.replace('.njk', '') || 'unnamed',
    description: `Mock prompt template from ${templatePath}`,
    schema,
    templatePath,
    modelConfig
  }
})

export const loadPromptTemplateFromCaller = jest.fn(<T extends z.ZodSchema>(
  templateName: string,
  schema: T,
  modelConfig?: any
): PromptTemplate<T> => {
  const templatePath = `/mock/path/lib/prompts/templates/${templateName}`
  return loadPromptTemplate(templatePath, schema, modelConfig)
})

// Multimodal versions
export const loadMultimodalPromptTemplate = jest.fn(<T extends z.ZodSchema>(
  templatePath: string,
  schema: T,
  modelConfig?: any
): PromptTemplate<T> => {
  return {
    name: templatePath.split('/').pop()?.replace('.njk', '') || 'unnamed',
    description: `Mock multimodal prompt template from ${templatePath}`,
    schema,
    templatePath,
    modelConfig
  }
})

export const loadMultimodalPromptTemplateFromCaller = jest.fn(<T extends z.ZodSchema>(
  templateName: string,
  schema: T,
  modelConfig?: any
): PromptTemplate<T> => {
  const templatePath = `/mock/path/lib/prompts/templates/${templateName}`
  return loadMultimodalPromptTemplate(templatePath, schema, modelConfig)
})

// Main execution functions
export const executePrompt = jest.fn(async <T extends z.ZodSchema>(
  template: PromptTemplate<T>,
  variables: z.infer<T>
): Promise<string> => {
  const result = createMockResult()
  mockExecutions.push({ template, variables, result })
  return result.text
})

export const executePromptWithUsage = jest.fn(async <T extends z.ZodSchema>(
  template: PromptTemplate<T>,
  variables: z.infer<T>
): Promise<PromptExecutionResult> => {
  const result = createMockResult()
  mockExecutions.push({ template, variables, result })
  return result
})

// Test helper functions
export const setMockResponse = (response: Partial<PromptExecutionResult>) => {
  const fullResponse = {
    ...createMockResult(),
    ...response
  }
  
  executePrompt.mockImplementation(async () => fullResponse.text)
  executePromptWithUsage.mockImplementation(async () => fullResponse)
}

export const setMockResponses = (responses: Array<Partial<PromptExecutionResult>>) => {
  let callIndex = 0
  
  executePrompt.mockImplementation(async () => {
    const response = responses[callIndex % responses.length] || {}
    const fullResponse = { ...createMockResult(), ...response }
    callIndex++
    return fullResponse.text
  })
  
  executePromptWithUsage.mockImplementation(async () => {
    const response = responses[callIndex % responses.length] || {}
    const fullResponse = { ...createMockResult(), ...response }
    callIndex++
    return fullResponse
  })
}

export const clearMockExecutions = () => {
  mockExecutions = []
  executePrompt.mockClear()
  executePromptWithUsage.mockClear()
}

export const getMockExecutions = () => [...mockExecutions]

// Multimodal execution functions
export const executeMultimodalPrompt = jest.fn(async <T extends z.ZodSchema>(
  template: PromptTemplate<T>,
  variables: z.infer<T>
): Promise<string> => {
  const result = createMockResult()
  mockExecutions.push({ template, variables, result })
  return result.text
})

export const executeMultimodalPromptWithUsage = jest.fn(async <T extends z.ZodSchema>(
  template: PromptTemplate<T>,
  variables: z.infer<T>
): Promise<PromptExecutionResult> => {
  const result = createMockResult()
  mockExecutions.push({ template, variables, result })
  return result
})

// Re-export for convenience
export default {
  loadPromptTemplate,
  loadPromptTemplateFromCaller,
  loadMultimodalPromptTemplate,
  loadMultimodalPromptTemplateFromCaller,
  executePrompt,
  executePromptWithUsage,
  executeMultimodalPrompt,
  executeMultimodalPromptWithUsage,
  setMockResponse,
  setMockResponses,
  clearMockExecutions,
  getMockExecutions
}