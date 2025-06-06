import { z } from 'zod'
import nunjucks from 'nunjucks'
import { readFileSync } from 'fs'
import { join } from 'path'

// Schema for system prompt variables
const chatSystemPromptSchema = z.object({
  documentContext: z.string().describe('The document content for context'),
})

// Lazy loading of template and Nunjucks configuration
let templateContent: string | null = null
let env: nunjucks.Environment | null = null

function initializeTemplate() {
  if (templateContent === null || env === null) {
    // Configure Nunjucks with same settings as in types.ts
    env = nunjucks.configure({
      autoescape: false,
      throwOnUndefined: true,
      trimBlocks: true,
      lstripBlocks: true,
    })
    
    // Load template content
    const templatePath = join(process.cwd(), 'lib/prompts/templates/chat.njk')
    templateContent = readFileSync(templatePath, 'utf-8')
  }
}

// Export a function to render the system prompt
export function renderChatSystemPrompt(variables: z.infer<typeof chatSystemPromptSchema>): string {
  const validated = chatSystemPromptSchema.parse(variables)
  
  initializeTemplate()
  
  return env!.renderString(templateContent!, validated)
}