import { z } from 'zod'
import { loadMultimodalPromptTemplateFromCaller } from '@/lib/prompts/types'

// Schema for Gemini PDF to HTML conversion input (same as Claude version)
export const pdfToHtmlGeminiPromptInputSchema = z.object({
  pdfBuffer: z.instanceof(Buffer).describe('PDF buffer for direct processing by Gemini API'),
  fileName: z.string().optional().describe('Optional filename for context'),
  singlePageOnly: z.boolean().default(false).describe('Process only the first page for cost control')
})

// Schema for the expected HTML output (for validation if needed)
export const pdfToHtmlGeminiOutputSchema = z.string().min(1).describe('Clean semantic HTML converted from PDF')

// Load the Gemini PDF to HTML prompt template
export const pdfToHtmlGeminiPrompt = loadMultimodalPromptTemplateFromCaller(
  'pdf-to-html-gemini.njk',
  pdfToHtmlGeminiPromptInputSchema,
  {
    model: 'google-balanced', // Use Gemini 2.5 Pro for cost-effective processing
    temperature: 0, // Deterministic for academic content conversion
    maxTokens: 64000, // High limit for complex PDFs and long documents
  }
)