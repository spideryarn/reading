import { z } from 'zod'
import { loadMultimodalPromptTemplateFromCaller } from '@/lib/prompts/types'

// Schema for URL to HTML conversion input
export const urlToHtmlPromptInputSchema = z.object({
  htmlContent: z.string().min(1).describe('Raw HTML content fetched from the URL'),
  sourceUrl: z.string().url().describe('Original URL for context and link resolution')
})

// Schema for the expected HTML output (for validation if needed)
export const urlToHtmlOutputSchema = z.string().min(1).describe('Clean semantic HTML extracted from webpage')

// Create URL to HTML prompt template with configurable provider
export function createUrlToHtmlPrompt(provider: 'claude' | 'gemini' = 'claude') {
  const modelString = provider === 'gemini' ? 'google:gemini-2.5-pro:latest' : 'anthropic:claude-sonnet-4:20250514'
  
  return loadMultimodalPromptTemplateFromCaller(
    'url-to-html.njk',
    urlToHtmlPromptInputSchema,
    {
      model: modelString,
      temperature: 0, // Deterministic for content extraction
      maxTokens: 64000, // High limit for complex webpages and long content
    }
  )
}

// Default export for backward compatibility
export const urlToHtmlPrompt = createUrlToHtmlPrompt('claude')