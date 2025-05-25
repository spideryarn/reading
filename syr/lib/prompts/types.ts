import { z } from 'zod'
import nunjucks from 'nunjucks'
import { readFileSync } from 'fs'
import { join } from 'path'
import Anthropic from '@anthropic-ai/sdk'
import { AI_CONFIG } from '@/lib/config'

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

// Execute a prompt with validation and rendering
export async function executePrompt<T extends z.ZodSchema>(
  anthropic: Anthropic,
  template: PromptTemplate<T>,
  variables: z.infer<T>
): Promise<string> {
  // Validate variables against schema
  const validated = template.schema.parse(variables)
  
  console.log('Template variables - content preview (first 500 chars):', validated.content?.substring(0, 500))
  console.log('Template variables - content length:', validated.content?.length)
  
  // Load and render template
  console.log('Template path being used:', template.templatePath)
  const templateContent = readFileSync(template.templatePath, 'utf-8')
  console.log('Template content preview (first 200 chars):', templateContent.substring(0, 200))
  
  const prompt = env.renderString(templateContent, validated)
  
  console.log('Prompt sent to Claude (first 1000 chars):', prompt.substring(0, 1000))
  console.log('Prompt length:', prompt.length)
  
  // Execute with Anthropic
  const response = await anthropic.messages.create({
    model: template.modelConfig?.model || AI_CONFIG.DEFAULT_MODEL,
    max_tokens: template.modelConfig?.maxTokens || AI_CONFIG.DEFAULT_MAX_TOKENS,
    temperature: template.modelConfig?.temperature ?? AI_CONFIG.DEFAULT_TEMPERATURE,
    messages: [{ role: 'user', content: prompt }]
  })
  
  const result = response.content[0].type === 'text' ? response.content[0].text : ''
  console.log('Claude response (first 500 chars):', result.substring(0, 500))
  console.log('Claude response length:', result.length)
  
  return result
}