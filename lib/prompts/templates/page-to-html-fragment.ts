import { z } from 'zod'
import { loadMultimodalPromptTemplateFromCaller } from '@/lib/prompts/types'

// Schema for page-to-HTML fragment conversion input
export const pageToHtmlFragmentPromptInputSchema = z.object({
  pageImageBase64: z.string().min(1).describe('Base64 encoded page image for vision analysis'),
  pageNumber: z.number().int().min(1).describe('1-indexed page number for context and cross-references'),
  totalPages: z.number().int().min(1).describe('Total pages in document for context'),
  fileName: z.string().optional().describe('Optional filename for context and debugging'),
  previousPageSummary: z.string().optional().describe('Optional summary of previous page content for continuity'),
  documentContext: z.string().optional().describe('Optional overall document context (title, authors, subject)')
})

// Schema for expected HTML fragment output (for validation if needed)
export const pageToHtmlFragmentOutputSchema = z.string().min(1).describe('Clean HTML fragment without html/body wrapper')

// Create page-to-HTML fragment prompt template with configurable provider
export function createPageToHtmlFragmentPrompt(provider: 'claude' | 'gemini' = 'gemini') {
  // Default to Gemini Flash 2.5 for speed/cost optimization as specified in requirements
  const modelString = provider === 'gemini' 
    ? 'google:gemini-2.5-flash:latest' 
    : 'anthropic:claude-sonnet-4:20250514'
  
  return loadMultimodalPromptTemplateFromCaller(
    'page-to-html-fragment.njk',
    pageToHtmlFragmentPromptInputSchema,
    {
      modelString: modelString,
      temperature: 0, // Deterministic for academic content conversion
      maxTokens: 16000, // Moderate limit for individual page processing (~8K tokens as specified)
    }
  )
}

// Default export optimized for Gemini Flash as per requirements
export const pageToHtmlFragmentPrompt = createPageToHtmlFragmentPrompt('gemini')