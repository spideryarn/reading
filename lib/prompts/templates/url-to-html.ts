import { z } from 'zod'
import { loadMultimodalPromptTemplateFromCaller } from '@/lib/prompts/types'

// Schema for URL to HTML conversion input
export const urlToHtmlPromptInputSchema = z.object({
  htmlContent: z.string().min(1).describe('Raw HTML content fetched from the URL'),
  sourceUrl: z.string().url().describe('Original URL for context and link resolution')
})

// Schema for the expected HTML output (for validation if needed)
export const urlToHtmlOutputSchema = z.string().min(1).describe('Clean semantic HTML extracted from webpage')

// Load the URL to HTML prompt template
export const urlToHtmlPrompt = loadMultimodalPromptTemplateFromCaller(
  'url-to-html.njk',
  urlToHtmlPromptInputSchema,
  {
    model: 'anthropic-balanced', // Use Claude 4 Sonnet for maximum accuracy
    temperature: 0, // Deterministic for content extraction
    maxTokens: 8000, // Allow for longer HTML output from complex webpages
  }
)