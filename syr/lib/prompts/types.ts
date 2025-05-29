import { z } from 'zod'
import nunjucks from 'nunjucks'
import { readFileSync } from 'fs'
import { join } from 'path'
import { generateText } from 'ai'
import { AI_CONFIG } from '@/lib/config'
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
    model?: string
    temperature?: number
    maxTokens?: number
  }
}

// Load and render a Nunjucks template with Zod validation
export function loadPromptTemplate<T extends z.ZodSchema>(
  templatePath: string,
  schema: T,
  modelConfig?: {
    model?: string
    temperature?: number
    maxTokens?: number
  }
): PromptTemplate<T> {
  // Load template content at module load time for better performance
  const templateContent = readFileSync(templatePath, 'utf-8')
  
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
    model?: string
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
): Promise<string> {
  // Validate variables against schema
  const validated = template.schema.parse(variables)
  
  // Load and render template
  const templateContent = readFileSync(template.templatePath, 'utf-8')
  const prompt = env.renderString(templateContent, validated)
  
  // Get the appropriate model based on configuration
  const modelName = template.modelConfig?.model || AI_CONFIG.DEFAULT_MODEL
  const model = getModel(modelName)
  
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
// Supports both legacy (with Anthropic client) and new (without client) signatures
export async function executePrompt<T extends z.ZodSchema>(
  ...args: [any, PromptTemplate<T>, z.infer<T>] | [PromptTemplate<T>, z.infer<T>]
): Promise<string> {
  // Check if first argument is the deprecated Anthropic client
  if (args.length === 3) {
    // Legacy signature: executePrompt(anthropic, template, variables)
    const [_, template, variables] = args
    return executePromptInternal(template, variables)
  } else {
    // New signature: executePrompt(template, variables)
    const [template, variables] = args as [PromptTemplate<T>, z.infer<T>]
    return executePromptInternal(template, variables)
  }
}