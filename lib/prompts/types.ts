import { z } from 'zod'
import nunjucks from 'nunjucks'
import { readFileSync } from 'fs'
import { join } from 'path'
import { generateText } from 'ai'
import { AI_CONFIG, type ProviderTierKey } from '@/lib/config'
import { getModel } from '@/lib/services/llm-provider'

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
    model?: ProviderTierKey
    temperature?: number
    maxTokens?: number
    thinking?: boolean
  }
}

// Load and render a Nunjucks template with Zod validation
export function loadPromptTemplate<T extends z.ZodSchema>(
  templatePath: string,
  schema: T,
  modelConfig?: {
    model?: ProviderTierKey
    temperature?: number
    maxTokens?: number
    thinking?: boolean
  }
): PromptTemplate<T> {
  // Load template content at module load time for better performance
  readFileSync(templatePath, 'utf-8')
  
  return {
    name: templatePath.split('/').pop()?.replace('.njk', '') || 'unnamed',
    description: `Prompt template from ${templatePath}`,
    schema,
    templatePath,
    modelConfig
  }
}

// Helper function to auto-resolve template path from template name
export function loadPromptTemplateFromCaller<T extends z.ZodSchema>(
  templateName: string,
  schema: T,
  modelConfig?: {
    model?: ProviderTierKey
    temperature?: number
    maxTokens?: number
    thinking?: boolean
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
): Promise<string> {
  // Validate variables against schema
  const validated = template.schema.parse(variables)
  
  // Load and render template
  const templateContent = readFileSync(template.templatePath, 'utf-8')
  const prompt = env.renderString(templateContent, validated)
  
  // Get the appropriate model based on configuration
  // If thinking mode is explicitly set in template config, use anthropic-balanced-thinking
  let providerTierKey = template.modelConfig?.model || AI_CONFIG.DEFAULT_MODEL
  if (template.modelConfig?.thinking && providerTierKey === 'anthropic-balanced') {
    providerTierKey = 'anthropic-balanced-thinking'
  }
  const model = getModel(providerTierKey)
  
  // Execute with Vercel AI SDK Core
  const result = await generateText({
    model,
    prompt,
    maxTokens: template.modelConfig?.maxTokens || AI_CONFIG.DEFAULT_MAX_TOKENS,
    temperature: template.modelConfig?.temperature ?? AI_CONFIG.DEFAULT_TEMPERATURE,
  })
  
  return result.text
}

// Execute a prompt with validation and rendering
export async function executePrompt<T extends z.ZodSchema>(
  template: PromptTemplate<T>,
  variables: z.infer<T>
): Promise<string> {
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
    model?: ProviderTierKey
    temperature?: number
    maxTokens?: number
    thinking?: boolean
  }
}

// Execute a multimodal prompt with support for images and messages
export async function executeMultimodalPrompt<T extends z.ZodSchema>(
  template: MultimodalPromptTemplate<T>,
  variables: z.infer<T>
): Promise<string> {
  // Validate variables against schema
  const validated = template.schema.parse(variables)
  
  // Get the appropriate model based on configuration
  let providerTierKey = template.modelConfig?.model || AI_CONFIG.DEFAULT_MODEL
  if (template.modelConfig?.thinking && providerTierKey === 'anthropic-balanced') {
    providerTierKey = 'anthropic-balanced-thinking'
  }
  const model = getModel(providerTierKey)
  
  // Check if variables contain messages (multimodal), PDF buffer, or just need prompt rendering
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
  
  return result.text
}

// Helper function to auto-resolve template path for multimodal templates
export function loadMultimodalPromptTemplateFromCaller<T extends z.ZodSchema>(
  templateName: string,
  schema: T,
  modelConfig?: {
    model?: ProviderTierKey
    temperature?: number
    maxTokens?: number
    thinking?: boolean
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
    model?: ProviderTierKey
    temperature?: number
    maxTokens?: number
    thinking?: boolean
  }
): MultimodalPromptTemplate<T> {
  // Load template content at module load time for better performance
  readFileSync(templatePath, 'utf-8')
  
  return {
    name: templatePath.split('/').pop()?.replace('.njk', '') || 'unnamed',
    description: `Multimodal prompt template from ${templatePath}`,
    schema,
    templatePath,
    modelConfig
  }
}