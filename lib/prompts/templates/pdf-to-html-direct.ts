import { z } from 'zod'
import { loadMultimodalPromptTemplateFromCaller } from '@/lib/prompts/types'

// Schema for direct PDF to HTML conversion input
export const pdfToHtmlDirectPromptInputSchema = z.object({
  pdfBuffer: z.instanceof(Buffer).describe('PDF buffer for direct processing by Claude API'),
  fileName: z.string().optional().describe('Optional filename for context'),
  singlePageOnly: z.boolean().default(false).describe('Process only the first page for cost control')
})

// Schema for the expected HTML output (for validation if needed)
export const pdfToHtmlDirectOutputSchema = z.string().min(1).describe('Clean semantic HTML converted from PDF')

// Create PDF to HTML prompt template with configurable provider
export function createPdfToHtmlPrompt(provider: 'claude' | 'gemini' = 'claude') {
  const modelTier = provider === 'gemini' ? 'google-balanced' : 'anthropic-balanced'
  
  return loadMultimodalPromptTemplateFromCaller(
    'pdf-to-html-direct.njk',
    pdfToHtmlDirectPromptInputSchema,
    {
      model: modelTier,
      temperature: 0, // Deterministic for academic content conversion
      maxTokens: 64000, // High limit for complex PDFs and long documents
    }
  )
}

// Default export for backward compatibility
export const pdfToHtmlDirectPrompt = createPdfToHtmlPrompt('claude')