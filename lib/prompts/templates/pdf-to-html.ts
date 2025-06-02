import { z } from 'zod'
import { loadMultimodalPromptTemplate, multimodalMessageSchema } from '@/lib/prompts/types'

// Schema for PDF to HTML conversion input
export const pdfToHtmlPromptInputSchema = z.object({
  messages: z.array(multimodalMessageSchema).min(1).describe('Multimodal messages containing PDF image and conversion instructions')
})

// Schema for the expected HTML output (for validation if needed)
export const pdfToHtmlOutputSchema = z.string().min(1).describe('Clean semantic HTML converted from PDF')

// Load the PDF to HTML prompt template
export const pdfToHtmlPrompt = loadMultimodalPromptTemplate(
  'pdf-to-html.njk',
  pdfToHtmlPromptInputSchema,
  {
    model: 'anthropic-balanced', // Use Claude 4 Sonnet for maximum accuracy
    temperature: 0, // Deterministic for academic content conversion
    maxTokens: 4000, // Allow for longer HTML output
  }
)