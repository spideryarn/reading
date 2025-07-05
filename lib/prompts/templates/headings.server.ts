import { loadPromptTemplateFromCaller } from '../types'
import {
  headingOperationSchema,
  headingsResponseSchema,
  headingsPromptSchema,
  headingsPromptInputSchema,
  HeadingOperation,
} from '../schemas/headings'

// Load the headings prompt template (server-only usage)
export const headingsPrompt = loadPromptTemplateFromCaller(
  'headings.njk',
  headingsPromptSchema,
  {
    maxTokens: 8000, // Large token limit for comprehensive heading analysis
    // temperature defaults to 0 for deterministic output
  },
)

// Re-export schemas and types so downstream server code can import from this module
export {
  headingOperationSchema,
  headingsResponseSchema,
  headingsPromptSchema,
  headingsPromptInputSchema,
}

export type { HeadingOperation } 