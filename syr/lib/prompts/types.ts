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