import { z } from 'zod'
import { loadPromptTemplateFromCaller } from '@/lib/prompts/types'

// Schema for chat conversation input
export const chatPromptInputSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(10000)
  })).min(1).describe('The conversation history'),
  documentContext: z.string().max(10000).describe('The document content for context'),
})

// Load the chat prompt template
export const chatPrompt = loadPromptTemplateFromCaller(
  'chat.njk',
  chatPromptInputSchema,
  {
    maxTokens: 2000, // Allow longer responses for detailed explanations
    temperature: 0, // Keep deterministic for document analysis
  }
)