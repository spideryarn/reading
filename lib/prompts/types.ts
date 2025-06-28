import { z } from 'zod'
import nunjucks from 'nunjucks'
import { readFileSync } from 'fs'
import { join } from 'path'
import { generateText } from 'ai'
import { AI_CONFIG } from '@/lib/config'
import { getModel } from '@/lib/services/llm-provider'

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

// Configure Nunjucks with strict mode
const env = nunjucks.configure({
  autoescape: false,
  throwOnUndefined: true, // Fails on missing variables
  trimBlocks: true,
  lstripBlocks: true,
})

// Base prompt template type
export interface PromptTemplate<T extends z.ZodSchema> {
  name: string
  description: string
  schema: T
  templatePath: string
  modelConfig?: {
    modelString?: string
    temperature?: number
    maxTokens?: number
  }
}

// Load and render a Nunjucks template with Zod validation
export function loadPromptTemplate<T extends z.ZodSchema>(
  templatePath: string,
  schema: T,
  modelConfig?: {
    modelString?: string
    temperature?: number
    maxTokens?: number
  }
): PromptTemplate<T> {
  // Load template content at module load time for better performance
  readFileSync(templatePath, 'utf-8')
  
  const result: PromptTemplate<T> = {
    name: templatePath.split('/').pop()?.replace('.njk', '') || 'unnamed',
    description: `Prompt template from ${templatePath}`,
    schema,
    templatePath
  }
  
  if (modelConfig !== undefined) {
    result.modelConfig = modelConfig
  }
  
  return result
}

// Helper function to auto-resolve template path from template name
export function loadPromptTemplateFromCaller<T extends z.ZodSchema>(
  templateName: string,
  schema: T,
  modelConfig?: {
    modelString?: string
    temperature?: number
    maxTokens?: number
  }
): PromptTemplate<T> {
  // Build absolute path using process.cwd() + relative path
  const templatePath = join(process.cwd(), 'lib/prompts/templates', templateName)
  
  return loadPromptTemplate(templatePath, schema, modelConfig)
}

// Internal implementation using Vercel AI SDK Core
async function executePromptInternal<T extends z.ZodSchema>(
  template: PromptTemplate<T>,
  variables: z.infer<T>
): Promise<PromptExecutionResult> {
  // Validate variables against schema
  const validated = template.schema.parse(variables)
  
  // Load and render template
  const templateContent = readFileSync(template.templatePath, 'utf-8')
  const prompt = env.renderString(templateContent, validated)
  
  // Get the appropriate model based on configuration
  const model = getModel()
  
  // Execute with Vercel AI SDK Core
  const result = await generateText({
    model,
    prompt,
    maxTokens: template.modelConfig?.maxTokens || AI_CONFIG.DEFAULT_MAX_TOKENS,
    temperature: template.modelConfig?.temperature ?? AI_CONFIG.DEFAULT_TEMPERATURE,
  })
  
  // Return enhanced result with usage metadata
  return {
    text: result.text,
    usage: {
      promptTokens: result.usage?.promptTokens || 0,
      completionTokens: result.usage?.completionTokens || 0,
      totalTokens: result.usage?.totalTokens || 0,
      reasoningTokens: result.usage?.reasoningTokens
    },
    finishReason: result.finishReason || 'unknown'
  }
}

// Execute a prompt with validation and rendering (backward compatible - returns only text)
export async function executePrompt<T extends z.ZodSchema>(
  template: PromptTemplate<T>,
  variables: z.infer<T>
): Promise<string> {
  const result = await executePromptInternal(template, variables)
  return result.text
}

// Execute a prompt with validation and rendering (enhanced - returns text + usage metadata)
export async function executePromptWithUsage<T extends z.ZodSchema>(
  template: PromptTemplate<T>,
  variables: z.infer<T>
): Promise<PromptExecutionResult> {
  return executePromptInternal(template, variables)
}

// Multimodal content schemas for vision capabilities
export const multimodalTextContentSchema = z.object({
  type: z.literal('text'),
  text: z.string()
})

export const multimodalImageContentSchema = z.object({
  type: z.literal('image'),
  image: z.string().describe('Base64-encoded image data')
})

export const multimodalContentSchema = z.union([
  multimodalTextContentSchema,
  multimodalImageContentSchema
])

export const multimodalMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.union([
    z.string(),
    z.array(multimodalContentSchema)
  ])
})

// Multimodal prompt template type
export interface MultimodalPromptTemplate<T extends z.ZodSchema> {
  name: string
  description: string
  schema: T
  templatePath: string
  modelConfig?: {
    modelString?: string
    temperature?: number
    maxTokens?: number
  }
}

// Internal implementation for multimodal prompts
async function executeMultimodalPromptInternal<T extends z.ZodSchema>(
  template: MultimodalPromptTemplate<T>,
  variables: z.infer<T>
): Promise<PromptExecutionResult> {
  // Validate variables against schema
  const validated = template.schema.parse(variables)
  
  // Get the appropriate model - use template model config if specified, otherwise use environment
  let model
  if (template.modelConfig?.model) {
    // Use model specified in template
    const { parseModelString } = await import('@/lib/config/models')
    const { getProvider } = await import('@/lib/services/llm-provider')
    
    const parsedModel = parseModelString(template.modelConfig.model)
    const providerInstance = getProvider(parsedModel.provider)
    
    // Handle Anthropic version concatenation like in llm-provider.ts
    let providerModelName = parsedModel.modelName
    if (parsedModel.provider === 'anthropic' && parsedModel.version !== 'latest' && !providerModelName.endsWith(parsedModel.version)) {
      providerModelName = `${providerModelName}-${parsedModel.version}`
    }
    
    // Configure thinking mode for Anthropic models if enabled
    const modelOptions: Record<string, unknown> = {}
    if (parsedModel.provider === 'anthropic' && parsedModel.thinking) {
      modelOptions.thinking = true
    }
    
    model = providerInstance(providerModelName, modelOptions)
  } else {
    // Fall back to environment configuration
    model = getModel()
  }
  
  // Check if variables contain messages (multimodal), PDF buffer, base64 image, or just need prompt rendering
  let messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image?: string; data?: Buffer; mimeType?: string }> }> = []
  
  if ('messages' in validated && Array.isArray(validated.messages)) {
    // Use messages directly for multimodal content
    messages = validated.messages
  } else if ('pdfBuffer' in validated && Buffer.isBuffer(validated.pdfBuffer)) {
    // Handle PDF file with rendered template
    const templateContent = readFileSync(template.templatePath, 'utf-8')
    const prompt = env.renderString(templateContent, validated)
    
    messages = [{
      role: 'user',
      content: [
        {
          type: 'file',
          data: validated.pdfBuffer as Buffer,
          mimeType: 'application/pdf'
        },
        {
          type: 'text',
          text: prompt
        }
      ]
    }]
  } else if ('pageImageBase64' in validated && typeof validated.pageImageBase64 === 'string') {
    // Handle base64-encoded page image with rendered template
    const templateContent = readFileSync(template.templatePath, 'utf-8')
    const prompt = env.renderString(templateContent, validated)
    
    messages = [{
      role: 'user',
      content: [
        {
          type: 'image',
          image: validated.pageImageBase64 as string
        },
        {
          type: 'text',
          text: prompt
        }
      ]
    }]
  } else {
    // Render template and create a text-only message
    const templateContent = readFileSync(template.templatePath, 'utf-8')
    const prompt = env.renderString(templateContent, validated)
    
    messages = [{
      role: 'user',
      content: prompt
    }]
  }
  
  // Execute with Vercel AI SDK Core using messages format
  const result = await generateText({
    model,
    messages,
    maxTokens: template.modelConfig?.maxTokens || AI_CONFIG.DEFAULT_MAX_TOKENS,
    temperature: template.modelConfig?.temperature ?? AI_CONFIG.DEFAULT_TEMPERATURE,
  })
  
  // Return enhanced result with usage metadata
  return {
    text: result.text,
    usage: {
      promptTokens: result.usage?.promptTokens || 0,
      completionTokens: result.usage?.completionTokens || 0,
      totalTokens: result.usage?.totalTokens || 0,
      reasoningTokens: result.usage?.reasoningTokens
    },
    finishReason: result.finishReason || 'unknown'
  }
}

// Execute a multimodal prompt with support for images and messages (backward compatible - returns only text)
export async function executeMultimodalPrompt<T extends z.ZodSchema>(
  template: MultimodalPromptTemplate<T>,
  variables: z.infer<T>
): Promise<string> {
  const result = await executeMultimodalPromptInternal(template, variables)
  return result.text
}

// Execute a multimodal prompt with support for images and messages (enhanced - returns text + usage metadata)
export async function executeMultimodalPromptWithUsage<T extends z.ZodSchema>(
  template: MultimodalPromptTemplate<T>,
  variables: z.infer<T>
): Promise<PromptExecutionResult> {
  return executeMultimodalPromptInternal(template, variables)
}

// Helper function to auto-resolve template path for multimodal templates
export function loadMultimodalPromptTemplateFromCaller<T extends z.ZodSchema>(
  templateName: string,
  schema: T,
  modelConfig?: {
    modelString?: string
    temperature?: number
    maxTokens?: number
  }
): MultimodalPromptTemplate<T> {
  // Build absolute path using process.cwd() + relative path
  const templatePath = join(process.cwd(), 'lib/prompts/templates', templateName)
  
  return loadMultimodalPromptTemplate(templatePath, schema, modelConfig)
}

// Helper to create a multimodal template
export function loadMultimodalPromptTemplate<T extends z.ZodSchema>(
  templatePath: string,
  schema: T,
  modelConfig?: {
    modelString?: string
    temperature?: number
    maxTokens?: number
  }
): MultimodalPromptTemplate<T> {
  // Load template content at module load time for better performance
  readFileSync(templatePath, 'utf-8')
  
  const result: MultimodalPromptTemplate<T> = {
    name: templatePath.split('/').pop()?.replace('.njk', '') || 'unnamed',
    description: `Multimodal prompt template from ${templatePath}`,
    schema,
    templatePath
  }
  
  if (modelConfig !== undefined) {
    result.modelConfig = modelConfig
  }
  
  return result
}